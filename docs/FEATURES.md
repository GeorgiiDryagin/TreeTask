
# TreeTask Features & Engineering Guide

This document is a comprehensive manual of the engineering solutions, automated behaviors, and visual interface patterns implemented in TreeTask. It covers everything from core business logic to specific UI micro-interactions.

---

## 1. Core Logic: The "Smart" Engine

### Automatic Hierarchy Filtering ("Current Focus")
*   **Concept**: A task is only "actionable" if it has no incomplete subtasks. A parent task represents a "Project" that cannot be "done" directly, only advanced by its children.
*   **Implementation**:
    *   The `TaskManager` maintains a real-time recursive counter `pendingChildrenCount` on every node.
    *   **O(1) Filtering**: The "Current Focus" view instantly filters for `pendingChildrenCount === 0` and `status !== 'Completed'`.
    *   **Automation**: When a subtask is completed, the system recursively updates ancestors. If a parent's counter hits 0, it automatically "unlocks" and appears in the list.

### Context-Aware Auto-Sorting
*   **Logic**: The task list reorders itself automatically based on the time of day.
*   **Automation**:
    1.  The app continuously monitors the current time (or Debug Time).
    2.  It identifies active **Time Blocks** (e.g., "Deep Work", "Morning Routine").
    3.  Tasks that match an active block's **Task Type** or **Tags** receive a dynamic **+5000 score boost**.
    4.  **Visual Cue**: Tasks matching the current context display a **cyan dot** indicator.
*   **Result**: When your "Work" block begins, professional tasks automatically jump to the top of your list.

### Active Execution Highlighting
*   **Concept**: Tasks that are currently happening *right now* (Start Time ≤ Now ≤ End Time) should be visually distinct from tasks that are simply "on the list."
*   **Visual**: Active tasks are surrounded by a **pulsing green halo** (`ring-emerald-500`) and a subtle background tint.
*   **Logic**:
    *   Calculates `Effective End Time` = `Start Time` + `Duration`.
    *   If `Now` is within this window, the task is marked Active.

### Smart Overdue Logic
*   **Concept**: A task is not "Late" the second it starts. It is only "Late" when it should have been finished.
*   **Implementation**: The system calculates the **End Time** of a task based on its estimated duration. The "Overdue" flag only triggers if `Now > End Time`.
*   **Recurrence Nuance**: For recurring tasks, the system calculates the specific start time of the *current active instance* (even if the date technically changed at midnight) to ensure the overdue calculation respects the specific time slot (e.g., 2:00 PM) of the cycle.

---

## 2. Strategic Alignment (Goals Module)

### S.M.A.R.T. Framework Integration
*   **Structure**: The Goals module creates a layer above Projects. It enforces the S.M.A.R.T. criteria (Specific, Measurable, Achievable, Relevant, Time-bound) via specific input fields.
*   **UI Layout**: The Goal Detail modal splits the screen:
    *   **Left**: The Definition (SMART fields).
    *   **Right**: The Strategy (Linked Projects).
*   **Adaptive Mobile Layout**: On mobile devices, these two sections are forced to split the vertical height 50/50. This ensures the user can always see the connection between their Strategy (Projects) and their Definition (SMART) without getting lost in a long scroll.

### Strategy vs. Execution Linking
*   **Logic**: You cannot "do" a Goal. You execute Projects that achieve the Goal.
*   **Linking**: Users can search for and attach existing **Root Tasks (Projects)** to a Goal.
    *   *Constraint*: Infinite recurring tasks (without an end date) cannot be linked, strictly enforcing the **Time-bound** (T) aspect of SMART.
*   **Hybrid Progress Tracking**:
    *   **Standard Projects**: Progress = `(Total Nodes - Pending Nodes) / Total Nodes` across linked trees.
    *   **Recurring Tasks**: Progress = `Completed Repetitions / Total Planned Repetitions`.
    *   This provides a high-level percentage view of strategic progress.

---

## 3. The Recurrence Engine ("Head-Body-Tail")

TreeTask avoids generating infinite database rows for recurring tasks while allowing complex exception handling.

### The "Persistent Actionable" Window
*   **Problem**: In standard apps, if you miss a daily task yesterday, it disappears or clutters the list as "Yesterday".
*   **Solution**: A recurring task remains visible and "Overdue" until the *next* occurrence's start time arrives.
*   **Logic**:
    *   If a task is Daily at 9:00 AM, and it is now 11:00 PM, it is still the *same* active instance (Overdue).
    *   Once 9:00 AM tomorrow hits, the system seamlessly "refreshes" the instance to the new day.
    *   This ensures the user always sees the *most relevant* instance of the cycle without duplicate "missed" entries.

### The "Split" Strategy
When a user edits a specific instance of a recurring series (e.g., rescheduling the 3rd occurrence):
1.  **Head**: The original recurrence pattern is modified to end *before* the edited date (`endCount` reduced).
2.  **Body**: A new, standalone task is created for the edited date with the specific changes.
3.  **Tail**: A new recurrence pattern is created starting *after* the edited date to resume the series.

