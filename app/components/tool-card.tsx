'use client';

import { ArrowRight } from 'lucide-react';
import { useAnimatedCounter, Sparkline } from './dashboard-utils';

interface ToolCardProps {
  tool: any;
  theme: 'light' | 'dark';
  runCount: number;
  sparkline: number[];
  onOpen: () => void;
}

export default function ToolCard({ tool, theme, runCount, sparkline, onOpen }: ToolCardProps) {
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
