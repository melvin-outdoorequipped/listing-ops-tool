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

// ─── TASK NAME GENERATOR MODAL ─────────────────────────────────────────────

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

// ─── REASON FOR PENDING MODAL ─────────────────────────────────────────────

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

// ─── MEMBER ROULETTE MODAL ─────────────────────────────────────────────────

interface MemberRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

// Storage keys for member roulette
const ROULETTE_STORAGE_KEY = 'roulette_members';
const ROULETTE_SELECTED_KEY = 'roulette_selected';

const loadMembersFromStorage = (): TeamMember[] => {
  if (typeof window === 'undefined') return defaultTeamMembers;
  const stored = localStorage.getItem(ROULETTE_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const merged = defaultTeamMembers.map(defaultMember => {
        const existing = parsed.find((m: TeamMember) => m.name === defaultMember.name);
        return existing || defaultMember;
      });
      const customMembers = parsed.filter((m: TeamMember) => !defaultTeamMembers.find(dm => dm.name === m.name));
      return [...merged, ...customMembers];
    } catch {
      return defaultTeamMembers;
    }
  }
  return defaultTeamMembers;
};

const saveMembersToStorage = (members: TeamMember[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROULETTE_STORAGE_KEY, JSON.stringify(members));
};

const loadSelectedFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ROULETTE_SELECTED_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const saveSelectedToStorage = (selected: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROULETTE_SELECTED_KEY, JSON.stringify(selected));
};

