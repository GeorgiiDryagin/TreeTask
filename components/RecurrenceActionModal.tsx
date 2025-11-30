
import React from 'react';
import { RecurrenceUpdateMode } from '../types';

interface RecurrenceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: RecurrenceUpdateMode) => void;
  mode: 'move' | 'delete';
  t: any;
}

export const RecurrenceActionModal: React.FC<RecurrenceActionModalProps> = ({
  isOpen, onClose, onConfirm, mode, t
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
             <i className="fas fa-sync-alt text-3xl"></i>
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 text-center">
          {mode === 'delete' ? 'Delete Recurring Item' : 'Update Recurring Item'}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm text-center">
          This is a recurring event. How would you like to apply this change?
        </p>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm('this')}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="font-semibold text-gray-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">This event only</div>
            <div className="text-xs text-gray-500">Changes only this specific instance.</div>
          </button>
          
          <button
            onClick={() => onConfirm('future')}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="font-semibold text-gray-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">This and following events</div>
            <div className="text-xs text-gray-500">Changes this and all future occurrences.</div>
          </button>
          
          {/* "All Events" is only available for Deletion, not for Moving/Rescheduling */}
          {mode === 'delete' && (
            <button
                onClick={() => onConfirm('all')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
            >
                <div className="font-semibold text-gray-800 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">All events</div>
                <div className="text-xs text-gray-500">Changes the entire series.</div>
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
