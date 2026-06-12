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
} from 'lucide-react';
import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

interface DashboardProps {
  theme?: 'light' | 'dark';
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

// Team members data (Arlie excluded from roulette)
const teamMembers = [
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

// Get eligible members for roulette (excluding Arlie) - ALWAYS 10 members
const eligibleMembers = teamMembers.filter(m => m.includeInRoulette);

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

// Member Roulette Modal Component - Shows ALL 10 members always with accurate pointer alignment
function MemberRouletteModal({ isOpen, onClose, theme }: { isOpen: boolean; onClose: () => void; theme: 'light' | 'dark' }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMember, setSelectedMember] = useState<typeof eligibleMembers[0] | null>(null);
  const [rotation, setRotation] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allMembersSelected, setAllMembersSelected] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = theme === 'dark';

  // Get available members (not yet selected) - for tracking only, NOT for removing from wheel
  const getAvailableMembers = () => {
    return eligibleMembers.filter(m => !selectedMembers.includes(m.name));
  };

  const spinRoulette = () => {
    if (isSpinning) return;
    
    const availableMembers = getAvailableMembers();
    if (availableMembers.length === 0) {
      return;
    }
    
    setIsSpinning(true);
    setSelectedMember(null);
    setShowConfetti(false);
    
    // Select a random member from available members
    const finalMember = availableMembers[Math.floor(Math.random() * availableMembers.length)];
    const finalIndex = eligibleMembers.findIndex(m => m.name === finalMember.name);
    
    // Calculate the angle for each segment
    const segmentAngle = 360 / eligibleMembers.length;
    // The center of the selected segment
    const targetSegmentCenter = (finalIndex * segmentAngle) + (segmentAngle / 2);
    
    // The pointer is at the TOP (12 o'clock position = -90 degrees or 270 degrees)
    // In CSS rotation, 0deg starts at 3 o'clock (right side)
    const pointerAngle = 270; // Pointer at top (12 o'clock)
    
    // Calculate how much we need to rotate to bring target to pointer
    // We want: (currentRotation + rotationNeeded) % 360 = pointerAngle - targetSegmentCenter
    let rotationNeeded = (pointerAngle - targetSegmentCenter - (rotation % 360) + 360) % 360;
    
    // Add multiple full spins for animation effect (between 10-20 full rotations)
    const fullSpins = 10 + Math.floor(Math.random() * 11);
    const newRotation = rotation + (fullSpins * 360) + rotationNeeded;
    
    setRotation(newRotation);
    
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    
    spinTimeoutRef.current = setTimeout(() => {
      setSelectedMember(finalMember);
      
      const newSelectedMembers = [...selectedMembers, finalMember.name];
      setSelectedMembers(newSelectedMembers);
      
      if (newSelectedMembers.length === eligibleMembers.length) {
        setAllMembersSelected(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      setIsSpinning(false);
    }, 3000);
  };

  const resetRoulette = () => {
    if (isSpinning) return;
    setSelectedMember(null);
    setSelectedMembers([]);
    setAllMembersSelected(false);
    setRotation(0);
    setShowConfetti(false);
  };

  const modalClass = isDark 
    ? 'bg-slate-900 border-slate-700' 
    : 'bg-white border-gray-200';

  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-gray-500';

  const remainingCount = getAvailableMembers().length;
  const totalCount = eligibleMembers.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 2 + 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${modalClass} animate-in zoom-in-95 duration-200`}>
        {/* Header */}
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
          <button
            onClick={onClose}
            className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
          >
            <X className={`h-5 w-5 ${mutedTextClass}`} />
          </button>
        </div>

        {/* Selection Progress and Reset Button */}
        <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${mutedTextClass}`}>Selection Progress</span>
              <button
                onClick={resetRoulette}
                disabled={isSpinning || selectedMembers.length === 0}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                  isSpinning || selectedMembers.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshIcon className="h-3 w-3" />
                Reset All
              </button>
            </div>
            <span className={`text-xs ${textClass}`}>
              <span className="font-bold text-emerald-400">{selectedMembers.length}</span> / {totalCount} selected
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(selectedMembers.length / totalCount) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {eligibleMembers.map(member => (
              <div
                key={member.name}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                  selectedMembers.includes(member.name)
                    ? 'bg-emerald-500/20 text-emerald-400 line-through decoration-emerald-400'
                    : isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {selectedMembers.includes(member.name) ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                )}
                {member.name}
              </div>
            ))}
          </div>
          {allMembersSelected && (
            <div className={`mt-3 rounded-lg p-2 text-center text-xs animate-in slide-in-from-top-1 fade-in duration-300 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              🎉 Congratulations! All team members have been selected! Click Reset to start a new round. 🎉
            </div>
          )}
        </div>

        {/* Roulette Wheel - ALWAYS shows all members */}
        <div className="p-8">
          <div className="relative flex justify-center">
            {/* Glowing ring effect */}
            <div className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse" style={{
              background: 'conic-gradient(from 0deg, #378ADD, #1D9E75, #7F77DD, #BA7517, #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899)'
            }} />
            
            {/* Pointer - Red triangle at top */}
            <div className="absolute -top-6 left-1/2 z-10 -translate-x-1/2">
              <div className="h-8 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-red-500 drop-shadow-lg" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>
            
            {/* Wheel - Always shows all eligible members (10 members) */}
            <div
              className="relative h-80 w-80 rounded-full shadow-2xl cursor-pointer"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.1, 0.1, 1)' : 'none',
                background: `conic-gradient(${eligibleMembers.map((member, i) => {
                  const startAngle = (i / eligibleMembers.length) * 360;
                  const endAngle = ((i + 1) / eligibleMembers.length) * 360;
                  // Dim selected members on the wheel
                  const isSelected = selectedMembers.includes(member.name);
                  const color = isSelected ? `${member.color}80` : member.color;
                  return `${color} ${startAngle}deg ${endAngle}deg`;
                }).join(', ')})`,
                boxShadow: isSpinning ? '0 0 40px rgba(255,255,255,0.4)' : '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              {eligibleMembers.map((member, index) => {
                const angle = (index / eligibleMembers.length) * 360 + (360 / eligibleMembers.length / 2);
                const radius = 130;
                const isSelected = selectedMembers.includes(member.name);
                return (
                  <div
                    key={member.name}
                    className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                    style={{
                      transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`,
                      opacity: isSelected ? 0.5 : 1,
                      filter: isSelected ? 'grayscale(0.3)' : 'none',
                    }}
                  >
                    {/* Member avatar on wheel */}
                    <div className={`w-12 h-12 rounded-full bg-white/95 shadow-lg flex items-center justify-center overflow-hidden border-2 ${isSelected ? 'border-gray-400' : 'border-white'}`}>
                      {member.image ? (
                        <Image src={member.image} alt={member.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: member.color }}>{member.name[0]}</span>
                      )}
                    </div>
                    <span className={`mt-1 text-[10px] font-semibold text-white drop-shadow-md px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-black/60' : 'bg-black/40'}`}>
                      {member.name}
                      {isSelected && ' ✓'}
                    </span>
                  </div>
                );
              })}
              
              {/* Center decoration */}
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner flex items-center justify-center border-4 border-slate-700">
                <div className="text-center">
                  <Sparkles className="h-7 w-7 text-yellow-400 mx-auto animate-pulse" />
                  <span className="text-[9px] text-white mt-1 block font-bold">ROULETTE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spin Button */}
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={spinRoulette}
              disabled={isSpinning || remainingCount === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold transition-all transform hover:scale-105 ${
                isSpinning || remainingCount === 0
                  ? 'cursor-not-allowed opacity-50 bg-slate-600'
                  : isDark
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:from-purple-500 hover:to-pink-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:from-purple-400 hover:to-pink-400'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Spinning...
                </>
              ) : remainingCount === 0 ? (
                <>
                  <RotateCcw className="h-5 w-5" />
                  Round Complete
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5" />
                  Spin the Wheel ({remainingCount} left)
                </>
              )}
            </button>
          </div>

          {/* Sound effect hint */}
          {isSpinning && (
            <div className="mt-3 text-center">
              <span className={`text-xs ${mutedTextClass} animate-pulse`}>
                🎵 Spin spin spin... 🎵
              </span>
            </div>
          )}

          {/* Result Display with Animation */}
          {selectedMember && !isSpinning && (
            <div className={`mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500 rounded-xl border-2 p-5 text-center ${
              isDark 
                ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-purple-500/20' 
                : 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-purple-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-emerald-500 shadow-xl">
                    <Image src={selectedMember.image} alt={selectedMember.name} width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-xs font-medium ${mutedTextClass}`}>🎉 Winner Selected! 🎉</p>
                  <p className={`text-2xl font-bold ${textClass} mt-1`}>{selectedMember.name}</p>
                  <p className={`text-sm ${mutedTextClass}`}>{selectedMember.role}</p>
                  {!allMembersSelected && (
                    <p className={`text-xs mt-2 text-emerald-400`}>
                      {remainingCount - 1} members remaining
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
          position: absolute;
        }
      `}</style>
    </div>
  );
}

export default function Dashboard({ theme = 'dark' }: DashboardProps) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
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
        setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
      }, 3000);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
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

  // Create user stats map from runs
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

  // Combine team members with their run stats and sort by total runs (highest first)
  const allUsers = useMemo(() => {
    const usersWithStats = teamMembers.map(member => {
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

  return (
    <>
      <div className="w-full max-w-full space-y-5 overflow-hidden sm:space-y-6">
        {/* Header */}
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
            </div>
            <p className={`mt-1.5 text-sm ${mutedText}`}>Listing Operations · Real-time overview</p>
          </div>
          <button onClick={fetchDashboardData} disabled={isLoading} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh
          </button>
        </section>

        {errorMessage && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>Dashboard error: {errorMessage}</div>}

        {/* Stats Bar - 4 columns */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className={`rounded-xl border p-3 shadow-sm ${panelClass}`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${mutedText}`}>Total runs</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${pageText}`}>{metrics.totalRuns.toLocaleString()}</p>
            <p className={`mt-1 text-[10px] ${mutedText}`}>All time</p>
          </div>
          <div className={`rounded-xl border p-3 shadow-sm ${panelClass}`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${mutedText}`}>Completion rate</p>
            <p className={`mt-1 text-xl font-bold tabular-nums text-emerald-400`}>{metrics.completionRate}%</p>
            <p className={`mt-1 text-[10px] ${mutedText}`}>Completed</p>
          </div>
          <div className={`rounded-xl border p-3 shadow-sm ${panelClass}`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${mutedText}`}>Items processed</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${pageText}`}>{metrics.totalProcessed.toLocaleString()}</p>
            <p className={`mt-1 text-[10px] ${mutedText}`}>Across all tools</p>
          </div>
          <div className={`rounded-xl border p-3 shadow-sm ${panelClass}`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${mutedText}`}>Issues flagged</p>
            <p className={`mt-1 text-xl font-bold tabular-nums text-red-400`}>{metrics.totalIssues.toLocaleString()}</p>
            <p className={`mt-1 text-[10px] ${mutedText}`}>Needs review</p>
          </div>
        </div>

        {/* Operation Tools Section */}
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

        {/* 3-Column Bottom Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Top Users Panel */}
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

          {/* Recent Activity Panel */}
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

          {/* Team Panel - Carousel with Member Roulette Button */}
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
                {teamMembers.map((member, idx) => (
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
          </section>
        </div>
      </div>

      {/* Member Roulette Modal */}
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