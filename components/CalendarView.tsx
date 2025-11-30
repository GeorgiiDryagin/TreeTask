
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TimeBlock, RecurrenceUpdateMode } from '../types';
import { taskManager } from '../services/taskManager';
import { TimeBlockModal } from './TimeBlockModal';
import { RecurrenceActionModal } from './RecurrenceActionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useCalendarLogic } from '../hooks/useCalendarLogic';

// Import sub-components
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarSidebar } from './calendar/CalendarSidebar';
import { CalendarFilterSidebar, CalendarFiltersState } from './calendar/CalendarFilterSidebar';
import { TimeGridView } from './calendar/TimeGridView';
import { MonthGridView } from './calendar/MonthGridView';

interface CalendarViewProps {
  tasks: Task[];
  onEdit: (task: Task, instanceDate?: Date) => void;
  onReschedule: (taskId: string, newDate: Date, commitTime?: boolean, forceAllDay?: boolean) => void;
  onUnschedule: (taskId: string) => void;
  onRefresh: () => void; 
  onCreateTask: (date: Date, duration?: number) => void; 
  t: any;
  language: string;
  now?: Date;
}

type CalendarType = 'day' | '3days' | 'week' | '2weeks' | 'month';

export const CalendarView: React.FC<CalendarViewProps> = ({ 
    tasks, onEdit, onReschedule, onUnschedule, onRefresh, onCreateTask, t, language, now: debugNow 
}) => {
  const { getDaysInGrid, getTasksForDay } = useCalendarLogic();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarType>('week');
  
  // Sidebars with Persistence
  const [showUnscheduled, setShowUnscheduled] = useState(() => {
      const saved = localStorage.getItem('treeTask_cal_unscheduled');
      return saved === 'true';
  });
  const [showFilters, setShowFilters] = useState(() => {
      const saved = localStorage.getItem('treeTask_cal_filters');
      return saved === 'true';
  });

  const toggleUnscheduled = (value?: boolean) => {
      setShowUnscheduled(prev => {
          const next = value !== undefined ? value : !prev;
          localStorage.setItem('treeTask_cal_unscheduled', String(next));
          return next;
      });
  };

  const toggleFilters = (value?: boolean) => {
      setShowFilters(prev => {
          const next = value !== undefined ? value : !prev;
          localStorage.setItem('treeTask_cal_filters', String(next));
          return next;
      });
  };
  
  // Filter State
  const [filters, setFilters] = useState<CalendarFiltersState>({
      entityType: 'all',
      recurrenceType: 'all',
      types: [],
      priorities: []
  });

  const [now, setNow] = useState(new Date());

  const [isDraggingFromCalendar, setIsDraggingFromCalendar] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>(undefined);
  const [newBlockDate, setNewBlockDate] = useState<Date | undefined>(undefined);
  const [newBlockRange, setNewBlockRange] = useState<{ start: Date, end: Date } | undefined>(undefined);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [creationPromptRange, setCreationPromptRange] = useState<{ start: Date, end: Date } | null>(null);

  const [recurrenceAction, setRecurrenceAction] = useState<{
      isOpen: boolean; mode: 'move' | 'delete'; entityType: 'task' | 'block'; entityId: string; payload?: any;
  }>({ isOpen: false, mode: 'move', entityType: 'task', entityId: '' });
  const [pendingBlockMove, setPendingBlockMove] = useState<{id: string, newStart: number, newEnd: number, originalDate: number} | null>(null);
  const [pendingTaskMove, setPendingTaskMove] = useState<{id: string, newDate: Date, originalDate: number, isAllDay?: boolean} | null>(null);

  useEffect(() => {
    if (debugNow) {
        setNow(debugNow);
    } else {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }
  }, [debugNow]);

  useEffect(() => {
      setTimeBlocks(taskManager.getAllTimeBlocks());
  }, [tasks]);

  const refreshBlocks = () => setTimeBlocks(taskManager.getAllTimeBlocks());

  // --- FILTER LOGIC ---
  const filteredTasks = useMemo(() => {
      if (filters.entityType === 'block') return [];
      
      return tasks.filter(t => {
          // Recurrence Type
          if (filters.recurrenceType === 'recurring' && !t.isRecurring) return false;
          if (filters.recurrenceType === 'single' && t.isRecurring) return false;
          
          // Task Types
          if (filters.types.length > 0) {
              if (!t.taskType || !filters.types.includes(t.taskType)) return false;
          }
          
          // Priority
          if (filters.priorities.length > 0) {
              if (!filters.priorities.includes(t.priority)) return false;
          }
          
          return true;
      });
  }, [tasks, filters]);

  const filteredBlocks = useMemo(() => {
      if (filters.entityType === 'task') return [];

      return timeBlocks.filter(b => {
          // Recurrence Type
          if (filters.recurrenceType === 'recurring' && !b.isRecurring) return false;
          if (filters.recurrenceType === 'single' && b.isRecurring) return false;
          
          // Task Types (Blocks have taskType too)
          if (filters.types.length > 0) {
              if (!b.taskType || !filters.types.includes(b.taskType)) return false;
          }
          
          return true;
      });
  }, [timeBlocks, filters]);


  // --- HANDLERS ---

  const handleDragEnd = () => {
    setIsDraggingFromCalendar(false);
    setDraggedTaskId(null);
    setDraggedBlockId(null);
  };

  const handleTaskDragStart = (e: React.DragEvent, taskId: string, instanceDate?: Date) => {
    e.dataTransfer.setData('taskId', taskId);
    if (instanceDate) e.dataTransfer.setData('instanceDate', instanceDate.getTime().toString());
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingFromCalendar(true);
    setDraggedTaskId(taskId);
    e.stopPropagation();
  };

  const handleBlockDragStart = (e: React.DragEvent, block: TimeBlock, instanceDate: Date) => {
      e.dataTransfer.setData('blockId', block.id);
      e.dataTransfer.setData('instanceDate', instanceDate.getTime().toString());
      e.dataTransfer.effectAllowed = 'move';
      setIsDraggingFromCalendar(true);
      setDraggedBlockId(block.id);
      e.stopPropagation();
  };

  const handleToggleTask = (e: React.MouseEvent, taskId: string, instanceDateTs: number) => {
    e.stopPropagation();
    taskManager.toggleTaskStatus(taskId, instanceDateTs);
    onRefresh();
  };

  // Nav Handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'day') newDate.setDate(newDate.getDate() - 1);
    if (viewType === '3days') newDate.setDate(newDate.getDate() - 3);
    if (viewType === 'week') newDate.setDate(newDate.getDate() - 7);
    if (viewType === '2weeks') newDate.setDate(newDate.getDate() - 14);
    if (viewType === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };
  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'day') newDate.setDate(newDate.getDate() + 1);
    if (viewType === '3days') newDate.setDate(newDate.getDate() + 3);
    if (viewType === 'week') newDate.setDate(newDate.getDate() + 7);
    if (viewType === '2weeks') newDate.setDate(newDate.getDate() + 14);
    if (viewType === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Block Modal Handlers
  const handleSaveBlock = (block: Omit<TimeBlock, 'id'>) => {
      if (editingBlock) taskManager.updateTimeBlock(editingBlock.id, block);
      else taskManager.addTimeBlock(block);
      
      refreshBlocks();
      onRefresh();
      setBlockModalOpen(false);
  };
  
  const handleDeleteBlock = (id: string) => {
      const currentBlocks = taskManager.getAllTimeBlocks();
      const block = currentBlocks.find(b => b.id === id);
      
      if (block && block.isRecurring) {
          setRecurrenceAction({ isOpen: true, mode: 'delete', entityType: 'block', entityId: id, payload: { originalDate: newBlockDate?.getTime() || block.startTime } });
          setBlockModalOpen(false);
      } else {
          setConfirmDeleteId(id);
      }
  };

  const executeSingleDelete = () => {
      if (confirmDeleteId) {
          taskManager.deleteTimeBlock(confirmDeleteId); 
          setTimeBlocks([...taskManager.getAllTimeBlocks()]);
          onRefresh();
          setBlockModalOpen(false);
          setConfirmDeleteId(null);
      }
  };
  
  const handleGridClick = (date: Date) => {
      const end = new Date(date.getTime() + 3600000);
      setCreationPromptRange({ start: date, end });
  };

  const handleCreateRange = (start: Date, end: Date) => {
      setCreationPromptRange({ start, end });
  };

  const handleCreateSelection = (type: 'task' | 'block') => {
      if (!creationPromptRange) return;
      
      if (type === 'task') {
          const duration = Math.round((creationPromptRange.end.getTime() - creationPromptRange.start.getTime()) / 60000);
          onCreateTask(creationPromptRange.start, duration);
      } else {
          setNewBlockDate(creationPromptRange.start);
          setNewBlockRange({ start: creationPromptRange.start, end: creationPromptRange.end });
          setEditingBlock(undefined);
          setBlockModalOpen(true);
      }
      setCreationPromptRange(null);
  };

  // Resize Handlers
  const handleResizeTask = (taskId: string, newStart: number, newEnd: number) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const newDuration = Math.round((newEnd - newStart) / 60000);
      taskManager.updateTask(taskId, { actualDurationMinutes: undefined, timeEstimateMinutes: newDuration });
      onRefresh();
  };

  const handleResizeBlock = (blockId: string, newStart: number, newEnd: number) => {
      const block = timeBlocks.find(b => b.id === blockId);
      if (!block) return;
      if (block.isRecurring) {
          setPendingBlockMove({ id: blockId, newStart, newEnd, originalDate: newStart }); 
          setRecurrenceAction({ isOpen: true, mode: 'move', entityType: 'block', entityId: blockId });
      } else {
          taskManager.moveTimeBlock(blockId, newStart, newEnd);
          refreshBlocks();
          onRefresh();
      }
  };

  // Recurrence Confirmation
  const handleRecurrenceConfirm = (strategy: RecurrenceUpdateMode) => {
    if (recurrenceAction.entityType === 'block') {
        if (recurrenceAction.mode === 'delete') taskManager.deleteTimeBlock(recurrenceAction.entityId, strategy, recurrenceAction.payload?.originalDate);
        else if (recurrenceAction.mode === 'move' && pendingBlockMove) taskManager.moveTimeBlock(pendingBlockMove.id, pendingBlockMove.newStart, pendingBlockMove.newEnd, strategy, pendingBlockMove.originalDate);
        setTimeBlocks([...taskManager.getAllTimeBlocks()]); 
        onRefresh(); 
    } else if (recurrenceAction.entityType === 'task' && pendingTaskMove) {
        taskManager.splitRecurringTask(pendingTaskMove.id, pendingTaskMove.newDate, strategy, pendingTaskMove.originalDate, pendingTaskMove.isAllDay);
        onRefresh();
    }
    setRecurrenceAction({ ...recurrenceAction, isOpen: false });
    setPendingBlockMove(null);
    setPendingTaskMove(null);
  };

  const handleUnscheduleWrapper = (taskId: string) => {
      onUnschedule(taskId);
      handleDragEnd();
  };

  // Drop Handlers
  const handleDropOnColumn = (e: React.DragEvent, day: Date, previewTime: string | null) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const blockId = e.dataTransfer.getData('blockId');
      const instanceDateTs = Number(e.dataTransfer.getData('instanceDate') || 0);

      const newTime = new Date(day);
      if (previewTime) {
           const [h, m] = previewTime.split(':').map(Number);
           newTime.setHours(h, m, 0, 0);
      } else {
           newTime.setHours(12, 0, 0, 0);
      }

      if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.isRecurring && instanceDateTs) {
            // Must explicitly clear isAllDay when dragging to a time column
            setPendingTaskMove({ id: taskId, newDate: newTime, originalDate: instanceDateTs, isAllDay: false });
            setRecurrenceAction({ isOpen: true, mode: 'move', entityType: 'task', entityId: taskId });
        } else {
            onReschedule(taskId, newTime, true);
        }
      } else if (blockId) {
          const block = timeBlocks.find(b => b.id === blockId);
          if (block) {
              const dur = block.endTime - block.startTime;
              const newStart = newTime.getTime();
              const newEnd = newStart + dur;
              if (block.isRecurring) {
                  setPendingBlockMove({ id: block.id, newStart, newEnd, originalDate: instanceDateTs || block.startTime });
                  setRecurrenceAction({ isOpen: true, mode: 'move', entityType: 'block', entityId: block.id });
              } else {
                  taskManager.moveTimeBlock(block.id, newStart, newEnd);
                  refreshBlocks();
                  onRefresh();
              }
          }
      }
      handleDragEnd();
  };

  const handleDropOnAllDay = (e: React.DragEvent, day: Date) => {
       e.preventDefault();
       const taskId = e.dataTransfer.getData('taskId');
       const blockId = e.dataTransfer.getData('blockId');
       const instanceDateTs = Number(e.dataTransfer.getData('instanceDate') || 0);
       
       if (taskId) {
           const task = tasks.find(t => t.id === taskId);
           if (task && task.isRecurring && instanceDateTs) {
             // Must explicitly set isAllDay when dragging to all day area
             setPendingTaskMove({ id: taskId, newDate: day, originalDate: instanceDateTs, isAllDay: true });
             setRecurrenceAction({ isOpen: true, mode: 'move', entityType: 'task', entityId: taskId });
           } else {
             onReschedule(taskId, day, false, true);
           }
       } else if (blockId) {
           const block = timeBlocks.find(b => b.id === blockId);
           if (block) {
               const dayStart = new Date(day);
               dayStart.setHours(0,0,0,0);
               const dayEnd = new Date(day);
               dayEnd.setHours(23, 59, 59, 999);
               
               const newStart = dayStart.getTime();
               const newEnd = dayEnd.getTime();
               
               if (block.isRecurring) {
                   setPendingBlockMove({ id: block.id, newStart, newEnd, originalDate: instanceDateTs || block.startTime });
                   setRecurrenceAction({ isOpen: true, mode: 'move', entityType: 'block', entityId: block.id });
               } else {
                   taskManager.moveTimeBlock(block.id, newStart, newEnd);
                   refreshBlocks();
                   onRefresh();
               }
           }
       }
       handleDragEnd();
  };

  const gridDays = getDaysInGrid(currentDate, viewType);
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const isTimeGrid = ['day', '3days', 'week'].includes(viewType);
  const isDayView = viewType === 'day';
  const isMobileDaySplit = isDayView && showUnscheduled;
  const isMobileBottomSplit = !isDayView && showUnscheduled;

  const containerClasses = `
    relative h-full w-full overflow-hidden flex 
    ${isMobileDaySplit ? 'flex-row' : 'flex-col'} 
    md:flex-row md:justify-center md:items-start
  `;
  
  const calendarWrapperClasses = `
    flex flex-col items-center transition-all duration-300 ease-in-out min-w-0
    ${isMobileDaySplit ? 'w-1/2 h-full' : (isMobileBottomSplit ? 'w-full h-1/2' : 'w-full h-full')}
    md:h-full md:w-auto md:flex-1 md:max-w-[1000px]
  `;

  const availableViews = [
      { id: 'day', label: t.day }, { id: '3days', label: t.days3 }, { id: 'week', label: t.week },
      { id: '2weeks', label: t.weeks2 }, { id: 'month', label: t.month }
  ];

  const unscheduledTasks = tasks.filter(t => !t.scheduledTime && !['Completed', 'Cancelled'].includes(t.status));
  const getTasksForGrid = (date: Date) => getTasksForDay(filteredTasks, date, viewType, t.usefulHabitTag);

  return (
    <div className={containerClasses} onDragEnd={handleDragEnd}>
      <TimeBlockModal 
          isOpen={blockModalOpen} 
          onClose={() => setBlockModalOpen(false)} 
          onSave={handleSaveBlock} 
          onDelete={handleDeleteBlock} 
          initialBlock={editingBlock} 
          initialDate={newBlockDate} 
          initialRange={newBlockRange}
          t={t}
      />
      <RecurrenceActionModal 
          isOpen={recurrenceAction.isOpen} onClose={() => setRecurrenceAction({ ...recurrenceAction, isOpen: false })} onConfirm={handleRecurrenceConfirm} mode={recurrenceAction.mode} t={t}
      />
      
      <ConfirmationModal
          isOpen={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={executeSingleDelete}
          title={t.delete}
          message={t.deleteGroupConfirm?.replace('group', 'item') || "Are you sure you want to delete this item?"}
          t={t}
      />

      {creationPromptRange && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 w-full max-w-sm">
                 <div className="flex flex-col items-center text-center">
                     <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                         <i className="far fa-calendar-plus text-xl"></i>
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{t.createWhat}</h3>
                     <div className="text-xs text-gray-500 mb-4 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                         {creationPromptRange.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {creationPromptRange.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </div>
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t.createWhatDesc}</p>
                     
                     <div className="flex flex-col gap-3 w-full">
                         <button 
                             onClick={() => handleCreateSelection('task')}
                             className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                         >
                             <i className="fas fa-check-square"></i> {t.task}
                         </button>
                         <button 
                             onClick={() => handleCreateSelection('block')}
                             className="w-full py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                         >
                             <i className="far fa-clock"></i> {t.timeBlock}
                         </button>
                         <button 
                             onClick={() => setCreationPromptRange(null)}
                             className="mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                         >
                             {t.cancel}
                         </button>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {/* LEFT GHOST SPACER (Balance Right Sidebar) - Visible on large screens if Right is open but Left is closed */}
      <div className={`hidden 2xl:block transition-all duration-300 ease-in-out shrink-0 ${showUnscheduled && !showFilters ? 'w-64' : 'w-0'}`}></div>

      {/* FILTER SIDEBAR (Left) */}
      <CalendarFilterSidebar 
          isOpen={showFilters}
          onClose={() => toggleFilters(false)}
          filters={filters}
          onFilterChange={setFilters}
          currentDate={currentDate}
          onSelectDate={(d) => { setCurrentDate(d); setViewType('day'); }}
          t={t}
          language={language}
      />

      <div className={calendarWrapperClasses}>
        <div className="w-full mx-auto bg-white dark:bg-gray-800 border dark:border-gray-700 md:rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            
            <CalendarHeader 
                currentDate={currentDate} viewType={viewType} onViewChange={(v) => setViewType(v)}
                onPrev={handlePrev} onNext={handleNext} onToday={() => setCurrentDate(new Date())}
                onToggleUnscheduled={() => toggleUnscheduled()} showUnscheduled={showUnscheduled}
                onToggleFilters={() => toggleFilters()} showFilters={showFilters}
                onDropTask={handleUnscheduleWrapper} 
                unscheduledCount={unscheduledTasks.length} isDragging={isDraggingFromCalendar}
                formatHeaderDate={() => currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                t={t} availableViews={availableViews}
            />

            {isTimeGrid ? (
                <TimeGridView 
                    gridDays={gridDays} tasks={filteredTasks} timeBlocks={filteredBlocks} now={now}
                    draggedTaskId={draggedTaskId} draggedBlockId={draggedBlockId} isDraggingFromCalendar={isDraggingFromCalendar}
                    onEditTask={onEdit} onEditBlock={(b, d) => { setEditingBlock(b); setNewBlockDate(d); setBlockModalOpen(true); }}
                    onToggleTask={handleToggleTask} onTaskDragStart={handleTaskDragStart} onBlockDragStart={handleBlockDragStart}
                    onDragEnd={handleDragEnd} onDropOnColumn={handleDropOnColumn} onDropOnAllDay={handleDropOnAllDay}
                    onCreateBlock={handleGridClick}
                    onCreateRange={handleCreateRange}
                    onResizeTask={handleResizeTask}
                    onResizeBlock={handleResizeBlock}
                    locale={locale}
                    getTasksForDay={getTasksForGrid}
                    viewType={viewType}
                />
            ) : (
                <MonthGridView 
                    gridDays={gridDays} tasks={filteredTasks} currentDate={currentDate} viewType={viewType as 'month'|'2weeks'}
                    draggedTaskId={draggedTaskId} isDraggingFromCalendar={isDraggingFromCalendar}
                    onEditTask={onEdit} onTaskDragStart={handleTaskDragStart} onDragEnd={handleDragEnd}
                    onDropOnDay={(e, d) => handleDropOnAllDay(e, d)} 
                    onSelectDay={(d) => { setViewType('day'); setCurrentDate(d); }}
                    onToggleTask={handleToggleTask} 
                    locale={locale}
                    getTasksForDay={getTasksForGrid}
                />
            )}
        </div>
      </div>
      
      {/* RIGHT GHOST SPACER (Balance Left Sidebar) - Visible on large screens if Left is open but Right is closed */}
      <div className={`hidden 2xl:block transition-all duration-300 ease-in-out shrink-0 ${showFilters && !showUnscheduled ? 'w-64' : 'w-0'}`}></div>

      <CalendarSidebar 
          showUnscheduled={showUnscheduled} isDraggingFromCalendar={isDraggingFromCalendar} unscheduledTasks={unscheduledTasks}
          onUnscheduleDrop={handleUnscheduleWrapper} 
          onTaskDragStart={(e, id) => handleTaskDragStart(e, id)} onEdit={onEdit}
          onDragEnd={handleDragEnd} onClose={() => toggleUnscheduled(false)} isDayView={isDayView} t={t}
      />
    </div>
  );
};
