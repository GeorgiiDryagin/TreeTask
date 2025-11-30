
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Task, 
  TaskPriority, 
  TaskStatus, 
  TaskType, 
  RecurrenceFrequency, 
  RecurrenceEndCondition,
  CreateTaskPayload,
  UpdateTaskPayload
} from '../types';
import { MiniDatePicker } from './form/MiniDatePicker';
import { AnalogTimePicker } from './form/AnalogTimePicker';
import { RecurrenceScheduler } from './form/RecurrenceScheduler';

export interface TaskFormPrefill {
    tags?: string[];
    taskType?: TaskType;
    timeEstimate?: number;
    recurrencePattern?: {
        frequency: RecurrenceFrequency;
        interval: number;
        endCondition: RecurrenceEndCondition;
    };
    isRecurring?: boolean;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskPayload | UpdateTaskPayload) => void;
  onDelete?: (taskId: string) => void; 
  initialData?: Task;
  defaultParentId?: string | null;
  availableUsers: Array<{ id: string; name: string }>;
  t: any;
  language: string;
  allowRecurrence?: boolean;
  prefillData?: TaskFormPrefill; 
  allTasks?: Task[]; 
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

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'Completed', 'Cancelled'];

const COLOR_PALETTE = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

// --- Helper Functions ---
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

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, defaultParentId, availableUsers, t, language, allowRecurrence = false, prefillData, allTasks = []
}) => {
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Not Started');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [taskType, setTaskType] = useState<TaskType | ''>('');
  const [color, setColor] = useState('');
  
  const [scheduledDate, setScheduledDate] = useState(''); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState(''); // HH:MM
  
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD
  const [endTime, setEndTime] = useState(''); // HH:MM

  const [timeEstimate, setTimeEstimate] = useState<number | ''>('');
  const [actualDuration, setActualDuration] = useState<number | ''>('');

  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [assignee, setAssignee] = useState<string>('');
  const [tags, setTags] = useState<string>('');

  const [isRecurring, setIsRecurring] = useState(false);
  const [recFrequency, setRecFrequency] = useState<RecurrenceFrequency | ''>('');
  const [recInterval, setRecInterval] = useState<number | ''>('');
  const [recDays, setRecDays] = useState<string[]>([]);
  const [recEndCondition, setRecEndCondition] = useState<RecurrenceEndCondition>('No end date');
  const [recEndCount, setRecEndCount] = useState<number | ''>('');
  const [recEndDate, setRecEndDate] = useState('');

  const [activeTab, setActiveTab] = useState<'details' | 'people'>('details');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isInvalidTime, setIsInvalidTime] = useState(false);

  // Parent Selection State
  const [parentSearch, setParentSearch] = useState('');
  const [showParentSuggestions, setShowParentSuggestions] = useState(false);

  // Tag Autocomplete State
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);
  const endTimePickerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const parentSearchRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) setShowTimePicker(false);
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) setShowEndDatePicker(false);
      if (endTimePickerRef.current && !endTimePickerRef.current.contains(event.target as Node)) setShowEndTimePicker(false);
      if (parentSearchRef.current && !parentSearchRef.current.contains(event.target as Node)) setShowParentSuggestions(false);
      if (tagSuggestionsRef.current && !tagSuggestionsRef.current.contains(event.target as Node) && tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) setShowTagSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsInvalidTime(false);
      setShowParentSuggestions(false);
      setShowTagSuggestions(false);
      if (initialData) {
        setTitle(initialData.title);
        setParentId(initialData.parentId);
        setDescription(initialData.description || '');
        setStatus(initialData.status);
        setPriority(initialData.priority);
        setTaskType(initialData.taskType || '');
        setColor(initialData.color || '');
        
        let startDt: Date | null = null;
        let estMin = initialData.timeEstimateMinutes || 0;

        if (initialData.scheduledTime) {
          startDt = new Date(initialData.scheduledTime);
          setScheduledDate(toLocalYMD(startDt));
          
          if (!initialData.isAllDay) {
            setScheduledTime(toLocalHM(startDt));
          } else {
            setScheduledTime('');
          }
        } else {
          setScheduledDate('');
          setScheduledTime('');
        }

        if (startDt && estMin > 0) {
            const endDt = new Date(startDt.getTime() + (estMin * 60000));
            setEndDate(toLocalYMD(endDt));
            if (!initialData.isAllDay) {
                setEndTime(toLocalHM(endDt));
            } else {
                setEndTime('');
            }
        } else {
            setEndDate(startDt ? toLocalYMD(startDt) : '');
            setEndTime('');
        }

        setTimeEstimate(estMin || '');
        setActualDuration(initialData.actualDurationMinutes || '');
        setCollaborators(initialData.collaboratorIds || []);
        setAssignee(initialData.assigneeId || '');
        setTags(initialData.tags?.join(', ') || '');
        setIsRecurring(initialData.isRecurring);
        if (initialData.recurrencePattern) {
          setRecFrequency(initialData.recurrencePattern.frequency);
          setRecInterval(initialData.recurrencePattern.interval);
          setRecDays(initialData.recurrencePattern.daysOfWeek || []);
          setRecEndCondition(initialData.recurrencePattern.endCondition);
          setRecEndCount(initialData.recurrencePattern.endCount || '');
          setRecEndDate(initialData.recurrencePattern.endDate ? toLocalYMD(new Date(initialData.recurrencePattern.endDate)) : '');
        } else {
          setRecFrequency(''); setRecInterval(''); setRecDays([]); setRecEndCondition('No end date'); setRecEndCount(''); setRecEndDate('');
        }

        // Initialize Parent Search Text
        if (initialData.parentId) {
            const p = allTasks.find(t => t.id === initialData.parentId);
            setParentSearch(p ? p.title : '');
        } else {
            setParentSearch('');
        }

      } else {
        // NEW TASK
        setTitle(''); 
        setDescription(''); 
        setStatus('Not Started'); 
        setPriority('Medium'); 
        setTaskType(''); 
        setColor('');
        setActualDuration(''); 
        
        // Clear Dates & Time Estimate
        setScheduledDate('');
        setScheduledTime('');
        setEndDate('');
        setEndTime('');
        setTimeEstimate('');
        
        setCollaborators([]); 
        setAssignee(''); 
        setTags('');
        
        // Clear Recurrence
        setIsRecurring(false);
        setRecFrequency(''); 
        setRecInterval(''); 
        setRecDays([]); 
        setRecEndCondition('No end date'); 
        setRecEndCount(''); 
        setRecEndDate('');

        setParentId(defaultParentId || null);
        
        if (defaultParentId) {
            const p = allTasks.find(t => t.id === defaultParentId);
            setParentSearch(p ? p.title : '');
        } else {
            setParentSearch('');
        }
        
      }
      
      if (initialData && initialData.id === 'new') {
          // It's a new task creation
          const duration = prefillData?.timeEstimate || 60;
          setTimeEstimate(duration);
          
          if (initialData.scheduledTime) {
              const startDt = new Date(initialData.scheduledTime);
              const endDt = new Date(startDt.getTime() + (duration * 60000));
              setEndDate(toLocalYMD(endDt));
              if (!initialData.isAllDay) {
                  setEndTime(toLocalHM(endDt));
              } else {
                  setEndTime('');
              }
          }
      }

      // Prefill Recurrence/Tags
      if (prefillData) {
            if (prefillData.tags) setTags(prefillData.tags.join(', '));
            if (prefillData.taskType) setTaskType(prefillData.taskType);
            if (prefillData.isRecurring) {
                setIsRecurring(true);
                if (prefillData.recurrencePattern) {
                    setRecFrequency(prefillData.recurrencePattern.frequency);
                    setRecInterval(prefillData.recurrencePattern.interval);
                    setRecEndCondition(prefillData.recurrencePattern.endCondition);
                }
            }
      } else if (allowRecurrence) {
            setIsRecurring(true);
            setRecFrequency('Daily'); setRecInterval(1); setRecEndCondition('No end date');
      }

      setActiveTab('details');
      setShowDatePicker(false); setShowTimePicker(false); setShowEndDatePicker(false); setShowEndTimePicker(false);
      
      // Focus Title
      setTimeout(() => { titleInputRef.current?.focus(); }, 50);

    }
  }, [isOpen, initialData, allowRecurrence, prefillData, defaultParentId, allTasks]);

  const triggerTimeError = () => {
      setIsInvalidTime(true);
      setTimeout(() => setIsInvalidTime(false), 500); 
  };

  // Validates start vs end time when input is blurred/completed
  const validateTimes = () => {
      if (!scheduledDate || !endDate) return;
      
      const getDt = (dStr: string, tStr: string) => {
          const [y, m, d] = dStr.split('-').map(Number);
          const obj = new Date(y, m-1, d);
          if (tStr) {
              const [h, min] = tStr.split(':').map(Number);
              obj.setHours(h, min);
          } else {
              obj.setHours(0,0,0,0);
          }
          return obj.getTime();
      };

      const startTs = getDt(scheduledDate, scheduledTime);
      const endTs = getDt(endDate, endTime);

      if (endTs < startTs) {
          triggerTimeError();
      }
  };

  // --- PARENT FILTERING & CYCLE PREVENTION ---
  
  // 1. Calculate IDs to exclude (Self + All Descendants)
  const excludedTaskIds = useMemo(() => {
      const ids = new Set<string>();
      if (initialData && initialData.id !== 'new') {
          ids.add(initialData.id);
          
          const childrenMap = new Map<string, Task[]>();
          allTasks.forEach(t => {
              if (t.parentId) {
                  if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
                  childrenMap.get(t.parentId)?.push(t);
              }
          });

          const queue = [initialData.id];
          while(queue.length > 0) {
              const currentId = queue.shift()!;
              const children = childrenMap.get(currentId);
              if (children) {
                  children.forEach(child => {
                      if (!ids.has(child.id)) {
                          ids.add(child.id);
                          queue.push(child.id);
                      }
                  });
              }
          }
      }
      return ids;
  }, [initialData, allTasks]);

  const filteredParents = useMemo(() => {
      if (!parentSearch.trim()) return [];
      return allTasks.filter(t => 
          !excludedTaskIds.has(t.id) && 
          t.title.toLowerCase().includes(parentSearch.toLowerCase())
      ).slice(0, 5);
  }, [parentSearch, allTasks, excludedTaskIds]);

  // --- TAG AUTOCOMPLETE LOGIC ---
  const uniqueAvailableTags = useMemo(() => {
      const allTags = new Set<string>();
      allTasks.forEach(t => t.tags?.forEach(tag => allTags.add(tag)));
      return Array.from(allTags);
  }, [allTasks]);

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTags(val);
      
      const segments = val.split(',');
      const lastSegment = segments[segments.length - 1].trim().toLowerCase();
      const currentTags = segments.map(s => s.trim());

      if (lastSegment) {
          const matches = uniqueAvailableTags.filter(t => 
              t.toLowerCase().includes(lastSegment) && 
              !currentTags.includes(t) // Don't suggest if already added
          ).slice(0, 5);
          setTagSuggestions(matches);
          setShowTagSuggestions(matches.length > 0);
      } else {
          setShowTagSuggestions(false);
      }
  };

  const addTagSuggestion = (tag: string) => {
      const segments = tags.split(',');
      // Remove last partial segment
      segments.pop();
      // Add selected tag
      segments.push(' ' + tag);
      setTags(segments.join(',') + ', ');
      setShowTagSuggestions(false);
      tagInputRef.current?.focus();
  };

  // --- LOGIC ---

  const handleDurationChange = (minutes: number | '') => {
      setTimeEstimate(minutes);
      if (minutes === '' || !scheduledDate) return;
      
      const [sy, sm, sd] = scheduledDate.split('-').map(Number);
      let startDate = new Date(sy, sm - 1, sd);
      
      if (scheduledTime) {
          const [sh, smin] = scheduledTime.split(':').map(Number);
          startDate.setHours(sh, smin);
      } else {
          startDate.setHours(0,0,0,0);
      }

      const endDateObj = new Date(startDate.getTime() + (Number(minutes) * 60000));
      setEndDate(toLocalYMD(endDateObj));

      if (scheduledTime) {
          setEndTime(toLocalHM(endDateObj));
      }
  };

  const handleEndChange = (newEndDate: string, newEndTime: string) => {
      setEndDate(newEndDate);
      setEndTime(newEndTime);
      
      if (!scheduledDate || !newEndDate) return;

      const [sy, sm, sd] = scheduledDate.split('-').map(Number);
      let startDate = new Date(sy, sm - 1, sd);
      
      const [ey, em, ed] = newEndDate.split('-').map(Number);
      let endDateObj = new Date(ey, em - 1, ed);

      if (scheduledTime) {
          const [sh, smin] = scheduledTime.split(':').map(Number);
          startDate.setHours(sh, smin);
      } else {
          startDate.setHours(0,0,0,0);
      }

      if (newEndTime) {
          const [eh, emin] = newEndTime.split(':').map(Number);
          endDateObj.setHours(eh, emin);
      } else {
          endDateObj.setHours(0,0,0,0);
      }

      let diff = (endDateObj.getTime() - startDate.getTime()) / 60000;
      if (diff >= 0) {
          setTimeEstimate(Math.round(diff));
      }
  };

  const handleStartChange = (newStartDate: string, newStartTime: string) => {
      setScheduledDate(newStartDate);
      setScheduledTime(newStartTime);
      
      if (!timeEstimate && timeEstimate !== 0) {
          setEndDate(newStartDate);
          setEndTime(newStartTime);
          return;
      }

      if (newStartDate) {
          const [sy, sm, sd] = newStartDate.split('-').map(Number);
          let startDate = new Date(sy, sm - 1, sd);
          
          if (newStartTime) {
               const [sh, smin] = newStartTime.split(':').map(Number);
               startDate.setHours(sh, smin);
          } else {
               startDate.setHours(0,0,0,0);
          }

          const endDateObj = new Date(startDate.getTime() + (Number(timeEstimate) * 60000));
          setEndDate(toLocalYMD(endDateObj));
          if (newStartTime) {
              setEndTime(toLocalHM(endDateObj));
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalCollaborators = [...collaborators];
    if (assignee && !collaborators.includes(assignee)) {
      finalCollaborators.push(assignee);
    }
    
    if (isRecurring) {
        if (!recFrequency) { alert(t.selectFrequency || "Please select a frequency."); return; }
        if (!recInterval) { alert(t.setRecInterval || "Please specify the repeat interval."); return; }
        if (recFrequency === 'Weekly' && recDays.length === 0) { alert(t.selectDays || "Select at least one day."); return; }
        if (recEndCondition === 'After X occurrences' && !recEndCount) { alert(t.specifyOccurrences || "Specify number of occurrences."); return; }
    }

    let finalScheduledTime: number | undefined = undefined;
    let isAllDay = !scheduledTime;
    let finalDuration = timeEstimate === '' ? undefined : Number(timeEstimate);

    if (scheduledDate) {
      const [y, m, d] = scheduledDate.split('-').map(Number);
      let hours = 0;
      let minutes = 0;

      if (!isAllDay) {
        [hours, minutes] = scheduledTime.split(':').map(Number);
      }
      
      const startObj = new Date(y, m - 1, d, hours, minutes);
      finalScheduledTime = startObj.getTime();

      if (endDate) {
          const [ey, em, ed] = endDate.split('-').map(Number);
          let eh = 0, emin = 0;
          
          if (endTime) {
              [eh, emin] = endTime.split(':').map(Number);
          } else if (!isAllDay) {
              eh = 0; emin = 0;
          }
          
          const endObj = new Date(ey, em - 1, ed, eh, emin);
          const diffMs = endObj.getTime() - startObj.getTime();
          
          if (diffMs >= 0) {
              finalDuration = Math.round(diffMs / 60000);
          } else {
              triggerTimeError();
              return; 
          }
      } else if (isAllDay && timeEstimate && Number(timeEstimate) > 0) {
          finalDuration = Number(timeEstimate);
      }
    }

    const payload: any = {
      title, description, status, priority, taskType: taskType || undefined, color: color || undefined,
      scheduledTime: finalScheduledTime, isAllDay,
      timeEstimateMinutes: finalDuration,
      actualDurationMinutes: actualDuration === '' ? undefined : Number(actualDuration),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      collaboratorIds: finalCollaborators, assigneeId: assignee || undefined,
      parentId: parentId, 
      isRecurring,
      recurrencePattern: isRecurring ? {
        frequency: recFrequency as RecurrenceFrequency,
        interval: Number(recInterval),
        daysOfWeek: recFrequency === 'Weekly' ? recDays : undefined,
        endCondition: recEndCondition,
        endCount: recEndCount ? Number(recEndCount) : undefined,
        endDate: recEndDate ? new Date(recEndDate).getTime() : undefined
      } : undefined,
    };

    onSave(payload);
    onClose();
  };

  const handleDelete = () => { if (initialData && onDelete) { onDelete(initialData.id); onClose(); } };
  const toggleCollaborator = (uid: string) => {
    setCollaborators(prev => {
      const isSelected = prev.includes(uid);
      if (isSelected) { if (assignee === uid) setAssignee(''); return prev.filter(id => id !== uid); }
      return [...prev, uid];
    });
  };

  const getPriorityLabel = (p: TaskPriority) => {
      if (!t) return p;
      return t[p.toLowerCase()] || p;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">{initialData ? t.editTask : t.createTask}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i className="fas fa-times"></i></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 space-x-6 text-sm font-medium shrink-0">
          <button type="button" onClick={() => setActiveTab('details')} className={`py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500'}`}>{t.details}</button>
          <button type="button" onClick={() => setActiveTab('people')} className={`py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'people' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500'}`}>{t.peopleTags}</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-3">
            {activeTab === 'details' && (
              <div className="space-y-4">
                
                <input ref={titleInputRef} type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-base font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.titlePlaceholder} />

                {/* Parent Task Field */}
                <div className="relative" ref={parentSearchRef}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">{t.parentTask}</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={parentSearch} 
                            onChange={(e) => { setParentSearch(e.target.value); setShowParentSuggestions(true); if(!e.target.value) setParentId(null); }} 
                            onFocus={() => setShowParentSuggestions(true)}
                            className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder={t.searchParent} 
                        />
                        {parentId && (
                            <button 
                                type="button" 
                                onClick={() => { setParentId(null); setParentSearch(''); }}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {t.clear}
                            </button>
                        )}
                    </div>
                    
                    {showParentSuggestions && filteredParents.length > 0 && (
                        <div className="absolute z-20 top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl mt-1 overflow-hidden max-h-40 overflow-y-auto">
                            {filteredParents.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => { setParentId(p.id); setParentSearch(p.title); setShowParentSuggestions(false); }}
                                    className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                                >
                                    {p.title}
                                </div>
                            ))}
                        </div>
                    )}
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
                                        value={scheduledDate} 
                                        onChange={(e) => handleStartChange(e.target.value, scheduledTime)}
                                        onBlur={validateTimes} 
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
                                {showDatePicker && <MiniDatePicker selectedDate={scheduledDate} onSelect={(d) => { handleStartChange(d, scheduledTime); validateTimes(); }} onClose={() => setShowDatePicker(false)} language={language} />}
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
                                 {showTimePicker && <AnalogTimePicker selectedTime={scheduledTime} onSelect={(t) => { handleStartChange(scheduledDate, t); validateTimes(); }} onClose={() => setShowTimePicker(false)} t={t} />}
                             </div>

                             {/* Time Input (Manual) */}
                             <div className="w-24">
                                 <input 
                                    type="time" 
                                    value={scheduledTime}
                                    onChange={(e) => handleStartChange(scheduledDate, e.target.value)}
                                    onBlur={validateTimes} 
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
                                        value={endDate} 
                                        onChange={(e) => handleEndChange(e.target.value, endTime)}
                                        onBlur={validateTimes}
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
                                {showEndDatePicker && <MiniDatePicker selectedDate={endDate} onSelect={(d) => { handleEndChange(d, endTime); validateTimes(); }} onClose={() => setShowEndDatePicker(false)} language={language} />}
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
                                 {showEndTimePicker && <AnalogTimePicker selectedTime={endTime} onSelect={(t) => { handleEndChange(endDate, t); validateTimes(); }} onClose={() => setShowEndTimePicker(false)} t={t} />}
                             </div>

                             {/* End Time Input */}
                             <div className="w-24">
                                 <input 
                                    type="time" 
                                    value={endTime} 
                                    onChange={(e) => handleEndChange(endDate, e.target.value)}
                                    onBlur={validateTimes}
                                    className={`w-full border dark:border-gray-600 rounded px-2 py-1.5 text-xs h-8 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-center`}
                                 />
                             </div>
                         </div>
                    </div>

                    {/* Duration Display */}
                    <div className="flex gap-2 items-center justify-between md:justify-start pt-2 border-t border-gray-100 dark:border-gray-700">
                         <span className="text-xs font-bold text-gray-500 uppercase md:w-28 shrink-0">{t.duration}</span>
                         <div className="flex gap-2 items-center justify-end">
                             <div className="w-28">
                                 <input type="number" min="0" value={timeEstimate} onChange={(e) => handleDurationChange(e.target.value ? Number(e.target.value) : '')} className="w-full border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-right" placeholder={t.minutesFull} />
                             </div>
                             <div className="text-xs text-gray-400 text-right w-16">{timeEstimate ? `${Math.floor(Number(timeEstimate)/60)}h ${Number(timeEstimate)%60}m` : ''}</div>
                         </div>
                    </div>
                </div>

                <RecurrenceScheduler 
                    isRecurring={isRecurring} setIsRecurring={setIsRecurring}
                    allowRecurrence={allowRecurrence} initialIsRecurring={initialData?.isRecurring}
                    recFrequency={recFrequency} setRecFrequency={setRecFrequency}
                    recInterval={recInterval} setRecInterval={setRecInterval}
                    recDays={recDays} setRecDays={setRecDays}
                    recEndCondition={recEndCondition} setRecEndCondition={setRecEndCondition}
                    recEndCount={recEndCount} setRecEndCount={setRecEndCount}
                    recEndDate={recEndDate} setRecEndDate={setRecEndDate}
                    t={t} language={language}
                />
                
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{t.priority}</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-xs h-9">
                            {PRIORITIES.map(p => <option key={p} value={p}>{getPriorityLabel(p)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{t.status}</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-xs h-9">
                            {STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{t.type}</label>
                        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-xs h-9">
                            <option value="">{t.none}</option>
                            {TASK_TYPES.map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{t.actMin}</label>
                         <input type="number" disabled={status!=='Completed'} value={actualDuration} onChange={(e) => setActualDuration(e.target.value ? Number(e.target.value) : '')} className={`w-full border dark:border-gray-600 rounded px-2 py-1.5 text-xs h-9 ${status!=='Completed' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`} />
                    </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.colorMarker}</label>
                   <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setColor('')} className={`w-6 h-6 rounded-full border flex items-center justify-center ${!color ? 'ring-2 ring-gray-400' : ''}`}><i className="fas fa-ban text-xs text-gray-400"></i></button>
                        {COLOR_PALETTE.map(c => (
                            <button key={c.name} type="button" onClick={() => setColor(c.value)} style={{ backgroundColor: c.value }} className={`w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${color === c.value ? 'ring-2 ring-gray-500 scale-110' : ''}`} />
                        ))}
                   </div>
                </div>
                
                <div>
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">{t.description}</label>
                   <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-sm placeholder-gray-400" placeholder={t.descPlaceholder} />
                </div>
              </div>
            )}

            {activeTab === 'people' && (
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.collaborators}</label>
                   <div className="grid grid-cols-2 gap-2">
                     {availableUsers.map(u => (
                       <div key={u.id} onClick={() => toggleCollaborator(u.id)} className={`cursor-pointer px-3 py-2 rounded-lg border flex items-center justify-between text-sm ${collaborators.includes(u.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                         <span>{u.name}</span>
                         {collaborators.includes(u.id) && <i className="fas fa-check text-xs"></i>}
                       </div>
                     ))}
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.assignee}</label>
                   <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm">
                     <option value="">{t.noAssignee}</option>
                     {availableUsers.filter(u => collaborators.includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                 </div>
                 <div className="relative">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                   <input 
                        ref={tagInputRef}
                        type="text" 
                        value={tags} 
                        onChange={handleTagChange} 
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" 
                        placeholder={t.tagsPlaceholder} 
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
               </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-xl flex justify-between gap-3 shrink-0">
          <div>
              {initialData && onDelete && <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700">{t.delete}</button>}
          </div>
          <div className="flex gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800">{t.cancel}</button>
            <button type="submit" form="task-form" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">{initialData ? t.save : t.create}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
