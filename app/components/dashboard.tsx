// components/dashboard-client.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Loader2,
  MessageSquare,
  RefreshCw,
  SearchCheck,
  TrendingUp,
  User,
  Trophy,
  Medal,
  Crown,
  Users,
  FileSpreadsheet,
  Building2,
  Wrench,
  RotateCcw,
  X,
  Award,
  Check,
  Sparkles,
  RefreshCw as RefreshIcon,
  Plus,
  Trash2,
  Edit2,
  Megaphone,
  Wrench as WrenchIcon,
  Clock as ClockIcon,
  Info,
  AlertCircle,
  CheckCircle,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Bell,
  Calendar,
} from 'lucide-react';
import Image from 'next/image';

import { supabase } from '../../lib/supabase/client';
import {
  ADMIN_EMAILS,
  isTaskAdminEmail,
  TYPE_OPTIONS,
  TASK_OPTIONS,
  BRAND_OPTIONS,
  AGENT_OPTIONS,
  VALID_TASK_STATUSES,
} from '../../lib/task-option';
import { NotificationBell } from './notification-bell';

// Task interface - status is a string
interface Task {
  id: string;
  date_requested: string;
  tat: string;
  segment: string;
  type: string;
  task: string;
  brand: string;
  date_assigned: string;
  agent: string;
  due_date: string;
  date_completed: string | null;
  remarks: string;
  auditor: string;
  status: string;
  bc_links: string;
  reason_for_pending: string;
  reason_for_cancel: string;
  rowIndex: number;
  isNew?: boolean;
}

interface DashboardClientProps {
  initialTasks?: any[];
  theme?: 'light' | 'dark';
  currentUserEmail?: string;
  currentUserName?: string;
}

interface ToolRun {
  id: string;
  tool_type: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer' | 'get-brand';
  status: 'completed' | 'failed' | 'warning';
  title: string;
  description: string | null;
  total_count: number;
  success_count: number;
  issue_count: number;
  filename: string | null;
  created_at: string;
  user_email?: string;
}

interface TeamMember {
  name: string;
  role: string;
  image: string;
  email: string;
  includeInRoulette: boolean;
  color: string;
}

// Default team members data
const defaultTeamMembers: TeamMember[] = [
  { name: 'Arlie', role: 'Team Manager', image: '/images/arlie.png', email: 'arlie@outdoorequipped.com', includeInRoulette: false, color: '#6366f1' },
  { name: 'Melvin', role: 'Data Analyst', image: '/images/Melvin.png', email: 'melvin@outdoorequipped.com', includeInRoulette: true, color: '#378ADD' },
  { name: 'Janroe', role: 'Data Analyst', image: '/images/janroe.png', email: 'jbermoy@outdoorequipped.com', includeInRoulette: true, color: '#1D9E75' },
  { name: 'Florante', role: 'Data Analyst', image: '/images/florante.png', email: 'florante@outdoorequipped.com', includeInRoulette: true, color: '#7F77DD' },
  { name: 'Jerald', role: 'Data Analyst', image: '/images/jerald.png', email: 'jerald@outdoorequipped.com', includeInRoulette: true, color: '#BA7517' },
  { name: 'Juddy', role: 'Data Analyst', image: '/images/juddy.png', email: 'juddy@outdoorequipped.com', includeInRoulette: true, color: '#06b6d4' },
  { name: 'Shenna', role: 'Data Analyst', image: '/images/shenna.png', email: 'spuebla@outdoorequipped.com', includeInRoulette: true, color: '#10b981' },
  { name: 'Wyndell', role: 'Data Analyst', image: '/images/wyndell.png', email: 'wjdelcorro@outdoorequipped.com', includeInRoulette: true, color: '#f59e0b' },
  { name: 'Jonisa', role: 'Data Analyst', image: '/images/jonisa.png', email: 'jonisa@outdoorequipped.com', includeInRoulette: true, color: '#ef4444' },
  { name: 'Lawrence', role: 'Data Analyst', image: '/images/lawrence.png', email: 'lawrencelaudeza@outdoorequipped.com', includeInRoulette: true, color: '#8b5cf6' },
  { name: 'Mark', role: 'Data Analyst', image: '/images/mark.png', email: 'mpasturan@outdoorequipped.com', includeInRoulette: true, color: '#ec4899' },
];

// Helper functions for localStorage
const STORAGE_KEY = 'roulette_members';
const SELECTED_KEY = 'roulette_selected';

const loadMembersFromStorage = (): TeamMember[] => {
  if (typeof window === 'undefined') return defaultTeamMembers;
  const stored = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

const loadSelectedFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SELECTED_KEY);
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
  localStorage.setItem(SELECTED_KEY, JSON.stringify(selected));
};

const teamImages: Record<string, string> = {
  'arlie': '/images/arlie.png',
  'melvin@outdoorequipped.com': '/images/Melvin.png',
  'melvin': '/images/Melvin.png',
  'jbermoy': '/images/janroe.png',
  'jerald': '/images/jerald.png',
  'juddy': '/images/juddy.png',
  'spuebla': '/images/shenna.png',
  'wjdelcorro': '/images/wyndell.png',
  'jonisa': '/images/jonisa.png',
  'lawrencelaudeza': '/images/lawrence.png',
  'mpasturan': '/images/mark.png',
  'florante': '/images/florante.png'
};

function getUserImage(email: string): string | null {
  if (!email) return null;
  const emailLower = email.toLowerCase();
  if (teamImages[emailLower]) return teamImages[emailLower];
  const username = emailLower.split('@')[0];
  if (teamImages[username]) return teamImages[username];
  for (const [key, value] of Object.entries(teamImages)) {
    if (username.includes(key) || key.includes(username)) return value;
  }
  return null;
}

const operationTools = [
  {
    id: 'sku',
    category: 'LISTINGS',
    title: 'Shopkeep Consolidated Tool',
    description: 'Process SKU lists, consolidate Shopkeep data, generate exports, and track batch imports.',
    status: 'Beta',
    accent: 'blue',
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: 'asin',
    category: 'LISTINGS',
    title: 'Multiple Parent ASIN',
    description: 'Detect styles connected to multiple unique parent ASINs before listing conflicts occur.',
    status: 'Active',
    accent: 'green',
    icon: <SearchCheck className="h-4 w-4" />,
  },
  {
    id: 'basecamp',
    category: 'COMMUNICATIONS',
    title: 'Basecamp Response Generator',
    description: 'Upload PO files and auto-generate formatted Basecamp messages for initial analysis, final analysis, pre-approval, or fixing updates.',
    status: 'Beta',
    accent: 'purple',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'bulk-analyzer',
    category: 'ANALYTICS',
    title: 'File Generator',
    description: 'Generate Listing Data, Pre-approval Files, Excluded Files, and For Fixing Files based on Remarks column filtering.',
    status: 'Beta',
    accent: 'orange',
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    id: 'get-brand',
    category: 'RESEARCH',
    title: 'Get Brand',
    description: 'Look up brand name.',
    status: 'Beta',
    accent: 'blue',
    icon: <Building2 className="h-4 w-4" />,
  },
];

function useAnimatedCounter(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-80">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#grad-${color})`} />
      <polyline points={points} stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx={(data.length - 1) * step} cy={h - (data[data.length - 1] / max) * (h - 4)} r="2.5" fill={color} />
    </svg>
  );
}

