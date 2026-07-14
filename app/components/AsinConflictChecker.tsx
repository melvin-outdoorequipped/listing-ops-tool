'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Keyboard,
  Loader2,
  Play,
  Trash2,
  Upload,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Zap,
  TrendingUp,
  AlertTriangle,
  Shield,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Grid,
  List,
  BarChart2,
  PieChart,
  Info,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Clock,
  Users,
  Hash,
  Activity,
  Check,
  AlertOctagon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';
import { logToolRun } from '@/lib/tara/logActivity';
import { useNotifications } from '@/contexts/NotificationContext';
import { notifyAllUsers } from '@/lib/notification-helper';

interface AsinConflictCheckerProps {
  theme?: 'light' | 'dark';
}

interface StyleAsinPair {
  style: string;
  asin: string;
}

interface Conflict {
  style: string;
  asins: string[];
}

interface RunStats {
  totalRows: number;
  validPairs: number;
  ignoredRows: number;
  uniqueStyles: number;
}

type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface Feedback {
  type: FeedbackType;
  message: string;
}

const sampleStyles = `PAN1P/8080AP121
PAN1P/9180AP121
PAN3P/5353AZ531
PAN3P/8080AP531
PAN3P/9180AP531
XAC9P/6253AP534
XAC9P/9180AP533
XAN1P/8080AP131
XAN1P/9180AP131
XAN3P/9180AP531
XAN9E/9180AP506
XAN9P/8080AP536`;

const sampleAsins = `B09X25ZFH6
B09X25ZFH6
B09XBXH44D
B09XBXH44D
B09XBXH44D
B09XFXNMFV
B09XFXNMFV
B0DVCCHV1Q
B0DVCCHV1Q
B0B578QHH7
B09WRV711W
B09WRV711W`;

