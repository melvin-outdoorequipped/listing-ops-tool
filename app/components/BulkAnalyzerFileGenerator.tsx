'use client';

import { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  FileText, 
  FileCheck, 
  FileX, 
  FileWarning, 
  Package,
  Zap,
  BarChart2,
  Table,
  Grid,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Filter,
  ListChecks,
  Sparkles,
  Info,
  ArrowRight,
  Clock,
  Calendar,
  Users,
  Building2,
  Tag,
  Hash,
  DollarSign,
  Percent,
  Link2,
  ClipboardList,
  LayoutGrid,
  List,
  FolderOpen,
} from 'lucide-react';
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
    return v === 'For Pre-approval' || v === 'Pre-approval';
  },
  excluded: (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v.toLowerCase().includes('exclude');
  },
  'for-fixing': (r) => {
    const v = (r['Remarks'] || '').toString().trim();
    return v === 'Good to Order/For Fixing' || v === 'For Fixing';
  },
  'shipping-plan': (r) => {
    const sku = (r['All Listings SKU'] || r['SKU'] || '').toString().trim();
    const asin = (r['All Listings ASIN'] || r['DD ASIN'] || r['LL ASIN'] || r['ASIN'] || '').toString().trim();
    return sku !== '' && asin !== '';
  },
};

const TEMPLATES = [
  {
    id: 'listing-data',
    name: 'Listing Data',
    description: 'Good to Order items',
    icon: <FileText className="h-5 w-5" />,
    color: 'emerald',
    templateFile: '/templates/Listing Data.xlsx',
    usesTemplateFile: true,
    badge: 'Most Used',
  },
  {
    id: 'pre-approval',
    name: 'Pre-approval File',
    description: 'For Pre-approval items',
    icon: <FileCheck className="h-5 w-5" />,
    color: 'blue',
    templateFile: '/templates/Pre-approval File.xlsx',
    usesTemplateFile: true,
  },
  {
    id: 'excluded',
    name: 'Excluded File',
    description: 'Excluded items',
    icon: <FileX className="h-5 w-5" />,
    color: 'red',
    templateFile: '/templates/Excluded File.xlsx',
    usesTemplateFile: true,
  },
  {
    id: 'for-fixing',
    name: 'For Fixing',
    description: 'Good to Order/For Fixing items',
    icon: <FileWarning className="h-5 w-5" />,
    color: 'yellow',
    templateFile: '/templates/For Fixing.xlsx',
    usesTemplateFile: true,
  },
  {
    id: 'shipping-plan',
    name: 'Shipping Plan',
    description: 'Generate Amazon FBA shipping plan template',
    icon: <Package className="h-5 w-5" />,
    color: 'purple',
    templateFile: '/templates/dtd_sc-shipping-template-v20240320.xlsx',
    usesTemplateFile: true,
    badge: 'Amazon',
  },
];

const COLOR: Record<string, { bg: string; border: string; text: string; selBg: string; selBorder: string; gradient: string; iconBg: string }> = {
  emerald: { 
    bg: 'bg-emerald-100', 
    border: 'border-emerald-300', 
    text: 'text-emerald-700', 
    selBg: 'bg-emerald-50', 
    selBorder: 'border-emerald-500',
    gradient: 'from-emerald-600 to-teal-600',
    iconBg: 'bg-emerald-500/20',
  },
  blue: { 
    bg: 'bg-blue-100', 
    border: 'border-blue-300', 
    text: 'text-blue-700', 
    selBg: 'bg-blue-50', 
    selBorder: 'border-blue-500',
    gradient: 'from-blue-600 to-cyan-600',
    iconBg: 'bg-blue-500/20',
  },
  red: { 
    bg: 'bg-red-100', 
    border: 'border-red-300', 
    text: 'text-red-700', 
    selBg: 'bg-red-50', 
    selBorder: 'border-red-500',
    gradient: 'from-red-600 to-rose-600',
    iconBg: 'bg-red-500/20',
  },
  yellow: { 
    bg: 'bg-yellow-100', 
    border: 'border-yellow-300', 
    text: 'text-yellow-700', 
    selBg: 'bg-yellow-50', 
    selBorder: 'border-yellow-500',
    gradient: 'from-yellow-600 to-amber-600',
    iconBg: 'bg-yellow-500/20',
  },
  purple: { 
    bg: 'bg-purple-100', 
    border: 'border-purple-300', 
    text: 'text-purple-700', 
    selBg: 'bg-purple-50', 
    selBorder: 'border-purple-500',
    gradient: 'from-purple-600 to-indigo-600',
    iconBg: 'bg-purple-500/20',
  },
};

