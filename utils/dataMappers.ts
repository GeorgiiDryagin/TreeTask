
import { Task, TimeBlock, TaskPriority, TaskStatus, TaskType } from '../types';

// --- TASK MAPPERS ---

export const mapTaskToDb = (task: Task, userId: string) => {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description || null,
    parent_id: task.parentId || null,
    status: task.status,
    priority: task.priority,
    task_type: task.taskType || null,
    is_recurring: task.isRecurring,
    recurrence_pattern: task.recurrencePattern ? JSON.stringify(task.recurrencePattern) : null,
    scheduled_time: task.scheduledTime || null,
    is_all_day: task.isAllDay,
    time_estimate_minutes: task.timeEstimateMinutes || null,
    actual_duration_minutes: task.actualDurationMinutes || null,
    tags: task.tags,
    completed_at: task.completedAt || null,
    deleted_at: task.deletedAt || null,
    created_at: task.createdAt,
    pending_children_count: task.pendingChildrenCount,
    total_children_count: task.totalChildrenCount,
    pomodoro_count: task.pomodoroCount || 0,
    // Add color support if DB has it, otherwise skip or store in separate metadata field
    // Assuming DB wasn't updated with color column in snippet, but assuming it exists or we ignore it for sync safety
    // If DB lacks 'color', this might throw or be ignored depending on Supabase strictness. 
    // Let's assume we might need to add it to schema, but for now we map it.
    // color: task.color // Uncomment if column exists
  };
};

export const mapDbToTask = (row: any): Task => {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    parentId: row.parent_id || null,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    taskType: row.task_type as TaskType | undefined,
    isRecurring: row.is_recurring,
    recurrencePattern: row.recurrence_pattern ? (typeof row.recurrence_pattern === 'string' ? JSON.parse(row.recurrence_pattern) : row.recurrence_pattern) : undefined,
    scheduledTime: row.scheduled_time ? Number(row.scheduled_time) : undefined,
    isAllDay: row.is_all_day,
    timeEstimateMinutes: row.time_estimate_minutes || undefined,
    actualDurationMinutes: row.actual_duration_minutes || undefined,
    tags: row.tags || [],
    collaboratorIds: [], // Not yet persisted in simple schema
    assigneeId: undefined, // Not yet persisted
    pendingChildrenCount: row.pending_children_count || 0,
    totalChildrenCount: row.total_children_count || 0,
    createdAt: Number(row.created_at),
    completedAt: row.completed_at ? Number(row.completed_at) : undefined,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : undefined,
    color: undefined, // Add logic if DB supports
    pomodoroCount: row.pomodoro_count || 0,
  };
};

// --- TIME BLOCK MAPPERS ---

export const mapBlockToDb = (block: TimeBlock, userId: string) => {
  return {
    id: block.id,
    user_id: userId,
    title: block.title,
    start_time: block.startTime,
    end_time: block.endTime,
    task_type: block.taskType || null,
    tags: block.tags || [],
    color: block.color || null,
    is_recurring: block.isRecurring || false,
    recurrence_pattern: block.recurrencePattern ? JSON.stringify(block.recurrencePattern) : null
  };
};

export const mapDbToBlock = (row: any): TimeBlock => {
  return {
    id: row.id,
    title: row.title,
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    taskType: row.task_type as TaskType | undefined,
    tags: row.tags || [],
    color: row.color || undefined,
    isRecurring: row.is_recurring,
    recurrencePattern: row.recurrence_pattern ? (typeof row.recurrence_pattern === 'string' ? JSON.parse(row.recurrence_pattern) : row.recurrence_pattern) : undefined,
  };
};
