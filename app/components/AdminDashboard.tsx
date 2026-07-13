// components/AdminDashboard.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Shield,
  UserPlus,
  Mail,
  Search,
  Edit2,
  Trash2,
  Crown,
  Loader2,
  RefreshCw,
  X,
  Check,
  Calendar,
  User,
  Clock,
  Key,
  Send,
  Eye,
  EyeOff,
  Info,
  RefreshCw as RefreshIcon,
  Settings,
  Megaphone,
  History,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Bell,
  BellOff,
  ToggleLeft,
  ToggleRight,
  Save,
  Zap,
  Globe,
  Lock,
  FileText,
  BarChart2,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Radio,
  Trash,
  Pin,
  PinOff,
} from 'lucide-react';
import { supabase, supabaseAdmin } from '@/lib/supabase/admin';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserStats {
  id: string;
  email: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  lastRun: string | null;
  firstRun: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  role?: 'admin' | 'user';
  isFromAuth?: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalRuns: number;
  successRate: number;
  activeUsers: number;
  usersWithRuns: number;
}

interface ActivityLog {
  id: string;
  user_email: string;
  title: string;
  tool_type: string;
  status: string;
  created_at: string;
  total_count: number;
}

interface SystemSettings {
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxRunsPerUser: number;
  siteName: string;
  supportEmail: string;
  sessionTimeout: number;
  debugMode: boolean;
  autoRefreshInterval: number;
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

// Updated: Multiple admin emails
const ADMIN_EMAILS = ['melvin@outdoorequipped.com', 'jonisa@outdoorequipped.com', 'arlie@outdoorequipped.com', 'jogie@outdoorequipped.com'];

const ALL_KNOWN_USERS = [
  { email: 'arlie@outdoorequipped.com', name: 'Arlie' },
  { email: 'melvin@outdoorequipped.com', name: 'Melvin' },
  { email: 'jbermoy@outdoorequipped.com', name: 'Janroe' },
  { email: 'florante@outdoorequipped.com', name: 'Florante' },
  { email: 'jerald@outdoorequipped.com', name: 'Jerald' },
  { email: 'jonisa@outdoorequipped.com', name: 'Jonisa' },
  { email: 'juddy@outdoorequipped.com', name: 'Juddy' },
  { email: 'lawrencelaudeza@outdoorequipped.com', name: 'Lawrence' },
  { email: 'mpasturan@outdoorequipped.com', name: 'Mark' },
  { email: 'spuebla@outdoorequipped.com', name: 'Shenna' },
  { email: 'wjdelcorro@outdoorequipped.com', name: 'Wyndell' },
  { email: 'jogie@outdoorequipped.com', name: 'Jogie' },
];

const TEAM_MEMBERS = ALL_KNOWN_USERS.map(u => u.email);

const isValidUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  registrationOpen: true,
  maxRunsPerUser: 500,
  siteName: 'LOT – Listing Operations Tools',
  supportEmail: 'melvin@outdoorequipped.com',
  sessionTimeout: 60,
  debugMode: false,
  autoRefreshInterval: 60,
};

// ─── Tab types ────────────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'settings' | 'announcements' | 'activity';

// ─── Tab Navigation Component ──────────────────────────────────────────────

