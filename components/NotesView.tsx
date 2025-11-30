
import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteCategory } from '../types';
import { taskManager } from '../services/taskManager';

interface NotesViewProps {
  refreshData: () => void;
  onConvertToTask: (note: Note) => void; 
  t: any;
}

export const NotesView: React.FC<NotesViewProps> = ({ refreshData, onConvertToTask, t }) => {
  const [activeTab, setActiveTab] = useState<NoteCategory>('inbox');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Search State
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotes();
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpenId(null);
        }
    };
    if (menuOpenId) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const loadNotes = () => {
    setNotes(taskManager.getNotes(activeTab));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    taskManager.createNote(newNoteContent, activeTab);
    setNewNoteContent('');
    loadNotes();
    refreshData();
  };

  const handleMoveNote = (id: string, category: NoteCategory) => {
    taskManager.moveNote(id, category);
    loadNotes();
    refreshData();
    setMenuOpenId(null);
  };

  const handleDeleteNote = (id: string) => {
    taskManager.deleteNote(id);
    loadNotes();
    refreshData();
    setMenuOpenId(null);
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      
      {/* Header with Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        {(['inbox', 'someday', 'archive'] as NoteCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`
              flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors uppercase tracking-wider
              ${activeTab === cat 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
            `}
          >
            {t[cat] || cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="relative">
              <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchNotes || "Search notes..."}
                  className="w-full border dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleAddNote} className="p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder={t.notePlaceholder || "Add a note..."}
            className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/20">
        {filteredNotes.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic text-xs">
            {searchQuery ? "No matching notes." : (t.noNotes || "No notes in this category.")}
          </div>
        )}
        {filteredNotes.map(note => (
          <div key={note.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap leading-relaxed pr-6">
              {note.content}
            </div>
            
            {/* Menu Button */}
            <div className="absolute top-2 right-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === note.id ? null : note.id);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <i className="fas fa-ellipsis-v text-xs"></i>
                </button>

                {/* Dropdown Menu */}
                {menuOpenId === note.id && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button
                            onClick={() => { onConvertToTask(note); setMenuOpenId(null); }}
                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                            <i className="fas fa-check-square text-emerald-500 w-3"></i> {t.convertToTask}
                        </button>
                        
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                        {activeTab !== 'inbox' && (
                            <button onClick={() => handleMoveNote(note.id, 'inbox')} className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <i className="fas fa-inbox w-3"></i> {t.moveToInbox}
                            </button>
                        )}
                        {activeTab !== 'someday' && (
                            <button onClick={() => handleMoveNote(note.id, 'someday')} className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <i className="far fa-calendar w-3"></i> {t.moveToSomeday}
                            </button>
                        )}
                        {activeTab !== 'archive' && (
                            <button onClick={() => handleMoveNote(note.id, 'archive')} className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <i className="fas fa-archive w-3"></i> {t.moveToArchive}
                            </button>
                        )}
                        
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                        
                        <button onClick={() => handleDeleteNote(note.id)} className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                            <i className="fas fa-trash-alt w-3"></i> {t.delete}
                        </button>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
