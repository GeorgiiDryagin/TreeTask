


import React from 'react';
import { RecurrenceFrequency, RecurrenceEndCondition } from '../../types';

interface RecurrenceSchedulerProps {
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  allowRecurrence: boolean;
  initialIsRecurring?: boolean;
  recFrequency: RecurrenceFrequency | '';
  setRecFrequency: (val: RecurrenceFrequency) => void;
  recInterval: number | '';
  setRecInterval: (val: number | '') => void;
  recDays: string[];
  setRecDays: (val: string[] | ((prev: string[]) => string[])) => void;
  recEndCondition: RecurrenceEndCondition;
  setRecEndCondition: (val: RecurrenceEndCondition) => void;
  recEndCount: number | '';
  setRecEndCount: (val: number | '') => void;
  recEndDate: string;
  setRecEndDate: (val: string) => void;
  t: any;
  language: string;
}

export const RecurrenceScheduler: React.FC<RecurrenceSchedulerProps> = ({
  isRecurring, setIsRecurring, allowRecurrence, initialIsRecurring,
  recFrequency, setRecFrequency, recInterval, setRecInterval,
  recDays, setRecDays, recEndCondition, setRecEndCondition,
  recEndCount, setRecEndCount, recEndDate, setRecEndDate,
  t, language
}) => {
  const toggleDay = (day: string) => { 
      setRecDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]); 
  };

  return (
    <>
        {(allowRecurrence || isRecurring) && (
            <div className="flex items-center gap-2">
                <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={(e) => { setIsRecurring(e.target.checked); if(e.target.checked && !recInterval) setRecInterval(1); }} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="isRecurring" className="text-xs font-bold cursor-pointer text-gray-600 dark:text-gray-300">{t.repeat}</label>
            </div>
        )}
        
        {isRecurring && (allowRecurrence || initialIsRecurring) && (
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 grid grid-cols-2 gap-2">
                    <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{t.frequency}</label>
                    <select value={recFrequency} onChange={(e) => setRecFrequency(e.target.value as RecurrenceFrequency)} className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs h-8">
                        <option value="" disabled>Select...</option>
                        <option value="Daily">{t.daily}</option>
                        <option value="Weekly">{t.weekly}</option>
                        <option value="Monthly">{t.monthly}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{t.every} (X) {recFrequency === 'Monthly' ? t.months : (recFrequency === 'Weekly' ? t.weeks : t.days)}</label>
                    <input type="number" min="1" value={recInterval} onChange={(e) => setRecInterval(e.target.value ? Number(e.target.value) : '')} className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs h-8" />
                </div>
                {recFrequency === 'Weekly' && (
                    <div className="col-span-2 flex gap-1 flex-wrap">
                        {(language === 'ru' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, i) => {
                            const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
                            return (
                                <button key={dayName} type="button" onClick={() => toggleDay(dayName)} className={`w-7 h-7 rounded text-[10px] font-bold ${recDays.includes(dayName) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 border text-gray-500'}`}>{day}</button>
                            )
                        })}
                    </div>
                )}
                <div className="col-span-2 flex gap-2">
                        <select value={recEndCondition} onChange={(e) => setRecEndCondition(e.target.value as RecurrenceEndCondition)} className="flex-1 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs h-8">
                            <option value="No end date">{t.never}</option>
                            <option value="After X occurrences">{t.afterX}</option>
                            <option value="Until specific date">{t.untilDate}</option>
                        </select>
                        {recEndCondition === 'After X occurrences' && <input type="number" min="1" value={recEndCount} onChange={(e) => setRecEndCount(e.target.value ? Number(e.target.value) : '')} className="w-16 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs h-8" />}
                        {recEndCondition === 'Until specific date' && <input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} className="w-28 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs h-8" />}
                </div>
            </div>
        )}
    </>
  );
};
