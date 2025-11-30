
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskType = 'Study' | 'Work' | 'Hobby' | 'Health' | 'Habit' | 'Chores' | 'Commute';
export type RecurrenceFrequency = 'Daily' | 'Weekly' | 'Monthly';
export type RecurrenceEndCondition = 'After X occurrences' | 'Until specific date' | 'No end date';

// ADDED RecurrenceUpdateMode
export type RecurrenceUpdateMode = 'this' | 'future' | 'all';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: string[]; // Only required for Weekly
  endCondition: RecurrenceEndCondition;
  endCount?: number;
  endDate?: number; // timestamp
  excludeDates?: number[]; // Dates to skip
  completedInstances?: number[]; // Dates where the instance was marked completed
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: number; // timestamp
  endTime: number;   // timestamp
  taskType?: TaskType;
  tags?: string[];
  color?: string;
  
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  parentId: string | null;
  
  scheduledTime?: number; // timestamp (Single source of truth for date)
  isAllDay: boolean; // Distinction between Date appointment vs Time appointment
  
  status: TaskStatus;
  priority: TaskPriority;
  color?: string; // Custom color for the task border
  
  timeEstimateMinutes?: number;
  actualDurationMinutes?: number;
  
  tags: string[];
  collaboratorIds: string[]; // User references (mock IDs)
  assigneeId?: string;
  
  taskType?: TaskType;
  
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  
  // System fields
  // Counts ALL descendants in the subtree that are NOT Completed/Cancelled.
  pendingChildrenCount: number; 
  // Counts ALL descendants in the subtree regardless of status.
  totalChildrenCount: number;
  createdAt: number;
  
  // New fields for System Views
  completedAt?: number; // Timestamp when status became Completed
  deletedAt?: number;   // Timestamp when task was soft-deleted
  
  // Pomodoro
  pomodoroCount?: number;
}

// --- GOALS TYPES ---
export interface Goal {
  id: string;
  title: string;
  smart: {
    s: string; // Specific
    m: string; // Measurable
    a: string; // Achievable
    r: string; // Relevant
    t: string; // Time-bound
  };
  linkedTaskIds: string[]; // IDs of root tasks (projects)
  createdAt: number;
  targetDate?: number; // Optional deadline
}

// --- NOTES TYPES ---
export type NoteCategory = 'inbox' | 'someday' | 'archive';

export interface Note {
  id: string;
  content: string;
  category: NoteCategory;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'COMPLETE' | 'SCHEDULE' | 'UNSCHEDULE' | 'NOTE_CREATE' | 'NOTE_MOVE' | 'NOTE_DELETE' | 'NOTE_CONVERT' | 'GOAL_CREATE' | 'GOAL_UPDATE' | 'GOAL_DELETE';
  taskId: string; // Can be Note ID or Goal ID as well
  taskTitle: string; // Can be Note content preview
  details: string;
}

export type ViewMode = 'current' | 'all' | 'routine' | 'calendar' | 'archived' | 'deleted' | 'logs' | 'forest' | 'summary' | 'notes' | 'eisenhower' | 'pomodoro' | 'goals';

export interface CreateTaskPayload {
  title: string;
  parentId?: string | null;
  description?: string;
  priority?: TaskPriority;
  color?: string;
  taskType?: TaskType;
  scheduledTime?: number;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  timeEstimateMinutes?: number;
  actualDurationMinutes?: number;
  tags?: string[];
  collaboratorIds?: string[];
  assigneeId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  color?: string;
  scheduledTime?: number;
  isAllDay?: boolean;
  timeEstimateMinutes?: number;
  actualDurationMinutes?: number;
  tags?: string[];
  collaboratorIds?: string[];
  assigneeId?: string;
  taskType?: TaskType;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  pomodoroCount?: number;
  parentId?: string | null; // Added to support reparenting via update
}

export type SortOption = 'newest' | 'oldest' | 'priority' | 'scheduled' | 'alphabetical';

export interface TaskFilters {
  searchQuery: string;
  rootsOnly: boolean;
  standaloneOnly: boolean; // New filter
  currentOnly: boolean;
  priorities: TaskPriority[];
  maxTimeEstimate?: number; // minutes
  dateRange: 'all' | 'overdue' | 'today' | 'week' | 'no-date' | '2weeks' | 'month';
  isRecurring: boolean;
  sortBy: SortOption;
}
