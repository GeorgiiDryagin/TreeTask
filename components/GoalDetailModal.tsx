
import React, { useState, useEffect, useRef } from 'react';
import { Goal, Task } from '../types';
import { taskManager } from '../services/taskManager';
import { MiniDatePicker } from './form/MiniDatePicker';
import { ConfirmationModal } from './ConfirmationModal';

interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string | null;
  t: any;
  refreshData: () => void;
  onFocusProject?: (task: Task) => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({ isOpen, onClose, goalId, t, refreshData, onFocusProject }) => {
  const [title, setTitle] = useState('');
  const [smart, setSmart] = useState({ s: '', m: '', a: '', r: '', t: '' });
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [availableRoots, setAvailableRoots] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Date State
  const [targetDate, setTargetDate] = useState<number | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Validation State
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);
  
  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsTitleInvalid(false);
        setShowDatePicker(false);
        setShowDeleteConfirm(false);
        if (goalId === 'new') {
            setTitle('');
            setSmart({ s: '', m: '', a: '', r: '', t: '' });
            setLinkedTasks([]);
            setTargetDate(undefined);
        } else if (goalId) {
            const goals = taskManager.getGoals();
            const goal = goals.find(g => g.id === goalId);
            if (goal) {
                setTitle(goal.title);
                setSmart(goal.smart);
                setTargetDate(goal.targetDate);
                const allTasks = taskManager.getAllTasksIncludingArchived();
                setLinkedTasks(allTasks.filter(t => goal.linkedTaskIds.includes(t.id)));
            }
        }
        
        // Load available roots, filtering out deleted and infinite recurring tasks
        const all = taskManager.getAllTasksIncludingArchived();
        setAvailableRoots(all.filter(t => {
            // Must be root and not deleted
            if (t.parentId || t.deletedAt) return false;
            
            // SMART Logic: Exclude recurring tasks with "No end date"
            // Goals must be Time-bound, infinite loops cannot be completed.
            if (t.isRecurring && t.recurrencePattern?.endCondition === 'No end date') {
                return false;
            }
            
            return true;
        }));

        // Auto-focus title
        setTimeout(() => {
            titleInputRef.current?.focus();
        }, 50);
    }
  }, [isOpen, goalId]);

  // Click Outside Date Picker
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
              setShowDatePicker(false);
          }
      };
      if (showDatePicker) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showDatePicker]);

  const persistGoal = (): boolean => {
      if (!title.trim()) {
          setIsTitleInvalid(true);
          setTimeout(() => setIsTitleInvalid(false), 500); // Reset after animation
          return false;
      }
      
      const payload: Partial<Goal> = {
          title,
          smart,
          linkedTaskIds: linkedTasks.map(t => t.id),
          targetDate
      };

      if (goalId === 'new') {
          // Pass targetDate to creation as well
          const newGoal = taskManager.createGoal(title, targetDate); 
          // Immediately update with other fields (SMART, links)
          taskManager.updateGoal(newGoal.id, payload);
      } else if (goalId) {
          taskManager.updateGoal(goalId, payload);
      }
      refreshData();
      return true;
  };

  const handleSave = () => {
      if (persistGoal()) {
          onClose();
      }
  };

  const handleDeleteClick = () => {
      if (goalId && goalId !== 'new') {
          setShowDeleteConfirm(true);
      }
  };

  const executeDelete = () => {
      if (goalId && goalId !== 'new') {
          taskManager.deleteGoal(goalId);
          refreshData();
          onClose();
      }
      setShowDeleteConfirm(false);
  };

  const linkTask = (task: Task) => {
      if (!linkedTasks.find(t => t.id === task.id)) {
          setLinkedTasks([...linkedTasks, task]);
      }
      setShowSearch(false);
      setSearchQuery('');
  };

  const unlinkTask = (taskId: string) => {
      setLinkedTasks(linkedTasks.filter(t => t.id !== taskId));
  };

  const filteredRoots = availableRoots.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !linkedTasks.some(linked => linked.id === t.id)
  );

  const handleNavigateToProject = (task: Task) => {
      // 1. Try to save goal first
      const saved = persistGoal();
      
      // 2. Only navigate if save was valid (title present)
      if (saved) {
          if (onFocusProject) {
              onFocusProject(task);
              onClose();
          }
      }
  };

  const parseSmartText = (text: string) => {
      const match = text.match(/^(.*?)\s*\((.*?)\)\s*$/);
      if (match) {
          return { label: match[1].trim(), placeholder: match[2].trim() };
      }
      return { label: text, placeholder: '...' };
  };

  const smartFields = [
      { key: 's', label: t.smartSpecific, color: 'text-blue-600 dark:text-blue-400' },
      { key: 'm', label: t.smartMeasurable, color: 'text-indigo-600 dark:text-indigo-400' },
      { key: 'a', label: t.smartAchievable, color: 'text-purple-600 dark:text-purple-400' },
      { key: 'r', label: t.smartRelevant, color: 'text-pink-600 dark:text-pink-400' },
      { key: 't', label: t.smartTimeBound, color: 'text-orange-600 dark:text-orange-400' },
  ];

  // Helper for Date Handling
  const handleDateSelect = (dateStr: string) => {
      const d = new Date(dateStr);
      // Set to noon to avoid timezone shift issues
      d.setHours(12, 0, 0, 0);
      setTargetDate(d.getTime());
      setShowDatePicker(false);
  };

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString();
  };

  // Helper to format stats
  const getTaskStatusLabel = (task: Task) => {
      if (task.isRecurring && task.recurrencePattern) {
          const completed = task.recurrencePattern.completedInstances?.length || 0;
          if (task.recurrencePattern.endCondition === 'After X occurrences' && task.recurrencePattern.endCount) {
              return `${completed} / ${task.recurrencePattern.endCount} ${t.repeat || 'reps'}`;
          }
          return `${completed} ${t.repeat || 'reps'}`;
      }
      
      const total = (task.totalChildrenCount || 0) + 1;
      const pending = (task.pendingChildrenCount || 0) + (!['Completed', 'Cancelled'].includes(task.status) ? 1 : 0);
      const done = Math.max(0, total - pending);
      return `${done} / ${total} done`;
  };

  if (!isOpen) return null;

  return (
    <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750 shrink-0 gap-4">
                    {/* Title Input */}
                    <input 
                        ref={titleInputRef}
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Goal Title"
                        autoFocus
                        className={`
                            text-xl font-bold bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white w-full placeholder-gray-400 rounded transition-all duration-300
                            ${isTitleInvalid ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                        `}
                    />
                    
                    {/* Date Picker Button */}
                    <div className="relative shrink-0 flex items-center gap-1" ref={datePickerRef}>
                        <button 
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                                ${targetDate 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }
                            `}
                        >
                            <i className="far fa-calendar"></i>
                            {targetDate ? formatDate(targetDate) : (t.setDate || "Set Deadline")}
                        </button>
                        
                        {targetDate && (
                            <button 
                                onClick={() => setTargetDate(undefined)}
                                className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:underline decoration-dotted ml-2 font-medium"
                                title="Clear date"
                            >
                                {t.reset}
                            </button>
                        )}

                        {showDatePicker && (
                            <MiniDatePicker 
                                selectedDate={targetDate ? new Date(targetDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                                onSelect={handleDateSelect} 
                                onClose={() => setShowDatePicker(false)} 
                                language="en" // Or pull from props if available
                            />
                        )}
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Content - 50/50 Split on Mobile, 2 Columns on Desktop */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* Left: SMART Fields (50% height on mobile) */}
                    <div className="w-full md:w-auto flex-1 h-1/2 md:h-full overflow-y-auto p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 custom-scrollbar bg-white dark:bg-gray-800">
                        <div className="space-y-6">
                            {smartFields.map((field) => {
                                const { label, placeholder } = parseSmartText(field.label);
                                return (
                                    <div key={field.key} className="space-y-1">
                                        <label className={`text-xs font-bold uppercase tracking-wide ${field.color}`}>
                                            {label}
                                        </label>
                                        <textarea 
                                            value={(smart as any)[field.key]} 
                                            onChange={e => setSmart({...smart, [field.key]: e.target.value})} 
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 dark:text-gray-200 min-h-[80px]"
                                            rows={3}
                                            placeholder={placeholder}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Linked Projects (50% height on mobile) */}
                    <div className="w-full md:w-1/3 h-1/2 md:h-full flex flex-col bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300">{t.linkedProjects}</h3>
                            <button 
                                onClick={() => setShowSearch(!showSearch)} 
                                className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                            >
                                <i className="fas fa-plus mr-1"></i> {t.linkProject}
                            </button>
                        </div>

                        {showSearch && (
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={t.searchProjects}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                                />
                                <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
                                    {filteredRoots.map(root => (
                                        <div 
                                            key={root.id}
                                            onClick={() => linkTask(root)}
                                            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer truncate"
                                        >
                                            {root.title}
                                        </div>
                                    ))}
                                    {filteredRoots.length === 0 && (
                                        <div className="p-2 text-xs text-gray-400 text-center">No matching roots</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {linkedTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                    onClick={() => handleNavigateToProject(task)}
                                    title="Click to view in Forest"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                                            {task.title}
                                            <i className="fas fa-external-link-alt text-[10px] text-gray-400 ml-1 opacity-0 group-hover:opacity-100"></i>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {getTaskStatusLabel(task)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); unlinkTask(task.id); }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                        <i className="fas fa-unlink"></i>
                                    </button>
                                </div>
                            ))}
                            {linkedTasks.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm italic">
                                    No projects linked.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-between shrink-0">
                    {goalId !== 'new' ? (
                        <button onClick={handleDeleteClick} className="text-red-600 hover:text-red-700 text-sm font-medium">
                            {t.delete}
                        </button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">
                            {t.cancel}
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm">
                            {t.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal sits at z-110 (higher than 100) */}
        <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={executeDelete}
            title={t.delete || "Delete Goal"}
            message={t.deleteGoalConfirm || "Are you sure you want to delete this goal?"}
            t={t}
        />
    </>
  );
};
