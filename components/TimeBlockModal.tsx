
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TaskType, TimeBlock, RecurrenceFrequency, RecurrenceEndCondition } from '../types';
import { MiniDatePicker } from './form/MiniDatePicker';
import { AnalogTimePicker } from './form/AnalogTimePicker';
import { RecurrenceScheduler } from './form/RecurrenceScheduler';
import { taskManager } from '../services/taskManager';

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Omit<TimeBlock, 'id'>) => void;
  onDelete: (id: string) => void;
  initialBlock?: TimeBlock;
  initialDate?: Date; 
  initialRange?: { start: Date, end: Date }; // New prop
  t: any;
}

const TASK_TYPES: TaskType[] = [
  'Study',
  'Work',
  'Hobby',
  'Health',
  'Habit',
  'Chores',
  'Commute'
];

const COLORS = [
  { name: 'Red', value: '#fecaca' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Amber', value: '#fde68a' },
  { name: 'Lime', value: '#bef264' },
  { name: 'Emerald', value: '#6ee7b7' },
  { name: 'Sky', value: '#7dd3fc' },
  { name: 'Blue', value: '#93c5fd' },
  { name: 'Indigo', value: '#a5b4fc' },
  { name: 'Violet', value: '#c4b5fd' },
  { name: 'Pink', value: '#f9a8d4' },
];

const toLocalYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toLocalHM = (date: Date): string => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

export const TimeBlockModal: React.FC<TimeBlockModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialBlock, initialDate, initialRange, t 
}) => {
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType | ''>('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('#fecaca');
  
  // Timings
  const [startDateStr, setStartDateStr] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDateStr, setEndDateStr] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState<number | ''>(60);

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recFrequency, setRecFrequency] = useState<RecurrenceFrequency | ''>('');
  const [recInterval, setRecInterval] = useState<number | ''>('');
  const [recDays, setRecDays] = useState<string[]>([]);
  const [recEndCondition, setRecEndCondition] = useState<RecurrenceEndCondition>('No end date');
  const [recEndCount, setRecEndCount] = useState<number | ''>('');
  const [recEndDate, setRecEndDate] = useState('');

  // UI States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isInvalidTime, setIsInvalidTime] = useState(false);

  // Tag Autocomplete
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);
  const endTimePickerRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) setShowTimePicker(false);
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) setShowEndDatePicker(false);
      if (endTimePickerRef.current && !endTimePickerRef.current.contains(event.target as Node)) setShowEndTimePicker(false);
      if (tagSuggestionsRef.current && !tagSuggestionsRef.current.contains(event.target as Node) && tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) setShowTagSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Load tags from all tasks and blocks
      const allTags = new Set<string>();
      taskManager.getAllTasksIncludingArchived().forEach(t => t.tags?.forEach(tag => allTags.add(tag)));
      taskManager.getAllTimeBlocks().forEach(b => b.tags?.forEach(tag => allTags.add(tag)));
      setAvailableTags(Array.from(allTags));

      setIsInvalidTime(false);
      setShowTagSuggestions(false);

      if (initialBlock) {
        setTitle(initialBlock.title);
        setTaskType(initialBlock.taskType || '');
        setTags(initialBlock.tags?.join(', ') || '');
        setColor(initialBlock.color || '#fecaca');
        
        const start = new Date(initialBlock.startTime);
        const end = new Date(initialBlock.endTime);
        
        setStartDateStr(toLocalYMD(start));
        setStartTime(toLocalHM(start));
        
        setEndDateStr(toLocalYMD(end));
        setEndTime(toLocalHM(end));
        
        const diffMin = (initialBlock.endTime - initialBlock.startTime) / 60000;
        setDuration(Math.round(diffMin));

        setIsRecurring(!!initialBlock.isRecurring);
        if (initialBlock.recurrencePattern) {
            setRecFrequency(initialBlock.recurrencePattern.frequency);
            setRecInterval(initialBlock.recurrencePattern.interval);
            setRecDays(initialBlock.recurrencePattern.daysOfWeek || []);
            setRecEndCondition(initialBlock.recurrencePattern.endCondition);
            setRecEndCount(initialBlock.recurrencePattern.endCount || '');
            setRecEndDate(initialBlock.recurrencePattern.endDate ? toLocalYMD(new Date(initialBlock.recurrencePattern.endDate)) : '');
        } else {
            setRecFrequency('');
            setRecInterval('');
            setRecDays([]);
            setRecEndCondition('No end date');
            setRecEndCount('');
            setRecEndDate('');
        }

      } else {
        // Create Mode
        setTitle('');
        setTaskType('');
        setTags('');
        setColor('#fecaca');
        setIsRecurring(false);
        setRecFrequency(''); setRecInterval(''); setRecDays([]); setRecEndCondition('No end date'); setRecEndCount(''); setRecEndDate('');
        
        let startD = initialDate || new Date();
        let endD = new Date(startD.getTime() + 3600000); // Default 1 hr

        if (initialRange) {
            startD = initialRange.start;
            endD = initialRange.end;
        } else if (!initialDate) {
            // If neither provided, default to now rounded to hour
            startD.setMinutes(0,0,0);
            endD = new Date(startD.getTime() + 3600000);
        }
        
        setStartDateStr(toLocalYMD(startD));
        setStartTime(toLocalHM(startD));
        setEndDateStr(toLocalYMD(endD));
        setEndTime(toLocalHM(endD));
        setDuration(Math.round((endD.getTime() - startD.getTime())/60000));
      }
      setShowDatePicker(false); setShowTimePicker(false); setShowEndDatePicker(false); setShowEndTimePicker(false);
    }
  }, [isOpen, initialBlock, initialDate, initialRange]);

  const toggleDay = (day: string) => {
    setRecDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // --- Tag Autocomplete Logic ---
  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTags(val);
      
      const segments = val.split(',');
      const lastSegment = segments[segments.length - 1].trim().toLowerCase();
      const currentTags = segments.map(s => s.trim());

      if (lastSegment) {
          const matches = availableTags.filter(t => 
              t.toLowerCase().includes(lastSegment) && 
              !currentTags.includes(t) 
          ).slice(0, 5);
          setTagSuggestions(matches);
          setShowTagSuggestions(matches.length > 0);
      } else {
          setShowTagSuggestions(false);
      }
  };

  const addTagSuggestion = (tag: string) => {
      const segments = tags.split(',');
      segments.pop(); 
      segments.push(' ' + tag);
      setTags(segments.join(',') + ', ');
      setShowTagSuggestions(false);
      tagInputRef.current?.focus();
  };

  // --- Logic for Duration & Time Sync ---

  const triggerTimeError = () => {
    setIsInvalidTime(true);
    setTimeout(() => setIsInvalidTime(false), 500);
  };

  const getStartObj = (dStr: string, tStr: string) => {
      const [y, m, d] = dStr.split('-').map(Number);
      const [h, min] = tStr.split(':').map(Number);
      return new Date(y, m - 1, d, h, min);
  };

  const getEndObj = (dStr: string, tStr: string) => {
      const [y, m, d] = dStr.split('-').map(Number);
      const [h, min] = tStr.split(':').map(Number);
      return new Date(y, m - 1, d, h, min);
  };

  const handleStartChange = (newDateStr: string, newTimeStr: string) => {
      setStartDateStr(newDateStr);
      setStartTime(newTimeStr);

      if (duration !== '') {
          // If we have a valid duration, shift the end time
          const start = getStartObj(newDateStr, newTimeStr);
          const newEnd = new Date(start.getTime() + (Number(duration) * 60000));
          setEndDateStr(toLocalYMD(newEnd));
          setEndTime(toLocalHM(newEnd));
      } else {
          // If no duration set (shouldn't happen often in blocks), just enforce End >= Start
          const start = getStartObj(newDateStr, newTimeStr);
          const end = getEndObj(endDateStr, endTime);
          if (end < start) {
              setEndDateStr(newDateStr);
              setEndTime(newTimeStr);
          }
      }
  };

  const handleEndChange = (newDateStr: string, newTimeStr: string) => {
      setEndDateStr(newDateStr);
      setEndTime(newTimeStr);

      const start = getStartObj(startDateStr, startTime);
      const end = getEndObj(newDateStr, newTimeStr);

      if (end < start) {
          triggerTimeError();
      } else {
          const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
          setDuration(diffMin);
      }
  };

  const handleDurationChange = (val: number | '') => {
      setDuration(val);
      // Check if value is not a number (empty string case)
      if (typeof val !== 'number') return;
      
      const start = getStartObj(startDateStr, startTime);
      const newEnd = new Date(start.getTime() + (val * 60000));
      setEndDateStr(toLocalYMD(newEnd));
      setEndTime(toLocalHM(newEnd));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return; // Title is required, but empty string handles this

    const start = getStartObj(startDateStr, startTime);
    const end = getEndObj(endDateStr, endTime);

    if (end <= start) {
        alert(t.endTimeBeforeStart || "End time must be after start time");
        return;
    }

    if (isRecurring) {
        if (!recFrequency) { alert(t.selectFrequency || "Please select a frequency"); return; }
        if (!recInterval) { alert(t.setRecInterval || "Please set interval"); return; }
        if (recFrequency === 'Weekly' && recDays.length === 0) { alert(t.selectDays || "Select days of week"); return; }
    }

    onSave({
        title,
        startTime: start.getTime(),
        endTime: end.getTime(),
        taskType: taskType || undefined,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        color,
        isRecurring,
        recurrencePattern: isRecurring ? {
            frequency: recFrequency as RecurrenceFrequency,
            interval: Number(recInterval),
            daysOfWeek: recFrequency === 'Weekly' ? recDays : undefined,
            endCondition: recEndCondition,
            endCount: recEndCount ? Number(recEndCount) : undefined,
            endDate: recEndDate ? new Date(recEndDate).getTime() : undefined
        } : undefined
    });
    // Close is handled by parent after save
  };

  const getTypeLabel = (type: TaskType) => {
      switch(type) {
          case 'Study': return t.studyDev;
          case 'Work': return t.workProf;
          case 'Hobby': return t.hobbyPers;
          case 'Health': return t.usefulProd;
          case 'Habit': return t.harmfulHabit;
          case 'Chores': return t.chores;
          case 'Commute': return t.commute;
          default: return type;
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[95vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-800 dark:text-white">
                {initialBlock ? t.editTimeBlock : t.addTimeBlock}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i className="fas fa-times"></i></button>
        </div>
        
        <form id="time-block-form" onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.titleLabel}</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder={t.blockTitlePlaceholder}
                    autoFocus
                />
            </div>

            {/* Schedule Grid */}
            <div className={`bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-100 dark:border-gray-700 space-y-3 transition-all duration-200 ${isInvalidTime ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                    <label className={`text-xs font-bold uppercase ${isInvalidTime ? 'text-red-500' : 'text-gray-500'}`}>{t.scheduleSection}</label>
                </div>
                
                {/* Start Row */}
                <div className="flex gap-2 items-center justify-between md:justify-start relative">
                        <span className="text-xs font-bold text-gray-500 uppercase md:w-28 shrink-0">{t.start}</span>
                        
                        <div className="flex gap-1 items-center justify-end">
                            {/* Date Input */}
                            <div className="w-36 relative" ref={datePickerRef}>
                            <div className="flex items-center border dark:border-gray-600 rounded bg-white dark:bg-gray-700 overflow-hidden">
                                <input 
                                    type="date" 
                                    value={startDateStr} 
                                    onChange={(e) => handleStartChange(e.target.value, startTime)}
                                    className="w-full px-2 py-1.5 text-xs bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 [&::-webkit-calendar-picker-indicator]:hidden text-right"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="px-2 py-1.5 text-gray-400 hover:text-indigo-500 border-l dark:border-gray-600"
                                >
                                    <i className="far fa-calendar"></i>
                                </button>
                            </div>
                            {showDatePicker && <MiniDatePicker selectedDate={startDateStr} onSelect={(d) => handleStartChange(d, startTime)} onClose={() => setShowDatePicker(false)} language={t.language} />}
                            </div>

                            {/* Clock Button */}
                            <div className="relative" ref={timePickerRef}>
                                <button 
                                type="button" 
                                onClick={() => setShowTimePicker(!showTimePicker)}
                                className={`w-8 h-8 flex items-center justify-center rounded border dark:border-gray-600 transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-600`}
                                >
                                <i className="far fa-clock"></i>
                                </button>
                                {showTimePicker && <AnalogTimePicker selectedTime={startTime} onSelect={(t) => handleStartChange(startDateStr, t)} onClose={() => setShowTimePicker(false)} t={t} />}
                            </div>

                            {/* Time Input */}
                            <div className="w-24">
                                <input 
                                type="time" 
                                value={startTime}
                                onChange={(e) => handleStartChange(startDateStr, e.target.value)}
                                className={`w-full border dark:border-gray-600 rounded px-2 py-1.5 text-xs h-8 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-center`}
                                />
                            </div>
                        </div>
                </div>

                {/* End Row */}
                <div className="flex gap-2 items-center justify-between md:justify-start relative">
                        <span className={`text-xs font-bold uppercase md:w-28 shrink-0 ${isInvalidTime ? 'text-red-500' : 'text-gray-500'}`}>{t.end}</span>
                        
                        <div className="flex gap-1 items-center justify-end">
                            {/* End Date Input */}
                            <div className="w-36 relative" ref={endDatePickerRef}>
                            <div className="flex items-center border dark:border-gray-600 rounded bg-white dark:bg-gray-700 overflow-hidden">
                                <input 
                                    type="date" 
                                    value={endDateStr} 
                                    onChange={(e) => handleEndChange(e.target.value, endTime)}
                                    className="w-full px-2 py-1.5 text-xs bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 [&::-webkit-calendar-picker-indicator]:hidden text-right"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowEndDatePicker(!showEndDatePicker)}
                                    className="px-2 py-1.5 text-gray-400 hover:text-indigo-500 border-l dark:border-gray-600"
                                >
                                    <i className="far fa-calendar-check"></i>
                                </button>
                            </div>
                            {showEndDatePicker && <MiniDatePicker selectedDate={endDateStr} onSelect={(d) => handleEndChange(d, endTime)} onClose={() => setShowEndDatePicker(false)} language={t.language} />}
                            </div>

                            {/* End Clock Button */}
                            <div className="relative" ref={endTimePickerRef}>
                                <button 
                                type="button" 
                                onClick={() => setShowEndTimePicker(!showEndTimePicker)}
                                className={`w-8 h-8 flex items-center justify-center rounded border dark:border-gray-600 transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-600`}
                                >
                                <i className="far fa-clock"></i>
                                </button>
                                {showEndTimePicker && <AnalogTimePicker selectedTime={endTime} onSelect={(t) => handleEndChange(endDateStr, t)} onClose={() => setShowEndTimePicker(false)} t={t} />}
                            </div>

                            {/* End Time Input */}
                            <div className="w-24">
                                <input 
                                type="time" 
                                value={endTime} 
                                onChange={(e) => handleEndChange(endDateStr, e.target.value)}
                                className={`w-full border dark:border-gray-600 rounded px-2 py-1.5 text-xs h-8 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-center`}
                                />
                            </div>
                        </div>
                </div>

                {/* Duration Row */}
                <div className="flex gap-2 items-center justify-between md:justify-start pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 uppercase md:w-28 shrink-0">{t.duration}</span>
                        <div className="flex gap-2 items-center justify-end">
                            <div className="w-28">
                                <input type="number" min="1" value={duration} onChange={(e) => handleDurationChange(e.target.value ? Number(e.target.value) : '')} className="w-full border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-right" placeholder={t.minutesFull} />
                            </div>
                            <div className="text-xs text-gray-400 text-right w-16">{duration ? `${Math.floor(Number(duration)/60)}h ${Number(duration)%60}m` : ''}</div>
                        </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                 <div className="col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.colorMarker}</label>
                     <div className="flex gap-3 overflow-x-auto no-scrollbar py-3">
                         {COLORS.map(c => (
                             <button
                                key={c.name}
                                type="button"
                                onClick={() => setColor(c.value)}
                                className={`w-8 h-8 rounded-full border shrink-0 transition-transform hover:scale-110 ${color === c.value ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 scale-110' : ''}`}
                                style={{ backgroundColor: c.value }}
                             />
                         ))}
                     </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.contextType}</label>
                <select value={taskType} onChange={e => setTaskType(e.target.value as TaskType)} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">{t.none}</option>
                    {TASK_TYPES.map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                </select>
            </div>

            <div className="relative">
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.contextTags}</label>
                 <input 
                    ref={tagInputRef}
                    type="text" 
                    value={tags} 
                    onChange={handleTagChange} 
                    className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    placeholder={t.commaTags}
                />
                
                {showTagSuggestions && (
                    <div 
                        ref={tagSuggestionsRef}
                        className="absolute z-30 bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto"
                    >
                        {tagSuggestions.map((tag, idx) => (
                            <div 
                                key={idx}
                                onClick={() => addTagSuggestion(tag)}
                                className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"
                            >
                                <i className="fas fa-tag text-xs text-gray-400"></i>
                                {tag}
                            </div>
                        ))}
                    </div>
                )}
            </div>

             {/* Recurrence Settings */}
             <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${isRecurring ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                    <input 
                        type="checkbox" 
                        id="blockRecurring"
                        checked={isRecurring}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            setIsRecurring(checked);
                            if (checked && !recInterval) setRecInterval(1);
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-gray-500"
                    />
                    <label htmlFor="blockRecurring" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">{t.repeat}</label>
                  </div>

                  {isRecurring && (
                      <div className="mt-2 space-y-2 pl-2">
                           <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.frequency}</label>
                                    <select 
                                        value={recFrequency}
                                        onChange={(e) => setRecFrequency(e.target.value as RecurrenceFrequency)}
                                        className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs"
                                    >
                                        <option value="" disabled>{t.selectOption || "Select..."}</option>
                                        <option value="Daily">{t.daily}</option>
                                        <option value="Weekly">{t.weekly}</option>
                                        <option value="Monthly">{t.monthly}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.every} (X) {recFrequency === 'Monthly' ? t.months : (recFrequency === 'Weekly' ? t.weeks : t.days)}</label>
                                    <input type="number" min="1" value={recInterval} onChange={e => setRecInterval(Number(e.target.value))} className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs" />
                                </div>
                           </div>

                           {recFrequency === 'Weekly' && (
                                <div className="flex flex-wrap gap-1">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`w-7 h-7 rounded text-[10px] font-bold ${recDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 border text-gray-500'}`}
                                        >
                                            {day.substring(0, 1)}
                                        </button>
                                    ))}
                                </div>
                           )}

                           <div>
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.endCondition}</label>
                                <div className="flex gap-2">
                                    <select value={recEndCondition} onChange={e => setRecEndCondition(e.target.value as RecurrenceEndCondition)} className="flex-1 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs">
                                        <option value="No end date">{t.never}</option>
                                        <option value="After X occurrences">{t.afterX}</option>
                                        <option value="Until specific date">{t.untilDate}</option>
                                    </select>
                                    {recEndCondition === 'After X occurrences' && (
                                        <input type="number" min="1" value={recEndCount} onChange={e => setRecEndCount(Number(e.target.value))} className="w-14 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs" />
                                    )}
                                    {recEndCondition === 'Until specific date' && (
                                        <input type="date" value={recEndDate} onChange={e => setRecEndDate(e.target.value)} className="w-24 border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-xs" />
                                    )}
                                </div>
                           </div>
                      </div>
                  )}
             </div>
        </form>

        {/* FOOTER: Moved outside form for safe deletion */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-between items-center shrink-0">
             {initialBlock && onDelete ? (
                 <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); onDelete(initialBlock.id); }}
                    className="text-red-500 text-xs font-bold hover:underline"
                 >
                    {t.delete}
                 </button>
             ) : <div></div>}
             
             <div className="flex gap-2">
                 <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">{t.cancel}</button>
                 <button type="submit" form="time-block-form" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm">{t.save}</button>
             </div>
        </div>
      </div>
    </div>
  );
};
