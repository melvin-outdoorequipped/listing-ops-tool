// components/SkuProcessor.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertCircle,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Zap,
  TrendingUp,
  Calendar,
  Search,
  BarChart2,
  PieChart,
  Layers,
  Package,
  ListChecks,
  ArrowUpRight,
  ArrowDownRight,
  Minimize2,
  Maximize2,
  Settings,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';
import { logToolRun } from '@/lib/tara/logActivity';
import { useNotifications } from '@/contexts/NotificationContext';
import { notifyAllUsers } from '@/lib/notification-helper';

interface SkuProcessorProps {
  theme?: 'light' | 'dark';
}

type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface SkuBatchRow {
  id: string;
  batch_id: string;
  sku_count: number;
  unique_sku_count: number;
  duplicate_count: number;
  matched_count: number;
  status: BatchStatus;
  brands_found: string[] | null;
  filename: string | null;
  export_path: string | null;
  error: string | null;
  created_at: string;
  user_id?: string;
  user_email?: string;
}

interface Feedback {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const SAMPLE_SKUS = `SKU12345
SKU67890
SKU11111`;

function parseSkus(input: string) {
  const rawSkus = input
    .split(/\r?\n/)
    .map((sku) => sku.trim())
    .filter(Boolean);

  const uniqueSkus = Array.from(new Set(rawSkus));

  return {
    rawSkus,
    uniqueSkus,
    duplicateCount: rawSkus.length - uniqueSkus.length,
  };
}

function getDownloadFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'Consolidated_SKUs.xlsx';

  const match = contentDisposition.match(
    /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i
  );

  if (!match?.[1]) return 'Consolidated_SKUs.xlsx';

