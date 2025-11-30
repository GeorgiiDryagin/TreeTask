
# Project Context & Business Logic

## The Problem
Standard todo lists fail to manage complexity. They treat "Build a House" (a 6-month project) the same as "Buy Milk" (a 10-minute task). They also lack the temporal context of calendars and the habit-forming structure of trackers, forcing users to switch between 3-4 apps.

## The Solution: TreeTask
TreeTask is a unified system that treats tasks as a hierarchy tree while mapping them onto a timeline.

### 1. The "Actionable" Definition (Current Focus)
The core business logic is the **Smart Filter**. A task is considered **Actionable** and shown in the "Current Focus" view only if:
1.  It is **Active** (Not Completed, Not Cancelled).
2.  It is a **Leaf Node** (It has zero pending subtasks).
3.  **Recurrence Exception**: If a task is recurring, it is only shown if it is scheduled for **Today** (or overdue). Future instances are hidden to prevent clutter.

*Logic:* You cannot "Build a House" right now. You can only "Call the Architect". TreeTask hides the parent until the child is done.

### 2. The Recurrence Engine: "Head-Body-Tail"
TreeTask implements a complex recurrence strategy to handle the "Editing a Series" problem without generating infinite future tasks in the database.

When a user edits an instance (e.g., moves the 3rd occurrence of a daily task):
1.  **Head**: The original recurrence pattern is curtailed to end *before* the edited date.
2.  **Body**: A standalone task is created for the specific edited date/change.
3.  **Tail**: A new recurrence pattern is generated starting *after* the edited date to continue the series.

This preserves history (past instances remain unchanged) while allowing future flexibility.

### 3. Integrated Sub-Systems

#### A. The Calendar & Time Blocks
*   **Tasks vs. Time Blocks**: Tasks are checkable items. Time Blocks are immutable reservations of time (e.g., "Commute", "Deep Work") that affect scheduling but aren't "completed".
*   **Spillover Logic**: If a task starts at 11:00 PM and lasts 2 hours, the system visually renders it across midnight into the next day.

#### B. Productivity Frameworks
*   **Eisenhower Matrix**: Automatically categorizes tasks into 4 quadrants based on Priority (Importance) and Date (Urgency).
*   **Pomodoro Timer**: A focused work timer linked to specific tasks. It tracks the number of sessions (`pomodoroCount`) per task.
*   **Forest View**: A gamified visualization where completed project trees are rendered as fractal trees, growing more complex based on the depth of the task hierarchy.

#### C. Note Management
*   **GTD Style**: Notes function as a staging area. They can be categorized (Inbox, Someday, Archive) and converted directly into Tasks when actionable.

### 4. Data Persistence & State
*   **Local-First**: All data is stored in `localStorage`.
*   **Singleton Pattern**: The `TaskManager` class acts as the single source of truth, managing state, undo/redo stacks, and business logic validation.