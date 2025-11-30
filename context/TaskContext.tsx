
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { taskManager } from '../services/taskManager';

interface TaskContextType {
  refreshTrigger: number;
  forceRefresh: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = taskManager.subscribe(() => {
        setRefreshTrigger(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const forceRefresh = () => setRefreshTrigger(prev => prev + 1);
  const undo = () => taskManager.undo();
  const redo = () => taskManager.redo();

  return (
    <TaskContext.Provider value={{ 
        refreshTrigger, 
        forceRefresh, 
        undo, 
        redo, 
        canUndo: taskManager.canUndo(), 
        canRedo: taskManager.canRedo() 
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
