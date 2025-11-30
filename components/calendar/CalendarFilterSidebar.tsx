
import React, { useState, useMemo } from 'react';
import { TaskPriority, TaskType } from '../../types';

export interface CalendarFiltersState {
  entityType: 'all' | 'task' | 'block';
  recurrenceType: 'all' | 'recurring' | 'single';
  types: string[];
  priorities: TaskPriority[];
}

interface CalendarFilterSidebarProps {
  isOpen: boolean;
  filters: CalendarFiltersState;
  onFilterChange: (filters: CalendarFiltersState) => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  t: any;
  language: string;
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

export const CalendarFilterSidebar: React.FC<CalendarFilterSidebarProps> = ({
  isOpen, filters, onFilterChange, currentDate, onSelectDate, onClose, t, language
}) => {
  const [miniCalDate, setMiniCalDate] = useState(new Date(currentDate));

  // --- Mini Calendar Logic ---
  const miniCalGrid = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust start to Monday
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const paddingLeft = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: (number | null)[] = [];
    for (let i = 0; i < paddingLeft; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    
    return days;
  }, [miniCalDate]);

  const handleMonthNav = (delta: number) => {
    const newDate = new Date(miniCalDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setMiniCalDate(newDate);
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), day);
    onSelectDate(newDate);
  };

  // --- Layout Classes ---
  // Match CalendarSidebar logic exactly for symmetry
  let wrapperClasses = "flex flex-col transition-all duration-300 ease-in-out z-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden";
  
  if (!isOpen) {
      wrapperClasses += " hidden md:block md:w-0 md:opacity-0 md:border-0";
  } else {
      wrapperClasses += " hidden md:flex md:w-64 md:h-full md:rounded-xl md:border md:shadow-sm md:opacity-100 shrink-0";
  }

  const toggleType = (type: string) => {
      const newTypes = filters.types.includes(type) 
        ? filters.types.filter(t => t !== type)
        : [...filters.types, type];
      onFilterChange({ ...filters, types: newTypes });
  };

  const togglePriority = (p: TaskPriority) => {
      const newPriorities = filters.priorities.includes(p)
        ? filters.priorities.filter(x => x !== p)
        : [...filters.priorities, p];
      onFilterChange({ ...filters, priorities: newPriorities });
  };

  const getPriorityLabel = (p: TaskPriority) => t[p.toLowerCase()] || p;
  
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

  const SegmentedControl = ({ options, value, onChange }: { options: {id: string, label: string}[], value: string, onChange: (v: any) => void }) => (
      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${value === opt.id ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                  {opt.label}
              </button>
          ))}
      </div>
  );

  return (
    <div className={wrapperClasses}>
        {/* Inner Content with Fixed Width for Slide Animation */}
        {/* Animation: -translate-x-full (hidden, far left) -> translate-x-0 (visible, centered) - Left to Right */}
        <div className={`h-full w-full md:w-64 md:min-w-[16rem] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">{t.filters} & Nav</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
                {/* 1. Mini Calendar Widget */}
                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <button onClick={() => handleMonthNav(-1)} className="text-gray-500 hover:text-indigo-600"><i className="fas fa-chevron-left text-xs"></i></button>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">
                            {miniCalDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => handleMonthNav(1)} className="text-gray-500 hover:text-indigo-600"><i className="fas fa-chevron-right text-xs"></i></button>
                    </div>
                    <div className="grid grid-cols-7 text-center mb-1">
                        {(language === 'ru' ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : ['M','T','W','T','F','S','S']).map(d => (
                            <div key={d} className="text-[9px] text-gray-400 font-bold">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {miniCalGrid.map((day, idx) => {
                            if (!day) return <div key={idx}></div>;
                            const isSelected = day === currentDate.getDate() && miniCalDate.getMonth() === currentDate.getMonth() && miniCalDate.getFullYear() === currentDate.getFullYear();
                            const today = new Date();
                            const isToday = day === today.getDate() && miniCalDate.getMonth() === today.getMonth() && miniCalDate.getFullYear() === today.getFullYear();
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    className={`w-6 h-6 flex items-center justify-center text-xs rounded-full mx-auto transition-colors
                                        ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}
                                        ${isToday && !isSelected ? 'ring-1 ring-indigo-400 text-indigo-600 font-bold' : ''}
                                    `}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Toggles */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.type}</label>
                        <SegmentedControl 
                            options={[{id: 'task', label: t.task}, {id: 'all', label: t.total}, {id: 'block', label: t.timeBlock}]}
                            value={filters.entityType}
                            onChange={(v) => onFilterChange({...filters, entityType: v})}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.repeat}</label>
                        <SegmentedControl 
                            options={[{id: 'recurring', label: t.recurring}, {id: 'all', label: t.total}, {id: 'single', label: t.standalone}]}
                            value={filters.recurrenceType}
                            onChange={(v) => onFilterChange({...filters, recurrenceType: v})}
                        />
                    </div>
                </div>

                {/* 3. Checkbox Filters */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.priority}</label>
                        <div className="flex flex-col gap-1.5">
                            {PRIORITIES.map(p => (
                                <label key={p} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${filters.priorities.includes(p) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                                        {filters.priorities.includes(p) && <i className="fas fa-check text-[8px] text-white"></i>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={filters.priorities.includes(p)} onChange={() => togglePriority(p)} />
                                    <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {getPriorityLabel(p)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.type}</label>
                        <div className="flex flex-col gap-1.5">
                            {TASK_TYPES.map(type => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${filters.types.includes(type) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                                        {filters.types.includes(type) && <i className="fas fa-check text-[8px] text-white"></i>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={filters.types.includes(type)} onChange={() => toggleType(type)} />
                                    <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                        {getTypeLabel(type)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
