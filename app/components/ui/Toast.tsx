// components/ui/Toast.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
  theme: 'light' | 'dark';
}

// 🎄 Per-type emoji, purely decorative
const TOAST_EMOJI: Record<ToastType, string> = {
  success: '🎄',
  error: '⛄',
  warning: '❄️',
  info: '🎅',
};

export function ToastContainer({ messages, onRemove, theme }: ToastProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    const timers = messages.map(msg => {
      const duration = msg.duration || 4000;
      return setTimeout(() => {
        onRemove(msg.id);
      }, duration);
    });
    return () => timers.forEach(clearTimeout);
  }, [messages, onRemove]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex max-w-md w-full flex-col gap-2">
      {messages.map(msg => {
        // Christmas-themed colors, per type, for each theme
        const colors = {
          success: isDark
            ? 'border-green-500/50 bg-green-950/70 text-green-300 shadow-[0_0_20px_rgba(22,163,74,0.15)] backdrop-blur-sm'
            : 'border-green-500 bg-green-50 text-green-800 shadow-md',
          error: isDark
            ? 'border-red-500/50 bg-red-950/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)] backdrop-blur-sm'
            : 'border-red-500 bg-red-50 text-red-700 shadow-md',
          warning: isDark
            ? 'border-amber-500/50 bg-amber-950/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-sm'
            : 'border-amber-500 bg-amber-50 text-amber-800 shadow-md',
          info: isDark
            ? 'border-sky-500/50 bg-sky-950/60 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.15)] backdrop-blur-sm'
            : 'border-sky-400 bg-sky-50 text-sky-800 shadow-md',
        };

        const icons = {
          success: <CheckCircle2 className="h-5 w-5 flex-shrink-0" />,
          error: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
          info: <Info className="h-5 w-5 flex-shrink-0" />,
        };

        return (
          <div
            key={msg.id}
            className={`relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 animate-in slide-in-from-right-4 duration-300 ${colors[msg.type]}`}
          >
            {/* 🎄 Corner seasonal emoji — purely decorative */}
            <span
              className="pointer-events-none absolute right-8 top-1 select-none text-xs opacity-[0.35]"
              aria-hidden
            >
              {TOAST_EMOJI[msg.type]}
            </span>

            {icons[msg.type]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{msg.title}</p>
              {msg.message && (
                <p className="mt-0.5 text-sm opacity-90">{msg.message}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(msg.id)}
              className={`flex-shrink-0 rounded-lg p-1 transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
              }`}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast(theme: 'light' | 'dark') {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
    setMessages(prev => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return {
    messages,
    showToast,
    removeToast,
    toastContainer: <ToastContainer messages={messages} onRemove={removeToast} theme={theme} />,
  };
}