function splitLines(value: string): string[] {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function csvEscape(value: string): string {
  const safeValue = value ?? '';
  if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

function buildPairs(stylesInput: string, asinsInput: string) {
  const stylesArray = splitLines(stylesInput);
  const asinsArray = splitLines(asinsInput);
  const maxRows = Math.max(stylesArray.length, asinsArray.length);
  const pairs: StyleAsinPair[] = [];
  let ignoredRows = 0;

  for (let i = 0; i < maxRows; i++) {
    const style = stylesArray[i]?.trim() ?? '';
    const asin = asinsArray[i]?.trim() ?? '';
    if (style && asin) pairs.push({ style, asin });
    else if (style || asin) ignoredRows++;
  }
  return { pairs, totalRows: maxRows, ignoredRows };
}

function findConflicts(pairs: StyleAsinPair[]): Conflict[] {
  const styleMap = new Map<string, Set<string>>();
  pairs.forEach(({ style, asin }) => {
    if (!styleMap.has(style)) styleMap.set(style, new Set());
    styleMap.get(style)?.add(asin);
  });
  return Array.from(styleMap.entries())
    .filter(([, set]) => set.size > 1)
    .map(([style, set]) => ({ style, asins: Array.from(set).sort() }))
    .sort((a, b) => a.style.localeCompare(b.style));
}

function LineGutter({ text, isDark }: { text: string; isDark: boolean }) {
  const lines = text ? splitLines(text) : [];
  const count = Math.max(lines.length, 20);

  return (
    <div
      className={`flex flex-col select-none px-2 py-3 text-right font-mono text-[11px] leading-[1.625rem] border-r shrink-0 ${
        isDark ? 'text-slate-600 bg-slate-900/40 border-slate-800' : 'text-gray-300 bg-gray-50 border-gray-200'
      }`}
      style={{ minWidth: '3.5rem' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>{i + 1}</span>
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ 
  label, 
  value, 
  theme, 
  icon,
  className = '',
}: { 
  label: string; 
  value: string | number; 
  theme: 'light' | 'dark';
  icon?: React.ReactNode;
  className?: string;
}) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} ${className}`}>
      {icon && <span className={`flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{icon}</span>}
      <div className="min-w-0">
        <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-sm font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Severity Badge ─────────────────────────────────────────────────────────

function SeverityBadge({ count, theme }: { count: number; theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  let label, cls;
  if (count >= 4) {
    label = 'Critical';
    cls = isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200';
  } else if (count === 3) {
    label = 'High';
    cls = isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200';
  } else {
    label = 'Medium';
    cls = isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AsinConflictChecker({ theme = 'dark' }: AsinConflictCheckerProps) {
  const [stylesInput, setStylesInput] = useState('');
  const [asinsInput, setAsinsInput] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastRan, setLastRan] = useState<{ date: string; time: string; userEmail: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const { createNotificationWithAgent } = useNotifications();

  const stylesRef = useRef<HTMLTextAreaElement>(null);
  const asinsRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const stylesLineCount = useMemo(() => stylesInput.trim() ? splitLines(stylesInput).length : 0, [stylesInput]);
  const asinsLineCount = useMemo(() => asinsInput.trim() ? splitLines(asinsInput).length : 0, [asinsInput]);
  const hasInput = stylesInput.trim().length > 0 || asinsInput.trim().length > 0;
  const hasBothInputs = stylesInput.trim().length > 0 && asinsInput.trim().length > 0;
  const lineCountMismatch = stylesLineCount > 0 && asinsLineCount > 0 && stylesLineCount !== asinsLineCount;
  const maxAsins = conflicts.length > 0 ? Math.max(...conflicts.map(c => c.asins.length)) : 0;

  // Filtered conflicts
  const filteredConflicts = useMemo(() => {
    let filtered = conflicts;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.style.toLowerCase().includes(query) ||
        c.asins.some(asin => asin.toLowerCase().includes(query))
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(c => {
        const severity = getSeverity(c.asins.length);
        return severity.key === severityFilter;
      });
    }

    return filtered;
  }, [conflicts, searchTerm, severityFilter]);

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
      }
    };
    getUser();
  }, []);

  // Keyboard shortcut: ⌘Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && hasBothInputs && !isChecking) {
        e.preventDefault();
        handleRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && conflicts.length > 0) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasBothInputs, isChecking, conflicts]);

  const showFeedback = (type: FeedbackType, message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const syncScroll = useCallback((source: 'styles' | 'asins') => {
    const src = source === 'styles' ? stylesRef.current : asinsRef.current;
    const dst = source === 'styles' ? asinsRef.current : stylesRef.current;
    if (!src || !dst) return;
    const pct = src.scrollTop / (src.scrollHeight - src.clientHeight || 1);
    setScrollPct(pct * 100);
    dst.scrollTop = src.scrollTop;
  }, []);

  const loadSampleData = () => {
    setStylesInput(sampleStyles);
    setAsinsInput(sampleAsins);
    setConflicts([]);
    setLastRan(null);
    setStats(null);
    setExpandedRows(new Set());
    setSelectedRows(new Set());
    showFeedback('info', 'Sample data loaded. Run analysis to check for conflicts.');
  };

  const getSeverity = (asinCount: number) => {
    if (asinCount >= 4) return { label: 'Critical', key: 'critical', cls: isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200' };
    if (asinCount === 3) return { label: 'High', key: 'high', cls: isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: 'Medium', key: 'medium', cls: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const toggleRow = (style: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(style)) next.delete(style);
      else next.add(style);
      return next;
    });
  };

  const toggleSelectRow = (style: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(style)) next.delete(style);
      else next.add(style);
      return next;
    });
  };

  const handleRun = async () => {
    if (!hasBothInputs) { 
      showFeedback('error', 'Provide both Style IDs and Parent ASINs.'); 
      return; 
    }
    
    let currentUserEmail = userEmail;
    let currentUserId = userId;
    let currentUserName = userName;
    
    if (!currentUserEmail || !currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserEmail = user.email || 'System';
        currentUserId = user.id;
        setUserEmail(currentUserEmail);
        setUserId(currentUserId);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        currentUserName = profile?.name || user.email?.split('@')[0] || 'User';
        setUserName(currentUserName);
      } else {
        currentUserEmail = 'System';
        currentUserId = null;
        currentUserName = 'System';
      }
    }
    
    setIsChecking(true);
    setFeedback(null);

    try {
      const { pairs, totalRows, ignoredRows } = buildPairs(stylesInput, asinsInput);
      if (pairs.length === 0) { 
        setConflicts([]); 
        setStats(null); 
        showFeedback('error', 'No valid Style-ASIN pairs found.'); 
        return; 
      }

      const result = findConflicts(pairs);
      const uniqueStyles = new Set(pairs.map(p => p.style)).size;
      const runStats: RunStats = { totalRows, validPairs: pairs.length, ignoredRows, uniqueStyles };
      const conflictCount = result.length;

      setConflicts(result);
      setStats(runStats);
      setExpandedRows(new Set());
      setSelectedRows(new Set());
      setLastRan({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        userEmail: currentUserEmail || 'System',
      });

      // Scroll to results after a brief delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);

      // Save to asin_checks table
      let savedCheck = null;
      try {
        const insertData: any = {
          total_rows: totalRows,
          valid_pairs: pairs.length,
          ignored_rows: ignoredRows,
          conflict_count: conflictCount,
          conflicts: result,
          status: 'completed',
          created_at: new Date().toISOString(),
        };
        
        if (currentUserId) insertData.user_id = currentUserId;
        if (currentUserEmail) insertData.user_email = currentUserEmail;
        
        const { data } = await supabase.from('asin_checks').insert(insertData).select().single();
        savedCheck = data;
      } catch (err) {
        console.error('Failed to save to asin_checks:', err);
      }

      await createNotificationWithAgent(
        conflictCount > 0 ? 'ASIN Conflicts Found' : 'ASIN Check Complete',
        conflictCount > 0 
          ? `Detected ${conflictCount} style${conflictCount === 1 ? '' : 's'} with multiple parent ASINs`
          : 'No conflicts detected - all styles have unique parent ASINs',
        conflictCount > 0 ? 'warning' : 'success',
        { url: '/tools/asin', conflictCount },
        currentUserName || currentUserEmail?.split('@')[0] || 'System',
        currentUserEmail || '',
        currentUserId || '',
        { toolName: 'asin_checker', asinCheckId: savedCheck?.id }
      );

      // Notify ALL users
      try {
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id, email, name');
        
        if (allUsers && allUsers.length > 1) {
          await notifyAllUsers(
            conflictCount > 0 
              ? `${conflictCount} ASIN Conflict${conflictCount > 1 ? 's' : ''} Found`
              : 'ASIN Check Complete',
            conflictCount > 0 
              ? `${currentUserName || currentUserEmail} found ${conflictCount} style${conflictCount === 1 ? '' : 's'} with multiple parent ASINs`
              : `${currentUserName || currentUserEmail} completed an ASIN check with no conflicts found.`,
            conflictCount >= 3 ? 'error' : (conflictCount > 0 ? 'warning' : 'info'),
            { 
              url: '/tools/asin', 
              conflictCount, 
              detectedBy: currentUserEmail || currentUserName,
              userName: currentUserName
            },
            {
              id: currentUserId || '',
              name: currentUserName || currentUserEmail?.split('@')[0] || 'System',
              email: currentUserEmail || '',
            },
            { toolName: 'asin_checker', asinCheckId: savedCheck?.id },
            currentUserId || undefined
          );
        }
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
      }

      await logToolRun({
        toolType: 'asin',
        status: conflictCount > 0 ? 'warning' : 'completed',
        title: conflictCount > 0 
          ? `ASIN Check: ${conflictCount} conflict${conflictCount === 1 ? '' : 's'} found` 
          : 'ASIN Check: No conflicts found',
        description: conflictCount > 0 
          ? `${conflictCount} style${conflictCount === 1 ? ' has' : 's have'} multiple parent ASINs.` 
          : 'All styles have unique parent ASINs.',
        totalCount: pairs.length,
        successCount: pairs.length - conflictCount,
        issueCount: conflictCount,
        metadata: {
          totalRows,
          validPairs: pairs.length,
          ignoredRows,
          uniqueStyles,
          conflicts: result,
          userEmail: currentUserEmail,
          userId: currentUserId,
        },
      });

      showFeedback(
        conflictCount > 0 ? 'warning' : 'success',
        conflictCount > 0 
          ? `${conflictCount} conflict${conflictCount === 1 ? '' : 's'} found.` 
          : 'No conflicts found.'
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ASIN check failed.';
      
      try {
        const insertData: any = {
          total_rows: 0,
          valid_pairs: 0,
          ignored_rows: 0,
          conflict_count: 0,
          conflicts: [],
          status: 'failed',
          error: message,
          created_at: new Date().toISOString(),
        };
        
        if (currentUserId) insertData.user_id = currentUserId;
        if (currentUserEmail) insertData.user_email = currentUserEmail;
        
        await supabase.from('asin_checks').insert(insertData);
        
        await createNotificationWithAgent(
          'ASIN Check Failed',
          `Error: ${message}`,
          'error',
          undefined,
          currentUserName || currentUserEmail?.split('@')[0] || 'System',
          currentUserEmail || '',
          currentUserId || '',
          { toolName: 'asin_checker' }
        );

        try {
          const { data: allUsers } = await supabase
            .from('profiles')
            .select('id');
          
          if (allUsers && allUsers.length > 1) {
            await notifyAllUsers(
              'ASIN Check Failed',
              `${currentUserName || currentUserEmail} encountered an error: ${message}`,
              'error',
              { 
                url: '/tools/asin', 
                error: message,
                user: currentUserEmail || currentUserName
              },
              {
                id: currentUserId || '',
                name: currentUserName || currentUserEmail?.split('@')[0] || 'System',
                email: currentUserEmail || '',
              },
              { toolName: 'asin_checker' },
              currentUserId || undefined
            );
          }
        } catch (notifError) {
          console.error('Failed to send error notification:', notifError);
        }
      } catch (err) {
        console.error('Failed to save failed run:', err);
      }
      
      await logToolRun({
        toolType: 'asin',
        status: 'failed',
        title: 'ASIN Check failed',
        description: message,
        totalCount: 0,
        successCount: 0,
        issueCount: 0,
        metadata: { 
          error: message,
          userEmail: currentUserEmail,
          userId: currentUserId,
        },
      });
      
      showFeedback('error', message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleClear = () => { 
    setStylesInput(''); 
    setAsinsInput(''); 
    setConflicts([]); 
    setLastRan(null); 
    setStats(null); 
    setFeedback(null);
    setSearchTerm('');
    setSeverityFilter('all');
    setExpandedRows(new Set());
    setSelectedRows(new Set());
  };

  const handleCopyResults = async () => {
    if (filteredConflicts.length === 0) return;
    try {
      const headers = ['Style', ...Array.from({ length: maxAsins }, (_, i) => `Parent ASIN ${i + 1}`)];
      const rows = filteredConflicts.map(c => [c.style, ...c.asins]);
      await navigator.clipboard.writeText([headers, ...rows].map(r => r.join('\t')).join('\n'));
      showFeedback('success', 'Results copied to clipboard.');
    } catch { 
      showFeedback('error', 'Unable to copy results.'); 
    }
  };

  const handleExportCSV = () => {
    if (filteredConflicts.length === 0) return;
    const headers = ['Style', ...Array.from({ length: maxAsins }, (_, i) => `Parent ASIN ${i + 1}`)];
    const rows = filteredConflicts.map(c => [c.style, ...c.asins]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `asin-conflicts-${new Date().toISOString().split('T')[0]}.csv`; 
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', 'CSV exported successfully.');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    document.documentElement.style.overflow = !isFullscreen ? 'hidden' : 'unset';
  };

  const cardClass = isDark ? 'bg-slate-900/60 border-slate-700/40' : 'bg-white/80 border-gray-200/60';
  const panelHeaderClass = isDark ? 'bg-slate-800/30 border-slate-700/40' : 'bg-gray-50/80 border-gray-200/60';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const strongText = isDark ? 'text-white' : 'text-gray-900';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full max-w-full space-y-5 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 p-5 bg-slate-950/95 backdrop-blur-sm' : ''}`}>
      {/* ─── Toast Feedback ────────────────────────────────────────────────── */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border p-4 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 ${
          feedback.type === 'success'
            ? isDark ? 'border-emerald-500/20 bg-emerald-900/90 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : feedback.type === 'error'
              ? isDark ? 'border-red-500/20 bg-red-900/90 text-red-100' : 'border-red-200 bg-red-50 text-red-800'
              : feedback.type === 'warning'
                ? isDark ? 'border-amber-500/20 bg-amber-900/90 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
                : isDark ? 'border-blue-500/20 bg-blue-900/90 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            {feedback.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400" />}
            {feedback.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />}
            {feedback.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />}
            {feedback.type === 'info' && <Info className="h-5 w-5 flex-shrink-0 text-blue-400" />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className={`text-xl font-bold tracking-tight sm:text-2xl ${strongText}`}>
            Multiple Parent ASIN Checker
          </h1>
          <p className={`text-sm ${mutedText}`}>
            Identify styles with multiple unique parent ASINs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs sm:flex ${
            isDark ? 'border-slate-700 bg-slate-800/50 text-slate-500' : 'border-gray-200 bg-gray-50 text-gray-400'
          }`}>
            <Keyboard className="h-3.5 w-3.5" />
            <kbd className="font-medium">⌘↵</kbd>
            <span className="ml-0.5">Run</span>
            <span className="mx-1 text-slate-600">·</span>
            <kbd className="font-medium">⌘K</kbd>
            <span className="ml-0.5">Search</span>
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`rounded-lg border p-2 transition-colors ${
              isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800/50' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(c => !c)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              isDark ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/60' : 'border-gray-200 bg-gray-100/80 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{showHelp ? 'Hide Help' : 'Help'}</span>
          </button>
        </div>
      </div>

      {/* ─── Help Panel (Slide-over) ──────────────────────────────────────── */}
      {showHelp && (
        <div className={`rounded-xl border p-5 animate-in slide-in-from-top-2 fade-in duration-200 ${
          isDark ? 'border-slate-700/40 bg-slate-800/30' : 'border-gray-200 bg-gray-50/80'
        }`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                How it works
              </h4>
              <ul className={`mt-2 space-y-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">1.</span>
                  <span>Paste Style IDs and Parent ASINs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">2.</span>
                  <span>Click Run or press ⌘↵</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">3.</span>
                  <span>Review conflicts and export</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Keyboard Shortcuts
              </h4>
              <ul className={`mt-2 space-y-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <li><kbd className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>⌘↵</kbd> Run analysis</li>
                <li><kbd className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>⌘K</kbd> Focus search</li>
                <li><kbd className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>Esc</kbd> Close help</li>
              </ul>
            </div>
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                CSV Format
              </h4>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                One Style ID per row, one Parent ASIN per row.<br />
                Rows are matched by index position.
              </p>
            </div>
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Troubleshooting
              </h4>
              <ul className={`mt-2 space-y-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <li>• Mismatched row counts show amber warning</li>
                <li>• Empty rows are ignored</li>
                <li>• Results are automatically saved</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Card ────────────────────────────────────────────────────── */}
      <div className={`flex flex-1 flex-col overflow-hidden rounded-xl border ${cardClass}`}>
        {/* ─── Toolbar ────────────────────────────────────────────────────── */}
        <div className={`flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between ${panelHeaderClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={!hasBothInputs || isChecking}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
            >
              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isChecking ? 'Analyzing...' : 'Run Analysis'}
            </button>
            <button
              type="button"
              onClick={loadSampleData}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800/50' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Sample</span>
            </button>
            <button
              type="button" 
              onClick={handleClear} 
              disabled={!hasInput && conflicts.length === 0}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800/50' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            {conflicts.length > 0 && (
              <div className="flex items-center gap-1 border-l pl-2 ml-1 border-slate-700/40">
                <button
                  type="button"
                  onClick={handleCopyResults}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800/50' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800/50' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            )}
          </div>
          {lastRan && (
            <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
              <Clock className="h-3.5 w-3.5" />
              <span>Last run: <span className="font-mono text-emerald-400">{lastRan.date} {lastRan.time}</span></span>
              <span className="hidden sm:inline">by {lastRan.userEmail}</span>
            </div>
          )}
        </div>

        {/* ─── Sync Scroll Bar ────────────────────────────────────────────── */}
        {(stylesInput || asinsInput) && (
          <div className={`h-0.5 w-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-100"
              style={{ width: `${scrollPct}%` }}
            />
          </div>
        )}

        {/* ─── Editors ────────────────────────────────────────────────────── */}
        <div className={`border-b ${isDark ? 'border-slate-700/40' : 'border-gray-200'}`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isDark ? 'bg-slate-800/20' : 'bg-gray-50/50'}`}>
            <div className={`flex items-center justify-between border-b p-3 md:border-b-0 md:border-r ${
              isDark ? 'border-slate-700/40' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${strongText}`}>Style IDs</span>
                <span className={`text-xs ${mutedText}`}>one per line</span>
                {stylesLineCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {stylesLineCount}
                  </span>
                )}
              </div>
              {lineCountMismatch && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Mismatch
                </span>
              )}
            </div>
            <div className={`flex items-center justify-between p-3 ${
              isDark ? 'border-slate-700/40' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${strongText}`}>Parent ASINs</span>
                <span className={`text-xs ${mutedText}`}>one per line</span>
                {asinsLineCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {asinsLineCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Textareas ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className={`relative h-[28rem] overflow-auto border-b md:border-b-0 md:border-r ${
              isDark ? 'border-slate-700/40 bg-slate-950/50' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex min-h-full w-full">
                <LineGutter text={stylesInput} isDark={isDark} />
                <textarea
                  ref={stylesRef}
                  className={`flex-1 resize-none p-4 font-mono text-sm leading-[1.625rem] focus:outline-none overflow-hidden ${
                    isDark ? 'bg-transparent text-slate-200 placeholder-slate-600' : 'bg-transparent text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="Paste Style IDs..."
                  value={stylesInput}
                  onChange={e => setStylesInput(e.target.value)}
                  onScroll={() => syncScroll('styles')}
                  disabled={isChecking}
                  spellCheck={false}
                  style={{ height: '100%', minHeight: '400px' }}
                />
              </div>
            </div>

            <div className={`relative h-[28rem] overflow-auto ${isDark ? 'border-slate-700/40 bg-slate-950/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex min-h-full w-full">
                <LineGutter text={asinsInput} isDark={isDark} />
                <textarea
                  ref={asinsRef}
                  className={`flex-1 resize-none p-4 font-mono text-sm leading-[1.625rem] focus:outline-none overflow-hidden ${
                    isDark ? 'bg-transparent text-slate-200 placeholder-slate-600' : 'bg-transparent text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="Paste Parent ASINs..."
                  value={asinsInput}
                  onChange={e => setAsinsInput(e.target.value)}
                  onScroll={() => syncScroll('asins')}
                  disabled={isChecking}
                  spellCheck={false}
                  style={{ height: '100%', minHeight: '400px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Results Section ────────────────────────────────────────────── */}
        <div ref={resultsRef} className="flex-1 flex flex-col min-h-0">
          {/* Results Header */}
          <div className={`flex flex-col gap-2 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
            isDark ? 'border-slate-700/40 bg-slate-800/20' : 'border-gray-200 bg-gray-50/50'
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm font-medium ${strongText}`}>Results</span>
              {conflicts.length > 0 && (
                <>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {filteredConflicts.length} of {conflicts.length}
                  </span>
                  {stats && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`${mutedText}`}>
                        <span className={strongText}>{stats.validPairs}</span> pairs
                      </span>
                      <span className={`${mutedText}`}>
                        <span className={strongText}>{stats.uniqueStyles}</span> styles
                      </span>
                      {stats.ignoredRows > 0 && (
                        <span className="text-amber-400">
                          {stats.ignoredRows} ignored
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'table'
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="Table view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'cards'
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="Card view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${mutedText}`} />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search styles or ASINs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-32 rounded-lg border pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-48 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 ${
                      isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Severity filter */}
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
                className={`rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800/50 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </div>
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-auto" style={{ maxHeight: '400px' }}>
            {/* ─── Empty State ────────────────────────────────────────────── */}
            {conflicts.length === 0 && !lastRan && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-sm">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    isDark ? 'bg-slate-800/50' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-8 w-8 ${mutedText}`} />
                  </div>
                  <h3 className={`mt-4 text-lg font-semibold ${strongText}`}>Ready to check</h3>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    Paste your Style IDs and Parent ASINs, then click Run Analysis or press ⌘↵
                  </p>
                </div>
              </div>
            )}

            {/* ─── No Conflicts ───────────────────────────────────────────── */}
            {conflicts.length === 0 && lastRan && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'
                  }`}>
                    <CheckCircle className={`h-8 w-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <h3 className={`mt-4 text-lg font-semibold ${strongText}`}>No conflicts found</h3>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    All styles have unique parent ASINs. {stats?.validPairs} pairs analyzed.
                  </p>
                </div>
              </div>
            )}

            {/* ─── No matches ─────────────────────────────────────────────── */}
            {conflicts.length > 0 && filteredConflicts.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className={`mx-auto h-8 w-8 ${mutedText}`} />
                  <p className={`mt-3 font-medium ${strongText}`}>No matches found</p>
                  <p className={`mt-1 text-sm ${mutedText}`}>Try adjusting your search or filter criteria.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setSeverityFilter('all'); }}
                    className={`mt-3 text-sm text-emerald-400 hover:underline`}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            {/* ─── Results Table ───────────────────────────────────────────── */}
            {filteredConflicts.length > 0 && viewMode === 'table' && (
              <table className="w-full border-collapse text-sm">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <tr className={`border-b ${isDark ? 'border-slate-700/40' : 'border-gray-200'}`}>
                    <th className="w-8 px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredConflicts.length && filteredConflicts.length > 0}
                        onChange={() => {
                          if (selectedRows.size === filteredConflicts.length) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(filteredConflicts.map(c => c.style)));
                          }
                        }}
                        className={`rounded border ${isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-300'}`}
                      />
                    </th>
                    <th className="w-8 px-1 py-2 text-left"></th>
                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                      Style ID
                    </th>
                    <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                      Parent ASINs
                    </th>
                    <th className={`px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConflicts.map((conflict) => {
                    const severity = getSeverity(conflict.asins.length);
                    const isExpanded = expandedRows.has(conflict.style);
                    const isSelected = selectedRows.has(conflict.style);
                    return (
                      <tr key={conflict.style} className={`border-b ${isDark ? 'border-slate-700/30 hover:bg-slate-800/20' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(conflict.style)}
                            className={`rounded border ${isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-300'}`}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <button
                            type="button"
                            onClick={() => toggleRow(conflict.style)}
                            className={`rounded p-0.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className={`px-3 py-2 font-mono text-sm font-medium ${strongText}`}>
                          {conflict.style}
                        </td>
                        <td className="px-3 py-2">
                          {isExpanded ? (
                            <div className="flex flex-wrap gap-1.5">
                              {conflict.asins.map((asin) => (
                                <span
                                  key={`${conflict.style}-${asin}`}
                                  className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs ${
                                    isDark ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'
                                  }`}
                                >
                                  {asin}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${mutedText}`}>{conflict.asins.length} ASINs</span>
                              <div className="flex -space-x-1">
                                {conflict.asins.slice(0, 3).map((asin) => (
                                  <span
                                    key={`${conflict.style}-${asin}-preview`}
                                    className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                      isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-gray-200 bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {asin}
                                  </span>
                                ))}
                                {conflict.asins.length > 3 && (
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-gray-200 bg-gray-100 text-gray-600'
                                  }`}>
                                    +{conflict.asins.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <SeverityBadge count={conflict.asins.length} theme={theme} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ─── Results Cards ───────────────────────────────────────────── */}
            {filteredConflicts.length > 0 && viewMode === 'cards' && (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredConflicts.map((conflict) => {
                  const severity = getSeverity(conflict.asins.length);
                  const isExpanded = expandedRows.has(conflict.style);
                  return (
                    <div
                      key={conflict.style}
                      className={`rounded-xl border p-4 transition-all cursor-pointer ${
                        isDark ? 'border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40' : 'border-gray-200 bg-white/80 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleRow(conflict.style)}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`font-mono text-sm font-bold ${strongText}`}>{conflict.style}</span>
                        <SeverityBadge count={conflict.asins.length} theme={theme} />
                      </div>
                      <div className="mt-3">
                        <p className={`text-xs ${mutedText}`}>
                          {conflict.asins.length} parent ASIN{conflict.asins.length > 1 ? 's' : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(isExpanded ? conflict.asins : conflict.asins.slice(0, 3)).map((asin) => (
                            <span
                              key={`${conflict.style}-${asin}`}
                              className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs ${
                                isDark ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'
                              }`}
                            >
                              {asin}
                            </span>
                          ))}
                          {!isExpanded && conflict.asins.length > 3 && (
                            <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs ${
                              isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-gray-200 bg-gray-100 text-gray-600'
                            }`}>
                              +{conflict.asins.length - 3} more
                            </span>
                          )}
                        </div>
                        {!isExpanded && conflict.asins.length > 3 && (
                          <p className={`mt-1 text-[10px] ${mutedText}`}>Click to expand</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between text-xs ${mutedText}`}>
        <div className="flex items-center gap-4">
          <span>v2.0</span>
          {stats && (
            <span>
              Analyzed <span className={strongText}>{stats.validPairs}</span> pairs
              {stats.ignoredRows > 0 && ` · ${stats.ignoredRows} ignored`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Powered by LOT</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>Enterprise</span>
        </div>
      </div>
    </div>
  );
}