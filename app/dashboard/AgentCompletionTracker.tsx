'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Ban,
  User,
  Calendar,
  AlertTriangle,
  Info,
  Eye,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Task } from '../components/dashboard-utils';
import { processTasksFromSheet } from '../../lib/task-processing';
import { computeAllAgentsDailyCompletion, computeAgentDailyCompletion, DailyCompletionStats } from '../../lib/agent-completion';
import { cn, focusRing, Button, Card, EmptyState, LoadErrorState, StatusBadge, Modal, ModalHeader, ModalFooter } from '../components/ui/dashboard-ui-kit';

const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
const SHEET_NAME = 'Copy of Task Masterlist - Operations';

interface AgentCompletionTrackerProps {
  theme: 'light' | 'dark';
  currentUserEmail: string;
}

function toDateInputValue(d: Date) {
  return d.toISOString().split('T')[0];
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function AgentCompletionTracker({ theme, currentUserEmail }: AgentCompletionTrackerProps) {
  const isDark = theme === 'dark';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);

  const loadTasks = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
          viewAll: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const processed = processTasksFromSheet(data);
      setTasks(processed);
    } catch (e) {
      console.error('Failed to load tasks for completion tracker:', e);
      setLoadError(e instanceof Error ? e.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const targetDate = useMemo(() => parseDateInput(selectedDate), [selectedDate]);

  const allAgentNames = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((t) => {
      if (t.agent && t.agent.trim()) names.add(t.agent.trim());
    });
    return Array.from(names).sort();
  }, [tasks]);

  const dayStats: DailyCompletionStats[] = useMemo(() => {
    if (selectedAgent === 'all') return computeAllAgentsDailyCompletion(tasks, targetDate);
    const single = computeAgentDailyCompletion(tasks, targetDate, selectedAgent);
    return single.totalConsidered > 0 || single.excludedPendingCount > 0 || single.excludedCancelledCount > 0 ? [single] : [];
  }, [tasks, targetDate, selectedAgent]);

  const shiftDate = (days: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateInputValue(d));
  };

  const goToToday = () => setSelectedDate(toDateInputValue(new Date()));

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  const rateColor = (rate: number | null) => {
    if (rate === null) return isDark ? 'text-slate-400' : 'text-gray-400';
    if (rate >= 1) return isDark ? 'text-emerald-400' : 'text-emerald-600';
    if (rate >= 0.7) return isDark ? 'text-amber-400' : 'text-amber-600';
    return isDark ? 'text-rose-400' : 'text-rose-600';
  };

  const rateRingColor = (rate: number | null) => {
    if (rate === null) return isDark ? 'stroke-slate-700' : 'stroke-gray-200';
    if (rate >= 1) return 'stroke-emerald-500';
    if (rate >= 0.7) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  // Small progress ring for each agent card — gives an at-a-glance read on
  // completion rate without having to parse the fraction first.
  const CompletionRing = ({ rate }: { rate: number | null }) => {
    const pct = rate === null ? 0 : Math.min(1, rate);
    const r = 18;
    const c = 2 * Math.PI * r;
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0 -rotate-90">
        <circle cx="22" cy="22" r={r} strokeWidth="4" fill="none" className={isDark ? 'stroke-slate-700' : 'stroke-gray-200'} />
        <circle
          cx="22"
          cy="22"
          r={r}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className={cn('transition-all duration-500', rateRingColor(rate))}
          strokeDasharray={c}
          strokeDashoffset={c - pct * c}
        />
      </svg>
    );
  };

  // Task Detail Modal
  const TaskDetailModal = () => {
    if (!selectedTask) return null;

    const assignedDate = selectedTask.date_assigned ? new Date(selectedTask.date_assigned) : null;
    const completedDate = selectedTask.date_completed ? new Date(selectedTask.date_completed) : null;
    const isLate = assignedDate && completedDate && completedDate > assignedDate;

    return (
      <Modal isOpen={showTaskDetailModal} onClose={() => setShowTaskDetailModal(false)} theme={theme} maxWidth="max-w-2xl" labelledBy="agent-task-detail-title">
        <ModalHeader
          icon={isLate ? AlertTriangle : CheckCircle2}
          iconClassName={isLate ? (isDark ? 'bg-amber-500/20' : 'bg-amber-100') : undefined}
          title="Task Details"
          subtitle={
            <>
              #{selectedTask.rowIndex} · {selectedTask.task}
              {isLate && (
                <span className={cn('ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                  <AlertTriangle className="h-3 w-3" />
                  Completed Late
                </span>
              )}
            </>
          }
          onClose={() => setShowTaskDetailModal(false)}
          theme={theme}
          titleId="agent-task-detail-title"
        />

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Brand</label>
              <p className={cn('text-base sm:text-lg font-semibold', textClass)}>{selectedTask.brand}</p>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Type</label>
              <p className={cn('text-base sm:text-lg', textClass)}>{selectedTask.type}</p>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Agent</label>
              <p className={cn('text-base sm:text-lg', textClass)}>{selectedTask.agent || 'N/A'}</p>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Status</label>
              <div className="mt-1">
                <StatusBadge status={selectedTask.status} theme={theme} size="lg" />
              </div>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Date Assigned</label>
              <p className={cn('text-base sm:text-lg', textClass)}>
                {selectedTask.date_assigned ? new Date(selectedTask.date_assigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Due Date</label>
              <p className={cn('text-base sm:text-lg', textClass)}>
                {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Date Completed</label>
              <p className={cn('text-base sm:text-lg', textClass)}>
                {selectedTask.date_completed ? new Date(selectedTask.date_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>

          {isLate && (
            <div className={cn('rounded-lg border p-4', isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50')}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn('h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
                <div>
                  <p className={cn('font-semibold', isDark ? 'text-amber-400' : 'text-amber-700')}>Task Completed Late</p>
                  <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    This task was assigned on {new Date(selectedTask.date_assigned!).toLocaleDateString()} but completed on {new Date(selectedTask.date_completed!).toLocaleDateString()}.
                    {assignedDate && completedDate && (
                      <span className="block mt-1 text-xs font-medium">
                        ⏱️ Delay: {Math.ceil((completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24))} day(s)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedTask.remarks && (
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Remarks</label>
              <p className={cn('text-sm sm:text-base mt-1', textClass)}>{selectedTask.remarks}</p>
            </div>
          )}

          {selectedTask.reason_for_pending && (
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>Reason for Pending</label>
              <div className={cn('mt-1 sm:mt-2 rounded-lg border p-3 sm:p-4', isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50')}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Clock className={cn('h-4 w-4 sm:h-5 sm:w-5 mt-0.5', isDark ? 'text-amber-400' : 'text-amber-600')} />
                  <p className={cn('text-sm sm:text-base', textClass)}>{selectedTask.reason_for_pending}</p>
                </div>
              </div>
            </div>
          )}

          {selectedTask.bc_links && (
            <div>
              <label className={cn('text-xs sm:text-sm font-medium', mutedText)}>BC Links</label>
              <div className="mt-1 sm:mt-2 flex flex-wrap gap-2">
                {selectedTask.bc_links.split(',').map((link, index) => {
                  const trimmedLink = link.trim();
                  if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
                    return (
                      <a
                        key={index}
                        href={trimmedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn('inline-flex items-center gap-1.5 text-sm sm:text-base underline-offset-2 hover:underline transition-colors rounded', focusRing, isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Basecamp Link {index + 1}
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    );
                  }
                  return (
                    <span key={index} className={cn('text-sm sm:text-base', mutedText)}>
                      {trimmedLink}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ModalFooter theme={theme}>
          <Button theme={theme} variant="secondary" onClick={() => setShowTaskDetailModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn('border-b p-3 sm:p-5 flex-shrink-0', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={cn('text-xl sm:text-2xl font-bold tracking-tight', textClass)}>Daily Completion</h2>
              <p className={cn('text-xs sm:text-sm mt-0.5', mutedText)}>Completed vs. expected tasks per agent, based on Date Assigned</p>
            </div>

            <Button theme={theme} variant="outline" icon={RefreshCw} isLoading={isLoading} onClick={loadTasks} className="flex-shrink-0">
              Refresh
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                aria-label="Previous day"
                className={cn('rounded-lg p-2 border transition-colors', focusRing, isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-100')}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="relative">
                <Calendar className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none', mutedText)} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Selected date"
                  className={cn('rounded-lg border pl-9 pr-3 py-2 text-sm sm:text-base', focusRing, isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900')}
                />
              </div>
              <button
                onClick={() => shiftDate(1)}
                aria-label="Next day"
                className={cn('rounded-lg p-2 border transition-colors', focusRing, isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-100')}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <Button theme={theme} variant="secondary" size="md" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Agent filter */}
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none', mutedText)} />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                aria-label="Filter by agent"
                className={cn('w-full rounded-lg border pl-9 pr-3 py-2 text-sm sm:text-base', focusRing, isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900')}
              >
                <option value="all">All Agents</option>
                {allAgentNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {loadError ? (
          <LoadErrorState theme={theme} message={loadError} onRetry={loadTasks} />
        ) : isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={cn('h-8 w-8 animate-spin', mutedText)} />
          </div>
        ) : dayStats.length === 0 ? (
          <EmptyState
            theme={theme}
            icon={Calendar}
            title="No tasks assigned on this date"
            description={selectedAgent !== 'all' ? `for ${selectedAgent}` : 'Try a different day or agent.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {dayStats.map((s) => {
              const isExpanded = expandedAgent === s.agent;
              const hasLateTasks = s.tasks.completedLate.length > 0;

              return (
                <Card key={s.agent} theme={theme} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompletionRing rate={s.completionRate} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn('text-base sm:text-lg font-semibold truncate', textClass)}>{s.agent}</h3>
                          {hasLateTasks && (
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                              <AlertTriangle className="h-3 w-3" />
                              {s.tasks.completedLate.length} late
                            </span>
                          )}
                        </div>
                        <div className={cn('mt-0.5 text-xs sm:text-sm', mutedText)}>
                          {s.completionRate !== null ? `${Math.round(s.completionRate * 100)}% completion rate` : 'No expected tasks'}
                        </div>
                      </div>
                    </div>
                    <span className={cn('text-xl sm:text-2xl font-bold flex-shrink-0', rateColor(s.completionRate))}>
                      {s.completed}/{s.totalConsidered}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s.tasks.completedOnTime.length} on time
                    </span>
                    {s.tasks.completedLate.length > 0 && (
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                        <AlertTriangle className="h-3.5 w-3.5" /> {s.tasks.completedLate.length} late
                      </span>
                    )}
                    {s.ongoingNotCompleted > 0 && (
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700')}>
                        <Clock className="h-3.5 w-3.5" /> {s.ongoingNotCompleted} ongoing
                      </span>
                    )}
                    {(s.excludedPendingCount > 0 || s.excludedCancelledCount > 0) && (
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')}>
                        <Ban className="h-3.5 w-3.5" /> {s.excludedPendingCount + s.excludedCancelledCount} disregarded
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : s.agent)}
                    aria-expanded={isExpanded}
                    className={cn('mt-3 inline-flex items-center gap-1 text-xs sm:text-sm font-medium rounded', focusRing, isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? 'Hide details' : 'Show task list'}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
                      {s.tasks.completedOnTime.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTaskClick(t)}
                          className={cn('w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors', focusRing, isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-gray-700 hover:bg-gray-100')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {t.task} ({t.brand})
                          </span>
                          <span className={isDark ? 'text-emerald-400 text-[10px]' : 'text-emerald-600 text-[10px]'}>✓ On time</span>
                          <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </button>
                      ))}

                      {s.tasks.completedLate.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTaskClick(t)}
                          className={cn('w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors', focusRing, isDark ? 'text-amber-300 hover:bg-slate-700/50' : 'text-amber-700 hover:bg-gray-100')}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {t.task} ({t.brand})
                          </span>
                          <span className={isDark ? 'text-amber-400 text-[10px]' : 'text-amber-600 text-[10px]'}>
                            ⏱️ {t.date_completed ? Math.ceil((new Date(t.date_completed).getTime() - new Date(t.date_assigned).getTime()) / (1000 * 60 * 60 * 24)) : '?'}d late
                          </span>
                          <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </button>
                      ))}

                      {s.tasks.ongoingCounted.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTaskClick(t)}
                          className={cn('w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors', focusRing, isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-gray-700 hover:bg-gray-100')}
                        >
                          <Clock className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {t.task} ({t.brand})
                          </span>
                          <span className={cn('text-[10px]', mutedText)}>due {t.due_date || 'N/A'}</span>
                          <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </button>
                      ))}

                      {[...s.tasks.excludedPending, ...s.tasks.excludedCancelled].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTaskClick(t)}
                          className={cn('w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 opacity-60 transition-colors', focusRing, isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-gray-500 hover:bg-gray-100')}
                        >
                          <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {t.task} ({t.brand})
                          </span>
                          <span className="text-[10px]">{t.status}</span>
                          <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showTaskDetailModal && <TaskDetailModal />}
    </div>
  );
}