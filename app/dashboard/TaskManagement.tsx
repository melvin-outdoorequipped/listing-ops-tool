'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table,
  X,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
  Info,
  ArrowRight,
  Copy,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Download,
  Printer,
  Maximize2,
  Minus,
  GripVertical,
  ChevronsUpDown,
  ExternalLink,
  Link,
  Hash,
  Tag,
  Briefcase,
  Users,
  Zap,
  Clock as ClockIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskViewMode, getStatusColor, formatDate } from '../components/dashboard-utils';
import { VALID_TASK_STATUSES, isTaskAdminEmail, AGENT_OPTIONS, BRAND_OPTIONS, TYPE_OPTIONS, TASK_OPTIONS } from '../../lib/task-option';
import {
  findCategoryByTaskName,
  generateTaskName,
  pushRecentTaskName,
  loadRecentTaskNames,
  RecentTaskName,
  TD_TASK_CATEGORIES
} from '../../lib/td-task-names';
import AgentCompletionTracker from './AgentCompletionTracker';
import {
  cn,
  focusRing,
  Button,
  StatusBadge,
  Card,
  EmptyState,
  NoResultsState,
  TableSkeleton,
  CardSkeleton,
  FieldLabel,
  inputClasses,
  Modal,
  ModalHeader,
  ModalFooter,
} from '../components/ui/dashboard-ui-kit';

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const TOAST_STYLES: Record<ToastType, { light: string; dark: string; bar: string; Icon: typeof CheckCircle2 }> = {
  success: {
    light: 'border-emerald-200 bg-white text-emerald-700',
    dark: 'border-emerald-500/30 bg-slate-800 text-emerald-400',
    bar: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  error: {
    light: 'border-rose-200 bg-white text-rose-700',
    dark: 'border-rose-500/30 bg-slate-800 text-rose-400',
    bar: 'bg-rose-500',
    Icon: AlertCircle,
  },
  warning: {
    light: 'border-amber-200 bg-white text-amber-700',
    dark: 'border-amber-500/30 bg-slate-800 text-amber-400',
    bar: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    light: 'border-blue-200 bg-white text-blue-700',
    dark: 'border-blue-500/30 bg-slate-800 text-blue-400',
    bar: 'bg-blue-500',
    Icon: Info,
  },
};

function ToastContainer({
  messages,
  onRemove,
  theme,
}: {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';

  useEffect(() => {
    messages.forEach((msg) => {
      const duration = msg.duration || 4000;
      const timer = setTimeout(() => onRemove(msg.id), duration);
      return () => clearTimeout(timer);
    });
  }, [messages, onRemove]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-md w-full" role="status" aria-live="polite">
      {messages.map((msg) => {
        const style = TOAST_STYLES[msg.type];
        const Icon = style.Icon;
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={cn(
              'relative overflow-hidden flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-sm',
              isDark ? style.dark : style.light
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{msg.title}</p>
              {msg.message && <p className={cn('text-sm mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')}>{msg.message}</p>}
            </div>
            <button
              onClick={() => onRemove(msg.id)}
              aria-label="Dismiss notification"
              className={cn('flex-shrink-0 rounded-lg p-1 transition-colors', focusRing, isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}
            >
              <X className="h-4 w-4" />
            </button>
            <span className={cn('absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[shrink_var(--dur)_linear_forwards]', style.bar)}
              style={{ ['--dur' as any]: `${msg.duration || 4000}ms` }}
            />
          </motion.div>
        );
      })}
      <style>{`@keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  );
}

function useToast(theme: 'light' | 'dark') {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
    setMessages((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return {
    messages,
    showToast,
    removeToast,
    toastContainer: <ToastContainer messages={messages} onRemove={removeToast} theme={theme} />,
  };
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

// ─── DASHBOARD HEADER ────────────────────────────────────────────────────

interface DashboardHeaderProps {
  isDark: boolean;
  totalTasks: number;
  completedToday: number;
  pendingCount: number;
  overdueCount: number;
  completionRate: number;
  userName?: string;
  onRefresh: () => void;
  isLoading: boolean;
}

function DashboardHeader({
  isDark,
  totalTasks,
  completedToday,
  pendingCount,
  overdueCount,
  completionRate,
  userName,
  onRefresh,
  isLoading,
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border p-6 sm:p-8',
        isDark
          ? 'border-slate-700/50 bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80'
          : 'border-gray-200 bg-gradient-to-br from-white via-gray-50/80 to-white'
      )}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-purple-500/5 rounded-3xl" />
      
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 shadow-lg shadow-emerald-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={cn('text-2xl sm:text-3xl font-bold tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
                Task Management
              </h1>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {greeting}{userName ? `, ${userName}` : ''} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className={cn('flex items-center gap-1.5 text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
              <Calendar className="h-4 w-4" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className={cn('flex items-center gap-1.5 text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
              <Users className="h-4 w-4" />
              {totalTasks} total tasks
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={cn('text-2xl font-bold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                <AnimatedCounter value={completionRate} />%
              </p>
              <p className={cn('text-[10px] uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Completion Rate
              </p>
            </div>
            <div className={cn('w-px h-10', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
            <div className="text-center">
              <p className={cn('text-2xl font-bold', isDark ? 'text-blue-400' : 'text-blue-600')}>
                <AnimatedCounter value={completedToday} />
              </p>
              <p className={cn('text-[10px] uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Completed Today
              </p>
            </div>
            {overdueCount > 0 && (
              <>
                <div className={cn('w-px h-10', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
                <div className="text-center">
                  <p className={cn('text-2xl font-bold', isDark ? 'text-rose-400' : 'text-rose-600')}>
                    <AnimatedCounter value={overdueCount} />
                  </p>
                  <p className={cn('text-[10px] uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    Overdue
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            theme={isDark ? 'dark' : 'light'}
            variant="outline"
            icon={RefreshCw}
            isLoading={isLoading}
            onClick={onRefresh}
            className="flex-shrink-0"
          >
            Refresh
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ANALYTICS CARDS ────────────────────────────────────────────────────

interface AnalyticsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  isDark: boolean;
  delay?: number;
  subtitle?: string;
  trend?: number;
}

function AnalyticsCard({ title, value, icon, color, gradient, isDark, delay = 0, subtitle, trend }: AnalyticsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-300',
        isDark
          ? 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-800/20'
          : 'border-gray-200 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50'
      )}
    >
      {/* Gradient accent */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', gradient)} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn('text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">
              <AnimatedCounter value={value} className={isDark ? 'text-white' : 'text-gray-900'} />
            </p>
            {subtitle && (
              <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1.5">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                )}
                <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                  {isPositive ? '+' : ''}{trend}%
                </span>
                <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>from yesterday</span>
              </div>
            )}
          </div>
          <div className={cn('rounded-2xl p-3 flex-shrink-0', gradient, 'bg-opacity-10')}>
            <div className={color}>{icon}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TASK NAME GENERATOR MODAL ───────────────────────────────────────────

interface TaskNameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  theme: 'light' | 'dark';
}

function TaskNameGeneratorModal({ isOpen, onClose, task, theme }: TaskNameGeneratorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTaskName[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [showRecentTasks, setShowRecentTasks] = useState(true);
  
  // NEW: PO# state
  const [poNumber, setPoNumber] = useState('');
  
  // NEW: Extract Basecamp ID from task
  const basecampId = useMemo(() => {
    if (!task?.bc_links) return '';
    const links = task.bc_links.split(',').map(link => link.trim());
    for (const link of links) {
      const match = link.match(/todos\/(\d+)/);
      if (match) {
        return match[1];
      }
    }
    return '';
  }, [task]);

  const isDark = theme === 'dark';

  const allCategories = useMemo(() => {
    return TD_TASK_CATEGORIES.map(cat => cat.category);
  }, []);

  useEffect(() => {
    if (isOpen && task) {
      setRecentTasks(loadRecentTaskNames(task.agent || 'default'));
      setSelectedBrand(task.brand || '');
      setCustomBrand('');
      setIsEditingBrand(false);
      setPoNumber(''); // Reset PO# when modal opens
      
      const category = findCategoryByTaskName(task.task);
      setSelectedCategory(category?.category || '');
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const category = selectedCategory 
    ? TD_TASK_CATEGORIES.find(cat => cat.category === selectedCategory) 
    : findCategoryByTaskName(task.task);
    
  const templates = category?.templates || [];

  const filteredTemplates = searchQuery.trim()
    ? templates.filter((t) =>
        generateTaskName(t, { brand: selectedBrand || task.brand, agent: task.agent }).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : templates;

  const handleCopy = (template: string) => {
    const brandToUse = selectedBrand || task.brand;
    
    let generated = generateTaskName(template, { 
      brand: brandToUse, 
      agent: task.agent 
    });
    
    // Append Basecamp ID if found
    if (basecampId) {
      generated = `${generated} ${basecampId}`;
    }
    
    // Append PO# if provided
    if (poNumber.trim()) {
      generated = `${generated} ${poNumber.trim()}`;
    }

    navigator.clipboard.writeText(generated);
    setCopiedTemplate(template);
    setCopiedText(generated);
    setTimeout(() => {
      setCopiedTemplate(null);
      setCopiedText(null);
    }, 2000);

    pushRecentTaskName(task.agent || 'default', { 
      text: generated, 
      category: category?.category || task.task, 
      timestamp: Date.now() 
    });
    setRecentTasks(loadRecentTaskNames(task.agent || 'default'));
  };

  const handleCopyRecent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__CUSTOM__') {
      setIsEditingBrand(true);
      setSelectedBrand('');
      setCustomBrand('');
    } else {
      setSelectedBrand(value);
      setIsEditingBrand(false);
      setCustomBrand('');
    }
  };

  const handleCustomBrandSubmit = () => {
    if (customBrand.trim()) {
      setSelectedBrand(customBrand.trim());
      setIsEditingBrand(false);
    }
  };

  const handleBrandInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomBrandSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditingBrand(false);
      setCustomBrand('');
      setSelectedBrand(task.brand || '');
    }
  };

  const handleReset = () => {
    setSelectedBrand(task.brand || '');
    setSelectedCategory('');
    setIsEditingBrand(false);
    setCustomBrand('');
    setSearchQuery('');
    setPoNumber(''); // Add this line
  };

  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputCls = isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const labelCls = cn('text-xs sm:text-sm font-medium', mutedText);
  const selectCls = cn(
    'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
    focusRing,
    inputCls
  );

  const brandToUse = selectedBrand || task.brand;
  const isBrandInOptions = brandToUse && BRAND_OPTIONS.includes(brandToUse);

  // Get preview text for each template
    // Add this function before the return statement
  const getPreviewText = (template: string) => {
    const base = generateTaskName(template, { 
      brand: brandToUse, 
      agent: task.agent 
    });
    let preview = base;
    if (basecampId) {
      preview = `${preview} ${basecampId}`;
    }
    if (poNumber.trim()) {
      preview = `${preview} ${poNumber.trim()}`;
    }
    return preview;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} maxWidth="max-w-3xl" labelledBy="generator-title">
      <ModalHeader
        icon={Sparkles}
        iconClassName="bg-gradient-to-r from-blue-500 to-purple-500"
        title="Task Name Generator"
        subtitle={`Generate task names for ${brandToUse} · ${category?.category || task.task}`}
        onClose={onClose}
        theme={theme}
        titleId="generator-title"
      />

      <div className={cn('p-4 sm:p-5 border-b', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>
              Brand <span className="text-amber-400">*</span>
            </label>
            {!isEditingBrand ? (
              <div className="flex gap-2">
                <select
                  value={isBrandInOptions ? brandToUse : '__CUSTOM__'}
                  onChange={handleBrandChange}
                  className={selectCls}
                >
                  <option value={brandToUse}>
                    {brandToUse || 'Select brand...'}
                  </option>
                  {BRAND_OPTIONS
                    .filter(b => b !== brandToUse)
                    .slice(0, 10)
                    .map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  {BRAND_OPTIONS.length > 10 && (
                    <option disabled>───</option>
                  )}
                  {BRAND_OPTIONS
                    .filter(b => b !== brandToUse)
                    .slice(10)
                    .map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  <option value="__CUSTOM__">✏️ Custom Brand</option>
                </select>
                {!isBrandInOptions && brandToUse && (
                  <span className={cn('inline-flex items-center px-2 text-xs rounded', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                    Custom
                  </span>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter brand name..."
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  onKeyDown={handleBrandInputKeyDown}
                  className={cn('flex-1 rounded-lg border px-3 py-2 text-sm', focusRing, inputCls)}
                  autoFocus
                />
                <Button
                  theme={theme}
                  variant="primary"
                  size="sm"
                  onClick={handleCustomBrandSubmit}
                  disabled={!customBrand.trim()}
                  className="px-3"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  theme={theme}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingBrand(false);
                    setCustomBrand('');
                    setSelectedBrand(task.brand || '');
                  }}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className={cn('text-[10px]', mutedText)}>
              {isEditingBrand ? 'Type a brand name and press Enter' : 'Select a brand or choose "Custom Brand"'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Category
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={selectCls}
              >
                <option value="">Auto-detect</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {selectedCategory && (
                <Button
                  theme={theme}
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                  className="px-3 flex-shrink-0"
                  title="Reset to auto-detect"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className={cn('text-[10px]', mutedText)}>
              {selectedCategory ? `Using: ${selectedCategory}` : 'Auto-detected from task name'}
            </p>
          </div>
        </div>

        {/* NEW: PO# Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <label className={labelCls}>
              PO# <span className="text-xs text-slate-500">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter PO# (e.g., PO-2024-001)"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm', focusRing, inputCls)}
              />
              {poNumber && (
                <Button
                  theme={theme}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPoNumber('');
                  }}
                  className="px-3"
                  title="Clear PO#"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className={cn('text-[10px]', mutedText)}>
              {poNumber ? 'Will be appended to task name' : 'Add PO number for duplicate tasks'}
            </p>
          </div>

          {/* Display Basecamp ID if found */}
          {basecampId && (
            <div className="space-y-1.5">
              <label className={labelCls}>
                Basecamp ID
              </label>
              <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300')}>
                <Link className={cn('h-4 w-4', isDark ? 'text-slate-400' : 'text-gray-400')} />
                <span className={cn('font-mono', isDark ? 'text-white' : 'text-gray-900')}>BC#{basecampId}</span>
                <span className={cn('text-xs ml-auto', mutedText)}>Auto-detected</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4', mutedText)} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full rounded-lg border pl-9 pr-3 py-2 text-sm',
                focusRing,
                inputCls
              )}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn('text-[10px] font-medium', mutedText)}>Context:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            <User className="h-3 w-3" />
            {task.agent || 'Unassigned'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
            <span className="font-mono">{filteredTemplates.length}</span> templates
          </span>
          {brandToUse && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
              {brandToUse}
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              {selectedCategory}
            </span>
          )}
          {poNumber && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400">
              <Hash className="h-3 w-3" />
              PO#{poNumber}
            </span>
          )}
          {basecampId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-medium text-orange-400">
              <Link className="h-3 w-3" />
              BC#{basecampId}
            </span>
          )}
          <button
            onClick={handleReset}
            className={cn(
              'ml-auto text-xs font-medium transition-colors',
              focusRing,
              isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            Reset All
          </button>
        </div>
      </div>

      {recentTasks.length > 0 && (
        <div className={cn('border-b', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
          <button
            onClick={() => setShowRecentTasks(!showRecentTasks)}
            className={cn(
              'w-full flex items-center justify-between px-4 sm:p-5 py-2 text-xs font-medium transition-colors',
              focusRing,
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <span>📋 Recent</span>
            <span className="text-[10px]">
              {showRecentTasks ? '▼' : '▶'} {recentTasks.length}
            </span>
          </button>
          {showRecentTasks && (
            <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-2">
              {recentTasks.slice(0, 5).map((recent, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyRecent(recent.text)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all group',
                    focusRing,
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <span className="truncate max-w-[120px]">{recent.text}</span>
                  {copiedText === recent.text ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 max-h-[400px] overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className={cn('h-12 w-12 mb-4', mutedText)} />
            <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
              {searchQuery ? 'No templates match your search' : 'No templates available'}
            </p>
            <p className={cn('text-xs mt-1', mutedText)}>
              {searchQuery ? 'Try adjusting your search terms' : 'Try selecting a different category'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template, idx) => {
              const previewText = getPreviewText(template);
              const isCopied = copiedTemplate === template;
              const usesBrandToken = template.includes('{brand}');
              const usesAgentToken = template.includes('{agent}');
              const hasPlaceholder = template.includes('[specify what file]');

              return (
                <button
                  key={idx}
                  onClick={() => handleCopy(template)}
                  className={cn(
                    'group w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border p-3 sm:p-4 text-left transition-all hover:shadow-md',
                    focusRing,
                    isCopied
                      ? isDark
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-emerald-300 bg-emerald-50'
                      : isDark
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium break-all',
                      isCopied ? 'text-emerald-400' : isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {previewText}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {hasPlaceholder && (
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Editable
                        </span>
                      )}
                      {!usesBrandToken && (
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium', isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')}>
                          No brand
                        </span>
                      )}
                      {!usesAgentToken && (
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium', isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')}>
                          No agent
                        </span>
                      )}
                      {poNumber && (
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium', isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700')}>
                          <Hash className="h-2.5 w-2.5" />
                          PO#
                        </span>
                      )}
                      {basecampId && (
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium', isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700')}>
                          <Link className="h-2.5 w-2.5" />
                          BC#
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {isCopied ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> Copied!
                      </span>
                    ) : (
                      <Copy className={cn('h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100', mutedText)} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ModalFooter theme={theme} align="between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={mutedText}>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </span>
          <span className={cn('w-px h-4', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
          <span className={mutedText}>
            {brandToUse && `Brand: ${brandToUse}`}
            {selectedCategory && ` · ${selectedCategory}`}
          </span>
          {poNumber && (
            <>
              <span className={cn('w-px h-4', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
              <span className={cn('text-cyan-400')}>PO#{poNumber}</span>
            </>
          )}
          {basecampId && (
            <>
              <span className={cn('w-px h-4', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
              <span className={cn('text-orange-400')}>BC#{basecampId}</span>
            </>
          )}
          <span className={cn('text-[10px]', mutedText)}>
            · Esc to close
          </span>
        </div>
        <div className="flex gap-2">
          <Button theme={theme} variant="secondary" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button theme={theme} variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

// ─── REASON FOR PENDING MODAL ─────────────────────────────────────────────

interface ReasonForPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  task: Task | null;
  theme: 'light' | 'dark';
  isSubmitting: boolean;
}

function ReasonForPendingModal({ isOpen, onClose, onConfirm, task, theme, isSubmitting }: ReasonForPendingModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen || !task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} maxWidth="max-w-md" zIndex="z-[100]" labelledBy="pending-reason-title">
      <ModalHeader
        icon={Clock}
        iconClassName={theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'}
        title="Reason for pending"
        subtitle={`${task.task} · ${task.brand}`}
        onClose={onClose}
        theme={theme}
        titleId="pending-reason-title"
      />

      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel theme={theme} required>
            Why is this task being set to Pending?
          </FieldLabel>
          <textarea
            className={inputClasses(theme)}
            rows={4}
            placeholder="e.g. Waiting on client feedback before proceeding"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <ModalFooter theme={theme}>
        <Button theme={theme} variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          theme={theme}
          variant="primary"
          icon={Clock}
          isLoading={isSubmitting}
          disabled={!reason.trim()}
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          className={theme === 'dark' ? '!bg-amber-500 hover:!bg-amber-400 !shadow-amber-500/20' : '!bg-amber-500 hover:!bg-amber-600 !shadow-amber-500/20'}
        >
          Set to Pending
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── TASK FORM MODAL ─────────────────────────────────────────────────────

interface TaskFormValues {
  dateRequested: string;
  type: string;
  task: string;
  brand: string;
  customBrand: string;
  agent: string;
  dueDate: string;
  status: string;
  remarks: string;
  bcLinks: string;
}

const emptyTaskForm: TaskFormValues = {
  dateRequested: new Date().toISOString().split('T')[0],
  type: '',
  task: '',
  brand: '',
  customBrand: '',
  agent: '',
  dueDate: '',
  status: 'Pending',
  remarks: '',
  bcLinks: '',
};

function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  theme,
  mode,
  initialValues,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  isSubmitting: boolean;
  theme: 'light' | 'dark';
  mode: 'add' | 'edit';
  initialValues?: Partial<TaskFormValues>;
  error: string | null;
}) {
  const isDark = theme === 'dark';
  const [form, setForm] = useState<TaskFormValues>({ ...emptyTaskForm, ...initialValues });

  useEffect(() => {
    if (isOpen) setForm({ ...emptyTaskForm, ...initialValues });
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const usingCustomBrand = form.brand === '__OTHER__';
  const canSubmit = !!form.task && !!form.agent && !!form.brand && !(usingCustomBrand && !form.customBrand.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} maxWidth="max-w-2xl" labelledBy="task-form-title">
      <ModalHeader
        icon={mode === 'add' ? Plus : Edit2}
        title={mode === 'add' ? 'Add new task' : 'Edit task'}
        subtitle={mode === 'add' ? 'This will be added as a new row in the tracker' : 'Only admins can edit tasks assigned to others'}
        onClose={onClose}
        theme={theme}
        titleId="task-form-title"
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {error && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base',
              isDark ? 'border-rose-500/30 bg-rose-600/10 text-rose-400' : 'border-rose-300 bg-rose-50 text-rose-700'
            )}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm', isDark ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500')}>
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
          Segment is auto-filled by the sheet's formula and can't be set here.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <FieldLabel theme={theme}>Date Requested</FieldLabel>
            <input type="date" className={inputClasses(theme)} value={form.dateRequested} onChange={(e) => setForm({ ...form, dateRequested: e.target.value })} />
          </div>
          <div>
            <FieldLabel theme={theme}>Due Date</FieldLabel>
            <input type="date" className={inputClasses(theme)} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>

          <div>
            <FieldLabel theme={theme}>Type</FieldLabel>
            <select className={inputClasses(theme)} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">Select type...</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel theme={theme} required>
              Task
            </FieldLabel>
            <select className={inputClasses(theme, !form.task)} value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })}>
              <option value="">Select task...</option>
              {TASK_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel theme={theme} required>
              Brand
            </FieldLabel>
            <select className={inputClasses(theme, !form.brand)} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              <option value="">Select brand...</option>
              {BRAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="__OTHER__">Other (type below)</option>
            </select>
            {usingCustomBrand && (
              <input
                type="text"
                className={cn(inputClasses(theme, !form.customBrand.trim()), 'mt-2')}
                placeholder="Enter new brand name"
                value={form.customBrand}
                onChange={(e) => setForm({ ...form, customBrand: e.target.value })}
              />
            )}
          </div>
          <div>
            <FieldLabel theme={theme} required>
              Agent
            </FieldLabel>
            <select className={inputClasses(theme, !form.agent)} value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })}>
              <option value="">Select agent...</option>
              {AGENT_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel theme={theme}>Status</FieldLabel>
            <select className={inputClasses(theme)} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {VALID_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel theme={theme}>BC Links</FieldLabel>
          <input
            type="text"
            className={inputClasses(theme)}
            placeholder="https://3.basecamp.com/... (comma separated for multiple)"
            value={form.bcLinks}
            onChange={(e) => setForm({ ...form, bcLinks: e.target.value })}
          />
          <p className={cn('text-xs sm:text-sm mt-1.5', isDark ? 'text-slate-400' : 'text-gray-500')}>Separate multiple links with commas</p>
        </div>

        <div>
          <FieldLabel theme={theme}>Remarks</FieldLabel>
          <textarea className={inputClasses(theme)} rows={3} placeholder="Any additional context for this task..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </div>
      </div>

      <ModalFooter theme={theme}>
        <Button theme={theme} variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button theme={theme} variant="primary" icon={Check} isLoading={isSubmitting} disabled={!canSubmit} onClick={() => onSubmit(form)}>
          {mode === 'add' ? 'Add Task' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

interface TaskManagementProps {
  theme: 'light' | 'dark';
  currentUserEmail: string;
  currentUserName?: string;
}

const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
const SHEET_NAME = 'Copy of Task Masterlist - Operations';

const STORAGE_KEYS = {
  viewMode: 'task_management_view_mode',
  layoutMode: 'task_management_layout_mode',
  filterStatus: 'task_management_filter_status',
  filterBrand: 'task_management_filter_brand',
  filterAgent: 'task_management_filter_agent',
  filterDateRange: 'task_management_filter_date_range',
  customDateStart: 'task_management_custom_date_start',
  customDateEnd: 'task_management_custom_date_end',
  searchTerm: 'task_management_search_term',
  sortField: 'task_management_sort_field',
  sortOrder: 'task_management_sort_order',
  showOnlyNew: 'task_management_show_only_new',
  itemsPerPage: 'task_management_items_per_page',
  activeTab: 'task_management_active_tab',
};

export default function TaskManagement({ theme, currentUserEmail, currentUserName = '' }: TaskManagementProps) {
  // ─── TOAST SYSTEM ────────────────────────────────────────────────────────
  const { messages, showToast, removeToast, toastContainer } = useToast(theme);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── STATE WITH LOCAL STORAGE PERSISTENCE ──────────────────────────────

  const [activeTab, setActiveTab] = useState<'tasks' | 'completion'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.activeTab);
      if (saved === 'tasks' || saved === 'completion') return saved;
    }
    return 'tasks';
  });

  const [layoutMode, setLayoutMode] = useState<TaskViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.layoutMode);
      if (saved === 'table' || saved === 'card' || saved === 'list') return saved as TaskViewMode;
    }
    return 'table';
  });

  const [viewMode, setViewMode] = useState<'mine' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.viewMode);
      if (saved === 'mine' || saved === 'all') return saved;
    }
    return 'mine';
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.searchTerm) || '';
    return '';
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [filterStatus, setFilterStatus] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.filterStatus) || 'all';
    return 'all';
  });

  const [filterBrand, setFilterBrand] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.filterBrand) || 'all';
    return 'all';
  });

  const [filterAgent, setFilterAgent] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.filterAgent) || 'all';
    return 'all';
  });

  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'overdue' | 'unassigned' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.filterDateRange);
      if (saved === 'all' || saved === 'today' || saved === 'week' || saved === 'month' || saved === 'overdue' || saved === 'unassigned' || saved === 'custom') return saved;
    }
    return 'all';
  });

  const [customDateStart, setCustomDateStart] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.customDateStart) || '';
    return '';
  });

  const [customDateEnd, setCustomDateEnd] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.customDateEnd) || '';
    return '';
  });

  const [sortField, setSortField] = useState<'rowIndex' | 'dueDate' | 'status' | 'brand' | 'agent' | 'dateRequested'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.sortField);
      if (saved === 'rowIndex' || saved === 'dueDate' || saved === 'status' || saved === 'brand' || saved === 'agent' || saved === 'dateRequested') return saved;
    }
    return 'rowIndex';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.sortOrder);
      if (saved === 'asc' || saved === 'desc') return saved;
    }
    return 'desc';
  });

  const [showOnlyNew, setShowOnlyNew] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(STORAGE_KEYS.showOnlyNew) === 'true';
    return false;
  });

  const [itemsPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.itemsPerPage);
      if (saved) return parseInt(saved, 10);
    }
    return 25;
  });

  // ─── OTHER STATE ──────────────────────────────────────────────────────

  const [showFilters, setShowFilters] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTaskForGenerator, setSelectedTaskForGenerator] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [previousTaskIds, setPreviousTaskIds] = useState<Set<string>>(new Set());
  const [showNewTaskNotification, setShowNewTaskNotification] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  // Reason for Pending states
  const [showPendingReasonModal, setShowPendingReasonModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);
  const [pendingStatusTarget, setPendingStatusTarget] = useState<string>('Pending');

  // Refs
  const initialLoadDone = useRef(false);
  const isLoadingRef = useRef(false);

  const isDark = theme === 'dark';
  const isTaskAdmin = isTaskAdminEmail(currentUserEmail);

  // ─── SAVE TO LOCAL STORAGE ────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.layoutMode, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.searchTerm, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.filterStatus, filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.filterBrand, filterBrand);
  }, [filterBrand]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.filterAgent, filterAgent);
  }, [filterAgent]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.filterDateRange, filterDateRange);
  }, [filterDateRange]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.customDateStart, customDateStart);
  }, [customDateStart]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.customDateEnd, customDateEnd);
  }, [customDateEnd]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.sortField, sortField);
  }, [sortField]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.sortOrder, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.showOnlyNew, String(showOnlyNew));
  }, [showOnlyNew]);

  // ─── PROCESS TASKS FROM SHEET ──────────────────────────────────────────

  const processTasksFromSheet = useCallback((sheetData: any): Task[] => {
    let headers: string[];
    let rowData: { row: any[]; rowIndex: number }[];

    if (sheetData && typeof sheetData === 'object' && sheetData.headers && sheetData.rows) {
      headers = sheetData.headers;
      rowData = sheetData.rows;
    } else if (Array.isArray(sheetData) && sheetData.length > 0) {
      headers = sheetData[0] || [];
      const rows = sheetData.slice(1) || [];
      rowData = rows.map((row, index) => ({ row, rowIndex: index + 2 }));
    } else {
      return [];
    }

    if (!headers || headers.length === 0 || rowData.length === 0) return [];

    const columnMap: { [key: string]: number } = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        const key = header.toString().trim().toLowerCase();
        if (!(key in columnMap)) columnMap[key] = index;
      }
    });

    const taskCol = columnMap['task'];
    const statusCol = columnMap['status'];
    const dateRequestedCol = columnMap['date requested'];
    const dueDateCol = columnMap['due date'];
    const dateCompletedCol = columnMap['date completed'];
    const tatCol = columnMap['tat'];
    const segmentCol = columnMap['segment'];
    const typeCol = columnMap['type'];
    const brandCol = columnMap['brand'];
    const agentCol = columnMap['agent'];
    const remarksCol = columnMap['remarks'];
    const auditorCol = columnMap['auditor'];
    const bcLinksCol = columnMap['bc links'] ?? columnMap['bc link'];
    const reasonPendingCol = columnMap['reason for pending'];
    const reasonCancelCol = columnMap['reason for cancel'];

    if (taskCol === undefined) return [];

    const get = (row: any[], idx: number | undefined) => (idx !== undefined && idx < row.length ? row[idx] ?? '' : '');

    const taskList: Task[] = [];

    rowData.forEach(({ row, rowIndex }: { row: any[]; rowIndex: number }) => {
      const taskName = get(row, taskCol);
      if (!taskName || taskName.toString().trim() === '') return;

      taskList.push({
        id: `task-${rowIndex}`,
        rowIndex,
        date_requested: get(row, dateRequestedCol).toString(),
        tat: get(row, tatCol).toString(),
        segment: get(row, segmentCol).toString(),
        type: get(row, typeCol).toString(),
        task: taskName.toString(),
        brand: get(row, brandCol).toString(),
        date_assigned: get(row, dateRequestedCol).toString(),
        agent: get(row, agentCol).toString(),
        due_date: get(row, dueDateCol).toString(),
        date_completed: get(row, dateCompletedCol).toString() || null,
        remarks: get(row, remarksCol).toString(),
        auditor: get(row, auditorCol).toString(),
        status: get(row, statusCol).toString() || 'Pending',
        bc_links: get(row, bcLinksCol).toString(),
        reason_for_pending: get(row, reasonPendingCol).toString(),
        reason_for_cancel: get(row, reasonCancelCol).toString(),
        isNew: false,
      });
    });

    return taskList;
  }, []);

  // ─── LOAD TASKS ────────────────────────────────────────────────────────

  const loadTasksFromSheet = useCallback(
    async (mode?: 'mine' | 'all') => {
      const currentMode = mode || viewMode;

      if (isLoadingRef.current) return;

      if (!currentUserEmail) {
        setTasks([]);
        setIsLoading(false);
        setUpdateError('Please log in to view your tasks');
        showToast('error', 'Authentication Error', 'Please log in to view your tasks');
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setUpdateError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const timestamp = Date.now();

        const response = await fetch('/api/google-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME,
            userEmail: currentUserEmail || '',
            viewAll: currentMode === 'all',
            _t: timestamp,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();

        let newTasks: Task[] = [];
        if (data.rows && data.rows.length > 0) {
          newTasks = processTasksFromSheet(data);
        } else if (data.values && data.values.length > 0) {
          newTasks = processTasksFromSheet(data.values);
        }

        if (currentMode === 'all') {
          setAllTasks(newTasks);
        } else {
          setTasks(newTasks);
        }

        if (currentMode === 'mine' && newTasks.length > 0) {
          const newIds = new Set<string>();
          const currentIds = new Set(newTasks.map((t) => t.id));

          newTasks.forEach((task) => {
            if (!previousTaskIds.has(task.id)) newIds.add(task.id);
          });

          if (newIds.size > 0 && previousTaskIds.size > 0) {
            setNewTaskIds(newIds);
            setShowNewTaskNotification(true);
            setTasks((prev) => prev.map((t) => ({ ...t, isNew: newIds.has(t.id) })));
            setAllTasks((prev) => prev.map((t) => ({ ...t, isNew: newIds.has(t.id) })));

            showToast('info', `${newIds.size} New Task${newIds.size > 1 ? 's' : ''} Added`, 'New tasks have been added to your list');

            setTimeout(() => setShowNewTaskNotification(false), 10000);
          }

          setPreviousTaskIds(currentIds);
        }

        return newTasks;
      } catch (error: any) {
        console.error('Failed to load tasks:', error);
        let errorMessage = 'Failed to load tasks';
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error instanceof Error ? error.message : 'Failed to load tasks';
        }
        setUpdateError(errorMessage);
        showToast('error', 'Load Failed', errorMessage);

        if (currentMode === 'all') {
          setAllTasks([]);
        } else {
          setTasks([]);
        }
        return [];
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [currentUserEmail, viewMode, processTasksFromSheet, previousTaskIds, showToast]
  );

  // ─── LOAD ON MOUNT ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadTasksFromSheet(viewMode);
    }
  }, []);

  // ─── AUTO-REFRESH ──────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'tasks') loadTasksFromSheet(viewMode);
    }, 90000);
    return () => clearInterval(interval);
  }, [loadTasksFromSheet, viewMode, activeTab]);

  // ─── REFRESH ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());
    loadTasksFromSheet(viewMode);
    showToast('info', 'Refreshing Tasks', 'Updating your task list...');
  }, [loadTasksFromSheet, viewMode, showToast]);

  // ─── TOGGLE VIEW MODE ──────────────────────────────────────────────────

  const onViewModeChange = useCallback(
    async (mode: 'mine' | 'all') => {
      setFilterStatus('all');
      setFilterBrand('all');
      setFilterAgent('all');
      setFilterDateRange('all');
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setCurrentPage(1);
      setViewMode(mode);
      setShowNewTaskNotification(false);
      setNewTaskIds(new Set());
      setShowOnlyNew(false);

      await loadTasksFromSheet(mode);
      showToast('info', `Switched to ${mode === 'all' ? 'All Tasks' : 'My Tasks'}`, `Viewing ${mode === 'all' ? 'all tasks' : 'tasks assigned to you'}`);
    },
    [loadTasksFromSheet, showToast]
  );

  // ─── UPDATE STATUS ────────────────────────────────────────────────────

  const onUpdateStatus = useCallback(
    async (taskId: string, newStatus: string, reason?: string) => {
      if (updatingTaskId) return;

      if (newStatus.toLowerCase() === 'pending' && !reason) {
        setPendingTaskId(taskId);
        setPendingStatusTarget(newStatus);
        setShowPendingReasonModal(true);
        return;
      }

      setUpdatingTaskId(taskId);
      setUpdateError(null);

      const sourceList = viewMode === 'all' ? allTasks : tasks;
      const task = sourceList.find((t) => t.id === taskId);
      if (!task) {
        setUpdatingTaskId(null);
        setUpdateError('Task not found');
        showToast('error', 'Task Not Found', 'The task you are trying to update does not exist');
        return;
      }

      const rowIndex = Number(task.rowIndex);
      if (isNaN(rowIndex) || rowIndex < 2) {
        setUpdateError(`Invalid row index: ${task.rowIndex}`);
        setUpdatingTaskId(null);
        showToast('error', 'Invalid Row', `Invalid row index: ${task.rowIndex}`);
        return;
      }

      const isPending = newStatus.toLowerCase() === 'pending';
      const isCompletedOrCancelled = newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'cancelled';

      const previousStatus = task.status;
      const previousDateCompleted = task.date_completed;
      const previousReasonForPending = task.reason_for_pending;

      const applyOptimisticUpdate = (list: Task[]) =>
        list.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                date_completed: isCompletedOrCancelled ? new Date().toLocaleDateString('en-US') : null,
                reason_for_pending: isPending ? reason || '' : '',
              }
            : t
        );

      setTasks((prev) => applyOptimisticUpdate(prev));
      setAllTasks((prev) => applyOptimisticUpdate(prev));

      if (showTaskModal) {
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  date_completed: isCompletedOrCancelled ? new Date().toLocaleDateString('en-US') : null,
                  reason_for_pending: isPending ? reason || '' : '',
                }
              : null
          );
        }
      }

      try {
        const payload = {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          rowIndex,
          newStatus,
          taskName: task.task,
          agentEmail: task.agent || '',
          reasonForPending: isPending ? reason || '' : '',
        };

        const response = await fetch('/api/google-sheets/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const statusEmojis: Record<string, string> = { Completed: '✅', Ongoing: '🔄', Pending: '⏳', Cancelled: '❌' };
        const emoji = statusEmojis[newStatus] || '📝';
        showToast('success', `Status Updated to ${newStatus}`, `${emoji} Task "${task.task}" is now ${newStatus}`);

        await loadTasksFromSheet(viewMode);
      } catch (error) {
        console.error('Failed to update task status:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to update task status';
        setUpdateError(errorMsg);
        showToast('error', 'Update Failed', errorMsg);

        const rollbackOptimisticUpdate = (list: Task[]) =>
          list.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: previousStatus,
                  date_completed: previousDateCompleted,
                  reason_for_pending: previousReasonForPending || '',
                }
              : t
          );

        setTasks((prev) => rollbackOptimisticUpdate(prev));
        setAllTasks((prev) => rollbackOptimisticUpdate(prev));

        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) =>
            prev ? { ...prev, status: previousStatus, date_completed: previousDateCompleted, reason_for_pending: previousReasonForPending || '' } : null
          );
        }
      } finally {
        setUpdatingTaskId(null);
        setPendingTaskId(null);
        setPendingStatusTarget('Pending');
      }
    },
    [tasks, allTasks, viewMode, showTaskModal, updatingTaskId, loadTasksFromSheet, selectedTask, showToast]
  );

  // ─── HANDLE PENDING CONFIRM ───────────────────────────────────────────

  const handlePendingConfirm = useCallback(
    async (reason: string) => {
      if (!pendingTaskId) return;
      setIsSubmittingPending(true);
      await onUpdateStatus(pendingTaskId, pendingStatusTarget, reason);
      setIsSubmittingPending(false);
      setShowPendingReasonModal(false);
      setPendingTaskId(null);
      setPendingStatusTarget('Pending');
    },
    [pendingTaskId, pendingStatusTarget, onUpdateStatus]
  );

  // ─── EDIT / ADD / CLICK HANDLERS ──────────────────────────────────────

  const onEditTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setTaskFormError(null);
    setShowEditTaskModal(true);
  }, []);

  const onAddTask = useCallback(() => {
    setTaskFormError(null);
    setShowAddTaskModal(true);
  }, []);

  const onTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }, []);

  const onMarkAllViewed = useCallback(() => {
    setNewTaskIds(new Set());
    setShowNewTaskNotification(false);
    setShowOnlyNew(false);
    setAllTasks((prev) => prev.map((t) => ({ ...t, isNew: false })));
    setTasks((prev) => prev.map((t) => ({ ...t, isNew: false })));
    showToast('success', 'All Caught Up', 'All new tasks have been marked as viewed');
  }, [showToast]);

  const onOpenGenerator = useCallback((task: Task) => {
    setSelectedTaskForGenerator(task);
    setShowGenerator(true);
  }, []);

  const clearCustomDateRange = useCallback(() => {
    setCustomDateStart('');
    setCustomDateEnd('');
    setFilterDateRange('all');
    setCurrentPage(1);
    setShowDateRangePicker(false);
    showToast('info', 'Filters Cleared', 'Custom date range has been cleared');
  }, [showToast]);

  const applyCustomDateRange = useCallback(() => {
    if (customDateStart && customDateEnd) {
      setFilterDateRange('custom');
      setCurrentPage(1);
      setShowDateRangePicker(false);
      showToast('success', 'Date Range Applied', `Filtering from ${new Date(customDateStart).toLocaleDateString()} to ${new Date(customDateEnd).toLocaleDateString()}`);
    }
  }, [customDateStart, customDateEnd, showToast]);

  // ─── SAVE / ADD TASK ──────────────────────────────────────────────────

  const saveTaskEdits = useCallback(
    async (values: TaskFormValues) => {
      if (!selectedTask) return;
      setIsSavingTask(true);
      setTaskFormError(null);

      const finalBrand = values.brand === '__OTHER__' ? values.customBrand.trim() : values.brand;

      try {
        const response = await fetch('/api/google-sheets/update-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME,
            requesterEmail: currentUserEmail,
            rowIndex: selectedTask.rowIndex,
            updates: {
              dateRequested: values.dateRequested,
              type: values.type,
              task: values.task,
              brand: finalBrand,
              agent: values.agent,
              dueDate: values.dueDate,
              status: values.status,
              remarks: values.remarks,
              bcLinks: values.bcLinks,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        setShowEditTaskModal(false);
        setShowTaskModal(false);
        setSelectedTask(null);
        showToast('success', 'Task Updated', `Task "${values.task}" has been updated successfully`);
        loadTasksFromSheet(viewMode);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to save changes';
        setTaskFormError(errorMsg);
        showToast('error', 'Update Failed', errorMsg);
      } finally {
        setIsSavingTask(false);
      }
    },
    [selectedTask, currentUserEmail, loadTasksFromSheet, viewMode, showToast]
  );

  const addNewTask = useCallback(
    async (values: TaskFormValues) => {
      setIsSavingTask(true);
      setTaskFormError(null);

      const finalBrand = values.brand === '__OTHER__' ? values.customBrand.trim() : values.brand;

      try {
        const response = await fetch('/api/google-sheets/add-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME,
            requesterEmail: currentUserEmail,
            dateRequested: values.dateRequested,
            type: values.type,
            task: values.task,
            brand: finalBrand,
            agent: values.agent,
            dueDate: values.dueDate,
            status: values.status,
            remarks: values.remarks,
            bcLinks: values.bcLinks,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        setShowAddTaskModal(false);
        showToast('success', 'Task Added', `Task "${values.task}" has been added successfully`);
        loadTasksFromSheet(viewMode);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to add task';
        setTaskFormError(errorMsg);
        showToast('error', 'Add Failed', errorMsg);
      } finally {
        setIsSavingTask(false);
      }
    },
    [currentUserEmail, loadTasksFromSheet, viewMode, showToast]
  );

  // ─── GET STATUS OPTIONS ───────────────────────────────────────────────

  const getStatusOptions = useCallback((currentStatus: string) => {
    return VALID_TASK_STATUSES.filter((s) => s.toLowerCase() !== currentStatus.toLowerCase());
  }, []);

  // ─── DERIVED DATA ─────────────────────────────────────────────────────

  const activeTasks = viewMode === 'all' ? allTasks : tasks;

  // ─── COMPUTED STATISTICS ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = activeTasks.length;
    const completed = activeTasks.filter(t => t.status === 'Completed').length;
    const pending = activeTasks.filter(t => t.status === 'Pending').length;
    const ongoing = activeTasks.filter(t => t.status === 'Ongoing').length;
    const cancelled = activeTasks.filter(t => t.status === 'Cancelled').length;
    const overdue = activeTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate < today && t.status !== 'Completed' && t.status !== 'Cancelled';
    }).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, ongoing, cancelled, overdue, completionRate };
  }, [activeTasks]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    activeTasks.forEach((task) => task.brand && brands.add(task.brand));
    return Array.from(brands).sort();
  }, [activeTasks]);

  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    activeTasks.forEach((task) => task.agent && agents.add(task.agent));
    return Array.from(agents).sort();
  }, [activeTasks]);

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeTasks.length };
    activeTasks.forEach((task) => {
      const status = task.status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [activeTasks]);

  const filteredAndSortedTasks = useMemo(() => {
    if (activeTasks.length === 0) return [];

    let filtered = activeTasks;

    if (showOnlyNew) filtered = filtered.filter((task) => newTaskIds.has(task.id));
    if (filterStatus !== 'all') filtered = filtered.filter((task) => task.status === filterStatus);
    if (filterBrand !== 'all') filtered = filtered.filter((task) => task.brand === filterBrand);
    if (filterAgent !== 'all') filtered = filtered.filter((task) => task.agent === filterAgent);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filterDateRange !== 'all') {
      filtered = filtered.filter((task) => {
        if (filterDateRange === 'unassigned') return !task.agent || task.agent.trim() === '';

        const dueDateStr = task.due_date;
        if (!dueDateStr) return false;

        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) return false;

        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        if (filterDateRange === 'overdue') return dueDateOnly < today && task.status !== 'Completed' && task.status !== 'Cancelled';
        if (filterDateRange === 'today') return dueDateOnly.getTime() === today.getTime();
        if (filterDateRange === 'week') {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return dueDateOnly >= today && dueDateOnly <= weekEnd;
        }
        if (filterDateRange === 'month') {
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return dueDateOnly >= today && dueDateOnly <= monthEnd;
        }
        if (filterDateRange === 'custom') {
          const startDate = customDateStart ? new Date(customDateStart) : null;
          const endDate = customDateEnd ? new Date(customDateEnd) : null;

          if (startDate) {
            const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (dueDateOnly < startOnly) return false;
          }
          if (endDate) {
            const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            if (dueDateOnly > endOnly) return false;
          }
          return true;
        }

        return true;
      });
    }

    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase().trim();

      filtered = filtered.filter((task) => {
        if (task.rowIndex !== undefined && task.rowIndex !== null) {
          const rowIndexStr = String(task.rowIndex);
          if (rowIndexStr.includes(term) || term.includes(rowIndexStr)) return true;
        }

        if (task.task.toLowerCase().includes(term)) return true;
        if (task.brand.toLowerCase().includes(term)) return true;
        if (task.status.toLowerCase().includes(term)) return true;
        if (task.type.toLowerCase().includes(term)) return true;
        if (task.segment.toLowerCase().includes(term)) return true;
        if (task.bc_links.toLowerCase().includes(term)) return true;
        if (task.agent.toLowerCase().includes(term)) return true;
        if (task.auditor.toLowerCase().includes(term)) return true;
        if (task.remarks.toLowerCase().includes(term)) return true;
        if (task.reason_for_pending.toLowerCase().includes(term)) return true;
        if (task.reason_for_cancel.toLowerCase().includes(term)) return true;

        if (task.due_date) {
          try {
            const dueDate = new Date(task.due_date);
            if (!isNaN(dueDate.getTime())) {
              const dateFormats = [
                task.due_date.toLowerCase(),
                dueDate.toLocaleDateString('en-US').toLowerCase(),
                dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase(),
                dueDate.toISOString().split('T')[0],
                `${dueDate.getMonth() + 1}/${dueDate.getDate()}/${dueDate.getFullYear()}`,
                `${dueDate.getMonth() + 1}/${dueDate.getDate()}`,
              ];

              for (const format of dateFormats) {
                if (format.includes(term)) return true;
              }
            }
          } catch (e) {
            // Skip
          }
        }

        return false;
      });
    }

    if (filtered.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortField) {
          case 'rowIndex':
            aVal = a.rowIndex || 0;
            bVal = b.rowIndex || 0;
            break;
          case 'dueDate':
            aVal = a.due_date || '';
            bVal = b.due_date || '';
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'brand':
            aVal = a.brand;
            bVal = b.brand;
            break;
          case 'agent':
            aVal = a.agent;
            bVal = b.agent;
            break;
          case 'dateRequested':
            aVal = a.date_requested || '';
            bVal = b.date_requested || '';
            break;
          default:
            aVal = a.task;
            bVal = b.task;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [activeTasks, debouncedSearchTerm, filterStatus, filterBrand, filterAgent, sortField, sortOrder, filterDateRange, customDateStart, customDateEnd, showOnlyNew, newTaskIds]);

  // ─── PAGINATION ────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterBrand, filterAgent, searchTerm, viewMode, filterDateRange, showOnlyNew]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const hasActiveFilters = filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all' || filterDateRange !== 'all' || !!searchTerm || showOnlyNew;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterBrand('all');
    setFilterAgent('all');
    setFilterDateRange('all');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setShowOnlyNew(false);
    setCustomDateStart('');
    setCustomDateEnd('');
    showToast('info', 'Filters Cleared', 'All filters have been reset');
  };

  const handleOpenGenerator = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskForGenerator(task);
    setShowGenerator(true);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  // ─── SHARED STATUS ACTION BUTTON ──────────────────────────────────────

  function StatusActionButton({ task, newStatus, size = 'sm' }: { task: Task; newStatus: string; size?: 'sm' | 'md' }) {
    const isUpdating = updatingTaskId === task.id;
    const variantMap: Record<string, 'primary' | 'danger' | 'outline' | 'secondary'> = {
      completed: 'primary',
      cancelled: 'danger',
      ongoing: 'outline',
    };
    const variant = variantMap[newStatus.toLowerCase()] || 'secondary';
    return (
      <Button theme={theme} variant={variant} size={size} isLoading={isUpdating} onClick={() => onUpdateStatus(task.id, newStatus)}>
        {newStatus}
      </Button>
    );
  }

  // ─── RENDER: SORT HEADER CELL ─────────────────────────────────────────

  const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <th className={cn('px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-gray-600')}>
      <button onClick={() => toggleSort(field)} className={cn('flex items-center gap-1 transition-colors hover:text-emerald-500 rounded', focusRing)}>
        {children}
        <ArrowUpDown className={cn('h-3 w-3 sm:h-4 sm:w-4 transition-transform', sortField === field && sortOrder === 'desc' && 'rotate-180', sortField === field ? 'opacity-100 text-emerald-500' : 'opacity-40')} />
      </button>
    </th>
  );

  // ─── RENDER TABLE VIEW ──────────────────────────────────────────────────

  const renderTableView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl border border-transparent"
    >
      <div className="min-w-[800px] sm:min-w-full">
        <table className="w-full text-sm sm:text-base">
          <thead className={cn('sticky top-0 z-10 backdrop-blur', isDark ? 'bg-slate-800/95' : 'bg-gray-50/95')}>
            <tr>
              <SortHeader field="rowIndex">#</SortHeader>
              <SortHeader field="dateRequested">Date</SortHeader>
              <SortHeader field="brand">Brand</SortHeader>
              <th className={cn('px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-gray-600')}>Task</th>
              {viewMode === 'all' && <SortHeader field="agent">Agent</SortHeader>}
              <SortHeader field="dueDate">Due Date</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <th className={cn('px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-gray-600')}>Remarks</th>
              <th className={cn('px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-gray-600')}>Actions</th>
            </tr>
          </thead>
          <tbody className={cn('divide-y', isDark ? 'divide-slate-700/50' : 'divide-gray-200')}>
            {paginatedTasks.map((task, rowIdx) => {
              const isUpdating = updatingTaskId === task.id;
              const isNew = newTaskIds.has(task.id);
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
              const hasRemarks = task.remarks && task.remarks.trim() !== '';
              const statusOptions = getStatusOptions(task.status);

              return (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: rowIdx * 0.01 }}
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer transition-all duration-200 group',
                    focusRing,
                    isDark ? (rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20') : rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/40',
                    isDark ? 'hover:bg-slate-800/60 hover:scale-[1.002]' : 'hover:bg-gray-50 hover:scale-[1.002]',
                    isNew && (isDark ? 'bg-emerald-500/5 border-l-2 border-emerald-400' : 'bg-emerald-50/50 border-l-2 border-emerald-500')
                  )}
                  onClick={() => onTaskClick(task)}
                  onKeyDown={(e) => e.key === 'Enter' && onTaskClick(task)}
                >
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 text-sm sm:text-base font-mono', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {task.rowIndex}
                    {isNew && (
                      <span className="ml-1 sm:ml-2 inline-flex items-center gap-0.5 sm:gap-1">
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className={cn('text-[8px] sm:text-[10px] font-bold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>NEW</span>
                      </span>
                    )}
                  </td>
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>{formatDate(task.date_requested)}</td>
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 font-medium text-sm sm:text-base', isDark ? 'text-white' : 'text-gray-900')}>{task.brand}</td>
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 text-sm sm:text-base', isDark ? 'text-white' : 'text-gray-900')}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="truncate max-w-[150px] sm:max-w-[250px]">{task.task}</span>
                      <span className={cn('text-xs sm:text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>{task.type}</span>
                    </div>
                  </td>
                  {viewMode === 'all' && <td className={cn('px-2 sm:px-4 py-2 sm:py-4 text-sm sm:text-base', isDark ? 'text-slate-300' : 'text-gray-700')}>{task.agent || 'Unassigned'}</td>}
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 text-sm sm:text-base', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                      <span>{formatDate(task.due_date)}</span>
                      {isOverdue && (
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-sm font-semibold', isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700')}>
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-4">
                    <StatusBadge status={task.status} theme={theme} />
                  </td>
                  <td className={cn('px-2 sm:px-4 py-2 sm:py-4 max-w-[120px] sm:max-w-[200px] text-xs sm:text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    {hasRemarks ? (
                      <div className="relative group">
                        <div className="flex items-start gap-1 sm:gap-2">
                          {task.remarks.toLowerCase().includes('sbs') && (
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-xs font-semibold flex-shrink-0', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                              <Eye className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                              SBS
                            </span>
                          )}
                          <span className="line-clamp-2 break-words">{task.remarks}</span>
                        </div>
                        {task.remarks.length > 60 && (
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20">
                            <div className={cn('rounded-lg border p-2 sm:p-3 text-xs sm:text-sm max-w-xs shadow-lg', isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900')}>
                              {task.remarks}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={cn('italic', isDark ? 'text-slate-500' : 'text-gray-400')}>No remarks</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-4">
                    <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <Button theme={theme} variant="outline" size="sm" icon={Sparkles} onClick={(e) => handleOpenGenerator(task, e)} title="Generate Task Name">
                        <span className="hidden sm:inline">Generate</span>
                      </Button>
                      {statusOptions.slice(0, viewMode === 'all' ? 1 : 2).map((newStatus) => (
                        <StatusActionButton key={newStatus} task={task} newStatus={newStatus} />
                      ))}
                      {statusOptions.length > (viewMode === 'all' ? 1 : 2) && (
                        <span className={cn('text-[10px] sm:text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>+{statusOptions.length - (viewMode === 'all' ? 1 : 2)}</span>
                      )}
                      {isTaskAdmin && (
                        <Button
                          theme={theme}
                          variant="ghost"
                          size="icon"
                          ariaLabel="Edit task"
                          title="Edit Task"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  // ─── RENDER CARD VIEW ───────────────────────────────────────────────────

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
      {paginatedTasks.map((task) => {
        const isNew = newTaskIds.has(task.id);
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
        const hasRemarks = task.remarks && task.remarks.trim() !== '';
        const statusOptions = getStatusOptions(task.status);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="cursor-pointer"
          >
            <Card theme={theme} interactive highlighted={isNew} className="p-3 sm:p-5">
              <div onClick={() => onTaskClick(task)}>
                <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className={cn('text-xs sm:text-sm font-mono', isDark ? 'text-slate-500' : 'text-gray-400')}>#{task.rowIndex}</span>
                      <span className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>{task.brand}</span>
                      {isNew && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-semibold text-emerald-400">
                          <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          NEW
                        </span>
                      )}
                    </div>
                    <h3 className={cn('text-sm sm:text-base font-semibold truncate mt-0.5 sm:mt-1', isDark ? 'text-white' : 'text-gray-900')}>{task.task}</h3>
                  </div>
                  <StatusBadge status={task.status} theme={theme} size="sm" />
                </div>

                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className={cn('flex items-center gap-1.5 sm:gap-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{task.agent || 'Unassigned'}</span>
                  </div>
                  <div className={cn('flex items-center gap-1.5 sm:gap-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Due: {formatDate(task.due_date)}</span>
                    {isOverdue && <span className="text-rose-500 text-[10px] sm:text-xs font-medium">(Overdue)</span>}
                  </div>
                  {hasRemarks && (
                    <div className={cn('flex items-start gap-1.5 sm:gap-2 truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                      <span className="truncate text-xs sm:text-sm">{task.remarks}</span>
                      {task.remarks.toLowerCase().includes('sbs') && (
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-semibold flex-shrink-0', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                          <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          SBS
                        </span>
                      )}
                    </div>
                  )}
                  {task.status === 'Pending' && task.reason_for_pending && (
                    <div className={cn('flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs', isDark ? 'text-amber-400' : 'text-amber-600')}>
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                      <span className="truncate">Reason: {task.reason_for_pending}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn('mt-3 sm:mt-4 flex items-center justify-between pt-3 sm:pt-4 border-t', isDark ? 'border-slate-700/50' : 'border-gray-100')} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button theme={theme} variant="outline" size="sm" icon={Sparkles} onClick={(e) => handleOpenGenerator(task, e)} title="Generate Task Name" />
                  {statusOptions.slice(0, 1).map((newStatus) => (
                    <StatusActionButton key={newStatus} task={task} newStatus={newStatus} />
                  ))}
                  {statusOptions.length > 1 && <span className={cn('text-[10px] sm:text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>+{statusOptions.length - 1}</span>}
                </div>
                {isTaskAdmin && (
                  <Button theme={theme} variant="ghost" size="icon" ariaLabel="Edit task" title="Edit Task" onClick={() => onEditTask(task)}>
                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  // ─── RENDER LIST VIEW ───────────────────────────────────────────────────

  const renderListView = () => (
    <div className="space-y-2 sm:space-y-3">
      {paginatedTasks.map((task) => {
        const isNew = newTaskIds.has(task.id);
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
        const hasRemarks = task.remarks && task.remarks.trim() !== '';
        const statusOptions = getStatusOptions(task.status);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.002 }}
          >
            <Card theme={theme} interactive highlighted={isNew} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer">
              <div className="flex-1 min-w-0 w-full" onClick={() => onTaskClick(task)}>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <span className={cn('text-xs sm:text-sm font-mono', isDark ? 'text-slate-500' : 'text-gray-400')}>#{task.rowIndex}</span>
                  <span className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>{task.brand}</span>
                  {isNew && <span className="inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <p className={cn('text-sm sm:text-base font-medium truncate mt-0.5', isDark ? 'text-white' : 'text-gray-900')}>{task.task}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                    <User className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {task.agent || 'Unassigned'}
                  </span>
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                    <Calendar className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {formatDate(task.due_date)}
                    {isOverdue && <span className="ml-1 text-rose-500 font-medium">(Overdue)</span>}
                  </span>
                  {hasRemarks && (
                    <span className={cn('truncate max-w-[120px] sm:max-w-[200px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      <MessageSquare className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {task.remarks}
                      {task.remarks.toLowerCase().includes('sbs') && (
                        <span className={cn('ml-1 inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-semibold', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                          <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          SBS
                        </span>
                      )}
                    </span>
                  )}
                  {task.status === 'Pending' && task.reason_for_pending && (
                    <span className={cn('truncate max-w-[120px] sm:max-w-[200px] text-[10px] sm:text-xs', isDark ? 'text-amber-400' : 'text-amber-600')}>
                      <AlertCircle className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Reason: {task.reason_for_pending}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
                <StatusBadge status={task.status} theme={theme} size="sm" />
                <Button theme={theme} variant="outline" size="sm" icon={Sparkles} onClick={(e) => handleOpenGenerator(task, e)} title="Generate Task Name" />
                {statusOptions.slice(0, 1).map((newStatus) => (
                  <StatusActionButton key={newStatus} task={task} newStatus={newStatus} />
                ))}
                {statusOptions.length > 1 && <span className={cn('text-[10px] sm:text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>+{statusOptions.length - 1}</span>}
                {isTaskAdmin && (
                  <Button theme={theme} variant="ghost" size="icon" ariaLabel="Edit task" title="Edit Task" onClick={() => onEditTask(task)}>
                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  // ─── RENDER TASKS ──────────────────────────────────────────────────────

  const renderTasks = () => {
    if (paginatedTasks.length === 0) {
      if (showOnlyNew && newTaskIds.size === 0) {
        return <EmptyState theme={theme} icon={CheckCircle2} title="All caught up!" description="You've viewed all new tasks." />;
      }
      if (hasActiveFilters) {
        return <NoResultsState theme={theme} onClear={clearFilters} />;
      }
      return <EmptyState theme={theme} icon={CheckCircle2} title="No tasks found" description="You have no tasks assigned yet." />;
    }

    switch (layoutMode) {
      case 'card':
        return renderCardView();
      case 'list':
        return renderListView();
      case 'table':
      default:
        return renderTableView();
    }
  };

  const renderSkeleton = () => {
    if (layoutMode === 'table') return <TableSkeleton theme={theme} columns={viewMode === 'all' ? 8 : 7} />;
    return <CardSkeleton theme={theme} />;
  };

  const activeCount = filteredAndSortedTasks.length;
  const totalCount = activeTasks.length;

  const dateChips: { key: typeof filterDateRange; label: string; emoji: string; activeClass: string }[] = [
    { key: 'all', label: 'All Dates', emoji: '', activeClass: isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300' },
    { key: 'unassigned', label: 'Unassigned', emoji: '👤', activeClass: isDark ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-violet-100 text-violet-700 border border-violet-300' },
    { key: 'overdue', label: 'Overdue', emoji: '🔴', activeClass: isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-300' },
    { key: 'today', label: 'Today', emoji: '📅', activeClass: isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300' },
    { key: 'week', label: 'Next 7 Days', emoji: '📅', activeClass: isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-300' },
    { key: 'month', label: 'This Month', emoji: '📅', activeClass: isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
  ];

  // ─── MAIN RENDER ───────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {toastContainer}

      {/* New Task Notification Banner */}
      <AnimatePresence>
        {showNewTaskNotification && newTaskIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              'fixed top-4 right-4 z-50 rounded-2xl border shadow-2xl p-4 sm:p-5 max-w-[calc(100vw-2rem)] sm:max-w-md',
              isDark ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-emerald-300'
            )}
            role="alert"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-full bg-emerald-500/20 p-2 sm:p-2.5 flex-shrink-0">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-base sm:text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                  {newTaskIds.size} New Task{newTaskIds.size > 1 ? 's' : ''} Added!
                </p>
                <p className={cn('text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>Click refresh to see them in your list</p>
              </div>
              <button
                onClick={() => setShowNewTaskNotification(false)}
                aria-label="Dismiss"
                className={cn('rounded p-1.5 sm:p-2 transition-colors flex-shrink-0', focusRing, isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100')}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="mt-3">
              <Button theme={theme} variant="primary" size="sm" icon={RefreshCw} onClick={onRefresh}>
                Refresh Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TAB NAVIGATION ────────────────────────────────────────────────── */}
      <div className={cn('border-b flex-shrink-0', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
        <div className="flex p-2 sm:p-3 gap-2" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              focusRing,
              activeTab === 'tasks'
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <List className="h-4 w-4" />
            Task List
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs',
                activeTab === 'tasks' ? (isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800') : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
              )}
            >
              {viewMode === 'all' ? allTasks.length : tasks.length}
            </span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'completion'}
            onClick={() => setActiveTab('completion')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              focusRing,
              activeTab === 'completion'
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Completion Tracker
          </button>
        </div>
      </div>

      {/* ─── CONDITIONAL CONTENT ────────────────────────────────────────── */}
      {activeTab === 'completion' ? (
        <div className="flex-1 overflow-hidden">
          <AgentCompletionTracker theme={theme} currentUserEmail={currentUserEmail} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* ─── DASHBOARD HEADER ────────────────────────────────────────── */}
          <DashboardHeader
            isDark={isDark}
            totalTasks={stats.total}
            completedToday={stats.completed}
            pendingCount={stats.pending}
            overdueCount={stats.overdue}
            completionRate={stats.completionRate}
            userName={currentUserName}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />

          {/* ─── ANALYTICS CARDS ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <AnalyticsCard
              title="Total Tasks"
              value={stats.total}
              icon={<List className="h-5 w-5" />}
              color="text-blue-500"
              gradient="bg-gradient-to-r from-blue-500 to-blue-400"
              isDark={isDark}
              delay={0}
              subtitle={`${viewMode === 'all' ? 'All' : 'Your'} tasks`}
            />
            <AnalyticsCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-emerald-500"
              gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
              isDark={isDark}
              delay={1}
              subtitle={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% of total`}
              trend={5}
            />
            <AnalyticsCard
              title="Pending"
              value={stats.pending}
              icon={<Clock className="h-5 w-5" />}
              color="text-amber-500"
              gradient="bg-gradient-to-r from-amber-500 to-amber-400"
              isDark={isDark}
              delay={2}
              subtitle="Awaiting action"
              trend={-2}
            />
            <AnalyticsCard
              title="Overdue"
              value={stats.overdue}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="text-rose-500"
              gradient="bg-gradient-to-r from-rose-500 to-rose-400"
              isDark={isDark}
              delay={3}
              subtitle="Past due date"
              trend={3}
            />
          </div>

          {/* ─── TASK LIST HEADER ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {viewMode === 'all' ? 'All Tasks' : 'My Tasks'}
                {newTaskIds.size > 0 && viewMode === 'all' && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm font-semibold text-emerald-500 align-middle">
                    <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    {newTaskIds.size} new
                  </span>
                )}
              </h2>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {viewMode === 'all' ? `All ${totalCount} tasks in tracker` : currentUserName || currentUserEmail ? `Tasks assigned to ${currentUserName || currentUserEmail}` : 'No user logged in'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Button theme={theme} variant="outline" isLoading={isLoading} icon={RefreshCw} onClick={onRefresh}>
                <span className="hidden xs:inline">Refresh</span>
              </Button>

              <Button
                theme={theme}
                variant={viewMode === 'all' ? 'primary' : 'outline'}
                icon={viewMode === 'all' ? Eye : EyeOff}
                onClick={() => onViewModeChange(viewMode === 'all' ? 'mine' : 'all')}
                className={viewMode === 'all' ? (isDark ? '!bg-emerald-500/10 !text-emerald-400 !shadow-none border !border-emerald-500/40' : '!bg-emerald-50 !text-emerald-700 !shadow-none border !border-emerald-300') : ''}
              >
                <span className="hidden xs:inline">{viewMode === 'all' ? 'Viewing All' : 'View All'}</span>
              </Button>

              {isTaskAdmin && (
                <Button theme={theme} variant="primary" icon={Plus} onClick={onAddTask}>
                  <span className="hidden xs:inline">Add Task</span>
                </Button>
              )}
            </div>
          </div>

          {/* ─── FILTER TOOLBAR ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className={cn('absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5', isDark ? 'text-slate-400' : 'text-gray-400')} />
                <input
                  type="text"
                  placeholder="Search by row#, task, brand, agent, due date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search tasks"
                  className={cn('w-full rounded-xl border pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base transition-all duration-200', focusRing, isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400')}
                />
                <span className={cn('absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs hidden md:block', isDark ? 'text-slate-500' : 'text-gray-400')}>
                  💡 Try: Dec 25, 12/25, 2024-12-25
                </span>
              </div>

              <Button
                theme={theme}
                variant={showFilters || hasActiveFilters ? 'primary' : 'outline'}
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
                className={cn('flex-shrink-0', showFilters || hasActiveFilters ? (isDark ? '!bg-emerald-500/10 !text-emerald-400 !shadow-none border !border-emerald-500/40' : '!bg-emerald-50 !text-emerald-700 !shadow-none border !border-emerald-300') : '')}
              >
                <span className="hidden xs:inline">Filters</span>
                {(filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all') && (
                  <span className="ml-1 rounded-full bg-emerald-500 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs text-white">
                    {[filterStatus, filterBrand, filterAgent].filter((f) => f !== 'all').length}
                  </span>
                )}
              </Button>

              <div className={cn('flex rounded-xl border overflow-hidden flex-shrink-0', isDark ? 'border-slate-700' : 'border-gray-200')}>
                {[
                  { mode: 'table' as const, Icon: Table, label: 'Table View' },
                  { mode: 'card' as const, Icon: LayoutGrid, label: 'Card View' },
                  { mode: 'list' as const, Icon: List, label: 'List View' },
                ].map(({ mode, Icon, label }, i) => (
                  <button
                    key={mode}
                    onClick={() => setLayoutMode(mode)}
                    title={label}
                    aria-label={label}
                    aria-pressed={layoutMode === mode}
                    className={cn(
                      'px-2.5 sm:px-4 py-2 sm:py-3 text-sm transition-all',
                      focusRing,
                      i > 0 && (isDark ? 'border-l border-slate-700' : 'border-l border-gray-200'),
                      layoutMode === mode ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap',
                    focusRing,
                    filterStatus === 'all'
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  All ({taskCounts.all || 0})
                </button>

                {Object.keys(taskCounts)
                  .filter((k) => k !== 'all')
                  .sort()
                  .map((status) => {
                    const count = taskCounts[status] || 0;
                    const isActive = filterStatus === status;

                    return (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap',
                          focusRing,
                          isActive
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : isDark
                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <span>{status}</span>
                        <span
                          className={cn(
                            'ml-1 sm:ml-2 rounded-full px-1 sm:px-2 py-0.5 text-[8px] sm:text-xs',
                            isActive ? (isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800') : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setShowOnlyNew(!showOnlyNew)}
                  className={cn(
                    'inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap',
                    focusRing,
                    showOnlyNew
                      ? isDark
                        ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{showOnlyNew ? 'Showing New Tasks' : 'Show New Tasks'}</span>
                  {newTaskIds.size > 0 && (
                    <span className={cn('ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs', showOnlyNew ? (isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800') : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}>
                      {newTaskIds.size}
                    </span>
                  )}
                </button>

                {newTaskIds.size > 0 && (
                  <button
                    onClick={onMarkAllViewed}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap',
                      focusRing,
                      isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    )}
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Mark All Viewed</span>
                  </button>
                )}

                {dateChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => {
                      setFilterDateRange(chip.key);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap',
                      focusRing,
                      filterDateRange === chip.key ? chip.activeClass : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {chip.emoji && <span className="mr-1">{chip.emoji}</span>}
                    {chip.label}
                  </button>
                ))}

                <button
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                  className={cn(
                    'px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap inline-flex items-center gap-1',
                    focusRing,
                    filterDateRange === 'custom'
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Custom Range</span>
                  {filterDateRange === 'custom' && (
                    <span className="ml-1 text-[10px] opacity-70 hidden lg:inline">
                      ({customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - {customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'})
                    </span>
                  )}
                </button>

                {filterDateRange !== 'all' && (
                  <button
                    onClick={clearCustomDateRange}
                    className={cn('px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap', focusRing, isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 inline" /> Clear
                  </button>
                )}
              </div>

              {showDateRangePicker && (
                <Card theme={theme} className="mt-1 sm:mt-2 p-3 sm:p-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 w-full sm:w-auto">
                      <FieldLabel theme={theme}>Start Date</FieldLabel>
                      <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} className={inputClasses(theme)} />
                    </div>
                    <div className="flex-1 w-full sm:w-auto">
                      <FieldLabel theme={theme}>End Date</FieldLabel>
                      <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} className={inputClasses(theme)} />
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-6">
                      <Button theme={theme} variant="primary" icon={Check} disabled={!customDateStart || !customDateEnd} onClick={applyCustomDateRange} className="flex-1 sm:flex-none">
                        Apply
                      </Button>
                      <Button theme={theme} variant="secondary" onClick={() => setShowDateRangePicker(false)} className="flex-1 sm:flex-none">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {showFilters && (
              <Card theme={theme} className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                <div>
                  <FieldLabel theme={theme}>Brand</FieldLabel>
                  <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={inputClasses(theme)}>
                    <option value="all">All Brands</option>
                    {uniqueBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel theme={theme}>Agent</FieldLabel>
                  <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className={inputClasses(theme)}>
                    <option value="all">All Agents</option>
                    {uniqueAgents.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button theme={theme} variant="secondary" onClick={clearFilters} className="w-full">
                    Clear All Filters
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* ─── TASK LIST ────────────────────────────────────────────────── */}
          {isLoading && activeTasks.length === 0 ? renderSkeleton() : renderTasks()}

          {/* ─── PAGINATION ────────────────────────────────────────────────── */}
          <div className={cn('border-t pt-3 sm:pt-4 flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
            <span className={cn('text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
              Showing {paginatedTasks.length} of {activeCount} tasks
              {filteredAndSortedTasks.length !== activeTasks.length && ` (filtered from ${activeTasks.length})`}
              {showOnlyNew && (
                <span className={cn('ml-2 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-xs', isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}>🆕 New Tasks</span>
              )}
              {filterDateRange !== 'all' && (
                <span
                  className={cn(
                    'ml-2 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-xs',
                    filterDateRange === 'unassigned'
                      ? isDark
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-violet-100 text-violet-700'
                      : filterDateRange === 'overdue'
                      ? isDark
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-rose-100 text-rose-700'
                      : filterDateRange === 'custom'
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDark
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {filterDateRange === 'unassigned'
                    ? '👤 Unassigned'
                    : filterDateRange === 'overdue'
                    ? '🔴 Overdue'
                    : filterDateRange === 'today'
                    ? '📅 Today'
                    : filterDateRange === 'week'
                    ? '📅 Next 7 Days'
                    : filterDateRange === 'month'
                    ? '📅 This Month'
                    : filterDateRange === 'custom'
                    ? `📅 ${customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - ${customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'}`
                    : ''}
                </span>
              )}
            </span>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {newTaskIds.size > 0 && (
                <button onClick={onMarkAllViewed} className={cn('text-xs sm:text-sm font-medium transition-colors', focusRing, isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700')}>
                  Mark all viewed
                </button>
              )}

              {totalPages > 1 && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className={cn('p-1 sm:p-2 rounded transition-colors', focusRing, currentPage === 1 ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200')}
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>

                  <span className={cn('text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    className={cn('p-1 sm:p-2 rounded transition-colors', focusRing, currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200')}
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              )}

              <span className={cn('text-[10px] sm:text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>{isLoading ? 'Refreshing...' : `Updated: ${new Date().toLocaleTimeString()}`}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {showGenerator && selectedTaskForGenerator && (
        <TaskNameGeneratorModal isOpen={showGenerator} onClose={() => setShowGenerator(false)} task={selectedTaskForGenerator} theme={theme} />
      )}

      {showPendingReasonModal && pendingTaskId && (
        <ReasonForPendingModal
          isOpen={showPendingReasonModal}
          onClose={() => {
            setShowPendingReasonModal(false);
            setPendingTaskId(null);
            setPendingStatusTarget('Pending');
          }}
          onConfirm={handlePendingConfirm}
          task={tasks.find((t) => t.id === pendingTaskId) || allTasks.find((t) => t.id === pendingTaskId) || null}
          theme={theme}
          isSubmitting={isSubmittingPending}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} theme={theme} maxWidth="max-w-3xl" labelledBy="task-detail-title">
          <ModalHeader
            icon={CheckCircle2}
            title="Task Details"
            subtitle={`#${selectedTask.rowIndex} · ${selectedTask.task}`}
            onClose={() => setShowTaskModal(false)}
            theme={theme}
            titleId="task-detail-title"
          />

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {isTaskAdmin && (
              <div className="flex justify-end">
                <Button
                  theme={theme}
                  variant="secondary"
                  size="sm"
                  icon={Edit2}
                  onClick={() => {
                    setTaskFormError(null);
                    setShowEditTaskModal(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Brand</label>
                <p className={cn('text-base sm:text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{selectedTask.brand}</p>
              </div>
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Type</label>
                <p className={cn('text-base sm:text-lg', isDark ? 'text-white' : 'text-gray-900')}>{selectedTask.type}</p>
              </div>
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Agent</label>
                <p className={cn('text-base sm:text-lg', isDark ? 'text-white' : 'text-gray-900')}>{selectedTask.agent || 'N/A'}</p>
              </div>
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Date Requested</label>
                <p className={cn('text-base sm:text-lg', isDark ? 'text-white' : 'text-gray-900')}>{formatDate(selectedTask.date_requested)}</p>
              </div>
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Due Date</label>
                <p className={cn('text-base sm:text-lg', isDark ? 'text-white' : 'text-gray-900')}>{formatDate(selectedTask.due_date)}</p>
              </div>
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedTask.status} theme={theme} size="lg" />
                </div>
              </div>
            </div>

            {selectedTask.remarks && (
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Remarks</label>
                <p className={cn('text-sm sm:text-base mt-1', isDark ? 'text-white' : 'text-gray-900')}>{selectedTask.remarks}</p>
                {selectedTask.remarks.toLowerCase().includes('sbs') && (
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold mt-2', isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    SBS - Side by Side Observing
                  </span>
                )}
              </div>
            )}

            {selectedTask.reason_for_pending && (
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>Reason for Pending</label>
                <div className={cn('mt-1 sm:mt-2 rounded-lg border p-3 sm:p-4', isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50')}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Clock className={cn('h-4 w-4 sm:h-5 sm:w-5 mt-0.5', isDark ? 'text-amber-400' : 'text-amber-600')} />
                    <p className={cn('text-sm sm:text-base', isDark ? 'text-white' : 'text-gray-900')}>{selectedTask.reason_for_pending}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedTask.bc_links && (
              <div>
                <label className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>BC Links</label>
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
                      <span key={index} className={cn('text-sm sm:text-base', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        {trimmedLink}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ModalFooter theme={theme} align="between">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className={cn('text-xs sm:text-sm font-medium w-full sm:w-auto', isDark ? 'text-slate-400' : 'text-gray-500')}>Change Status:</span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                {VALID_TASK_STATUSES.map((statusOption) => {
                  const isCurrent = statusOption === selectedTask.status;

                  if (isCurrent) {
                    return (
                      <span key={statusOption} className={cn('border-2 rounded-full', isDark ? 'border-emerald-500/50' : 'border-emerald-400')}>
                        <StatusBadge status={statusOption} theme={theme} />
                      </span>
                    );
                  }

                  return (
                    <Button
                      key={statusOption}
                      theme={theme}
                      variant="secondary"
                      size="sm"
                      isLoading={updatingTaskId === selectedTask.id}
                      onClick={() => onUpdateStatus(selectedTask.id, statusOption)}
                    >
                      {statusOption}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Button theme={theme} variant="secondary" onClick={() => setShowTaskModal(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Add Task Modal */}
      <TaskFormModal isOpen={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} onSubmit={addNewTask} isSubmitting={isSavingTask} theme={theme} mode="add" error={taskFormError} />

      {/* Edit Task Modal */}
      <TaskFormModal
        isOpen={showEditTaskModal}
        onClose={() => setShowEditTaskModal(false)}
        onSubmit={saveTaskEdits}
        isSubmitting={isSavingTask}
        theme={theme}
        mode="edit"
        error={taskFormError}
        initialValues={
          selectedTask
            ? {
                dateRequested: selectedTask.date_requested ? new Date(selectedTask.date_requested).toISOString().split('T')[0] : '',
                type: selectedTask.type,
                task: selectedTask.task,
                brand: BRAND_OPTIONS.includes(selectedTask.brand) ? selectedTask.brand : '__OTHER__',
                customBrand: BRAND_OPTIONS.includes(selectedTask.brand) ? '' : selectedTask.brand,
                agent: selectedTask.agent,
                dueDate: selectedTask.due_date ? new Date(selectedTask.due_date).toISOString().split('T')[0] : '',
                status: selectedTask.status,
                remarks: selectedTask.remarks,
                bcLinks: selectedTask.bc_links || '',
              }
            : undefined
        }
      />
    </div>
  );
}