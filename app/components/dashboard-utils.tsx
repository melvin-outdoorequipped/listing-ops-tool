// components/dashboard-utils.ts

'use client';

import { ReactNode, useState, useEffect, JSX } from 'react';
import { 
  Database, 
  SearchCheck, 
  MessageSquare, 
  FileSpreadsheet, 
  Building2 
} from 'lucide-react';

export interface Task {
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

export interface ToolRun {
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

export interface TeamMember {
  name: string;
  role: string;
  image: string;
  email: string;
  includeInRoulette: boolean;
  color: string;
}

export interface TaskFormValues {
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

export type TaskViewMode = 'table' | 'card' | 'list';

export const defaultTeamMembers: TeamMember[] = [
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

export const operationTools = [
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

export const getUserImage = (email: string): string | null => {
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
  
  if (!email) return null;
  const emailLower = email.toLowerCase();
  if (teamImages[emailLower]) return teamImages[emailLower];
  const username = emailLower.split('@')[0];
  if (teamImages[username]) return teamImages[username];
  for (const [key, value] of Object.entries(teamImages)) {
    if (username.includes(key) || key.includes(username)) return value;
  }
  return null;
};

export const StatusDot = ({ status }: { status: ToolRun['status'] }) => {
  const color = status === 'completed' ? 'bg-emerald-400' : status === 'warning' ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`} style={{ animationDuration: '2s' }} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
};

export const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── DATE HELPERS (US FORMAT, LOCALE-SAFE) ─────────────────────────────────
//
// Two problems these solve for a PH-based user working on US-facing dates:
//
// 1. `new Date().toISOString().split('T')[0]` converts to UTC before slicing
//    off the date. Manila is UTC+8, so any time before 8:00 AM local gets
//    rolled back to "yesterday" in UTC — the date picker silently shows the
//    wrong day. `toDateInputValue` below builds the YYYY-MM-DD string from
//    the LOCAL date components instead, so it always matches what's on the
//    user's wall clock.
//
// 2. `date.toLocaleDateString()` with no locale argument uses whatever
//    locale/region the browser or OS is set to. On a PH machine that can
//    render dates as DD/MM/YYYY instead of the US MM/DD/YYYY the team is
//    used to. `formatDate` / `formatDateUS` always pass `'en-US'` explicitly
//    so the format is consistent no matter where the app is opened from.

/** Build a `YYYY-MM-DD` string (for <input type="date">) from LOCAL date parts. */
export const toDateInputValue = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Parse a `YYYY-MM-DD` string into a local Date (avoids UTC parsing shifts). */
export const parseDateInput = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Today's date as a `YYYY-MM-DD` string, using LOCAL time (not UTC). */
export const todayDateInputValue = (): string => toDateInputValue(new Date());

/**
 * Safely convert any stored date value (Date, 'YYYY-MM-DD', ISO string, etc.)
 * into a `YYYY-MM-DD` string suitable for <input type="date">, without
 * letting a UTC round-trip shift the day.
 */
export const toDateInputValueFromAny = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : toDateInputValue(value);

  const raw = value.toString().trim();
  if (!raw) return '';

  // Already a plain YYYY-MM-DD (or starts with one, e.g. an ISO string) —
  // slice it directly instead of round-tripping through Date/UTC.
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return '';
  return toDateInputValue(parsed);
};

// In dashboard-utils.ts or wherever formatDate is defined
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/** Always-US-format date string, e.g. "8/4/2026". Use anywhere a raw
 *  `.toLocaleDateString()` (no args) would otherwise pick up the device's
 *  regional format. */
export const formatDateUS = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : 'N/A';
  return d.toLocaleDateString('en-US');
};

export const cleanStatusString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeStatus = (
  rawStatus: unknown,
  dateCompleted?: string | null,
  dateAssigned?: string | null,
  debugContext?: { rowIndex?: number | string; taskName?: string },
  validStatuses: string[] = []
): string => {
  const cleaned = cleanStatusString(rawStatus);
  const cleanedLower = cleaned.toLowerCase();
  const isEmpty =
    cleaned === '' || cleanedLower === 'null' || cleanedLower === 'undefined' || cleanedLower === '-';

  if (isEmpty) return 'Pending';

  const match = validStatuses.find((valid) => valid.toLowerCase() === cleanedLower);
  return match ?? cleaned;
};

export const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  
  const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
    'completed': { 
      bg: 'bg-emerald-500/20', 
      text: 'text-emerald-400', 
      dot: 'bg-emerald-400' 
    },
    'cancelled': { 
      bg: 'bg-red-500/20', 
      text: 'text-red-400', 
      dot: 'bg-red-400' 
    },
    'ongoing': { 
      bg: 'bg-blue-500/20', 
      text: 'text-blue-400', 
      dot: 'bg-blue-400' 
    },
    'assigned': { 
      bg: 'bg-cyan-500/20', 
      text: 'text-cyan-400', 
      dot: 'bg-cyan-400' 
    },
    'pending': { 
      bg: 'bg-yellow-500/20', 
      text: 'text-yellow-400', 
      dot: 'bg-yellow-400' 
    },
    'wip': { 
      bg: 'bg-indigo-500/20', 
      text: 'text-indigo-400', 
      dot: 'bg-indigo-400' 
    },
    'for audit': { 
      bg: 'bg-purple-500/20', 
      text: 'text-purple-400', 
      dot: 'bg-purple-400' 
    },
    'for investigation': { 
      bg: 'bg-orange-500/20', 
      text: 'text-orange-400', 
      dot: 'bg-orange-400' 
    },
    'hold': { 
      bg: 'bg-amber-500/20', 
      text: 'text-amber-400', 
      dot: 'bg-amber-400' 
    },
    'for correx': { 
      bg: 'bg-pink-500/20', 
      text: 'text-pink-400', 
      dot: 'bg-pink-400' 
    }
  };
  
  return statusMap[statusLower] || { 
    bg: 'bg-slate-500/20', 
    text: 'text-slate-400', 
    dot: 'bg-slate-400' 
  };
};

export const emptyTaskForm: TaskFormValues = {
  dateRequested: todayDateInputValue(),
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

export function useAnimatedCounter(targetValue: number): number {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let currentValue = 0;
    const increment = Math.max(1, Math.ceil(targetValue / 20));
    
    const interval = setInterval(() => {
      currentValue += increment;
      if (currentValue >= targetValue) {
        setDisplayValue(targetValue);
        clearInterval(interval);
      } else {
        setDisplayValue(currentValue);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [targetValue]);

  return displayValue;
}

export function Sparkline({ data, color }: { data: number[]; color: string }): JSX.Element {
  if (!data || data.length === 0) {
    return <div className="h-8 w-12 rounded bg-slate-200/20" />;
  }

  const maxValue = Math.max(...data, 1);
  const normalized = data.map(v => (v / maxValue) * 100);
  
  return (
    <svg viewBox="0 0 40 20" className="h-5 w-12 flex-shrink-0" preserveAspectRatio="none">
      <polyline
        points={normalized.map((v, i) => `${(i / (normalized.length - 1)) * 40},${20 - v / 5}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={normalized.map((v, i) => `${(i / (normalized.length - 1)) * 40},${20 - v / 5}`).join(' ')}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
        fillOpacity="0.3"
      />
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}