
import { TaskManager } from "../services/taskManager";
import { Task, RecurrenceFrequency } from "../types";

// --- TEST UTILITIES ---

// Colors for console output
const CLR = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`${CLR.red}❌ FAILED: ${message}${CLR.reset}`);
        throw new Error(message);
    } else {
        console.log(`${CLR.green}✓ PASSED:${CLR.reset} ${message}`);
    }
};

const assertEqual = (actual: any, expected: any, message: string) => {
    if (actual !== expected) {
        console.error(`${CLR.red}❌ FAILED: ${message} (Expected ${expected}, got ${actual})${CLR.reset}`);
        throw new Error(`${message} (Expected ${expected}, got ${actual})`);
    } else {
        console.log(`${CLR.green}✓ PASSED:${CLR.reset} ${message}`);
    }
};

// Helper to get a date object relative to today (at noon to avoid DST weirdness for day-checks)
const getDate = (dayOffset: number = 0, hour: number = 12, minute: number = 0) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
};

const getTimestamp = (dayOffset: number, hour: number = 12) => getDate(dayOffset, hour).getTime();

// --- TEST SUITE ---

export const runAutomatedTests = () => {
    console.clear();
    console.log(`${CLR.bold}${CLR.blue}🚀 STARTING DEEP SYSTEM DIAGNOSTICS${CLR.reset}`);
    
    // Instantiate a FRESH TaskManager for testing to avoid messing with real data in RAM
    // (Note: This still writes to localStorage, so we should mock storage or accept it affects dev data)
    const tm = new TaskManager(); 
    
    // Hack: Clear the task list of the test instance to ensure clean state
    (tm as any).tasks = []; 
    (tm as any).timeBlocks = [];

    let passedTests = 0;
    let totalTests = 0;

    const runTest = (name: string, fn: () => void) => {
        totalTests++;
        console.group(`${CLR.yellow}Test ${totalTests}: ${name}${CLR.reset}`);
        try {
            fn();
            passedTests++;
        } catch (e: any) {
            console.error(e.message);
        } finally {
            console.groupEnd();
        }
    };

    try {
        // ==========================================
        // 1. MULTI-DAY TASK CREATION
        // ==========================================
        runTest("Multi-day Task Creation", () => {
            const start = getDate(0, 10); // Today 10:00
            const durationMinutes = 2880; // 48 hours (2 days)
            
            const task = tm.createTask({
                title: "2 Day Event",
                scheduledTime: start.getTime(),
                timeEstimateMinutes: durationMinutes
            }, true);

            assertEqual(task.timeEstimateMinutes, 2880, "Duration preserved");
            
            // Check logic manually (simulating useCalendarLogic)
            const endTs = task.scheduledTime! + (task.timeEstimateMinutes! * 60000);
            const endDate = new Date(endTs);
            
            // Should end 2 days later at 10:00
            const expectedEnd = getDate(2, 10);
            assert(Math.abs(endDate.getTime() - expectedEnd.getTime()) < 1000, "Calculated end time is correct (+48h)");
        });

        // ==========================================
        // 2. OVERNIGHT SPILLOVER (Crossing Midnight)
        // ==========================================
        runTest("Overnight Task (Crossing Midnight)", () => {
            // Starts Today 23:00, Ends Tomorrow 02:00 (3 hours = 180 min)
            const start = getDate(0, 23, 0); 
            const duration = 180; 

            const task = tm.createTask({
                title: "Late Night Work",
                scheduledTime: start.getTime(),
                timeEstimateMinutes: duration
            }, true);

            const endTs = task.scheduledTime! + (duration * 60000);
            const endDate = new Date(endTs);
            
            assert(endDate.getDate() !== start.getDate(), "End date is on a different day");
            assertEqual(endDate.getHours(), 2, "End hour is 02:00");
        });

        // ==========================================
        // 3. RECURRENCE: BASIC GENERATION
        // ==========================================
        runTest("Basic Recurrence (Weekly)", () => {
            const today = new Date();
            const dayOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][today.getDay()];
            
            const task = tm.createTask({
                title: "Weekly Meeting",
                isRecurring: true,
                recurrencePattern: {
                    frequency: 'Weekly',
                    interval: 1,
                    daysOfWeek: [dayOfWeek],
                    endCondition: 'No end date'
                },
                scheduledTime: today.getTime()
            }, true);

            // Check overlap for today
            const isToday = tm.checkRecurrenceOverlap(task.recurrencePattern!, task.scheduledTime!, today.getTime());
            assert(isToday, "Overlaps with today");

            // Check overlap for next week
            const nextWeek = getDate(7);
            const isNextWeek = tm.checkRecurrenceOverlap(task.recurrencePattern!, task.scheduledTime!, nextWeek.getTime());
            assert(isNextWeek, "Overlaps with next week (+7 days)");

            // Check non-overlap for tomorrow
            const tomorrow = getDate(1);
            const isTomorrow = tm.checkRecurrenceOverlap(task.recurrencePattern!, task.scheduledTime!, tomorrow.getTime());
            assert(!isTomorrow, "Does NOT overlap with tomorrow");
        });

        // ==========================================
        // 4. RECURRENCE SPLITTING (HEAD-BODY-TAIL)
        // ==========================================
        runTest("Recurrence Split: 'This Event Only' (Middle)", () => {
            // Create Daily task for 5 days
            const startTs = getDate(0).getTime();
            const task = tm.createTask({
                title: "Daily Standup",
                isRecurring: true,
                recurrencePattern: {
                    frequency: 'Daily',
                    interval: 1,
                    endCondition: 'After X occurrences',
                    endCount: 5
                },
                scheduledTime: startTs
            }, true);

            // We want to edit the 3rd instance (Index 3, Day +2)
            const splitDate = getDate(2);
            
            // ACT: Split "This"
            tm.splitRecurringTask(task.id, splitDate, 'this', splitDate.getTime());

            // FETCH RESULTS
            const allTasks = tm.getAllTasksIncludingArchived();
            const versions = allTasks.filter(t => t.title === "Daily Standup");

            // ASSERTIONS
            // 1. HEAD: Should assume ID of original, Recurrence endCount should be 2 (Day 0, Day 1)
            const head = versions.find(t => t.id === task.id);
            assert(!!head, "Head task exists (original ID)");
            assertEqual(head?.recurrencePattern?.endCount, 2, "Head stops after 2 occurrences");

            // 2. BODY: Should be standalone, Scheduled for splitDate
            const body = versions.find(t => !t.isRecurring && t.scheduledTime === splitDate.getTime());
            assert(!!body, "Body task exists (Standalone on split date)");

            // 3. TAIL: Should be recurring, Start at Day +3, Count = 2 (Total 5 - 2 head - 1 body)
            // Note: splitRecurringTask logic calculates next instance.
            // Original Series: 0, 1, 2, 3, 4. 
            // Split at 2. 
            // Head: 0, 1.
            // Body: 2.
            // Tail: 3, 4. (Count 2).
            const tail = versions.find(t => t.isRecurring && t.id !== task.id);
            assert(!!tail, "Tail task exists (New ID)");
            assertEqual(tail?.recurrencePattern?.endCount, 2, "Tail has remaining 2 occurrences");
            
            // Check Tail Start Time (Should be Day +3)
            const expectedTailStart = getDate(3).getTime();
            // Allow minor ms diff
            assert(Math.abs(tail!.scheduledTime! - expectedTailStart) < 1000, "Tail starts on Day +3");
        });

        // ==========================================
        // 5. RECURRENCE MODIFICATION: "THIS AND FOLLOWING"
        // ==========================================
        runTest("Recurrence Update: 'This and Following'", () => {
            const startTs = getDate(0, 10).getTime(); // 10:00
            const task = tm.createTask({
                title: "Gym",
                isRecurring: true,
                recurrencePattern: { frequency: 'Daily', interval: 1, endCondition: 'No end date' },
                scheduledTime: startTs
            }, true);

            const splitDate = getDate(2, 14); // Day +2, changed to 14:00
            
            // ACT: Update Future
            tm.splitRecurringTask(task.id, splitDate, 'future', splitDate.getTime());

            // VERIFY
            const allTasks = tm.getAllTasksIncludingArchived().filter(t => t.title === "Gym");
            
            // 1. HEAD: Should end UNTIL specific date (yesterday of split)
            const head = allTasks.find(t => t.id === task.id);
            assertEqual(head?.recurrencePattern?.endCondition, 'Until specific date', "Head converted to 'Until Date'");
            
            // 2. TAIL: Should be new series starting at 14:00
            const tail = allTasks.find(t => t.id !== task.id);
            assert(!!tail, "New future series created");
            
            const tailDate = new Date(tail!.scheduledTime!);
            assertEqual(tailDate.getHours(), 14, "Future series has new time (14:00)");
        });

        // ==========================================
        // 6. DELETING A RECURRING INSTANCE
        // ==========================================
        runTest("Delete Single Instance of Recurrence", () => {
            const startTs = getDate(0).getTime();
            const task = tm.createTask({
                title: "Trash Run",
                isRecurring: true,
                recurrencePattern: { frequency: 'Daily', interval: 1, endCondition: 'After X occurrences', endCount: 5 },
                scheduledTime: startTs
            }, true);

            // Delete 3rd instance (Day +2)
            const instanceToDelete = getDate(2).getTime();
            
            tm.deleteRecurringTaskInstance(task.id, instanceToDelete, 'this');

            const allTasks = tm.getAllTasksIncludingArchived().filter(t => t.title === "Trash Run");
            
            // Expect: Head (count 2), Tail (count 2). No Body (because it was deleted).
            const head = allTasks.find(t => t.id === task.id);
            const tail = allTasks.find(t => t.id !== task.id);
            const body = allTasks.find(t => !t.isRecurring);

            assertEqual(head?.recurrencePattern?.endCount, 2, "Head truncated correctly");
            assert(!!tail, "Tail created correctly");
            assert(!body, "No body task exists (it was deleted)");
        });

        // ==========================================
        // 7. HABIT STATISTICS (Mock History)
        // ==========================================
        runTest("Habit Statistics Calculation", () => {
            const task = tm.createTask({
                title: "Drink Water",
                isRecurring: true,
                recurrencePattern: { 
                    frequency: 'Daily', 
                    interval: 1, 
                    endCondition: 'No end date',
                    // Simulate completion: Today, Yesterday, 2 days ago. Missed 3 days ago.
                    completedInstances: [
                        getDate(0).setHours(0,0,0,0),
                        getDate(-1).setHours(0,0,0,0),
                        getDate(-2).setHours(0,0,0,0)
                    ]
                },
                scheduledTime: getDate(-10).getTime() // Started 10 days ago
            }, true);

            // We need to verify that logic would calculate 75% for last 4 days (3 done, 1 missed)
            // Simulating the logic used in SummaryView or HabitReportModal
            let completed = 0;
            let total = 0;
            for(let i=0; i<4; i++) {
                const checkDate = getDate(-i).setHours(0,0,0,0);
                if (tm.checkRecurrenceOverlap(task.recurrencePattern!, task.scheduledTime!, checkDate)) {
                    total++;
                    if (task.recurrencePattern?.completedInstances?.includes(checkDate)) {
                        completed++;
                    }
                }
            }

            assertEqual(total, 4, "4 days checked");
            assertEqual(completed, 3, "3 days completed");
            assertEqual(completed/total, 0.75, "75% success rate");
        });

        // ==========================================
        // 8. HIERARCHY COUNTERS & MOVEMENT
        // ==========================================
        runTest("Hierarchy Counters on Reparenting", () => {
            const root1 = tm.createTask({ title: "Root 1" }, true);
            const root2 = tm.createTask({ title: "Root 2" }, true);
            const child = tm.createTask({ title: "Child", parentId: root1.id }, true);

            // Initial State
            assert(tm.getTask(root1.id)!.pendingChildrenCount === 1, "Root 1 has 1 pending");
            assert(tm.getTask(root2.id)!.pendingChildrenCount === 0, "Root 2 has 0 pending");

            // Move Child: Root1 -> Root2
            tm.moveTask(child.id, root2.id, true);

            // Verify
            assertEqual(tm.getTask(root1.id)!.pendingChildrenCount, 0, "Root 1 decremented to 0");
            assertEqual(tm.getTask(root2.id)!.pendingChildrenCount, 1, "Root 2 incremented to 1");
        });

        // ==========================================
        // 9. CYCLE DETECTION
        // ==========================================
        runTest("Cycle Prevention", () => {
            const A = tm.createTask({ title: "A" }, true);
            const B = tm.createTask({ title: "B", parentId: A.id }, true);
            const C = tm.createTask({ title: "C", parentId: B.id }, true);

            // Attempt to move A into C (A -> B -> C -> A) - ILLEGAL
            tm.moveTask(A.id, C.id, true);

            // Verify A's parent is still null
            const taskA = tm.getTask(A.id);
            assert(taskA?.parentId === null, "Cycle blocked: A did not move into C");
        });

        // ==========================================
        // 10. RECURRING TASK COMPLETION LOGIC
        // ==========================================
        runTest("Recurring Instance Completion", () => {
            const task = tm.createTask({
                title: "Daily Log",
                isRecurring: true,
                recurrencePattern: { frequency: 'Daily', interval: 1, endCondition: 'No end date' },
                scheduledTime: getDate(0).getTime()
            }, true);

            const todayInstance = getDate(0).setHours(0,0,0,0);
            
            // ACT: Toggle today
            tm.toggleTaskStatus(task.id, todayInstance);

            const updatedTask = tm.getTask(task.id);
            
            // Task status should remain "Not Started" (series is active)
            assert(updatedTask?.status === "Not Started", "Series status remains active");
            // Instance should be in completed array
            assert(updatedTask?.recurrencePattern?.completedInstances?.includes(todayInstance) || false, "Instance date added to completion list");
        });

        // ==========================================
        // 11. MOVING MULTI-DAY TASK
        // ==========================================
        runTest("Moving Multi-Day Task", () => {
            const start = getDate(0, 10);
            const task = tm.createTask({
                title: "Long Event",
                scheduledTime: start.getTime(),
                timeEstimateMinutes: 2880 // 48h
            }, true);

            const newStart = getDate(1, 12); // Move to Tomorrow 12:00
            
            tm.updateTask(task.id, { scheduledTime: newStart.getTime() }, {}, true);

            const updated = tm.getTask(task.id);
            assertEqual(updated?.scheduledTime, newStart.getTime(), "Start time updated");
            assertEqual(updated?.timeEstimateMinutes, 2880, "Duration preserved during move");
        });

        // ==========================================
        // 12. TIME BLOCK CRUD & OVERLAP
        // ==========================================
        runTest("Time Block CRUD", () => {
            const block = tm.addTimeBlock({
                title: "Focus Block",
                startTime: getDate(0, 14).getTime(),
                endTime: getDate(0, 16).getTime(),
                isRecurring: false
            }, true);

            assert(tm.getAllTimeBlocks().length === 1, "Block added");

            tm.updateTimeBlock(block.id, { title: "Deep Work" }, true);
            assert(tm.getAllTimeBlocks()[0].title === "Deep Work", "Block updated");

            tm.deleteTimeBlock(block.id);
            assert(tm.getAllTimeBlocks().length === 0, "Block deleted");
        });

        const successRate = Math.round((passedTests / totalTests) * 100);
        const color = successRate === 100 ? CLR.green : CLR.red;
        
        console.log(`\n${CLR.bold}🏁 DIAGNOSTICS COMPLETE${CLR.reset}`);
        console.log(`${color}Result: ${passedTests}/${totalTests} Passed (${successRate}%)${CLR.reset}`);
        
        if (successRate === 100) {
            alert(`✅ ALL ${totalTests} TESTS PASSED!\n\nSystem logic is verified.`);
        } else {
            alert(`❌ ${totalTests - passedTests} TESTS FAILED.\nCheck console for details.`);
        }

    } catch (globalError) {
        console.error("Critical Test Runner Error:", globalError);
    }
};
