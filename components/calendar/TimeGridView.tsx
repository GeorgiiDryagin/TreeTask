
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TimeBlock } from '../../types';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';

interface TimeGridViewProps {
  gridDays: Date[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  now: Date;
  draggedTaskId: string | null;
  draggedBlockId: string | null;
  isDraggingFromCalendar: boolean;
  onEditTask: (task: Task, date: Date) => void;
  onEditBlock: (block: TimeBlock, date: Date) => void;
  onToggleTask: (e: React.MouseEvent, taskId: string, instanceDateTs: number) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string, date: Date) => void;
  onBlockDragStart: (e: React.DragEvent, block: TimeBlock, date: Date) => void;
  onDragEnd: () => void;
  onDropOnColumn: (e: React.DragEvent, day: Date, previewTime: string | null) => void;
  onDropOnAllDay: (e: React.DragEvent, day: Date) => void;
  onCreateBlock: (date: Date) => void;
  onCreateRange: (start: Date, end: Date) => void; 
  onResizeTask: (taskId: string, newStart: number, newEnd: number) => void;
  onResizeBlock: (blockId: string, newStart: number, newEnd: number) => void;
  locale: string;
  getTasksForDay?: (date: Date) => Task[];
  viewType?: string; 
}

const BASE_HOUR_HEIGHT = 30;
const TIME_COL_WIDTH = "w-10";
const DAY_MINUTES = 1440;
const TEXT_STROKE_CLASS = "text-gray-900 dark:text-white [-webkit-text-stroke:3px_white] dark:[-webkit-text-stroke:3px_rgba(31,41,55,1)] [paint-order:stroke_fill] font-bold tracking-wide";

// ... (Layout Algorithms and Helper Interfaces Unchanged) ...
interface PreparedItem {
    id: string;
    start: number;
    end: number;
    data: Task | TimeBlock;
    isRecurring: boolean;
}

interface PositionedItem extends PreparedItem {
    style: {
        left: number; // percentage (0-100)
        width: number; // percentage (0-100)
    }
}

interface PreparedAllDayItem {
    id: string;
    data: Task | TimeBlock;
    type: 'task' | 'block';
    startMs: number;
    endMs: number;
    isRecurring: boolean;
    row?: number;
}

const calculateVisualLayout = (items: PreparedItem[]): PositionedItem[] => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const columns: PreparedItem[][] = [];
    const itemColumnIndex = new Map<string, number>();

    sorted.forEach(item => {
        let colIndex = 0;
        while (true) {
            const col = columns[colIndex] || [];
            const hasOverlap = col.some(other => Math.max(item.start, other.start) < Math.min(item.end, other.end));
            if (!hasOverlap) {
                if (!columns[colIndex]) columns[colIndex] = [];
                columns[colIndex].push(item);
                itemColumnIndex.set(item.id, colIndex);
                break;
            }
            colIndex++;
        }
    });

    return sorted.map(item => {
        const myCol = itemColumnIndex.get(item.id) || 0;
        const overlappingItems = sorted.filter(other => Math.max(item.start, other.start) < Math.min(item.end, other.end));
        let maxColInCluster = myCol;
        overlappingItems.forEach(other => {
            const otherCol = itemColumnIndex.get(other.id) || 0;
            if (otherCol > maxColInCluster) maxColInCluster = otherCol;
        });
        const totalCols = maxColInCluster + 1;
        
        return {
            ...item,
            style: {
                left: (myCol / totalCols) * 100,
                width: (1 / totalCols) * 100
            }
        };
    });
};

interface InteractionState {
    type: 'create' | 'resize';
    dayStartTs: number;
    baseY: number; 
    startY: number; 
    currentY: number; 
    startMinutes: number; 
    endMinutes?: number; 
    itemId?: string;
    itemType?: 'task' | 'block';
}

