
# Technical Architecture

## 1. System Overview
TreeTask is a **Client-Side SPA** built with **React 19** and **TypeScript**. It utilizes a centralized Service-based architecture for state management rather than Redux or Context-only state, ensuring logic separation from UI.

## 2. Directory Structure & Key Components

```text
/
├── components/
│   ├── calendar/           # Complex Calendar Grid Logic
│   │   ├── TimeGridView.tsx    # Vertical scrollable hourly grid
│   │   ├── MonthGridView.tsx   # Standard cell-based calendar
│   │   └── CalendarSidebar.tsx # "Unscheduled" inbox drawer
│   ├── form/               # Custom Input Components
│   │   ├── AnalogTimePicker.tsx # Radial UI for time selection
│   │   └── RecurrenceScheduler.tsx # Complex recurrence form logic
│   ├── AllTasksView.tsx    # Recursive Tree Renderer
│   ├── ForestView.tsx      # SVG Fractal Generator
│   ├── PomodoroTimerView.tsx # Timer logic & Settings
│   ├── KanbanBoardModal.tsx # Drag-and-drop status board
│   ├── GoalsView.tsx       # SMART Goals Dashboard
│   ├── GoalDetailModal.tsx # Goals creation & Project linking
│   └── ...
├── services/
│   ├── taskManager.ts      # THE CORE. Singleton State Machine.
│   └── geminiService.ts    # Google GenAI SDK Abstraction.
├── hooks/
│   └── useCalendarLogic.ts # Shared math for date grids and overlaps.
├── context/
│   └── TaskContext.tsx     # React Glue for TaskManager events.
└── types.ts                # TypeScript Interfaces.
```

## 3. Data Models

### `Task`
The central entity.
*   `pendingChildrenCount`: Cached counter to allow O(1) filtering of leaf nodes.
*   `scheduledTime`: Timestamp (UTC). Single source of truth for "Date".
*   `recurrencePattern`: Object defining frequency (Daily/Weekly/Monthly) and exceptions.
*   `pomodoroCount`: Integer tracking work sessions.

### `TimeBlock`
A lightweight entity for visual scheduling only.
*   Non-hierarchical.
*   Supports recurrence identical to Tasks.

### `Goal`
A strategic container for projects.
*   `smart`: Object containing specific S.M.A.R.T. criteria strings.
*   `linkedTaskIds`: Array of strings referencing Root Tasks (Projects).
*   `targetDate`: Optional deadline timestamp.

### `LogEntry`
Immutable audit log of user actions (Create, Update, Delete, Note Conversion).

## 4. Key Engineering Patterns

### Singleton State Manager (`TaskManager`)
*   **Responsibility**: Holds the "Database" (in-memory arrays). Handles Persistence (LocalStorage), Undo/Redo Stacks, and CRUD operations.
*   **Observer Pattern**: Components subscribe to changes. When `save()` is called, listeners (Context) are notified to trigger React re-renders.
*   **Snapshotting**: Before any write operation, a snapshot of the state is pushed to the `undoStack`.

### Recursive UI Rendering
*   `AllTasksView` and `ForestView` utilize recursive React components to render potentially infinite depth trees.
*   **Performance**: Memoization (`useMemo`) is heavily used to prevent recalculating tree structures on every tick.

### Virtual Time (Debug Mode)
*   The `App` component holds a `now` state, modified by `DebugTimeControls`.
*   This virtual timestamp is passed down to all views.
*   **Benefit**: Allows testing of "Overdue" states and Recurrence rollovers without waiting for real time to pass.

### Custom Drag & Drop
*   Uses HTML5 native DnD API.
*   **Complex Interactions**:
    *   Calendar: Calculate time slot based on pixel offset in `TimeGridView`.
    *   Kanban: Update status based on column drop.
    *   Hierarchy: Reparenting tasks by dragging one node onto another.

## 5. External Integrations
*   **Google GenAI**:
    *   Endpoint: `models.generateContent`
    *   Usage: Prompt engineering to parse a task title and return a JSON array of subtasks.
