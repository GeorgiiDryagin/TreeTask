import React, { useState, useRef, useEffect } from 'react';
import { TaskFilters, TaskPriority, SortOption, Task } from '../types';

interface TaskFiltersProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  allTasks: Task[];
  t: any;
}

export const TaskFiltersUI: React.FC<TaskFiltersProps> = ({ filters, onChange, allTasks, t }) => {
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePriority = (p: TaskPriority) => {
    const current = filters.priorities;
    if (current.includes(p)) {
      onChange({ ...filters, priorities: current.filter(x => x !== p) });
    } else {
      onChange({ ...filters, priorities: [...current, p] });
    }
  };

  const handleSearchChange = (val: string) => {
       onChange({...filters, searchQuery: val});
       if (val.trim()) {
           const matches = allTasks
                .filter(t => t.title.toLowerCase().includes(val.toLowerCase()))
                .slice(0, 6); // Limit to 6
           setSuggestions(matches);
           setShowSuggestions(matches.length > 0);
       } else {
           setShowSuggestions(false);
       }
  };

  const handleSelectSuggestion = (title: string) => {
      onChange({...filters, searchQuery: title});
      setShowSuggestions(false);
  };

  const clearFilters = () => {
    onChange({ searchQuery: '', rootsOnly: false, standaloneOnly: false, currentOnly: false, priorities: [], dateRange: 'all', maxTimeEstimate: undefined, isRecurring: false, sortBy: 'newest' });
  };

  const hasActiveFilters = filters.searchQuery || filters.priorities.length > 0 || filters.maxTimeEstimate || filters.dateRange !== 'all' || filters.isRecurring || filters.rootsOnly || filters.currentOnly || filters.standaloneOnly;

  const getPriorityLabel = (p: TaskPriority) => t[p.toLowerCase()] || p;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
      
      {/* Header Row: Title and Clear All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
             <i className="fas fa-filter text-indigo-500"></i>
             <span className="font-bold text-sm">{t.filters}</span>
        </div>
        {hasActiveFilters && (
            <button 
                onClick={clearFilters}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors flex items-center gap-1"
            >
                <i className="fas fa-times"></i> {t.clearAll}
            </button>
        )}
      </div>

      {/* Row 2: Search, Recurring, and Toggles */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search & Recurring Group */}
        <div className="flex gap-2 flex-1 relative" ref={searchContainerRef}>
            {/* Search Input - Flexible */}
            <div className="relative flex-1">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    value={filters.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => { if(filters.searchQuery && suggestions.length > 0) setShowSuggestions(true); }}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 outline-none transition-all"
                />
            </div>
            
            {/* Recurring Toggle Button - Compact next to search */}
            <button
                onClick={() => onChange({...filters, isRecurring: !filters.isRecurring})}
                className={`
                    px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap shrink-0 flex items-center
                    ${filters.isRecurring 
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'}
                `}
                title="Show only recurring tasks"
            >
                <i className={`fas fa-sync-alt mr-1.5 ${filters.isRecurring ? '' : 'text-gray-400'}`}></i>
                {t.recurringOnly}
            </button>

             {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-lg z-50 max-h-56 overflow-y-auto">
                    {suggestions.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => handleSelectSuggestion(task.title)}
                            className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 truncate"
                        >
                            <span className="font-medium">{task.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Toggles Group - Individual Rounded Buttons */}
        <div className="flex flex-nowrap md:flex-wrap gap-1 md:gap-1.5 shrink-0 w-full md:w-auto overflow-x-auto md:overflow-visible no-scrollbar">
             {/* Roots Only */}
             <button
                onClick={() => onChange({...filters, rootsOnly: !filters.rootsOnly})}
                className={`
                    relative inline-flex items-center justify-center flex-1 md:flex-none px-1.5 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold border rounded-lg transition-all focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap
                    ${filters.rootsOnly 
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'}
                `}
                title="Show only top-level tasks"
             >
                <i className={`fas fa-level-up-alt mr-1 sm:mr-1.5 ${filters.rootsOnly ? '' : 'text-gray-400'}`}></i>
                {t.rootsOnly}
             </button>

             {/* Standalone Only */}
             <button
                onClick={() => onChange({...filters, standaloneOnly: !filters.standaloneOnly})}
                className={`
                    relative inline-flex items-center justify-center flex-1 md:flex-none px-1.5 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold border rounded-lg transition-all focus:z-10 focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap
                    ${filters.standaloneOnly
                        ? 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-sm' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'}
                `}
                title="Show only standalone tasks"
             >
                <i className={`fas fa-cube mr-1 sm:mr-1.5 ${filters.standaloneOnly ? '' : 'text-gray-400'}`}></i>
                {t.standaloneOnly}
             </button>

             {/* Current Only */}
             <button
                onClick={() => onChange({...filters, currentOnly: !filters.currentOnly})}
                className={`
                    relative inline-flex items-center justify-center flex-1 md:flex-none px-1.5 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold border rounded-lg transition-all focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap
                    ${filters.currentOnly 
                        ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'}
                `}
                title="Show only actionable tasks"
             >
                 <i className={`fas fa-check-double mr-1 sm:mr-1.5 ${filters.currentOnly ? '' : 'text-gray-400'}`}></i>
                 {t.currentOnly}
             </button>
        </div>
      </div>

      {/* Options Stack */}
      <div className="flex flex-col gap-4">
        
        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Sort By */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.sortBy}</label>
                <div className="relative">
                    <select
                        value={filters.sortBy}
                        onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SortOption })}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none font-medium h-9"
                    >
                        <option value="newest">{t.newestFirst}</option>
                        <option value="oldest">{t.oldestFirst}</option>
                        <option value="priority">{t.highestPriority}</option>
                        <option value="scheduled">{t.nearestScheduled}</option>
                        <option value="alphabetical">{t.alphabetical}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <i className="fas fa-chevron-down text-[10px]"></i>
                    </div>
                </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.dateRange}</label>
                 <div className="relative">
                    <select
                        value={filters.dateRange}
                        onChange={(e) => onChange({ ...filters, dateRange: e.target.value as any })}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none font-medium h-9"
                    >
                        <option value="all">{t.anyDate}</option>
                        <option value="no-date">{t.noDate}</option>
                        <option value="overdue">{t.overdue}</option>
                        <option value="today">{t.today}</option>
                        <option value="week">{t.next7Days}</option>
                        <option value="2weeks">{t.next2Weeks}</option>
                        <option value="month">{t.nextMonth}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <i className="fas fa-chevron-down text-[10px]"></i>
                    </div>
                 </div>
            </div>

            {/* Est Time - Spans 2 cols on mobile to fill row, 1 on desktop */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.maxTime}</label>
                 <div className="relative">
                    <select
                        value={filters.maxTimeEstimate || ''}
                        onChange={(e) => onChange({ ...filters, maxTimeEstimate: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none font-medium h-9"
                    >
                        <option value="">{t.anyDuration}</option>
                        <option value="15">&le; 15 {t.min}</option>
                        <option value="30">&le; 30 {t.min}</option>
                        <option value="60">&le; 1 {t.hr}</option>
                        <option value="120">&le; 2 {t.hrs}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <i className="fas fa-chevron-down text-[10px]"></i>
                    </div>
                </div>
            </div>
        </div>

        {/* Priority - Full Width Row */}
        <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.priority}</label>
             <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg h-9">
                {(['Low', 'Medium', 'High', 'Critical'] as TaskPriority[]).map(p => {
                    const isSelected = filters.priorities.includes(p);
                    const label = getPriorityLabel(p);

                    return (
                        <button
                        key={p}
                        onClick={() => togglePriority(p)}
                        className={`
                            px-1 py-1 text-[10px] sm:text-xs rounded-md transition-all font-medium truncate flex items-center justify-center
                            ${isSelected 
                            ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'}
                        `}
                        title={label}
                        >
                        {label}
                        </button>
                    )
                })}
             </div>
        </div>
      </div>
    </div>
  );
};