import { __awaiter } from "tslib";
import { FuzzySuggestModal, TFile, Notice, SuggestModal, moment, } from "obsidian";
import { buildIndentString, getTabSize } from "../utils";
import { t } from "../translations/helper";
/**
 * Shared utilities for task manipulation
 */
export class TaskUtils {
    // Get indentation of a line
    static getIndentation(line, app) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
    // Get tab size from app
    static getTabSize(app) {
        return getTabSize(app);
    }
    // Process custom marker with date variables
    static processCustomMarker(marker) {
        // Return empty string if marker is undefined or null
        if (!marker)
            return "";
        // Replace {{DATE:format}} with formatted date
        return marker.replace(/\{\{DATE:([^}]+)\}\}/g, (match, format) => {
            return moment().format(format);
        });
    }
    // Process date marker with {{date}} placeholder
    static processDateMarker(marker) {
        // Return empty string if marker is undefined or null
        if (!marker)
            return "";
        return marker.replace(/\{\{date\}\}/g, () => {
            return moment().format("YYYY-MM-DD");
        });
    }
    // Add marker to task (version, date, or custom)
    static addMarkerToTask(taskLine, settings, currentFile, app, isRoot = false) {
        var _a;
        const { taskMarkerType, versionMarker, dateMarker, customMarker, withCurrentFileLink, } = settings.completedTaskMover;
        // Extract blockid if exists
        const blockidMatch = taskLine.match(/^(.*?)(?:\s+^[a-zA-Z0-9]{6}$)?$/);
        if (!blockidMatch)
            return taskLine;
        const mainContent = blockidMatch[1].trimEnd();
        const blockid = (_a = blockidMatch[2]) === null || _a === void 0 ? void 0 : _a.trim();
        // Create base task line with marker
        let markedTaskLine = mainContent;
        // Basic check to ensure the task line doesn't already have this marker
        if (!(versionMarker && mainContent.includes(versionMarker)) &&
            !(dateMarker && mainContent.includes(dateMarker)) &&
            !mainContent.includes(this.processCustomMarker(customMarker))) {
            switch (taskMarkerType) {
                case "version":
                    if (versionMarker) {
                        markedTaskLine = `${mainContent} ${versionMarker}`;
                    }
                    break;
                case "date":
                    const processedDateMarker = this.processDateMarker(dateMarker);
                    if (processedDateMarker) {
                        markedTaskLine = `${mainContent} ${processedDateMarker}`;
                    }
                    break;
                case "custom":
                    const processedCustomMarker = this.processCustomMarker(customMarker);
                    if (processedCustomMarker) {
                        markedTaskLine = `${mainContent} ${processedCustomMarker}`;
                    }
                    break;
                default:
                    markedTaskLine = mainContent;
            }
        }
        // Add link to the current file if setting is enabled and this is a root task
        if (withCurrentFileLink && isRoot) {
            const link = app.fileManager.generateMarkdownLink(currentFile, currentFile.path);
            markedTaskLine = `${markedTaskLine} from ${link}`;
        }
        // Add back the blockid if it exists
        if (blockid) {
            markedTaskLine = `${markedTaskLine} ${blockid}`;
        }
        return markedTaskLine;
    }
    // Add marker to incomplete task (version, date, or custom)
    static addMarkerToIncompletedTask(taskLine, settings, currentFile, app, isRoot = false) {
        var _a;
        const { incompletedTaskMarkerType, incompletedVersionMarker, incompletedDateMarker, incompletedCustomMarker, withCurrentFileLinkForIncompleted, } = settings.completedTaskMover;
        // Extract blockid if exists
        const blockidMatch = taskLine.match(/^(.*?)(?:\s+^[a-zA-Z0-9]{6}$)?$/);
        if (!blockidMatch)
            return taskLine;
        const mainContent = blockidMatch[1].trimEnd();
        const blockid = (_a = blockidMatch[2]) === null || _a === void 0 ? void 0 : _a.trim();
        // Create base task line with marker
        let markedTaskLine = mainContent;
        // Basic check to ensure the task line doesn't already have this marker
        if (!(incompletedVersionMarker &&
            mainContent.includes(incompletedVersionMarker)) &&
            !(incompletedDateMarker &&
                mainContent.includes(incompletedDateMarker)) &&
            !mainContent.includes(this.processCustomMarker(incompletedCustomMarker))) {
            switch (incompletedTaskMarkerType) {
                case "version":
                    if (incompletedVersionMarker) {
                        markedTaskLine = `${mainContent} ${incompletedVersionMarker}`;
                    }
                    break;
                case "date":
                    const processedDateMarker = this.processDateMarker(incompletedDateMarker);
                    if (processedDateMarker) {
                        markedTaskLine = `${mainContent} ${processedDateMarker}`;
                    }
                    break;
                case "custom":
                    const processedCustomMarker = this.processCustomMarker(incompletedCustomMarker);
                    if (processedCustomMarker) {
                        markedTaskLine = `${mainContent} ${processedCustomMarker}`;
                    }
                    break;
                default:
                    markedTaskLine = mainContent;
            }
        }
        // Add link to the current file if setting is enabled and this is a root task
        if (withCurrentFileLinkForIncompleted && isRoot) {
            const link = app.fileManager.generateMarkdownLink(currentFile, currentFile.path);
            markedTaskLine = `${markedTaskLine} from ${link}`;
        }
        // Add back the blockid if it exists
        if (blockid) {
            markedTaskLine = `${markedTaskLine} ${blockid}`;
        }
        return markedTaskLine;
    }
    // Check if a task mark represents a completed task
    static isCompletedTaskMark(mark, settings) {
        var _a, _b;
        const completedMarks = ((_a = settings.taskStatuses.completed) === null || _a === void 0 ? void 0 : _a.split("|")) || [
            "x",
            "X",
        ];
        // If treatAbandonedAsCompleted is enabled, also consider abandoned tasks as completed
        if (settings.completedTaskMover.treatAbandonedAsCompleted) {
            const abandonedMarks = ((_b = settings.taskStatuses.abandoned) === null || _b === void 0 ? void 0 : _b.split("|")) || ["-"];
            return (completedMarks.includes(mark) || abandonedMarks.includes(mark));
        }
        return completedMarks.includes(mark);
    }
    // Check if a task mark represents an incomplete task
    static isIncompletedTaskMark(mark, settings) {
        var _a, _b;
        const completedMarks = ((_a = settings.taskStatuses.completed) === null || _a === void 0 ? void 0 : _a.split("|")) || [
            "x",
            "X",
        ];
        // If treatAbandonedAsCompleted is enabled, also consider abandoned tasks as completed
        let abandonedMarks = [];
        if (settings.completedTaskMover.treatAbandonedAsCompleted) {
            abandonedMarks = ((_b = settings.taskStatuses.abandoned) === null || _b === void 0 ? void 0 : _b.split("|")) || [
                "-",
            ];
        }
        // A task is incomplete if it's not completed and not abandoned (when treated as completed)
        return !completedMarks.includes(mark) && !abandonedMarks.includes(mark);
    }
    // Complete tasks if the setting is enabled
    static completeTaskIfNeeded(taskLine, settings) {
        var _a;
        // If completeAllMovedTasks is not enabled, return the original line
        if (!settings.completedTaskMover.completeAllMovedTasks) {
            return taskLine;
        }
        // Check if it's a task line with checkbox
        const taskMatch = taskLine.match(/^(\s*(?:-|\d+\.|\*)\s+\[)(.)(].*)$/);
        if (!taskMatch) {
            return taskLine; // Not a task line, return as is
        }
        // Get the completion symbol (first character in completed status)
        const completedMark = ((_a = settings.taskStatuses.completed) === null || _a === void 0 ? void 0 : _a.split("|")[0]) || "x";
        // Replace the current mark with the completed mark
        return `${taskMatch[1]}${completedMark}${taskMatch[3]}`;
    }
    // Reset indentation for new files
    static resetIndentation(content, app) {
        const lines = content.split("\n");
        // Find the minimum indentation in all lines
        let minIndent = Number.MAX_SAFE_INTEGER;
        for (const line of lines) {
            if (line.trim().length === 0)
                continue; // Skip empty lines
            const indent = this.getIndentation(line, app);
            minIndent = Math.min(minIndent, indent);
        }
        // If no valid minimum found, or it's already 0, return as is
        if (minIndent === Number.MAX_SAFE_INTEGER || minIndent === 0) {
            return content;
        }
        // Remove the minimum indentation from each line
        return lines
            .map((line) => {
            if (line.trim().length === 0)
                return line; // Keep empty lines unchanged
            return line.substring(minIndent);
        })
            .join("\n");
    }
    // Find the parent task index for a given task
    static findParentTaskIndex(taskIndex, taskIndent, allTasks) {
        // Look for the closest task with one level less indentation
        for (let i = allTasks.findIndex((t) => t.index === taskIndex) - 1; i >= 0; i--) {
            if (allTasks[i].indent < taskIndent) {
                return allTasks[i].index;
            }
        }
        return -1;
    }
    // Adjust indentation for target files
    // Adjust indentation for target files
    static adjustIndentation(taskContent, targetIndent, app) {
        const lines = taskContent.split("\n");
        // Get the indentation of the first line (parent task)
        const firstLineIndent = this.getIndentation(lines[0], app);
        // Calculate the indentation difference
        const indentDiff = targetIndent - firstLineIndent;
        if (indentDiff === 0) {
            return taskContent;
        }
        // Adjust indentation for all lines, maintaining relative hierarchy
        return lines
            .map((line, index) => {
            const currentIndent = this.getIndentation(line, app);
            // For the first line (parent task), set exactly to targetIndent
            if (index === 0) {
                return (buildIndentString(app).repeat(targetIndent) +
                    line.substring(currentIndent));
            }
            // For child tasks, maintain relative indentation difference from parent
            // Calculate relative indent level compared to the parent task
            const relativeIndent = currentIndent - firstLineIndent;
            // Apply the new base indentation plus the relative indent
            const newIndent = Math.max(0, targetIndent + relativeIndent);
            return (buildIndentString(app).repeat(newIndent / getTabSize(app)) +
                line.trimStart());
        })
            .join("\n");
    }
    // Process tasks from multiple selected lines
    static processSelectedTasks(editor, taskLines, moveMode, settings, currentFile, app, isSourceFile = true) {
        // Sort task lines in descending order to process bottom-up
        const sortedTaskLines = [...taskLines].sort((a, b) => b - a);
        // Use Sets to avoid duplicates for lines to remove and content to copy
        const linesToRemoveSet = new Set();
        const contentMap = new Map();
        // First pass: collect all lines to remove and content to copy
        for (const taskLine of sortedTaskLines) {
            const result = this.processSingleSelectedTask(editor, taskLine, moveMode, settings, currentFile, app, isSourceFile);
            // Store content lines for this task
            contentMap.set(taskLine, result.content.split("\n"));
            // Add lines to remove to the set
            result.linesToRemove.forEach((line) => linesToRemoveSet.add(line));
        }
        // Second pass: build the final content by properly ordering task content
        // Sort tasks from top to bottom for content ordering
        const orderedTaskLines = [...taskLines].sort((a, b) => a - b);
        const allResultLines = [];
        // Process each task in order (top to bottom)
        for (let i = 0; i < orderedTaskLines.length; i++) {
            const taskLine = orderedTaskLines[i];
            // Skip if this task is contained within another task's removal range
            if (orderedTaskLines.some((otherLine) => {
                if (otherLine === taskLine)
                    return false;
                const content = editor.getValue();
                const lines = content.split("\n");
                const otherIndent = this.getIndentation(lines[otherLine], app);
                const taskIndent = this.getIndentation(lines[taskLine], app);
                // Check if this task is a subtask of another selected task
                return (taskLine > otherLine &&
                    taskIndent > otherIndent &&
                    !orderedTaskLines.some((line) => line > otherLine &&
                        line < taskLine &&
                        this.getIndentation(lines[line], app) <=
                            otherIndent));
            })) {
                continue;
            }
            // Add a blank line between task groups if not the first task
            if (allResultLines.length > 0) {
                allResultLines.push("");
            }
            // Add the content for this task
            const taskContent = contentMap.get(taskLine);
            if (taskContent) {
                allResultLines.push(...taskContent);
            }
        }
        // Convert the set to an array
        const allLinesToRemove = Array.from(linesToRemoveSet);
        return {
            content: allResultLines
                .filter((line) => line.trim() !== "")
                .join("\n"),
            linesToRemove: allLinesToRemove,
        };
    }
    // Process a single selected task
    static processSingleSelectedTask(editor, taskLine, moveMode, settings, currentFile, app, isSourceFile = true) {
        const content = editor.getValue();
        const lines = content.split("\n");
        const resultLines = [];
        const linesToRemove = [];
        // Get the current task line
        const currentLine = lines[taskLine];
        // Check if the current line is actually a task
        // Tasks must match pattern: optional whitespace + list marker (-, number., or *) + space + checkbox
        const taskPattern = /^\s*(-|\d+\.|\*) \[(.)\]/;
        if (!taskPattern.test(currentLine)) {
            // Not a task line, return empty result
            return {
                content: "",
                linesToRemove: [],
            };
        }
        const currentIndent = this.getIndentation(currentLine, app);
        // Extract the parent task's mark
        const parentTaskMatch = currentLine.match(/\[(.)]/);
        const parentTaskMark = parentTaskMatch ? parentTaskMatch[1] : "";
        // Clone parent task with marker based on move mode
        let parentTaskWithMarker;
        if (moveMode === "allIncompleted" ||
            moveMode === "directIncompletedChildren") {
            parentTaskWithMarker = this.addMarkerToIncompletedTask(currentLine, settings, currentFile, app, true);
        }
        else {
            parentTaskWithMarker = this.addMarkerToTask(currentLine, settings, currentFile, app, true);
            // Complete parent task if setting is enabled (only for completed task modes)
            parentTaskWithMarker = this.completeTaskIfNeeded(parentTaskWithMarker, settings);
        }
        // Include the current line and completed child tasks
        resultLines.push(parentTaskWithMarker);
        // First, collect all indented content that belongs to this task (folded content)
        // This includes notes, tags, and other content that is indented under the task
        const taskContent = [];
        for (let i = taskLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = this.getIndentation(line, app);
            // Stop if we've reached content at the same or lower indentation level
            if (lineIndent <= currentIndent) {
                break;
            }
            // Check if this is a task at the direct child level
            const isTask = /^\s*(-|\d+\.|\*) \[(.)\]/.test(line);
            if (isTask) {
                // For non-"all" modes, we need to handle child tasks specially
                // So we stop collecting the immediate folded content here
                if (moveMode !== "all") {
                    break;
                }
            }
            // This is indented content that belongs to the parent task
            taskContent.push({ line, index: i, indent: lineIndent });
        }
        // If we're moving all subtasks, we'll collect them all
        if (moveMode === "all") {
            // Add all the folded content and subtasks
            for (const item of taskContent) {
                resultLines.push(this.completeTaskIfNeeded(item.line, settings));
                linesToRemove.push(item.index);
            }
            // Continue collecting all nested subtasks beyond the immediate folded content
            for (let i = taskLine + taskContent.length + 1; i < lines.length; i++) {
                const line = lines[i];
                const lineIndent = this.getIndentation(line, app);
                // If indentation is less or equal to current task, we've exited the child tasks
                if (lineIndent <= currentIndent) {
                    break;
                }
                resultLines.push(this.completeTaskIfNeeded(line, settings));
                linesToRemove.push(i);
            }
            // Add the main task line to remove
            linesToRemove.push(taskLine);
        }
        // If we're moving only completed tasks or direct children
        else {
            // Always include the immediate folded content (notes, tags, etc.)
            for (const item of taskContent) {
                resultLines.push(item.line); // Don't complete non-task content
                linesToRemove.push(item.index);
            }
            // First pass: collect all child tasks to analyze
            const childTasks = [];
            // Start after the folded content we already collected
            const startIndex = taskLine + taskContent.length + 1;
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                const lineIndent = this.getIndentation(line, app);
                // If indentation is less or equal to current task, we've exited the child tasks
                if (lineIndent <= currentIndent) {
                    break;
                }
                // Check if this is a task
                const taskMatch = line.match(/\[(.)]/);
                if (taskMatch) {
                    const taskMark = taskMatch[1];
                    const isCompleted = this.isCompletedTaskMark(taskMark, settings);
                    const isIncompleted = this.isIncompletedTaskMark(taskMark, settings);
                    childTasks.push({
                        line,
                        index: i,
                        indent: lineIndent,
                        isCompleted,
                        isIncompleted,
                    });
                }
                else {
                    // Non-task lines should be included with their related task
                    childTasks.push({
                        line,
                        index: i,
                        indent: lineIndent,
                        isCompleted: false,
                        isIncompleted: false, // Non-task lines aren't incomplete either
                    });
                }
            }
            // Process child tasks based on the mode
            if (moveMode === "allCompleted") {
                // Only include completed tasks (and their children)
                const completedTasks = new Set();
                const tasksToInclude = new Set();
                const parentTasksToPreserve = new Set();
                // First identify all completed tasks
                childTasks.forEach((task) => {
                    if (task.isCompleted) {
                        completedTasks.add(task.index);
                        tasksToInclude.add(task.index);
                        // Add all parent tasks up to the root task
                        let currentTask = task;
                        let parentIndex = this.findParentTaskIndex(currentTask.index, currentTask.indent, childTasks);
                        while (parentIndex !== -1) {
                            tasksToInclude.add(parentIndex);
                            // Only mark parent tasks for removal if they're completed
                            const parentTask = childTasks.find((t) => t.index === parentIndex);
                            if (!parentTask)
                                break;
                            if (!parentTask.isCompleted) {
                                parentTasksToPreserve.add(parentIndex);
                            }
                            parentIndex = this.findParentTaskIndex(parentTask.index, parentTask.indent, childTasks);
                        }
                    }
                });
                // Then include all children of completed tasks
                childTasks.forEach((task) => {
                    const parentIndex = this.findParentTaskIndex(task.index, task.indent, childTasks);
                    if (parentIndex !== -1 && completedTasks.has(parentIndex)) {
                        tasksToInclude.add(task.index);
                    }
                });
                // Add the selected items to results, sorting by index to maintain order
                const tasksByIndex = [...tasksToInclude].sort((a, b) => a - b);
                resultLines.length = 0; // Clear resultLines before rebuilding
                // Add parent task with marker
                resultLines.push(parentTaskWithMarker);
                // Add child tasks in order
                for (const taskIndex of tasksByIndex) {
                    const task = childTasks.find((t) => t.index === taskIndex);
                    if (!task)
                        continue;
                    // Add marker to parent tasks that are preserved
                    if (parentTasksToPreserve.has(taskIndex)) {
                        let taskLine = this.addMarkerToTask(task.line, settings, currentFile, app, false);
                        // Complete the task if setting is enabled
                        taskLine = this.completeTaskIfNeeded(taskLine, settings);
                        resultLines.push(taskLine);
                    }
                    else {
                        // Complete the task if setting is enabled
                        resultLines.push(this.completeTaskIfNeeded(task.line, settings));
                    }
                    // Only add to linesToRemove if it's completed or a child of completed
                    if (!parentTasksToPreserve.has(taskIndex)) {
                        linesToRemove.push(taskIndex);
                    }
                }
                // If parent task is completed, add it to lines to remove
                if (this.isCompletedTaskMark(parentTaskMark, settings)) {
                    linesToRemove.push(taskLine);
                }
            }
            else if (moveMode === "directChildren") {
                // Only include direct children that are completed
                const completedDirectChildren = new Set();
                // Determine the minimum indentation level of direct children
                let minChildIndent = Number.MAX_SAFE_INTEGER;
                for (const task of childTasks) {
                    if (task.indent > currentIndent &&
                        task.indent < minChildIndent) {
                        minChildIndent = task.indent;
                    }
                }
                // Now identify all direct children using the calculated indentation
                for (const task of childTasks) {
                    const isDirectChild = task.indent === minChildIndent;
                    if (isDirectChild && task.isCompleted) {
                        completedDirectChildren.add(task.index);
                    }
                }
                // Include all identified direct completed children and their subtasks
                resultLines.length = 0; // Clear resultLines before rebuilding
                // Add parent task with marker
                resultLines.push(parentTaskWithMarker);
                // Add direct completed children in order
                const sortedChildIndices = [...completedDirectChildren].sort((a, b) => a - b);
                for (const taskIndex of sortedChildIndices) {
                    // Add the direct completed child
                    const task = childTasks.find((t) => t.index === taskIndex);
                    if (!task)
                        continue;
                    resultLines.push(this.completeTaskIfNeeded(task.line, settings));
                    linesToRemove.push(taskIndex);
                    // Add all its subtasks (regardless of completion status)
                    let i = childTasks.findIndex((t) => t.index === taskIndex) + 1;
                    const taskIndent = task.indent;
                    while (i < childTasks.length) {
                        const subtask = childTasks[i];
                        if (subtask.indent <= taskIndent)
                            break; // Exit if we're back at same or lower indent level
                        resultLines.push(this.completeTaskIfNeeded(subtask.line, settings));
                        linesToRemove.push(subtask.index);
                        i++;
                    }
                }
                // If parent task is completed, add it to lines to remove
                if (this.isCompletedTaskMark(parentTaskMark, settings)) {
                    linesToRemove.push(taskLine);
                }
            }
            else if (moveMode === "allIncompleted") {
                // Only include incomplete tasks (and their children)
                const incompletedTasks = new Set();
                const tasksToInclude = new Set();
                const parentTasksToPreserve = new Set();
                // First identify all incomplete tasks
                childTasks.forEach((task) => {
                    if (task.isIncompleted) {
                        incompletedTasks.add(task.index);
                        tasksToInclude.add(task.index);
                        // Add all parent tasks up to the root task
                        let currentTask = task;
                        let parentIndex = this.findParentTaskIndex(currentTask.index, currentTask.indent, childTasks);
                        while (parentIndex !== -1) {
                            tasksToInclude.add(parentIndex);
                            // Only mark parent tasks for removal if they're incomplete
                            const parentTask = childTasks.find((t) => t.index === parentIndex);
                            if (!parentTask)
                                break;
                            if (!parentTask.isIncompleted) {
                                parentTasksToPreserve.add(parentIndex);
                            }
                            parentIndex = this.findParentTaskIndex(parentTask.index, parentTask.indent, childTasks);
                        }
                    }
                });
                // Then include all children of incomplete tasks
                childTasks.forEach((task) => {
                    const parentIndex = this.findParentTaskIndex(task.index, task.indent, childTasks);
                    if (parentIndex !== -1 &&
                        incompletedTasks.has(parentIndex)) {
                        tasksToInclude.add(task.index);
                    }
                });
                // Add the selected items to results, sorting by index to maintain order
                const tasksByIndex = [...tasksToInclude].sort((a, b) => a - b);
                resultLines.length = 0; // Clear resultLines before rebuilding
                // Add parent task with marker
                resultLines.push(parentTaskWithMarker);
                // Add child tasks in order
                for (const taskIndex of tasksByIndex) {
                    const task = childTasks.find((t) => t.index === taskIndex);
                    if (!task)
                        continue;
                    // Add marker to parent tasks that are preserved
                    if (parentTasksToPreserve.has(taskIndex)) {
                        let taskLine = this.addMarkerToIncompletedTask(task.line, settings, currentFile, app, false);
                        resultLines.push(taskLine);
                    }
                    else {
                        // Keep the task as is (don't complete it)
                        resultLines.push(task.line);
                    }
                    // Only add to linesToRemove if it's incomplete or a child of incomplete
                    if (!parentTasksToPreserve.has(taskIndex)) {
                        linesToRemove.push(taskIndex);
                    }
                }
                // If parent task is incomplete, add it to lines to remove
                if (this.isIncompletedTaskMark(parentTaskMark, settings)) {
                    linesToRemove.push(taskLine);
                }
            }
            else if (moveMode === "directIncompletedChildren") {
                // Only include direct children that are incomplete
                const incompletedDirectChildren = new Set();
                // Determine the minimum indentation level of direct children
                let minChildIndent = Number.MAX_SAFE_INTEGER;
                for (const task of childTasks) {
                    if (task.indent > currentIndent &&
                        task.indent < minChildIndent) {
                        minChildIndent = task.indent;
                    }
                }
                // Now identify all direct children using the calculated indentation
                for (const task of childTasks) {
                    const isDirectChild = task.indent === minChildIndent;
                    if (isDirectChild && task.isIncompleted) {
                        incompletedDirectChildren.add(task.index);
                    }
                }
                // Include all identified direct incomplete children and their subtasks
                resultLines.length = 0; // Clear resultLines before rebuilding
                // Add parent task with marker
                resultLines.push(parentTaskWithMarker);
                // Add direct incomplete children in order
                const sortedChildIndices = [...incompletedDirectChildren].sort((a, b) => a - b);
                for (const taskIndex of sortedChildIndices) {
                    // Add the direct incomplete child
                    const task = childTasks.find((t) => t.index === taskIndex);
                    if (!task)
                        continue;
                    resultLines.push(task.line);
                    linesToRemove.push(taskIndex);
                    // Add all its subtasks (regardless of completion status)
                    let i = childTasks.findIndex((t) => t.index === taskIndex) + 1;
                    const taskIndent = task.indent;
                    while (i < childTasks.length) {
                        const subtask = childTasks[i];
                        if (subtask.indent <= taskIndent)
                            break; // Exit if we're back at same or lower indent level
                        resultLines.push(subtask.line);
                        linesToRemove.push(subtask.index);
                        i++;
                    }
                }
                // If parent task is incomplete, add it to lines to remove
                if (this.isIncompletedTaskMark(parentTaskMark, settings)) {
                    linesToRemove.push(taskLine);
                }
            }
        }
        return {
            content: resultLines.join("\n"),
            linesToRemove: linesToRemove,
        };
    }
    // Remove tasks from source file
    static removeTasksFromFile(editor, linesToRemove) {
        if (!linesToRemove || linesToRemove.length === 0) {
            return;
        }
        const content = editor.getValue();
        const lines = content.split("\n");
        // Get lines to remove (sorted in descending order to avoid index shifting)
        const sortedLinesToRemove = [...linesToRemove].sort((a, b) => b - a);
        // Create a transaction to remove the lines
        editor.transaction({
            changes: sortedLinesToRemove.map((lineIndex) => {
                // Calculate start and end positions
                const startPos = {
                    line: lineIndex,
                    ch: 0,
                };
                // For the end position, use the next line's start or end of document
                const endPos = lineIndex + 1 < lines.length
                    ? { line: lineIndex + 1, ch: 0 }
                    : { line: lineIndex, ch: lines[lineIndex].length };
                return {
                    from: startPos,
                    to: endPos,
                    text: "",
                };
            }),
        });
    }
}
/**
 * Modal for selecting a target file to move completed tasks to
 */
