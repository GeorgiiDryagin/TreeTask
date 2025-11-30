import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskPriority } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, instanceDate?: number) => void;
  onAddSubtask?: (parentId: string) => void;
  onDelete?: (id: string) => void;
  onMoveTask?: (taskId: string, newParentId: string | null) => void;
  onEdit?: (task: Task) => void;
  onFocus?: (taskId: string) => void;
  depth?: number;
  showHierarchy?: boolean;
  refreshData: () => void;
  onDragStartNotify?: (y: number) => void;
  onDragEndNotify?: () => void;
  readOnly?: boolean; 
  onRestore?: (id: string) => void;
  t?: any;
  language?: string;
  isRoutine?: boolean; 
  now?: number; 
  instanceDate?: number; 
  isContextHighlight?: boolean; 
  onOpenKanban?: (task: Task) => void;
  onOpenPomodoro?: (task: Task) => void; 
  onOpenReport?: (task: Task) => void; 
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onAddSubtask, 
  onDelete,
  onMoveTask,
  onEdit,
  onFocus,
  depth = 0,
  showHierarchy = false,
  refreshData,
  onDragStartNotify,
  onDragEndNotify,
  readOnly = false,
  onRestore,
  t,
  language,
  isRoutine = false,
  now,
  instanceDate,
  isContextHighlight = false,
  onOpenKanban,
  onOpenPomodoro,
  onOpenReport,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Completion Status Logic
  let isCompleted = ['Completed', 'Cancelled'].includes(task.status);
  
  // If we have an instance date (recurring task in a specific context like "Today"), check if THAT instance is done
  if (instanceDate && task.isRecurring && task.recurrencePattern?.completedInstances) {
      const d = new Date(instanceDate);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (task.recurrencePattern.completedInstances.includes(dayStart)) {
          isCompleted = true;
      }
  }

  const hasPendingSubtasks = task.pendingChildrenCount > 0;
  const hasChildren = task.totalChildrenCount > 0;

  // --- TIME LOGIC FIX ---
  const currentTime = now || Date.now();
  let isOverdue = false;
  let isActiveTime = false;
  let effectiveStartTime: number | undefined = undefined;
  let effectiveEndTime: number | undefined = undefined;

  if (!isCompleted && task.scheduledTime) {
      if (task.isAllDay) {
          // All Day: Overdue if strictly before today (start of today)
          // For All Day, instanceDate usually aligns with 00:00 anyway.
          const checkDate = instanceDate || task.scheduledTime;
          const startOfToday = new Date(currentTime);
          startOfToday.setHours(0,0,0,0);
          
          const taskDate = new Date(checkDate);
          taskDate.setHours(0,0,0,0);
          
          if (taskDate.getTime() < startOfToday.getTime()) isOverdue = true;
          if (taskDate.getTime() === startOfToday.getTime()) isActiveTime = true;
          
          effectiveStartTime = taskDate.getTime();
      } else {
          // Precise Time Logic
          // 1. Determine Effective Start Time
          if (instanceDate && task.isRecurring) {
              // RECURRING FIX: Merge Instance Date (Year/Month/Day) with Original Schedule (Hour/Min)
              const iDate = new Date(instanceDate);
              const original = new Date(task.scheduledTime);
              iDate.setHours(original.getHours(), original.getMinutes(), 0, 0);
              effectiveStartTime = iDate.getTime();
          } else {
              // Regular task
              effectiveStartTime = task.scheduledTime;
          }

          // 2. Determine Effective End Time
          // If 0 duration, default to 1 minute to avoid instant overdue/expiration
          const durationMinutes = task.timeEstimateMinutes || 1;
          const durationMs = durationMinutes * 60000;
          effectiveEndTime = effectiveStartTime + durationMs;
          
          // 3. Status Checks
          // Overdue: Only if Current Time > End Time
          // Active: Start Time <= Current Time <= End Time
          
          if (effectiveEndTime < currentTime) {
              isOverdue = true;
          } else if (effectiveStartTime <= currentTime && currentTime <= effectiveEndTime) {
              isActiveTime = true;
          }
      }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    if (isMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);


  const handleDragStart = (e: React.DragEvent) => {
    if (!onMoveTask || readOnly) return;
    
    // Calculate vertical center of the row to position the global drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + (rect.height / 2);

    if (onDragStartNotify) onDragStartNotify(midY);
    setIsDragging(true);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    if (onDragEndNotify) onDragEndNotify();
    setIsDragging(false);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onMoveTask || readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!onMoveTask || readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('taskId');
    if (draggedId && draggedId !== task.id) {
      onMoveTask(draggedId, task.id);
    }
  };

  const handleToggleClick = () => {
    if (readOnly) return;
    if (!isCompleted && hasPendingSubtasks) {
      return; 
    }
    onToggle(task.id, instanceDate);
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'Critical': return 'text-red-600 bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'High': return 'text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'Medium': return 'text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'Low': return 'text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getPriorityLabel = (p: TaskPriority) => {
      if (!t) return p;
      switch(p) {
          case 'Low': return t.low;
          case 'Medium': return t.medium;
          case 'High': return t.high;
          case 'Critical': return t.critical;
          default: return p;
      }
  };
  
  const formatDateSimple = (timestamp: number) => {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
  };

  const getRecurrenceLabel = () => {
      if (!task.isRecurring || !task.recurrencePattern) return '';
      
      const pat = task.recurrencePattern;
      let freqLabel = pat.frequency === 'Weekly' ? (t?.weekly || 'Weekly') : (pat.frequency === 'Monthly' ? (t?.monthly || 'Monthly') : (t?.daily || 'Daily'));
      
      let limitLabel = '';
      if (pat.endCondition === 'After X occurrences' && pat.endCount) {
          limitLabel = `(x${pat.endCount})`;
      } else if (pat.endCondition === 'Until specific date' && pat.endDate) {
          const d = new Date(pat.endDate);
          limitLabel = `(-> ${d.getDate()}.${d.getMonth()+1})`;
      }
      
      return `${freqLabel} ${limitLabel}`;
  };

  // Progress Ring Calculation
  const totalChildren = task.totalChildrenCount || 0;
  const pendingChildren = task.pendingChildrenCount || 0;
  const completedChildren = Math.max(0, totalChildren - pendingChildren);
  const progressPercentage = totalChildren > 0 ? Math.min(1, Math.max(0, completedChildren / totalChildren)) : 0;
  
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isNaN(progressPercentage) ? circumference : circumference - (progressPercentage * circumference);

  const borderColorClass = task.color ? '' : 'border-blue-500';
  const borderStyle = task.color ? { borderLeftColor: task.color } : {};

  let containerClasses = `
    relative flex flex-col mb-1.5 rounded-lg shadow-sm transition-all
    ${isMenuOpen ? 'z-40' : ''}
    ${isDragOver 
        ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 z-20 transform scale-[1.02]' 
        : (isCompleted ? 'bg-white dark:bg-gray-800 opacity-60 hover:opacity-100' : 'bg-white dark:bg-gray-800')
    }
    ${isDragging ? 'opacity-40' : ''}
    ${!!onMoveTask && !readOnly ? 'cursor-grab active:cursor-grabbing' : ''}
  `;

  // Apply Active Highlight
  if (isActiveTime && !isCompleted && !isDragOver) {
      containerClasses += " ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50/10";
  }

  return (
    <div 
      draggable={!!onMoveTask && !readOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={containerClasses}
      style={{ marginLeft: showHierarchy ? `${depth * 1.5}rem` : 0 }}
    >
      <div 
        className={`flex items-center p-2 border-l-4 rounded-lg ${borderColorClass}`}
        style={borderStyle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!!onMoveTask && !readOnly && (
             <i className="fas fa-grip-vertical text-gray-300 dark:text-gray-600 hover:text-gray-500 mr-0.5 cursor-grab text-sm"></i>
          )}
          
          <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
             {totalChildren > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke={isCompleted ? "#22c55e" : "#3b82f6"}
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
             )}
             
             <button
              onClick={handleToggleClick}
              disabled={(!isCompleted && hasPendingSubtasks) || readOnly}
              title={isCompleted ? (t?.markIncomplete || "Mark as Incomplete") : (hasPendingSubtasks ? (t?.lockedSubtasks || "Locked") : (t?.markComplete || "Mark as Completed"))}
              className={`
                relative w-4 h-4 rounded-full flex items-center justify-center transition-all z-10 m-0 p-0
                ${isCompleted 
                  ? 'bg-green-500 text-white cursor-pointer' 
                  : (hasPendingSubtasks 
                      ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 text-gray-400 cursor-not-allowed' 
                      : (isContextHighlight
                          ? 'bg-white dark:bg-gray-800 border-[3px] border-emerald-500 dark:border-emerald-400 text-transparent hover:text-emerald-500 cursor-pointer'
                          : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-500 hover:border-blue-500 text-transparent hover:text-blue-200 cursor-pointer'
                        )
                    )
                }
                ${readOnly ? 'cursor-default' : ''}
              `}
            >
               {(!isCompleted && hasPendingSubtasks) ? (
                   <i className="fas fa-lock text-[0.5rem]"></i>
               ) : (
                   <i className="fas fa-check text-[0.5rem]"></i>
               )}
            </button>
          </div>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {task.title}
              </span>
              <span className={`text-[0.65rem] px-1.5 py-0.5 rounded border font-semibold ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </span>
              {task.taskType && (
                 <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                   {task.taskType.split('/')[0]}
                 </span>
              )}
              {task.pomodoroCount && task.pomodoroCount > 0 ? (
                  <span className="relative flex items-center justify-center w-4 h-4 bg-red-500 rounded-full text-white text-[7px] font-bold shadow-sm" title={`${task.pomodoroCount} pomodoros`}>
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-b-[3px] border-b-green-500"></div>
                      {task.pomodoroCount}
                  </span>
              ) : null}
            </div>

            {/* Metadata Container: Mobile 1 line (truncate), Desktop full */}
            {/* Logic: w-[calc(100%-3.5rem)] reserves 3.5rem (approx 1.5cm/56px) on the right for buttons on mobile. */}
            <div className="mt-1 text-left text-[0.65rem] text-gray-500 dark:text-gray-400 leading-relaxed truncate w-[calc(100%-3.5rem)] md:w-full md:whitespace-normal md:overflow-visible">
                
                {effectiveStartTime && (
                   <span className={`
                        inline-flex items-center px-1.5 py-0.5 rounded border mr-2 align-middle whitespace-nowrap mb-0.5
                        ${isOverdue 
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 font-bold'
                            : (isActiveTime ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 font-bold' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800')
                        }
                   `}>
                      <span className="flex items-center gap-1" title="Date">
                          <i className="far fa-calendar"></i>
                          {formatDateSimple(effectiveStartTime)}
                      </span>
                      
                      {!task.isAllDay && (
                          <span className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-current/20" title="Time">
                              <i className="far fa-clock"></i>
                              {new Date(effectiveStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                      )}

                      {task.timeEstimateMinutes && task.timeEstimateMinutes > 0 && (
                          <span className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-current/20" title="Duration">
                              <i className="fas fa-hourglass-half"></i>
                              {formatDuration(task.timeEstimateMinutes)}
                          </span>
                      )}

                      {isOverdue && <span className="ml-1 uppercase text-[0.55rem]">({t?.overdue || "Overdue"})</span>}
                      {isActiveTime && <span className="ml-1 uppercase text-[0.55rem] animate-pulse">●</span>}
                   </span>
                )}

                {task.isRecurring && (
                  <span className="inline-flex items-center text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 mr-2 align-middle gap-1 whitespace-nowrap mb-0.5">
                    <i className="fas fa-sync-alt"></i>
                    {getRecurrenceLabel()}
                  </span>
                )}

                {task.tags && task.tags.length > 0 && task.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 mr-2 align-middle whitespace-nowrap mb-0.5">
                        #{tag}
                    </span>
                ))}
            </div>
          </div>
        </div>
        
        {/* Actions Button Container with shrink-0 to prevent layout collapse */}
        <div className="flex items-center gap-1 ml-2 shrink-0" ref={menuRef}>
            
            {onRestore && (
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestore(task.id);
                    }}
                    className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors mr-2"
                 >
                     <i className="fas fa-trash-restore mr-1"></i> {t?.restore || "Restore"}
                 </button>
            )}

            {onOpenReport && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenReport(task);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={t?.report || "Report"}
                >
                    <i className="fas fa-chart-bar text-xs"></i>
                </button>
            )}

            {!readOnly && onEdit && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={t?.editTask || "Edit Task"}
                >
                    <i className="fas fa-pencil-alt text-xs"></i>
                </button>
            )}

            {!readOnly && (
                isRoutine && onDelete ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title={t?.delete || "Delete"}
                    >
                        <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                ) : (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <i className="fas fa-ellipsis-v text-sm"></i>
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            
                            {!isCompleted && onAddSubtask && !task.isRecurring && (
                                <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddSubtask(task.id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 flex items-center gap-2"
                                >
                                <i className="fas fa-plus-circle w-4"></i> {t?.addSubtask || "Add Subtask"}
                                </button>
                            )}
                            
                            {showHierarchy && onFocus && (
                                <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFocus(task.id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 flex items-center gap-2"
                                >
                                <i className="fas fa-crosshairs w-4"></i> {t?.focusSubtree || "Focus Subtree"}
                                </button>
                            )}

                            {onOpenPomodoro && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPomodoro(task);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 flex items-center gap-2"
                                >
                                    <i className="fas fa-stopwatch w-4"></i> {t?.pomodoro || "Pomodoro"}
                                </button>
                            )}

                            {showHierarchy && hasChildren && onOpenKanban && (
                                <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenKanban(task);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 flex items-center gap-2"
                                >
                                <i className="fas fa-columns w-4"></i> {t?.kanban || "Kanban Board"}
                                </button>
                            )}

                            {onDelete && (
                                <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(task.id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 border-t border-gray-50 dark:border-gray-700"
                                >
                                <i className="fas fa-trash-alt w-4"></i> {t?.delete || "Delete"}
                                </button>
                            )}
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
      </div>
    </div>
  );
};