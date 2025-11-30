import React, { useMemo } from 'react';
import { Task } from '../types';
import { taskManager } from '../services/taskManager';

interface HabitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Task | null; // null means global report
  allHabits: Task[];
  t: any;
}

interface PeriodStat {
    label: string;
    completed: number;
    total: number;
    percent: number;
}

export const HabitReportModal: React.FC<HabitReportModalProps> = ({ isOpen, onClose, habit, allHabits, t }) => {
  
  const stats = useMemo(() => {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const nowTs = now.getTime();

      const periods = [
          { key: 'thisWeek', label: t.thisWeek, days: 0 }, // 0 implies calculating start of current week
          { key: 'lastWeek', label: t.lastWeek, days: -1 }, // -1 implies specific last week logic
          { key: 'month', label: t.last30d || "30 Days", days: 30 },
          { key: '2months', label: t.last2Months, days: 60 },
          { key: '6months', label: t.last6MonthsShort, days: 180 },
          { key: 'year', label: t.last365d || "Year", days: 365 },
          { key: 'all', label: t.allTime, days: 9999 }
      ];

      // Helper to calculate stats for a date range
      const calculateRangeStats = (tasks: Task[], startDate: number, endDate: number) => {
          let totalExpected = 0;
          let totalCompleted = 0;

          const msPerDay = 86400000;
          const dayStart = new Date(startDate);
          dayStart.setHours(0,0,0,0);
          
          const dayEnd = new Date(endDate);
          dayEnd.setHours(0,0,0,0);

          let current = dayStart.getTime();
          const target = dayEnd.getTime();

          while (current <= target) {
              for (const task of tasks) {
                  if (task.scheduledTime && task.isRecurring && task.recurrencePattern) {
                      // Check if scheduled
                      if (taskManager.checkRecurrenceOverlap(task.recurrencePattern, task.scheduledTime, current)) {
                          totalExpected++;
                          // Check if completed
                          if (task.recurrencePattern.completedInstances?.includes(current)) {
                              totalCompleted++;
                          }
                      }
                  }
              }
              current += msPerDay;
          }

          return { completed: totalCompleted, total: totalExpected };
      };

      return periods.map(p => {
          let start = 0;
          let end = nowTs;

          if (p.key === 'thisWeek') {
              const d = new Date();
              const day = d.getDay() || 7; // Mon=1, Sun=7
              if (day !== 1) d.setHours(-24 * (day - 1));
              start = d.getTime(); // Monday of this week
          } else if (p.key === 'lastWeek') {
              const d = new Date();
              const day = d.getDay() || 7;
              d.setDate(d.getDate() - day - 6); // Last Monday
              start = d.getTime();
              const e = new Date(start);
              e.setDate(e.getDate() + 6); // Last Sunday
              end = e.getTime();
          } else if (p.key === 'all') {
              // Find earliest scheduled time
              start = nowTs;
              const targets = habit ? [habit] : allHabits;
              targets.forEach(h => {
                  if (h.scheduledTime && h.scheduledTime < start) start = h.scheduledTime;
              });
          } else {
              start = nowTs - (p.days * 86400000);
          }

          const targetTasks = habit ? [habit] : allHabits;
          const res = calculateRangeStats(targetTasks, start, end);
          
          return {
              label: p.label,
              completed: res.completed,
              total: res.total,
              percent: res.total > 0 ? Math.round((res.completed / res.total) * 100) : 0
          };
      });

  }, [habit, allHabits, t, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <i className="fas fa-chart-bar text-indigo-500"></i>
                    {habit ? t.habitReport : t.globalReport}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
                
                {habit && (
                    <div className="mb-6 flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <i className="fas fa-leaf text-xl"></i>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.habitName}</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{habit.title}</div>
                        </div>
                    </div>
                )}

                {!habit && (
                    <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-center">
                        <div className="text-sm text-indigo-800 dark:text-indigo-200 font-medium">
                            Combined performance of all {allHabits.length} habits
                        </div>
                    </div>
                )}

                {/* Individual View: Table */}
                {habit ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">{t.timeframe}</th>
                                    <th className="px-4 py-3 text-center">{t.successRate}</th>
                                    <th className="px-4 py-3 text-right text-[10px] opacity-70">Done / Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {stats.map((row) => (
                                    <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${row.percent >= 80 ? 'bg-green-500' : row.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                        style={{ width: `${row.percent}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold w-8 text-right">{row.percent}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                                            {row.completed}/{row.total}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Global View: Bar Chart */
                    <div className="space-y-4">
                        <div className="h-64 flex items-end justify-between gap-2 px-2">
                            {stats.map((row) => (
                                <div key={row.label} className="flex flex-col items-center flex-1 group">
                                    <div className="relative w-full flex justify-center">
                                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                            {row.percent}% ({row.completed}/{row.total})
                                        </div>
                                        <div 
                                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${row.percent >= 80 ? 'bg-green-500' : row.percent >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                                            style={{ height: `${Math.max(row.percent * 2, 4)}px` }} // *2 for scaling (100% = 200px approx)
                                        ></div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 text-center font-medium uppercase tracking-tighter leading-tight h-8 flex items-center justify-center">
                                        {row.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center text-xs text-gray-400 italic">
                            Hover over bars to see details
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};