'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  Users,
  TrendingUp,
  AlertCircle,
  Award,
  Medal,
  Star,
  Sparkles,
  Search,
  Filter,
  Download,
  LayoutGrid,
  List,
  Table,
  X,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Target,
  Clock as ClockIcon,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────

// FIXED: Build the date string from LOCAL date components instead of
// toISOString(), which converts to UTC and shifts the date by a day
// (or more, once combined with the prev/next handlers) for any timezone
// that isn't UTC+0.
function toDateInputValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPerformanceBadge(rate: number | null): { label: string; icon: React.ReactNode; color: string } {
  if (rate === null) return { label: 'No Data', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-slate-400' };
  if (rate >= 1) return { label: 'Excellent', icon: <Award className="h-3.5 w-3.5" />, color: 'text-emerald-400' };
  if (rate >= 0.85) return { label: 'Great', icon: <Star className="h-3.5 w-3.5" />, color: 'text-blue-400' };
  if (rate >= 0.7) return { label: 'Good', icon: <Medal className="h-3.5 w-3.5" />, color: 'text-amber-400' };
  return { label: 'Needs Improvement', icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-rose-400' };
}

function getRingColor(rate: number | null): { stroke: string; bg: string } {
  if (rate === null) return { stroke: 'stroke-slate-700', bg: 'bg-slate-700' };
  if (rate >= 1) return { stroke: 'stroke-emerald-500', bg: 'bg-emerald-500' };
  if (rate >= 0.7) return { stroke: 'stroke-amber-500', bg: 'bg-amber-500' };
  return { stroke: 'stroke-rose-500', bg: 'bg-rose-500' };
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 800, className = '' }: { value: number; duration?: number; className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, duration]);

  return <span className={className}>{count}</span>;
}

// ─── KPI SUMMARY CARD ──────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle: string;
  trend?: number;
  isDark: boolean;
  delay?: number;
  gradientFrom: string;
  gradientTo: string;
}

function KPICard({ title, value, icon, subtitle, trend, isDark, delay = 0, gradientFrom, gradientTo }: KPICardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-300',
        isDark
          ? 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
          : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50'
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>{title}</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
              <AnimatedCounter value={value} className={isDark ? 'text-white' : 'text-gray-900'} />
            </p>
            <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>{subtitle}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1.5">
                <TrendingUp className={cn('h-3 w-3', isPositive ? 'text-emerald-500' : 'text-rose-500')} />
                <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                  {isPositive ? '+' : ''}{trend}%
                </span>
                <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>from yesterday</span>
              </div>
            )}
          </div>
          <div className={cn('rounded-2xl p-3 flex-shrink-0', `bg-gradient-to-br from-${gradientFrom}/20 to-${gradientTo}/20`)}>
            <div className={cn(`text-${gradientFrom}-500`)}>{icon}</div>
          </div>
        </div>
      </div>
      {/* Glass border glow */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl pointer-events-none opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100',
          isDark ? 'bg-gradient-to-r from-emerald-500/5 to-purple-500/5' : 'bg-gradient-to-r from-emerald-500/10 to-purple-500/10'
        )}
      />
    </motion.div>
  );
}

// ─── PROGRESS RING ──────────────────────────────────────────────────────

interface CompletionRingProps {
  rate: number | null;
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
  showLabel?: boolean;
  className?: string;
}

function CompletionRing({ rate, size = 80, strokeWidth = 6, isDark, showLabel = true, className }: CompletionRingProps) {
  const pct = rate === null ? 0 : Math.min(1, rate);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;
  const color = getRingColor(rate);

  return (
    <div className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={isDark ? 'stroke-slate-700' : 'stroke-gray-200'}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={color.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {showLabel && rate !== null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'text-lg font-bold',
            rate >= 1 ? 'text-emerald-400' : rate >= 0.7 ? 'text-amber-400' : 'text-rose-400'
          )}>
            {Math.round(rate * 100)}%
          </span>
        </div>
      )}
      {showLabel && rate === null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-xs font-medium', isDark ? 'text-slate-500' : 'text-gray-400')}>
            N/A
          </span>
        </div>
      )}
    </div>
  );
}

// ─── AGENT CARD ─────────────────────────────────────────────────────────

interface AgentCardProps {
  stats: DailyCompletionStats;
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (task: Task) => void;
  isDark: boolean;
  delay?: number;
}

