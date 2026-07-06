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
  X, // ADD THIS
  MessageSquare, // ADD THIS
  ArrowRight,
} from 'lucide-react';
import { Task } from '../components/dashboard-utils';
import { processTasksFromSheet } from '../../lib/task-processing';
import {
  computeAllAgentsDailyCompletion,
  computeAgentDailyCompletion,
  DailyCompletionStats,
} from '../../lib/agent-completion';

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
  const [selectedAgent, setSelectedAgent] = useState<string>('all'); // 'all' or a specific agent name
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

  // All agents who have ever been assigned a task, for the dropdown (not just this day's agents)
  const allAgentNames = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(t => {
      if (t.agent && t.agent.trim()) names.add(t.agent.trim());
    });
    return Array.from(names).sort();
  }, [tasks]);

  const dayStats: DailyCompletionStats[] = useMemo(() => {
    if (selectedAgent === 'all') {
      return computeAllAgentsDailyCompletion(tasks, targetDate);
    }
    const single = computeAgentDailyCompletion(tasks, targetDate, selectedAgent);
    // Only show a card if there's actually something (assigned or considered) that day
    return single.totalConsidered > 0 || single.excludedPendingCount > 0 || single.excludedCancelledCount > 0
      ? [single]
      : [];
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

  const cardClass = isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  const rateColor = (rate: number | null) => {
    if (rate === null) return isDark ? 'text-slate-400' : 'text-gray-400';
    if (rate >= 1) return isDark ? 'text-emerald-400' : 'text-emerald-600';
    if (rate >= 0.7) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  // Task Detail Modal
  const TaskDetailModal = () => {
    if (!selectedTask) return null;

    const assignedDate = selectedTask.date_assigned ? new Date(selectedTask.date_assigned) : null;
    const completedDate = selectedTask.date_completed ? new Date(selectedTask.date_completed) : null;
    const isLate = assignedDate && completedDate && completedDate > assignedDate;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowTaskDetailModal(false)}>
        <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        }`} onClick={(e) => e.stopPropagation()}>
          <div className={`sticky top-0 z-10 flex items-center justify-between border-b p-4 sm:p-5 ${
            isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'
          } backdrop-blur`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${isLate ? 'bg-yellow-500/20' : 'bg-emerald-500/20'}`}>
                {isLate ? <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" /> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
              </div>
              <div>
                <h3 className={`text-lg sm:text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Task Details
                </h3>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  #{selectedTask.rowIndex} · {selectedTask.task}
                  {isLate && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                      Completed Late
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTaskDetailModal(false)}
              className={`rounded-lg p-1.5 sm:p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
            >
              <X className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Brand</label>
                <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.brand}</p>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Type</label>
                <p className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.type}</p>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Agent</label>
                <p className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.agent || 'N/A'}</p>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Status</label>
                <span className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-medium ${
                  selectedTask.status === 'Completed' ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                  selectedTask.status === 'Ongoing' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') :
                  selectedTask.status === 'Pending' ? (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                  selectedTask.status === 'Cancelled' ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700') :
                  (isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700')
                }`}>
                  <span className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${
                    selectedTask.status === 'Completed' ? 'bg-emerald-400' :
                    selectedTask.status === 'Ongoing' ? 'bg-blue-400' :
                    selectedTask.status === 'Pending' ? 'bg-yellow-400' :
                    selectedTask.status === 'Cancelled' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`} />
                  {selectedTask.status}
                </span>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Date Assigned</label>
                <p className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTask.date_assigned ? new Date(selectedTask.date_assigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Due Date</label>
                <p className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Date Completed</label>
                <p className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTask.date_completed ? new Date(selectedTask.date_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Late Completion Warning */}
            {isLate && (
              <div className={`rounded-lg border p-4 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-yellow-300 bg-yellow-50'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Task Completed Late</p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      This task was assigned on {new Date(selectedTask.date_assigned!).toLocaleDateString()} 
                      but completed on {new Date(selectedTask.date_completed!).toLocaleDateString()}.
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
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Remarks</label>
                <p className={`text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>{selectedTask.remarks}</p>
              </div>
            )}

            {selectedTask.reason_for_pending && (
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Reason for Pending</label>
                <div className={`mt-1 sm:mt-2 rounded-lg border p-3 sm:p-4 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-yellow-300 bg-yellow-50'}`}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Clock className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <p className={`text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.reason_for_pending}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedTask.bc_links && (
              <div>
                <label className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>BC Links</label>
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
                          className={`inline-flex items-center gap-1.5 text-sm sm:text-base text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline transition-colors ${
                            isDark ? 'hover:text-blue-300' : 'hover:text-blue-600'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Basecamp Link {index + 1}
                          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </a>
                      );
                    }
                    return (
                      <span key={index} className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {trimmedLink}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={`border-t p-4 sm:p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end`}>
            <button
              onClick={() => setShowTaskDetailModal(false)}
              className={`rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-all ${
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className={`border-b p-3 sm:p-5 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold ${textClass}`}>Daily Completion</h2>
              <p className={`text-xs sm:text-sm ${mutedText} mt-0.5`}>
                Completed vs. expected tasks per agent, based on Date Assigned
              </p>
            </div>

            <button
              onClick={loadTasks}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium flex-shrink-0 ${
                isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)} className={`rounded-lg p-2 ${isDark ? 'hover:bg-slate-700 border border-slate-700' : 'hover:bg-gray-100 border border-gray-200'}`}>
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${mutedText} pointer-events-none`} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`rounded-lg border pl-9 pr-3 py-2 text-sm sm:text-base ${
                    isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button onClick={() => shiftDate(1)} className={`rounded-lg p-2 ${isDark ? 'hover:bg-slate-700 border border-slate-700' : 'hover:bg-gray-100 border border-gray-200'}`}>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={goToToday}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
            </div>

            {/* Agent filter */}
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${mutedText} pointer-events-none`} />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm sm:text-base ${
                  isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Agents</option>
                {allAgentNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {loadError && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
            {loadError}
          </div>
        )}

        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${mutedText}`} />
          </div>
        ) : dayStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className={`text-lg font-medium ${textClass}`}>No tasks assigned on this date</p>
            {selectedAgent !== 'all' && (
              <p className={`mt-1 text-sm ${mutedText}`}>for {selectedAgent}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {dayStats.map((s) => {
              const isExpanded = expandedAgent === s.agent;
              const hasLateTasks = s.tasks.completedLate.length > 0;
              
              return (
                <div key={s.agent} className={`rounded-xl border p-4 sm:p-5 ${cardClass}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base sm:text-lg font-semibold ${textClass}`}>{s.agent}</h3>
                      {hasLateTasks && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
                          <AlertTriangle className="h-3 w-3" />
                          {s.tasks.completedLate.length} late
                        </span>
                      )}
                    </div>
                    <span className={`text-xl sm:text-2xl font-bold ${rateColor(s.completionRate)}`}>
                      {s.completed}/{s.totalConsidered}
                    </span>
                  </div>

                  <div className={`mt-1 text-xs sm:text-sm ${mutedText}`}>
                    {s.completionRate !== null
                      ? `${Math.round(s.completionRate * 100)}% completion rate`
                      : 'No expected tasks'}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s.tasks.completedOnTime.length} on time
                    </span>
                    {s.tasks.completedLate.length > 0 && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                        <AlertTriangle className="h-3.5 w-3.5" /> {s.tasks.completedLate.length} late
                      </span>
                    )}
                    {s.ongoingNotCompleted > 0 && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>
                        <Clock className="h-3.5 w-3.5" /> {s.ongoingNotCompleted} ongoing
                      </span>
                    )}
                    {(s.excludedPendingCount > 0 || s.excludedCancelledCount > 0) && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                        <Ban className="h-3.5 w-3.5" /> {s.excludedPendingCount + s.excludedCancelledCount} disregarded
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : s.agent)}
                    className={`mt-3 inline-flex items-center gap-1 text-xs sm:text-sm font-medium ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? 'Hide details' : 'Show task list'}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-xs sm:text-sm">
                      {/* On Time Tasks */}
                      {s.tasks.completedOnTime.map(t => (
                        <div 
                          key={t.id} 
                          className={`flex items-center gap-2 cursor-pointer hover:opacity-80 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                          onClick={() => handleTaskClick(t)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate flex-1">{t.task} ({t.brand})</span>
                          <span className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>✓ On time</span>
                          <button className="p-1 hover:bg-slate-700/50 rounded">
                            <Info className="h-3 w-3 opacity-50" />
                          </button>
                        </div>
                      ))}

                      {/* Late Tasks */}
                      {s.tasks.completedLate.map(t => (
                        <div 
                          key={t.id} 
                          className={`flex items-center gap-2 cursor-pointer hover:opacity-80 ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}
                          onClick={() => handleTaskClick(t)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="truncate flex-1">{t.task} ({t.brand})</span>
                          <span className={`text-[10px] ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            ⏱️ {t.date_completed ? Math.ceil((new Date(t.date_completed).getTime() - new Date(t.date_assigned).getTime()) / (1000 * 60 * 60 * 24)) : '?'}d late
                          </span>
                          <button className="p-1 hover:bg-slate-700/50 rounded">
                            <Info className="h-3 w-3 opacity-50" />
                          </button>
                        </div>
                      ))}

                      {/* Ongoing Tasks */}
                      {s.tasks.ongoingCounted.map(t => (
                        <div 
                          key={t.id} 
                          className={`flex items-center gap-2 cursor-pointer hover:opacity-80 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                          onClick={() => handleTaskClick(t)}
                        >
                          <Clock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                          <span className="truncate flex-1">{t.task} ({t.brand})</span>
                          <span className={`text-[10px] ${mutedText}`}>due {t.due_date || 'N/A'}</span>
                          <button className="p-1 hover:bg-slate-700/50 rounded">
                            <Info className="h-3 w-3 opacity-50" />
                          </button>
                        </div>
                      ))}

                      {/* Disregarded Tasks */}
                      {[...s.tasks.excludedPending, ...s.tasks.excludedCancelled].map(t => (
                        <div 
                          key={t.id} 
                          className={`flex items-center gap-2 opacity-60 cursor-pointer hover:opacity-80 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                          onClick={() => handleTaskClick(t)}
                        >
                          <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate flex-1">{t.task} ({t.brand})</span>
                          <span className={`text-[10px] ${mutedText}`}>{t.status}</span>
                          <button className="p-1 hover:bg-slate-700/50 rounded">
                            <Info className="h-3 w-3 opacity-50" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {showTaskDetailModal && <TaskDetailModal />}
    </div>
  );
}