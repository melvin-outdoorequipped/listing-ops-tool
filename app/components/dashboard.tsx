'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Loader2,
  MessageSquare,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  TrendingUp,
  Zap,
  User,
  Trophy,
  Medal,
  Crown,
  ChevronLeft,
  ChevronRight,
  Users,
  FileSpreadsheet,
  FileJson,
  FileText,
  Download,
} from 'lucide-react';
import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

interface DashboardProps {
  theme?: 'light' | 'dark';
}

interface ToolRun {
  id: string;
  tool_type: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer';
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

interface UserStats {
  email: string;
  totalRuns: number;
  completedRuns: number;
  lastRun: string;
}

interface ToolCardItem {
  id: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer';
  category: string;
  title: string;
  description: string;
  status: string;
  usage: string;
  accent: 'blue' | 'green' | 'purple' | 'orange';
  icon: React.ReactNode;
  comingSoon?: boolean;
}

// Team members data with high-quality images
const teamMembers = [
  {
    name: 'Arlie',
    role: 'Team Manager',
    image: '/images/arlie.png',
    email: 'arlie@outdoorequipped.com',
  },
  {
    name: 'Melvin',
    role: 'Data Analyst',
    image: '/images/Melvin.png',
    email: 'melvin@outdoorequipped.com',
  },
  {
    name: 'Janroe',
    role: 'Data Analyst',
    image: '/images/janroe.png',
    email: 'janroe@outdoorequipped.com',
  },
  {
    name: 'Florante',
    role: 'Data Analyst',
    image: '/images/florante.png',
    email: 'florante@outdoorequipped.com',
  },
  {
    name: 'Jerald',
    role: 'Data Analyst',
    image: '/images/jerald.png',
    email: 'jerald@outdoorequipped.com',
  },
  {
    name: 'Juddy',
    role: 'Data Analyst',
    image: '/images/juddy.png',
    email: 'juddy@outdoorequipped.com',
  },
  {
    name: 'Shenna',
    role: 'Data Analyst',
    image: '/images/shenna.png',
    email: 'shenna@outdoorequipped.com',
  },
  {
    name: 'Wyndell',
    role: 'Data Analyst',
    image: '/images/wyndell.png',
    email: 'wjdelcorro@outdoorequipped.com',
  },
  {
    name: 'Jonisa',
    role: 'Data Analyst',
    image: '/images/jonisa.png',
    email: 'jonisa@outdoorequipped.com',
  },
  {
    name: 'Lawrence',
    role: 'Data Analyst',
    image: '/images/lawrence.png',
    email: 'lawrencelaudeza@outdoorequipped.com',
  },
  {
    name: 'Mark',
    role: 'Data Analyst',
    image: '/images/mark.png',
    email: 'mpasturan@outdoorequipped.com',
  }
];

// Team member images mapping for user avatars
const teamImages: Record<string, string> = {
  'arlie':'/images/arlie.png',
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
  'florante': '/image/florante.png'
};

// Helper function to get user image
function getUserImage(email: string): string | null {
  if (!email) return null;
  
  const emailLower = email.toLowerCase();
  
  if (teamImages[emailLower]) return teamImages[emailLower];
  
  const username = emailLower.split('@')[0];
  if (teamImages[username]) return teamImages[username];
  
  for (const [key, value] of Object.entries(teamImages)) {
    if (username.includes(key) || key.includes(username)) {
      return value;
    }
  }
  
  return null;
}

const operationTools: ToolCardItem[] = [
  {
    id: 'sku',
    category: 'LISTINGS',
    title: 'Shopkeep Consolidated Tool',
    description:
      'Process SKU lists, consolidate Shopkeep data, generate exports, and track batch imports.',
    status: 'Beta',
    usage: 'Unlimited',
    accent: 'blue',
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: 'asin',
    category: 'LISTINGS',
    title: 'Multiple Parent ASIN',
    description:
      'Detect styles connected to multiple unique parent ASINs before listing conflicts occur.',
    status: 'Active',
    usage: 'Unlimited',
    accent: 'green',
    icon: <SearchCheck className="h-4 w-4" />,
  },
  {
    id: 'basecamp',
    category: 'COMMUNICATIONS',
    title: 'Basecamp Response Generator',
    description:
      'Upload PO files and auto-generate formatted Basecamp messages for initial analysis, final analysis, pre-approval, or fixing updates.',
    status: 'Beta',
    usage: 'Unlimited',
    accent: 'purple',
    icon: <MessageSquare className="h-4 w-4" />,
    comingSoon: false,
  },
  {
    id: 'bulk-analyzer',
    category: 'ANALYTICS',
    title: 'File Generator',
    description:
      'Generate Listing Data, Pre-approval Files, Excluded Files, and For Fixing Files based on Remarks column filtering.',
    status: 'Active',
    usage: 'Unlimited',
    accent: 'orange',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    comingSoon: false,
  },
];

// --- Animated Counter Hook ---
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

// --- Mini Sparkline SVG ---
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`)
    .join(' ');
  const areaPoints = `0,${h} ` + points + ` ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-80">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline points={points} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) * step}
        cy={h - (data[data.length - 1] / max) * (h - 4)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// --- Status Dot (animated) ---
function StatusDot({ status }: { status: ToolRun['status'] }) {
  const color =
    status === 'completed' ? 'bg-emerald-400' :
    status === 'warning' ? 'bg-yellow-400' :
    'bg-red-400';
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`} style={{ animationDuration: '2s' }} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

// --- Relative time helper ---
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard({ theme = 'dark' }: DashboardProps) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

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
      setLastRefreshed(new Date());
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
      }, 3000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 5 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // Calculate top users
  const topUsers = useMemo(() => {
    const userMap = new Map<string, UserStats>();
    
    runs.forEach(run => {
      const email = run.user_email || 'System';
      if (!userMap.has(email)) {
        userMap.set(email, {
          email,
          totalRuns: 0,
          completedRuns: 0,
          lastRun: run.created_at,
        });
      }
      
      const stats = userMap.get(email)!;
      stats.totalRuns++;
      if (run.status === 'completed') stats.completedRuns++;
      if (new Date(run.created_at) > new Date(stats.lastRun)) {
        stats.lastRun = run.created_at;
      }
    });
    
    return Array.from(userMap.values())
      .sort((a, b) => b.totalRuns - a.totalRuns)
      .slice(0, 5);
  }, [runs]);

  const metrics = useMemo(() => {
    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const warningRuns = runs.filter(r => r.status === 'warning').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const skuRuns = runs.filter(r => r.tool_type === 'sku').length;
    const asinRuns = runs.filter(r => r.tool_type === 'asin').length;
    const basecampRuns = runs.filter(r => r.tool_type === 'basecamp').length;
    const bulkAnalyzerRuns = runs.filter(r => r.tool_type === 'bulk-analyzer').length;
    const totalProcessed = runs.reduce((s, r) => s + Number(r.total_count ?? 0), 0);
    const totalSuccess = runs.reduce((s, r) => s + Number(r.success_count ?? 0), 0);
    const totalIssues = runs.reduce((s, r) => s + Number(r.issue_count ?? 0), 0);
    const completionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;
    const successRate = totalProcessed > 0 ? Math.round((totalSuccess / totalProcessed) * 100) : 0;
    const issuesPerRun = totalRuns > 0 ? (totalIssues / totalRuns).toFixed(1) : '0';

    return {
      totalRuns, completedRuns, warningRuns, failedRuns,
      skuRuns, asinRuns, basecampRuns, bulkAnalyzerRuns,
      totalProcessed, totalSuccess, totalIssues,
      completionRate, successRate, issuesPerRun,
      activeTools: operationTools.filter(t => !t.comingSoon).length,
    };
  }, [runs]);

  const sparklineData = useMemo(() => {
    const days = 7;
    const now = Date.now();
    const getSparkline = (toolType: string) =>
      Array.from({ length: days }, (_, i) => {
        const dayStart = now - (days - 1 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        return runs.filter(r =>
          r.tool_type === toolType &&
          new Date(r.created_at).getTime() >= dayStart &&
          new Date(r.created_at).getTime() < dayEnd
        ).length;
      });
    return {
      sku: getSparkline('sku'),
      asin: getSparkline('asin'),
      basecamp: getSparkline('basecamp'),
      bulkAnalyzer: getSparkline('bulk-analyzer'),
    };
  }, [runs]);

  const recentRuns = useMemo(() => runs.slice(0, 12), [runs]);

  const navigateToTool = (toolId: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer') => {
    window.dispatchEvent(new CustomEvent('navigateToTool', { detail: { toolId } }));
  };

  const getRunCount = (id: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer') =>
    id === 'sku' ? metrics.skuRuns : 
    id === 'asin' ? metrics.asinRuns : 
    id === 'basecamp' ? metrics.basecampRuns : 
    metrics.bulkAnalyzerRuns;

  const getSparkline = (id: 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer') => {
    if (id === 'bulk-analyzer') return sparklineData.bulkAnalyzer;
    return sparklineData[id];
  };

  const maxToolRuns = Math.max(metrics.skuRuns, metrics.asinRuns, metrics.basecampRuns, metrics.bulkAnalyzerRuns, 1);

  const panelClass = isDark
    ? 'border-slate-700/50 bg-slate-900/70'
    : 'border-gray-200 bg-white';

  const pageText = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  const toolLabel: Record<string, string> = {
    sku: 'Shopkeep',
    asin: 'ASIN Checker',
    basecamp: 'Basecamp',
    'bulk-analyzer': 'File Generator',
  };

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden sm:space-y-6">

      {/* ── Header ── */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className={`break-words text-2xl font-bold tracking-tight sm:text-3xl ${pageText}`}>
              Dashboard
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className={`mt-1.5 text-sm ${mutedText}`}>
            Monitor tool performance and team activity in real-time
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'
        }`}>
          Dashboard error: {errorMessage}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          theme={theme}
          label="Total Runs"
          value={metrics.totalRuns}
          icon={<Activity className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          theme={theme}
          label="Success Rate"
          value={metrics.successRate}
          suffix="%"
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          theme={theme}
          label="Issues Found"
          value={metrics.totalIssues}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="yellow"
        />
        <StatCard
          theme={theme}
          label="Active Tools"
          value={metrics.activeTools}
          icon={<Zap className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* ── Tool Cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
        {operationTools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            theme={theme}
            runCount={getRunCount(tool.id)}
            sparkline={getSparkline(tool.id)}
            onOpen={() => navigateToTool(tool.id)}
          />
        ))}
      </section>

      {/* ── Metrics Details Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <MetricCard
          theme={theme}
          label="Completed"
          value={metrics.completedRuns}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="emerald"
        />
        <MetricCard
          theme={theme}
          label="Warnings"
          value={metrics.warningRuns}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="yellow"
        />
        <MetricCard
          theme={theme}
          label="Failed"
          value={metrics.failedRuns}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
        />
        <MetricCard
          theme={theme}
          label="Issues/Run"
          value={parseFloat(metrics.issuesPerRun)}
          icon={<Activity className="h-4 w-4" />}
          color="blue"
        />
      </div>

      {/* ── Team Members Carousel Section with Larger Images ── */}
      <section className={`rounded-2xl border shadow-sm overflow-hidden ${panelClass}`}>
        <div className={`border-b px-6 py-4 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/20 p-1.5">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${pageText}`}>Meet the Team</h2>
                <p className={`text-xs ${mutedText}`}>Listing Operations Team</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevSlide}
                className={`rounded-lg p-1 transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-1">
                {teamMembers.map((_, idx) => (
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
              <button
                onClick={nextSlide}
                className={`rounded-lg p-1 transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="w-full flex-shrink-0 px-6 py-10"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative group">
                    {/* Larger Circle Container */}
                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden ring-4 ring-emerald-500/30 group-hover:ring-emerald-500 transition-all duration-300 shadow-xl">
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={224}
                        height={224}
                        className="w-full h-full object-cover object-center"
                        priority
                        unoptimized={true}
                        quality={100}
                        sizes="(max-width: 640px) 192px, 224px"
                      />
                    </div>
                    {/* Online Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-500 border-3 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <h3 className={`mt-5 text-xl sm:text-2xl font-bold ${pageText}`}>{member.name}</h3>
                  <p className={`text-sm sm:text-base ${mutedText}`}>{member.role}</p>
                  <div className="mt-4 flex gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs font-medium ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Team Member
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two Column Layout: Top Users + Recent Activity ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        
        {/* Top Users Section - With team images */}
        <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
          <div className={`border-b px-5 py-4 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-yellow-500/20 p-1.5">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${pageText}`}>Top Users</h2>
                  <p className={`text-xs ${mutedText}`}>Most active team members</p>
                </div>
              </div>
              <div className={`text-xs ${mutedText}`}>
                Total {topUsers.reduce((sum, u) => sum + u.totalRuns, 0)} runs
              </div>
            </div>
          </div>

          {/* Scrollable content - Fixed height */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {topUsers.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className={`text-center text-sm ${mutedText}`}>
                  <User className="mx-auto h-10 w-10 opacity-30 mb-2" />
                  No user data available yet
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {topUsers.map((user, index) => {
                  const maxRuns = topUsers[0]?.totalRuns || 1;
                  const percentage = (user.totalRuns / maxRuns) * 100;
                  const successRate = user.totalRuns > 0 ? Math.round((user.completedRuns / user.totalRuns) * 100) : 0;
                  const userImage = getUserImage(user.email);
                  
                  return (
                    <div
                      key={user.email}
                      className={`group relative transition-all duration-200 p-4 ${
                        index === 0 
                          ? isDark 
                            ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' 
                            : 'bg-gradient-to-r from-yellow-100/30 to-transparent'
                          : ''
                      } ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8">
                          {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                          {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <Medal className="h-5 w-5 text-amber-600" />}
                          {index >= 3 && (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        
                        {/* Avatar with Image */}
                        <div className="flex-shrink-0">
                          {userImage ? (
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 transition-all">
                                <Image
                                  src={userImage}
                                  alt={user.email}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  quality={90}
                                />
                              </div>
                              {index === 0 && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                              index === 0 
                                ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' 
                                : index === 1
                                  ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
                                  : index === 2
                                    ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                                    : isDark 
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {user.email[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        
                        {/* User Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`truncate text-sm font-semibold ${pageText}`}>
                                {user.email.split('@')[0]}
                              </p>
                              {index === 0 && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  <Crown className="h-2.5 w-2.5" />
                                  Top
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`rounded-md px-2 py-0.5 text-center ${
                                isDark ? 'bg-slate-800' : 'bg-gray-100'
                              }`}>
                                <span className={`text-sm font-bold tabular-nums ${
                                  index === 0 ? 'text-yellow-400' : 'text-emerald-400'
                                }`}>
                                  {user.totalRuns}
                                </span>
                                <span className={`text-[9px] ml-0.5 ${mutedText}`}>runs</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span className={`text-[10px] ${mutedText}`}>
                                {user.completedRuns} completed
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={`h-1.5 w-1.5 rounded-full ${
                                successRate >= 80 ? 'bg-emerald-400' : successRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                              }`} />
                              <span className={`text-[10px] ${mutedText}`}>
                                {successRate}% success
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span className={`text-[10px] ${mutedText}`}>
                                {relativeTime(user.lastRun)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-emerald-500'
                                }`}
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

        {/* Recent Activity Section - Fixed height with scroll */}
        <section className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${panelClass}`}>
          <div className={`border-b px-5 py-4 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
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
              <span className={`text-xs ${mutedText}`}>
                Last {recentRuns.length} activities
              </span>
            </div>
          </div>

          {/* Scrollable content - Fixed height */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className={`h-6 w-6 animate-spin ${mutedText}`} />
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className={`text-center text-sm ${mutedText}`}>No activity yet</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentRuns.map((run, i) => (
                  <div
                    key={run.id}
                    className={`group flex items-center gap-3 px-5 py-3 transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <StatusDot status={run.status} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`truncate text-sm font-medium ${pageText}`}>{run.title}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          run.status === 'completed'
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            : run.status === 'warning'
                              ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${mutedText}`}>
                          {toolLabel[run.tool_type] ?? run.tool_type}
                          {run.total_count > 0 && ` · ${run.total_count.toLocaleString()} items`}
                        </span>
                      </div>
                      {run.user_email && run.user_email !== 'System' && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
                            <User className="h-2.5 w-2.5 text-emerald-400" />
                          </div>
                          <span className={`text-[10px] ${mutedText}`}>{run.user_email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-end">
                      <span className={`text-[10px] ${mutedText}`}>
                        {relativeTime(run.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper components remain the same...
function StatCard({ theme, label, value, suffix = '', icon, color }: any) {
  const isDark = theme === 'dark';
  const animValue = useAnimatedCounter(value);
  
  const colorClasses = {
    emerald: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    blue: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600',
    yellow: isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
    purple: isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-600',
  };

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${isDark ? 'border-slate-700/50 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {label}
          </p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {animValue.toLocaleString()}{suffix}
          </p>
        </div>
        <div className={`rounded-lg p-1.5 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ theme, label, value, icon, color }: any) {
  const isDark = theme === 'dark';
  const animValue = useAnimatedCounter(value);
  
  const colorClasses = {
    emerald: isDark ? 'text-emerald-400' : 'text-emerald-600',
    yellow: isDark ? 'text-yellow-400' : 'text-yellow-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
    blue: isDark ? 'text-blue-400' : 'text-blue-600',
  };

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${isDark ? 'border-slate-700/50 bg-slate-900/60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {label}
          </p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {animValue.toLocaleString()}
          </p>
        </div>
        <div className={`${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, theme, runCount, sparkline, onOpen }: any) {
  const isDark = theme === 'dark';
  const animCount = useAnimatedCounter(runCount);

  const getAccentConfig = () => {
    const accent = tool.accent;
    
    if (accent === 'purple') {
      return {
        card: isDark ? 'border-violet-500/25 bg-violet-950/40 hover:bg-violet-900/40 hover:border-violet-500/40' : 'border-violet-200 bg-violet-50 hover:bg-violet-100',
        badge: isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700',
        spark: '#8b5cf6',
        count: 'text-violet-400',
      };
    } else if (accent === 'green') {
      return {
        card: isDark ? 'border-emerald-500/25 bg-emerald-950/40 hover:bg-emerald-900/40 hover:border-emerald-500/40' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
        badge: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
        spark: '#10b981',
        count: 'text-emerald-400',
      };
    } else if (accent === 'orange') {
      return {
        card: isDark ? 'border-orange-500/25 bg-orange-950/40 hover:bg-orange-900/40 hover:border-orange-500/40' : 'border-orange-200 bg-orange-50 hover:bg-orange-100',
        badge: isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700',
        spark: '#f97316',
        count: 'text-orange-400',
      };
    } else {
      return {
        card: isDark ? 'border-cyan-500/25 bg-cyan-950/40 hover:bg-cyan-900/40 hover:border-cyan-500/40' : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100',
        badge: isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700',
        spark: '#06b6d4',
        count: 'text-cyan-400',
      };
    }
  };

  const accentConfig = getAccentConfig();

  const statusBadge = tool.status === 'Active' 
    ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
    : tool.status === 'Beta'
      ? isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
      : isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700';

  return (
    <button
      type="button"
      onClick={() => !tool.comingSoon && onOpen()}
      disabled={tool.comingSoon}
      className={`group relative flex min-h-[200px] w-full flex-col rounded-xl border p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md ${accentConfig.card} ${tool.comingSoon ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${isDark ? 'bg-slate-900/50 text-slate-300' : 'bg-white/70 text-gray-600'}`}>
          <span className="flex-shrink-0">{tool.icon}</span>
          <span className="truncate">{tool.category}</span>
        </div>
        <div className="flex-shrink-0">
          <Sparkline data={sparkline} color={accentConfig.spark} />
        </div>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <h3 className={`break-words text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tool.title}</h3>
        <p className={`mt-1 line-clamp-2 text-xs leading-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{tool.description}</p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusBadge}`}>{tool.status}</span>
        </div>
        <div className="flex flex-shrink-0 items-end gap-3">
          <div className="text-right">
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Runs</p>
            <p className={`text-lg font-bold tabular-nums ${accentConfig.count}`}>{animCount.toLocaleString()}</p>
          </div>
          {!tool.comingSoon && (
            <div className="rounded-full bg-black/40 p-1.5 text-white transition-all duration-200 group-hover:translate-x-0.5 group-hover:bg-black/60">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}