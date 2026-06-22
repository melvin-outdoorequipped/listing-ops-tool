// components/dashboard.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

// Announcement interface
interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAll: boolean;
  targetEmails: string[];
  createdAt: string;
  pinned: boolean;
  active: boolean;
}

interface DashboardProps {
  theme?: 'light' | 'dark';
  currentUserEmail?: string;
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

// Default team members data (Arlie excluded from roulette)
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

// Member Roulette Modal Component (keep as is - too long to repeat)
function MemberRouletteModal({ isOpen, onClose, theme }: { isOpen: boolean; onClose: () => void; theme: 'light' | 'dark' }) {
  // ... (keep your existing MemberRouletteModal code)
  // I'll show a shortened version, but keep your full implementation
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

  // ... rest of MemberRouletteModal (keep your existing JSX)

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Keep your existing modal JSX */}
      <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        {/* Modal content - keep your existing implementation */}
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 animate-pulse">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Member Roulette</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Spin to randomly select a team member</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>
        {/* ... rest of your modal content */}
      </div>
    </div>
  );
}

export default function Dashboard({ theme = 'dark', currentUserEmail = '' }: DashboardProps) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';
  const isAdmin = currentUserEmail === 'melvin@outdoorequipped.com';

  // Load announcements from localStorage
  useEffect(() => {
    const loadAnnouncements = () => {
      const saved = localStorage.getItem('lot_announcements');
      if (saved) {
        try {
          const allAnnouncements = JSON.parse(saved);
          // Show ALL announcements (both active and inactive) for admin
          // But only show active ones for regular users
          const filtered = isAdmin 
            ? allAnnouncements 
            : allAnnouncements.filter((a: Announcement) => a.active);
          setAnnouncements(filtered);
        } catch {
          setAnnouncements([]);
        }
      }
    };
    
    loadAnnouncements();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lot_announcements') {
        loadAnnouncements();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAdmin]);

  // Check if maintenance mode is enabled
  const isMaintenanceMode = (): boolean => {
    const saved = localStorage.getItem('lot_admin_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.maintenanceMode || false;
      } catch {
        return false;
      }
    }
    return false;
  };

  // If maintenance mode is enabled and user is not admin, show maintenance page
  if (isMaintenanceMode() && !isAdmin) {
    const maintenanceAnnouncement = announcements.find(a => a.type === 'warning');
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
        {maintenanceAnnouncement && (
          <div className="mt-6 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {maintenanceAnnouncement.title}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {maintenanceAnnouncement.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const fetchDashboardData = async () => {
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
  };

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Helper functions for announcements
  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getAnnounceColor = (type: string) => {
    switch (type) {
      case 'info': return { bg: isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200', text: 'text-blue-400', icon: <Info className="h-4 w-4" /> };
      case 'warning': return { bg: isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200', text: 'text-yellow-400', icon: <AlertTriangle className="h-4 w-4" /> };
      case 'success': return { bg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200', text: 'text-emerald-400', icon: <CheckCircle className="h-4 w-4" /> };
      case 'error': return { bg: isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200', text: 'text-red-400', icon: <AlertCircle className="h-4 w-4" /> };
      default: return { bg: '', text: mutedText, icon: null };
    }
  };

  return (
    <>
      <div className="w-full max-w-full space-y-5 overflow-hidden sm:space-y-6">
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
            </div>
            <p className={`mt-1.5 text-sm ${mutedText}`}>Listing Operations · Real-time overview</p>
          </div>
          <button onClick={fetchDashboardData} disabled={isLoading} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh
          </button>
        </section>

        {errorMessage && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>Dashboard error: {errorMessage}</div>}

        {/* Announcements Section - Always shown, no statistics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Announcements
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {announcements.length}
              </span>
              {isAdmin && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                  <Shield className="inline h-3 w-3 mr-0.5" />
                  Admin View
                </span>
              )}
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className={`rounded-xl border p-8 text-center ${panelClass}`}>
              <Megaphone className={`mx-auto h-10 w-10 opacity-30 ${mutedText}`} />
              <p className={`mt-2 text-sm ${mutedText}`}>No announcements available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {announcements.map(ann => {
                const color = getAnnounceColor(ann.type);
                return (
                  <div key={ann.id} className={`rounded-xl border p-4 ${color.bg} ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex-shrink-0 ${color.text}`}>
                        {color.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {ann.title}
                          </p>
                          {ann.pinned && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                              📌 Pinned
                            </span>
                          )}
                          {isAdmin && !ann.active && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {ann.message}
                        </p>
                        <p className={`mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {formatDate(ann.createdAt)}
                          {isAdmin && !ann.targetAll && (
                            <span className="ml-2 text-[10px]">
                              · {ann.targetEmails.length} recipients
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

      <MemberRouletteModal isOpen={isRouletteOpen} onClose={() => setIsRouletteOpen(false)} theme={theme} />
    </>
  );
}

// ToolCard Component
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