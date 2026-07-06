// components/dashboard/dashboard-ui-kit.tsx
//
// Shared presentational primitives for the Task Management dashboard.
// Pulling these out of the two feature components removes hundreds of lines
// of duplicated `isDark ? '...' : '...'` ternaries and gives every button,
// badge, card, and empty state the same spacing/radius/motion rules.
//
// Nothing in here touches data, network calls, or business logic — it only
// renders what it's given.

'use client';

import React from 'react';
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
  UserX,
  PauseCircle,
  SearchCheck,
  AlertTriangle,
  Wrench,
  Circle,
  Inbox,
  SearchX,
  ServerCrash,
} from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Centralized so every surface (light/dark) reads consistently. 8px spacing
// scale is enforced via Tailwind's default spacing (2=8px steps already).

export const radius = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

// ─── STATUS SYSTEM ──────────────────────────────────────────────────────────
// One canonical mapping for every status word the sheet can produce. Unknown
// / future statuses (e.g. "For Audit", "Hold", "WIP") fall back to a neutral
// slate badge instead of breaking.

interface StatusVisual {
  icon: React.ComponentType<{ className?: string }>;
  light: string;
  dark: string;
  dot: string;
}

const STATUS_MAP: Record<string, StatusVisual> = {
  completed: {
    icon: CheckCircle2,
    light: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    dark: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  ongoing: {
    icon: PlayCircle,
    light: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    dark: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30',
    dot: 'bg-blue-500',
  },
  wip: {
    icon: PlayCircle,
    light: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    dark: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30',
    dot: 'bg-blue-500',
  },
  pending: {
    icon: Clock,
    light: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dark: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  hold: {
    icon: PauseCircle,
    light: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dark: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  cancelled: {
    icon: XCircle,
    light: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    dark: 'bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30',
    dot: 'bg-rose-500',
  },
  assigned: {
    icon: UserX,
    light: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    dark: 'bg-violet-500/15 text-violet-400 ring-1 ring-inset ring-violet-500/30',
    dot: 'bg-violet-500',
  },
  'for audit': {
    icon: SearchCheck,
    light: 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200',
    dark: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-inset ring-cyan-500/30',
    dot: 'bg-cyan-500',
  },
  'for investigation': {
    icon: AlertTriangle,
    light: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    dark: 'bg-orange-500/15 text-orange-400 ring-1 ring-inset ring-orange-500/30',
    dot: 'bg-orange-500',
  },
  'for correction': {
    icon: Wrench,
    light: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200',
    dark: 'bg-fuchsia-500/15 text-fuchsia-400 ring-1 ring-inset ring-fuchsia-500/30',
    dot: 'bg-fuchsia-500',
  },
};

const FALLBACK_STATUS: StatusVisual = {
  icon: Circle,
  light: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200',
  dark: 'bg-slate-700/50 text-slate-300 ring-1 ring-inset ring-slate-600/50',
  dot: 'bg-gray-400',
};

export function getStatusVisual(status: string): StatusVisual {
  return STATUS_MAP[status?.toLowerCase()?.trim()] || FALLBACK_STATUS;
}

export function StatusBadge({
  status,
  theme,
  size = 'md',
  showIcon = true,
}: {
  status: string;
  theme: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}) {
  const visual = getStatusVisual(status);
  const Icon = visual.icon;
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };
  const iconSize = { sm: 'h-3 w-3', md: 'h-3.5 w-3.5', lg: 'h-4 w-4' };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        sizeClasses[size],
        theme === 'dark' ? visual.dark : visual.light
      )}
    >
      {showIcon ? (
        <Icon className={iconSize[size]} />
      ) : (
        <span className={cn('rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2', visual.dot)} />
      )}
      {status || 'Unknown'}
    </span>
  );
}

// ─── BUTTON ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, { light: string; dark: string }> = {
  primary: {
    light: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
    dark: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm shadow-emerald-500/20',
  },
  secondary: {
    light: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    dark: 'bg-slate-700/70 text-slate-200 hover:bg-slate-700',
  },
  outline: {
    light: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    dark: 'border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800',
  },
  ghost: {
    light: 'text-gray-600 hover:bg-gray-100',
    dark: 'text-slate-300 hover:bg-slate-800',
  },
  danger: {
    light: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
    dark: 'bg-rose-500 text-white hover:bg-rose-400 shadow-sm shadow-rose-500/20',
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-3 text-base gap-2 rounded-xl',
  icon: 'p-2 rounded-lg',
};

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  theme,
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  title,
  type = 'button',
  ariaLabel,
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  theme: 'light' | 'dark';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      aria-busy={isLoading}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97]',
        focusRing,
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant][theme],
        isDisabled && 'opacity-50 cursor-not-allowed active:scale-100',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      ) : (
        Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {children}
    </button>
  );
}

// ─── CARD ───────────────────────────────────────────────────────────────────

