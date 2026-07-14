'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Trophy,
  Medal,
  Crown,
  Users,
  Wrench,
  X,
  Sparkles,
  Edit2,
  AlertCircle,
  Shield,
  Bell,
} from 'lucide-react';
import Image from 'next/image';

import { supabase } from '../../lib/supabase/client';
import { isTaskAdminEmail } from '../../lib/task-option';
import { NotificationBell } from './notification-bell';
import { Task, TaskFormValues, ToolRun, TeamMember, defaultTeamMembers, getUserImage, operationTools, StatusDot, relativeTime, formatDate, normalizeStatus, useAnimatedCounter, Sparkline } from './dashboard-utils';
import { TaskNameGeneratorModal, ReasonForPendingModal, MemberRouletteModal, TaskFormModal } from './dashboard-modals';

// Valid task statuses (kept for status transition controls / filters used elsewhere)
const VALID_TASK_STATUSES = [
  'Completed',
  'Cancelled',
  'Pending',
  'Ongoing',
  'Assigned',
  'WIP',
  'For Audit',
  'For Investigation',
  'Hold',
  'For Correx',
];

const ADMIN_EMAILS = [
  'melvin@outdoorequipped.com',
  'jonisa@outdoorequipped.com',
  'arlie@outdoorequipped.com',
  'jogie@outdoorequipped.com',
];

const BRAND_OPTIONS = [
  'Outdoor Equipped',
  'Gumshoe',
  'Borne',
  'Tactical',
  'Tactical Distributors',
  'Fire',
  'Mountain',
  'Basecamp',
  'Cobalt',
  'Trek',
  'Kodiak',
  'Forge',
  'Apex',
  'Other',
];

interface DashboardClientProps {
  initialTasks?: any[];
  theme?: 'light' | 'dark';
  currentUserEmail?: string;
  currentUserName?: string;
}

