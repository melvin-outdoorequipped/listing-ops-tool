// components/dashboard/TaskManagement.tsx

'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table,
  X,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Task, TaskViewMode, getStatusColor, formatDate } from '../components/dashboard-utils';
import { VALID_TASK_STATUSES, isTaskAdminEmail, AGENT_OPTIONS, BRAND_OPTIONS, TYPE_OPTIONS, TASK_OPTIONS } from '../../lib/task-option';

interface TaskManagementProps {
  theme: 'light' | 'dark';
  currentUserEmail: string;
  currentUserName?: string;
}

// Move constants outside component
const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
const SHEET_NAME = 'Copy of Task Masterlist - Operations';

// ─── REASON FOR PENDING MODAL ─────────────────────────────────────────────

interface ReasonForPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  task: Task | null;
  theme: 'light' | 'dark';
  isSubmitting: boolean;
}

function ReasonForPendingModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  task, 
  theme, 
  isSubmitting 
}: ReasonForPendingModalProps) {
  const [reason, setReason] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200`}>
        <div className={`flex items-center justify-between border-b p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reason for Pending</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {task.task} · {task.brand}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
          >
            <X className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={`mb-2 block text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Why is this task being set to Pending?
            </label>
            <textarea
              className={`w-full rounded-lg border px-4 py-3 text-base ${
                isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              rows={4}
              placeholder="Enter the reason for pending status..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className={`border-t p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`rounded-lg px-5 py-2.5 text-base font-medium transition-all ${
              isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={isSubmitting || !reason.trim()}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all ${
              isSubmitting || !reason.trim()
                ? 'opacity-50 cursor-not-allowed bg-yellow-600'
                : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
            Set to Pending
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TASK FORM MODAL ─────────────────────────────────────────────────────

interface TaskFormValues {
  dateRequested: string;
  type: string;
  task: string;
  brand: string;
  customBrand: string;
  agent: string;
  dueDate: string;
  status: string;
  remarks: string;
  bcLinks: string;
}

const emptyTaskForm: TaskFormValues = {
  dateRequested: new Date().toISOString().split('T')[0],
  type: '',
  task: '',
  brand: '',
  customBrand: '',
  agent: '',
  dueDate: '',
  status: 'Pending',
  remarks: '',
  bcLinks: '',
};

function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  theme,
  mode,
  initialValues,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  isSubmitting: boolean;
  theme: 'light' | 'dark';
  mode: 'add' | 'edit';
  initialValues?: Partial<TaskFormValues>;
  error: string | null;
}) {
  const isDark = theme === 'dark';
  const [form, setForm] = useState<TaskFormValues>({ ...emptyTaskForm, ...initialValues });

  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyTaskForm, ...initialValues });
    }
  }, [isOpen, initialValues]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputClass = `w-full rounded-lg border px-4 py-3 text-base ${
    isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;
  const labelClass = `mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`;

  const usingCustomBrand = form.brand === '__OTHER__';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between border-b p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              {mode === 'add' ? <Plus className={`h-6 w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> : <Edit2 className={`h-6 w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />}
            </div>
            <div>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mode === 'add' ? 'Add New Task' : 'Edit Task'}
              </h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {mode === 'add'
                  ? 'This will be added as a new row in the tracker'
                  : 'Only admins can edit tasks assigned to others'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className={`rounded-lg border px-4 py-3 text-base ${isDark ? 'border-red-500/30 bg-red-600/10 text-red-400' : 'border-red-300 bg-red-100 text-red-700'}`}>
              {error}
            </div>
          )}

          <div className={`rounded-lg border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            <Info className="inline h-4 w-4 mr-2 -mt-0.5" />
            Segment is auto-filled by the sheet's formula and can't be set here.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date Requested</label>
              <input type="date" className={inputClass} value={form.dateRequested} onChange={(e) => setForm({ ...form, dateRequested: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">Select type...</option>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task *</label>
              <select className={inputClass} value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })}>
                <option value="">Select task...</option>
                {TASK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Brand *</label>
              <select className={inputClass} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                <option value="">Select brand...</option>
                {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value="__OTHER__">Other (type below)</option>
              </select>
              {usingCustomBrand && (
                <input
                  type="text"
                  className={`${inputClass} mt-2`}
                  placeholder="Enter new brand name"
                  value={form.customBrand}
                  onChange={(e) => setForm({ ...form, customBrand: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Agent *</label>
              <select className={inputClass} value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })}>
                <option value="">Select agent...</option>
                {AGENT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {VALID_TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>BC Links</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Enter Basecamp links (comma separated)"
              value={form.bcLinks}
              onChange={(e) => setForm({ ...form, bcLinks: e.target.value })}
            />
            <p className={`text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Separate multiple links with commas
            </p>
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <textarea className={inputClass} rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
        </div>

        <div className={`border-t p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-end gap-3`}>
          <button onClick={onClose} className={`rounded-lg px-5 py-2.5 text-base font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={isSubmitting || !form.task || !form.agent || (!form.brand || (usingCustomBrand && !form.customBrand.trim()))}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all ${
              isSubmitting ? 'opacity-50 cursor-not-allowed bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {mode === 'add' ? 'Add Task' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

export default function TaskManagement({ theme, currentUserEmail, currentUserName = '' }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<TaskViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'rowIndex' | 'dueDate' | 'status' | 'brand' | 'agent' | 'dateRequested'>('rowIndex');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTaskForGenerator, setSelectedTaskForGenerator] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [previousTaskIds, setPreviousTaskIds] = useState<Set<string>>(new Set());
  const [showNewTaskNotification, setShowNewTaskNotification] = useState(false);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'overdue' | 'unassigned' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  
  // Reason for Pending states
  const [showPendingReasonModal, setShowPendingReasonModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);
  const [pendingStatusTarget, setPendingStatusTarget] = useState<string>('Pending');

  // Refs
  const initialLoadDone = useRef(false);
  const isLoadingRef = useRef(false);

  const isDark = theme === 'dark';
  const isTaskAdmin = isTaskAdminEmail(currentUserEmail);

  // ─── PROCESS TASKS FROM SHEET ──────────────────────────────────────────

  const processTasksFromSheet = useCallback((sheetData: any): Task[] => {
    let headers: string[];
    let rowData: { row: any[], rowIndex: number }[];

    if (sheetData && typeof sheetData === 'object' && sheetData.headers && sheetData.rows) {
      headers = sheetData.headers;
      rowData = sheetData.rows;
    } else if (Array.isArray(sheetData) && sheetData.length > 0) {
      headers = sheetData[0] || [];
      const rows = sheetData.slice(1) || [];
      rowData = rows.map((row, index) => ({
        row,
        rowIndex: index + 2
      }));
    } else {
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
      return [];
    }

    const get = (row: any[], idx: number | undefined) =>
      idx !== undefined && idx < row.length ? (row[idx] ?? '') : '';

    const taskList: Task[] = [];

    rowData.forEach(({ row, rowIndex }: { row: any[], rowIndex: number }) => {
      const taskName = get(row, taskCol);
      if (!taskName || taskName.toString().trim() === '') {
        return;
      }

      taskList.push({
        id: `task-${rowIndex}`,
        rowIndex: rowIndex,
        date_requested: get(row, dateRequestedCol).toString(),
        tat: get(row, tatCol).toString(),
        segment: get(row, segmentCol).toString(),
        type: get(row, typeCol).toString(),
        task: taskName.toString(),
        brand: get(row, brandCol).toString(),
        date_assigned: get(row, dateRequestedCol).toString(),
        agent: get(row, agentCol).toString(),
        due_date: get(row, dueDateCol).toString(),
        date_completed: get(row, dateCompletedCol).toString() || null,
        remarks: get(row, remarksCol).toString(),
        auditor: get(row, auditorCol).toString(),
        status: get(row, statusCol).toString() || 'Pending',
        bc_links: get(row, bcLinksCol).toString(),
        reason_for_pending: get(row, reasonPendingCol).toString(),
        reason_for_cancel: get(row, reasonCancelCol).toString(),
        isNew: false,
      });
    });

    return taskList;
  }, []);

  // ─── LOAD TASKS ────────────────────────────────────────────────────────

  const loadTasksFromSheet = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    if (!currentUserEmail) {
      setTasks([]);
      setIsLoading(false);
      setUpdateError('Please log in to view your tasks');
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setUpdateError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          userEmail: currentUserEmail || '',
          viewAll: viewMode === 'all',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      
      if (viewMode === 'all') {
        setAllTasks(newTasks);
      } else {
        setTasks(newTasks);
      }
      
      // Detect new tasks
      const newIds = new Set<string>();
      const currentIds = new Set(newTasks.map(t => t.id));
      
      newTasks.forEach(task => {
        if (!previousTaskIds.has(task.id)) {
          newIds.add(task.id);
        }
      });
      
      if (newIds.size > 0 && previousTaskIds.size > 0) {
        setNewTaskIds(newIds);
        setShowNewTaskNotification(true);
        setAllTasks(prev => prev.map(t => ({
          ...t,
          isNew: newIds.has(t.id)
        })));
        setTasks(prev => prev.map(t => ({
          ...t,
          isNew: newIds.has(t.id)
        })));
        
        setTimeout(() => {
          setShowNewTaskNotification(false);
        }, 10000);
      }
      
      setPreviousTaskIds(currentIds);
      
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      if (error.name === 'AbortError') {
        setUpdateError('Request timed out. Please try again.');
      } else {
        setUpdateError(error instanceof Error ? error.message : 'Failed to load tasks');
      }
      if (viewMode === 'all') {
        setAllTasks([]);
      } else {
        setTasks([]);
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentUserEmail, viewMode, processTasksFromSheet, previousTaskIds]);

  // ─── LOAD ON MOUNT ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadTasksFromSheet();
    }
  }, []);

  // ─── AUTO-REFRESH ──────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      loadTasksFromSheet();
    }, 90000);
    return () => clearInterval(interval);
  }, [loadTasksFromSheet]);

  // ─── REFRESH ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());
    loadTasksFromSheet();
  }, [loadTasksFromSheet]);

  // ─── TOGGLE VIEW MODE ──────────────────────────────────────────────────

  const onViewModeChange = useCallback((mode: 'mine' | 'all') => {
    setFilterStatus('all');
    setFilterBrand('all');
    setFilterAgent('all');
    setFilterDateRange('all');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setViewMode(mode);
    setShowNewTaskNotification(false);
    setNewTaskIds(new Set());
    setShowOnlyNew(false);
  }, []);

  // ─── UPDATE STATUS ────────────────────────────────────────────────────

  const onUpdateStatus = useCallback(async (taskId: string, newStatus: string, reason?: string) => {
    if (updatingTaskId) return;

    if (newStatus.toLowerCase() === 'pending' && !reason) {
      setPendingTaskId(taskId);
      setPendingStatusTarget(newStatus);
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

    const isPending = newStatus.toLowerCase() === 'pending';
    const isCompletedOrCancelled = newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'cancelled';

    const applyOptimisticUpdate = (list: Task[]) =>
      list.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              date_completed: isCompletedOrCancelled
                ? new Date().toLocaleDateString('en-US')
                : null,
              reason_for_pending: isPending ? (reason || '') : '',
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
        rowIndex: rowIndex,
        newStatus: newStatus,
        taskName: task.task,
        agentEmail: task.agent || '',
        reasonForPending: isPending ? (reason || '') : '',
      };

      const response = await fetch('/api/google-sheets/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setTimeout(() => {
        loadTasksFromSheet();
      }, 1500);

    } catch (error) {
      console.error('Failed to update task status:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update task status');
      loadTasksFromSheet();
    } finally {
      setUpdatingTaskId(null);
      setPendingTaskId(null);
      setPendingStatusTarget('Pending');
    }
  }, [tasks, allTasks, viewMode, showTaskModal, updatingTaskId, loadTasksFromSheet]);

  // ─── HANDLE PENDING CONFIRM ───────────────────────────────────────────

  const handlePendingConfirm = useCallback(async (reason: string) => {
    if (!pendingTaskId) return;
    setIsSubmittingPending(true);
    await onUpdateStatus(pendingTaskId, pendingStatusTarget, reason);
    setIsSubmittingPending(false);
    setShowPendingReasonModal(false);
    setPendingTaskId(null);
    setPendingStatusTarget('Pending');
  }, [pendingTaskId, pendingStatusTarget, onUpdateStatus]);

  // ─── EDIT TASK ─────────────────────────────────────────────────────────

  const onEditTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setTaskFormError(null);
    setShowEditTaskModal(true);
  }, []);

  // ─── ADD TASK ──────────────────────────────────────────────────────────

  const onAddTask = useCallback(() => {
    setTaskFormError(null);
    setShowAddTaskModal(true);
  }, []);

  // ─── TASK CLICK ────────────────────────────────────────────────────────

  const onTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }, []);

  // ─── MARK ALL VIEWED ──────────────────────────────────────────────────

  const onMarkAllViewed = useCallback(() => {
    setNewTaskIds(new Set());
    setShowNewTaskNotification(false);
    setShowOnlyNew(false);
    setAllTasks(prev => prev.map(t => ({ ...t, isNew: false })));
    setTasks(prev => prev.map(t => ({ ...t, isNew: false })));
  }, []);

  // ─── OPEN GENERATOR ────────────────────────────────────────────────────

  const onOpenGenerator = useCallback((task: Task) => {
    setSelectedTaskForGenerator(task);
    setShowGenerator(true);
  }, []);

  // ─── CLEAR CUSTOM DATE RANGE ──────────────────────────────────────────

  const clearCustomDateRange = useCallback(() => {
    setCustomDateStart('');
    setCustomDateEnd('');
    setFilterDateRange('all');
    setCurrentPage(1);
    setShowDateRangePicker(false);
  }, []);

  // ─── APPLY CUSTOM DATE RANGE ──────────────────────────────────────────

  const applyCustomDateRange = useCallback(() => {
    if (customDateStart && customDateEnd) {
      setFilterDateRange('custom');
      setCurrentPage(1);
      setShowDateRangePicker(false);
    }
  }, [customDateStart, customDateEnd]);

  // ─── SAVE TASK EDITS ──────────────────────────────────────────────────

  const saveTaskEdits = useCallback(async (values: TaskFormValues) => {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      setShowEditTaskModal(false);
      setShowTaskModal(false);
      setSelectedTask(null);
      loadTasksFromSheet();
    } catch (error) {
      setTaskFormError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSavingTask(false);
    }
  }, [selectedTask, currentUserEmail, loadTasksFromSheet]);

  // ─── ADD NEW TASK ──────────────────────────────────────────────────────

  const addNewTask = useCallback(async (values: TaskFormValues) => {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      setShowAddTaskModal(false);
      loadTasksFromSheet();
    } catch (error) {
      setTaskFormError(error instanceof Error ? error.message : 'Failed to add task');
    } finally {
      setIsSavingTask(false);
    }
  }, [currentUserEmail, loadTasksFromSheet]);

  // ─── GET STATUS OPTIONS ───────────────────────────────────────────────

  const getStatusOptions = useCallback((currentStatus: string) => {
    return VALID_TASK_STATUSES.filter(
      (s) => s.toLowerCase() !== currentStatus.toLowerCase()
    );
  }, []);

  // ─── ACTIVE TASKS ─────────────────────────────────────────────────────

  const activeTasks = viewMode === 'all' ? allTasks : tasks;

  // ─── UNIQUE BRANDS & AGENTS ──────────────────────────────────────────

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    activeTasks.forEach(task => {
      if (task.brand) brands.add(task.brand);
    });
    return Array.from(brands).sort();
  }, [activeTasks]);

  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    activeTasks.forEach(task => {
      if (task.agent) agents.add(task.agent);
    });
    return Array.from(agents).sort();
  }, [activeTasks]);

  // ─── TASK COUNTS ──────────────────────────────────────────────────────

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeTasks.length };
    activeTasks.forEach(task => {
      const status = task.status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [activeTasks]);

  // ─── FILTERED AND SORTED TASKS ───────────────────────────────────────

  const filteredAndSortedTasks = useMemo(() => {
    if (activeTasks.length === 0) return [];
    
    let filtered = activeTasks;

    if (showOnlyNew) {
      filtered = filtered.filter(task => newTaskIds.has(task.id));
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    if (filterBrand !== 'all') {
      filtered = filtered.filter(task => task.brand === filterBrand);
    }
    
    if (filterAgent !== 'all') {
      filtered = filtered.filter(task => task.agent === filterAgent);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filterDateRange !== 'all') {
      filtered = filtered.filter(task => {
        if (filterDateRange === 'unassigned') {
          return !task.agent || task.agent.trim() === '';
        }
        
        const dueDateStr = task.due_date;
        if (!dueDateStr) return false;
        
        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) return false;
        
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        if (filterDateRange === 'overdue') {
          return dueDateOnly < today && task.status !== 'Completed' && task.status !== 'Cancelled';
        }
        
        if (filterDateRange === 'today') {
          return dueDateOnly.getTime() === today.getTime();
        }
        
        if (filterDateRange === 'week') {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return dueDateOnly >= today && dueDateOnly <= weekEnd;
        }
        
        if (filterDateRange === 'month') {
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return dueDateOnly >= today && dueDateOnly <= monthEnd;
        }
        
        if (filterDateRange === 'custom') {
          const startDate = customDateStart ? new Date(customDateStart) : null;
          const endDate = customDateEnd ? new Date(customDateEnd) : null;
          
          if (startDate) {
            const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (dueDateOnly < startOnly) return false;
          }
          if (endDate) {
            const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            if (dueDateOnly > endOnly) return false;
          }
          return true;
        }
        
        return true;
      });
    }
    
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(task => {
        if (task.task.toLowerCase().includes(term)) return true;
        if (task.brand.toLowerCase().includes(term)) return true;
        if (task.status.toLowerCase().includes(term)) return true;
        if (task.type.toLowerCase().includes(term)) return true;
        if (task.segment.toLowerCase().includes(term)) return true;
        if (task.bc_links.toLowerCase().includes(term)) return true;
        if (task.agent.toLowerCase().includes(term)) return true;
        if (task.auditor.toLowerCase().includes(term)) return true;
        if (task.remarks.toLowerCase().includes(term)) return true;
        if (task.reason_for_pending.toLowerCase().includes(term)) return true;
        if (task.reason_for_cancel.toLowerCase().includes(term)) return true;
        
        if (task.due_date) {
          try {
            const dueDate = new Date(task.due_date);
            if (!isNaN(dueDate.getTime())) {
              const dateFormats = [
                task.due_date.toLowerCase(),
                dueDate.toLocaleDateString('en-US').toLowerCase(),
                dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase(),
                dueDate.toISOString().split('T')[0],
                `${dueDate.getMonth() + 1}/${dueDate.getDate()}/${dueDate.getFullYear()}`,
                `${dueDate.getMonth() + 1}/${dueDate.getDate()}`,
              ];
              
              for (const format of dateFormats) {
                if (format.includes(term)) return true;
              }
            }
          } catch (e) {
            // Skip
          }
        }
        
        return false;
      });
    }
    
    if (filtered.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        
        switch (sortField) {
          case 'rowIndex':
            aVal = a.rowIndex || 0;
            bVal = b.rowIndex || 0;
            break;
          case 'dueDate':
            aVal = a.due_date || '';
            bVal = b.due_date || '';
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'brand':
            aVal = a.brand;
            bVal = b.brand;
            break;
          case 'agent':
            aVal = a.agent;
            bVal = b.agent;
            break;
          case 'dateRequested':
            aVal = a.date_requested || '';
            bVal = b.date_requested || '';
            break;
          default:
            aVal = a.task;
            bVal = b.task;
        }
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [activeTasks, debouncedSearchTerm, filterStatus, filterBrand, filterAgent, sortField, sortOrder, filterDateRange, customDateStart, customDateEnd, showOnlyNew, newTaskIds]);

  // ─── PAGINATION ────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  // ─── RESET PAGE ON FILTER CHANGE ─────────────────────────────────────

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterBrand, filterAgent, searchTerm, viewMode, filterDateRange, showOnlyNew]);

  // ─── DEBOUNCE SEARCH ──────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── TOGGLE SORT ──────────────────────────────────────────────────────

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // ─── CLEAR FILTERS ────────────────────────────────────────────────────

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterBrand('all');
    setFilterAgent('all');
    setFilterDateRange('all');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setShowOnlyNew(false);
    setCustomDateStart('');
    setCustomDateEnd('');
  };

  // ─── HANDLE OPEN GENERATOR ────────────────────────────────────────────

  const handleOpenGenerator = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskForGenerator(task);
    setShowGenerator(true);
  };

  // ─── GO TO PAGE ───────────────────────────────────────────────────────

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  // ─── RENDER FUNCTIONS ─────────────────────────────────────────────────

  const renderTasks = () => {
    if (paginatedTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className={`h-16 w-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={`mt-4 text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {showOnlyNew && newTaskIds.size === 0 
              ? 'All caught up! You\'ve viewed all new tasks.'
              : 'No tasks found'}
          </p>
          <p className={`mt-2 text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {debouncedSearchTerm || filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all' || filterDateRange !== 'all'
              ? 'Try adjusting your filters'
              : 'You have no tasks assigned yet'}
          </p>
          {(filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all' || filterDateRange !== 'all' || searchTerm || showOnlyNew) && (
            <button
              onClick={clearFilters}
              className={`mt-4 rounded-lg px-5 py-2.5 text-base font-medium transition-all ${
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clear All Filters
            </button>
          )}
        </div>
      );
    }

    switch (layoutMode) {
      case 'card':
        return renderCardView();
      case 'list':
        return renderListView();
      case 'table':
      default:
        return renderTableView();
    }
  };

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
        <thead className={`sticky top-0 z-10 backdrop-blur ${isDark ? 'bg-slate-800/95' : 'bg-gray-50/95'}`}>
          <tr>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <button onClick={() => toggleSort('rowIndex')} className="flex items-center gap-1.5 hover:text-emerald-400">
                # <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <button onClick={() => toggleSort('dateRequested')} className="flex items-center gap-1.5 hover:text-emerald-400">
                Date <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <button onClick={() => toggleSort('brand')} className="flex items-center gap-1.5 hover:text-emerald-400">
                Brand <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Task
            </th>
            {viewMode === 'all' && (
              <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <button onClick={() => toggleSort('agent')} className="flex items-center gap-1.5 hover:text-emerald-400">
                  Agent <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
            )}
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <button onClick={() => toggleSort('dueDate')} className="flex items-center gap-1.5 hover:text-emerald-400">
                Due Date <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 hover:text-emerald-400">
                Status <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Remarks
            </th>
            <th className={`px-4 py-4 text-left text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-200'}`}>
          {paginatedTasks.map((task) => {
            const statusColor = getStatusColor(task.status);
            const isUpdating = updatingTaskId === task.id;
            const isNew = newTaskIds.has(task.id);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
            const hasRemarks = task.remarks && task.remarks.trim() !== '';
            const statusOptions = getStatusOptions(task.status);
            
            return (
              <tr
                key={task.id}
                className={`cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
                } ${isNew ? (isDark ? 'bg-emerald-500/5 border-l-2 border-emerald-400' : 'bg-emerald-50/50 border-l-2 border-emerald-500') : ''}`}
                onClick={() => onTaskClick(task)}
              >
                <td className={`px-4 py-4 text-base font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {task.rowIndex}
                  {isNew && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>NEW</span>
                    </span>
                  )}
                </td>
                <td className={`px-4 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatDate(task.date_requested)}
                </td>
                <td className={`px-4 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {task.brand}
                </td>
                <td className={`px-4 py-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <div className="flex items-center gap-3">
                    <span className="truncate max-w-[250px]">{task.task}</span>
                    <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {task.type}
                    </span>
                  </div>
                </td>
                {viewMode === 'all' && (
                  <td className={`px-4 py-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {task.agent || 'Unassigned'}
                  </td>
                )}
                <td className={`px-4 py-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    {formatDate(task.due_date)}
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-sm font-semibold text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${statusColor.bg} ${statusColor.text}`}>
                    <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
                    {task.status}
                    {task.status === 'Pending' && task.reason_for_pending && (
                      <span className="ml-1 text-xs opacity-70">(pending reason)</span>
                    )}
                  </span>
                </td>
                <td className={`px-4 py-4 max-w-[200px] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {hasRemarks ? (
                    <div className="relative group">
                      <div className="flex items-start gap-2">
                        {task.remarks.toLowerCase().includes('sbs') && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-semibold text-yellow-400 flex-shrink-0">
                            <Eye className="h-3.5 w-3.5" />
                            SBS
                          </span>
                        )}
                        <span className="text-sm line-clamp-2 break-words">
                          {task.remarks}
                        </span>
                      </div>
                      {task.remarks.length > 60 && (
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20">
                          <div className={`rounded-lg border p-3 text-sm max-w-xs shadow-lg ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                            {task.remarks}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'} italic`}>No remarks</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenGenerator(task, e)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title="Generate Task Name"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </button>
                    {statusOptions.slice(0, 2).map((newStatus) => (
                      <button
                        key={newStatus}
                        onClick={() => onUpdateStatus(task.id, newStatus)}
                        disabled={isUpdating}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                          isUpdating ? 'opacity-50 cursor-not-allowed' :
                          newStatus === 'Completed' ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200') :
                          newStatus === 'Cancelled' ? (isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200') :
                          newStatus === 'Ongoing' ? (isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200') :
                          isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : newStatus}
                      </button>
                    ))}
                    {statusOptions.length > 2 && (
                      <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>+{statusOptions.length - 2}</span>
                    )}
                    {isTaskAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                        className={`rounded-lg p-1.5 transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}
                        title="Edit Task"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {paginatedTasks.map((task) => {
        const statusColor = getStatusColor(task.status);
        const isNew = newTaskIds.has(task.id);
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
        const hasRemarks = task.remarks && task.remarks.trim() !== '';
        const statusOptions = getStatusOptions(task.status);
        const isUpdating = updatingTaskId === task.id;
        
        return (
          <div
            key={task.id}
            className={`rounded-xl border p-5 cursor-pointer transition-all hover:shadow-lg ${
              isDark ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'
            } ${isNew ? (isDark ? 'border-emerald-500/50' : 'border-emerald-400') : ''}`}
            onClick={() => onTaskClick(task)}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    #{task.rowIndex}
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {task.brand}
                  </span>
                  {isNew && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      NEW
                    </span>
                  )}
                </div>
                <h3 className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {task.task}
                </h3>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} />
                {task.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <User className="h-4 w-4" />
                <span>{task.agent || 'Unassigned'}</span>
              </div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(task.due_date)}</span>
                {isOverdue && (
                  <span className="text-red-400 text-xs font-medium">(Overdue)</span>
                )}
              </div>
              {hasRemarks && (
                <div className={`flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'} truncate`}>
                  <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="truncate">{task.remarks}</span>
                  {task.remarks.toLowerCase().includes('sbs') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400 flex-shrink-0">
                      <Eye className="h-3 w-3" />
                      SBS
                    </span>
                  )}
                </div>
              )}
              {task.status === 'Pending' && task.reason_for_pending && (
                <div className={`flex items-start gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'} text-xs`}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="truncate">Reason: {task.reason_for_pending}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={(e) => handleOpenGenerator(task, e)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                    isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  title="Generate Task Name"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate
                </button>
                {statusOptions.slice(0, 1).map((newStatus) => (
                  <button
                    key={newStatus}
                    onClick={() => onUpdateStatus(task.id, newStatus)}
                    disabled={isUpdating}
                    className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                      isUpdating ? 'opacity-50 cursor-not-allowed' :
                      newStatus === 'Completed' ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200') :
                      newStatus === 'Cancelled' ? (isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200') :
                      newStatus === 'Ongoing' ? (isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200') :
                      isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : newStatus}
                  </button>
                ))}
                {statusOptions.length > 1 && (
                  <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>+{statusOptions.length - 1}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isTaskAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    className={`rounded-lg p-1.5 transition-all ${
                      isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                    }`}
                    title="Edit Task"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {paginatedTasks.map((task) => {
        const statusColor = getStatusColor(task.status);
        const isNew = newTaskIds.has(task.id);
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
        const hasRemarks = task.remarks && task.remarks.trim() !== '';
        const statusOptions = getStatusOptions(task.status);
        const isUpdating = updatingTaskId === task.id;
        
        return (
          <div
            key={task.id}
            className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
              isDark ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'
            } ${isNew ? (isDark ? 'border-emerald-500/50' : 'border-emerald-400') : ''}`}
            onClick={() => onTaskClick(task)}
          >
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    #{task.rowIndex}
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {task.brand}
                  </span>
                  {isNew && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className={`text-base font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>
                  {task.task}
                </p>
                <div className="flex items-center gap-3 text-sm flex-wrap mt-1">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                    <User className="inline h-4 w-4 mr-1.5" />
                    {task.agent || 'Unassigned'}
                  </span>
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                    <Calendar className="inline h-4 w-4 mr-1.5" />
                    {formatDate(task.due_date)}
                    {isOverdue && (
                      <span className="ml-2 text-red-400 font-medium">(Overdue)</span>
                    )}
                  </span>
                  {hasRemarks && (
                    <span className={`truncate max-w-[200px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      <MessageSquare className="inline h-4 w-4 mr-1.5" />
                      {task.remarks}
                      {task.remarks.toLowerCase().includes('sbs') && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                          <Eye className="h-3 w-3" />
                          SBS
                        </span>
                      )}
                    </span>
                  )}
                  {task.status === 'Pending' && task.reason_for_pending && (
                    <span className={`truncate max-w-[200px] ${isDark ? 'text-amber-400' : 'text-amber-600'} text-xs`}>
                      <AlertCircle className="inline h-4 w-4 mr-1.5" />
                      Reason: {task.reason_for_pending}
                    </span>
                  )}
                </div>
              </div>
              
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}>
                <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
                {task.status}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => handleOpenGenerator(task, e)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                  isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                title="Generate Task Name"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
              {statusOptions.slice(0, 1).map((newStatus) => (
                <button
                  key={newStatus}
                  onClick={() => onUpdateStatus(task.id, newStatus)}
                  disabled={isUpdating}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                    isUpdating ? 'opacity-50 cursor-not-allowed' :
                    newStatus === 'Completed' ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200') :
                    newStatus === 'Cancelled' ? (isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200') :
                    newStatus === 'Ongoing' ? (isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200') :
                    isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : newStatus}
                </button>
              ))}
              {statusOptions.length > 1 && (
                <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>+{statusOptions.length - 1}</span>
              )}
              {isTaskAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                  className={`rounded-lg p-1.5 transition-all ${
                    isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                  }`}
                  title="Edit Task"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const activeCount = filteredAndSortedTasks.length;
  const totalCount = activeTasks.length;

  // ─── MAIN RENDER ───────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* New Task Notification Banner */}
      {showNewTaskNotification && newTaskIds.size > 0 && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl border shadow-2xl p-5 max-w-md animate-in slide-in-from-top-4 duration-300 ${
          isDark ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-emerald-300'
        }`}>
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-500/20 p-2.5">
              <Bell className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {newTaskIds.size} New Task{newTaskIds.size > 1 ? 's' : ''} Added!
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Click refresh to see them in your list
              </p>
            </div>
            <button
              onClick={() => setShowNewTaskNotification(false)}
              className={`rounded p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={onRefresh}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              <RefreshCw className="h-4 w-4" /> Refresh Now
            </button>
          </div>
        </div>
      )}

      <div className={`border-b p-5 flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {viewMode === 'all' ? 'All Tasks' : 'My Tasks'}
                  {newTaskIds.size > 0 && viewMode === 'all' && (
                    <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-400">
                      <Bell className="h-4 w-4" />
                      {newTaskIds.size} new
                    </span>
                  )}
                </h2>
                <p className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'} mt-0.5`}>
                  {viewMode === 'all'
                    ? `All ${totalCount} tasks in tracker`
                    : (currentUserName || currentUserEmail ? `Tasks assigned to ${currentUserName || currentUserEmail}` : 'No user logged in')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-medium transition-all ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                } ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                Refresh
              </button>
              
              <button
                onClick={() => onViewModeChange(viewMode === 'all' ? 'mine' : 'all')}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-medium transition-all ${
                  viewMode === 'all'
                    ? isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {viewMode === 'all' ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                {viewMode === 'all' ? 'Viewing All' : 'View All'}
              </button>
              
              {isTaskAdmin && (
                <button
                  onClick={onAddTask}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-base font-medium text-white transition-all hover:bg-emerald-600"
                >
                  <Plus className="h-5 w-5" />
                  Add Task
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search tasks, brands, agents, due dates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg border pl-12 pr-4 py-3 text-base ${
                  isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                💡 Search by: Dec 25, 12/25, 2024-12-25
              </span>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-base font-medium transition-all ${
                showFilters || filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all'
                  ? isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter className="h-5 w-5" />
              Filters
              {(filterStatus !== 'all' || filterBrand !== 'all' || filterAgent !== 'all') && (
                <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
                  {[filterStatus, filterBrand, filterAgent].filter(f => f !== 'all').length}
                </span>
              )}
            </button>
            
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setLayoutMode('table')}
                className={`px-4 py-3 text-base transition-all ${
                  layoutMode === 'table'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
                title="Table View"
              >
                <Table className="h-5 w-5" />
              </button>
              <button
                onClick={() => setLayoutMode('card')}
                className={`px-4 py-3 text-base transition-all border-l ${
                  layoutMode === 'card'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'
                }`}
                title="Card View"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setLayoutMode('list')}
                className={`px-4 py-3 text-base transition-all border-l ${
                  layoutMode === 'list'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'
                }`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Status filter tabs */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterStatus === 'all'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({taskCounts.all || 0})
              </button>
              
              {Object.keys(taskCounts).filter(k => k !== 'all').sort().map((status) => {
                const count = taskCounts[status] || 0;
                const isActive = filterStatus === status;
                
                return (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{status}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
                        : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* New Tasks Toggle and Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  showOnlyNew
                    ? isDark ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Bell className="h-4 w-4" />
                {showOnlyNew ? 'Showing New Tasks' : 'Show New Tasks'}
                {newTaskIds.size > 0 && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    showOnlyNew
                      ? isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
                      : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {newTaskIds.size}
                  </span>
                )}
              </button>
              
              {newTaskIds.size > 0 && (
                <button
                  onClick={onMarkAllViewed}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Mark All Viewed
                </button>
              )}
              
              {/* Date Filter Buttons */}
              <button
                onClick={() => { setFilterDateRange('all'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'all'
                    ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Dates
              </button>
              <button
                onClick={() => { setFilterDateRange('unassigned'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'unassigned'
                    ? isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                👤 Unassigned
              </button>
              <button
                onClick={() => { setFilterDateRange('overdue'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'overdue'
                    ? isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🔴 Overdue
              </button>
              <button
                onClick={() => { setFilterDateRange('today'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'today'
                    ? isDark ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📅 Today
              </button>
              <button
                onClick={() => { setFilterDateRange('week'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'week'
                    ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📅 Next 7 Days
              </button>
              <button
                onClick={() => { setFilterDateRange('month'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filterDateRange === 'month'
                    ? isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📅 This Month
              </button>
              
              {/* Custom Date Range Picker Button */}
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                  filterDateRange === 'custom'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Custom Range
                {filterDateRange === 'custom' && (
                  <span className="ml-1 text-xs opacity-70">
                    ({customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - {customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'})
                  </span>
                )}
              </button>
              
              {filterDateRange !== 'all' && (
                <button
                  onClick={clearCustomDateRange}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <X className="h-4 w-4 inline" /> Clear
                </button>
              )}
            </div>

            {/* Custom Date Range Picker Dropdown */}
            {showDateRangePicker && (
              <div className={`mt-2 p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-lg`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1.5`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2.5 text-base ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1.5`}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2.5 text-base ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="flex gap-3 mt-4 sm:mt-6">
                    <button
                      onClick={applyCustomDateRange}
                      disabled={!customDateStart || !customDateEnd}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-all ${
                        !customDateStart || !customDateEnd
                          ? 'opacity-50 cursor-not-allowed bg-slate-600 text-slate-400'
                          : isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      <Check className="h-4 w-4" /> Apply
                    </button>
                    <button
                      onClick={() => setShowDateRangePicker(false)}
                      className={`rounded-lg px-4 py-2.5 text-base font-medium transition-all ${
                        isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border ${
              isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Brand
                </label>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-base ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Brands</option>
                  {uniqueBrands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Agent
                </label>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-base ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Agents</option>
                  {uniqueAgents.map((agent) => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className={`w-full rounded-lg px-4 py-2.5 text-base font-medium transition-all ${
                    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && activeTasks.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-10 w-10 animate-spin ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          </div>
        ) : (
          renderTasks()
        )}
      </div>
      
      <div className={`border-t p-4 flex-shrink-0 flex items-center justify-between flex-wrap gap-3 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Showing {paginatedTasks.length} of {activeCount} tasks
          {filteredAndSortedTasks.length !== activeTasks.length && ` (filtered from ${activeTasks.length})`}
          {showOnlyNew && (
            <span className={`ml-3 px-2 py-0.5 rounded text-xs ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              🆕 New Tasks
            </span>
          )}
          {filterDateRange !== 'all' && (
            <span className={`ml-3 px-2 py-0.5 rounded text-xs ${
              filterDateRange === 'unassigned' ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700' :
              filterDateRange === 'overdue' ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700' :
              filterDateRange === 'custom' ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' :
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {filterDateRange === 'unassigned' ? '👤 Unassigned' :
              filterDateRange === 'overdue' ? '🔴 Overdue' :
              filterDateRange === 'today' ? '📅 Today' :
              filterDateRange === 'week' ? '📅 Next 7 Days' :
              filterDateRange === 'month' ? '📅 This Month' :
              filterDateRange === 'custom' ? `📅 ${customDateStart ? new Date(customDateStart).toLocaleDateString() : '...'} - ${customDateEnd ? new Date(customDateEnd).toLocaleDateString() : '...'}` : ''}
            </span>
          )}
        </span>
        
        <div className="flex items-center gap-3">
          {newTaskIds.size > 0 && (
            <button
              onClick={onMarkAllViewed}
              className={`text-sm font-medium transition-colors ${
                isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              Mark all viewed
            </button>
          )}
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded transition-colors ${
                  currentPage === 1 
                    ? 'opacity-30 cursor-not-allowed' 
                    : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage === totalPages 
                    ? 'opacity-30 cursor-not-allowed' 
                    : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
          
          <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {isLoading ? 'Refreshing...' : `Updated: ${new Date().toLocaleTimeString()}`}
          </span>
        </div>
      </div>
      
      {/* ─── MODALS ────────────────────────────────────────────────────────── */}
      
      {/* Task Name Generator Modal */}
      {showGenerator && selectedTaskForGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 p-2">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Task Name Generator</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Generate task names for {selectedTaskForGenerator.brand}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGenerator(false)} className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                <X className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-8">
              <Sparkles className="h-16 w-16 text-blue-400 mb-4" />
              <p className={`text-base ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Task name generator coming soon!
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'} mt-2`}>
                {selectedTaskForGenerator.task} · {selectedTaskForGenerator.brand}
              </p>
              <button
                onClick={() => setShowGenerator(false)}
                className={`mt-4 rounded-lg px-5 py-2.5 text-base font-medium transition-all ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason for Pending Modal */}
      {showPendingReasonModal && pendingTaskId && (
        <ReasonForPendingModal
          isOpen={showPendingReasonModal}
          onClose={() => {
            setShowPendingReasonModal(false);
            setPendingTaskId(null);
            setPendingStatusTarget('Pending');
          }}
          onConfirm={handlePendingConfirm}
          task={tasks.find(t => t.id === pendingTaskId) || allTasks.find(t => t.id === pendingTaskId) || null}
          theme={theme}
          isSubmitting={isSubmittingPending}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Task Details</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>View and manage task information</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isTaskAdmin && (
                  <button
                    onClick={() => { setTaskFormError(null); setShowEditTaskModal(true); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </button>
                )}
                <button onClick={() => setShowTaskModal(false)} className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                  <X className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Row #</label>
                  <p className={`text-xl font-semibold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>#{selectedTask.rowIndex}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Task</label>
                  <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.task}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Brand</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.brand}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Type</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.type}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Segment</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.segment}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Agent</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.agent || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Date Requested</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedTask.date_requested)}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Due Date</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedTask.due_date)}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Status</label>
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium ${getStatusColor(selectedTask.status).bg} ${getStatusColor(selectedTask.status).text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(selectedTask.status).dot}`} />
                    <span>{selectedTask.status}</span>
                  </span>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Auditor</label>
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.auditor || 'N/A'}</p>
                </div>
              </div>

              {selectedTask.remarks && (
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Remarks</label>
                  <p className={`text-base ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>{selectedTask.remarks}</p>
                  {selectedTask.remarks.toLowerCase().includes('sbs') && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-semibold text-yellow-400 mt-2">
                      <Eye className="h-4 w-4" />
                      SBS - Side by Side Observing
                    </span>
                  )}
                </div>
              )}

              {selectedTask.reason_for_pending && (
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Reason for Pending</label>
                  <div className={`mt-2 rounded-lg border p-4 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-yellow-300 bg-yellow-50'}`}>
                    <div className="flex items-start gap-3">
                      <Clock className={`h-5 w-5 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <p className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTask.reason_for_pending}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.reason_for_cancel && (
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Reason for Cancel</label>
                  <p className={`text-base ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>{selectedTask.reason_for_cancel}</p>
                </div>
              )}

              {selectedTask.date_completed && (
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Date Completed</label>
                  <p className={`text-base ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>{formatDate(selectedTask.date_completed)}</p>
                </div>
              )}

              {selectedTask.bc_links && (
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>BC Links</label>
                  <div className="mt-2">
                    {selectedTask.bc_links.split(',').map((link, index) => {
                      const trimmedLink = link.trim();
                      if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
                        return (
                          <a
                            key={index}
                            href={trimmedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-base text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline transition-colors mr-3 ${
                              isDark ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Basecamp Link {index + 1}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        );
                      }
                      return (
                        <span key={index} className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'} mr-3`}>
                          {trimmedLink}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t p-5 ${isDark ? 'border-slate-700' : 'border-gray-200'} flex flex-wrap gap-3 justify-between`}>
              <div className="flex gap-3 flex-wrap">
                {getStatusOptions(selectedTask.status).map((newStatus) => (
                  <button
                    key={newStatus}
                    onClick={() => {
                      onUpdateStatus(selectedTask.id, newStatus);
                    }}
                    disabled={updatingTaskId === selectedTask.id}
                    className={`rounded-lg px-5 py-2.5 text-base font-medium transition-all ${
                      updatingTaskId === selectedTask.id ? 'opacity-50 cursor-not-allowed' :
                      newStatus === 'Completed' ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                      newStatus === 'Cancelled' ? 'bg-red-500 text-white hover:bg-red-600' :
                      newStatus === 'Ongoing' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                      'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {updatingTaskId === selectedTask.id ? <Loader2 className="h-5 w-5 animate-spin" /> : `Mark as ${newStatus}`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                className={`rounded-lg px-5 py-2.5 text-base font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <TaskFormModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSubmit={addNewTask}
        isSubmitting={isSavingTask}
        theme={theme}
        mode="add"
        error={taskFormError}
      />

      {/* Edit Task Modal */}
      <TaskFormModal
        isOpen={showEditTaskModal}
        onClose={() => setShowEditTaskModal(false)}
        onSubmit={saveTaskEdits}
        isSubmitting={isSavingTask}
        theme={theme}
        mode="edit"
        error={taskFormError}
        initialValues={selectedTask ? {
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
        } : undefined}
      />
    </div>
  );
}