export class CompletedTaskFileSelectionModal extends FuzzySuggestModal {
    constructor(app, plugin, editor, currentFile, taskLines, moveMode) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
        this.currentFile = currentFile;
        this.taskLines = taskLines;
        this.moveMode = moveMode;
        this.setPlaceholder("Select a file or type to create a new one");
    }
    getItems() {
        // Get all markdown files
        const files = this.app.vault.getMarkdownFiles();
        // Filter out the current file
        const filteredFiles = files.filter((file) => file.path !== this.currentFile.path);
        // Sort files by path
        filteredFiles.sort((a, b) => a.path.localeCompare(b.path));
        return filteredFiles;
    }
    getItemText(item) {
        if (typeof item === "string") {
            return `Create new file: ${item}`;
        }
        return item.path;
    }
    renderSuggestion(item, el) {
        const match = item.item;
        if (typeof match === "string") {
            el.createEl("div", { text: `${t("Create new file:")} ${match}` });
        }
        else {
            el.createEl("div", { text: match.path });
        }
    }
    onChooseItem(item, evt) {
        if (typeof item === "string") {
            // Create a new file
            this.createNewFileWithTasks(item);
        }
        else {
            // Show modal to select insertion point in existing file
            new CompletedTaskBlockSelectionModal(this.app, this.plugin, this.editor, this.currentFile, item, this.taskLines, this.moveMode).open();
        }
    }
    // If the query doesn't match any existing files, add an option to create a new file
    getSuggestions(query) {
        const suggestions = super.getSuggestions(query);
        if (query &&
            !suggestions.some((match) => typeof match.item === "string" && match.item === query)) {
            // Check if it's a valid file path
            if (this.isValidFileName(query)) {
                // Add option to create a new file with this name
                suggestions.push({
                    item: query,
                    match: { score: 1, matches: [] },
                });
            }
        }
        // Limit results to 20 to avoid performance issues
        return suggestions.slice(0, 20);
    }
    isValidFileName(name) {
        // Basic validation for file names
        return name.length > 0 && !name.includes("/") && !name.includes("\\");
    }
    createNewFileWithTasks(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure file name has .md extension
                if (!fileName.endsWith(".md")) {
                    fileName += ".md";
                }
                // Get completed tasks content
                const { content, linesToRemove } = TaskUtils.processSelectedTasks(this.editor, this.taskLines, this.moveMode, this.plugin.settings, this.currentFile, this.app);
                // Reset indentation for new file (remove all indentation from tasks)
                const resetIndentContent = TaskUtils.resetIndentation(content, this.app);
                // Create file in the same folder as current file
                const folder = this.currentFile.parent;
                const filePath = folder ? `${folder.path}/${fileName}` : fileName;
                // Create the file
                const newFile = yield this.app.vault.create(filePath, resetIndentContent);
                // Remove the completed tasks from the current file
                TaskUtils.removeTasksFromFile(this.editor, linesToRemove);
                // Open the new file
                this.app.workspace.getLeaf(true).openFile(newFile);
                new Notice(`${t("Completed tasks moved to")} ${fileName}`);
            }
            catch (error) {
                new Notice(`${t("Failed to create file:")} ${error}`);
                console.error(error);
            }
        });
    }
}
/**
 * Modal for selecting a block to insert after in the target file
 */
export class CompletedTaskBlockSelectionModal extends SuggestModal {
    constructor(app, plugin, editor, sourceFile, targetFile, taskLines, moveMode) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
        this.sourceFile = sourceFile;
        this.targetFile = targetFile;
        this.taskLines = taskLines;
        this.metadataCache = app.metadataCache;
        this.moveMode = moveMode;
        this.setPlaceholder("Select a block to insert after");
    }
    getSuggestions(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get file content
            const fileContent = yield this.app.vault.read(this.targetFile);
            const lines = fileContent.split("\n");
            // Get file cache to find headings and list items
            const fileCache = this.metadataCache.getFileCache(this.targetFile);
            let blocks = [];
            // Add an option to insert at the beginning of the file
            blocks.push({
                id: "beginning",
                text: t("Beginning of file"),
                level: 0,
            });
            blocks.push({
                id: "end",
                text: t("End of file"),
                level: 0,
            });
            // Add headings
            if (fileCache && fileCache.headings) {
                for (const heading of fileCache.headings) {
                    const text = lines[heading.position.start.line];
                    blocks.push({
                        id: `heading-${heading.position.start.line}`,
                        text: text,
                        level: heading.level,
                    });
                }
            }
            // Add list items
            if (fileCache && fileCache.listItems) {
                for (const listItem of fileCache.listItems) {
                    const text = lines[listItem.position.start.line];
                    blocks.push({
                        id: `list-${listItem.position.start.line}`,
                        text: text,
                        level: TaskUtils.getIndentation(text, this.app),
                    });
                }
            }
            // Filter blocks based on query
            if (query) {
                blocks = blocks.filter((block) => block.text.toLowerCase().includes(query.toLowerCase()));
            }
            // Limit results to 20 to avoid performance issues
            return blocks.slice(0, 20);
        });
    }
    renderSuggestion(block, el) {
        const indent = "  ".repeat(block.level);
        if (block.id === "beginning" || block.id === "end") {
            el.createEl("div", { text: block.text });
        }
        else {
            el.createEl("div", { text: `${indent}${block.text}` });
        }
    }
    onChooseSuggestion(block, evt) {
        this.moveCompletedTasksToTargetFile(block);
    }
    moveCompletedTasksToTargetFile(block) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get completed tasks content
                const { content, linesToRemove } = TaskUtils.processSelectedTasks(this.editor, this.taskLines, this.moveMode, this.plugin.settings, this.sourceFile, this.app);
                // Read target file content
                const fileContent = yield this.app.vault.read(this.targetFile);
                const lines = fileContent.split("\n");
                let insertPosition;
                let indentLevel = 0;
                if (block.id === "beginning") {
                    insertPosition = 0;
                }
                else if (block.id === "end") {
                    insertPosition = lines.length;
                }
                else {
                    // Extract line number from block id
                    const lineMatch = block.id.match(/-(\d+)$/);
                    if (!lineMatch) {
                        throw new Error("Invalid block ID");
                    }
                    const lineNumber = parseInt(lineMatch[1]);
                    insertPosition = lineNumber + 1;
                    // Get indentation of the target block
                    indentLevel = TaskUtils.getIndentation(lines[lineNumber], this.app);
                }
                // Adjust indentation of task content to match the target block
                const indentedTaskContent = TaskUtils.adjustIndentation(content, indentLevel, this.app);
                // Insert task at the position
                const newContent = [
                    ...lines.slice(0, insertPosition),
                    indentedTaskContent,
                    ...lines.slice(insertPosition),
                ].join("\n");
                // Update target file
                yield this.app.vault.modify(this.targetFile, newContent);
                // Remove completed tasks from source file
                TaskUtils.removeTasksFromFile(this.editor, linesToRemove);
                new Notice(`${t("Completed tasks moved to")} ${this.targetFile.path}`);
            }
            catch (error) {
                new Notice(`${t("Failed to move tasks:")} ${error}`);
                console.error(error);
            }
        });
    }
}
/**
 * Command to move the completed tasks to another file
 */
export function moveCompletedTasksCommand(checking, editor, ctx, plugin, moveMode) {
    // Get the current file
    const currentFile = ctx.file;
    if (checking) {
        // If checking, return true if we're in a markdown file and cursor is on a task line
        if (!currentFile || currentFile.extension !== "md") {
            return false;
        }
        const selection = editor.getSelection();
        if (selection.length === 0) {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            // Check if line is a task with any of the supported list markers (-, 1., *)
            return line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i) !== null;
        }
        return true;
    }
    // Execute the command
    if (!currentFile) {
        new Notice(t("No active file found"));
        return false;
    }
    // Get all selections to support multi-line selection
    const selections = editor.listSelections();
    // Extract all selected lines from the selections
    const selectedLinesSet = new Set();
    selections.forEach((selection) => {
        // Get the start and end lines (accounting for selection direction)
        const startLine = Math.min(selection.anchor.line, selection.head.line);
        const endLine = Math.max(selection.anchor.line, selection.head.line);
        // Add all lines in this selection range
        for (let line = startLine; line <= endLine; line++) {
            selectedLinesSet.add(line);
        }
    });
    // Convert Set to Array for further processing
    const selectedLines = Array.from(selectedLinesSet);
    new CompletedTaskFileSelectionModal(plugin.app, plugin, editor, currentFile, selectedLines, moveMode).open();
    return true;
}
/**
 * Command to move the incomplete tasks to another file
 */
export function moveIncompletedTasksCommand(checking, editor, ctx, plugin, moveMode) {
    // Get the current file
    const currentFile = ctx.file;
    if (checking) {
        // If checking, return true if we're in a markdown file and cursor is on a task line
        if (!currentFile || currentFile.extension !== "md") {
            return false;
        }
        const selection = editor.getSelection();
        if (selection.length === 0) {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            // Check if line is a task with any of the supported list markers (-, 1., *)
            return line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i) !== null;
        }
        return true;
    }
    // Execute the command
    if (!currentFile) {
        new Notice(t("No active file found"));
        return false;
    }
    // Get all selections to support multi-line selection
    const selections = editor.listSelections();
    // Extract all selected lines from the selections
    const selectedLinesSet = new Set();
    selections.forEach((selection) => {
        // Get the start and end lines (accounting for selection direction)
        const startLine = Math.min(selection.anchor.line, selection.head.line);
        const endLine = Math.max(selection.anchor.line, selection.head.line);
        // Add all lines in this selection range
        for (let line = startLine; line <= endLine; line++) {
            selectedLinesSet.add(line);
        }
    });
    // Convert Set to Array for further processing
    const selectedLines = Array.from(selectedLinesSet);
    new CompletedTaskFileSelectionModal(plugin.app, plugin, editor, currentFile, selectedLines, moveMode).open();
    return true;
}
/**
 * Auto-move completed tasks using default settings
 */
export function autoMoveCompletedTasks(editor, currentFile, plugin, taskLines, moveMode) {
    return __awaiter(this, void 0, void 0, function* () {
        const settings = plugin.settings.completedTaskMover;
        // Check if auto-move is enabled and default file is set
        const isCompletedMode = moveMode === "allCompleted" ||
            moveMode === "directChildren" ||
            moveMode === "all";
        const isAutoMoveEnabled = isCompletedMode
            ? settings.enableAutoMove
            : settings.enableIncompletedAutoMove;
        const defaultTargetFile = isCompletedMode
            ? settings.defaultTargetFile
            : settings.incompletedDefaultTargetFile;
        const defaultInsertionMode = isCompletedMode
            ? settings.defaultInsertionMode
            : settings.incompletedDefaultInsertionMode;
        const defaultHeadingName = isCompletedMode
            ? settings.defaultHeadingName
            : settings.incompletedDefaultHeadingName;
        if (!isAutoMoveEnabled || !defaultTargetFile) {
            return false; // Auto-move not configured, fall back to manual selection
        }
        try {
            // Get tasks content
            const { content, linesToRemove } = TaskUtils.processSelectedTasks(editor, taskLines, moveMode, plugin.settings, currentFile, plugin.app);
            // Find or create target file
            let targetFile = plugin.app.vault.getFileByPath(defaultTargetFile);
            if (!targetFile) {
                // Create the file if it doesn't exist
                targetFile = yield plugin.app.vault.create(defaultTargetFile, "");
            }
            if (!(targetFile instanceof TFile)) {
                throw new Error(`Target path ${defaultTargetFile} is not a file`);
            }
            // Read target file content
            const fileContent = yield plugin.app.vault.read(targetFile);
            const lines = fileContent.split("\n");
            let insertPosition;
            let indentLevel = 0;
            // Determine insertion position based on mode
            switch (defaultInsertionMode) {
                case "beginning":
                    insertPosition = 0;
                    break;
                case "end":
                    insertPosition = lines.length;
                    break;
                case "after-heading":
                    // Find the heading or create it
                    const headingPattern = new RegExp(`^#+\\s+${defaultHeadingName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
                    let headingLineIndex = lines.findIndex((line) => headingPattern.test(line));
                    if (headingLineIndex === -1) {
                        // Create the heading at the end of the file
                        if (lines.length > 0 &&
                            lines[lines.length - 1].trim() !== "") {
                            lines.push(""); // Add empty line before heading
                        }
                        lines.push(`## ${defaultHeadingName}`);
                        lines.push(""); // Add empty line after heading
                        headingLineIndex = lines.length - 2; // Index of the heading line
                    }
                    insertPosition = headingLineIndex + 1;
                    // Skip any empty lines after the heading
                    while (insertPosition < lines.length &&
                        lines[insertPosition].trim() === "") {
                        insertPosition++;
                    }
                    break;
                default:
                    insertPosition = lines.length;
            }
            // Adjust indentation of task content
            const indentedTaskContent = TaskUtils.adjustIndentation(content, indentLevel, plugin.app);
            // Insert task at the position
            const newContent = [
                ...lines.slice(0, insertPosition),
                indentedTaskContent,
                ...lines.slice(insertPosition),
            ].join("\n");
            // Update target file
            yield plugin.app.vault.modify(targetFile, newContent);
            // Remove tasks from source file
            TaskUtils.removeTasksFromFile(editor, linesToRemove);
            const taskType = isCompletedMode ? "completed" : "incomplete";
            new Notice(`${t("Auto-moved")} ${taskType} ${t("tasks to")} ${defaultTargetFile}`);
            return true;
        }
        catch (error) {
            new Notice(`${t("Failed to auto-move tasks:")} ${error}`);
            console.error(error);
            return false;
        }
    });
}
/**
 * Command to auto-move completed tasks using default settings
 */
