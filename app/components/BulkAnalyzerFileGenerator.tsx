'use client';

import { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Upload, Loader2, CheckCircle2, AlertCircle, X, RefreshCw, FileText, FileCheck, FileX, FileWarning } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// Remarks-based filtering rules
const FILTER_RULES: Record<string, (row: any) => boolean> = {
  'listing-data': (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v === 'Good to Order' || v === 'Good to Order/For Fixing';
  },
  'pre-approval': (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v === 'For Pre-approval';
  },
  excluded: (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v.toLowerCase().includes('exclude');
  },
  'for-fixing': (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v === 'Good to Order/For Fixing';
  },
};

const TEMPLATES = [
  {
    id: 'listing-data',
    name: 'Listing Data',
    description: 'Good to Order items',
    icon: <FileText className="h-5 w-5" />,
    color: 'emerald',
    headers: ['SKU', 'UPC', 'ASIN', 'Title', 'Cost', 'Disc.Cost', 'Qty', 'Listing Status'],
  },
  {
    id: 'pre-approval',
    name: 'Pre-approval File',
    description: 'For Pre-approval items',
    icon: <FileCheck className="h-5 w-5" />,
    color: 'blue',
    headers: ['SKU', 'UPC', 'ASIN', 'Title', 'Cost', 'Disc.Cost', 'Qty', 'Listing Status', 'Possible Risk of Ordering'],
  },
  {
    id: 'excluded',
    name: 'Excluded File',
    description: 'Excluded items',
    icon: <FileX className="h-5 w-5" />,
    color: 'red',
    headers: ['SKU', 'UPC', 'ASIN', 'Title', 'Cost', 'Disc.Cost', 'Qty', 'Listing Status', 'Possible Risk of Ordering'],
  },
  {
    id: 'for-fixing',
    name: 'For Fixing',
    description: 'Good to Order/For Fixing items',
    icon: <FileWarning className="h-5 w-5" />,
    color: 'yellow',
    headers: ['SKU', 'UPC', 'ASIN', 'Title', 'Cost', 'Disc.Cost', 'Qty', 'Listing Status', 'Possible Risk of Ordering'],
  },
];

// Map a raw analyzed row → output row
function mapRow(raw: any, headers: string[], templateId: string): any {
  const mapped: any = {};
  for (const h of headers) {
    switch (h) {
      case 'SKU':
        mapped.SKU = raw['SKU'] ?? '';
        break;
      case 'UPC':
        mapped.UPC = raw['UPC'] ?? '';
        break;
      case 'ASIN':
        mapped.ASIN = raw['DD ASIN'] || raw['All Listings ASIN'] || raw['LL ASIN'] || raw['ASIN'] || '';
        break;
      case 'Title':
        mapped.Title = raw['DD Title'] || raw['Orvis Title'] || raw['Title'] || '';
        break;
      case 'Cost':
        mapped.Cost = raw['Final Cost'] ?? raw['Item Cost'] ?? '';
        break;
      case 'Disc.Cost':
        mapped['Disc.Cost'] = raw['Final Disc Cost'] ?? raw['Disc Cost'] ?? '';
        break;
      case 'Qty':
        mapped.Qty = raw['Order'] ?? raw['Qty'] ?? 0;
        break;
      case 'Listing Status':
        mapped['Listing Status'] = raw['All Listing Status'] || raw['Listing Status'] || '';
        break;
      case 'Possible Risk of Ordering':
        mapped['Possible Risk of Ordering'] = '';
        break;
      default:
        mapped[h] = raw[h] ?? '';
    }
  }
  return mapped;
}

// Build styled Excel file using ExcelJS
async function buildStyledExcelFile(rows: any[], template: any): Promise<Buffer> {
  const { headers, name } = template;
  
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(name.substring(0, 31));
  
  // Add header row
  const headerRow = worksheet.addRow(headers);
  
  // Clean native border styling configuration
  const nativeBorder = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  } as ExcelJS.Borders;

  // Style header row - YELLOW background (#FFFF00)
  headerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }, // Yellow
    };
    cell.font = {
      bold: true,
      color: { argb: 'FF000000' }, // Black text
      size: 11,
      name: 'Calibri'
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    cell.border = nativeBorder;
  });
  
  // Find Qty column index
  const qtyColIndex = headers.indexOf('Qty');
  
  // Add data rows
  rows.forEach((row: any) => {
    const dataRow = worksheet.addRow(headers.map((h: string) => row[h] ?? ''));
    
    dataRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      const isQtyColumn = colNumber - 1 === qtyColIndex;
      cell.border = nativeBorder;
      
      if (isQtyColumn) {
        // GREEN background for Qty column (#00B050)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00B050' }, // Green (#00B050)
        };
        cell.font = {
          bold: false,
          color: { argb: 'FF000000' }, // Black text
          size: 11,
          name: 'Calibri'
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
      } else {
        // No background color for other columns
        cell.font = {
          color: { argb: 'FF000000' }, // Black text
          size: 11,
          name: 'Calibri'
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };
      }
    });
  });
  
  // Auto-fit columns
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    let maxLength = headers[colIndex].length;
    rows.forEach((row: any) => {
      const value = row[headers[colIndex]] ?? '';
      const length = String(value).length;
      if (length > maxLength) maxLength = Math.min(length, 50);
    });
    const column = worksheet.getColumn(colIndex + 1);
    if (column) {
      column.width = maxLength + 4;
    }
  }
  
  // Freeze header row
  worksheet.views = [
    { state: 'frozen', ySplit: 1, xSplit: 0 },
  ];
  
  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const COLOR: Record<string, { bg: string; border: string; text: string; selBg: string; selBorder: string }> = {
  emerald: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', selBg: 'bg-emerald-50', selBorder: 'border-emerald-500' },
  blue:    { bg: 'bg-blue-100',    border: 'border-blue-300',    text: 'text-blue-700',    selBg: 'bg-blue-50',    selBorder: 'border-blue-500' },
  red:     { bg: 'bg-red-100',     border: 'border-red-300',     text: 'text-red-700',     selBg: 'bg-red-50',     selBorder: 'border-red-500' },
  yellow:  { bg: 'bg-yellow-100',  border: 'border-yellow-300',  text: 'text-yellow-700',  selBg: 'bg-yellow-50',  selBorder: 'border-yellow-500' },
};