export function MemberRouletteModal({ isOpen, onClose, theme }: MemberRouletteModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [rotation, setRotation] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allMembersSelected, setAllMembersSelected] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [currentWheelMembers, setCurrentWheelMembers] = useState<TeamMember[]>([]);
  const [flashWinner, setFlashWinner] = useState(false);

  const isDark = theme === 'dark';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Load members from storage on mount
  useEffect(() => {
    const loadedMembers = loadMembersFromStorage();
    const loadedSelected = loadSelectedFromStorage();
    setMembers(loadedMembers);

    const validSelected = loadedSelected.filter(name =>
      loadedMembers.some(m => m.name === name && m.includeInRoulette)
    );
    setSelectedMembers(validSelected);

    const eligible = loadedMembers.filter(m => m.includeInRoulette);
    setAllMembersSelected(validSelected.length === eligible.length);
    setCurrentWheelMembers(eligible.filter(m => !validSelected.includes(m.name)));
  }, []);

  // Save members to storage when they change
  useEffect(() => {
    if (members.length > 0) {
      saveMembersToStorage(members);
    }
  }, [members]);

  // Save selected members to storage when they change
  useEffect(() => {
    saveSelectedToStorage(selectedMembers);
  }, [selectedMembers]);

  const eligibleMembers = members.filter(m => m.includeInRoulette);
  const getAvailableMembers = () => {
    return eligibleMembers.filter(m => !selectedMembers.includes(m.name));
  };

  const spinRoulette = () => {
    if (isSpinning) return;

    const availableMembers = getAvailableMembers();
    if (availableMembers.length === 0) return;

    setCurrentWheelMembers(availableMembers);
    setIsSpinning(true);
    setSelectedMember(null);
    setShowConfetti(false);
    setFlashWinner(false);

    const finalMember = availableMembers[Math.floor(Math.random() * availableMembers.length)];
    const finalIndex = availableMembers.findIndex(m => m.name === finalMember.name);
    const segmentAngle = 360 / availableMembers.length;
    const targetSliceCenter = (finalIndex * segmentAngle) + (segmentAngle / 2);
    let targetRotation = (360 - targetSliceCenter) % 360;
    const variance = (Math.random() - 0.5) * (segmentAngle * 0.6);
    targetRotation = ((targetRotation + variance) % 360 + 360) % 360;
    const currentMod = rotation % 360;
    let rotationNeeded = (targetRotation - currentMod + 360) % 360;
    const duration = 6500 + Math.random() * 1500;
    const fullSpins = 10 + Math.floor(Math.random() * 5);
    const targetRotationValue = rotation + (fullSpins * 360) + rotationNeeded;

    let startTime = Date.now();
    const startRotation = rotation;
    const rotationDelta = targetRotationValue - startRotation;

    const animateSpin = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const newRotation = startRotation + (rotationDelta * easeOutQuart);
      setRotation(newRotation);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setRotation(targetRotationValue);
        const winner = finalMember;
        if (winner) {
          setSelectedMember(winner);
          setFlashWinner(true);
          const newSelectedMembers = [...selectedMembers, winner.name];
          setSelectedMembers(newSelectedMembers);
          if (newSelectedMembers.length === eligibleMembers.length) {
            setAllMembersSelected(true);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
          }
        }
        setIsSpinning(false);
      }
    };
    requestAnimationFrame(animateSpin);
  };

  const resetRoulette = () => {
    if (isSpinning) return;
    setSelectedMember(null);
    setSelectedMembers([]);
    setAllMembersSelected(false);
    setRotation(0);
    setShowConfetti(false);
    setFlashWinner(false);
    const eligible = members.filter(m => m.includeInRoulette);
    setCurrentWheelMembers(eligible);
  };

  const applyMemberChanges = (newMembers: TeamMember[], newSelected: string[]) => {
    setMembers(newMembers);
    setSelectedMembers(newSelected);
    const eligible = newMembers.filter(m => m.includeInRoulette);
    setCurrentWheelMembers(eligible.filter(m => !newSelected.includes(m.name)));
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: TeamMember = {
      name: newMemberName.trim(),
      role: 'Data Analyst',
      image: '',
      email: `${newMemberName.trim().toLowerCase()}@outdoorequipped.com`,
      includeInRoulette: true,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    };
    applyMemberChanges([...members, newMember], selectedMembers);
    setNewMemberName('');
    setIsEditing(false);
  };

  const removeMember = (name: string) => {
    if (name === 'Arlie') return;
    const newMembers = members.filter(m => m.name !== name);
    const newSelected = selectedMembers.filter(s => s !== name);
    applyMemberChanges(newMembers, newSelected);
  };

  const toggleIncludeInRoulette = (name: string) => {
    if (name === 'Arlie') return;
    const newMembers = members.map(m =>
      m.name === name ? { ...m, includeInRoulette: !m.includeInRoulette } : m
    );
    const member = newMembers.find(m => m.name === name);
    let newSelected = selectedMembers;
    if (member && !member.includeInRoulette) {
      newSelected = selectedMembers.filter(s => s !== name);
    }
    applyMemberChanges(newMembers, newSelected);
  };

  const modalClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const remainingCount = getAvailableMembers().length;
  const totalCount = eligibleMembers.length;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={handleBackdropClick}
    >
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {[...Array(150)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: `${Math.random() * 10 + 4}px`,
                height: `${Math.random() * 10 + 4}px`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 55%)`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 2 + 2}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}
        </div>
      )}

      <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b p-4 sm:p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 sm:p-2 animate-pulse">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className={`text-lg sm:text-xl font-semibold ${textClass}`}>Member Roulette</h3>
              <p className={`text-xs sm:text-sm ${mutedText}`}>Spin to randomly select a team member</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1.5 sm:p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 sm:h-6 sm:w-6 ${mutedText}`} />
          </button>
        </div>

        {/* Team Members Management */}
        <div className={`border-b px-4 sm:px-5 py-3 sm:py-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textClass}`}>Team Members Management</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {isEditing ? 'Done Editing' : 'Edit Members'}
            </button>
          </div>

          {isEditing && (
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter member name"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && addMember()}
                />
                <button onClick={addMember} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {members.map(member => {
              const isSelectedAlready = selectedMembers.includes(member.name);
              return (
                <div
                  key={member.name}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isEditing && member.name !== 'Arlie'
                      ? 'bg-red-500/20 text-red-400 cursor-pointer hover:bg-red-500/30'
                      : isSelectedAlready
                        ? isDark ? 'bg-slate-800 text-slate-500 opacity-60' : 'bg-gray-200 text-gray-400 opacity-60'
                        : member.includeInRoulette && member.name !== 'Arlie'
                          ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          : isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full overflow-hidden ${isSelectedAlready ? 'grayscale' : ''}`}>
                    {member.image ? (
                      <Image src={member.image} alt={member.name} width={20} height={20} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: member.color, color: 'white' }}>
                        {member.name[0]}
                      </div>
                    )}
                  </div>
                  <span>{member.name} {isSelectedAlready && <Check className="inline w-3 h-3 ml-0.5 mb-0.5" />}</span>
                  {member.name !== 'Arlie' && (
                    <>
                      <button onClick={() => toggleIncludeInRoulette(member.name)} className="ml-1 rounded-full p-0.5 transition-colors" title={member.includeInRoulette ? "Remove from roulette" : "Add to roulette"}>
                        {member.includeInRoulette ? '🎲' : '⭕'}
                      </button>
                      {isEditing && (
                        <button onClick={() => removeMember(member.name)} className="ml-1 rounded-full p-0.5 hover:bg-red-500/20 transition-colors" title="Remove member">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selection Progress */}
        <div className={`border-b px-4 sm:px-5 py-3 sm:py-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${mutedText}`}>Selection Progress</span>
              <button
                onClick={resetRoulette}
                disabled={isSpinning || selectedMembers.length === 0}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                  isSpinning || selectedMembers.length === 0
                    ? 'opacity-50 cursor-not-allowed' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className="h-3 w-3" /> Reset All
              </button>
            </div>
            <span className={`text-xs ${textClass}`}>
              <span className="font-bold text-emerald-400">{selectedMembers.length}</span> / {totalCount} selected
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(selectedMembers.length / totalCount) * 100}%` }} />
          </div>
        </div>

        {/* Wheel */}
        <div className="p-6 sm:p-8">
          <div className="relative flex justify-center">
            <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{
              background: 'conic-gradient(from 0deg, #378ADD, #1D9E75, #7F77DD, #BA7517, #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899)',
            }} />

            <div className="absolute -top-6 left-1/2 z-20 -translate-x-1/2" style={{ transformOrigin: 'top center' }}>
              <div className={`h-10 w-0 border-x-[16px] border-t-[28px] border-x-transparent border-t-red-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform duration-75 ${isSpinning ? 'animate-bounce' : ''}`} />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-red-300 shadow-lg" />
            </div>

            <div
              className="relative h-64 w-64 sm:h-80 sm:w-80 rounded-full shadow-2xl cursor-pointer ring-8 ring-slate-800 transition-colors"
              style={{
                transform: `rotate(${rotation}deg)`,
                background: currentWheelMembers.length > 0
                  ? `conic-gradient(from 0deg, ${currentWheelMembers.map((member, i) => {
                      const startAngle = (i / currentWheelMembers.length) * 360;
                      const endAngle = ((i + 1) / currentWheelMembers.length) * 360;
                      return `${member.color} ${startAngle}deg ${endAngle}deg`;
                    }).join(', ')})`
                  : '#334155',
                boxShadow: isSpinning ? '0 0 40px rgba(255,255,255,0.2)' : '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-slate-700/50"
                style={{
                  background: currentWheelMembers.length > 0
                    ? `repeating-conic-gradient(from 0deg, transparent 0deg, transparent calc(360deg / ${currentWheelMembers.length} - 2deg), rgba(255,255,255,0.3) calc(360deg / ${currentWheelMembers.length} - 2deg), rgba(255,255,255,0.3) calc(360deg / ${currentWheelMembers.length}))`
                    : 'none'
                }}
              />

              {currentWheelMembers.map((member, index) => {
                const sliceCenterAngle = (index / currentWheelMembers.length) * 360 + (360 / currentWheelMembers.length / 2);
                const radius = 100;
                const isCurrentWinner = flashWinner && selectedMember?.name === member.name;

                return (
                  <div
                    key={member.name}
                    className={`absolute left-1/2 top-1/2 flex flex-col items-center text-center transition-all duration-300 ${isCurrentWinner ? 'scale-125 z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''}`}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${sliceCenterAngle}deg) translateY(-${radius}px) rotate(-${sliceCenterAngle}deg)`,
                    }}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg flex items-center justify-center overflow-hidden border-2 ${isCurrentWinner ? 'border-yellow-400 bg-yellow-100 ring-4 ring-yellow-400/50' : 'border-white bg-white/95'}`}>
                      {member.image ? (
                        <Image src={member.image} alt={member.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: member.color }}>{member.name[0]}</span>
                      )}
                    </div>
                    <span className={`mt-1 text-[8px] sm:text-[10px] font-semibold text-white drop-shadow-md px-1.5 py-0.5 rounded-full ${isCurrentWinner ? 'bg-yellow-500/90 text-slate-900 border border-yellow-300' : 'bg-black/60'}`}>
                      {member.name}
                    </span>
                  </div>
                );
              })}

              <div className="absolute left-1/2 top-1/2 h-16 w-16 sm:h-20 sm:w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 shadow-[inset_0_4px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center border-4 border-slate-600 z-10">
                <div className="text-center w-full h-full flex flex-col items-center justify-center rounded-full bg-slate-800 inner-shadow">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-inner mb-0.5" />
                  <span className="text-[6px] sm:text-[8px] text-slate-300 block font-bold tracking-widest">SPIN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 flex justify-center gap-3">
            <button
              onClick={spinRoulette}
              disabled={isSpinning || remainingCount === 0 || eligibleMembers.length === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-6 sm:px-10 py-3 sm:py-4 font-bold text-base sm:text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                isSpinning || remainingCount === 0 || eligibleMembers.length === 0
                  ? 'cursor-not-allowed opacity-50 bg-slate-600 scale-100'
                  : isDark
                    ? 'bg-gradient-to-b from-purple-500 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 active:translate-y-0'
                    : 'bg-gradient-to-b from-purple-400 to-pink-500 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-95 active:translate-y-0'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> Spinning...
                </>
              ) : remainingCount === 0 ? (
                <>
                  <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" /> Round Complete
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300" /> Spin the Wheel ({remainingCount} left)
                </>
              )}
            </button>
          </div>

          {selectedMember && !isSpinning && (
            <div className={`mt-6 sm:mt-8 animate-in zoom-in slide-in-from-bottom-4 duration-500 rounded-xl border-2 p-4 sm:p-5 text-center shadow-2xl ${
              isDark ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-purple-500/20' : 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-purple-50'
            }`}>
              <div className="flex items-center gap-4 sm:gap-5 justify-center">
                <div className="flex-shrink-0 relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-yellow-400 shadow-xl">
                    {selectedMember.image ? (
                      <Image src={selectedMember.image} alt={selectedMember.name} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold" style={{ backgroundColor: selectedMember.color, color: 'white' }}>
                        {selectedMember.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-400 border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce">
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-900" />
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Winner Selected!</p>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${textClass} mt-1`}>{selectedMember.name}</p>
                  <p className={`text-xs sm:text-sm mt-1 ${mutedText}`}>{selectedMember.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
          position: absolute;
        }
      `}</style>
    </div>
  );
}

// ─── TASK FORM MODAL ───────────────────────────────────────────────────────

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

export function TaskFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialValues, 
  theme, 
  isSubmitting = false, 
  mode = 'add', 
  error = null 
}: TaskFormModalProps) {
  const [formValues, setFormValues] = useState<TaskFormValues>({
    ...emptyTaskForm,
    ...initialValues,
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen && initialValues) {
      setFormValues({
        ...emptyTaskForm,
        ...initialValues,
      });
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
  const labelClass = `block text-sm font-medium mb-1 ${textClass}`;

  const usingCustomBrand = formValues.brand === '__OTHER__';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b p-4 sm:p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`rounded-lg p-2 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              {mode === 'add' ? (
                <Plus className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <Edit2 className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              )}
            </div>
            <div>
              <h3 className={`text-lg sm:text-xl font-semibold ${textClass}`}>
                {mode === 'add' ? 'Add New Task' : 'Edit Task'}
              </h3>
              <p className={`text-xs sm:text-sm ${mutedText}`}>
                {mode === 'add'
                  ? 'This will be added as a new row in the tracker'
                  : 'Only admins can edit tasks assigned to others'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1.5 sm:p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 sm:h-6 sm:w-6 ${mutedText}`} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {error && (
            <div className={`rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              {error}
            </div>
          )}

          <div className={`rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm ${isDark ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            <Info className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 -mt-0.5" />
            Segment is auto-filled by the sheet's formula and can't be set here.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClass}>Date Requested</label>
              <input
                type="date"
                value={formValues.dateRequested}
                onChange={(e) => setFormValues({ ...formValues, dateRequested: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input
                type="date"
                value={formValues.dueDate}
                onChange={(e) => setFormValues({ ...formValues, dueDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select
                value={formValues.type}
                onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}
                className={inputClass}
              >
                <option value="">Select type...</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task *</label>
              <select
                value={formValues.task}
                onChange={(e) => setFormValues({ ...formValues, task: e.target.value })}
                className={inputClass}
              >
                <option value="">Select task...</option>
                {TASK_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Brand *</label>
              <select
                value={formValues.brand}
                onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                className={inputClass}
              >
                <option value="">Select brand...</option>
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="__OTHER__">Other (type below)</option>
              </select>
              {usingCustomBrand && (
                <input
                  type="text"
                  className={`${inputClass} mt-2`}
                  placeholder="Enter new brand name"
                  value={formValues.customBrand}
                  onChange={(e) => setFormValues({ ...formValues, customBrand: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Agent *</label>
              <select
                value={formValues.agent}
                onChange={(e) => setFormValues({ ...formValues, agent: e.target.value })}
                className={inputClass}
              >
                <option value="">Select agent...</option>
                {AGENT_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={formValues.status}
                onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                className={inputClass}
              >
                {VALID_TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>BC Links</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Enter Basecamp links (comma separated)"
              value={formValues.bcLinks}
              onChange={(e) => setFormValues({ ...formValues, bcLinks: e.target.value })}
            />
            <p className={`text-xs sm:text-sm mt-1.5 ${mutedText}`}>
              Separate multiple links with commas
            </p>
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <textarea
              className={inputClass}
              rows={3}
              value={formValues.remarks}
              onChange={(e) => setFormValues({ ...formValues, remarks: e.target.value })}
            />
          </div>

          {/* Footer */}
          <div className={`flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formValues.task || !formValues.agent || (!formValues.brand || (usingCustomBrand && !formValues.customBrand.trim()))}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-white transition-all ${
                isSubmitting ? 'opacity-50 cursor-not-allowed bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Check className="h-4 w-4 sm:h-5 sm:w-5" />}
              {mode === 'add' ? 'Add Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}