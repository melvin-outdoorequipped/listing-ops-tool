// components/GetBrand.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Loader2,
  Building2,
  AlertCircle,
  CheckCircle2,
  Database,
  Upload,
  X,
  Download,
  Copy,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
  Package,
  Tag,
  Hash,
  ExternalLink,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Info,
  ListChecks,
  Zap,
  Shield,
  FileSpreadsheet,
  ClipboardList,
  Users,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ProductResult {
  sku: string | null;
  asin: string | null;
  brand: string;
  found: boolean;
  error?: string;
  matchedVia?: string;
}

interface GetBrandProps {
  theme?: 'light' | 'dark';
}

export default function GetBrand({ theme = 'dark' }: GetBrandProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'sku' | 'asin'>('sku');
  const [copied, setCopied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'found' | 'not-found'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(true);
  const [copyType, setCopyType] = useState<'all' | 'found' | 'missing'>('all');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDark = theme === 'dark';

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('getBrand_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);

  // Save search history
  const saveToHistory = (query: string) => {
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('getBrand_history', JSON.stringify(newHistory));
  };

  const normalizeSKU = (sku: string): string => {
    return sku
      .trim()
      .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, '')
      .replace(/[^\w\-_]/g, '')
      .toUpperCase();
  };

  const parseMultipleValues = (input: string): string[] => {
    const values = input.split(/[,\s\n\t\r\u00A0]+/);
    const uniqueValues = Array.from(
      new Set(
        values
          .filter(v => v.trim().length > 0)
          .map(v => {
            let cleaned = v.trim();
            cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
            return cleaned.toUpperCase();
          })
      )
    );
    return uniqueValues;
  };

  const fetchBrandsFromDatabase = async (queries: string[], type: 'sku' | 'asin'): Promise<ProductResult[]> => {
    try {
      const CHUNK_SIZE = 100;
      let allFoundData: any[] = [];

      for (let i = 0; i < queries.length; i += CHUNK_SIZE) {
        const chunk = queries.slice(i, i + CHUNK_SIZE);
        
        const { data, error } = await supabase
          .from('products')
          .select('sku, asin, brand')
          .in(type, chunk);

        if (error) throw error;
        if (data) {
          allFoundData = [...allFoundData, ...data];
        }
      }

      const exactMatchMap = new Map();
      const normalizedMatchMap = new Map();
      const originalDataMap = new Map();
      
      allFoundData.forEach(item => {
        const originalValue = type === 'sku' ? item.sku : item.asin;
        if (!originalValue) return;
        
        exactMatchMap.set(originalValue.toUpperCase(), item);
        const normalizedValue = normalizeSKU(originalValue);
        if (normalizedValue) {
          normalizedMatchMap.set(normalizedValue, item);
        }
        originalDataMap.set(originalValue.toUpperCase(), item);
      });

      return queries.map(query => {
        const originalQuery = query;
        let match = null;
        let matchedVia = '';
        
        match = exactMatchMap.get(originalQuery);
        if (match) {
          matchedVia = 'exact';
        }
        
        if (!match) {
          const normalizedQuery = normalizeSKU(originalQuery);
          if (normalizedQuery) {
            match = normalizedMatchMap.get(normalizedQuery);
            if (match) matchedVia = 'normalized';
          }
        }
        
        if (!match) {
          for (const [dbValue, dbItem] of exactMatchMap.entries()) {
            const normalizedDB = normalizeSKU(dbValue);
            const normalizedQuery = normalizeSKU(originalQuery);
            
            if (normalizedDB.includes(normalizedQuery) || normalizedQuery.includes(normalizedDB)) {
              match = dbItem;
              matchedVia = 'partial';
              break;
            }
          }
        }
        
        if (match) {
          return {
            sku: match.sku,
            asin: match.asin,
            brand: match.brand,
            found: true,
            matchedVia,
          };
        }
        
        return {
          sku: type === 'sku' ? originalQuery : null,
          asin: type === 'asin' ? originalQuery : null,
          brand: '',
          found: false,
          matchedVia: 'none',
        };
      });
    } catch (err: any) {
      console.error('Database error:', err);
      throw new Error(err.message || 'Failed to query database');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError(`Please enter ${searchType.toUpperCase()}(s)`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const queries = parseMultipleValues(searchQuery);
      
      if (queries.length === 0) {
        setError(`No valid ${searchType.toUpperCase()} values found`);
        setIsLoading(false);
        return;
      }

      saveToHistory(searchQuery);
      const fetchedResults = await fetchBrandsFromDatabase(queries, searchType);
      setResults(fetchedResults);
      
      const notFound = fetchedResults.filter(r => !r.found);
      if (notFound.length > 0) {
        setError(`${notFound.length} out of ${queries.length} ${searchType.toUpperCase()}(s) not found`);
      }
    } catch (err: any) {
      setError(`Failed to fetch brand information. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
  };

  const copyResultsToClipboard = (type: 'all' | 'found' | 'missing' = 'all') => {
    let items = results;
    if (type === 'found') items = results.filter(r => r.found);
    if (type === 'missing') items = results.filter(r => !r.found);
    
    if (items.length === 0) {
      setError('No items to copy');
      return;
    }

    const headers = ['Identifier', 'Brand', 'Status'];
    const rows = items.map(r => [
      r.sku || r.asin || '',
      r.brand || 'N/A',
      r.found ? 'Found' : 'Not Found'
    ]);
    
    const tabSeparatedContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(tabSeparatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadResultsAsCSV = () => {
    const headers = ['Identifier', 'Brand', 'Status'];
    const rows = results.map(r => [
      r.sku || r.asin || '',
      r.brand || 'N/A',
      r.found ? 'Found' : 'Not Found'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-results-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSummaryStats = () => {
    const total = results.length;
    const found = results.filter(r => r.found).length;
    const notFound = total - found;
    const uniqueBrands = [...new Set(results.filter(r => r.found).map(r => r.brand))];
    const matchTypes = {
      exact: results.filter(r => r.matchedVia === 'exact').length,
      normalized: results.filter(r => r.matchedVia === 'normalized').length,
      partial: results.filter(r => r.matchedVia === 'partial').length,
    };
    const foundRate = total > 0 ? Math.round((found / total) * 100) : 0;
    
    return { total, found, notFound, uniqueBrands, matchTypes, foundRate };
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const filteredResults = useMemo(() => {
    if (filterStatus === 'all') return results;
    return results.filter(r => filterStatus === 'found' ? r.found : !r.found);
  }, [results, filterStatus]);

  const panelClass = isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white';
  const inputClass = isDark ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const pageText = isDark ? 'text-white' : 'text-gray-900';

  const stats = results.length > 0 ? getSummaryStats() : null;

  return (
    <div className={`w-full max-w-full space-y-6 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-950' : ''}`}>
      {/* Header Panel */}
      <div className={`rounded-2xl border p-6 shadow-lg ${panelClass}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              <Building2 className={`h-8 w-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${pageText}`}>Get Brand Information</h1>
              <p className={`text-sm ${mutedText} mt-1`}>
                Look up brand details for multiple SKUs or ASINs at once
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
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mt-4 border-b pb-4">
          {(['sku', 'asin'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSearchType(type);
                clearSearch();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                searchType === type
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                {type === 'sku' ? <Hash className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                {type.toUpperCase()} (Multiple)
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3 mt-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Enter multiple ${searchType.toUpperCase()}s separated by commas, spaces, or new lines...\nExample: SKU12345, SKU67890, SKU11111`}
              rows={4}
              className={`w-full rounded-xl border px-4 py-3 outline-none transition-all font-mono text-sm ${inputClass}`}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`absolute right-3 top-3 rounded-lg p-1.5 transition-colors ${
                  isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:scale-[1.02] ${isLoading ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Searching...</> : <><Zap className="h-5 w-5" /> Search Database</>}
            </button>
            
            {/* Search History Dropdown */}
            {searchHistory.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (searchHistory.length > 0) {
                      setSearchQuery(searchHistory[0]);
                      handleSearch();
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all border ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Repeat last search"
                >
                  <Clock className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`text-xs ${mutedText} hover:${pageText} transition-colors flex items-center gap-1`}
            >
              {showDebug ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
            <div className="flex items-center gap-3 text-xs">
              <span className={mutedText}>🔍 Advanced matching:</span>
              <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Exact</span>
              <span className={mutedText}>→</span>
              <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Normalized</span>
              <span className={mutedText}>→</span>
              <span className={`${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Partial</span>
            </div>
          </div>
        </div>

        {error && (
          <div className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 ${
            isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-yellow-300 bg-yellow-50 text-yellow-700'
          }`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm break-words">{error}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && stats && (
        <div className={`rounded-2xl border shadow-lg ${panelClass} overflow-hidden`}>
          <div className={`border-b p-6 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={`text-xl font-bold ${pageText}`}>Search Results</h2>
                <p className={`text-sm ${mutedText} mt-1`}>
                  Found {stats.found} out of {stats.total} entries · {stats.foundRate}% match rate
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* View Mode Toggle */}
                <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${
                  isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'table'
                        ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'cards'
                        ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                  </button>
                </div>

                {/* Filter Dropdown */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  <option value="all">All ({stats.total})</option>
                  <option value="found">✅ Found ({stats.found})</option>
                  <option value="not-found">❌ Not Found ({stats.notFound})</option>
                </select>

                <button
                  onClick={() => copyResultsToClipboard('all')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors border ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                
                <button
                  onClick={downloadResultsAsCSV}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors border ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Download className="h-4 w-4" /> CSV
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            {showStats && (
              <div className="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
                <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <p className={`text-xs ${mutedText}`}>Total</p>
                  <p className={`text-2xl font-bold ${pageText}`}>{stats.total}</p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>
                  <p className={`text-xs ${mutedText}`}>Found</p>
                  <p className={`text-2xl font-bold text-emerald-400`}>{stats.found}</p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? 'bg-red-500/10' : 'bg-red-100'}`}>
                  <p className={`text-xs ${mutedText}`}>Not Found</p>
                  <p className={`text-2xl font-bold text-red-400`}>{stats.notFound}</p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                  <p className={`text-xs ${mutedText}`}>Unique Brands</p>
                  <p className={`text-2xl font-bold text-blue-400`}>{stats.uniqueBrands.length}</p>
                </div>
              </div>
            )}

            {/* Match Statistics (Debug Mode) */}
            {showDebug && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className={`rounded-lg p-2 text-center text-xs ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <span className={mutedText}>Exact Matches:</span>
                  <span className={`ml-2 font-bold ${pageText}`}>{stats.matchTypes.exact}</span>
                </div>
                <div className={`rounded-lg p-2 text-center text-xs ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <span className={mutedText}>Normalized Matches:</span>
                  <span className={`ml-2 font-bold ${pageText}`}>{stats.matchTypes.normalized}</span>
                </div>
                <div className={`rounded-lg p-2 text-center text-xs ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <span className={mutedText}>Partial Matches:</span>
                  <span className={`ml-2 font-bold ${pageText}`}>{stats.matchTypes.partial}</span>
                </div>
              </div>
            )}
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={isDark ? 'bg-slate-800/50' : 'bg-gray-50'}>
                  <tr className={`border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                    <th className={`p-4 text-xs font-semibold ${mutedText}`}>Searched {searchType.toUpperCase()}</th>
                    <th className={`p-4 text-xs font-semibold ${mutedText}`}>Brand Result</th>
                    <th className={`p-4 text-xs font-semibold ${mutedText}`}>Status</th>
                    {showDebug && (
                      <th className={`p-4 text-xs font-semibold ${mutedText}`}>Match Type</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result, idx) => (
                    <tr key={idx} className={`border-b transition-colors ${
                      isDark ? 'border-slate-700/30 hover:bg-slate-800/50' : 'border-gray-100 hover:bg-gray-50'
                    }`}>
                      <td className="p-4">
                        <code className={`text-sm font-mono ${pageText}`}>
                          {searchType === 'sku' ? result.sku : result.asin}
                        </code>
                      </td>
                      <td className="p-4">
                        {result.found ? (
                          <span className={`font-semibold ${pageText}`}>{result.brand}</span>
                        ) : (
                          <span className={mutedText}>-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {result.found ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Found
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                            <AlertCircle className="h-3 w-3" /> Not Found
                          </span>
                        )}
                      </td>
                      {showDebug && (
                        <td className="p-4">
                          <span className={`text-xs ${
                            result.matchedVia === 'exact' ? 'text-emerald-400' : 
                            result.matchedVia === 'normalized' ? 'text-blue-400' : 
                            result.matchedVia === 'partial' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {result.matchedVia || 'N/A'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResults.map((result, idx) => (
                <div key={idx} className={`rounded-xl border p-4 ${
                  isDark ? 'border-slate-700/60 bg-slate-800/30' : 'border-gray-200 bg-white/80'
                } ${result.found ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between">
                    <code className={`text-sm font-mono ${pageText}`}>
                      {searchType === 'sku' ? result.sku : result.asin}
                    </code>
                    {result.found ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                        <AlertCircle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    {result.found ? (
                      <p className={`text-lg font-bold ${pageText}`}>{result.brand}</p>
                    ) : (
                      <p className={`text-sm ${mutedText}`}>Not found</p>
                    )}
                  </div>
                  {showDebug && result.matchedVia && (
                    <div className="mt-2">
                      <span className={`text-xs ${
                        result.matchedVia === 'exact' ? 'text-emerald-400' : 
                        result.matchedVia === 'normalized' ? 'text-blue-400' : 
                        result.matchedVia === 'partial' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        via {result.matchedVia}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {results.length === 0 && !isLoading && !error && (
        <div className={`rounded-2xl border p-12 text-center ${panelClass}`}>
          <div className="flex flex-col items-center">
            <div className={`rounded-full p-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <Building2 className={`h-12 w-12 ${mutedText}`} />
            </div>
            <h3 className={`text-lg font-semibold ${pageText} mt-4 mb-2`}>Ready for Bulk Lookup</h3>
            <p className={`text-sm ${mutedText} max-w-md`}>
              Paste your SKUs or ASINs above to instantly scan the database for brand information.
              <br />
              <span className="text-xs mt-2 block">Supports multiple values separated by commas, spaces, or new lines</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Clock icon for search history
function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}