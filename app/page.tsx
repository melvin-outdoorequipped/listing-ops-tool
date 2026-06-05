'use client';

import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Search,
  Settings,
  User,
  X,
  GitBranch,
  LogOut,
  FileSpreadsheet,
} from 'lucide-react';

import SkuProcessor from './components/SkuProcessor';
import AsinConflictChecker from './components/AsinConflictChecker';
import BasecampGenerator from './components/BasecampGenerator';
import FileGenerator from './components/BulkAnalyzerFileGenerator'; // Import renamed component
import Dashboard from './components/dashboard';
import Documentation from './components/documentation';
import Terms from './components/terms';
import DownloadPage from './components/download';
import { supabase } from '@/lib/supabase/client';

type Theme = 'light' | 'dark';
type ToolId = 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer';
type MainMenuId = 'Dashboard' | 'Tools' | 'Downloads' | 'Documentation' | 'Terms';

interface MenuItem {
  id: MainMenuId;
  label: string;
  icon: ReactNode;
  shortcut?: string;
}

interface ToolItem {
  id: ToolId;
  name: string;
  description: string;
  icon: ReactNode;
  accent: 'emerald' | 'cyan' | 'violet' | 'orange';
  comingSoon?: boolean;
}

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

interface User {
  id: string;
  email: string;
}

const STORAGE_THEME_KEY = 'theme';

const toolsSubItems: ToolItem[] = [
  {
    id: 'sku',
    name: 'Shopkeep Consolidated Tool',
    description: 'Process and consolidate SKU data.',
    icon: <Search className="h-4 w-4" />,
    accent: 'cyan',
  },
  {
    id: 'asin',
    name: 'Multiple Parent ASIN Checker',
    description: 'Detect styles with multiple parent ASINs.',
    icon: <GitBranch className="h-4 w-4" />,
    accent: 'emerald',
  },
  {
    id: 'basecamp',
    name: 'Basecamp Response Generator',
    description: 'Generate formatted Basecamp messages.',
    icon: <MessageSquare className="h-4 w-4" />,
    accent: 'violet',
  },
  {
    id: 'bulk-analyzer',
    name: 'File Generator',
    description: 'Generate Listing Data, Pre-approval, Excluded, and For Fixing files.',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    accent: 'orange',
  },
];

const ALL_COMMANDS = [
  { label: 'Go to Dashboard', menuId: 'Dashboard' as MainMenuId, toolId: null },
  { label: 'Go to Downloads', menuId: 'Downloads' as MainMenuId, toolId: null },
  { label: 'Go to Documentation', menuId: 'Documentation' as MainMenuId, toolId: null },
  { label: 'Go to Terms & Conditions', menuId: 'Terms' as MainMenuId, toolId: null },
  { label: 'Open Shopkeep Tool', menuId: 'Tools' as MainMenuId, toolId: 'sku' as ToolId },
  { label: 'Open ASIN Checker', menuId: 'Tools' as MainMenuId, toolId: 'asin' as ToolId },
  { label: 'Open Basecamp Generator', menuId: 'Tools' as MainMenuId, toolId: 'basecamp' as ToolId },
  { label: 'Open File Generator', menuId: 'Tools' as MainMenuId, toolId: 'bulk-analyzer' as ToolId },
];

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'Shopkeep run completed successfully.', time: '2m ago', read: false, type: 'success' },
  { id: '2', message: 'ASIN Checker flagged 3 conflicts.', time: '18m ago', read: false, type: 'warning' },
  { id: '3', message: 'Basecamp Generator is now active.', time: '1h ago', read: true, type: 'info' },
];

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark');
  }
}

// Auth Component with Background Image
function AuthModal({ theme, onSuccess }: { theme: Theme; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [imageError, setImageError] = useState(false);
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for verification link!');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const backgroundImageUrl = "/login.png";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {!imageError && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
          }}
        >
          <div className={`absolute inset-0 ${
            isDark ? 'bg-black/70' : 'bg-white/30'
          }`} />
        </div>
      )}
      
      {imageError && (
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100'
        }`} />
      )}
      
      <div className={`relative w-full max-w-md rounded-2xl border p-8 shadow-2xl backdrop-blur-md ${
        isDark ? 'border-slate-700 bg-slate-900/95' : 'border-gray-200 bg-white/95'
      }`}>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500">
            <span className="text-2xl font-bold text-white">LOT</span>
          </div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome to LOT
          </h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {mode === 'signin' ? 'Sign in to access tools' : 'Create an account to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/90 text-white' 
                  : 'border-gray-300 bg-white/90 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/90 text-white' 
                  : 'border-gray-300 bg-white/90 text-gray-900'
              }`}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
      
      <img 
        src={backgroundImageUrl}
        alt=""
        className="hidden"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}

