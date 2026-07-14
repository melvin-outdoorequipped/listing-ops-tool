// app/page.tsx - Redesigned with 2026 UI/UX Principles - LARGER FONTS
'use client';

import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  Bell,
  BellOff,
  AlertCircle,
  BookOpen,
  Command,
  Download,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Search,
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
  Grid3x3,
  List,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  XCircle,
  FolderKanban,
  Sparkles,
  Clock,
  BarChart3,
  ArrowUpRight,
  Pin,
  PinOff,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Clock as ClockIcon,
} from 'lucide-react';

import { MaintenanceProvider } from '../contexts/MaintenanceContext';
import MaintenanceGuard from './components/MaintenanceGuard';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';

// Lazy load components
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
type ToastType = 'info' | 'error' | 'success';

// --- Modern 2026 Design System Tokens ---
const DESIGN = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  font: {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  elevation: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 12px rgba(0,0,0,0.08)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    xl: '0 16px 48px rgba(0,0,0,0.16)',
  },
};

// --- Status Badge Component ---
const StatusBadge = ({ status, theme }: { status: 'completed' | 'pending' | 'ongoing' | 'cancelled'; theme: Theme }) => {
  const isDark = theme === 'dark';
  const config = {
    completed: { label: 'Completed', icon: Check, bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', text: isDark ? 'text-emerald-400' : 'text-emerald-700', border: isDark ? 'border-emerald-500/20' : 'border-emerald-200' },
    pending: { label: 'Pending', icon: ClockIcon, bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', text: isDark ? 'text-amber-400' : 'text-amber-700', border: isDark ? 'border-amber-500/20' : 'border-amber-200' },
    ongoing: { label: 'Ongoing', icon: Sparkles, bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50', text: isDark ? 'text-blue-400' : 'text-blue-700', border: isDark ? 'border-blue-500/20' : 'border-blue-200' },
    cancelled: { label: 'Cancelled', icon: X, bg: isDark ? 'bg-gray-500/10' : 'bg-gray-50', text: isDark ? 'text-gray-400' : 'text-gray-600', border: isDark ? 'border-gray-500/20' : 'border-gray-200' },
  };
  const { label, icon: Icon, bg, text, border } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${bg} ${text} ${border}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
};

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

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const STORAGE_THEME_KEY = 'theme';
const STORAGE_VIEW_MODE_KEY = 'viewMode';
const STORAGE_SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const STORAGE_TOOLS_EXPANDED_KEY = 'toolsExpanded';
const STORAGE_PINNED_TOOLS_KEY = 'pinnedTools';

const ACCENT_STYLES: Record<
  ToolItem['accent'],
  { border: string; bg: string; text: string; dot: string; iconBgDark: string; iconBgLight: string }
> = {
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/8', text: 'text-emerald-400', dot: 'bg-emerald-400', iconBgDark: 'bg-emerald-500/12 text-emerald-400', iconBgLight: 'bg-emerald-50 text-emerald-600' },
  cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/8', text: 'text-cyan-400', dot: 'bg-cyan-400', iconBgDark: 'bg-cyan-500/12 text-cyan-400', iconBgLight: 'bg-cyan-50 text-cyan-600' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/8', text: 'text-violet-400', dot: 'bg-violet-400', iconBgDark: 'bg-violet-500/12 text-violet-400', iconBgLight: 'bg-violet-50 text-violet-600' },
  orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/8', text: 'text-orange-400', dot: 'bg-orange-400', iconBgDark: 'bg-orange-500/12 text-orange-400', iconBgLight: 'bg-orange-50 text-orange-600' },
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400', iconBgDark: 'bg-blue-500/12 text-blue-400', iconBgLight: 'bg-blue-50 text-blue-600' },
};

const toolsSubItems: ToolItem[] = [
  {
    id: 'sku',
    name: 'Shopkeep Consolidated Tool',
    description: 'Process and consolidate SKU data efficiently.',
    icon: <Search className="h-5 w-5" />,
    accent: 'cyan',
    category: 'processing',
    tags: ['SKU', 'Consolidation', 'Data Processing'],
  },
  {
    id: 'asin',
    name: 'Multiple Parent ASIN Checker',
    description: 'Detect styles with multiple parent ASINs automatically.',
    icon: <GitBranch className="h-5 w-5" />,
    accent: 'emerald',
    category: 'analysis',
    tags: ['ASIN', 'Validation', 'Conflict Detection'],
  },
  {
    id: 'basecamp',
    name: 'Basecamp Response Generator',
    description: 'Generate formatted Basecamp messages with templates.',
    icon: <MessageSquare className="h-5 w-5" />,
    accent: 'violet',
    category: 'generation',
    tags: ['Basecamp', 'Messages', 'Templates'],
  },
  {
    id: 'bulk-analyzer',
    name: 'File Generator',
    description: 'Generate Listing Data, Pre-approval, Excluded, and For Fixing files.',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    accent: 'orange',
    category: 'generation',
    tags: ['Files', 'Export', 'Bulk'],
  },
  {
    id: 'get-brand',
    name: 'Get Brand',
    description: 'Look up brand names and information.',
    icon: <Building2 className="h-5 w-5" />,
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
  <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-10 w-10 animate-spin text-emerald-400 motion-reduce:animate-none" />
    <span className="sr-only">Loading…</span>
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
  toggleFullscreen,
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
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [isToolsExpanded, setIsToolsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_TOOLS_EXPANDED_KEY);
    return saved ? JSON.parse(saved) : true;
  });
  const [pinnedTools, setPinnedTools] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_PINNED_TOOLS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdHighlight, setCmdHighlight] = useState(0);
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const userPanelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showNotification = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleToolsExpanded = useCallback(() => {
    setIsToolsExpanded(prev => {
      const newState = !prev;
      localStorage.setItem(STORAGE_TOOLS_EXPANDED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const togglePinTool = useCallback((toolId: string) => {
    setPinnedTools(prev => {
      const newPinned = prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId];
      localStorage.setItem(STORAGE_PINNED_TOOLS_KEY, JSON.stringify(newPinned));
      return newPinned;
    });
  }, []);

  const mainMenuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { id: 'Dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, shortcut: '⌘1' },
      { id: 'TaskManagement', label: 'Task Management', icon: <FolderKanban className="h-5 w-5" />, shortcut: '⌘T', badge: 0 },
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

  const navigateTo = useCallback((menuId: MainMenuId, toolId?: ToolId) => {
    if (menuId === 'Tools' && activeMainMenu === 'Tools' && !toolId) return;

    setIsLoading(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMainMenu(menuId);
      if (toolId) setActiveTool(toolId);
      setIsTransitioning(false);
      setTimeout(() => setIsLoading(false), 100);
    }, 120);
  }, [activeMainMenu]);

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
  }, [navigateTo]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifOpen && notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userOpen && userPanelRef.current && !userPanelRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen, userOpen]);

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
      // Focus search with Ctrl+/
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen, navigateTo]);

  useEffect(() => {
    if (cmdOpen) {
      setCmdQuery('');
      setCmdHighlight(0);
      setTimeout(() => cmdInputRef.current?.focus(), 50);
    }
  }, [cmdOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

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
        setIsTransitioning(false);
      }, 120);
    } else {
      setActiveTool(toolId);
    }

    setIsMobileSidebarOpen(false);
  };

  const filteredCmds = useMemo(
    () =>
      ALL_COMMANDS.filter(c => {
        if (c.adminOnly && !isAdmin) return false;
        return c.label.toLowerCase().includes(cmdQuery.toLowerCase());
      }),
    [cmdQuery, isAdmin]
  );

  useEffect(() => {
    setCmdHighlight(0);
  }, [cmdQuery]);

  const runCommand = useCallback((cmd: (typeof ALL_COMMANDS)[number]) => {
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
  }, [isAdmin, navigateTo, showNotification]);

  const handleCmdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCmdHighlight(prev => Math.min(prev + 1, filteredCmds.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCmdHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCmds[cmdHighlight];
      if (cmd) runCommand(cmd);
    }
  };

  const selectedTool = toolsSubItems.find(t => t.id === activeTool);

  // Sort tools: pinned first, then alphabetically
  const sortedTools = useMemo(() => {
    return [...toolsSubItems].sort((a, b) => {
      const aPinned = pinnedTools.includes(a.id);
      const bPinned = pinnedTools.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [pinnedTools]);

  const pageMeta = useMemo(() => {
    if (activeMainMenu === 'Dashboard') return {
      title: 'Dashboard',
      breadcrumb: 'Overview / Dashboard',
      description: 'Monitor operations and launch listing workflows.',
      icon: <Home className="h-5 w-5" />,
    };
    if (activeMainMenu === 'TaskManagement') {
      return {
        title: 'Task Management',
        breadcrumb: 'Tasks / Management',
        description: 'Manage and track your tasks efficiently.',
        icon: <FolderKanban className="h-5 w-5" />,
      };
    }
    if (activeMainMenu === 'Tools') {
      const t = toolsSubItems.find(t => t.id === activeTool);
      return {
        title: t?.name ?? 'Tools',
        breadcrumb: `Tools / ${t?.name ?? 'Selected Tool'}`,
        description: t?.description ?? 'Select a tool to get started.',
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
          <div className="h-[calc(100vh-12rem)]">
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
          <div className={`rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center sm:p-10`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <h3 className={`mt-4 text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Access Denied</h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Only administrators can access the admin panel.
            </p>
            <button
              onClick={() => navigateTo('Dashboard')}
              className="mt-5 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
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

  const toastIcon = (type: ToastType) => {
    if (type === 'error') return <XCircle className="h-4 w-4 flex-shrink-0" />;
    if (type === 'success') return <CheckCircle2 className="h-4 w-4 flex-shrink-0" />;
    return <Info className="h-4 w-4 flex-shrink-0" />;
  };

  return (
    <div className={`relative flex h-screen overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0A0F1F] text-slate-100' : 'bg-[#F6F8FA] text-gray-900'
    }`}>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Toast Notifications */}
      <div className="pointer-events-none fixed top-20 right-4 z-[200] flex w-full max-w-sm flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-300 motion-reduce:animate-none ${
              toast.type === 'error'
                ? isDark ? 'border-red-500/20 bg-red-900/80 text-red-100' : 'border-red-500/20 bg-red-50 text-red-900'
                : toast.type === 'success'
                ? isDark ? 'border-emerald-500/20 bg-emerald-900/80 text-emerald-100' : 'border-emerald-500/20 bg-emerald-50 text-emerald-900'
                : isDark ? 'border-blue-500/20 bg-blue-900/80 text-blue-100' : 'border-blue-500/20 bg-blue-50 text-blue-900'
            }`}
          >
            <span className="mt-0.5">{toastIcon(toast.type)}</span>
            <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
          <button
            type="button"
            onClick={() => setCmdOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            aria-label="Close command palette"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className={`relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'border-slate-700/60 bg-slate-900' : 'border-gray-200 bg-white'
            }`}
          >
            <div className={`flex items-center gap-3 border-b px-4 py-3 ${
              isDark ? 'border-slate-700/40' : 'border-gray-200'
            }`}>
              <Search className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                ref={cmdInputRef}
                type="text"
                placeholder="Search commands…"
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                onKeyDown={handleCmdKeyDown}
                className={`flex-1 bg-transparent text-base outline-none placeholder:text-slate-500 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
                aria-label="Search commands"
                aria-activedescendant={filteredCmds[cmdHighlight] ? `cmd-${cmdHighlight}` : undefined}
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
              />
              <kbd className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>ESC</kbd>
            </div>
            <div id="cmd-list" role="listbox" className="max-h-64 overflow-y-auto py-2">
              {filteredCmds.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Search className={`mx-auto h-6 w-6 opacity-30 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  <p className={`mt-2 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    No commands match “{cmdQuery}”.
                  </p>
                </div>
              ) : (
                filteredCmds.map((cmd, i) => (
                  <button
                    key={cmd.label}
                    id={`cmd-${i}`}
                    role="option"
                    aria-selected={cmdHighlight === i}
                    type="button"
                    onMouseEnter={() => setCmdHighlight(i)}
                    onClick={() => runCommand(cmd)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      cmdHighlight === i
                        ? isDark ? 'bg-slate-800/80 text-white' : 'bg-gray-100 text-gray-900'
                        : isDark ? 'text-slate-200' : 'text-gray-700'
                    }`}
                  >
                    <Command className="h-4 w-4 flex-shrink-0 opacity-40" />
                    {cmd.label}
                    {cmd.adminOnly && (
                      <span className="ml-auto rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        ADMIN
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className={`flex items-center justify-between border-t px-4 py-2 ${isDark ? 'border-slate-700/40' : 'border-gray-100'}`}>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <kbd className="rounded bg-slate-800 px-1 py-0.5 text-xs font-medium text-slate-400">↑↓</kbd> navigate
                {'  '}
                <kbd className="rounded bg-slate-800 px-1 py-0.5 text-xs font-medium text-slate-400">↵</kbd> select
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Press <kbd className="rounded px-1 py-0.5 text-xs font-medium bg-slate-800 text-slate-400">⌘K</kbd> to toggle
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden ${
          isMobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Close sidebar"
        tabIndex={-1}
      />

      {/* Sidebar - Floating, minimal, centered */}
      <aside
        className={`fixed left-6 top-1/2 z-40 flex -translate-y-1/2 flex-col rounded-xl border shadow-lg backdrop-blur-xl
          transition-all duration-300 ease-out motion-reduce:transition-none
          ${isMobileSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+1.5rem)] opacity-0'}
          lg:translate-x-0 lg:opacity-100
          ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-72'}
          w-80 max-h-[90vh]
          ${isDark ? 'border-slate-700/40 bg-[#141B2D]/95' : 'border-gray-200/60 bg-white/95'}`}
      >
        {/* Sidebar Header - Simplified */}
        <div className={`border-b px-4 py-3.5 ${isDark ? 'border-slate-700/40' : 'border-gray-200/60'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-3 overflow-hidden transition-[width,opacity] duration-300 ease-out ${
              isSidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
            }`}>
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isAdmin ? <Shield className="h-5 w-5" /> : <span className="text-base font-bold">LOT</span>}
              </div>
              <div className="min-w-0">
                <h1 className={`truncate text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {isAdmin ? 'Admin Panel' : 'LOT'}
                </h1>
                <p className={`truncate text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {isAdmin ? 'Administration' : 'v1.0'}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={toggleSidebar}
                className={`hidden rounded-md p-1.5 transition-colors lg:block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                  isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`rounded-md p-1.5 transition-colors lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick search */}
        {!isSidebarCollapsed && (
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                isDark
                  ? 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                  : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:text-gray-600'
              }`}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isDark ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-400'
              }`}>⌘K</kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation" aria-label="Main navigation">
          <div className={`mb-3 px-2 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {isSidebarCollapsed ? <span className="mx-auto block h-0.5 w-0.5 rounded-full bg-slate-600" /> : "Menu"}
          </div>

          <div className="space-y-0.5">
            {mainMenuItems.map(item => {
              const isActive = activeMainMenu === item.id || (item.isExpandable && activeMainMenu === 'Tools');
              return (
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
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-700'
                        : isDark
                          ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 transition-colors ${
                      isActive
                        ? 'text-emerald-400'
                        : 'group-hover:text-emerald-400'
                    }`}>
                      {item.icon}
                    </span>
                    <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} min-w-0 flex-1 truncate font-medium`}>
                      {item.label}
                    </span>
                    {!isSidebarCollapsed && item.shortcut && (
                      <kbd className={`hidden rounded px-1.5 py-0.5 text-[10px] font-medium lg:block ${
                        isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
                      }`}>{item.shortcut}</kbd>
                    )}
                    {item.badge !== undefined && item.badge > 0 && !isSidebarCollapsed && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    {item.isExpandable && !isSidebarCollapsed && (
                      <span className="ml-0.5 transition-transform duration-150">
                        {isToolsExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </span>
                    )}
                    {isActive && !isSidebarCollapsed && (
                      <span className="ml-0.5 h-5 w-0.5 rounded-full bg-emerald-400" />
                    )}
                    {item.adminOnly && activeMainMenu !== item.id && !isSidebarCollapsed && (
                      <span className="ml-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        ADMIN
                      </span>
                    )}
                    {isSidebarCollapsed && (
                      <span className={`pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                        isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-900'
                      }`}>
                        {item.label}
                      </span>
                    )}
                  </button>

                  {/* Tools Dropdown */}
                  {item.isExpandable && isToolsExpanded && !isSidebarCollapsed && (
                    <div className={`ml-7 space-y-0.5 border-l-2 pl-3 ${
                      isDark ? 'border-emerald-500/20' : 'border-emerald-500/30'
                    }`}>
                      {sortedTools.map(tool => {
                        const accent = ACCENT_STYLES[tool.accent];
                        const toolActive = activeTool === tool.id && activeMainMenu === 'Tools';
                        const isPinned = pinnedTools.includes(tool.id);
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                            disabled={tool.comingSoon}
                            className={`group w-full rounded-lg px-3 py-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                              tool.comingSoon ? 'cursor-not-allowed opacity-40'
                              : toolActive ? `${accent.bg} ${accent.text}`
                              : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors ${
                                toolActive
                                  ? isDark ? accent.iconBgDark : accent.iconBgLight
                                  : isDark ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                {tool.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className={`block truncate text-sm font-medium transition-colors ${
                                  toolActive
                                    ? accent.text
                                    : isDark ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  {tool.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); togglePinTool(tool.id); }}
                                className={`rounded p-0.5 transition-colors ${
                                  isPinned
                                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
                                }`}
                                aria-label={isPinned ? 'Unpin tool' : 'Pin tool'}
                              >
                                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                              </button>
                              {toolActive && (
                                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${accent.dot}`} />
                              )}
                              {tool.comingSoon && (
                                <span className="ml-auto rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">Soon</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed tools icons */}
                  {item.isExpandable && isSidebarCollapsed && (
                    <div className="my-1 hidden space-y-0.5 lg:block">
                      {sortedTools.slice(0, 4).map(tool => {
                        const accent = ACCENT_STYLES[tool.accent];
                        const toolActive = activeTool === tool.id && activeMainMenu === 'Tools';
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => handleToolClick(tool.id, tool.comingSoon)}
                            disabled={tool.comingSoon}
                            title={tool.comingSoon ? `${tool.name} (Coming Soon)` : tool.name}
                            className={`group relative mx-auto flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                              toolActive
                                ? `${accent.border} ${accent.bg} ${accent.text}`
                                : isDark ? 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'
                                : 'border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-900'
                            } ${tool.comingSoon ? 'cursor-not-allowed opacity-40' : ''}`}
                          >
                            {tool.icon}
                            <span className={`pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                              isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-900'
                            }`}>
                              {tool.name}{tool.comingSoon ? ' (Coming Soon)' : ''}
                            </span>
                          </button>
                        );
                      })}
                      {sortedTools.length > 4 && (
                        <button
                          type="button"
                          onClick={() => { setIsSidebarCollapsed(false); }}
                          className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium text-slate-500 hover:bg-slate-800/50 hover:text-white"
                        >
                          +{sortedTools.length - 4}
                        </button>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-4">
            <div className={`mb-3 px-2 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {isSidebarCollapsed ? <span className="mx-auto block h-0.5 w-0.5 rounded-full bg-slate-600" /> : "Resources"}
            </div>
            <div className="space-y-0.5">
              {resourceMenuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMainMenuClick(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={activeMainMenu === item.id ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    activeMainMenu === item.id
                      ? isDark
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-emerald-50 text-emerald-700'
                      : isDark
                        ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
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
                    <span className="ml-0.5 h-5 w-0.5 rounded-full bg-emerald-400" />
                  )}
                  {isSidebarCollapsed && (
                    <span className={`pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                      isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-900'
                    }`}>
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer - Minimal */}
        <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-700/40' : 'border-gray-200/60'}`}>
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${
                isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
              } animate-pulse motion-reduce:animate-none`} />
              <span className={`text-sm font-medium ${
                isAdmin ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {isAdmin ? 'Admin Mode' : 'Ready'}
              </span>
              <span className={`ml-auto text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {isAdmin ? 'v2.0' : 'v1.0'}
              </span>
            </div>
          ) : (
            <div className={`mx-auto h-1.5 w-1.5 rounded-full ${
              isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
            } animate-pulse motion-reduce:animate-none`} />
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        ref={mainContentRef}
        className="flex h-full min-w-0 flex-1 flex-col"
      >
        {/* Top Header - Clean, minimal, with search */}
        <header className={`sticky top-0 z-20 border-b px-4 py-3 shadow-sm backdrop-blur-md sm:px-6 lg:px-8 ${
          isDark ? 'border-slate-700/40 bg-[#0A0F1F]/90' : 'border-gray-200/60 bg-white/90'
        }`}>
          <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`flex-shrink-0 rounded-md p-2 transition-colors lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="Open sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`hidden sm:inline-flex ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {pageMeta.icon}
                  </span>
                  <h2 className={`truncate text-xl font-semibold sm:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {pageMeta.title}
                  </h2>
                  <span className={`hidden text-sm sm:inline ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {pageMeta.breadcrumb}
                  </span>
                </div>
                <p className={`hidden truncate text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} sm:block`}>
                  {pageMeta.description}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
              {/* Search Bar - Always visible */}
              <div className={`hidden items-center rounded-lg border px-3 py-2 md:flex ${
                isDark ? 'border-slate-700/40 bg-slate-800/30' : 'border-gray-200 bg-gray-50/50'
              }`}>
                <Search className={`h-4 w-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search tools, tasks..."
                  className={`w-48 bg-transparent px-2 text-sm outline-none placeholder:text-slate-500 lg:w-64 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                  aria-label="Global search"
                />
                <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  isDark ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-400'
                }`}>⌘/</kbd>
              </div>

              {isAdmin && (
                <span className="hidden items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400 md:inline-flex">
                  <Shield className="mr-1.5 h-4 w-4" />
                  Admin
                </span>
              )}

              {user && (
                <span className="hidden items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 md:inline-flex">
                  <UserIcon className="mr-1.5 h-4 w-4" />
                  {user.email.split('@')[0]}
                </span>
              )}

              {/* View Mode Toggle - Compact */}
              <div className={`hidden items-center gap-0.5 rounded-lg border p-0.5 sm:flex ${
                isDark ? 'border-slate-700/40 bg-slate-800/30' : 'border-gray-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => { setViewMode('grid'); localStorage.setItem(STORAGE_VIEW_MODE_KEY, 'grid'); }}
                  className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    viewMode === 'grid'
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('list'); localStorage.setItem(STORAGE_VIEW_MODE_KEY, 'list'); }}
                  className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    viewMode === 'list'
                      ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                      : isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`hidden rounded-md border p-2 transition-colors sm:flex focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                  isDark ? 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                }`}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`rounded-md border p-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                  isDark ? 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                }`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="block transition-transform duration-300">
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  type="button"
                  onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
                  className={`relative rounded-md border p-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    isDark ? 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label="Toggle notifications"
                  aria-expanded={notifOpen}
                >
                  {isSupported && permission === 'granted' ? (
                    <Bell className="h-4 w-4" />
                  ) : isSupported && permission === 'denied' ? (
                    <BellOff className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-1.5 max-h-[400px] w-80 overflow-hidden rounded-xl border shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isDark ? 'border-slate-700/40 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`flex items-center justify-between border-b px-3 py-2.5 ${isDark ? 'border-slate-700/40' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Notifications
                        </span>
                        {isSupported && permission === 'denied' && (
                          <span className="text-xs text-amber-400" title="Desktop notifications are blocked">
                            <AlertCircle className="inline h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={refreshNotifications}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
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
                    <div className="max-h-[300px] divide-y divide-slate-800/40 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-center">
                          <Bell className="mx-auto h-6 w-6 opacity-20" />
                          <p className={`mt-1.5 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            No notifications yet
                          </p>
                          {isSupported && permission === 'default' && (
                            <button
                              type="button"
                              onClick={requestPermission}
                              className="mt-2 text-xs text-emerald-400 hover:underline"
                            >
                              Enable desktop notifications
                            </button>
                          )}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors ${
                              !n.read ? (isDark ? 'bg-slate-800/30' : 'bg-blue-50/30') : ''
                            } ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-gray-50'}`}
                            onClick={() => markAsRead(n.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') markAsRead(n.id); }}
                          >
                            <span className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                              n.type === 'success' ? 'bg-emerald-400'
                              : n.type === 'warning' ? 'bg-amber-400'
                              : n.type === 'error' ? 'bg-red-400'
                              : 'bg-blue-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                  {n.title}
                                </p>
                                {n.agent_name && n.agent_name !== 'System' && (
                                  <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                                    isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    @{n.agent_name}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {n.message}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                                {n.tool_name && (
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                    isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {n.tool_name.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!n.read && (
                              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userPanelRef}>
                <button
                  type="button"
                  onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    isDark ? 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label="User menu"
                  aria-expanded={userOpen}
                >
                  <UserIcon className="h-4 w-4" />
                </button>

                {userOpen && (
                  <div className={`absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isDark ? 'border-slate-700/40 bg-slate-900' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`border-b px-3 py-2.5 ${isDark ? 'border-slate-700/40' : 'border-gray-100'}`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user?.email || 'LOT User'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {isAdmin ? 'Admin Access' : 'Beta Access'}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {isDark ? 'Light' : 'Dark'} Mode
                      </button>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
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
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
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
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div
              className={`transition-all duration-150 motion-reduce:transition-none ${
                isTransitioning ? 'translate-y-0.5 opacity-0' : 'translate-y-0 opacity-100'
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