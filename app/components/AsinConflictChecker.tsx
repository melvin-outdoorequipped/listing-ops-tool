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

type FeedbackType = 'success' | 'error' | 'info';

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

// Line number gutter component
function LineGutter({ text, isDark }: { text: string; isDark: boolean }) {
  const lines = text ? splitLines(text) : [];
  const count = Math.max(lines.length, 20);

  return (
    <div
      className={`flex flex-col select-none px-2 py-4 text-right font-mono text-[11px] border-r shrink-0 ${
        isDark ? 'text-slate-700 bg-slate-900/40 border-slate-800' : 'text-gray-300 bg-gray-50 border-gray-200'
      }`}
      style={{ 
        minWidth: '3.5rem', 
        lineHeight: '1.625rem' 
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-[1.625rem]">{i + 1}</span>
      ))}
    </div>
  );
}

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

  // Get notification context
  const { createNotificationWithAgent } = useNotifications();

  const stylesRef = useRef<HTMLTextAreaElement>(null);
  const asinsRef = useRef<HTMLTextAreaElement>(null);
  const isDark = theme === 'dark';

  const stylesLineCount = useMemo(() => stylesInput.trim() ? splitLines(stylesInput).length : 0, [stylesInput]);
  const asinsLineCount = useMemo(() => asinsInput.trim() ? splitLines(asinsInput).length : 0, [asinsInput]);
  const hasInput = stylesInput.trim().length > 0 || asinsInput.trim().length > 0;
  const hasBothInputs = stylesInput.trim().length > 0 && asinsInput.trim().length > 0;
  const lineCountMismatch = stylesLineCount > 0 && asinsLineCount > 0 && stylesLineCount !== asinsLineCount;
  const maxAsins = conflicts.length > 0 ? Math.max(...conflicts.map(c => c.asins.length)) : 0;

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
        // Get user name from profile
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasBothInputs, isChecking]);

  const showFeedback = (type: FeedbackType, message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
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
    showFeedback('info', 'Sample data loaded.');
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
        // Get user name
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
      setLastRan({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        userEmail: currentUserEmail || 'System',
      });

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

      // 👇 Create notification for current user
      await createNotificationWithAgent(
        conflictCount > 0 ? '⚠️ ASIN Conflicts Found' : '✅ ASIN Check Complete',
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

      // 👇 Notify ALL users if critical conflicts found (3+)
      if (conflictCount >= 3) {
        await notifyAllUsers(
          `🚨 Critical: ${conflictCount} ASIN Conflicts Detected!`,
          `${currentUserName || currentUserEmail} found ${conflictCount} styles with multiple parent ASINs. Please review immediately.`,
          'error',
          { 
            url: '/tools/asin', 
            conflictCount, 
            detectedBy: currentUserEmail || currentUserName,
            severity: 'critical'
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
        conflictCount > 0 ? 'error' : 'success',
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
        
        // 👇 Create error notification for current user
        await createNotificationWithAgent(
          '❌ ASIN Check Failed',
          `Error: ${message}`,
          'error',
          undefined,
          currentUserName || currentUserEmail?.split('@')[0] || 'System',
          currentUserEmail || '',
          currentUserId || '',
          { toolName: 'asin_checker' }
        );

        // 👇 Notify ALL users about the error
        await notifyAllUsers(
          '❌ ASIN Check Failed',
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
  };

  const handleCopyResults = async () => {
    if (conflicts.length === 0) return;
    try {
      const headers = ['Style', ...Array.from({ length: maxAsins }, (_, i) => `Parent ASIN ${i + 1}`)];
      const rows = conflicts.map(c => [c.style, ...c.asins]);
      await navigator.clipboard.writeText([headers, ...rows].map(r => r.join('\t')).join('\n'));
      showFeedback('success', 'Results copied to clipboard.');
    } catch { 
      showFeedback('error', 'Unable to copy results.'); 
    }
  };

  const handleExportCSV = () => {
    if (conflicts.length === 0) return;
    const headers = ['Style', ...Array.from({ length: maxAsins }, (_, i) => `Parent ASIN ${i + 1}`)];
    const rows = conflicts.map(c => [c.style, ...c.asins]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `asin-conflicts-${new Date().toISOString().split('T')[0]}.csv`; 
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', 'CSV exported.');
  };

  // Severity badge
  const getSeverity = (asinCount: number) =>
    asinCount >= 4 ? { label: 'Critical', cls: isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-300' }
    : asinCount === 3 ? { label: 'High', cls: isDark ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-300' }
    : { label: 'Medium', cls: isDark ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-300' };

  const cardClass = isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/70 border-gray-300/60';
  const panelHeaderClass = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100/70 border-gray-300';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-600';
  const strongText = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className={`mb-1 break-words text-xl font-bold sm:text-2xl ${strongText}`}>
              Multiple Parent ASIN Checker
            </h2>
            <p className={`max-w-3xl text-sm leading-6 ${mutedText}`}>
              Identify styles that have multiple unique parent ASINs mapped to them.
            </p>
          </div>
          <div className="flex gap-2">
            <div className={`hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:flex ${
              isDark ? 'border-slate-700 bg-slate-800/50 text-slate-500' : 'border-gray-200 bg-gray-50 text-gray-400'
            }`}>
              <Keyboard className="h-3.5 w-3.5" />
              <kbd className="font-semibold">⌘↵</kbd>
              <span>to run</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(c => !c)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isDark ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/60' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
          </div>
        </div>

        {showHelp && (
          <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'border-emerald-500/20 bg-emerald-600/10' : 'border-emerald-300/60 bg-emerald-100/60'}`}>
            <h3 className={`mb-3 flex items-center gap-2 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <HelpCircle className="h-4 w-4" />
              How to use
            </h3>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              {[
                'Paste your Style IDs in the left column.',
                'Paste corresponding Parent ASINs in the right column.',
                'Each row represents one Style-ASIN pair.',
                'Press ⌘↵ or click Run Check to scan.',
                'Duplicate ASINs for the same style are ignored.',
                'Results are saved to activity logs for dashboard tracking.',
              ].map((tip, i) => (
                <div key={tip} className={`flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <span className="font-bold text-emerald-500">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-all ${
          feedback.type === 'success'
            ? isDark ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400' : 'border-emerald-300 bg-emerald-100 text-emerald-700'
            : feedback.type === 'error'
              ? isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'
              : isDark ? 'border-blue-500/30 bg-blue-600/10 text-blue-400' : 'border-blue-300 bg-blue-100 text-blue-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Main card */}
      <div className={`flex flex-1 flex-col overflow-hidden rounded-xl border ${cardClass}`}>
        {/* Action bar */}
        <div className={`flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between ${panelHeaderClass}`}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <button
              type="button"
              onClick={handleRun}
              disabled={!hasBothInputs || isChecking}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              {isChecking ? 'Checking...' : 'Run Check'}
            </button>
            <button
              type="button" onClick={handleClear} disabled={!hasInput && conflicts.length === 0}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                isDark ? 'border-red-600/30 bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <Trash2 className="h-4 w-4" />Clear All
            </button>
            {conflicts.length > 0 && (
              <>
                <button type="button" onClick={handleCopyResults} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${isDark ? 'border-blue-600/30 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                  <Copy className="h-4 w-4" />Copy
                </button>
                <button type="button" onClick={handleExportCSV} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${isDark ? 'border-purple-600/30 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30' : 'border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                  <Download className="h-4 w-4" />Export CSV
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between xl:justify-end">
            <button type="button" onClick={loadSampleData} className={`inline-flex items-center gap-2 text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'}`}>
              <FileText className="h-4 w-4" />Load Sample
            </button>
            {lastRan && (
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                Last run: <span className="font-mono text-cyan-500">{lastRan.date} {lastRan.time}</span>
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  by {lastRan.userEmail}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Sync scroll progress bar */}
        {(stylesInput || asinsInput) && (
          <div className={`h-0.5 w-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-100"
              style={{ width: `${scrollPct}%` }}
            />
          </div>
        )}

        {/* Mismatch warning */}
        {lineCountMismatch && (
          <div className={`border-b px-4 py-2 text-xs ${isDark ? 'border-yellow-500/20 bg-yellow-600/10 text-yellow-400' : 'border-yellow-300 bg-yellow-100 text-yellow-800'}`}>
            ⚠ Style rows ({stylesLineCount}) and ASIN rows ({asinsLineCount}) don't match — mismatched rows will be ignored.
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className={`grid grid-cols-2 gap-2 border-b p-4 sm:grid-cols-4 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
            <StatCard label="Total Rows" value={stats.totalRows} theme={theme} />
            <StatCard label="Valid Pairs" value={stats.validPairs} theme={theme} />
            <StatCard label="Unique Styles" value={stats.uniqueStyles} theme={theme} />
            <StatCard label="Ignored Rows" value={stats.ignoredRows} theme={theme} tone="warn" />
          </div>
        )}

        {/* Line count badges + input headers */}
        <div className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isDark ? 'bg-slate-800/30' : 'bg-gray-100/50'}`}>
            <div className={`flex items-center justify-between p-3 text-sm font-semibold md:border-r ${isDark ? 'border-slate-700 text-emerald-400' : 'border-gray-300 text-emerald-700'}`}>
              <span>📦 Style IDs <span className={`text-xs font-normal ${mutedText}`}>(one per line)</span></span>
              {stylesLineCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                  {stylesLineCount} rows
                </span>
              )}
            </div>
            <div className={`flex items-center justify-between p-3 text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <span>🔗 Parent ASINs <span className={`text-xs font-normal ${mutedText}`}>(one per line)</span></span>
              {asinsLineCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  lineCountMismatch
                    ? isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                    : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {asinsLineCount} rows
                </span>
              )}
            </div>
          </div>

          {/* Textareas with synced line gutters */}
          <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Style ID Column */}
          <div className={`relative h-[32rem] overflow-auto border-b md:border-b-0 md:border-r ${isDark ? 'border-slate-700 bg-slate-950' : 'border-gray-300 bg-white'}`}>
            <div className="flex min-h-full w-full">
              <LineGutter text={stylesInput} isDark={isDark} />
              <textarea
                ref={stylesRef}
                className={`flex-1 resize-none p-4 font-mono text-sm focus:outline-none overflow-hidden ${
                  isDark ? 'bg-transparent text-slate-200 placeholder-slate-600' : 'bg-transparent text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Style IDs..."
                value={stylesInput}
                onChange={e => setStylesInput(e.target.value)}
                disabled={isChecking}
                spellCheck={false}
                style={{ height: `${Math.max(splitLines(stylesInput).length, 20) * 1.625}rem`, lineHeight: '1.625rem' }}
              />
            </div>
          </div>

          {/* ASIN Column */}
          <div className={`relative h-[32rem] overflow-auto ${isDark ? 'border-slate-700 bg-slate-950' : 'border-gray-300 bg-white'}`}>
            <div className="flex min-h-full w-full">
              <LineGutter text={asinsInput} isDark={isDark} />
              <textarea
                ref={asinsRef}
                className={`flex-1 resize-none p-4 font-mono text-sm focus:outline-none overflow-hidden ${
                  isDark ? 'bg-transparent text-slate-200 placeholder-slate-600' : 'bg-transparent text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Parent ASINs..."
                value={asinsInput}
                onChange={e => setAsinsInput(e.target.value)}
                disabled={isChecking}
                spellCheck={false}
                style={{ height: `${Math.max(splitLines(asinsInput).length, 20) * 1.625}rem`, lineHeight: '1.625rem' }}
              />
            </div>
          </div>
        </div>
        </div>

        {/* Results - Fixed at bottom with scrollable container */}
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {/* Results Header */}
          <div className={`flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
            isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-300 bg-gray-100/50'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${strongText}`}>Results</span>
              {conflicts.length > 0 && (
                <>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-yellow-600/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'}`}>
                    {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-xs ${mutedText}`}>·</span>
                  <span className={`text-xs ${mutedText}`}>sorted A–Z</span>
                </>
              )}
            </div>
            {conflicts.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyResults}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <button
                  onClick={handleExportCSV}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {/* Fixed height scrollable container - ONLY table scrolls, no empty space */}
          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
            {conflicts.length === 0 && lastRan && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className={`mx-auto h-12 w-12 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className={`mt-3 font-medium ${strongText}`}>No conflicts found!</p>
                  <p className={`mt-1 text-sm ${mutedText}`}>All styles have unique parent ASINs.</p>
                </div>
              </div>
            )}
            
            {conflicts.length === 0 && !lastRan && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Upload className={`mx-auto h-12 w-12 ${mutedText}`} />
                  <p className={`mt-3 font-medium ${strongText}`}>Ready to check</p>
                  <p className={`mt-1 text-sm ${mutedText}`}>Click "Run Check" or press ⌘↵ to analyze your data.</p>
                </div>
              </div>
            )}
            
            {conflicts.length > 0 && (
              <table className="w-full border-collapse text-sm">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
                    <th className={`px-4 py-2 text-left text-xs font-semibold ${mutedText}`}>Style ID</th>
                    <th className={`px-4 py-2 text-left text-xs font-semibold ${mutedText}`}>Parent ASINs</th>
                    <th className={`px-4 py-2 text-center text-xs font-semibold ${mutedText}`}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((conflict) => {
                    const severity = getSeverity(conflict.asins.length);
                    return (
                      <tr key={conflict.style} className={`border-b ${isDark ? 'border-slate-700/50 hover:bg-slate-800/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`px-4 py-2 text-xs font-mono font-medium ${strongText}`}>
                          {conflict.style}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {conflict.asins.map((asin) => (
                              <span
                                key={`${conflict.style}-${asin}`}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                                  isDark ? 'border-red-600/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'
                                }`}
                              >
                                {asin}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${severity.cls}`}>
                            {severity.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, theme, tone = 'default' }: { label: string; value: number; theme: 'light' | 'dark'; tone?: 'warn' | 'default' }) {
  const isDark = theme === 'dark';
  const isWarn = tone === 'warn' && value > 0;
  return (
    <div className={`rounded-lg border p-3 ${isDark ? 'border-slate-700/60 bg-slate-800/30' : 'border-gray-200 bg-white/70'}`}>
      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${isWarn ? 'text-yellow-400' : isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}