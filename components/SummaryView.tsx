

import React, { useMemo } from 'react';
import { Task } from '../types';
import { taskManager } from '../services/taskManager';

interface SummaryViewProps {
  tasks: Task[];
  t: any;
}

interface PeriodStats {
  label: string;
  created: number;
  total: number;
  standalone: number;
  recurring: number;
  project: number;
}

interface HabitStats {
    id: string;
    title: string;
    totalCompleted: number;
    rates: {
        last7d: number;
        last14d: number;
        last30d: number;
        last90d: number;
        last365d: number;
    }
}

export const SummaryView: React.FC<SummaryViewProps> = ({ tasks, t }) => {
  
  const stats = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    
    // Helper to calculate period boundaries
    const periods = [
      { label: t.today, cutoff: startOfToday },
      { label: t.last7Days, cutoff: now - (7 * 24 * 60 * 60 * 1000) },
      { label: t.lastMonth, cutoff: now - (30 * 24 * 60 * 60 * 1000) },
      { label: t.last3Months, cutoff: now - (90 * 24 * 60 * 60 * 1000) },
      { label: t.last6Months, cutoff: now - (180 * 24 * 60 * 60 * 1000) },
      { label: t.lastYear, cutoff: now - (365 * 24 * 60 * 60 * 1000) },
    ];

    // Filter only completed tasks
    const completedTasks = tasks.filter(t => t.status === 'Completed' && t.completedAt);

    return periods.map(period => {
      // 1. Calculate Created Count (All tasks, regardless of status)
      const createdCount = tasks.filter(t => t.createdAt >= period.cutoff).length;
      
      // 2. Calculate Completed Breakdown
      const tasksInPeriod = completedTasks.filter(t => (t.completedAt || 0) >= period.cutoff);
      
      let standalone = 0;
      let recurring = 0;
      let project = 0;

      tasksInPeriod.forEach(t => {
        if (t.isRecurring) {
          recurring++;
        } else if (t.parentId || t.totalChildrenCount > 0) {
          // Has a parent OR has children (and not recurring) -> Project Task
          project++;
        } else {
          // No parent, no children, not recurring -> Standalone
          standalone++;
        }
      });

      return {
        label: period.label,
        created: createdCount,
        total: tasksInPeriod.length,
        standalone,
        recurring,
        project
      };
    });
  }, [tasks, t]);

  // --- HABIT STATS CALCULATION ---
  const habitStats = useMemo(() => {
      // Filter Habit Tasks: Recurring AND (Type='Health' OR Type='Habit' OR Tag='Useful Habit')
      const habits = tasks.filter(task => 
          task.isRecurring && task.recurrencePattern && 
          (task.taskType === 'Health' || task.taskType === 'Habit' || (task.tags && task.tags.includes(t.usefulHabitTag)))
      );

      const now = Date.now();
      const periods = [
          { key: 'last7d', days: 7 },
          { key: 'last14d', days: 14 },
          { key: 'last30d', days: 30 },
          { key: 'last90d', days: 90 },
          { key: 'last365d', days: 365 },
      ];

      return habits.map(habit => {
          const completedInstances = habit.recurrencePattern?.completedInstances || [];
          const totalCompleted = completedInstances.length;
          
          const rates: any = {};
          
          periods.forEach(p => {
              const startCutoff = now - (p.days * 24 * 60 * 60 * 1000);
              // Calculate expected occurrences in this window
              let expected = 0;
              let actual = 0;
              
              // Iterate day by day from startCutoff to now
              // This is somewhat brute-force but accurate given our recurrence logic complexity
              for (let i = 0; i < p.days; i++) {
                  const checkTime = startCutoff + (i * 86400000);
                  // Check if habit scheduled for this day
                  // We need checkRecurrenceOverlap. Since we are in component, we can access taskManager singleton
                  // We need the START of the checkTime day
                  const d = new Date(checkTime);
                  d.setHours(0,0,0,0);
                  const checkDayStart = d.getTime();
                  
                  if (habit.scheduledTime && taskManager.checkRecurrenceOverlap(habit.recurrencePattern!, habit.scheduledTime, checkDayStart)) {
                      expected++;
                      // Check if completed
                      if (completedInstances.includes(checkDayStart)) {
                          actual++;
                      }
                  }
              }
              
              rates[p.key] = expected > 0 ? Math.round((actual / expected) * 100) : 0;
          });

          return {
              id: habit.id,
              title: habit.title,
              totalCompleted,
              rates: rates as HabitStats['rates']
          };
      });

  }, [tasks, t]);


  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* 1. General Completion Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <i className="fas fa-check-circle text-indigo-500"></i> {t.completionSummary}
            </h3>
        </div>

        {/* Mobile Grid (Visible < md) */}
        <div className="block md:hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-[0.8fr_1.8fr_1fr_1fr_1fr_1fr] border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center py-2 items-end">
                
                {/* Total (Moved to Left) */}
                <div className="flex flex-col items-center justify-end gap-0.5 pb-0.5">
                    <i className="fas fa-list text-sm text-gray-600 dark:text-gray-400"></i>
                    <span className="text-[5px] leading-tight">{t.total}</span>
                </div>

                {/* Period */}
                <div className="flex flex-col items-start justify-end gap-0.5 pb-0.5 pl-3">
                    <i className="far fa-calendar-alt text-sm text-gray-500 dark:text-gray-400"></i>
                    <span className="text-[5px] leading-tight">{t.period}</span>
                </div>

                {/* Created */}
                <div className="flex flex-col items-center justify-end gap-0.5 pb-0.5">
                   <i className="fas fa-plus-circle text-sm text-gray-400 dark:text-gray-500"></i>
                   <span className="text-[5px] leading-tight">{t.createShort}</span>
                </div>

                {/* Standalone */}
                <div className="flex flex-col items-center justify-end gap-0.5 pb-0.5">
                   <i className="fas fa-flag text-sm text-purple-600 dark:text-purple-400"></i>
                   <span className="text-[5px] leading-tight">{t.standalone}</span>
                </div>

                {/* Recurring */}
                <div className="flex flex-col items-center justify-end gap-0.5 pb-0.5">
                   <i className="fas fa-sync-alt text-sm text-blue-600 dark:text-blue-400"></i>
                   <span className="text-[5px] leading-tight break-all px-0.5">{t.recurring}</span>
                </div>

                {/* Project */}
                <div className="flex flex-col items-center justify-end gap-0.5 pb-0.5">
                   <i className="fas fa-sitemap text-sm text-emerald-600 dark:text-emerald-400"></i>
                   <span className="text-[5px] leading-tight">{t.project}</span>
                </div>
            </div>

            {/* Grid Rows */}
            {stats.map((row, idx) => (
                <div 
                    key={row.label} 
                    className={`
                        grid grid-cols-[0.8fr_1.8fr_1fr_1fr_1fr_1fr] py-3 items-center text-xs border-b border-gray-50 dark:border-gray-700/50 last:border-0
                        ${idx === 0 ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                    `}
                >
                    {/* Total (Left) */}
                    <div className="text-center font-bold text-gray-900 dark:text-white">
                        {row.total}
                    </div>
                    {/* Period (Left aligned) */}
                    <div className="pl-3 font-medium text-gray-800 dark:text-gray-200 truncate pr-1 text-[10px] leading-tight">
                        {row.label}
                    </div>
                    {/* Created */}
                    <div className="text-center font-medium text-gray-600 dark:text-gray-300">
                        {row.created}
                    </div>
                    {/* Standalone */}
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        {row.standalone}
                    </div>
                    {/* Recurring */}
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        {row.recurring}
                    </div>
                    {/* Project */}
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        {row.project}
                    </div>
                </div>
            ))}
        </div>


        {/* Desktop Table (Hidden < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {/* Total First */}
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs text-center w-[80px]">{t.total}</th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs w-1/5">{t.period}</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">
                   <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-plus-circle text-base"></i>
                    <span>{t.created}</span>
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-xs text-center">
                  <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-flag text-base"></i>
                    <span>{t.standalone}</span>
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-xs text-center">
                   <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-sync-alt text-base"></i>
                    <span>{t.recurring}</span>
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-xs text-center">
                   <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-sitemap text-base"></i>
                    <span>{t.project}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.map((row, idx) => (
                <tr 
                  key={row.label} 
                  className={`
                    hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                    ${idx === 0 ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                  `}
                >
                  {/* Total First */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold min-w-[2rem]">
                      {row.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                    {row.label}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400 font-medium">
                    {row.created}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                    {row.standalone}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                    {row.recurring}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                    {row.project}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Habit Stats Table */}
      {habitStats.length > 0 && (
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <i className="fas fa-leaf text-green-500"></i> {t.habitSuccess}
                </h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                         <tr>
                             <th className="px-6 py-3">{t.habitName}</th>
                             <th className="px-6 py-3 text-center">{t.historyTotal}</th>
                             <th className="px-4 py-3 text-center">{t.rate7d}</th>
                             <th className="px-4 py-3 text-center">{t.rate14d}</th>
                             <th className="px-4 py-3 text-center">{t.rate30d}</th>
                             <th className="px-4 py-3 text-center">{t.rate90d}</th>
                             <th className="px-4 py-3 text-center">{t.rate365d}</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {habitStats.map(habit => (
                             <tr key={habit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]" title={habit.title}>
                                     {habit.title}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-bold min-w-[2rem]">
                                         {habit.totalCompleted}
                                     </span>
                                 </td>
                                 {['last7d', 'last14d', 'last30d', 'last90d', 'last365d'].map(key => {
                                      const val = habit.rates[key as keyof typeof habit.rates];
                                      let colorClass = 'text-gray-500';
                                      if (val >= 80) colorClass = 'text-green-600 dark:text-green-400 font-bold';
                                      else if (val >= 50) colorClass = 'text-yellow-600 dark:text-yellow-400';
                                      else if (val > 0) colorClass = 'text-orange-500 dark:text-orange-400';

                                      return (
                                          <td key={key} className={`px-4 py-4 text-center ${colorClass}`}>
                                              {val}%
                                          </td>
                                      )
                                 })}
                             </tr>
                         ))}
                     </tbody>
                </table>
            </div>
         </div>
      )}

      {/* Explainer Cards (Hidden on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 hidden md:grid">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-3">
             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <i className="fas fa-flag text-xl"></i>
             </div>
             <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{t.standalone}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                   {t.standaloneDesc}
                </p>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-3">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <i className="fas fa-sync-alt text-xl"></i>
             </div>
             <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{t.recurring}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                   {t.recurringDesc}
                </p>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-3">
             <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <i className="fas fa-sitemap text-xl"></i>
             </div>
             <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{t.project}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                   {t.projectDesc}
                </p>
             </div>
          </div>
      </div>
    </div>
  );
};