export function Card({
  children,
  theme,
  className = '',
  interactive = false,
  highlighted = false,
}: {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  className?: string;
  interactive?: boolean;
  highlighted?: boolean;
}) {
  const isDark = theme === 'dark';
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isDark ? 'border-slate-700/80 bg-slate-800/40' : 'border-gray-200 bg-white',
        interactive && (isDark ? 'hover:bg-slate-800 hover:border-slate-600' : 'hover:bg-gray-50 hover:border-gray-300'),
        interactive && 'hover:shadow-md hover:-translate-y-0.5',
        highlighted && (isDark ? 'ring-1 ring-emerald-500/40 border-emerald-500/40' : 'ring-1 ring-emerald-300 border-emerald-300'),
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

export function EmptyState({
  theme,
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  theme: 'light' | 'dark';
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const isDark = theme === 'dark';
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
      <div className={cn('rounded-full p-4 mb-4', isDark ? 'bg-slate-800' : 'bg-gray-100')}>
        <Icon className={cn('h-8 w-8 sm:h-10 sm:w-10', isDark ? 'text-slate-500' : 'text-gray-400')} />
      </div>
      <p className={cn('text-lg sm:text-xl font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{title}</p>
      {description && (
        <p className={cn('mt-1.5 text-sm sm:text-base max-w-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Convenience presets used by the two components
export const NoResultsState = ({ theme, onClear }: { theme: 'light' | 'dark'; onClear?: () => void }) => (
  <EmptyState
    theme={theme}
    icon={SearchX}
    title="No tasks match your filters"
    description="Try widening your search or clearing a filter to see more results."
    action={
      onClear && (
        <Button theme={theme} variant="outline" onClick={onClear}>
          Clear all filters
        </Button>
      )
    }
  />
);

export const LoadErrorState = ({ theme, message, onRetry }: { theme: 'light' | 'dark'; message: string; onRetry: () => void }) => (
  <EmptyState
    theme={theme}
    icon={ServerCrash}
    title="Couldn't load tasks"
    description={message}
    action={
      <Button theme={theme} variant="primary" onClick={onRetry}>
        Try again
      </Button>
    }
  />
);

// ─── SKELETON LOADERS ───────────────────────────────────────────────────────
// Shown on first load instead of a bare spinner, so the layout doesn't jump
// once real rows arrive.

function shimmer(isDark: boolean) {
  return cn('animate-pulse rounded-md', isDark ? 'bg-slate-700/60' : 'bg-gray-200');
}

export function TableSkeleton({ theme, rows = 6, columns = 7 }: { theme: 'light' | 'dark'; rows?: number; columns?: number }) {
  const isDark = theme === 'dark';
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={cn('flex items-center gap-4 px-2 sm:px-4 py-3.5 border-b', isDark ? 'border-slate-800' : 'border-gray-100')}>
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className={cn(shimmer(isDark), 'h-4')} style={{ width: c === 0 ? '24px' : `${60 + ((c * 37) % 100)}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ theme, count = 6 }: { theme: 'light' | 'dark'; count?: number }) {
  const isDark = theme === 'dark';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('rounded-xl border p-4 sm:p-5 space-y-3', isDark ? 'border-slate-700/80 bg-slate-800/40' : 'border-gray-200 bg-white')}>
          <div className={cn(shimmer(isDark), 'h-4 w-2/3')} />
          <div className={cn(shimmer(isDark), 'h-3 w-full')} />
          <div className={cn(shimmer(isDark), 'h-3 w-1/2')} />
          <div className="flex gap-2 pt-2">
            <div className={cn(shimmer(isDark), 'h-7 w-20')} />
            <div className={cn(shimmer(isDark), 'h-7 w-20')} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FORM PRIMITIVES ────────────────────────────────────────────────────────

export function FieldLabel({
  children,
  theme,
  required = false,
}: {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  required?: boolean;
}) {
  return (
    <label className={cn('mb-1.5 block text-xs sm:text-sm font-medium', theme === 'dark' ? 'text-slate-300' : 'text-gray-600')}>
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

export function inputClasses(theme: 'light' | 'dark', hasError?: boolean) {
  const isDark = theme === 'dark';
  return cn(
    'w-full border px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg transition-colors',
    focusRing,
    isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    hasError && (isDark ? 'border-rose-500/60' : 'border-rose-400')
  );
}

// ─── MODAL SHELL ────────────────────────────────────────────────────────────
// Wraps the repeated backdrop + centered panel + header/footer pattern used
// by every dialog in the app, with consistent enter animation and ESC support.

export function Modal({
  isOpen,
  onClose,
  theme,
  children,
  maxWidth = 'max-w-2xl',
  zIndex = 'z-50',
  labelledBy,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
  labelledBy?: string;
}) {
  const isDark = theme === 'dark';

  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className={cn('fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200', zIndex)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-2 duration-200',
          maxWidth,
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  onClose,
  theme,
  titleId,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  theme: 'light' | 'dark';
  titleId?: string;
}) {
  const isDark = theme === 'dark';
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center justify-between gap-3 border-b p-4 sm:p-5 backdrop-blur',
        isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={cn('rounded-lg p-2 flex-shrink-0', iconClassName || (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'))}>
            <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
          </div>
        )}
        <div className="min-w-0">
          <h3 id={titleId} className={cn('text-base sm:text-lg font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
            {title}
          </h3>
          {subtitle && <p className={cn('text-xs sm:text-sm truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close dialog"
        className={cn('rounded-lg p-1.5 sm:p-2 transition-colors flex-shrink-0', focusRing, isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100')}
      >
        <XCircle className={cn('h-5 w-5 sm:h-6 sm:w-6', isDark ? 'text-slate-400' : 'text-gray-500')} />
      </button>
    </div>
  );
}

export function ModalFooter({ theme, children, align = 'end' }: { theme: 'light' | 'dark'; children: React.ReactNode; align?: 'end' | 'between' }) {
  const isDark = theme === 'dark';
  return (
    <div
      className={cn(
        'sticky bottom-0 border-t p-4 sm:p-5 flex flex-col sm:flex-row gap-2 sm:gap-3 backdrop-blur',
        align === 'between' ? 'sm:justify-between sm:items-center' : 'sm:justify-end',
        isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'
      )}
    >
      {children}
    </div>
  );
}