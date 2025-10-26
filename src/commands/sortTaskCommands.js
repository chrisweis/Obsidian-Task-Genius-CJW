import { Notice } from "obsidian";
import { parseTaskLine } from "../utils/task/task-operations";
import { DEFAULT_SETTINGS, } from "../common/setting-definition";
import { t } from "../translations/helper";
// Task statuses (aligned with common usage and sorting needs)
export var SortableTaskStatus;
(function (SortableTaskStatus) {
    SortableTaskStatus["Overdue"] = "overdue";
    SortableTaskStatus["DueSoon"] = "due_soon";
    SortableTaskStatus["InProgress"] = "/";
    SortableTaskStatus["Incomplete"] = " ";
    SortableTaskStatus["Forwarded"] = ">";
    SortableTaskStatus["Question"] = "?";
    // Add other non-completed, non-cancelled statuses here
    SortableTaskStatus["Completed"] = "x";
    SortableTaskStatus["Cancelled"] = "-";
    // Add other terminal statuses here
})(SortableTaskStatus || (SortableTaskStatus = {}));
// Simple function to get indentation (tabs or spaces)
function getIndentationLevel(line) {
    const match = line.match(/^(\s*)/);
    if (!match)
        return 0;
    // Simple approach: count characters. Could refine to handle tabs vs spaces if necessary.
    return match[1].length;
}
// --- Refactored Task Parsing using taskUtil ---
export function parseTasksForSorting(blockText, lineOffset = 0, filePath, // Added filePath
format, // Added format
plugin // Added plugin for configurable prefix support
) {
    const lines = blockText.split("\n");
    const tasks = [];
    // taskMap uses the absolute line number as key
    const taskMap = {};
    let currentParentStack = [];
    lines.forEach((line, index) => {
        const lineNumber = lineOffset + index; // Calculate absolute line number (0-based)
        // Use the robust parser from taskUtil
        // Note: parseTaskLine expects 1-based line number for ID generation, pass lineNumber + 1
        const parsedTask = parseTaskLine(filePath, line, lineNumber + 1, format, plugin // Pass plugin for configurable prefix support
        ); // Pass 1-based line number
        if (parsedTask) {
            // We have a valid task line, now map it to SortableTask
            const indentation = getIndentationLevel(line);
            // --- Calculate Sortable Status ---
            let calculatedStatus = parsedTask.status;
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const todayTimestamp = now.getTime();
            if (!parsedTask.completed &&
                parsedTask.status !== SortableTaskStatus.Cancelled && // Compare against enum
                parsedTask.metadata.dueDate &&
                parsedTask.metadata.dueDate < todayTimestamp) {
                calculatedStatus = SortableTaskStatus.Overdue; // Use enum
            }
            else {
                // Ensure the original status maps to the enum if possible
                calculatedStatus = Object.values(SortableTaskStatus).includes(parsedTask.status)
                    ? parsedTask.status
                    : parsedTask.status;
            }
            // --- Create SortableTask ---
            const sortableTask = {
                // Map fields from parsedTask
                id: parsedTask.id,
                originalMarkdown: parsedTask.originalMarkdown,
                status: parsedTask.status,
                completed: parsedTask.completed,
                content: parsedTask.content,
                priority: parsedTask.metadata.priority,
                dueDate: parsedTask.metadata.dueDate,
                startDate: parsedTask.metadata.startDate,
                scheduledDate: parsedTask.metadata.scheduledDate,
                tags: parsedTask.metadata.tags || [],
                // Fields specific to SortableTask / required for sorting logic
                lineNumber: lineNumber,
                indentation: indentation,
                children: [],
                calculatedStatus: calculatedStatus,
                metadata: parsedTask.metadata,
                // parent will be set below
            };
            // --- Build Hierarchy ---
            taskMap[lineNumber] = sortableTask; // Use 0-based absolute line number
            // Find parent based on indentation
            while (currentParentStack.length > 0 &&
                indentation <= // Child must have greater indentation than parent
                    currentParentStack[currentParentStack.length - 1]
                        .indentation) {
                currentParentStack.pop();
            }
            if (currentParentStack.length > 0) {
                const parent = currentParentStack[currentParentStack.length - 1];
                parent.children.push(sortableTask);
                sortableTask.parent = parent;
            }
            else {
                tasks.push(sortableTask); // Add as top-level task within the block
            }
            currentParentStack.push(sortableTask); // Push current task onto stack
        }
        else {
            // Non-task line encountered
            // Keep the stack, assuming tasks under a non-task might still be related hierarchically.
        }
    });
    return tasks; // Return top-level tasks found within the block
}
// --- 3. Sorting Logic ---
// Generates the status order map based on plugin settings
function getDynamicStatusOrder(settings) {
    var _a, _b, _c, _d;
    const order = {};
    let currentOrder = 1;
    // --- High Priority Statuses ---
    // Always put Overdue first
    order[SortableTaskStatus.Overdue] = currentOrder++;
    // Optionally add DueSoon if defined and needed
    // order[SortableTaskStatus.DueSoon] = currentOrder++;
    // --- Statuses from Cycle ---
    const cycle = settings.taskStatusCycle || [];
    const marks = settings.taskStatusMarks || {};
    const exclude = settings.excludeMarksFromCycle || [];
    const completedMarkers = (((_a = settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x|X").split("|");
    const cancelledMarkers = (((_b = settings.taskStatuses) === null || _b === void 0 ? void 0 : _b.abandoned) || "-").split("|"); // Example: Use abandoned as cancelled
    const includedInCycle = [];
    const completedInCycle = [];
    const cancelledInCycle = [];
    // Iterate through the defined cycle
    for (const statusName of cycle) {
        const mark = marks[statusName];
        if (mark && !exclude.includes(statusName)) {
            // Check if this status is considered completed or cancelled
            if (completedMarkers.includes(mark)) {
                completedInCycle.push(mark);
            }
            else if (cancelledMarkers.includes(mark)) {
                cancelledInCycle.push(mark);
            }
            else {
                // Add other statuses in their cycle order
                if (!(mark in order)) {
                    // Avoid overwriting Overdue/DueSoon if their marks somehow appear
                    order[mark] = currentOrder++;
                }
                includedInCycle.push(mark);
            }
        }
    }
    // --- Add Completed and Cancelled Statuses (from cycle) at the end ---
    // Place completed statuses towards the end
    completedInCycle.forEach((mark) => {
        if (!(mark in order)) {
            order[mark] = 98; // Assign a high number for sorting towards the end
        }
    });
    // Place cancelled statuses last
    cancelledInCycle.forEach((mark) => {
        if (!(mark in order)) {
            order[mark] = 99; // Assign the highest number
        }
    });
    // --- Fallback for statuses defined in settings but not in the cycle ---
    // (This part might be complex depending on desired behavior for statuses outside the cycle)
    // Example: Add all defined marks from settings.taskStatuses if they aren't already in the order map.
    for (const statusType in settings.taskStatuses) {
        const markers = (settings.taskStatuses[statusType] || "").split("|");
        markers.forEach((mark) => {
            if (mark && !(mark in order)) {
                // Decide where to put these: maybe group them?
                // Simple approach: put them after cycle statuses but before completed/cancelled defaults
                if (completedMarkers.includes(mark)) {
                    order[mark] = 98;
                }
                else if (cancelledMarkers.includes(mark)) {
                    order[mark] = 99;
                }
                else {
                    order[mark] = currentOrder++; // Add after the main cycle items
                }
            }
        });
    }
    // Ensure default ' ' and 'x' have some order if not defined elsewhere
    if (!(" " in order))
        order[" "] = (_c = order[" "]) !== null && _c !== void 0 ? _c : 10; // Default incomplete reasonably high
    if (!("x" in order))
        order["x"] = (_d = order["x"]) !== null && _d !== void 0 ? _d : 98; // Default complete towards end
    return order;
}
// Compares two tasks based on the given criteria AND plugin settings
function compareTasks(taskA, taskB, criteria, statusOrder) {
    var _a, _b, _c, _d;
    // Helper to read field from top-level or metadata fallback
    const getField = (obj, field) => {
        if (obj == null)
            return undefined;
        const top = obj[field];
        if (top !== undefined && top !== null)
            return top;
        return obj.metadata ? obj.metadata[field] : undefined;
    };
    // Initialize Collator for text sorting optimization
    const sortCollator = new Intl.Collator(undefined, {
        usage: "sort",
        sensitivity: "base",
        numeric: true, // Intelligent number handling
    });
    // Create sort factory object
    const sortFactory = {
        status: (a, b, order) => {
            var _a, _b;
            // Status comparison logic (relies on statusOrder having numbers)
            // Use calculatedStatus first, otherwise use status
            const statusA = a.calculatedStatus || a.status || "";
            const statusB = b.calculatedStatus || b.status || "";
            const valA = (_a = statusOrder[statusA]) !== null && _a !== void 0 ? _a : 1000; // Assign a high number for unknown statuses
            const valB = (_b = statusOrder[statusB]) !== null && _b !== void 0 ? _b : 1000;
            if (typeof valA === "number" && typeof valB === "number") {
                const comparison = valA - valB; // Lower number means higher rank in status order
                return order === "asc" ? comparison : -comparison;
            }
            else {
                // Fallback if statusOrder contains non-numbers (shouldn't happen ideally)
                console.warn(`Non-numeric status order values detected: ${valA}, ${valB}`);
                return 0; // Treat as equal if non-numeric
            }
        },
        completed: (a, b, order) => {
            // Completed status comparison
            const aCompleted = !!a.completed;
            const bCompleted = !!b.completed;
            if (aCompleted === bCompleted) {
                return 0; // Both have same completion status
            }
            // For asc: incomplete tasks first (false < true)
            // For desc: completed tasks first (true > false)
            const comparison = aCompleted ? 1 : -1;
            return order === "asc" ? comparison : -comparison;
        },
        priority: (a, b, order) => {
            // Priority comparison: higher number means higher priority (1=Lowest, 5=Highest)
            const valA = getField(a, "priority");
            const valB = getField(b, "priority");
            const aHasPriority = valA !== undefined && valA !== null && valA > 0;
            const bHasPriority = valB !== undefined && valB !== null && valB > 0;
            // Handle null/empty values - empty values should always go to the end
            if (!aHasPriority && !bHasPriority) {
                return 0; // Both lack priority
            }
            else if (!aHasPriority) {
                // A lacks priority - no priority tasks go to the end
                return 1;
            }
            else if (!bHasPriority) {
                // B lacks priority - no priority tasks go to the end
                return -1;
            }
            else {
                // Both have numeric priorities - simple numeric comparison
                // For asc: 1, 2, 3, 4, 5 (Low to High)
                // For desc: 5, 4, 3, 2, 1 (High to Low)
                const comparison = valA - valB;
                return order === "asc" ? comparison : -comparison;
            }
        },
        dueDate: (a, b, order) => {
            return sortByDate("dueDate", a, b, order);
        },
        startDate: (a, b, order) => {
            return sortByDate("startDate", a, b, order);
        },
        scheduledDate: (a, b, order) => {
            return sortByDate("scheduledDate", a, b, order);
        },
        createdDate: (a, b, order) => {
            return sortByDate("createdDate", a, b, order);
        },
        completedDate: (a, b, order) => {
            return sortByDate("completedDate", a, b, order);
        },
        content: (a, b, order) => {
            var _a, _b;
            // Use Collator for smarter text comparison instead of simple localeCompare
            // First check if content exists
            const contentA = ((_a = a.content) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const contentB = ((_b = b.content) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            // Handle null/empty values - empty values should always go to the end
            if (!contentA && !contentB)
                return 0;
            if (!contentA)
                return 1; // A is empty, goes to end
            if (!contentB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(contentA, contentB);
            return order === "asc" ? comparison : -comparison;
        },
        tags: (a, b, order) => {
            // Sort by tags - convert array to string for comparison
            const tagsAVal = getField(a, "tags");
            const tagsBVal = getField(b, "tags");
            const tagsA = Array.isArray(tagsAVal) && tagsAVal.length > 0
                ? tagsAVal.join(", ")
                : null;
            const tagsB = Array.isArray(tagsBVal) && tagsBVal.length > 0
                ? tagsBVal.join(", ")
                : null;
            // Handle null/empty values - empty values should always go to the end
            if (!tagsA && !tagsB)
                return 0;
            if (!tagsA)
                return 1; // A is empty, goes to end
            if (!tagsB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(tagsA, tagsB);
            return order === "asc" ? comparison : -comparison;
        },
        project: (a, b, order) => {
            var _a, _b;
            const projectA = ((_a = getField(a, "project")) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const projectB = ((_b = getField(b, "project")) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            // Handle null/empty values - empty values should always go to the end
            if (!projectA && !projectB)
                return 0;
            if (!projectA)
                return 1; // A is empty, goes to end
            if (!projectB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(projectA, projectB);
            return order === "asc" ? comparison : -comparison;
        },
        context: (a, b, order) => {
            var _a, _b;
            const contextA = ((_a = getField(a, "context")) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const contextB = ((_b = getField(b, "context")) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            // Handle null/empty values - empty values should always go to the end
            if (!contextA && !contextB)
                return 0;
            if (!contextA)
                return 1; // A is empty, goes to end
            if (!contextB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(contextA, contextB);
            return order === "asc" ? comparison : -comparison;
        },
        recurrence: (a, b, order) => {
            var _a, _b;
            const recurrenceA = ((_a = getField(a, "recurrence")) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const recurrenceB = ((_b = getField(b, "recurrence")) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            // Handle null/empty values - empty values should always go to the end
            if (!recurrenceA && !recurrenceB)
                return 0;
            if (!recurrenceA)
                return 1; // A is empty, goes to end
            if (!recurrenceB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(recurrenceA, recurrenceB);
            return order === "asc" ? comparison : -comparison;
        },
        filePath: (a, b, order) => {
            var _a, _b;
            const filePathA = ((_a = a.filePath) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const filePathB = ((_b = b.filePath) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            // Handle null/empty values - empty values should always go to the end
            if (!filePathA && !filePathB)
                return 0;
            if (!filePathA)
                return 1; // A is empty, goes to end
            if (!filePathB)
                return -1; // B is empty, goes to end
            const comparison = sortCollator.compare(filePathA, filePathB);
            return order === "asc" ? comparison : -comparison;
        },
        lineNumber: (a, b, order) => {
            return (a.line || 0) - (b.line || 0);
        },
    };
    // Generic date sorting function
    function sortByDate(field, a, b, order) {
        const valA = getField(a, field);
        const valB = getField(b, field);
        const aHasDate = valA !== undefined && valA !== null;
        const bHasDate = valB !== undefined && valB !== null;
        let comparison = 0;
        if (!aHasDate && !bHasDate) {
            comparison = 0; // Both lack date
        }
        else if (!aHasDate) {
            // A lacks date. 'asc' means Dates->None. None is last (+1).
            comparison = 1;
        }
        else if (!bHasDate) {
            // B lacks date. 'asc' means Dates->None. None is last. B is last, so A is first (-1).
            comparison = -1;
        }
        else {
            // Both have numeric dates (timestamps)
            const dateA = valA;
            const dateB = valB;
            const now = Date.now();
            // Check if dates are overdue
            const aIsOverdue = dateA < now;
            const bIsOverdue = dateB < now;
            if (aIsOverdue && bIsOverdue) {
                // Both are overdue - for overdue dates, show most overdue first (oldest dates first)
                // So we want earlier dates to come first, regardless of asc/desc order
                comparison = dateA - dateB;
            }
            else if (aIsOverdue && !bIsOverdue) {
                // A is overdue, B is not - overdue tasks should come first
                comparison = -1;
            }
            else if (!aIsOverdue && bIsOverdue) {
                // B is overdue, A is not - overdue tasks should come first
                comparison = 1;
            }
            else {
                // Both are future dates - normal date comparison
                comparison = dateA - dateB;
            }
        }
        return order === "asc" ? comparison : -comparison;
    }
    // Use factory method for sorting
    for (const criterion of criteria) {
        if (criterion.field in sortFactory) {
            const sortMethod = sortFactory[criterion.field];
            const result = sortMethod(taskA, taskB, criterion.order);
            if (result !== 0) {
                return result;
            }
        }
    }
    // Maintain stable order with lowest priority tie-breakers: filePath -> line -> lineNumber -> id
    const filePathA = (_a = taskA.filePath) !== null && _a !== void 0 ? _a : "";
    const filePathB = (_b = taskB.filePath) !== null && _b !== void 0 ? _b : "";
    if (filePathA !== filePathB) {
        return filePathA.localeCompare(filePathB);
    }
    if (taskA.line !== undefined && taskB.line !== undefined) {
        return taskA.line - taskB.line;
    }
    else if (taskA.lineNumber !== undefined &&
        taskB.lineNumber !== undefined) {
        return taskA.lineNumber - taskB.lineNumber;
    }
    // Final fallback on id for deterministic order
    const idA = (_c = taskA.id) !== null && _c !== void 0 ? _c : "";
    const idB = (_d = taskB.id) !== null && _d !== void 0 ? _d : "";
    if (idA !== idB)
        return idA.localeCompare(idB);
    return 0;
}
// Find continuous task blocks (including subtasks)
export function findContinuousTaskBlocks(tasks) {
    if (tasks.length === 0)
        return [];
    // Sort by line number
    const sortedTasks = [...tasks].sort((a, b) => a.lineNumber - b.lineNumber);
    // Task blocks array
    const blocks = [];
    let currentBlock = [sortedTasks[0]];
    // Recursively find the maximum line number of a task and all its children
    function getMaxLineNumberWithChildren(task) {
        if (!task.children || task.children.length === 0)
            return task.lineNumber;
        let maxLine = task.lineNumber;
        for (const child of task.children) {
            const childMaxLine = getMaxLineNumberWithChildren(child);
            maxLine = Math.max(maxLine, childMaxLine);
        }
        return maxLine;
    }
    // Check all tasks, group into continuous blocks
    for (let i = 1; i < sortedTasks.length; i++) {
        const prevTask = sortedTasks[i - 1];
        const currentTask = sortedTasks[i];
        // Check the maximum line number of the previous task (including all subtasks)
        const prevMaxLine = getMaxLineNumberWithChildren(prevTask);
        // If the current task line number is the next line after the previous task or its subtasks, it belongs to the same block
        if (currentTask.lineNumber <= prevMaxLine + 1) {
            currentBlock.push(currentTask);
        }
        else {
            // Otherwise start a new block
            blocks.push([...currentBlock]);
            currentBlock = [currentTask];
        }
    }
    // Add the last block
    if (currentBlock.length > 0) {
        blocks.push(currentBlock);
    }
    return blocks;
}
// Generic sorting function that accepts any task object that matches the specific conditions
export function sortTasks(tasks, criteria, settings) {
    const statusOrder = getDynamicStatusOrder(settings);
    // Handle special case: if tasks are Task type, add calculatedStatus property to each task
    const preparedTasks = tasks.map((task) => {
        // If already has calculatedStatus, skip
        if (task.calculatedStatus)
            return task;
        // Otherwise, add calculatedStatus
        return Object.assign(Object.assign({}, task), { calculatedStatus: task.status || "" });
    });
    preparedTasks.sort((a, b) => compareTasks(a, b, criteria, statusOrder));
    return preparedTasks; // Type assertion back to original type
}
// Recursively sort tasks and their subtasks
function sortTasksRecursively(tasks, criteria, settings) {
    const statusOrder = getDynamicStatusOrder(settings);
    // Sort tasks at the current level
    tasks.sort((a, b) => compareTasks(a, b, criteria, statusOrder));
    // Recursively sort each task's subtasks
    for (const task of tasks) {
        if (task.children && task.children.length > 0) {
            // Ensure sorted subtasks are saved back to task.children
            task.children = sortTasksRecursively(task.children, criteria, settings);
        }
    }
    return tasks; // Return the sorted task array
}
// Main function: Parses, sorts, and generates Codemirror changes
export function sortTasksInDocument(view, plugin, fullDocument = false) {
    const app = plugin.app;
    const activeFile = app.workspace.getActiveFile(); // Assume command runs on active file
    if (!activeFile) {
        new Notice("Sort Tasks: No active file found.");
        return null;
    }
    const filePath = activeFile.path; // Get file path
    const cache = app.metadataCache.getFileCache(activeFile);
    if (!cache) {
        new Notice("Sort Tasks: Metadata cache not available.");
        return null;
    }
    const doc = view.state.doc;
    const settings = plugin.settings;
    const metadataFormat = settings.preferMetadataFormat;
    // --- Get sortCriteria from settings ---
    const sortCriteria = settings.sortCriteria || DEFAULT_SETTINGS.sortCriteria; // Get from settings, use default if missing
    if (!settings.sortTasks || !sortCriteria || sortCriteria.length === 0) {
        new Notice(t("Task sorting is disabled or no sort criteria are defined in settings."));
        return null; // Exit if sorting is disabled or no criteria
    }
    let startLine = 0;
    let endLine = doc.lines - 1;
    let scopeMessage = "full document"; // For logging
    if (!fullDocument) {
        const cursor = view.state.selection.main.head;
        const cursorLine = doc.lineAt(cursor).number - 1; // 0-based
        // Try to find scope based on cursor position (heading or document)
        const headings = cache.headings || [];
        let containingHeading = null;
        let nextHeadingLine = doc.lines; // Default to end of doc
        // Find the heading the cursor is currently in
        for (let i = headings.length - 1; i >= 0; i--) {
            if (headings[i].position.start.line <= cursorLine) {
                containingHeading = headings[i];
                startLine = containingHeading.position.start.line; // Start from heading line
                // Find the line number of the next heading at the same or lower level
                for (let j = i + 1; j < headings.length; j++) {
                    if (headings[j].level <= containingHeading.level) {
                        nextHeadingLine = headings[j].position.start.line;
                        break;
                    }
                }
                scopeMessage = `heading section "${containingHeading.heading}"`;
                break; // Found the containing heading
            }
        }
        // Set the endLine for the section
        if (containingHeading) {
            endLine = nextHeadingLine - 1; // End before the next heading
        }
        else {
            // Cursor is not under any heading, sort the whole document
            startLine = 0;
            endLine = doc.lines - 1;
            scopeMessage = "full document (cursor not in heading)";
        }
        // Ensure endLine is not less than startLine (e.g., empty heading section)
        if (endLine < startLine) {
            endLine = startLine;
        }
    }
    else {
        // fullDocument is true, range is already set (0 to doc.lines - 1)
        scopeMessage = "full document (forced)";
    }
    // Get the text content of the determined block
    const fromOffsetOriginal = doc.line(startLine + 1).from; // 1-based for doc.line
    const toOffsetOriginal = doc.line(endLine + 1).to;
    // Ensure offsets are valid
    if (fromOffsetOriginal > toOffsetOriginal) {
        new Notice(`Sort Tasks: Invalid range calculated for ${scopeMessage}.`);
        return null;
    }
    const originalBlockText = doc.sliceString(fromOffsetOriginal, toOffsetOriginal);
    // 1. Parse tasks *using the new function*, providing offset, path, and format
    const blockTasks = parseTasksForSorting(originalBlockText, startLine, filePath, metadataFormat, // Pass determined format
    plugin // Pass plugin for configurable prefix support
    );
    if (blockTasks.length === 0) {
        const noticeMsg = `Sort Tasks: No tasks found in the ${scopeMessage} (Lines ${startLine + 1}-${endLine + 1}) to sort.`;
        new Notice(noticeMsg);
        return null;
    }
    // Find continuous task blocks
    const taskBlocks = findContinuousTaskBlocks(blockTasks);
    // 2. Sort each continuous block separately
    for (let i = 0; i < taskBlocks.length; i++) {
        // Replace tasks in the original block with sorted tasks
        // Pass the criteria fetched from settings
        taskBlocks[i] = sortTasksRecursively(taskBlocks[i], sortCriteria, // Use criteria from settings
        settings);
    }
    // 3. Update the original blockTasks to reflect sorting results
    // Clear the original blockTasks
    blockTasks.length = 0;
    // Merge all sorted blocks back into blockTasks
    for (const block of taskBlocks) {
        for (const task of block) {
            blockTasks.push(task);
        }
    }
    // 4. Rebuild text directly from sorted blockTasks
    const originalBlockLines = originalBlockText.split("\n");
    let newBlockLines = [...originalBlockLines]; // Copy original lines
    const processedLineIndices = new Set(); // Track processed line indices
    // Find indices of all task lines
    const taskLineIndices = new Set();
    for (const task of blockTasks) {
        // Convert to index relative to block
        const relativeIndex = task.lineNumber - startLine;
        if (relativeIndex >= 0 && relativeIndex < originalBlockLines.length) {
            taskLineIndices.add(relativeIndex);
        }
    }
    // For each task block, find its starting position and sort tasks at that position
    for (const block of taskBlocks) {
        // Find the minimum line number (relative to block)
        let minRelativeLineIndex = Number.MAX_SAFE_INTEGER;
        for (const task of block) {
            const relativeIndex = task.lineNumber - startLine;
            if (relativeIndex >= 0 &&
                relativeIndex < originalBlockLines.length &&
                relativeIndex < minRelativeLineIndex) {
                minRelativeLineIndex = relativeIndex;
            }
        }
        if (minRelativeLineIndex === Number.MAX_SAFE_INTEGER) {
            continue; // Skip invalid blocks
        }
        // Collect all task line content in this block
        const blockContent = [];
        // Recursively add tasks and their subtasks
        function addSortedTaskContent(task) {
            blockContent.push(task.originalMarkdown);
            // Mark this line as processed
            const relativeIndex = task.lineNumber - startLine;
            if (relativeIndex >= 0 &&
                relativeIndex < originalBlockLines.length) {
                processedLineIndices.add(relativeIndex);
            }
            // Process subtasks
            if (task.children && task.children.length > 0) {
                for (const child of task.children) {
                    addSortedTaskContent(child);
                }
            }
        }
        // Only process top-level tasks
        for (const task of block) {
            if (!task.parent) {
                // Only process top-level tasks
                addSortedTaskContent(task);
            }
        }
        // Replace content at original position
        let currentLine = minRelativeLineIndex;
        for (const line of blockContent) {
            newBlockLines[currentLine++] = line;
        }
    }
    // Remove processed lines (replaced task lines)
    const finalLines = [];
    for (let i = 0; i < newBlockLines.length; i++) {
        if (!taskLineIndices.has(i) || processedLineIndices.has(i)) {
            finalLines.push(newBlockLines[i]);
        }
    }
    const newBlockText = finalLines.join("\n");
    // 5. Only return new text if the block actually changed
    if (originalBlockText === newBlockText) {
        const noticeMsg = `Sort Tasks: Tasks are already sorted in the ${scopeMessage} (Lines ${startLine + 1}-${endLine + 1}).`;
        new Notice(noticeMsg);
        return null;
    }
    const noticeMsg = `Sort Tasks: Sorted tasks in the ${scopeMessage} (Lines ${startLine + 1}-${endLine + 1}).`;
    new Notice(noticeMsg);
    // Directly return the changed text
    return newBlockText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydFRhc2tDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNvcnRUYXNrQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNsQyxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLCtCQUErQixDQUFDO0FBRzlFLE9BQU8sRUFHTixnQkFBZ0IsR0FDaEIsTUFBTSw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFM0MsOERBQThEO0FBQzlELE1BQU0sQ0FBTixJQUFZLGtCQVdYO0FBWEQsV0FBWSxrQkFBa0I7SUFDN0IseUNBQW1CLENBQUE7SUFDbkIsMENBQW9CLENBQUE7SUFDcEIsc0NBQWdCLENBQUE7SUFDaEIsc0NBQWdCLENBQUE7SUFDaEIscUNBQWUsQ0FBQTtJQUNmLG9DQUFjLENBQUE7SUFDZCx1REFBdUQ7SUFDdkQscUNBQWUsQ0FBQTtJQUNmLHFDQUFlLENBQUE7SUFDZixtQ0FBbUM7QUFDcEMsQ0FBQyxFQVhXLGtCQUFrQixLQUFsQixrQkFBa0IsUUFXN0I7QUFrQ0Qsc0RBQXNEO0FBQ3RELFNBQVMsbUJBQW1CLENBQUMsSUFBWTtJQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxDQUFDLENBQUM7SUFDckIseUZBQXlGO0lBQ3pGLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUN4QixDQUFDO0FBRUQsaURBQWlEO0FBQ2pELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsU0FBaUIsRUFDakIsYUFBcUIsQ0FBQyxFQUN0QixRQUFnQixFQUFFLGlCQUFpQjtBQUNuQyxNQUFzQixFQUFFLGVBQWU7QUFDdkMsTUFBOEIsQ0FBQywrQ0FBK0M7O0lBRTlFLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsTUFBTSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztJQUNqQywrQ0FBK0M7SUFDL0MsTUFBTSxPQUFPLEdBQTJDLEVBQUUsQ0FBQztJQUMzRCxJQUFJLGtCQUFrQixHQUFtQixFQUFFLENBQUM7SUFFNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUM3QixNQUFNLFVBQVUsR0FBRyxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsMkNBQTJDO1FBRWxGLHNDQUFzQztRQUN0Qyx5RkFBeUY7UUFDekYsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUMvQixRQUFRLEVBQ1IsSUFBSSxFQUNKLFVBQVUsR0FBRyxDQUFDLEVBQ2QsTUFBTSxFQUNOLE1BQU0sQ0FBQyw4Q0FBOEM7U0FDckQsQ0FBQyxDQUFDLDJCQUEyQjtRQUU5QixJQUFJLFVBQVUsRUFBRTtZQUNmLHdEQUF3RDtZQUN4RCxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU5QyxvQ0FBb0M7WUFDcEMsSUFBSSxnQkFBZ0IsR0FDbkIsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUNuQixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3ZCLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXJDLElBQ0MsQ0FBQyxVQUFVLENBQUMsU0FBUztnQkFDckIsVUFBVSxDQUFDLE1BQU0sS0FBSyxrQkFBa0IsQ0FBQyxTQUFTLElBQUksdUJBQXVCO2dCQUM3RSxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU87Z0JBQzNCLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLGNBQWMsRUFDM0M7Z0JBQ0QsZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVzthQUMxRDtpQkFBTTtnQkFDTiwwREFBMEQ7Z0JBQzFELGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRLENBQzVELFVBQVUsQ0FBQyxNQUE0QixDQUN2QztvQkFDQSxDQUFDLENBQUUsVUFBVSxDQUFDLE1BQTZCO29CQUMzQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzthQUNyQjtZQUVELDhCQUE4QjtZQUM5QixNQUFNLFlBQVksR0FBaUI7Z0JBQ2xDLDZCQUE2QjtnQkFDN0IsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFO2dCQUNqQixnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCO2dCQUM3QyxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU07Z0JBQ3pCLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDL0IsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO2dCQUMzQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRO2dCQUN0QyxPQUFPLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPO2dCQUNwQyxTQUFTLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTO2dCQUN4QyxhQUFhLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxhQUFhO2dCQUNoRCxJQUFJLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDcEMsK0RBQStEO2dCQUMvRCxVQUFVLEVBQUUsVUFBVTtnQkFDdEIsV0FBVyxFQUFFLFdBQVc7Z0JBQ3hCLFFBQVEsRUFBRSxFQUFFO2dCQUNaLGdCQUFnQixFQUFFLGdCQUFnQjtnQkFDbEMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO2dCQUM3QiwyQkFBMkI7YUFDM0IsQ0FBQztZQUVGLDBCQUEwQjtZQUMxQixPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsbUNBQW1DO1lBRXZFLG1DQUFtQztZQUNuQyxPQUNDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUM3QixXQUFXLElBQUksa0RBQWtEO29CQUNoRSxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3lCQUMvQyxXQUFXLEVBQ2I7Z0JBQ0Qsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDekI7WUFFRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU0sTUFBTSxHQUNYLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ25DLFlBQVksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO2FBQzdCO2lCQUFNO2dCQUNOLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyx5Q0FBeUM7YUFDbkU7WUFFRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQywrQkFBK0I7U0FDdEU7YUFBTTtZQUNOLDRCQUE0QjtZQUM1Qix5RkFBeUY7U0FDekY7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sS0FBSyxDQUFDLENBQUMsZ0RBQWdEO0FBQy9ELENBQUM7QUFFRCwyQkFBMkI7QUFFM0IsMERBQTBEO0FBQzFELFNBQVMscUJBQXFCLENBQUMsUUFBaUM7O0lBRy9ELE1BQU0sS0FBSyxHQUE4QixFQUFFLENBQUM7SUFDNUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBRXJCLGlDQUFpQztJQUNqQywyQkFBMkI7SUFDM0IsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQ25ELCtDQUErQztJQUMvQyxzREFBc0Q7SUFFdEQsOEJBQThCO0lBQzlCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO0lBQzdDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO0lBQzdDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7SUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUEsTUFBQSxRQUFRLENBQUMsWUFBWSwwQ0FBRSxTQUFTLEtBQUksS0FBSyxDQUFDLENBQUMsS0FBSyxDQUN6RSxHQUFHLENBQ0gsQ0FBQztJQUNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBLE1BQUEsUUFBUSxDQUFDLFlBQVksMENBQUUsU0FBUyxLQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FDdkUsR0FBRyxDQUNILENBQUMsQ0FBQyxzQ0FBc0M7SUFFekMsTUFBTSxlQUFlLEdBQWEsRUFBRSxDQUFDO0lBQ3JDLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0lBRXRDLG9DQUFvQztJQUNwQyxLQUFLLE1BQU0sVUFBVSxJQUFJLEtBQUssRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0IsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzFDLDREQUE0RDtZQUM1RCxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVCO2lCQUFNLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMzQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUI7aUJBQU07Z0JBQ04sMENBQTBDO2dCQUMxQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ3JCLGtFQUFrRTtvQkFDbEUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDO2lCQUM3QjtnQkFDRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNCO1NBQ0Q7S0FDRDtJQUVELHVFQUF1RTtJQUN2RSwyQ0FBMkM7SUFDM0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDakMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxtREFBbUQ7U0FDckU7SUFDRixDQUFDLENBQUMsQ0FBQztJQUNILGdDQUFnQztJQUNoQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNqQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QjtTQUM5QztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgseUVBQXlFO0lBQ3pFLDRGQUE0RjtJQUM1RixxR0FBcUc7SUFDckcsS0FBSyxNQUFNLFVBQVUsSUFBSSxRQUFRLENBQUMsWUFBWSxFQUFFO1FBQy9DLE1BQU0sT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3hCLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7Z0JBQzdCLCtDQUErQztnQkFDL0MseUZBQXlGO2dCQUN6RixJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDakI7cUJBQU0sSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzNDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7aUJBQ2pCO3FCQUFNO29CQUNOLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxDQUFDLGlDQUFpQztpQkFDL0Q7YUFDRDtRQUNGLENBQUMsQ0FBQyxDQUFDO0tBQ0g7SUFFRCxzRUFBc0U7SUFDdEUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQztRQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsbUNBQUksRUFBRSxDQUFDLENBQUMscUNBQXFDO0lBQ3pGLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUM7UUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLCtCQUErQjtJQUVuRixPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxxRUFBcUU7QUFDckUsU0FBUyxZQUFZLENBc0JwQixLQUFRLEVBQ1IsS0FBUSxFQUNSLFFBQXlCLEVBQ3pCLFdBQXNDOztJQUV0QywyREFBMkQ7SUFDM0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFRLEVBQUUsS0FBYSxFQUFFLEVBQUU7UUFDNUMsSUFBSSxHQUFHLElBQUksSUFBSTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksR0FBRyxLQUFLLElBQUk7WUFBRSxPQUFPLEdBQUcsQ0FBQztRQUNsRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUN2RCxDQUFDLENBQUM7SUFFRixvREFBb0Q7SUFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtRQUNqRCxLQUFLLEVBQUUsTUFBTTtRQUNiLFdBQVcsRUFBRSxNQUFNO1FBQ25CLE9BQU8sRUFBRSxJQUFJLEVBQUUsOEJBQThCO0tBQzdDLENBQUMsQ0FBQztJQUVILDZCQUE2QjtJQUM3QixNQUFNLFdBQVcsR0FBRztRQUNuQixNQUFNLEVBQUUsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEtBQXFCLEVBQUUsRUFBRTs7WUFDN0MsaUVBQWlFO1lBQ2pFLG1EQUFtRDtZQUNuRCxNQUFNLE9BQU8sR0FBSSxDQUFTLENBQUMsZ0JBQWdCLElBQUssQ0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7WUFDdkUsTUFBTSxPQUFPLEdBQUksQ0FBUyxDQUFDLGdCQUFnQixJQUFLLENBQVMsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO1lBRXZFLE1BQU0sSUFBSSxHQUFHLE1BQUEsV0FBVyxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxJQUFJLENBQUMsQ0FBQyw0Q0FBNEM7WUFDdkYsTUFBTSxJQUFJLEdBQUcsTUFBQSxXQUFXLENBQUMsT0FBTyxDQUFDLG1DQUFJLElBQUksQ0FBQztZQUUxQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7Z0JBQ3pELE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxpREFBaUQ7Z0JBQ2pGLE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQzthQUNsRDtpQkFBTTtnQkFDTiwwRUFBMEU7Z0JBQzFFLE9BQU8sQ0FBQyxJQUFJLENBQ1gsNkNBQTZDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FDNUQsQ0FBQztnQkFDRixPQUFPLENBQUMsQ0FBQyxDQUFDLGdDQUFnQzthQUMxQztRQUNGLENBQUM7UUFFRCxTQUFTLEVBQUUsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEtBQXFCLEVBQUUsRUFBRTtZQUNoRCw4QkFBOEI7WUFDOUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFFLENBQVMsQ0FBQyxTQUFTLENBQUM7WUFDMUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFFLENBQVMsQ0FBQyxTQUFTLENBQUM7WUFFMUMsSUFBSSxVQUFVLEtBQUssVUFBVSxFQUFFO2dCQUM5QixPQUFPLENBQUMsQ0FBQyxDQUFDLG1DQUFtQzthQUM3QztZQUVELGlEQUFpRDtZQUNqRCxpREFBaUQ7WUFDakQsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNuRCxDQUFDO1FBRUQsUUFBUSxFQUFFLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxLQUFxQixFQUFFLEVBQUU7WUFDL0MsaUZBQWlGO1lBQ2pGLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDckMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNyQyxNQUFNLFlBQVksR0FBRyxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztZQUNyRSxNQUFNLFlBQVksR0FBRyxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztZQUVyRSxzRUFBc0U7WUFDdEUsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDbkMsT0FBTyxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7YUFDL0I7aUJBQU0sSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDekIscURBQXFEO2dCQUNyRCxPQUFPLENBQUMsQ0FBQzthQUNUO2lCQUFNLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQ3pCLHFEQUFxRDtnQkFDckQsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNWO2lCQUFNO2dCQUNOLDJEQUEyRDtnQkFDM0QsdUNBQXVDO2dCQUN2Qyx3Q0FBd0M7Z0JBQ3hDLE1BQU0sVUFBVSxHQUFJLElBQWUsR0FBSSxJQUFlLENBQUM7Z0JBQ3ZELE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQzthQUNsRDtRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEtBQXFCLEVBQUUsRUFBRTtZQUM5QyxPQUFPLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsU0FBUyxFQUFFLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxLQUFxQixFQUFFLEVBQUU7WUFDaEQsT0FBTyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELGFBQWEsRUFBRSxDQUFDLENBQUksRUFBRSxDQUFJLEVBQUUsS0FBcUIsRUFBRSxFQUFFO1lBQ3BELE9BQU8sVUFBVSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCxXQUFXLEVBQUUsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEtBQXFCLEVBQUUsRUFBRTtZQUNsRCxPQUFPLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsYUFBYSxFQUFFLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxLQUFxQixFQUFFLEVBQUU7WUFDcEQsT0FBTyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDLENBQUksRUFBRSxDQUFJLEVBQUUsS0FBcUIsRUFBRSxFQUFFOztZQUM5QywyRUFBMkU7WUFDM0UsZ0NBQWdDO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLENBQUEsTUFBQyxDQUFTLENBQUMsT0FBTywwQ0FBRSxJQUFJLEVBQUUsS0FBSSxJQUFJLENBQUM7WUFDcEQsTUFBTSxRQUFRLEdBQUcsQ0FBQSxNQUFDLENBQVMsQ0FBQyxPQUFPLDBDQUFFLElBQUksRUFBRSxLQUFJLElBQUksQ0FBQztZQUVwRCxzRUFBc0U7WUFDdEUsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFDbkQsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUVwRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1RCxPQUFPLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksRUFBRSxDQUFDLENBQUksRUFBRSxDQUFJLEVBQUUsS0FBcUIsRUFBRSxFQUFFO1lBQzNDLHdEQUF3RDtZQUN4RCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDckMsTUFBTSxLQUFLLEdBQ1YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQzdDLENBQUMsQ0FBRSxRQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDVCxNQUFNLEtBQUssR0FDVixLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDN0MsQ0FBQyxDQUFFLFFBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUVULHNFQUFzRTtZQUN0RSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSztnQkFBRSxPQUFPLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsS0FBSztnQkFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUNoRCxJQUFJLENBQUMsS0FBSztnQkFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1lBRWpELE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RELE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNuRCxDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxLQUFxQixFQUFFLEVBQUU7O1lBQzlDLE1BQU0sUUFBUSxHQUFHLENBQUEsTUFBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBd0IsMENBQzVELElBQUksRUFBRSxLQUFJLElBQUksQ0FBQztZQUNsQixNQUFNLFFBQVEsR0FBRyxDQUFBLE1BQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQXdCLDBDQUM1RCxJQUFJLEVBQUUsS0FBSSxJQUFJLENBQUM7WUFFbEIsc0VBQXNFO1lBQ3RFLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1lBQ25ELElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFFcEQsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUQsT0FBTyxLQUFLLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQ25ELENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEtBQXFCLEVBQUUsRUFBRTs7WUFDOUMsTUFBTSxRQUFRLEdBQUcsQ0FBQSxNQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUF3QiwwQ0FDNUQsSUFBSSxFQUFFLEtBQUksSUFBSSxDQUFDO1lBQ2xCLE1BQU0sUUFBUSxHQUFHLENBQUEsTUFBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBd0IsMENBQzVELElBQUksRUFBRSxLQUFJLElBQUksQ0FBQztZQUVsQixzRUFBc0U7WUFDdEUsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFDbkQsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUVwRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1RCxPQUFPLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDbkQsQ0FBQztRQUVELFVBQVUsRUFBRSxDQUFDLENBQUksRUFBRSxDQUFJLEVBQUUsS0FBcUIsRUFBRSxFQUFFOztZQUNqRCxNQUFNLFdBQVcsR0FBRyxDQUFBLE1BQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQXdCLDBDQUNsRSxJQUFJLEVBQUUsS0FBSSxJQUFJLENBQUM7WUFDbEIsTUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUF3QiwwQ0FDbEUsSUFBSSxFQUFFLEtBQUksSUFBSSxDQUFDO1lBRWxCLHNFQUFzRTtZQUN0RSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUN0RCxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1lBRXZELE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNuRCxDQUFDO1FBRUQsUUFBUSxFQUFFLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxLQUFxQixFQUFFLEVBQUU7O1lBQy9DLE1BQU0sU0FBUyxHQUFHLENBQUEsTUFBQyxDQUFTLENBQUMsUUFBUSwwQ0FBRSxJQUFJLEVBQUUsS0FBSSxJQUFJLENBQUM7WUFDdEQsTUFBTSxTQUFTLEdBQUcsQ0FBQSxNQUFDLENBQVMsQ0FBQyxRQUFRLDBDQUFFLElBQUksRUFBRSxLQUFJLElBQUksQ0FBQztZQUV0RCxzRUFBc0U7WUFDdEUsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsT0FBTyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFDcEQsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUVyRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM5RCxPQUFPLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDbkQsQ0FBQztRQUVELFVBQVUsRUFBRSxDQUFDLENBQUksRUFBRSxDQUFJLEVBQUUsS0FBcUIsRUFBRSxFQUFFO1lBQ2pELE9BQU8sQ0FBRSxDQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUUsQ0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN4RCxDQUFDO0tBQ0QsQ0FBQztJQUVGLGdDQUFnQztJQUNoQyxTQUFTLFVBQVUsQ0FDbEIsS0FLa0IsRUFDbEIsQ0FBSSxFQUNKLENBQUksRUFDSixLQUFxQjtRQUVyQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDO1FBQ3JELE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQztRQUVyRCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUMzQixVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1NBQ2pDO2FBQU0sSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNyQiw0REFBNEQ7WUFDNUQsVUFBVSxHQUFHLENBQUMsQ0FBQztTQUNmO2FBQU0sSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNyQixzRkFBc0Y7WUFDdEYsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO2FBQU07WUFDTix1Q0FBdUM7WUFDdkMsTUFBTSxLQUFLLEdBQUcsSUFBYyxDQUFDO1lBQzdCLE1BQU0sS0FBSyxHQUFHLElBQWMsQ0FBQztZQUM3QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFdkIsNkJBQTZCO1lBQzdCLE1BQU0sVUFBVSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7WUFDL0IsTUFBTSxVQUFVLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztZQUUvQixJQUFJLFVBQVUsSUFBSSxVQUFVLEVBQUU7Z0JBQzdCLHFGQUFxRjtnQkFDckYsdUVBQXVFO2dCQUN2RSxVQUFVLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQzthQUMzQjtpQkFBTSxJQUFJLFVBQVUsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDckMsMkRBQTJEO2dCQUMzRCxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDaEI7aUJBQU0sSUFBSSxDQUFDLFVBQVUsSUFBSSxVQUFVLEVBQUU7Z0JBQ3JDLDJEQUEyRDtnQkFDM0QsVUFBVSxHQUFHLENBQUMsQ0FBQzthQUNmO2lCQUFNO2dCQUNOLGlEQUFpRDtnQkFDakQsVUFBVSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7YUFDM0I7U0FDRDtRQUVELE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUNuRCxDQUFDO0lBRUQsaUNBQWlDO0lBQ2pDLEtBQUssTUFBTSxTQUFTLElBQUksUUFBUSxFQUFFO1FBQ2pDLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxXQUFXLEVBQUU7WUFDbkMsTUFBTSxVQUFVLEdBQ2YsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFpQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDakIsT0FBTyxNQUFNLENBQUM7YUFDZDtTQUNEO0tBQ0Q7SUFFRCxnR0FBZ0c7SUFDaEcsTUFBTSxTQUFTLEdBQUcsTUFBQyxLQUFhLENBQUMsUUFBUSxtQ0FBSSxFQUFFLENBQUM7SUFDaEQsTUFBTSxTQUFTLEdBQUcsTUFBQyxLQUFhLENBQUMsUUFBUSxtQ0FBSSxFQUFFLENBQUM7SUFDaEQsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQzVCLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUMxQztJQUNELElBQUssS0FBYSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUssS0FBYSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDM0UsT0FBUyxLQUFhLENBQUMsSUFBZSxHQUFLLEtBQWEsQ0FBQyxJQUFlLENBQUM7S0FDekU7U0FBTSxJQUNMLEtBQWEsQ0FBQyxVQUFVLEtBQUssU0FBUztRQUN0QyxLQUFhLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFDdEM7UUFDRCxPQUFTLEtBQWEsQ0FBQyxVQUFxQixHQUFLLEtBQWEsQ0FBQyxVQUFxQixDQUFDO0tBQ3JGO0lBQ0QsK0NBQStDO0lBQy9DLE1BQU0sR0FBRyxHQUFHLE1BQUMsS0FBYSxDQUFDLEVBQUUsbUNBQUksRUFBRSxDQUFDO0lBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQUMsS0FBYSxDQUFDLEVBQUUsbUNBQUksRUFBRSxDQUFDO0lBQ3BDLElBQUksR0FBRyxLQUFLLEdBQUc7UUFBRSxPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsT0FBTyxDQUFDLENBQUM7QUFDVixDQUFDO0FBRUQsbURBQW1EO0FBQ25ELE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsS0FBcUI7SUFFckIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLEVBQUUsQ0FBQztJQUVsQyxzQkFBc0I7SUFDdEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRTNFLG9CQUFvQjtJQUNwQixNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFDO0lBQ3BDLElBQUksWUFBWSxHQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBELDBFQUEwRTtJQUMxRSxTQUFTLDRCQUE0QixDQUFDLElBQWtCO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDL0MsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXhCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDOUIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pELE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMxQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxnREFBZ0Q7SUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDNUMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkMsOEVBQThFO1FBQzlFLE1BQU0sV0FBVyxHQUFHLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNELHlIQUF5SDtRQUN6SCxJQUFJLFdBQVcsQ0FBQyxVQUFVLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRTtZQUM5QyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQy9CO2FBQU07WUFDTiw4QkFBOEI7WUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUMvQixZQUFZLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUM3QjtLQUNEO0lBRUQscUJBQXFCO0lBQ3JCLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUMxQjtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVELDZGQUE2RjtBQUM3RixNQUFNLFVBQVUsU0FBUyxDQXFCeEIsS0FBVSxFQUNWLFFBQXlCLEVBQ3pCLFFBQWlDO0lBRWpDLE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBELDBGQUEwRjtJQUMxRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDeEMsd0NBQXdDO1FBQ3hDLElBQUksSUFBSSxDQUFDLGdCQUFnQjtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRXZDLGtDQUFrQztRQUNsQyx1Q0FDSSxJQUFJLEtBQ1AsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLElBQ2xDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFFeEUsT0FBTyxhQUFvQixDQUFDLENBQUMsdUNBQXVDO0FBQ3JFLENBQUM7QUFFRCw0Q0FBNEM7QUFDNUMsU0FBUyxvQkFBb0IsQ0FDNUIsS0FBcUIsRUFDckIsUUFBeUIsRUFDekIsUUFBaUM7SUFFakMsTUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQsa0NBQWtDO0lBQ2xDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUVoRSx3Q0FBd0M7SUFDeEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDekIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5Qyx5REFBeUQ7WUFDekQsSUFBSSxDQUFDLFFBQVEsR0FBRyxvQkFBb0IsQ0FDbkMsSUFBSSxDQUFDLFFBQVEsRUFDYixRQUFRLEVBQ1IsUUFBUSxDQUNSLENBQUM7U0FDRjtLQUNEO0lBRUQsT0FBTyxLQUFLLENBQUMsQ0FBQywrQkFBK0I7QUFDOUMsQ0FBQztBQUVELGlFQUFpRTtBQUNqRSxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLElBQWdCLEVBQ2hCLE1BQTZCLEVBQzdCLGVBQXdCLEtBQUs7SUFFN0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUN2QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMscUNBQXFDO0lBQ3ZGLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDaEIsSUFBSSxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNoRCxPQUFPLElBQUksQ0FBQztLQUNaO0lBQ0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQjtJQUNsRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN6RCxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1gsSUFBSSxNQUFNLENBQUMsMkNBQTJDLENBQUMsQ0FBQztRQUN4RCxPQUFPLElBQUksQ0FBQztLQUNaO0lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDM0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBbUIsUUFBUSxDQUFDLG9CQUFvQixDQUFDO0lBRXJFLHlDQUF5QztJQUN6QyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsWUFBWSxJQUFJLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLDRDQUE0QztJQUN6SCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsSUFBSSxDQUFDLFlBQVksSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN0RSxJQUFJLE1BQU0sQ0FDVCxDQUFDLENBQ0EsdUVBQXVFLENBQ3ZFLENBQ0QsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLENBQUMsNkNBQTZDO0tBQzFEO0lBRUQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLElBQUksWUFBWSxHQUFHLGVBQWUsQ0FBQyxDQUFDLGNBQWM7SUFFbEQsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNsQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzlDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVU7UUFFNUQsbUVBQW1FO1FBQ25FLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ3RDLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksZUFBZSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyx3QkFBd0I7UUFFekQsOENBQThDO1FBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxVQUFVLEVBQUU7Z0JBQ2xELGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsU0FBUyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsMEJBQTBCO2dCQUU3RSxzRUFBc0U7Z0JBQ3RFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDN0MsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRTt3QkFDakQsZUFBZSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDbEQsTUFBTTtxQkFDTjtpQkFDRDtnQkFDRCxZQUFZLEdBQUcsb0JBQW9CLGlCQUFpQixDQUFDLE9BQU8sR0FBRyxDQUFDO2dCQUNoRSxNQUFNLENBQUMsK0JBQStCO2FBQ3RDO1NBQ0Q7UUFFRCxrQ0FBa0M7UUFDbEMsSUFBSSxpQkFBaUIsRUFBRTtZQUN0QixPQUFPLEdBQUcsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtTQUM3RDthQUFNO1lBQ04sMkRBQTJEO1lBQzNELFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDZCxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDeEIsWUFBWSxHQUFHLHVDQUF1QyxDQUFDO1NBQ3ZEO1FBRUQsMEVBQTBFO1FBQzFFLElBQUksT0FBTyxHQUFHLFNBQVMsRUFBRTtZQUN4QixPQUFPLEdBQUcsU0FBUyxDQUFDO1NBQ3BCO0tBQ0Q7U0FBTTtRQUNOLGtFQUFrRTtRQUNsRSxZQUFZLEdBQUcsd0JBQXdCLENBQUM7S0FDeEM7SUFFRCwrQ0FBK0M7SUFDL0MsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyx1QkFBdUI7SUFDaEYsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbEQsMkJBQTJCO0lBQzNCLElBQUksa0JBQWtCLEdBQUcsZ0JBQWdCLEVBQUU7UUFDMUMsSUFBSSxNQUFNLENBQUMsNENBQTRDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDeEUsT0FBTyxJQUFJLENBQUM7S0FDWjtJQUNELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FDeEMsa0JBQWtCLEVBQ2xCLGdCQUFnQixDQUNoQixDQUFDO0lBRUYsOEVBQThFO0lBQzlFLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUN0QyxpQkFBaUIsRUFDakIsU0FBUyxFQUNULFFBQVEsRUFDUixjQUFjLEVBQUUseUJBQXlCO0lBQ3pDLE1BQU0sQ0FBQyw4Q0FBOEM7S0FDckQsQ0FBQztJQUNGLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDNUIsTUFBTSxTQUFTLEdBQUcscUNBQXFDLFlBQVksV0FDbEUsU0FBUyxHQUFHLENBQ2IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxZQUFZLENBQUM7UUFDNUIsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUM7S0FDWjtJQUVELDhCQUE4QjtJQUM5QixNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUV4RCwyQ0FBMkM7SUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDM0Msd0RBQXdEO1FBQ3hELDBDQUEwQztRQUMxQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsb0JBQW9CLENBQ25DLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFDYixZQUFZLEVBQUUsNkJBQTZCO1FBQzNDLFFBQVEsQ0FDUixDQUFDO0tBQ0Y7SUFFRCwrREFBK0Q7SUFDL0QsZ0NBQWdDO0lBQ2hDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBRXRCLCtDQUErQztJQUMvQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFVBQVUsRUFBRTtRQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN6QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RCO0tBQ0Q7SUFFRCxrREFBa0Q7SUFDbEQsTUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekQsSUFBSSxhQUFhLEdBQWEsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxzQkFBc0I7SUFDN0UsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDLENBQUMsK0JBQStCO0lBRS9FLGlDQUFpQztJQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxFQUFFO1FBQzlCLHFDQUFxQztRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUNsRCxJQUFJLGFBQWEsSUFBSSxDQUFDLElBQUksYUFBYSxHQUFHLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtZQUNwRSxlQUFlLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ25DO0tBQ0Q7SUFFRCxrRkFBa0Y7SUFDbEYsS0FBSyxNQUFNLEtBQUssSUFBSSxVQUFVLEVBQUU7UUFDL0IsbURBQW1EO1FBQ25ELElBQUksb0JBQW9CLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ25ELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3pCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ2xELElBQ0MsYUFBYSxJQUFJLENBQUM7Z0JBQ2xCLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNO2dCQUN6QyxhQUFhLEdBQUcsb0JBQW9CLEVBQ25DO2dCQUNELG9CQUFvQixHQUFHLGFBQWEsQ0FBQzthQUNyQztTQUNEO1FBRUQsSUFBSSxvQkFBb0IsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7WUFDckQsU0FBUyxDQUFDLHNCQUFzQjtTQUNoQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7UUFFbEMsMkNBQTJDO1FBQzNDLFNBQVMsb0JBQW9CLENBQUMsSUFBa0I7WUFDL0MsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUV6Qyw4QkFBOEI7WUFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDbEQsSUFDQyxhQUFhLElBQUksQ0FBQztnQkFDbEIsYUFBYSxHQUFHLGtCQUFrQixDQUFDLE1BQU0sRUFDeEM7Z0JBQ0Qsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQ3hDO1lBRUQsbUJBQW1CO1lBQ25CLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzlDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtvQkFDbEMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzVCO2FBQ0Q7UUFDRixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNqQiwrQkFBK0I7Z0JBQy9CLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNCO1NBQ0Q7UUFFRCx1Q0FBdUM7UUFDdkMsSUFBSSxXQUFXLEdBQUcsb0JBQW9CLENBQUM7UUFDdkMsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLEVBQUU7WUFDaEMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO1NBQ3BDO0tBQ0Q7SUFFRCwrQ0FBK0M7SUFDL0MsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO0lBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzRCxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xDO0tBQ0Q7SUFFRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTNDLHdEQUF3RDtJQUN4RCxJQUFJLGlCQUFpQixLQUFLLFlBQVksRUFBRTtRQUN2QyxNQUFNLFNBQVMsR0FBRywrQ0FBK0MsWUFBWSxXQUM1RSxTQUFTLEdBQUcsQ0FDYixJQUFJLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNwQixJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QixPQUFPLElBQUksQ0FBQztLQUNaO0lBRUQsTUFBTSxTQUFTLEdBQUcsbUNBQW1DLFlBQVksV0FDaEUsU0FBUyxHQUFHLENBQ2IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDcEIsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFdEIsbUNBQW1DO0lBQ25DLE9BQU8sWUFBWSxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHBhcnNlVGFza0xpbmUsIE1ldGFkYXRhRm9ybWF0IH0gZnJvbSBcIi4uL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IFRhc2sgYXMgSW5kZXhlclRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLFxyXG5cdFNvcnRDcml0ZXJpb24sXHJcblx0REVGQVVMVF9TRVRUSU5HUyxcclxufSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIi4uL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8vIFRhc2sgc3RhdHVzZXMgKGFsaWduZWQgd2l0aCBjb21tb24gdXNhZ2UgYW5kIHNvcnRpbmcgbmVlZHMpXHJcbmV4cG9ydCBlbnVtIFNvcnRhYmxlVGFza1N0YXR1cyB7XHJcblx0T3ZlcmR1ZSA9IFwib3ZlcmR1ZVwiLCAvLyBDYWxjdWxhdGVkLCBub3QgYSByYXcgc3RhdHVzXHJcblx0RHVlU29vbiA9IFwiZHVlX3Nvb25cIiwgLy8gQ2FsY3VsYXRlZCwgbm90IGEgcmF3IHN0YXR1cyAtIFBsYWNlaG9sZGVyXHJcblx0SW5Qcm9ncmVzcyA9IFwiL1wiLFxyXG5cdEluY29tcGxldGUgPSBcIiBcIixcclxuXHRGb3J3YXJkZWQgPSBcIj5cIixcclxuXHRRdWVzdGlvbiA9IFwiP1wiLFxyXG5cdC8vIEFkZCBvdGhlciBub24tY29tcGxldGVkLCBub24tY2FuY2VsbGVkIHN0YXR1c2VzIGhlcmVcclxuXHRDb21wbGV0ZWQgPSBcInhcIixcclxuXHRDYW5jZWxsZWQgPSBcIi1cIixcclxuXHQvLyBBZGQgb3RoZXIgdGVybWluYWwgc3RhdHVzZXMgaGVyZVxyXG59XHJcblxyXG4vLyBJbnRlcmZhY2UgZm9yIHRhc2tzIHVzZWQgd2l0aGluIHRoZSBzb3J0aW5nIGNvbW1hbmQsIGNsb3NlbHkgbWF0Y2hpbmcgSW5kZXhlclRhc2tcclxuLy8gV2UgYWRkIGNhbGN1bGF0ZWQgZmllbGRzIG5lZWRlZCBmb3Igc29ydGluZ1xyXG5leHBvcnQgaW50ZXJmYWNlIFNvcnRhYmxlVGFza1xyXG5cdGV4dGVuZHMgT21pdDxcclxuXHRcdEluZGV4ZXJUYXNrLFxyXG5cdFx0XCJpZFwiIHwgXCJjaGlsZHJlblwiIHwgXCJwYXJlbnRcIiB8IFwiZmlsZVBhdGhcIiB8IFwibGluZVwiXHJcblx0PiB7XHJcblx0aWQ6IHN0cmluZzsgLy8gVXNlIGdlbmVyYXRlZCBJRCBsaWtlIGxpbmUtJHtsaW5lTnVtYmVyfSBvciBrZWVwIHBhcnNlZCBvbmU/IExldCdzIGtlZXAgcGFyc2VkIG9uZS5cclxuXHRsaW5lTnVtYmVyOiBudW1iZXI7IC8vIDAtYmFzZWQsIHJlbGF0aXZlIHRvIGRvY3VtZW50IHN0YXJ0XHJcblx0aW5kZW50YXRpb246IG51bWJlcjtcclxuXHRjaGlsZHJlbjogU29ydGFibGVUYXNrW107XHJcblx0cGFyZW50PzogU29ydGFibGVUYXNrO1xyXG5cdGNhbGN1bGF0ZWRTdGF0dXM6IFNvcnRhYmxlVGFza1N0YXR1cyB8IHN0cmluZzsgLy8gU3RhdHVzIHVzZWQgZm9yIHNvcnRpbmdcclxuXHQvLyBGaWVsZHMgbWFwcGVkIGZyb20gcGFyc2VkIFRhc2tcclxuXHRvcmlnaW5hbE1hcmtkb3duOiBzdHJpbmc7XHJcblx0c3RhdHVzOiBzdHJpbmc7XHJcblx0Y29tcGxldGVkOiBib29sZWFuO1xyXG5cdGNvbnRlbnQ6IHN0cmluZztcclxuXHRwcmlvcml0eT86IG51bWJlcjtcclxuXHRkdWVEYXRlPzogbnVtYmVyO1xyXG5cdHN0YXJ0RGF0ZT86IG51bWJlcjtcclxuXHRzY2hlZHVsZWREYXRlPzogbnVtYmVyO1xyXG5cdHRhZ3M6IHN0cmluZ1tdOyAvLyBDaGFuZ2VkIGZyb20gdGFncz8gdG8gdGFncyB0byBtYXRjaCBiYXNlIFRhc2sgaW50ZXJmYWNlXHJcblx0Ly8gQWRkIGFueSBvdGhlciBmaWVsZHMgZnJvbSBJbmRleGVyVGFzayBpZiBuZWVkZWQgYnkgc29ydGluZyBjcml0ZXJpYVxyXG5cdC8vIGNyZWF0ZWREYXRlPzogbnVtYmVyO1xyXG5cdC8vIGNvbXBsZXRlZERhdGU/OiBudW1iZXI7XHJcblx0Ly8gcmVjdXJyZW5jZT86IHN0cmluZztcclxuXHQvLyBwcm9qZWN0Pzogc3RyaW5nO1xyXG5cdC8vIGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0Ly8gdGFncz86IHN0cmluZ1tdOyAvLyBLZWVwIHRhZ3MgaWYgbmVlZGVkIGZvciBzb3J0aW5nL2ZpbHRlcmluZyBsYXRlcj8gTm90IGN1cnJlbnRseSB1c2VkLlxyXG59XHJcblxyXG4vLyBTaW1wbGUgZnVuY3Rpb24gdG8gZ2V0IGluZGVudGF0aW9uICh0YWJzIG9yIHNwYWNlcylcclxuZnVuY3Rpb24gZ2V0SW5kZW50YXRpb25MZXZlbChsaW5lOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXihcXHMqKS8pO1xyXG5cdGlmICghbWF0Y2gpIHJldHVybiAwO1xyXG5cdC8vIFNpbXBsZSBhcHByb2FjaDogY291bnQgY2hhcmFjdGVycy4gQ291bGQgcmVmaW5lIHRvIGhhbmRsZSB0YWJzIHZzIHNwYWNlcyBpZiBuZWNlc3NhcnkuXHJcblx0cmV0dXJuIG1hdGNoWzFdLmxlbmd0aDtcclxufVxyXG5cclxuLy8gLS0tIFJlZmFjdG9yZWQgVGFzayBQYXJzaW5nIHVzaW5nIHRhc2tVdGlsIC0tLVxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUYXNrc0ZvclNvcnRpbmcoXHJcblx0YmxvY2tUZXh0OiBzdHJpbmcsXHJcblx0bGluZU9mZnNldDogbnVtYmVyID0gMCxcclxuXHRmaWxlUGF0aDogc3RyaW5nLCAvLyBBZGRlZCBmaWxlUGF0aFxyXG5cdGZvcm1hdDogTWV0YWRhdGFGb3JtYXQsIC8vIEFkZGVkIGZvcm1hdFxyXG5cdHBsdWdpbj86IFRhc2tQcm9ncmVzc0JhclBsdWdpbiAvLyBBZGRlZCBwbHVnaW4gZm9yIGNvbmZpZ3VyYWJsZSBwcmVmaXggc3VwcG9ydFxyXG4pOiBTb3J0YWJsZVRhc2tbXSB7XHJcblx0Y29uc3QgbGluZXMgPSBibG9ja1RleHQuc3BsaXQoXCJcXG5cIik7XHJcblx0Y29uc3QgdGFza3M6IFNvcnRhYmxlVGFza1tdID0gW107XHJcblx0Ly8gdGFza01hcCB1c2VzIHRoZSBhYnNvbHV0ZSBsaW5lIG51bWJlciBhcyBrZXlcclxuXHRjb25zdCB0YXNrTWFwOiB7IFtsaW5lTnVtYmVyOiBudW1iZXJdOiBTb3J0YWJsZVRhc2sgfSA9IHt9O1xyXG5cdGxldCBjdXJyZW50UGFyZW50U3RhY2s6IFNvcnRhYmxlVGFza1tdID0gW107XHJcblxyXG5cdGxpbmVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XHJcblx0XHRjb25zdCBsaW5lTnVtYmVyID0gbGluZU9mZnNldCArIGluZGV4OyAvLyBDYWxjdWxhdGUgYWJzb2x1dGUgbGluZSBudW1iZXIgKDAtYmFzZWQpXHJcblxyXG5cdFx0Ly8gVXNlIHRoZSByb2J1c3QgcGFyc2VyIGZyb20gdGFza1V0aWxcclxuXHRcdC8vIE5vdGU6IHBhcnNlVGFza0xpbmUgZXhwZWN0cyAxLWJhc2VkIGxpbmUgbnVtYmVyIGZvciBJRCBnZW5lcmF0aW9uLCBwYXNzIGxpbmVOdW1iZXIgKyAxXHJcblx0XHRjb25zdCBwYXJzZWRUYXNrID0gcGFyc2VUYXNrTGluZShcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGxpbmUsXHJcblx0XHRcdGxpbmVOdW1iZXIgKyAxLFxyXG5cdFx0XHRmb3JtYXQsXHJcblx0XHRcdHBsdWdpbiAvLyBQYXNzIHBsdWdpbiBmb3IgY29uZmlndXJhYmxlIHByZWZpeCBzdXBwb3J0XHJcblx0XHQpOyAvLyBQYXNzIDEtYmFzZWQgbGluZSBudW1iZXJcclxuXHJcblx0XHRpZiAocGFyc2VkVGFzaykge1xyXG5cdFx0XHQvLyBXZSBoYXZlIGEgdmFsaWQgdGFzayBsaW5lLCBub3cgbWFwIGl0IHRvIFNvcnRhYmxlVGFza1xyXG5cdFx0XHRjb25zdCBpbmRlbnRhdGlvbiA9IGdldEluZGVudGF0aW9uTGV2ZWwobGluZSk7XHJcblxyXG5cdFx0XHQvLyAtLS0gQ2FsY3VsYXRlIFNvcnRhYmxlIFN0YXR1cyAtLS1cclxuXHRcdFx0bGV0IGNhbGN1bGF0ZWRTdGF0dXM6IFNvcnRhYmxlVGFza1N0YXR1cyB8IHN0cmluZyA9XHJcblx0XHRcdFx0cGFyc2VkVGFzay5zdGF0dXM7XHJcblx0XHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdG5vdy5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdFx0Y29uc3QgdG9kYXlUaW1lc3RhbXAgPSBub3cuZ2V0VGltZSgpO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCFwYXJzZWRUYXNrLmNvbXBsZXRlZCAmJlxyXG5cdFx0XHRcdHBhcnNlZFRhc2suc3RhdHVzICE9PSBTb3J0YWJsZVRhc2tTdGF0dXMuQ2FuY2VsbGVkICYmIC8vIENvbXBhcmUgYWdhaW5zdCBlbnVtXHJcblx0XHRcdFx0cGFyc2VkVGFzay5tZXRhZGF0YS5kdWVEYXRlICYmXHJcblx0XHRcdFx0cGFyc2VkVGFzay5tZXRhZGF0YS5kdWVEYXRlIDwgdG9kYXlUaW1lc3RhbXBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y2FsY3VsYXRlZFN0YXR1cyA9IFNvcnRhYmxlVGFza1N0YXR1cy5PdmVyZHVlOyAvLyBVc2UgZW51bVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEVuc3VyZSB0aGUgb3JpZ2luYWwgc3RhdHVzIG1hcHMgdG8gdGhlIGVudW0gaWYgcG9zc2libGVcclxuXHRcdFx0XHRjYWxjdWxhdGVkU3RhdHVzID0gT2JqZWN0LnZhbHVlcyhTb3J0YWJsZVRhc2tTdGF0dXMpLmluY2x1ZGVzKFxyXG5cdFx0XHRcdFx0cGFyc2VkVGFzay5zdGF0dXMgYXMgU29ydGFibGVUYXNrU3RhdHVzXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0PyAocGFyc2VkVGFzay5zdGF0dXMgYXMgU29ydGFibGVUYXNrU3RhdHVzKVxyXG5cdFx0XHRcdFx0OiBwYXJzZWRUYXNrLnN0YXR1cztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gLS0tIENyZWF0ZSBTb3J0YWJsZVRhc2sgLS0tXHJcblx0XHRcdGNvbnN0IHNvcnRhYmxlVGFzazogU29ydGFibGVUYXNrID0ge1xyXG5cdFx0XHRcdC8vIE1hcCBmaWVsZHMgZnJvbSBwYXJzZWRUYXNrXHJcblx0XHRcdFx0aWQ6IHBhcnNlZFRhc2suaWQsIC8vIFVzZSBJRCBmcm9tIHBhcnNlclxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IHBhcnNlZFRhc2sub3JpZ2luYWxNYXJrZG93bixcclxuXHRcdFx0XHRzdGF0dXM6IHBhcnNlZFRhc2suc3RhdHVzLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogcGFyc2VkVGFzay5jb21wbGV0ZWQsXHJcblx0XHRcdFx0Y29udGVudDogcGFyc2VkVGFzay5jb250ZW50LFxyXG5cdFx0XHRcdHByaW9yaXR5OiBwYXJzZWRUYXNrLm1ldGFkYXRhLnByaW9yaXR5LFxyXG5cdFx0XHRcdGR1ZURhdGU6IHBhcnNlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSxcclxuXHRcdFx0XHRzdGFydERhdGU6IHBhcnNlZFRhc2subWV0YWRhdGEuc3RhcnREYXRlLFxyXG5cdFx0XHRcdHNjaGVkdWxlZERhdGU6IHBhcnNlZFRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHR0YWdzOiBwYXJzZWRUYXNrLm1ldGFkYXRhLnRhZ3MgfHwgW10sIC8vIE1hcCB0YWdzLCBkZWZhdWx0IHRvIGVtcHR5IGFycmF5XHJcblx0XHRcdFx0Ly8gRmllbGRzIHNwZWNpZmljIHRvIFNvcnRhYmxlVGFzayAvIHJlcXVpcmVkIGZvciBzb3J0aW5nIGxvZ2ljXHJcblx0XHRcdFx0bGluZU51bWJlcjogbGluZU51bWJlciwgLy8gS2VlcCAwLWJhc2VkIGxpbmUgbnVtYmVyIGZvciBzb3J0aW5nIHN0YWJpbGl0eVxyXG5cdFx0XHRcdGluZGVudGF0aW9uOiBpbmRlbnRhdGlvbixcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0Y2FsY3VsYXRlZFN0YXR1czogY2FsY3VsYXRlZFN0YXR1cyxcclxuXHRcdFx0XHRtZXRhZGF0YTogcGFyc2VkVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHQvLyBwYXJlbnQgd2lsbCBiZSBzZXQgYmVsb3dcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIC0tLSBCdWlsZCBIaWVyYXJjaHkgLS0tXHJcblx0XHRcdHRhc2tNYXBbbGluZU51bWJlcl0gPSBzb3J0YWJsZVRhc2s7IC8vIFVzZSAwLWJhc2VkIGFic29sdXRlIGxpbmUgbnVtYmVyXHJcblxyXG5cdFx0XHQvLyBGaW5kIHBhcmVudCBiYXNlZCBvbiBpbmRlbnRhdGlvblxyXG5cdFx0XHR3aGlsZSAoXHJcblx0XHRcdFx0Y3VycmVudFBhcmVudFN0YWNrLmxlbmd0aCA+IDAgJiZcclxuXHRcdFx0XHRpbmRlbnRhdGlvbiA8PSAvLyBDaGlsZCBtdXN0IGhhdmUgZ3JlYXRlciBpbmRlbnRhdGlvbiB0aGFuIHBhcmVudFxyXG5cdFx0XHRcdFx0Y3VycmVudFBhcmVudFN0YWNrW2N1cnJlbnRQYXJlbnRTdGFjay5sZW5ndGggLSAxXVxyXG5cdFx0XHRcdFx0XHQuaW5kZW50YXRpb25cclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y3VycmVudFBhcmVudFN0YWNrLnBvcCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoY3VycmVudFBhcmVudFN0YWNrLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBwYXJlbnQgPVxyXG5cdFx0XHRcdFx0Y3VycmVudFBhcmVudFN0YWNrW2N1cnJlbnRQYXJlbnRTdGFjay5sZW5ndGggLSAxXTtcclxuXHRcdFx0XHRwYXJlbnQuY2hpbGRyZW4ucHVzaChzb3J0YWJsZVRhc2spO1xyXG5cdFx0XHRcdHNvcnRhYmxlVGFzay5wYXJlbnQgPSBwYXJlbnQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGFza3MucHVzaChzb3J0YWJsZVRhc2spOyAvLyBBZGQgYXMgdG9wLWxldmVsIHRhc2sgd2l0aGluIHRoZSBibG9ja1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjdXJyZW50UGFyZW50U3RhY2sucHVzaChzb3J0YWJsZVRhc2spOyAvLyBQdXNoIGN1cnJlbnQgdGFzayBvbnRvIHN0YWNrXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBOb24tdGFzayBsaW5lIGVuY291bnRlcmVkXHJcblx0XHRcdC8vIEtlZXAgdGhlIHN0YWNrLCBhc3N1bWluZyB0YXNrcyB1bmRlciBhIG5vbi10YXNrIG1pZ2h0IHN0aWxsIGJlIHJlbGF0ZWQgaGllcmFyY2hpY2FsbHkuXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB0YXNrczsgLy8gUmV0dXJuIHRvcC1sZXZlbCB0YXNrcyBmb3VuZCB3aXRoaW4gdGhlIGJsb2NrXHJcbn1cclxuXHJcbi8vIC0tLSAzLiBTb3J0aW5nIExvZ2ljIC0tLVxyXG5cclxuLy8gR2VuZXJhdGVzIHRoZSBzdGF0dXMgb3JkZXIgbWFwIGJhc2VkIG9uIHBsdWdpbiBzZXR0aW5nc1xyXG5mdW5jdGlvbiBnZXREeW5hbWljU3RhdHVzT3JkZXIoc2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzKToge1xyXG5cdFtrZXk6IHN0cmluZ106IG51bWJlcjtcclxufSB7XHJcblx0Y29uc3Qgb3JkZXI6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0gPSB7fTtcclxuXHRsZXQgY3VycmVudE9yZGVyID0gMTtcclxuXHJcblx0Ly8gLS0tIEhpZ2ggUHJpb3JpdHkgU3RhdHVzZXMgLS0tXHJcblx0Ly8gQWx3YXlzIHB1dCBPdmVyZHVlIGZpcnN0XHJcblx0b3JkZXJbU29ydGFibGVUYXNrU3RhdHVzLk92ZXJkdWVdID0gY3VycmVudE9yZGVyKys7XHJcblx0Ly8gT3B0aW9uYWxseSBhZGQgRHVlU29vbiBpZiBkZWZpbmVkIGFuZCBuZWVkZWRcclxuXHQvLyBvcmRlcltTb3J0YWJsZVRhc2tTdGF0dXMuRHVlU29vbl0gPSBjdXJyZW50T3JkZXIrKztcclxuXHJcblx0Ly8gLS0tIFN0YXR1c2VzIGZyb20gQ3ljbGUgLS0tXHJcblx0Y29uc3QgY3ljbGUgPSBzZXR0aW5ncy50YXNrU3RhdHVzQ3ljbGUgfHwgW107XHJcblx0Y29uc3QgbWFya3MgPSBzZXR0aW5ncy50YXNrU3RhdHVzTWFya3MgfHwge307XHJcblx0Y29uc3QgZXhjbHVkZSA9IHNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSB8fCBbXTtcclxuXHRjb25zdCBjb21wbGV0ZWRNYXJrZXJzID0gKHNldHRpbmdzLnRhc2tTdGF0dXNlcz8uY29tcGxldGVkIHx8IFwieHxYXCIpLnNwbGl0KFxyXG5cdFx0XCJ8XCJcclxuXHQpO1xyXG5cdGNvbnN0IGNhbmNlbGxlZE1hcmtlcnMgPSAoc2V0dGluZ3MudGFza1N0YXR1c2VzPy5hYmFuZG9uZWQgfHwgXCItXCIpLnNwbGl0KFxyXG5cdFx0XCJ8XCJcclxuXHQpOyAvLyBFeGFtcGxlOiBVc2UgYWJhbmRvbmVkIGFzIGNhbmNlbGxlZFxyXG5cclxuXHRjb25zdCBpbmNsdWRlZEluQ3ljbGU6IHN0cmluZ1tdID0gW107XHJcblx0Y29uc3QgY29tcGxldGVkSW5DeWNsZTogc3RyaW5nW10gPSBbXTtcclxuXHRjb25zdCBjYW5jZWxsZWRJbkN5Y2xlOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHQvLyBJdGVyYXRlIHRocm91Z2ggdGhlIGRlZmluZWQgY3ljbGVcclxuXHRmb3IgKGNvbnN0IHN0YXR1c05hbWUgb2YgY3ljbGUpIHtcclxuXHRcdGNvbnN0IG1hcmsgPSBtYXJrc1tzdGF0dXNOYW1lXTtcclxuXHRcdGlmIChtYXJrICYmICFleGNsdWRlLmluY2x1ZGVzKHN0YXR1c05hbWUpKSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgc3RhdHVzIGlzIGNvbnNpZGVyZWQgY29tcGxldGVkIG9yIGNhbmNlbGxlZFxyXG5cdFx0XHRpZiAoY29tcGxldGVkTWFya2Vycy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdGNvbXBsZXRlZEluQ3ljbGUucHVzaChtYXJrKTtcclxuXHRcdFx0fSBlbHNlIGlmIChjYW5jZWxsZWRNYXJrZXJzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdFx0Y2FuY2VsbGVkSW5DeWNsZS5wdXNoKG1hcmspO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFkZCBvdGhlciBzdGF0dXNlcyBpbiB0aGVpciBjeWNsZSBvcmRlclxyXG5cdFx0XHRcdGlmICghKG1hcmsgaW4gb3JkZXIpKSB7XHJcblx0XHRcdFx0XHQvLyBBdm9pZCBvdmVyd3JpdGluZyBPdmVyZHVlL0R1ZVNvb24gaWYgdGhlaXIgbWFya3Mgc29tZWhvdyBhcHBlYXJcclxuXHRcdFx0XHRcdG9yZGVyW21hcmtdID0gY3VycmVudE9yZGVyKys7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGluY2x1ZGVkSW5DeWNsZS5wdXNoKG1hcmspO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gQWRkIENvbXBsZXRlZCBhbmQgQ2FuY2VsbGVkIFN0YXR1c2VzIChmcm9tIGN5Y2xlKSBhdCB0aGUgZW5kIC0tLVxyXG5cdC8vIFBsYWNlIGNvbXBsZXRlZCBzdGF0dXNlcyB0b3dhcmRzIHRoZSBlbmRcclxuXHRjb21wbGV0ZWRJbkN5Y2xlLmZvckVhY2goKG1hcmspID0+IHtcclxuXHRcdGlmICghKG1hcmsgaW4gb3JkZXIpKSB7XHJcblx0XHRcdG9yZGVyW21hcmtdID0gOTg7IC8vIEFzc2lnbiBhIGhpZ2ggbnVtYmVyIGZvciBzb3J0aW5nIHRvd2FyZHMgdGhlIGVuZFxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdC8vIFBsYWNlIGNhbmNlbGxlZCBzdGF0dXNlcyBsYXN0XHJcblx0Y2FuY2VsbGVkSW5DeWNsZS5mb3JFYWNoKChtYXJrKSA9PiB7XHJcblx0XHRpZiAoIShtYXJrIGluIG9yZGVyKSkge1xyXG5cdFx0XHRvcmRlclttYXJrXSA9IDk5OyAvLyBBc3NpZ24gdGhlIGhpZ2hlc3QgbnVtYmVyXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIC0tLSBGYWxsYmFjayBmb3Igc3RhdHVzZXMgZGVmaW5lZCBpbiBzZXR0aW5ncyBidXQgbm90IGluIHRoZSBjeWNsZSAtLS1cclxuXHQvLyAoVGhpcyBwYXJ0IG1pZ2h0IGJlIGNvbXBsZXggZGVwZW5kaW5nIG9uIGRlc2lyZWQgYmVoYXZpb3IgZm9yIHN0YXR1c2VzIG91dHNpZGUgdGhlIGN5Y2xlKVxyXG5cdC8vIEV4YW1wbGU6IEFkZCBhbGwgZGVmaW5lZCBtYXJrcyBmcm9tIHNldHRpbmdzLnRhc2tTdGF0dXNlcyBpZiB0aGV5IGFyZW4ndCBhbHJlYWR5IGluIHRoZSBvcmRlciBtYXAuXHJcblx0Zm9yIChjb25zdCBzdGF0dXNUeXBlIGluIHNldHRpbmdzLnRhc2tTdGF0dXNlcykge1xyXG5cdFx0Y29uc3QgbWFya2VycyA9IChzZXR0aW5ncy50YXNrU3RhdHVzZXNbc3RhdHVzVHlwZV0gfHwgXCJcIikuc3BsaXQoXCJ8XCIpO1xyXG5cdFx0bWFya2Vycy5mb3JFYWNoKChtYXJrKSA9PiB7XHJcblx0XHRcdGlmIChtYXJrICYmICEobWFyayBpbiBvcmRlcikpIHtcclxuXHRcdFx0XHQvLyBEZWNpZGUgd2hlcmUgdG8gcHV0IHRoZXNlOiBtYXliZSBncm91cCB0aGVtP1xyXG5cdFx0XHRcdC8vIFNpbXBsZSBhcHByb2FjaDogcHV0IHRoZW0gYWZ0ZXIgY3ljbGUgc3RhdHVzZXMgYnV0IGJlZm9yZSBjb21wbGV0ZWQvY2FuY2VsbGVkIGRlZmF1bHRzXHJcblx0XHRcdFx0aWYgKGNvbXBsZXRlZE1hcmtlcnMuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdG9yZGVyW21hcmtdID0gOTg7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChjYW5jZWxsZWRNYXJrZXJzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdFx0XHRvcmRlclttYXJrXSA9IDk5O1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRvcmRlclttYXJrXSA9IGN1cnJlbnRPcmRlcisrOyAvLyBBZGQgYWZ0ZXIgdGhlIG1haW4gY3ljbGUgaXRlbXNcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gRW5zdXJlIGRlZmF1bHQgJyAnIGFuZCAneCcgaGF2ZSBzb21lIG9yZGVyIGlmIG5vdCBkZWZpbmVkIGVsc2V3aGVyZVxyXG5cdGlmICghKFwiIFwiIGluIG9yZGVyKSkgb3JkZXJbXCIgXCJdID0gb3JkZXJbXCIgXCJdID8/IDEwOyAvLyBEZWZhdWx0IGluY29tcGxldGUgcmVhc29uYWJseSBoaWdoXHJcblx0aWYgKCEoXCJ4XCIgaW4gb3JkZXIpKSBvcmRlcltcInhcIl0gPSBvcmRlcltcInhcIl0gPz8gOTg7IC8vIERlZmF1bHQgY29tcGxldGUgdG93YXJkcyBlbmRcclxuXHJcblx0cmV0dXJuIG9yZGVyO1xyXG59XHJcblxyXG4vLyBDb21wYXJlcyB0d28gdGFza3MgYmFzZWQgb24gdGhlIGdpdmVuIGNyaXRlcmlhIEFORCBwbHVnaW4gc2V0dGluZ3NcclxuZnVuY3Rpb24gY29tcGFyZVRhc2tzPFxyXG5cdFQgZXh0ZW5kcyB7XHJcblx0XHRjYWxjdWxhdGVkU3RhdHVzPzogc3RyaW5nIHwgU29ydGFibGVUYXNrU3RhdHVzO1xyXG5cdFx0c3RhdHVzPzogc3RyaW5nO1xyXG5cdFx0Y29tcGxldGVkPzogYm9vbGVhbjtcclxuXHRcdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdFx0ZHVlRGF0ZT86IG51bWJlcjtcclxuXHRcdHN0YXJ0RGF0ZT86IG51bWJlcjtcclxuXHRcdHNjaGVkdWxlZERhdGU/OiBudW1iZXI7XHJcblx0XHRjcmVhdGVkRGF0ZT86IG51bWJlcjtcclxuXHRcdGNvbXBsZXRlZERhdGU/OiBudW1iZXI7XHJcblx0XHRjb250ZW50Pzogc3RyaW5nO1xyXG5cdFx0dGFncz86IHN0cmluZ1tdO1xyXG5cdFx0cHJvamVjdD86IHN0cmluZztcclxuXHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHRyZWN1cnJlbmNlPzogc3RyaW5nO1xyXG5cdFx0ZmlsZVBhdGg/OiBzdHJpbmc7XHJcblx0XHRsaW5lPzogbnVtYmVyO1xyXG5cdFx0bGluZU51bWJlcj86IG51bWJlcjtcclxuXHRcdG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHR9XHJcbj4oXHJcblx0dGFza0E6IFQsXHJcblx0dGFza0I6IFQsXHJcblx0Y3JpdGVyaWE6IFNvcnRDcml0ZXJpb25bXSxcclxuXHRzdGF0dXNPcmRlcjogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfVxyXG4pOiBudW1iZXIge1xyXG5cdC8vIEhlbHBlciB0byByZWFkIGZpZWxkIGZyb20gdG9wLWxldmVsIG9yIG1ldGFkYXRhIGZhbGxiYWNrXHJcblx0Y29uc3QgZ2V0RmllbGQgPSAob2JqOiBhbnksIGZpZWxkOiBzdHJpbmcpID0+IHtcclxuXHRcdGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdGNvbnN0IHRvcCA9IG9ialtmaWVsZF07XHJcblx0XHRpZiAodG9wICE9PSB1bmRlZmluZWQgJiYgdG9wICE9PSBudWxsKSByZXR1cm4gdG9wO1xyXG5cdFx0cmV0dXJuIG9iai5tZXRhZGF0YSA/IG9iai5tZXRhZGF0YVtmaWVsZF0gOiB1bmRlZmluZWQ7XHJcblx0fTtcclxuXHJcblx0Ly8gSW5pdGlhbGl6ZSBDb2xsYXRvciBmb3IgdGV4dCBzb3J0aW5nIG9wdGltaXphdGlvblxyXG5cdGNvbnN0IHNvcnRDb2xsYXRvciA9IG5ldyBJbnRsLkNvbGxhdG9yKHVuZGVmaW5lZCwge1xyXG5cdFx0dXNhZ2U6IFwic29ydFwiLFxyXG5cdFx0c2Vuc2l0aXZpdHk6IFwiYmFzZVwiLCAvLyBDYXNlLWluc2Vuc2l0aXZlXHJcblx0XHRudW1lcmljOiB0cnVlLCAvLyBJbnRlbGxpZ2VudCBudW1iZXIgaGFuZGxpbmdcclxuXHR9KTtcclxuXHJcblx0Ly8gQ3JlYXRlIHNvcnQgZmFjdG9yeSBvYmplY3RcclxuXHRjb25zdCBzb3J0RmFjdG9yeSA9IHtcclxuXHRcdHN0YXR1czogKGE6IFQsIGI6IFQsIG9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCIpID0+IHtcclxuXHRcdFx0Ly8gU3RhdHVzIGNvbXBhcmlzb24gbG9naWMgKHJlbGllcyBvbiBzdGF0dXNPcmRlciBoYXZpbmcgbnVtYmVycylcclxuXHRcdFx0Ly8gVXNlIGNhbGN1bGF0ZWRTdGF0dXMgZmlyc3QsIG90aGVyd2lzZSB1c2Ugc3RhdHVzXHJcblx0XHRcdGNvbnN0IHN0YXR1c0EgPSAoYSBhcyBhbnkpLmNhbGN1bGF0ZWRTdGF0dXMgfHwgKGEgYXMgYW55KS5zdGF0dXMgfHwgXCJcIjtcclxuXHRcdFx0Y29uc3Qgc3RhdHVzQiA9IChiIGFzIGFueSkuY2FsY3VsYXRlZFN0YXR1cyB8fCAoYiBhcyBhbnkpLnN0YXR1cyB8fCBcIlwiO1xyXG5cclxuXHRcdFx0Y29uc3QgdmFsQSA9IHN0YXR1c09yZGVyW3N0YXR1c0FdID8/IDEwMDA7IC8vIEFzc2lnbiBhIGhpZ2ggbnVtYmVyIGZvciB1bmtub3duIHN0YXR1c2VzXHJcblx0XHRcdGNvbnN0IHZhbEIgPSBzdGF0dXNPcmRlcltzdGF0dXNCXSA/PyAxMDAwO1xyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiB2YWxBID09PSBcIm51bWJlclwiICYmIHR5cGVvZiB2YWxCID09PSBcIm51bWJlclwiKSB7XHJcblx0XHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9IHZhbEEgLSB2YWxCOyAvLyBMb3dlciBudW1iZXIgbWVhbnMgaGlnaGVyIHJhbmsgaW4gc3RhdHVzIG9yZGVyXHJcblx0XHRcdFx0cmV0dXJuIG9yZGVyID09PSBcImFzY1wiID8gY29tcGFyaXNvbiA6IC1jb21wYXJpc29uO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrIGlmIHN0YXR1c09yZGVyIGNvbnRhaW5zIG5vbi1udW1iZXJzIChzaG91bGRuJ3QgaGFwcGVuIGlkZWFsbHkpXHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YE5vbi1udW1lcmljIHN0YXR1cyBvcmRlciB2YWx1ZXMgZGV0ZWN0ZWQ6ICR7dmFsQX0sICR7dmFsQn1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm4gMDsgLy8gVHJlYXQgYXMgZXF1YWwgaWYgbm9uLW51bWVyaWNcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHRjb21wbGV0ZWQ6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdC8vIENvbXBsZXRlZCBzdGF0dXMgY29tcGFyaXNvblxyXG5cdFx0XHRjb25zdCBhQ29tcGxldGVkID0gISEoYSBhcyBhbnkpLmNvbXBsZXRlZDtcclxuXHRcdFx0Y29uc3QgYkNvbXBsZXRlZCA9ICEhKGIgYXMgYW55KS5jb21wbGV0ZWQ7XHJcblxyXG5cdFx0XHRpZiAoYUNvbXBsZXRlZCA9PT0gYkNvbXBsZXRlZCkge1xyXG5cdFx0XHRcdHJldHVybiAwOyAvLyBCb3RoIGhhdmUgc2FtZSBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGb3IgYXNjOiBpbmNvbXBsZXRlIHRhc2tzIGZpcnN0IChmYWxzZSA8IHRydWUpXHJcblx0XHRcdC8vIEZvciBkZXNjOiBjb21wbGV0ZWQgdGFza3MgZmlyc3QgKHRydWUgPiBmYWxzZSlcclxuXHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9IGFDb21wbGV0ZWQgPyAxIDogLTE7XHJcblx0XHRcdHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcclxuXHRcdH0sXHJcblxyXG5cdFx0cHJpb3JpdHk6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdC8vIFByaW9yaXR5IGNvbXBhcmlzb246IGhpZ2hlciBudW1iZXIgbWVhbnMgaGlnaGVyIHByaW9yaXR5ICgxPUxvd2VzdCwgNT1IaWdoZXN0KVxyXG5cdFx0XHRjb25zdCB2YWxBID0gZ2V0RmllbGQoYSwgXCJwcmlvcml0eVwiKTtcclxuXHRcdFx0Y29uc3QgdmFsQiA9IGdldEZpZWxkKGIsIFwicHJpb3JpdHlcIik7XHJcblx0XHRcdGNvbnN0IGFIYXNQcmlvcml0eSA9IHZhbEEgIT09IHVuZGVmaW5lZCAmJiB2YWxBICE9PSBudWxsICYmIHZhbEEgPiAwO1xyXG5cdFx0XHRjb25zdCBiSGFzUHJpb3JpdHkgPSB2YWxCICE9PSB1bmRlZmluZWQgJiYgdmFsQiAhPT0gbnVsbCAmJiB2YWxCID4gMDtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBudWxsL2VtcHR5IHZhbHVlcyAtIGVtcHR5IHZhbHVlcyBzaG91bGQgYWx3YXlzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0aWYgKCFhSGFzUHJpb3JpdHkgJiYgIWJIYXNQcmlvcml0eSkge1xyXG5cdFx0XHRcdHJldHVybiAwOyAvLyBCb3RoIGxhY2sgcHJpb3JpdHlcclxuXHRcdFx0fSBlbHNlIGlmICghYUhhc1ByaW9yaXR5KSB7XHJcblx0XHRcdFx0Ly8gQSBsYWNrcyBwcmlvcml0eSAtIG5vIHByaW9yaXR5IHRhc2tzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdFx0fSBlbHNlIGlmICghYkhhc1ByaW9yaXR5KSB7XHJcblx0XHRcdFx0Ly8gQiBsYWNrcyBwcmlvcml0eSAtIG5vIHByaW9yaXR5IHRhc2tzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0XHRyZXR1cm4gLTE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gQm90aCBoYXZlIG51bWVyaWMgcHJpb3JpdGllcyAtIHNpbXBsZSBudW1lcmljIGNvbXBhcmlzb25cclxuXHRcdFx0XHQvLyBGb3IgYXNjOiAxLCAyLCAzLCA0LCA1IChMb3cgdG8gSGlnaClcclxuXHRcdFx0XHQvLyBGb3IgZGVzYzogNSwgNCwgMywgMiwgMSAoSGlnaCB0byBMb3cpXHJcblx0XHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9ICh2YWxBIGFzIG51bWJlcikgLSAodmFsQiBhcyBudW1iZXIpO1xyXG5cdFx0XHRcdHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHRkdWVEYXRlOiAoYTogVCwgYjogVCwgb3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIikgPT4ge1xyXG5cdFx0XHRyZXR1cm4gc29ydEJ5RGF0ZShcImR1ZURhdGVcIiwgYSwgYiwgb3JkZXIpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRzdGFydERhdGU6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdHJldHVybiBzb3J0QnlEYXRlKFwic3RhcnREYXRlXCIsIGEsIGIsIG9yZGVyKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0c2NoZWR1bGVkRGF0ZTogKGE6IFQsIGI6IFQsIG9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCIpID0+IHtcclxuXHRcdFx0cmV0dXJuIHNvcnRCeURhdGUoXCJzY2hlZHVsZWREYXRlXCIsIGEsIGIsIG9yZGVyKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y3JlYXRlZERhdGU6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdHJldHVybiBzb3J0QnlEYXRlKFwiY3JlYXRlZERhdGVcIiwgYSwgYiwgb3JkZXIpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRjb21wbGV0ZWREYXRlOiAoYTogVCwgYjogVCwgb3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIikgPT4ge1xyXG5cdFx0XHRyZXR1cm4gc29ydEJ5RGF0ZShcImNvbXBsZXRlZERhdGVcIiwgYSwgYiwgb3JkZXIpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRjb250ZW50OiAoYTogVCwgYjogVCwgb3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIikgPT4ge1xyXG5cdFx0XHQvLyBVc2UgQ29sbGF0b3IgZm9yIHNtYXJ0ZXIgdGV4dCBjb21wYXJpc29uIGluc3RlYWQgb2Ygc2ltcGxlIGxvY2FsZUNvbXBhcmVcclxuXHRcdFx0Ly8gRmlyc3QgY2hlY2sgaWYgY29udGVudCBleGlzdHNcclxuXHRcdFx0Y29uc3QgY29udGVudEEgPSAoYSBhcyBhbnkpLmNvbnRlbnQ/LnRyaW0oKSB8fCBudWxsO1xyXG5cdFx0XHRjb25zdCBjb250ZW50QiA9IChiIGFzIGFueSkuY29udGVudD8udHJpbSgpIHx8IG51bGw7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgbnVsbC9lbXB0eSB2YWx1ZXMgLSBlbXB0eSB2YWx1ZXMgc2hvdWxkIGFsd2F5cyBnbyB0byB0aGUgZW5kXHJcblx0XHRcdGlmICghY29udGVudEEgJiYgIWNvbnRlbnRCKSByZXR1cm4gMDtcclxuXHRcdFx0aWYgKCFjb250ZW50QSkgcmV0dXJuIDE7IC8vIEEgaXMgZW1wdHksIGdvZXMgdG8gZW5kXHJcblx0XHRcdGlmICghY29udGVudEIpIHJldHVybiAtMTsgLy8gQiBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBhcmlzb24gPSBzb3J0Q29sbGF0b3IuY29tcGFyZShjb250ZW50QSwgY29udGVudEIpO1xyXG5cdFx0XHRyZXR1cm4gb3JkZXIgPT09IFwiYXNjXCIgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XHJcblx0XHR9LFxyXG5cclxuXHRcdHRhZ3M6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdC8vIFNvcnQgYnkgdGFncyAtIGNvbnZlcnQgYXJyYXkgdG8gc3RyaW5nIGZvciBjb21wYXJpc29uXHJcblx0XHRcdGNvbnN0IHRhZ3NBVmFsID0gZ2V0RmllbGQoYSwgXCJ0YWdzXCIpO1xyXG5cdFx0XHRjb25zdCB0YWdzQlZhbCA9IGdldEZpZWxkKGIsIFwidGFnc1wiKTtcclxuXHRcdFx0Y29uc3QgdGFnc0EgPVxyXG5cdFx0XHRcdEFycmF5LmlzQXJyYXkodGFnc0FWYWwpICYmIHRhZ3NBVmFsLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdD8gKHRhZ3NBVmFsIGFzIHN0cmluZ1tdKS5qb2luKFwiLCBcIilcclxuXHRcdFx0XHRcdDogbnVsbDtcclxuXHRcdFx0Y29uc3QgdGFnc0IgPVxyXG5cdFx0XHRcdEFycmF5LmlzQXJyYXkodGFnc0JWYWwpICYmIHRhZ3NCVmFsLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdD8gKHRhZ3NCVmFsIGFzIHN0cmluZ1tdKS5qb2luKFwiLCBcIilcclxuXHRcdFx0XHRcdDogbnVsbDtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBudWxsL2VtcHR5IHZhbHVlcyAtIGVtcHR5IHZhbHVlcyBzaG91bGQgYWx3YXlzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0aWYgKCF0YWdzQSAmJiAhdGFnc0IpIHJldHVybiAwO1xyXG5cdFx0XHRpZiAoIXRhZ3NBKSByZXR1cm4gMTsgLy8gQSBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHRcdFx0aWYgKCF0YWdzQikgcmV0dXJuIC0xOyAvLyBCIGlzIGVtcHR5LCBnb2VzIHRvIGVuZFxyXG5cclxuXHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9IHNvcnRDb2xsYXRvci5jb21wYXJlKHRhZ3NBLCB0YWdzQik7XHJcblx0XHRcdHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcclxuXHRcdH0sXHJcblxyXG5cdFx0cHJvamVjdDogKGE6IFQsIGI6IFQsIG9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCIpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEEgPSAoZ2V0RmllbGQoYSwgXCJwcm9qZWN0XCIpIGFzIHN0cmluZyB8IHVuZGVmaW5lZClcclxuXHRcdFx0XHQ/LnRyaW0oKSB8fCBudWxsO1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0QiA9IChnZXRGaWVsZChiLCBcInByb2plY3RcIikgYXMgc3RyaW5nIHwgdW5kZWZpbmVkKVxyXG5cdFx0XHRcdD8udHJpbSgpIHx8IG51bGw7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgbnVsbC9lbXB0eSB2YWx1ZXMgLSBlbXB0eSB2YWx1ZXMgc2hvdWxkIGFsd2F5cyBnbyB0byB0aGUgZW5kXHJcblx0XHRcdGlmICghcHJvamVjdEEgJiYgIXByb2plY3RCKSByZXR1cm4gMDtcclxuXHRcdFx0aWYgKCFwcm9qZWN0QSkgcmV0dXJuIDE7IC8vIEEgaXMgZW1wdHksIGdvZXMgdG8gZW5kXHJcblx0XHRcdGlmICghcHJvamVjdEIpIHJldHVybiAtMTsgLy8gQiBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBhcmlzb24gPSBzb3J0Q29sbGF0b3IuY29tcGFyZShwcm9qZWN0QSwgcHJvamVjdEIpO1xyXG5cdFx0XHRyZXR1cm4gb3JkZXIgPT09IFwiYXNjXCIgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XHJcblx0XHR9LFxyXG5cclxuXHRcdGNvbnRleHQ6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRleHRBID0gKGdldEZpZWxkKGEsIFwiY29udGV4dFwiKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpXHJcblx0XHRcdFx0Py50cmltKCkgfHwgbnVsbDtcclxuXHRcdFx0Y29uc3QgY29udGV4dEIgPSAoZ2V0RmllbGQoYiwgXCJjb250ZXh0XCIpIGFzIHN0cmluZyB8IHVuZGVmaW5lZClcclxuXHRcdFx0XHQ/LnRyaW0oKSB8fCBudWxsO1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIG51bGwvZW1wdHkgdmFsdWVzIC0gZW1wdHkgdmFsdWVzIHNob3VsZCBhbHdheXMgZ28gdG8gdGhlIGVuZFxyXG5cdFx0XHRpZiAoIWNvbnRleHRBICYmICFjb250ZXh0QikgcmV0dXJuIDA7XHJcblx0XHRcdGlmICghY29udGV4dEEpIHJldHVybiAxOyAvLyBBIGlzIGVtcHR5LCBnb2VzIHRvIGVuZFxyXG5cdFx0XHRpZiAoIWNvbnRleHRCKSByZXR1cm4gLTE7IC8vIEIgaXMgZW1wdHksIGdvZXMgdG8gZW5kXHJcblxyXG5cdFx0XHRjb25zdCBjb21wYXJpc29uID0gc29ydENvbGxhdG9yLmNvbXBhcmUoY29udGV4dEEsIGNvbnRleHRCKTtcclxuXHRcdFx0cmV0dXJuIG9yZGVyID09PSBcImFzY1wiID8gY29tcGFyaXNvbiA6IC1jb21wYXJpc29uO1xyXG5cdFx0fSxcclxuXHJcblx0XHRyZWN1cnJlbmNlOiAoYTogVCwgYjogVCwgb3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIikgPT4ge1xyXG5cdFx0XHRjb25zdCByZWN1cnJlbmNlQSA9IChnZXRGaWVsZChhLCBcInJlY3VycmVuY2VcIikgYXMgc3RyaW5nIHwgdW5kZWZpbmVkKVxyXG5cdFx0XHRcdD8udHJpbSgpIHx8IG51bGw7XHJcblx0XHRcdGNvbnN0IHJlY3VycmVuY2VCID0gKGdldEZpZWxkKGIsIFwicmVjdXJyZW5jZVwiKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpXHJcblx0XHRcdFx0Py50cmltKCkgfHwgbnVsbDtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBudWxsL2VtcHR5IHZhbHVlcyAtIGVtcHR5IHZhbHVlcyBzaG91bGQgYWx3YXlzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0aWYgKCFyZWN1cnJlbmNlQSAmJiAhcmVjdXJyZW5jZUIpIHJldHVybiAwO1xyXG5cdFx0XHRpZiAoIXJlY3VycmVuY2VBKSByZXR1cm4gMTsgLy8gQSBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHRcdFx0aWYgKCFyZWN1cnJlbmNlQikgcmV0dXJuIC0xOyAvLyBCIGlzIGVtcHR5LCBnb2VzIHRvIGVuZFxyXG5cclxuXHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9IHNvcnRDb2xsYXRvci5jb21wYXJlKHJlY3VycmVuY2VBLCByZWN1cnJlbmNlQik7XHJcblx0XHRcdHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcclxuXHRcdH0sXHJcblxyXG5cdFx0ZmlsZVBhdGg6IChhOiBULCBiOiBULCBvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoQSA9IChhIGFzIGFueSkuZmlsZVBhdGg/LnRyaW0oKSB8fCBudWxsO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aEIgPSAoYiBhcyBhbnkpLmZpbGVQYXRoPy50cmltKCkgfHwgbnVsbDtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBudWxsL2VtcHR5IHZhbHVlcyAtIGVtcHR5IHZhbHVlcyBzaG91bGQgYWx3YXlzIGdvIHRvIHRoZSBlbmRcclxuXHRcdFx0aWYgKCFmaWxlUGF0aEEgJiYgIWZpbGVQYXRoQikgcmV0dXJuIDA7XHJcblx0XHRcdGlmICghZmlsZVBhdGhBKSByZXR1cm4gMTsgLy8gQSBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHRcdFx0aWYgKCFmaWxlUGF0aEIpIHJldHVybiAtMTsgLy8gQiBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBhcmlzb24gPSBzb3J0Q29sbGF0b3IuY29tcGFyZShmaWxlUGF0aEEsIGZpbGVQYXRoQik7XHJcblx0XHRcdHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcclxuXHRcdH0sXHJcblxyXG5cdFx0bGluZU51bWJlcjogKGE6IFQsIGI6IFQsIG9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCIpID0+IHtcclxuXHRcdFx0cmV0dXJuICgoYSBhcyBhbnkpLmxpbmUgfHwgMCkgLSAoKGIgYXMgYW55KS5saW5lIHx8IDApO1xyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHQvLyBHZW5lcmljIGRhdGUgc29ydGluZyBmdW5jdGlvblxyXG5cdGZ1bmN0aW9uIHNvcnRCeURhdGUoXHJcblx0XHRmaWVsZDpcclxuXHRcdFx0fCBcImR1ZURhdGVcIlxyXG5cdFx0XHR8IFwic3RhcnREYXRlXCJcclxuXHRcdFx0fCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0XHR8IFwiY3JlYXRlZERhdGVcIlxyXG5cdFx0XHR8IFwiY29tcGxldGVkRGF0ZVwiLFxyXG5cdFx0YTogVCxcclxuXHRcdGI6IFQsXHJcblx0XHRvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiXHJcblx0KTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IHZhbEEgPSBnZXRGaWVsZChhLCBmaWVsZCk7XHJcblx0XHRjb25zdCB2YWxCID0gZ2V0RmllbGQoYiwgZmllbGQpO1xyXG5cdFx0Y29uc3QgYUhhc0RhdGUgPSB2YWxBICE9PSB1bmRlZmluZWQgJiYgdmFsQSAhPT0gbnVsbDtcclxuXHRcdGNvbnN0IGJIYXNEYXRlID0gdmFsQiAhPT0gdW5kZWZpbmVkICYmIHZhbEIgIT09IG51bGw7XHJcblxyXG5cdFx0bGV0IGNvbXBhcmlzb24gPSAwO1xyXG5cdFx0aWYgKCFhSGFzRGF0ZSAmJiAhYkhhc0RhdGUpIHtcclxuXHRcdFx0Y29tcGFyaXNvbiA9IDA7IC8vIEJvdGggbGFjayBkYXRlXHJcblx0XHR9IGVsc2UgaWYgKCFhSGFzRGF0ZSkge1xyXG5cdFx0XHQvLyBBIGxhY2tzIGRhdGUuICdhc2MnIG1lYW5zIERhdGVzLT5Ob25lLiBOb25lIGlzIGxhc3QgKCsxKS5cclxuXHRcdFx0Y29tcGFyaXNvbiA9IDE7XHJcblx0XHR9IGVsc2UgaWYgKCFiSGFzRGF0ZSkge1xyXG5cdFx0XHQvLyBCIGxhY2tzIGRhdGUuICdhc2MnIG1lYW5zIERhdGVzLT5Ob25lLiBOb25lIGlzIGxhc3QuIEIgaXMgbGFzdCwgc28gQSBpcyBmaXJzdCAoLTEpLlxyXG5cdFx0XHRjb21wYXJpc29uID0gLTE7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBCb3RoIGhhdmUgbnVtZXJpYyBkYXRlcyAodGltZXN0YW1wcylcclxuXHRcdFx0Y29uc3QgZGF0ZUEgPSB2YWxBIGFzIG51bWJlcjtcclxuXHRcdFx0Y29uc3QgZGF0ZUIgPSB2YWxCIGFzIG51bWJlcjtcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIGRhdGVzIGFyZSBvdmVyZHVlXHJcblx0XHRcdGNvbnN0IGFJc092ZXJkdWUgPSBkYXRlQSA8IG5vdztcclxuXHRcdFx0Y29uc3QgYklzT3ZlcmR1ZSA9IGRhdGVCIDwgbm93O1xyXG5cclxuXHRcdFx0aWYgKGFJc092ZXJkdWUgJiYgYklzT3ZlcmR1ZSkge1xyXG5cdFx0XHRcdC8vIEJvdGggYXJlIG92ZXJkdWUgLSBmb3Igb3ZlcmR1ZSBkYXRlcywgc2hvdyBtb3N0IG92ZXJkdWUgZmlyc3QgKG9sZGVzdCBkYXRlcyBmaXJzdClcclxuXHRcdFx0XHQvLyBTbyB3ZSB3YW50IGVhcmxpZXIgZGF0ZXMgdG8gY29tZSBmaXJzdCwgcmVnYXJkbGVzcyBvZiBhc2MvZGVzYyBvcmRlclxyXG5cdFx0XHRcdGNvbXBhcmlzb24gPSBkYXRlQSAtIGRhdGVCO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGFJc092ZXJkdWUgJiYgIWJJc092ZXJkdWUpIHtcclxuXHRcdFx0XHQvLyBBIGlzIG92ZXJkdWUsIEIgaXMgbm90IC0gb3ZlcmR1ZSB0YXNrcyBzaG91bGQgY29tZSBmaXJzdFxyXG5cdFx0XHRcdGNvbXBhcmlzb24gPSAtMTtcclxuXHRcdFx0fSBlbHNlIGlmICghYUlzT3ZlcmR1ZSAmJiBiSXNPdmVyZHVlKSB7XHJcblx0XHRcdFx0Ly8gQiBpcyBvdmVyZHVlLCBBIGlzIG5vdCAtIG92ZXJkdWUgdGFza3Mgc2hvdWxkIGNvbWUgZmlyc3RcclxuXHRcdFx0XHRjb21wYXJpc29uID0gMTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBCb3RoIGFyZSBmdXR1cmUgZGF0ZXMgLSBub3JtYWwgZGF0ZSBjb21wYXJpc29uXHJcblx0XHRcdFx0Y29tcGFyaXNvbiA9IGRhdGVBIC0gZGF0ZUI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3JkZXIgPT09IFwiYXNjXCIgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XHJcblx0fVxyXG5cclxuXHQvLyBVc2UgZmFjdG9yeSBtZXRob2QgZm9yIHNvcnRpbmdcclxuXHRmb3IgKGNvbnN0IGNyaXRlcmlvbiBvZiBjcml0ZXJpYSkge1xyXG5cdFx0aWYgKGNyaXRlcmlvbi5maWVsZCBpbiBzb3J0RmFjdG9yeSkge1xyXG5cdFx0XHRjb25zdCBzb3J0TWV0aG9kID1cclxuXHRcdFx0XHRzb3J0RmFjdG9yeVtjcml0ZXJpb24uZmllbGQgYXMga2V5b2YgdHlwZW9mIHNvcnRGYWN0b3J5XTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc29ydE1ldGhvZCh0YXNrQSwgdGFza0IsIGNyaXRlcmlvbi5vcmRlcik7XHJcblx0XHRcdGlmIChyZXN1bHQgIT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBNYWludGFpbiBzdGFibGUgb3JkZXIgd2l0aCBsb3dlc3QgcHJpb3JpdHkgdGllLWJyZWFrZXJzOiBmaWxlUGF0aCAtPiBsaW5lIC0+IGxpbmVOdW1iZXIgLT4gaWRcclxuXHRjb25zdCBmaWxlUGF0aEEgPSAodGFza0EgYXMgYW55KS5maWxlUGF0aCA/PyBcIlwiO1xyXG5cdGNvbnN0IGZpbGVQYXRoQiA9ICh0YXNrQiBhcyBhbnkpLmZpbGVQYXRoID8/IFwiXCI7XHJcblx0aWYgKGZpbGVQYXRoQSAhPT0gZmlsZVBhdGhCKSB7XHJcblx0XHRyZXR1cm4gZmlsZVBhdGhBLmxvY2FsZUNvbXBhcmUoZmlsZVBhdGhCKTtcclxuXHR9XHJcblx0aWYgKCh0YXNrQSBhcyBhbnkpLmxpbmUgIT09IHVuZGVmaW5lZCAmJiAodGFza0IgYXMgYW55KS5saW5lICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdHJldHVybiAoKHRhc2tBIGFzIGFueSkubGluZSBhcyBudW1iZXIpIC0gKCh0YXNrQiBhcyBhbnkpLmxpbmUgYXMgbnVtYmVyKTtcclxuXHR9IGVsc2UgaWYgKFxyXG5cdFx0KHRhc2tBIGFzIGFueSkubGluZU51bWJlciAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHQodGFza0IgYXMgYW55KS5saW5lTnVtYmVyICE9PSB1bmRlZmluZWRcclxuXHQpIHtcclxuXHRcdHJldHVybiAoKHRhc2tBIGFzIGFueSkubGluZU51bWJlciBhcyBudW1iZXIpIC0gKCh0YXNrQiBhcyBhbnkpLmxpbmVOdW1iZXIgYXMgbnVtYmVyKTtcclxuXHR9XHJcblx0Ly8gRmluYWwgZmFsbGJhY2sgb24gaWQgZm9yIGRldGVybWluaXN0aWMgb3JkZXJcclxuXHRjb25zdCBpZEEgPSAodGFza0EgYXMgYW55KS5pZCA/PyBcIlwiO1xyXG5cdGNvbnN0IGlkQiA9ICh0YXNrQiBhcyBhbnkpLmlkID8/IFwiXCI7XHJcblx0aWYgKGlkQSAhPT0gaWRCKSByZXR1cm4gaWRBLmxvY2FsZUNvbXBhcmUoaWRCKTtcclxuXHRyZXR1cm4gMDtcclxufVxyXG5cclxuLy8gRmluZCBjb250aW51b3VzIHRhc2sgYmxvY2tzIChpbmNsdWRpbmcgc3VidGFza3MpXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ29udGludW91c1Rhc2tCbG9ja3MoXHJcblx0dGFza3M6IFNvcnRhYmxlVGFza1tdXHJcbik6IFNvcnRhYmxlVGFza1tdW10ge1xyXG5cdGlmICh0YXNrcy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcclxuXHJcblx0Ly8gU29ydCBieSBsaW5lIG51bWJlclxyXG5cdGNvbnN0IHNvcnRlZFRhc2tzID0gWy4uLnRhc2tzXS5zb3J0KChhLCBiKSA9PiBhLmxpbmVOdW1iZXIgLSBiLmxpbmVOdW1iZXIpO1xyXG5cclxuXHQvLyBUYXNrIGJsb2NrcyBhcnJheVxyXG5cdGNvbnN0IGJsb2NrczogU29ydGFibGVUYXNrW11bXSA9IFtdO1xyXG5cdGxldCBjdXJyZW50QmxvY2s6IFNvcnRhYmxlVGFza1tdID0gW3NvcnRlZFRhc2tzWzBdXTtcclxuXHJcblx0Ly8gUmVjdXJzaXZlbHkgZmluZCB0aGUgbWF4aW11bSBsaW5lIG51bWJlciBvZiBhIHRhc2sgYW5kIGFsbCBpdHMgY2hpbGRyZW5cclxuXHRmdW5jdGlvbiBnZXRNYXhMaW5lTnVtYmVyV2l0aENoaWxkcmVuKHRhc2s6IFNvcnRhYmxlVGFzayk6IG51bWJlciB7XHJcblx0XHRpZiAoIXRhc2suY2hpbGRyZW4gfHwgdGFzay5jaGlsZHJlbi5sZW5ndGggPT09IDApXHJcblx0XHRcdHJldHVybiB0YXNrLmxpbmVOdW1iZXI7XHJcblxyXG5cdFx0bGV0IG1heExpbmUgPSB0YXNrLmxpbmVOdW1iZXI7XHJcblx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIHRhc2suY2hpbGRyZW4pIHtcclxuXHRcdFx0Y29uc3QgY2hpbGRNYXhMaW5lID0gZ2V0TWF4TGluZU51bWJlcldpdGhDaGlsZHJlbihjaGlsZCk7XHJcblx0XHRcdG1heExpbmUgPSBNYXRoLm1heChtYXhMaW5lLCBjaGlsZE1heExpbmUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtYXhMaW5lO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgYWxsIHRhc2tzLCBncm91cCBpbnRvIGNvbnRpbnVvdXMgYmxvY2tzXHJcblx0Zm9yIChsZXQgaSA9IDE7IGkgPCBzb3J0ZWRUYXNrcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc3QgcHJldlRhc2sgPSBzb3J0ZWRUYXNrc1tpIC0gMV07XHJcblx0XHRjb25zdCBjdXJyZW50VGFzayA9IHNvcnRlZFRhc2tzW2ldO1xyXG5cclxuXHRcdC8vIENoZWNrIHRoZSBtYXhpbXVtIGxpbmUgbnVtYmVyIG9mIHRoZSBwcmV2aW91cyB0YXNrIChpbmNsdWRpbmcgYWxsIHN1YnRhc2tzKVxyXG5cdFx0Y29uc3QgcHJldk1heExpbmUgPSBnZXRNYXhMaW5lTnVtYmVyV2l0aENoaWxkcmVuKHByZXZUYXNrKTtcclxuXHJcblx0XHQvLyBJZiB0aGUgY3VycmVudCB0YXNrIGxpbmUgbnVtYmVyIGlzIHRoZSBuZXh0IGxpbmUgYWZ0ZXIgdGhlIHByZXZpb3VzIHRhc2sgb3IgaXRzIHN1YnRhc2tzLCBpdCBiZWxvbmdzIHRvIHRoZSBzYW1lIGJsb2NrXHJcblx0XHRpZiAoY3VycmVudFRhc2subGluZU51bWJlciA8PSBwcmV2TWF4TGluZSArIDEpIHtcclxuXHRcdFx0Y3VycmVudEJsb2NrLnB1c2goY3VycmVudFRhc2spO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gT3RoZXJ3aXNlIHN0YXJ0IGEgbmV3IGJsb2NrXHJcblx0XHRcdGJsb2Nrcy5wdXNoKFsuLi5jdXJyZW50QmxvY2tdKTtcclxuXHRcdFx0Y3VycmVudEJsb2NrID0gW2N1cnJlbnRUYXNrXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCB0aGUgbGFzdCBibG9ja1xyXG5cdGlmIChjdXJyZW50QmxvY2subGVuZ3RoID4gMCkge1xyXG5cdFx0YmxvY2tzLnB1c2goY3VycmVudEJsb2NrKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBibG9ja3M7XHJcbn1cclxuXHJcbi8vIEdlbmVyaWMgc29ydGluZyBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgYW55IHRhc2sgb2JqZWN0IHRoYXQgbWF0Y2hlcyB0aGUgc3BlY2lmaWMgY29uZGl0aW9uc1xyXG5leHBvcnQgZnVuY3Rpb24gc29ydFRhc2tzPFxyXG5cdFQgZXh0ZW5kcyB7XHJcblx0XHRjYWxjdWxhdGVkU3RhdHVzPzogc3RyaW5nIHwgU29ydGFibGVUYXNrU3RhdHVzO1xyXG5cdFx0c3RhdHVzPzogc3RyaW5nO1xyXG5cdFx0Y29tcGxldGVkPzogYm9vbGVhbjtcclxuXHRcdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdFx0ZHVlRGF0ZT86IG51bWJlcjtcclxuXHRcdHN0YXJ0RGF0ZT86IG51bWJlcjtcclxuXHRcdHNjaGVkdWxlZERhdGU/OiBudW1iZXI7XHJcblx0XHRjcmVhdGVkRGF0ZT86IG51bWJlcjtcclxuXHRcdGNvbXBsZXRlZERhdGU/OiBudW1iZXI7XHJcblx0XHRjb250ZW50Pzogc3RyaW5nO1xyXG5cdFx0dGFncz86IHN0cmluZ1tdO1xyXG5cdFx0cHJvamVjdD86IHN0cmluZztcclxuXHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHRyZWN1cnJlbmNlPzogc3RyaW5nO1xyXG5cdFx0ZmlsZVBhdGg/OiBzdHJpbmc7XHJcblx0XHRsaW5lPzogbnVtYmVyO1xyXG5cdFx0Y2hpbGRyZW4/OiBhbnlbXTsgLy8gQWNjZXB0IGFueSBjaGlsZHJlbiB0eXBlXHJcblx0fVxyXG4+KFxyXG5cdHRhc2tzOiBUW10sXHJcblx0Y3JpdGVyaWE6IFNvcnRDcml0ZXJpb25bXSxcclxuXHRzZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3NcclxuKTogVFtdIHtcclxuXHRjb25zdCBzdGF0dXNPcmRlciA9IGdldER5bmFtaWNTdGF0dXNPcmRlcihzZXR0aW5ncyk7XHJcblxyXG5cdC8vIEhhbmRsZSBzcGVjaWFsIGNhc2U6IGlmIHRhc2tzIGFyZSBUYXNrIHR5cGUsIGFkZCBjYWxjdWxhdGVkU3RhdHVzIHByb3BlcnR5IHRvIGVhY2ggdGFza1xyXG5cdGNvbnN0IHByZXBhcmVkVGFza3MgPSB0YXNrcy5tYXAoKHRhc2spID0+IHtcclxuXHRcdC8vIElmIGFscmVhZHkgaGFzIGNhbGN1bGF0ZWRTdGF0dXMsIHNraXBcclxuXHRcdGlmICh0YXNrLmNhbGN1bGF0ZWRTdGF0dXMpIHJldHVybiB0YXNrO1xyXG5cclxuXHRcdC8vIE90aGVyd2lzZSwgYWRkIGNhbGN1bGF0ZWRTdGF0dXNcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdGNhbGN1bGF0ZWRTdGF0dXM6IHRhc2suc3RhdHVzIHx8IFwiXCIsXHJcblx0XHR9O1xyXG5cdH0pO1xyXG5cclxuXHRwcmVwYXJlZFRhc2tzLnNvcnQoKGEsIGIpID0+IGNvbXBhcmVUYXNrcyhhLCBiLCBjcml0ZXJpYSwgc3RhdHVzT3JkZXIpKTtcclxuXHJcblx0cmV0dXJuIHByZXBhcmVkVGFza3MgYXMgVFtdOyAvLyBUeXBlIGFzc2VydGlvbiBiYWNrIHRvIG9yaWdpbmFsIHR5cGVcclxufVxyXG5cclxuLy8gUmVjdXJzaXZlbHkgc29ydCB0YXNrcyBhbmQgdGhlaXIgc3VidGFza3NcclxuZnVuY3Rpb24gc29ydFRhc2tzUmVjdXJzaXZlbHkoXHJcblx0dGFza3M6IFNvcnRhYmxlVGFza1tdLFxyXG5cdGNyaXRlcmlhOiBTb3J0Q3JpdGVyaW9uW10sXHJcblx0c2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzXHJcbik6IFNvcnRhYmxlVGFza1tdIHtcclxuXHRjb25zdCBzdGF0dXNPcmRlciA9IGdldER5bmFtaWNTdGF0dXNPcmRlcihzZXR0aW5ncyk7XHJcblx0Ly8gU29ydCB0YXNrcyBhdCB0aGUgY3VycmVudCBsZXZlbFxyXG5cdHRhc2tzLnNvcnQoKGEsIGIpID0+IGNvbXBhcmVUYXNrcyhhLCBiLCBjcml0ZXJpYSwgc3RhdHVzT3JkZXIpKTtcclxuXHJcblx0Ly8gUmVjdXJzaXZlbHkgc29ydCBlYWNoIHRhc2sncyBzdWJ0YXNrc1xyXG5cdGZvciAoY29uc3QgdGFzayBvZiB0YXNrcykge1xyXG5cdFx0aWYgKHRhc2suY2hpbGRyZW4gJiYgdGFzay5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdC8vIEVuc3VyZSBzb3J0ZWQgc3VidGFza3MgYXJlIHNhdmVkIGJhY2sgdG8gdGFzay5jaGlsZHJlblxyXG5cdFx0XHR0YXNrLmNoaWxkcmVuID0gc29ydFRhc2tzUmVjdXJzaXZlbHkoXHJcblx0XHRcdFx0dGFzay5jaGlsZHJlbixcclxuXHRcdFx0XHRjcml0ZXJpYSxcclxuXHRcdFx0XHRzZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRhc2tzOyAvLyBSZXR1cm4gdGhlIHNvcnRlZCB0YXNrIGFycmF5XHJcbn1cclxuXHJcbi8vIE1haW4gZnVuY3Rpb246IFBhcnNlcywgc29ydHMsIGFuZCBnZW5lcmF0ZXMgQ29kZW1pcnJvciBjaGFuZ2VzXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0VGFza3NJbkRvY3VtZW50KFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0ZnVsbERvY3VtZW50OiBib29sZWFuID0gZmFsc2VcclxuKTogc3RyaW5nIHwgbnVsbCB7XHJcblx0Y29uc3QgYXBwID0gcGx1Z2luLmFwcDtcclxuXHRjb25zdCBhY3RpdmVGaWxlID0gYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7IC8vIEFzc3VtZSBjb21tYW5kIHJ1bnMgb24gYWN0aXZlIGZpbGVcclxuXHRpZiAoIWFjdGl2ZUZpbGUpIHtcclxuXHRcdG5ldyBOb3RpY2UoXCJTb3J0IFRhc2tzOiBObyBhY3RpdmUgZmlsZSBmb3VuZC5cIik7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblx0Y29uc3QgZmlsZVBhdGggPSBhY3RpdmVGaWxlLnBhdGg7IC8vIEdldCBmaWxlIHBhdGhcclxuXHRjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhY3RpdmVGaWxlKTtcclxuXHRpZiAoIWNhY2hlKSB7XHJcblx0XHRuZXcgTm90aWNlKFwiU29ydCBUYXNrczogTWV0YWRhdGEgY2FjaGUgbm90IGF2YWlsYWJsZS5cIik7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGRvYyA9IHZpZXcuc3RhdGUuZG9jO1xyXG5cdGNvbnN0IHNldHRpbmdzID0gcGx1Z2luLnNldHRpbmdzO1xyXG5cdGNvbnN0IG1ldGFkYXRhRm9ybWF0OiBNZXRhZGF0YUZvcm1hdCA9IHNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0O1xyXG5cclxuXHQvLyAtLS0gR2V0IHNvcnRDcml0ZXJpYSBmcm9tIHNldHRpbmdzIC0tLVxyXG5cdGNvbnN0IHNvcnRDcml0ZXJpYSA9IHNldHRpbmdzLnNvcnRDcml0ZXJpYSB8fCBERUZBVUxUX1NFVFRJTkdTLnNvcnRDcml0ZXJpYTsgLy8gR2V0IGZyb20gc2V0dGluZ3MsIHVzZSBkZWZhdWx0IGlmIG1pc3NpbmdcclxuXHRpZiAoIXNldHRpbmdzLnNvcnRUYXNrcyB8fCAhc29ydENyaXRlcmlhIHx8IHNvcnRDcml0ZXJpYS5sZW5ndGggPT09IDApIHtcclxuXHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJUYXNrIHNvcnRpbmcgaXMgZGlzYWJsZWQgb3Igbm8gc29ydCBjcml0ZXJpYSBhcmUgZGVmaW5lZCBpbiBzZXR0aW5ncy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIG51bGw7IC8vIEV4aXQgaWYgc29ydGluZyBpcyBkaXNhYmxlZCBvciBubyBjcml0ZXJpYVxyXG5cdH1cclxuXHJcblx0bGV0IHN0YXJ0TGluZSA9IDA7XHJcblx0bGV0IGVuZExpbmUgPSBkb2MubGluZXMgLSAxO1xyXG5cdGxldCBzY29wZU1lc3NhZ2UgPSBcImZ1bGwgZG9jdW1lbnRcIjsgLy8gRm9yIGxvZ2dpbmdcclxuXHJcblx0aWYgKCFmdWxsRG9jdW1lbnQpIHtcclxuXHRcdGNvbnN0IGN1cnNvciA9IHZpZXcuc3RhdGUuc2VsZWN0aW9uLm1haW4uaGVhZDtcclxuXHRcdGNvbnN0IGN1cnNvckxpbmUgPSBkb2MubGluZUF0KGN1cnNvcikubnVtYmVyIC0gMTsgLy8gMC1iYXNlZFxyXG5cclxuXHRcdC8vIFRyeSB0byBmaW5kIHNjb3BlIGJhc2VkIG9uIGN1cnNvciBwb3NpdGlvbiAoaGVhZGluZyBvciBkb2N1bWVudClcclxuXHRcdGNvbnN0IGhlYWRpbmdzID0gY2FjaGUuaGVhZGluZ3MgfHwgW107XHJcblx0XHRsZXQgY29udGFpbmluZ0hlYWRpbmcgPSBudWxsO1xyXG5cdFx0bGV0IG5leHRIZWFkaW5nTGluZSA9IGRvYy5saW5lczsgLy8gRGVmYXVsdCB0byBlbmQgb2YgZG9jXHJcblxyXG5cdFx0Ly8gRmluZCB0aGUgaGVhZGluZyB0aGUgY3Vyc29yIGlzIGN1cnJlbnRseSBpblxyXG5cdFx0Zm9yIChsZXQgaSA9IGhlYWRpbmdzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdGlmIChoZWFkaW5nc1tpXS5wb3NpdGlvbi5zdGFydC5saW5lIDw9IGN1cnNvckxpbmUpIHtcclxuXHRcdFx0XHRjb250YWluaW5nSGVhZGluZyA9IGhlYWRpbmdzW2ldO1xyXG5cdFx0XHRcdHN0YXJ0TGluZSA9IGNvbnRhaW5pbmdIZWFkaW5nLnBvc2l0aW9uLnN0YXJ0LmxpbmU7IC8vIFN0YXJ0IGZyb20gaGVhZGluZyBsaW5lXHJcblxyXG5cdFx0XHRcdC8vIEZpbmQgdGhlIGxpbmUgbnVtYmVyIG9mIHRoZSBuZXh0IGhlYWRpbmcgYXQgdGhlIHNhbWUgb3IgbG93ZXIgbGV2ZWxcclxuXHRcdFx0XHRmb3IgKGxldCBqID0gaSArIDE7IGogPCBoZWFkaW5ncy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0aWYgKGhlYWRpbmdzW2pdLmxldmVsIDw9IGNvbnRhaW5pbmdIZWFkaW5nLmxldmVsKSB7XHJcblx0XHRcdFx0XHRcdG5leHRIZWFkaW5nTGluZSA9IGhlYWRpbmdzW2pdLnBvc2l0aW9uLnN0YXJ0LmxpbmU7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzY29wZU1lc3NhZ2UgPSBgaGVhZGluZyBzZWN0aW9uIFwiJHtjb250YWluaW5nSGVhZGluZy5oZWFkaW5nfVwiYDtcclxuXHRcdFx0XHRicmVhazsgLy8gRm91bmQgdGhlIGNvbnRhaW5pbmcgaGVhZGluZ1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHRoZSBlbmRMaW5lIGZvciB0aGUgc2VjdGlvblxyXG5cdFx0aWYgKGNvbnRhaW5pbmdIZWFkaW5nKSB7XHJcblx0XHRcdGVuZExpbmUgPSBuZXh0SGVhZGluZ0xpbmUgLSAxOyAvLyBFbmQgYmVmb3JlIHRoZSBuZXh0IGhlYWRpbmdcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEN1cnNvciBpcyBub3QgdW5kZXIgYW55IGhlYWRpbmcsIHNvcnQgdGhlIHdob2xlIGRvY3VtZW50XHJcblx0XHRcdHN0YXJ0TGluZSA9IDA7XHJcblx0XHRcdGVuZExpbmUgPSBkb2MubGluZXMgLSAxO1xyXG5cdFx0XHRzY29wZU1lc3NhZ2UgPSBcImZ1bGwgZG9jdW1lbnQgKGN1cnNvciBub3QgaW4gaGVhZGluZylcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgZW5kTGluZSBpcyBub3QgbGVzcyB0aGFuIHN0YXJ0TGluZSAoZS5nLiwgZW1wdHkgaGVhZGluZyBzZWN0aW9uKVxyXG5cdFx0aWYgKGVuZExpbmUgPCBzdGFydExpbmUpIHtcclxuXHRcdFx0ZW5kTGluZSA9IHN0YXJ0TGluZTtcclxuXHRcdH1cclxuXHR9IGVsc2Uge1xyXG5cdFx0Ly8gZnVsbERvY3VtZW50IGlzIHRydWUsIHJhbmdlIGlzIGFscmVhZHkgc2V0ICgwIHRvIGRvYy5saW5lcyAtIDEpXHJcblx0XHRzY29wZU1lc3NhZ2UgPSBcImZ1bGwgZG9jdW1lbnQgKGZvcmNlZClcIjtcclxuXHR9XHJcblxyXG5cdC8vIEdldCB0aGUgdGV4dCBjb250ZW50IG9mIHRoZSBkZXRlcm1pbmVkIGJsb2NrXHJcblx0Y29uc3QgZnJvbU9mZnNldE9yaWdpbmFsID0gZG9jLmxpbmUoc3RhcnRMaW5lICsgMSkuZnJvbTsgLy8gMS1iYXNlZCBmb3IgZG9jLmxpbmVcclxuXHRjb25zdCB0b09mZnNldE9yaWdpbmFsID0gZG9jLmxpbmUoZW5kTGluZSArIDEpLnRvO1xyXG5cdC8vIEVuc3VyZSBvZmZzZXRzIGFyZSB2YWxpZFxyXG5cdGlmIChmcm9tT2Zmc2V0T3JpZ2luYWwgPiB0b09mZnNldE9yaWdpbmFsKSB7XHJcblx0XHRuZXcgTm90aWNlKGBTb3J0IFRhc2tzOiBJbnZhbGlkIHJhbmdlIGNhbGN1bGF0ZWQgZm9yICR7c2NvcGVNZXNzYWdlfS5gKTtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHRjb25zdCBvcmlnaW5hbEJsb2NrVGV4dCA9IGRvYy5zbGljZVN0cmluZyhcclxuXHRcdGZyb21PZmZzZXRPcmlnaW5hbCxcclxuXHRcdHRvT2Zmc2V0T3JpZ2luYWxcclxuXHQpO1xyXG5cclxuXHQvLyAxLiBQYXJzZSB0YXNrcyAqdXNpbmcgdGhlIG5ldyBmdW5jdGlvbiosIHByb3ZpZGluZyBvZmZzZXQsIHBhdGgsIGFuZCBmb3JtYXRcclxuXHRjb25zdCBibG9ja1Rhc2tzID0gcGFyc2VUYXNrc0ZvclNvcnRpbmcoXHJcblx0XHRvcmlnaW5hbEJsb2NrVGV4dCxcclxuXHRcdHN0YXJ0TGluZSxcclxuXHRcdGZpbGVQYXRoLFxyXG5cdFx0bWV0YWRhdGFGb3JtYXQsIC8vIFBhc3MgZGV0ZXJtaW5lZCBmb3JtYXRcclxuXHRcdHBsdWdpbiAvLyBQYXNzIHBsdWdpbiBmb3IgY29uZmlndXJhYmxlIHByZWZpeCBzdXBwb3J0XHJcblx0KTtcclxuXHRpZiAoYmxvY2tUYXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdGNvbnN0IG5vdGljZU1zZyA9IGBTb3J0IFRhc2tzOiBObyB0YXNrcyBmb3VuZCBpbiB0aGUgJHtzY29wZU1lc3NhZ2V9IChMaW5lcyAke1xyXG5cdFx0XHRzdGFydExpbmUgKyAxXHJcblx0XHR9LSR7ZW5kTGluZSArIDF9KSB0byBzb3J0LmA7XHJcblx0XHRuZXcgTm90aWNlKG5vdGljZU1zZyk7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8vIEZpbmQgY29udGludW91cyB0YXNrIGJsb2Nrc1xyXG5cdGNvbnN0IHRhc2tCbG9ja3MgPSBmaW5kQ29udGludW91c1Rhc2tCbG9ja3MoYmxvY2tUYXNrcyk7XHJcblxyXG5cdC8vIDIuIFNvcnQgZWFjaCBjb250aW51b3VzIGJsb2NrIHNlcGFyYXRlbHlcclxuXHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tCbG9ja3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdC8vIFJlcGxhY2UgdGFza3MgaW4gdGhlIG9yaWdpbmFsIGJsb2NrIHdpdGggc29ydGVkIHRhc2tzXHJcblx0XHQvLyBQYXNzIHRoZSBjcml0ZXJpYSBmZXRjaGVkIGZyb20gc2V0dGluZ3NcclxuXHRcdHRhc2tCbG9ja3NbaV0gPSBzb3J0VGFza3NSZWN1cnNpdmVseShcclxuXHRcdFx0dGFza0Jsb2Nrc1tpXSxcclxuXHRcdFx0c29ydENyaXRlcmlhLCAvLyBVc2UgY3JpdGVyaWEgZnJvbSBzZXR0aW5nc1xyXG5cdFx0XHRzZXR0aW5nc1xyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIDMuIFVwZGF0ZSB0aGUgb3JpZ2luYWwgYmxvY2tUYXNrcyB0byByZWZsZWN0IHNvcnRpbmcgcmVzdWx0c1xyXG5cdC8vIENsZWFyIHRoZSBvcmlnaW5hbCBibG9ja1Rhc2tzXHJcblx0YmxvY2tUYXNrcy5sZW5ndGggPSAwO1xyXG5cclxuXHQvLyBNZXJnZSBhbGwgc29ydGVkIGJsb2NrcyBiYWNrIGludG8gYmxvY2tUYXNrc1xyXG5cdGZvciAoY29uc3QgYmxvY2sgb2YgdGFza0Jsb2Nrcykge1xyXG5cdFx0Zm9yIChjb25zdCB0YXNrIG9mIGJsb2NrKSB7XHJcblx0XHRcdGJsb2NrVGFza3MucHVzaCh0YXNrKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIDQuIFJlYnVpbGQgdGV4dCBkaXJlY3RseSBmcm9tIHNvcnRlZCBibG9ja1Rhc2tzXHJcblx0Y29uc3Qgb3JpZ2luYWxCbG9ja0xpbmVzID0gb3JpZ2luYWxCbG9ja1RleHQuc3BsaXQoXCJcXG5cIik7XHJcblx0bGV0IG5ld0Jsb2NrTGluZXM6IHN0cmluZ1tdID0gWy4uLm9yaWdpbmFsQmxvY2tMaW5lc107IC8vIENvcHkgb3JpZ2luYWwgbGluZXNcclxuXHRjb25zdCBwcm9jZXNzZWRMaW5lSW5kaWNlcyA9IG5ldyBTZXQ8bnVtYmVyPigpOyAvLyBUcmFjayBwcm9jZXNzZWQgbGluZSBpbmRpY2VzXHJcblxyXG5cdC8vIEZpbmQgaW5kaWNlcyBvZiBhbGwgdGFzayBsaW5lc1xyXG5cdGNvbnN0IHRhc2tMaW5lSW5kaWNlcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdGZvciAoY29uc3QgdGFzayBvZiBibG9ja1Rhc2tzKSB7XHJcblx0XHQvLyBDb252ZXJ0IHRvIGluZGV4IHJlbGF0aXZlIHRvIGJsb2NrXHJcblx0XHRjb25zdCByZWxhdGl2ZUluZGV4ID0gdGFzay5saW5lTnVtYmVyIC0gc3RhcnRMaW5lO1xyXG5cdFx0aWYgKHJlbGF0aXZlSW5kZXggPj0gMCAmJiByZWxhdGl2ZUluZGV4IDwgb3JpZ2luYWxCbG9ja0xpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHR0YXNrTGluZUluZGljZXMuYWRkKHJlbGF0aXZlSW5kZXgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gRm9yIGVhY2ggdGFzayBibG9jaywgZmluZCBpdHMgc3RhcnRpbmcgcG9zaXRpb24gYW5kIHNvcnQgdGFza3MgYXQgdGhhdCBwb3NpdGlvblxyXG5cdGZvciAoY29uc3QgYmxvY2sgb2YgdGFza0Jsb2Nrcykge1xyXG5cdFx0Ly8gRmluZCB0aGUgbWluaW11bSBsaW5lIG51bWJlciAocmVsYXRpdmUgdG8gYmxvY2spXHJcblx0XHRsZXQgbWluUmVsYXRpdmVMaW5lSW5kZXggPSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdGZvciAoY29uc3QgdGFzayBvZiBibG9jaykge1xyXG5cdFx0XHRjb25zdCByZWxhdGl2ZUluZGV4ID0gdGFzay5saW5lTnVtYmVyIC0gc3RhcnRMaW5lO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0cmVsYXRpdmVJbmRleCA+PSAwICYmXHJcblx0XHRcdFx0cmVsYXRpdmVJbmRleCA8IG9yaWdpbmFsQmxvY2tMaW5lcy5sZW5ndGggJiZcclxuXHRcdFx0XHRyZWxhdGl2ZUluZGV4IDwgbWluUmVsYXRpdmVMaW5lSW5kZXhcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bWluUmVsYXRpdmVMaW5lSW5kZXggPSByZWxhdGl2ZUluZGV4O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKG1pblJlbGF0aXZlTGluZUluZGV4ID09PSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikge1xyXG5cdFx0XHRjb250aW51ZTsgLy8gU2tpcCBpbnZhbGlkIGJsb2Nrc1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbGxlY3QgYWxsIHRhc2sgbGluZSBjb250ZW50IGluIHRoaXMgYmxvY2tcclxuXHRcdGNvbnN0IGJsb2NrQ29udGVudDogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHQvLyBSZWN1cnNpdmVseSBhZGQgdGFza3MgYW5kIHRoZWlyIHN1YnRhc2tzXHJcblx0XHRmdW5jdGlvbiBhZGRTb3J0ZWRUYXNrQ29udGVudCh0YXNrOiBTb3J0YWJsZVRhc2spIHtcclxuXHRcdFx0YmxvY2tDb250ZW50LnB1c2godGFzay5vcmlnaW5hbE1hcmtkb3duKTtcclxuXHJcblx0XHRcdC8vIE1hcmsgdGhpcyBsaW5lIGFzIHByb2Nlc3NlZFxyXG5cdFx0XHRjb25zdCByZWxhdGl2ZUluZGV4ID0gdGFzay5saW5lTnVtYmVyIC0gc3RhcnRMaW5lO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0cmVsYXRpdmVJbmRleCA+PSAwICYmXHJcblx0XHRcdFx0cmVsYXRpdmVJbmRleCA8IG9yaWdpbmFsQmxvY2tMaW5lcy5sZW5ndGhcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cHJvY2Vzc2VkTGluZUluZGljZXMuYWRkKHJlbGF0aXZlSW5kZXgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQcm9jZXNzIHN1YnRhc2tzXHJcblx0XHRcdGlmICh0YXNrLmNoaWxkcmVuICYmIHRhc2suY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2YgdGFzay5jaGlsZHJlbikge1xyXG5cdFx0XHRcdFx0YWRkU29ydGVkVGFza0NvbnRlbnQoY2hpbGQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9ubHkgcHJvY2VzcyB0b3AtbGV2ZWwgdGFza3NcclxuXHRcdGZvciAoY29uc3QgdGFzayBvZiBibG9jaykge1xyXG5cdFx0XHRpZiAoIXRhc2sucGFyZW50KSB7XHJcblx0XHRcdFx0Ly8gT25seSBwcm9jZXNzIHRvcC1sZXZlbCB0YXNrc1xyXG5cdFx0XHRcdGFkZFNvcnRlZFRhc2tDb250ZW50KHRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSBjb250ZW50IGF0IG9yaWdpbmFsIHBvc2l0aW9uXHJcblx0XHRsZXQgY3VycmVudExpbmUgPSBtaW5SZWxhdGl2ZUxpbmVJbmRleDtcclxuXHRcdGZvciAoY29uc3QgbGluZSBvZiBibG9ja0NvbnRlbnQpIHtcclxuXHRcdFx0bmV3QmxvY2tMaW5lc1tjdXJyZW50TGluZSsrXSA9IGxpbmU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBSZW1vdmUgcHJvY2Vzc2VkIGxpbmVzIChyZXBsYWNlZCB0YXNrIGxpbmVzKVxyXG5cdGNvbnN0IGZpbmFsTGluZXM6IHN0cmluZ1tdID0gW107XHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBuZXdCbG9ja0xpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRpZiAoIXRhc2tMaW5lSW5kaWNlcy5oYXMoaSkgfHwgcHJvY2Vzc2VkTGluZUluZGljZXMuaGFzKGkpKSB7XHJcblx0XHRcdGZpbmFsTGluZXMucHVzaChuZXdCbG9ja0xpbmVzW2ldKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNvbnN0IG5ld0Jsb2NrVGV4dCA9IGZpbmFsTGluZXMuam9pbihcIlxcblwiKTtcclxuXHJcblx0Ly8gNS4gT25seSByZXR1cm4gbmV3IHRleHQgaWYgdGhlIGJsb2NrIGFjdHVhbGx5IGNoYW5nZWRcclxuXHRpZiAob3JpZ2luYWxCbG9ja1RleHQgPT09IG5ld0Jsb2NrVGV4dCkge1xyXG5cdFx0Y29uc3Qgbm90aWNlTXNnID0gYFNvcnQgVGFza3M6IFRhc2tzIGFyZSBhbHJlYWR5IHNvcnRlZCBpbiB0aGUgJHtzY29wZU1lc3NhZ2V9IChMaW5lcyAke1xyXG5cdFx0XHRzdGFydExpbmUgKyAxXHJcblx0XHR9LSR7ZW5kTGluZSArIDF9KS5gO1xyXG5cdFx0bmV3IE5vdGljZShub3RpY2VNc2cpO1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRjb25zdCBub3RpY2VNc2cgPSBgU29ydCBUYXNrczogU29ydGVkIHRhc2tzIGluIHRoZSAke3Njb3BlTWVzc2FnZX0gKExpbmVzICR7XHJcblx0XHRzdGFydExpbmUgKyAxXHJcblx0fS0ke2VuZExpbmUgKyAxfSkuYDtcclxuXHRuZXcgTm90aWNlKG5vdGljZU1zZyk7XHJcblxyXG5cdC8vIERpcmVjdGx5IHJldHVybiB0aGUgY2hhbmdlZCB0ZXh0XHJcblx0cmV0dXJuIG5ld0Jsb2NrVGV4dDtcclxufVxyXG4iXX0=