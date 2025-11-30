import React, { useState, useRef } from 'react';
import { Task, TimeBlock } from '../types';
import { TaskItem } from './TaskItem';
import { taskManager } from '../services/taskManager';

interface AllTasksViewProps {
  tasks: Task[];
  rootId?: string | null; 
  onToggle: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onDelete: (id: string) => void;
  onMoveTask: (taskId: string, newParentId: string | null) => void;
  onEdit: (task: Task) => void;
  onFocus?: (taskId: string) => void;
  refreshData: () => void;
  t: any;
  language: string;
  now?: number;
  onOpenKanban?: (task: Task) => void;
  onOpenPomodoro?: (task: Task) => void;
  activeBlocks?: TimeBlock[];
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ 
  tasks, 
  rootId = null,
  onToggle, 
  onAddSubtask, 
  onDelete,
  onMoveTask,
  onEdit,
  onFocus,
  refreshData,
  t,
  language,
  now,
  onOpenKanban,
  onOpenPomodoro,
  activeBlocks = []
}) => {
  const [dragState, setDragState] = useState<{ y: number, x: number, isMobile: boolean } | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTime = now || Date.now();

  const handleDragStart = (y: number) => {
    const isMobile = window.innerWidth < 768;
    let xPos = 0;
    
    if (isMobile) {
        xPos = 0;
    } else {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            xPos = rect.left - 128;
            if (xPos < -92) xPos = -92; 
        }
    }
    
    setDragState({ y, x: xPos, isMobile });
  };

  const handleMoveTaskInternal = (taskId: string, newParentId: string | null) => {
    setDragState(null);
    setIsDragOverRoot(false);
    onMoveTask(taskId, newParentId);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setIsDragOverRoot(false);
  };
  
  // Recursive render helper
  const renderTree = (parentId: string | null) => {
    const children = tasks.filter(t => t.parentId === parentId);
    
    if (children.length === 0) return null;

    return (
      <div className="flex flex-col relative">
        {children.map((task, index) => {
           const isLast = index === children.length - 1;
           
           let isContextMatch = false;
           if (activeBlocks.length > 0) {
               if (task.taskType && activeBlocks.some(b => b.taskType === task.taskType)) isContextMatch = true;
               if (!isContextMatch && task.tags && task.tags.length > 0) {
                   if (activeBlocks.some(b => b.tags?.some(tag => task.tags.includes(tag)))) isContextMatch = true;
               }
           }

           // Determine instance date for recurring tasks to properly show Overdue/Active state
           const instanceDate = task.isRecurring 
                ? (taskManager.getCurrentRecurrenceInstanceDate(task, currentTime) || undefined) 
                : undefined;

           return (
             <div key={task.id} className="relative pl-8">
                {/* Visual Hierarchy Lines */}
                {!isLast && (
                    <div 
                        className="absolute left-[11px] top-0 bottom-0 w-px border-l-2 border-indigo-200 dark:border-indigo-900/50" 
                    ></div>
                )}
                
                <div 
                    className="absolute left-[11px] top-0 w-6 h-[2.2rem] border-b-2 border-l-2 border-indigo-200 dark:border-indigo-900/50 rounded-bl-2xl"
                ></div>

                <TaskItem 
                   task={task} 
                   onToggle={onToggle} 
                   depth={0} 
                   showHierarchy={true}
                   onAddSubtask={onAddSubtask}
                   onDelete={onDelete}
                   onMoveTask={handleMoveTaskInternal}
                   onEdit={onEdit}
                   onFocus={onFocus}
                   refreshData={refreshData}
                   onDragStartNotify={handleDragStart}
                   onDragEndNotify={handleDragEnd}
                   t={t}
                   language={language}
                   now={now}
                   instanceDate={instanceDate}
                   onOpenKanban={onOpenKanban}
                   onOpenPomodoro={onOpenPomodoro}
                   isContextHighlight={isContextMatch}
                 />
                 
                 {/* Recursion */}
                 {(() => {
                    const hasChildren = tasks.some(t => t.parentId === task.id);
                    if (hasChildren) {
                        return (
                            <div className="">
                                {renderTree(task.id)}
                            </div>
                        );
                    }
                    return null;
                 })()}
             </div>
           );
        })}
      </div>
    );
  };

  const handleRootZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);
    setDragState(null);
    const draggedId = e.dataTransfer.getData('taskId');
    
    if (draggedId) {
      handleMoveTaskInternal(draggedId, rootId); 
    }
  };

  return (
    <div className="flex flex-row relative min-h-[60vh]" ref={containerRef}>
       
      {dragState !== null && (
        <div 
            className="fixed z-50 flex items-center transition-transform duration-200"
            style={{ 
                top: dragState.y - (dragState.isMobile ? 20 : 56), 
                left: dragState.x,
                transform: isDragOverRoot ? 'scale(1.05) translateX(5px)' : 'scale(1.0) translateX(0px)'
            }}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverRoot(true);
            }}
            onDragLeave={() => setIsDragOverRoot(false)}
            onDrop={handleRootZoneDrop}
            title="Drop here to make this a Root Task"
        >
            <div className={`
                relative filter drop-shadow-lg transition-all
                ${dragState.isMobile ? 'w-10 h-10' : 'w-28 h-28'}
            `}>
                <svg 
                    viewBox="0 0 100 100" 
                    className={`w-full h-full transition-colors duration-200 ${isDragOverRoot ? 'fill-indigo-600' : 'fill-indigo-400'}`}
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                >
                    <path d="M 0 10 C 0 0 0 0 10 5 L 90 45 C 98 49 98 51 90 55 L 10 95 C 0 100 0 100 0 90 Z" />
                </svg>
                
                {dragState.isMobile ? (
                    <div className="absolute inset-0 flex items-center justify-start pl-2 pointer-events-none">
                        <i className="fas fa-chevron-left text-white text-xs"></i>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-start pl-6 pointer-events-none">
                        <div className="flex flex-col items-center">
                            <i className="fas fa-arrow-left text-white text-2xl mb-1"></i>
                            <span className="text-[0.7rem] font-bold text-white uppercase leading-none tracking-tighter">
                                Root
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex-1 pl-1 space-y-1 rounded-lg py-2 transition-colors">
        {/* If rootId is provided, we must render that specific root first, then its children */}
        {rootId ? (
            (() => {
                const rootTask = tasks.find(t => t.id === rootId);
                if (!rootTask) return <div className="text-gray-500 dark:text-gray-400 italic p-4">{t.taskNotFound}</div>;
                
                let isContextMatch = false;
                if (activeBlocks.length > 0) {
                    if (rootTask.taskType && activeBlocks.some(b => b.taskType === rootTask.taskType)) isContextMatch = true;
                    if (!isContextMatch && rootTask.tags && rootTask.tags.length > 0 && activeBlocks.some(b => b.tags?.some(tag => rootTask.tags.includes(tag)))) isContextMatch = true;
                }

                const instanceDate = rootTask.isRecurring 
                    ? (taskManager.getCurrentRecurrenceInstanceDate(rootTask, currentTime) || undefined) 
                    : undefined;

                return (
                    <div className="relative">
                        <TaskItem 
                            task={rootTask} 
                            onToggle={onToggle} 
                            depth={0} 
                            showHierarchy={true}
                            onAddSubtask={onAddSubtask}
                            onDelete={onDelete}
                            onMoveTask={handleMoveTaskInternal}
                            onEdit={onEdit}
                            onFocus={onFocus}
                            refreshData={refreshData}
                            onDragStartNotify={handleDragStart}
                            onDragEndNotify={handleDragEnd}
                            t={t}
                            language={language}
                            now={now}
                            instanceDate={instanceDate}
                            onOpenKanban={onOpenKanban}
                            onOpenPomodoro={onOpenPomodoro}
                            isContextHighlight={isContextMatch}
                        />
                         <div className="">
                            {renderTree(rootTask.id)}
                         </div>
                    </div>
                );
            })()
        ) : (
            <div className=""> 
               {/* 
                 Correctly filter "Effective Roots".
                 If a task has no parent OR its parent is not in the current list (orphaned by filter),
                 it should be rendered at the top level.
               */}
               {tasks.filter(t => !t.parentId || !tasks.find(p => p.id === t.parentId)).map(task => {
                   let isContextMatch = false;
                   if (activeBlocks.length > 0) {
                       if (task.taskType && activeBlocks.some(b => b.taskType === task.taskType)) isContextMatch = true;
                       if (!isContextMatch && task.tags && task.tags.length > 0 && activeBlocks.some(b => b.tags?.some(tag => task.tags.includes(tag)))) isContextMatch = true;
                   }

                   const instanceDate = task.isRecurring 
                        ? (taskManager.getCurrentRecurrenceInstanceDate(task, currentTime) || undefined) 
                        : undefined;

                   return (
                   <div key={task.id} className="relative">
                        <TaskItem 
                            task={task} 
                            onToggle={onToggle} 
                            depth={0} 
                            showHierarchy={true}
                            onAddSubtask={onAddSubtask}
                            onDelete={onDelete}
                            onMoveTask={handleMoveTaskInternal}
                            onEdit={onEdit}
                            onFocus={onFocus}
                            refreshData={refreshData}
                            onDragStartNotify={handleDragStart}
                            onDragEndNotify={handleDragEnd}
                            t={t}
                            language={language}
                            now={now}
                            instanceDate={instanceDate}
                            onOpenKanban={onOpenKanban}
                            onOpenPomodoro={onOpenPomodoro}
                            isContextHighlight={isContextMatch}
                        />
                        <div className="">
                            {renderTree(task.id)}
                        </div>
                   </div>
                   )
               })}
               
               {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                    {t.noTasksFound}
                  </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};