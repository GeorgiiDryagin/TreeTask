
import React, { useState } from 'react';

interface MiniDatePickerProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  language: string;
}

export const MiniDatePicker: React.FC<MiniDatePickerProps> = ({ selectedDate, onSelect, onClose, language }) => {
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleDayClick = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(dStr);
    onClose();
  };

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  return (
    // Positioning logic:
    // Mobile: left-1/2 -translate-x-1/2 (Centered relative to parent input container)
    // Desktop: md:right-0 (Right aligned to parent input container)
    // Parent input is now narrower (~112px), so right-aligning ensures it expands leftwards properly.
    <div className="absolute top-full left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 mt-1 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 p-3 z-50 w-56 md:w-64 animate-in fade-in zoom-in-95 duration-200" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <button 
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
        >
          <i className="fas fa-chevron-left text-xs"></i>
        </button>
        <span className="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-200 capitalize">
          {viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button 
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
        >
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {(language === 'ru' ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : ['Mo','Tu','We','Th','Fr','Sa','Su']).map(d => (
          <div key={d} className="text-center text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === currentStr;
          const today = new Date();
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`
                h-6 w-6 md:h-8 md:w-8 rounded-full flex items-center justify-center text-xs md:text-sm transition-colors mx-auto
                ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                ${!isSelected && isToday ? 'border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-semibold' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