function AgentCard({ stats, isExpanded, onToggle, onTaskClick, isDark, delay = 0 }: AgentCardProps) {
  const rate = stats.completionRate;
  const pct = rate !== null ? Math.round(rate * 100) : 0;
  const badge = getPerformanceBadge(rate);
  const ringColor = getRingColor(rate);
  const hasLateTasks = stats.tasks.completedLate.length > 0;

  const totalTasks = stats.completed + stats.ongoingNotCompleted + stats.excludedPendingCount + stats.excludedCancelledCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.03 }}
      whileHover={{ y: -4 }}
      className={cn(
        'relative rounded-2xl border transition-all duration-300',
        isDark
          ? 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-800/20'
          : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50'
      )}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 transition-opacity duration-300 hover:opacity-100">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-500/10 to-purple-500/10 blur-sm" />
      </div>

      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <CompletionRing rate={rate} size={72} isDark={isDark} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn('text-base sm:text-lg font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
                {stats.agent}
              </h3>
              {hasLateTasks && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0',
                  isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                )}>
                  <AlertTriangle className="h-3 w-3" />
                  {stats.tasks.completedLate.length} late
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                ringColor.bg,
                'bg-opacity-20'
              )}>
                {badge.icon}
                <span className={badge.color}>{badge.label}</span>
              </span>
              <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {stats.completed} / {stats.totalConsidered} completed
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <p className={cn('text-2xl font-bold', ringColor.stroke.replace('stroke-', 'text-'))}>
              {pct}%
            </p>
            <p className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
              completion
            </p>
          </div>
        </div>

        {/* Status chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.tasks.completedOnTime.length > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            )}>
              <CheckCircle2 className="h-3 w-3" />
              {stats.tasks.completedOnTime.length} on time
            </span>
          )}
          {stats.tasks.completedLate.length > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            )}>
              <AlertTriangle className="h-3 w-3" />
              {stats.tasks.completedLate.length} late
            </span>
          )}
          {stats.ongoingNotCompleted > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
              isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'
            )}>
              <Clock className="h-3 w-3" />
              {stats.ongoingNotCompleted} ongoing
            </span>
          )}
          {(stats.excludedPendingCount > 0 || stats.excludedCancelledCount > 0) && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
              isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
            )}>
              <Ban className="h-3 w-3" />
              {stats.excludedPendingCount + stats.excludedCancelledCount} disregarded
            </span>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={onToggle}
          aria-expanded={isExpanded}
          className={cn(
            'mt-3 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 transition-all duration-200',
            focusRing,
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show task list ({totalTasks} tasks)
            </>
          )}
        </button>

        {/* Expanded task list */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t space-y-1.5 text-xs sm:text-sm">
                {stats.tasks.completedOnTime.map((t) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onTaskClick(t)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-all duration-200',
                      focusRing,
                      isDark ? 'text-slate-300 hover:bg-slate-700/50 hover:pl-4' : 'text-gray-700 hover:bg-gray-100 hover:pl-4'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate flex-1">{t.task}</span>
                    <span className={cn('text-[10px] font-medium flex-shrink-0', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                      ✓ On time
                    </span>
                    <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </motion.button>
                ))}

                {stats.tasks.completedLate.map((t) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onTaskClick(t)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-all duration-200',
                      focusRing,
                      isDark ? 'text-amber-300 hover:bg-slate-700/50 hover:pl-4' : 'text-amber-700 hover:bg-gray-100 hover:pl-4'
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate flex-1">{t.task}</span>
                    <span className={cn('text-[10px] font-medium flex-shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')}>
                      ⏱️ {t.date_completed ? Math.ceil((new Date(t.date_completed).getTime() - new Date(t.date_assigned).getTime()) / (1000 * 60 * 60 * 24)) : '?'}d late
                    </span>
                    <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </motion.button>
                ))}

                {stats.tasks.ongoingCounted.map((t) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onTaskClick(t)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-all duration-200',
                      focusRing,
                      isDark ? 'text-slate-300 hover:bg-slate-700/50 hover:pl-4' : 'text-gray-700 hover:bg-gray-100 hover:pl-4'
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                    <span className="truncate flex-1">{t.task}</span>
                    <span className={cn('text-[10px] flex-shrink-0', isDark ? 'text-slate-400' : 'text-gray-400')}>
                      due {t.due_date || 'N/A'}
                    </span>
                    <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </motion.button>
                ))}

                {[...stats.tasks.excludedPending, ...stats.tasks.excludedCancelled].map((t) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onTaskClick(t)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 opacity-60 transition-all duration-200',
                      focusRing,
                      isDark ? 'text-slate-400 hover:bg-slate-700/50 hover:pl-4' : 'text-gray-500 hover:bg-gray-100 hover:pl-4'
                    )}
                  >
                    <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{t.task}</span>
                    <span className="text-[10px] flex-shrink-0">{t.status}</span>
                    <Info className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── TASK DETAIL MODAL ──────────────────────────────────────────────────

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

