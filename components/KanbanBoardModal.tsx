
import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface KanbanBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootTask: Task;
  subtasks: Task[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  t: any;
}

const STATUS_COLUMNS: TaskStatus[] = ['Not Started', 'In Progress', 'Completed', 'Cancelled'];

export const KanbanBoardModal: React.FC<KanbanBoardModalProps> = ({
  isOpen, onClose, rootTask, subtasks, onUpdateStatus, onEditTask, t
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  if (!isOpen) return null;

  const getTasksByStatus = (status: TaskStatus) => subtasks.filter(t => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      onUpdateStatus(draggedTaskId, status);
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const getStatusColor = (status: TaskStatus) => {
      switch(status) {
          case 'Not Started': return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
          case 'In Progress': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
          case 'Completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
          case 'Cancelled': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      }
  };

  const getStatusLabel = (s: TaskStatus) => {
      switch(s) {
          case 'Not Started': return t.notStarted;
          case 'In Progress': return t.inProgress;
          case 'Completed': return t.completed;
          case 'Cancelled': return t.cancelled;
          default: return s;
      }
  };

  const getPriorityLabel = (p: TaskPriority) => t[p.toLowerCase()] || p;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full h-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center shrink-0">
            <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t.kanban}</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="truncate max-w-md">{rootTask.title}</span>
                </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                <i className="fas fa-times text-lg"></i>
            </button>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-gray-50 dark:bg-gray-950">
            <div className="flex gap-4 h-full min-w-[800px]">
                {STATUS_COLUMNS.map(status => {
                    const columnTasks = getTasksByStatus(status);
                    const isDragTarget = dragOverCol === status;
                    
                    return (
                        <div 
                            key={status}
                            className={`flex-1 flex flex-col rounded-xl border-2 transition-colors ${getStatusColor(status)} ${isDragTarget ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}`}
                            onDragOver={(e) => handleDragOver(e, status)}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className="p-3 font-bold text-sm text-gray-700 dark:text-gray-300 flex justify-between items-center border-b border-black/5 dark:border-white/5">
                                <span>{getStatusLabel(status)}</span>
                                <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-xs">{columnTasks.length}</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {columnTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onClick={() => onEditTask(task)}
                                        className={`
                                            bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all
                                            ${draggedTaskId === task.id ? 'opacity-40' : 'opacity-100'}
                                        `}
                                    >
                                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{task.title}</div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold 
                                                ${task.priority === 'Critical' ? 'text-red-600 bg-red-50 border-red-100' : 
                                                  task.priority === 'High' ? 'text-orange-600 bg-orange-50 border-orange-100' : 
                                                  task.priority === 'Medium' ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                                                  'text-gray-600 bg-gray-50 border-gray-200'}
                                            `}>
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                            {task.scheduledTime && (
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <i className="far fa-calendar"></i>
                                                    {new Date(task.scheduledTime).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