// Load template file from public folder
async function loadTemplateFile(templatePath: string): Promise<ArrayBuffer> {
  const response = await fetch(templatePath);
  if (!response.ok) {
    throw new Error(`Failed to load template file: ${templatePath}. Please ensure the template exists in the /public/templates/ folder`);
  }
  return await response.arrayBuffer();
}

async function buildFromTemplate(templatePath: string, rows: any[], templateId: string): Promise<Buffer> {
  const templateBuffer = await loadTemplateFile(templatePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in template');
  }
  
  if (templateId === 'shipping-plan' && rows.length > 0 && rows[0].BrandName) {
    const planNameCell = worksheet.getCell('B1');
    if (planNameCell) {
      planNameCell.value = rows[0].BrandName;
    }
  }
  
  let headerRowIndex = -1;
  let dataStartRow = -1;
  const expectedHeaders = getExpectedHeaders(templateId);
  
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIndex === -1) {
      const firstCell = row.getCell(1).value;
      const secondCell = row.getCell(2).value;
      
      if (firstCell && expectedHeaders.some(h => firstCell.toString().includes(h))) {
        headerRowIndex = rowNumber;
        dataStartRow = rowNumber + 1;
      }
      else if (secondCell && expectedHeaders.some(h => secondCell.toString().includes(h))) {
        headerRowIndex = rowNumber;
        dataStartRow = rowNumber + 1;
      }
    }
  });
  
  if (headerRowIndex === -1) {
    headerRowIndex = 1;
    dataStartRow = 2;
  }
  
  if (dataStartRow > 0) {
    const rowCount = worksheet.rowCount;
    for (let i = rowCount; i >= dataStartRow; i--) {
      worksheet.spliceRows(i, 1);
    }
  }
  
  const headerRow = worksheet.getRow(headerRowIndex);
  const columnMap: Record<string, number> = {};
  
  for (let i = 1; i <= 20; i++) {
    const cell = headerRow.getCell(i);
    const headerValue = cell.value ? cell.value.toString().trim() : '';
    
    if (headerValue) {
      if (templateId === 'shipping-plan') {
        if (headerValue === 'MerchantSKU') columnMap.MerchantSKU = i;
        else if (headerValue === 'ASIN') columnMap.ASIN = i;
        else if (headerValue === 'PrepCategory') columnMap.PrepCategory = i;
        else if (headerValue === 'PrepTypes') columnMap.PrepTypes = i;
        else if (headerValue === 'PrepOwner') columnMap.PrepOwner = i;
        else if (headerValue === 'LabelOwner') columnMap.LabelOwner = i;
        else if (headerValue === 'Quantity') columnMap.Quantity = i;
      } else {
        if (headerValue === 'SKU') columnMap.SKU = i;
        else if (headerValue === 'UPC') columnMap.UPC = i;
        else if (headerValue === 'ASIN') columnMap.ASIN = i;
        else if (headerValue === 'Title') columnMap.Title = i;
        else if (headerValue === 'Cost') columnMap.Cost = i;
        else if (headerValue === 'Disc.Cost') columnMap['Disc.Cost'] = i;
        else if (headerValue === 'Qty') columnMap.Qty = i;
        else if (headerValue === 'Listing Status') columnMap['Listing Status'] = i;
        else if (headerValue === 'Remarks') columnMap.Remarks = i;
        else if (headerValue === 'Possible Risk of Ordering') columnMap['Possible Risk of Ordering'] = i;
      }
    }
  }
  
  rows.forEach((row, index) => {
    const newRow = worksheet.getRow(dataStartRow + index);
    
    if (templateId === 'shipping-plan') {
      if (columnMap.MerchantSKU) newRow.getCell(columnMap.MerchantSKU).value = row.MerchantSKU || '';
      if (columnMap.ASIN) newRow.getCell(columnMap.ASIN).value = row.ASIN || '';
      if (columnMap.PrepCategory) newRow.getCell(columnMap.PrepCategory).value = row.PrepCategory || '';
      if (columnMap.PrepTypes) newRow.getCell(columnMap.PrepTypes).value = row.PrepTypes || '';
      if (columnMap.PrepOwner) newRow.getCell(columnMap.PrepOwner).value = row.PrepOwner || 'SELLER';
      if (columnMap.LabelOwner) newRow.getCell(columnMap.LabelOwner).value = row.LabelOwner || 'SELLER';
      if (columnMap.Quantity) newRow.getCell(columnMap.Quantity).value = row.Quantity || 1;
    } else {
      if (columnMap.SKU) newRow.getCell(columnMap.SKU).value = row.SKU || '';
      if (columnMap.UPC) newRow.getCell(columnMap.UPC).value = row.UPC || '';
      if (columnMap.ASIN) newRow.getCell(columnMap.ASIN).value = row.ASIN || '';
      if (columnMap.Title) newRow.getCell(columnMap.Title).value = row.Title || '';
      if (columnMap.Cost) newRow.getCell(columnMap.Cost).value = row.Cost || '';
      if (columnMap['Disc.Cost']) newRow.getCell(columnMap['Disc.Cost']).value = row['Disc.Cost'] || '';
      if (columnMap.Qty) newRow.getCell(columnMap.Qty).value = row.Qty || 0;
      if (columnMap['Listing Status']) newRow.getCell(columnMap['Listing Status']).value = row['Listing Status'] || '';
      if (columnMap.Remarks) newRow.getCell(columnMap.Remarks).value = row.Remarks || '';
      if (columnMap['Possible Risk of Ordering']) newRow.getCell(columnMap['Possible Risk of Ordering']).value = row.Remarks || '';
    }
    
    newRow.commit();
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function getExpectedHeaders(templateId: string): string[] {
  switch (templateId) {
    case 'shipping-plan':
      return ['MerchantSKU', 'ASIN'];
    case 'listing-data':
      return ['SKU', 'ASIN', 'Title'];
    case 'pre-approval':
      return ['SKU', 'ASIN', 'Title', 'Risk'];
    case 'excluded':
      return ['SKU', 'ASIN', 'Title', 'Risk'];
    case 'for-fixing':
      return ['SKU', 'ASIN', 'Title', 'Risk'];
    default:
      return ['SKU', 'ASIN'];
  }
}

function mapRow(raw: any, templateId: string): any {
  const mapped: any = {};
  
  if (templateId === 'shipping-plan') {
    mapped.MerchantSKU = raw['All Listings SKU'] || raw['SKU'] || '';
    mapped.ASIN = raw['All Listings ASIN'] || raw['DD ASIN'] || raw['LL ASIN'] || raw['ASIN'] || '';
    mapped.PrepCategory = '';
    mapped.PrepTypes = '';
    mapped.PrepOwner = 'SELLER';
    mapped.LabelOwner = 'SELLER';
    mapped.Quantity = 1;
    mapped.BrandName = raw['Brand'] || raw['Brand Name'] || raw['Manufacturer'] || 'Shipping Plan';
    return mapped;
  }
  
  mapped.SKU = raw['SKU'] || '';
  mapped.UPC = raw['UPC'] || '';
  mapped.ASIN = raw['DD ASIN'] || raw['All Listings ASIN'] || raw['LL ASIN'] || raw['ASIN'] || '';
  mapped.Title = raw['DD Title'] || raw['Orvis Title'] || raw['Title'] || '';
  mapped.Cost = raw['Final Cost'] || raw['Item Cost'] || '';
  mapped['Disc.Cost'] = raw['Final Disc Cost'] || raw['Disc Cost'] || '';
  mapped.Qty = raw['Order'] || raw['Qty'] || 0;
  mapped['Listing Status'] = raw['All Listing Status'] || raw['Listing Status'] || '';
  mapped.Remarks = raw['Notes'] || raw['Remarks'] || '';
  
  return mapped;
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [expandedHelp, setExpandedHelp] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#0F172A]' : 'bg-gray-100';
  const card = isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  const tmpl = selectedTemplate ? TEMPLATES.find(t => t.id === selectedTemplate) : null;

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
    setProcessingTime(null);
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
    setProcessingTime(null);
    
    const startTime = performance.now();
    
    try {
      const raw = await parseFile(file);
      if (!raw.length) throw new Error('No data found in the file');

      const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
      if (!tmpl) throw new Error('Template not found');
      
      const filter = FILTER_RULES[selectedTemplate];
      let filtered = raw.filter(filter);

      if (selectedTemplate === 'shipping-plan') {
        const skuMap = new Map();
        filtered.forEach(row => {
          const sku = (row['All Listings SKU'] || row['SKU'] || '').toString().trim();
          if (sku) {
            skuMap.set(sku, row);
          }
        });
        filtered = Array.from(skuMap.values());
      }

      if (!filtered.length) {
        throw new Error(`No rows matched "${tmpl.name}" based on the Remarks column`);
      }

      const mapped = filtered.map((r: any) => mapRow(r, selectedTemplate));
      setProcessedData(mapped);
      setPreviewData(mapped.slice(0, 10));
      
      const endTime = performance.now();
      setProcessingTime(Math.round(endTime - startTime));
      
      setSuccess(`✅ Found ${mapped.length} items for "${tmpl.name}" (${processingTime || 'fast'})`);
    } catch (err: any) {
      setError(err.message || 'Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!processedData || !selectedTemplate || !tmpl) return;
    try {
      let buffer: Buffer;
      let filename: string;
      const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      buffer = await buildFromTemplate(tmpl.templateFile!, processedData, selectedTemplate);
      
      if (selectedTemplate === 'shipping-plan') {
        filename = `dtd_sc-shipping-template-v20240320.xlsx`;
      } else {
        filename = `${tmpl.name.replace(/\s+/g, '_')}_${ts}.xlsx`;
      }
      
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
      
      setSuccess(`📥 Downloaded ${tmpl.name} — ${processedData.length} rows`);
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
    setProcessingTime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getPreviewHeaders = () => {
    if (!tmpl) return [];
    if (tmpl.id === 'shipping-plan') {
      return ['MerchantSKU', 'ASIN', 'PrepCategory', 'PrepTypes', 'PrepOwner', 'LabelOwner', 'Quantity'];
    }
    return ['SKU', 'UPC', 'ASIN', 'Title', 'Cost', 'Disc.Cost', 'Qty', 'Listing Status', 'Remarks'];
  };

  const selectedColor = tmpl ? COLOR[tmpl.color] : COLOR.emerald;

  return (
    <div className={`w-full max-w-full space-y-6 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-950' : ''}`}>
      {/* Header */}
      <div className={`rounded-2xl border p-6 shadow-lg ${card}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
              <FileSpreadsheet className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>File Generator</h1>
              <p className={`text-sm ${textMuted}`}>
                Generate Listing Data, Pre-approval, Excluded, For Fixing, or Shipping Plan files
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`rounded-lg border p-2 transition-colors ${
                isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setExpandedHelp(!expandedHelp)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isDark ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/60' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              {expandedHelp ? 'Hide Help' : 'Help'}
            </button>
          </div>
        </div>

        {expandedHelp && (
          <div className={`mt-4 rounded-xl border p-4 animate-slide-in ${
            isDark ? 'border-orange-500/20 bg-orange-600/10' : 'border-orange-300/60 bg-orange-100/60'
          }`}>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              {[
                'Upload your analyzed spreadsheet (Excel or CSV)',
                'Select the output type (Listing Data, Pre-approval, etc.)',
                'The tool filters rows based on the Remarks/Notes column',
                'Preview the first 10 rows before downloading',
                'Download the formatted file with your template formatting preserved',
              ].map((tip, i) => (
                <div key={tip} className={`flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <span className="font-bold text-orange-500">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Upload & Configure */}
        <div className={`rounded-2xl border p-6 shadow-lg ${card}`}>
          <div className="mb-4 flex items-center gap-2">
            <Settings className={`h-5 w-5 ${textMuted}`} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Step 1: Upload & Configure</h2>
            {file && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                ✓ File loaded
              </span>
            )}
          </div>

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
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
                  isDragOver 
                    ? 'border-orange-500 bg-orange-500/10 scale-[1.02]' 
                    : isDark 
                      ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
                <Upload className={`h-12 w-12 ${isDragOver ? 'text-orange-500' : textMuted}`} />
                <span className={`text-sm font-medium ${textPrimary}`}>
                  {isDragOver ? 'Drop your file here' : 'Drag & drop or click to upload'}
                </span>
                <span className={`text-xs ${textMuted}`}>
                  Supports .xlsx, .xls, .csv files
                </span>
              </div>
            ) : (
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border p-4 ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`rounded-lg p-2 ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                    <FileSpreadsheet className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${textPrimary} truncate`}>{file.name}</p>
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

          <div className="mb-5">
            <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Select Output Type
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => {
                const c = COLOR[t.color];
                const sel = selectedTemplate === t.id;
                return (
                  <button 
                    key={t.id} 
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${
                      sel 
                        ? `${c.selBg} ${c.selBorder} border-2 shadow-lg` 
                        : isDark 
                          ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${c.bg} ${c.text}`}>{t.icon}</div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${textPrimary}`}>{t.name}</p>
                      <p className={`text-xs ${textMuted}`}>{t.description}</p>
                    </div>
                    {t.badge && (
                      <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {t.badge}
                      </span>
                    )}
                    {sel && <CheckCircle2 className={`absolute right-3 bottom-3 h-4 w-4 ${c.text}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`mb-5 rounded-lg border p-3 text-xs ${
            isDark ? 'border-slate-700 bg-slate-800/30 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-orange-400" />
              <span className="font-semibold">Formatting Notes:</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><span>📄</span><span>All files use your exact Excel templates from /public/templates/</span></div>
              <div className="flex items-center gap-2"><span>🏷️</span><span>Remarks column is populated from the "Notes" column</span></div>
              <div className="flex items-center gap-2"><span>📊</span><span>Only data rows are replaced - all formatting is preserved</span></div>
            </div>
          </div>

          <button 
            onClick={processFile} 
            disabled={!file || !selectedTemplate || isProcessing}
            className={`w-full rounded-xl px-4 py-3 font-semibold transition-all ${
              !file || !selectedTemplate || isProcessing 
                ? 'cursor-not-allowed opacity-40' 
                : `bg-gradient-to-r ${selectedColor.gradient} text-white hover:shadow-lg hover:scale-[1.02]`
            }`}
          >
            {isProcessing
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processing…</span>
              : <span className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" />
                  Generate {tmpl ? tmpl.name : 'File'}
                </span>
            }
          </button>

          {error && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 p-3 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
          )}

          {success && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 p-3 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}
        </div>

        {/* Step 2: Preview & Download */}
        <div className={`rounded-2xl border p-6 shadow-lg ${card}`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className={`h-5 w-5 ${textMuted}`} />
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Step 2: Preview & Download</h2>
            </div>
            {previewData && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {!previewData && !isProcessing && (
            <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center ${
              isDark ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <FolderOpen className={`mb-4 h-12 w-12 ${textMuted}`} />
              <p className={`text-sm font-medium ${textPrimary}`}>Ready to generate</p>
              <p className={`text-sm ${textMuted}`}>Select a template and click Generate</p>
              <p className={`text-xs ${textMuted} mt-2`}>Preview will appear here</p>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <div className="absolute -inset-1 rounded-full bg-orange-500/20 blur-xl" />
              </div>
              <p className={`mt-4 text-sm font-medium ${textPrimary}`}>Processing your file...</p>
              <p className={`text-sm ${textMuted}`}>Filtering and mapping data</p>
            </div>
          )}

          {previewData && processedData && tmpl && (
            <div className="space-y-4 animate-fade-in">
              <div className={`grid grid-cols-2 gap-3 rounded-xl border p-4 ${
                isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="text-center">
                  <p className={`text-xs ${textMuted}`}>Total Rows</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>{processedData.length}</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${textMuted}`}>Template</p>
                  <p className={`text-lg font-semibold ${textPrimary}`}>{tmpl.name}</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${textMuted}`}>Columns</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>{getPreviewHeaders().length}</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${textMuted}`}>Time</p>
                  <p className={`text-lg font-semibold ${textPrimary}`}>{processingTime || '< 1'}ms</p>
                </div>
              </div>

              {showPreview && (
                <div>
                  <p className={`mb-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Preview (first 10 rows)
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-zinc-300">
                    <div className="max-h-80 overflow-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className={`${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                            {getPreviewHeaders().map((h: string) => (
                              <th key={h} className={`border px-3 py-2 text-left font-bold whitespace-nowrap ${
                                isDark ? 'border-slate-700 text-white' : 'border-gray-300 text-black'
                              }`}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row: any, ri: number) => (
                            <tr key={ri} className={ri % 2 === 0 ? (isDark ? 'bg-slate-900/50' : 'bg-white') : (isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                              {getPreviewHeaders().map((h: string) => {
                                const isQty = h === 'Quantity' || h === 'Qty';
                                const val = row[h] ?? '';
                                const display = String(val).length > 40 ? String(val).slice(0, 40) + '…' : val;
                                return (
                                  <td key={h} className={`border px-3 py-1.5 ${isQty ? 'text-center' : ''} ${
                                    isDark ? 'border-slate-700 text-slate-300' : 'border-gray-300 text-gray-700'
                                  }`}>
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
              )}

              <button 
                onClick={handleDownload}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all ${
                  isDark 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:scale-[1.02]' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:scale-[1.02]'
                }`}
              >
                <Download className="h-5 w-5" />
                Download {tmpl.name} (.xlsx)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}