
import React, { useState } from 'react';
import { Task } from '../../types';

interface CalendarSidebarProps {
  showUnscheduled: boolean;
  isDraggingFromCalendar: boolean;
  unscheduledTasks: Task[];
  onUnscheduleDrop: (taskId: string) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string) => void;
  onEdit: (task: Task) => void;
  onDragEnd: () => void;
  onClose: () => void;
  isDayView: boolean;
  t: any;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  showUnscheduled, isDraggingFromCalendar, unscheduledTasks,
  onUnscheduleDrop, onTaskDragStart, onEdit, onDragEnd, onClose, isDayView, t
}) => {
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);

  // Layout Classes
  // Match CalendarFilterSidebar logic for identical animation appearance
  let wrapperClasses = "flex flex-col transition-all duration-300 ease-in-out z-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden";

  if (!showUnscheduled) {
      wrapperClasses += " hidden md:block md:w-0 md:opacity-0 md:border-0";
  } else {
      if (isDayView) {
          wrapperClasses += " w-1/2 h-full border-l order-2";
      } else {
          wrapperClasses += " w-full h-1/2 border-t order-2";
      }
      wrapperClasses += " md:order-none md:w-64 md:h-full md:rounded-xl md:border md:shadow-sm md:opacity-100";
  }

  // Animation: -translate-x-full (hidden, far left) -> translate-x-0 (visible, centered)
  // This creates a Left -> Right slide effect
  return (
    <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsSidebarDragOver(true); }}
        onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsSidebarDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsSidebarDragOver(false); const taskId = e.dataTransfer.getData('taskId'); if (taskId) { onUnscheduleDrop(taskId); }}}
        className={wrapperClasses}
      >
        {/* Inner Content with Fixed Width for Slide Animation */}
        <div className={`h-full w-full md:w-64 md:min-w-[16rem] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${showUnscheduled ? 'translate-x-0' : '-translate-x-full'} ${isSidebarDragOver || isDraggingFromCalendar ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
            <div className="p-3 bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 flex justify-between items-center whitespace-nowrap shrink-0">
                <div className="flex items-center gap-2 text-sm min-w-0">
                    <i className="fas fa-inbox text-indigo-500 shrink-0"></i>
                    <span className="truncate">{t.unscheduled}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300 shrink-0">{unscheduledTasks.length}</span>
                </div>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 transition-colors shrink-0"><i className="fas fa-times text-xs"></i></button>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar relative ${isSidebarDragOver ? 'ring-inset ring-2 ring-indigo-400' : ''}`}>
                {unscheduledTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs p-4 text-center">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2"><i className="fas fa-check text-gray-300 dark:text-gray-500"></i></div><p>Empty</p>
                    </div>
                ) : (
                    unscheduledTasks.map(task => {
                        const sideBorderStyle = task.color ? { borderLeftColor: task.color } : {};
                        const sideBorderClass = task.color ? 'border-l-4' : '';
                        return (
                            <div key={task.id} draggable onDragStart={(e) => onTaskDragStart(e, task.id)} onDragEnd={onDragEnd} onClick={() => onEdit(task)} className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2 rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all ${sideBorderClass}`} style={sideBorderStyle}>
                                <div className="font-medium text-gray-800 dark:text-gray-200 break-words leading-tight text-xs mb-1.5">{task.title}</div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${task.priority === 'Critical' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800' : task.priority === 'High' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800' : task.priority === 'Medium' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500'}`}>
                                        {task.priority === 'Low' ? t.low : task.priority === 'Medium' ? t.medium : task.priority === 'High' ? t.high : t.critical}
                                    </span>
                                    <i className="fas fa-grip-vertical text-gray-300 dark:text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
  );
};
