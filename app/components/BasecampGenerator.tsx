'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { supabase } from '@/lib/supabase/client';
import { logToolRun } from '@/lib/tara/logActivity';

interface BasecampGeneratorProps {
  theme?: 'light' | 'dark';
}

type AnalysisType = 'initial' | 'final' | 'pre-approval' | 'for-fixing';

interface POFileData {
  filename: string;
  content: string;
  rows: string[][];
}

interface GenerationStats {
  totalSkus: number;
  totalQty: number;
  issueCount: number;
}

const TYPE_CONFIG: Record<AnalysisType, { label: string; color: string; darkBg: string; lightBg: string; darkText: string; lightText: string }> = {
  initial: { label: 'Initial Analysis', color: 'emerald', darkBg: 'bg-emerald-950/40 border-emerald-500/30', lightBg: 'bg-emerald-50/70 border-emerald-300', darkText: 'text-emerald-300', lightText: 'text-emerald-800' },
  final: { label: 'Final Analysis', color: 'emerald', darkBg: 'bg-emerald-950/40 border-emerald-500/30', lightBg: 'bg-emerald-50/70 border-emerald-300', darkText: 'text-emerald-300', lightText: 'text-emerald-800' },
  'pre-approval': { label: 'Pre-Approval', color: 'amber', darkBg: 'bg-amber-950/40 border-amber-500/30', lightBg: 'bg-amber-50/70 border-amber-300', darkText: 'text-amber-300', lightText: 'text-amber-800' },
  'for-fixing': { label: 'For Fixing', color: 'blue', darkBg: 'bg-blue-950/40 border-blue-500/30', lightBg: 'bg-blue-50/70 border-blue-300', darkText: 'text-blue-300', lightText: 'text-blue-800' },
};

