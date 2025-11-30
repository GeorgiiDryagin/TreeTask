
import React, { useState, useEffect, useMemo } from 'react';
import { Goal, Task } from '../types';
import { taskManager } from '../services/taskManager';
import { GoalDetailModal } from './GoalDetailModal';

interface GoalsViewProps {
  t: any;
  onFocusProject?: (task: Task) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ t, onFocusProject }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const loadGoals = () => {
      setGoals(taskManager.getGoals());
      // Need all tasks to calculate progress of linked trees
      setAllTasks(taskManager.getAllTasksIncludingArchived());
  };

  useEffect(() => {
      loadGoals();
  }, []);

  const handleCreate = () => {
      setSelectedGoalId('new');
  };

  const getProgress = (goal: Goal) => {
      if (goal.linkedTaskIds.length === 0) return { percent: 0, label: '0/0' };

      let totalUnits = 0;
      let completedUnits = 0;

      goal.linkedTaskIds.forEach(id => {
          const root = allTasks.find(t => t.id === id);
          if (root) {
              if (root.isRecurring && root.recurrencePattern) {
                  // Recurring Task Logic
                  const doneReps = root.recurrencePattern.completedInstances?.length || 0;
                  
                  if (root.recurrencePattern.endCondition === 'After X occurrences' && root.recurrencePattern.endCount) {
                      // Finite series
                      const totalReps = root.recurrencePattern.endCount;
                      totalUnits += totalReps;
                      completedUnits += Math.min(doneReps, totalReps); // Cap at max
                  } else {
                      // Infinite or Date-based: Treat as bonus or 1 unit max?
                      // Strategy: Treat each completed rep as a success, but don't blow up the denominator.
                      // Let's assume infinite habits don't have a "Goal" end state unless specified.
                      // For visual consistency, we'll just count what's done.
                      // If it's linked to a goal, usually it implies a finite effort. 
                      // If infinite, we treat it as 1 unit total, and if >0 done, it's 100% (or we ignore it for calc).
                      // Better approach for Goal view: Count completed reps vs 0 denominator (bonus) isn't standard math.
                      // Fallback: If infinite, we assume a "target" of at least the current done + 1 to show activity, 
                      // OR we just assume it contributes 0 to the 'Goal' completion unless it has an end count.
                      
                      // Implementation: Only count towards % if it has an endCount. 
                      // If no endCount, it doesn't affect the % bar (neutral), or we count it as 1 task = 1 unit if > 0 reps.
                      if (doneReps > 0) {
                          totalUnits += 1;
                          completedUnits += 1; // Mark "the habit exists and is active" as 1 unit of progress
                      } else {
                          totalUnits += 1; // It exists but not started
                      }
                  }
              } else {
                  // Standard Tree Logic
                  // Total for this tree: The root itself + all its descendants
                  const rootTotal = (root.totalChildrenCount || 0) + 1;
                  
                  // Pending for this tree: The root's pending children + the root itself if active
                  const isRootPending = !['Completed', 'Cancelled'].includes(root.status);
                  const rootPending = (root.pendingChildrenCount || 0) + (isRootPending ? 1 : 0);
                  
                  const rootCompleted = Math.max(0, rootTotal - rootPending);

                  totalUnits += rootTotal;
                  completedUnits += rootCompleted;
              }
          }
      });

      if (totalUnits === 0) return { percent: 0, label: '0/0' };
      return {
          percent: Math.round((completedUnits / totalUnits) * 100),
          label: `${completedUnits}/${totalUnits}`
      };
  };

  // --- SORTING LOGIC ---
  const sortedGoals = useMemo(() => {
      return [...goals].sort((a, b) => {
          const progressA = getProgress(a);
          const progressB = getProgress(b);
          
          const isAchievedA = progressA.percent >= 100 && a.linkedTaskIds.length > 0;
          const isAchievedB = progressB.percent >= 100 && b.linkedTaskIds.length > 0;

          // 1. Achievement Status: Unachieved first
          if (isAchievedA && !isAchievedB) return 1;
          if (!isAchievedA && isAchievedB) return -1;

          // 2. Target Date: Closer date first (for unachieved)
          // If no date, treat as very far future (Infinity)
          const dateA = a.targetDate || 9999999999999;
          const dateB = b.targetDate || 9999999999999;

          if (dateA !== dateB) {
              return dateA - dateB;
          }

          // 3. Fallback: Creation date (Newest first)
          return b.createdAt - a.createdAt;
      });
  }, [goals, allTasks]);

  return (
    <div className="w-full h-full p-4 md:p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <i className="fas fa-bullseye text-red-500"></i> {t.goals}
                </h2>
                <button 
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                >
                    <i className="fas fa-plus"></i> {t.createGoal}
                </button>
            </div>

            {sortedGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                        <i className="fas fa-bullseye text-2xl"></i>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">{t.noGoals}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedGoals.map(goal => {
                        const progress = getProgress(goal);
                        const isAchieved = progress.percent >= 100 && goal.linkedTaskIds.length > 0;
                        
                        return (
                        <div 
                            key={goal.id}
                            onClick={() => setSelectedGoalId(goal.id)}
                            className={`
                                bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition-all group flex flex-col
                                ${isAchieved ? 'border-green-200 dark:border-green-900/50 opacity-75' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className={`font-bold text-lg line-clamp-2 ${isAchieved ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                                    {goal.title}
                                </h3>
                                <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors"></i>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                <div className="flex items-center gap-1">
                                    <i className="fas fa-sitemap"></i>
                                    <span>{goal.linkedTaskIds.length} projects</span>
                                </div>
                                {goal.targetDate && (
                                    <div className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded ${isAchieved ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'}`}>
                                        <i className="far fa-flag"></i>
                                        <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1">
                                    <span>Progress</span>
                                    <span>{progress.percent}% ({progress.label})</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${progress.percent >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                        style={{ width: `${progress.percent}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex gap-1 mt-auto">
                                {['s','m','a','r','t'].map(letter => {
                                    const hasContent = !!goal.smart[letter as keyof typeof goal.smart];
                                    const colors: Record<string, string> = {
                                        s: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                                        m: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
                                        a: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                                        r: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
                                        t: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                                    };
                                    return (
                                        <div key={letter} className={`flex-1 h-1.5 rounded-full ${hasContent ? (isAchieved ? 'bg-gray-300 dark:bg-gray-600' : colors[letter]) : 'bg-gray-100 dark:bg-gray-700'}`}></div>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>

        <GoalDetailModal 
            isOpen={!!selectedGoalId}
            onClose={() => setSelectedGoalId(null)}
            goalId={selectedGoalId}
            t={t}
            refreshData={loadGoals}
            onFocusProject={onFocusProject}
        />
    </div>
  );
};
