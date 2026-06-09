// components/GetBrand.tsx
'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ProductResult {
  sku: string | null;
  asin: string | null;
  brand: string;
  found: boolean;
  error?: string;
  matchedVia?: string; // Track how we matched it
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

  const isDark = theme === 'dark';

  // Advanced SKU normalization - removes ALL types of spaces and special characters
  const normalizeSKU = (sku: string): string => {
    return sku
      .trim()
      // Replace all types of spaces (including non-breaking spaces, zero-width spaces, etc.)
      .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, '')
      // Remove special characters but keep letters, numbers, hyphens, underscores
      .replace(/[^\w\-_]/g, '')
      .toUpperCase();
  };

  // Parse input to handle multiple values with advanced cleaning
  const parseMultipleValues = (input: string): string[] => {
    // Split by commas, spaces, new lines, tabs, and other delimiters
    const values = input.split(/[,\s\n\t\r\u00A0]+/);
    
    // Clean each value and remove duplicates
    const uniqueValues = Array.from(
      new Set(
        values
          .filter(v => v.trim().length > 0)
          .map(v => {
            // Clean the value thoroughly
            let cleaned = v.trim();
            // Remove invisible characters
            cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
            return cleaned.toUpperCase();
          })
      )
    );
    
    return uniqueValues;
  };

  // Highly optimized bulk fetch with multiple matching strategies
  const fetchBrandsFromDatabase = async (queries: string[], type: 'sku' | 'asin'): Promise<ProductResult[]> => {
    try {
      const CHUNK_SIZE = 100;
      let allFoundData: any[] = [];

      // Fetch all data from database (without any filtering)
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

      // Create multiple lookup maps for different matching strategies
      const exactMatchMap = new Map();      // Exact match as stored
      const normalizedMatchMap = new Map(); // Normalized match (no spaces/special chars)
      const originalDataMap = new Map();    // Store original data for reference
      
      allFoundData.forEach(item => {
        const originalValue = type === 'sku' ? item.sku : item.asin;
        if (!originalValue) return;
        
        // Store by original value (exact match)
        exactMatchMap.set(originalValue.toUpperCase(), item);
        
        // Store by normalized value (for fuzzy matching)
        const normalizedValue = normalizeSKU(originalValue);
        if (normalizedValue) {
          normalizedMatchMap.set(normalizedValue, item);
        }
        
        // Also store for reference
        originalDataMap.set(originalValue.toUpperCase(), item);
      });

      // Try to match each query using multiple strategies
      return queries.map(query => {
        const originalQuery = query;
        let match = null;
        let matchedVia = '';
        
        // Strategy 1: Exact match (case-insensitive)
        match = exactMatchMap.get(originalQuery);
        if (match) {
          matchedVia = 'exact';
        }
        
        // Strategy 2: Normalized match (if exact failed)
        if (!match) {
          const normalizedQuery = normalizeSKU(originalQuery);
          if (normalizedQuery) {
            match = normalizedMatchMap.get(normalizedQuery);
            if (match) matchedVia = 'normalized';
          }
        }
        
        // Strategy 3: Partial match (if query contains part of a SKU or vice versa)
        if (!match) {
          for (const [dbValue, dbItem] of exactMatchMap.entries()) {
            const normalizedDB = normalizeSKU(dbValue);
            const normalizedQuery = normalizeSKU(originalQuery);
            
            // Check if one contains the other
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
        
        // No match found - return with debug info
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

      const fetchedResults = await fetchBrandsFromDatabase(queries, searchType);
      setResults(fetchedResults);
      
      const notFound = fetchedResults.filter(r => !r.found);
      if (notFound.length > 0) {
        setError(`${notFound.length} out of ${queries.length} ${searchType.toUpperCase()}(s) not found`);
        
        // Log not found items for debugging (only first 10)
        if (showDebug && notFound.length > 0) {
          console.log('Not found items:', notFound.slice(0, 10).map(r => 
            searchType === 'sku' ? r.sku : r.asin
          ));
        }
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

  // Excel-ready copy function - uses TAB as delimiter for better Excel pasting
  const copyResultsToClipboard = () => {
    // Use TAB delimiter for Excel compatibility
    const headers = ['Identifier', 'Brand', 'Status'];
    const rows = results.map(r => [
      r.sku || r.asin || '',
      r.brand || 'N/A',
      r.found ? 'Found' : 'Not Found'
    ]);
    
    // Join with tabs for Excel compatibility
    const tabSeparatedContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(tabSeparatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Simplified CSV download - only SKU/ASIN and Brand
  const downloadResultsAsCSV = () => {
    // Simple headers - just Identifier and Brand
    const headers = ['Identifier', 'Brand'];
    const rows = results.map(r => [
      r.sku || r.asin || '',
      r.brand || 'N/A'
    ]);
    
    // Create CSV content with proper escaping for Excel
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Add BOM for UTF-8 to handle special characters in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-results-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Alternative: Copy only found items (useful for updates)
  const copyOnlyFoundItems = () => {
    const foundItems = results.filter(r => r.found);
    const headers = ['Identifier', 'Brand'];
    const rows = foundItems.map(r => [
      r.sku || r.asin || '',
      r.brand || 'N/A'
    ]);
    
    const tabSeparatedContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(tabSeparatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Alternative: Copy only missing items (useful for inserts)
  const copyOnlyMissingItems = () => {
    const missingItems = results.filter(r => !r.found);
    const headers = ['Identifier'];
    const rows = missingItems.map(r => [
      r.sku || r.asin || ''
    ]);
    
    const tabSeparatedContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(tabSeparatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
    
    return { total, found, notFound, uniqueBrands, matchTypes };
  };

  const panelClass = isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white';
  const inputClass = isDark ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const pageText = isDark ? 'text-white' : 'text-gray-900';

  const stats = results.length > 0 ? getSummaryStats() : null;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className={`rounded-2xl border p-6 ${panelClass}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-emerald-500/10 p-2.5">
            <Building2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${pageText}`}>Get Brand Information</h1>
            <p className={`text-sm ${mutedText} mt-1`}>
              Look up brand details for multiple SKUs or ASINs at once
            </p>
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mb-4 border-b pb-4">
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
              {type.toUpperCase()} (Multiple)
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Enter multiple ${searchType.toUpperCase()}s separated by commas, spaces, or new lines...`}
            rows={5}
            className={`w-full rounded-xl border px-4 py-3 outline-none transition-all font-mono text-sm ${inputClass}`}
          />
          
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all bg-emerald-600 text-white hover:bg-emerald-500 ${isLoading ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Searching...</> : <><Search className="h-5 w-5" /> Search Database</>}
            </button>
            
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="h-5 w-5" /> Clear
              </button>
            )}
          </div>

          {/* Debug Mode Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`text-xs ${mutedText} hover:${pageText} transition-colors`}
            >
              {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            <p className={`text-xs ${mutedText}`}>
              Advanced matching: Exact → Normalized → Partial
            </p>
          </div>
        </div>

        {error && (
          <div className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 ${
            isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-yellow-300 bg-yellow-50 text-yellow-700'
          }`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && stats && (
        <div className={`rounded-2xl border ${panelClass} overflow-hidden`}>
          <div className={`border-b p-6 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className={`text-xl font-bold ${pageText}`}>Search Results</h2>
                <p className={`text-sm ${mutedText} mt-1`}>Found {stats.found} out of {stats.total} entries</p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copyResultsToClipboard}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy All (Excel)'}
                </button>
                
                <button
                  onClick={copyOnlyFoundItems}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border ${
                    isDark ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/20' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Copy className="h-4 w-4" /> Copy Found Only
                </button>
                
                <button
                  onClick={copyOnlyMissingItems}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border ${
                    isDark ? 'border-red-700 text-red-400 hover:bg-red-900/20' : 'border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                >
                  <Copy className="h-4 w-4" /> Copy Missing Only
                </button>
                
                <button
                  onClick={downloadResultsAsCSV}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Download className="h-4 w-4" /> Download CSV
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mt-4">
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

          {/* Table Structure */}
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
                {results.map((result, idx) => (
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
                        <span className={`text-xs ${result.matchedVia === 'exact' ? 'text-emerald-400' : result.matchedVia === 'normalized' ? 'text-blue-400' : result.matchedVia === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                          {result.matchedVia || 'N/A'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Initial State */}
      {results.length === 0 && !isLoading && !error && (
        <div className={`rounded-2xl border p-12 text-center ${panelClass}`}>
          <Upload className={`h-12 w-12 mx-auto mb-3 ${mutedText}`} />
          <h3 className={`text-lg font-semibold ${pageText} mb-2`}>Ready for Bulk Lookup</h3>
          <p className={`text-sm ${mutedText} max-w-md mx-auto`}>
            Paste your SKUs above to instantly scan the database.
          </p>
        </div>
      )}
    </div>
  );
}