
# TreeTask Technical Reference

This document is a comprehensive catalog of the internal functions, methods, and algorithms implemented in the TreeTask codebase. It is intended for developers to understand the specific logic driving the application.

---

## 1. Core Service: `TaskManager` (`services/taskManager.ts`)

The `TaskManager` class follows the Singleton pattern and serves as the central "Database" and State Machine.

### State & Persistence
*   **`constructor()`**: Initializes state from `localStorage`. If empty, triggers `generateMockData()`.
*   **`save()`**: Serializes `tasks`, `timeBlocks`, `notes`, `goals`, and `logs` to JSON and writes to `localStorage`. Triggers `notifyListeners()`.
*   **`load()`**: Hydrates state from storage. Handles error catching for malformed JSON.
*   **`createSnapshot()`**: Deep clones the current state and pushes it to `undoStack`. Enforces `maxHistory` limit (50 steps).
*   **`undo()`**: Pops the last state from `undoStack`, pushes current to `redoStack`, and restores state.
*   **`redo()`**: Pops from `redoStack`, pushes to `undoStack`, and restores state.
*   **`subscribe(listener)`**: Implements the Observer pattern. Returns an unsubscribe function.

### Task CRUD & Hierarchy
*   **`createTask(payload)`**: Generates a UUID, creates a `Task` object, initializes counters (`pendingChildrenCount: 0`), logs the action, and calls `updateParentCounters`.
*   **`updateTask(id, updates, options)`**:
    *   Updates task properties.
    *   **Logic**: If `status` changes (e.g., Active -> Completed), it calculates the delta and calls `updateParentCounters` to unblock/block ancestors.
    *   **Validation**: Prevents completing a task if `pendingChildrenCount > 0` (unless `skipDependencyCheck` is true).
    *   **Reparenting**: If `parentId` is in updates, delegates to `moveTask` to handle cycle detection and counters.
*   **`moveTask(taskId, newParentId)`**:
    *   **Cycle Detection**: Traverses up from `newParentId` to ensure `taskId` is not an ancestor of its own future parent.
    *   **Counter Updates**: Decrements counters on the old parent chain and increments them on the new parent chain.
*   **`deleteTask(id)`**: Soft-deletes a task (sets `deletedAt`). Recursively soft-deletes all descendants. Updates parent counters.
*   **`restoreTask(id)`**: Removes `deletedAt`. Recursively restores descendants. Re-attaches to parent (or Root if parent is missing/deleted).
*   **`deleteTaskPromoteChildren(id)`**: Moves all direct children of the target task to the target's parent (grandparent), then deletes the target.
*   **`updateParentCounters(parentId, pendingDelta, totalDelta)`**: Traverses up the `parentId` chain, adjusting `pendingChildrenCount` and `totalChildrenCount`. Used for O(1) filtering in "Current Focus".

### Recurrence Engine
*   **`getCurrentRecurrenceInstanceDate(task, now)`**:
    *   Calculates the "valid" instance date for a recurring task relative to `now`.
    *   **Logic**: It finds the last recurrence start date that is `<= now`. This allows tasks to stay "Active" (and overdue) even if the calendar day has changed, until the *next* interval begins.
*   **`splitRecurringTask(taskId, newDate, mode, instanceDate)`**: Handles editing a recurring instance.
    *   **Mode 'this'**: Curtains original pattern (Head), creates single task (Body), creates new pattern (Tail).
    *   **Mode 'future'**: Ends original pattern at date, starts new pattern with new config.
*   **`checkRecurrenceOverlap(pattern, startTs, targetDayStart)`**:
    *   Determines if a recurrence pattern falls on a specific date.
    *   Handles `Daily`, `Weekly` (day masks), `Monthly`.
    *   Checks `excludeDates` and `endCondition`.
*   **`getRecurrenceIndex(startTs, pattern, targetTs)`**: Calculates the 1-based index of an occurrence (e.g., "This is the 5th event"). Used to calculate remaining counts for `After X occurrences`.
*   **`toggleTaskStatus(id, instanceDate)`**:
    *   For **Single Tasks**: Toggles `status`.
    *   For **Recurring Tasks**: Does *not* change `status`. Instead, adds/removes `instanceDate` from the `completedInstances` array in the recurrence pattern.

### Goals Manager
*   **`createGoal(title, targetDate)`**: Creates a new Goal entity.
*   **`updateGoal(id, updates)`**: Updates SMART fields or linked tasks.
*   **`deleteGoal(id)`**: Removes the Goal entity.

### Time Blocks
*   **`addTimeBlock(block)`**, **`updateTimeBlock(id, updates)`**, **`deleteTimeBlock(id)`**: Standard CRUD for the non-hierarchical `TimeBlock` entity.
*   **`getCurrentActiveTimeBlocks(now)`**: Returns blocks active at the given timestamp. Used for Contextual Sorting.

