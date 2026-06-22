// components/MaintenancePage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  AlertCircle,
  LogOut,
  User,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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

export default function MaintenancePage({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load user email
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  // Load announcements
  useEffect(() => {
    const loadAnnouncements = () => {
      const saved = localStorage.getItem('lot_announcements');
      if (saved) {
        try {
          const allAnnouncements = JSON.parse(saved);
          const active = allAnnouncements.filter((a: Announcement) => a.active);
          setAnnouncements(active);
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
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      // Clear any local session data
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      // Reload to show login page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force reload even if error
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getAnnounceColor = (type: string) => {
    switch (type) {
      case 'info': return { bg: isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200', text: 'text-blue-400', icon: <Info className="h-5 w-5" /> };
      case 'warning': return { bg: isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200', text: 'text-yellow-400', icon: <AlertTriangle className="h-5 w-5" /> };
      case 'success': return { bg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200', text: 'text-emerald-400', icon: <CheckCircle className="h-5 w-5" /> };
      case 'error': return { bg: isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200', text: 'text-red-400', icon: <AlertCircle className="h-5 w-5" /> };
      default: return { bg: '', text: isDark ? 'text-slate-400' : 'text-gray-500', icon: null };
    }
  };

  const maintenanceAnnouncements = announcements.filter(a => a.type === 'warning' || a.type === 'info');
  const firstAnnouncement = maintenanceAnnouncements[0];

  return (
    <div className={`flex min-h-screen w-full flex-col items-center justify-center p-4 transition-colors duration-200 ${
      isDark ? 'bg-[#0F172A]' : 'bg-gray-100'
    }`}>
      <div className={`w-full max-w-2xl rounded-2xl border p-8 text-center shadow-2xl ${
        isDark ? 'border-slate-700/50 bg-slate-900/90' : 'border-gray-200 bg-white'
      }`}>
        {/* User info & Logout button - Top right */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {userEmail || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isDark 
                ? 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' 
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Sign Out
              </>
            )}
          </button>
        </div>

        {/* Logo/Brand */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/20">
          <Wrench className="h-12 w-12 text-amber-400" />
        </div>

        {/* Title */}
        <h1 className={`mb-2 text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Under Maintenance
        </h1>
        <p className={`mb-6 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          We're currently performing scheduled maintenance to improve your experience.
        </p>

        {/* Status indicator */}
        <div className="mx-auto mb-8 flex items-center justify-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
          <span className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            System Unavailable
          </span>
        </div>

        {/* Countdown (optional) */}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm text-amber-400">
          <Clock className="h-4 w-4" />
          <span>Estimated downtime: ~{Math.floor(Math.random() * 15) + 5} minutes</span>
        </div>

        {/* Announcement */}
        {firstAnnouncement && (
          <div className={`mb-6 rounded-xl border p-4 text-left ${getAnnounceColor(firstAnnouncement.type).bg}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 ${getAnnounceColor(firstAnnouncement.type).text}`}>
                {getAnnounceColor(firstAnnouncement.type).icon}
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {firstAnnouncement.title}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {firstAnnouncement.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional announcements */}
        {maintenanceAnnouncements.length > 1 && (
          <div className="mb-6 space-y-2">
            {maintenanceAnnouncements.slice(1).map(ann => {
              const color = getAnnounceColor(ann.type);
              return (
                <div key={ann.id} className={`rounded-lg border p-3 text-left ${color.bg}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 flex-shrink-0 ${color.text}`}>{color.icon}</span>
                    <div>
                      <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {ann.title}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        {ann.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contact info */}
        <div className={`mt-8 rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Need immediate assistance? Contact support at{' '}
            <a href="mailto:melvin@outdoorequipped.com" className="text-emerald-400 hover:underline">
              melvin@outdoorequipped.com
            </a>
          </p>
          <p className={`mt-1 text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            Please check back in a few minutes
          </p>
        </div>

        {/* Logout hint at bottom */}
        <div className={`mt-4 text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          <span>Signed in as </span>
          <span className="font-medium text-emerald-400">{userEmail || 'User'}</span>
          <span className="mx-1">·</span>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`underline hover:text-emerald-400 transition-colors ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingOut ? 'Logging out...' : 'Not you? Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}