export default function DashboardClient({
  initialTasks = [],
  theme = 'dark',
  currentUserEmail = '',
  currentUserName = '',
}: DashboardClientProps) {
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Task-related state (surfaced through the Task Detail modal and quick actions below)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [previousTaskIds, setPreviousTaskIds] = useState<Set<string>>(new Set());
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [showNewTaskNotification, setShowNewTaskNotification] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [showTaskGenerator, setShowTaskGenerator] = useState(false);
  const [selectedTaskForGenerator, setSelectedTaskForGenerator] = useState<Task | null>(null);

  // Reason for Pending states
  const [showPendingReasonModal, setShowPendingReasonModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const didInitialLoadRef = useRef(false);

  const isDark = theme === 'dark';
  const isAdmin = ADMIN_EMAILS.includes(currentUserEmail);
  const isTaskAdmin = isTaskAdminEmail(currentUserEmail);

  // Google Sheets configuration
  const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
  const SHEET_NAME = 'Copy of Task Masterlist - Operations';

  const processTasksFromSheet = useCallback((sheetData: any): Task[] => {
    let headers: string[];
    let rowData: { row: any[]; rowIndex: number }[];

    if (sheetData && typeof sheetData === 'object' && sheetData.headers && sheetData.rows) {
      headers = sheetData.headers;
      rowData = sheetData.rows;
    } else if (Array.isArray(sheetData) && sheetData.length > 0) {
      headers = sheetData[0] || [];
      const rows = sheetData.slice(1) || [];
      rowData = rows.map((row, index) => ({ row, rowIndex: index + 2 }));
    } else {
      console.warn('⚠️ Unknown sheet data format:', sheetData);
      return [];
    }

    if (!headers || headers.length === 0 || rowData.length === 0) {
      return [];
    }

    const columnMap: { [key: string]: number } = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        const key = header.toString().trim().toLowerCase();
        if (!(key in columnMap)) {
          columnMap[key] = index;
        }
      }
    });

    const taskCol = columnMap['task'];
    const statusCol = columnMap['status'];
    const dateRequestedCol = columnMap['date requested'];
    const dateAssignedCol = columnMap['date assigned'];
    const dueDateCol = columnMap['due date'];
    const dateCompletedCol = columnMap['date completed'];
    const tatCol = columnMap['tat'];
    const segmentCol = columnMap['segment'];
    const typeCol = columnMap['type'];
    const brandCol = columnMap['brand'];
    const agentCol = columnMap['agent'];
    const remarksCol = columnMap['remarks'];
    const auditorCol = columnMap['auditor'];
    const bcLinksCol = columnMap['bc links'] ?? columnMap['bc link'];
    const reasonPendingCol = columnMap['reason for pending'];
    const reasonCancelCol = columnMap['reason for cancel'];

    if (taskCol === undefined) {
      console.error('⚠️ "Task" column not found in sheet headers:', headers);
      return [];
    }

    const get = (row: any[], idx: number | undefined) => (idx !== undefined && idx < row.length ? row[idx] ?? '' : '');

    const taskList: Task[] = [];

    rowData.forEach(({ row, rowIndex }: { row: any[]; rowIndex: number }) => {
      const taskName = get(row, taskCol);
      if (!taskName) return;

      const dateRequested = get(row, dateRequestedCol);
      const dateAssigned = get(row, dateAssignedCol);
      const dueDate = get(row, dueDateCol);
      const dateCompleted = get(row, dateCompletedCol);
      const statusRaw = get(row, statusCol);

      const normalizedStatus = normalizeStatus(statusRaw, dateCompleted, dateAssigned, {
        rowIndex,
        taskName,
      });

      taskList.push({
        id: `task-${rowIndex}`,
        rowIndex,
        date_requested: dateRequested,
        tat: get(row, tatCol),
        segment: get(row, segmentCol),
        type: get(row, typeCol),
        task: taskName,
        brand: get(row, brandCol),
        date_assigned: dateAssigned,
        agent: get(row, agentCol),
        due_date: dueDate,
        date_completed: dateCompleted || null,
        remarks: get(row, remarksCol),
        auditor: get(row, auditorCol),
        status: normalizedStatus,
        bc_links: get(row, bcLinksCol),
        reason_for_pending: get(row, reasonPendingCol),
        reason_for_cancel: get(row, reasonCancelCol),
        isNew: false,
      });
    });

    return taskList;
  }, []);

  const sendDesktopNotification = useCallback(async (taskData: { task: string; agent: string; rowIndex: number }) => {
    try {
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📋 New Task Added!',
          body: `"${taskData.task}" assigned to ${taskData.agent || 'Unassigned'} (Row ${taskData.rowIndex})`,
          url: '/',
          taskId: `task-${taskData.rowIndex}`,
        }),
      });
    } catch (error) {
      console.error('❌ Failed to send desktop notification:', error);
    }
  }, []);

  const detectNewTasks = useCallback(
    (newTasks: Task[]) => {
      const newIds = new Set<string>();
      const currentIds = new Set(newTasks.map(t => t.id));

      newTasks.forEach(task => {
        if (!previousTaskIds.has(task.id)) {
          newIds.add(task.id);
          if (isNotificationEnabled) {
            sendDesktopNotification({ task: task.task, agent: task.agent, rowIndex: task.rowIndex });
          }
        }
      });

      if (newIds.size > 0 && previousTaskIds.size > 0) {
        setNewTaskIds(newIds);
        setShowNewTaskNotification(true);

        setAllTasks(prev => prev.map(t => ({ ...t, isNew: newIds.has(t.id) })));
        setTasks(prev => prev.map(t => ({ ...t, isNew: newIds.has(t.id) })));

        setTimeout(() => setShowNewTaskNotification(false), 10000);
      }

      setPreviousTaskIds(currentIds);
    },
    [previousTaskIds, isNotificationEnabled, sendDesktopNotification]
  );

  const loadTasksFromSheet = useCallback(async () => {
    if (!currentUserEmail && !currentUserName) {
      setTasks([]);
      setUpdateError('Please log in to view your tasks');
      return;
    }

    setUpdateError(null);

    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      let newTasks: Task[] = [];
      if (data.rows && data.rows.length > 0) {
        newTasks = processTasksFromSheet(data);
      } else if (data.values && data.values.length > 0) {
        newTasks = processTasksFromSheet(data.values);
      }

      setTasks(newTasks);
      detectNewTasks(newTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to load tasks');
      setTasks([]);
    }
  }, [currentUserEmail, currentUserName, processTasksFromSheet, detectNewTasks]);

  const loadAllTasksFromSheet = useCallback(async () => {
    if (!currentUserEmail && !currentUserName) return;

    setUpdateError(null);

    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
          viewAll: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const newTasks: Task[] = data.rows && data.rows.length > 0 ? processTasksFromSheet(data) : [];

      setAllTasks(newTasks);
      detectNewTasks(newTasks);
    } catch (error) {
      console.error('Failed to load all tasks:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to load all tasks');
      setAllTasks([]);
    }
  }, [currentUserEmail, currentUserName, processTasksFromSheet, detectNewTasks]);

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;

    if (initialTasks && initialTasks.length > 0) {
      let newTasks: Task[] = [];
      if (typeof initialTasks === 'object' && 'headers' in initialTasks && 'rows' in initialTasks) {
        newTasks = processTasksFromSheet(initialTasks as { headers: string[]; rows: any[] });
      } else {
        newTasks = processTasksFromSheet(initialTasks);
      }
      setTasks(newTasks);
      setAllTasks(newTasks);
      setPreviousTaskIds(new Set(newTasks.map(t => t.id)));
    } else {
      loadTasksFromSheet();
      if (viewMode === 'all') {
        loadAllTasksFromSheet();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTasks, processTasksFromSheet, loadTasksFromSheet, loadAllTasksFromSheet, viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'all') {
        loadAllTasksFromSheet();
      } else {
        loadTasksFromSheet();
      }
    }, 90000);
    return () => clearInterval(interval);
  }, [loadTasksFromSheet, loadAllTasksFromSheet, viewMode]);

  const refreshCurrentView = useCallback(() => {
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());

    if (viewMode === 'all') {
      loadAllTasksFromSheet();
    } else {
      loadTasksFromSheet();
    }
  }, [viewMode, loadAllTasksFromSheet, loadTasksFromSheet]);

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: string, reason?: string) => {
      if (updatingTaskId) return;

      if (newStatus.toLowerCase() === 'pending' && !reason) {
        setPendingTaskId(taskId);
        setShowPendingReasonModal(true);
        return;
      }

      setUpdatingTaskId(taskId);
      setUpdateError(null);

      const sourceList = viewMode === 'all' ? allTasks : tasks;
      const task = sourceList.find(t => t.id === taskId);
      if (!task) {
        setUpdatingTaskId(null);
        setUpdateError('Task not found');
        return;
      }

      const rowIndex = Number(task.rowIndex);
      if (isNaN(rowIndex) || rowIndex < 2) {
        setUpdateError(`Invalid row index: ${task.rowIndex}`);
        setUpdatingTaskId(null);
        return;
      }

      const previousTasks = [...tasks];
      const previousAllTasks = [...allTasks];
      const isCompletedOrCancelled = newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'cancelled';
      const isPending = newStatus.toLowerCase() === 'pending';

      const applyOptimisticUpdate = (list: Task[]) =>
        list.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                date_completed: isCompletedOrCancelled ? new Date().toLocaleDateString('en-US') : null,
                reason_for_pending: isPending ? reason || '' : '',
                reason_for_cancel: newStatus.toLowerCase() === 'cancelled' ? t.reason_for_cancel : '',
              }
            : t
        );

      setTasks(prev => applyOptimisticUpdate(prev));
      setAllTasks(prev => applyOptimisticUpdate(prev));

      if (showTaskModal) {
        setShowTaskModal(false);
        setSelectedTask(null);
      }

      try {
        const payload = {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          rowIndex,
          newStatus,
          taskName: task.task,
          agentEmail: task.agent || '',
          reasonForPending: isPending ? reason || '' : '',
        };

        const response = await fetch('/api/google-sheets/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { raw: responseText };
        }

        if (!response.ok) {
          throw new Error(data.error || data.raw || `HTTP error ${response.status}`);
        }

        setTimeout(() => refreshCurrentView(), 1500);
      } catch (error) {
        console.error('❌ Failed to update task status:', error);
        setUpdateError(error instanceof Error ? error.message : 'Failed to update task status');
        setTasks(previousTasks);
        setAllTasks(previousAllTasks);
      } finally {
        setUpdatingTaskId(null);
        setPendingTaskId(null);
      }
    },
    [tasks, allTasks, viewMode, showTaskModal, refreshCurrentView, updatingTaskId, SPREADSHEET_ID, SHEET_NAME]
  );

  const handlePendingConfirm = useCallback(
    async (reason: string) => {
      if (!pendingTaskId) return;
      setIsSubmittingPending(true);
      await updateTaskStatus(pendingTaskId, 'Pending', reason);
      setIsSubmittingPending(false);
      setShowPendingReasonModal(false);
      setPendingTaskId(null);
    },
    [pendingTaskId, updateTaskStatus]
  );

  const saveTaskEdits = useCallback(
    async (values: TaskFormValues) => {
      if (!selectedTask) return;
      setIsSavingTask(true);
      setTaskFormError(null);

      const finalBrand = values.brand === '__OTHER__' ? values.customBrand.trim() : values.brand;

      try {
        const response = await fetch('/api/google-sheets/update-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME,
            requesterEmail: currentUserEmail,
            rowIndex: selectedTask.rowIndex,
            updates: {
              dateRequested: values.dateRequested,
              type: values.type,
              task: values.task,
              brand: finalBrand,
              agent: values.agent,
              dueDate: values.dueDate,
              status: values.status,
              remarks: values.remarks,
              bcLinks: values.bcLinks,
            },
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`);
        }

        setShowEditTaskModal(false);
        setShowTaskModal(false);
        setSelectedTask(null);
        refreshCurrentView();
      } catch (error) {
        setTaskFormError(error instanceof Error ? error.message : 'Failed to save changes');
      } finally {
        setIsSavingTask(false);
      }
    },
    [selectedTask, currentUserEmail, refreshCurrentView, SPREADSHEET_ID, SHEET_NAME]
  );

  const addNewTask = useCallback(
    async (values: TaskFormValues) => {
      setIsSavingTask(true);
      setTaskFormError(null);

      const finalBrand = values.brand === '__OTHER__' ? values.customBrand.trim() : values.brand;

      try {
        const response = await fetch('/api/google-sheets/add-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME,
            requesterEmail: currentUserEmail,
            dateRequested: values.dateRequested,
            type: values.type,
            task: values.task,
            brand: finalBrand,
            agent: values.agent,
            dueDate: values.dueDate,
            status: values.status,
            remarks: values.remarks,
            bcLinks: values.bcLinks,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`);
        }

        setShowAddTaskModal(false);
        refreshCurrentView();
        if (viewMode === 'mine') {
          setViewMode('all');
          loadAllTasksFromSheet();
        }
      } catch (error) {
        setTaskFormError(error instanceof Error ? error.message : 'Failed to add task');
      } finally {
        setIsSavingTask(false);
      }
    },
    [currentUserEmail, refreshCurrentView, viewMode, loadAllTasksFromSheet, SPREADSHEET_ID, SHEET_NAME]
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('maintenance_mode')
          .eq('id', 1)
          .single();

        if (!settingsError && settingsData) {
          setSettings(settingsData);
        } else {
          const saved = localStorage.getItem('lot_admin_settings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setSettings({ maintenance_mode: parsed.maintenanceMode });
            } catch {
              setSettings({ maintenance_mode: false });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();

    const settingsChannel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings', filter: 'id=eq.1' }, payload => {
        setSettings(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const isMaintenanceMode = (): boolean => {
    if (settings) {
      return settings.maintenance_mode === true;
    }
    const saved = localStorage.getItem('lot_admin_settings');
    if (saved) {
      try {
        return JSON.parse(saved).maintenanceMode || false;
      } catch {
        return false;
      }
    }
    return false;
  };

  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % defaultTeamMembers.length);
      }, 3000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
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
    const getSparkline = (toolType: string) =>
      Array.from({ length: days }, (_, i) => {
        const dayStart = now - (days - 1 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        return runs.filter(r => r.tool_type === toolType && new Date(r.created_at).getTime() >= dayStart && new Date(r.created_at).getTime() < dayEnd).length;
      });
    return { sku: getSparkline('sku'), asin: getSparkline('asin'), basecamp: getSparkline('basecamp'), bulkAnalyzer: getSparkline('bulk-analyzer') };
  }, [runs]);

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

  const allUsers = useMemo(() => {
    const usersWithStats = defaultTeamMembers.map(member => {
      const stats = userStatsMap.get(member.email) || { totalRuns: 0, completedRuns: 0, lastRun: '' };
      return { ...member, totalRuns: stats.totalRuns, completedRuns: stats.completedRuns, lastRun: stats.lastRun };
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

  const maxRuns = allUsers.length > 0 ? Math.max(allUsers[0].totalRuns, 1) : 1;

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();

    const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
      completed: { bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100', text: isDark ? 'text-emerald-400' : 'text-emerald-700', dot: 'bg-emerald-400' },
      cancelled: { bg: isDark ? 'bg-red-500/20' : 'bg-red-100', text: isDark ? 'text-red-400' : 'text-red-700', dot: 'bg-red-400' },
      ongoing: { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', text: isDark ? 'text-blue-400' : 'text-blue-700', dot: 'bg-blue-400' },
      assigned: { bg: isDark ? 'bg-cyan-500/20' : 'bg-cyan-100', text: isDark ? 'text-cyan-400' : 'text-cyan-700', dot: 'bg-cyan-400' },
      pending: { bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100', text: isDark ? 'text-yellow-400' : 'text-yellow-700', dot: 'bg-yellow-400' },
      wip: { bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100', text: isDark ? 'text-indigo-400' : 'text-indigo-700', dot: 'bg-indigo-400' },
      'for audit': { bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100', text: isDark ? 'text-purple-400' : 'text-purple-700', dot: 'bg-purple-400' },
      'for investigation': { bg: isDark ? 'bg-orange-500/20' : 'bg-orange-100', text: isDark ? 'text-orange-400' : 'text-orange-700', dot: 'bg-orange-400' },
      hold: { bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100', text: isDark ? 'text-amber-400' : 'text-amber-700', dot: 'bg-amber-400' },
      'for correx': { bg: isDark ? 'bg-pink-500/20' : 'bg-pink-100', text: isDark ? 'text-pink-400' : 'text-pink-700', dot: 'bg-pink-400' },
    };

    return statusMap[statusLower] || { bg: isDark ? 'bg-slate-500/20' : 'bg-gray-100', text: isDark ? 'text-slate-400' : 'text-gray-700', dot: 'bg-slate-400' };
  };

  const getStatusOptions = (currentStatus: string) => VALID_TASK_STATUSES.filter(s => s.toLowerCase() !== currentStatus.toLowerCase());

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const newTaskCount = newTaskIds.size;

  if (isMaintenanceMode() && !isAdmin) {
    return (
      <div className={`flex min-h-[400px] flex-col items-center justify-center rounded-2xl border p-8 text-center sm:p-12 ${isDark ? 'border-slate-700/50 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
        <div className="mb-6 rounded-full bg-amber-500/20 p-4">
          <Wrench className="h-12 w-12 text-amber-400 sm:h-16 sm:w-16" />
        </div>
        <h2 className={`mb-2 text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Under Maintenance</h2>
        <p className={`mb-6 max-w-md text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          We're currently performing scheduled maintenance to improve your experience. The tools will be back online shortly.
        </p>
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <Clock className="h-4 w-4" />
          <span>Please check back later</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* New Task Notification Banner */}
      {showNewTaskNotification && newTaskCount > 0 && (
        <div
          className={`fixed left-4 right-4 top-4 z-50 w-auto animate-in slide-in-from-top-4 rounded-xl border p-4 shadow-2xl duration-300 motion-reduce:animate-none sm:left-auto sm:right-4 sm:w-full sm:max-w-sm ${
            isDark ? 'border-emerald-500/30 bg-slate-800' : 'border-emerald-300 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-500/20 p-2">
              <Bell className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${pageText}`}>
                {newTaskCount} New Task{newTaskCount > 1 ? 's' : ''} Added!
              </p>
              <p className={`text-xs ${mutedText}`}>Click refresh to see them in your list</p>
            </div>
            <button
              onClick={() => setShowNewTaskNotification(false)}
              className={`rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={refreshCurrentView}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              <RefreshCw className="h-3 w-3" /> Refresh Now
            </button>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-2rem)] min-h-0 w-full max-w-full flex-col overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full space-y-5 pb-6 sm:space-y-6">
          <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <h1 className={`break-words text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl ${pageText}`}>Dashboard</h1>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                  LIVE
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </span>
                )}
                {newTaskCount > 0 && (
                  <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 motion-reduce:animate-none">
                    <Bell className="h-3.5 w-3.5" />
                    {newTaskCount} New
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-sm ${mutedText}`}>Listing Operations · Real-time overview</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell
                theme={theme}
                userEmail={currentUserEmail}
                onPermissionChange={granted => setIsNotificationEnabled(granted)}
              />
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex-initial ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <RefreshCw className="h-4 w-4" />}
                <span>Refresh</span>
              </button>
            </div>
          </section>

          {errorMessage && (
            <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Dashboard error: {errorMessage}</span>
            </div>
          )}
          {updateError && (
            <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

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
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
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

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <section className={`flex flex-col overflow-hidden rounded-2xl border shadow-sm ${panelClass}`}>
              <div className={`flex-shrink-0 border-b px-5 py-3 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
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
              <div className="max-h-[320px] flex-1 overflow-y-auto sm:max-h-[400px]">
                {isLoading ? (
                  <PanelSkeleton isDark={isDark} rows={5} />
                ) : allUsers.length === 0 ? (
                  <EmptyState isDark={isDark} icon={<Users className="h-8 w-8" />} message="No user data available" />
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {allUsers.map((user, index) => {
                      const percentage = (user.totalRuns / maxRuns) * 100;
                      const userImage = getUserImage(user.email);
                      const isTopPerformer = index === 0;

                      return (
                        <div
                          key={user.email}
                          className={`group relative p-3 transition-all duration-200 ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'} ${
                            isTopPerformer ? (isDark ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : 'bg-gradient-to-r from-yellow-100/30 to-transparent') : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 flex-shrink-0">
                              {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                              {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                              {index === 2 && <Medal className="h-4 w-4 text-amber-600" />}
                              {index >= 3 && <span className={`text-xs font-bold ${mutedText}`}>{index + 1}</span>}
                            </div>

                            {userImage ? (
                              <div className="relative">
                                <div className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-emerald-500/30">
                                  <Image src={userImage} alt={user.name} width={32} height={32} className="h-full w-full object-cover" />
                                </div>
                                {isTopPerformer && (
                                  <div className="absolute -right-1 -top-1">
                                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-400 motion-reduce:animate-none" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                  isTopPerformer ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {user.name[0]?.toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className={`truncate text-sm font-semibold ${pageText}`}>{user.name}</p>
                                  {user.role === 'Team Manager' && (
                                    <span className={`hidden flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold sm:inline-flex ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <span className={`flex-shrink-0 text-sm font-bold tabular-nums ${isTopPerformer ? 'text-yellow-400' : 'text-emerald-400'}`}>{user.totalRuns}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
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
                                    className={`h-full rounded-full transition-all duration-700 motion-reduce:transition-none ${
                                      isTopPerformer ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-emerald-500'
                                    }`}
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

            <section className={`flex flex-col overflow-hidden rounded-2xl border shadow-sm ${panelClass}`}>
              <div className={`flex-shrink-0 border-b px-5 py-3 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
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
              <div className="max-h-[320px] flex-1 overflow-y-auto sm:max-h-[400px]">
                {isLoading ? (
                  <PanelSkeleton isDark={isDark} rows={5} />
                ) : recentRuns.length === 0 ? (
                  <EmptyState isDark={isDark} icon={<Flame className="h-8 w-8" />} message="No activity yet" />
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {recentRuns.map(run => (
                      <div key={run.id} className={`group flex items-center gap-3 px-4 py-2.5 transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                        <StatusDot status={run.status} />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${pageText}`}>{run.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className={`text-xs ${run.status === 'completed' ? 'text-emerald-400' : run.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>{run.status}</span>
                            <span className={`text-[10px] ${mutedText}`}>
                              {toolLabel[run.tool_type]} {run.total_count > 0 && `· ${run.total_count.toLocaleString()} items`}
                            </span>
                          </div>
                        </div>
                        <div className={`flex-shrink-0 text-[10px] ${mutedText}`}>{relativeTime(run.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={`flex flex-col overflow-hidden rounded-2xl border shadow-sm md:col-span-2 xl:col-span-1 ${panelClass}`}>
              <div className={`flex-shrink-0 border-b px-5 py-3 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                    className={`inline-flex transform items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                      isDark
                        ? 'border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 hover:from-purple-600/30 hover:to-pink-600/30'
                        : 'border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Member Roulette
                  </button>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                  {defaultTeamMembers.map((member, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 px-6 py-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="group relative">
                          <div className="h-24 w-24 overflow-hidden rounded-full shadow-xl ring-4 ring-emerald-500/30 transition-all duration-300 group-hover:ring-emerald-500 sm:h-28 sm:w-28">
                            <Image src={member.image} alt={member.name} width={112} height={112} className="h-full w-full object-cover" priority unoptimized />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md dark:border-slate-900">
                              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" />
                            </div>
                          </div>
                        </div>
                        <h3 className={`mt-3 text-base font-bold ${pageText}`}>{member.name}</h3>
                        <p className={`text-[10px] ${mutedText}`}>{member.role}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-1 pb-3">
                {defaultTeamMembers.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    aria-label={`Show team member ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      currentSlide === idx ? 'w-4 bg-emerald-500' : `w-1.5 ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`
                    }`}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── TASK DETAIL MODAL ─────────────────────────────────────────────────── */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center fade-in bg-black/70 p-3 backdrop-blur-sm duration-200 motion-reduce:animate-none sm:p-4">
          <div
            className={`relative max-h-[92vh] w-full max-w-2xl animate-in overflow-y-auto rounded-2xl border shadow-2xl zoom-in-95 duration-200 motion-reduce:animate-none ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
            }`}
          >
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b p-3 backdrop-blur-md sm:p-4 ${isDark ? 'border-slate-700 bg-slate-900/95' : 'border-gray-200 bg-white/95'}`}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex-shrink-0 rounded-lg bg-emerald-500/20 p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className={`truncate font-semibold ${pageText}`}>Task Details</h3>
                  <p className={`hidden text-xs sm:block ${mutedText}`}>View and manage task information</p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {isTaskAdmin && (
                  <button
                    onClick={() => {
                      setTaskFormError(null);
                      setShowEditTaskModal(true);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                <button onClick={closeTaskModal} className={`rounded-lg p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`} aria-label="Close">
                  <X className={`h-5 w-5 ${mutedText}`} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Row #</label>
                  <p className={`text-base font-semibold ${pageText}`}>{selectedTask.rowIndex}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Task</label>
                  <p className={`break-words text-base font-semibold ${pageText}`}>{selectedTask.task}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Brand</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.brand}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Type</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.type}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Segment</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.segment}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Agent</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.agent || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Date Requested</label>
                  <p className={`text-base ${pageText}`}>{formatDate(selectedTask.date_requested)}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Due Date</label>
                  <p className={`text-base ${pageText}`}>{formatDate(selectedTask.due_date)}</p>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Status</label>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedTask.status).bg} ${getStatusColor(selectedTask.status).text}`}>
                      <span className={`h-2 w-2 rounded-full ${getStatusColor(selectedTask.status).dot}`} />
                      <span>{selectedTask.status}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Auditor</label>
                  <p className={`text-base ${pageText}`}>{selectedTask.auditor || 'N/A'}</p>
                </div>
              </div>

              {selectedTask.remarks && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Remarks</label>
                  <p className={`mt-1 break-words text-sm ${pageText}`}>{selectedTask.remarks}</p>
                </div>
              )}

              {selectedTask.reason_for_pending && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Reason for Pending</label>
                  <div className={`mt-1 rounded-lg border p-3 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-yellow-300 bg-yellow-50'}`}>
                    <div className="flex items-start gap-2">
                      <Clock className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <p className={`break-words text-sm ${pageText}`}>{selectedTask.reason_for_pending}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.reason_for_cancel && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Reason for Cancel</label>
                  <p className={`mt-1 break-words text-sm ${pageText}`}>{selectedTask.reason_for_cancel}</p>
                </div>
              )}

              {selectedTask.date_completed && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Date Completed</label>
                  <p className={`mt-1 text-sm ${pageText}`}>{formatDate(selectedTask.date_completed)}</p>
                </div>
              )}

              {selectedTask.bc_links && (
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>BC Links</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedTask.bc_links.split(',').map((link, index) => {
                      const trimmedLink = link.trim();
                      if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
                        return (
                          <a
                            key={index}
                            href={trimmedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-sm text-blue-400 underline-offset-2 transition-colors hover:underline ${isDark ? 'hover:text-blue-300' : 'hover:text-blue-600'}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Basecamp Link {index + 1}
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        );
                      }
                      return (
                        <span key={index} className={`text-sm ${mutedText}`}>
                          {trimmedLink}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`sticky bottom-0 flex flex-col-reverse gap-3 border-t p-3 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4 ${
                isDark ? 'border-slate-700 bg-slate-900/95' : 'border-gray-200 bg-white/95'
              }`}
            >
              <button
                onClick={closeTaskModal}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Close
              </button>
              <div className="flex flex-wrap gap-2">
                {getStatusOptions(selectedTask.status).map(newStatus => (
                  <button
                    key={newStatus}
                    onClick={() => updateTaskStatus(selectedTask.id, newStatus)}
                    disabled={updatingTaskId === selectedTask.id}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:px-4 sm:text-sm ${
                      updatingTaskId === selectedTask.id
                        ? 'cursor-not-allowed opacity-50'
                        : newStatus === 'Completed'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : newStatus === 'Cancelled'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : newStatus === 'Ongoing'
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {updatingTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : `Mark as ${newStatus}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD TASK MODAL ─────────────────────────────────────────────────── */}
      <TaskFormModal isOpen={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} onSubmit={addNewTask} isSubmitting={isSavingTask} theme={theme} mode="add" error={taskFormError} />

      {/* ─── EDIT TASK MODAL (admins only) ─────────────────────────────────── */}
      <TaskFormModal
        isOpen={showEditTaskModal}
        onClose={() => setShowEditTaskModal(false)}
        onSubmit={saveTaskEdits}
        isSubmitting={isSavingTask}
        theme={theme}
        mode="edit"
        error={taskFormError}
        initialValues={
          selectedTask
            ? {
                dateRequested: selectedTask.date_requested ? new Date(selectedTask.date_requested).toISOString().split('T')[0] : '',
                type: selectedTask.type,
                task: selectedTask.task,
                brand: BRAND_OPTIONS.includes(selectedTask.brand) ? selectedTask.brand : '__OTHER__',
                customBrand: BRAND_OPTIONS.includes(selectedTask.brand) ? '' : selectedTask.brand,
                agent: selectedTask.agent,
                dueDate: selectedTask.due_date ? new Date(selectedTask.due_date).toISOString().split('T')[0] : '',
                status: selectedTask.status,
                remarks: selectedTask.remarks,
                bcLinks: selectedTask.bc_links || '',
              }
            : undefined
        }
      />

      {/* ─── TASK NAME GENERATOR MODAL ────────────────────────────────────── */}
      <TaskNameGeneratorModal isOpen={showTaskGenerator} onClose={() => setShowTaskGenerator(false)} task={selectedTaskForGenerator} theme={theme} />

      {/* ─── REASON FOR PENDING MODAL ────────────────────────────────────── */}
      {showPendingReasonModal && pendingTaskId && (
        <ReasonForPendingModal
          isOpen={showPendingReasonModal}
          onClose={() => {
            setShowPendingReasonModal(false);
            setPendingTaskId(null);
          }}
          onConfirm={handlePendingConfirm}
          task={tasks.find(t => t.id === pendingTaskId) || allTasks.find(t => t.id === pendingTaskId) || null}
          theme={theme}
          isSubmitting={isSubmittingPending}
        />
      )}

      <MemberRouletteModal isOpen={isRouletteOpen} onClose={() => setIsRouletteOpen(false)} theme={theme} />
    </>
  );
}

// ─── Small presentational helpers ──────────────────────────────────────────

function EmptyState({ isDark, icon, message }: { isDark: boolean; icon: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
      <div className={isDark ? 'text-slate-700' : 'text-gray-300'}>{icon}</div>
      <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{message}</div>
    </div>
  );
}

function PanelSkeleton({ isDark, rows = 4 }: { isDark: boolean; rows?: number }) {
  return (
    <div className="space-y-0 divide-y divide-slate-700/30 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className={`h-8 w-8 flex-shrink-0 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
          <div className="flex-1 space-y-1.5">
            <div className={`h-3 w-1/3 rounded ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
            <div className={`h-2.5 w-1/2 rounded ${isDark ? 'bg-slate-800/70' : 'bg-gray-100'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ToolCard Component (defined OUTSIDE DashboardClient) ─────────────────────

function ToolCard({ tool, theme, runCount, sparkline, onOpen }: any) {
  const isDark = theme === 'dark';
  const animCount = useAnimatedCounter(runCount);

  const getAccentConfig = () => {
    if (tool.accent === 'purple') {
      return {
        card: isDark ? 'border-violet-500/25 bg-violet-950/40 hover:bg-violet-900/40' : 'border-violet-200 bg-violet-50 hover:bg-violet-100',
        spark: '#8b5cf6',
        count: 'text-violet-400',
      };
    } else if (tool.accent === 'green') {
      return {
        card: isDark ? 'border-emerald-500/25 bg-emerald-950/40 hover:bg-emerald-900/40' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
        spark: '#10b981',
        count: 'text-emerald-400',
      };
    } else if (tool.accent === 'orange') {
      return {
        card: isDark ? 'border-orange-500/25 bg-orange-950/40 hover:bg-orange-900/40' : 'border-orange-200 bg-orange-50 hover:bg-orange-100',
        spark: '#f97316',
        count: 'text-orange-400',
      };
    }
    return {
      card: isDark ? 'border-cyan-500/25 bg-cyan-950/40 hover:bg-cyan-900/40' : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100',
      spark: '#06b6d4',
      count: 'text-cyan-400',
    };
  };

  const accentConfig = getAccentConfig();
  const statusBadge = tool.status === 'Active' ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <button
      onClick={onOpen}
      className={`group relative flex min-h-[170px] w-full flex-col rounded-xl border p-3 text-left shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:min-h-[180px] ${accentConfig.card}`}
    >
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
          <div className="rounded-full bg-black/40 p-1 text-white transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </button>
  );
}