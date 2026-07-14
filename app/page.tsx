// app/page.tsx (Floating Sidebar - Properly Centered Content)
'use client';

import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  Bell,
  BellOff,
  AlertCircle,
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
  User as UserIcon,
  X,
  GitBranch,
  LogOut,
  FileSpreadsheet,
  Building2,
  Shield,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Grid3x3,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { MaintenanceProvider } from '../contexts/MaintenanceContext';
import MaintenanceGuard from './components/MaintenanceGuard';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';

// Lazy load components for better performance
const SkuProcessor = lazy(() => import('./components/SkuProcessor'));
const AsinConflictChecker = lazy(() => import('./components/AsinConflictChecker'));
const BasecampGenerator = lazy(() => import('./components/BasecampGenerator'));
const FileGenerator = lazy(() => import('./components/BulkAnalyzerFileGenerator'));
const GetBrand = lazy(() => import('./components/GetBrand'));
const Dashboard = lazy(() => import('./components/dashboard'));
const TaskManagement = lazy(() => import('./dashboard/TaskManagement'));
const Documentation = lazy(() => import('./components/documentation'));
const Terms = lazy(() => import('./components/terms'));
const DownloadPage = lazy(() => import('./components/download'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

type Theme = 'light' | 'dark';
type ToolId = 'sku' | 'asin' | 'basecamp' | 'bulk-analyzer' | 'get-brand';
type MainMenuId = 'Dashboard' | 'TaskManagement' | 'Tools' | 'Downloads' | 'Documentation' | 'Terms' | 'Admin';
type ViewMode = 'grid' | 'list' | 'compact';

interface MenuItem {
  id: MainMenuId;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  adminOnly?: boolean;
  badge?: number;
  children?: ToolItem[];
  isExpandable?: boolean;
}

interface ToolItem {
  id: ToolId;
  name: string;
  description: string;
  icon: ReactNode;
  accent: 'emerald' | 'cyan' | 'violet' | 'orange' | 'blue';
  comingSoon?: boolean;
  category?: 'processing' | 'analysis' | 'generation' | 'utility';
  tags?: string[];
}

interface AppUser {
  id: string;
  email: string;
}

const STORAGE_THEME_KEY = 'theme';
const STORAGE_VIEW_MODE_KEY = 'viewMode';
const STORAGE_SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const STORAGE_TOOLS_EXPANDED_KEY = 'toolsExpanded';

const toolsSubItems: ToolItem[] = [
  {
    id: 'sku',
    name: 'Shopkeep Consolidated Tool',
    description: 'Process and consolidate SKU data efficiently.',
    icon: <Search className="h-4 w-4" />,
    accent: 'cyan',
    category: 'processing',
    tags: ['SKU', 'Consolidation', 'Data Processing'],
  },
  {
    id: 'asin',
    name: 'Multiple Parent ASIN Checker',
    description: 'Detect styles with multiple parent ASINs automatically.',
    icon: <GitBranch className="h-4 w-4" />,
    accent: 'emerald',
    category: 'analysis',
    tags: ['ASIN', 'Validation', 'Conflict Detection'],
  },
  {
    id: 'basecamp',
    name: 'Basecamp Response Generator',
    description: 'Generate formatted Basecamp messages with templates.',
    icon: <MessageSquare className="h-4 w-4" />,
    accent: 'violet',
    category: 'generation',
    tags: ['Basecamp', 'Messages', 'Templates'],
  },
  {
    id: 'bulk-analyzer',
    name: 'File Generator',
    description: 'Generate Listing Data, Pre-approval, Excluded, and For Fixing files.',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    accent: 'orange',
    category: 'generation',
    tags: ['Files', 'Export', 'Bulk'],
  },
  {
    id: 'get-brand',
    name: 'Get Brand',
    description: 'Look up brand names and information.',
    icon: <Building2 className="h-4 w-4" />,
    accent: 'blue',
    category: 'utility',
    tags: ['Brand', 'Lookup', 'Info'],
  },
];

const ALL_COMMANDS = [
  { label: 'Go to Dashboard', menuId: 'Dashboard' as MainMenuId, toolId: null },
  { label: 'Go to Task Management', menuId: 'TaskManagement' as MainMenuId, toolId: null },
  { label: 'Go to Downloads', menuId: 'Downloads' as MainMenuId, toolId: null },
  { label: 'Go to Documentation', menuId: 'Documentation' as MainMenuId, toolId: null },
  { label: 'Go to Terms & Conditions', menuId: 'Terms' as MainMenuId, toolId: null },
  { label: 'Open Admin Panel', menuId: 'Admin' as MainMenuId, toolId: null, adminOnly: true },
  { label: 'Open Shopkeep Tool', menuId: 'Tools' as MainMenuId, toolId: 'sku' as ToolId },
  { label: 'Open ASIN Checker', menuId: 'Tools' as MainMenuId, toolId: 'asin' as ToolId },
  { label: 'Open Basecamp Generator', menuId: 'Tools' as MainMenuId, toolId: 'basecamp' as ToolId },
  { label: 'Open File Generator', menuId: 'Tools' as MainMenuId, toolId: 'bulk-analyzer' as ToolId },
  { label: 'Open Get Brand Tool', menuId: 'Tools' as MainMenuId, toolId: 'get-brand' as ToolId },
];

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
  </div>
);

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

export default function HomePage() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const init: Theme = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
    setTheme(init);
    applyTheme(init);

    const savedViewMode = localStorage.getItem(STORAGE_VIEW_MODE_KEY) as ViewMode | null;
    if (savedViewMode) setViewMode(savedViewMode);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <MaintenanceProvider>
      <MaintenanceGuard theme={theme}>
        {(user: AppUser, isAdmin: boolean) => {
          const userName = user.email?.split('@')[0] || 'User';
          return (
            <NotificationProvider
              userId={user.id}
              currentUserName={userName}
              currentUserEmail={user.email}
              currentUserId={user.id}
            >
              <HomePageContent
                theme={theme}
                user={user}
                isAdmin={isAdmin}
                setTheme={setTheme}
                userName={userName}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
              />
            </NotificationProvider>
          );
        }}
      </MaintenanceGuard>
    </MaintenanceProvider>
  );
}

