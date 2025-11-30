import React from 'react';
import { TimeBlock } from '../types';

interface TimeBlockItemProps {
  block: TimeBlock;
  onEdit: (block: TimeBlock) => void;
  onDelete: (id: string) => void;
  t: any;
}

export const TimeBlockItem: React.FC<TimeBlockItemProps> = ({ block, onEdit, onDelete, t }) => {
  const getRecurrenceLabel = () => {
    if (!block.isRecurring || !block.recurrencePattern) return '';
    const pat = block.recurrencePattern;
    const freqLabel = pat.frequency === 'Weekly' ? (t?.weekly || 'Weekly') : (pat.frequency === 'Monthly' ? (t?.monthly || 'Monthly') : (t?.daily || 'Daily'));
    
    let limitLabel = '';
    if (pat.endCondition === 'After X occurrences' && pat.endCount) {
        limitLabel = `(x${pat.endCount})`;
    } else if (pat.endCondition === 'Until specific date' && pat.endDate) {
        const d = new Date(pat.endDate);
        limitLabel = `(-> ${d.getDate()}.${d.getMonth()+1})`;
    }
    return `${freqLabel} ${limitLabel}`;
  };

  const durationMin = (block.endTime - block.startTime) / 60000;
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const durationLabel = `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`;

  return (
    <div className="flex flex-col mb-1.5 rounded-lg shadow-sm bg-white dark:bg-gray-800 border-l-4 border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center p-2">
         {/* Icon */}
         <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shrink-0 mr-3">
             <i className="fas fa-clock"></i>
         </div>

         {/* Content */}
         <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
                 <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{block.title}</span>
                 {block.taskType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                      {block.taskType.split('/')[0]}
                    </span>
                 )}
             </div>
             
             <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                     {durationLabel}
                 </span>
                 {block.isRecurring && (
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                    <i className="fas fa-sync-alt"></i>
                    {getRecurrenceLabel()}
                  </span>
                )}
             </div>
         </div>

         {/* Actions */}
         <div className="flex items-center gap-1 ml-2">
             <button
                onClick={() => onEdit(block)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={t?.editTask || "Edit"}
             >
                <i className="fas fa-pencil-alt text-xs"></i>
             </button>
             <button
                onClick={() => onDelete(block.id)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title={t?.delete || "Delete"}
             >
                <i className="fas fa-trash-alt text-xs"></i>
             </button>
         </div>
      </div>
    </div>
  );
};