### Notes & Logs
*   **`createNote(content, category)`**, **`moveNote(id, category)`**, **`deleteNote(id)`**: CRUD for notes.
*   **`convertNoteToTask(noteId)`**: Creates a task from note content, then deletes the note.
*   **`log(action, title, id, details)`**: Appends an immutable audit entry to `logs` array.

---

## 2. Calendar Logic Hook (`hooks/useCalendarLogic.ts`)

Shared mathematical functions for the Calendar views.

*   **`getDaysInGrid(currentDate, viewType)`**: Returns an array of `Date` objects representing the visible grid (Day, 3-Day, Week, Month). Handles "Start on Monday" logic.
*   **`checkRecurrenceSpillover(pattern, baseStart, duration, targetDayStart)`**:
    *   **Problem**: A task starts yesterday at 11 PM and lasts 3 hours. It must appear on today's grid.
    *   **Logic**: Iterates backward from `targetDayStart` (up to `duration` days) to check if any previous instance overlaps into the current day.
*   **`getTasksForDay(tasks, date)`**: Filters the global task list to return only tasks visible on a specific date, handling both single-instance overlap and recurring pattern matching.

---

## 3. UI Algorithms & Visual Logic

### Effective Time Calculation (`components/TaskItem.tsx`)
*   **Logic**: Calculates `Effective Start` and `Effective End` for correct Overdue/Active states.
    *   **Recurring Tasks**: Merges the `instanceDate` (Year/Month/Day) with the original `scheduledTime` (Hour/Minute) to reconstruct the specific instance's timestamp.
    *   **Overdue**: True if `Effective End < Now`.
    *   **Active**: True if `Effective Start <= Now <= Effective End`.

### Tag Autocomplete (`components/TaskFormModal.tsx`)
*   **Aggregation**: Uses `Set` to create a unique list of tags from `allTasks` (and optionally `timeBlocks`).
*   **Input Parsing**: Splits the input string by commas.
*   **Filtering**:
    *   Extracts the *last* segment (after the last comma).
    *   Filters the unique tag list for case-insensitive matches.
    *   Excludes tags that are already present in the input string.

### Calendar Layout (`components/calendar/TimeGridView.tsx`)
*   **`calculateVisualLayout(items)`**:
    *   **Goal**: Render overlapping tasks side-by-side without collision (Tetris packing).
    *   **Algorithm**:
        1.  Sort items by Start Time.
        2.  Iterate items and assign to the first available visual "Column" index where no overlap exists.
        3.  Calculate `width: (100 / totalCols)%` and `left: (colIndex / totalCols)%`.
    *   **Result**: Dynamic responsive layout for time slots.
*   **Drag-to-Create**:
    *   Captures `mousedown` on the grid background.
    *   Calculates `deltaY` to render a real-time "Ghost" overlay (`renderInteractionGhost`).
    *   On `mouseup`, triggers modal with calculated start/end times.

### Fractal Forest (`components/ForestView.tsx`)
*   **`getPseudoRandom(input)`**: A seeded random number generator (using a hash of the Task ID). Ensures the tree always looks the same for the same task.
*   **`FractalBranch` (Component)**:
    *   Recursive component.
    *   Calculates `angle`, `length`, and `strokeWidth` based on tree depth.
    *   Uses quadratic Bezier curves (`path d="M... Q..."`) for organic branch bending.
    *   **Math**: `endX = x + length * cos(angle)`, `endY = y - length * sin(angle)`.

### Progress Rings (`components/TaskItem.tsx`)
*   **Logic**: `stroke-dashoffset = circumference - (percent * circumference)`.
*   **Input**: `completedChildren / totalChildren`.

### Analog Clock (`components/form/AnalogTimePicker.tsx`)
*   **Interaction**: Converts mouse XY coordinates relative to center into an angle.
*   **Math**: `angle = atan2(y, x)`.
*   **Snap**: Rounds angle to nearest 30deg (hours) or 6deg (minutes).
*   **24h Mode**: Detects if click distance < inner radius to toggle PM hours (13-23).

---

## 4. Automated Testing (`utils/testRunner.ts`)

*   **`runAutomatedTests()`**: A self-contained integration test suite that runs directly in the browser console.
    *   **Test 1**: Verifies Hierarchy Counters (creates parent, adds child, checks `pendingChildrenCount`).
    *   **Test 2**: Verifies "Current Focus" filtering (ensures parent is hidden, child is visible).
    *   **Test 3**: Verifies Recurrence Splitting (checks if Head/Body/Tail are created correctly).
    *   **Test 4**: Verifies Cycle Detection (attempts illegal move, asserts failure).
    *   **Test 5**: Verifies Time Block CRUD.
    *   **Output**: Logs results to Console and displays global Success/Fail alert.