export default function HomePage() {
  const [activeTool, setActiveTool] = useState<ToolId>('sku');
  const [activeMainMenu, setActiveMainMenu] = useState<MainMenuId>('Dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  const [userOpen, setUserOpen] = useState(false);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevMenuRef = useRef<MainMenuId>('Dashboard');

  const isDark = theme === 'dark';
  const unreadCount = notifications.filter(n => !n.read).length;

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email || '' });
      } else {
        setShowAuthModal(true);
      }
      setIsAuthLoading(false);
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setShowAuthModal(false);
      } else {
        setUser(null);
        setShowAuthModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowAuthModal(true);
    setUserOpen(false);
  };

  const mainMenuItems = useMemo<MenuItem[]>(() => [
    { id: 'Dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, shortcut: '⌘1' },
    { id: 'Tools', label: 'Tools', icon: <Settings className="h-5 w-5" />, shortcut: '⌘2' },
    { id: 'Downloads', label: 'Downloads', icon: <Download className="h-5 w-5" />, shortcut: '⌘3' },
  ], []);

  const resourceMenuItems = useMemo<MenuItem[]>(() => [
    { id: 'Documentation', label: 'Documentation', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'Terms', label: 'Terms & Conditions', icon: <FileText className="h-5 w-5" /> },
  ], []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const init: Theme = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
    setTheme(init);
    applyTheme(init);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<{ toolId: ToolId }>;
      const toolId = e.detail?.toolId;
      if (!['sku', 'asin', 'basecamp', 'bulk-analyzer'].includes(toolId)) return;
      const found = toolsSubItems.find(t => t.id === toolId);
      if (found?.comingSoon) return;
      navigateTo('Tools', toolId);
      setIsMobileSidebarOpen(false);
    };
    window.addEventListener('navigateToTool', handler);
    return () => window.removeEventListener('navigateToTool', handler);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false);
        setCmdOpen(false);
        setNotifOpen(false);
        setUserOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); navigateTo('Dashboard'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); navigateTo('Tools'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); navigateTo('Downloads'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (cmdOpen) { setCmdQuery(''); setTimeout(() => cmdInputRef.current?.focus(), 50); }
  }, [cmdOpen]);

  const navigateTo = useCallback((menuId: MainMenuId, toolId?: ToolId) => {
    if (menuId === 'Tools' && activeMainMenu === 'Tools' && !toolId) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMainMenu(menuId);
      if (toolId) setActiveTool(toolId);
      prevMenuRef.current = menuId;
      setIsTransitioning(false);
    }, 120);
  }, [activeMainMenu]);

  const toggleTheme = useCallback(() => {
    setTheme(cur => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  const handleMainMenuClick = (id: MainMenuId) => {
    navigateTo(id);
    setIsMobileSidebarOpen(false);
  };

  const handleToolClick = (toolId: ToolId, comingSoon?: boolean) => {
    if (comingSoon) return;

    if (activeMainMenu !== 'Tools') {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveMainMenu('Tools');
        setActiveTool(toolId);
        prevMenuRef.current = 'Tools';
        setIsTransitioning(false);
      }, 120);
    } else {
      setActiveTool(toolId);
    }

    setIsMobileSidebarOpen(false);
  };

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));

  const filteredCmds = ALL_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  const selectedTool = toolsSubItems.find(t => t.id === activeTool);

  const pageMeta = useMemo(() => {
    if (activeMainMenu === 'Dashboard') return {
      title: 'Dashboard', breadcrumb: 'Overview / Dashboard',
      description: 'Monitor operation tools and launch listing workflows.',
    };
    if (activeMainMenu === 'Tools') {
      const t = toolsSubItems.find(t => t.id === activeTool);
      return { title: t?.name ?? 'Tools', breadcrumb: `Tools / ${t?.name ?? 'Selected Tool'}`, description: t?.description ?? '' };
    }
    if (activeMainMenu === 'Downloads') return {
      title: 'Downloads', breadcrumb: 'Files / Downloads',
      description: 'Download generated files from completed tool runs.',
    };
    if (activeMainMenu === 'Documentation') return {
      title: 'Documentation', breadcrumb: 'Resources / Documentation',
      description: 'Simple guide for using LOT tools.',
    };
    return { title: 'Terms & Conditions', breadcrumb: 'Resources / Terms & Conditions', description: 'Simple usage terms and reminders.' };
  }, [activeMainMenu, activeTool]);

  const renderContent = () => {
    // Don't render content if not authenticated
    if (!user) return null;
    
    if (activeMainMenu === 'Dashboard') return <Dashboard theme={theme} />;
    if (activeMainMenu === 'Downloads') return <DownloadPage theme={theme} />;
    if (activeMainMenu === 'Documentation') return <Documentation theme={theme} />;
    if (activeMainMenu === 'Terms') return <Terms theme={theme} />;
    if (activeMainMenu === 'Tools') {
      if (activeTool === 'sku') return <SkuProcessor theme={theme} />;
      if (activeTool === 'asin') return <AsinConflictChecker theme={theme} />;
      if (activeTool === 'basecamp') return <BasecampGenerator theme={theme} />;
      if (activeTool === 'bulk-analyzer') return <FileGenerator theme={theme} />;
    }
    return null;
  };

  // Show loading state
  if (isAuthLoading) {
    return (
      <div className={`flex h-screen items-center justify-center ${isDark ? 'bg-[#0F172A]' : 'bg-gray-100'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Show auth modal and hide main content when not authenticated
  if (!user) {
    return <AuthModal theme={theme} onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`relative flex h-screen overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Auth Modal Overlay - Show if not authenticated */}
      {showAuthModal && (
        <AuthModal theme={theme} onSuccess={handleAuthSuccess} />
      )}

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <button
            type="button"
            aria-label="Close command palette"
            onClick={() => setCmdOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
          }`}>
            <div className={`flex items-center gap-3 border-b px-4 py-3 ${
              isDark ? 'border-slate-700/60' : 'border-gray-200'
            }`}>
              <Search className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                ref={cmdInputRef}
                type="text"
                placeholder="Search commands…"
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              />
              <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>ESC</kbd>
            </div>
            <div className="max-h-64 overflow-y-auto py-2">
              {filteredCmds.length === 0 ? (
                <p className={`px-4 py-3 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No commands found.</p>
              ) : filteredCmds.map((cmd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (cmd.toolId) {
                      const tool = toolsSubItems.find(t => t.id === cmd.toolId);
                      if (tool?.comingSoon) { setCmdOpen(false); return; }
                    }
                    navigateTo(cmd.menuId, cmd.toolId ?? undefined);
                    setCmdOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Command className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  {cmd.label}
                </button>
              ))}
            </div>
            <div className={`border-t px-4 py-2 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
              <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Press <kbd className="rounded px-1 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400">⌘K</kbd> to toggle
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      <button
        type="button"
        aria-label="Close sidebar overlay"
        onClick={() => setIsMobileSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ease-out lg:hidden ${
          isMobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r shadow-2xl
        transition-transform duration-200 ease-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        lg:transition-[width] lg:duration-200 lg:ease-out
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-80'}
        w-80 max-w-[85vw]
        ${isDark ? 'border-slate-700/60 bg-[#172235]' : 'border-gray-200 bg-white'}`}
      >
        {/* Sidebar Header */}
        <div className={`border-b p-4 sm:p-5 ${isDark ? 'border-slate-700/60' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={`min-w-0 overflow-hidden transition-[width,opacity] duration-200 ease-out ${
              isSidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg">
                  <span className="text-lg font-bold text-white">LOT</span>
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#172235] bg-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h1 className={`truncate text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>LOT</h1>
                  <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Listing Operations Tools</p>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(c => !c)}
                className={`hidden rounded-lg p-2 transition-colors lg:block ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="Toggle sidebar"
              >
                {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`rounded-lg p-2 transition-colors lg:hidden ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Command palette hint */}
        {!isSidebarCollapsed && (
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                isDark
                  ? 'border-slate-700/60 bg-slate-800/50 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-600'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Search commands…</span>
              <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-gray-400'
              }`}>⌘K</kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <SectionLabel collapsed={isSidebarCollapsed} label="MAIN MENU" />

          <div className="space-y-0.5">
            {mainMenuItems.map(item => (
              <React.Fragment key={item.id}>
                <SidebarButton
                  label={item.label}
                  icon={item.icon}
                  shortcut={item.shortcut}
                  active={activeMainMenu === item.id}
                  collapsed={isSidebarCollapsed}
                  theme={theme}
                  onClick={() => handleMainMenuClick(item.id)}
                />

                {/* Tool sub-items appear immediately after Tools button */}
                {item.id === 'Tools' && activeMainMenu === 'Tools' && !isSidebarCollapsed && (
                  <div className={`my-1 ml-3 space-y-0.5 border-l-2 pl-2 ${
                    isDark ? 'border-emerald-500/25' : 'border-emerald-500/30'
                  }`}>
                    {toolsSubItems.map(tool => (
                      <ToolSidebarButton
                        key={tool.id}
                        tool={tool}
                        active={activeTool === tool.id}
                        theme={theme}
                        onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                      />
                    ))}
                  </div>
                )}

                {/* Collapsed tool buttons */}
                {item.id === 'Tools' && activeMainMenu === 'Tools' && isSidebarCollapsed && (
                  <div className="my-1 hidden space-y-0.5 lg:block">
                    {toolsSubItems.map(tool => (
                      <CollapsedToolButton
                        key={tool.id}
                        tool={tool}
                        active={activeTool === tool.id}
                        theme={theme}
                        onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                      />
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Resources section */}
          <div className="mt-7">
            <SectionLabel collapsed={isSidebarCollapsed} label="RESOURCES" />
            <div className="space-y-0.5">
              {resourceMenuItems.map(item => (
                <SidebarButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={activeMainMenu === item.id}
                  collapsed={isSidebarCollapsed}
                  theme={theme}
                  onClick={() => handleMainMenuClick(item.id)}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t p-4 ${isDark ? 'border-slate-700/60' : 'border-gray-200'}`}>
          {!isSidebarCollapsed ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400">Tools ready</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Beta v1.0 · Auto-refreshes every 60s</p>
            </div>
          ) : (
            <div className="mx-auto h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`ml-0 flex h-full min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
      }`}>
        {/* Top Header */}
        <header className={`sticky top-0 z-20 border-b px-4 py-3 shadow-lg backdrop-blur-md sm:px-6 lg:px-8 ${
          isDark ? 'border-slate-700/50 bg-[#172235]/85' : 'border-gray-200 bg-white/85'
        }`}>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`flex-shrink-0 rounded-lg p-2 transition-colors lg:hidden ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-xs text-slate-400">{pageMeta.breadcrumb}</p>
                <h2 className={`truncate text-lg font-semibold sm:text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {pageMeta.title}
                </h2>
                <p className="hidden truncate text-sm text-slate-500 sm:block">{pageMeta.description}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              {/* User email badge */}
              {user && (
                <span className="hidden rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 md:inline-flex">
                  {user.email}
                </span>
              )}

              {activeMainMenu === 'Tools' && selectedTool && (
                <span className={`hidden rounded-full border px-3 py-1 text-xs font-semibold md:inline-flex ${
                  selectedTool.accent === 'violet'
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                    : selectedTool.accent === 'cyan'
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                      : selectedTool.accent === 'orange'
                        ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}>
                  {selectedTool.name}
                </span>
              )}

              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                title="Command Palette (⌘K)"
                className={`rounded-lg border p-2 text-sm font-medium transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Command className="h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
                  className={`relative rounded-lg border p-2 transition-colors ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border shadow-2xl ${
                    isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</span>
                      {unreadCount > 0 && (
                        <button type="button" onClick={markAllRead} className="text-xs text-emerald-400 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-800/60 py-1">
                      {notifications.map(n => (
                        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${
                          !n.read ? (isDark ? 'bg-slate-800/40' : 'bg-blue-50/40') : ''
                        }`}>
                          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                            n.type === 'success' ? 'bg-emerald-400' : n.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{n.message}</p>
                            <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="h-4 w-4" />
                </button>

                {userOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden ${
                    isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user?.email || 'LOT User'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Beta Access · v1.0</p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isDark ? '☀️' : '🌙'} Switch to {isDark ? 'Light' : 'Dark'} Mode
                      </button>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-red-400 hover:bg-slate-800' : 'text-red-600 hover:bg-gray-50'
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={`w-full max-w-full p-4 sm:p-6 lg:p-8 transition-opacity duration-150 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper Components
function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {collapsed ? <span className="mx-auto block h-1 w-1 rounded-full bg-slate-600" /> : label}
    </div>
  );
}

function SidebarButton({
  label, icon, shortcut, active, collapsed, theme, onClick,
}: {
  label: string; icon: ReactNode; shortcut?: string; active: boolean;
  collapsed: boolean; theme: Theme; onClick: () => void;
}) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150 ${
        active
          ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/5'
          : isDark
            ? 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={`flex-shrink-0 transition-colors ${active ? 'text-emerald-400' : 'group-hover:text-emerald-400'}`}>
        {icon}
      </span>
      <span className={`${collapsed ? 'hidden' : 'block'} min-w-0 flex-1 truncate font-medium`}>
        {label}
      </span>
      {!collapsed && shortcut && (
        <kbd className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold lg:block ${
          isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
        }`}>{shortcut}</kbd>
      )}
      {active && !collapsed && <span className="ml-1 h-7 w-1 rounded-full bg-emerald-400" />}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          {label}
        </span>
      )}
    </button>
  );
}

function ToolSidebarButton({
  tool, active, theme, onClick,
}: { tool: ToolItem; active: boolean; theme: Theme; onClick: () => void }) {
  const isDark = theme === 'dark';

  const activeClass = tool.accent === 'violet' ? 'border-violet-500/40 bg-violet-500/10'
    : tool.accent === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10'
    : tool.accent === 'orange' ? 'border-orange-500/40 bg-orange-500/10'
    : 'border-emerald-500/40 bg-emerald-500/10';

  const activeTextClass = tool.accent === 'violet' ? 'text-violet-300'
    : tool.accent === 'cyan' ? 'text-cyan-300'
    : tool.accent === 'orange' ? 'text-orange-300'
    : 'text-emerald-300';

  const iconBgClass = tool.accent === 'violet'
    ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
    : tool.accent === 'cyan'
      ? isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
      : tool.accent === 'orange'
        ? isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
        : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tool.comingSoon}
      className={`group w-full rounded-xl border px-2.5 py-2 text-left transition-all duration-150 ${
        tool.comingSoon ? 'cursor-not-allowed opacity-50'
        : active ? `${activeClass} shadow-sm`
        : isDark ? 'border-transparent hover:bg-slate-800/50'
        : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? iconBgClass : isDark ? 'bg-slate-800 text-slate-500 group-hover:text-slate-300' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'
        }`}>
          {tool.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className={`block truncate text-xs font-semibold transition-colors ${
            active ? activeTextClass : isDark ? 'text-slate-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'
          }`}>
            {tool.name}
          </span>
          <span className={`block truncate text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {tool.description}
          </span>
        </div>
        {active && (
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            tool.accent === 'violet' ? 'bg-violet-400' 
            : tool.accent === 'cyan' ? 'bg-cyan-400'
            : tool.accent === 'orange' ? 'bg-orange-400'
            : 'bg-emerald-400'
          }`} />
        )}
        {tool.comingSoon && (
          <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-400">Soon</span>
        )}
      </div>
    </button>
  );
}

function CollapsedToolButton({
  tool, active, theme, onClick,
}: { tool: ToolItem; active: boolean; theme: Theme; onClick: () => void }) {
  const isDark = theme === 'dark';
  const activeColor = tool.accent === 'violet' ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
    : tool.accent === 'cyan' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
    : tool.accent === 'orange' ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tool.comingSoon}
      title={tool.comingSoon ? `${tool.name} (Coming Soon)` : tool.name}
      className={`group relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-150 ${
        active ? activeColor
        : isDark ? 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
        : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${tool.comingSoon ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      {tool.icon}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {tool.name}{tool.comingSoon ? ' (Coming Soon)' : ''}
      </span>
    </button>
  );
}