export default function BasecampGenerator({ theme = 'dark' }: BasecampGeneratorProps) {
  const [uploadedFiles, setUploadedFiles] = useState<{ preApproval?: POFileData; listingData?: POFileData; excluded?: POFileData }>({});
  const [analysisType, setAnalysisType] = useState<AnalysisType>('initial');
  const [poNumber, setPoNumber] = useState('');
  const [shippingPlanError, setShippingPlanError] = useState<'no' | 'yes'>('no');
  const [suggest3PL, setSuggest3PL] = useState<'yes' | 'no'>('no');
  const [doneTracker, setDoneTracker] = useState(false);
  const [doneFbaErrorTracker, setDoneFbaErrorTracker] = useState(false);
  const [doneTrackerSubmission, setDoneTrackerSubmission] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [generatedStats, setGeneratedStats] = useState<GenerationStats | null>(null);
  const [enableExcluded, setEnableExcluded] = useState(false);

  const isDark = theme === 'dark';
  const typeConfig = TYPE_CONFIG[analysisType];

  const parseExcelFile = async (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
          resolve(json.filter(r => r.some(c => c && c.toString().trim() !== '')));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCsvText = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const rows: string[][] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let insideQuote = false, entry = '';
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') insideQuote = !insideQuote;
        else if (c === ',' && !insideQuote) { row.push(entry.trim()); entry = ''; }
        else entry += c;
      }
      row.push(entry.trim());
      rows.push(row);
    }
    return rows;
  };

  const handleFileUpload = async (type: 'preApproval' | 'listingData' | 'excluded', file: File) => {
    if (!file || file.name === '') {
      setUploadedFiles(prev => { const n = { ...prev }; delete n[type]; return n; });
      return;
    }
    try {
      let rows: string[][] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        rows = parseCsvText(text);
      } else {
        rows = await parseExcelFile(file);
      }
      if (rows.length === 0) throw new Error('File contains no data.');
      setUploadedFiles(prev => ({ ...prev, [type]: { filename: file.name, content: file.name, rows } }));
      setError('');
    } catch (err) {
      setError(`Failed to parse ${file.name}. Please ensure it's a valid Excel or CSV file.`);
    }
  };

  const parseForInitial = (fileData?: POFileData) => {
    if (!fileData?.rows || fileData.rows.length <= 1) return { totalSkus: 0, totalQty: 0, issuesMap: {} as Record<string, { skus: number; qty: number }> };
    const headers = fileData.rows[0].map(h => String(h || '').toLowerCase().trim());
    const skuIdx = headers.findIndex(h => h === 'sku') !== -1 ? headers.findIndex(h => h === 'sku') : 0;
    const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'order') !== -1 ? headers.findIndex(h => h === 'qty' || h === 'order') : 6;
    const notesIdx = headers.findIndex(h => h === 'notes');
    let totalSkus = 0, totalQty = 0;
    const issuesMap: Record<string, { skus: number; qty: number }> = {};
    for (let i = 1; i < fileData.rows.length; i++) {
      const row = fileData.rows[i];
      if (row?.length > Math.max(skuIdx, qtyIdx)) {
        const sku = row[skuIdx]?.toString().trim();
        if (sku) {
          totalSkus++;
          const qty = parseInt(row[qtyIdx]?.toString(), 10) || 0;
          totalQty += qty;
          if (notesIdx !== -1 && row[notesIdx]) {
            const note = row[notesIdx].toString().trim();
            if (note && note !== '#N/A' && !note.startsWith('=') && note !== 'Good to Order' && note !== 'Good') {
              if (!issuesMap[note]) issuesMap[note] = { skus: 0, qty: 0 };
              issuesMap[note].skus++; issuesMap[note].qty += qty;
            }
          }
        }
      }
    }
    return { totalSkus, totalQty, issuesMap };
  };

  const parseWithRemarks = (fileData?: POFileData) => {
    if (!fileData?.rows || fileData.rows.length <= 1) return { totalSkus: 0, totalQty: 0, issuesMap: {} as Record<string, { skus: number; qty: number }>, hasRemarksColumn: false };
    
    const headers = fileData.rows[0].map(h => String(h || '').toLowerCase().trim());
    const skuIdx = headers.findIndex(h => h === 'sku') !== -1 ? headers.findIndex(h => h === 'sku') : 0;
    const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'order') !== -1 ? headers.findIndex(h => h === 'qty' || h === 'order') : 6;
    const remIdx = headers.findIndex(h => h === 'remarks' || h === 'remark');
    const hasRemarksColumn = remIdx !== -1;
    
    let totalSkus = 0, totalQty = 0;
    const issuesMap: Record<string, { skus: number; qty: number }> = {};
    
    for (let i = 1; i < fileData.rows.length; i++) {
      const row = fileData.rows[i];
      if (row?.length > Math.max(skuIdx, qtyIdx)) {
        const sku = row[skuIdx]?.toString().trim();
        if (sku) {
          totalSkus++;
          const qty = parseInt(row[qtyIdx]?.toString(), 10) || 0;
          totalQty += qty;
          
          if (hasRemarksColumn && remIdx !== -1 && row[remIdx]) {
            const rem = row[remIdx].toString().trim();
            if (rem && rem !== '#N/A' && !rem.startsWith('=') && rem !== 'Good to Order' && rem !== 'Good') {
              if (!issuesMap[rem]) issuesMap[rem] = { skus: 0, qty: 0 };
              issuesMap[rem].skus++; 
              issuesMap[rem].qty += qty;
            }
          }
        }
      }
    }
    return { totalSkus, totalQty, issuesMap, hasRemarksColumn };
  };

  const saveBasecampGeneration = async ({ message, stats, status, errorMessage }: { message: string | null; stats: GenerationStats; status: 'completed' | 'failed'; errorMessage?: string | null }) => {
    const { error: insertError } = await supabase.from('basecamp_generations').insert({
      po_number: poNumber.trim() || null, analysis_type: analysisType,
      total_skus: stats.totalSkus, total_qty: stats.totalQty, issue_count: stats.issueCount,
      shipping_plan_error: shippingPlanError, suggest_3pl: suggest3PL,
      done_tracker: doneTracker, done_fba_error_tracker: doneFbaErrorTracker, done_tracker_submission: doneTrackerSubmission,
      pre_approval_filename: uploadedFiles.preApproval?.filename ?? null,
      listing_data_filename: uploadedFiles.listingData?.filename ?? null,
      excluded_filename: uploadedFiles.excluded?.filename ?? null,
      message_preview: message?.slice(0, 500) ?? null, message_full: message, status, error: errorMessage ?? null,
    });
    if (insertError) throw insertError;
  };

  const generateMessage = async () => {
    setIsGenerating(true);
    setError('');

    try {
      console.log('Starting message generation...');
      
      let message = '';
      const poPrefix = poNumber.trim() ? poNumber.trim() : '[PO Number]';
      let stats: GenerationStats = { totalSkus: 0, totalQty: 0, issueCount: 0 };

      if (analysisType === 'pre-approval' && !uploadedFiles.preApproval) {
        throw new Error('Pre-approval file is required');
      }
      if ((analysisType === 'initial' || analysisType === 'final' || analysisType === 'for-fixing') && !uploadedFiles.listingData) {
        throw new Error('Listing data file is required');
      }

      console.log('Files validated, processing...');

      if (analysisType === 'initial') {
        const { totalSkus, totalQty, issuesMap } = parseForInitial(uploadedFiles.listingData);
        const hasIssues = Object.keys(issuesMap).length > 0;
        
        stats = { totalSkus, totalQty, issueCount: Object.keys(issuesMap).length };
        
        message = `Hi Ms, kindly see the initial analysis for this PO#: ${poPrefix}. Thank you!\n`;
        message += `Total No. of SKUs in Order: ${totalSkus} | QTY: ${totalQty} (Good to Order)\n`;
        
        if (hasIssues) {
          message += `\n`;
          Object.entries(issuesMap).forEach(([note, data]) => {
            message += ` | ${note}: ${data.skus} | QTY: ${data.qty}\n`;
          });
        }
        
        if (doneTracker) message += `\n✅Done updating the tracker\n`;
        
      } else if (analysisType === 'final') {
        const { totalSkus, totalQty, issuesMap } = parseWithRemarks(uploadedFiles.listingData);
        const hasIssues = Object.keys(issuesMap).length > 0;
        
        stats = { totalSkus, totalQty, issueCount: Object.keys(issuesMap).length };
        
        if (enableExcluded && uploadedFiles.excluded) {
          message = `Hi Ms, kindly see the Listing Data and Excluded file for this PO#: ${poPrefix}. Thank you!\n`;
        } else {
          message = `Hi Ms, kindly see the Listing Data for this PO#: ${poPrefix}. Thank you!\n`;
        }
        
        message += `Total No. of SKUs in Order: ${totalSkus} | QTY: ${totalQty} (Good to Order)\n`;
        
        if (enableExcluded && uploadedFiles.excluded) {
          const { totalSkus: exSkus, totalQty: exQty } = parseWithRemarks(uploadedFiles.excluded);
          if (exSkus > 0) {
            message += `Total No. of Excluded SKUs: ${exSkus} | QTY: ${exQty}\n`;
          }
        }
        
        if (hasIssues) {
          message += `\n`;
          Object.entries(issuesMap).forEach(([remark, data]) => {
            message += ` | ${remark}: ${data.skus} | QTY: ${data.qty}\n`;
          });
        }
        
        message += shippingPlanError === 'yes' ? `\nShipping Plan Error\n` : `\nNo error in shipping plan creation\n`;
        if (doneTracker) message += `✅Done updating the tracker\n`;
        if (doneFbaErrorTracker) message += `✅Done adding to FBA ASIN Errors Encountered tracker\n`;
        if (doneTrackerSubmission) message += `✅Added to Thorogood - Amazon Deliverables Tracker & Form Submission:\n`;
        if (suggest3PL === 'yes') message += `Note: Please see the remarks column for items suggested for 3PL.\n`;
        
      } else if (analysisType === 'pre-approval') {
        const { totalSkus, totalQty, issuesMap } = parseWithRemarks(uploadedFiles.preApproval);
        const hasIssues = Object.keys(issuesMap).length > 0;
        
        stats = { totalSkus, totalQty, issueCount: Object.keys(issuesMap).length };
        
        message = `Hi, please see the attached Pre-Approval file for these items to see if it is good to order or exclude. Thank you!\n`;
        message += `Total No. of SKUs for Pre-Approval: ${totalSkus} | QTY: ${totalQty}\n`;
        
        if (hasIssues) {
          message += `\n`;
          Object.entries(issuesMap).forEach(([remark, data]) => {
            message += ` | ${remark}: ${data.skus} | QTY: ${data.qty}\n`;
          });
        }
        
      } else {
        const { totalSkus, totalQty, issuesMap } = parseWithRemarks(uploadedFiles.listingData || uploadedFiles.preApproval);
        const hasIssues = Object.keys(issuesMap).length > 0;
        
        stats = { totalSkus, totalQty, issueCount: Object.keys(issuesMap).length };
        
        message = `Hi Ms, forwarding this file for fixing. Thank you!\n`;
        message += `Total No. of SKUs For Fixing in Order: ${totalSkus} | QTY: ${totalQty}\n`;
        
        if (hasIssues) {
          message += `\n`;
          Object.entries(issuesMap).forEach(([remark, data]) => {
            message += ` | ${remark}: ${data.skus} | QTY: ${data.qty}\n`;
          });
        }
        
        if (doneTracker) message += `\n✅Done updating the tracker\n`;
      }

      console.log('Message generated, saving to database...');

      setGeneratedMessage(message);
      setGeneratedStats(stats);
      
      try {
        await saveBasecampGeneration({ message, stats, status: 'completed' });
        console.log('Saved to database successfully');
      } catch (dbError) {
        console.error('Database save failed:', dbError);
      }
      
      try {
        await logToolRun({
          toolType: 'basecamp', status: 'completed', title: 'Basecamp message generated',
          description: `${analysisType.replace('-', ' ')} message generated${poNumber.trim() ? ` for PO ${poNumber.trim()}` : ''}.`,
          totalCount: stats.totalSkus, successCount: stats.totalQty, issueCount: stats.issueCount,
          metadata: { poNumber: poNumber.trim() || null, analysisType, ...stats, preApprovalFilename: uploadedFiles.preApproval?.filename ?? null, listingDataFilename: uploadedFiles.listingData?.filename ?? null, excludedFilename: uploadedFiles.excluded?.filename ?? null },
        });
        console.log('Logged to tool runs successfully');
      } catch (logError) {
        console.error('Logging failed:', logError);
      }
      
    } catch (err) {
      console.error('Generation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate Basecamp message.';
      setError(msg);
      
      try {
        await saveBasecampGeneration({ message: null, stats: { totalSkus: 0, totalQty: 0, issueCount: 1 }, status: 'failed', errorMessage: msg });
      } catch {}
      
      await logToolRun({ 
        toolType: 'basecamp', status: 'failed', title: 'Basecamp message generation failed', 
        description: msg, totalCount: 0, successCount: 0, issueCount: 1, 
        metadata: { poNumber: poNumber.trim() || null, analysisType } 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setUploadedFiles({}); 
    setPoNumber(''); 
    setGeneratedMessage(''); 
    setError('');
    setShippingPlanError('no'); 
    setSuggest3PL('no');
    setDoneTracker(false); 
    setDoneFbaErrorTracker(false); 
    setDoneTrackerSubmission(false);
    setGeneratedStats(null);
    setEnableExcluded(false);
  };

  const hasRequiredFiles = () => {
    if (analysisType === 'pre-approval') return !!uploadedFiles.preApproval;
    if (analysisType === 'final') {
      return !!uploadedFiles.listingData;
    }
    return !!uploadedFiles.listingData;
  };

  const messageLineCount = generatedMessage ? generatedMessage.split('\n').filter(Boolean).length : 0;

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <div className={`min-w-0 rounded-2xl border p-4 shadow-lg sm:p-6 ${isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Configuration</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
              isDark ? `border ${typeConfig.darkBg.split(' ')[1]} bg-transparent ${typeConfig.darkText}` : `border ${typeConfig.lightBg.split(' ')[1]} bg-transparent ${typeConfig.lightText}`
            }`}>
              {typeConfig.label}
            </span>
          </div>

          <div className="mb-5">
            <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Message Type</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(['initial', 'final', 'pre-approval', 'for-fixing'] as const).map(type => {
                const cfg = TYPE_CONFIG[type];
                const active = analysisType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setAnalysisType(type);
                      if (type !== 'final') setEnableExcluded(false);
                    }}
                    className={`min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold capitalize transition-all sm:text-sm ${
                      active
                        ? cfg.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : cfg.color === 'amber' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.replace('-', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>PO Number</label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="e.g. FDANN010726PBB"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className={`mb-5 space-y-4 rounded-xl border p-4 ${isDark ? 'border-slate-700/40 bg-slate-800/30' : 'border-gray-100 bg-gray-50'}`}>
            {(analysisType === 'initial' || analysisType === 'final') && (
              <div>
                <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Shipping Plan</label>
                <select
                  value={shippingPlanError}
                  onChange={e => setShippingPlanError(e.target.value as 'no' | 'yes')}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                >
                  <option value="no">No error in shipping plan creation</option>
                  <option value="yes">Shipping Plan Error</option>
                </select>
              </div>
            )}
            {analysisType === 'final' && (
              <div>
                <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>3PL Suggestion</label>
                <select
                  value={suggest3PL}
                  onChange={e => setSuggest3PL(e.target.value as 'yes' | 'no')}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                >
                  <option value="no">Do not suggest items to 3PL</option>
                  <option value="yes">Suggest to 3PL</option>
                </select>
              </div>
            )}
            
            <div>
              <label className={`mb-2 block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Checklist</label>
              <div className={`space-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {(analysisType === 'initial' || analysisType === 'for-fixing') && (
                  <CheckboxRow label="Done updating the tracker" checked={doneTracker} onChange={() => setDoneTracker(c => !c)} isDark={isDark} />
                )}
                {analysisType === 'final' && (
                  <>
                    <CheckboxRow label="Done updating the tracker" checked={doneTracker} onChange={() => setDoneTracker(c => !c)} isDark={isDark} />
                    <CheckboxRow label="Done adding to FBA ASIN Errors Encountered tracker" checked={doneFbaErrorTracker} onChange={() => setDoneFbaErrorTracker(c => !c)} isDark={isDark} />
                    <CheckboxRow label="Added to Thorogood - Amazon Deliverables Tracker & Form Submission" checked={doneTrackerSubmission} onChange={() => setDoneTrackerSubmission(c => !c)} isDark={isDark} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* File uploads section */}
          <div className="space-y-4">
            {analysisType === 'pre-approval' && (
              <FileUploadArea theme={theme} label="Pre-Approval PO File" description="Upload the pre-approval PO file for review" accept=".csv,.xlsx,.xls"
                onUpload={f => handleFileUpload('preApproval', f)} filename={uploadedFiles.preApproval?.filename} rowCount={uploadedFiles.preApproval?.rows?.length} />
            )}
            
            {(analysisType === 'initial' || analysisType === 'final' || analysisType === 'for-fixing') && (
              <>
                <FileUploadArea theme={theme} label="Listing Data PO File" description="Upload the main listing data PO file" accept=".csv,.xlsx,.xls" required
                  onUpload={f => handleFileUpload('listingData', f)} filename={uploadedFiles.listingData?.filename} rowCount={uploadedFiles.listingData?.rows?.length} />
                
                {/* Enable Excluded File Toggle - Positioned right after Listing Data upload */}
                {analysisType === 'final' && (
                  <div className={`mt-3 rounded-lg border p-3 ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'}`}>
                    <CheckboxRow 
                      label="Enable Excluded File" 
                      checked={enableExcluded} 
                      onChange={() => {
                        setEnableExcluded(!enableExcluded);
                        if (enableExcluded) {
                          setUploadedFiles(prev => {
                            const newFiles = { ...prev };
                            delete newFiles.excluded;
                            return newFiles;
                          });
                        }
                      }} 
                      isDark={isDark} 
                    />
                    <p className={`text-xs mt-1 ml-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {enableExcluded 
                        ? "✓ Excluded file upload is enabled. Drop your file below." 
                        : "Enable this to upload and include excluded items in the message"}
                    </p>
                  </div>
                )}
                
                {/* Excluded file upload - Only shows when enabled */}
                {analysisType === 'final' && enableExcluded && (
                  <div className="mt-2">
                    <FileUploadArea theme={theme} label="Excluded Items File" description="Upload the excluded items file" accept=".csv,.xlsx,.xls"
                      onUpload={f => handleFileUpload('excluded', f)} filename={uploadedFiles.excluded?.filename} rowCount={uploadedFiles.excluded?.rows?.length} />
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={generateMessage}
              disabled={!hasRequiredFiles() || isGenerating}
              className={`flex w-full flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all ${
                hasRequiredFiles() && !isGenerating
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                  : 'cursor-not-allowed opacity-50 bg-emerald-500/40 text-white'
              }`}
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Generate Message</>
              )}
            </button>
            <button
              type="button" onClick={clearAll}
              className={`w-full rounded-xl px-4 py-3 font-semibold transition-colors sm:w-auto ${isDark ? 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              Clear
            </button>
          </div>
        </div>

        <div className={`min-w-0 rounded-2xl border p-4 shadow-lg sm:p-6 ${isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Generated Message</h2>
              {generatedMessage && (
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  isDark ? `${typeConfig.darkBg} ${typeConfig.darkText}` : `${typeConfig.lightBg} ${typeConfig.lightText}`
                }`}>
                  {typeConfig.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {generatedMessage && generatedStats && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Zap className="h-3 w-3 text-emerald-400" />
                    {generatedStats.totalSkus} SKUs
                  </span>
                  <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <MessageSquare className="h-3 w-3 text-cyan-400" />
                    {messageLineCount} lines
                  </span>
                </div>
              )}
              {generatedMessage && (
                <button
                  type="button" onClick={copyToClipboard}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {copied ? <><Check className="h-4 w-4 text-emerald-400" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
                </button>
              )}
            </div>
          </div>

          <div className={`min-h-[360px] rounded-xl border sm:min-h-[420px] ${isDark ? 'border-slate-700 bg-slate-950/50' : 'border-gray-200 bg-gray-50'}`}>
            {generatedMessage ? (
              <div className={`rounded-xl border p-4 h-full ${isDark ? typeConfig.darkBg : typeConfig.lightBg}`}>
                <div className={`mb-3 flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  <MessageSquare className={`h-4 w-4 ${isDark ? typeConfig.darkText : typeConfig.lightText}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? typeConfig.darkText : typeConfig.lightText}`}>
                    {typeConfig.label}
                  </span>
                  {poNumber && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-white/10 text-white/70' : 'bg-black/10 text-black/60'}`}>
                      PO: {poNumber}
                    </span>
                  )}
                </div>
                <pre className={`max-w-full whitespace-pre-wrap break-words font-sans text-sm leading-relaxed ${isDark ? typeConfig.darkText : typeConfig.lightText}`}>
                  {generatedMessage}
                </pre>
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-4 text-center sm:min-h-[400px]">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <Sparkles className={`h-10 w-10 animate-pulse ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Generating your message...</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Parsing file data and building output</p>
                  </div>
                ) : (
                  <>
                    <MessageSquare className={`mb-3 h-12 w-12 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
                    <p className={`max-w-sm text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      {!hasRequiredFiles() ? 'Upload required files and click generate' : 'Click "Generate Message" to create your Basecamp response'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({ label, checked, onChange, isDark }: { label: string; checked: boolean; onChange: () => void; isDark: boolean }) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2 rounded-lg p-2 transition-colors hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 flex-shrink-0 rounded text-emerald-500 focus:ring-emerald-500" />
      <span className="break-words leading-5 text-sm">{label}</span>
    </label>
  );
}

function FileUploadArea({ theme, label, description, accept, required = false, onUpload, filename, rowCount }: {
  theme: 'light' | 'dark'; label: string; description: string; accept: string; required?: boolean;
  onUpload: (file: File) => void; filename?: string; rowCount?: number;
}) {
  const isDark = theme === 'dark';
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {filename ? (
        <div className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex min-w-0 items-center gap-2">
            <FileText className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`truncate text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`} title={filename}>{filename}</span>
            {rowCount && rowCount > 1 && (
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {rowCount - 1} rows
              </span>
            )}
          </div>
          <button type="button" onClick={() => onUpload(new File([], ''))} className={`self-start text-xs ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}>
            Remove
          </button>
        </div>
      ) : (
        <div
          className={`relative rounded-xl border-2 border-dashed p-4 text-center transition-all sm:p-5 ${
            isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]' : isDark ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
        >
          <Upload className={`mx-auto mb-2 h-7 w-7 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Drop file or{' '}
            <label className="cursor-pointer text-emerald-500 hover:text-emerald-400 hover:underline">
              browse
              <input type="file" accept={accept} onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} className="hidden" />
            </label>
          </p>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{description}</p>
        </div>
      )}
    </div>
  );
}