export const TimeGridView: React.FC<TimeGridViewProps> = ({
  gridDays, tasks, timeBlocks, now, draggedTaskId, draggedBlockId, isDraggingFromCalendar,
  onEditTask, onEditBlock, onToggleTask, onTaskDragStart, onBlockDragStart, onDragEnd,
  onDropOnColumn, onDropOnAllDay, onCreateBlock, onCreateRange, onResizeTask, onResizeBlock,
  locale, getTasksForDay: propGetTasksForDay, viewType
}) => {
  const { checkRecurrenceOverlap, getTasksForDay: defaultGetTasksForDay } = useCalendarLogic();
  const getTasksForDay = propGetTasksForDay || ((d) => defaultGetTasksForDay(tasks, d));

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ dayStr: string, top: number, timeLabel: string, height?: number, type: 'task' | 'block' } | null>(null);
  
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (!isDraggingFromCalendar) {
          setDragPreview(null);
          setDragOverDate(null);
      }
  }, [isDraggingFromCalendar]);

  const hourHeight = useMemo(() => {
      let minDurationFound = 60; 
      
      for (const day of gridDays) {
          const dayStart = day.getTime();
          const dayEnd = dayStart + 86400000;
          const dayTasks = getTasksForDay(day);
          
          for (const t of dayTasks) {
              if (t.isAllDay) continue;
              const duration = t.timeEstimateMinutes || 60;
              if (duration < minDurationFound) minDurationFound = duration;
          }
          
          for (const b of timeBlocks) {
              let isOccurring = false;
              if (b.isRecurring && b.recurrencePattern) {
                  if (checkRecurrenceOverlap(b.recurrencePattern, b.startTime, dayStart)) isOccurring = true;
              } else {
                  if (b.startTime < dayEnd && b.endTime > dayStart) isOccurring = true;
              }
              if (isOccurring) {
                  const bDuration = (b.endTime - b.startTime) / 60000;
                  if (bDuration < minDurationFound) minDurationFound = bDuration;
              }
          }
      }

      if (minDurationFound < 15) {
          return BASE_HOUR_HEIGHT * 2.0; 
      } else if (minDurationFound < 30) {
          return BASE_HOUR_HEIGHT * 1.5;
      } else {
          return BASE_HOUR_HEIGHT * 1.25;
      }
  }, [tasks, timeBlocks, gridDays, getTasksForDay]);

  const { allDayItems, allDayTotalRows } = useMemo(() => {
      // ... (All Day Item logic unchanged) ...
      if (gridDays.length === 0) return { allDayItems: [], allDayTotalRows: 0 };
      const viewStart = gridDays[0].getTime();
      const viewEnd = gridDays[gridDays.length - 1].getTime() + 86400000;
      const items: PreparedAllDayItem[] = [];

      tasks.forEach(task => {
          const duration = (task.timeEstimateMinutes || 0) * 60000;
          const isLong = duration >= 86400000; 
          const isAllDay = task.isAllDay;

          if (!isLong && !isAllDay) return;

          if (task.isRecurring && task.recurrencePattern) {
              const lookbackDays = Math.ceil(duration / 86400000) + 1;
              const checkStart = viewStart - (lookbackDays * 86400000);
              let current = checkStart;
              while (current < viewEnd) {
                  if (checkRecurrenceOverlap(task.recurrencePattern, task.scheduledTime!, current)) {
                      const orig = new Date(task.scheduledTime!);
                      const startInst = new Date(current);
                      if (isAllDay) startInst.setHours(0, 0, 0, 0);
                      else startInst.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
                      
                      const startMs = startInst.getTime();
                      const endMs = startMs + (isAllDay ? Math.max(duration, 86400000) : duration); 

                      if (endMs > viewStart && startMs < viewEnd) {
                          items.push({ id: `${task.id}-${current}`, data: task, type: 'task', startMs, endMs, isRecurring: true });
                      }
                  }
                  current += 86400000;
              }
          } else if (task.scheduledTime) {
              let startMs = task.scheduledTime;
              let effectiveDuration = duration;
              if (isAllDay) {
                  const s = new Date(startMs);
                  s.setHours(0, 0, 0, 0);
                  startMs = s.getTime();
                  effectiveDuration = Math.max(duration, 86400000);
              }
              const endMs = startMs + effectiveDuration;
              if (endMs > viewStart && startMs < viewEnd) {
                  items.push({ id: task.id, data: task, type: 'task', startMs, endMs, isRecurring: false });
              }
          }
      });

      timeBlocks.forEach(block => {
          const duration = block.endTime - block.startTime;
          const isLong = duration >= 86400000; 
          if (!isLong) return;
          if (block.isRecurring && block.recurrencePattern) {
               const lookbackDays = Math.ceil(duration / 86400000) + 1;
               const checkStart = viewStart - (lookbackDays * 86400000);
               let current = checkStart;
               while(current < viewEnd) {
                   if (checkRecurrenceOverlap(block.recurrencePattern, block.startTime, current)) {
                       const orig = new Date(block.startTime);
                       const startInst = new Date(current);
                       startInst.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
                       const startMs = startInst.getTime();
                       const endMs = startMs + duration;
                       if (endMs > viewStart && startMs < viewEnd) {
                           items.push({ id: `${block.id}-${current}`, data: block, type: 'block', startMs, endMs, isRecurring: true });
                       }
                   }
                   current += 86400000;
               }
          } else {
              const startMs = block.startTime;
              const endMs = block.endTime;
              if (endMs > viewStart && startMs < viewEnd) {
                  items.push({ id: block.id, data: block, type: 'block', startMs, endMs, isRecurring: false });
              }
          }
      });

      items.sort((a, b) => a.startMs - b.startMs || (b.endMs - b.startMs) - (a.endMs - a.startMs));
      const rows: number[] = [];
      items.forEach(item => {
          let placed = false;
          for(let i=0; i<rows.length; i++) {
              if (rows[i] <= item.startMs) {
                  item.row = i;
                  rows[i] = item.endMs;
                  placed = true;
                  break;
              }
          }
          if (!placed) {
              item.row = rows.length;
              rows.push(item.endMs);
          }
      });
      return { allDayItems: items, allDayTotalRows: Math.max(1, rows.length) };
  }, [tasks, timeBlocks, gridDays, checkRecurrenceOverlap]);

  // ... (Interaction Logic Unchanged, omitted for brevity) ...
  useEffect(() => {
      if (!interaction) return;
      const handleGlobalMove = (e: MouseEvent) => { const deltaY = e.clientY - interaction.startY; setInteraction(prev => prev ? { ...prev, currentY: e.clientY } : null); };
      const handleGlobalUp = (e: MouseEvent) => {
          if (!interaction) return;
          const deltaY = e.clientY - interaction.startY;
          const deltaMinutes = Math.round((deltaY / hourHeight) * 60 / 15) * 15;
          if (interaction.type === 'create') {
              if (Math.abs(deltaMinutes) < 15) {
                  const d = new Date(interaction.dayStartTs); d.setHours(Math.floor(interaction.startMinutes/60), interaction.startMinutes%60, 0, 0); onCreateBlock(d);
              } else {
                  let startM = interaction.startMinutes; let endM = interaction.startMinutes + deltaMinutes;
                  if (endM < startM) { const temp = startM; startM = endM; endM = temp; } 
                  const start = new Date(interaction.dayStartTs); start.setHours(Math.floor(startM/60), startM%60, 0, 0);
                  const end = new Date(interaction.dayStartTs); end.setHours(Math.floor(endM/60), endM%60, 0, 0);
                  if (onCreateRange) onCreateRange(start, end);
              }
          } else if (interaction.type === 'resize' && interaction.itemId && interaction.endMinutes) {
              const newEndMinutes = Math.max(interaction.startMinutes + 15, interaction.endMinutes + deltaMinutes);
              const start = new Date(interaction.dayStartTs); start.setHours(Math.floor(interaction.startMinutes/60), interaction.startMinutes%60, 0, 0);
              const end = new Date(interaction.dayStartTs); end.setHours(Math.floor(newEndMinutes/60), newEndMinutes%60, 0, 0);
              if (interaction.itemType === 'task' && onResizeTask) onResizeTask(interaction.itemId, start.getTime(), end.getTime());
              else if (interaction.itemType === 'block' && onResizeBlock) onResizeBlock(interaction.itemId, start.getTime(), end.getTime());
          }
          setInteraction(null);
      };
      window.addEventListener('mousemove', handleGlobalMove); window.addEventListener('mouseup', handleGlobalUp);
      return () => { window.removeEventListener('mousemove', handleGlobalMove); window.removeEventListener('mouseup', handleGlobalUp); };
  }, [interaction, hourHeight, onCreateBlock, onCreateRange, onResizeTask, onResizeBlock]);

  const handleMouseDownCreate = (e: React.MouseEvent, dayTs: number) => {
      if (e.button !== 0) return; const rect = e.currentTarget.getBoundingClientRect(); const relativeY = e.clientY - rect.top; const minutes = (relativeY / hourHeight) * 60; const snappedMinutes = Math.floor(minutes / 15) * 15; const visualTop = (snappedMinutes / 60) * hourHeight;
      setInteraction({ type: 'create', dayStartTs: dayTs, baseY: visualTop, startY: e.clientY, currentY: e.clientY, startMinutes: snappedMinutes });
  };
  const handleMouseDownResize = (e: React.MouseEvent, dayTs: number, itemId: string, itemType: 'task' | 'block', startM: number, endM: number) => {
      e.stopPropagation(); e.preventDefault(); setInteraction({ type: 'resize', dayStartTs: dayTs, baseY: 0, startY: e.clientY, currentY: e.clientY, startMinutes: startM, endMinutes: endM, itemId, itemType });
  };
  const renderInteractionGhost = (dayTs: number) => {
      if (!interaction || interaction.dayStartTs !== dayTs) return null;
      const deltaY = interaction.currentY - interaction.startY; const deltaMinutes = (deltaY / hourHeight) * 60; let topPx = 0; let heightPx = 0; let label = '';
      if (interaction.type === 'create') {
          let startM = interaction.startMinutes; let durationM = deltaMinutes;
          if (durationM < 0) { startM += durationM; durationM = Math.abs(durationM); }
          durationM = Math.max(15, Math.round(durationM / 15) * 15);
          if (deltaMinutes < 0) startM = Math.round(startM / 15) * 15;
          topPx = (startM / 60) * hourHeight; heightPx = (durationM / 60) * hourHeight;
          const endM = startM + durationM;
          label = `${Math.floor(startM/60)}:${(startM%60).toString().padStart(2,'0')} - ${Math.floor(endM/60)}:${(endM%60).toString().padStart(2,'0')}`;
      } else return null;
      return (<div className="absolute z-50 bg-indigo-500/30 border-2 border-indigo-600 rounded pointer-events-none" style={{ top: `${topPx}px`, height: `${heightPx}px`, left: '2px', right: '2px' }}><div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] px-1 rounded-bl">{label}</div></div>);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = (d: Date) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * hourHeight;

  const getRecurrenceBadge = (task: Task) => { if (!task.isRecurring || !task.recurrencePattern) return null; return (<span className="w-3 h-3 flex items-center justify-center bg-indigo-600 text-white rounded-full shrink-0 ml-0.5 border border-white dark:border-gray-800 shadow-sm"><i className="fas fa-sync-alt text-[6px]"></i></span>); };
  const formatTimeRange = (startTs: number, durationMinutes: number) => { const start = new Date(startTs); const end = new Date(startTs + (durationMinutes * 60000)); return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; };
  const handleTaskDragStartWithOffset = (e: React.DragEvent, taskId: string, date: Date) => { if (interaction) { e.preventDefault(); return; } const target = e.currentTarget as HTMLElement; e.stopPropagation(); e.dataTransfer.setDragImage(target, target.offsetWidth / 2, -10); onTaskDragStart(e, taskId, date); };
  const handleBlockDragStartWithOffset = (e: React.DragEvent, block: TimeBlock, date: Date) => { if (interaction) { e.preventDefault(); return; } const target = e.currentTarget as HTMLElement; e.stopPropagation(); e.dataTransfer.setDragImage(target, target.offsetWidth / 2, -20); onBlockDragStart(e, block, date); };
  const handleColumnDragOver = (e: React.DragEvent, day: Date) => { e.preventDefault(); if (interaction) return; e.dataTransfer.dropEffect = 'move'; const rect = e.currentTarget.getBoundingClientRect(); const offsetY = e.clientY - rect.top; const minutes = Math.floor((offsetY * 60) / hourHeight); const snappedMinutes = Math.floor(minutes / 15) * 15; const top = (snappedMinutes / 60) * hourHeight; const h = Math.floor(snappedMinutes / 60); const m = snappedMinutes % 60; const timeLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; if (draggedTaskId) { setDragPreview({ dayStr: day.toISOString(), top, timeLabel, type: 'task', height: (20/BASE_HOUR_HEIGHT) * hourHeight }); } else if (draggedBlockId) { const block = timeBlocks.find(b => b.id === draggedBlockId); const durationMin = block ? (block.endTime - block.startTime) / 60000 : 60; const height = (durationMin / 60) * hourHeight; setDragPreview({ dayStr: day.toISOString(), top, timeLabel, type: 'block', height }); } };
  const getResolvedBlocks = (day: Date) => { const dayStart = day.getTime(); const dayEnd = dayStart + 86400000; const resolved: PreparedItem[] = []; timeBlocks.forEach(b => { if (b.isRecurring && b.recurrencePattern) { const duration = b.endTime - b.startTime; if (checkRecurrenceOverlap(b.recurrencePattern, b.startTime, dayStart)) { const orig = new Date(b.startTime); const start = new Date(day); start.setHours(orig.getHours(), orig.getMinutes(), 0, 0); resolved.push({ id: b.id, start: start.getTime(), end: start.getTime() + duration, data: b, isRecurring: true }); return; } const daysToCheck = Math.ceil(duration / 86400000); for (let i = 1; i <= daysToCheck + 1; i++) { const checkDate = dayStart - (i * 86400000); if (checkRecurrenceOverlap(b.recurrencePattern, b.startTime, checkDate)) { const orig = new Date(b.startTime); const start = new Date(checkDate); start.setHours(orig.getHours(), orig.getMinutes(), 0, 0); const end = start.getTime() + duration; if (end > dayStart) resolved.push({ id: b.id, start: start.getTime(), end, data: b, isRecurring: true }); return; } } } else { if (b.startTime < dayEnd && b.endTime > dayStart) resolved.push({ id: b.id, start: b.startTime, end: b.endTime, data: b, isRecurring: false }); } }); return resolved; };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden relative" ref={containerRef}>
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-white dark:bg-gray-800 flex flex-col select-none">
        
        {/* Header Grid */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 min-w-full shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <div className={`sticky left-0 z-50 ${TIME_COL_WIDTH} border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0`}></div>
            <div className="flex flex-1">
              {gridDays.map(day => (
                  <div key={day.toISOString()} className="flex-1 py-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-w-0 w-0">
                    <div className={`text-[9px] md:text-[10px] font-medium truncate px-1 leading-tight ${isToday(day) ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {day.toLocaleDateString(locale, { weekday: 'short' })} {day.getDate()}
                    </div>
                  </div>
              ))}
            </div>
          </div>
          
          {/* ALL DAY ROW */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50" style={{ minHeight: `${Math.max(30, allDayTotalRows * 22 + 4)}px` }}>
            <div className={`sticky left-0 z-50 ${TIME_COL_WIDTH} border-r border-gray-200 dark:border-gray-700 flex items-center justify-center bg-white dark:bg-gray-800 shrink-0`}>
              <span className="text-[6px] md:text-[7px] text-gray-400 dark:text-gray-500 font-bold -rotate-90 select-none">ALL DAY</span>
            </div>
            <div className="flex-1 relative">
                <div className="absolute inset-0 flex">{gridDays.map(day => (<div key={day.toISOString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-w-0 w-0" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropOnAllDay(e, day)}></div>))}</div>
                <div className="relative w-full h-full p-0.5 pointer-events-none">
                    {allDayItems.map(item => {
                        const viewStart = gridDays[0].getTime(); const totalDuration = gridDays.length * 86400000; const startOffset = Math.max(0, item.startMs - viewStart); const endOffset = Math.min(totalDuration, item.endMs - viewStart); const startPct = (startOffset / totalDuration) * 100; const widthPct = ((endOffset - startOffset) / totalDuration) * 100; const roundedL = item.startMs >= viewStart ? 'rounded-l-md' : ''; const roundedR = item.endMs <= (viewStart + totalDuration) ? 'rounded-r-md' : ''; const isTask = item.type === 'task'; const task = isTask ? item.data as Task : undefined; const block = !isTask ? item.data as TimeBlock : undefined; const title = isTask ? task!.title : block!.title; const color = isTask ? task!.color : block!.color;
                        return (
                            <div key={item.id} onClick={(e) => { e.stopPropagation(); if(isTask) onEditTask(task!, new Date(item.startMs)); else onEditBlock(block!, new Date(item.startMs)); }} draggable={!interaction} onDragStart={(e) => { if(isTask) onTaskDragStart(e, task!.id, new Date(item.startMs)); else onBlockDragStart(e, block!, new Date(item.startMs)); }} onDragEnd={onDragEnd} style={{ position: 'absolute', top: `${(item.row || 0) * 22}px`, left: `${startPct}%`, width: `${widthPct}%`, height: '20px', backgroundColor: !isTask ? (color || '#e0e7ff') : undefined, borderLeftColor: isTask ? (color || undefined) : undefined }} className={`z-10 shadow-sm border border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:brightness-95 overflow-hidden pointer-events-auto ${roundedL} ${roundedR} ${isTask ? (color ? 'border-l-4' : 'border-l-2 border-indigo-500') + ' bg-white dark:bg-gray-700' : ''} ${!isTask ? 'text-gray-900 border-black/5' : ''} ${draggedTaskId === (task?.id) || draggedBlockId === (block?.id) ? 'opacity-40' : ''}`}><div className="flex items-center px-1 h-full gap-1"><span className={`text-[8px] md:text-[10px] truncate font-medium ${isTask ? TEXT_STROKE_CLASS : ''}`}>{title}</span></div></div>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex min-w-full flex-1">
             <div className={`sticky left-0 z-30 ${TIME_COL_WIDTH} shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 select-none`}>
                 {hours.map(h => (<div key={h} style={{ height: `${hourHeight}px` }} className="text-center text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-medium relative -top-2.5 bg-white dark:bg-gray-800 leading-none flex items-center justify-center">{h === 0 ? '12' : h <= 12 ? h : h - 12} <span className="text-[6px] md:text-[7px] align-top ml-0.5">{h < 12 ? 'AM' : 'PM'}</span></div>))}
             </div>

             <div className="flex flex-1 relative">
                 {gridDays.map(day => {
                     const dayIso = day.toISOString(); const isCurrentDay = isToday(day); const dayStart = day.getTime(); const dayEnd = dayStart + 86400000;
                     const resolvedBlocks = getResolvedBlocks(day).filter(b => (b.end - b.start) < (DAY_MINUTES * 60000));
                     const positionedBlocks = calculateVisualLayout(resolvedBlocks);
                     const tasksForDay = getTasksForDay(day);
                     const resolvedTasks: PreparedItem[] = [];
                     tasksForDay.forEach(t => {
                         if (t.scheduledTime && !t.isAllDay && (!t.timeEstimateMinutes || t.timeEstimateMinutes < DAY_MINUTES)) {
                             let startDt = new Date(t.scheduledTime);
                             const estMin = t.timeEstimateMinutes || 60;
                             if (t.isRecurring) {
                                 const duration = estMin * 60000;
                                 if (checkRecurrenceOverlap(t.recurrencePattern!, t.scheduledTime, dayStart)) { const orig = new Date(t.scheduledTime); startDt = new Date(day); startDt.setHours(orig.getHours(), orig.getMinutes(), 0, 0); } 
                                 else { const daysToCheck = Math.ceil(duration / 86400000); for (let i = 1; i <= daysToCheck + 1; i++) { const checkDate = dayStart - (i * 86400000); if (checkRecurrenceOverlap(t.recurrencePattern!, t.scheduledTime, checkDate)) { const orig = new Date(t.scheduledTime); startDt = new Date(checkDate); startDt.setHours(orig.getHours(), orig.getMinutes(), 0, 0); break; } } }
                             }
                             const start = startDt.getTime(); const end = start + (estMin * 60000);
                             if (start < dayEnd && end > dayStart) resolvedTasks.push({ id: t.id, start, end, data: t, isRecurring: t.isRecurring });
                         }
                     });
                     const positionedTasks = calculateVisualLayout(resolvedTasks);

                     return (
                         <div key={dayIso} className="flex-1 relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-w-0 w-0 cursor-crosshair" onDragOver={(e) => handleColumnDragOver(e, day)} onDrop={(e) => { onDropOnColumn(e, day, dragPreview?.timeLabel || null); setDragPreview(null); }} onMouseDown={(e) => handleMouseDownCreate(e, dayStart)}>
                              {hours.map(h => <div key={h} style={{ height: `${hourHeight}px` }} className="border-b border-gray-100 dark:border-gray-700/50 box-border"></div>)}
                              {isCurrentDay && (<div className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center" style={{ top: `${currentTimeTop}px` }}><div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div></div>)}
                              {renderInteractionGhost(dayStart)}
                              {dragPreview && dragPreview.dayStr === dayIso && (<div className="absolute left-0 right-0 z-50 pointer-events-none flex items-center" style={{ top: `${dragPreview.top}px` }}><div className={`w-full border-dashed relative ${dragPreview.type === 'task' ? 'border-t-2 border-indigo-500' : 'bg-indigo-500/20 border-2 border-indigo-500/50 rounded'}`} style={dragPreview.type === 'block' ? { height: `${dragPreview.height}px` } : {}}><div className="absolute left-0 bottom-full mb-0.5 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-50">{dragPreview.timeLabel}</div></div></div>)}

                              {/* RENDER BLOCKS */}
                              {positionedBlocks.map(item => {
                                  const block = item.data as TimeBlock;
                                  const viewStart = dayStart; const itemStart = item.start; const itemEnd = item.end;
                                  const overlapStart = Math.max(itemStart, viewStart); const overlapEnd = Math.min(itemEnd, dayEnd);
                                  if (overlapEnd <= overlapStart) return null;
                                  const topPx = ((overlapStart - viewStart) / 3600000) * hourHeight; const heightPx = ((overlapEnd - overlapStart) / 3600000) * hourHeight; const pointerClass = (isDraggingFromCalendar && draggedBlockId !== block.id) ? 'pointer-events-none opacity-40' : ''; const isPast = dayStart < new Date(now).setHours(0,0,0,0) || (isCurrentDay && itemEnd < now.getTime()); const timeRangeStr = formatTimeRange(itemStart, (itemEnd - itemStart) / 60000); const isResizing = interaction?.type === 'resize' && interaction.itemId === block.id; const finalHeight = isResizing && interaction?.currentY ? Math.max(15, heightPx + (interaction.currentY - interaction.startY)) : heightPx;
                                  return (
                                      <div key={block.id} draggable={!interaction} onDragStart={(e) => handleBlockDragStartWithOffset(e, block, new Date(itemStart))} onDragEnd={onDragEnd} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditBlock(block, day); }} className={`absolute z-0 border overflow-hidden cursor-pointer hover:brightness-95 font-semibold text-gray-900 text-[8px] md:text-[9px] p-1 ${pointerClass} ${isPast ? 'opacity-50' : ''} rounded`} style={{ top: `${topPx}px`, height: `${finalHeight}px`, left: `${item.style.left}%`, width: `${item.style.width}%`, backgroundColor: block.color || '#e0e7ff', borderColor: 'rgba(0,0,0,0.05)' }}>
                                          <div className={`truncate pointer-events-none font-bold ${TEXT_STROKE_CLASS}`}>{block.title}</div>
                                          {finalHeight > 35 && <div className={`text-[7px] opacity-75 ${TEXT_STROKE_CLASS}`}>{timeRangeStr}</div>}
                                          <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 bg-transparent hover:bg-black/10" onMouseDown={(e) => handleMouseDownResize(e, dayStart, block.id, 'block', (itemStart - dayStart)/60000, (itemEnd - dayStart)/60000)} onClick={(e) => e.stopPropagation()}></div>
                                      </div>
                                  )
                              })}

                              {/* RENDER TASKS */}
                              {positionedTasks.map(item => {
                                  const task = item.data as Task;
                                  const viewStart = dayStart; const itemStart = item.start; const itemEnd = item.end;
                                  const overlapStart = Math.max(itemStart, viewStart); const overlapEnd = Math.min(itemEnd, dayEnd);
                                  if (overlapEnd <= overlapStart) return null;

                                  const topPx = ((overlapStart - viewStart) / 3600000) * hourHeight;
                                  const heightPx = ((overlapEnd - overlapStart) / 3600000) * hourHeight;
                                  const pointerClass = (isDraggingFromCalendar && draggedTaskId !== task.id) ? 'pointer-events-none opacity-40' : '';
                                  const isCompleted = task.status === 'Completed' || task.recurrencePattern?.completedInstances?.includes(dayStart);
                                  
                                  // --- UPDATED OVERDUE & ACTIVE LOGIC FOR CALENDAR ---
                                  const nowTs = now.getTime();
                                  const isOverdue = !isCompleted && itemEnd < nowTs;
                                  const isActive = !isCompleted && itemStart <= nowTs && nowTs <= itemEnd;
                                  
                                  const durationMinutes = (itemEnd - itemStart) / 60000;
                                  const timeRangeStr = formatTimeRange(itemStart, durationMinutes);
                                  const isResizing = interaction?.type === 'resize' && interaction.itemId === task.id;
                                  const finalHeight = isResizing && interaction?.currentY ? Math.max(15, heightPx + (interaction.currentY - interaction.startY)) : heightPx;
                                  const isShortTask = durationMinutes < 30; const contentPadding = isShortTask ? 'pt-0' : 'pt-0.5'; const titleSize = isShortTask ? 'text-[10px] font-bold leading-none' : 'text-[8px] md:text-[10px] leading-tight';

                                  return (
                                      <div key={task.id} draggable={!interaction} onDragStart={(e) => handleTaskDragStartWithOffset(e, task.id, new Date(itemStart))} onDragEnd={onDragEnd} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditTask(task, day); }}
                                          style={{ top: `${topPx}px`, height: `${Math.max(15, finalHeight)}px`, left: `${item.style.left}%`, width: `${item.style.width}%`, ...(task.color ? { borderLeftColor: task.color } : {}) }}
                                          className={`absolute p-0.5 text-[8px] md:text-[10px] shadow-sm cursor-grab overflow-hidden z-10 hover:z-20 border
                                            ${isOverdue ? 'border-red-500 border-2' : (isActive ? 'border-emerald-500 border-2 ring-1 ring-emerald-400' : 'border-gray-200 dark:border-gray-600')}
                                            ${isCompleted ? 'opacity-60 line-through' : ''} bg-white dark:bg-gray-700 ${pointerClass} ${task.color ? 'border-l-4' : 'border-l-2 border-indigo-500'} rounded`}
                                      >
                                          <div className={`flex flex-row items-start gap-1 w-full h-full ${contentPadding} pointer-events-none`}>
                                              {finalHeight > 10 && <button onClick={(e) => onToggleTask(e, task.id, dayStart)} className="hidden md:flex w-3 h-3 rounded-full border items-center justify-center shrink-0 pointer-events-auto border-gray-300 dark:border-gray-500 hover:border-indigo-500 bg-white/50 dark:bg-gray-800/50">{isCompleted && <i className="fas fa-check text-[7px]"></i>}</button>}
                                              <div className="min-w-0 flex-1 flex flex-col justify-start">
                                                <div className={`truncate ${titleSize} ${TEXT_STROKE_CLASS}`}>{task.title}</div>
                                                {finalHeight > 35 && <div className={`flex flex-wrap items-center gap-x-1 opacity-90 leading-none mt-0.5 text-[7px] md:text-[8px] ${TEXT_STROKE_CLASS}`}><span className="font-medium shrink-0">{timeRangeStr}</span>{getRecurrenceBadge(task)}</div>}
                                              </div>
                                          </div>
                                          <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 bg-transparent hover:bg-black/10" onMouseDown={(e) => handleMouseDownResize(e, dayStart, task.id, 'task', (itemStart - dayStart)/60000, (itemEnd - dayStart)/60000)} onClick={(e) => e.stopPropagation()}></div>
                                      </div>
                                  )
                              })}
                         </div>
                     )
                 })}
             </div>
        </div>
      </div>
    </div>
  );
};
