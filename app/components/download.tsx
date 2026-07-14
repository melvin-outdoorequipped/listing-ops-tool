'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Grid3x3,
  List,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';

interface DownloadPageProps {
  theme?: 'light' | 'dark';
}

interface DownloadRow {
  id: string;
  batch_id: string;
  filename: string | null;
  export_path: string | null;
  sku_count: number;
  matched_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

type SortField = 'created_at' | 'filename' | 'status' | 'sku_count';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export default function DownloadPage({ theme = 'dark' }: DownloadPageProps) {
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [filteredDownloads, setFilteredDownloads] = useState<DownloadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const isDark = theme === 'dark';

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: 'All Statuses', icon: <Filter className="h-3 w-3" /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" /> },
    { value: 'processing', label: 'Processing', icon: <Clock className="h-3 w-3 text-yellow-400" /> },
    { value: 'pending', label: 'Pending', icon: <Clock className="h-3 w-3 text-blue-400" /> },
    { value: 'failed', label: 'Failed', icon: <XCircle className="h-3 w-3 text-red-400" /> },
  ];

  const fetchDownloads = async () => {
    setIsLoading(true);
    setFeedback('');

    try {
      const { data, error } = await supabase
        .from('sku_batches')
        .select(
          'id, batch_id, filename, export_path, sku_count, matched_count, status, created_at'
        )
        .not('export_path', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDownloads((data ?? []) as DownloadRow[]);
      setFilteredDownloads((data ?? []) as DownloadRow[]);
    } catch (error: any) {
      console.error(error);
      setFeedback(error.message || 'Failed to fetch downloads');
      setDownloads([]);
      setFilteredDownloads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  // Filter and search
  useEffect(() => {
    let filtered = [...downloads];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (row) =>
          (row.filename?.toLowerCase().includes(query) ?? false) ||
          row.batch_id.toLowerCase().includes(query) ||
          row.status.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((row) => row.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredDownloads(filtered);
  }, [downloads, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDownload = async (row: DownloadRow) => {
    if (!row.export_path) {
      setFeedback('No export path available for this file');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('exports')
        .download(row.export_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = row.filename ?? `${row.batch_id}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setFeedback('File downloaded successfully!');
      setTimeout(() => setFeedback(''), 3000);
    } catch (error: any) {
      setFeedback(`Download failed: ${error.message}`);
    }
  };

  const handleDelete = async (row: DownloadRow) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      if (row.export_path) {
        const { error: storageError } = await supabase.storage
          .from('exports')
          .remove([row.export_path]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('sku_batches')
        .delete()
        .eq('id', row.id);

      if (error) throw error;

      setDownloads((prev) => prev.filter((item) => item.id !== row.id));
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(row.id);
        return newSet;
      });

      setFeedback('File deleted successfully!');
      setTimeout(() => setFeedback(''), 3000);
    } catch (error: any) {
      setFeedback(`Delete failed: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Delete ${selectedRows.size} selected file(s)?`)) return;

    setIsDeleting(true);
    try {
      const rowsToDelete = downloads.filter((row) => selectedRows.has(row.id));
      
      // Delete from storage
      const storagePaths = rowsToDelete
        .map((row) => row.export_path)
        .filter((path): path is string => path !== null);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('exports')
          .remove(storagePaths);

        if (storageError) throw storageError;
      }

      // Delete from database
      const ids = rowsToDelete.map((row) => row.id);
      const { error } = await supabase
        .from('sku_batches')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setDownloads((prev) => prev.filter((row) => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
      setFeedback(`${rowsToDelete.length} file(s) deleted successfully!`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (error: any) {
      setFeedback(`Bulk delete failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === filteredDownloads.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredDownloads.map((row) => row.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'pending':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'processing':
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const cardClass = isDark
    ? 'border-slate-700/50 bg-slate-900/50'
    : 'border-gray-200 bg-white';

  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  const StatsCard = ({ label, value, icon, color }: any) => (
    <div className={`rounded-xl border p-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${mutedText}`}>{label}</p>
          <p className={`mt-1 text-2xl font-bold ${textClass}`}>{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Files"
          value={downloads.length}
          icon={<FileText className="h-5 w-5" />}
          color={isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}
        />
        <StatsCard
          label="Completed"
          value={downloads.filter((d) => d.status === 'completed').length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color={isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}
        />
        <StatsCard
          label="Processing"
          value={downloads.filter((d) => d.status === 'processing').length}
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          color={isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}
        />
        <StatsCard
          label="Failed"
          value={downloads.filter((d) => d.status === 'failed').length}
          icon={<XCircle className="h-5 w-5" />}
          color={isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}
        />
      </div>

      {/* Header with Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl font-bold sm:text-2xl ${textClass}`}>
            Downloads
          </h1>
          <p className={`mt-1 text-sm ${mutedText}`}>
            {filteredDownloads.length} files available for download
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedRows.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-600/30 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Selected ({selectedRows.size})
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className={`rounded-lg border p-2 transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={viewMode === 'table' ? 'Card view' : 'Table view'}
          >
            {viewMode === 'table' ? (
              <Grid3x3 className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={fetchDownloads}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />
          <input
            type="text"
            placeholder="Search by filename, batch ID, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg border pl-9 pr-4 py-2 text-sm outline-none transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500'
                : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-emerald-500'
            }`}
          />
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={`flex w-full items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors sm:w-auto ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>{statusOptions.find((s) => s.value === statusFilter)?.label}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {showStatusDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowStatusDropdown(false)}
              />
              <div
                className={`absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border shadow-lg ${
                  isDark
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowStatusDropdown(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      statusFilter === option.value
                        ? isDark
                          ? 'bg-slate-800 text-white'
                          : 'bg-gray-100 text-gray-900'
                        : isDark
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm animate-slide-in ${
            feedback.includes('failed') || feedback.includes('Failed')
              ? isDark
                ? 'border-red-500/30 bg-red-600/10 text-red-400'
                : 'border-red-300 bg-red-100 text-red-700'
              : isDark
                ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400'
                : 'border-emerald-300 bg-emerald-100 text-emerald-700'
          }`}
        >
          {feedback.includes('failed') || feedback.includes('Failed') ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {feedback}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
            <p className={`mt-3 text-sm ${mutedText}`}>Loading downloads...</p>
          </div>
        </div>
      ) : filteredDownloads.length === 0 ? (
        <div className={`flex h-64 flex-col items-center justify-center rounded-xl border ${cardClass}`}>
          {searchQuery || statusFilter !== 'all' ? (
            <>
              <Search className={`h-12 w-12 ${mutedText} opacity-20`} />
              <p className={`mt-3 text-sm ${mutedText}`}>No matching files found</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className={`mt-2 text-sm text-emerald-400 hover:underline`}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <FileSpreadsheet className={`h-12 w-12 ${mutedText} opacity-20`} />
              <p className={`mt-3 text-sm ${mutedText}`}>No downloadable files yet</p>
              <p className={`text-xs ${mutedText}`}>Files will appear here once SKU batches are processed</p>
            </>
          )}
        </div>
      ) : viewMode === 'table' ? (
        // Table View
        <div className={`overflow-hidden rounded-xl border shadow-lg ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead className={isDark ? 'bg-slate-800/70' : 'bg-gray-50'}>
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filteredDownloads.length && filteredDownloads.length > 0}
                      onChange={toggleAllSelection}
                      className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:text-emerald-400"
                    onClick={() => handleSort('filename')}
                  >
                    <div className="flex items-center gap-1">
                      File
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Batch ID
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:text-emerald-400"
                    onClick={() => handleSort('sku_count')}
                  >
                    <div className="flex items-center gap-1">
                      Items
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Matched
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:text-emerald-400"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hover:text-emerald-400"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Generated
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDownloads.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b transition-colors ${
                      selectedRows.has(row.id)
                        ? isDark
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-emerald-300 bg-emerald-50'
                        : isDark
                          ? 'border-slate-700 hover:bg-slate-800/50'
                          : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                        <span
                          className={`truncate ${textClass}`}
                          title={row.filename ?? 'Generated export'}
                        >
                          {row.filename ?? 'Generated export'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">
                      {row.batch_id}
                    </td>

                    <td className={`px-4 py-3 ${mutedText}`}>
                      {row.sku_count}
                    </td>

                    <td className="px-4 py-3 text-emerald-400">
                      {row.matched_count}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(
                          row.status
                        )}`}
                      >
                        {getStatusIcon(row.status)}
                        {row.status}
                      </span>
                    </td>

                    <td className={`px-4 py-3 text-xs ${mutedText}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(row.created_at)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(row)}
                          className="rounded-lg p-2 text-cyan-400 transition-colors hover:bg-cyan-500/20 hover:text-cyan-300"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex flex-col items-center justify-between gap-2 text-sm sm:flex-row">
              <span className={mutedText}>
                Showing {filteredDownloads.length} of {downloads.length} files
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedRows.size === 0}
                  onClick={handleBulkDelete}
                  className={`text-sm transition-colors ${
                    selectedRows.size === 0
                      ? mutedText
                      : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  Delete Selected ({selectedRows.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Cards View
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDownloads.map((row) => (
            <div
              key={row.id}
              className={`relative rounded-xl border p-4 transition-all hover:shadow-xl ${cardClass} ${
                selectedRows.has(row.id)
                  ? isDark
                    ? 'border-emerald-500/50 ring-2 ring-emerald-500/30'
                    : 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : ''
              }`}
            >
              <div className="absolute right-2 top-2">
                <input
                  type="checkbox"
                  checked={selectedRows.has(row.id)}
                  onChange={() => toggleRowSelection(row.id)}
                  className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`truncate font-semibold ${textClass}`}>
                    {row.filename ?? 'Generated export'}
                  </h3>
                  <p className={`text-xs font-mono ${mutedText}`}>
                    {row.batch_id}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className={`text-xs ${mutedText}`}>Items</p>
                  <p className={`text-sm font-semibold ${textClass}`}>
                    {row.sku_count}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${mutedText}`}>Matched</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {row.matched_count}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(
                    row.status
                  )}`}
                >
                  {getStatusIcon(row.status)}
                  {row.status}
                </span>
                <span className={`text-xs ${mutedText}`}>
                  {formatDate(row.created_at)}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(row)}
                  className="flex-1 rounded-lg bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
                >
                  <Download className="mx-auto h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}