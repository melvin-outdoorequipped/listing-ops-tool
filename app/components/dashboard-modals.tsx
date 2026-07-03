// components/dashboard-modals.ts

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  X,
  Clock,
  Loader2,
  Info,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  RotateCcw,
  Award,
  Trophy,
  Eye,
  EyeOff,
  Bell,
  Calendar,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import {
  Task,
  TaskFormValues,
  TeamMember,
  defaultTeamMembers,
  emptyTaskForm,
  formatDate,
  getUserImage,
} from './dashboard-utils';
import {
  TYPE_OPTIONS,
  TASK_OPTIONS,
  BRAND_OPTIONS,
  AGENT_OPTIONS,
  VALID_TASK_STATUSES,
} from '../../lib/task-option';
import {
  findCategoryByTaskName,
  generateTaskName,
  pushRecentTaskName,
  loadRecentTaskNames,
  RecentTaskName,
} from '../../lib/td-task-names';

interface TaskNameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  theme: 'light' | 'dark';
}

export function TaskNameGeneratorModal({ isOpen, onClose, task, theme }: TaskNameGeneratorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTaskName[]>([]);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen && task) {
      setRecentTasks(loadRecentTaskNames(task.agent || 'default'));
    }
  }, [isOpen, task]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !task) return null;

  const category = findCategoryByTaskName(task.task);
  const templates = category?.templates || [];
  const filteredTemplates = searchQuery.trim()
    ? templates.filter((t) =>
        generateTaskName(t, { brand: task.brand, agent: task.agent })
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : templates;

  const handleCopy = (template: string) => {
    const generated = generateTaskName(template, { brand: task.brand, agent: task.agent });
    navigator.clipboard.writeText(generated);
    setCopiedTemplate(template);
    setCopiedText(generated);
    setTimeout(() => {
      setCopiedTemplate(null);
      setCopiedText(null);
    }, 2000);

    pushRecentTaskName(task.agent || 'default', {
      text: generated,
      category: task.task,
      timestamp: Date.now(),
    });
    setRecentTasks(loadRecentTaskNames(task.agent || 'default'));
  };

  const handleCopyRecent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const modalClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputClass = isDark
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>TD Task Name Generator</h3>
              <p className={`text-xs ${mutedText}`}>Generate task names for {task.brand} · {task.task}</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${mutedText}`} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${mutedText}`} />
            <input
              type="text"
              placeholder="Search task names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm ${inputClass}`}
              autoFocus
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`text-[10px] ${mutedText}`}>Brand:</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{task.brand}</span>
            <span className={`text-[10px] ${mutedText}`}>Agent:</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>{task.agent || 'Unassigned'}</span>
            <span className={`text-[10px] ${mutedText}`}>Category:</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>{category?.category || 'Unknown'}</span>
          </div>
        </div>

        {recentTasks.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            <p className={`text-xs font-medium ${mutedText} mb-2`}>Recent Task Names</p>
            <div className="flex flex-wrap gap-2">
              {recentTasks.slice(0, 4).map((recent, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyRecent(recent.text)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all group ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  <span className="truncate max-w-[150px]">{recent.text}</span>
                  {copiedText === recent.text ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className={`h-8 w-8 ${mutedText} opacity-30`} />
              <p className={`mt-2 text-sm ${textClass}`}>No templates found</p>
              <p className={`text-xs ${mutedText}`}>Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredTemplates.map((template, idx) => {
                const generated = generateTaskName(template, { brand: task.brand, agent: task.agent });
                const isCopied = copiedTemplate === template;
                return (
                  <button
                    key={idx}
                    onClick={() => handleCopy(template)}
                    className={`group flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:shadow-md ${isCopied ? (isDark ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50') : (isDark ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50')}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCopied ? 'text-emerald-400' : textClass}`}>{generated}</p>
                      {template.includes('[specify what file]') && (
                        <p className={`text-[10px] ${mutedText} mt-0.5`}>⚠️ Contains editable placeholder — edit before using</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {isCopied ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <Check className="h-4 w-4" />
                          Copied!
                        </span>
                      ) : (
                        <Copy className={`h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 ${mutedText}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-between items-center`}>
          <span className={`text-[10px] ${mutedText}`}>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available · Press ESC to close
          </span>
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReasonForPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  task: Task | null;
  theme: 'light' | 'dark';
  isSubmitting: boolean;
}

export function ReasonForPendingModal({ isOpen, onClose, onConfirm, task, theme, isSubmitting }: ReasonForPendingModalProps) {
  const [reason, setReason] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !task) return null;

  const modalClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputClass = isDark
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const handleSubmit = () => {
    if (reason.trim()) onConfirm(reason.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (reason.trim()) onConfirm(reason.trim());
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-yellow-500/20 p-1.5">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>Reason for Pending</h3>
              <p className={`text-xs ${mutedText}`}>{task.task} · {task.brand}</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${mutedText}`} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={`mb-1.5 block text-sm font-medium ${textClass}`}>Why is this task being set to Pending?</label>
            <textarea
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
              rows={4}
              placeholder="Enter the reason for pending status..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <p className={`mt-1 text-xs ${mutedText}`}>
              Press <kbd className={`rounded border px-1.5 py-0.5 text-[10px] ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-gray-100'}`}>Enter</kbd> to submit, <kbd className={`rounded border px-1.5 py-0.5 text-[10px] ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-gray-100'}`}>Esc</kbd> to cancel
            </p>
          </div>
        </div>

        <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button onClick={onClose} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${isSubmitting || !reason.trim() ? 'opacity-50 cursor-not-allowed bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Set to Pending
          </button>
        </div>
      </div>
    </div>
  );
}

interface MemberRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export function MemberRouletteModal({ isOpen, onClose, theme }: MemberRouletteModalProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const modalClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className={`font-semibold ${textClass}`}>Member Roulette</h3>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${mutedText}`} />
          </button>
        </div>
        <div className="p-6 text-center">
          <p className={`text-sm ${mutedText}`}>Member roulette feature</p>
        </div>
      </div>
    </div>
  );
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  initialValues?: Partial<TaskFormValues>;
  theme: 'light' | 'dark';
  isSubmitting?: boolean;
  mode?: 'add' | 'edit';
  error?: string | null;
}

export function TaskFormModal({ isOpen, onClose, onSubmit, initialValues, theme, isSubmitting, mode = 'add', error }: TaskFormModalProps) {
  const [formValues, setFormValues] = useState<TaskFormValues>(
    initialValues as TaskFormValues || emptyTaskForm
  );
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen && initialValues) {
      setFormValues(initialValues as TaskFormValues);
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formValues);
  };

  if (!isOpen) return null;

  const modalClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputClass = isDark
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className={`font-semibold ${textClass}`}>Task Form</h3>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${mutedText}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textClass}`}>Date Requested</label>
              <input
                type="date"
                value={formValues.dateRequested}
                onChange={(e) => setFormValues({ ...formValues, dateRequested: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textClass}`}>Type</label>
              <input
                type="text"
                value={formValues.type}
                onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                placeholder="Task type"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textClass}`}>Task</label>
            <input
              type="text"
              value={formValues.task}
              onChange={(e) => setFormValues({ ...formValues, task: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
              placeholder="Task name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textClass}`}>Brand</label>
              <input
                type="text"
                value={formValues.brand}
                onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textClass}`}>Agent</label>
              <input
                type="text"
                value={formValues.agent}
                onChange={(e) => setFormValues({ ...formValues, agent: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
              />
            </div>
          </div>

          <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-2`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}