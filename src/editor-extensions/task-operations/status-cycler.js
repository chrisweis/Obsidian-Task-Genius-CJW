import { editorInfoField } from "obsidian";
import { EditorState, } from "@codemirror/state";
import { taskStatusChangeAnnotation } from "./status-switcher";
import { getTasksAPI } from "@/utils";
import { priorityChangeAnnotation } from "../ui-widgets/priority-picker";
import { parseTaskLine } from "@/utils/task/task-operations";
/**
 * Creates an editor extension that cycles through task statuses when a user clicks on a task marker
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function cycleCompleteStatusExtension(app, plugin) {
    return EditorState.transactionFilter.of((tr) => {
        return handleCycleCompleteStatusTransaction(tr, app, plugin);
    });
}
/**
 * Gets the task status configuration from the plugin settings
 * @param plugin The plugin instance
 * @returns Object containing the task cycle and marks
 */
function getTaskStatusConfig(plugin) {
    return {
        cycle: plugin.settings.taskStatusCycle,
        excludeMarksFromCycle: plugin.settings.excludeMarksFromCycle || [],
        marks: plugin.settings.taskStatusMarks,
    };
}
/**
 * Checks if a replacement operation is a valid task marker replacement
 * @param tr The transaction containing selection and change information
 * @param fromA Start position of the replacement
 * @param toA End position of the replacement
 * @param insertedText The text being inserted
 * @param originalText The text being replaced
 * @param pos The position in the new document
 * @param newLineText The full line text after the change
 * @param plugin The plugin instance for accessing settings
 * @returns true if this is a valid task marker replacement, false otherwise
 */
function isValidTaskMarkerReplacement(tr, fromA, toA, insertedText, originalText, pos, newLineText, plugin) {
    // Only single character replacements are considered valid task marker operations
    if (toA - fromA !== 1 || insertedText.length !== 1) {
        return false;
    }
    // Get valid task status marks from plugin settings
    const { marks } = getTaskStatusConfig(plugin);
    const validMarks = Object.values(marks);
    // Check if both the original and inserted characters are valid task status marks
    const isOriginalValidMark = validMarks.includes(originalText) || originalText === " ";
    const isInsertedValidMark = validMarks.includes(insertedText) || insertedText === " ";
    // If either character is not a valid task mark, this is likely manual input
    if (!isOriginalValidMark || !isInsertedValidMark) {
        return false;
    }
    // IMPORTANT: Prevent triggering when typing regular letters in an empty checkbox
    // If original is space and inserted is a letter (not a status mark), it's typing
    if (originalText === " " &&
        !validMarks.includes(insertedText) &&
        insertedText !== " ") {
        // User is typing in an empty checkbox, not changing status
        return false;
    }
    // Check if the replacement position is at a task marker location
    const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[(.)]/;
    const match = newLineText.match(taskRegex);
    if (!match) {
        return false;
    }
    // Log successful validation for debugging
    console.log(`Valid task marker replacement detected. No user selection or selection doesn't cover replacement range. Original: '${originalText}' -> New: '${insertedText}' at position ${fromA}-${toA}`);
    return true;
}
/**
 * Finds a task status change event in the transaction
 * @param tr The transaction to check
 * @param tasksPluginLoaded Whether the Obsidian Tasks plugin is loaded
 * @param plugin The plugin instance (optional for backwards compatibility)
 * @returns Information about all changed task statuses or empty array if no status was changed
 */