function HomePageContent({ 
  theme, 
  user, 
  isAdmin,
  setTheme,
  userName,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen
}: { 
  theme: Theme; 
  user: AppUser; 
  isAdmin: boolean;
  setTheme: (theme: Theme) => void;
  userName: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}) {
  const [activeTool, setActiveTool] = useState<ToolId>('sku');
  const [activeMainMenu, setActiveMainMenu] = useState<MainMenuId>('Dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [isToolsExpanded, setIsToolsExpanded] = useState(() => {
    const saved = localStorage.getItem(STORAGE_TOOLS_EXPANDED_KEY);
    return saved ? JSON.parse(saved) : true;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const prevMenuRef = useRef<MainMenuId>('Dashboard');
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    permission,
    requestPermission,
    isSupported,
    refreshNotifications,
  } = useNotifications();

  const isDark = theme === 'dark';

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  
  const showNotification = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleToolsExpanded = useCallback(() => {
    setIsToolsExpanded(prev => {
      const newState = !prev;
      localStorage.setItem(STORAGE_TOOLS_EXPANDED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const mainMenuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { id: 'Dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, shortcut: '⌘1' },
      { id: 'TaskManagement', label: 'Task Management', icon: <CheckCircle2 className="h-5 w-5" />, shortcut: '⌘T', badge: 0 },
      { 
        id: 'Tools', 
        label: 'Tools', 
        icon: <LayoutGrid className="h-5 w-5" />, 
        shortcut: '⌘2',
        isExpandable: true,
        children: toolsSubItems,
      },
      { id: 'Downloads', label: 'Downloads', icon: <Download className="h-5 w-5" />, shortcut: '⌘3' },
    ];

    if (isAdmin) {
      items.push({ id: 'Admin', label: 'Admin Panel', icon: <Shield className="h-5 w-5" />, adminOnly: true });
    }

    return items;
  }, [isAdmin]);

  const resourceMenuItems = useMemo<MenuItem[]>(() => [
    { id: 'Documentation', label: 'Documentation', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'Terms', label: 'Terms & Conditions', icon: <FileText className="h-5 w-5" /> },
  ], []);

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<{ toolId: ToolId }>;
      const toolId = e.detail?.toolId;
      if (!['sku', 'asin', 'basecamp', 'bulk-analyzer', 'get-brand'].includes(toolId)) return;
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (cmdOpen) { setCmdQuery(''); setTimeout(() => cmdInputRef.current?.focus(), 50); }
  }, [cmdOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const navigateTo = useCallback((menuId: MainMenuId, toolId?: ToolId) => {
    if (menuId === 'Tools' && activeMainMenu === 'Tools' && !toolId) return;

    setIsLoading(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMainMenu(menuId);
      if (toolId) setActiveTool(toolId);
      prevMenuRef.current = menuId;
      setIsTransitioning(false);
      setTimeout(() => setIsLoading(false), 100);
    }, 120);
  }, [activeMainMenu]);

  const toggleTheme = useCallback(() => {
    setTheme(cur => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, [setTheme]);

  const handleMainMenuClick = (id: MainMenuId) => {
    if (id === 'Admin' && !isAdmin) {
      showNotification('Access denied. Only admins can access the admin panel.', 'error');
      return;
    }
    navigateTo(id);
    setIsMobileSidebarOpen(false);
  };

  const handleToolClick = (toolId: ToolId, comingSoon?: boolean) => {
    if (comingSoon) {
      showNotification('This tool is coming soon!', 'info');
      return;
    }

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

  const filteredCmds = ALL_COMMANDS.filter(c => {
    if (c.adminOnly && !isAdmin) return false;
    return c.label.toLowerCase().includes(cmdQuery.toLowerCase());
  });

  const selectedTool = toolsSubItems.find(t => t.id === activeTool);

  const pageMeta = useMemo(() => {
    if (activeMainMenu === 'Dashboard') return {
      title: 'Dashboard',
      breadcrumb: 'Overview / Dashboard',
      description: 'Monitor operation tools and launch listing workflows.',
      icon: <Home className="h-5 w-5" />,
    };
    if (activeMainMenu === 'TaskManagement') {
      return {
        title: 'Task Management',
        breadcrumb: 'Tasks / Management',
        description: 'Manage and track your tasks efficiently.',
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    }
    if (activeMainMenu === 'Tools') {
      const t = toolsSubItems.find(t => t.id === activeTool);
      return {
        title: t?.name ?? 'Tools',
        breadcrumb: `Tools / ${t?.name ?? 'Selected Tool'}`,
        description: t?.description ?? '',
        icon: t?.icon || <LayoutGrid className="h-5 w-5" />,
      };
    }
    if (activeMainMenu === 'Downloads') return {
      title: 'Downloads',
      breadcrumb: 'Files / Downloads',
      description: 'Download generated files from completed tool runs.',
      icon: <Download className="h-5 w-5" />,
    };
    if (activeMainMenu === 'Documentation') return {
      title: 'Documentation',
      breadcrumb: 'Resources / Documentation',
      description: 'Simple guide for using LOT tools.',
      icon: <BookOpen className="h-5 w-5" />,
    };
    if (activeMainMenu === 'Admin') return {
      title: 'Admin Panel',
      breadcrumb: 'Admin / Panel',
      description: 'Manage users and system settings.',
      icon: <Shield className="h-5 w-5" />,
    };
    if (activeMainMenu === 'Terms') return {
      title: 'Terms & Conditions',
      breadcrumb: 'Resources / Terms & Conditions',
      description: 'Simple usage terms and reminders.',
      icon: <FileText className="h-5 w-5" />,
    };
    return {
      title: 'Dashboard',
      breadcrumb: 'Overview / Dashboard',
      description: 'Listing Operations Tools',
      icon: <Home className="h-5 w-5" />,
    };
  }, [activeMainMenu, activeTool]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (activeMainMenu === 'Dashboard') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <Dashboard theme={theme} currentUserEmail={user?.email || ''} />
        </Suspense>
      );
    }

    if (activeMainMenu === 'TaskManagement') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <div className="h-[calc(100vh-8rem)]">
            <TaskManagement
              theme={theme}
              currentUserEmail={user?.email || ''}
              currentUserName={user?.email || ''}
            />
          </div>
        </Suspense>
      );
    }

    if (activeMainMenu === 'Downloads') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <DownloadPage theme={theme} />
        </Suspense>
      );
    }
    if (activeMainMenu === 'Documentation') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <Documentation theme={theme} />
        </Suspense>
      );
    }
    if (activeMainMenu === 'Terms') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <Terms theme={theme} />
        </Suspense>
      );
    }

    if (activeMainMenu === 'Admin') {
      if (!isAdmin) {
        return (
          <div className={`rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center`}>
            <Shield className="mx-auto h-16 w-16 text-red-400 opacity-50" />
            <h3 className={`mt-4 text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Access Denied</h3>
            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Only admins can access the admin panel.
            </p>
            <button
              onClick={() => navigateTo('Dashboard')}
              className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        );
      }
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AdminDashboard theme={theme} />
        </Suspense>
      );
    }

    if (activeMainMenu === 'Tools') {
      const toolComponents: Record<ToolId, React.ComponentType<{ theme: Theme }>> = {
        sku: SkuProcessor,
        asin: AsinConflictChecker,
        basecamp: BasecampGenerator,
        'bulk-analyzer': FileGenerator,
        'get-brand': GetBrand,
      };
      const Component = toolComponents[activeTool];
      if (Component) {
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Component theme={theme} />
          </Suspense>
        );
      }
    }

    return null;
  };

  return (
    <div className={`relative flex h-screen overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-[200] max-w-sm rounded-xl border p-4 shadow-2xl animate-slide-in ${
          toast.type === 'error' 
            ? isDark ? 'border-red-500/30 bg-red-900/90 text-red-100' : 'border-red-500/30 bg-red-50 text-red-900'
            : toast.type === 'success'
            ? isDark ? 'border-emerald-500/30 bg-emerald-900/90 text-emerald-100' : 'border-emerald-500/30 bg-emerald-50 text-emerald-900'
            : isDark ? 'border-blue-500/30 bg-blue-900/90 text-blue-100' : 'border-blue-500/30 bg-blue-50 text-blue-900'
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <button
            type="button"
            onClick={() => setCmdOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close command palette"
          />
          <div className={`relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
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
                aria-label="Search commands"
              />
              <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>ESC</kbd>
            </div>
            <div className="max-h-64 overflow-y-auto py-2">
              {filteredCmds.length === 0 ? (
                <p className={`px-4 py-3 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  No commands found.
                </p>
              ) : (
                filteredCmds.map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (cmd.adminOnly && !isAdmin) {
                        showNotification('Access denied. Only admins can access the admin panel.', 'error');
                        setCmdOpen(false);
                        return;
                      }
                      if (cmd.toolId) {
                        const tool = toolsSubItems.find(t => t.id === cmd.toolId);
                        if (tool?.comingSoon) { 
                          showNotification(`${tool.name} is coming soon!`, 'info');
                          setCmdOpen(false); 
                          return;
                        }
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
                    {cmd.adminOnly && (
                      <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-semibold text-amber-400">
                        ADMIN
                      </span>
                    )}
                  </button>
                ))
              )}
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
        onClick={() => setIsMobileSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden ${
          isMobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Close sidebar"
      />

      {/* Floating Sidebar - Left Side Centered */}
      <aside 
        className={`fixed left-6 top-1/2 z-40 flex -translate-y-1/2 flex-col rounded-2xl border shadow-2xl backdrop-blur-xl
          transition-all duration-300 ease-out
          ${isMobileSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+1.5rem)] opacity-0'}
          lg:translate-x-0 lg:opacity-100
          ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-72'}
          w-80 max-h-[90vh]
          ${isDark ? 'border-slate-700/60 bg-[#172235]/95' : 'border-gray-200/60 bg-white/95'}`}
      >
        {/* Sidebar Header */}
        <div className={`border-b p-4 ${isDark ? 'border-slate-700/60' : 'border-gray-200/60'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={`min-w-0 overflow-hidden transition-[width,opacity] duration-300 ease-out ${
              isSidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-lg ${
                  isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                }`}>
                  {isAdmin ? (
                    <Shield className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-lg font-bold text-white">LOT</span>
                  )}
                  <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                    isAdmin ? 'border-amber-500 bg-amber-400' : 'border-[#172235] bg-emerald-400'
                  }`} />
                </div>
                <div className="min-w-0">
                  <h1 className={`truncate text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {isAdmin ? 'Admin Panel' : 'LOT'}
                  </h1>
                  <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {isAdmin ? 'Administration' : 'Listing Operations Tools'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className={`hidden rounded-lg p-2 transition-colors lg:block ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
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
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                isDark
                  ? 'border-slate-700/60 bg-slate-800/50 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  : 'border-gray-200/60 bg-gray-50/50 text-gray-400 hover:text-gray-600'
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
        <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation" aria-label="Main navigation">
          <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isSidebarCollapsed ? <span className="mx-auto block h-1 w-1 rounded-full bg-slate-600" /> : "MENU"}
          </div>

          <div className="space-y-1">
            {mainMenuItems.map(item => (
              <React.Fragment key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.adminOnly && !isAdmin) {
                      showNotification('Access denied. Only admins can access the admin panel.', 'error');
                      return;
                    }
                    if (item.isExpandable) {
                      toggleToolsExpanded();
                      if (activeMainMenu !== 'Tools') {
                        navigateTo('Tools');
                      }
                    } else {
                      handleMainMenuClick(item.id);
                    }
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={activeMainMenu === item.id || (item.isExpandable && activeMainMenu === 'Tools') ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150 ${
                    activeMainMenu === item.id || (item.isExpandable && activeMainMenu === 'Tools')
                      ? item.adminOnly
                        ? 'border-amber-500/50 bg-amber-500/10 text-white shadow-lg shadow-amber-500/5'
                        : 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/5'
                      : isDark
                        ? 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
                        : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`flex-shrink-0 transition-colors ${
                    activeMainMenu === item.id || (item.isExpandable && activeMainMenu === 'Tools')
                      ? item.adminOnly ? 'text-amber-400' : 'text-emerald-400'
                      : 'group-hover:text-emerald-400'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} min-w-0 flex-1 truncate font-medium`}>
                    {item.label}
                  </span>
                  {!isSidebarCollapsed && item.shortcut && (
                    <kbd className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold lg:block ${
                      isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
                    }`}>{item.shortcut}</kbd>
                  )}
                  {item.badge !== undefined && item.badge > 0 && !isSidebarCollapsed && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {item.isExpandable && !isSidebarCollapsed && (
                    <span className="ml-1">
                      {isToolsExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                  )}
                  {(activeMainMenu === item.id || (item.isExpandable && activeMainMenu === 'Tools')) && !isSidebarCollapsed && (
                    <span className={`ml-1 h-6 w-1 rounded-full ${
                      item.adminOnly ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                  )}
                  {item.adminOnly && activeMainMenu !== item.id && !isSidebarCollapsed && (
                    <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-semibold text-amber-400">
                      ADMIN
                    </span>
                  )}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {item.label}
                    </span>
                  )}
                </button>

                {/* Tools Dropdown */}
                {item.isExpandable && isToolsExpanded && !isSidebarCollapsed && (
                  <div className={`ml-4 space-y-1 border-l-2 pl-3 ${
                    isDark ? 'border-emerald-500/25' : 'border-emerald-500/30'
                  }`}>
                    {toolsSubItems.map(tool => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                        disabled={tool.comingSoon}
                        className={`group w-full rounded-xl border px-3 py-2 text-left transition-all duration-150 ${
                          tool.comingSoon ? 'cursor-not-allowed opacity-50'
                          : activeTool === tool.id && activeMainMenu === 'Tools'
                            ? tool.accent === 'violet' ? 'border-violet-500/40 bg-violet-500/10'
                            : tool.accent === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10'
                            : tool.accent === 'orange' ? 'border-orange-500/40 bg-orange-500/10'
                            : tool.accent === 'blue' ? 'border-blue-500/40 bg-blue-500/10'
                            : 'border-emerald-500/40 bg-emerald-500/10'
                          : isDark ? 'border-transparent hover:bg-slate-800/50'
                          : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                            activeTool === tool.id && activeMainMenu === 'Tools'
                              ? tool.accent === 'violet'
                                ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                                : tool.accent === 'cyan'
                                  ? isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                                  : tool.accent === 'orange'
                                    ? isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
                                    : tool.accent === 'blue'
                                      ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                                      : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                              : isDark ? 'bg-slate-800 text-slate-500 group-hover:text-slate-300' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'
                          }`}>
                            {tool.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-semibold transition-colors ${
                              activeTool === tool.id && activeMainMenu === 'Tools'
                                ? tool.accent === 'violet' ? 'text-violet-300'
                                : tool.accent === 'cyan' ? 'text-cyan-300'
                                : tool.accent === 'orange' ? 'text-orange-300'
                                : tool.accent === 'blue' ? 'text-blue-300'
                                : 'text-emerald-300'
                                : isDark ? 'text-slate-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'
                            }`}>
                              {tool.name}
                            </span>
                            <span className={`block truncate text-xs leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {tool.description}
                            </span>
                            {tool.tags && tool.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tool.tags.map(tag => (
                                  <span key={tag} className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                                    isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {activeTool === tool.id && activeMainMenu === 'Tools' && (
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${
                              tool.accent === 'violet' ? 'bg-violet-400'
                              : tool.accent === 'cyan' ? 'bg-cyan-400'
                              : tool.accent === 'orange' ? 'bg-orange-400'
                              : tool.accent === 'blue' ? 'bg-blue-400'
                              : 'bg-emerald-400'
                            }`} />
                          )}
                          {tool.comingSoon && (
                            <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-400">Soon</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Collapsed tools icons */}
                {item.isExpandable && isSidebarCollapsed && (
                  <div className="my-1 hidden space-y-1 lg:block">
                    {toolsSubItems.map(tool => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                        disabled={tool.comingSoon}
                        title={tool.comingSoon ? `${tool.name} (Coming Soon)` : tool.name}
                        className={`group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150 ${
                          activeTool === tool.id && activeMainMenu === 'Tools'
                            ? tool.accent === 'violet' ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                            : tool.accent === 'cyan' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                            : tool.accent === 'orange' ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                            : tool.accent === 'blue' ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                            : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : isDark ? 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
                          : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        } ${tool.comingSoon ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {tool.icon}
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                          {tool.name}{tool.comingSoon ? ' (Coming Soon)' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isSidebarCollapsed ? <span className="mx-auto block h-1 w-1 rounded-full bg-slate-600" /> : "RESOURCES"}
            </div>
            <div className="space-y-1">
              {resourceMenuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMainMenuClick(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={activeMainMenu === item.id ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150 ${
                    activeMainMenu === item.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/5'
                      : isDark
                        ? 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
                        : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`flex-shrink-0 transition-colors ${
                    activeMainMenu === item.id ? 'text-emerald-400' : 'group-hover:text-emerald-400'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} min-w-0 flex-1 truncate font-medium`}>
                    {item.label}
                  </span>
                  {activeMainMenu === item.id && !isSidebarCollapsed && (
                    <span className="ml-1 h-6 w-1 rounded-full bg-emerald-400" />
                  )}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t p-4 ${isDark ? 'border-slate-700/60' : 'border-gray-200/60'}`}>
          {!isSidebarCollapsed ? (
            <div className={`rounded-xl border p-3 ${
              isAdmin ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
                } animate-pulse`} />
                <span className={`text-sm font-semibold ${
                  isAdmin ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {isAdmin ? 'Admin Mode' : 'Tools ready'}
                </span>
              </div>
              <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {isAdmin ? 'Managing system settings' : 'Beta v1.0 · Auto-refreshes every 60s'}
              </p>
            </div>
          ) : (
            <div className={`mx-auto h-2.5 w-2.5 rounded-full ${
              isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
            } animate-pulse`} />
          )}
        </div>
      </aside>

      {/* Main Content - With container for proper centering */}
      <div 
        ref={mainContentRef}
        className="flex h-full min-w-0 flex-1 flex-col"
      >
        {/* Top Header */}
        <header className={`sticky top-0 z-20 border-b px-4 py-3 shadow-lg backdrop-blur-md sm:px-6 lg:px-8 ${
          isDark ? 'border-slate-700/50 bg-[#172235]/85' : 'border-gray-200 bg-white/85'
        }`}>
          <div className="flex min-w-0 items-center justify-between gap-3 max-w-7xl mx-auto">
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
                <div className="flex items-center gap-2">
                  <span className={`hidden sm:inline-block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {pageMeta.icon}
                  </span>
                  <h2 className={`truncate text-lg font-semibold sm:text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {pageMeta.title}
                  </h2>
                </div>
                <p className="hidden truncate text-sm text-slate-500 sm:block">{pageMeta.description}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              {isAdmin && (
                <span className="hidden rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-xs font-semibold text-amber-400 md:inline-flex items-center">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin
                </span>
              )}

              {user && (
                <span className="hidden rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 md:inline-flex items-center">
                  <UserIcon className="mr-1 h-3 w-3" />
                  {user.email}
                </span>
              )}

              {activeMainMenu === 'Tools' && selectedTool && (
                <span className={`hidden rounded-full border px-3 py-1 text-xs font-semibold md:inline-flex items-center ${
                  selectedTool.accent === 'violet'
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                    : selectedTool.accent === 'cyan'
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                      : selectedTool.accent === 'orange'
                        ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}>
                  {selectedTool.icon}
                  <span className="ml-1">{selectedTool.name}</span>
                </span>
              )}

              {/* View Mode Toggle */}
              <div className={`hidden sm:flex items-center gap-0.5 rounded-lg border p-0.5 ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => { setViewMode('grid'); localStorage.setItem(STORAGE_VIEW_MODE_KEY, 'grid'); }}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'grid' 
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('list'); localStorage.setItem(STORAGE_VIEW_MODE_KEY, 'list'); }}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'list' 
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`hidden sm:flex rounded-lg border p-2 transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                title="Command Palette (⌘K)"
                className={`rounded-lg border p-2 text-sm font-medium transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Open command palette"
              >
                <Command className="h-4 w-4" />
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`rounded-lg border p-2 transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
                  className={`relative rounded-lg border p-2 transition-colors ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isSupported && permission === 'granted' ? 'Desktop notifications enabled' :
                         isSupported && permission === 'denied' ? 'Desktop notifications blocked' :
                         'Notifications'}
                  aria-label="Toggle notifications"
                >
                  {isSupported && permission === 'granted' ? (
                    <Bell className="h-4 w-4" />
                  ) : isSupported && permission === 'denied' ? (
                    <BellOff className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-2 w-80 max-h-[400px] rounded-2xl border shadow-2xl overflow-hidden ${
                    isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Notifications
                        </span>
                        {isSupported && permission === 'denied' && (
                          <span className="text-xs text-yellow-400" title="Desktop notifications are blocked">
                            <AlertCircle className="inline h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={refreshNotifications}
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          title="Refresh notifications"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </button>
                        {isSupported && permission !== 'granted' && permission !== 'denied' && (
                          <button
                            type="button"
                            onClick={requestPermission}
                            className="text-xs text-emerald-400 hover:underline"
                          >
                            Enable desktop
                          </button>
                        )}
                        {unreadCount > 0 && (
                          <button 
                            type="button" 
                            onClick={markAllAsRead} 
                            className="text-xs text-emerald-400 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-800/60">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="mx-auto h-8 w-8 opacity-20" />
                          <p className={`mt-2 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            No notifications yet
                          </p>
                          {isSupported && permission === 'default' && (
                            <button
                              type="button"
                              onClick={requestPermission}
                              className="mt-3 text-xs text-emerald-400 hover:underline"
                            >
                              Enable desktop notifications
                            </button>
                          )}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-opacity-50 ${
                              !n.read ? (isDark ? 'bg-slate-800/40' : 'bg-blue-50/40') : ''
                            } ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}
                            onClick={() => markAsRead(n.id)}
                          >
                            <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                              n.type === 'success' ? 'bg-emerald-400'
                              : n.type === 'warning' ? 'bg-yellow-400'
                              : n.type === 'error' ? 'bg-red-400'
                              : 'bg-blue-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                  {n.title}
                                </p>
                                {n.agent_name && n.agent_name !== 'System' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    @{n.agent_name}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {n.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                                {n.tool_name && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {n.tool_name.replace('_', ' ')}
                                  </span>
                                )}
                                {n.agent_email && n.agent_name !== 'System' && (
                                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                    by {n.agent_email}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="User menu"
                >
                  <UserIcon className="h-4 w-4" />
                </button>

                {userOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden ${
                    isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user?.email || 'LOT User'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {isAdmin ? 'Admin Access' : 'Beta Access · v1.0'}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        Switch to {isDark ? 'Light' : 'Dark'} Mode
                      </button>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { supabase } = await import('@/lib/supabase/client');
                          await supabase.auth.signOut();
                          window.location.reload();
                        }}
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

        {/* Page Content - With container for centering */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
            <div
              className={`transition-opacity duration-150 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}