function AdminTabNavigation({
  activeTab,
  setActiveTab,
  announcements,
  isDark,
  textClass,
  mutedTextClass,
  borderClass,
}: {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  announcements: Announcement[];
  isDark: boolean;
  textClass: string;
  mutedTextClass: string;
  borderClass: string;
}) {
  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Users & Activity', icon: <Users className="h-4 w-4" /> },
    { id: 'settings', label: 'System Settings', icon: <Settings className="h-4 w-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" />, badge: announcements.filter(a => a.active).length },
  ];

  return (
    <div className={`flex gap-1 rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-100'}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  // Core state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalRuns: 0, successRate: 0, activeUsers: 0, usersWithRuns: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'team' | 'other'>('all');
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [authUserCount, setAuthUserCount] = useState(0);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const dataLoadedRef = useRef(false);
  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  // User modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserStats | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserStats>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserStats | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // User activity history
  const [viewingUserActivity, setViewingUserActivity] = useState<UserStats | null>(null);
  const [userActivityLogs, setUserActivityLogs] = useState<ActivityLog[]>([]);
  const [userActivityLoading, setUserActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 10;

  // System Settings
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceForm, setAnnounceForm] = useState<Partial<Announcement>>({
    title: '',
    message: '',
    type: 'info',
    targetAll: true,
    targetEmails: [],
    pinned: false,
  });
  const [targetEmailInput, setTargetEmailInput] = useState('');
  const [announceSending, setAnnounceSending] = useState(false);

  // Styles
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const panelClass = isDark ? 'bg-slate-900/70 border-slate-700/50' : 'bg-white border-gray-200';
  const inputClass = isDark
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const hoverRowClass = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50';

  // ─── State Fixes ──────────────────────────────────────────────────────────────

  // 1. Force isLoading to false when data is already loaded
  useEffect(() => {
    if (dataLoadedRef.current) {
      console.log('Data already loaded, forcing isLoading to false');
      setIsLoading(false);
    }
  }, []);

  // 2. Fallback timeout - if still loading after 8 seconds, force it
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('⚠️ Force setting isLoading to false after timeout');
        setIsLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // 3. Safety check - if data is loaded but isLoading is true, fix it
  useEffect(() => {
    if (dataLoadedRef.current && isLoading) {
      console.log('🔄 Safety check: Data loaded but isLoading is true, fixing...');
      setIsLoading(false);
    }
  }, [isLoading, dataLoadedRef.current]);

  // ─── Supabase Database Functions ──────────────────────────────────────────

  const loadSettingsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          maintenanceMode: data.maintenance_mode ?? false,
          registrationOpen: data.registration_open ?? true,
          maxRunsPerUser: data.max_runs_per_user ?? 500,
          siteName: data.site_name ?? 'LOT – Listing Operations Tools',
          supportEmail: data.support_email ?? 'melvin@outdoorequipped.com',
          sessionTimeout: data.session_timeout ?? 60,
          debugMode: data.debug_mode ?? false,
          autoRefreshInterval: data.auto_refresh_interval ?? 60,
        });
      }
      return true;
    } catch (err) {
      console.error('Failed to load settings from DB:', err);
      // Fallback to localStorage
      const saved = localStorage.getItem('lot_admin_settings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
      }
      return false;
    }
  };

  const saveSettingsToDB = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          maintenance_mode: settings.maintenanceMode,
          registration_open: settings.registrationOpen,
          max_runs_per_user: settings.maxRunsPerUser,
          site_name: settings.siteName,
          support_email: settings.supportEmail,
          session_timeout: settings.sessionTimeout,
          debug_mode: settings.debugMode,
          auto_refresh_interval: settings.autoRefreshInterval,
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.email || 'admin',
        })
        .eq('id', 1);

      if (error) throw error;

      // Also save to localStorage as backup
      localStorage.setItem('lot_admin_settings', JSON.stringify(settings));
      
      // Dispatch events to notify all components
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'lot_admin_settings',
        newValue: JSON.stringify(settings),
      }));

      return true;
    } catch (err) {
      console.error('Failed to save settings to DB:', err);
      // Fallback to localStorage
      localStorage.setItem('lot_admin_settings', JSON.stringify(settings));
      return false;
    }
  };

  const loadAnnouncementsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          type: a.type,
          targetAll: a.target_all,
          targetEmails: a.target_emails || [],
          createdAt: a.created_at,
          pinned: a.pinned,
          active: a.active,
        }));
        setAnnouncements(formatted);
        // Also save to localStorage as backup
        localStorage.setItem('lot_announcements', JSON.stringify(formatted));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load announcements from DB:', err);
      // Fallback to localStorage
      const saved = localStorage.getItem('lot_announcements');
      if (saved) {
        try {
          setAnnouncements(JSON.parse(saved));
        } catch {
          setAnnouncements([]);
        }
      }
      return false;
    }
  };

  const saveAnnouncementToDB = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .upsert({
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          type: announcement.type,
          target_all: announcement.targetAll,
          target_emails: announcement.targetEmails,
          pinned: announcement.pinned,
          active: announcement.active,
          created_at: announcement.createdAt,
          created_by: currentUser?.email || 'admin',
        }, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to save announcement to DB:', err);
      return false;
    }
  };

  const deleteAnnouncementFromDB = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete announcement from DB:', err);
      return false;
    }
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const checkAdminStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error:', error);
        setError('Please sign in to access admin panel.');
        return false;
      }
      setCurrentUser(user);
      if (!user) { 
        setError('Please sign in to access admin panel.'); 
        return false; 
      }
      // Updated: Check against multiple admin emails
      if (!ADMIN_EMAILS.includes(user.email || '')) { 
        setError(`Access denied. Only admins can access the admin panel.`); 
        return false; 
      }
      console.log('Admin verified:', user.email);
      return true;
    } catch (err: any) {
      console.error('Failed to verify admin status:', err);
      setError('Failed to verify admin status: ' + err.message);
      return false;
    }
  };

  const fetchData = useCallback(async (force = false) => {
    if (fetchInProgressRef.current && !force) {
      console.log('Fetch already in progress, skipping');
      return;
    }

    if (dataLoadedRef.current && !force) {
      console.log('Data already loaded, skipping fetch');
      setIsLoading(false);
      return;
    }

    fetchInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting fetchData...');
      
      const isAdmin = await checkAdminStatus();
      console.log('isAdmin:', isAdmin);
      
      if (!isAdmin) { 
        console.log('Not admin, stopping fetch');
        setIsLoading(false); 
        fetchInProgressRef.current = false;
        return; 
      }

      // Load settings and announcements from Supabase
      console.log('Loading settings from DB...');
      await loadSettingsFromDB();
      console.log('Loading announcements from DB...');
      await loadAnnouncementsFromDB();

      // Tool runs
      let toolRuns: any[] = [];
      try {
        console.log('Fetching tool runs...');
        const { data, error } = await supabaseAdmin
          .from('tool_runs')
          .select('id, user_email, tool_type, status, title, total_count, created_at')
          .order('created_at', { ascending: false });
        if (error) {
          console.log('Error fetching tool runs, using fallback:', error);
          const { data: fallback } = await supabase
            .from('tool_runs')
            .select('id, user_email, tool_type, status, title, total_count, created_at')
            .order('created_at', { ascending: false });
          toolRuns = fallback || [];
        } else {
          toolRuns = data || [];
        }
      } catch (err) {
        console.error('Tool runs fetch error:', err);
        toolRuns = [];
      }

      console.log('Tool runs count:', toolRuns.length);

      setAllActivities(toolRuns.map((run: any) => ({
        id: run.id,
        user_email: run.user_email || 'System',
        title: run.title || `${run.tool_type} run`,
        tool_type: run.tool_type || 'Unknown',
        status: run.status || 'unknown',
        created_at: run.created_at,
        total_count: run.total_count || 0,
      })));

      // Auth users
      let authUsers: any[] = [];
      let authSuccess = false;
      try {
        console.log('Fetching auth users...');
        const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && data?.users) {
          authUsers = data.users;
          authSuccess = true;
          setAuthUserCount(authUsers.length);
          console.log('Auth users count:', authUsers.length);
        } else {
          console.log('Auth users fetch failed, using fallback');
          setUsingFallbackData(true);
        }
      } catch (err) {
        console.error('Auth users fetch error:', err);
        setUsingFallbackData(true);
      }

      let userMap = new Map<string, UserStats>();
      if (authSuccess && authUsers.length > 0) {
        authUsers.forEach((user: any) => {
          const email = user.email || user.id;
          if (email?.includes('@')) {
            userMap.set(email, {
              id: user.id,
              email,
              totalRuns: 0, completedRuns: 0, failedRuns: 0,
              lastRun: null, firstRun: null,
              created_at: user.created_at || null,
              last_sign_in_at: user.last_sign_in_at || null,
              confirmed_at: user.email_confirmed_at || null,
              // Updated: Check against multiple admin emails
              role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
              isFromAuth: true,
            });
          }
        });
        setUsingFallbackData(false);
      } else {
        setUsingFallbackData(true);
        ALL_KNOWN_USERS.forEach(({ email }) => {
          userMap.set(email, {
            id: email, email,
            totalRuns: 0, completedRuns: 0, failedRuns: 0,
            lastRun: null, firstRun: null,
            created_at: null, last_sign_in_at: null, confirmed_at: null,
            // Updated: Check against multiple admin emails
            role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
            isFromAuth: false,
          });
        });
        toolRuns.forEach((run: any) => {
          if (run.user_email && !userMap.has(run.user_email)) {
            userMap.set(run.user_email, {
              id: run.user_email, email: run.user_email,
              totalRuns: 0, completedRuns: 0, failedRuns: 0,
              lastRun: null, firstRun: null,
              created_at: null, last_sign_in_at: null, confirmed_at: null,
              role: 'user', isFromAuth: false,
            });
          }
        });
      }

      toolRuns.forEach((run: any) => {
        const email = run.user_email;
        if (email && userMap.has(email)) {
          const s = userMap.get(email)!;
          s.totalRuns++;
          if (run.status === 'completed') s.completedRuns++;
          if (run.status === 'failed' || run.status === 'error') s.failedRuns++;
          if (!s.firstRun || run.created_at < s.firstRun) s.firstRun = run.created_at;
          if (!s.lastRun || run.created_at > s.lastRun) s.lastRun = run.created_at;
        }
      });

      const userStatsArray = Array.from(userMap.values())
        .sort((a, b) => b.totalRuns - a.totalRuns || a.email.localeCompare(b.email));
      setUserStats(userStatsArray);

      const totalRuns = toolRuns.length;
      const completedRuns = toolRuns.filter((r: any) => r.status === 'completed').length;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      setStats({
        totalUsers: userStatsArray.length,
        totalRuns,
        successRate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0,
        activeUsers: userStatsArray.filter(u => u.lastRun && new Date(u.lastRun) >= sevenDaysAgo).length,
        usersWithRuns: userStatsArray.filter(u => u.totalRuns > 0).length,
      });

      setActivities(toolRuns.slice(0, 10).map((run: any) => ({
        id: run.id,
        user_email: run.user_email || 'System',
        title: run.title || `${run.tool_type} run`,
        tool_type: run.tool_type || 'Unknown',
        status: run.status || 'unknown',
        created_at: run.created_at,
        total_count: run.total_count || 0,
      })));

      dataLoadedRef.current = true;
      setIsLoading(false); // Force set loading to false immediately
      console.log('Data loaded successfully!');

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load data');
      setIsLoading(false);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        console.log('Loading complete, isLoading set to false');
      }
      fetchInProgressRef.current = false;
    }
  }, []);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dataLoadedRef.current && !fetchInProgressRef.current) {
      fetchData();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Listen for settings updates from other tabs/windows
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettingsFromDB();
      loadAnnouncementsFromDB();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    // Real-time subscription for settings changes
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'id=eq.1',
        },
        (payload) => {
          console.log('Settings updated in real-time:', payload);
          loadSettingsFromDB();
        }
      )
      .subscribe();

    // Real-time subscription for announcements changes
    const announcementsChannel = supabase
      .channel('announcements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          console.log('Announcements updated in real-time:', payload);
          loadAnnouncementsFromDB();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
      supabase.removeChannel(channel);
      supabase.removeChannel(announcementsChannel);
    };
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    dataLoadedRef.current = false;
    await fetchData(true);
    setIsRefreshing(false);
  }, [fetchData]);

  // ─── System Settings Functions ────────────────────────────────────────────

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const success = await saveSettingsToDB();
      if (success) {
        setSettingsDirty(false);
        setActionSuccess('System settings saved successfully to database! All users will see the changes.');
      } else {
        setActionSuccess('Settings saved locally. Database save failed, but changes are applied.');
      }
    } catch (err: any) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsDirty(true);
  };

  // ─── Announcements Functions ──────────────────────────────────────────────

  const sendAnnouncement = async () => {
    if (!announceForm.title || !announceForm.message) {
      setError('Please fill in the title and message.');
      return;
    }
    
    setAnnounceSending(true);
    setError(null);

    try {
      const newAnn: Announcement = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        title: announceForm.title!,
        message: announceForm.message!,
        type: announceForm.type || 'info',
        targetAll: announceForm.targetAll ?? true,
        targetEmails: announceForm.targetEmails || [],
        createdAt: new Date().toISOString(),
        pinned: announceForm.pinned || false,
        active: true,
      };

      const success = await saveAnnouncementToDB(newAnn);
      if (success) {
        setAnnouncements(prev => [newAnn, ...prev]);
        setShowAnnounceModal(false);
        setAnnounceForm({ title: '', message: '', type: 'info', targetAll: true, targetEmails: [], pinned: false });
        setTargetEmailInput('');
        setActionSuccess(`Announcement "${newAnn.title}" published to all users!`);
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      } else {
        const updated = [newAnn, ...announcements];
        localStorage.setItem('lot_announcements', JSON.stringify(updated));
        setAnnouncements(updated);
        setShowAnnounceModal(false);
        setActionSuccess(`Announcement "${newAnn.title}" saved locally.`);
      }
    } catch (err: any) {
      setError('Failed to publish announcement: ' + err.message);
    } finally {
      setAnnounceSending(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const togglePin = async (id: string) => {
    const updated = announcements.map(a => 
      a.id === id ? { ...a, pinned: !a.pinned } : a
    );
    const announcement = updated.find(a => a.id === id);
    if (announcement) {
      await saveAnnouncementToDB(announcement);
      setAnnouncements(updated);
    }
  };

  const toggleActive = async (id: string) => {
    const updated = announcements.map(a => 
      a.id === id ? { ...a, active: !a.active } : a
    );
    const announcement = updated.find(a => a.id === id);
    if (announcement) {
      await saveAnnouncementToDB(announcement);
      setAnnouncements(updated);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const success = await deleteAnnouncementFromDB(id);
    if (success) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setActionSuccess('Announcement deleted.');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // ─── User Actions ───────────────────────────────────────────────────────────

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) { setError('Please provide email and password'); return; }
    setActionLoading(true); setError(null);
    try {
      const { error } = await supabaseAdmin.auth.admin.createUser({ email: newUserEmail, password: newUserPassword, email_confirm: true });
      if (error) throw error;
      setActionSuccess(`User ${newUserEmail} created successfully!`);
      setIsAddingUser(false); setNewUserEmail(''); setNewUserPassword('');
      await refreshData();
    } catch (err: any) { setError(err.message || 'Failed to create user'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isValidUUID(userId)) { setError('Cannot delete user not in auth system.'); setShowDeleteConfirm(null); return; }
    setActionLoading(true); setError(null);
    try {
      const userToDelete = userStats.find(u => u.id === userId);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      setUserStats(prev => prev.filter(u => u.id !== userId));
      setShowDeleteConfirm(null);
      setActionSuccess(`User ${userToDelete?.email} deleted.`);
      await refreshData();
    } catch (err: any) { setError(err.message || 'Failed to delete user'); }
    finally { setActionLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!passwordUser.isFromAuth || !isValidUUID(passwordUser.id)) { setError('User not in auth system.'); return; }
    setActionLoading(true); setError(null);
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(passwordUser.id, { password: newPassword });
      if (error) throw error;
      setActionSuccess(`Password for ${passwordUser.email} updated.`);
      setShowPasswordModal(false); setPasswordUser(null); setNewPassword(''); setShowPassword(false);
    } catch (err: any) { setError(err.message || 'Failed to update password'); }
    finally { setActionLoading(false); }
  };

  const handleSendResetEmail = async (email: string) => {
    const user = userStats.find(u => u.email === email);
    if (!user?.isFromAuth) { setError('User not in auth system.'); return; }
    setActionLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
      if (error) throw error;
      setActionSuccess(`Reset email sent to ${email}`);
    } catch (err: any) { setError(err.message || 'Failed to send reset email'); }
    finally { setActionLoading(false); }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatDateShort = (d: string | null) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': case 'success': return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
      case 'failed': case 'error': return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700';
      case 'warning': return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
      default: return isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600';
    }
  };

  const getAnnounceColor = (type: string) => {
    switch (type) {
      case 'info': return { bg: isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200', text: 'text-blue-400', icon: <Info className="h-4 w-4" /> };
      case 'warning': return { bg: isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200', text: 'text-yellow-400', icon: <AlertTriangle className="h-4 w-4" /> };
      case 'success': return { bg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200', text: 'text-emerald-400', icon: <CheckCircle className="h-4 w-4" /> };
      case 'error': return { bg: isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200', text: 'text-red-400', icon: <AlertCircle className="h-4 w-4" /> };
      default: return { bg: '', text: mutedTextClass, icon: null };
    }
  };

  const filteredUsers = userStats.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const isAdm = ADMIN_EMAILS.includes(user.email);
    const isTeam = TEAM_MEMBERS.includes(user.email);
    let matchesRole = true;
    if (filterRole === 'admin') matchesRole = isAdm;
    else if (filterRole === 'team') matchesRole = isTeam;
    else if (filterRole === 'other') matchesRole = !isTeam && !isAdm;
    return matchesSearch && matchesRole;
  });

  const openUserActivity = (user: UserStats) => {
    setViewingUserActivity(user);
    setActiveTab('activity');
    setActivityPage(1);
    setUserActivityLoading(true);
    const userLogs = allActivities.filter(a => a.user_email === user.email);
    setUserActivityLogs(userLogs);
    setUserActivityLoading(false);
  };

  const closeUserActivity = () => {
    setViewingUserActivity(null);
    setActiveTab('overview');
    setUserActivityLogs([]);
    setActivityPage(1);
  };

  const paginatedActivity = userActivityLogs.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE
  );
  const totalActivityPages = Math.ceil(userActivityLogs.length / ACTIVITY_PAGE_SIZE);

  // ─── Access Denied ──────────────────────────────────────────────────────────

  if (error?.includes('Access denied')) {
    return (
      <div className={`rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center ${panelClass}`}>
        <Shield className="mx-auto h-16 w-16 text-red-400 opacity-50" />
        <h3 className={`mt-4 text-xl font-bold ${textClass}`}>Access Denied</h3>
        <p className={`mt-2 ${mutedTextClass}`}>{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-500">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ─── Render Content ────────────────────────────────────────────────────────

  const renderContent = () => {
    console.log('renderContent called, isLoading:', isLoading);
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      );
    }

    // User Activity History Tab
    if (activeTab === 'activity' && viewingUserActivity) {
      const displayName = viewingUserActivity.email.split('@')[0];
      const cap = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      const toolBreakdown: Record<string, number> = {};
      userActivityLogs.forEach(l => { toolBreakdown[l.tool_type] = (toolBreakdown[l.tool_type] || 0) + 1; });

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={closeUserActivity}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </button>
            <div>
              <h2 className={`text-xl font-bold ${textClass}`}>{cap}'s Activity History</h2>
              <p className={`text-sm ${mutedTextClass}`}>{viewingUserActivity.email} · {userActivityLogs.length} total runs</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Runs', value: viewingUserActivity.totalRuns, color: 'text-white' },
              { label: 'Completed', value: viewingUserActivity.completedRuns, color: 'text-emerald-400' },
              { label: 'Failed', value: viewingUserActivity.failedRuns, color: 'text-red-400' },
              {
                label: 'Success Rate',
                value: viewingUserActivity.totalRuns > 0
                  ? `${Math.round((viewingUserActivity.completedRuns / viewingUserActivity.totalRuns) * 100)}%`
                  : '—',
                color: 'text-blue-400',
              },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border p-4 ${panelClass}`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className={`text-xs ${mutedTextClass}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {Object.keys(toolBreakdown).length > 0 && (
            <div className={`rounded-xl border ${panelClass} p-4`}>
              <h3 className={`mb-3 text-sm font-semibold ${textClass}`}>Tool Usage Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(toolBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tool, count]) => (
                    <div key={tool} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                      <span className={textClass}>{tool}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className={`rounded-xl border ${panelClass} overflow-hidden`}>
            <div className={`border-b px-6 py-4 ${borderClass}`}>
              <h3 className={`font-semibold ${textClass}`}>Run History</h3>
            </div>
            {userActivityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : userActivityLogs.length === 0 ? (
              <div className={`py-12 text-center ${mutedTextClass}`}>
                <Activity className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-2">No activity yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-gray-50'}>
                      <tr>
                        {['Title', 'Tool', 'Status', 'Items', 'Date'].map(h => (
                          <th key={h} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${borderClass}`}>
                      {paginatedActivity.map(log => (
                        <tr key={log.id} className={`transition-colors ${hoverRowClass}`}>
                          <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>{log.title}</td>
                          <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{log.tool_type}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeColor(log.status)}`}>{log.status}</span>
                          </td>
                          <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{log.total_count}</td>
                          <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{formatDate(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalActivityPages > 1 && (
                  <div className={`flex items-center justify-between border-t px-6 py-3 ${borderClass}`}>
                    <p className={`text-sm ${mutedTextClass}`}>
                      Page {activityPage} of {totalActivityPages} · {userActivityLogs.length} runs
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                        disabled={activityPage === 1}
                        className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                        disabled={activityPage === totalActivityPages}
                        className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    // Settings Tab
    if (activeTab === 'settings') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${textClass}`}>System Settings</h2>
              <p className={`text-sm ${mutedTextClass}`}>Configure site-wide behaviour and access controls</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ✅ Changes apply to ALL users in real-time
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {settingsDirty && (
                <span className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ● Unsaved changes
                </span>
              )}
              <button
                onClick={resetSettings}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveSettings}
                disabled={!settingsDirty || settingsSaving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to All Users
              </button>
            </div>
          </div>

          {actionSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" /> {actionSuccess}
            </div>
          )}

          <div className={`rounded-xl border ${panelClass} overflow-hidden`}>
            <div className={`border-b px-6 py-4 ${borderClass} flex items-center gap-2`}>
              <Globe className={`h-4 w-4 ${mutedTextClass}`} />
              <h3 className={`font-semibold ${textClass}`}>Site Configuration</h3>
            </div>
            <div className="divide-y divide-slate-700/40 p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={e => handleSettingChange('siteName', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Support Email</label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={e => handleSettingChange('supportEmail', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 pt-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Max Runs Per User</label>
                  <input
                    type="number"
                    value={settings.maxRunsPerUser}
                    onChange={e => handleSettingChange('maxRunsPerUser', parseInt(e.target.value))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Auto-refresh Interval (seconds)</label>
                  <input
                    type="number"
                    value={settings.autoRefreshInterval}
                    onChange={e => handleSettingChange('autoRefreshInterval', parseInt(e.target.value))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="pt-4">
                <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={e => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  className={`w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                />
              </div>
            </div>
          </div>

          <div className={`rounded-xl border ${panelClass} overflow-hidden`}>
            <div className={`border-b px-6 py-4 ${borderClass} flex items-center gap-2`}>
              <Lock className={`h-4 w-4 ${mutedTextClass}`} />
              <h3 className={`font-semibold ${textClass}`}>Access Controls</h3>
            </div>
            <div className="p-6 space-y-4">
              {[
                {
                  key: 'maintenanceMode' as keyof SystemSettings,
                  label: 'Maintenance Mode',
                  desc: 'Block all users (except admin) from accessing tools. Affects ALL users immediately.',
                  danger: true,
                },
                {
                  key: 'registrationOpen' as keyof SystemSettings,
                  label: 'Open Registration',
                  desc: 'Allow new users to create accounts via sign-up.',
                  danger: false,
                },
                {
                  key: 'debugMode' as keyof SystemSettings,
                  label: 'Debug Mode',
                  desc: 'Show extended error logs and developer info in the UI.',
                  danger: false,
                },
              ].map(({ key, label, desc, danger }) => (
                <div key={key} className={`flex items-center justify-between rounded-xl border p-4 ${
                  danger && settings[key]
                    ? isDark ? 'border-red-500/40 bg-red-500/10' : 'border-red-200 bg-red-50'
                    : isDark ? 'border-slate-700/60 bg-slate-800/30' : 'border-gray-100 bg-gray-50'
                }`}>
                  <div>
                    <p className={`font-medium text-sm ${danger && settings[key] ? 'text-red-400' : textClass}`}>
                      {label}
                      {danger && settings[key] && (
                        <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">ACTIVE</span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${mutedTextClass}`}>{desc}</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange(key, !settings[key])}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      settings[key]
                        ? danger
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    {settings[key] ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {settings[key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Announcements Tab
    if (activeTab === 'announcements') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${textClass}`}>Announcements</h2>
              <p className={`text-sm ${mutedTextClass}`}>Broadcast messages to all or specific team members</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ✅ Announcements appear to ALL users in real-time
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowAnnounceModal(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <Megaphone className="h-4 w-4" />
              New Announcement
            </button>
          </div>

          {actionSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" /> {actionSuccess}
            </div>
          )}

          {announcements.length === 0 ? (
            <div className={`rounded-xl border ${panelClass} py-16 text-center`}>
              <Megaphone className={`mx-auto h-12 w-12 opacity-20 ${mutedTextClass}`} />
              <p className={`mt-3 font-medium ${textClass}`}>No announcements yet</p>
              <p className={`text-sm ${mutedTextClass}`}>Create one to broadcast to all users.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements
                .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                .map(ann => {
                  const color = getAnnounceColor(ann.type);
                  return (
                    <div key={ann.id} className={`rounded-xl border p-5 transition-opacity ${color.bg} ${!ann.active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={`mt-0.5 flex-shrink-0 ${color.text}`}>{color.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold text-sm ${textClass}`}>{ann.title}</p>
                              {ann.pinned && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                  📌 Pinned
                                </span>
                              )}
                              {!ann.active && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                                  Inactive
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700/60 text-slate-400' : 'bg-white/60 text-gray-500'}`}>
                                {ann.targetAll ? 'All users' : `${ann.targetEmails.length} users`}
                              </span>
                            </div>
                            <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{ann.message}</p>
                            <p className={`mt-2 text-xs ${mutedTextClass}`}>{formatDate(ann.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => togglePin(ann.id)}
                            title={ann.pinned ? 'Unpin' : 'Pin'}
                            className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-amber-400' : 'hover:bg-white/60 text-gray-400 hover:text-amber-500'}`}
                          >
                            {ann.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => toggleActive(ann.id)}
                            title={ann.active ? 'Deactivate' : 'Activate'}
                            className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white/60 text-gray-400'}`}
                          >
                            {ann.active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-100/60 text-gray-400 hover:text-red-500'}`}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {showAnnounceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${panelClass}`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className={`text-xl font-bold ${textClass}`}>New Announcement</h3>
                  <button onClick={() => setShowAnnounceModal(false)} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                    <X className={`h-5 w-5 ${mutedTextClass}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Title</label>
                    <input
                      type="text"
                      value={announceForm.title}
                      onChange={e => setAnnounceForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Announcement title..."
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Message</label>
                    <textarea
                      value={announceForm.message}
                      onChange={e => setAnnounceForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Write your announcement here..."
                      rows={4}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${inputClass}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Type</label>
                      <select
                        value={announceForm.type}
                        onChange={e => setAnnounceForm(f => ({ ...f, type: e.target.value as Announcement['type'] }))}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                      >
                        <option value="info">ℹ️ Info</option>
                        <option value="success">✅ Success</option>
                        <option value="warning">⚠️ Warning</option>
                        <option value="error">🚨 Alert</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Audience</label>
                      <select
                        value={announceForm.targetAll ? 'all' : 'specific'}
                        onChange={e => setAnnounceForm(f => ({ ...f, targetAll: e.target.value === 'all', targetEmails: [] }))}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                      >
                        <option value="all">All Users</option>
                        <option value="specific">Specific Users</option>
                      </select>
                    </div>
                  </div>

                  {!announceForm.targetAll && (
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${mutedTextClass}`}>Target Emails</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={targetEmailInput}
                          onChange={e => setTargetEmailInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && targetEmailInput) {
                              setAnnounceForm(f => ({ ...f, targetEmails: [...(f.targetEmails || []), targetEmailInput] }));
                              setTargetEmailInput('');
                            }
                          }}
                          placeholder="email@outdoorequipped.com"
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
                        />
                        <button
                          onClick={() => {
                            if (targetEmailInput) {
                              setAnnounceForm(f => ({ ...f, targetEmails: [...(f.targetEmails || []), targetEmailInput] }));
                              setTargetEmailInput('');
                            }
                          }}
                          className="rounded-lg bg-emerald-600/20 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-600/30"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {announceForm.targetEmails?.map(em => (
                          <span key={em} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                            {em}
                            <button onClick={() => setAnnounceForm(f => ({ ...f, targetEmails: f.targetEmails?.filter(e => e !== em) }))}>
                              <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <p className={`text-sm font-medium ${textClass}`}>Pin announcement</p>
                      <p className={`text-xs ${mutedTextClass}`}>Pinned announcements appear first</p>
                    </div>
                    <button
                      onClick={() => setAnnounceForm(f => ({ ...f, pinned: !f.pinned }))}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        announceForm.pinned
                          ? 'bg-amber-500/20 text-amber-400'
                          : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {announceForm.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                      {announceForm.pinned ? 'Pinned' : 'Pin it'}
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={sendAnnouncement}
                      disabled={announceSending || !announceForm.title || !announceForm.message}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {announceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Publish to All Users
                    </button>
                    <button
                      onClick={() => setShowAnnounceModal(false)}
                      className={`flex-1 rounded-lg border py-2.5 font-semibold transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ─── Overview Tab (default) ─────────────────────────────────────────────
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Total Users', value: stats.totalUsers, color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Users className="h-5 w-5 text-blue-400" /> },
            { label: 'Active (7d)', value: stats.activeUsers, color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: <Activity className="h-5 w-5 text-emerald-400" /> },
            { label: 'Total Runs', value: stats.totalRuns, color: 'text-purple-400', bg: 'bg-purple-500/20', icon: <TrendingUp className="h-5 w-5 text-purple-400" /> },
            { label: 'Success Rate', value: `${stats.successRate}%`, color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <Target className="h-5 w-5 text-yellow-400" /> },
            { label: 'With Runs', value: stats.usersWithRuns, color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: <User className="h-5 w-5 text-cyan-400" /> },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-4 ${panelClass}`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bg}`}>{card.icon}</div>
                <div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className={`text-xs ${mutedTextClass}`}>{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className={`rounded-xl border ${panelClass} p-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedTextClass}`} />
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full rounded-lg border pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as any)}
              className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
            >
              <option value="all">All Users</option>
              <option value="admin">Admin Only</option>
              <option value="team">Team Members</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className={`rounded-xl border ${panelClass} overflow-hidden`}>
          <div className={`border-b px-6 py-4 ${borderClass} flex items-center gap-2`}>
            <Shield className={`h-5 w-5 ${mutedTextClass}`} />
            <h3 className={`font-semibold ${textClass}`}>User Statistics</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
              {filteredUsers.length}
            </span>
            {usingFallbackData && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                Fallback Mode
              </span>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className={`py-12 text-center ${mutedTextClass}`}>
              <Users className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-2">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? 'bg-slate-800/50' : 'bg-gray-50'}>
                  <tr>
                    {['User', 'Joined', 'Last Sign In', 'Total Runs', 'Completed', 'Failed', 'Success Rate', 'Last Active', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${mutedTextClass}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderClass}`}>
                  {filteredUsers.map(user => {
                    const successRate = user.totalRuns > 0 ? Math.round((user.completedRuns / user.totalRuns) * 100) : 0;
                    const isAdm = ADMIN_EMAILS.includes(user.email);
                    const isTeam = TEAM_MEMBERS.includes(user.email);
                    const hasRuns = user.totalRuns > 0;
                    const isFromAuth = user.isFromAuth && isValidUUID(user.id);
                    const displayName = user.email.split('@')[0];
                    const cap = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                    return (
                      <tr key={user.id} className={`transition-colors ${hoverRowClass} ${!hasRuns ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${isAdm ? 'bg-amber-500/20 text-amber-400' : isTeam ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {isAdm ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${textClass}`}>{cap}
                                {!isFromAuth && <span className={`ml-1 text-[9px] ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>(local)</span>}
                              </p>
                              <p className={`text-xs truncate max-w-[160px] ${mutedTextClass}`}>{user.email}</p>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {isAdm && <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${isDark ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>ADMIN</span>}
                                {isTeam && !isAdm && <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Team</span>}
                                {!hasRuns && <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>No runs</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{formatDateShort(user.created_at)}</td>
                        <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{user.last_sign_in_at ? formatDateShort(user.last_sign_in_at) : 'Never'}</td>
                        <td className={`px-4 py-3 text-sm ${textClass}`}>{user.totalRuns}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{user.completedRuns}</td>
                        <td className="px-4 py-3 text-sm text-red-400">{user.failedRuns}</td>
                        <td className="px-4 py-3">
                          {hasRuns ? (
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                <div className={`h-full rounded-full ${successRate >= 80 ? 'bg-emerald-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${successRate}%` }} />
                              </div>
                              <span className={`text-sm ${textClass}`}>{successRate}%</span>
                            </div>
                          ) : <span className={`text-sm ${mutedTextClass}`}>—</span>}
                        </td>
                        <td className={`px-4 py-3 text-sm ${mutedTextClass}`}>{formatDate(user.lastRun)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {hasRuns && (
                              <button
                                onClick={() => openUserActivity(user)}
                                title="View activity history"
                                className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-100 text-gray-400 hover:text-blue-600'}`}
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}

                            {!isAdm && isFromAuth ? (
                              <>
                                <button onClick={() => { setEditingUser(user); setEditFormData({ email: user.email, role: user.role }); setShowUserModal(true); }} title="Edit" className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'}`}>
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setPasswordUser(user); setNewPassword(''); setShowPassword(false); setShowPasswordModal(true); }} title="Change password" className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-100 text-gray-400 hover:text-blue-600'}`}>
                                  <Key className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleSendResetEmail(user.email)} title="Send reset email" className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-amber-500/20 text-slate-400 hover:text-amber-400' : 'hover:bg-amber-100 text-gray-400 hover:text-amber-600'}`}>
                                  <Send className="h-4 w-4" />
                                </button>
                                {showDeleteConfirm === user.id ? (
                                  <>
                                    <button onClick={() => handleDeleteUser(user.id)} className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30" title="Confirm delete">
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(null)} className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}>
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => setShowDeleteConfirm(user.id)} title="Delete" className={`rounded-lg p-1.5 transition-colors ${isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            ) : isAdm ? (
                              <span className={`text-xs px-2 ${mutedTextClass}`}>Protected</span>
                            ) : (
                              <span className={`text-xs ${mutedTextClass}`}><Info className="h-4 w-4" /></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className={`rounded-xl border ${panelClass}`}>
          <div className={`border-b px-6 py-4 ${borderClass} flex items-center gap-2`}>
            <Activity className={`h-5 w-5 ${mutedTextClass}`} />
            <h3 className={`font-semibold ${textClass}`}>Recent Activity</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Last 10</span>
          </div>
          <div className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
            {activities.length === 0 ? (
              <div className={`py-8 text-center ${mutedTextClass}`}><p>No recent activity</p></div>
            ) : activities.map(a => (
              <div key={a.id} className={`flex items-center gap-4 px-6 py-3 ${hoverRowClass}`}>
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${a.status === 'completed' ? 'bg-emerald-400' : a.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${textClass}`}><span className="font-medium">{a.user_email}</span> <span className={mutedTextClass}>{a.title}</span></p>
                  <p className={`text-xs ${mutedTextClass}`}>{a.tool_type} · {a.total_count} items</p>
                </div>
                <span className={`text-xs ${mutedTextClass} flex-shrink-0`}>{formatDate(a.created_at)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${getStatusBadgeColor(a.status)}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textClass}`}>Admin Dashboard</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Logged in as <span className="font-semibold text-amber-400">{currentUser?.email}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ✅ Changes apply to ALL users
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>·</span>
            <span className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              🔄 Real-time sync enabled
            </span>
          </div>
          {usingFallbackData ? (
            <div className={`mt-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
              <Info className="h-3 w-3 inline mr-1" />
              Fallback mode — using localStorage. Some features may not sync across users.
              <button onClick={refreshData} className="ml-2 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                <RefreshIcon className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : (
            <p className={`mt-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ✅ Database connected · {authUserCount} users
            </p>
          )}
          {actionSuccess && (
            <p className={`mt-1 text-xs text-emerald-400`}>✅ {actionSuccess}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddingUser(true)}
            disabled={usingFallbackData}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${usingFallbackData ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      <AdminTabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        announcements={announcements}
        isDark={isDark}
        textClass={textClass}
        mutedTextClass={mutedTextClass}
        borderClass={borderClass}
      />

      {error && !error.includes('Access denied') && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" /> {error}
        </div>
      )}

      {renderContent()}

      {/* ── Modals ── */}

      {/* Add User */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${panelClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textClass}`}>Add New User</h3>
              <button onClick={() => { setIsAddingUser(false); setNewUserEmail(''); setNewUserPassword(''); }} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X className={`h-5 w-5 ${mutedTextClass}`} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Email</label>
                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@outdoorequipped.com" className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Password</label>
                <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Min 6 characters" className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddUser} disabled={actionLoading} className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create User'}
                </button>
                <button onClick={() => { setIsAddingUser(false); setNewUserEmail(''); setNewUserPassword(''); }} className={`flex-1 rounded-lg border py-2.5 font-semibold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${panelClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textClass}`}>Edit User</h3>
              <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X className={`h-5 w-5 ${mutedTextClass}`} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Email</label><p className={`text-sm ${textClass}`}>{editingUser.email}</p></div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>Role</label>
                <select value={editFormData.role || 'user'} onChange={e => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'user' })} disabled={ADMIN_EMAILS.includes(editingUser.email)} className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass} ${ADMIN_EMAILS.includes(editingUser.email) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setUserStats(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: editFormData.role as 'admin' | 'user' } : u)); setShowUserModal(false); setEditingUser(null); setActionSuccess('User updated.'); }} className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500">Save Changes</button>
                <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className={`flex-1 rounded-lg border py-2.5 font-semibold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${panelClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textClass}`}>Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordUser(null); setNewPassword(''); }} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X className={`h-5 w-5 ${mutedTextClass}`} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>User</label><p className={`text-sm ${textClass}`}>{passwordUser.email}</p></div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${mutedTextClass}`}>New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleChangePassword} disabled={actionLoading || newPassword.length < 6} className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Update Password'}
                </button>
                <button onClick={() => { setShowPasswordModal(false); setPasswordUser(null); setNewPassword(''); }} className={`flex-1 rounded-lg border py-2.5 font-semibold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Target icon
function Target({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}