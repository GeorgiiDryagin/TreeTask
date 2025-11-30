import React, { useMemo } from 'react';
import { Task } from '../types';

interface EisenhowerMatrixViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  now: number;
  t: any;
}

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({ tasks, onEdit, now, t }) => {
  
  // Categorize tasks
  const matrix = useMemo(() => {
      // Logic Change: "Urgent" now includes tasks due within the next 2 weeks (14 days).
      // "Not Urgent" = No Date OR Date > 2 weeks from now.
      const d = new Date(now);
      d.setDate(d.getDate() + 14);
      d.setHours(23, 59, 59, 999);
      const urgencyCutoff = d.getTime();
      
      const q1: Task[] = []; // Urgent & Important
      const q2: Task[] = []; // Not Urgent & Important
      const q3: Task[] = []; // Urgent & Not Important
      const q4: Task[] = []; // Not Urgent & Not Important

      tasks.forEach(task => {
          if (['Completed', 'Cancelled'].includes(task.status)) return;

          // Exclude Habits
          const isHabit = task.taskType === 'Health' || 
                          task.taskType === 'Habit' || 
                          (task.tags && task.tags.includes(t.usefulHabitTag));
          
          if (isHabit) return;

          const isImportant = task.priority === 'Critical' || task.priority === 'High';
          
          // Urgent = Scheduled for today/past/next 2 weeks. No date = Not Urgent.
          const isUrgent = task.scheduledTime ? task.scheduledTime <= urgencyCutoff : false;

          if (isImportant && isUrgent) q1.push(task);
          else if (isImportant && !isUrgent) q2.push(task);
          else if (!isImportant && isUrgent) q3.push(task);
          else q4.push(task);
      });

      return { q1, q2, q3, q4 };
  }, [tasks, now, t]);

  const renderQuadrant = (title: string, subtitle: string, items: Task[], colorClass: string, icon: string) => (
      <div className={`flex flex-col h-full rounded-xl border-2 ${colorClass} bg-white dark:bg-gray-800 overflow-hidden shadow-sm`}>
          <div className={`px-2 py-1.5 border-b-2 flex justify-between items-center ${colorClass.replace('border-', 'bg-').replace('-500', '-50')} dark:bg-opacity-10 shrink-0`}>
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-2 leading-tight">
                  <h3 className={`font-bold text-[10px] md:text-xs uppercase tracking-wider ${colorClass.replace('border-', 'text-')}`}>{title}</h3>
                  <span className="text-[8px] md:text-[10px] text-gray-500 dark:text-gray-400 font-medium hidden sm:inline">{subtitle}</span>
              </div>
              <i className={`fas ${icon} text-xs md:text-sm opacity-50 ${colorClass.replace('border-', 'text-')}`}></i>
          </div>
          <div className="flex-1 overflow-y-auto p-1 md:p-2 space-y-1 md:space-y-1.5 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30">
              {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-[10px] md:text-xs italic text-center p-2">
                      {t.noDescendants}
                  </div>
              ) : (
                  items.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => onEdit(task)}
                        className="bg-white dark:bg-gray-700 px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex items-center justify-between gap-1 md:gap-2"
                      >
                          <div className="text-[10px] md:text-xs font-medium text-gray-800 dark:text-gray-100 truncate flex-1 leading-tight">{task.title}</div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                              {/* Date */}
                              {task.scheduledTime && (
                                  <span className={`text-[8px] md:text-[9px] flex items-center gap-0.5 ${task.scheduledTime < now ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                      <i className="far fa-calendar hidden sm:inline"></i>
                                      {new Date(task.scheduledTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                  </span>
                              )}
                              {/* Priority Badge */}
                              <span className={`text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded border leading-none
                                  ${task.priority === 'Critical' ? 'text-red-600 bg-red-50 border-red-100' : 
                                    task.priority === 'High' ? 'text-orange-600 bg-orange-50 border-orange-100' : 
                                    'text-gray-500 bg-gray-50 border-gray-200'}
                              `}>
                                  {task.priority.substring(0, 1)}
                              </span>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  return (
    <div className="h-full w-full p-2 grid grid-cols-2 grid-rows-2 gap-2 overflow-hidden">
        {/* Row 1 Left: Urgent & Not Important (Q3 - Delegate) */}
        {renderQuadrant(t.urgentNotImportant, t.delegate, matrix.q3, 'border-orange-500', 'fa-user-clock')}

        {/* Row 1 Right: Urgent & Important (Q1 - Do First) */}
        {renderQuadrant(t.urgentImportant, t.doFirst, matrix.q1, 'border-red-500', 'fa-fire')}
        
        {/* Row 2 Left: Not Urgent & Not Important (Q4 - Delete/Later) */}
        {renderQuadrant(t.notUrgentNotImportant, t.dontDo, matrix.q4, 'border-gray-400', 'fa-trash-alt')}

        {/* Row 2 Right: Not Urgent & Important (Q2 - Schedule) */}
        {renderQuadrant(t.notUrgentImportant, t.schedule, matrix.q2, 'border-blue-500', 'fa-calendar-check')}
    </div>
  );
};