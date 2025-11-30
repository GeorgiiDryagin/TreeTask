
import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { taskManager } from '../services/taskManager';

interface PomodoroTimerViewProps {
  t: any;
  refreshData: () => void;
  initialTask?: Task | null; // Added prop for pre-selecting task
}

interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4
};

export const PomodoroTimerView: React.FC<PomodoroTimerViewProps> = ({ t, refreshData, initialTask }) => {
  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Timer State
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Task Selection
  const [selectedTask, setSelectedTask] = useState<Task | null>(initialTask || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Effect to update selected task if initialTask changes (e.g. navigation)
  useEffect(() => {
      if (initialTask) {
          setSelectedTask(initialTask);
      }
  }, [initialTask]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // Initial Task Suggestions
  useEffect(() => {
    if (!searchQuery) {
        setSuggestions(taskManager.getCurrentTasks().slice(0, 5));
    } else {
        const all = taskManager.getAllTasksIncludingArchived();
        const filtered = all.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.deletedAt).slice(0, 5);
        setSuggestions(filtered);
    }
  }, [searchQuery]);

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimerComplete = () => {
    // Logic for completion
    
    if (mode === 'work') {
      setCompletedSessions(prev => prev + 1);
      
      // Increment Task Count
      if (selectedTask) {
          const currentCount = selectedTask.pomodoroCount || 0;
          taskManager.updateTask(selectedTask.id, { pomodoroCount: currentCount + 1 });
          // Update local state to reflect change immediately
          setSelectedTask({ ...selectedTask, pomodoroCount: currentCount + 1 });
          refreshData();
      }

      if ((completedSessions + 1) % settings.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        setIsActive(false); // Stop for long break (manual start)
        alert(t.longBreak + "!");
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        setIsActive(true); // AUTO START SHORT BREAK
        // Removed alert to allow seamless transition
      }
    } else {
      // Break over, back to work
      setIsActive(false); // Stop (manual start back to work)
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      alert(t.workSession + "!");
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'work') setTimeLeft(settings.workDuration * 60);
    else if (mode === 'shortBreak') setTimeLeft(settings.shortBreakDuration * 60);
    else setTimeLeft(settings.longBreakDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSettingsSave = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
      setIsSettingsOpen(false);
      resetTimer(); // Apply changes
  };

  // Circular Progress Calculation
  const totalTime = mode === 'work' ? settings.workDuration * 60 : (mode === 'shortBreak' ? settings.shortBreakDuration * 60 : settings.longBreakDuration * 60);
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  
  // SVG Math
  const radius = 120;
  // Box size 260x260. Center 130, 130.
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modeColor = mode === 'work' ? 'text-red-500 stroke-red-500' : (mode === 'shortBreak' ? 'text-green-500 stroke-green-500' : 'text-blue-500 stroke-blue-500');
  
  const updateTaskCount = (delta: number) => {
      if (selectedTask) {
          const newCount = Math.max(0, (selectedTask.pomodoroCount || 0) + delta);
          taskManager.updateTask(selectedTask.id, { pomodoroCount: newCount });
          setSelectedTask({ ...selectedTask, pomodoroCount: newCount });
          refreshData();
      }
  };

  return (
    <div className="flex flex-col items-center h-full w-full max-w-md mx-auto p-4 space-y-6">
        
        {/* Settings Modal */}
        {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <form onSubmit={handleSettingsSave} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <i className="fas fa-cog"></i> {t.settings}
                    </h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.workDuration}</label>
                        <input type="number" min="1" value={settings.workDuration} onChange={e => setSettings({...settings, workDuration: parseInt(e.target.value) || 1})} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.shortBreakDuration}</label>
                        <input type="number" min="1" value={settings.shortBreakDuration} onChange={e => setSettings({...settings, shortBreakDuration: parseInt(e.target.value) || 1})} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.longBreakDuration}</label>
                        <input type="number" min="1" value={settings.longBreakDuration} onChange={e => setSettings({...settings, longBreakDuration: parseInt(e.target.value) || 1})} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.sessionsBeforeLongBreak}</label>
                        <input type="number" min="1" value={settings.sessionsBeforeLongBreak} onChange={e => setSettings({...settings, sessionsBeforeLongBreak: parseInt(e.target.value) || 1})} className="w-full border dark:border-gray-600 rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-medium">{t.cancel}</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-sm">{t.save}</button>
                    </div>
                </form>
            </div>
        )}

        {/* Task Selection */}
        <div className="w-full relative z-20 shrink-0" ref={searchContainerRef}>
            {!selectedTask ? (
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={t.selectTask || "Select a Task"}
                        className="w-full pl-9 pr-3 py-3 border dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
                            {!searchQuery && <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 bg-gray-50 dark:bg-gray-900/50">{t.suggestedTasks}</div>}
                            {suggestions.map(task => (
                                <button 
                                    key={task.id} 
                                    onClick={() => { setSelectedTask(task); setShowSuggestions(false); setSearchQuery(''); }}
                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-50 dark:border-gray-700 last:border-0 truncate"
                                >
                                    {task.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.currentFocus}</span>
                            <h3 className="font-bold text-gray-800 dark:text-white truncate text-lg leading-tight">{selectedTask.title}</h3>
                        </div>
                        <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    {/* Manual Counter Controls */}
                    <div className="flex items-center gap-2 mt-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg self-start">
                         <div className="relative flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold shadow-sm">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-green-500"></div>
                            {selectedTask.pomodoroCount || 0}
                         </div>
                         <div className="flex gap-1">
                             <button onClick={() => updateTaskCount(-1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><i className="fas fa-minus text-[10px]"></i></button>
                             <button onClick={() => updateTaskCount(1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><i className="fas fa-plus text-[10px]"></i></button>
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Timer Circle */}
        <div className="flex-1 flex items-center justify-center w-full min-h-[50vh]">
            <div className="relative w-80 h-80 flex items-center justify-center shrink-0">
                <svg 
                    className="w-full h-full transform -rotate-90 overflow-visible" 
                    viewBox="0 0 260 260"
                >
                    <circle
                        cx="130"
                        cy="130"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                        cx="130"
                        cy="130"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${modeColor} transition-all duration-1000 linear`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${modeColor.split(' ')[0]}`}>
                        {mode === 'work' ? t.workSession : (mode === 'shortBreak' ? t.shortBreak : t.longBreak)}
                    </div>
                    <div className="text-5xl font-mono font-bold text-gray-800 dark:text-white tabular-nums tracking-tight">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={toggleTimer}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-transform active:scale-95 text-white ${isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            <i className={`fas ${isActive ? 'fa-pause' : 'fa-play pl-1'}`}></i>
                        </button>
                        <button 
                            onClick={resetTimer}
                            className="w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-transform active:scale-95 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            <i className="fas fa-redo-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer / Settings Trigger */}
        <div className="w-full flex flex-col justify-end pb-4 shrink-0">
             <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center gap-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors text-sm">
                 <i className="fas fa-sliders-h"></i> {t.settings}
             </button>
        </div>
    </div>
  );
};
