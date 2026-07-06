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

export function ToastContainer({ messages, onRemove, theme }: ToastProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    messages.forEach(msg => {
      const duration = msg.duration || 4000;
      const timer = setTimeout(() => {
        onRemove(msg.id);
      }, duration);
      return () => clearTimeout(timer);
    });
  }, [messages, onRemove]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-md w-full">
      {messages.map(msg => {
        const colors = {
          success: isDark ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-700',
          error: isDark ? 'border-red-500/50 bg-red-500/20 text-red-400' : 'border-red-500 bg-red-50 text-red-700',
          warning: isDark ? 'border-yellow-500/50 bg-yellow-500/20 text-yellow-400' : 'border-yellow-500 bg-yellow-50 text-yellow-700',
          info: isDark ? 'border-blue-500/50 bg-blue-500/20 text-blue-400' : 'border-blue-500 bg-blue-50 text-blue-700',
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
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-in slide-in-from-right-4 duration-300 ${colors[msg.type]}`}
          >
            {icons[msg.type]}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{msg.title}</p>
              {msg.message && (
                <p className="text-sm opacity-90 mt-0.5">{msg.message}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(msg.id)}
              className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/10"
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