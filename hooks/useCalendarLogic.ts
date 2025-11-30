

import { Task, RecurrencePattern } from '../types';
import { taskManager } from '../services/taskManager';

export const useCalendarLogic = () => {
  
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const getDaysInGrid = (currentDate: Date, viewType: 'day' | '3days' | 'week' | '2weeks' | 'month') => {
    const days: Date[] = [];
    if (viewType === 'day') {
      days.push(startOfDay(currentDate));
    } else if (viewType === '3days') {
      for (let i = 0; i < 3; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        days.push(startOfDay(d));
      }
    } else if (viewType === 'week' || viewType === '2weeks') {
      const day = currentDate.getDay(); 
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start
      const monday = new Date(currentDate);
      monday.setDate(diff);
      const count = viewType === 'week' ? 7 : 14;
      for (let i = 0; i < count; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        days.push(startOfDay(nextDay));
      }
    } else if (viewType === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      let startDay = firstDayOfMonth.getDay();
      let offset = startDay === 0 ? 6 : startDay - 1; // Adjust to Monday start
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - offset);
      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(startOfDay(d));
      }
    }
    return days;
  };

  const checkRecurrenceOverlap = (pattern: RecurrencePattern, startTs: number, targetDayStart: number) => {
       return taskManager.checkRecurrenceOverlap(pattern, startTs, targetDayStart);
  };
  
  // Generic spillover check for tasks or blocks
  const checkRecurrenceSpillover = (
      pattern: RecurrencePattern, 
      baseStart: number, 
      duration: number, 
      targetDayStart: number
  ) => {
      if (duration <= 0) return false;
       // Look back enough days to cover the duration
       const daysToCheck = Math.ceil(duration / 86400000);
       
       for (let i = 1; i <= daysToCheck + 1; i++) {
           const checkDate = targetDayStart - (i * 86400000);
           // Check if an instance started on 'checkDate'
           if (taskManager.checkRecurrenceOverlap(pattern, baseStart, checkDate)) {
                // Instance started at checkDate
                const orig = new Date(baseStart);
                const instanceStart = new Date(checkDate);
                // Preserve original time of day
                instanceStart.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
                
                const instanceEnd = instanceStart.getTime() + duration;
                
                // Does this instance spill into (or cover) the target day?
                // It spills over if it ends AFTER the target day starts.
                if (instanceEnd > targetDayStart) return true;
           }
       }
       return false;
  };

  const getTasksForDay = (tasks: Task[], date: Date, viewType?: string, habitTag?: string) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    
    return tasks.filter(task => {
        // FILTER: If it's a "Habit" (via tag OR type) and we are NOT in Day/3Day view, hide it.
        // We check taskType first as it is language-independent.
        const isHabit = (task.taskType === 'Health' || task.taskType === 'Habit') 
                        || (habitTag && task.tags && task.tags.includes(habitTag));

        if (viewType && isHabit) {
            if (viewType !== 'day' && viewType !== '3days') {
                return false;
            }
        }

        const duration = (task.timeEstimateMinutes || 0) * 60000;

        // 1. Regular Tasks (Overlap Check)
        if (!task.isRecurring && task.scheduledTime) {
             const start = task.scheduledTime;
             const effectiveDuration = Math.max(duration, 1); 
             const end = start + effectiveDuration;
             // Check if the task interval overlaps with the day interval
             return start < dayEnd && end > dayStart;
        }

        // 2. Recurring Tasks
        if (task.isRecurring && task.scheduledTime) {
             // Check today
             if (taskManager.isTaskScheduledForDate(task, dayStart)) return true;
             
             // Check spillover using robust lookback
             if (duration > 0) {
                 if (checkRecurrenceSpillover(task.recurrencePattern!, task.scheduledTime, duration, dayStart)) {
                     return true;
                 }
             }
        }
        
        return false;
    });
  };

  return {
      getDaysInGrid,
      checkRecurrenceOverlap,
      checkRecurrenceSpillover, // Exported for TimeGridView to use with blocks
      getTasksForDay,
      startOfDay
  };
};