---

## 4. Adaptive & Responsive Design

TreeTask uses a specific set of layout rules to balance focus with information density across devices.

### The "15cm Rule" (Focus Width)
*   **Philosophy**: Reading long lines of text or managing lists on wide screens causes eye fatigue.
*   **Implementation**: Views that require focus are strictly constrained to `max-w-[600px]` (approx 15cm) on Desktop. They are centered in the viewport.
    *   **Views**: Current Tasks, All Tasks, Routine, Goal Editing, **Eisenhower Matrix**.
*   **Mobile**: These views expand to 100% width.

### Full Canvas Views
*   **Exceptions**: Views that require spatial organization ignore the 600px limit and use the full viewport width:
    *   **Calendar**: Needs horizontal space for days/weeks.
    *   **Forest**: Needs panoramic width for the fractal garden.

### Adaptive Panes (Calendar)
*   **Desktop**: The Calendar uses a 3-pane layout.
    *   Left: Filters Sidebar (Ghost/Slide).
    *   Center: The Grid.
    *   Right: Unscheduled Tasks Sidebar (Ghost/Slide).
    *   *Ghost Spacers*: When a sidebar opens, a hidden "Ghost" spacer appears on the opposite side to keep the Calendar Grid perfectly centered.
*   **Mobile**: Sidebars become overlays or split the screen 50/50 (e.g., Day View + Unscheduled List) to manage limited screen real estate.

---

## 5. Visual Interface & UX Engineering

### Smart Tag Autocomplete
*   **Feature**: When typing in the "Tags" field of a Task or Time Block, the system suggests existing tags to ensure consistency.
*   **Behavior**:
    *   Aggregates all unique tags from current Tasks and Time Blocks.
    *   Analyzes the specific tag being typed (after the last comma).
    *   Filters out tags already present in the input.
    *   Displays a dropdown menu for quick selection.

### Circular Progress Rings
*   **Visual**: Parent tasks do not have simple checkboxes. They feature a dynamic ring indicating the completion status of their subtree.
*   **Math**: The `TaskItem` component calculates `completedChildren / totalChildren`. It renders an SVG `<circle>` with `stroke-dashoffset` calculated via `2 * PI * r * (1 - percentage)`.

### "Root" Drop Zone
*   **Interaction**: To turn a subtask into a top-level project, users drag it towards the **far left** of the screen in "All Tasks".
*   **Engineering**: A specialized drop zone (visualized as a rounded triangle/arrow with the label "ROOT") dynamically tracks the user's drag position. Dropping here sets `parentId = null`.

### Analog Time Picker
*   **Component**: A custom-built radial clock interface for natural time entry.
*   **Interaction**:
    *   Clicking the clock face selects hours.
    *   It differentiates AM/PM based on the distance from the center (Inner ring = PM, Outer ring = AM).
    *   Auto-switches to minutes selection after hour entry.

---

## 6. Gamification: The Fractal Forest

### Deterministic Generative Art
*   **Technology**: Recursive SVG rendering.
*   **Logic**:
    *   Each Project (Root Task) is visualized as a tree.
    *   **Seed**: The shape, branching angles, and curvature are seeded by the Task ID. The same task always produces the exact same tree structure.
    *   **Growth**: 
        *   Trunk thickness = Function of `totalChildrenCount`.
        *   Branch recursion depth = Tree depth.
    *   **Status**: Active nodes render as green leaves; Completed nodes turn gold/amber.

---

## 7. Productivity Frameworks

### Eisenhower Matrix
*   **Automation**: Automatically categorizes tasks into 4 quadrants.
*   **Logic**:
    *   **Urgent**: Due date is within the next 14 days (or overdue).
    *   **Important**: Priority is 'High' or 'Critical'.

### Pomodoro Timer
*   **Logic**: Tracks `pomodoroCount` on specific tasks.
*   **Flow**: Work (25m) -> Short Break (5m) -> ... -> Long Break (15m) after 4 sessions.
*   **Integration**: Completing a timer session automatically increments the task's counter and updates the UI.

### Kanban Board
*   **Feature**: Generates a board on-the-fly for any parent task.
*   **Interaction**: Dragging subtasks between "Not Started", "In Progress", and "Completed" columns updates their `status`.

---

## 8. System Capabilities

### Time Travel (Debug Mode)
*   **Engineering**: The app relies on a central `now` state (passed via props/context) rather than `new Date()`.
*   **Feature**: The "Debug Controls" allow adding offsets to this timestamp. This instantly updates "Overdue" calculations, Calendar markers, and Recurrence generation without waiting for real time.

### Undo/Redo & Persistence
*   **Pattern**: Command Pattern with Snapshotting.
*   **Implementation**: Before any state-mutating operation, the `TaskManager` pushes a full clone of the state to the `undoStack`.
*   **Storage**: All data writes sync to `localStorage` immediately.
