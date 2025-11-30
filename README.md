
# TreeTask - Smart Hierarchical Task Manager

TreeTask is a specialized task management application designed for complex projects that require deep nesting, subtask breakdown, and robust recurring schedules. Unlike standard flat to-do lists, TreeTask helps you break down large, intimidating goals into small, manageable steps while handling complex routine and habit tracking.

## Core Philosophy

The central feature of TreeTask is the **Current Focus** view. By tracking the hierarchy of tasks, the application automatically calculates which tasks are "blocked" by subtasks. It filters out high-level conceptual tasks and surfaces only the leaf nodes—the actual actionable items you need to do *right now*.

## Key Features

*   **Infinite Hierarchy**: Create subtasks within subtasks to any depth.
*   **Smart "Current Focus"**: Automatically hides parent tasks until their subtasks are complete.
*   **Advanced Recurrence Engine**:
    *   Daily, Weekly, Monthly patterns.
    *   **Smart Splitting**: Editing a middle instance of a recurring series offers to split the series (Head-Body-Tail) or update future events.
    *   **Instance Completion**: Mark a daily task as done for *today* without completing the whole series.
*   **Routine & Habits**:
    *   Dedicated **Routine View** grouping recurring tasks by project.
    *   **Habit Tracking**: Specialized view for "Useful/Productive" habits with separate tab.
    *   **Time Blocks**: Schedule non-task blocks (e.g., "Deep Work", "Lunch") with full recurrence support.
*   **Integrated Calendar**: 
    *   **Views**: Day, 3-Day, Week, 2-Weeks, Month.
    *   **Drag-and-Drop**: Reschedule tasks by dragging. Move between "Unscheduled" backlog and calendar grid.
    *   **Ghost Creation**: Click and drag on the grid to visually paint time blocks.
*   **System Views**:
    *   **Forest**: Gamified fractal tree visualization of your projects.
    *   **Logs**: Audit trail of all actions.
    *   **Summary**: Statistics on created vs completed tasks.
*   **Debug Tools**: Built-in time travel controls to test recurrence and overdue logic.

## Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **Icons**: FontAwesome

## Documentation

For a deep dive into the system capabilities and code:

*   **[Features & Engineering Guide](docs/FEATURES.md)**: Detailed breakdown of every feature, visual engineering choice, and automation logic.
*   **[Technical Reference](docs/TECHNICAL_REFERENCE.md)**: Code-level documentation of functions, algorithms, and data structures.
*   **[User Guide](docs/USER_GUIDE.md)**: How to use the application.
*   **[Context & Philosophy](docs/CONTEXT.md)**: The "Why" behind the app.

## Getting Started

1.  **Dependencies**: Ensure `react`, `react-dom`, and `tailwindcss` are available (managed via importmap in this environment).
2.  **Run**: The application mounts to `#root` in `index.html`.