export function findTaskStatusChanges(tr, tasksPluginLoaded, plugin) {
    const taskChanges = [];
    // Check if this is a multi-line indentation change (increase or decrease)
    // If so, return empty array
    let isMultiLineIndentationChange = false;
    if (tr.changes.length > 1) {
        const changes = [];
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            changes.push({
                fromA,
                toA,
                fromB,
                toB,
                text: inserted.toString(),
            });
        });
        // Check if all changes are on different lines and are just indentation changes
        if (changes.length > 1) {
            const allIndentChanges = changes.every((change) => change.text === "\t" ||
                change.text === "    " ||
                (change.text === "" &&
                    (tr.startState.doc.sliceString(change.fromA, change.toA) === "\t" ||
                        tr.startState.doc.sliceString(change.fromA, change.toA) === "    ")));
            if (allIndentChanges) {
                isMultiLineIndentationChange = true;
            }
        }
    }
    if (isMultiLineIndentationChange) {
        return [];
    }
    // Check for deletion operations that might affect line content
    // like deleting a dash character at the beginning of a task line
    let isDeletingTaskMarker = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Check for deletion operation (inserted text is empty)
        if (inserted.toString() === "" && toA > fromA) {
            // Get the deleted content
            const deletedContent = tr.startState.doc.sliceString(fromA, toA);
            // Check if the deleted content is a dash character
            if (deletedContent === "-") {
                // Check if the dash is at the beginning of a line or after indentation
                const line = tr.startState.doc.lineAt(fromA);
                const textBeforeDash = line.text.substring(0, fromA - line.from);
                if (textBeforeDash.trim() === "") {
                    isDeletingTaskMarker = true;
                }
            }
        }
    });
    if (isDeletingTaskMarker) {
        return [];
    }
    // Check each change in the transaction
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Get the inserted text
        const insertedText = inserted.toString();
        // Check if this is a new task creation with a newline
        if (insertedText.includes("\n")) {
            console.log("New task creation detected with newline, skipping");
            return;
        }
        if (insertedText.includes("[[") || insertedText.includes("]]")) {
            console.log("Link detected, skipping");
            return;
        }
        if (fromB > tr.startState.doc.length) {
            return;
        }
        // Get the position context
        const pos = fromB;
        const originalLine = tr.startState.doc.lineAt(pos);
        const originalLineText = originalLine.text;
        if (originalLineText.trim() === "") {
            return;
        }
        const newLine = tr.newDoc.lineAt(pos);
        const newLineText = newLine.text;
        // Check if this line contains a task
        const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[(.)]/;
        const match = originalLineText.match(taskRegex);
        const newMatch = newLineText.match(taskRegex);
        // Handle pasted task content
        if (newMatch && !match && insertedText === newLineText) {
            const markIndex = newLineText.indexOf("[") + 1;
            const changedPosition = newLine.from + markIndex;
            const currentMark = newMatch[2];
            taskChanges.push({
                position: changedPosition,
                currentMark: currentMark,
                wasCompleteTask: true,
                tasksInfo: {
                    isTaskChange: true,
                    originalFromA: fromA,
                    originalToA: toA,
                    originalFromB: fromB,
                    originalToB: toB,
                    originalInsertedText: insertedText,
                },
            });
            return;
        }
        if (match) {
            let changedPosition = null;
            let currentMark = null;
            let wasCompleteTask = false;
            let isTaskChange = false;
            let triggerByTasks = false;
            // Case 1: Complete task inserted at once (e.g., "- [x]")
            if (insertedText
                .trim()
                .match(/^(?:[\s|\t]*(?:[-*+]|\d+\.)\s+\[.(?:\])?)/)) {
                // Get the mark position in the line
                const markIndex = newLineText.indexOf("[") + 1;
                changedPosition = newLine.from + markIndex;
                currentMark = match[2];
                wasCompleteTask = true;
                isTaskChange = true;
            }
            // Case 2: Just the mark character was inserted
            else if (insertedText.length === 1) {
                // Check if our insertion point is at the mark position
                const markIndex = newLineText.indexOf("[") + 1;
                // Don't trigger when typing the "[" character itself, only when editing the status mark within brackets
                // Also don't trigger when typing regular letters in empty checkbox (unless it's a valid status mark like x, /, etc.)
                if (pos === newLine.from + markIndex &&
                    insertedText !== "[" &&
                    !(match[2] === " " &&
                        /[a-zA-Z]/.test(insertedText) &&
                        (plugin
                            ? !Object.values(getTaskStatusConfig(plugin).marks).includes(insertedText)
                            : true))) {
                    // Check if this is a replacement operation and validate if it's a valid task marker replacement
                    if (fromA !== toA) {
                        const originalText = tr.startState.doc.sliceString(fromA, toA);
                        // Only perform validation if plugin is provided
                        if (plugin) {
                            const isValidReplacement = isValidTaskMarkerReplacement(tr, fromA, toA, insertedText, originalText, pos, newLineText, plugin);
                            if (!isValidReplacement) {
                                console.log(`Detected invalid task marker replacement (fromA=${fromA}, toA=${toA}). User manually input '${insertedText}' (original: '${originalText}'), skipping automatic cycling.`);
                                return; // Skip this change, don't add to taskChanges
                            }
                            console.log(`Detected valid task marker replacement (fromA=${fromA}, toA=${toA}). Original: '${originalText}' -> New: '${insertedText}', proceeding with automatic cycling.`);
                        }
                        else {
                            // Fallback to original logic for backwards compatibility
                            console.log(`Detected replacement operation (fromA=${fromA}, toA=${toA}). User manually input '${insertedText}', skipping automatic cycling.`);
                            return; // Skip this change, don't add to taskChanges
                        }
                    }
                    changedPosition = pos;
                    currentMark = match[2];
                    wasCompleteTask = true;
                    isTaskChange = true;
                }
            }
            // Case 3: Multiple characters including a mark were inserted
            else if (insertedText.indexOf("[") !== -1 &&
                insertedText.indexOf("]") !== -1 &&
                insertedText !== "[]") {
                // Handle cases where part of a task including the mark was inserted
                const markIndex = newLineText.indexOf("[") + 1;
                changedPosition = newLine.from + markIndex;
                currentMark = match[2];
                wasCompleteTask = true;
                isTaskChange = true;
            }
            if (tasksPluginLoaded &&
                newLineText === insertedText &&
                (insertedText.includes("✅") ||
                    insertedText.includes("❌") ||
                    insertedText.includes("🛫") ||
                    insertedText.includes("📅") ||
                    originalLineText.includes("✅") ||
                    originalLineText.includes("❌") ||
                    originalLineText.includes("🛫") ||
                    originalLineText.includes("📅"))) {
                triggerByTasks = true;
            }
            if (changedPosition !== null &&
                currentMark !== null &&
                isTaskChange) {
                // If we found a task change, add it to our list
                taskChanges.push({
                    position: changedPosition,
                    currentMark: currentMark,
                    wasCompleteTask: wasCompleteTask,
                    tasksInfo: triggerByTasks
                        ? {
                            isTaskChange: triggerByTasks,
                            originalFromA: fromA,
                            originalToA: toA,
                            originalFromB: fromB,
                            originalToB: toB,
                            originalInsertedText: insertedText,
                        }
                        : null,
                });
            }
        }
    });
    return taskChanges;
}
/**
 * Handles transactions to detect task status changes and cycle through available statuses
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
export function handleCycleCompleteStatusTransaction(tr, app, plugin) {
    var _a, _b;
    // Only process transactions that change the document and are user input events
    if (!tr.docChanged) {
        return tr;
    }
    if (tr.annotation(taskStatusChangeAnnotation) ||
        tr.annotation(priorityChangeAnnotation)) {
        return tr;
    }
    if (tr.isUserEvent("set") && tr.changes.length > 1) {
        return tr;
    }
    if (tr.isUserEvent("input.paste")) {
        return tr;
    }
    console.log(tr.changes, "changes");
    // Check for markdown link insertion (cmd+k)
    if (tr.isUserEvent("input.autocomplete")) {
        // Look for typical markdown link pattern [text]() in the changes
        let isMarkdownLinkInsertion = false;
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            const insertedText = inserted.toString();
            // Check if the insertedText matches a markdown link pattern
            if (insertedText.includes("](") &&
                insertedText.startsWith("[") &&
                insertedText.endsWith(")")) {
                isMarkdownLinkInsertion = true;
            }
        });
        if (isMarkdownLinkInsertion) {
            return tr;
        }
    }
    // Check for suspicious transaction that might be a task deletion
    // For example, when user presses backspace to delete a dash at the beginning of a task line
    let hasInvalidTaskChange = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Check if this removes a dash character and somehow modifies a task marker elsewhere
        const insertedText = inserted.toString();
        const deletedText = tr.startState.doc.sliceString(fromA, toA);
        // Dash deletion but position change indicates task marker modification
        if (deletedText === "-" &&
            insertedText === "" &&
            (fromB !== fromA || toB !== toA) &&
            tr.newDoc
                .sliceString(Math.max(0, fromB - 5), Math.min(fromB + 5, tr.newDoc.length))
                .includes("[")) {
            hasInvalidTaskChange = true;
        }
    });
    if (hasInvalidTaskChange) {
        return tr;
    }
    // Check if any task statuses were changed in this transaction
    const taskStatusChanges = findTaskStatusChanges(tr, !!getTasksAPI(plugin), plugin);
    if (taskStatusChanges.length === 0) {
        return tr;
    }
    // Get the task cycle and marks from plugin settings
    const { cycle, marks, excludeMarksFromCycle } = getTaskStatusConfig(plugin);
    const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
    // If no cycle is defined, don't do anything
    if (remainingCycle.length === 0) {
        return tr;
    }
    // Additional check: if the transaction changes a task's status while also deleting content elsewhere
    // it might be an invalid operation caused by backspace key
    let hasTaskAndDeletion = false;
    if (tr.changes.length > 1) {
        const changes = [];
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            changes.push({
                fromA,
                toA,
                fromB,
                toB,
                text: inserted.toString(),
            });
        });
        // Check for deletions and task changes in the same transaction
        const hasDeletion = changes.some((change) => change.text === "" && change.toA > change.fromA);
        const hasTaskMarkerChange = changes.some((change) => {
            // Check if this change affects a task marker position [x]
            const pos = change.fromB;
            try {
                const line = tr.newDoc.lineAt(pos);
                return line.text.includes("[") && line.text.includes("]");
            }
            catch (e) {
                return false;
            }
        });
        if (hasDeletion && hasTaskMarkerChange) {
            hasTaskAndDeletion = true;
        }
    }
    if (hasTaskAndDeletion) {
        return tr;
    }
    // Check if the transaction is just indentation or unindentation
    let isIndentationChange = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Check if from the start of a line
        const isLineStart = fromA === 0 ||
            tr.startState.doc.sliceString(fromA - 1, fromA) === "\n";
        if (isLineStart) {
            const originalLine = tr.startState.doc.lineAt(fromA).text;
            const newLine = inserted.toString();
            // Check for indentation (adding spaces/tabs at beginning)
            if (newLine.trim() === originalLine.trim() &&
                newLine.length > originalLine.length) {
                isIndentationChange = true;
            }
            // Check for unindentation (removing spaces/tabs from beginning)
            if (originalLine.trim() === newLine.trim() &&
                originalLine.length > newLine.length) {
                isIndentationChange = true;
            }
        }
    });
    if (isIndentationChange) {
        return tr;
    }
    // Check if the transaction is just deleting a line after a task
    // or replacing the entire content with the exact same line
    let isLineDeleteOrReplace = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        const deletedText = tr.startState.doc.sliceString(fromA, toA);
        const insertedText = inserted.toString();
        const taskMarkerPattern = /(?:-|\*|\+|\d+\.)\s\[.\]/;
        // Check if deleting a line that contains a newline
        if (deletedText.includes("\n") && !insertedText.includes("\n")) {
            // If we're replacing with a task line (with any status marker), this is a line deletion
            if (taskMarkerPattern.test(insertedText) &&
                taskMarkerPattern.test(deletedText)) {
                // Check if we're just keeping the task line but deleting what comes after
                const taskLine = insertedText.trim();
                if (deletedText.includes(taskLine)) {
                    isLineDeleteOrReplace = true;
                }
            }
        }
        // Check if we're replacing the entire content with a full line that includes task markers
        if (fromA === 0 &&
            toA === tr.startState.doc.length &&
            taskMarkerPattern.test(insertedText) &&
            !insertedText.includes("\n")) {
            isLineDeleteOrReplace = true;
        }
    });
    if (isLineDeleteOrReplace) {
        return tr;
    }
    // Build a new list of changes to replace the original ones
    const newChanges = [];
    let completingTask = false;
    // Process each task status change
    for (const taskStatusInfo of taskStatusChanges) {
        const { position, currentMark, wasCompleteTask, tasksInfo } = taskStatusInfo;
        if (tasksInfo === null || tasksInfo === void 0 ? void 0 : tasksInfo.isTaskChange) {
            console.log(tasksInfo);
            continue;
        }
        // Find the current status in the cycle
        let currentStatusIndex = -1;
        for (let i = 0; i < remainingCycle.length; i++) {
            const state = remainingCycle[i];
            if (marks[state] === currentMark) {
                currentStatusIndex = i;
                break;
            }
        }
        // If we couldn't find the current status in the cycle, start from the first one
        if (currentStatusIndex === -1) {
            currentStatusIndex = 0;
        }
        // Calculate the next status
        const nextStatusIndex = (currentStatusIndex + 1) % remainingCycle.length;
        const nextStatus = remainingCycle[nextStatusIndex];
        const nextMark = marks[nextStatus] || " ";
        // Check if the current mark is the same as what would be the next mark in the cycle
        // If they are the same, we don't need to process this further
        if (currentMark === nextMark) {
            console.log(`Current mark '${currentMark}' is already the next mark in the cycle. Skipping processing.`);
            continue;
        }
        // NEW: Check if user's input already matches the next mark in the cycle
        // Get the user's input from the transaction
        let userInputMark = null;
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            const insertedText = inserted.toString();
            // Check if this change is at the task marker position
            if (fromB === position && insertedText.length === 1) {
                userInputMark = insertedText;
            }
        });
        // If user's input already matches the next mark, don't cycle
        if (userInputMark === nextMark) {
            console.log(`User input '${userInputMark}' already matches the next mark '${nextMark}' in the cycle. Skipping processing.`);
            continue;
        }
        // Get line context for the current position to check task type
        const posLine = tr.newDoc.lineAt(position);
        const newLineText = posLine.text;
        const originalPosLine = tr.startState.doc.lineAt(Math.min(position, tr.startState.doc.length));
        const originalLineText = originalPosLine.text;
        // For newly inserted complete tasks, check if the mark matches the first status
        // If so, we may choose to leave it as is rather than immediately cycling it
        if (wasCompleteTask) {
            // Find the corresponding status for this mark
            for (const [_, mark] of Object.entries(marks)) {
                if (mark === currentMark) {
                    break;
                }
            }
            // Check if this is a brand new task insertion with "[ ]" (space) mark
            const isNewEmptyTask = currentMark === " " &&
                // Verify the original content contains the full task marker with "[ ]"
                (((_a = tasksInfo === null || tasksInfo === void 0 ? void 0 : tasksInfo.originalInsertedText) === null || _a === void 0 ? void 0 : _a.includes("[ ]")) ||
                    // Or check if the line now contains a task marker that wasn't there before
                    (newLineText.includes("[ ]") &&
                        !originalLineText.includes("[ ]")));
            // Additional check for when a user is specifically creating a task with [ ]
            const isManualTaskCreation = currentMark === " " &&
                // Check if the insertion includes the full task syntax
                ((insertedText) => {
                    // Look for common patterns of task creation
                    return ((insertedText === null || insertedText === void 0 ? void 0 : insertedText.includes("- [ ]")) ||
                        (insertedText === null || insertedText === void 0 ? void 0 : insertedText.includes("* [ ]")) ||
                        (insertedText === null || insertedText === void 0 ? void 0 : insertedText.includes("+ [ ]")) ||
                        /^\d+\.\s+\[\s\]/.test(insertedText || ""));
                })(tasksInfo === null || tasksInfo === void 0 ? void 0 : tasksInfo.originalInsertedText);
            // Don't cycle newly created empty tasks, even if alwaysCycleNewTasks is true
            // This prevents unexpected data loss when creating a task
            if (isNewEmptyTask || isManualTaskCreation) {
                console.log(`New empty task detected with mark ' ', leaving as is regardless of alwaysCycleNewTasks setting`);
                continue;
            }
            // If the mark is valid and this is a complete task insertion,
            // don't cycle it immediately - we've removed alwaysCycleNewTasks entirely
        }
        // Find the exact position to place the mark
        const markPosition = position;
        // Get the line information to ensure we don't go beyond the current line
        const lineAtMark = tr.newDoc.lineAt(markPosition);
        const lineEnd = lineAtMark.to;
        // Check if the mark position is within the current line and valid
        if (markPosition < lineAtMark.from || markPosition >= lineEnd) {
            console.log(`Mark position ${markPosition} is beyond the current line range ${lineAtMark.from}-${lineEnd}, skipping processing`);
            continue;
        }
        // Ensure the modification range doesn't exceed the current line
        const validTo = Math.min(markPosition + 1, lineEnd);
        if (validTo <= markPosition) {
            console.log(`Invalid modification range ${markPosition}-${validTo}, skipping processing`);
            continue;
        }
        if (nextMark === "x" || nextMark === "X") {
            completingTask = true;
        }
        // If nextMark is 'x', 'X', or space and we have Tasks plugin info, use the original insertion
        if ((nextMark === "x" || nextMark === "X" || nextMark === " ") &&
            tasksInfo !== null) {
            // Verify if the Tasks plugin's modification range is within the same line
            const origLineAtFromA = tr.startState.doc.lineAt(tasksInfo.originalFromA);
            const origLineAtToA = tr.startState.doc.lineAt(Math.min(tasksInfo.originalToA, tr.startState.doc.length));
            if (origLineAtFromA.number !== origLineAtToA.number) {
                console.log(`Tasks plugin modification range spans multiple lines ${origLineAtFromA.number}-${origLineAtToA.number}, using safe modification range`);
                // Use the safe modification range
                newChanges.push({
                    from: markPosition,
                    to: validTo,
                    insert: nextMark,
                });
            }
            else {
                // Use the original insertion from Tasks plugin
                newChanges.push({
                    from: tasksInfo.originalFromA,
                    to: tasksInfo.originalToA,
                    insert: tasksInfo.originalInsertedText,
                });
            }
        }
        else {
            // Add a change to replace the current mark with the next one
            newChanges.push({
                from: markPosition,
                to: validTo,
                insert: nextMark,
            });
        }
    }
    // If we found any changes to make, create a new transaction
    if (newChanges.length > 0) {
        const editorInfo = tr.startState.field(editorInfoField);
        const change = newChanges[0];
        const line = tr.newDoc.lineAt(change.from);
        const task = parseTaskLine(((_b = editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.file) === null || _b === void 0 ? void 0 : _b.path) || "", line.text, line.number, plugin.settings.preferMetadataFormat, plugin // Pass plugin for configurable prefix support
        );
        // if (completingTask && task) {
        // 	app.workspace.trigger("task-genius:task-completed", task);
        // }
        return {
            changes: newChanges,
            selection: tr.selection,
            annotations: taskStatusChangeAnnotation.of("taskStatusChange"),
        };
    }
    // If no changes were made, return the original transaction
    return tr;
}
export { taskStatusChangeAnnotation };
export { priorityChangeAnnotation };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLWN5Y2xlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN0YXR1cy1jeWNsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFPLGVBQWUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQ04sV0FBVyxHQUlYLE1BQU0sbUJBQW1CLENBQUM7QUFFM0IsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN0QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFN0Q7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLEdBQVEsRUFDUixNQUE2QjtJQUU3QixPQUFPLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtRQUM5QyxPQUFPLG9DQUFvQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsbUJBQW1CLENBQUMsTUFBNkI7SUFDekQsT0FBTztRQUNOLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWU7UUFDdEMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFO1FBQ2xFLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWU7S0FDdEMsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQVMsNEJBQTRCLENBQ3BDLEVBQWUsRUFDZixLQUFhLEVBQ2IsR0FBVyxFQUNYLFlBQW9CLEVBQ3BCLFlBQW9CLEVBQ3BCLEdBQVcsRUFDWCxXQUFtQixF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QUFDO0FBRUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUM7QUFDdEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIGVkaXRvckluZm9GaWVsZCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEVkaXRvclN0YXRlLFxyXG5cdFRleHQsXHJcblx0VHJhbnNhY3Rpb24sXHJcblx0VHJhbnNhY3Rpb25TcGVjLFxyXG59IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi8uLi9pbmRleFwiO1xyXG5pbXBvcnQgeyB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbiB9IGZyb20gXCIuL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5pbXBvcnQgeyBnZXRUYXNrc0FQSSB9IGZyb20gXCJAL3V0aWxzXCI7XHJcbmltcG9ydCB7IHByaW9yaXR5Q2hhbmdlQW5ub3RhdGlvbiB9IGZyb20gXCIuLi91aS13aWRnZXRzL3ByaW9yaXR5LXBpY2tlclwiO1xyXG5pbXBvcnQgeyBwYXJzZVRhc2tMaW5lIH0gZnJvbSBcIkAvdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuIGVkaXRvciBleHRlbnNpb24gdGhhdCBjeWNsZXMgdGhyb3VnaCB0YXNrIHN0YXR1c2VzIHdoZW4gYSB1c2VyIGNsaWNrcyBvbiBhIHRhc2sgbWFya2VyXHJcbiAqIEBwYXJhbSBhcHAgVGhlIE9ic2lkaWFuIGFwcCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgQW4gZWRpdG9yIGV4dGVuc2lvbiB0aGF0IGNhbiBiZSByZWdpc3RlcmVkIHdpdGggdGhlIHBsdWdpblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGN5Y2xlQ29tcGxldGVTdGF0dXNFeHRlbnNpb24oXHJcblx0YXBwOiBBcHAsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKSB7XHJcblx0cmV0dXJuIEVkaXRvclN0YXRlLnRyYW5zYWN0aW9uRmlsdGVyLm9mKCh0cikgPT4ge1xyXG5cdFx0cmV0dXJuIGhhbmRsZUN5Y2xlQ29tcGxldGVTdGF0dXNUcmFuc2FjdGlvbih0ciwgYXBwLCBwbHVnaW4pO1xyXG5cdH0pO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgdGFzayBzdGF0dXMgY29uZmlndXJhdGlvbiBmcm9tIHRoZSBwbHVnaW4gc2V0dGluZ3NcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIE9iamVjdCBjb250YWluaW5nIHRoZSB0YXNrIGN5Y2xlIGFuZCBtYXJrc1xyXG4gKi9cclxuZnVuY3Rpb24gZ2V0VGFza1N0YXR1c0NvbmZpZyhwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdHJldHVybiB7XHJcblx0XHRjeWNsZTogcGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNDeWNsZSxcclxuXHRcdGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZTogcGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSB8fCBbXSxcclxuXHRcdG1hcmtzOiBwbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzLFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgYSByZXBsYWNlbWVudCBvcGVyYXRpb24gaXMgYSB2YWxpZCB0YXNrIG1hcmtlciByZXBsYWNlbWVudFxyXG4gKiBAcGFyYW0gdHIgVGhlIHRyYW5zYWN0aW9uIGNvbnRhaW5pbmcgc2VsZWN0aW9uIGFuZCBjaGFuZ2UgaW5mb3JtYXRpb25cclxuICogQHBhcmFtIGZyb21BIFN0YXJ0IHBvc2l0aW9uIG9mIHRoZSByZXBsYWNlbWVudFxyXG4gKiBAcGFyYW0gdG9BIEVuZCBwb3NpdGlvbiBvZiB0aGUgcmVwbGFjZW1lbnRcclxuICogQHBhcmFtIGluc2VydGVkVGV4dCBUaGUgdGV4dCBiZWluZyBpbnNlcnRlZFxyXG4gKiBAcGFyYW0gb3JpZ2luYWxUZXh0IFRoZSB0ZXh0IGJlaW5nIHJlcGxhY2VkXHJcbiAqIEBwYXJhbSBwb3MgVGhlIHBvc2l0aW9uIGluIHRoZSBuZXcgZG9jdW1lbnRcclxuICogQHBhcmFtIG5ld0xpbmVUZXh0IFRoZSBmdWxsIGxpbmUgdGV4dCBhZnRlciB0aGUgY2hhbmdlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZSBmb3IgYWNjZXNzaW5nIHNldHRpbmdzXHJcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhpcyBpcyBhIHZhbGlkIHRhc2sgbWFya2VyIHJlcGxhY2VtZW50LCBmYWxzZSBvdGhlcndpc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzVmFsaWRUYXNrTWFya2VyUmVwbGFjZW1lbnQoXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdGZyb21BOiBudW1iZXIsXHJcblx0dG9BOiBudW1iZXIsXHJcblx0aW5zZXJ0ZWRUZXh0OiBzdHJpbmcsXHJcblx0b3JpZ2luYWxUZXh0OiBzdHJpbmcsXHJcblx0cG9zOiBudW1iZXIsXHJcblx0bmV3TGluZVRleHQ6IHN0cmluZyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBib29sZWFuIHtcclxuXHQvLyBPbmx5IHNpbmdsZSBjaGFyYWN0ZXIgcmVwbGFjZW1lbnRzIGFyZSBjb25zaWRlcmVkIHZhbGlkIHRhc2sgbWFya2VyIG9wZXJhdGlvbnNcclxuXHRpZiAodG9BIC0gZnJvbUEgIT09IDEgfHwgaW5zZXJ0ZWRUZXh0Lmxlbmd0aCAhPT0gMSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IHZhbGlkIHRhc2sgc3RhdHVzIG1hcmtzIGZyb20gcGx1Z2luIHNldHRpbmdzXHJcblx0Y29uc3QgeyBtYXJrcyB9ID0gZ2V0VGFza1N0YXR1c0NvbmZpZyhwbHVnaW4pO1xyXG5cdGNvbnN0IHZhbGlkTWFya3MgPSBPYmplY3QudmFsdWVzKG1hcmtzKTtcclxuXHJcblx0Ly8gQ2hlY2sgaWYgYm90aCB0aGUgb3JpZ2luYWwgYW5kIGluc2VydGVkIGNoYXJhY3RlcnMgYXJlIHZhbGlkIHRhc2sgc3RhdHVzIG1hcmtzXHJcblx0Y29uc3QgaXNPcmlnaW5hbFZhbGlkTWFyayA9XHJcblx0XHR2YWxpZE1hcmtzLmluY2x1ZGVzKG9yaWdpbmFsVGV4dCkgfHwgb3JpZ2luYWxUZXh0ID09PSBcIiBcIjtcclxuXHRjb25zdCBpc0luc2VydGVkVmFsaWRNYXJrID1cclxuXHRcdHZhbGlkTWFya3MuaW5jbHVkZXMoaW5zZXJ0ZWRUZXh0KSB8fCBpbnNlcnRlZFRleHQgPT09IFwiIFwiO1xyXG5cclxuXHQvLyBJZiBlaXRoZXIgY2hhcmFjdGVyIGlzIG5vdCBhIHZhbGlkIHRhc2sgbWFyaywgdGhpcyBpcyBsaWtlbHkgbWFudWFsIGlucHV0XHJcblx0aWYgKCFpc09yaWdpbmFsVmFsaWRNYXJrIHx8ICFpc0luc2VydGVkVmFsaWRNYXJrKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBJTVBPUlRBTlQ6IFByZXZlbnQgdHJpZ2dlcmluZyB3aGVuIHR5cGluZyByZWd1bGFyIGxldHRlcnMgaW4gYW4gZW1wdHkgY2hlY2tib3hcclxuXHQvLyBJZiBvcmlnaW5hbCBpcyBzcGFjZSBhbmQgaW5zZXJ0ZWQgaXMgYSBsZXR0ZXIgKG5vdCBhIHN0YXR1cyBtYXJrKSwgaXQncyB0eXBpbmdcclxuXHRpZiAoXHJcblx0XHRvcmlnaW5hbFRleHQgPT09IFwiIFwiICYmXHJcblx0XHQhdmFsaWRNYXJrcy5pbmNsdWRlcyhpbnNlcnRlZFRleHQpICYmXHJcblx0XHRpbnNlcnRlZFRleHQgIT09IFwiIFwiXHJcblx0KSB7XHJcblx0XHQvLyBVc2VyIGlzIHR5cGluZyBpbiBhbiBlbXB0eSBjaGVja2JveCwgbm90IGNoYW5naW5nIHN0YXR1c1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgdGhlIHJlcGxhY2VtZW50IHBvc2l0aW9uIGlzIGF0IGEgdGFzayBtYXJrZXIgbG9jYXRpb25cclxuXHRjb25zdCB0YXNrUmVnZXggPSAvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHMrXFxbKC4pXS87XHJcblx0Y29uc3QgbWF0Y2ggPSBuZXdMaW5lVGV4dC5tYXRjaCh0YXNrUmVnZXgpO1xyXG5cclxuXHRpZiAoIW1hdGNoKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBMb2cgc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uIGZvciBkZWJ1Z2dpbmdcclxuXHRjb25zb2xlLmxvZyhcclxuXHRcdGBWYWxpZCB0YXNrIG1hcmtlciByZXBsYWNlbWVudCBkZXRlY3RlZC4gTm8gdXNlciBzZWxlY3Rpb24gb3Igc2VsZWN0aW9uIGRvZXNuJ3QgY292ZXIgcmVwbGFjZW1lbnQgcmFuZ2UuIE9yaWdpbmFsOiAnJHtvcmlnaW5hbFRleHR9JyAtPiBOZXc6ICcke2luc2VydGVkVGV4dH0nIGF0IHBvc2l0aW9uICR7ZnJvbUF9LSR7dG9BfWBcclxuXHQpO1xyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbmRzIGEgdGFzayBzdGF0dXMgY2hhbmdlIGV2ZW50IGluIHRoZSB0cmFuc2FjdGlvblxyXG4gKiBAcGFyYW0gdHIgVGhlIHRyYW5zYWN0aW9uIHRvIGNoZWNrXHJcbiAqIEBwYXJhbSB0YXNrc1BsdWdpbkxvYWRlZCBXaGV0aGVyIHRoZSBPYnNpZGlhbiBUYXNrcyBwbHVnaW4gaXMgbG9hZGVkXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZSAob3B0aW9uYWwgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5KVxyXG4gKiBAcmV0dXJucyBJbmZvcm1hdGlvbiBhYm91dCBhbGwgY2hhbmdlZCB0YXNrIHN0YXR1c2VzIG9yIGVtcHR5IGFycmF5IGlmIG5vIHN0YXR1cyB3YXMgY2hhbmdlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRUYXNrU3RhdHVzQ2hhbmdlcyhcclxuXHR0cjogVHJhbnNhY3Rpb24sXHJcblx0dGFza3NQbHVnaW5Mb2FkZWQ6IGJvb2xlYW4sXHJcblx0cGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IHtcclxuXHRwb3NpdGlvbjogbnVtYmVyO1xyXG5cdGN1cnJlbnRNYXJrOiBzdHJpbmc7XHJcblx0d2FzQ29tcGxldGVUYXNrOiBib29sZWFuO1xyXG5cdHRhc2tzSW5mbzoge1xyXG5cdFx0aXNUYXNrQ2hhbmdlOiBib29sZWFuO1xyXG5cdFx0b3JpZ2luYWxGcm9tQTogbnVtYmVyO1xyXG5cdFx0b3JpZ2luYWxUb0E6IG51bWJlcjtcclxuXHRcdG9yaWdpbmFsRnJvbUI6IG51bWJlcjtcclxuXHRcdG9yaWdpbmFsVG9COiBudW1iZXI7XHJcblx0XHRvcmlnaW5hbEluc2VydGVkVGV4dDogc3RyaW5nO1xyXG5cdH0gfCBudWxsO1xyXG59W10ge1xyXG5cdGNvbnN0IHRhc2tDaGFuZ2VzOiB7XHJcblx0XHRwb3NpdGlvbjogbnVtYmVyO1xyXG5cdFx0Y3VycmVudE1hcms6IHN0cmluZztcclxuXHRcdHdhc0NvbXBsZXRlVGFzazogYm9vbGVhbjtcclxuXHRcdHRhc2tzSW5mbzoge1xyXG5cdFx0XHRpc1Rhc2tDaGFuZ2U6IGJvb2xlYW47XHJcblx0XHRcdG9yaWdpbmFsRnJvbUE6IG51bWJlcjtcclxuXHRcdFx0b3JpZ2luYWxUb0E6IG51bWJlcjtcclxuXHRcdFx0b3JpZ2luYWxGcm9tQjogbnVtYmVyO1xyXG5cdFx0XHRvcmlnaW5hbFRvQjogbnVtYmVyO1xyXG5cdFx0XHRvcmlnaW5hbEluc2VydGVkVGV4dDogc3RyaW5nO1xyXG5cdFx0fSB8IG51bGw7XHJcblx0fVtdID0gW107XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBtdWx0aS1saW5lIGluZGVudGF0aW9uIGNoYW5nZSAoaW5jcmVhc2Ugb3IgZGVjcmVhc2UpXHJcblx0Ly8gSWYgc28sIHJldHVybiBlbXB0eSBhcnJheVxyXG5cdGxldCBpc011bHRpTGluZUluZGVudGF0aW9uQ2hhbmdlID0gZmFsc2U7XHJcblx0aWYgKHRyLmNoYW5nZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0Y29uc3QgY2hhbmdlczoge1xyXG5cdFx0XHRmcm9tQTogbnVtYmVyO1xyXG5cdFx0XHR0b0E6IG51bWJlcjtcclxuXHRcdFx0ZnJvbUI6IG51bWJlcjtcclxuXHRcdFx0dG9COiBudW1iZXI7XHJcblx0XHRcdHRleHQ6IHN0cmluZztcclxuXHRcdH1bXSA9IFtdO1xyXG5cdFx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHR0b0EsXHJcblx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0dG9CLFxyXG5cdFx0XHRcdHRleHQ6IGluc2VydGVkLnRvU3RyaW5nKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgYWxsIGNoYW5nZXMgYXJlIG9uIGRpZmZlcmVudCBsaW5lcyBhbmQgYXJlIGp1c3QgaW5kZW50YXRpb24gY2hhbmdlc1xyXG5cdFx0aWYgKGNoYW5nZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRjb25zdCBhbGxJbmRlbnRDaGFuZ2VzID0gY2hhbmdlcy5ldmVyeShcclxuXHRcdFx0XHQoY2hhbmdlKSA9PlxyXG5cdFx0XHRcdFx0Y2hhbmdlLnRleHQgPT09IFwiXFx0XCIgfHxcclxuXHRcdFx0XHRcdGNoYW5nZS50ZXh0ID09PSBcIiAgICBcIiB8fFxyXG5cdFx0XHRcdFx0KGNoYW5nZS50ZXh0ID09PSBcIlwiICYmXHJcblx0XHRcdFx0XHRcdCh0ci5zdGFydFN0YXRlLmRvYy5zbGljZVN0cmluZyhcclxuXHRcdFx0XHRcdFx0XHRjaGFuZ2UuZnJvbUEsXHJcblx0XHRcdFx0XHRcdFx0Y2hhbmdlLnRvQVxyXG5cdFx0XHRcdFx0XHQpID09PSBcIlxcdFwiIHx8XHJcblx0XHRcdFx0XHRcdFx0dHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2UuZnJvbUEsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2UudG9BXHJcblx0XHRcdFx0XHRcdFx0KSA9PT0gXCIgICAgXCIpKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKGFsbEluZGVudENoYW5nZXMpIHtcclxuXHRcdFx0XHRpc011bHRpTGluZUluZGVudGF0aW9uQ2hhbmdlID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYgKGlzTXVsdGlMaW5lSW5kZW50YXRpb25DaGFuZ2UpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGZvciBkZWxldGlvbiBvcGVyYXRpb25zIHRoYXQgbWlnaHQgYWZmZWN0IGxpbmUgY29udGVudFxyXG5cdC8vIGxpa2UgZGVsZXRpbmcgYSBkYXNoIGNoYXJhY3RlciBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgdGFzayBsaW5lXHJcblx0bGV0IGlzRGVsZXRpbmdUYXNrTWFya2VyID0gZmFsc2U7XHJcblx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcyhcclxuXHRcdChcclxuXHRcdFx0ZnJvbUE6IG51bWJlcixcclxuXHRcdFx0dG9BOiBudW1iZXIsXHJcblx0XHRcdGZyb21COiBudW1iZXIsXHJcblx0XHRcdHRvQjogbnVtYmVyLFxyXG5cdFx0XHRpbnNlcnRlZDogVGV4dFxyXG5cdFx0KSA9PiB7XHJcblx0XHRcdC8vIENoZWNrIGZvciBkZWxldGlvbiBvcGVyYXRpb24gKGluc2VydGVkIHRleHQgaXMgZW1wdHkpXHJcblx0XHRcdGlmIChpbnNlcnRlZC50b1N0cmluZygpID09PSBcIlwiICYmIHRvQSA+IGZyb21BKSB7XHJcblx0XHRcdFx0Ly8gR2V0IHRoZSBkZWxldGVkIGNvbnRlbnRcclxuXHRcdFx0XHRjb25zdCBkZWxldGVkQ29udGVudCA9IHRyLnN0YXJ0U3RhdGUuZG9jLnNsaWNlU3RyaW5nKFxyXG5cdFx0XHRcdFx0ZnJvbUEsXHJcblx0XHRcdFx0XHR0b0FcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBkZWxldGVkIGNvbnRlbnQgaXMgYSBkYXNoIGNoYXJhY3RlclxyXG5cdFx0XHRcdGlmIChkZWxldGVkQ29udGVudCA9PT0gXCItXCIpIHtcclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBkYXNoIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBsaW5lIG9yIGFmdGVyIGluZGVudGF0aW9uXHJcblx0XHRcdFx0XHRjb25zdCBsaW5lID0gdHIuc3RhcnRTdGF0ZS5kb2MubGluZUF0KGZyb21BKTtcclxuXHRcdFx0XHRcdGNvbnN0IHRleHRCZWZvcmVEYXNoID0gbGluZS50ZXh0LnN1YnN0cmluZyhcclxuXHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0ZnJvbUEgLSBsaW5lLmZyb21cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAodGV4dEJlZm9yZURhc2gudHJpbSgpID09PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRcdGlzRGVsZXRpbmdUYXNrTWFya2VyID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRpZiAoaXNEZWxldGluZ1Rhc2tNYXJrZXIpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGVhY2ggY2hhbmdlIGluIHRoZSB0cmFuc2FjdGlvblxyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoXHJcblx0XHQoXHJcblx0XHRcdGZyb21BOiBudW1iZXIsXHJcblx0XHRcdHRvQTogbnVtYmVyLFxyXG5cdFx0XHRmcm9tQjogbnVtYmVyLFxyXG5cdFx0XHR0b0I6IG51bWJlcixcclxuXHRcdFx0aW5zZXJ0ZWQ6IFRleHRcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHQvLyBHZXQgdGhlIGluc2VydGVkIHRleHRcclxuXHRcdFx0Y29uc3QgaW5zZXJ0ZWRUZXh0ID0gaW5zZXJ0ZWQudG9TdHJpbmcoKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgdGFzayBjcmVhdGlvbiB3aXRoIGEgbmV3bGluZVxyXG5cdFx0XHRpZiAoaW5zZXJ0ZWRUZXh0LmluY2x1ZGVzKFwiXFxuXCIpKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIk5ldyB0YXNrIGNyZWF0aW9uIGRldGVjdGVkIHdpdGggbmV3bGluZSwgc2tpcHBpbmdcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoaW5zZXJ0ZWRUZXh0LmluY2x1ZGVzKFwiW1tcIikgfHwgaW5zZXJ0ZWRUZXh0LmluY2x1ZGVzKFwiXV1cIikpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkxpbmsgZGV0ZWN0ZWQsIHNraXBwaW5nXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGZyb21CID4gdHIuc3RhcnRTdGF0ZS5kb2MubGVuZ3RoKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIHBvc2l0aW9uIGNvbnRleHRcclxuXHRcdFx0Y29uc3QgcG9zID0gZnJvbUI7XHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsTGluZSA9IHRyLnN0YXJ0U3RhdGUuZG9jLmxpbmVBdChwb3MpO1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbExpbmVUZXh0ID0gb3JpZ2luYWxMaW5lLnRleHQ7XHJcblxyXG5cdFx0XHRpZiAob3JpZ2luYWxMaW5lVGV4dC50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IG5ld0xpbmUgPSB0ci5uZXdEb2MubGluZUF0KHBvcyk7XHJcblx0XHRcdGNvbnN0IG5ld0xpbmVUZXh0ID0gbmV3TGluZS50ZXh0O1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5lIGNvbnRhaW5zIGEgdGFza1xyXG5cdFx0XHRjb25zdCB0YXNrUmVnZXggPSAvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHMrXFxbKC4pXS87XHJcblx0XHRcdGNvbnN0IG1hdGNoID0gb3JpZ2luYWxMaW5lVGV4dC5tYXRjaCh0YXNrUmVnZXgpO1xyXG5cdFx0XHRjb25zdCBuZXdNYXRjaCA9IG5ld0xpbmVUZXh0Lm1hdGNoKHRhc2tSZWdleCk7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgcGFzdGVkIHRhc2sgY29udGVudFxyXG5cdFx0XHRpZiAobmV3TWF0Y2ggJiYgIW1hdGNoICYmIGluc2VydGVkVGV4dCA9PT0gbmV3TGluZVRleHQpIHtcclxuXHRcdFx0XHRjb25zdCBtYXJrSW5kZXggPSBuZXdMaW5lVGV4dC5pbmRleE9mKFwiW1wiKSArIDE7XHJcblx0XHRcdFx0Y29uc3QgY2hhbmdlZFBvc2l0aW9uID0gbmV3TGluZS5mcm9tICsgbWFya0luZGV4O1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRNYXJrID0gbmV3TWF0Y2hbMl07XHJcblxyXG5cdFx0XHRcdHRhc2tDaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0cG9zaXRpb246IGNoYW5nZWRQb3NpdGlvbixcclxuXHRcdFx0XHRcdGN1cnJlbnRNYXJrOiBjdXJyZW50TWFyayxcclxuXHRcdFx0XHRcdHdhc0NvbXBsZXRlVGFzazogdHJ1ZSxcclxuXHRcdFx0XHRcdHRhc2tzSW5mbzoge1xyXG5cdFx0XHRcdFx0XHRpc1Rhc2tDaGFuZ2U6IHRydWUsXHJcblx0XHRcdFx0XHRcdG9yaWdpbmFsRnJvbUE6IGZyb21BLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRvQTogdG9BLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbEZyb21COiBmcm9tQixcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxUb0I6IHRvQixcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxJbnNlcnRlZFRleHQ6IGluc2VydGVkVGV4dCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAobWF0Y2gpIHtcclxuXHRcdFx0XHRsZXQgY2hhbmdlZFBvc2l0aW9uOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHRcdFx0XHRsZXQgY3VycmVudE1hcms6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdFx0XHRcdGxldCB3YXNDb21wbGV0ZVRhc2sgPSBmYWxzZTtcclxuXHRcdFx0XHRsZXQgaXNUYXNrQ2hhbmdlID0gZmFsc2U7XHJcblx0XHRcdFx0bGV0IHRyaWdnZXJCeVRhc2tzID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gQ2FzZSAxOiBDb21wbGV0ZSB0YXNrIGluc2VydGVkIGF0IG9uY2UgKGUuZy4sIFwiLSBbeF1cIilcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRpbnNlcnRlZFRleHRcclxuXHRcdFx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdFx0XHQubWF0Y2goL14oPzpbXFxzfFxcdF0qKD86Wy0qK118XFxkK1xcLilcXHMrXFxbLig/OlxcXSk/KS8pXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBHZXQgdGhlIG1hcmsgcG9zaXRpb24gaW4gdGhlIGxpbmVcclxuXHRcdFx0XHRcdGNvbnN0IG1hcmtJbmRleCA9IG5ld0xpbmVUZXh0LmluZGV4T2YoXCJbXCIpICsgMTtcclxuXHRcdFx0XHRcdGNoYW5nZWRQb3NpdGlvbiA9IG5ld0xpbmUuZnJvbSArIG1hcmtJbmRleDtcclxuXHJcblx0XHRcdFx0XHRjdXJyZW50TWFyayA9IG1hdGNoWzJdO1xyXG5cdFx0XHRcdFx0d2FzQ29tcGxldGVUYXNrID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGlzVGFza0NoYW5nZSA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIENhc2UgMjogSnVzdCB0aGUgbWFyayBjaGFyYWN0ZXIgd2FzIGluc2VydGVkXHJcblx0XHRcdFx0ZWxzZSBpZiAoaW5zZXJ0ZWRUZXh0Lmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgb3VyIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgbWFyayBwb3NpdGlvblxyXG5cdFx0XHRcdFx0Y29uc3QgbWFya0luZGV4ID0gbmV3TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgdHJpZ2dlciB3aGVuIHR5cGluZyB0aGUgXCJbXCIgY2hhcmFjdGVyIGl0c2VsZiwgb25seSB3aGVuIGVkaXRpbmcgdGhlIHN0YXR1cyBtYXJrIHdpdGhpbiBicmFja2V0c1xyXG5cdFx0XHRcdFx0Ly8gQWxzbyBkb24ndCB0cmlnZ2VyIHdoZW4gdHlwaW5nIHJlZ3VsYXIgbGV0dGVycyBpbiBlbXB0eSBjaGVja2JveCAodW5sZXNzIGl0J3MgYSB2YWxpZCBzdGF0dXMgbWFyayBsaWtlIHgsIC8sIGV0Yy4pXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHBvcyA9PT0gbmV3TGluZS5mcm9tICsgbWFya0luZGV4ICYmXHJcblx0XHRcdFx0XHRcdGluc2VydGVkVGV4dCAhPT0gXCJbXCIgJiZcclxuXHRcdFx0XHRcdFx0IShcclxuXHRcdFx0XHRcdFx0XHRtYXRjaFsyXSA9PT0gXCIgXCIgJiZcclxuXHRcdFx0XHRcdFx0XHQvW2EtekEtWl0vLnRlc3QoaW5zZXJ0ZWRUZXh0KSAmJlxyXG5cdFx0XHRcdFx0XHRcdChwbHVnaW5cclxuXHRcdFx0XHRcdFx0XHRcdD8gIU9iamVjdC52YWx1ZXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Z2V0VGFza1N0YXR1c0NvbmZpZyhwbHVnaW4pLm1hcmtzXHJcblx0XHRcdFx0XHRcdFx0XHQgICkuaW5jbHVkZXMoaW5zZXJ0ZWRUZXh0KVxyXG5cdFx0XHRcdFx0XHRcdFx0OiB0cnVlKVxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIHJlcGxhY2VtZW50IG9wZXJhdGlvbiBhbmQgdmFsaWRhdGUgaWYgaXQncyBhIHZhbGlkIHRhc2sgbWFya2VyIHJlcGxhY2VtZW50XHJcblx0XHRcdFx0XHRcdGlmIChmcm9tQSAhPT0gdG9BKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ2luYWxUZXh0ID0gdHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvQVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIE9ubHkgcGVyZm9ybSB2YWxpZGF0aW9uIGlmIHBsdWdpbiBpcyBwcm92aWRlZFxyXG5cdFx0XHRcdFx0XHRcdGlmIChwbHVnaW4pIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGlzVmFsaWRSZXBsYWNlbWVudCA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlzVmFsaWRUYXNrTWFya2VyUmVwbGFjZW1lbnQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJvbUEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dG9BLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluc2VydGVkVGV4dCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRleHQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cG9zLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0xpbmVUZXh0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsdWdpblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGlmICghaXNWYWxpZFJlcGxhY2VtZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGBEZXRlY3RlZCBpbnZhbGlkIHRhc2sgbWFya2VyIHJlcGxhY2VtZW50IChmcm9tQT0ke2Zyb21BfSwgdG9BPSR7dG9BfSkuIFVzZXIgbWFudWFsbHkgaW5wdXQgJyR7aW5zZXJ0ZWRUZXh0fScgKG9yaWdpbmFsOiAnJHtvcmlnaW5hbFRleHR9JyksIHNraXBwaW5nIGF1dG9tYXRpYyBjeWNsaW5nLmBcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuOyAvLyBTa2lwIHRoaXMgY2hhbmdlLCBkb24ndCBhZGQgdG8gdGFza0NoYW5nZXNcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0YERldGVjdGVkIHZhbGlkIHRhc2sgbWFya2VyIHJlcGxhY2VtZW50IChmcm9tQT0ke2Zyb21BfSwgdG9BPSR7dG9BfSkuIE9yaWdpbmFsOiAnJHtvcmlnaW5hbFRleHR9JyAtPiBOZXc6ICcke2luc2VydGVkVGV4dH0nLCBwcm9jZWVkaW5nIHdpdGggYXV0b21hdGljIGN5Y2xpbmcuYFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gb3JpZ2luYWwgbG9naWMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0YERldGVjdGVkIHJlcGxhY2VtZW50IG9wZXJhdGlvbiAoZnJvbUE9JHtmcm9tQX0sIHRvQT0ke3RvQX0pLiBVc2VyIG1hbnVhbGx5IGlucHV0ICcke2luc2VydGVkVGV4dH0nLCBza2lwcGluZyBhdXRvbWF0aWMgY3ljbGluZy5gXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuOyAvLyBTa2lwIHRoaXMgY2hhbmdlLCBkb24ndCBhZGQgdG8gdGFza0NoYW5nZXNcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGNoYW5nZWRQb3NpdGlvbiA9IHBvcztcclxuXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRNYXJrID0gbWF0Y2hbMl07XHJcblx0XHRcdFx0XHRcdHdhc0NvbXBsZXRlVGFzayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGlzVGFza0NoYW5nZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIENhc2UgMzogTXVsdGlwbGUgY2hhcmFjdGVycyBpbmNsdWRpbmcgYSBtYXJrIHdlcmUgaW5zZXJ0ZWRcclxuXHRcdFx0XHRlbHNlIGlmIChcclxuXHRcdFx0XHRcdGluc2VydGVkVGV4dC5pbmRleE9mKFwiW1wiKSAhPT0gLTEgJiZcclxuXHRcdFx0XHRcdGluc2VydGVkVGV4dC5pbmRleE9mKFwiXVwiKSAhPT0gLTEgJiZcclxuXHRcdFx0XHRcdGluc2VydGVkVGV4dCAhPT0gXCJbXVwiXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgY2FzZXMgd2hlcmUgcGFydCBvZiBhIHRhc2sgaW5jbHVkaW5nIHRoZSBtYXJrIHdhcyBpbnNlcnRlZFxyXG5cdFx0XHRcdFx0Y29uc3QgbWFya0luZGV4ID0gbmV3TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdFx0XHRcdFx0Y2hhbmdlZFBvc2l0aW9uID0gbmV3TGluZS5mcm9tICsgbWFya0luZGV4O1xyXG5cclxuXHRcdFx0XHRcdGN1cnJlbnRNYXJrID0gbWF0Y2hbMl07XHJcblx0XHRcdFx0XHR3YXNDb21wbGV0ZVRhc2sgPSB0cnVlO1xyXG5cdFx0XHRcdFx0aXNUYXNrQ2hhbmdlID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRhc2tzUGx1Z2luTG9hZGVkICYmXHJcblx0XHRcdFx0XHRuZXdMaW5lVGV4dCA9PT0gaW5zZXJ0ZWRUZXh0ICYmXHJcblx0XHRcdFx0XHQoaW5zZXJ0ZWRUZXh0LmluY2x1ZGVzKFwi4pyFXCIpIHx8XHJcblx0XHRcdFx0XHRcdGluc2VydGVkVGV4dC5pbmNsdWRlcyhcIuKdjFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRpbnNlcnRlZFRleHQuaW5jbHVkZXMoXCLwn5urXCIpIHx8XHJcblx0XHRcdFx0XHRcdGluc2VydGVkVGV4dC5pbmNsdWRlcyhcIvCfk4VcIikgfHxcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxMaW5lVGV4dC5pbmNsdWRlcyhcIuKchVwiKSB8fFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbExpbmVUZXh0LmluY2x1ZGVzKFwi4p2MXCIpIHx8XHJcblx0XHRcdFx0XHRcdG9yaWdpbmFsTGluZVRleHQuaW5jbHVkZXMoXCLwn5urXCIpIHx8XHJcblx0XHRcdFx0XHRcdG9yaWdpbmFsTGluZVRleHQuaW5jbHVkZXMoXCLwn5OFXCIpKVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dHJpZ2dlckJ5VGFza3MgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0Y2hhbmdlZFBvc2l0aW9uICE9PSBudWxsICYmXHJcblx0XHRcdFx0XHRjdXJyZW50TWFyayAhPT0gbnVsbCAmJlxyXG5cdFx0XHRcdFx0aXNUYXNrQ2hhbmdlXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBJZiB3ZSBmb3VuZCBhIHRhc2sgY2hhbmdlLCBhZGQgaXQgdG8gb3VyIGxpc3RcclxuXHRcdFx0XHRcdHRhc2tDaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogY2hhbmdlZFBvc2l0aW9uLFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50TWFyazogY3VycmVudE1hcmssXHJcblx0XHRcdFx0XHRcdHdhc0NvbXBsZXRlVGFzazogd2FzQ29tcGxldGVUYXNrLFxyXG5cdFx0XHRcdFx0XHR0YXNrc0luZm86IHRyaWdnZXJCeVRhc2tzXHJcblx0XHRcdFx0XHRcdFx0PyB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlzVGFza0NoYW5nZTogdHJpZ2dlckJ5VGFza3MsXHJcblx0XHRcdFx0XHRcdFx0XHRcdG9yaWdpbmFsRnJvbUE6IGZyb21BLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRvQTogdG9BLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRvcmlnaW5hbEZyb21COiBmcm9tQixcclxuXHRcdFx0XHRcdFx0XHRcdFx0b3JpZ2luYWxUb0I6IHRvQixcclxuXHRcdFx0XHRcdFx0XHRcdFx0b3JpZ2luYWxJbnNlcnRlZFRleHQ6IGluc2VydGVkVGV4dCxcclxuXHRcdFx0XHRcdFx0XHQgIH1cclxuXHRcdFx0XHRcdFx0XHQ6IG51bGwsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRyZXR1cm4gdGFza0NoYW5nZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVzIHRyYW5zYWN0aW9ucyB0byBkZXRlY3QgdGFzayBzdGF0dXMgY2hhbmdlcyBhbmQgY3ljbGUgdGhyb3VnaCBhdmFpbGFibGUgc3RhdHVzZXNcclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBoYW5kbGVcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBUaGUgb3JpZ2luYWwgdHJhbnNhY3Rpb24gb3IgYSBtb2RpZmllZCB0cmFuc2FjdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGhhbmRsZUN5Y2xlQ29tcGxldGVTdGF0dXNUcmFuc2FjdGlvbihcclxuXHR0cjogVHJhbnNhY3Rpb24sXHJcblx0YXBwOiBBcHAsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogVHJhbnNhY3Rpb25TcGVjIHtcclxuXHQvLyBPbmx5IHByb2Nlc3MgdHJhbnNhY3Rpb25zIHRoYXQgY2hhbmdlIHRoZSBkb2N1bWVudCBhbmQgYXJlIHVzZXIgaW5wdXQgZXZlbnRzXHJcblx0aWYgKCF0ci5kb2NDaGFuZ2VkKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHRpZiAoXHJcblx0XHR0ci5hbm5vdGF0aW9uKHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uKSB8fFxyXG5cdFx0dHIuYW5ub3RhdGlvbihwcmlvcml0eUNoYW5nZUFubm90YXRpb24pXHJcblx0KSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHRpZiAodHIuaXNVc2VyRXZlbnQoXCJzZXRcIikgJiYgdHIuY2hhbmdlcy5sZW5ndGggPiAxKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHRpZiAodHIuaXNVc2VyRXZlbnQoXCJpbnB1dC5wYXN0ZVwiKSkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Y29uc29sZS5sb2codHIuY2hhbmdlcywgXCJjaGFuZ2VzXCIpO1xyXG5cclxuXHQvLyBDaGVjayBmb3IgbWFya2Rvd24gbGluayBpbnNlcnRpb24gKGNtZCtrKVxyXG5cdGlmICh0ci5pc1VzZXJFdmVudChcImlucHV0LmF1dG9jb21wbGV0ZVwiKSkge1xyXG5cdFx0Ly8gTG9vayBmb3IgdHlwaWNhbCBtYXJrZG93biBsaW5rIHBhdHRlcm4gW3RleHRdKCkgaW4gdGhlIGNoYW5nZXNcclxuXHRcdGxldCBpc01hcmtkb3duTGlua0luc2VydGlvbiA9IGZhbHNlO1xyXG5cdFx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5zZXJ0ZWRUZXh0ID0gaW5zZXJ0ZWQudG9TdHJpbmcoKTtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGluc2VydGVkVGV4dCBtYXRjaGVzIGEgbWFya2Rvd24gbGluayBwYXR0ZXJuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRpbnNlcnRlZFRleHQuaW5jbHVkZXMoXCJdKFwiKSAmJlxyXG5cdFx0XHRcdGluc2VydGVkVGV4dC5zdGFydHNXaXRoKFwiW1wiKSAmJlxyXG5cdFx0XHRcdGluc2VydGVkVGV4dC5lbmRzV2l0aChcIilcIilcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aXNNYXJrZG93bkxpbmtJbnNlcnRpb24gPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoaXNNYXJrZG93bkxpbmtJbnNlcnRpb24pIHtcclxuXHRcdFx0cmV0dXJuIHRyO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgZm9yIHN1c3BpY2lvdXMgdHJhbnNhY3Rpb24gdGhhdCBtaWdodCBiZSBhIHRhc2sgZGVsZXRpb25cclxuXHQvLyBGb3IgZXhhbXBsZSwgd2hlbiB1c2VyIHByZXNzZXMgYmFja3NwYWNlIHRvIGRlbGV0ZSBhIGRhc2ggYXQgdGhlIGJlZ2lubmluZyBvZiBhIHRhc2sgbGluZVxyXG5cdGxldCBoYXNJbnZhbGlkVGFza0NoYW5nZSA9IGZhbHNlO1xyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoXHJcblx0XHQoXHJcblx0XHRcdGZyb21BOiBudW1iZXIsXHJcblx0XHRcdHRvQTogbnVtYmVyLFxyXG5cdFx0XHRmcm9tQjogbnVtYmVyLFxyXG5cdFx0XHR0b0I6IG51bWJlcixcclxuXHRcdFx0aW5zZXJ0ZWQ6IFRleHRcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIHJlbW92ZXMgYSBkYXNoIGNoYXJhY3RlciBhbmQgc29tZWhvdyBtb2RpZmllcyBhIHRhc2sgbWFya2VyIGVsc2V3aGVyZVxyXG5cdFx0XHRjb25zdCBpbnNlcnRlZFRleHQgPSBpbnNlcnRlZC50b1N0cmluZygpO1xyXG5cdFx0XHRjb25zdCBkZWxldGVkVGV4dCA9IHRyLnN0YXJ0U3RhdGUuZG9jLnNsaWNlU3RyaW5nKGZyb21BLCB0b0EpO1xyXG5cdFx0XHQvLyBEYXNoIGRlbGV0aW9uIGJ1dCBwb3NpdGlvbiBjaGFuZ2UgaW5kaWNhdGVzIHRhc2sgbWFya2VyIG1vZGlmaWNhdGlvblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZGVsZXRlZFRleHQgPT09IFwiLVwiICYmXHJcblx0XHRcdFx0aW5zZXJ0ZWRUZXh0ID09PSBcIlwiICYmXHJcblx0XHRcdFx0KGZyb21CICE9PSBmcm9tQSB8fCB0b0IgIT09IHRvQSkgJiZcclxuXHRcdFx0XHR0ci5uZXdEb2NcclxuXHRcdFx0XHRcdC5zbGljZVN0cmluZyhcclxuXHRcdFx0XHRcdFx0TWF0aC5tYXgoMCwgZnJvbUIgLSA1KSxcclxuXHRcdFx0XHRcdFx0TWF0aC5taW4oZnJvbUIgKyA1LCB0ci5uZXdEb2MubGVuZ3RoKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LmluY2x1ZGVzKFwiW1wiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRoYXNJbnZhbGlkVGFza0NoYW5nZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRpZiAoaGFzSW52YWxpZFRhc2tDaGFuZ2UpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGlmIGFueSB0YXNrIHN0YXR1c2VzIHdlcmUgY2hhbmdlZCBpbiB0aGlzIHRyYW5zYWN0aW9uXHJcblx0Y29uc3QgdGFza1N0YXR1c0NoYW5nZXMgPSBmaW5kVGFza1N0YXR1c0NoYW5nZXMoXHJcblx0XHR0cixcclxuXHRcdCEhZ2V0VGFza3NBUEkocGx1Z2luKSxcclxuXHRcdHBsdWdpblxyXG5cdCk7XHJcblx0aWYgKHRhc2tTdGF0dXNDaGFuZ2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IHRoZSB0YXNrIGN5Y2xlIGFuZCBtYXJrcyBmcm9tIHBsdWdpbiBzZXR0aW5nc1xyXG5cdGNvbnN0IHsgY3ljbGUsIG1hcmtzLCBleGNsdWRlTWFya3NGcm9tQ3ljbGUgfSA9IGdldFRhc2tTdGF0dXNDb25maWcocGx1Z2luKTtcclxuXHRjb25zdCByZW1haW5pbmdDeWNsZSA9IGN5Y2xlLmZpbHRlcihcclxuXHRcdChzdGF0ZSkgPT4gIWV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5pbmNsdWRlcyhzdGF0ZSlcclxuXHQpO1xyXG5cclxuXHQvLyBJZiBubyBjeWNsZSBpcyBkZWZpbmVkLCBkb24ndCBkbyBhbnl0aGluZ1xyXG5cdGlmIChyZW1haW5pbmdDeWNsZS5sZW5ndGggPT09IDApIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIEFkZGl0aW9uYWwgY2hlY2s6IGlmIHRoZSB0cmFuc2FjdGlvbiBjaGFuZ2VzIGEgdGFzaydzIHN0YXR1cyB3aGlsZSBhbHNvIGRlbGV0aW5nIGNvbnRlbnQgZWxzZXdoZXJlXHJcblx0Ly8gaXQgbWlnaHQgYmUgYW4gaW52YWxpZCBvcGVyYXRpb24gY2F1c2VkIGJ5IGJhY2tzcGFjZSBrZXlcclxuXHRsZXQgaGFzVGFza0FuZERlbGV0aW9uID0gZmFsc2U7XHJcblx0aWYgKHRyLmNoYW5nZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0Y29uc3QgY2hhbmdlczoge1xyXG5cdFx0XHRmcm9tQTogbnVtYmVyO1xyXG5cdFx0XHR0b0E6IG51bWJlcjtcclxuXHRcdFx0ZnJvbUI6IG51bWJlcjtcclxuXHRcdFx0dG9COiBudW1iZXI7XHJcblx0XHRcdHRleHQ6IHN0cmluZztcclxuXHRcdH1bXSA9IFtdO1xyXG5cdFx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHR0b0EsXHJcblx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0dG9CLFxyXG5cdFx0XHRcdHRleHQ6IGluc2VydGVkLnRvU3RyaW5nKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIGRlbGV0aW9ucyBhbmQgdGFzayBjaGFuZ2VzIGluIHRoZSBzYW1lIHRyYW5zYWN0aW9uXHJcblx0XHRjb25zdCBoYXNEZWxldGlvbiA9IGNoYW5nZXMuc29tZShcclxuXHRcdFx0KGNoYW5nZSkgPT4gY2hhbmdlLnRleHQgPT09IFwiXCIgJiYgY2hhbmdlLnRvQSA+IGNoYW5nZS5mcm9tQVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGhhc1Rhc2tNYXJrZXJDaGFuZ2UgPSBjaGFuZ2VzLnNvbWUoKGNoYW5nZSkgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGNoYW5nZSBhZmZlY3RzIGEgdGFzayBtYXJrZXIgcG9zaXRpb24gW3hdXHJcblx0XHRcdGNvbnN0IHBvcyA9IGNoYW5nZS5mcm9tQjtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBsaW5lID0gdHIubmV3RG9jLmxpbmVBdChwb3MpO1xyXG5cdFx0XHRcdHJldHVybiBsaW5lLnRleHQuaW5jbHVkZXMoXCJbXCIpICYmIGxpbmUudGV4dC5pbmNsdWRlcyhcIl1cIik7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChoYXNEZWxldGlvbiAmJiBoYXNUYXNrTWFya2VyQ2hhbmdlKSB7XHJcblx0XHRcdGhhc1Rhc2tBbmREZWxldGlvbiA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRpZiAoaGFzVGFza0FuZERlbGV0aW9uKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB0aGUgdHJhbnNhY3Rpb24gaXMganVzdCBpbmRlbnRhdGlvbiBvciB1bmluZGVudGF0aW9uXHJcblx0bGV0IGlzSW5kZW50YXRpb25DaGFuZ2UgPSBmYWxzZTtcclxuXHR0ci5jaGFuZ2VzLml0ZXJDaGFuZ2VzKChmcm9tQSwgdG9BLCBmcm9tQiwgdG9CLCBpbnNlcnRlZCkgPT4ge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgZnJvbSB0aGUgc3RhcnQgb2YgYSBsaW5lXHJcblx0XHRjb25zdCBpc0xpbmVTdGFydCA9XHJcblx0XHRcdGZyb21BID09PSAwIHx8XHJcblx0XHRcdHRyLnN0YXJ0U3RhdGUuZG9jLnNsaWNlU3RyaW5nKGZyb21BIC0gMSwgZnJvbUEpID09PSBcIlxcblwiO1xyXG5cclxuXHRcdGlmIChpc0xpbmVTdGFydCkge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbExpbmUgPSB0ci5zdGFydFN0YXRlLmRvYy5saW5lQXQoZnJvbUEpLnRleHQ7XHJcblx0XHRcdGNvbnN0IG5ld0xpbmUgPSBpbnNlcnRlZC50b1N0cmluZygpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIGluZGVudGF0aW9uIChhZGRpbmcgc3BhY2VzL3RhYnMgYXQgYmVnaW5uaW5nKVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0bmV3TGluZS50cmltKCkgPT09IG9yaWdpbmFsTGluZS50cmltKCkgJiZcclxuXHRcdFx0XHRuZXdMaW5lLmxlbmd0aCA+IG9yaWdpbmFsTGluZS5sZW5ndGhcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aXNJbmRlbnRhdGlvbkNoYW5nZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciB1bmluZGVudGF0aW9uIChyZW1vdmluZyBzcGFjZXMvdGFicyBmcm9tIGJlZ2lubmluZylcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdG9yaWdpbmFsTGluZS50cmltKCkgPT09IG5ld0xpbmUudHJpbSgpICYmXHJcblx0XHRcdFx0b3JpZ2luYWxMaW5lLmxlbmd0aCA+IG5ld0xpbmUubGVuZ3RoXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGlzSW5kZW50YXRpb25DaGFuZ2UgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGlmIChpc0luZGVudGF0aW9uQ2hhbmdlKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB0aGUgdHJhbnNhY3Rpb24gaXMganVzdCBkZWxldGluZyBhIGxpbmUgYWZ0ZXIgYSB0YXNrXHJcblx0Ly8gb3IgcmVwbGFjaW5nIHRoZSBlbnRpcmUgY29udGVudCB3aXRoIHRoZSBleGFjdCBzYW1lIGxpbmVcclxuXHRsZXQgaXNMaW5lRGVsZXRlT3JSZXBsYWNlID0gZmFsc2U7XHJcblx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdGNvbnN0IGRlbGV0ZWRUZXh0ID0gdHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoZnJvbUEsIHRvQSk7XHJcblx0XHRjb25zdCBpbnNlcnRlZFRleHQgPSBpbnNlcnRlZC50b1N0cmluZygpO1xyXG5cdFx0Y29uc3QgdGFza01hcmtlclBhdHRlcm4gPSAvKD86LXxcXCp8XFwrfFxcZCtcXC4pXFxzXFxbLlxcXS87XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZGVsZXRpbmcgYSBsaW5lIHRoYXQgY29udGFpbnMgYSBuZXdsaW5lXHJcblx0XHRpZiAoZGVsZXRlZFRleHQuaW5jbHVkZXMoXCJcXG5cIikgJiYgIWluc2VydGVkVGV4dC5pbmNsdWRlcyhcIlxcblwiKSkge1xyXG5cdFx0XHQvLyBJZiB3ZSdyZSByZXBsYWNpbmcgd2l0aCBhIHRhc2sgbGluZSAod2l0aCBhbnkgc3RhdHVzIG1hcmtlciksIHRoaXMgaXMgYSBsaW5lIGRlbGV0aW9uXHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGFza01hcmtlclBhdHRlcm4udGVzdChpbnNlcnRlZFRleHQpICYmXHJcblx0XHRcdFx0dGFza01hcmtlclBhdHRlcm4udGVzdChkZWxldGVkVGV4dClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UncmUganVzdCBrZWVwaW5nIHRoZSB0YXNrIGxpbmUgYnV0IGRlbGV0aW5nIHdoYXQgY29tZXMgYWZ0ZXJcclxuXHRcdFx0XHRjb25zdCB0YXNrTGluZSA9IGluc2VydGVkVGV4dC50cmltKCk7XHJcblx0XHRcdFx0aWYgKGRlbGV0ZWRUZXh0LmluY2x1ZGVzKHRhc2tMaW5lKSkge1xyXG5cdFx0XHRcdFx0aXNMaW5lRGVsZXRlT3JSZXBsYWNlID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB3ZSdyZSByZXBsYWNpbmcgdGhlIGVudGlyZSBjb250ZW50IHdpdGggYSBmdWxsIGxpbmUgdGhhdCBpbmNsdWRlcyB0YXNrIG1hcmtlcnNcclxuXHRcdGlmIChcclxuXHRcdFx0ZnJvbUEgPT09IDAgJiZcclxuXHRcdFx0dG9BID09PSB0ci5zdGFydFN0YXRlLmRvYy5sZW5ndGggJiZcclxuXHRcdFx0dGFza01hcmtlclBhdHRlcm4udGVzdChpbnNlcnRlZFRleHQpICYmXHJcblx0XHRcdCFpbnNlcnRlZFRleHQuaW5jbHVkZXMoXCJcXG5cIilcclxuXHRcdCkge1xyXG5cdFx0XHRpc0xpbmVEZWxldGVPclJlcGxhY2UgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRpZiAoaXNMaW5lRGVsZXRlT3JSZXBsYWNlKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBCdWlsZCBhIG5ldyBsaXN0IG9mIGNoYW5nZXMgdG8gcmVwbGFjZSB0aGUgb3JpZ2luYWwgb25lc1xyXG5cdGNvbnN0IG5ld0NoYW5nZXMgPSBbXTtcclxuXHRsZXQgY29tcGxldGluZ1Rhc2sgPSBmYWxzZTtcclxuXHJcblx0Ly8gUHJvY2VzcyBlYWNoIHRhc2sgc3RhdHVzIGNoYW5nZVxyXG5cdGZvciAoY29uc3QgdGFza1N0YXR1c0luZm8gb2YgdGFza1N0YXR1c0NoYW5nZXMpIHtcclxuXHRcdGNvbnN0IHsgcG9zaXRpb24sIGN1cnJlbnRNYXJrLCB3YXNDb21wbGV0ZVRhc2ssIHRhc2tzSW5mbyB9ID1cclxuXHRcdFx0dGFza1N0YXR1c0luZm87XHJcblxyXG5cdFx0aWYgKHRhc2tzSW5mbz8uaXNUYXNrQ2hhbmdlKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKHRhc2tzSW5mbyk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbmQgdGhlIGN1cnJlbnQgc3RhdHVzIGluIHRoZSBjeWNsZVxyXG5cdFx0bGV0IGN1cnJlbnRTdGF0dXNJbmRleCA9IC0xO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCByZW1haW5pbmdDeWNsZS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBzdGF0ZSA9IHJlbWFpbmluZ0N5Y2xlW2ldO1xyXG5cdFx0XHRpZiAobWFya3Nbc3RhdGVdID09PSBjdXJyZW50TWFyaykge1xyXG5cdFx0XHRcdGN1cnJlbnRTdGF0dXNJbmRleCA9IGk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSBjb3VsZG4ndCBmaW5kIHRoZSBjdXJyZW50IHN0YXR1cyBpbiB0aGUgY3ljbGUsIHN0YXJ0IGZyb20gdGhlIGZpcnN0IG9uZVxyXG5cdFx0aWYgKGN1cnJlbnRTdGF0dXNJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0Y3VycmVudFN0YXR1c0luZGV4ID0gMDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5leHQgc3RhdHVzXHJcblx0XHRjb25zdCBuZXh0U3RhdHVzSW5kZXggPVxyXG5cdFx0XHQoY3VycmVudFN0YXR1c0luZGV4ICsgMSkgJSByZW1haW5pbmdDeWNsZS5sZW5ndGg7XHJcblx0XHRjb25zdCBuZXh0U3RhdHVzID0gcmVtYWluaW5nQ3ljbGVbbmV4dFN0YXR1c0luZGV4XTtcclxuXHRcdGNvbnN0IG5leHRNYXJrID0gbWFya3NbbmV4dFN0YXR1c10gfHwgXCIgXCI7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbWFyayBpcyB0aGUgc2FtZSBhcyB3aGF0IHdvdWxkIGJlIHRoZSBuZXh0IG1hcmsgaW4gdGhlIGN5Y2xlXHJcblx0XHQvLyBJZiB0aGV5IGFyZSB0aGUgc2FtZSwgd2UgZG9uJ3QgbmVlZCB0byBwcm9jZXNzIHRoaXMgZnVydGhlclxyXG5cdFx0aWYgKGN1cnJlbnRNYXJrID09PSBuZXh0TWFyaykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgQ3VycmVudCBtYXJrICcke2N1cnJlbnRNYXJrfScgaXMgYWxyZWFkeSB0aGUgbmV4dCBtYXJrIGluIHRoZSBjeWNsZS4gU2tpcHBpbmcgcHJvY2Vzc2luZy5gXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5FVzogQ2hlY2sgaWYgdXNlcidzIGlucHV0IGFscmVhZHkgbWF0Y2hlcyB0aGUgbmV4dCBtYXJrIGluIHRoZSBjeWNsZVxyXG5cdFx0Ly8gR2V0IHRoZSB1c2VyJ3MgaW5wdXQgZnJvbSB0aGUgdHJhbnNhY3Rpb25cclxuXHRcdGxldCB1c2VySW5wdXRNYXJrOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRcdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EsIGZyb21CLCB0b0IsIGluc2VydGVkKSA9PiB7XHJcblx0XHRcdGNvbnN0IGluc2VydGVkVGV4dCA9IGluc2VydGVkLnRvU3RyaW5nKCk7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgY2hhbmdlIGlzIGF0IHRoZSB0YXNrIG1hcmtlciBwb3NpdGlvblxyXG5cdFx0XHRpZiAoZnJvbUIgPT09IHBvc2l0aW9uICYmIGluc2VydGVkVGV4dC5sZW5ndGggPT09IDEpIHtcclxuXHRcdFx0XHR1c2VySW5wdXRNYXJrID0gaW5zZXJ0ZWRUZXh0O1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJZiB1c2VyJ3MgaW5wdXQgYWxyZWFkeSBtYXRjaGVzIHRoZSBuZXh0IG1hcmssIGRvbid0IGN5Y2xlXHJcblx0XHRpZiAodXNlcklucHV0TWFyayA9PT0gbmV4dE1hcmspIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFVzZXIgaW5wdXQgJyR7dXNlcklucHV0TWFya30nIGFscmVhZHkgbWF0Y2hlcyB0aGUgbmV4dCBtYXJrICcke25leHRNYXJrfScgaW4gdGhlIGN5Y2xlLiBTa2lwcGluZyBwcm9jZXNzaW5nLmBcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IGxpbmUgY29udGV4dCBmb3IgdGhlIGN1cnJlbnQgcG9zaXRpb24gdG8gY2hlY2sgdGFzayB0eXBlXHJcblx0XHRjb25zdCBwb3NMaW5lID0gdHIubmV3RG9jLmxpbmVBdChwb3NpdGlvbik7XHJcblx0XHRjb25zdCBuZXdMaW5lVGV4dCA9IHBvc0xpbmUudGV4dDtcclxuXHRcdGNvbnN0IG9yaWdpbmFsUG9zTGluZSA9IHRyLnN0YXJ0U3RhdGUuZG9jLmxpbmVBdChcclxuXHRcdFx0TWF0aC5taW4ocG9zaXRpb24sIHRyLnN0YXJ0U3RhdGUuZG9jLmxlbmd0aClcclxuXHRcdCk7XHJcblx0XHRjb25zdCBvcmlnaW5hbExpbmVUZXh0ID0gb3JpZ2luYWxQb3NMaW5lLnRleHQ7XHJcblxyXG5cdFx0Ly8gRm9yIG5ld2x5IGluc2VydGVkIGNvbXBsZXRlIHRhc2tzLCBjaGVjayBpZiB0aGUgbWFyayBtYXRjaGVzIHRoZSBmaXJzdCBzdGF0dXNcclxuXHRcdC8vIElmIHNvLCB3ZSBtYXkgY2hvb3NlIHRvIGxlYXZlIGl0IGFzIGlzIHJhdGhlciB0aGFuIGltbWVkaWF0ZWx5IGN5Y2xpbmcgaXRcclxuXHRcdGlmICh3YXNDb21wbGV0ZVRhc2spIHtcclxuXHRcdFx0Ly8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdGF0dXMgZm9yIHRoaXMgbWFya1xyXG5cdFx0XHRmb3IgKGNvbnN0IFtfLCBtYXJrXSBvZiBPYmplY3QuZW50cmllcyhtYXJrcykpIHtcclxuXHRcdFx0XHRpZiAobWFyayA9PT0gY3VycmVudE1hcmspIHtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGJyYW5kIG5ldyB0YXNrIGluc2VydGlvbiB3aXRoIFwiWyBdXCIgKHNwYWNlKSBtYXJrXHJcblx0XHRcdGNvbnN0IGlzTmV3RW1wdHlUYXNrID1cclxuXHRcdFx0XHRjdXJyZW50TWFyayA9PT0gXCIgXCIgJiZcclxuXHRcdFx0XHQvLyBWZXJpZnkgdGhlIG9yaWdpbmFsIGNvbnRlbnQgY29udGFpbnMgdGhlIGZ1bGwgdGFzayBtYXJrZXIgd2l0aCBcIlsgXVwiXHJcblx0XHRcdFx0KHRhc2tzSW5mbz8ub3JpZ2luYWxJbnNlcnRlZFRleHQ/LmluY2x1ZGVzKFwiWyBdXCIpIHx8XHJcblx0XHRcdFx0XHQvLyBPciBjaGVjayBpZiB0aGUgbGluZSBub3cgY29udGFpbnMgYSB0YXNrIG1hcmtlciB0aGF0IHdhc24ndCB0aGVyZSBiZWZvcmVcclxuXHRcdFx0XHRcdChuZXdMaW5lVGV4dC5pbmNsdWRlcyhcIlsgXVwiKSAmJlxyXG5cdFx0XHRcdFx0XHQhb3JpZ2luYWxMaW5lVGV4dC5pbmNsdWRlcyhcIlsgXVwiKSkpO1xyXG5cclxuXHRcdFx0Ly8gQWRkaXRpb25hbCBjaGVjayBmb3Igd2hlbiBhIHVzZXIgaXMgc3BlY2lmaWNhbGx5IGNyZWF0aW5nIGEgdGFzayB3aXRoIFsgXVxyXG5cdFx0XHRjb25zdCBpc01hbnVhbFRhc2tDcmVhdGlvbiA9XHJcblx0XHRcdFx0Y3VycmVudE1hcmsgPT09IFwiIFwiICYmXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGluc2VydGlvbiBpbmNsdWRlcyB0aGUgZnVsbCB0YXNrIHN5bnRheFxyXG5cdFx0XHRcdCgoaW5zZXJ0ZWRUZXh0KSA9PiB7XHJcblx0XHRcdFx0XHQvLyBMb29rIGZvciBjb21tb24gcGF0dGVybnMgb2YgdGFzayBjcmVhdGlvblxyXG5cdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0aW5zZXJ0ZWRUZXh0Py5pbmNsdWRlcyhcIi0gWyBdXCIpIHx8XHJcblx0XHRcdFx0XHRcdGluc2VydGVkVGV4dD8uaW5jbHVkZXMoXCIqIFsgXVwiKSB8fFxyXG5cdFx0XHRcdFx0XHRpbnNlcnRlZFRleHQ/LmluY2x1ZGVzKFwiKyBbIF1cIikgfHxcclxuXHRcdFx0XHRcdFx0L15cXGQrXFwuXFxzK1xcW1xcc1xcXS8udGVzdChpbnNlcnRlZFRleHQgfHwgXCJcIilcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSkodGFza3NJbmZvPy5vcmlnaW5hbEluc2VydGVkVGV4dCk7XHJcblxyXG5cdFx0XHQvLyBEb24ndCBjeWNsZSBuZXdseSBjcmVhdGVkIGVtcHR5IHRhc2tzLCBldmVuIGlmIGFsd2F5c0N5Y2xlTmV3VGFza3MgaXMgdHJ1ZVxyXG5cdFx0XHQvLyBUaGlzIHByZXZlbnRzIHVuZXhwZWN0ZWQgZGF0YSBsb3NzIHdoZW4gY3JlYXRpbmcgYSB0YXNrXHJcblx0XHRcdGlmIChpc05ld0VtcHR5VGFzayB8fCBpc01hbnVhbFRhc2tDcmVhdGlvbikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YE5ldyBlbXB0eSB0YXNrIGRldGVjdGVkIHdpdGggbWFyayAnICcsIGxlYXZpbmcgYXMgaXMgcmVnYXJkbGVzcyBvZiBhbHdheXNDeWNsZU5ld1Rhc2tzIHNldHRpbmdgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIG1hcmsgaXMgdmFsaWQgYW5kIHRoaXMgaXMgYSBjb21wbGV0ZSB0YXNrIGluc2VydGlvbixcclxuXHRcdFx0Ly8gZG9uJ3QgY3ljbGUgaXQgaW1tZWRpYXRlbHkgLSB3ZSd2ZSByZW1vdmVkIGFsd2F5c0N5Y2xlTmV3VGFza3MgZW50aXJlbHlcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaW5kIHRoZSBleGFjdCBwb3NpdGlvbiB0byBwbGFjZSB0aGUgbWFya1xyXG5cdFx0Y29uc3QgbWFya1Bvc2l0aW9uID0gcG9zaXRpb247XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBsaW5lIGluZm9ybWF0aW9uIHRvIGVuc3VyZSB3ZSBkb24ndCBnbyBiZXlvbmQgdGhlIGN1cnJlbnQgbGluZVxyXG5cdFx0Y29uc3QgbGluZUF0TWFyayA9IHRyLm5ld0RvYy5saW5lQXQobWFya1Bvc2l0aW9uKTtcclxuXHRcdGNvbnN0IGxpbmVFbmQgPSBsaW5lQXRNYXJrLnRvO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZSBtYXJrIHBvc2l0aW9uIGlzIHdpdGhpbiB0aGUgY3VycmVudCBsaW5lIGFuZCB2YWxpZFxyXG5cdFx0aWYgKG1hcmtQb3NpdGlvbiA8IGxpbmVBdE1hcmsuZnJvbSB8fCBtYXJrUG9zaXRpb24gPj0gbGluZUVuZCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgTWFyayBwb3NpdGlvbiAke21hcmtQb3NpdGlvbn0gaXMgYmV5b25kIHRoZSBjdXJyZW50IGxpbmUgcmFuZ2UgJHtsaW5lQXRNYXJrLmZyb219LSR7bGluZUVuZH0sIHNraXBwaW5nIHByb2Nlc3NpbmdgXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuc3VyZSB0aGUgbW9kaWZpY2F0aW9uIHJhbmdlIGRvZXNuJ3QgZXhjZWVkIHRoZSBjdXJyZW50IGxpbmVcclxuXHRcdGNvbnN0IHZhbGlkVG8gPSBNYXRoLm1pbihtYXJrUG9zaXRpb24gKyAxLCBsaW5lRW5kKTtcclxuXHRcdGlmICh2YWxpZFRvIDw9IG1hcmtQb3NpdGlvbikge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgSW52YWxpZCBtb2RpZmljYXRpb24gcmFuZ2UgJHttYXJrUG9zaXRpb259LSR7dmFsaWRUb30sIHNraXBwaW5nIHByb2Nlc3NpbmdgXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChuZXh0TWFyayA9PT0gXCJ4XCIgfHwgbmV4dE1hcmsgPT09IFwiWFwiKSB7XHJcblx0XHRcdGNvbXBsZXRpbmdUYXNrID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBuZXh0TWFyayBpcyAneCcsICdYJywgb3Igc3BhY2UgYW5kIHdlIGhhdmUgVGFza3MgcGx1Z2luIGluZm8sIHVzZSB0aGUgb3JpZ2luYWwgaW5zZXJ0aW9uXHJcblx0XHRpZiAoXHJcblx0XHRcdChuZXh0TWFyayA9PT0gXCJ4XCIgfHwgbmV4dE1hcmsgPT09IFwiWFwiIHx8IG5leHRNYXJrID09PSBcIiBcIikgJiZcclxuXHRcdFx0dGFza3NJbmZvICE9PSBudWxsXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gVmVyaWZ5IGlmIHRoZSBUYXNrcyBwbHVnaW4ncyBtb2RpZmljYXRpb24gcmFuZ2UgaXMgd2l0aGluIHRoZSBzYW1lIGxpbmVcclxuXHRcdFx0Y29uc3Qgb3JpZ0xpbmVBdEZyb21BID0gdHIuc3RhcnRTdGF0ZS5kb2MubGluZUF0KFxyXG5cdFx0XHRcdHRhc2tzSW5mby5vcmlnaW5hbEZyb21BXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IG9yaWdMaW5lQXRUb0EgPSB0ci5zdGFydFN0YXRlLmRvYy5saW5lQXQoXHJcblx0XHRcdFx0TWF0aC5taW4odGFza3NJbmZvLm9yaWdpbmFsVG9BLCB0ci5zdGFydFN0YXRlLmRvYy5sZW5ndGgpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAob3JpZ0xpbmVBdEZyb21BLm51bWJlciAhPT0gb3JpZ0xpbmVBdFRvQS5udW1iZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBUYXNrcyBwbHVnaW4gbW9kaWZpY2F0aW9uIHJhbmdlIHNwYW5zIG11bHRpcGxlIGxpbmVzICR7b3JpZ0xpbmVBdEZyb21BLm51bWJlcn0tJHtvcmlnTGluZUF0VG9BLm51bWJlcn0sIHVzaW5nIHNhZmUgbW9kaWZpY2F0aW9uIHJhbmdlYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBzYWZlIG1vZGlmaWNhdGlvbiByYW5nZVxyXG5cdFx0XHRcdG5ld0NoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0XHRmcm9tOiBtYXJrUG9zaXRpb24sXHJcblx0XHRcdFx0XHR0bzogdmFsaWRUbyxcclxuXHRcdFx0XHRcdGluc2VydDogbmV4dE1hcmssXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBvcmlnaW5hbCBpbnNlcnRpb24gZnJvbSBUYXNrcyBwbHVnaW5cclxuXHRcdFx0XHRuZXdDaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0ZnJvbTogdGFza3NJbmZvLm9yaWdpbmFsRnJvbUEsXHJcblx0XHRcdFx0XHR0bzogdGFza3NJbmZvLm9yaWdpbmFsVG9BLFxyXG5cdFx0XHRcdFx0aW5zZXJ0OiB0YXNrc0luZm8ub3JpZ2luYWxJbnNlcnRlZFRleHQsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEFkZCBhIGNoYW5nZSB0byByZXBsYWNlIHRoZSBjdXJyZW50IG1hcmsgd2l0aCB0aGUgbmV4dCBvbmVcclxuXHRcdFx0bmV3Q2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRmcm9tOiBtYXJrUG9zaXRpb24sXHJcblx0XHRcdFx0dG86IHZhbGlkVG8sXHJcblx0XHRcdFx0aW5zZXJ0OiBuZXh0TWFyayxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJZiB3ZSBmb3VuZCBhbnkgY2hhbmdlcyB0byBtYWtlLCBjcmVhdGUgYSBuZXcgdHJhbnNhY3Rpb25cclxuXHRpZiAobmV3Q2hhbmdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRjb25zdCBlZGl0b3JJbmZvID0gdHIuc3RhcnRTdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpO1xyXG5cdFx0Y29uc3QgY2hhbmdlID0gbmV3Q2hhbmdlc1swXTtcclxuXHRcdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZUF0KGNoYW5nZS5mcm9tKTtcclxuXHRcdGNvbnN0IHRhc2sgPSBwYXJzZVRhc2tMaW5lKFxyXG5cdFx0XHRlZGl0b3JJbmZvPy5maWxlPy5wYXRoIHx8IFwiXCIsXHJcblx0XHRcdGxpbmUudGV4dCxcclxuXHRcdFx0bGluZS5udW1iZXIsXHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCxcclxuXHRcdFx0cGx1Z2luIC8vIFBhc3MgcGx1Z2luIGZvciBjb25maWd1cmFibGUgcHJlZml4IHN1cHBvcnRcclxuXHRcdCk7XHJcblx0XHQvLyBpZiAoY29tcGxldGluZ1Rhc2sgJiYgdGFzaykge1xyXG5cdFx0Ly8gXHRhcHAud29ya3NwYWNlLnRyaWdnZXIoXCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLCB0YXNrKTtcclxuXHRcdC8vIH1cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNoYW5nZXM6IG5ld0NoYW5nZXMsXHJcblx0XHRcdHNlbGVjdGlvbjogdHIuc2VsZWN0aW9uLFxyXG5cdFx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ0YXNrU3RhdHVzQ2hhbmdlXCIpLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIElmIG5vIGNoYW5nZXMgd2VyZSBtYWRlLCByZXR1cm4gdGhlIG9yaWdpbmFsIHRyYW5zYWN0aW9uXHJcblx0cmV0dXJuIHRyO1xyXG59XHJcblxyXG5leHBvcnQgeyB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbiB9O1xyXG5leHBvcnQgeyBwcmlvcml0eUNoYW5nZUFubm90YXRpb24gfTtcclxuIl19