export function autoMoveCompletedTasksCommand(checking, editor, ctx, plugin, moveMode) {
    // Get the current file
    const currentFile = ctx.file;
    if (checking) {
        // Check if auto-move is enabled for this mode
        const isCompletedMode = moveMode === "allCompleted" ||
            moveMode === "directChildren" ||
            moveMode === "all";
        const isAutoMoveEnabled = isCompletedMode
            ? plugin.settings.completedTaskMover.enableAutoMove
            : plugin.settings.completedTaskMover.enableIncompletedAutoMove;
        const defaultTargetFile = isCompletedMode
            ? plugin.settings.completedTaskMover.defaultTargetFile
            : plugin.settings.completedTaskMover.incompletedDefaultTargetFile;
        if (!isAutoMoveEnabled || !defaultTargetFile) {
            return false; // Auto-move not configured
        }
        // If checking, return true if we're in a markdown file and cursor is on a task line
        if (!currentFile || currentFile.extension !== "md") {
            return false;
        }
        const selection = editor.getSelection();
        if (selection.length === 0) {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            // Check if line is a task with any of the supported list markers (-, 1., *)
            return line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i) !== null;
        }
        return true;
    }
    // Execute the command
    if (!currentFile) {
        new Notice(t("No active file found"));
        return false;
    }
    // Get all selections to support multi-line selection
    const selections = editor.listSelections();
    // Extract all selected lines from the selections
    const selectedLinesSet = new Set();
    selections.forEach((selection) => {
        // Get the start and end lines (accounting for selection direction)
        const startLine = Math.min(selection.anchor.line, selection.head.line);
        const endLine = Math.max(selection.anchor.line, selection.head.line);
        // Add all lines in this selection range
        for (let line = startLine; line <= endLine; line++) {
            selectedLinesSet.add(line);
        }
    });
    // Convert Set to Array for further processing
    const selectedLines = Array.from(selectedLinesSet);
    // Try auto-move first, fall back to manual selection if it fails
    autoMoveCompletedTasks(editor, currentFile, plugin, selectedLines, moveMode).then((success) => {
        if (!success) {
            // Fall back to manual selection
            new CompletedTaskFileSelectionModal(plugin.app, plugin, editor, currentFile, selectedLines, moveMode).open();
        }
    });
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGVkVGFza01vdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tcGxldGVkVGFza01vdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4saUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxNQUFNLEVBR04sWUFBWSxFQUlaLE1BQU0sR0FDTixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUzQzs7R0FFRztBQUNILE1BQU0sT0FBTyxTQUFTO0lBQ3JCLDRCQUE0QjtJQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLElBQVksRUFBRSxHQUFRO1FBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsd0JBQXdCO0lBQ3hCLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBUTtRQUN6QixPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsNENBQTRDO0lBQzVDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFjO1FBQ3hDLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU8sRUFBRSxDQUFDO1FBRXZCLDhDQUE4QztRQUM5QyxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEUsT0FBTyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQs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QUN2RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckUsd0NBQXdDO1FBQ3hDLEtBQUssSUFBSSxJQUFJLEdBQUcsU0FBUyxFQUFFLElBQUksSUFBSSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbkQsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNCO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCw4Q0FBOEM7SUFDOUMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRW5ELGlFQUFpRTtJQUNqRSxzQkFBc0IsQ0FDckIsTUFBTSxFQUNOLFdBQVcsRUFDWCxNQUFNLEVBQ04sYUFBYSxFQUNiLFFBQVEsQ0FDUixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ2xCLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDYixnQ0FBZ0M7WUFDaEMsSUFBSSwrQkFBK0IsQ0FDbEMsTUFBTSxDQUFDLEdBQUcsRUFDVixNQUFNLEVBQ04sTUFBTSxFQUNOLFdBQVcsRUFDWCxhQUFhLEVBQ2IsUUFBUSxDQUNSLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDVDtJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0RnV6enlTdWdnZXN0TW9kYWwsXHJcblx0VEZpbGUsXHJcblx0Tm90aWNlLFxyXG5cdEVkaXRvcixcclxuXHRGdXp6eU1hdGNoLFxyXG5cdFN1Z2dlc3RNb2RhbCxcclxuXHRNZXRhZGF0YUNhY2hlLFxyXG5cdE1hcmtkb3duVmlldyxcclxuXHRNYXJrZG93bkZpbGVJbmZvLFxyXG5cdG1vbWVudCxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgYnVpbGRJbmRlbnRTdHJpbmcsIGdldFRhYlNpemUgfSBmcm9tIFwiLi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG4vKipcclxuICogU2hhcmVkIHV0aWxpdGllcyBmb3IgdGFzayBtYW5pcHVsYXRpb25cclxuICovXHJcbmV4cG9ydCBjbGFzcyBUYXNrVXRpbHMge1xyXG5cdC8vIEdldCBpbmRlbnRhdGlvbiBvZiBhIGxpbmVcclxuXHRzdGF0aWMgZ2V0SW5kZW50YXRpb24obGluZTogc3RyaW5nLCBhcHA6IEFwcCk6IG51bWJlciB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdHJldHVybiBtYXRjaCA/IG1hdGNoWzFdLmxlbmd0aCA6IDA7XHJcblx0fVxyXG5cclxuXHQvLyBHZXQgdGFiIHNpemUgZnJvbSBhcHBcclxuXHRzdGF0aWMgZ2V0VGFiU2l6ZShhcHA6IEFwcCk6IG51bWJlciB7XHJcblx0XHRyZXR1cm4gZ2V0VGFiU2l6ZShhcHApO1xyXG5cdH1cclxuXHJcblx0Ly8gUHJvY2VzcyBjdXN0b20gbWFya2VyIHdpdGggZGF0ZSB2YXJpYWJsZXNcclxuXHRzdGF0aWMgcHJvY2Vzc0N1c3RvbU1hcmtlcihtYXJrZXI6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBSZXR1cm4gZW1wdHkgc3RyaW5nIGlmIG1hcmtlciBpcyB1bmRlZmluZWQgb3IgbnVsbFxyXG5cdFx0aWYgKCFtYXJrZXIpIHJldHVybiBcIlwiO1xyXG5cclxuXHRcdC8vIFJlcGxhY2Uge3tEQVRFOmZvcm1hdH19IHdpdGggZm9ybWF0dGVkIGRhdGVcclxuXHRcdHJldHVybiBtYXJrZXIucmVwbGFjZSgvXFx7XFx7REFURTooW159XSspXFx9XFx9L2csIChtYXRjaCwgZm9ybWF0KSA9PiB7XHJcblx0XHRcdHJldHVybiBtb21lbnQoKS5mb3JtYXQoZm9ybWF0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gUHJvY2VzcyBkYXRlIG1hcmtlciB3aXRoIHt7ZGF0ZX19IHBsYWNlaG9sZGVyXHJcblx0c3RhdGljIHByb2Nlc3NEYXRlTWFya2VyKG1hcmtlcjogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIFJldHVybiBlbXB0eSBzdHJpbmcgaWYgbWFya2VyIGlzIHVuZGVmaW5lZCBvciBudWxsXHJcblx0XHRpZiAoIW1hcmtlcikgcmV0dXJuIFwiXCI7XHJcblxyXG5cdFx0cmV0dXJuIG1hcmtlci5yZXBsYWNlKC9cXHtcXHtkYXRlXFx9XFx9L2csICgpID0+IHtcclxuXHRcdFx0cmV0dXJuIG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEFkZCBtYXJrZXIgdG8gdGFzayAodmVyc2lvbiwgZGF0ZSwgb3IgY3VzdG9tKVxyXG5cdHN0YXRpYyBhZGRNYXJrZXJUb1Rhc2soXHJcblx0XHR0YXNrTGluZTogc3RyaW5nLFxyXG5cdFx0c2V0dGluZ3M6IGFueSxcclxuXHRcdGN1cnJlbnRGaWxlOiBURmlsZSxcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0aXNSb290ID0gZmFsc2VcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qge1xyXG5cdFx0XHR0YXNrTWFya2VyVHlwZSxcclxuXHRcdFx0dmVyc2lvbk1hcmtlcixcclxuXHRcdFx0ZGF0ZU1hcmtlcixcclxuXHRcdFx0Y3VzdG9tTWFya2VyLFxyXG5cdFx0XHR3aXRoQ3VycmVudEZpbGVMaW5rLFxyXG5cdFx0fSA9IHNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlcjtcclxuXHJcblx0XHQvLyBFeHRyYWN0IGJsb2NraWQgaWYgZXhpc3RzXHJcblx0XHRjb25zdCBibG9ja2lkTWF0Y2ggPSB0YXNrTGluZS5tYXRjaCgvXiguKj8pKD86XFxzK15bYS16QS1aMC05XXs2fSQpPyQvKTtcclxuXHRcdGlmICghYmxvY2tpZE1hdGNoKSByZXR1cm4gdGFza0xpbmU7XHJcblxyXG5cdFx0Y29uc3QgbWFpbkNvbnRlbnQgPSBibG9ja2lkTWF0Y2hbMV0udHJpbUVuZCgpO1xyXG5cdFx0Y29uc3QgYmxvY2tpZCA9IGJsb2NraWRNYXRjaFsyXT8udHJpbSgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBiYXNlIHRhc2sgbGluZSB3aXRoIG1hcmtlclxyXG5cdFx0bGV0IG1hcmtlZFRhc2tMaW5lID0gbWFpbkNvbnRlbnQ7XHJcblxyXG5cdFx0Ly8gQmFzaWMgY2hlY2sgdG8gZW5zdXJlIHRoZSB0YXNrIGxpbmUgZG9lc24ndCBhbHJlYWR5IGhhdmUgdGhpcyBtYXJrZXJcclxuXHRcdGlmIChcclxuXHRcdFx0ISh2ZXJzaW9uTWFya2VyICYmIG1haW5Db250ZW50LmluY2x1ZGVzKHZlcnNpb25NYXJrZXIpKSAmJlxyXG5cdFx0XHQhKGRhdGVNYXJrZXIgJiYgbWFpbkNvbnRlbnQuaW5jbHVkZXMoZGF0ZU1hcmtlcikpICYmXHJcblx0XHRcdCFtYWluQ29udGVudC5pbmNsdWRlcyh0aGlzLnByb2Nlc3NDdXN0b21NYXJrZXIoY3VzdG9tTWFya2VyKSlcclxuXHRcdCkge1xyXG5cdFx0XHRzd2l0Y2ggKHRhc2tNYXJrZXJUeXBlKSB7XHJcblx0XHRcdFx0Y2FzZSBcInZlcnNpb25cIjpcclxuXHRcdFx0XHRcdGlmICh2ZXJzaW9uTWFya2VyKSB7XHJcblx0XHRcdFx0XHRcdG1hcmtlZFRhc2tMaW5lID0gYCR7bWFpbkNvbnRlbnR9ICR7dmVyc2lvbk1hcmtlcn1gO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImRhdGVcIjpcclxuXHRcdFx0XHRcdGNvbnN0IHByb2Nlc3NlZERhdGVNYXJrZXIgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnByb2Nlc3NEYXRlTWFya2VyKGRhdGVNYXJrZXIpO1xyXG5cdFx0XHRcdFx0aWYgKHByb2Nlc3NlZERhdGVNYXJrZXIpIHtcclxuXHRcdFx0XHRcdFx0bWFya2VkVGFza0xpbmUgPSBgJHttYWluQ29udGVudH0gJHtwcm9jZXNzZWREYXRlTWFya2VyfWA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY3VzdG9tXCI6XHJcblx0XHRcdFx0XHRjb25zdCBwcm9jZXNzZWRDdXN0b21NYXJrZXIgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnByb2Nlc3NDdXN0b21NYXJrZXIoY3VzdG9tTWFya2VyKTtcclxuXHRcdFx0XHRcdGlmIChwcm9jZXNzZWRDdXN0b21NYXJrZXIpIHtcclxuXHRcdFx0XHRcdFx0bWFya2VkVGFza0xpbmUgPSBgJHttYWluQ29udGVudH0gJHtwcm9jZXNzZWRDdXN0b21NYXJrZXJ9YDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRtYXJrZWRUYXNrTGluZSA9IG1haW5Db250ZW50O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGxpbmsgdG8gdGhlIGN1cnJlbnQgZmlsZSBpZiBzZXR0aW5nIGlzIGVuYWJsZWQgYW5kIHRoaXMgaXMgYSByb290IHRhc2tcclxuXHRcdGlmICh3aXRoQ3VycmVudEZpbGVMaW5rICYmIGlzUm9vdCkge1xyXG5cdFx0XHRjb25zdCBsaW5rID0gYXBwLmZpbGVNYW5hZ2VyLmdlbmVyYXRlTWFya2Rvd25MaW5rKFxyXG5cdFx0XHRcdGN1cnJlbnRGaWxlLFxyXG5cdFx0XHRcdGN1cnJlbnRGaWxlLnBhdGhcclxuXHRcdFx0KTtcclxuXHRcdFx0bWFya2VkVGFza0xpbmUgPSBgJHttYXJrZWRUYXNrTGluZX0gZnJvbSAke2xpbmt9YDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgYmFjayB0aGUgYmxvY2tpZCBpZiBpdCBleGlzdHNcclxuXHRcdGlmIChibG9ja2lkKSB7XHJcblx0XHRcdG1hcmtlZFRhc2tMaW5lID0gYCR7bWFya2VkVGFza0xpbmV9ICR7YmxvY2tpZH1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtYXJrZWRUYXNrTGluZTtcclxuXHR9XHJcblxyXG5cdC8vIEFkZCBtYXJrZXIgdG8gaW5jb21wbGV0ZSB0YXNrICh2ZXJzaW9uLCBkYXRlLCBvciBjdXN0b20pXHJcblx0c3RhdGljIGFkZE1hcmtlclRvSW5jb21wbGV0ZWRUYXNrKFxyXG5cdFx0dGFza0xpbmU6IHN0cmluZyxcclxuXHRcdHNldHRpbmdzOiBhbnksXHJcblx0XHRjdXJyZW50RmlsZTogVEZpbGUsXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlzUm9vdCA9IGZhbHNlXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0aW5jb21wbGV0ZWRUYXNrTWFya2VyVHlwZSxcclxuXHRcdFx0aW5jb21wbGV0ZWRWZXJzaW9uTWFya2VyLFxyXG5cdFx0XHRpbmNvbXBsZXRlZERhdGVNYXJrZXIsXHJcblx0XHRcdGluY29tcGxldGVkQ3VzdG9tTWFya2VyLFxyXG5cdFx0XHR3aXRoQ3VycmVudEZpbGVMaW5rRm9ySW5jb21wbGV0ZWQsXHJcblx0XHR9ID0gc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgYmxvY2tpZCBpZiBleGlzdHNcclxuXHRcdGNvbnN0IGJsb2NraWRNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKC9eKC4qPykoPzpcXHMrXlthLXpBLVowLTldezZ9JCk/JC8pO1xyXG5cdFx0aWYgKCFibG9ja2lkTWF0Y2gpIHJldHVybiB0YXNrTGluZTtcclxuXHJcblx0XHRjb25zdCBtYWluQ29udGVudCA9IGJsb2NraWRNYXRjaFsxXS50cmltRW5kKCk7XHJcblx0XHRjb25zdCBibG9ja2lkID0gYmxvY2tpZE1hdGNoWzJdPy50cmltKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGJhc2UgdGFzayBsaW5lIHdpdGggbWFya2VyXHJcblx0XHRsZXQgbWFya2VkVGFza0xpbmUgPSBtYWluQ29udGVudDtcclxuXHJcblx0XHQvLyBCYXNpYyBjaGVjayB0byBlbnN1cmUgdGhlIHRhc2sgbGluZSBkb2Vzbid0IGFscmVhZHkgaGF2ZSB0aGlzIG1hcmtlclxyXG5cdFx0aWYgKFxyXG5cdFx0XHQhKFxyXG5cdFx0XHRcdGluY29tcGxldGVkVmVyc2lvbk1hcmtlciAmJlxyXG5cdFx0XHRcdG1haW5Db250ZW50LmluY2x1ZGVzKGluY29tcGxldGVkVmVyc2lvbk1hcmtlcilcclxuXHRcdFx0KSAmJlxyXG5cdFx0XHQhKFxyXG5cdFx0XHRcdGluY29tcGxldGVkRGF0ZU1hcmtlciAmJlxyXG5cdFx0XHRcdG1haW5Db250ZW50LmluY2x1ZGVzKGluY29tcGxldGVkRGF0ZU1hcmtlcilcclxuXHRcdFx0KSAmJlxyXG5cdFx0XHQhbWFpbkNvbnRlbnQuaW5jbHVkZXMoXHJcblx0XHRcdFx0dGhpcy5wcm9jZXNzQ3VzdG9tTWFya2VyKGluY29tcGxldGVkQ3VzdG9tTWFya2VyKVxyXG5cdFx0XHQpXHJcblx0XHQpIHtcclxuXHRcdFx0c3dpdGNoIChpbmNvbXBsZXRlZFRhc2tNYXJrZXJUeXBlKSB7XHJcblx0XHRcdFx0Y2FzZSBcInZlcnNpb25cIjpcclxuXHRcdFx0XHRcdGlmIChpbmNvbXBsZXRlZFZlcnNpb25NYXJrZXIpIHtcclxuXHRcdFx0XHRcdFx0bWFya2VkVGFza0xpbmUgPSBgJHttYWluQ29udGVudH0gJHtpbmNvbXBsZXRlZFZlcnNpb25NYXJrZXJ9YDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJkYXRlXCI6XHJcblx0XHRcdFx0XHRjb25zdCBwcm9jZXNzZWREYXRlTWFya2VyID0gdGhpcy5wcm9jZXNzRGF0ZU1hcmtlcihcclxuXHRcdFx0XHRcdFx0aW5jb21wbGV0ZWREYXRlTWFya2VyXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKHByb2Nlc3NlZERhdGVNYXJrZXIpIHtcclxuXHRcdFx0XHRcdFx0bWFya2VkVGFza0xpbmUgPSBgJHttYWluQ29udGVudH0gJHtwcm9jZXNzZWREYXRlTWFya2VyfWA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY3VzdG9tXCI6XHJcblx0XHRcdFx0XHRjb25zdCBwcm9jZXNzZWRDdXN0b21NYXJrZXIgPSB0aGlzLnByb2Nlc3NDdXN0b21NYXJrZXIoXHJcblx0XHRcdFx0XHRcdGluY29tcGxldGVkQ3VzdG9tTWFya2VyXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKHByb2Nlc3NlZEN1c3RvbU1hcmtlcikge1xyXG5cdFx0XHRcdFx0XHRtYXJrZWRUYXNrTGluZSA9IGAke21haW5Db250ZW50fSAke3Byb2Nlc3NlZEN1c3RvbU1hcmtlcn1gO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdG1hcmtlZFRhc2tMaW5lID0gbWFpbkNvbnRlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbGluayB0byB0aGUgY3VycmVudCBmaWxlIGlmIHNldHRpbmcgaXMgZW5hYmxlZCBhbmQgdGhpcyBpcyBhIHJvb3QgdGFza1xyXG5cdFx0aWYgKHdpdGhDdXJyZW50RmlsZUxpbmtGb3JJbmNvbXBsZXRlZCAmJiBpc1Jvb3QpIHtcclxuXHRcdFx0Y29uc3QgbGluayA9IGFwcC5maWxlTWFuYWdlci5nZW5lcmF0ZU1hcmtkb3duTGluayhcclxuXHRcdFx0XHRjdXJyZW50RmlsZSxcclxuXHRcdFx0XHRjdXJyZW50RmlsZS5wYXRoXHJcblx0XHRcdCk7XHJcblx0XHRcdG1hcmtlZFRhc2tMaW5lID0gYCR7bWFya2VkVGFza0xpbmV9IGZyb20gJHtsaW5rfWA7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGJhY2sgdGhlIGJsb2NraWQgaWYgaXQgZXhpc3RzXHJcblx0XHRpZiAoYmxvY2tpZCkge1xyXG5cdFx0XHRtYXJrZWRUYXNrTGluZSA9IGAke21hcmtlZFRhc2tMaW5lfSAke2Jsb2NraWR9YDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbWFya2VkVGFza0xpbmU7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiBhIHRhc2sgbWFyayByZXByZXNlbnRzIGEgY29tcGxldGVkIHRhc2tcclxuXHRzdGF0aWMgaXNDb21wbGV0ZWRUYXNrTWFyayhtYXJrOiBzdHJpbmcsIHNldHRpbmdzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtzID0gc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XCJ4XCIsXHJcblx0XHRcdFwiWFwiLFxyXG5cdFx0XTtcclxuXHJcblx0XHQvLyBJZiB0cmVhdEFiYW5kb25lZEFzQ29tcGxldGVkIGlzIGVuYWJsZWQsIGFsc28gY29uc2lkZXIgYWJhbmRvbmVkIHRhc2tzIGFzIGNvbXBsZXRlZFxyXG5cdFx0aWYgKHNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci50cmVhdEFiYW5kb25lZEFzQ29tcGxldGVkKSB7XHJcblx0XHRcdGNvbnN0IGFiYW5kb25lZE1hcmtzID0gc2V0dGluZ3MudGFza1N0YXR1c2VzLmFiYW5kb25lZD8uc3BsaXQoXHJcblx0XHRcdFx0XCJ8XCJcclxuXHRcdFx0KSB8fCBbXCItXCJdO1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKG1hcmspIHx8IGFiYW5kb25lZE1hcmtzLmluY2x1ZGVzKG1hcmspXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKG1hcmspO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgYSB0YXNrIG1hcmsgcmVwcmVzZW50cyBhbiBpbmNvbXBsZXRlIHRhc2tcclxuXHRzdGF0aWMgaXNJbmNvbXBsZXRlZFRhc2tNYXJrKG1hcms6IHN0cmluZywgc2V0dGluZ3M6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPSBzZXR0aW5ncy50YXNrU3RhdHVzZXMuY29tcGxldGVkPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcInhcIixcclxuXHRcdFx0XCJYXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIElmIHRyZWF0QWJhbmRvbmVkQXNDb21wbGV0ZWQgaXMgZW5hYmxlZCwgYWxzbyBjb25zaWRlciBhYmFuZG9uZWQgdGFza3MgYXMgY29tcGxldGVkXHJcblx0XHRsZXQgYWJhbmRvbmVkTWFya3M6IHN0cmluZ1tdID0gW107XHJcblx0XHRpZiAoc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLnRyZWF0QWJhbmRvbmVkQXNDb21wbGV0ZWQpIHtcclxuXHRcdFx0YWJhbmRvbmVkTWFya3MgPSBzZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEEgdGFzayBpcyBpbmNvbXBsZXRlIGlmIGl0J3Mgbm90IGNvbXBsZXRlZCBhbmQgbm90IGFiYW5kb25lZCAod2hlbiB0cmVhdGVkIGFzIGNvbXBsZXRlZClcclxuXHRcdHJldHVybiAhY29tcGxldGVkTWFya3MuaW5jbHVkZXMobWFyaykgJiYgIWFiYW5kb25lZE1hcmtzLmluY2x1ZGVzKG1hcmspO1xyXG5cdH1cclxuXHJcblx0Ly8gQ29tcGxldGUgdGFza3MgaWYgdGhlIHNldHRpbmcgaXMgZW5hYmxlZFxyXG5cdHN0YXRpYyBjb21wbGV0ZVRhc2tJZk5lZWRlZCh0YXNrTGluZTogc3RyaW5nLCBzZXR0aW5nczogYW55KTogc3RyaW5nIHtcclxuXHRcdC8vIElmIGNvbXBsZXRlQWxsTW92ZWRUYXNrcyBpcyBub3QgZW5hYmxlZCwgcmV0dXJuIHRoZSBvcmlnaW5hbCBsaW5lXHJcblx0XHRpZiAoIXNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5jb21wbGV0ZUFsbE1vdmVkVGFza3MpIHtcclxuXHRcdFx0cmV0dXJuIHRhc2tMaW5lO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGl0J3MgYSB0YXNrIGxpbmUgd2l0aCBjaGVja2JveFxyXG5cdFx0Y29uc3QgdGFza01hdGNoID0gdGFza0xpbmUubWF0Y2goL14oXFxzKig/Oi18XFxkK1xcLnxcXCopXFxzK1xcWykoLikoXS4qKSQvKTtcclxuXHJcblx0XHRpZiAoIXRhc2tNYXRjaCkge1xyXG5cdFx0XHRyZXR1cm4gdGFza0xpbmU7IC8vIE5vdCBhIHRhc2sgbGluZSwgcmV0dXJuIGFzIGlzXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBjb21wbGV0aW9uIHN5bWJvbCAoZmlyc3QgY2hhcmFjdGVyIGluIGNvbXBsZXRlZCBzdGF0dXMpXHJcblx0XHRjb25zdCBjb21wbGV0ZWRNYXJrID1cclxuXHRcdFx0c2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZD8uc3BsaXQoXCJ8XCIpWzBdIHx8IFwieFwiO1xyXG5cclxuXHRcdC8vIFJlcGxhY2UgdGhlIGN1cnJlbnQgbWFyayB3aXRoIHRoZSBjb21wbGV0ZWQgbWFya1xyXG5cdFx0cmV0dXJuIGAke3Rhc2tNYXRjaFsxXX0ke2NvbXBsZXRlZE1hcmt9JHt0YXNrTWF0Y2hbM119YDtcclxuXHR9XHJcblxyXG5cdC8vIFJlc2V0IGluZGVudGF0aW9uIGZvciBuZXcgZmlsZXNcclxuXHRzdGF0aWMgcmVzZXRJbmRlbnRhdGlvbihjb250ZW50OiBzdHJpbmcsIGFwcDogQXBwKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHQvLyBGaW5kIHRoZSBtaW5pbXVtIGluZGVudGF0aW9uIGluIGFsbCBsaW5lc1xyXG5cdFx0bGV0IG1pbkluZGVudCA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0Zm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcblx0XHRcdGlmIChsaW5lLnRyaW0oKS5sZW5ndGggPT09IDApIGNvbnRpbnVlOyAvLyBTa2lwIGVtcHR5IGxpbmVzXHJcblx0XHRcdGNvbnN0IGluZGVudCA9IHRoaXMuZ2V0SW5kZW50YXRpb24obGluZSwgYXBwKTtcclxuXHRcdFx0bWluSW5kZW50ID0gTWF0aC5taW4obWluSW5kZW50LCBpbmRlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIG5vIHZhbGlkIG1pbmltdW0gZm91bmQsIG9yIGl0J3MgYWxyZWFkeSAwLCByZXR1cm4gYXMgaXNcclxuXHRcdGlmIChtaW5JbmRlbnQgPT09IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSIHx8IG1pbkluZGVudCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gY29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgdGhlIG1pbmltdW0gaW5kZW50YXRpb24gZnJvbSBlYWNoIGxpbmVcclxuXHRcdHJldHVybiBsaW5lc1xyXG5cdFx0XHQubWFwKChsaW5lKSA9PiB7XHJcblx0XHRcdFx0aWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGxpbmU7IC8vIEtlZXAgZW1wdHkgbGluZXMgdW5jaGFuZ2VkXHJcblx0XHRcdFx0cmV0dXJuIGxpbmUuc3Vic3RyaW5nKG1pbkluZGVudCk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gRmluZCB0aGUgcGFyZW50IHRhc2sgaW5kZXggZm9yIGEgZ2l2ZW4gdGFza1xyXG5cdHN0YXRpYyBmaW5kUGFyZW50VGFza0luZGV4KFxyXG5cdFx0dGFza0luZGV4OiBudW1iZXIsXHJcblx0XHR0YXNrSW5kZW50OiBudW1iZXIsXHJcblx0XHRhbGxUYXNrczoge1xyXG5cdFx0XHRsaW5lOiBzdHJpbmc7XHJcblx0XHRcdGluZGV4OiBudW1iZXI7XHJcblx0XHRcdGluZGVudDogbnVtYmVyO1xyXG5cdFx0XHRpc0NvbXBsZXRlZDogYm9vbGVhbjtcclxuXHRcdH1bXVxyXG5cdCk6IG51bWJlciB7XHJcblx0XHQvLyBMb29rIGZvciB0aGUgY2xvc2VzdCB0YXNrIHdpdGggb25lIGxldmVsIGxlc3MgaW5kZW50YXRpb25cclxuXHRcdGZvciAoXHJcblx0XHRcdGxldCBpID0gYWxsVGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmluZGV4ID09PSB0YXNrSW5kZXgpIC0gMTtcclxuXHRcdFx0aSA+PSAwO1xyXG5cdFx0XHRpLS1cclxuXHRcdCkge1xyXG5cdFx0XHRpZiAoYWxsVGFza3NbaV0uaW5kZW50IDwgdGFza0luZGVudCkge1xyXG5cdFx0XHRcdHJldHVybiBhbGxUYXNrc1tpXS5pbmRleDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIC0xO1xyXG5cdH1cclxuXHJcblx0Ly8gQWRqdXN0IGluZGVudGF0aW9uIGZvciB0YXJnZXQgZmlsZXNcclxuXHQvLyBBZGp1c3QgaW5kZW50YXRpb24gZm9yIHRhcmdldCBmaWxlc1xyXG5cdHN0YXRpYyBhZGp1c3RJbmRlbnRhdGlvbihcclxuXHRcdHRhc2tDb250ZW50OiBzdHJpbmcsXHJcblx0XHR0YXJnZXRJbmRlbnQ6IG51bWJlcixcclxuXHRcdGFwcDogQXBwXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGxpbmVzID0gdGFza0NvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBpbmRlbnRhdGlvbiBvZiB0aGUgZmlyc3QgbGluZSAocGFyZW50IHRhc2spXHJcblx0XHRjb25zdCBmaXJzdExpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmVzWzBdLCBhcHApO1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSB0aGUgaW5kZW50YXRpb24gZGlmZmVyZW5jZVxyXG5cdFx0Y29uc3QgaW5kZW50RGlmZiA9IHRhcmdldEluZGVudCAtIGZpcnN0TGluZUluZGVudDtcclxuXHJcblx0XHRpZiAoaW5kZW50RGlmZiA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gdGFza0NvbnRlbnQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRqdXN0IGluZGVudGF0aW9uIGZvciBhbGwgbGluZXMsIG1haW50YWluaW5nIHJlbGF0aXZlIGhpZXJhcmNoeVxyXG5cdFx0cmV0dXJuIGxpbmVzXHJcblx0XHRcdC5tYXAoKGxpbmUsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudEluZGVudCA9IHRoaXMuZ2V0SW5kZW50YXRpb24obGluZSwgYXBwKTtcclxuXHJcblx0XHRcdFx0Ly8gRm9yIHRoZSBmaXJzdCBsaW5lIChwYXJlbnQgdGFzayksIHNldCBleGFjdGx5IHRvIHRhcmdldEluZGVudFxyXG5cdFx0XHRcdGlmIChpbmRleCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0YnVpbGRJbmRlbnRTdHJpbmcoYXBwKS5yZXBlYXQodGFyZ2V0SW5kZW50KSArXHJcblx0XHRcdFx0XHRcdGxpbmUuc3Vic3RyaW5nKGN1cnJlbnRJbmRlbnQpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gRm9yIGNoaWxkIHRhc2tzLCBtYWludGFpbiByZWxhdGl2ZSBpbmRlbnRhdGlvbiBkaWZmZXJlbmNlIGZyb20gcGFyZW50XHJcblx0XHRcdFx0Ly8gQ2FsY3VsYXRlIHJlbGF0aXZlIGluZGVudCBsZXZlbCBjb21wYXJlZCB0byB0aGUgcGFyZW50IHRhc2tcclxuXHRcdFx0XHRjb25zdCByZWxhdGl2ZUluZGVudCA9IGN1cnJlbnRJbmRlbnQgLSBmaXJzdExpbmVJbmRlbnQ7XHJcblxyXG5cdFx0XHRcdC8vIEFwcGx5IHRoZSBuZXcgYmFzZSBpbmRlbnRhdGlvbiBwbHVzIHRoZSByZWxhdGl2ZSBpbmRlbnRcclxuXHRcdFx0XHRjb25zdCBuZXdJbmRlbnQgPSBNYXRoLm1heCgwLCB0YXJnZXRJbmRlbnQgKyByZWxhdGl2ZUluZGVudCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRidWlsZEluZGVudFN0cmluZyhhcHApLnJlcGVhdChuZXdJbmRlbnQgLyBnZXRUYWJTaXplKGFwcCkpICtcclxuXHRcdFx0XHRcdGxpbmUudHJpbVN0YXJ0KClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuam9pbihcIlxcblwiKTtcclxuXHR9XHJcblxyXG5cdC8vIFByb2Nlc3MgdGFza3MgZnJvbSBtdWx0aXBsZSBzZWxlY3RlZCBsaW5lc1xyXG5cdHN0YXRpYyBwcm9jZXNzU2VsZWN0ZWRUYXNrcyhcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0dGFza0xpbmVzOiBudW1iZXJbXSxcclxuXHRcdG1vdmVNb2RlOlxyXG5cdFx0XHR8IFwiYWxsQ29tcGxldGVkXCJcclxuXHRcdFx0fCBcImRpcmVjdENoaWxkcmVuXCJcclxuXHRcdFx0fCBcImFsbFwiXHJcblx0XHRcdHwgXCJhbGxJbmNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCIsXHJcblx0XHRzZXR0aW5nczogYW55LFxyXG5cdFx0Y3VycmVudEZpbGU6IFRGaWxlLFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpc1NvdXJjZUZpbGU6IGJvb2xlYW4gPSB0cnVlXHJcblx0KToge1xyXG5cdFx0Y29udGVudDogc3RyaW5nO1xyXG5cdFx0bGluZXNUb1JlbW92ZTogbnVtYmVyW107XHJcblx0fSB7XHJcblx0XHQvLyBTb3J0IHRhc2sgbGluZXMgaW4gZGVzY2VuZGluZyBvcmRlciB0byBwcm9jZXNzIGJvdHRvbS11cFxyXG5cdFx0Y29uc3Qgc29ydGVkVGFza0xpbmVzID0gWy4uLnRhc2tMaW5lc10uc29ydCgoYSwgYikgPT4gYiAtIGEpO1xyXG5cclxuXHRcdC8vIFVzZSBTZXRzIHRvIGF2b2lkIGR1cGxpY2F0ZXMgZm9yIGxpbmVzIHRvIHJlbW92ZSBhbmQgY29udGVudCB0byBjb3B5XHJcblx0XHRjb25zdCBsaW5lc1RvUmVtb3ZlU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblx0XHRjb25zdCBjb250ZW50TWFwID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZ1tdPigpO1xyXG5cclxuXHRcdC8vIEZpcnN0IHBhc3M6IGNvbGxlY3QgYWxsIGxpbmVzIHRvIHJlbW92ZSBhbmQgY29udGVudCB0byBjb3B5XHJcblx0XHRmb3IgKGNvbnN0IHRhc2tMaW5lIG9mIHNvcnRlZFRhc2tMaW5lcykge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSB0aGlzLnByb2Nlc3NTaW5nbGVTZWxlY3RlZFRhc2soXHJcblx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdHRhc2tMaW5lLFxyXG5cdFx0XHRcdG1vdmVNb2RlLFxyXG5cdFx0XHRcdHNldHRpbmdzLFxyXG5cdFx0XHRcdGN1cnJlbnRGaWxlLFxyXG5cdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRpc1NvdXJjZUZpbGVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFN0b3JlIGNvbnRlbnQgbGluZXMgZm9yIHRoaXMgdGFza1xyXG5cdFx0XHRjb250ZW50TWFwLnNldCh0YXNrTGluZSwgcmVzdWx0LmNvbnRlbnQuc3BsaXQoXCJcXG5cIikpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGxpbmVzIHRvIHJlbW92ZSB0byB0aGUgc2V0XHJcblx0XHRcdHJlc3VsdC5saW5lc1RvUmVtb3ZlLmZvckVhY2goKGxpbmUpID0+IGxpbmVzVG9SZW1vdmVTZXQuYWRkKGxpbmUpKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZWNvbmQgcGFzczogYnVpbGQgdGhlIGZpbmFsIGNvbnRlbnQgYnkgcHJvcGVybHkgb3JkZXJpbmcgdGFzayBjb250ZW50XHJcblx0XHQvLyBTb3J0IHRhc2tzIGZyb20gdG9wIHRvIGJvdHRvbSBmb3IgY29udGVudCBvcmRlcmluZ1xyXG5cdFx0Y29uc3Qgb3JkZXJlZFRhc2tMaW5lcyA9IFsuLi50YXNrTGluZXNdLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHJcblx0XHRjb25zdCBhbGxSZXN1bHRMaW5lczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHQvLyBQcm9jZXNzIGVhY2ggdGFzayBpbiBvcmRlciAodG9wIHRvIGJvdHRvbSlcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgb3JkZXJlZFRhc2tMaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCB0YXNrTGluZSA9IG9yZGVyZWRUYXNrTGluZXNbaV07XHJcblxyXG5cdFx0XHQvLyBTa2lwIGlmIHRoaXMgdGFzayBpcyBjb250YWluZWQgd2l0aGluIGFub3RoZXIgdGFzaydzIHJlbW92YWwgcmFuZ2VcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdG9yZGVyZWRUYXNrTGluZXMuc29tZSgob3RoZXJMaW5lKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAob3RoZXJMaW5lID09PSB0YXNrTGluZSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBlZGl0b3IuZ2V0VmFsdWUoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IG90aGVySW5kZW50ID0gdGhpcy5nZXRJbmRlbnRhdGlvbihcclxuXHRcdFx0XHRcdFx0bGluZXNbb3RoZXJMaW5lXSxcclxuXHRcdFx0XHRcdFx0YXBwXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFza0luZGVudCA9IHRoaXMuZ2V0SW5kZW50YXRpb24oXHJcblx0XHRcdFx0XHRcdGxpbmVzW3Rhc2tMaW5lXSxcclxuXHRcdFx0XHRcdFx0YXBwXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgdGFzayBpcyBhIHN1YnRhc2sgb2YgYW5vdGhlciBzZWxlY3RlZCB0YXNrXHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZSA+IG90aGVyTGluZSAmJlxyXG5cdFx0XHRcdFx0XHR0YXNrSW5kZW50ID4gb3RoZXJJbmRlbnQgJiZcclxuXHRcdFx0XHRcdFx0IW9yZGVyZWRUYXNrTGluZXMuc29tZShcclxuXHRcdFx0XHRcdFx0XHQobGluZSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGxpbmUgPiBvdGhlckxpbmUgJiZcclxuXHRcdFx0XHRcdFx0XHRcdGxpbmUgPCB0YXNrTGluZSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5nZXRJbmRlbnRhdGlvbihsaW5lc1tsaW5lXSwgYXBwKSA8PVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRvdGhlckluZGVudFxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgYSBibGFuayBsaW5lIGJldHdlZW4gdGFzayBncm91cHMgaWYgbm90IHRoZSBmaXJzdCB0YXNrXHJcblx0XHRcdGlmIChhbGxSZXN1bHRMaW5lcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YWxsUmVzdWx0TGluZXMucHVzaChcIlwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSBjb250ZW50IGZvciB0aGlzIHRhc2tcclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBjb250ZW50TWFwLmdldCh0YXNrTGluZSk7XHJcblx0XHRcdGlmICh0YXNrQ29udGVudCkge1xyXG5cdFx0XHRcdGFsbFJlc3VsdExpbmVzLnB1c2goLi4udGFza0NvbnRlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29udmVydCB0aGUgc2V0IHRvIGFuIGFycmF5XHJcblx0XHRjb25zdCBhbGxMaW5lc1RvUmVtb3ZlID0gQXJyYXkuZnJvbShsaW5lc1RvUmVtb3ZlU2V0KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjb250ZW50OiBhbGxSZXN1bHRMaW5lc1xyXG5cdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpICE9PSBcIlwiKVxyXG5cdFx0XHRcdC5qb2luKFwiXFxuXCIpLFxyXG5cdFx0XHRsaW5lc1RvUmVtb3ZlOiBhbGxMaW5lc1RvUmVtb3ZlLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIFByb2Nlc3MgYSBzaW5nbGUgc2VsZWN0ZWQgdGFza1xyXG5cdHN0YXRpYyBwcm9jZXNzU2luZ2xlU2VsZWN0ZWRUYXNrKFxyXG5cdFx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0XHR0YXNrTGluZTogbnVtYmVyLFxyXG5cdFx0bW92ZU1vZGU6XHJcblx0XHRcdHwgXCJhbGxDb21wbGV0ZWRcIlxyXG5cdFx0XHR8IFwiZGlyZWN0Q2hpbGRyZW5cIlxyXG5cdFx0XHR8IFwiYWxsXCJcclxuXHRcdFx0fCBcImFsbEluY29tcGxldGVkXCJcclxuXHRcdFx0fCBcImRpcmVjdEluY29tcGxldGVkQ2hpbGRyZW5cIixcclxuXHRcdHNldHRpbmdzOiBhbnksXHJcblx0XHRjdXJyZW50RmlsZTogVEZpbGUsXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlzU291cmNlRmlsZTogYm9vbGVhbiA9IHRydWVcclxuXHQpOiB7XHJcblx0XHRjb250ZW50OiBzdHJpbmc7XHJcblx0XHRsaW5lc1RvUmVtb3ZlOiBudW1iZXJbXTtcclxuXHR9IHtcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBlZGl0b3IuZ2V0VmFsdWUoKTtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdGNvbnN0IHJlc3VsdExpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0Y29uc3QgbGluZXNUb1JlbW92ZTogbnVtYmVyW10gPSBbXTtcclxuXHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgdGFzayBsaW5lXHJcblx0XHRjb25zdCBjdXJyZW50TGluZSA9IGxpbmVzW3Rhc2tMaW5lXTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgY3VycmVudCBsaW5lIGlzIGFjdHVhbGx5IGEgdGFza1xyXG5cdFx0Ly8gVGFza3MgbXVzdCBtYXRjaCBwYXR0ZXJuOiBvcHRpb25hbCB3aGl0ZXNwYWNlICsgbGlzdCBtYXJrZXIgKC0sIG51bWJlci4sIG9yICopICsgc3BhY2UgKyBjaGVja2JveFxyXG5cdFx0Y29uc3QgdGFza1BhdHRlcm4gPSAvXlxccyooLXxcXGQrXFwufFxcKikgXFxbKC4pXFxdLztcclxuXHRcdGlmICghdGFza1BhdHRlcm4udGVzdChjdXJyZW50TGluZSkpIHtcclxuXHRcdFx0Ly8gTm90IGEgdGFzayBsaW5lLCByZXR1cm4gZW1wdHkgcmVzdWx0XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29udGVudDogXCJcIixcclxuXHRcdFx0XHRsaW5lc1RvUmVtb3ZlOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjdXJyZW50SW5kZW50ID0gdGhpcy5nZXRJbmRlbnRhdGlvbihjdXJyZW50TGluZSwgYXBwKTtcclxuXHJcblx0XHQvLyBFeHRyYWN0IHRoZSBwYXJlbnQgdGFzaydzIG1hcmtcclxuXHRcdGNvbnN0IHBhcmVudFRhc2tNYXRjaCA9IGN1cnJlbnRMaW5lLm1hdGNoKC9cXFsoLildLyk7XHJcblx0XHRjb25zdCBwYXJlbnRUYXNrTWFyayA9IHBhcmVudFRhc2tNYXRjaCA/IHBhcmVudFRhc2tNYXRjaFsxXSA6IFwiXCI7XHJcblxyXG5cdFx0Ly8gQ2xvbmUgcGFyZW50IHRhc2sgd2l0aCBtYXJrZXIgYmFzZWQgb24gbW92ZSBtb2RlXHJcblx0XHRsZXQgcGFyZW50VGFza1dpdGhNYXJrZXI6IHN0cmluZztcclxuXHRcdGlmIChcclxuXHRcdFx0bW92ZU1vZGUgPT09IFwiYWxsSW5jb21wbGV0ZWRcIiB8fFxyXG5cdFx0XHRtb3ZlTW9kZSA9PT0gXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCJcclxuXHRcdCkge1xyXG5cdFx0XHRwYXJlbnRUYXNrV2l0aE1hcmtlciA9IHRoaXMuYWRkTWFya2VyVG9JbmNvbXBsZXRlZFRhc2soXHJcblx0XHRcdFx0Y3VycmVudExpbmUsXHJcblx0XHRcdFx0c2V0dGluZ3MsXHJcblx0XHRcdFx0Y3VycmVudEZpbGUsXHJcblx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHBhcmVudFRhc2tXaXRoTWFya2VyID0gdGhpcy5hZGRNYXJrZXJUb1Rhc2soXHJcblx0XHRcdFx0Y3VycmVudExpbmUsXHJcblx0XHRcdFx0c2V0dGluZ3MsXHJcblx0XHRcdFx0Y3VycmVudEZpbGUsXHJcblx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gQ29tcGxldGUgcGFyZW50IHRhc2sgaWYgc2V0dGluZyBpcyBlbmFibGVkIChvbmx5IGZvciBjb21wbGV0ZWQgdGFzayBtb2RlcylcclxuXHRcdFx0cGFyZW50VGFza1dpdGhNYXJrZXIgPSB0aGlzLmNvbXBsZXRlVGFza0lmTmVlZGVkKFxyXG5cdFx0XHRcdHBhcmVudFRhc2tXaXRoTWFya2VyLFxyXG5cdFx0XHRcdHNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSW5jbHVkZSB0aGUgY3VycmVudCBsaW5lIGFuZCBjb21wbGV0ZWQgY2hpbGQgdGFza3NcclxuXHRcdHJlc3VsdExpbmVzLnB1c2gocGFyZW50VGFza1dpdGhNYXJrZXIpO1xyXG5cclxuXHRcdC8vIEZpcnN0LCBjb2xsZWN0IGFsbCBpbmRlbnRlZCBjb250ZW50IHRoYXQgYmVsb25ncyB0byB0aGlzIHRhc2sgKGZvbGRlZCBjb250ZW50KVxyXG5cdFx0Ly8gVGhpcyBpbmNsdWRlcyBub3RlcywgdGFncywgYW5kIG90aGVyIGNvbnRlbnQgdGhhdCBpcyBpbmRlbnRlZCB1bmRlciB0aGUgdGFza1xyXG5cdFx0Y29uc3QgdGFza0NvbnRlbnQ6IHsgbGluZTogc3RyaW5nOyBpbmRleDogbnVtYmVyOyBpbmRlbnQ6IG51bWJlciB9W10gPSBbXTtcclxuXHRcdGZvciAobGV0IGkgPSB0YXNrTGluZSArIDE7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmUsIGFwcCk7XHJcblxyXG5cdFx0XHQvLyBTdG9wIGlmIHdlJ3ZlIHJlYWNoZWQgY29udGVudCBhdCB0aGUgc2FtZSBvciBsb3dlciBpbmRlbnRhdGlvbiBsZXZlbFxyXG5cdFx0XHRpZiAobGluZUluZGVudCA8PSBjdXJyZW50SW5kZW50KSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSB0YXNrIGF0IHRoZSBkaXJlY3QgY2hpbGQgbGV2ZWxcclxuXHRcdFx0Y29uc3QgaXNUYXNrID0gL15cXHMqKC18XFxkK1xcLnxcXCopIFxcWyguKVxcXS8udGVzdChsaW5lKTtcclxuXHRcdFx0aWYgKGlzVGFzaykge1xyXG5cdFx0XHRcdC8vIEZvciBub24tXCJhbGxcIiBtb2Rlcywgd2UgbmVlZCB0byBoYW5kbGUgY2hpbGQgdGFza3Mgc3BlY2lhbGx5XHJcblx0XHRcdFx0Ly8gU28gd2Ugc3RvcCBjb2xsZWN0aW5nIHRoZSBpbW1lZGlhdGUgZm9sZGVkIGNvbnRlbnQgaGVyZVxyXG5cdFx0XHRcdGlmIChtb3ZlTW9kZSAhPT0gXCJhbGxcIikge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUaGlzIGlzIGluZGVudGVkIGNvbnRlbnQgdGhhdCBiZWxvbmdzIHRvIHRoZSBwYXJlbnQgdGFza1xyXG5cdFx0XHR0YXNrQ29udGVudC5wdXNoKHsgbGluZSwgaW5kZXg6IGksIGluZGVudDogbGluZUluZGVudCB9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSdyZSBtb3ZpbmcgYWxsIHN1YnRhc2tzLCB3ZSdsbCBjb2xsZWN0IHRoZW0gYWxsXHJcblx0XHRpZiAobW92ZU1vZGUgPT09IFwiYWxsXCIpIHtcclxuXHRcdFx0Ly8gQWRkIGFsbCB0aGUgZm9sZGVkIGNvbnRlbnQgYW5kIHN1YnRhc2tzXHJcblx0XHRcdGZvciAoY29uc3QgaXRlbSBvZiB0YXNrQ29udGVudCkge1xyXG5cdFx0XHRcdHJlc3VsdExpbmVzLnB1c2godGhpcy5jb21wbGV0ZVRhc2tJZk5lZWRlZChpdGVtLmxpbmUsIHNldHRpbmdzKSk7XHJcblx0XHRcdFx0bGluZXNUb1JlbW92ZS5wdXNoKGl0ZW0uaW5kZXgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb250aW51ZSBjb2xsZWN0aW5nIGFsbCBuZXN0ZWQgc3VidGFza3MgYmV5b25kIHRoZSBpbW1lZGlhdGUgZm9sZGVkIGNvbnRlbnRcclxuXHRcdFx0Zm9yIChsZXQgaSA9IHRhc2tMaW5lICsgdGFza0NvbnRlbnQubGVuZ3RoICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmUsIGFwcCk7XHJcblxyXG5cdFx0XHRcdC8vIElmIGluZGVudGF0aW9uIGlzIGxlc3Mgb3IgZXF1YWwgdG8gY3VycmVudCB0YXNrLCB3ZSd2ZSBleGl0ZWQgdGhlIGNoaWxkIHRhc2tzXHJcblx0XHRcdFx0aWYgKGxpbmVJbmRlbnQgPD0gY3VycmVudEluZGVudCkge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKHRoaXMuY29tcGxldGVUYXNrSWZOZWVkZWQobGluZSwgc2V0dGluZ3MpKTtcclxuXHRcdFx0XHRsaW5lc1RvUmVtb3ZlLnB1c2goaSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCB0aGUgbWFpbiB0YXNrIGxpbmUgdG8gcmVtb3ZlXHJcblx0XHRcdGxpbmVzVG9SZW1vdmUucHVzaCh0YXNrTGluZSk7XHJcblx0XHR9XHJcblx0XHQvLyBJZiB3ZSdyZSBtb3Zpbmcgb25seSBjb21wbGV0ZWQgdGFza3Mgb3IgZGlyZWN0IGNoaWxkcmVuXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Ly8gQWx3YXlzIGluY2x1ZGUgdGhlIGltbWVkaWF0ZSBmb2xkZWQgY29udGVudCAobm90ZXMsIHRhZ3MsIGV0Yy4pXHJcblx0XHRcdGZvciAoY29uc3QgaXRlbSBvZiB0YXNrQ29udGVudCkge1xyXG5cdFx0XHRcdHJlc3VsdExpbmVzLnB1c2goaXRlbS5saW5lKTsgLy8gRG9uJ3QgY29tcGxldGUgbm9uLXRhc2sgY29udGVudFxyXG5cdFx0XHRcdGxpbmVzVG9SZW1vdmUucHVzaChpdGVtLmluZGV4KTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBGaXJzdCBwYXNzOiBjb2xsZWN0IGFsbCBjaGlsZCB0YXNrcyB0byBhbmFseXplXHJcblx0XHRcdGNvbnN0IGNoaWxkVGFza3M6IHtcclxuXHRcdFx0XHRsaW5lOiBzdHJpbmc7XHJcblx0XHRcdFx0aW5kZXg6IG51bWJlcjtcclxuXHRcdFx0XHRpbmRlbnQ6IG51bWJlcjtcclxuXHRcdFx0XHRpc0NvbXBsZXRlZDogYm9vbGVhbjtcclxuXHRcdFx0XHRpc0luY29tcGxldGVkOiBib29sZWFuO1xyXG5cdFx0XHR9W10gPSBbXTtcclxuXHJcblx0XHRcdC8vIFN0YXJ0IGFmdGVyIHRoZSBmb2xkZWQgY29udGVudCB3ZSBhbHJlYWR5IGNvbGxlY3RlZFxyXG5cdFx0XHRjb25zdCBzdGFydEluZGV4ID0gdGFza0xpbmUgKyB0YXNrQ29udGVudC5sZW5ndGggKyAxO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gc3RhcnRJbmRleDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmUsIGFwcCk7XHJcblxyXG5cdFx0XHRcdC8vIElmIGluZGVudGF0aW9uIGlzIGxlc3Mgb3IgZXF1YWwgdG8gY3VycmVudCB0YXNrLCB3ZSd2ZSBleGl0ZWQgdGhlIGNoaWxkIHRhc2tzXHJcblx0XHRcdFx0aWYgKGxpbmVJbmRlbnQgPD0gY3VycmVudEluZGVudCkge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgdGFza1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tNYXRjaCA9IGxpbmUubWF0Y2goL1xcWyguKV0vKTtcclxuXHRcdFx0XHRpZiAodGFza01hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCB0YXNrTWFyayA9IHRhc2tNYXRjaFsxXTtcclxuXHRcdFx0XHRcdGNvbnN0IGlzQ29tcGxldGVkID0gdGhpcy5pc0NvbXBsZXRlZFRhc2tNYXJrKFxyXG5cdFx0XHRcdFx0XHR0YXNrTWFyayxcclxuXHRcdFx0XHRcdFx0c2V0dGluZ3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjb25zdCBpc0luY29tcGxldGVkID0gdGhpcy5pc0luY29tcGxldGVkVGFza01hcmsoXHJcblx0XHRcdFx0XHRcdHRhc2tNYXJrLFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nc1xyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRjaGlsZFRhc2tzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRsaW5lLFxyXG5cdFx0XHRcdFx0XHRpbmRleDogaSxcclxuXHRcdFx0XHRcdFx0aW5kZW50OiBsaW5lSW5kZW50LFxyXG5cdFx0XHRcdFx0XHRpc0NvbXBsZXRlZCxcclxuXHRcdFx0XHRcdFx0aXNJbmNvbXBsZXRlZCxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBOb24tdGFzayBsaW5lcyBzaG91bGQgYmUgaW5jbHVkZWQgd2l0aCB0aGVpciByZWxhdGVkIHRhc2tcclxuXHRcdFx0XHRcdGNoaWxkVGFza3MucHVzaCh7XHJcblx0XHRcdFx0XHRcdGxpbmUsXHJcblx0XHRcdFx0XHRcdGluZGV4OiBpLFxyXG5cdFx0XHRcdFx0XHRpbmRlbnQ6IGxpbmVJbmRlbnQsXHJcblx0XHRcdFx0XHRcdGlzQ29tcGxldGVkOiBmYWxzZSwgLy8gTm9uLXRhc2sgbGluZXMgYXJlbid0IGNvbXBsZXRlZFxyXG5cdFx0XHRcdFx0XHRpc0luY29tcGxldGVkOiBmYWxzZSwgLy8gTm9uLXRhc2sgbGluZXMgYXJlbid0IGluY29tcGxldGUgZWl0aGVyXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgY2hpbGQgdGFza3MgYmFzZWQgb24gdGhlIG1vZGVcclxuXHRcdFx0aWYgKG1vdmVNb2RlID09PSBcImFsbENvbXBsZXRlZFwiKSB7XHJcblx0XHRcdFx0Ly8gT25seSBpbmNsdWRlIGNvbXBsZXRlZCB0YXNrcyAoYW5kIHRoZWlyIGNoaWxkcmVuKVxyXG5cdFx0XHRcdGNvbnN0IGNvbXBsZXRlZFRhc2tzID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblx0XHRcdFx0Y29uc3QgdGFza3NUb0luY2x1ZGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHRcdFx0XHRjb25zdCBwYXJlbnRUYXNrc1RvUHJlc2VydmUgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcblx0XHRcdFx0Ly8gRmlyc3QgaWRlbnRpZnkgYWxsIGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0XHRcdGNoaWxkVGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2suaXNDb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkVGFza3MuYWRkKHRhc2suaW5kZXgpO1xyXG5cdFx0XHRcdFx0XHR0YXNrc1RvSW5jbHVkZS5hZGQodGFzay5pbmRleCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgYWxsIHBhcmVudCB0YXNrcyB1cCB0byB0aGUgcm9vdCB0YXNrXHJcblx0XHRcdFx0XHRcdGxldCBjdXJyZW50VGFzayA9IHRhc2s7XHJcblx0XHRcdFx0XHRcdGxldCBwYXJlbnRJbmRleCA9IHRoaXMuZmluZFBhcmVudFRhc2tJbmRleChcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50VGFzay5pbmRleCxcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50VGFzay5pbmRlbnQsXHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRUYXNrc1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0d2hpbGUgKHBhcmVudEluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdHRhc2tzVG9JbmNsdWRlLmFkZChwYXJlbnRJbmRleCk7XHJcblx0XHRcdFx0XHRcdFx0Ly8gT25seSBtYXJrIHBhcmVudCB0YXNrcyBmb3IgcmVtb3ZhbCBpZiB0aGV5J3JlIGNvbXBsZXRlZFxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmVudFRhc2sgPSBjaGlsZFRhc2tzLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0XHQodCkgPT4gdC5pbmRleCA9PT0gcGFyZW50SW5kZXhcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGlmICghcGFyZW50VGFzaykgYnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmICghcGFyZW50VGFzay5pc0NvbXBsZXRlZCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50VGFza3NUb1ByZXNlcnZlLmFkZChwYXJlbnRJbmRleCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRwYXJlbnRJbmRleCA9IHRoaXMuZmluZFBhcmVudFRhc2tJbmRleChcclxuXHRcdFx0XHRcdFx0XHRcdHBhcmVudFRhc2suaW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnRUYXNrLmluZGVudCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkVGFza3NcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIFRoZW4gaW5jbHVkZSBhbGwgY2hpbGRyZW4gb2YgY29tcGxldGVkIHRhc2tzXHJcblx0XHRcdFx0Y2hpbGRUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBwYXJlbnRJbmRleCA9IHRoaXMuZmluZFBhcmVudFRhc2tJbmRleChcclxuXHRcdFx0XHRcdFx0dGFzay5pbmRleCxcclxuXHRcdFx0XHRcdFx0dGFzay5pbmRlbnQsXHJcblx0XHRcdFx0XHRcdGNoaWxkVGFza3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAocGFyZW50SW5kZXggIT09IC0xICYmIGNvbXBsZXRlZFRhc2tzLmhhcyhwYXJlbnRJbmRleCkpIHtcclxuXHRcdFx0XHRcdFx0dGFza3NUb0luY2x1ZGUuYWRkKHRhc2suaW5kZXgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgdGhlIHNlbGVjdGVkIGl0ZW1zIHRvIHJlc3VsdHMsIHNvcnRpbmcgYnkgaW5kZXggdG8gbWFpbnRhaW4gb3JkZXJcclxuXHRcdFx0XHRjb25zdCB0YXNrc0J5SW5kZXggPSBbLi4udGFza3NUb0luY2x1ZGVdLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHJcblx0XHRcdFx0cmVzdWx0TGluZXMubGVuZ3RoID0gMDsgLy8gQ2xlYXIgcmVzdWx0TGluZXMgYmVmb3JlIHJlYnVpbGRpbmdcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHBhcmVudCB0YXNrIHdpdGggbWFya2VyXHJcblx0XHRcdFx0cmVzdWx0TGluZXMucHVzaChwYXJlbnRUYXNrV2l0aE1hcmtlcik7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCBjaGlsZCB0YXNrcyBpbiBvcmRlclxyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0luZGV4IG9mIHRhc2tzQnlJbmRleCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IGNoaWxkVGFza3MuZmluZCgodCkgPT4gdC5pbmRleCA9PT0gdGFza0luZGV4KTtcclxuXHRcdFx0XHRcdGlmICghdGFzaykgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWRkIG1hcmtlciB0byBwYXJlbnQgdGFza3MgdGhhdCBhcmUgcHJlc2VydmVkXHJcblx0XHRcdFx0XHRpZiAocGFyZW50VGFza3NUb1ByZXNlcnZlLmhhcyh0YXNrSW5kZXgpKSB7XHJcblx0XHRcdFx0XHRcdGxldCB0YXNrTGluZSA9IHRoaXMuYWRkTWFya2VyVG9UYXNrKFxyXG5cdFx0XHRcdFx0XHRcdHRhc2subGluZSxcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5ncyxcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50RmlsZSxcclxuXHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0ZmFsc2VcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Ly8gQ29tcGxldGUgdGhlIHRhc2sgaWYgc2V0dGluZyBpcyBlbmFibGVkXHJcblx0XHRcdFx0XHRcdHRhc2tMaW5lID0gdGhpcy5jb21wbGV0ZVRhc2tJZk5lZWRlZChcclxuXHRcdFx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nc1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKHRhc2tMaW5lKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIENvbXBsZXRlIHRoZSB0YXNrIGlmIHNldHRpbmcgaXMgZW5hYmxlZFxyXG5cdFx0XHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29tcGxldGVUYXNrSWZOZWVkZWQodGFzay5saW5lLCBzZXR0aW5ncylcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBPbmx5IGFkZCB0byBsaW5lc1RvUmVtb3ZlIGlmIGl0J3MgY29tcGxldGVkIG9yIGEgY2hpbGQgb2YgY29tcGxldGVkXHJcblx0XHRcdFx0XHRpZiAoIXBhcmVudFRhc2tzVG9QcmVzZXJ2ZS5oYXModGFza0luZGV4KSkge1xyXG5cdFx0XHRcdFx0XHRsaW5lc1RvUmVtb3ZlLnB1c2godGFza0luZGV4KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHBhcmVudCB0YXNrIGlzIGNvbXBsZXRlZCwgYWRkIGl0IHRvIGxpbmVzIHRvIHJlbW92ZVxyXG5cdFx0XHRcdGlmICh0aGlzLmlzQ29tcGxldGVkVGFza01hcmsocGFyZW50VGFza01hcmssIHNldHRpbmdzKSkge1xyXG5cdFx0XHRcdFx0bGluZXNUb1JlbW92ZS5wdXNoKHRhc2tMaW5lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAobW92ZU1vZGUgPT09IFwiZGlyZWN0Q2hpbGRyZW5cIikge1xyXG5cdFx0XHRcdC8vIE9ubHkgaW5jbHVkZSBkaXJlY3QgY2hpbGRyZW4gdGhhdCBhcmUgY29tcGxldGVkXHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkRGlyZWN0Q2hpbGRyZW4gPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcblx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSBtaW5pbXVtIGluZGVudGF0aW9uIGxldmVsIG9mIGRpcmVjdCBjaGlsZHJlblxyXG5cdFx0XHRcdGxldCBtaW5DaGlsZEluZGVudCA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFzayBvZiBjaGlsZFRhc2tzKSB7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHRhc2suaW5kZW50ID4gY3VycmVudEluZGVudCAmJlxyXG5cdFx0XHRcdFx0XHR0YXNrLmluZGVudCA8IG1pbkNoaWxkSW5kZW50XHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0bWluQ2hpbGRJbmRlbnQgPSB0YXNrLmluZGVudDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIE5vdyBpZGVudGlmeSBhbGwgZGlyZWN0IGNoaWxkcmVuIHVzaW5nIHRoZSBjYWxjdWxhdGVkIGluZGVudGF0aW9uXHJcblx0XHRcdFx0Zm9yIChjb25zdCB0YXNrIG9mIGNoaWxkVGFza3MpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGlzRGlyZWN0Q2hpbGQgPSB0YXNrLmluZGVudCA9PT0gbWluQ2hpbGRJbmRlbnQ7XHJcblx0XHRcdFx0XHRpZiAoaXNEaXJlY3RDaGlsZCAmJiB0YXNrLmlzQ29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZERpcmVjdENoaWxkcmVuLmFkZCh0YXNrLmluZGV4KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEluY2x1ZGUgYWxsIGlkZW50aWZpZWQgZGlyZWN0IGNvbXBsZXRlZCBjaGlsZHJlbiBhbmQgdGhlaXIgc3VidGFza3NcclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5sZW5ndGggPSAwOyAvLyBDbGVhciByZXN1bHRMaW5lcyBiZWZvcmUgcmVidWlsZGluZ1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgcGFyZW50IHRhc2sgd2l0aCBtYXJrZXJcclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKHBhcmVudFRhc2tXaXRoTWFya2VyKTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGRpcmVjdCBjb21wbGV0ZWQgY2hpbGRyZW4gaW4gb3JkZXJcclxuXHRcdFx0XHRjb25zdCBzb3J0ZWRDaGlsZEluZGljZXMgPSBbLi4uY29tcGxldGVkRGlyZWN0Q2hpbGRyZW5dLnNvcnQoXHJcblx0XHRcdFx0XHQoYSwgYikgPT4gYSAtIGJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0luZGV4IG9mIHNvcnRlZENoaWxkSW5kaWNlcykge1xyXG5cdFx0XHRcdFx0Ly8gQWRkIHRoZSBkaXJlY3QgY29tcGxldGVkIGNoaWxkXHJcblx0XHRcdFx0XHRjb25zdCB0YXNrID0gY2hpbGRUYXNrcy5maW5kKCh0KSA9PiB0LmluZGV4ID09PSB0YXNrSW5kZXgpO1xyXG5cdFx0XHRcdFx0aWYgKCF0YXNrKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbXBsZXRlVGFza0lmTmVlZGVkKHRhc2subGluZSwgc2V0dGluZ3MpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0bGluZXNUb1JlbW92ZS5wdXNoKHRhc2tJbmRleCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWRkIGFsbCBpdHMgc3VidGFza3MgKHJlZ2FyZGxlc3Mgb2YgY29tcGxldGlvbiBzdGF0dXMpXHJcblx0XHRcdFx0XHRsZXQgaSA9XHJcblx0XHRcdFx0XHRcdGNoaWxkVGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmluZGV4ID09PSB0YXNrSW5kZXgpICsgMTtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tJbmRlbnQgPSB0YXNrLmluZGVudDtcclxuXHJcblx0XHRcdFx0XHR3aGlsZSAoaSA8IGNoaWxkVGFza3MubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN1YnRhc2sgPSBjaGlsZFRhc2tzW2ldO1xyXG5cdFx0XHRcdFx0XHRpZiAoc3VidGFzay5pbmRlbnQgPD0gdGFza0luZGVudCkgYnJlYWs7IC8vIEV4aXQgaWYgd2UncmUgYmFjayBhdCBzYW1lIG9yIGxvd2VyIGluZGVudCBsZXZlbFxyXG5cclxuXHRcdFx0XHRcdFx0cmVzdWx0TGluZXMucHVzaChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbXBsZXRlVGFza0lmTmVlZGVkKHN1YnRhc2subGluZSwgc2V0dGluZ3MpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGxpbmVzVG9SZW1vdmUucHVzaChzdWJ0YXNrLmluZGV4KTtcclxuXHRcdFx0XHRcdFx0aSsrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgcGFyZW50IHRhc2sgaXMgY29tcGxldGVkLCBhZGQgaXQgdG8gbGluZXMgdG8gcmVtb3ZlXHJcblx0XHRcdFx0aWYgKHRoaXMuaXNDb21wbGV0ZWRUYXNrTWFyayhwYXJlbnRUYXNrTWFyaywgc2V0dGluZ3MpKSB7XHJcblx0XHRcdFx0XHRsaW5lc1RvUmVtb3ZlLnB1c2godGFza0xpbmUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChtb3ZlTW9kZSA9PT0gXCJhbGxJbmNvbXBsZXRlZFwiKSB7XHJcblx0XHRcdFx0Ly8gT25seSBpbmNsdWRlIGluY29tcGxldGUgdGFza3MgKGFuZCB0aGVpciBjaGlsZHJlbilcclxuXHRcdFx0XHRjb25zdCBpbmNvbXBsZXRlZFRhc2tzID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblx0XHRcdFx0Y29uc3QgdGFza3NUb0luY2x1ZGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHRcdFx0XHRjb25zdCBwYXJlbnRUYXNrc1RvUHJlc2VydmUgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcblx0XHRcdFx0Ly8gRmlyc3QgaWRlbnRpZnkgYWxsIGluY29tcGxldGUgdGFza3NcclxuXHRcdFx0XHRjaGlsZFRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrLmlzSW5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRcdFx0aW5jb21wbGV0ZWRUYXNrcy5hZGQodGFzay5pbmRleCk7XHJcblx0XHRcdFx0XHRcdHRhc2tzVG9JbmNsdWRlLmFkZCh0YXNrLmluZGV4KTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEFkZCBhbGwgcGFyZW50IHRhc2tzIHVwIHRvIHRoZSByb290IHRhc2tcclxuXHRcdFx0XHRcdFx0bGV0IGN1cnJlbnRUYXNrID0gdGFzaztcclxuXHRcdFx0XHRcdFx0bGV0IHBhcmVudEluZGV4ID0gdGhpcy5maW5kUGFyZW50VGFza0luZGV4KFxyXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRUYXNrLmluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRUYXNrLmluZGVudCxcclxuXHRcdFx0XHRcdFx0XHRjaGlsZFRhc2tzXHJcblx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHR3aGlsZSAocGFyZW50SW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0dGFza3NUb0luY2x1ZGUuYWRkKHBhcmVudEluZGV4KTtcclxuXHRcdFx0XHRcdFx0XHQvLyBPbmx5IG1hcmsgcGFyZW50IHRhc2tzIGZvciByZW1vdmFsIGlmIHRoZXkncmUgaW5jb21wbGV0ZVxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmVudFRhc2sgPSBjaGlsZFRhc2tzLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0XHQodCkgPT4gdC5pbmRleCA9PT0gcGFyZW50SW5kZXhcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGlmICghcGFyZW50VGFzaykgYnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmICghcGFyZW50VGFzay5pc0luY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnRUYXNrc1RvUHJlc2VydmUuYWRkKHBhcmVudEluZGV4KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdHBhcmVudEluZGV4ID0gdGhpcy5maW5kUGFyZW50VGFza0luZGV4KFxyXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50VGFzay5pbmRleCxcclxuXHRcdFx0XHRcdFx0XHRcdHBhcmVudFRhc2suaW5kZW50LFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hpbGRUYXNrc1xyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gVGhlbiBpbmNsdWRlIGFsbCBjaGlsZHJlbiBvZiBpbmNvbXBsZXRlIHRhc2tzXHJcblx0XHRcdFx0Y2hpbGRUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBwYXJlbnRJbmRleCA9IHRoaXMuZmluZFBhcmVudFRhc2tJbmRleChcclxuXHRcdFx0XHRcdFx0dGFzay5pbmRleCxcclxuXHRcdFx0XHRcdFx0dGFzay5pbmRlbnQsXHJcblx0XHRcdFx0XHRcdGNoaWxkVGFza3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHBhcmVudEluZGV4ICE9PSAtMSAmJlxyXG5cdFx0XHRcdFx0XHRpbmNvbXBsZXRlZFRhc2tzLmhhcyhwYXJlbnRJbmRleClcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHR0YXNrc1RvSW5jbHVkZS5hZGQodGFzay5pbmRleCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCB0aGUgc2VsZWN0ZWQgaXRlbXMgdG8gcmVzdWx0cywgc29ydGluZyBieSBpbmRleCB0byBtYWludGFpbiBvcmRlclxyXG5cdFx0XHRcdGNvbnN0IHRhc2tzQnlJbmRleCA9IFsuLi50YXNrc1RvSW5jbHVkZV0uc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG5cclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5sZW5ndGggPSAwOyAvLyBDbGVhciByZXN1bHRMaW5lcyBiZWZvcmUgcmVidWlsZGluZ1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgcGFyZW50IHRhc2sgd2l0aCBtYXJrZXJcclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKHBhcmVudFRhc2tXaXRoTWFya2VyKTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGNoaWxkIHRhc2tzIGluIG9yZGVyXHJcblx0XHRcdFx0Zm9yIChjb25zdCB0YXNrSW5kZXggb2YgdGFza3NCeUluZGV4KSB7XHJcblx0XHRcdFx0XHRjb25zdCB0YXNrID0gY2hpbGRUYXNrcy5maW5kKCh0KSA9PiB0LmluZGV4ID09PSB0YXNrSW5kZXgpO1xyXG5cdFx0XHRcdFx0aWYgKCF0YXNrKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgbWFya2VyIHRvIHBhcmVudCB0YXNrcyB0aGF0IGFyZSBwcmVzZXJ2ZWRcclxuXHRcdFx0XHRcdGlmIChwYXJlbnRUYXNrc1RvUHJlc2VydmUuaGFzKHRhc2tJbmRleCkpIHtcclxuXHRcdFx0XHRcdFx0bGV0IHRhc2tMaW5lID0gdGhpcy5hZGRNYXJrZXJUb0luY29tcGxldGVkVGFzayhcclxuXHRcdFx0XHRcdFx0XHR0YXNrLmxpbmUsXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ3MsXHJcblx0XHRcdFx0XHRcdFx0Y3VycmVudEZpbGUsXHJcblx0XHRcdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0XHRcdGZhbHNlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHJlc3VsdExpbmVzLnB1c2godGFza0xpbmUpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gS2VlcCB0aGUgdGFzayBhcyBpcyAoZG9uJ3QgY29tcGxldGUgaXQpXHJcblx0XHRcdFx0XHRcdHJlc3VsdExpbmVzLnB1c2godGFzay5saW5lKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBPbmx5IGFkZCB0byBsaW5lc1RvUmVtb3ZlIGlmIGl0J3MgaW5jb21wbGV0ZSBvciBhIGNoaWxkIG9mIGluY29tcGxldGVcclxuXHRcdFx0XHRcdGlmICghcGFyZW50VGFza3NUb1ByZXNlcnZlLmhhcyh0YXNrSW5kZXgpKSB7XHJcblx0XHRcdFx0XHRcdGxpbmVzVG9SZW1vdmUucHVzaCh0YXNrSW5kZXgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgcGFyZW50IHRhc2sgaXMgaW5jb21wbGV0ZSwgYWRkIGl0IHRvIGxpbmVzIHRvIHJlbW92ZVxyXG5cdFx0XHRcdGlmICh0aGlzLmlzSW5jb21wbGV0ZWRUYXNrTWFyayhwYXJlbnRUYXNrTWFyaywgc2V0dGluZ3MpKSB7XHJcblx0XHRcdFx0XHRsaW5lc1RvUmVtb3ZlLnB1c2godGFza0xpbmUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChtb3ZlTW9kZSA9PT0gXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCIpIHtcclxuXHRcdFx0XHQvLyBPbmx5IGluY2x1ZGUgZGlyZWN0IGNoaWxkcmVuIHRoYXQgYXJlIGluY29tcGxldGVcclxuXHRcdFx0XHRjb25zdCBpbmNvbXBsZXRlZERpcmVjdENoaWxkcmVuID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblxyXG5cdFx0XHRcdC8vIERldGVybWluZSB0aGUgbWluaW11bSBpbmRlbnRhdGlvbiBsZXZlbCBvZiBkaXJlY3QgY2hpbGRyZW5cclxuXHRcdFx0XHRsZXQgbWluQ2hpbGRJbmRlbnQgPSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHRhc2sgb2YgY2hpbGRUYXNrcykge1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHR0YXNrLmluZGVudCA+IGN1cnJlbnRJbmRlbnQgJiZcclxuXHRcdFx0XHRcdFx0dGFzay5pbmRlbnQgPCBtaW5DaGlsZEluZGVudFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdG1pbkNoaWxkSW5kZW50ID0gdGFzay5pbmRlbnQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBOb3cgaWRlbnRpZnkgYWxsIGRpcmVjdCBjaGlsZHJlbiB1c2luZyB0aGUgY2FsY3VsYXRlZCBpbmRlbnRhdGlvblxyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFzayBvZiBjaGlsZFRhc2tzKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpc0RpcmVjdENoaWxkID0gdGFzay5pbmRlbnQgPT09IG1pbkNoaWxkSW5kZW50O1xyXG5cdFx0XHRcdFx0aWYgKGlzRGlyZWN0Q2hpbGQgJiYgdGFzay5pc0luY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdGluY29tcGxldGVkRGlyZWN0Q2hpbGRyZW4uYWRkKHRhc2suaW5kZXgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSW5jbHVkZSBhbGwgaWRlbnRpZmllZCBkaXJlY3QgaW5jb21wbGV0ZSBjaGlsZHJlbiBhbmQgdGhlaXIgc3VidGFza3NcclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5sZW5ndGggPSAwOyAvLyBDbGVhciByZXN1bHRMaW5lcyBiZWZvcmUgcmVidWlsZGluZ1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgcGFyZW50IHRhc2sgd2l0aCBtYXJrZXJcclxuXHRcdFx0XHRyZXN1bHRMaW5lcy5wdXNoKHBhcmVudFRhc2tXaXRoTWFya2VyKTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGRpcmVjdCBpbmNvbXBsZXRlIGNoaWxkcmVuIGluIG9yZGVyXHJcblx0XHRcdFx0Y29uc3Qgc29ydGVkQ2hpbGRJbmRpY2VzID0gWy4uLmluY29tcGxldGVkRGlyZWN0Q2hpbGRyZW5dLnNvcnQoXHJcblx0XHRcdFx0XHQoYSwgYikgPT4gYSAtIGJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0luZGV4IG9mIHNvcnRlZENoaWxkSW5kaWNlcykge1xyXG5cdFx0XHRcdFx0Ly8gQWRkIHRoZSBkaXJlY3QgaW5jb21wbGV0ZSBjaGlsZFxyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IGNoaWxkVGFza3MuZmluZCgodCkgPT4gdC5pbmRleCA9PT0gdGFza0luZGV4KTtcclxuXHRcdFx0XHRcdGlmICghdGFzaykgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0TGluZXMucHVzaCh0YXNrLmxpbmUpO1xyXG5cdFx0XHRcdFx0bGluZXNUb1JlbW92ZS5wdXNoKHRhc2tJbmRleCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWRkIGFsbCBpdHMgc3VidGFza3MgKHJlZ2FyZGxlc3Mgb2YgY29tcGxldGlvbiBzdGF0dXMpXHJcblx0XHRcdFx0XHRsZXQgaSA9XHJcblx0XHRcdFx0XHRcdGNoaWxkVGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmluZGV4ID09PSB0YXNrSW5kZXgpICsgMTtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tJbmRlbnQgPSB0YXNrLmluZGVudDtcclxuXHJcblx0XHRcdFx0XHR3aGlsZSAoaSA8IGNoaWxkVGFza3MubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN1YnRhc2sgPSBjaGlsZFRhc2tzW2ldO1xyXG5cdFx0XHRcdFx0XHRpZiAoc3VidGFzay5pbmRlbnQgPD0gdGFza0luZGVudCkgYnJlYWs7IC8vIEV4aXQgaWYgd2UncmUgYmFjayBhdCBzYW1lIG9yIGxvd2VyIGluZGVudCBsZXZlbFxyXG5cclxuXHRcdFx0XHRcdFx0cmVzdWx0TGluZXMucHVzaChzdWJ0YXNrLmxpbmUpO1xyXG5cdFx0XHRcdFx0XHRsaW5lc1RvUmVtb3ZlLnB1c2goc3VidGFzay5pbmRleCk7XHJcblx0XHRcdFx0XHRcdGkrKztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHBhcmVudCB0YXNrIGlzIGluY29tcGxldGUsIGFkZCBpdCB0byBsaW5lcyB0byByZW1vdmVcclxuXHRcdFx0XHRpZiAodGhpcy5pc0luY29tcGxldGVkVGFza01hcmsocGFyZW50VGFza01hcmssIHNldHRpbmdzKSkge1xyXG5cdFx0XHRcdFx0bGluZXNUb1JlbW92ZS5wdXNoKHRhc2tMaW5lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjb250ZW50OiByZXN1bHRMaW5lcy5qb2luKFwiXFxuXCIpLFxyXG5cdFx0XHRsaW5lc1RvUmVtb3ZlOiBsaW5lc1RvUmVtb3ZlLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIFJlbW92ZSB0YXNrcyBmcm9tIHNvdXJjZSBmaWxlXHJcblx0c3RhdGljIHJlbW92ZVRhc2tzRnJvbUZpbGUoZWRpdG9yOiBFZGl0b3IsIGxpbmVzVG9SZW1vdmU6IG51bWJlcltdKTogdm9pZCB7XHJcblx0XHRpZiAoIWxpbmVzVG9SZW1vdmUgfHwgbGluZXNUb1JlbW92ZS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBlZGl0b3IuZ2V0VmFsdWUoKTtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHQvLyBHZXQgbGluZXMgdG8gcmVtb3ZlIChzb3J0ZWQgaW4gZGVzY2VuZGluZyBvcmRlciB0byBhdm9pZCBpbmRleCBzaGlmdGluZylcclxuXHRcdGNvbnN0IHNvcnRlZExpbmVzVG9SZW1vdmUgPSBbLi4ubGluZXNUb1JlbW92ZV0uc29ydCgoYSwgYikgPT4gYiAtIGEpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIHRyYW5zYWN0aW9uIHRvIHJlbW92ZSB0aGUgbGluZXNcclxuXHRcdGVkaXRvci50cmFuc2FjdGlvbih7XHJcblx0XHRcdGNoYW5nZXM6IHNvcnRlZExpbmVzVG9SZW1vdmUubWFwKChsaW5lSW5kZXgpID0+IHtcclxuXHRcdFx0XHQvLyBDYWxjdWxhdGUgc3RhcnQgYW5kIGVuZCBwb3NpdGlvbnNcclxuXHRcdFx0XHRjb25zdCBzdGFydFBvcyA9IHtcclxuXHRcdFx0XHRcdGxpbmU6IGxpbmVJbmRleCxcclxuXHRcdFx0XHRcdGNoOiAwLFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIEZvciB0aGUgZW5kIHBvc2l0aW9uLCB1c2UgdGhlIG5leHQgbGluZSdzIHN0YXJ0IG9yIGVuZCBvZiBkb2N1bWVudFxyXG5cdFx0XHRcdGNvbnN0IGVuZFBvcyA9XHJcblx0XHRcdFx0XHRsaW5lSW5kZXggKyAxIDwgbGluZXMubGVuZ3RoXHJcblx0XHRcdFx0XHRcdD8geyBsaW5lOiBsaW5lSW5kZXggKyAxLCBjaDogMCB9XHJcblx0XHRcdFx0XHRcdDogeyBsaW5lOiBsaW5lSW5kZXgsIGNoOiBsaW5lc1tsaW5lSW5kZXhdLmxlbmd0aCB9O1xyXG5cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0ZnJvbTogc3RhcnRQb3MsXHJcblx0XHRcdFx0XHR0bzogZW5kUG9zLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJcIixcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9KSxcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1vZGFsIGZvciBzZWxlY3RpbmcgYSB0YXJnZXQgZmlsZSB0byBtb3ZlIGNvbXBsZXRlZCB0YXNrcyB0b1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbXBsZXRlZFRhc2tGaWxlU2VsZWN0aW9uTW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxcclxuXHRURmlsZSB8IHN0cmluZ1xyXG4+IHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRlZGl0b3I6IEVkaXRvcjtcclxuXHRjdXJyZW50RmlsZTogVEZpbGU7XHJcblx0dGFza0xpbmVzOiBudW1iZXJbXTtcclxuXHRtb3ZlTW9kZTpcclxuXHRcdHwgXCJhbGxDb21wbGV0ZWRcIlxyXG5cdFx0fCBcImRpcmVjdENoaWxkcmVuXCJcclxuXHRcdHwgXCJhbGxcIlxyXG5cdFx0fCBcImFsbEluY29tcGxldGVkXCJcclxuXHRcdHwgXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0Y3VycmVudEZpbGU6IFRGaWxlLFxyXG5cdFx0dGFza0xpbmVzOiBudW1iZXJbXSxcclxuXHRcdG1vdmVNb2RlOlxyXG5cdFx0XHR8IFwiYWxsQ29tcGxldGVkXCJcclxuXHRcdFx0fCBcImRpcmVjdENoaWxkcmVuXCJcclxuXHRcdFx0fCBcImFsbFwiXHJcblx0XHRcdHwgXCJhbGxJbmNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCJcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuZWRpdG9yID0gZWRpdG9yO1xyXG5cdFx0dGhpcy5jdXJyZW50RmlsZSA9IGN1cnJlbnRGaWxlO1xyXG5cdFx0dGhpcy50YXNrTGluZXMgPSB0YXNrTGluZXM7XHJcblx0XHR0aGlzLm1vdmVNb2RlID0gbW92ZU1vZGU7XHJcblx0XHR0aGlzLnNldFBsYWNlaG9sZGVyKFwiU2VsZWN0IGEgZmlsZSBvciB0eXBlIHRvIGNyZWF0ZSBhIG5ldyBvbmVcIik7XHJcblx0fVxyXG5cclxuXHRnZXRJdGVtcygpOiAoVEZpbGUgfCBzdHJpbmcpW10ge1xyXG5cdFx0Ly8gR2V0IGFsbCBtYXJrZG93biBmaWxlc1xyXG5cdFx0Y29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCB0aGUgY3VycmVudCBmaWxlXHJcblx0XHRjb25zdCBmaWx0ZXJlZEZpbGVzID0gZmlsZXMuZmlsdGVyKFxyXG5cdFx0XHQoZmlsZSkgPT4gZmlsZS5wYXRoICE9PSB0aGlzLmN1cnJlbnRGaWxlLnBhdGhcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU29ydCBmaWxlcyBieSBwYXRoXHJcblx0XHRmaWx0ZXJlZEZpbGVzLnNvcnQoKGEsIGIpID0+IGEucGF0aC5sb2NhbGVDb21wYXJlKGIucGF0aCkpO1xyXG5cclxuXHRcdHJldHVybiBmaWx0ZXJlZEZpbGVzO1xyXG5cdH1cclxuXHJcblx0Z2V0SXRlbVRleHQoaXRlbTogVEZpbGUgfCBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHJldHVybiBgQ3JlYXRlIG5ldyBmaWxlOiAke2l0ZW19YDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBpdGVtLnBhdGg7XHJcblx0fVxyXG5cclxuXHRyZW5kZXJTdWdnZXN0aW9uKGl0ZW06IEZ1enp5TWF0Y2g8VEZpbGUgfCBzdHJpbmc+LCBlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1hdGNoID0gaXRlbS5pdGVtO1xyXG5cdFx0aWYgKHR5cGVvZiBtYXRjaCA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRlbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IGAke3QoXCJDcmVhdGUgbmV3IGZpbGU6XCIpfSAke21hdGNofWAgfSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRlbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IG1hdGNoLnBhdGggfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbkNob29zZUl0ZW0oaXRlbTogVEZpbGUgfCBzdHJpbmcsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmICh0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgZmlsZVxyXG5cdFx0XHR0aGlzLmNyZWF0ZU5ld0ZpbGVXaXRoVGFza3MoaXRlbSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBTaG93IG1vZGFsIHRvIHNlbGVjdCBpbnNlcnRpb24gcG9pbnQgaW4gZXhpc3RpbmcgZmlsZVxyXG5cdFx0XHRuZXcgQ29tcGxldGVkVGFza0Jsb2NrU2VsZWN0aW9uTW9kYWwoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5lZGl0b3IsXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RmlsZSxcclxuXHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdHRoaXMudGFza0xpbmVzLFxyXG5cdFx0XHRcdHRoaXMubW92ZU1vZGVcclxuXHRcdFx0KS5vcGVuKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJZiB0aGUgcXVlcnkgZG9lc24ndCBtYXRjaCBhbnkgZXhpc3RpbmcgZmlsZXMsIGFkZCBhbiBvcHRpb24gdG8gY3JlYXRlIGEgbmV3IGZpbGVcclxuXHRnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogRnV6enlNYXRjaDxURmlsZSB8IHN0cmluZz5bXSB7XHJcblx0XHRjb25zdCBzdWdnZXN0aW9ucyA9IHN1cGVyLmdldFN1Z2dlc3Rpb25zKHF1ZXJ5KTtcclxuXHJcblx0XHRpZiAoXHJcblx0XHRcdHF1ZXJ5ICYmXHJcblx0XHRcdCFzdWdnZXN0aW9ucy5zb21lKFxyXG5cdFx0XHRcdChtYXRjaCkgPT5cclxuXHRcdFx0XHRcdHR5cGVvZiBtYXRjaC5pdGVtID09PSBcInN0cmluZ1wiICYmIG1hdGNoLml0ZW0gPT09IHF1ZXJ5XHJcblx0XHRcdClcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgZmlsZSBwYXRoXHJcblx0XHRcdGlmICh0aGlzLmlzVmFsaWRGaWxlTmFtZShxdWVyeSkpIHtcclxuXHRcdFx0XHQvLyBBZGQgb3B0aW9uIHRvIGNyZWF0ZSBhIG5ldyBmaWxlIHdpdGggdGhpcyBuYW1lXHJcblx0XHRcdFx0c3VnZ2VzdGlvbnMucHVzaCh7XHJcblx0XHRcdFx0XHRpdGVtOiBxdWVyeSxcclxuXHRcdFx0XHRcdG1hdGNoOiB7IHNjb3JlOiAxLCBtYXRjaGVzOiBbXSB9LFxyXG5cdFx0XHRcdH0gYXMgRnV6enlNYXRjaDxzdHJpbmc+KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExpbWl0IHJlc3VsdHMgdG8gMjAgdG8gYXZvaWQgcGVyZm9ybWFuY2UgaXNzdWVzXHJcblx0XHRyZXR1cm4gc3VnZ2VzdGlvbnMuc2xpY2UoMCwgMjApO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpc1ZhbGlkRmlsZU5hbWUobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBCYXNpYyB2YWxpZGF0aW9uIGZvciBmaWxlIG5hbWVzXHJcblx0XHRyZXR1cm4gbmFtZS5sZW5ndGggPiAwICYmICFuYW1lLmluY2x1ZGVzKFwiL1wiKSAmJiAhbmFtZS5pbmNsdWRlcyhcIlxcXFxcIik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGNyZWF0ZU5ld0ZpbGVXaXRoVGFza3MoZmlsZU5hbWU6IHN0cmluZykge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gRW5zdXJlIGZpbGUgbmFtZSBoYXMgLm1kIGV4dGVuc2lvblxyXG5cdFx0XHRpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKFwiLm1kXCIpKSB7XHJcblx0XHRcdFx0ZmlsZU5hbWUgKz0gXCIubWRcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IGNvbXBsZXRlZCB0YXNrcyBjb250ZW50XHJcblx0XHRcdGNvbnN0IHsgY29udGVudCwgbGluZXNUb1JlbW92ZSB9ID0gVGFza1V0aWxzLnByb2Nlc3NTZWxlY3RlZFRhc2tzKFxyXG5cdFx0XHRcdHRoaXMuZWRpdG9yLFxyXG5cdFx0XHRcdHRoaXMudGFza0xpbmVzLFxyXG5cdFx0XHRcdHRoaXMubW92ZU1vZGUsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MsXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RmlsZSxcclxuXHRcdFx0XHR0aGlzLmFwcFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVzZXQgaW5kZW50YXRpb24gZm9yIG5ldyBmaWxlIChyZW1vdmUgYWxsIGluZGVudGF0aW9uIGZyb20gdGFza3MpXHJcblx0XHRcdGNvbnN0IHJlc2V0SW5kZW50Q29udGVudCA9IFRhc2tVdGlscy5yZXNldEluZGVudGF0aW9uKFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0dGhpcy5hcHBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBmaWxlIGluIHRoZSBzYW1lIGZvbGRlciBhcyBjdXJyZW50IGZpbGVcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gdGhpcy5jdXJyZW50RmlsZS5wYXJlbnQ7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gZm9sZGVyID8gYCR7Zm9sZGVyLnBhdGh9LyR7ZmlsZU5hbWV9YCA6IGZpbGVOYW1lO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBmaWxlXHJcblx0XHRcdGNvbnN0IG5ld0ZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0cmVzZXRJbmRlbnRDb250ZW50XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgdGhlIGNvbXBsZXRlZCB0YXNrcyBmcm9tIHRoZSBjdXJyZW50IGZpbGVcclxuXHRcdFx0VGFza1V0aWxzLnJlbW92ZVRhc2tzRnJvbUZpbGUodGhpcy5lZGl0b3IsIGxpbmVzVG9SZW1vdmUpO1xyXG5cclxuXHRcdFx0Ly8gT3BlbiB0aGUgbmV3IGZpbGVcclxuXHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUobmV3RmlsZSk7XHJcblxyXG5cdFx0XHRuZXcgTm90aWNlKGAke3QoXCJDb21wbGV0ZWQgdGFza3MgbW92ZWQgdG9cIil9ICR7ZmlsZU5hbWV9YCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRuZXcgTm90aWNlKGAke3QoXCJGYWlsZWQgdG8gY3JlYXRlIGZpbGU6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNb2RhbCBmb3Igc2VsZWN0aW5nIGEgYmxvY2sgdG8gaW5zZXJ0IGFmdGVyIGluIHRoZSB0YXJnZXQgZmlsZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbXBsZXRlZFRhc2tCbG9ja1NlbGVjdGlvbk1vZGFsIGV4dGVuZHMgU3VnZ2VzdE1vZGFsPHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdHRleHQ6IHN0cmluZztcclxuXHRsZXZlbDogbnVtYmVyO1xyXG59PiB7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0ZWRpdG9yOiBFZGl0b3I7XHJcblx0c291cmNlRmlsZTogVEZpbGU7XHJcblx0dGFyZ2V0RmlsZTogVEZpbGU7XHJcblx0dGFza0xpbmVzOiBudW1iZXJbXTtcclxuXHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cdG1vdmVNb2RlOlxyXG5cdFx0fCBcImFsbENvbXBsZXRlZFwiXHJcblx0XHR8IFwiZGlyZWN0Q2hpbGRyZW5cIlxyXG5cdFx0fCBcImFsbFwiXHJcblx0XHR8IFwiYWxsSW5jb21wbGV0ZWRcIlxyXG5cdFx0fCBcImRpcmVjdEluY29tcGxldGVkQ2hpbGRyZW5cIjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0XHRzb3VyY2VGaWxlOiBURmlsZSxcclxuXHRcdHRhcmdldEZpbGU6IFRGaWxlLFxyXG5cdFx0dGFza0xpbmVzOiBudW1iZXJbXSxcclxuXHRcdG1vdmVNb2RlOlxyXG5cdFx0XHR8IFwiYWxsQ29tcGxldGVkXCJcclxuXHRcdFx0fCBcImRpcmVjdENoaWxkcmVuXCJcclxuXHRcdFx0fCBcImFsbFwiXHJcblx0XHRcdHwgXCJhbGxJbmNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCJcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuZWRpdG9yID0gZWRpdG9yO1xyXG5cdFx0dGhpcy5zb3VyY2VGaWxlID0gc291cmNlRmlsZTtcclxuXHRcdHRoaXMudGFyZ2V0RmlsZSA9IHRhcmdldEZpbGU7XHJcblx0XHR0aGlzLnRhc2tMaW5lcyA9IHRhc2tMaW5lcztcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlO1xyXG5cdFx0dGhpcy5tb3ZlTW9kZSA9IG1vdmVNb2RlO1xyXG5cdFx0dGhpcy5zZXRQbGFjZWhvbGRlcihcIlNlbGVjdCBhIGJsb2NrIHRvIGluc2VydCBhZnRlclwiKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGdldFN1Z2dlc3Rpb25zKFxyXG5cdFx0cXVlcnk6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8eyBpZDogc3RyaW5nOyB0ZXh0OiBzdHJpbmc7IGxldmVsOiBudW1iZXIgfVtdPiB7XHJcblx0XHQvLyBHZXQgZmlsZSBjb250ZW50XHJcblx0XHRjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodGhpcy50YXJnZXRGaWxlKTtcclxuXHRcdGNvbnN0IGxpbmVzID0gZmlsZUNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0Ly8gR2V0IGZpbGUgY2FjaGUgdG8gZmluZCBoZWFkaW5ncyBhbmQgbGlzdCBpdGVtc1xyXG5cdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZSh0aGlzLnRhcmdldEZpbGUpO1xyXG5cclxuXHRcdGxldCBibG9ja3M6IHsgaWQ6IHN0cmluZzsgdGV4dDogc3RyaW5nOyBsZXZlbDogbnVtYmVyIH1bXSA9IFtdO1xyXG5cclxuXHRcdC8vIEFkZCBhbiBvcHRpb24gdG8gaW5zZXJ0IGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGVcclxuXHRcdGJsb2Nrcy5wdXNoKHtcclxuXHRcdFx0aWQ6IFwiYmVnaW5uaW5nXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJCZWdpbm5pbmcgb2YgZmlsZVwiKSxcclxuXHRcdFx0bGV2ZWw6IDAsXHJcblx0XHR9KTtcclxuXHJcblx0XHRibG9ja3MucHVzaCh7XHJcblx0XHRcdGlkOiBcImVuZFwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiRW5kIG9mIGZpbGVcIiksXHJcblx0XHRcdGxldmVsOiAwLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGhlYWRpbmdzXHJcblx0XHRpZiAoZmlsZUNhY2hlICYmIGZpbGVDYWNoZS5oZWFkaW5ncykge1xyXG5cdFx0XHRmb3IgKGNvbnN0IGhlYWRpbmcgb2YgZmlsZUNhY2hlLmhlYWRpbmdzKSB7XHJcblx0XHRcdFx0Y29uc3QgdGV4dCA9IGxpbmVzW2hlYWRpbmcucG9zaXRpb24uc3RhcnQubGluZV07XHJcblx0XHRcdFx0YmxvY2tzLnB1c2goe1xyXG5cdFx0XHRcdFx0aWQ6IGBoZWFkaW5nLSR7aGVhZGluZy5wb3NpdGlvbi5zdGFydC5saW5lfWAsXHJcblx0XHRcdFx0XHR0ZXh0OiB0ZXh0LFxyXG5cdFx0XHRcdFx0bGV2ZWw6IGhlYWRpbmcubGV2ZWwsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbGlzdCBpdGVtc1xyXG5cdFx0aWYgKGZpbGVDYWNoZSAmJiBmaWxlQ2FjaGUubGlzdEl0ZW1zKSB7XHJcblx0XHRcdGZvciAoY29uc3QgbGlzdEl0ZW0gb2YgZmlsZUNhY2hlLmxpc3RJdGVtcykge1xyXG5cdFx0XHRcdGNvbnN0IHRleHQgPSBsaW5lc1tsaXN0SXRlbS5wb3NpdGlvbi5zdGFydC5saW5lXTtcclxuXHRcdFx0XHRibG9ja3MucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogYGxpc3QtJHtsaXN0SXRlbS5wb3NpdGlvbi5zdGFydC5saW5lfWAsXHJcblx0XHRcdFx0XHR0ZXh0OiB0ZXh0LFxyXG5cdFx0XHRcdFx0bGV2ZWw6IFRhc2tVdGlscy5nZXRJbmRlbnRhdGlvbih0ZXh0LCB0aGlzLmFwcCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXIgYmxvY2tzIGJhc2VkIG9uIHF1ZXJ5XHJcblx0XHRpZiAocXVlcnkpIHtcclxuXHRcdFx0YmxvY2tzID0gYmxvY2tzLmZpbHRlcigoYmxvY2spID0+XHJcblx0XHRcdFx0YmxvY2sudGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTGltaXQgcmVzdWx0cyB0byAyMCB0byBhdm9pZCBwZXJmb3JtYW5jZSBpc3N1ZXNcclxuXHRcdHJldHVybiBibG9ja3Muc2xpY2UoMCwgMjApO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihcclxuXHRcdGJsb2NrOiB7IGlkOiBzdHJpbmc7IHRleHQ6IHN0cmluZzsgbGV2ZWw6IG51bWJlciB9LFxyXG5cdFx0ZWw6IEhUTUxFbGVtZW50XHJcblx0KSB7XHJcblx0XHRjb25zdCBpbmRlbnQgPSBcIiAgXCIucmVwZWF0KGJsb2NrLmxldmVsKTtcclxuXHJcblx0XHRpZiAoYmxvY2suaWQgPT09IFwiYmVnaW5uaW5nXCIgfHwgYmxvY2suaWQgPT09IFwiZW5kXCIpIHtcclxuXHRcdFx0ZWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBibG9jay50ZXh0IH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBgJHtpbmRlbnR9JHtibG9jay50ZXh0fWAgfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbkNob29zZVN1Z2dlc3Rpb24oXHJcblx0XHRibG9jazogeyBpZDogc3RyaW5nOyB0ZXh0OiBzdHJpbmc7IGxldmVsOiBudW1iZXIgfSxcclxuXHRcdGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnRcclxuXHQpIHtcclxuXHRcdHRoaXMubW92ZUNvbXBsZXRlZFRhc2tzVG9UYXJnZXRGaWxlKGJsb2NrKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgbW92ZUNvbXBsZXRlZFRhc2tzVG9UYXJnZXRGaWxlKGJsb2NrOiB7XHJcblx0XHRpZDogc3RyaW5nO1xyXG5cdFx0dGV4dDogc3RyaW5nO1xyXG5cdFx0bGV2ZWw6IG51bWJlcjtcclxuXHR9KSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgY29tcGxldGVkIHRhc2tzIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgeyBjb250ZW50LCBsaW5lc1RvUmVtb3ZlIH0gPSBUYXNrVXRpbHMucHJvY2Vzc1NlbGVjdGVkVGFza3MoXHJcblx0XHRcdFx0dGhpcy5lZGl0b3IsXHJcblx0XHRcdFx0dGhpcy50YXNrTGluZXMsXHJcblx0XHRcdFx0dGhpcy5tb3ZlTW9kZSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncyxcclxuXHRcdFx0XHR0aGlzLnNvdXJjZUZpbGUsXHJcblx0XHRcdFx0dGhpcy5hcHBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFJlYWQgdGFyZ2V0IGZpbGUgY29udGVudFxyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodGhpcy50YXJnZXRGaWxlKTtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBmaWxlQ29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdGxldCBpbnNlcnRQb3NpdGlvbjogbnVtYmVyO1xyXG5cdFx0XHRsZXQgaW5kZW50TGV2ZWw6IG51bWJlciA9IDA7XHJcblxyXG5cdFx0XHRpZiAoYmxvY2suaWQgPT09IFwiYmVnaW5uaW5nXCIpIHtcclxuXHRcdFx0XHRpbnNlcnRQb3NpdGlvbiA9IDA7XHJcblx0XHRcdH0gZWxzZSBpZiAoYmxvY2suaWQgPT09IFwiZW5kXCIpIHtcclxuXHRcdFx0XHRpbnNlcnRQb3NpdGlvbiA9IGxpbmVzLmxlbmd0aDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBFeHRyYWN0IGxpbmUgbnVtYmVyIGZyb20gYmxvY2sgaWRcclxuXHRcdFx0XHRjb25zdCBsaW5lTWF0Y2ggPSBibG9jay5pZC5tYXRjaCgvLShcXGQrKSQvKTtcclxuXHRcdFx0XHRpZiAoIWxpbmVNYXRjaCkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBibG9jayBJRFwiKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IGxpbmVOdW1iZXIgPSBwYXJzZUludChsaW5lTWF0Y2hbMV0pO1xyXG5cdFx0XHRcdGluc2VydFBvc2l0aW9uID0gbGluZU51bWJlciArIDE7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBpbmRlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGJsb2NrXHJcblx0XHRcdFx0aW5kZW50TGV2ZWwgPSBUYXNrVXRpbHMuZ2V0SW5kZW50YXRpb24oXHJcblx0XHRcdFx0XHRsaW5lc1tsaW5lTnVtYmVyXSxcclxuXHRcdFx0XHRcdHRoaXMuYXBwXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRqdXN0IGluZGVudGF0aW9uIG9mIHRhc2sgY29udGVudCB0byBtYXRjaCB0aGUgdGFyZ2V0IGJsb2NrXHJcblx0XHRcdGNvbnN0IGluZGVudGVkVGFza0NvbnRlbnQgPSBUYXNrVXRpbHMuYWRqdXN0SW5kZW50YXRpb24oXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRpbmRlbnRMZXZlbCxcclxuXHRcdFx0XHR0aGlzLmFwcFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gSW5zZXJ0IHRhc2sgYXQgdGhlIHBvc2l0aW9uXHJcblx0XHRcdGNvbnN0IG5ld0NvbnRlbnQgPSBbXHJcblx0XHRcdFx0Li4ubGluZXMuc2xpY2UoMCwgaW5zZXJ0UG9zaXRpb24pLFxyXG5cdFx0XHRcdGluZGVudGVkVGFza0NvbnRlbnQsXHJcblx0XHRcdFx0Li4ubGluZXMuc2xpY2UoaW5zZXJ0UG9zaXRpb24pLFxyXG5cdFx0XHRdLmpvaW4oXCJcXG5cIik7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGFyZ2V0IGZpbGVcclxuXHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KHRoaXMudGFyZ2V0RmlsZSwgbmV3Q29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgY29tcGxldGVkIHRhc2tzIGZyb20gc291cmNlIGZpbGVcclxuXHRcdFx0VGFza1V0aWxzLnJlbW92ZVRhc2tzRnJvbUZpbGUodGhpcy5lZGl0b3IsIGxpbmVzVG9SZW1vdmUpO1xyXG5cclxuXHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRgJHt0KFwiQ29tcGxldGVkIHRhc2tzIG1vdmVkIHRvXCIpfSAke3RoaXMudGFyZ2V0RmlsZS5wYXRofWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoYCR7dChcIkZhaWxlZCB0byBtb3ZlIHRhc2tzOlwiKX0gJHtlcnJvcn1gKTtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ29tbWFuZCB0byBtb3ZlIHRoZSBjb21wbGV0ZWQgdGFza3MgdG8gYW5vdGhlciBmaWxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbW92ZUNvbXBsZXRlZFRhc2tzQ29tbWFuZChcclxuXHRjaGVja2luZzogYm9vbGVhbixcclxuXHRlZGl0b3I6IEVkaXRvcixcclxuXHRjdHg6IE1hcmtkb3duVmlldyB8IE1hcmtkb3duRmlsZUluZm8sXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0bW92ZU1vZGU6XHJcblx0XHR8IFwiYWxsQ29tcGxldGVkXCJcclxuXHRcdHwgXCJkaXJlY3RDaGlsZHJlblwiXHJcblx0XHR8IFwiYWxsXCJcclxuXHRcdHwgXCJhbGxJbmNvbXBsZXRlZFwiXHJcblx0XHR8IFwiZGlyZWN0SW5jb21wbGV0ZWRDaGlsZHJlblwiXHJcbik6IGJvb2xlYW4ge1xyXG5cdC8vIEdldCB0aGUgY3VycmVudCBmaWxlXHJcblx0Y29uc3QgY3VycmVudEZpbGUgPSBjdHguZmlsZTtcclxuXHJcblx0aWYgKGNoZWNraW5nKSB7XHJcblx0XHQvLyBJZiBjaGVja2luZywgcmV0dXJuIHRydWUgaWYgd2UncmUgaW4gYSBtYXJrZG93biBmaWxlIGFuZCBjdXJzb3IgaXMgb24gYSB0YXNrIGxpbmVcclxuXHRcdGlmICghY3VycmVudEZpbGUgfHwgY3VycmVudEZpbGUuZXh0ZW5zaW9uICE9PSBcIm1kXCIpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcclxuXHRcdGlmIChzZWxlY3Rpb24ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRcdFx0Y29uc3QgbGluZSA9IGVkaXRvci5nZXRMaW5lKGN1cnNvci5saW5lKTtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgbGluZSBpcyBhIHRhc2sgd2l0aCBhbnkgb2YgdGhlIHN1cHBvcnRlZCBsaXN0IG1hcmtlcnMgKC0sIDEuLCAqKVxyXG5cdFx0XHRyZXR1cm4gbGluZS5tYXRjaCgvXlxccyooLXxcXGQrXFwufFxcKikgXFxbKC4pXFxdL2kpICE9PSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvLyBFeGVjdXRlIHRoZSBjb21tYW5kXHJcblx0aWYgKCFjdXJyZW50RmlsZSkge1xyXG5cdFx0bmV3IE5vdGljZSh0KFwiTm8gYWN0aXZlIGZpbGUgZm91bmRcIikpO1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IGFsbCBzZWxlY3Rpb25zIHRvIHN1cHBvcnQgbXVsdGktbGluZSBzZWxlY3Rpb25cclxuXHRjb25zdCBzZWxlY3Rpb25zID0gZWRpdG9yLmxpc3RTZWxlY3Rpb25zKCk7XHJcblxyXG5cdC8vIEV4dHJhY3QgYWxsIHNlbGVjdGVkIGxpbmVzIGZyb20gdGhlIHNlbGVjdGlvbnNcclxuXHRjb25zdCBzZWxlY3RlZExpbmVzU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblx0c2VsZWN0aW9ucy5mb3JFYWNoKChzZWxlY3Rpb24pID0+IHtcclxuXHRcdC8vIEdldCB0aGUgc3RhcnQgYW5kIGVuZCBsaW5lcyAoYWNjb3VudGluZyBmb3Igc2VsZWN0aW9uIGRpcmVjdGlvbilcclxuXHRcdGNvbnN0IHN0YXJ0TGluZSA9IE1hdGgubWluKHNlbGVjdGlvbi5hbmNob3IubGluZSwgc2VsZWN0aW9uLmhlYWQubGluZSk7XHJcblx0XHRjb25zdCBlbmRMaW5lID0gTWF0aC5tYXgoc2VsZWN0aW9uLmFuY2hvci5saW5lLCBzZWxlY3Rpb24uaGVhZC5saW5lKTtcclxuXHJcblx0XHQvLyBBZGQgYWxsIGxpbmVzIGluIHRoaXMgc2VsZWN0aW9uIHJhbmdlXHJcblx0XHRmb3IgKGxldCBsaW5lID0gc3RhcnRMaW5lOyBsaW5lIDw9IGVuZExpbmU7IGxpbmUrKykge1xyXG5cdFx0XHRzZWxlY3RlZExpbmVzU2V0LmFkZChsaW5lKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gQ29udmVydCBTZXQgdG8gQXJyYXkgZm9yIGZ1cnRoZXIgcHJvY2Vzc2luZ1xyXG5cdGNvbnN0IHNlbGVjdGVkTGluZXMgPSBBcnJheS5mcm9tKHNlbGVjdGVkTGluZXNTZXQpO1xyXG5cclxuXHRuZXcgQ29tcGxldGVkVGFza0ZpbGVTZWxlY3Rpb25Nb2RhbChcclxuXHRcdHBsdWdpbi5hcHAsXHJcblx0XHRwbHVnaW4sXHJcblx0XHRlZGl0b3IsXHJcblx0XHRjdXJyZW50RmlsZSxcclxuXHRcdHNlbGVjdGVkTGluZXMsXHJcblx0XHRtb3ZlTW9kZVxyXG5cdCkub3BlbigpO1xyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbW1hbmQgdG8gbW92ZSB0aGUgaW5jb21wbGV0ZSB0YXNrcyB0byBhbm90aGVyIGZpbGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtb3ZlSW5jb21wbGV0ZWRUYXNrc0NvbW1hbmQoXHJcblx0Y2hlY2tpbmc6IGJvb2xlYW4sXHJcblx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0Y3R4OiBNYXJrZG93blZpZXcgfCBNYXJrZG93bkZpbGVJbmZvLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdG1vdmVNb2RlOiBcImFsbEluY29tcGxldGVkXCIgfCBcImRpcmVjdEluY29tcGxldGVkQ2hpbGRyZW5cIlxyXG4pOiBib29sZWFuIHtcclxuXHQvLyBHZXQgdGhlIGN1cnJlbnQgZmlsZVxyXG5cdGNvbnN0IGN1cnJlbnRGaWxlID0gY3R4LmZpbGU7XHJcblxyXG5cdGlmIChjaGVja2luZykge1xyXG5cdFx0Ly8gSWYgY2hlY2tpbmcsIHJldHVybiB0cnVlIGlmIHdlJ3JlIGluIGEgbWFya2Rvd24gZmlsZSBhbmQgY3Vyc29yIGlzIG9uIGEgdGFzayBsaW5lXHJcblx0XHRpZiAoIWN1cnJlbnRGaWxlIHx8IGN1cnJlbnRGaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzZWxlY3Rpb24gPSBlZGl0b3IuZ2V0U2VsZWN0aW9uKCk7XHJcblx0XHRpZiAoc2VsZWN0aW9uLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblx0XHRcdC8vIENoZWNrIGlmIGxpbmUgaXMgYSB0YXNrIHdpdGggYW55IG9mIHRoZSBzdXBwb3J0ZWQgbGlzdCBtYXJrZXJzICgtLCAxLiwgKilcclxuXHRcdFx0cmV0dXJuIGxpbmUubWF0Y2goL15cXHMqKC18XFxkK1xcLnxcXCopIFxcWyguKVxcXS9pKSAhPT0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0Ly8gRXhlY3V0ZSB0aGUgY29tbWFuZFxyXG5cdGlmICghY3VycmVudEZpbGUpIHtcclxuXHRcdG5ldyBOb3RpY2UodChcIk5vIGFjdGl2ZSBmaWxlIGZvdW5kXCIpKTtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBhbGwgc2VsZWN0aW9ucyB0byBzdXBwb3J0IG11bHRpLWxpbmUgc2VsZWN0aW9uXHJcblx0Y29uc3Qgc2VsZWN0aW9ucyA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpO1xyXG5cclxuXHQvLyBFeHRyYWN0IGFsbCBzZWxlY3RlZCBsaW5lcyBmcm9tIHRoZSBzZWxlY3Rpb25zXHJcblx0Y29uc3Qgc2VsZWN0ZWRMaW5lc1NldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdHNlbGVjdGlvbnMuZm9yRWFjaCgoc2VsZWN0aW9uKSA9PiB7XHJcblx0XHQvLyBHZXQgdGhlIHN0YXJ0IGFuZCBlbmQgbGluZXMgKGFjY291bnRpbmcgZm9yIHNlbGVjdGlvbiBkaXJlY3Rpb24pXHJcblx0XHRjb25zdCBzdGFydExpbmUgPSBNYXRoLm1pbihzZWxlY3Rpb24uYW5jaG9yLmxpbmUsIHNlbGVjdGlvbi5oZWFkLmxpbmUpO1xyXG5cdFx0Y29uc3QgZW5kTGluZSA9IE1hdGgubWF4KHNlbGVjdGlvbi5hbmNob3IubGluZSwgc2VsZWN0aW9uLmhlYWQubGluZSk7XHJcblxyXG5cdFx0Ly8gQWRkIGFsbCBsaW5lcyBpbiB0aGlzIHNlbGVjdGlvbiByYW5nZVxyXG5cdFx0Zm9yIChsZXQgbGluZSA9IHN0YXJ0TGluZTsgbGluZSA8PSBlbmRMaW5lOyBsaW5lKyspIHtcclxuXHRcdFx0c2VsZWN0ZWRMaW5lc1NldC5hZGQobGluZSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIENvbnZlcnQgU2V0IHRvIEFycmF5IGZvciBmdXJ0aGVyIHByb2Nlc3NpbmdcclxuXHRjb25zdCBzZWxlY3RlZExpbmVzID0gQXJyYXkuZnJvbShzZWxlY3RlZExpbmVzU2V0KTtcclxuXHJcblx0bmV3IENvbXBsZXRlZFRhc2tGaWxlU2VsZWN0aW9uTW9kYWwoXHJcblx0XHRwbHVnaW4uYXBwLFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0ZWRpdG9yLFxyXG5cdFx0Y3VycmVudEZpbGUsXHJcblx0XHRzZWxlY3RlZExpbmVzLFxyXG5cdFx0bW92ZU1vZGVcclxuXHQpLm9wZW4oKTtcclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBdXRvLW1vdmUgY29tcGxldGVkIHRhc2tzIHVzaW5nIGRlZmF1bHQgc2V0dGluZ3NcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhdXRvTW92ZUNvbXBsZXRlZFRhc2tzKFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGN1cnJlbnRGaWxlOiBURmlsZSxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHR0YXNrTGluZXM6IG51bWJlcltdLFxyXG5cdG1vdmVNb2RlOlxyXG5cdFx0fCBcImFsbENvbXBsZXRlZFwiXHJcblx0XHR8IFwiZGlyZWN0Q2hpbGRyZW5cIlxyXG5cdFx0fCBcImFsbFwiXHJcblx0XHR8IFwiYWxsSW5jb21wbGV0ZWRcIlxyXG5cdFx0fCBcImRpcmVjdEluY29tcGxldGVkQ2hpbGRyZW5cIlxyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRjb25zdCBzZXR0aW5ncyA9IHBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXI7XHJcblxyXG5cdC8vIENoZWNrIGlmIGF1dG8tbW92ZSBpcyBlbmFibGVkIGFuZCBkZWZhdWx0IGZpbGUgaXMgc2V0XHJcblx0Y29uc3QgaXNDb21wbGV0ZWRNb2RlID1cclxuXHRcdG1vdmVNb2RlID09PSBcImFsbENvbXBsZXRlZFwiIHx8XHJcblx0XHRtb3ZlTW9kZSA9PT0gXCJkaXJlY3RDaGlsZHJlblwiIHx8XHJcblx0XHRtb3ZlTW9kZSA9PT0gXCJhbGxcIjtcclxuXHRjb25zdCBpc0F1dG9Nb3ZlRW5hYmxlZCA9IGlzQ29tcGxldGVkTW9kZVxyXG5cdFx0PyBzZXR0aW5ncy5lbmFibGVBdXRvTW92ZVxyXG5cdFx0OiBzZXR0aW5ncy5lbmFibGVJbmNvbXBsZXRlZEF1dG9Nb3ZlO1xyXG5cdGNvbnN0IGRlZmF1bHRUYXJnZXRGaWxlID0gaXNDb21wbGV0ZWRNb2RlXHJcblx0XHQ/IHNldHRpbmdzLmRlZmF1bHRUYXJnZXRGaWxlXHJcblx0XHQ6IHNldHRpbmdzLmluY29tcGxldGVkRGVmYXVsdFRhcmdldEZpbGU7XHJcblx0Y29uc3QgZGVmYXVsdEluc2VydGlvbk1vZGUgPSBpc0NvbXBsZXRlZE1vZGVcclxuXHRcdD8gc2V0dGluZ3MuZGVmYXVsdEluc2VydGlvbk1vZGVcclxuXHRcdDogc2V0dGluZ3MuaW5jb21wbGV0ZWREZWZhdWx0SW5zZXJ0aW9uTW9kZTtcclxuXHRjb25zdCBkZWZhdWx0SGVhZGluZ05hbWUgPSBpc0NvbXBsZXRlZE1vZGVcclxuXHRcdD8gc2V0dGluZ3MuZGVmYXVsdEhlYWRpbmdOYW1lXHJcblx0XHQ6IHNldHRpbmdzLmluY29tcGxldGVkRGVmYXVsdEhlYWRpbmdOYW1lO1xyXG5cclxuXHRpZiAoIWlzQXV0b01vdmVFbmFibGVkIHx8ICFkZWZhdWx0VGFyZ2V0RmlsZSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlOyAvLyBBdXRvLW1vdmUgbm90IGNvbmZpZ3VyZWQsIGZhbGwgYmFjayB0byBtYW51YWwgc2VsZWN0aW9uXHJcblx0fVxyXG5cclxuXHR0cnkge1xyXG5cdFx0Ly8gR2V0IHRhc2tzIGNvbnRlbnRcclxuXHRcdGNvbnN0IHsgY29udGVudCwgbGluZXNUb1JlbW92ZSB9ID0gVGFza1V0aWxzLnByb2Nlc3NTZWxlY3RlZFRhc2tzKFxyXG5cdFx0XHRlZGl0b3IsXHJcblx0XHRcdHRhc2tMaW5lcyxcclxuXHRcdFx0bW92ZU1vZGUsXHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncyxcclxuXHRcdFx0Y3VycmVudEZpbGUsXHJcblx0XHRcdHBsdWdpbi5hcHBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRmluZCBvciBjcmVhdGUgdGFyZ2V0IGZpbGVcclxuXHRcdGxldCB0YXJnZXRGaWxlID0gcGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGRlZmF1bHRUYXJnZXRGaWxlKTtcclxuXHJcblx0XHRpZiAoIXRhcmdldEZpbGUpIHtcclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBmaWxlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0dGFyZ2V0RmlsZSA9IGF3YWl0IHBsdWdpbi5hcHAudmF1bHQuY3JlYXRlKGRlZmF1bHRUYXJnZXRGaWxlLCBcIlwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoISh0YXJnZXRGaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IHBhdGggJHtkZWZhdWx0VGFyZ2V0RmlsZX0gaXMgbm90IGEgZmlsZWApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlYWQgdGFyZ2V0IGZpbGUgY29udGVudFxyXG5cdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCBwbHVnaW4uYXBwLnZhdWx0LnJlYWQodGFyZ2V0RmlsZSk7XHJcblx0XHRjb25zdCBsaW5lcyA9IGZpbGVDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdGxldCBpbnNlcnRQb3NpdGlvbjogbnVtYmVyO1xyXG5cdFx0bGV0IGluZGVudExldmVsOiBudW1iZXIgPSAwO1xyXG5cclxuXHRcdC8vIERldGVybWluZSBpbnNlcnRpb24gcG9zaXRpb24gYmFzZWQgb24gbW9kZVxyXG5cdFx0c3dpdGNoIChkZWZhdWx0SW5zZXJ0aW9uTW9kZSkge1xyXG5cdFx0XHRjYXNlIFwiYmVnaW5uaW5nXCI6XHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZW5kXCI6XHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSBsaW5lcy5sZW5ndGg7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJhZnRlci1oZWFkaW5nXCI6XHJcblx0XHRcdFx0Ly8gRmluZCB0aGUgaGVhZGluZyBvciBjcmVhdGUgaXRcclxuXHRcdFx0XHRjb25zdCBoZWFkaW5nUGF0dGVybiA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRgXiMrXFxcXHMrJHtkZWZhdWx0SGVhZGluZ05hbWUucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0L1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLFxyXG5cdFx0XHRcdFx0XHRcIlxcXFwkJlwiXHJcblx0XHRcdFx0XHQpfVxcXFxzKiRgLFxyXG5cdFx0XHRcdFx0XCJpXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGxldCBoZWFkaW5nTGluZUluZGV4ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PlxyXG5cdFx0XHRcdFx0aGVhZGluZ1BhdHRlcm4udGVzdChsaW5lKVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGlmIChoZWFkaW5nTGluZUluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIHRoZSBoZWFkaW5nIGF0IHRoZSBlbmQgb2YgdGhlIGZpbGVcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0bGluZXMubGVuZ3RoID4gMCAmJlxyXG5cdFx0XHRcdFx0XHRsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS50cmltKCkgIT09IFwiXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRsaW5lcy5wdXNoKFwiXCIpOyAvLyBBZGQgZW1wdHkgbGluZSBiZWZvcmUgaGVhZGluZ1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0bGluZXMucHVzaChgIyMgJHtkZWZhdWx0SGVhZGluZ05hbWV9YCk7XHJcblx0XHRcdFx0XHRsaW5lcy5wdXNoKFwiXCIpOyAvLyBBZGQgZW1wdHkgbGluZSBhZnRlciBoZWFkaW5nXHJcblx0XHRcdFx0XHRoZWFkaW5nTGluZUluZGV4ID0gbGluZXMubGVuZ3RoIC0gMjsgLy8gSW5kZXggb2YgdGhlIGhlYWRpbmcgbGluZVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSBoZWFkaW5nTGluZUluZGV4ICsgMTtcclxuXHRcdFx0XHQvLyBTa2lwIGFueSBlbXB0eSBsaW5lcyBhZnRlciB0aGUgaGVhZGluZ1xyXG5cdFx0XHRcdHdoaWxlIChcclxuXHRcdFx0XHRcdGluc2VydFBvc2l0aW9uIDwgbGluZXMubGVuZ3RoICYmXHJcblx0XHRcdFx0XHRsaW5lc1tpbnNlcnRQb3NpdGlvbl0udHJpbSgpID09PSBcIlwiXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRpbnNlcnRQb3NpdGlvbisrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRpbnNlcnRQb3NpdGlvbiA9IGxpbmVzLmxlbmd0aDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGp1c3QgaW5kZW50YXRpb24gb2YgdGFzayBjb250ZW50XHJcblx0XHRjb25zdCBpbmRlbnRlZFRhc2tDb250ZW50ID0gVGFza1V0aWxzLmFkanVzdEluZGVudGF0aW9uKFxyXG5cdFx0XHRjb250ZW50LFxyXG5cdFx0XHRpbmRlbnRMZXZlbCxcclxuXHRcdFx0cGx1Z2luLmFwcFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBJbnNlcnQgdGFzayBhdCB0aGUgcG9zaXRpb25cclxuXHRcdGNvbnN0IG5ld0NvbnRlbnQgPSBbXHJcblx0XHRcdC4uLmxpbmVzLnNsaWNlKDAsIGluc2VydFBvc2l0aW9uKSxcclxuXHRcdFx0aW5kZW50ZWRUYXNrQ29udGVudCxcclxuXHRcdFx0Li4ubGluZXMuc2xpY2UoaW5zZXJ0UG9zaXRpb24pLFxyXG5cdFx0XS5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXJnZXQgZmlsZVxyXG5cdFx0YXdhaXQgcGx1Z2luLmFwcC52YXVsdC5tb2RpZnkodGFyZ2V0RmlsZSwgbmV3Q29udGVudCk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRhc2tzIGZyb20gc291cmNlIGZpbGVcclxuXHRcdFRhc2tVdGlscy5yZW1vdmVUYXNrc0Zyb21GaWxlKGVkaXRvciwgbGluZXNUb1JlbW92ZSk7XHJcblxyXG5cdFx0Y29uc3QgdGFza1R5cGUgPSBpc0NvbXBsZXRlZE1vZGUgPyBcImNvbXBsZXRlZFwiIDogXCJpbmNvbXBsZXRlXCI7XHJcblx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRgJHt0KFwiQXV0by1tb3ZlZFwiKX0gJHt0YXNrVHlwZX0gJHt0KFxyXG5cdFx0XHRcdFwidGFza3MgdG9cIlxyXG5cdFx0XHQpfSAke2RlZmF1bHRUYXJnZXRGaWxlfWBcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdG5ldyBOb3RpY2UoYCR7dChcIkZhaWxlZCB0byBhdXRvLW1vdmUgdGFza3M6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ29tbWFuZCB0byBhdXRvLW1vdmUgY29tcGxldGVkIHRhc2tzIHVzaW5nIGRlZmF1bHQgc2V0dGluZ3NcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhdXRvTW92ZUNvbXBsZXRlZFRhc2tzQ29tbWFuZChcclxuXHRjaGVja2luZzogYm9vbGVhbixcclxuXHRlZGl0b3I6IEVkaXRvcixcclxuXHRjdHg6IE1hcmtkb3duVmlldyB8IE1hcmtkb3duRmlsZUluZm8sXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0bW92ZU1vZGU6XHJcblx0XHR8IFwiYWxsQ29tcGxldGVkXCJcclxuXHRcdHwgXCJkaXJlY3RDaGlsZHJlblwiXHJcblx0XHR8IFwiYWxsXCJcclxuXHRcdHwgXCJhbGxJbmNvbXBsZXRlZFwiXHJcblx0XHR8IFwiZGlyZWN0SW5jb21wbGV0ZWRDaGlsZHJlblwiXHJcbik6IGJvb2xlYW4ge1xyXG5cdC8vIEdldCB0aGUgY3VycmVudCBmaWxlXHJcblx0Y29uc3QgY3VycmVudEZpbGUgPSBjdHguZmlsZTtcclxuXHJcblx0aWYgKGNoZWNraW5nKSB7XHJcblx0XHQvLyBDaGVjayBpZiBhdXRvLW1vdmUgaXMgZW5hYmxlZCBmb3IgdGhpcyBtb2RlXHJcblx0XHRjb25zdCBpc0NvbXBsZXRlZE1vZGUgPVxyXG5cdFx0XHRtb3ZlTW9kZSA9PT0gXCJhbGxDb21wbGV0ZWRcIiB8fFxyXG5cdFx0XHRtb3ZlTW9kZSA9PT0gXCJkaXJlY3RDaGlsZHJlblwiIHx8XHJcblx0XHRcdG1vdmVNb2RlID09PSBcImFsbFwiO1xyXG5cdFx0Y29uc3QgaXNBdXRvTW92ZUVuYWJsZWQgPSBpc0NvbXBsZXRlZE1vZGVcclxuXHRcdFx0PyBwbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmVuYWJsZUF1dG9Nb3ZlXHJcblx0XHRcdDogcGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5lbmFibGVJbmNvbXBsZXRlZEF1dG9Nb3ZlO1xyXG5cdFx0Y29uc3QgZGVmYXVsdFRhcmdldEZpbGUgPSBpc0NvbXBsZXRlZE1vZGVcclxuXHRcdFx0PyBwbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmRlZmF1bHRUYXJnZXRGaWxlXHJcblx0XHRcdDogcGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5pbmNvbXBsZXRlZERlZmF1bHRUYXJnZXRGaWxlO1xyXG5cclxuXHRcdGlmICghaXNBdXRvTW92ZUVuYWJsZWQgfHwgIWRlZmF1bHRUYXJnZXRGaWxlKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTsgLy8gQXV0by1tb3ZlIG5vdCBjb25maWd1cmVkXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgY2hlY2tpbmcsIHJldHVybiB0cnVlIGlmIHdlJ3JlIGluIGEgbWFya2Rvd24gZmlsZSBhbmQgY3Vyc29yIGlzIG9uIGEgdGFzayBsaW5lXHJcblx0XHRpZiAoIWN1cnJlbnRGaWxlIHx8IGN1cnJlbnRGaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzZWxlY3Rpb24gPSBlZGl0b3IuZ2V0U2VsZWN0aW9uKCk7XHJcblx0XHRpZiAoc2VsZWN0aW9uLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblx0XHRcdC8vIENoZWNrIGlmIGxpbmUgaXMgYSB0YXNrIHdpdGggYW55IG9mIHRoZSBzdXBwb3J0ZWQgbGlzdCBtYXJrZXJzICgtLCAxLiwgKilcclxuXHRcdFx0cmV0dXJuIGxpbmUubWF0Y2goL15cXHMqKC18XFxkK1xcLnxcXCopIFxcWyguKVxcXS9pKSAhPT0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0Ly8gRXhlY3V0ZSB0aGUgY29tbWFuZFxyXG5cdGlmICghY3VycmVudEZpbGUpIHtcclxuXHRcdG5ldyBOb3RpY2UodChcIk5vIGFjdGl2ZSBmaWxlIGZvdW5kXCIpKTtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBhbGwgc2VsZWN0aW9ucyB0byBzdXBwb3J0IG11bHRpLWxpbmUgc2VsZWN0aW9uXHJcblx0Y29uc3Qgc2VsZWN0aW9ucyA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpO1xyXG5cclxuXHQvLyBFeHRyYWN0IGFsbCBzZWxlY3RlZCBsaW5lcyBmcm9tIHRoZSBzZWxlY3Rpb25zXHJcblx0Y29uc3Qgc2VsZWN0ZWRMaW5lc1NldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdHNlbGVjdGlvbnMuZm9yRWFjaCgoc2VsZWN0aW9uKSA9PiB7XHJcblx0XHQvLyBHZXQgdGhlIHN0YXJ0IGFuZCBlbmQgbGluZXMgKGFjY291bnRpbmcgZm9yIHNlbGVjdGlvbiBkaXJlY3Rpb24pXHJcblx0XHRjb25zdCBzdGFydExpbmUgPSBNYXRoLm1pbihzZWxlY3Rpb24uYW5jaG9yLmxpbmUsIHNlbGVjdGlvbi5oZWFkLmxpbmUpO1xyXG5cdFx0Y29uc3QgZW5kTGluZSA9IE1hdGgubWF4KHNlbGVjdGlvbi5hbmNob3IubGluZSwgc2VsZWN0aW9uLmhlYWQubGluZSk7XHJcblxyXG5cdFx0Ly8gQWRkIGFsbCBsaW5lcyBpbiB0aGlzIHNlbGVjdGlvbiByYW5nZVxyXG5cdFx0Zm9yIChsZXQgbGluZSA9IHN0YXJ0TGluZTsgbGluZSA8PSBlbmRMaW5lOyBsaW5lKyspIHtcclxuXHRcdFx0c2VsZWN0ZWRMaW5lc1NldC5hZGQobGluZSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIENvbnZlcnQgU2V0IHRvIEFycmF5IGZvciBmdXJ0aGVyIHByb2Nlc3NpbmdcclxuXHRjb25zdCBzZWxlY3RlZExpbmVzID0gQXJyYXkuZnJvbShzZWxlY3RlZExpbmVzU2V0KTtcclxuXHJcblx0Ly8gVHJ5IGF1dG8tbW92ZSBmaXJzdCwgZmFsbCBiYWNrIHRvIG1hbnVhbCBzZWxlY3Rpb24gaWYgaXQgZmFpbHNcclxuXHRhdXRvTW92ZUNvbXBsZXRlZFRhc2tzKFxyXG5cdFx0ZWRpdG9yLFxyXG5cdFx0Y3VycmVudEZpbGUsXHJcblx0XHRwbHVnaW4sXHJcblx0XHRzZWxlY3RlZExpbmVzLFxyXG5cdFx0bW92ZU1vZGVcclxuXHQpLnRoZW4oKHN1Y2Nlc3MpID0+IHtcclxuXHRcdGlmICghc3VjY2Vzcykge1xyXG5cdFx0XHQvLyBGYWxsIGJhY2sgdG8gbWFudWFsIHNlbGVjdGlvblxyXG5cdFx0XHRuZXcgQ29tcGxldGVkVGFza0ZpbGVTZWxlY3Rpb25Nb2RhbChcclxuXHRcdFx0XHRwbHVnaW4uYXBwLFxyXG5cdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0Y3VycmVudEZpbGUsXHJcblx0XHRcdFx0c2VsZWN0ZWRMaW5lcyxcclxuXHRcdFx0XHRtb3ZlTW9kZVxyXG5cdFx0XHQpLm9wZW4oKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuIl19