

import React, { useState } from 'react';
import { Task } from '../../types';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';

interface MonthGridViewProps {
  gridDays: Date[];
  tasks: Task[];
  currentDate: Date;
  viewType: '2weeks' | 'month';
  draggedTaskId: string | null;
  isDraggingFromCalendar: boolean;
  onEditTask: (task: Task, date: Date) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string, date: Date) => void;
  onDragEnd: () => void;
  onDropOnDay: (e: React.DragEvent, day: Date) => void;
  onSelectDay: (day: Date) => void;
  onToggleTask?: (e: React.MouseEvent, taskId: string, instanceDateTs: number) => void; // Added prop
  locale: string;
  getTasksForDay?: (date: Date) => Task[]; // Optional override
}

// Use paint-order: stroke fill to create a clean halo effect behind text
const TEXT_STROKE_CLASS = "text-gray-900 dark:text-white [-webkit-text-stroke:3px_white] dark:[-webkit-text-stroke:3px_rgba(31,41,55,1)] [paint-order:stroke_fill] font-bold tracking-wide";

export const MonthGridView: React.FC<MonthGridViewProps> = ({
  gridDays, tasks, currentDate, viewType, draggedTaskId, isDraggingFromCalendar,
  onEditTask, onTaskDragStart, onDragEnd, onDropOnDay, onSelectDay, onToggleTask, locale,
  getTasksForDay: propGetTasksForDay
}) => {
  const { getTasksForDay: defaultGetTasksForDay } = useCalendarLogic();
  // Use passed prop or default hook logic
  const getTasksForDay = propGetTasksForDay || ((d) => defaultGetTasksForDay(tasks, d));

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const getRecurrenceBadge = (task: Task) => {
    if (!task.isRecurring || !task.recurrencePattern) return null;
    return (
        <span className="w-3 h-3 flex items-center justify-center bg-indigo-600 text-white rounded-full shrink-0 ml-1 border border-white dark:border-gray-800 shadow-sm">
            <i className="fas fa-sync-alt text-[6px]"></i>
        </span>
    );
  };

  const getGridClass = () => viewType === '2weeks' ? 'grid-cols-7 grid-rows-2' : 'grid-cols-7 grid-rows-6';
  const isToday = (d: Date) => { const n = new Date(); return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

  // Helper for overdue check
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
            {(locale.startsWith('ru') ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 last:border-r-0">
                {d}
            </div>
            ))}
        </div>

        <div className={`flex-1 overflow-hidden bg-white dark:bg-gray-800 grid ${getGridClass()} items-stretch`}>
            {gridDays.map((day, idx) => {
                const dayTasks = getTasksForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const highlight = isToday(day);
                const dateKey = day.toISOString();
                const dayTs = day.getTime();

                return (
                <div 
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
                    onDragLeave={() => setDragOverDate(null)}
                    onDrop={(e) => { e.preventDefault(); onDropOnDay(e, day); setDragOverDate(null); }}
                    className={`
                    border-b border-r border-gray-200 dark:border-gray-700 p-0.5 transition-colors relative group flex flex-col justify-start gap-0.5 min-h-0 cursor-pointer
                    ${viewType === 'month' && !isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'}
                    ${highlight ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}
                    ${dragOverDate === dateKey ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 ring-inset z-10' : ''}
                    `}
                >
                    <div className="flex items-center justify-between shrink-0 px-0.5 pt-0.5 gap-1 pointer-events-none">
                        <span className={`text-[9px] md:text-xs font-semibold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${highlight ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm' : ''}`}>
                            {day.getDate()}
                        </span>
                    </div>

                    <div className="space-y-0.5 overflow-y-auto flex-1 px-0.5 custom-scrollbar w-full">
                    {dayTasks.map(task => {
                        let timeLabel = '';
                        if (task.scheduledTime && !task.isAllDay) {
                            timeLabel = new Date(task.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                        const isCompleted = task.status === 'Completed' || task.recurrencePattern?.completedInstances?.includes(dayTs);
                        // In Month view (which is date-based), overdue means strictly previous days
                        const isOverdue = !isCompleted && dayTs < startOfToday;
                        
                        const pointerClass = (isDraggingFromCalendar && draggedTaskId !== task.id) ? 'pointer-events-none opacity-40' : '';
                        
                        return (
                        <div
                            key={`${task.id}-${idx}`}
                            draggable
                            onDragStart={(e) => onTaskDragStart(e, task.id, day)}
                            onDragEnd={onDragEnd}
                            onClick={(e) => { e.stopPropagation(); onEditTask(task, day); }}
                            style={task.color ? { borderLeftColor: task.color } : {}}
                            className={`
                            w-full text-left px-1 py-0.5 flex flex-col gap-0.5 rounded-[4px] shadow-sm hover:scale-[1.02] cursor-grab active:cursor-grabbing block relative group/item
                            ${isCompleted ? 'opacity-60' : ''}
                            bg-transparent
                            ${isOverdue ? 'border-red-500 dark:border-red-500 border-2' : 'border-gray-200 dark:border-gray-600 border'}
                            ${task.color ? 'border-l-4' : 'border-l-2 border-indigo-500'}
                            ${pointerClass}
                            ${task.id === draggedTaskId ? 'opacity-20' : ''}
                            `}
                        >
                            <div className="flex items-start gap-1">
                                {/* Desktop Checkbox: Hidden on Mobile, Flex on MD */}
                                {onToggleTask && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (onToggleTask) onToggleTask(e, task.id, dayTs); 
                                        }}
                                        className={`
                                            hidden md:flex w-3 h-3 rounded-full border items-center justify-center shrink-0 mt-0.5 z-20 pointer-events-auto transition-colors
                                            ${isCompleted 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                                            }
                                        `}
                                    >
                                        {isCompleted && <i className="fas fa-check text-[6px]"></i>}
                                    </button>
                                )}

                                <div className="pointer-events-none flex flex-col min-w-0 flex-1">
                                    <span className={`truncate w-full text-[8px] md:text-[10px] leading-tight font-medium ${TEXT_STROKE_CLASS} ${isCompleted ? 'line-through decoration-gray-500' : ''}`}>{task.title}</span>
                                    
                                    {/* Only show time and badge if NOT in month view */}
                                    {viewType !== 'month' && (
                                        <div className={`flex items-center gap-0.5 min-w-0 opacity-90 mt-0.5 ${TEXT_STROKE_CLASS}`}>
                                            {timeLabel && <span className="text-[7px] md:text-[9px] shrink-0">{timeLabel}</span>}
                                            {getRecurrenceBadge(task)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Mobile Only: Small bar to indicate completeness state */}
                            <div className={`md:hidden h-1 w-full rounded-full mt-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                        </div>
                        );
                    })}
                    </div>
                </div>
                );
            })}
        </div>
    </div>
  );
};