import React, { useMemo, useState, useEffect } from 'react';
import { Task, TimeBlock } from '../types';
import { TaskItem } from './TaskItem';
import { TimeBlockItem } from './TimeBlockItem'; // Imported new component
import { taskManager } from '../services/taskManager';
import { TimeBlockModal } from './TimeBlockModal';
import { RecurrenceActionModal } from './RecurrenceActionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { HabitReportModal } from './HabitReportModal'; // Imported

interface RoutineViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onAddRoutine: () => void;
  onAddHabit: () => void;
  refreshData: () => void;
  t: any;
  language: string;
  now?: number;
  onOpenPomodoro?: (task: Task) => void;
}

export const RoutineView: React.FC<RoutineViewProps> = ({ 
  tasks, 
  onToggle, 
  onEdit, 
  onDelete, 
  onDeleteMultiple,
  onAddRoutine,
  onAddHabit,
  refreshData,
  t,
  language,
  now,
  onOpenPomodoro,
}) => {
  const [activeTab, setActiveTab] = useState<'habits' | 'tasks' | 'blocks'>('habits');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});
  
  // Time Block State
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>(undefined);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [recurrenceAction, setRecurrenceAction] = useState<{ isOpen: boolean; blockId: string; mode: 'delete' }>({ isOpen: false, blockId: '', mode: 'delete' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Report State
  const [reportTarget, setReportTarget] = useState<Task | 'global' | null>(null);
  
  // Group Delete State
  const [groupDeleteIds, setGroupDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
      setTimeBlocks(taskManager.getRoutineTimeBlocks());
  }, [tasks]); // Refresh when tasks change (usually means data refresh triggered)

  const toggleGroup = (parentId: string) => {
    setExpandedGroups(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const toggleSeries = (seriesKey: string) => {
    setExpandedSeries(prev => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
  };

  const handleDeleteSeries = (e: React.MouseEvent, tasksToDelete: Task[]) => {
      e.stopPropagation();
      if (!onDeleteMultiple) return;
      setGroupDeleteIds(tasksToDelete.map(t => t.id));
  };

  const executeGroupDelete = () => {
      if (groupDeleteIds && onDeleteMultiple) {
          onDeleteMultiple(groupDeleteIds);
      }
      setGroupDeleteIds(null);
  };

  // --- TIME BLOCK HANDLERS ---
  const handleEditBlock = (block: TimeBlock) => {
      setEditingBlock(block);
      setIsBlockModalOpen(true);
  };

  const handleCreateBlock = () => {
      setEditingBlock(undefined);
      setIsBlockModalOpen(true);
  };

  const handleSaveBlock = (blockPayload: Omit<TimeBlock, 'id'>) => {
      if (editingBlock) {
          taskManager.updateTimeBlock(editingBlock.id, blockPayload);
      } else {
          // Force recurrence for routine blocks if created here
          if (!blockPayload.isRecurring) {
               blockPayload.isRecurring = true;
               // Default daily if missing
               if (!blockPayload.recurrencePattern) {
                   blockPayload.recurrencePattern = { frequency: 'Daily', interval: 1, endCondition: 'No end date' };
               }
          }
          taskManager.addTimeBlock(blockPayload);
      }
      refreshData();
      setIsBlockModalOpen(false);
  };

  const handleDeleteBlockRequest = (id: string) => {
      const currentBlocks = taskManager.getAllTimeBlocks();
      const block = currentBlocks.find(b => b.id === id);
      
      if (block && block.isRecurring) {
          // Trigger recurrence modal for deletion
          setRecurrenceAction({ isOpen: true, blockId: id, mode: 'delete' });
          // Close the edit modal immediately so it doesn't stay open behind the recurrence modal
          setIsBlockModalOpen(false);
      } else {
          // Single block -> Confirmation Modal
          setConfirmDeleteId(id);
      }
  };

  const executeSingleDelete = () => {
      if (confirmDeleteId) {
          taskManager.deleteTimeBlock(confirmDeleteId);
          refreshData();
          setTimeBlocks(taskManager.getRoutineTimeBlocks());
          setIsBlockModalOpen(false);
          setConfirmDeleteId(null);
      }
  };

  const handleRecurrenceConfirm = (mode: 'this' | 'future' | 'all') => {
      if (recurrenceAction.mode === 'delete') {
          taskManager.deleteTimeBlock(recurrenceAction.blockId, 'all');
          refreshData();
          setTimeBlocks(taskManager.getRoutineTimeBlocks());
          setRecurrenceAction({ ...recurrenceAction, isOpen: false });
      }
  };

  // --- SEPARATE TASKS AND HABITS ---
  const { regularTasks, habitTasks } = useMemo(() => {
      const regular: Task[] = [];
      const habits: Task[] = [];
      
      tasks.forEach(task => {
          const isHabitType = task.taskType === 'Health' || task.taskType === 'Habit' || (task.tags && task.tags.includes(t.usefulHabitTag));
          if (isHabitType) {
              habits.push(task);
          } else {
              regular.push(task);
          }
      });
      return { regularTasks: regular, habitTasks: habits };
  }, [tasks, t]);


  // --- TASK GROUPING LOGIC ---
  const groupedTasks = useMemo((): Record<string, Record<string, Task[]>> => {
      const parentGroups: Record<string, Record<string, Task[]>> = {};
      
      regularTasks.forEach(task => {
          const pId = task.parentId || 'root';
          if (!parentGroups[pId]) parentGroups[pId] = {};
          
          const titleKey = task.title.trim();
          if (!parentGroups[pId][titleKey]) parentGroups[pId][titleKey] = [];
          
          parentGroups[pId][titleKey].push(task);
      });

      Object.keys(parentGroups).forEach(pId => {
          Object.keys(parentGroups[pId]).forEach(titleKey => {
              parentGroups[pId][titleKey].sort((a, b) => b.createdAt - a.createdAt);
          });
      });

      return parentGroups;
  }, [regularTasks]);
  
  const groupedHabits = useMemo(() => {
      const groups: { [title: string]: Task[] } = {};
      habitTasks.forEach(h => {
          const titleKey = h.title.trim();
          if (!groups[titleKey]) groups[titleKey] = [];
          groups[titleKey].push(h);
      });
      return groups;
  }, [habitTasks]);


  const groupedBlocks = useMemo(() => {
      const groups: { [title: string]: TimeBlock[] } = {};
      timeBlocks.forEach(b => {
          const titleKey = b.title.trim();
          if (!groups[titleKey]) groups[titleKey] = [];
          groups[titleKey].push(b);
      });
      return groups;
  }, [timeBlocks]);

  const getParentTitle = (parentId: string) => {
      if (parentId === 'root') return t.uncategorized;
      const parent = taskManager.getTask(parentId);
      return parent ? parent.title : t.uncategorized;
  };

  const renderTaskSeries = (parentId: string, title: string, tasksInSeries: Task[]) => {
       const seriesKey = `${parentId}-${title}`;
       const isSeriesExpanded = expandedSeries[seriesKey];
       const hasMultiple = tasksInSeries.length > 1;
       const isHabitTab = activeTab === 'habits';

       if (!hasMultiple) {
           return (
              <TaskItem
                  key={tasksInSeries[0].id}
                  task={tasksInSeries[0]}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  refreshData={refreshData}
                  t={t}
                  language={language}
                  isRoutine={true}
                  now={now}
                  onOpenPomodoro={onOpenPomodoro}
                  onOpenReport={isHabitTab ? (task) => setReportTarget(task) : undefined}
              />
           );
       }

       return (
           <div key={seriesKey} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden mb-2 last:mb-0">
               <div 
                  onClick={() => toggleSeries(seriesKey)}
                  className="bg-white dark:bg-gray-800 px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
               >
                   <i className={`fas fa-caret-right text-gray-400 transition-transform ${isSeriesExpanded ? 'rotate-90' : ''}`}></i>
                   <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{title}</span>
                   
                   <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                       {tasksInSeries.length} versions
                   </span>

                   {onDeleteMultiple && (
                       <button
                          onClick={(e) => handleDeleteSeries(e, tasksInSeries)}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors relative z-10"
                          title={t.deleteGroup}
                       >
                           <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                   )}
               </div>
               
               {isSeriesExpanded && (
                   <div className="pl-4 pr-2 pb-2 space-y-1 bg-gray-50/30 dark:bg-gray-900/10 border-t border-gray-50 dark:border-gray-700 pt-2">
                       {tasksInSeries.map(task => (
                          <TaskItem
                              key={task.id}
                              task={task}
                              onToggle={onToggle}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              refreshData={refreshData}
                              t={t}
                              language={language}
                              isRoutine={true}
                              now={now}
                              onOpenPomodoro={onOpenPomodoro}
                              onOpenReport={isHabitTab ? (task) => setReportTarget(task) : undefined}
                          />
                       ))}
                   </div>
               )}
           </div>
       );
  };

  const rootTasksMap = groupedTasks['root'] as Record<string, Task[]> | undefined;
  const projectGroups = Object.keys(groupedTasks).reduce((acc, key) => {
      if (key !== 'root') {
          acc[key] = groupedTasks[key];
      }
      return acc;
  }, {} as Record<string, Record<string, Task[]>>);

  return (
    <div className="space-y-4 pb-20">
        
        {/* Tabs - Reordered to put Habits first */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
             <button
                onClick={() => setActiveTab('habits')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'habits' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
             >
                 <i className="fas fa-leaf mr-2"></i> {t.habits}
             </button>
             <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'tasks' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
             >
                 <i className="fas fa-tasks mr-2"></i> Tasks
             </button>
             <button
                onClick={() => setActiveTab('blocks')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4 ${activeTab === 'blocks' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
             >
                 <i className="fas fa-clock mr-2"></i> Blocks
             </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
            <div>
                {activeTab === 'habits' && habitTasks.length > 0 && (
                    <button 
                        onClick={() => setReportTarget('global')}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                        <i className="fas fa-chart-pie"></i> {t.globalReport}
                    </button>
                )}
            </div>
            
            <button
                onClick={() => {
                    if (activeTab === 'tasks') onAddRoutine();
                    else if (activeTab === 'habits') onAddHabit();
                    else handleCreateBlock();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center"
            >
                <i className="fas fa-plus mr-2"></i> 
                {activeTab === 'tasks' ? t.createRoutine : (activeTab === 'habits' ? t.createHabit : "Add Block")}
            </button>
        </div>
        
        {/* HABITS VIEW - Now comes first logic-wise as it is the default tab */}
        {activeTab === 'habits' && (
             <div className="space-y-2">
                 {Object.entries(groupedHabits).map(([title, tasksInSeries]) => 
                    renderTaskSeries('habits', title, tasksInSeries as Task[])
                 )}
                 
                 {habitTasks.length === 0 && (
                     <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                         No habits found.
                     </div>
                 )}
             </div>
        )}

        {/* TASKS VIEW */}
        {activeTab === 'tasks' && (
            <div className="space-y-6">
                {/* 1. Root Series */}
                {rootTasksMap && (
                    <div className="space-y-2">
                        {Object.entries(rootTasksMap).map(([title, tasksInSeries]) => 
                            renderTaskSeries('root', title, tasksInSeries)
                        )}
                    </div>
                )}

                {/* 2. Project Groups */}
                {Object.entries(projectGroups).map(([parentId, seriesMap]) => {
                    const isExpanded = expandedGroups[parentId];
                    const totalTasksInGroup = Object.values(seriesMap).reduce((acc, curr) => acc + curr.length, 0);

                    return (
                    <div key={parentId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200">
                        <div 
                            onClick={() => toggleGroup(parentId)}
                            className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none transition-colors"
                        >
                            <i className={`fas fa-chevron-right text-gray-400 transition-transform duration-200 text-xs ${isExpanded ? 'rotate-90' : ''}`}></i>
                            <i className={`fas fa-folder text-indigo-500 dark:text-indigo-400 ml-1`}></i>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm flex-1">{getParentTitle(parentId)}</h4>
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 ml-auto font-medium">
                                {totalTasksInGroup}
                            </span>
                        </div>
                        
                        <div className={`transition-all duration-300 ease-in-out ${!isExpanded ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100'}`}>
                            <div className="p-2 space-y-2">
                                {Object.entries(seriesMap).map(([title, tasksInSeries]) => 
                                    renderTaskSeries(parentId, title, tasksInSeries)
                                )}
                            </div>
                        </div>
                    </div>
                )})}

                {regularTasks.length === 0 && !rootTasksMap && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                        {t.noTasksFound}
                    </div>
                )}
            </div>
        )}

        {/* BLOCKS VIEW */}
        {activeTab === 'blocks' && (
            <div className="space-y-4">
                 {Object.entries(groupedBlocks).map(([title, blocks]) => (
                     <div key={title} className="space-y-1">
                         {(blocks as TimeBlock[]).map(block => (
                             <TimeBlockItem 
                                key={block.id} 
                                block={block} 
                                onEdit={handleEditBlock} 
                                onDelete={handleDeleteBlockRequest}
                                t={t}
                             />
                         ))}
                     </div>
                 ))}
                 
                 {timeBlocks.length === 0 && (
                     <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                        No recurring time blocks found.
                    </div>
                 )}
            </div>
        )}

        <TimeBlockModal 
            isOpen={isBlockModalOpen}
            onClose={() => setIsBlockModalOpen(false)}
            onSave={handleSaveBlock}
            onDelete={handleDeleteBlockRequest}
            initialBlock={editingBlock}
            t={t}
        />

        <RecurrenceActionModal 
            isOpen={recurrenceAction.isOpen}
            onClose={() => setRecurrenceAction({ ...recurrenceAction, isOpen: false })}
            onConfirm={handleRecurrenceConfirm}
            mode={recurrenceAction.mode}
            t={t}
        />
        
        <ConfirmationModal 
            isOpen={!!confirmDeleteId}
            onClose={() => setConfirmDeleteId(null)}
            onConfirm={executeSingleDelete}
            title={t.delete}
            message={t.deleteGroupConfirm?.replace('group', 'item') || "Are you sure you want to delete this item?"} 
            t={t}
        />

        <ConfirmationModal 
            isOpen={!!groupDeleteIds}
            onClose={() => setGroupDeleteIds(null)}
            onConfirm={executeGroupDelete}
            title={t.deleteGroup}
            message={t.deleteGroupConfirm} 
            t={t}
        />

        {/* Report Modal */}
        <HabitReportModal
            isOpen={!!reportTarget}
            onClose={() => setReportTarget(null)}
            habit={reportTarget === 'global' ? null : reportTarget as Task}
            allHabits={habitTasks}
            t={t}
        />
    </div>
  );
};