  return decodeURIComponent(match[1]);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateRelative(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(value);
}

function getProgress(batch: SkuBatchRow) {
  if (batch.status === 'failed') return 0;
  if (batch.status === 'processing') return 44;
  if (batch.status === 'pending') return 10;
  return 100;
}

function getProgressColor(status: BatchStatus) {
  if (status === 'completed') return 'bg-gradient-to-r from-emerald-500 to-teal-400';
  if (status === 'processing') return 'bg-gradient-to-r from-orange-400 to-amber-400';
  if (status === 'failed') return 'bg-gradient-to-r from-red-500 to-rose-400';
  return 'bg-gradient-to-r from-slate-400 to-slate-500';
}

function getStatusLabel(status: BatchStatus) {
  if (status === 'completed') return 'Completed';
  if (status === 'processing') return 'Processing';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

function getStatusIcon(status: BatchStatus) {
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'processing') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

export default function SkuProcessor({ theme = 'dark' }: SkuProcessorProps) {
  const [skus, setSkus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [batches, setBatches] = useState<SkuBatchRow[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<SkuBatchRow | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'sku_count' | 'matched_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { createNotificationWithAgent } = useNotifications();

  const isDark = theme === 'dark';

  const parsed = useMemo(() => parseSkus(skus), [skus]);
  const hasValidSkus = parsed.uniqueSkus.length > 0;

  // Stats
  const stats = useMemo(() => {
    const total = batches.length;
    const completed = batches.filter(b => b.status === 'completed').length;
    const failed = batches.filter(b => b.status === 'failed').length;
    const processing = batches.filter(b => b.status === 'processing').length;
    const totalSkus = batches.reduce((sum, b) => sum + b.sku_count, 0);
    const totalMatched = batches.reduce((sum, b) => sum + b.matched_count, 0);
    const totalUnique = batches.reduce((sum, b) => sum + b.unique_sku_count, 0);
    
    return {
      total,
      completed,
      failed,
      processing,
      pending: total - completed - failed - processing,
      totalSkus,
      totalMatched,
      totalUnique,
      matchRate: totalSkus > 0 ? Math.round((totalMatched / totalSkus) * 100) : 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [batches]);

  const showFeedback = (type: Feedback['type'], message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => { setFeedback(null); }, 4000);
  };

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        setUserName(profile?.name || user.email?.split('@')[0] || 'User');
        const isUserAdmin = ADMIN_EMAILS.includes(user.email || '');
        setIsAdmin(isUserAdmin);
        fetchBatches(user.id, false);
      }
    };
    getUser();
  }, []);

  const ADMIN_EMAILS = ['melvin@outdoorequipped.com', 'jonisa@outdoorequipped.com', 'arlie@outdoorequipped.com', 'jogie@outdoorequipped.com'];

  const fetchBatches = async (uid: string, showAll: boolean) => {
    setIsLoadingBatches(true);

    try {
      let query = supabase
        .from('sku_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!showAll) {
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching batches:', error);
        showFeedback('error', `Failed to load batches: ${error.message}`);
        setBatches([]);
      } else {
        setBatches((data ?? []) as SkuBatchRow[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showFeedback('error', 'Failed to load batches');
      setBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const toggleFilter = () => {
    const newShowAll = !showAllBatches;
    setShowAllBatches(newShowAll);
    if (userId) {
      fetchBatches(userId, newShowAll);
    }
  };

  const filteredBatches = useMemo(() => {
    let filtered = [...batches];

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(b => 
        b.batch_id.toLowerCase().includes(query) ||
        (b.filename?.toLowerCase().includes(query) ?? false) ||
        (b.user_email?.toLowerCase().includes(query) ?? false) ||
        (b.brands_found?.some(brand => brand.toLowerCase().includes(query)) ?? false)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [batches, searchTerm, statusFilter, sortField, sortOrder]);

  const handleProcess = async () => {
    if (!hasValidSkus || isProcessing) {
      showFeedback('error', 'Please enter at least one valid SKU.');
      return;
    }

    if (!userId) {
      showFeedback('error', 'User not authenticated');
      return;
    }

    let currentUserEmail = userEmail;
    let currentUserName = userName;
    if (!currentUserEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserEmail = user?.email || null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        currentUserName = profile?.name || user.email?.split('@')[0] || 'User';
      }
    }

    const batchId = `SC-${Math.floor(100000 + Math.random() * 899999)}`;
    const now = new Date().toISOString();

    const temporaryRow: SkuBatchRow = {
      id: `temp-${Date.now()}`,
      batch_id: batchId,
      sku_count: parsed.rawSkus.length,
      unique_sku_count: parsed.uniqueSkus.length,
      duplicate_count: parsed.duplicateCount,
      matched_count: 0,
      status: 'processing',
      brands_found: [],
      filename: 'shopkeep-consolidated-tool',
      export_path: null,
      error: null,
      created_at: now,
      user_id: userId,
      user_email: currentUserEmail || 'Unknown User',
    };

    setBatches((previous) => [temporaryRow, ...previous]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/process-skus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skus: parsed.uniqueSkus.join('\n'),
          userId: userId,
        }),
      });

      if (!response.ok) {
        let message = 'Processing failed.';
        try {
          const errorData = await response.json();
          message = errorData?.error || message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }

      const matchedCount = Number.parseInt(
        response.headers.get('x-match-count') ?? '0',
        10
      );

      let brands: string[] = [];

      try {
        brands = JSON.parse(response.headers.get('x-brands-found') ?? '[]');
      } catch {
        brands = [];
      }

      const totalRequested = Number.parseInt(
        response.headers.get('x-total-requested') ??
          String(parsed.uniqueSkus.length),
        10
      );

      const filename = getDownloadFilename(
        response.headers.get('content-disposition')
      );

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('The generated export file is empty.');
      }

      const exportPath = `sku-exports/${userId}/${batchId}-${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('exports')
        .upload(exportPath, blob, {
          contentType:
            blob.type ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('exports')
        .getPublicUrl(exportPath);

      const localUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = localUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(localUrl);

      const { data: insertedBatch, error: insertError } = await supabase
        .from('sku_batches')
        .insert({
          batch_id: batchId,
          user_id: userId,
          user_email: currentUserEmail,
          sku_count: totalRequested,
          unique_sku_count: parsed.uniqueSkus.length,
          duplicate_count: parsed.duplicateCount,
          matched_count: matchedCount,
          status: 'completed',
          brands_found: brands,
          filename,
          export_path: publicUrl,
        })
        .select(
          'id, batch_id, sku_count, unique_sku_count, duplicate_count, matched_count, status, brands_found, filename, export_path, error, created_at, user_email'
        )
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      await logToolRun({
        toolType: 'sku',
        status: matchedCount > 0 ? 'completed' : 'warning',
        title: 'SKU batch processed',
        description: `${matchedCount} of ${totalRequested} SKUs matched.`,
        totalCount: totalRequested,
        successCount: matchedCount,
        issueCount: parsed.duplicateCount,
        filename,
        metadata: {
          batchId,
          exportPath: publicUrl,
          brandsFound: brands,
          duplicateCount: parsed.duplicateCount,
        },
      });

      await createNotificationWithAgent(
        matchedCount > 0 ? '✅ SKU Processing Complete' : '⚠️ SKU Processing Warning',
        matchedCount > 0 
          ? `Successfully processed ${matchedCount} of ${totalRequested} SKUs${brands.length > 0 ? `, found ${brands.length} brands` : ''}`
          : `No matching SKUs found out of ${totalRequested} total SKUs`,
        matchedCount > 0 ? 'success' : 'warning',
        { url: '/downloads', batchId, matchedCount, totalRequested },
        currentUserName || currentUserEmail?.split('@')[0] || 'System',
        currentUserEmail || '',
        userId || '',
        { toolName: 'sku_processor', skuBatchId: insertedBatch?.id }
      );

      if (parsed.duplicateCount > 0) {
        await notifyAllUsers(
          '⚠️ SKU Processing Completed with Duplicates',
          `${currentUserName || currentUserEmail} processed SKUs with ${parsed.duplicateCount} duplicates detected. Please review the batch.`,
          'warning',
          { 
            url: '/downloads', 
            batchId, 
            duplicates: parsed.duplicateCount,
            matched: matchedCount
          },
          {
            id: userId || '',
            name: currentUserName || currentUserEmail?.split('@')[0] || 'System',
            email: currentUserEmail || '',
          },
          { toolName: 'sku_processor' },
          userId || undefined
        );
      }

      setBatches((previous) => [
        insertedBatch as SkuBatchRow,
        ...previous.filter((batch) => batch.id !== temporaryRow.id),
      ]);

      showFeedback(
        matchedCount > 0 ? 'success' : 'info',
        matchedCount > 0
          ? '✅ Batch completed and file downloaded.'
          : 'ℹ️ Batch completed, but no matching SKUs were found.'
      );

      if (matchedCount > 0) {
        setSkus('');
      }
    } catch (error) {
      console.error('SKU PROCESS ERROR:', error);

      const message =
        error instanceof Error ? error.message : 'Unknown processing error.';

      const { data: failedBatch, error: insertError } = await supabase
        .from('sku_batches')
        .insert({
          batch_id: batchId,
          user_id: userId,
          user_email: currentUserEmail,
          sku_count: parsed.rawSkus.length,
          unique_sku_count: parsed.uniqueSkus.length,
          duplicate_count: parsed.duplicateCount,
          matched_count: 0,
          status: 'failed',
          brands_found: [],
          filename: 'shopkeep-consolidated-tool',
          export_path: null,
          error: message,
        })
        .select(
          'id, batch_id, sku_count, unique_sku_count, duplicate_count, matched_count, status, brands_found, filename, export_path, error, created_at, user_email'
        )
        .single();

      await logToolRun({
        toolType: 'sku',
        status: 'failed',
        title: 'SKU batch failed',
        description: message,
        totalCount: parsed.rawSkus.length,
        successCount: 0,
        issueCount: parsed.rawSkus.length,
        metadata: {
          batchId,
          error: message,
        },
      });

      await createNotificationWithAgent(
        '❌ SKU Processing Failed',
        `Error: ${message}`,
        'error',
        undefined,
        currentUserName || currentUserEmail?.split('@')[0] || 'System',
        currentUserEmail || '',
        userId || '',
        { toolName: 'sku_processor' }
      );

      await notifyAllUsers(
        '❌ SKU Processing Failed',
        `${currentUserName || currentUserEmail} encountered an error while processing SKUs: ${message}`,
        'error',
        { 
          url: '/tools/sku', 
          error: message,
          user: currentUserName || currentUserEmail
        },
        {
          id: userId || '',
          name: currentUserName || currentUserEmail?.split('@')[0] || 'System',
          email: currentUserEmail || '',
        },
        { toolName: 'sku_processor' },
        userId || undefined
      );

      if (failedBatch && !insertError) {
        setBatches((previous) => [
          failedBatch as SkuBatchRow,
          ...previous.filter((batch) => batch.id !== temporaryRow.id),
        ]);
      } else {
        setBatches((previous) =>
          previous.map((batch) =>
            batch.id === temporaryRow.id
              ? {
                  ...batch,
                  status: 'failed',
                  error: message,
                }
              : batch
          )
        );
      }

      showFeedback('error', `❌ ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBatch = async (batch: SkuBatchRow) => {
    if (!userId) {
      showFeedback('error', 'User not authenticated');
      return;
    }

    if (!isAdmin && batch.user_id !== userId) {
      showFeedback('error', 'You can only delete your own batches');
      return;
    }

    if (!confirm(`Delete batch ${batch.batch_id}?`)) return;

    if (batch.export_path) {
      const pathMatch = batch.export_path.match(/\/exports\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('exports').remove([pathMatch[1]]);
      }
    }

    if (batch.id.startsWith('temp-')) {
      setBatches((previous) => previous.filter((item) => item.id !== batch.id));
      return;
    }

    const deleteQuery = supabase
      .from('sku_batches')
      .delete()
      .eq('id', batch.id);

    if (!isAdmin) {
      deleteQuery.eq('user_id', userId);
    }

    const { error } = await deleteQuery;

    if (error) {
      showFeedback('error', `Delete failed: ${error.message}`);
      return;
    }

    setBatches((previous) => previous.filter((item) => item.id !== batch.id));
    showFeedback('success', '🗑️ Batch deleted successfully.');
  };

  const handleDownloadSummary = (batch: SkuBatchRow) => {
    const rows = [
      ['Batch ID', batch.batch_id],
      ['Date Imported', formatDateTime(batch.created_at)],
      ['Status', getStatusLabel(batch.status)],
      ['Total Items', String(batch.sku_count)],
      ['Unique SKUs', String(batch.unique_sku_count)],
      ['Duplicate SKUs', String(batch.duplicate_count)],
      ['Matched SKUs', String(batch.matched_count)],
      ['Brands Found', (batch.brands_found ?? []).join(', ')],
      ['Filename', batch.filename ?? ''],
      ['Export Path', batch.export_path ?? ''],
      ['Error', batch.error ?? ''],
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${batch.batch_id}-summary.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    
    showFeedback('success', '📊 Summary downloaded successfully.');
  };

  const handleDownloadExport = async (batch: SkuBatchRow) => {
    if (!batch.export_path) {
      showFeedback('error', 'No export file available for this batch.');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('exports')
        .download(batch.export_path.split('/exports/')[1]);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = batch.filename || 'export.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      
      showFeedback('success', '📥 File downloaded successfully.');
    } catch (error) {
      console.error('Download error:', error);
      showFeedback('error', 'Failed to download export file.');
    }
  };

  const loadSample = () => {
    setSkus(SAMPLE_SKUS);
    showFeedback('info', '📋 Sample SKUs loaded. Click Process to test.');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const clearInput = () => {
    setSkus('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const refreshBatches = () => {
    if (userId) {
      fetchBatches(userId, showAllBatches);
      showFeedback('info', '🔄 Refreshing batches...');
    }
  };

  const handleCopySkus = async () => {
    if (!skus) return;
    try {
      await navigator.clipboard.writeText(skus);
      showFeedback('success', '📋 SKUs copied to clipboard!');
    } catch {
      showFeedback('error', 'Failed to copy SKUs.');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const pageBg = isDark
    ? 'border-slate-700/50 bg-slate-900/50'
    : 'border-gray-200 bg-white/80';

  const inputClass = isDark
    ? 'border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500'
    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400';

  return (
    <div className={`w-full max-w-full space-y-6 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-950' : ''}`}>
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm rounded-xl border p-4 shadow-2xl animate-slide-in ${
            feedback.type === 'success'
              ? isDark ? 'border-emerald-500/30 bg-emerald-900/90 text-emerald-100' : 'border-emerald-300 bg-emerald-100 text-emerald-800'
              : feedback.type === 'error'
                ? isDark ? 'border-red-500/30 bg-red-900/90 text-red-100' : 'border-red-300 bg-red-100 text-red-800'
                : feedback.type === 'warning'
                  ? isDark ? 'border-yellow-500/30 bg-yellow-900/90 text-yellow-100' : 'border-yellow-300 bg-yellow-100 text-yellow-800'
                  : isDark ? 'border-blue-500/30 bg-blue-900/90 text-blue-100' : 'border-blue-300 bg-blue-100 text-blue-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />}
            {feedback.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />}
            {feedback.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-400" />}
            {feedback.type === 'info' && <Info className="h-5 w-5 flex-shrink-0 text-blue-400" />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Batches"
            value={stats.total}
            icon={<Package className="h-4 w-4" />}
            color="text-blue-400"
            bg="bg-blue-500/20"
            theme={theme}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-400"
            bg="bg-emerald-500/20"
            theme={theme}
          />
          <StatCard
            label="Processing"
            value={stats.processing}
            icon={<Loader2 className="h-4 w-4 animate-spin" />}
            color="text-orange-400"
            bg="bg-orange-500/20"
            theme={theme}
          />
          <StatCard
            label="Failed"
            value={stats.failed}
            icon={<XCircle className="h-4 w-4" />}
            color="text-red-400"
            bg="bg-red-500/20"
            theme={theme}
          />
          <StatCard
            label="Total SKUs"
            value={stats.totalSkus}
            icon={<Layers className="h-4 w-4" />}
            color="text-purple-400"
            bg="bg-purple-500/20"
            theme={theme}
          />
          <StatCard
            label="Match Rate"
            value={`${stats.matchRate}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-cyan-400"
            bg="bg-cyan-500/20"
            theme={theme}
          />
        </div>
      )}

      {/* Input Panel */}
      <div className={`rounded-xl border p-4 shadow-lg sm:p-5 ${pageBg}`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-start gap-2">
                <UploadCloud className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <h2 className={`break-words text-sm font-semibold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-gray-900'
                  }`}>
                    Shopkeep Consolidated Tool
                  </h2>
                  <p className={`mt-1 text-xs leading-5 ${
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Paste SKUs below, process, download the export, and track the batch in the table.
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowStats(!showStats)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title="Toggle stats"
                >
                  <BarChart2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`rounded-lg p-1.5 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                ref={inputRef}
                className={`h-40 w-full resize-none rounded-lg border p-3 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-36 lg:h-32 ${inputClass}`}
                placeholder={`Enter SKUs one per line:\nSKU12345\nSKU67890\nSKU11111`}
                value={skus}
                onChange={(event) => setSkus(event.target.value)}
                disabled={isProcessing}
                spellCheck={false}
              />
              {skus && (
                <button
                  type="button"
                  onClick={handleCopySkus}
                  className={`absolute right-2 top-2 rounded-lg p-1.5 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title="Copy SKUs"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full xl:w-80">
            <div className="mb-3 grid grid-cols-3 gap-2">
              <MiniStat label="Rows" value={parsed.rawSkus.length} theme={theme} />
              <MiniStat label="Unique" value={parsed.uniqueSkus.length} theme={theme} />
              <MiniStat label="Dupes" value={parsed.duplicateCount} theme={theme} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto_auto]">
              <button
                type="button"
                onClick={handleProcess}
                disabled={!hasValidSkus || isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {isProcessing ? 'Processing...' : 'Process SKUs'}
              </button>

              <button
                type="button"
                onClick={loadSample}
                disabled={isProcessing}
                className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-50 sm:w-auto xl:w-full 2xl:w-auto ${
                  isDark
                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Sample</span>
              </button>

              <button
                type="button"
                onClick={clearInput}
                disabled={isProcessing || !hasValidSkus}
                className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 transition-colors disabled:opacity-50 sm:w-auto xl:w-full 2xl:w-auto ${
                  isDark
                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
                title="Clear input"
              >
                <Trash2 className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Clear</span>
              </button>
            </div>

            {parsed.duplicateCount > 0 && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${
                isDark
                  ? 'border-yellow-500/30 bg-yellow-600/10 text-yellow-400'
                  : 'border-yellow-300 bg-yellow-100 text-yellow-800'
              }`}>
                ⚠️ Duplicate SKUs detected. Only unique SKUs will be processed.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch History */}
      <div className={`overflow-hidden rounded-xl border shadow-lg ${pageBg}`}>
        <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
          isDark ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              Batch Import History
            </h3>
            <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {showAllBatches ? '👥 Showing all batches from all users' : '👤 Showing only your batches'}
              <span className="ml-2">· {filteredBatches.length} batches</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleFilter}
              disabled={isLoadingBatches}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                showAllBatches
                  ? isDark
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : isDark
                    ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {showAllBatches ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              {showAllBatches ? 'All' : 'My'}
            </button>

            <button
              type="button"
              onClick={refreshBatches}
              disabled={isLoadingBatches}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 sm:w-auto ${
                isDark
                  ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isLoadingBatches ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search by batch ID, filename, user, or brand..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
            >
              <option value="all">All Statuses</option>
              <option value="completed">✅ Completed</option>
              <option value="processing">⏳ Processing</option>
              <option value="pending">⏰ Pending</option>
              <option value="failed">❌ Failed</option>
            </select>
          </div>
        </div>

        {isLoadingBatches ? (
          <div className="px-6 py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
            <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Loading your batches...
            </p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UploadCloud className={`mx-auto h-12 w-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <p className={`mt-3 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {searchTerm || statusFilter !== 'all' ? 'No matching batches found' : 'No batch records yet'}
            </p>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Process SKUs above to create your first batch record.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className={`mt-3 text-sm text-emerald-400 hover:underline`}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 p-3 lg:hidden">
              {filteredBatches.map((batch) => (
                <MobileBatchCard
                  key={batch.id}
                  batch={batch}
                  theme={theme}
                  onView={() => setSelectedBatch(batch)}
                  onDelete={() => handleDeleteBatch(batch)}
                  onDownload={() => handleDownloadSummary(batch)}
                  onExport={() => handleDownloadExport(batch)}
                  onRefresh={refreshBatches}
                  isAdmin={isAdmin}
                  currentUserId={userId}
                />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className={isDark ? 'bg-cyan-950/70 text-slate-100' : 'bg-cyan-900 text-white'}>
                    <th className="w-10 px-3 py-3 text-left">
                      <input type="checkbox" className="h-4 w-4 rounded" />
                    </th>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead alignRight>Total</TableHead>
                    <TableHead alignRight>Unique</TableHead>
                    <TableHead alignRight>Matched</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead alignRight>Actions</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch, index) => (
                    <BatchTableRow
                      key={batch.id}
                      batch={batch}
                      index={index}
                      theme={theme}
                      onView={() => setSelectedBatch(batch)}
                      onDelete={() => handleDeleteBatch(batch)}
                      onDownload={() => handleDownloadSummary(batch)}
                      onExport={() => handleDownloadExport(batch)}
                      onRefresh={refreshBatches}
                      isAdmin={isAdmin}
                      currentUserId={userId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          theme={theme}
          onClose={() => setSelectedBatch(null)}
          onExport={() => handleDownloadExport(selectedBatch)}
        />
      )}
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, bg, theme }: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  bg: string;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700/50 bg-slate-900/60' : 'border-gray-200 bg-white/80'}`}>
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-1.5 ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <div>
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, alignRight = false }: { children: ReactNode; alignRight?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-xs font-semibold ${alignRight ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: BatchStatus }) {
  const config = {
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    processing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${config[status]}`}>
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </span>
  );
}

function ActionButtonSmall({
  icon,
  label,
  color,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  color: 'cyan' | 'red' | 'emerald' | 'slate';
  onClick: () => void;
  disabled?: boolean;
}) {
  const colors = {
    cyan: 'bg-cyan-700/70 text-cyan-50 hover:bg-cyan-600/80',
    red: 'bg-red-500/50 text-white hover:bg-red-500/70',
    emerald: 'bg-emerald-700/70 text-emerald-50 hover:bg-emerald-600/80',
    slate: 'bg-slate-600/50 text-slate-300 hover:bg-slate-500/50',
  };

  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 transition-all hover:scale-110 ${colors[color]} ${disabled ? 'cursor-not-allowed opacity-50 hover:scale-100' : ''}`}
    >
      {icon}
    </button>
  );
}

function MiniStat({ label, value, theme }: { label: string; value: number; theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  return (
    <div className={`min-w-0 rounded-lg border p-2 ${isDark ? 'border-slate-700/50 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`truncate text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{label}</p>
      <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

// ─── Mobile Batch Card ──────────────────────────────────────────────────────

function MobileBatchCard({
  batch,
  theme,
  onView,
  onDelete,
  onDownload,
  onExport,
  onRefresh,
  isAdmin,
  currentUserId,
}: {
  batch: SkuBatchRow;
  theme: 'light' | 'dark';
  onView: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onExport: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const isDark = theme === 'dark';
  const progress = getProgress(batch);
  const brands = batch.brands_found ?? [];
  const isOwnBatch = batch.user_id === currentUserId;

  return (
    <div className={`rounded-xl border p-4 ${
      isDark ? 'border-slate-700/60 bg-slate-950/60' : 'border-gray-200 bg-white'
    } ${!isOwnBatch && isAdmin ? 'ring-1 ring-emerald-500/30' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-400">
              {batch.user_email?.[0]?.toUpperCase() || 'U'}
            </div>
            <p className={`truncate text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`} title={batch.user_email}>
              {batch.user_email || 'Unknown'}
              {!isOwnBatch && isAdmin && <span className="ml-2 text-[10px] text-emerald-400">(Other)</span>}
            </p>
          </div>
          <p className="font-mono text-xs font-semibold text-cyan-400">{batch.batch_id}</p>
          <h4 className={`mt-1 truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`} title={batch.filename || 'shopkeep-consolidated-tool'}>
            {batch.filename || 'shopkeep-consolidated-tool'}
          </h4>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            {formatDateRelative(batch.created_at)}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total" value={batch.sku_count} theme={theme} />
        <MiniStat label="Unique" value={batch.unique_sku_count} theme={theme} />
        <MiniStat label="Matched" value={batch.matched_count} theme={theme} />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progress</span>
          <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{progress}%</span>
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(batch.status)}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {brands.length > 0 && (
        <div className="mt-3">
          <p className={`mb-1 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Brands</p>
          <div className="flex flex-wrap gap-1">
            {brands.slice(0, 3).map((brand) => (
              <span key={brand} className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                <Tag className="h-3 w-3" />
                {brand}
              </span>
            ))}
            {brands.length > 3 && <span className="text-xs text-slate-500">+{brands.length - 3} more</span>}
          </div>
        </div>
      )}

      {batch.error && (
        <div className={`mt-3 rounded-lg border p-2 text-xs ${
          isDark ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-red-300 bg-red-50 text-red-700'
        }`}>
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{batch.error}</span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        <ActionButtonSmall icon={<Download className="h-3.5 w-3.5" />} label="Summary" onClick={onDownload} color="cyan" />
        <ActionButtonSmall icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={onExport} color="emerald" disabled={!batch.export_path} />
        <ActionButtonSmall icon={<Eye className="h-3.5 w-3.5" />} label="View" onClick={onView} color="slate" />
        <ActionButtonSmall icon={<RefreshCw className="h-3.5 w-3.5" />} label="Refresh" onClick={onRefresh} color="slate" />
        <ActionButtonSmall icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={onDelete} color="red" />
      </div>
    </div>
  );
}

// ─── Desktop Table Row ──────────────────────────────────────────────────────

function BatchTableRow({
  batch,
  index,
  theme,
  onView,
  onDelete,
  onDownload,
  onExport,
  onRefresh,
  isAdmin,
  currentUserId,
}: {
  batch: SkuBatchRow;
  index: number;
  theme: 'light' | 'dark';
  onView: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onExport: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const isDark = theme === 'dark';
  const progress = getProgress(batch);
  const brands = batch.brands_found ?? [];
  const isOwnBatch = batch.user_id === currentUserId;

  return (
    <tr className={`border-b transition-colors ${
      isDark
        ? index % 2 === 0
          ? 'border-slate-700/60 bg-slate-950/60 hover:bg-slate-800/70'
          : 'border-slate-700/60 bg-slate-800/60 hover:bg-slate-800/90'
        : index % 2 === 0
          ? 'border-gray-200 bg-white hover:bg-gray-50'
          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    } ${!isOwnBatch && isAdmin ? 'ring-1 ring-emerald-500/30' : ''}`}>
      <td className="px-3 py-3">
        <input type="checkbox" className="h-4 w-4 rounded" />
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        <div title={formatDateTime(batch.created_at)}>
          {formatDateRelative(batch.created_at)}
        </div>
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-400">
            {batch.user_email?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="truncate max-w-[120px]" title={batch.user_email}>
            {batch.user_email || 'Unknown'}
            {!isOwnBatch && isAdmin && <span className="ml-2 text-[10px] text-emerald-400">(Other)</span>}
          </span>
        </div>
      </td>
      <td className={`whitespace-nowrap px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
        {batch.batch_id}
      </td>
      <td className="px-4 py-3 text-xs">
        <div className={`max-w-[180px] truncate font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`} title={batch.filename || 'shopkeep-consolidated-tool'}>
          {batch.filename || 'shopkeep-consolidated-tool'}
        </div>
        {brands.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {brands.slice(0, 2).map((brand) => (
              <span key={brand} className="inline-flex items-center gap-1 text-[10px] text-cyan-400">
                <Tag className="h-2.5 w-2.5" />
                {brand}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-cyan-400">
          {batch.sku_count}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs">{batch.unique_sku_count}</td>
      <td className="px-4 py-3 text-right text-xs">
        <span className="font-semibold text-emerald-400">{batch.matched_count}</span>
      </td>
      <td className="px-4 py-3">
        <div className="w-32">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/70">
            <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(batch.status)}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={batch.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          <ActionButtonSmall icon={<Download className="h-3.5 w-3.5" />} label="Summary" onClick={onDownload} color="cyan" />
          <ActionButtonSmall icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={onExport} color="emerald" disabled={!batch.export_path} />
          <ActionButtonSmall icon={<Eye className="h-3.5 w-3.5" />} label="View" onClick={onView} color="slate" />
          <ActionButtonSmall icon={<RefreshCw className="h-3.5 w-3.5" />} label="Refresh" onClick={onRefresh} color="slate" />
          <ActionButtonSmall icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={onDelete} color="red" />
        </div>
      </td>
    </tr>
  );
}

// ─── Batch Details Modal ──────────────────────────────────────────────────

function BatchDetailsModal({
  batch,
  theme,
  onClose,
  onExport,
}: {
  batch: SkuBatchRow;
  theme: 'light' | 'dark';
  onClose: () => void;
  onExport: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-4 shadow-2xl sm:p-6 ${
        isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
      }`} onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Batch Details</h3>
            <p className="break-all font-mono text-xs text-emerald-500">{batch.batch_id}</p>
          </div>
          <div className="flex gap-2">
            {batch.export_path && (
              <button
                type="button"
                onClick={onExport}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailItem label="Date Imported" value={formatDateTime(batch.created_at)} />
          <DetailItem label="Status" value={getStatusLabel(batch.status)} />
          <DetailItem label="Total Items" value={String(batch.sku_count)} />
          <DetailItem label="Unique SKUs" value={String(batch.unique_sku_count)} />
          <DetailItem label="Duplicate SKUs" value={String(batch.duplicate_count)} />
          <DetailItem label="Matched SKUs" value={String(batch.matched_count)} />
          <DetailItem label="Filename" value={batch.filename ?? '—'} />
          <DetailItem label="Match Rate" value={batch.sku_count > 0 ? `${Math.round((batch.matched_count / batch.sku_count) * 100)}%` : '0%'} />
        </div>

        {batch.brands_found && batch.brands_found.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-400">Brands Found</p>
            <div className="flex flex-wrap gap-2">
              {batch.brands_found.map((brand) => (
                <span key={brand} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">{brand}</span>
              ))}
            </div>
          </div>
        )}

        {batch.export_path && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-400">Export Location</p>
            <div className="break-all rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-300">
              {batch.export_path}
            </div>
          </div>
        )}

        {batch.error && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-red-400">Error Message</p>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="break-words">{batch.error}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

// Add missing imports
function AlertTriangle(props: any) {
  return <AlertCircle {...props} />;
}

function Info(props: any) {
  return <AlertCircle {...props} />;
}

function X(props: any) {
  return <span {...props}>×</span>;
}