interface FileGeneratorProps {
  theme?: 'light' | 'dark';
}

export default function FileGenerator({ theme = 'dark' }: FileGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [processedData, setProcessedData] = useState<any[] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#0F172A]' : 'bg-gray-100';
  const card = isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  const validateAndSetFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { 
      setError('Please upload a valid spreadsheet file (.xlsx, .xls, or .csv)'); 
      return false;
    }
    setFile(f);
    setError(null); 
    setSuccess(null); 
    setPreviewData(null); 
    setProcessedData(null); 
    setSelectedTemplate(null);
    return true;
  };

  const parseFile = (f: File): Promise<any[]> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
          res(jsonData);
        } catch (err) { 
          rej(err); 
        }
      };
      reader.onerror = () => rej(new Error('Failed to read file'));
      reader.readAsBinaryString(f);
    });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    validateAndSetFile(f);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const processFile = async () => {
    if (!file || !selectedTemplate) return;
    setIsProcessing(true); 
    setError(null); 
    setSuccess(null); 
    setPreviewData(null);
    try {
      const raw = await parseFile(file);
      if (!raw.length) throw new Error('No data found in the file');

      const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
      if (!tmpl) throw new Error('Template not found');
      
      const filter = FILTER_RULES[selectedTemplate];
      const filtered = raw.filter(filter);

      if (!filtered.length) {
        throw new Error(`No rows matched "${tmpl.name}" based on the Remarks column`);
      }

      const mapped = filtered.map((r: any) => mapRow(r, tmpl.headers, selectedTemplate));
      setProcessedData(mapped);
      setPreviewData(mapped.slice(0, 10));
      setSuccess(`Found ${mapped.length} items for "${tmpl.name}"`);
    } catch (err: any) {
      setError(err.message || 'Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const tmpl = selectedTemplate ? TEMPLATES.find(t => t.id === selectedTemplate) : null;

  // DYNAMIC HEADER LOGIC: Check if Disc.Cost actually has any data
  const hasDiscCostData = processedData?.some(row => {
    const val = row['Disc.Cost'];
    return val !== '' && val !== null && val !== undefined;
  });

  // Filter out Disc.Cost if there is no data in it
  const activeHeaders = tmpl 
    ? tmpl.headers.filter((h) => h !== 'Disc.Cost' || hasDiscCostData)
    : [];

  const handleDownload = async () => {
    if (!processedData || !selectedTemplate || !tmpl) return;
    try {
      // Pass the dynamically filtered activeHeaders so Disc.Cost is removed if empty
      const buffer = await buildStyledExcelFile(processedData, { ...tmpl, headers: activeHeaders });
      const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${tmpl.name.replace(/\s+/g, '_')}_${ts}.xlsx`;
      
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(`Downloaded ${tmpl.name} — ${processedData.length} rows`);
    } catch (err: any) {
      setError('Error generating file: ' + err.message);
    }
  };

  const clearAll = () => {
    setFile(null); 
    setSelectedTemplate(null); 
    setError(null);
    setSuccess(null); 
    setPreviewData(null); 
    setProcessedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`min-h-screen p-6 ${bg}`}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-6 shadow-lg ${card}`}>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
            <FileSpreadsheet className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>File Generator</h1>
            <p className={`text-sm ${textMuted}`}>
              Upload spreadsheet to generate categorized Excel files based on Remarks column
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT — Upload & Configure */}
          <div className={`rounded-2xl border p-6 shadow-lg ${card}`}>
            <h2 className={`mb-4 text-lg font-semibold ${textPrimary}`}>Step 1: Upload & Configure</h2>

            {/* File Upload with Drag & Drop */}
            <div className="mb-5">
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Upload Spreadsheet
              </label>
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-all ${
                    isDragOver 
                      ? 'border-orange-500 bg-orange-500/10' 
                      : isDark 
                        ? 'border-slate-700 hover:border-slate-500' 
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleUpload} 
                    className="hidden" 
                    id="file-upload" 
                  />
                  <Upload className={`h-10 w-10 ${isDragOver ? 'text-orange-500' : textMuted}`} />
                  <span className={`text-sm ${textMuted}`}>
                    {isDragOver ? 'Drop your file here' : 'Drag & drop or click to upload'}
                  </span>
                  <span className={`text-xs ${textMuted}`}>
                    Supports .xlsx, .xls, .csv
                  </span>
                </div>
              ) : (
                <div className={`flex items-center justify-between rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{file.name}</p>
                      <p className={`text-xs ${textMuted}`}>{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={clearAll} 
                    className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="mb-5">
              <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Select Output Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((t) => {
                  const c = COLOR[t.color];
                  const sel = selectedTemplate === t.id;
                  return (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                      className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${sel ? `${c.selBg} ${c.selBorder} border-2 shadow` : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`rounded-lg p-2 ${c.bg} ${c.text}`}>{t.icon}</div>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{t.name}</p>
                      <p className={`text-xs ${textMuted}`}>{t.description}</p>
                      {sel && <CheckCircle2 className={`absolute right-3 top-3 h-4 w-4 ${c.text}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formatting legend */}
            <div className={`mb-5 rounded-lg border p-3 text-xs ${isDark ? 'border-slate-700 bg-slate-800/30 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              <p className="mb-2 font-semibold">Excel Formatting:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="h-4 w-4 border border-zinc-300 bg-yellow-300" /><span>✅ Header row — Yellow background (#FFFF00), bold, black text</span></div>
                <div className="flex items-center gap-2"><div className="h-4 w-4 border border-zinc-300 bg-green-500" /><span>✅ Qty column — Green background (#00B050), black text</span></div>
                <div className="flex items-center gap-2"><div className="h-4 w-4 border border-zinc-300 bg-white" /><span>✅ "Possible Risk of Ordering" is kept entirely empty</span></div>
                <div className="flex items-center gap-2"><div className="h-4 w-4 border border-zinc-300 bg-white" /><span>✅ "Disc.Cost" is automatically hidden if it has no data</span></div>
              </div>
            </div>

            <button onClick={processFile} disabled={!file || !selectedTemplate || isProcessing}
              className={`w-full rounded-xl px-4 py-3 font-semibold transition-all ${!file || !selectedTemplate || isProcessing ? 'cursor-not-allowed opacity-40' : isDark ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
              {isProcessing
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processing…</span>
                : `Generate ${tmpl ? tmpl.name : 'File'}`}
            </button>

            {error && (
              <div className={`mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 p-3 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* RIGHT — Preview & Download */}
          <div className={`rounded-2xl border p-6 shadow-lg ${card}`}>
            <h2 className={`mb-4 text-lg font-semibold ${textPrimary}`}>Step 2: Preview & Download</h2>

            {!previewData && !isProcessing && (
              <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <RefreshCw className={`mb-4 h-10 w-10 ${textMuted}`} />
                <p className={`text-sm ${textMuted}`}>Select a template and click Generate</p>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
                <p className={`text-sm ${textMuted}`}>Processing…</p>
              </div>
            )}

            {previewData && processedData && tmpl && (
              <div className="space-y-4">
                {/* Stats */}
                <div className={`flex gap-4 rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'}`}>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Total rows</p>
                    <p className={`text-2xl font-bold ${textPrimary}`}>{processedData.length}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Template</p>
                    <p className={`text-lg font-semibold ${textPrimary}`}>{tmpl.name}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted}`}>Columns</p>
                    <p className={`text-2xl font-bold ${textPrimary}`}>{activeHeaders.length}</p>
                  </div>
                </div>

                {/* Preview table */}
                <div>
                  <p className={`mb-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Preview (first 10 rows)</p>
                  <div className="overflow-x-auto rounded-xl border border-zinc-300">
                    <div className="max-h-80 overflow-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead className="sticky top-0">
                          <tr>
                            {/* Uses activeHeaders dynamically */}
                            {activeHeaders.map((h: string) => (
                              <th key={h} className="border border-zinc-300 bg-yellow-300 px-3 py-2 text-left font-bold text-black whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row: any, ri: number) => (
                            <tr key={ri}>
                              {/* Uses activeHeaders dynamically */}
                              {activeHeaders.map((h: string) => {
                                const isQty = h === 'Qty';
                                const val = row[h] ?? '';
                                const display = String(val).length > 40 ? String(val).slice(0, 40) + '…' : val;
                                return (
                                  <td key={h} className={`border border-zinc-300 px-3 py-1.5 ${isQty ? 'bg-green-500 text-center text-black' : 'text-black bg-white'}`}>
                                    {display}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {processedData.length > 10 && (
                    <p className={`mt-1 text-xs ${textMuted}`}>Showing 10 of {processedData.length} rows</p>
                  )}
                </div>

                {/* Download */}
                <button onClick={handleDownload}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all ${isDark ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  <Download className="h-5 w-5" />
                  Download {tmpl.name} (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}