function StatusDot({ status }: { status: ToolRun['status'] }) {
  const color = status === 'completed' ? 'bg-emerald-400' : status === 'warning' ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`} style={{ animationDuration: '2s' }} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ─── STATUS NORMALIZATION ──────────────────────────────────────────────────
function cleanStatusString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStatus(
  rawStatus: unknown,
  dateCompleted?: string | null,
  dateAssigned?: string | null,
  debugContext?: { rowIndex?: number | string; taskName?: string }
): string {
  const cleaned = cleanStatusString(rawStatus);
  const cleanedLower = cleaned.toLowerCase();

  const isEmpty =
    cleaned === '' || cleanedLower === 'null' || cleanedLower === 'undefined' || cleanedLower === '-';

  let result: string;

  if (isEmpty) {
    result = 'Pending';
  } else {
    const match = VALID_TASK_STATUSES.find(
      (valid) => valid.toLowerCase() === cleanedLower
    );
    result = match ?? cleaned;
  }

  return result;
}

// ─── Member Roulette Modal Component ───────────────────────────────────────────

function MemberRouletteModal({ isOpen, onClose, theme }: { isOpen: boolean; onClose: () => void; theme: 'light' | 'dark' }) {
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

  useEffect(() => {
    if (members.length > 0) {
      saveMembersToStorage(members);
    }
  }, [members]);

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
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
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
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const remainingCount = getAvailableMembers().length;
  const totalCount = eligibleMembers.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
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

      <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 animate-pulse">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>Member Roulette</h3>
              <p className={`text-xs ${mutedTextClass}`}>Spin to randomly select a team member</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${mutedTextClass}`} />
          </button>
        </div>

        <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${textClass}`}>Team Members Management</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit2 className="h-3 w-3" />
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

        <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${mutedTextClass}`}>Selection Progress</span>
              <button
                onClick={resetRoulette}
                disabled={isSpinning || selectedMembers.length === 0}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                  isSpinning || selectedMembers.length === 0
                    ? 'opacity-50 cursor-not-allowed' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshIcon className="h-3 w-3" /> Reset All
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

        <div className="p-8">
          <div className="relative flex justify-center">
            <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{
              background: 'conic-gradient(from 0deg, #378ADD, #1D9E75, #7F77DD, #BA7517, #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899)',
            }} />

            <div className="absolute -top-6 left-1/2 z-20 -translate-x-1/2" style={{ transformOrigin: 'top center' }}>
              <div className={`h-10 w-0 border-x-[16px] border-t-[28px] border-x-transparent border-t-red-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform duration-75 ${isSpinning ? 'animate-bounce' : ''}`} />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-red-300 shadow-lg" />
            </div>

            <div
              className="relative h-80 w-80 rounded-full shadow-2xl cursor-pointer ring-8 ring-slate-800 transition-colors"
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
                const radius = 125;
                const isCurrentWinner = flashWinner && selectedMember?.name === member.name;

                return (
                  <div
                    key={member.name}
                    className={`absolute left-1/2 top-1/2 flex flex-col items-center text-center transition-all duration-300 ${isCurrentWinner ? 'scale-125 z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''}`}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${sliceCenterAngle}deg) translateY(-${radius}px) rotate(-${sliceCenterAngle}deg)`,
                    }}
                  >
                    <div className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center overflow-hidden border-2 ${isCurrentWinner ? 'border-yellow-400 bg-yellow-100 ring-4 ring-yellow-400/50' : 'border-white bg-white/95'}`}>
                      {member.image ? (
                        <Image src={member.image} alt={member.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: member.color }}>{member.name[0]}</span>
                      )}
                    </div>
                    <span className={`mt-1 text-[10px] font-semibold text-white drop-shadow-md px-1.5 py-0.5 rounded-full ${isCurrentWinner ? 'bg-yellow-500/90 text-slate-900 border border-yellow-300' : 'bg-black/60'}`}>
                      {member.name}
                    </span>
                  </div>
                );
              })}

              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 shadow-[inset_0_4px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center border-4 border-slate-600 z-10">
                <div className="text-center w-full h-full flex flex-col items-center justify-center rounded-full bg-slate-800 inner-shadow">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-inner mb-0.5" />
                  <span className="text-[8px] text-slate-300 block font-bold tracking-widest">SPIN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center gap-3">
            <button
              onClick={spinRoulette}
              disabled={isSpinning || remainingCount === 0 || eligibleMembers.length === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-10 py-4 font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                isSpinning || remainingCount === 0 || eligibleMembers.length === 0
                  ? 'cursor-not-allowed opacity-50 bg-slate-600 scale-100'
                  : isDark
                    ? 'bg-gradient-to-b from-purple-500 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 active:translate-y-0'
                    : 'bg-gradient-to-b from-purple-400 to-pink-500 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-95 active:translate-y-0'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" /> Spinning...
                </>
              ) : remainingCount === 0 ? (
                <>
                  <RotateCcw className="h-6 w-6" /> Round Complete
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 text-yellow-300" /> Spin the Wheel ({remainingCount} left)
                </>
              )}
            </button>
          </div>

          {selectedMember && !isSpinning && (
            <div className={`mt-8 animate-in zoom-in slide-in-from-bottom-4 duration-500 rounded-xl border-2 p-5 text-center shadow-2xl ${
              isDark ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-purple-500/20' : 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-purple-50'
            }`}>
              <div className="flex items-center gap-5 justify-center">
                <div className="flex-shrink-0 relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-yellow-400 shadow-xl">
                    {selectedMember.image ? (
                      <Image src={selectedMember.image} alt={selectedMember.name} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ backgroundColor: selectedMember.color, color: 'white' }}>
                        {selectedMember.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce">
                    <Trophy className="h-4 w-4 text-slate-900" />
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Winner Selected!</p>
                  <p className={`text-3xl font-extrabold ${textClass} mt-1`}>{selectedMember.name}</p>
                  <p className={`text-sm mt-1 ${mutedTextClass}`}>{selectedMember.role}</p>
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

// ─── Add / Edit Task Modal Component ───────────────────────────────────────

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
    if (isOpen) {
      setForm({ ...emptyTaskForm, ...initialValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;
  const labelClass = `mb-1 block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  const handleSubmit = () => {
    onSubmit(form);
  };

  const usingCustomBrand = form.brand === '__OTHER__';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/20 p-1.5">
              <Plus className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mode === 'add' ? 'Add New Task' : 'Edit Task'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {mode === 'add'
                  ? 'This will be added as a new row in the tracker'
                  : 'Only Arlie, Jonisa, and Melvin can edit tasks assigned to others'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              {error}
            </div>
          )}

          <div className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            <Info className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Segment is auto-filled by the sheet's formula and can't be set here — it will populate automatically once the row is created.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date Requested</label>
              <input type="date" className={inputClass} value={form.dateRequested} onChange={(e) => setForm({ ...form, dateRequested: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">Select type...</option>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task *</label>
              <select className={inputClass} value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })}>
                <option value="">Select task...</option>
                {TASK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Brand *</label>
              <select className={inputClass} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                <option value="">Select brand...</option>
                {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value="__OTHER__">Other (type below)</option>
              </select>
              {usingCustomBrand && (
                <input
                  type="text"
                  className={`${inputClass} mt-2`}
                  placeholder="Enter new brand name"
                  value={form.customBrand}
                  onChange={(e) => setForm({ ...form, customBrand: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Agent *</label>
              <select className={inputClass} value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })}>
                <option value="">Select agent...</option>
                {AGENT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {VALID_TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>BC Links</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Enter Basecamp links (comma separated)"
              value={form.bcLinks}
              onChange={(e) => setForm({ ...form, bcLinks: e.target.value })}
            />
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Separate multiple links with commas
            </p>
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <textarea className={inputClass} rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
        </div>

        <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button onClick={onClose} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.task || !form.agent || (!form.brand || (usingCustomBrand && !form.customBrand.trim()))}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${
              isSubmitting ? 'opacity-50 cursor-not-allowed bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {mode === 'add' ? 'Add Task' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Client Component ─────────────────────────────────────────

export default function DashboardClient({
  initialTasks = [],
  theme = 'dark',
  currentUserEmail = '',
  currentUserName = ''
}: DashboardClientProps) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [previousTaskIds, setPreviousTaskIds] = useState<Set<string>>(new Set());
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [showNewTaskNotification, setShowNewTaskNotification] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [allTasksLoading, setAllTasksLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'overdue' | 'unassigned' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const didInitialLoadRef = useRef(false);

  const isDark = theme === 'dark';
  const isAdmin = currentUserEmail === 'melvin@outdoorequipped.com';
  const isTaskAdmin = isTaskAdminEmail(currentUserEmail);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, viewMode, filterDateRange, showOnlyNew]);

  // Google Sheets configuration
  const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
  const SHEET_NAME = 'Copy of Task Masterlist - Operations';

  const processTasksFromSheet = useCallback((sheetData: any): Task[] => {
    let headers: string[];
    let rowData: { row: any[], rowIndex: number }[];

    if (sheetData && typeof sheetData === 'object' && sheetData.headers && sheetData.rows) {
      headers = sheetData.headers;
      rowData = sheetData.rows;
    } else if (Array.isArray(sheetData) && sheetData.length > 0) {
      headers = sheetData[0] || [];
      const rows = sheetData.slice(1) || [];
      rowData = rows.map((row, index) => ({
        row,
        rowIndex: index + 2
      }));
    } else {
      console.warn('⚠️ Unknown sheet data format:', sheetData);
      return [];
    }

    if (!headers || headers.length === 0 || rowData.length === 0) {
      return [];
    }

    const columnMap: { [key: string]: number } = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        const key = header.toString().trim().toLowerCase();
        if (!(key in columnMap)) {
          columnMap[key] = index;
        }
      }
    });

    const taskCol = columnMap['task'];
    const statusCol = columnMap['status'];
    const dateRequestedCol = columnMap['date requested'];
    const dateAssignedCol = columnMap['date assigned'];
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

    if (taskCol === undefined) {
      console.error('⚠️ "Task" column not found in sheet headers:', headers);
      return [];
    }

    const get = (row: any[], idx: number | undefined) =>
      idx !== undefined && idx < row.length ? (row[idx] ?? '') : '';

    const taskList: Task[] = [];

    rowData.forEach(({ row, rowIndex }: { row: any[], rowIndex: number }) => {
      const taskName = get(row, taskCol);
      if (!taskName) return;

      const dateRequested = get(row, dateRequestedCol);
      const dateAssigned = get(row, dateAssignedCol);
      const dueDate = get(row, dueDateCol);
      const dateCompleted = get(row, dateCompletedCol);
      const statusRaw = get(row, statusCol);

      const normalizedStatus = normalizeStatus(statusRaw, dateCompleted, dateAssigned, {
        rowIndex,
        taskName,
      });

      taskList.push({
        id: `task-${rowIndex}`,
        rowIndex: rowIndex,
        date_requested: dateRequested,
        tat: get(row, tatCol),
        segment: get(row, segmentCol),
        type: get(row, typeCol),
        task: taskName,
        brand: get(row, brandCol),
        date_assigned: dateAssigned,
        agent: get(row, agentCol),
        due_date: dueDate,
        date_completed: dateCompleted || null,
        remarks: get(row, remarksCol),
        auditor: get(row, auditorCol),
        status: normalizedStatus,
        bc_links: get(row, bcLinksCol),
        reason_for_pending: get(row, reasonPendingCol),
        reason_for_cancel: get(row, reasonCancelCol),
        isNew: false,
      });
    });

    return taskList;
  }, []);

  // Send desktop notification for new tasks
  const sendDesktopNotification = useCallback(async (taskData: { task: string; agent: string; rowIndex: number }) => {
    try {
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📋 New Task Added!',
          body: `"${taskData.task}" assigned to ${taskData.agent || 'Unassigned'} (Row ${taskData.rowIndex})`,
          url: '/',
          taskId: `task-${taskData.rowIndex}`,
        }),
      });
      console.log('✅ Desktop notification sent for new task');
    } catch (error) {
      console.error('❌ Failed to send desktop notification:', error);
    }
  }, []);

  // Detect new tasks
  const detectNewTasks = useCallback((newTasks: Task[]) => {
    const newIds = new Set<string>();
    const currentIds = new Set(newTasks.map(t => t.id));
    
    newTasks.forEach(task => {
      if (!previousTaskIds.has(task.id)) {
        newIds.add(task.id);
        // Send desktop notification if enabled
        if (isNotificationEnabled) {
          sendDesktopNotification({
            task: task.task,
            agent: task.agent,
            rowIndex: task.rowIndex,
          });
        }
      }
    });
    
    if (newIds.size > 0 && previousTaskIds.size > 0) {
      setNewTaskIds(newIds);
      setShowNewTaskNotification(true);
      
      setAllTasks(prev => prev.map(t => ({
        ...t,
        isNew: newIds.has(t.id)
      })));
      setTasks(prev => prev.map(t => ({
        ...t,
        isNew: newIds.has(t.id)
      })));
      
      setTimeout(() => {
        setShowNewTaskNotification(false);
      }, 10000);
    }
    
    setPreviousTaskIds(currentIds);
  }, [previousTaskIds, isNotificationEnabled, sendDesktopNotification]);

  const loadTasksFromSheet = useCallback(async () => {
    if (!currentUserEmail && !currentUserName) {
      setTasks([]);
      setTasksLoading(false);
      setUpdateError('Please log in to view your tasks');
      return;
    }

    setTasksLoading(true);
    setUpdateError(null);

    try {
      const response = await fetch("/api/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
        }),
      });

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
      
      setTasks(newTasks);
      detectNewTasks(newTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [currentUserEmail, currentUserName, processTasksFromSheet, detectNewTasks]);

  const loadAllTasksFromSheet = useCallback(async () => {
    if (!currentUserEmail && !currentUserName) return;

    setAllTasksLoading(true);
    setUpdateError(null);

    try {
      const response = await fetch("/api/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
          viewAll: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      let newTasks: Task[] = [];
      if (data.rows && data.rows.length > 0) {
        newTasks = processTasksFromSheet(data);
      } else {
        newTasks = [];
      }
      
      setAllTasks(newTasks);
      detectNewTasks(newTasks);
    } catch (error) {
      console.error('Failed to load all tasks:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to load all tasks');
      setAllTasks([]);
    } finally {
      setAllTasksLoading(false);
    }
  }, [currentUserEmail, currentUserName, processTasksFromSheet, detectNewTasks]);

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;

    if (initialTasks && initialTasks.length > 0) {
      let newTasks: Task[] = [];
      if (typeof initialTasks === 'object' && 'headers' in initialTasks && 'rows' in initialTasks) {
        newTasks = processTasksFromSheet(initialTasks as { headers: string[], rows: any[] });
      } else {
        newTasks = processTasksFromSheet(initialTasks);
      }
      setTasks(newTasks);
      setAllTasks(newTasks);
      setPreviousTaskIds(new Set(newTasks.map(t => t.id)));
      setTasksLoading(false);
    } else {
      loadTasksFromSheet();
      if (viewMode === 'all') {
        loadAllTasksFromSheet();
      }
    }
  }, [initialTasks, processTasksFromSheet, loadTasksFromSheet, loadAllTasksFromSheet, viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'all') {
        loadAllTasksFromSheet();
      } else {
        loadTasksFromSheet();
      }
    }, 90000);
    return () => clearInterval(interval);
  }, [loadTasksFromSheet, loadAllTasksFromSheet, viewMode]);

  const toggleViewMode = useCallback(() => {
    setFilterStatus('all');
    setFilterDateRange('all');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setShowOnlyNew(false);
    if (viewMode === 'mine') {
      setViewMode('all');
      if (allTasks.length === 0) loadAllTasksFromSheet();
    } else {
      setViewMode('mine');
    }
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());
  }, [viewMode, allTasks.length, loadAllTasksFromSheet]);

  const refreshCurrentView = useCallback(() => {
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());
    
    if (viewMode === 'all') {
      loadAllTasksFromSheet();
    } else {
      loadTasksFromSheet();
    }
  }, [viewMode, loadAllTasksFromSheet, loadTasksFromSheet]);

  const clearCustomDateRange = useCallback(() => {
    setCustomDateStart('');
    setCustomDateEnd('');
    setFilterDateRange('all');
    setCurrentPage(1);
    setShowDateRangePicker(false);
  }, []);

  const applyCustomDateRange = useCallback(() => {
    if (customDateStart && customDateEnd) {
      setFilterDateRange('custom');
      setCurrentPage(1);
      setShowDateRangePicker(false);
    }
  }, [customDateStart, customDateEnd]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    if (updatingTaskId) return;

    setUpdatingTaskId(taskId);
    setUpdateError(null);

    const sourceList = viewMode === 'all' ? allTasks : tasks;
    const task = sourceList.find(t => t.id === taskId);
    if (!task) {
      setUpdatingTaskId(null);
      setUpdateError('Task not found');
      return;
    }

    const rowIndex = Number(task.rowIndex);
    if (isNaN(rowIndex) || rowIndex < 2) {
      setUpdateError(`Invalid row index: ${task.rowIndex}`);
      setUpdatingTaskId(null);
      return;
    }

    const previousTasks = [...tasks];
    const previousAllTasks = [...allTasks];
    const isCompletedOrCancelled = newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'cancelled';

    const applyOptimisticUpdate = (list: Task[]) =>
      list.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              date_completed: isCompletedOrCancelled
                ? new Date().toLocaleDateString('en-US')
                : null,
            }
          : t
      );

    setTasks(prev => applyOptimisticUpdate(prev));
    setAllTasks(prev => applyOptimisticUpdate(prev));

    if (showTaskModal) {
      setShowTaskModal(false);
      setSelectedTask(null);
    }

    try {
      const payload = {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        rowIndex: rowIndex,
        newStatus: newStatus,
        taskName: task.task,
        agentEmail: task.agent || '',
      };

      const response = await fetch('/api/google-sheets/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetail = errorJson.error || errorJson.message || responseText;
        } catch {
          // Keep as text if not JSON
        }
        throw new Error(`API Error ${response.status}: ${errorDetail}`);
      }

      setTimeout(() => {
        refreshCurrentView();
      }, 1500);

    } catch (error) {
      console.error('❌ Failed to update task status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task status';
      setUpdateError(errorMessage);
      setTasks(previousTasks);
      setAllTasks(previousAllTasks);
    } finally {
      setUpdatingTaskId(null);
    }
  }, [tasks, allTasks, viewMode, showTaskModal, refreshCurrentView, updatingTaskId, SPREADSHEET_ID, SHEET_NAME]);

  const saveTaskEdits = useCallback(async (values: TaskFormValues) => {
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      setShowEditTaskModal(false);
      setShowTaskModal(false);
      setSelectedTask(null);
      refreshCurrentView();
    } catch (error) {
      setTaskFormError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSavingTask(false);
    }
  }, [selectedTask, currentUserEmail, refreshCurrentView, SPREADSHEET_ID, SHEET_NAME]);

  const addNewTask = useCallback(async (values: TaskFormValues) => {
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      setShowAddTaskModal(false);
      refreshCurrentView();
      if (viewMode === 'mine') {
        setViewMode('all');
        loadAllTasksFromSheet();
      }
    } catch (error) {
      setTaskFormError(error instanceof Error ? error.message : 'Failed to add task');
    } finally {
      setIsSavingTask(false);
    }
  }, [currentUserEmail, refreshCurrentView, viewMode, loadAllTasksFromSheet, SPREADSHEET_ID, SHEET_NAME]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('maintenance_mode')
          .eq('id', 1)
          .single();

        if (!settingsError && settingsData) {
          setSettings(settingsData);
        } else {
          const saved = localStorage.getItem('lot_admin_settings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setSettings({ maintenance_mode: parsed.maintenanceMode });
            } catch {
              setSettings({ maintenance_mode: false });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();

    const settingsChannel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'id=eq.1',
        },
        (payload) => {
          setSettings(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const isMaintenanceMode = (): boolean => {
    if (settings) {
      return settings.maintenance_mode === true;
    }
    const saved = localStorage.getItem('lot_admin_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.maintenanceMode || false;
      } catch {
        return false;
      }
    }
    return false;
  };

  const activeTaskSource = viewMode === 'all' ? allTasks : tasks;

  const uniqueStatuses = useMemo(() => {
    const statusSet = new Set<string>(VALID_TASK_STATUSES);
    activeTaskSource.forEach(task => {
      if (task.status) {
        statusSet.add(task.status);
      }
    });
    return Array.from(statusSet).sort();
  }, [activeTaskSource]);

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeTaskSource.length };
    activeTaskSource.forEach(task => {
      const status = task.status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [activeTaskSource]);

  const parseDateValue = (value: string) => {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Filtered tasks with date filtering and row number sorting
const filteredTasks = useMemo(() => {
  let filtered = activeTaskSource;

  // Show only new tasks filter
  if (showOnlyNew) {
    filtered = filtered.filter(task => newTaskIds.has(task.id));
  }

  // Status filter
  if (filterStatus !== 'all') {
    filtered = filtered.filter(task => task.status === filterStatus);
  }

  // Date range filter
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (filterDateRange !== 'all') {
    filtered = filtered.filter(task => {
      // Check if task is unassigned (no agent)
      if (filterDateRange === 'unassigned') {
        return !task.agent || task.agent.trim() === '';
      }
      
      // Parse the due date
      const dueDateStr = task.due_date;
      if (!dueDateStr) return false;
      
      const dueDate = new Date(dueDateStr);
      if (isNaN(dueDate.getTime())) return false;
      
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      // Check overdue tasks (due date is in the past)
      if (filterDateRange === 'overdue') {
        return dueDateOnly < today && task.status !== 'Completed' && task.status !== 'Cancelled';
      }
      
      // Today
      if (filterDateRange === 'today') {
        return dueDateOnly.getTime() === today.getTime();
      }
      
      // This week (next 7 days)
      if (filterDateRange === 'week') {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return dueDateOnly >= today && dueDateOnly <= weekEnd;
      }
      
      // This month
      if (filterDateRange === 'month') {
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return dueDateOnly >= today && dueDateOnly <= monthEnd;
      }
      
      // Custom date range
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

  // Search term filter
  if (debouncedSearchTerm.trim()) {
    const term = debouncedSearchTerm.toLowerCase().trim();
    filtered = filtered.filter(task => {
      if (task.task.toLowerCase().includes(term)) return true;
      if (task.brand.toLowerCase().includes(term)) return true;
      if (task.status.toLowerCase().includes(term)) return true;
      return task.type.toLowerCase().includes(term) ||
        task.segment.toLowerCase().includes(term) ||
        task.bc_links.toLowerCase().includes(term) ||
        task.agent.toLowerCase().includes(term) ||
        task.auditor.toLowerCase().includes(term) ||
        task.remarks.toLowerCase().includes(term) ||
        task.reason_for_pending.toLowerCase().includes(term) ||
        task.reason_for_cancel.toLowerCase().includes(term);
    });
  }

  // ============================================================
  // SORT BY ROW NUMBER (descending) - NEWEST ROW FIRST
  // ============================================================
  filtered = [...filtered].sort((a, b) => {
    // Sort by rowIndex descending (larger = newer = first)
    return b.rowIndex - a.rowIndex;
  });

  return filtered;
}, [activeTaskSource, filterStatus, debouncedSearchTerm, filterDateRange, customDateStart, customDateEnd, showOnlyNew, newTaskIds]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  if (isMaintenanceMode() && !isAdmin) {
    return (
      <div className={`flex min-h-[400px] flex-col items-center justify-center rounded-2xl border p-12 text-center ${isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
        <div className="mb-6 rounded-full bg-amber-500/20 p-4">
          <WrenchIcon className="h-16 w-16 text-amber-400" />
        </div>
        <h2 className={`mb-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Under Maintenance
        </h2>
        <p className={`mb-6 max-w-md text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          We're currently performing scheduled maintenance to improve your experience.
          The tools will be back online shortly.
        </p>
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <ClockIcon className="h-4 w-4" />
          <span>Please check back later</span>
        </div>
      </div>
    );
  }

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    const { data, error } = await supabase
      .from('tool_runs')
      .select('id, tool_type, status, title, description, total_count, success_count, issue_count, filename, created_at, user_email')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setRuns([]);
      setErrorMessage(error.message);
    } else {
      setRuns((data ?? []) as ToolRun[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % defaultTeamMembers.length);
      }, 3000);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const metrics = useMemo(() => {
    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const totalProcessed = runs.reduce((s, r) => s + Number(r.total_count ?? 0), 0);
    const totalIssues = runs.reduce((s, r) => s + Number(r.issue_count ?? 0), 0);
    const completionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;
    const skuRuns = runs.filter(r => r.tool_type === 'sku').length;
    const asinRuns = runs.filter(r => r.tool_type === 'asin').length;
    const basecampRuns = runs.filter(r => r.tool_type === 'basecamp').length;
    const bulkAnalyzerRuns = runs.filter(r => r.tool_type === 'bulk-analyzer').length;
    return { totalRuns, completionRate, totalProcessed, totalIssues, skuRuns, asinRuns, basecampRuns, bulkAnalyzerRuns };
  }, [runs]);

  const sparklineData = useMemo(() => {
    const days = 7;
    const now = Date.now();
    const getSparkline = (toolType: string) => Array.from({ length: days }, (_, i) => {
      const dayStart = now - (days - 1 - i) * 86400000;
      const dayEnd = dayStart + 86400000;
      return runs.filter(r => r.tool_type === toolType && new Date(r.created_at).getTime() >= dayStart && new Date(r.created_at).getTime() < dayEnd).length;
    });
    return { sku: getSparkline('sku'), asin: getSparkline('asin'), basecamp: getSparkline('basecamp'), bulkAnalyzer: getSparkline('bulk-analyzer') };
  }, [runs]);

  const userStatsMap = useMemo(() => {
    const map = new Map<string, { totalRuns: number; completedRuns: number; lastRun: string }>();
    runs.forEach(run => {
      const email = run.user_email || 'System';
      if (!map.has(email)) {
        map.set(email, { totalRuns: 0, completedRuns: 0, lastRun: run.created_at });
      }
      const stats = map.get(email)!;
      stats.totalRuns++;
      if (run.status === 'completed') stats.completedRuns++;
      if (new Date(run.created_at) > new Date(stats.lastRun)) {
        stats.lastRun = run.created_at;
      }
    });
    return map;
  }, [runs]);

  const allUsers = useMemo(() => {
    const usersWithStats = defaultTeamMembers.map(member => {
      const stats = userStatsMap.get(member.email) || { totalRuns: 0, completedRuns: 0, lastRun: '' };
      return {
        ...member,
        totalRuns: stats.totalRuns,
        completedRuns: stats.completedRuns,
        lastRun: stats.lastRun,
      };
    });
    return usersWithStats.sort((a, b) => b.totalRuns - a.totalRuns);
  }, [userStatsMap]);

  const recentRuns = useMemo(() => runs.slice(0, 8), [runs]);

  const navigateToTool = (toolId: string) => {
    window.dispatchEvent(new CustomEvent('navigateToTool', { detail: { toolId } }));
  };

  const getRunCount = (id: string) => {
    if (id === 'sku') return metrics.skuRuns;
    if (id === 'asin') return metrics.asinRuns;
    if (id === 'basecamp') return metrics.basecampRuns;
    if (id === 'bulk-analyzer') return metrics.bulkAnalyzerRuns;
    return 0;
  };

  const getSparklineForTool = (id: string) => {
    if (id === 'bulk-analyzer') return sparklineData.bulkAnalyzer;
    if (id === 'get-brand') return [0, 0, 0, 0, 0, 0, 0];
    return sparklineData[id as keyof typeof sparklineData] || [0, 0, 0, 0, 0, 0, 0];
  };

  const toolLabel: Record<string, string> = {
    sku: 'Shopkeep',
    asin: 'ASIN Checker',
    basecamp: 'Basecamp',
    'bulk-analyzer': 'File Generator',
    'get-brand': 'Get Brand',
  };

  const panelClass = isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white';
  const pageText = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  const maxRuns = allUsers.length > 0 ? allUsers[0].totalRuns : 1;

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    
    const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
      'completed': { 
        bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100', 
        text: isDark ? 'text-emerald-400' : 'text-emerald-700', 
        dot: 'bg-emerald-400' 
      },
      'cancelled': { 
        bg: isDark ? 'bg-red-500/20' : 'bg-red-100', 
        text: isDark ? 'text-red-400' : 'text-red-700', 
        dot: 'bg-red-400' 
      },
      'ongoing': { 
        bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', 
        text: isDark ? 'text-blue-400' : 'text-blue-700', 
        dot: 'bg-blue-400' 
      },
      'assigned': { 
        bg: isDark ? 'bg-cyan-500/20' : 'bg-cyan-100', 
        text: isDark ? 'text-cyan-400' : 'text-cyan-700', 
        dot: 'bg-cyan-400' 
      },
      'pending': { 
        bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100', 
        text: isDark ? 'text-yellow-400' : 'text-yellow-700', 
        dot: 'bg-yellow-400' 
      },
      'wip': { 
        bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100', 
        text: isDark ? 'text-indigo-400' : 'text-indigo-700', 
        dot: 'bg-indigo-400' 
      },
      'for audit': { 
        bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100', 
        text: isDark ? 'text-purple-400' : 'text-purple-700', 
        dot: 'bg-purple-400' 
      },
      'for investigation': { 
        bg: isDark ? 'bg-orange-500/20' : 'bg-orange-100', 
        text: isDark ? 'text-orange-400' : 'text-orange-700', 
        dot: 'bg-orange-400' 
      },
      'hold': { 
        bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100', 
        text: isDark ? 'text-amber-400' : 'text-amber-700', 
        dot: 'bg-amber-400' 
      },
      'for correx': { 
        bg: isDark ? 'bg-pink-500/20' : 'bg-pink-100', 
        text: isDark ? 'text-pink-400' : 'text-pink-700', 
        dot: 'bg-pink-400' 
      }
    };
    
    return statusMap[statusLower] || { 
      bg: isDark ? 'bg-slate-500/20' : 'bg-gray-100', 
      text: isDark ? 'text-slate-400' : 'text-gray-700', 
      dot: 'bg-slate-400' 
    };
  };

  const getStatusOptions = (currentStatus: string) => {
    return VALID_TASK_STATUSES.filter(
      (s) => s.toLowerCase() !== currentStatus.toLowerCase()
    );
  };

  const openTaskModal = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const newTaskCount = newTaskIds.size;

  return (
    <>
      {/* New Task Notification Banner */}
      {showNewTaskNotification && newTaskCount > 0 && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl border shadow-2xl p-4 max-w-sm animate-in slide-in-from-top-4 duration-300 ${
          isDark ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-emerald-300'
        }`}>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-500/20 p-2">
              <Bell className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${pageText}`}>
                {newTaskCount} New Task{newTaskCount > 1 ? 's' : ''} Added!
              </p>
              <p className={`text-xs ${mutedText}`}>
                Click refresh to see them in your list
              </p>
            </div>
            <button
              onClick={() => setShowNewTaskNotification(false)}
              className={`rounded p-1 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={refreshCurrentView}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              <RefreshCw className="h-3 w-3" /> Refresh Now
            </button>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-2rem)] min-h-0 w-full max-w-full flex-col overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full space-y-5 sm:space-y-6 pb-6">
          <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <h1 className={`break-words text-2xl font-bold tracking-tight sm:text-3xl ${pageText}`}>Dashboard</h1>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </span>
                )}
                {newTaskCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 animate-pulse">
                    <Bell className="h-3.5 w-3.5" />
                    {newTaskCount} New
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-sm ${mutedText}`}>Listing Operations · Real-time overview</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell 
                theme={theme} 
                userEmail={currentUserEmail}
                onPermissionChange={(granted) => {
                  setIsNotificationEnabled(granted);
                  if (granted) {
                    console.log('✅ Desktop notifications enabled');
                  }
                }}
              />
              <button onClick={fetchDashboardData} disabled={isLoading} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh
              </button>
            </div>
          </section>

          {errorMessage && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>Dashboard error: {errorMessage}</div>}
          {updateError && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>{updateError}</div>}

          {/* ─── TASK MANAGEMENT SECTION ─────────────────────────────────────────── */}
        <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
          <div className={`border-b px-5 py-4 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${pageText}`}>
                    {viewMode === 'all' ? 'All Tasks' : 'My Tasks'}
                    {newTaskCount > 0 && viewMode === 'all' && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <Bell className="h-3 w-3" />
                        {newTaskCount} new
                      </span>
                    )}
                  </h2>
                  <p className={`text-xs ${mutedText}`}>
                    {viewMode === 'all'
                      ? `All ${activeTaskSource.length} tasks in tracker`
                      : (currentUserName || currentUserEmail ? `Tasks assigned to ${currentUserName || currentUserEmail}` : 'No user logged in')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search task, brand, status, BC link..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm pl-8 ${
                      isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <Filter className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 ${mutedText}`} />
                </div>
                <button
                  onClick={toggleViewMode}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    viewMode === 'all'
                      ? isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {viewMode === 'all' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {viewMode === 'all' ? 'Viewing All' : 'View All'}
                </button>
                {isTaskAdmin && (
                  <button
                    onClick={() => { setTaskFormError(null); setShowAddTaskModal(true); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                )}
                <button
                  onClick={refreshCurrentView}
                  disabled={viewMode === 'all' ? allTasksLoading : tasksLoading}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    (viewMode === 'all' ? allTasksLoading : tasksLoading) ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  {(viewMode === 'all' ? allTasksLoading : tasksLoading) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {(viewMode === 'all' ? allTasksLoading : tasksLoading) ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    filterStatus === 'all'
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({taskCounts.all || 0})
                </button>
                
                {uniqueStatuses.map((status) => {
                  const count = taskCounts[status] || 0;
                  const isActive = filterStatus === status;
                  
                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{status}</span>
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        isActive
                          ? isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* New Tasks Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowOnlyNew(!showOnlyNew)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    showOnlyNew
                      ? isDark ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  {showOnlyNew ? 'Showing New Tasks' : 'Show New Tasks'}
                  {newTaskCount > 0 && (
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      showOnlyNew
                        ? isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
                        : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {newTaskCount}
                    </span>
                  )}
                </button>
                
                {newTaskCount > 0 && (
                  <button
                    onClick={() => {
                      setNewTaskIds(new Set());
                      setShowNewTaskNotification(false);
                      setAllTasks(prev => prev.map(t => ({ ...t, isNew: false })));
                      setTasks(prev => prev.map(t => ({ ...t, isNew: false })));
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark All Viewed
                  </button>
                )}
              </div>
              
              {/* Date Filter Tabs with Custom Range Picker */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => { setFilterDateRange('all'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'all'
                      ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Dates
                </button>
                <button
                  onClick={() => { setFilterDateRange('unassigned'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'unassigned'
                      ? isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  👤 Unassigned
                </button>
                <button
                  onClick={() => { setFilterDateRange('overdue'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'overdue'
                      ? isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔴 Overdue
                </button>
                <button
                  onClick={() => { setFilterDateRange('today'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'today'
                      ? isDark ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📅 Today
                </button>
                <button
                  onClick={() => { setFilterDateRange('week'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'week'
                      ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📅 Next 7 Days
                </button>
                <button
                  onClick={() => { setFilterDateRange('month'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filterDateRange === 'month'
                      ? isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📅 This Month
                </button>
                
                {/* Custom Date Range Picker Button */}
                <button
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap inline-flex items-center gap-1 ${
                    filterDateRange === 'custom'
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  Custom Range
                  {filterDateRange === 'custom' && (
                    <span className="ml-1 text-[8px] opacity-70">
                      ({customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - {customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'})
                    </span>
                  )}
                </button>
                
                {/* Clear Date Filter */}
                {filterDateRange !== 'all' && (
                  <button
                    onClick={clearCustomDateRange}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                      isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    <X className="h-3 w-3 inline" /> Clear
                  </button>
                )}
              </div>

              {/* Custom Date Range Picker Dropdown */}
              {showDateRangePicker && (
                <div className={`mt-2 p-3 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-lg`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1`}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-1.5 text-sm ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1`}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-1.5 text-sm ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                      <button
                        onClick={applyCustomDateRange}
                        disabled={!customDateStart || !customDateEnd}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          !customDateStart || !customDateEnd
                            ? 'opacity-50 cursor-not-allowed bg-slate-600 text-slate-400'
                            : isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        <Check className="h-3 w-3" /> Apply
                      </button>
                      <button
                        onClick={() => setShowDateRangePicker(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tasks List */}
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            {(viewMode === 'all' ? allTasksLoading : tasksLoading) && activeTaskSource.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`h-8 w-8 animate-spin ${mutedText}`} />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <CheckCircle2 className={`h-12 w-12 ${mutedText} opacity-30`} />
                <p className={`mt-3 font-medium ${pageText}`}>No tasks found</p>
                <p className={`text-sm ${mutedText}`}>
                  {showOnlyNew && newTaskCount === 0 
                    ? 'All caught up! You\'ve viewed all new tasks.'
                    : debouncedSearchTerm || filterStatus !== 'all' || filterDateRange !== 'all'
                      ? 'Try adjusting your filters'
                      : 'You have no tasks assigned yet'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className={`sticky top-0 z-10 backdrop-blur ${isDark ? 'bg-slate-800/95' : 'bg-gray-50/95'}`}>
                  <tr>
                    <th className={`px-2 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText} w-10`}>#</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Task</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Brand</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Type</th>
                    {viewMode === 'all' && (
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Agent</th>
                    )}
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Due Date</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Status</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedText}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-200'}`}>
                  {paginatedTasks.map((task) => {
                    const statusColor = getStatusColor(task.status);
                    const isUpdating = updatingTaskId === task.id;
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
                    const isNew = task.isNew || newTaskIds.has(task.id);

                    return (
                      <tr
                        key={task.id}
                        className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'} cursor-pointer ${isNew ? (isDark ? 'bg-emerald-500/5 border-l-2 border-emerald-400' : 'bg-emerald-50/50 border-l-2 border-emerald-500') : ''}`}
                        onClick={() => openTaskModal(task)}
                      >
                        <td className={`px-2 py-3 text-center text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {task.rowIndex}
                          {isNew && (
                            <span className="ml-1 inline-flex items-center gap-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Newly added" />
                              <span className={`text-[8px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>NEW</span>
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-medium ${pageText}`}>
                          <div className="max-w-[200px] truncate">{task.task}</div>
                          <div className={`text-xs ${mutedText}`}>{formatDate(task.date_requested)}</div>
                        </td>
                        <td className={`px-4 py-3 ${pageText}`}>{task.brand}</td>
                        <td className={`px-4 py-3 ${pageText}`}>
                          <span className="text-xs">{task.type}</span>
                          <div className={`text-xs ${mutedText}`}>{task.segment}</div>
                        </td>
                        {viewMode === 'all' && (
                          <td className={`px-4 py-3 ${pageText}`}>{task.agent}</td>
                        )}
                        <td className={`px-4 py-3 ${pageText}`}>
                          {formatDate(task.due_date)}
                          {isOverdue && (
                            <span className="ml-2 inline-block rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} />
                            <span>{task.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {getStatusOptions(task.status).slice(0, 3).map((newStatus) => (
                              <button
                                key={newStatus}
                                onClick={() => updateTaskStatus(task.id, newStatus)}
                                disabled={isUpdating}
                                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                                  isUpdating ? 'opacity-50 cursor-not-allowed' :
                                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : newStatus}
                              </button>
                            ))}
                            {getStatusOptions(task.status).length > 3 && (
                              <span className={`text-[10px] ${mutedText}`}>+{getStatusOptions(task.status).length - 3}</span>
                            )}
                            {isTaskAdmin && (
                              <button
                                onClick={() => { setSelectedTask(task); setTaskFormError(null); setShowEditTaskModal(true); }}
                                className={`rounded-lg p-1 transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                title="Edit task"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer with task count and pagination */}
          <div className={`border-t px-5 py-3 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`text-xs ${mutedText}`}>
                Showing {paginatedTasks.length} of {filteredTasks.length} tasks
                {filteredTasks.length !== activeTaskSource.length && ` (filtered from ${activeTaskSource.length})`}
                {showOnlyNew && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    🆕 New Tasks
                  </span>
                )}
                {filterDateRange !== 'all' && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                    filterDateRange === 'unassigned' ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700' :
                    filterDateRange === 'overdue' ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700' :
                    filterDateRange === 'custom' ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' :
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {filterDateRange === 'unassigned' ? '👤 Unassigned' :
                    filterDateRange === 'overdue' ? '🔴 Overdue' :
                    filterDateRange === 'today' ? '📅 Today' :
                    filterDateRange === 'week' ? '📅 Next 7 Days' :
                    filterDateRange === 'month' ? '📅 This Month' :
                    filterDateRange === 'custom' ? `📅 ${customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - ${customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'}` : ''}
                  </span>
                )}
              </span>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded transition-colors ${
                      currentPage === 1 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                            currentPage === pageNum
                              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                              : isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className={`text-xs ${mutedText}`}>...</span>
                    )}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <button
                        onClick={() => goToPage(totalPages)}
                        className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                          currentPage === totalPages
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded transition-colors ${
                      currentPage === totalPages 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <span className={`text-xs ${mutedText}`}>
                {(viewMode === 'all' ? allTasksLoading : tasksLoading) ? 'Refreshing…' : `Last updated: ${new Date().toLocaleTimeString()}`}
              </span>
            </div>
          </div>
        </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2 shadow-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${pageText}`}>Operation Tools</h2>
                <p className={`text-xs ${mutedText}`}>Streamline your workflow with these tools</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {operationTools.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  theme={theme}
                  runCount={getRunCount(tool.id)}
                  sparkline={getSparklineForTool(tool.id)}
                  onOpen={() => navigateToTool(tool.id)}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`border-b px-5 py-3 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-yellow-500/20 p-1.5">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-semibold ${pageText}`}>Top Users</h2>
                      <p className={`text-xs ${mutedText}`}>Ranked by runs · Most active first</p>
                    </div>
                  </div>
                  <span className={`text-xs ${mutedText}`}>{allUsers.length} members</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {allUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className={`text-center text-sm ${mutedText}`}>No user data available</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {allUsers.map((user, index) => {
                      const percentage = (user.totalRuns / maxRuns) * 100;
                      const userImage = getUserImage(user.email);
                      const isTopPerformer = index === 0;

                      return (
                        <div key={user.email} className={`group relative transition-all duration-200 p-3 ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'} ${isTopPerformer ? (isDark ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : 'bg-gradient-to-r from-yellow-100/30 to-transparent') : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-7">
                              {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                              {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                              {index === 2 && <Medal className="h-4 w-4 text-amber-600" />}
                              {index >= 3 && <span className={`text-xs font-bold ${mutedText}`}>{index + 1}</span>}
                            </div>

                            {userImage ? (
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-500/30">
                                  <Image src={userImage} alt={user.name} width={32} height={32} className="w-full h-full object-cover" />
                                </div>
                                {isTopPerformer && (
                                  <div className="absolute -top-1 -right-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isTopPerformer ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' : (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}`}>
                                {user.name[0]?.toUpperCase()}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-semibold truncate ${pageText}`}>{user.name}</p>
                                  {user.role === 'Team Manager' && (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <span className={`text-sm font-bold tabular-nums ${isTopPerformer ? 'text-yellow-400' : 'text-emerald-400'}`}>{user.totalRuns}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                  <span className={`text-[9px] ${mutedText}`}>{user.completedRuns} completed</span>
                                </div>
                                {user.lastRun && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-slate-500" />
                                    <span className={`text-[9px] ${mutedText}`}>{relativeTime(user.lastRun)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-1.5">
                                <div className={`h-1 overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${isTopPerformer ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-emerald-500'}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`border-b px-5 py-3 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-orange-500/20 p-1.5">
                      <Flame className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-semibold ${pageText}`}>Recent Activity</h2>
                      <p className={`text-xs ${mutedText}`}>Latest tool runs</p>
                    </div>
                  </div>
                  <span className={`text-xs ${mutedText}`}>last {recentRuns.length}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]"><Loader2 className={`h-6 w-6 animate-spin ${mutedText}`} /></div>
                ) : recentRuns.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]"><div className={`text-center text-sm ${mutedText}`}>No activity yet</div></div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {recentRuns.map(run => (
                      <div key={run.id} className={`group flex items-center gap-3 px-4 py-2.5 transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                        <StatusDot status={run.status} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${pageText}`}>{run.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${run.status === 'completed' ? 'text-emerald-400' : run.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>{run.status}</span>
                            <span className={`text-[10px] ${mutedText}`}>{toolLabel[run.tool_type]} {run.total_count > 0 && `· ${run.total_count.toLocaleString()} items`}</span>
                          </div>
                        </div>
                        <div className={`text-[10px] flex-shrink-0 ${mutedText}`}>{relativeTime(run.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`border-b px-5 py-3 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-500/20 p-1.5">
                      <Users className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-semibold ${pageText}`}>Team Gallery</h2>
                      <p className={`text-xs ${mutedText}`}>Meet the team</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRouletteOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all transform hover:scale-105 ${
                      isDark
                        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30'
                        : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 border border-purple-300'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Member Roulette
                  </button>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                  {defaultTeamMembers.map((member, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 px-6 py-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="relative group">
                          <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-emerald-500/30 group-hover:ring-emerald-500 transition-all duration-300 shadow-xl">
                            <Image src={member.image} alt={member.name} width={112} height={112} className="w-full h-full object-cover" priority unoptimized />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <h3 className={`mt-3 text-base font-bold ${pageText}`}>{member.name}</h3>
                        <p className={`text-[10px] ${mutedText}`}>{member.role}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-1 pb-3">
                {defaultTeamMembers.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      currentSlide === idx
                        ? 'w-4 bg-emerald-500'
                        : `w-1.5 ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`
                    }`}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── TASK DETAIL MODAL ─────────────────────────────────────────────────── */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/20 p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className={`font-semibold ${pageText}`}>Task Details</h3>
                  <p className={`text-xs ${mutedText}`}>View and manage task information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isTaskAdmin && (
                  <button
                    onClick={() => { setTaskFormError(null); setShowEditTaskModal(true); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={closeTaskModal} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                  <X className={`h-5 w-5 ${mutedText}`} />
                </button>
              </div>
            </div>

            {/* Task Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Row #</label>
                  <p className={`text-base font-semibold ${pageText}`}>{selectedTask.rowIndex}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Task</label>
                  <p className={`text-base font-semibold ${pageText}`}>{selectedTask.task}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Brand</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.brand}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Type</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.type}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Segment</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.segment}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Agent</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.agent || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Date Requested</label>
                  <p className={`text-base ${pageText}`}>{formatDate(selectedTask.date_requested)}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Due Date</label>
                  <p className={`text-base ${pageText}`}>{formatDate(selectedTask.due_date)}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Status</label>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedTask.status).bg} ${getStatusColor(selectedTask.status).text}`}>
                    <span className={`h-2 w-2 rounded-full ${getStatusColor(selectedTask.status).dot}`} />
                    <span>{selectedTask.status}</span>
                  </span>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Auditor</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.auditor || 'N/A'}</p>
                </div>
              </div>

              {selectedTask.remarks && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Remarks</label>
                  <p className={`text-sm ${pageText} mt-1`}>{selectedTask.remarks}</p>
                </div>
              )}

              {selectedTask.reason_for_pending && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Reason for Pending</label>
                  <p className={`text-sm ${pageText} mt-1`}>{selectedTask.reason_for_pending}</p>
                </div>
              )}

              {selectedTask.reason_for_cancel && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Reason for Cancel</label>
                  <p className={`text-sm ${pageText} mt-1`}>{selectedTask.reason_for_cancel}</p>
                </div>
              )}

              {selectedTask.date_completed && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Date Completed</label>
                  <p className={`text-sm ${pageText} mt-1`}>{formatDate(selectedTask.date_completed)}</p>
                </div>
              )}

              {selectedTask.bc_links && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>BC Links</label>
                  <div className="mt-1">
                    {selectedTask.bc_links.split(',').map((link, index) => {
                      const trimmedLink = link.trim();
                      if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
                        return (
                          <a
                            key={index}
                            href={trimmedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline transition-colors mr-2 ${
                              isDark ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Basecamp Link {index + 1}
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        );
                      }
                      return (
                        <span key={index} className={`text-sm ${mutedText} mr-2`}>
                          {trimmedLink}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex flex-wrap gap-2 justify-between`}>
              <div className="flex gap-2 flex-wrap">
                {getStatusOptions(selectedTask.status).map((newStatus) => (
                  <button
                    key={newStatus}
                    onClick={() => {
                      updateTaskStatus(selectedTask.id, newStatus);
                    }}
                    disabled={updatingTaskId === selectedTask.id}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      updatingTaskId === selectedTask.id ? 'opacity-50 cursor-not-allowed' :
                      newStatus === 'Completed' ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                      newStatus === 'Cancelled' ? 'bg-red-500 text-white hover:bg-red-600' :
                      newStatus === 'Ongoing' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                      'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {updatingTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Mark as ${newStatus}`}
                  </button>
                ))}
              </div>
              <button
                onClick={closeTaskModal}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD TASK MODAL ─────────────────────────────────────────────────── */}
      <TaskFormModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSubmit={addNewTask}
        isSubmitting={isSavingTask}
        theme={theme}
        mode="add"
        error={taskFormError}
      />

      {/* ─── EDIT TASK MODAL (admins only) ─────────────────────────────────── */}
        <TaskFormModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          onSubmit={saveTaskEdits}
          isSubmitting={isSavingTask}
          theme={theme}
          mode="edit"
          error={taskFormError}
          initialValues={selectedTask ? {
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
          } : undefined}
        />

      <MemberRouletteModal isOpen={isRouletteOpen} onClose={() => setIsRouletteOpen(false)} theme={theme} />
    </>
  );
} // <-- THIS CLOSES THE DashboardClient COMPONENT

// ─── ToolCard Component (defined OUTSIDE DashboardClient) ─────────────────────

function ToolCard({ tool, theme, runCount, sparkline, onOpen }: any) {
  const isDark = theme === 'dark';
  const animCount = useAnimatedCounter(runCount);

  const getAccentConfig = () => {
    if (tool.accent === 'purple') {
      return { card: isDark ? 'border-violet-500/25 bg-violet-950/40 hover:bg-violet-900/40' : 'border-violet-200 bg-violet-50 hover:bg-violet-100', spark: '#8b5cf6', count: 'text-violet-400' };
    } else if (tool.accent === 'green') {
      return { card: isDark ? 'border-emerald-500/25 bg-emerald-950/40 hover:bg-emerald-900/40' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100', spark: '#10b981', count: 'text-emerald-400' };
    } else if (tool.accent === 'orange') {
      return { card: isDark ? 'border-orange-500/25 bg-orange-950/40 hover:bg-orange-900/40' : 'border-orange-200 bg-orange-50 hover:bg-orange-100', spark: '#f97316', count: 'text-orange-400' };
    } else {
      return { card: isDark ? 'border-cyan-500/25 bg-cyan-950/40 hover:bg-cyan-900/40' : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100', spark: '#06b6d4', count: 'text-cyan-400' };
    }
  };

  const accentConfig = getAccentConfig();
  const statusBadge = tool.status === 'Active' ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700');
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <button onClick={onOpen} className={`group relative flex min-h-[180px] w-full flex-col rounded-xl border p-3 text-left shadow-sm transition-all duration-200 hover:shadow-md ${accentConfig.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold ${isDark ? 'bg-slate-900/50 text-slate-300' : 'bg-white/70 text-gray-600'}`}>
          <span className="flex-shrink-0">{tool.icon}</span>
          <span className="truncate">{tool.category}</span>
        </div>
        <Sparkline data={sparkline} color={accentConfig.spark} />
      </div>
      <div className="mt-2 flex-1">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tool.title}</h3>
        <p className={`mt-1 line-clamp-2 text-[11px] leading-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{tool.description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${statusBadge}`}>{tool.status}</span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className={`text-[9px] ${mutedText}`}>Runs</p>
            <p className={`text-base font-bold tabular-nums ${accentConfig.count}`}>{animCount.toLocaleString()}</p>
          </div>
          <div className="rounded-full bg-black/40 p-1 text-white transition-all group-hover:translate-x-0.5">
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </button>
  );
}