
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewMode, Task, CreateTaskPayload, UpdateTaskPayload, TaskFilters, TaskPriority, LogEntry, RecurrenceUpdateMode, Note, TaskStatus } from './types';
import { taskManager } from './services/taskManager';
import { runAutomatedTests } from './utils/testRunner';
import { CurrentTasksView } from './components/CurrentTasksView';
import { AllTasksView } from './components/AllTasksView';
import { TaskFormModal, TaskFormPrefill } from './components/TaskFormModal';
import { CalendarView } from './components/CalendarView';
import { TreeTaskLogo } from './components/TreeTaskLogo';
import { TaskFiltersUI } from './components/TaskFilters';
import { TaskItem } from './components/TaskItem';
import { ForestView } from './components/ForestView';
import { SummaryView } from './components/SummaryView';
import { RoutineView } from './components/RoutineView';
import { NotesView } from './components/NotesView';
import { EisenhowerMatrixView } from './components/EisenhowerMatrixView';
import { KanbanBoardModal } from './components/KanbanBoardModal';
import { RecurrenceActionModal } from './components/RecurrenceActionModal';
import { translations, Language } from './utils/translations';
import { useTaskContext } from './context/TaskContext';
import { DebugTimeControls } from './components/DebugTimeControls';
import { PomodoroTimerView } from './components/PomodoroTimerView';
import { GoalsView } from './components/GoalsView';
import { useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';

const AVAILABLE_USERS = [
  { id: 'u1', name: 'Alice Smith' },
  { id: 'u2', name: 'Bob Jones' },
  { id: 'u3', name: 'Charlie Day' },
  { id: 'u4', name: 'Myself' }
];

const DEFAULT_FILTERS: TaskFilters = {
    searchQuery: '',
    rootsOnly: false,
    standaloneOnly: false,
    currentOnly: false,
    priorities: [],
    dateRange: 'all',
    maxTimeEstimate: undefined,
    isRecurring: false,
    sortBy: 'newest'
};

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  
  const { refreshTrigger, forceRefresh, undo, redo, canUndo, canRedo } = useTaskContext();

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  
  const [language, setLanguage] = useState<Language>(() => {
     if (typeof window !== 'undefined') {
        return (localStorage.getItem('language') as Language) || 'en';
     }
     return 'en';
  });

  const [showDebug, setShowDebug] = useState<boolean>(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('showDebug') === 'true';
      }
      return false;
  });

  const t = translations[language];

  const [debugOffset, setDebugOffset] = useState(0);

  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  
  const [now, setNow] = useState(Date.now() + debugOffset);

  const activeBlocks = useMemo(() => taskManager.getCurrentActiveTimeBlocks(now), [now, refreshTrigger]);

  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [focusedRootId, setFocusedRootId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [editingInstanceDate, setEditingInstanceDate] = useState<Date | undefined>(undefined); 
  const [creatingSubtaskParentId, setCreatingSubtaskParentId] = useState<string | null>(null);
  
  const [createWithRecurrence, setCreateWithRecurrence] = useState(false);
  const [formPrefill, setFormPrefill] = useState<TaskFormPrefill | undefined>(undefined);

  const [noteToConvertId, setNoteToConvertId] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);

  const [pendingRecurrenceDelete, setPendingRecurrenceDelete] = useState<Task | null>(null);
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);

  const [kanbanTargetTask, setKanbanTargetTask] = useState<Task | null>(null);

  const [pomodoroTargetTask, setPomodoroTargetTask] = useState<Task | null>(null);

  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);
  
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) {
        setIsSystemMenuOpen(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const timer = setInterval(() => {
        setNow(Date.now() + debugOffset);
        forceRefresh();
    }, 60000);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        clearInterval(timer);
    };
  }, [debugOffset]);

  useEffect(() => {
      setNow(Date.now() + debugOffset);
      forceRefresh();
  }, [debugOffset]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth Loading State
  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-indigo-600"><i className="fas fa-circle-notch fa-spin text-4xl"></i></div>;
  }

  // Auth Guard
  if (!user) {
      return <AuthView />;
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleDebug = () => {
      const newVal = !showDebug;
      setShowDebug(newVal);
      localStorage.setItem('showDebug', String(newVal));
      if (!newVal) setDebugOffset(0); 
  };

  const addDebugOffset = (ms: number) => {
      setDebugOffset(prev => prev + ms);
  };
  const resetDebugTime = () => {
      setDebugOffset(0);
  };

  const handleToggleTask = (id: string, instanceDate?: number) => taskManager.toggleTaskStatus(id, instanceDate);
  const handleFocusSubtree = (id: string) => { setFocusedRootId(id); setFilters(DEFAULT_FILTERS); };
  const handleForestFocus = (task: Task) => { setViewMode('all'); setFocusedRootId(task.id); setFilters(DEFAULT_FILTERS); };
  const handleOpenCreate = (prefillDate?: Date, durationMinutes?: number, initialTitle?: string) => {
    setEditingTask(undefined);
    setCreatingSubtaskParentId(focusedRootId); 
    setCreateWithRecurrence(false); 
    setFormPrefill(durationMinutes ? { timeEstimate: durationMinutes } : undefined);
    setEditingInstanceDate(undefined);
    setNoteToConvertId(null);
    setEditingTask({
            id: 'new', title: initialTitle || '', status: 'Not Started', priority: 'Medium', tags: [], collaboratorIds: [], pendingChildrenCount: 0, totalChildrenCount: 0, createdAt: Date.now(), isRecurring: false, isAllDay: false, scheduledTime: prefillDate ? prefillDate.getTime() : undefined
    } as Task);
    setIsModalOpen(true);
  };
  const handleOpenCreateRoutine = () => { setEditingTask(undefined); setCreatingSubtaskParentId(null); setCreateWithRecurrence(true); setFormPrefill(undefined); setEditingInstanceDate(undefined); setIsModalOpen(true); }
  const handleOpenCreateHabit = () => { setEditingTask(undefined); setCreatingSubtaskParentId(null); setCreateWithRecurrence(true); setEditingInstanceDate(undefined); setFormPrefill({ tags: [t.usefulHabitTag], taskType: 'Health', timeEstimate: 5, isRecurring: true, recurrencePattern: { frequency: 'Daily', interval: 1, endCondition: 'No end date' } }); setIsModalOpen(true); };
  const handleOpenCreateSubtask = (parentId: string) => { setEditingTask(undefined); setCreatingSubtaskParentId(parentId); setCreateWithRecurrence(false); setFormPrefill(undefined); setEditingInstanceDate(undefined); setIsModalOpen(true); };
  const handleOpenEdit = (task: Task, instanceDate?: Date) => { setEditingTask(task); setCreatingSubtaskParentId(null); setCreateWithRecurrence(task.isRecurring); setFormPrefill(undefined); setEditingInstanceDate(instanceDate); setIsModalOpen(true); };
  const handleOpenKanban = (task: Task) => { setKanbanTargetTask(task); };
  const handleKanbanStatusUpdate = (taskId: string, status: TaskStatus) => { taskManager.updateTask(taskId, { status }); forceRefresh(); };
  const handleOpenPomodoro = (task: Task) => { setPomodoroTargetTask(task); setViewMode('pomodoro'); setIsSystemMenuOpen(false); };
  const handleConvertNote = (note: Note) => { setNoteToConvertId(note.id); handleOpenCreate(undefined, undefined, note.content); };
  const handleSaveTask = (payload: CreateTaskPayload | UpdateTaskPayload) => {
    if (editingTask && editingTask.id !== 'new') { taskManager.updateTask(editingTask.id, payload as UpdateTaskPayload); } 
    else { taskManager.createTask(payload as CreateTaskPayload); if (noteToConvertId) { taskManager.deleteNote(noteToConvertId); setNoteToConvertId(null); } }
  };
  const handleDeleteRequest = (id: string) => {
    const task = taskManager.getTask(id);
    if (!task) return;
    if (task.isRecurring) { setPendingRecurrenceDelete(task); setIsRecurrenceModalOpen(true); return; }
    if (task.totalChildrenCount > 0) { setDeleteCandidate(task); } else { taskManager.deleteTask(id); if (id === focusedRootId) setFocusedRootId(null); }
  };
  const handleRecurrenceDeleteConfirm = (mode: RecurrenceUpdateMode) => { if (!pendingRecurrenceDelete) return; const instanceTs = editingInstanceDate ? editingInstanceDate.getTime() : pendingRecurrenceDelete.scheduledTime; taskManager.deleteRecurringTaskInstance(pendingRecurrenceDelete.id, instanceTs || 0, mode); setPendingRecurrenceDelete(null); setIsRecurrenceModalOpen(false); };
  const handleDeleteMultiple = (ids: string[]) => { taskManager.deleteMultipleTasks(ids); };
  const confirmDeleteStrategy = (strategy: 'delete-all' | 'keep-children') => { if (!deleteCandidate) return; if (strategy === 'delete-all') { taskManager.deleteTask(deleteCandidate.id); } else { taskManager.deleteTaskPromoteChildren(deleteCandidate.id); } if (deleteCandidate.id === focusedRootId) setFocusedRootId(null); setDeleteCandidate(null); };
  const handleRestore = (id: string) => { taskManager.restoreTask(id); }
  const handleMoveTask = (taskId: string, newParentId: string | null) => { taskManager.moveTask(taskId, newParentId); };
  const handleReschedule = (taskId: string, newDate: Date, commitTime: boolean = false, forceAllDay: boolean = false) => {
    const task = tasks.find(t => t.id === taskId);
    const sourceTask = taskManager.getTask(taskId);
    if (!sourceTask) return;
    const updates: UpdateTaskPayload = {};
    if (commitTime) { updates.scheduledTime = newDate.getTime(); updates.isAllDay = false; } 
    else {
        const applyDateToTimestamp = (timestamp: number, targetDate: Date) => { const original = new Date(timestamp); const result = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()); result.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds()); return result.getTime(); };
        if (!forceAllDay && sourceTask.scheduledTime && !sourceTask.isAllDay) { updates.scheduledTime = applyDateToTimestamp(sourceTask.scheduledTime, newDate); } 
        else { const d = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0, 0); updates.scheduledTime = d.getTime(); updates.isAllDay = true; }
    }
    taskManager.updateTask(taskId, updates);
  };
  const handleUnschedule = (taskId: string) => { taskManager.updateTask(taskId, { scheduledTime: undefined, isAllDay: false }); };

  useEffect(() => {
    let rawTasks: Task[] = [];
    if (viewMode === 'logs') { setSystemLogs(taskManager.getLogs()); return; }
    if (viewMode === 'archived') rawTasks = taskManager.getArchivedTasks(now);
    else if (viewMode === 'deleted') rawTasks = taskManager.getDeletedTasks();
    else if (viewMode === 'forest' || viewMode === 'summary') rawTasks = taskManager.getForestTasks();
    else if (viewMode === 'routine') rawTasks = taskManager.getRoutineTasks(now);
    else if (focusedRootId && viewMode === 'all') {
        const allRaw = taskManager.getAllTasksIncludingArchived();
        const subtree: Task[] = [];
        const queue = [focusedRootId];
        const processed = new Set<string>();
        while(queue.length > 0) {
            const currId = queue.shift()!;
            if (processed.has(currId)) continue;
            processed.add(currId);
            const node = allRaw.find(t => t.id === currId);
            if (node) { subtree.push(node); allRaw.filter(t => t.parentId === currId).forEach(c => queue.push(c.id)); }
        }
        rawTasks = subtree;
    } else if (viewMode === 'current') rawTasks = taskManager.getCurrentTasks(now);
    else if (viewMode === 'all' || viewMode === 'eisenhower') {
        const allRaw = taskManager.getAllTasksIncludingArchived();
        rawTasks = allRaw.filter(t => !t.deletedAt);
    } else rawTasks = taskManager.getAllTasks(now);

    if (['forest', 'summary', 'routine', 'notes', 'pomodoro', 'goals'].includes(viewMode)) { setTasks(rawTasks); return; }

    let filteredTasks = rawTasks.filter(t => {
        if (filters.searchQuery && !t.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
        if (filters.rootsOnly && t.parentId) return false; // Simple check
        if (filters.isRecurring && !t.isRecurring) return false;
        return true;
    });
    
    setTasks(filteredTasks);
  }, [viewMode, refreshTrigger, filters, focusedRootId, now]);


  const renderContent = () => {
    switch (viewMode) {
      case 'calendar': return <CalendarView tasks={taskManager.getAllTasks(now)} onEdit={handleOpenEdit} onReschedule={handleReschedule} onUnschedule={handleUnschedule} onRefresh={forceRefresh} onCreateTask={handleOpenCreate} t={t} language={language} now={new Date(now)} />;
      case 'routine': return <RoutineView tasks={tasks} onToggle={handleToggleTask} onEdit={handleOpenEdit} onDelete={handleDeleteRequest} onDeleteMultiple={handleDeleteMultiple} onAddRoutine={handleOpenCreateRoutine} onAddHabit={handleOpenCreateHabit} refreshData={forceRefresh} t={t} language={language} now={now} onOpenPomodoro={handleOpenPomodoro} />;
      case 'notes': return <NotesView refreshData={forceRefresh} onConvertToTask={handleConvertNote} t={t} />;
      case 'goals': return <GoalsView t={t} onFocusProject={handleForestFocus} />;
      case 'eisenhower': return <EisenhowerMatrixView tasks={tasks} onEdit={handleOpenEdit} now={now} t={t} />;
      case 'pomodoro': return <PomodoroTimerView t={t} refreshData={forceRefresh} initialTask={pomodoroTargetTask} />;
      case 'all': return <AllTasksView tasks={tasks} rootId={focusedRootId} onToggle={handleToggleTask} onAddSubtask={handleOpenCreateSubtask} onDelete={handleDeleteRequest} onMoveTask={handleMoveTask} onEdit={handleOpenEdit} onFocus={handleFocusSubtree} refreshData={forceRefresh} t={t} language={language} now={now} onOpenKanban={handleOpenKanban} onOpenPomodoro={handleOpenPomodoro} activeBlocks={activeBlocks} />;
      case 'archived': return <div className="space-y-3"><div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-2 border border-blue-100 dark:border-blue-800 flex items-center gap-2"><i className="fas fa-info-circle"></i>{t.archiveInfo}</div>{tasks.map(task => (<TaskItem key={task.id} task={task} onToggle={handleToggleTask} refreshData={forceRefresh} readOnly={false} onEdit={handleOpenEdit} t={t} language={language} now={now} />))}</div>;
      case 'deleted': return <div className="space-y-3"><div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 mb-2 border border-red-100 dark:border-red-800 flex items-center gap-2"><i className="fas fa-exclamation-circle"></i>{t.trashInfo}</div>{tasks.map(task => (<TaskItem key={task.id} task={task} onToggle={() => {}} refreshData={forceRefresh} readOnly={true} onRestore={handleRestore} t={t} language={language} now={now} />))}</div>;
      case 'logs': return <div className="bg-white dark:bg-gray-800 rounded-lg p-4">Logs View Placeholder</div>;
      case 'forest': return <ForestView tasks={tasks} t={t} onEdit={handleOpenEdit} onFocusRoot={handleForestFocus} />;
      case 'summary': return <SummaryView tasks={tasks} t={t} />;
      case 'current': default: return <CurrentTasksView tasks={tasks} onToggle={handleToggleTask} onAddSubtask={handleOpenCreateSubtask} onEdit={handleOpenEdit} refreshData={forceRefresh} t={t} language={language} now={now} onOpenPomodoro={handleOpenPomodoro} activeBlocks={activeBlocks} />;
    }
  };

  const isFullHeightView = viewMode === 'calendar' || viewMode === 'forest' || viewMode === 'eisenhower' || viewMode === 'notes' || viewMode === 'pomodoro' || viewMode === 'goals';
  const isStandardView = ['current', 'all', 'routine', 'calendar'].includes(viewMode);
  const getViewLabel = (mode: ViewMode) => { switch (mode) { case 'current': return t.currentFocus; case 'all': return t.allTasks; default: return mode; }};
  const mainNavItems: { mode: ViewMode, label: string, icon: string }[] = [{ mode: 'current', label: t.currentFocus, icon: 'fa-check-circle' }, { mode: 'all', label: t.allTasks, icon: 'fa-list' }, { mode: 'routine', label: t.routine, icon: 'fa-sync-alt' }, { mode: 'calendar', label: t.calendar, icon: 'fa-calendar-alt' }, { mode: 'notes', label: t.notes, icon: 'fa-sticky-note' }];
  const contentWidthClass = viewMode === 'calendar' ? 'w-full' : 'max-w-[600px]';

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 font-sans relative transition-colors duration-200 ${isFullHeightView ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen pb-20'}`}>
      
      {showDebug && <DebugTimeControls debugOffset={debugOffset} setDebugOffset={setDebugOffset} t={t} />}

      <header className={`bg-white dark:bg-gray-800 dark:border-b dark:border-gray-700 shadow-sm transition-colors duration-200 ${isFullHeightView ? 'shrink-0' : 'sticky top-0'} z-[60]`}>
        <div className="w-full flex justify-center">
            <div className="px-4 py-2 flex items-center justify-between md:justify-center gap-4 md:gap-6 h-14 relative w-full md:w-auto">
            
            <div className="flex items-center gap-3 shrink-0 z-20" ref={systemMenuRef}>
                <div className="shadow-indigo-200 dark:shadow-none shadow-lg rounded-xl overflow-hidden shrink-0 w-8 h-8">
                    <TreeTaskLogo className="w-full h-full" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-tight text-gray-800 dark:text-white block leading-none">{t.appTitle}</span>
                    {taskManager.isSyncingStatus ? (
                        <span className="text-[9px] text-indigo-500 font-medium flex items-center gap-1 animate-pulse">
                            <i className="fas fa-sync-alt fa-spin"></i> Syncing...
                        </span>
                    ) : (
                        <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                            <i className="fas fa-cloud-check"></i> Synced
                        </span>
                    )}
                </div>
                
                <button onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"><i className="fas fa-bars text-sm"></i></button>
                
                {isSystemMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-750 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.system}</div>
                        <button onClick={() => { setViewMode('summary'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-chart-pie w-4 text-indigo-500"></i> {t.summary}</button>
                        <button onClick={() => { setViewMode('forest'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-tree w-4 text-green-600"></i> {t.forest}</button>
                        <button onClick={() => { setViewMode('goals'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-bullseye w-4 text-red-500"></i> {t.goals}</button>
                        <button onClick={() => { setViewMode('eisenhower'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-th-large w-4 text-purple-500"></i> {t.eisenhower}</button>
                        <button onClick={() => { setViewMode('pomodoro'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-stopwatch w-4 text-red-400"></i> {t.pomodoro}</button>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                        <button onClick={() => { setViewMode('archived'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-archive w-4 text-blue-400"></i> {t.completedTasks}</button>
                        <button onClick={() => { setViewMode('deleted'); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><i className="fas fa-trash-alt w-4 text-gray-400"></i> {t.deletedTasks}</button>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                        
                        <div className="px-4 py-2">
                            <label className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                                <span>Dark Mode</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`} onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </label>
                        </div>
                        <div className="px-4 py-2">
                            <label className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                                <span>{t.debugMode}</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showDebug ? 'bg-indigo-600' : 'bg-gray-300'}`} onClick={(e) => { e.preventDefault(); toggleDebug(); }}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showDebug ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </label>
                        </div>
                        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex justify-between text-xs text-gray-500">
                                 <span className={`cursor-pointer hover:text-indigo-600 ${language === 'en' ? 'font-bold text-indigo-600' : ''}`} onClick={() => { setLanguage('en'); localStorage.setItem('language', 'en'); window.location.reload(); }}>EN</span>
                                 <span className={`cursor-pointer hover:text-indigo-600 ${language === 'ru' ? 'font-bold text-indigo-600' : ''}`} onClick={() => { setLanguage('ru'); localStorage.setItem('language', 'ru'); window.location.reload(); }}>RU</span>
                                 <span className={`cursor-pointer hover:text-indigo-600 ${language === 'kk' ? 'font-bold text-indigo-600' : ''}`} onClick={() => { setLanguage('kk'); localStorage.setItem('language', 'kk'); window.location.reload(); }}>KZ</span>
                                 <span className={`cursor-pointer hover:text-indigo-600 ${language === 'be' ? 'font-bold text-indigo-600' : ''}`} onClick={() => { setLanguage('be'); localStorage.setItem('language', 'be'); window.location.reload(); }}>BY</span>
                             </div>
                        </div>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                        <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-medium flex items-center gap-2">
                            <i className="fas fa-sign-out-alt w-4"></i> Sign Out
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex-1 flex justify-end md:justify-center md:flex-none z-10" ref={viewMenuRef}>
                <button onClick={() => setIsViewMenuOpen(!isViewMenuOpen)} className="md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><span className="text-base font-bold text-gray-800 dark:text-white">{getViewLabel(viewMode)}</span><i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`}></i></button>
                <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg shadow-inner">{mainNavItems.map(item => (<button key={item.mode} onClick={() => { setViewMode(item.mode); setFocusedRootId(null); }} className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === item.mode ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'}`}>{item.label}</button>))}</div>
                {isViewMenuOpen && (<div className="md:hidden absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top"><div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-700 mb-1">{t.backToMain}</div>{mainNavItems.map(item => (<button key={item.mode} onClick={() => { setViewMode(item.mode); setIsViewMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${viewMode === item.mode ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'text-gray-700 dark:text-gray-200'}`}><i className={`fas ${item.icon} w-5 text-center mr-2 ${viewMode === item.mode ? 'text-indigo-500' : 'text-gray-400'}`}></i>{item.label}</button>))}</div>)}
            </div>
            </div>
        </div>
      </header>

      <main className={`mx-auto px-4 w-full flex flex-col items-center ${isFullHeightView ? `flex-1 min-h-0 py-3` : 'py-4'} ${contentWidthClass}`}>
        <div className={`space-y-2 mb-3 shrink-0 w-full ${viewMode === 'calendar' || viewMode === 'routine' || viewMode === 'goals' || !isStandardView ? 'hidden' : ''}`}>
            <div className="flex flex-row flex-wrap items-center gap-2">
               <div className="flex-1 min-w-0">{focusedRootId && viewMode === 'all' ? (<div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-2 rounded-lg flex items-center justify-between text-sm max-w-full"><div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 min-w-0"><i className="fas fa-crosshairs shrink-0"></i><span className="font-semibold text-xs sm:text-sm truncate">{t.focusedView}</span></div><button onClick={() => setFocusedRootId(null)} className="text-xs bg-white dark:bg-emerald-800 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-100 px-2 py-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-700 transition-colors ml-2 shrink-0"><span className="hidden sm:inline">{t.exitFocus}</span><span className="sm:hidden">{t.exitFocus}</span></button></div>) : <div className="hidden md:block"></div>}</div>
               <div className="flex items-center gap-2 shrink-0 ml-auto">
                   <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${isFiltersOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} ${filters.searchQuery ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900 border-transparent' : ''}`}><i className="fas fa-filter"></i><span className="hidden sm:inline">{t.filters}</span></button>
                   <button onClick={() => handleOpenCreate()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg shadow-sm shadow-indigo-200 dark:shadow-none transition-all active:scale-95 whitespace-nowrap"><i className="fas fa-plus"></i><span className="font-semibold hidden md:inline">{t.createTask}</span><span className="font-semibold md:hidden">{t.createShort}</span></button>
               </div>
            </div>
            {isFiltersOpen && (<div className="animate-in fade-in slide-in-from-top-2"><TaskFiltersUI filters={filters} onChange={setFilters} allTasks={taskManager.getAllTasks()} t={t} /></div>)}
        </div>
        
        <div className="w-full h-full">{isFullHeightView ? (<div className="flex-1 min-h-0 relative flex justify-center w-full h-full">{renderContent()}</div>) : (renderContent())}</div>
      </main>

      <TaskFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} onDelete={handleDeleteRequest} initialData={editingTask} defaultParentId={creatingSubtaskParentId} availableUsers={AVAILABLE_USERS} t={t} language={language} allowRecurrence={createWithRecurrence} prefillData={formPrefill} allTasks={taskManager.getAllTasks()} />
      {kanbanTargetTask && (<KanbanBoardModal isOpen={true} onClose={() => setKanbanTargetTask(null)} rootTask={kanbanTargetTask} subtasks={taskManager.getAllTasksIncludingArchived().filter(t => t.parentId === kanbanTargetTask.id && !t.deletedAt)} onUpdateStatus={handleKanbanStatusUpdate} onEditTask={handleOpenEdit} t={t} />)}
      <RecurrenceActionModal isOpen={isRecurrenceModalOpen} onClose={() => setIsRecurrenceModalOpen(false)} onConfirm={handleRecurrenceDeleteConfirm} mode="delete" t={t} />
      {!isFullHeightView && isStandardView && viewMode !== 'routine' && (<div className="fixed bottom-4 right-4 md:hidden"><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40"><i className="fas fa-arrow-up"></i></button></div>)}
    </div>
  );
};

export default App;