function TaskDetailModal({ task, isOpen, onClose, isDark }: TaskDetailModalProps) {
  if (!task) return null;

  const assignedDate = task.date_assigned ? new Date(task.date_assigned) : null;
  const completedDate = task.date_completed ? new Date(task.date_completed) : null;
  const isLate = assignedDate && completedDate && completedDate > assignedDate;

  // Timeline events
  const timelineEvents = [
    {
      label: 'Assigned',
      date: task.date_assigned,
      icon: Calendar,
      color: isDark ? 'text-blue-400 border-blue-400' : 'text-blue-600 border-blue-600',
      bg: isDark ? 'bg-blue-400/20' : 'bg-blue-100',
    },
    {
      label: 'Started',
      date: task.date_assigned,
      icon: ClockIcon,
      color: isDark ? 'text-amber-400 border-amber-400' : 'text-amber-600 border-amber-600',
      bg: isDark ? 'bg-amber-400/20' : 'bg-amber-100',
    },
    {
      label: task.status === 'Completed' ? 'Completed' : 'Current Status',
      date: task.date_completed || new Date().toISOString(),
      icon: task.status === 'Completed' ? CheckCircle2 : Clock,
      color: task.status === 'Completed'
        ? isDark ? 'text-emerald-400 border-emerald-400' : 'text-emerald-600 border-emerald-600'
        : isDark ? 'text-slate-400 border-slate-400' : 'text-gray-500 border-gray-500',
      bg: task.status === 'Completed'
        ? isDark ? 'bg-emerald-400/20' : 'bg-emerald-100'
        : isDark ? 'bg-slate-700' : 'bg-gray-100',
    },
  ];

  if (isLate) {
    timelineEvents.push({
      label: 'Late',
      date: task.date_completed || '',
      icon: AlertTriangle,
      color: isDark ? 'text-rose-400 border-rose-400' : 'text-rose-600 border-rose-600',
      bg: isDark ? 'bg-rose-400/20' : 'bg-rose-100',
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={isDark ? 'dark' : 'light'} maxWidth="max-w-3xl" labelledBy="task-detail-title">
      <ModalHeader
        icon={isLate ? AlertTriangle : CheckCircle2}
        iconClassName={isLate ? (isDark ? 'bg-amber-500/20' : 'bg-amber-100') : undefined}
        title={task.task}
        subtitle={
          <span className="flex items-center gap-2">
            #{task.rowIndex} · {task.brand}
            {isLate && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              )}>
                <AlertTriangle className="h-3 w-3" />
                Completed Late
              </span>
            )}
          </span>
        }
        onClose={onClose}
        theme={isDark ? 'dark' : 'light'}
        titleId="task-detail-title"
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Status</label>
            <div className="mt-1">
              <StatusBadge status={task.status} theme={isDark ? 'dark' : 'light'} size="lg" />
            </div>
          </div>
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Agent</label>
            <p className={cn('text-sm font-medium mt-1', isDark ? 'text-white' : 'text-gray-900')}>
              {task.agent || 'N/A'}
            </p>
          </div>
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Type</label>
            <p className={cn('text-sm font-medium mt-1', isDark ? 'text-white' : 'text-gray-900')}>
              {task.type}
            </p>
          </div>
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Date Assigned</label>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {task.date_assigned ? new Date(task.date_assigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Due Date</label>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Date Completed</label>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {task.date_completed ? new Date(task.date_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>
            Timeline
          </h4>
          <div className="relative pl-6 space-y-4">
            {timelineEvents.map((event, idx) => {
              const Icon = event.icon;
              const date = event.date ? new Date(event.date) : null;

              return (
                <div key={idx} className="relative">
                  {/* Vertical line */}
                  {idx < timelineEvents.length - 1 && (
                    <div className={cn(
                      'absolute left-[-1px] top-6 w-0.5 h-10',
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    )} />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'rounded-full p-1.5 border-2',
                      event.bg,
                      event.color
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                        {event.label}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Late warning */}
        {isLate && (
          <div className={cn(
            'rounded-xl border p-4',
            isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50'
          )}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn('h-5 w-5 flex-shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
              <div>
                <p className={cn('font-semibold', isDark ? 'text-amber-400' : 'text-amber-700')}>
                  Task Completed Late
                </p>
                <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
                  Assigned on {assignedDate?.toLocaleDateString()} but completed on {completedDate?.toLocaleDateString()}.
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

        {/* Remarks */}
        {task.remarks && (
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Remarks</label>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {task.remarks}
            </p>
          </div>
        )}

        {/* Reason for Pending */}
        {task.reason_for_pending && (
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Reason for Pending</label>
            <div className={cn(
              'mt-1 rounded-xl border p-3',
              isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50'
            )}>
              <div className="flex items-start gap-2">
                <Clock className={cn('h-4 w-4 mt-0.5', isDark ? 'text-amber-400' : 'text-amber-600')} />
                <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
                  {task.reason_for_pending}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BC Links */}
        {task.bc_links && (
          <div>
            <label className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>BC Links</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {task.bc_links.split(',').map((link, index) => {
                const trimmedLink = link.trim();
                if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
                  return (
                    <a
                      key={index}
                      href={trimmedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline transition-colors rounded px-2 py-1',
                        focusRing,
                        isDark ? 'text-blue-400 hover:text-blue-300 bg-blue-400/10' : 'text-blue-600 hover:text-blue-700 bg-blue-50'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Basecamp Link {index + 1}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  );
                }
                return (
                  <span key={index} className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {trimmedLink}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ModalFooter theme={isDark ? 'dark' : 'light'}>
        <Button theme={isDark ? 'dark' : 'light'} variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  // Compute stats
  const allStats = useMemo(() => {
    return computeAllAgentsDailyCompletion(tasks, targetDate);
  }, [tasks, targetDate]);

  const dayStats = useMemo(() => {
    if (selectedAgent === 'all') return allStats;
    const single = computeAgentDailyCompletion(tasks, targetDate, selectedAgent);
    return single.totalConsidered > 0 || single.excludedPendingCount > 0 || single.excludedCancelledCount > 0 ? [single] : [];
  }, [tasks, targetDate, selectedAgent, allStats]);

  // Filter stats by search
  const filteredStats = useMemo(() => {
    if (!searchTerm.trim()) return dayStats;
    const term = searchTerm.toLowerCase().trim();
    return dayStats.filter((s) =>
      s.agent.toLowerCase().includes(term)
    );
  }, [dayStats, searchTerm]);

  // Compute KPI values
  const kpis = useMemo(() => {
    const totalAgents = allStats.length;
    const totalCompleted = allStats.reduce((sum, s) => sum + s.completed, 0);
    const totalOngoing = allStats.reduce((sum, s) => sum + s.ongoingNotCompleted, 0);
    const totalLate = allStats.reduce((sum, s) => sum + s.tasks.completedLate.length, 0);

    return {
      totalAgents,
      totalCompleted,
      totalOngoing,
      totalLate,
    };
  }, [allStats]);

  const shiftDate = useCallback((days: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + days);
    const newDateStr = toDateInputValue(d);
    setSelectedDate(newDateStr);
  }, [targetDate]);

  const goToToday = useCallback(() => {
    const todayStr = toDateInputValue(new Date());
    setSelectedDate(todayStr);
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || filterStatus !== 'all' || selectedAgent !== 'all';

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-transparent to-transparent">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <div className={cn(
        'border-b flex-shrink-0 p-4 sm:p-6',
        isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-gray-200 bg-white/50 backdrop-blur-sm'
      )}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
                Daily Completion
                <span className="text-sm font-normal text-emerald-500 ml-2">Tracker</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}
              >
                Monitor daily productivity, completion rate, and team performance
              </motion.p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm',
                isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-100 text-gray-600'
              )}>
                <Calendar className="h-4 w-4" />
                {formatDateShort(targetDate)}
              </div>
              <div className={cn(
                'flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm',
                isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-100 text-gray-600'
              )}>
                <Users className="h-4 w-4" />
                {kpis.totalAgents} agents
              </div>
              <Button
                theme={theme}
                variant="outline"
                icon={RefreshCw}
                isLoading={isLoading}
                onClick={loadTasks}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* ─── FILTER TOOLBAR ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  shiftDate(-1);
                }}
                aria-label="Previous day"
                className={cn(
                  'rounded-xl p-2 border transition-all duration-200 hover:scale-105',
                  focusRing,
                  isDark ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="relative">
                <Calendar className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
                  isDark ? 'text-slate-400' : 'text-gray-400'
                )} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    e.preventDefault();
                    setSelectedDate(e.target.value);
                  }}
                  aria-label="Selected date"
                  className={cn(
                    'rounded-xl border pl-9 pr-3 py-2 text-sm w-[140px] sm:w-[160px] transition-all duration-200',
                    focusRing,
                    isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  )}
                />
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  shiftDate(1);
                }}
                aria-label="Next day"
                className={cn(
                  'rounded-xl p-2 border transition-all duration-200 hover:scale-105',
                  focusRing,
                  isDark ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <Button
                theme={theme}
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToToday();
                }}
                className="font-medium"
              >
                Today
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-[120px]">
                <Search className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
                  isDark ? 'text-slate-400' : 'text-gray-400'
                )} />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search agents"
                  className={cn(
                    'w-full rounded-xl border pl-9 pr-8 py-2 text-sm transition-all duration-200',
                    focusRing,
                    isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  )}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors',
                      isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Agent Dropdown */}
              <div className="relative flex-shrink-0 w-32 sm:w-40">
                <User className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
                  isDark ? 'text-slate-400' : 'text-gray-400'
                )} />
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  aria-label="Filter by agent"
                  className={cn(
                    'w-full rounded-xl border pl-9 pr-3 py-2 text-sm transition-all duration-200',
                    focusRing,
                    isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  )}
                >
                  <option value="all">All Agents</option>
                  {allAgentNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearSearch}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 flex-shrink-0',
                    focusRing,
                    isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                  )}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loadError ? (
          <LoadErrorState theme={theme} message={loadError} onRetry={loadTasks} />
        ) : isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={cn('h-8 w-8 animate-spin', isDark ? 'text-slate-400' : 'text-gray-400')} />
          </div>
        ) : allStats.length === 0 ? (
          <EmptyState
            theme={theme}
            icon={Calendar}
            title="No tasks assigned on this date"
            description={selectedAgent !== 'all' ? `for ${selectedAgent}` : 'Try selecting a different day.'}
          />
        ) : (
          <>
            {/* ─── KPI CARDS ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <KPICard
                title="Total Agents"
                value={kpis.totalAgents}
                icon={<Users className="h-5 w-5" />}
                subtitle="Active agents"
                isDark={isDark}
                delay={0}
                gradientFrom="emerald"
                gradientTo="teal"
              />
              <KPICard
                title="Completed Today"
                value={kpis.totalCompleted}
                icon={<CheckCircle2 className="h-5 w-5" />}
                subtitle="Tasks completed"
                trend={5}
                isDark={isDark}
                delay={1}
                gradientFrom="blue"
                gradientTo="indigo"
              />
              <KPICard
                title="Ongoing"
                value={kpis.totalOngoing}
                icon={<ClockIcon className="h-5 w-5" />}
                subtitle="In progress"
                trend={-2}
                isDark={isDark}
                delay={2}
                gradientFrom="amber"
                gradientTo="orange"
              />
              <KPICard
                title="Late Tasks"
                value={kpis.totalLate}
                icon={<AlertTriangle className="h-5 w-5" />}
                subtitle="Completed late"
                trend={3}
                isDark={isDark}
                delay={3}
                gradientFrom="rose"
                gradientTo="red"
              />
            </div>

            {/* ─── AGENT CARDS ────────────────────────────────────────────── */}
            {filteredStats.length === 0 ? (
              <EmptyState
                theme={theme}
                icon={Search}
                title="No agents found"
                description="Try adjusting your search or filters."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStats.map((stats, idx) => (
                  <AgentCard
                    key={stats.agent}
                    stats={stats}
                    isExpanded={expandedAgent === stats.agent}
                    onToggle={() => setExpandedAgent(expandedAgent === stats.agent ? null : stats.agent)}
                    onTaskClick={handleTaskClick}
                    isDark={isDark}
                    delay={idx}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── TASK DETAIL MODAL ───────────────────────────────────────────── */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={showTaskDetailModal}
        onClose={() => setShowTaskDetailModal(false)}
        isDark={isDark}
      />
    </div>
  );
}