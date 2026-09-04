// app/components/SkuTracker.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  Building2,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SkuTrackerProps {
  theme: 'light' | 'dark';
}

interface SkuResult {
  sku: string;
  exists: boolean;
  sheetName?: string;
  rowIndex?: number;
  v2Sku?: string;
  brand?: string;
  status?: string;
  dateRequested?: string;
  type?: string;
  agent?: string;
  details?: Record<string, string>;
}

interface BatchResult {
  total: number;
  found: number;
  notFound: number;
  results: SkuResult[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SkuTracker({ theme }: SkuTrackerProps) {
  const isDark = theme === 'dark';
  const [skuInput, setSkuInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SkuResult[]>([]);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const TRACKER_SHEET_ID = '1HBTuNJUFmHIGT0Ly4qiPwK0h16v0JglmtsMxl2O5qb8';

  const openTrackerSheet = useCallback(() => {
    window.open(`https://docs.google.com/spreadsheets/d/${TRACKER_SHEET_ID}/edit`, '_blank');
  }, []);

  const validateSkus = useCallback(async (skus: string[]) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    setBatchResult(null);

    try {
      const response = await fetch('/api/google-sheets/check-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: TRACKER_SHEET_ID,
          skus: skus,
        }),
      });

      // Check if response is OK
      if (!response.ok) {
        const text = await response.text();
        console.error('Response error:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      setResults(data.results || []);
      setBatchResult({
        total: data.total || 0,
        found: data.found || 0,
        notFound: data.notFound || 0,
        results: data.results || [],
      });

    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check SKUs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!skuInput.trim()) {
      setError('Please enter at least one SKU to check');
      return;
    }

    // Split by newline, comma, or semicolon
    const skus = skuInput
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (skus.length === 0) {
      setError('No valid SKUs found');
      return;
    }

    validateSkus(skus);
  }, [skuInput, validateSkus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearSearch = () => {
    setSkuInput('');
    setResults([]);
    setBatchResult(null);
    setError(null);
  };

  const copyResults = () => {
    if (results.length === 0) return;
    
    let text = 'SKU Check Results:\n';
    text += '='.repeat(50) + '\n\n';
    
    const foundItems = results.filter(r => r.exists);
    const notFoundItems = results.filter(r => !r.exists);
    
    if (foundItems.length > 0) {
      text += '✅ FOUND:\n';
      foundItems.forEach(r => {
        text += `  ${r.sku}`;
        if (r.sheetName) text += ` (${r.sheetName})`;
        if (r.status) text += ` - ${r.status}`;
        text += '\n';
      });
      text += '\n';
    }
    
    if (notFoundItems.length > 0) {
      text += '❌ NOT FOUND:\n';
      notFoundItems.forEach(r => {
        text += `  ${r.sku}\n`;
      });
    }
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'completed' || statusLower === 'done') {
      return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
    }
    if (statusLower === 'pending') {
      return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
    }
    if (statusLower === 'ongoing' || statusLower === 'in progress') {
      return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700';
    }
    if (statusLower === 'cancelled') {
      return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700';
    }
    return isDark ? 'bg-slate-500/20 text-slate-400' : 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            V2 SKU Tracker
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Check multiple V2 SKUs against all tracking sheets
          </p>
        </div>
        <button
          onClick={openTrackerSheet}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            isDark
              ? 'border-slate-700/40 bg-slate-800/30 text-slate-300 hover:bg-slate-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Open Tracker Sheet
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className={`rounded-xl border p-4 sm:p-6 ${
        isDark ? 'border-slate-700/40 bg-slate-900/50' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <div className={`flex items-start rounded-lg border transition-colors focus-within:ring-2 focus-within:ring-emerald-500 py-2 ${
                isDark
                  ? 'border-slate-700/40 bg-slate-800/30 focus-within:border-emerald-500'
                  : 'border-gray-200 bg-gray-50/50 focus-within:border-emerald-500'
              }`}>
                <div className="flex h-full items-center px-3 pt-1">
                  <Search className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                </div>
                <textarea
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter multiple SKUs (one per line)&#10;Example:&#10;ABW-102230_Chestnut_38x34-V2&#10;ABW-102230_Coal_30x30-V2&#10;ABW-102230_Coal_30x34-V2"
                  className={`min-h-[120px] w-full flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-500 resize-y ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                  aria-label="SKU input"
                  disabled={isLoading}
                />
                {skuInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className={`mr-1 rounded p-0.5 transition-colors ${
                      isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    aria-label="Clear input"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !skuInput.trim()}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isLoading || !skuInput.trim()
                    ? 'cursor-not-allowed opacity-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking SKUs...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Check {skuInput.split(/[\n,;]+/).filter(s => s.trim()).length || 0} SKUs
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            💡 Enter one SKU per line. Press <kbd className={`rounded px-1.5 py-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>Shift + Enter</kbd> to submit.
          </div>

          {/* Info about which sheets are searched */}
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Searching in: HH Work · Bekina · HH Sports · All Brands
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Batch Summary */}
      {batchResult && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`grid grid-cols-1 gap-3 sm:grid-cols-3`}
        >
          <div className={`rounded-xl border p-4 text-center ${
            isDark ? 'border-slate-700/40 bg-slate-900/50' : 'border-gray-200 bg-white'
          }`}>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {batchResult.total}
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total SKUs</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${
            isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
          }`}>
            <p className={`text-2xl font-bold text-emerald-400`}>
              {batchResult.found}
            </p>
            <p className={`text-xs ${isDark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Found</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${
            isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'
          }`}>
            <p className={`text-2xl font-bold text-red-400`}>
              {batchResult.notFound}
            </p>
            <p className={`text-xs ${isDark ? 'text-red-400/70' : 'text-red-600'}`}>Not Found</p>
          </div>
        </motion.div>
      )}

      {/* Results Display */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className={`overflow-hidden rounded-xl border ${
              isDark ? 'border-slate-700/40 bg-slate-900/50' : 'border-gray-200 bg-white'
            }`}>
              {/* Results Header */}
              <div className={`flex items-center justify-between border-b px-4 py-3 ${
                isDark ? 'border-slate-700/40' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <FileText className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Results ({results.length})
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {results.filter(r => r.exists).length} found · {results.filter(r => !r.exists).length} not found
                    </p>
                  </div>
                </div>
                <button
                  onClick={copyResults}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Results
                    </>
                  )}
                </button>
              </div>

              {/* Results List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/30">
                {results.map((result, idx) => (
                  <div
                    key={`${result.sku}-${idx}`}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {result.exists ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`truncate text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {result.sku}
                        </span>
                        {result.exists ? (
                          <>
                            {result.sheetName && (
                              <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {result.sheetName}
                              </span>
                            )}
                            {result.brand && (
                              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                · {result.brand}
                              </span>
                            )}
                            {result.status && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(result.status)}`}>
                                {result.status}
                              </span>
                            )}
                            {result.v2Sku && result.v2Sku !== result.sku && (
                              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                V2: {result.v2Sku}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Not found in any sheet
                          </span>
                        )}
                      </div>
                      {result.exists && result.details && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {result.details['Type'] && (
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                              Type: {result.details['Type']}
                            </span>
                          )}
                          {result.details['Agent'] && (
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                              Agent: {result.details['Agent']}
                            </span>
                          )}
                          {result.details['Date Requested'] && (
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                              Date: {new Date(result.details['Date Requested']).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {result.rowIndex && result.sheetName && (
                      <span className={`flex-shrink-0 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        Row {result.rowIndex}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <p>
          Enter V2 SKUs (one per line) to check if they exist in any of the tracking sheets. 
          The system will search the <strong>V2 SKU</strong> column across all sheets and return the row details if found.
        </p>
      </div>
    </div>
  );
}