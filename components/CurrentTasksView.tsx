import React from 'react';
import { Task, TaskPriority, TimeBlock, TaskType, TaskStatus } from '../types';
import { TaskItem } from './TaskItem';
import { taskManager } from '../services/taskManager';

interface CurrentTasksViewProps {
  tasks: Task[];
  onToggle: (id: string, instanceDate?: number) => void;
  onAddSubtask: (parentId: string) => void;
  onEdit: (task: Task) => void;
  refreshData: () => void;
  t: any;
  language: string;
  now?: number;
  activeBlocks?: TimeBlock[];
  onOpenPomodoro?: (task: Task) => void;
}

export const CurrentTasksView: React.FC<CurrentTasksViewProps> = ({ 
  tasks, 
  onToggle, 
  onAddSubtask, 
  onEdit, 
  refreshData, 
  t, 
  language,
  now,
  activeBlocks = [],
  onOpenPomodoro,
}) => {

  const handleGenerateDebugTrees = () => {
    // ... (Debug generation code remains identical, omitted for brevity but preserved in logic) ...
    const today = new Date();
    today.setHours(0,0,0,0);
    const nowTs = Date.now();

    // --- PART 1: 5 Diverse Standalone Tasks ---
    const standalones = [
        {
            title: "Emergency Server Patch",
            priority: "Critical" as TaskPriority,
            taskType: "Work" as TaskType,
            tags: ["DevOps", "Urgent"],
            timeEstimateMinutes: 120,
            scheduledTime: new Date(nowTs + 3600000).getTime(), // In 1 hour
            color: "#ef4444"
        },
        {
            title: "Buy Groceries for Week",
            priority: "Medium" as TaskPriority,
            taskType: "Hobby" as TaskType,
            tags: ["Errands"],
            timeEstimateMinutes: 45,
            scheduledTime: new Date(today.getTime() + 18 * 3600000).getTime(), // Today 6 PM
            color: "#10b981"
        },
        {
            title: "Read 'Clean Code' Ch. 4",
            priority: "Low" as TaskPriority,
            taskType: "Study" as TaskType,
            tags: ["Reading", "Learning"],
            timeEstimateMinutes: 30,
            isAllDay: true,
            scheduledTime: today.getTime(),
            color: "#3b82f6"
        },
        {
            title: "Yearly Health Checkup",
            priority: "High" as TaskPriority,
            taskType: "Health" as TaskType,
            tags: ["Health"],
            timeEstimateMinutes: 60,
            scheduledTime: new Date(nowTs + 86400000 * 2).getTime(), // In 2 days
            color: "#f59e0b"
        },
        {
            title: "Cancel Netflix Subscription",
            priority: "Low" as TaskPriority,
            taskType: "Habit" as TaskType,
            tags: ["Finance"],
            timeEstimateMinutes: 10,
            color: "#6b7280"
        }
    ];

    standalones.forEach(s => taskManager.createTask(s as any, true));

    const node = (title: string, status: TaskStatus, children: any[] = [], extra: any = {}) => ({ title, status, children, ...extra });

    const trees = [
        node("Legacy Project Archive (100%)", "Completed", [
            node("Backup Database", "Completed"),
            node("Compress Files", "Completed", [
                node("Images", "Completed"),
                node("Documents", "Completed")
            ]),
            node("Upload to S3", "Completed")
        ], { priority: "Low", color: "#6b7280" }),
        node("Website Launch (90%)", "In Progress", [
            node("Design Phase", "Completed", [
                node("Wireframes", "Completed"),
                node("High-fi Mockups", "Completed")
            ]),
            node("Development", "Completed", [
                node("Frontend", "Completed"),
                node("Backend", "Completed"),
                node("API", "Completed")
            ]),
            node("Deployment", "In Progress", [
                node("Configure DNS", "Completed"),
                node("Click 'Publish'", "Not Started") 
            ])
        ], { priority: "Critical", color: "#ef4444" }),
        node("Q3 Financial Report (75%)", "In Progress", [
            node("Data Collection", "Completed", [
                node("Sales Data", "Completed"),
                node("Expense Reports", "Completed")
            ]),
            node("Analysis", "Completed"),
            node("Drafting", "In Progress", [
                node("Executive Summary", "Completed"),
                node("Charts & Graphs", "Not Started"),
                node("Conclusion", "Not Started")
            ])
        ], { priority: "High", color: "#f97316" }),
        node("Europe Vacation Planning (50%)", "In Progress", [
            node("Logistics", "Completed", [
                node("Book Flights", "Completed"),
                node("Book Hotels", "Completed")
            ]),
            node("Itinerary", "Not Started", [
                node("Paris Research", "Not Started"),
                node("Rome Research", "Not Started")
            ]),
            node("Packing", "Not Started")
        ], { priority: "Medium", color: "#8b5cf6" }),
        node("Learn Piano (30%)", "In Progress", [
            node("Setup", "Completed", [
                node("Buy Keyboard", "Completed"),
                node("Find Teacher", "Completed")
            ]),
            node("Practice Scales", "In Progress", [
                node("C Major", "Completed"),
                node("G Major", "Not Started"),
                node("F Major", "Not Started")
            ]),
            node("Learn Song 1", "Not Started")
        ], { priority: "Low", color: "#14b8a6" }),
        node("Garage Cleanup (15%)", "In Progress", [
            node("Preparation", "Completed", [
                node("Buy Trash Bags", "Completed"),
                node("Buy Shelves", "Not Started")
            ]),
            node("Sorting", "Not Started", [
                node("Tools", "Not Started"),
                node("Sports Gear", "Not Started"),
                node("Junk", "Not Started")
            ]),
            node("Disposal", "Not Started")
        ], { priority: "Medium", color: "#f59e0b" }),
        node("Write Novel (0%)", "Not Started", [
            node("Outline", "Not Started", [
                node("Character Profiles", "Not Started"),
                node("Plot Points", "Not Started")
            ]),
            node("Drafting", "Not Started", [
                node("Chapter 1", "Not Started"),
                node("Chapter 2", "Not Started")
            ])
        ], { priority: "High", color: "#ec4899", taskType: "Hobby" }),
        node("Mars Colony Project (0%)", "Not Started", [
            node("Phase 1: Rockets", "Not Started", [
                node("Design Engine", "Not Started"),
                node("Fuel Tests", "Not Started")
            ]),
            node("Phase 2: Life Support", "Not Started", [
                node("Oxygen Generation", "Not Started", [
                    node("Algae Tanks", "Not Started"),
                    node("Electrolysis", "Not Started")
                ]),
                node("Food Supply", "Not Started")
            ])
        ], { priority: "Critical", color: "#000000" })
    ];

    const createTree = (node: any, parentId: string | null = null) => {
        const task = taskManager.createTask({
            title: node.title,
            parentId: parentId,
            priority: node.priority || 'Medium',
            color: node.color,
            taskType: node.taskType,
            timeEstimateMinutes: node.children.length === 0 ? 60 : undefined 
        }, true);

        if (node.status && node.status !== 'Not Started') {
            taskManager.updateTask(task.id, { status: node.status }, { skipDependencyCheck: true }, true);
        }

        if (node.children) {
            node.children.forEach((child: any) => createTree(child, task.id));
        }
    };

    trees.forEach(tree => createTree(tree));
    (taskManager as any).save();
    refreshData();
  };

  const currentTime = now || Date.now();

  return (
    <div className="space-y-6 pb-12">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
            <i className="fas fa-check-double text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{t.caughtUpTitle}</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
            {t.caughtUpDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            // Determine instance date accurately for recurrence.
            // If it's in the current list, it's either today or a past overdue instance.
            const instanceDate = task.isRecurring 
                ? (taskManager.getCurrentRecurrenceInstanceDate(task, currentTime) || undefined) 
                : undefined;
            
            // Determine if this task matches the current context (Time Block)
            let isContextMatch = false;
            if (activeBlocks.length > 0) {
                if (task.taskType && activeBlocks.some(b => b.taskType === task.taskType)) {
                    isContextMatch = true;
                }
                if (!isContextMatch && task.tags.length > 0) {
                    if (activeBlocks.some(b => b.tags?.some(tag => task.tags.includes(tag)))) {
                        isContextMatch = true;
                    }
                }
            }

            return (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onAddSubtask={onAddSubtask}
                onEdit={onEdit}
                refreshData={refreshData}
                t={t}
                language={language}
                now={now}
                instanceDate={instanceDate}
                isContextHighlight={isContextMatch}
                onOpenPomodoro={onOpenPomodoro}
              />
            );
          })}
        </div>
      )}

       {/* Debug Button Section */}
       <div className="flex justify-center pt-6 opacity-50 hover:opacity-100 transition-opacity">
          <button 
            onClick={handleGenerateDebugTrees}
            className="px-4 py-2 text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
             <i className="fas fa-bug"></i>
             {t.debugGenerate}
          </button>
       </div>
    </div>
  );
};