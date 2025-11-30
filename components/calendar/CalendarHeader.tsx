
import React from 'react';

interface CalendarHeaderProps {
  currentDate: Date;
  viewType: string;
  onViewChange: (view: any) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleUnscheduled: () => void;
  onToggleFilters: () => void; // New Prop
  onDropTask: (taskId: string) => void;
  showUnscheduled: boolean;
  showFilters: boolean; // New Prop
  unscheduledCount: number;
  isDragging: boolean;
  formatHeaderDate: () => string;
  t: any;
  availableViews: { id: string, label: string }[];
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  onPrev, onNext, onToday, formatHeaderDate,
  viewType, onViewChange, availableViews,
  onToggleUnscheduled, onToggleFilters, onDropTask, showUnscheduled, showFilters, unscheduledCount, isDragging, t
}) => {
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          onDropTask(taskId);
      }
  };

  // Unified heights and base styles for all controls
  const controlHeight = "h-7";
  const baseBtnClass = `${controlHeight} border rounded-md bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center`;

  return (
    <div className="p-1 flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-2 shrink-0 bg-white dark:bg-gray-800 z-20 relative">
        {/* Left: Filter Toggle & Nav */}
        <div className="flex items-center gap-2 shrink-0">
            {/* Filter Toggle Button - Desktop Only */}
            <button 
                onClick={onToggleFilters}
                className={`hidden md:flex ${baseBtnClass} px-2.5 ${showFilters ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' : ''}`}
                title={t.filters}
            >
                <i className="fas fa-filter text-xs"></i>
            </button>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5 hidden md:block"></div>

            <div className="flex items-center gap-0.5">
                <button onClick={onPrev} className={`${baseBtnClass} w-7`}><i className="fas fa-chevron-left text-xs"></i></button>
                <button onClick={onToday} className={`${baseBtnClass} px-2 text-xs font-semibold`}>
                    {t.today}
                </button>
                <button onClick={onNext} className={`${baseBtnClass} w-7`}><i className="fas fa-chevron-right text-xs"></i></button>
            </div>
        </div>

        {/* Middle: Title */}
        <h2 className="text-sm font-bold text-gray-800 dark:text-white truncate flex-1 text-center px-1 capitalize">{formatHeaderDate()}</h2>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
            <div className="relative shrink-0">
                <select
                    value={viewType}
                    onChange={(e) => onViewChange(e.target.value)}
                    className={`${controlHeight} appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-medium rounded-md py-0 pl-2 pr-6 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer`}
                >
                    {availableViews.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500"><i className="fas fa-chevron-down text-[10px]"></i></div>
            </div>
            
            <button 
                onClick={onToggleUnscheduled}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`${controlHeight} px-2 rounded-md transition-all relative flex items-center justify-center gap-1 shrink-0 border text-xs ${showUnscheduled ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' : isDragging ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-orange-300 dark:border-orange-500 ring-2 ring-orange-100 dark:ring-orange-900/30' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
                <i className={`fas ${isDragging ? 'fa-arrow-down animate-bounce text-orange-500' : 'fa-inbox'} text-xs`}></i>
                <span className="hidden md:inline font-medium ml-0.5">{isDragging ? t.drop : t.unscheduled}</span>
                {unscheduledCount > 0 && !showUnscheduled && !isDragging && <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold absolute -top-1 -right-1 border border-white dark:border-gray-800">{unscheduledCount}</span>}
            </button>
        </div>
    </div>
  );
};
