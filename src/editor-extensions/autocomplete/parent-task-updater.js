import { EditorState, } from "@codemirror/state";
import { getTabSize } from "@/utils";
import { taskStatusChangeAnnotation } from "@/editor-extensions/task-operations/status-switcher";
import { isLastWorkflowStageOrNotWorkflow, } from "@/editor-extensions/workflow/workflow-handler";
/**
 * Creates an editor extension that automatically updates parent tasks based on child task status changes
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function autoCompleteParentExtension(app, plugin) {
    return EditorState.transactionFilter.of((tr) => {
        return handleParentTaskUpdateTransaction(tr, app, plugin);
    });
}
/**
 * Handles transactions to detect task status changes and manage parent task completion
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction with parent task updates
 */
function handleParentTaskUpdateTransaction(tr, app, plugin) {
    // Only process transactions that change the document
    if (!tr.docChanged) {
        return tr;
    }
    // Skip if auto-complete parent is disabled
    if (!plugin.settings.autoCompleteParent) {
        return tr;
    }
    // Skip if this transaction was triggered by the auto-complete parent feature itself
    const annotationValue = tr.annotation(taskStatusChangeAnnotation);
    if (typeof annotationValue === "string" &&
        annotationValue.includes("autoCompleteParent")) {
        return tr;
    }
    // Skip if this is a paste operation or other bulk operations
    if (tr.isUserEvent("input.paste") || tr.isUserEvent("set")) {
        return tr;
    }
    // Skip if this looks like a move operation (delete + insert of same content)
    if (isMoveOperation(tr)) {
        return tr;
    }
    // Check if a task status was changed in this transaction
    const taskStatusChangeInfo = findTaskStatusChange(tr);
    if (!taskStatusChangeInfo) {
        return tr;
    }
    const { doc, lineNumber } = taskStatusChangeInfo;
    // Find the parent task of the changed task
    const parentTaskInfo = findParentTask(doc, lineNumber);
    if (!parentTaskInfo) {
        return tr;
    }
    const { lineNumber: parentLineNumber, indentationLevel } = parentTaskInfo;
    // If auto-completion is enabled and all siblings are completed
    if (plugin.settings.autoCompleteParent) {
        if (areAllSiblingsCompleted(doc, parentLineNumber, indentationLevel, plugin)) {
            return completeParentTask(tr, parentLineNumber, doc);
        }
    }
    // If auto-in-progress is enabled
    if (plugin.settings.markParentInProgressWhenPartiallyComplete) {
        const parentCurrentStatus = getParentTaskStatus(doc, parentLineNumber);
        const allSiblingsCompleted = areAllSiblingsCompleted(doc, parentLineNumber, indentationLevel, plugin);
        const anySiblingHasStatus = anySiblingWithStatus(doc, parentLineNumber, indentationLevel, app);
        // Check if there are any child tasks at all
        const hasAnyChildTasks = hasAnyChildTasksAtLevel(doc, parentLineNumber, indentationLevel, app);
        // Mark as in-progress if:
        // 1. Parent is currently empty and any sibling has status, OR
        // 2. Parent is currently complete but not all siblings are complete and there are child tasks
        if ((parentCurrentStatus === " " && anySiblingHasStatus) ||
            (parentCurrentStatus === "x" &&
                !allSiblingsCompleted &&
                hasAnyChildTasks)) {
            const inProgressMarker = plugin.settings.taskStatuses.inProgress.split("|")[0] || "/";
            return markParentAsInProgress(tr, parentLineNumber, doc, [
                inProgressMarker,
            ]);
        }
    }
    return tr;
}
/**
 * Detects if a transaction represents a move operation (line reordering)
 * @param tr The transaction to check
 * @returns True if this appears to be a move operation
 */
function isMoveOperation(tr) {
    const changes = [];
    // Collect all changes in the transaction
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Record deletions
        if (fromA < toA) {
            const deletedText = tr.startState.doc.sliceString(fromA, toA);
            changes.push({
                type: "delete",
                content: deletedText,
                fromA,
                toA,
                fromB,
                toB,
            });
        }
        // Record insertions
        if (inserted.length > 0) {
            changes.push({
                type: "insert",
                content: inserted.toString(),
                fromA,
                toA,
                fromB,
                toB,
            });
        }
    });
    // Check if we have both deletions and insertions
    const deletions = changes.filter((c) => c.type === "delete");
    const insertions = changes.filter((c) => c.type === "insert");
    if (deletions.length === 0 || insertions.length === 0) {
        return false;
    }
    // Check if any deleted content matches any inserted content
    // This could indicate a move operation
    for (const deletion of deletions) {
        for (const insertion of insertions) {
            // Check for exact match or match with whitespace differences
            const deletedLines = deletion.content
                .split("\n")
                .filter((line) => line.trim());
            const insertedLines = insertion.content
                .split("\n")
                .filter((line) => line.trim());
            if (deletedLines.length === insertedLines.length &&
                deletedLines.length > 0) {
                let isMatch = true;
                for (let i = 0; i < deletedLines.length; i++) {
                    // Compare content without leading/trailing whitespace but preserve task structure
                    const deletedLine = deletedLines[i].trim();
                    const insertedLine = insertedLines[i].trim();
                    if (deletedLine !== insertedLine) {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Finds any task status change in the transaction
 * @param tr The transaction to check
 * @returns Information about the task with changed status or null if no task status was changed
 */
function findTaskStatusChange(tr) {
    let taskChangedLine = null;
    // Check each change in the transaction
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        var _a, _b;
        // Check if this is a new line insertion with a task marker
        if (inserted.length > 0 && taskChangedLine === null) {
            const insertedText = inserted.toString();
            // First check for tasks with preceding newline (common case when adding a task in the middle of a document)
            const newTaskMatch = insertedText.match(/\n[\s|\t]*([-*+]|\d+\.)\s\[ \]/);
            if (newTaskMatch) {
                // A new task was added, find the line number
                try {
                    const line = tr.newDoc.lineAt(fromB + insertedText.indexOf(newTaskMatch[0]) + 1);
                    taskChangedLine = line.number;
                    return; // We found a new task, no need to continue checking
                }
                catch (e) {
                    // Line calculation might fail, continue with other checks
                }
            }
            // Also check for tasks without preceding newline (e.g., at the beginning of a document)
            const taskAtStartMatch = insertedText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[ \]/);
            if (taskAtStartMatch) {
                try {
                    const line = tr.newDoc.lineAt(fromB);
                    taskChangedLine = line.number;
                    return; // We found a new task, no need to continue checking
                }
                catch (e) {
                    // Line calculation might fail, continue with other checks
                }
            }
        }
        // Get the position context
        const pos = fromB;
        const line = tr.newDoc.lineAt(pos);
        const lineText = line.text;
        // Check if this line contains a task marker
        const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/i;
        const taskMatch = lineText.match(taskRegex);
        if (taskMatch) {
            // Get the old line if it exists in the old document
            let oldLine = null;
            try {
                const oldPos = fromA;
                if (oldPos >= 0 && oldPos < tr.startState.doc.length) {
                    oldLine = tr.startState.doc.lineAt(oldPos);
                }
            }
            catch (e) {
                // Line might not exist in old document
            }
            const newStatus = taskMatch[2];
            const oldStatus = oldLine
                ? ((_b = (_a = oldLine.text.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/i)) === null || _a === void 0 ? void 0 : _a[2]) !== null && _b !== void 0 ? _b : null)
                : null;
            // If the status character changed or we couldn't get the old line, mark as changed
            if (!oldLine || newStatus !== oldStatus) {
                taskChangedLine = line.number;
            }
        }
    });
    if (taskChangedLine === null) {
        return null;
    }
    return {
        doc: tr.newDoc,
        lineNumber: taskChangedLine,
    };
}
/**
 * Finds the parent task of a given task line
 * @param doc The document to search in
 * @param lineNumber The line number of the task
 * @returns Information about the parent task or null if no parent was found
 */
function findParentTask(doc, lineNumber) {
    // Get the current line and its indentation level
    const currentLine = doc.line(lineNumber);
    const currentLineText = currentLine.text;
    const currentIndentMatch = currentLineText.match(/^[\s|\t]*/);
    const currentIndentLevel = currentIndentMatch
        ? currentIndentMatch[0].length
        : 0;
    // If we're at the top level, there's no parent
    if (currentIndentLevel === 0) {
        return null;
    }
    // Determine if the current line uses spaces or tabs for indentation
    const usesSpaces = currentIndentMatch && currentIndentMatch[0].includes(" ");
    const usesTabs = currentIndentMatch && currentIndentMatch[0].includes("\t");
    // Look backwards for a line with less indentation that contains a task
    for (let i = lineNumber - 1; i >= 1; i--) {
        const line = doc.line(i);
        const lineText = line.text;
        // Skip empty lines
        if (lineText.trim() === "") {
            continue;
        }
        // Get the indentation level of this line
        const indentMatch = lineText.match(/^[\s|\t]*/);
        const indentLevel = indentMatch ? indentMatch[0].length : 0;
        // Check if the indentation type matches (spaces vs tabs)
        const lineUsesSpaces = indentMatch && indentMatch[0].includes(" ");
        const lineUsesTabs = indentMatch && indentMatch[0].includes("\t");
        // If indentation types don't match, this can't be a parent
        // Only compare when both lines have some indentation
        if (indentLevel > 0 && currentIndentLevel > 0) {
            if ((usesSpaces && !lineUsesSpaces) ||
                (usesTabs && !lineUsesTabs)) {
                continue;
            }
        }
        // If this line has less indentation than the current line
        if (indentLevel < currentIndentLevel) {
            // Check if it's a task
            const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/i;
            if (taskRegex.test(lineText)) {
                return {
                    lineNumber: i,
                    indentationLevel: indentLevel,
                };
            }
            // If it's not a task, it can't be a parent task
            // If it's a heading or other structural element, we keep looking
            if (!lineText.startsWith("#") && !lineText.startsWith(">")) {
                break;
            }
        }
    }
    return null;
}
/**
 * Checks if all sibling tasks at the same indentation level as the parent's children are completed.
 * Considers workflow tasks: only treats them as completed if they are the final stage or not workflow tasks.
 * @param doc The document to check
 * @param parentLineNumber The line number of the parent task
 * @param parentIndentLevel The indentation level of the parent task
 * @param plugin The plugin instance
 * @returns True if all siblings are completed (considering workflow rules), false otherwise
 */
function areAllSiblingsCompleted(doc, parentLineNumber, parentIndentLevel, plugin) {
    const tabSize = getTabSize(plugin.app);
    // The expected indentation level for child tasks
    const childIndentLevel = parentIndentLevel + tabSize;
    // Track if we found at least one child
    let foundChild = false;
    // Search forward from the parent line
    for (let i = parentLineNumber + 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Skip empty lines
        if (lineText.trim() === "") {
            continue;
        }
        // Get the indentation of this line
        const indentMatch = lineText.match(/^[\s|\t]*/);
        const currentIndentText = indentMatch ? indentMatch[0] : "";
        const indentLevel = currentIndentText.length;
        // If we encounter a line with less or equal indentation to the parent,
        // we've moved out of the parent's children scope
        if (indentLevel <= parentIndentLevel) {
            break;
        }
        // Check if this is a direct child (exactly one level deeper)
        if (indentLevel === childIndentLevel) {
            // Check if it's a task
            const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/i;
            const taskMatch = lineText.match(taskRegex);
            if (taskMatch) {
                foundChild = true; // We found at least one child task
                const taskStatus = taskMatch[2]; // Status character is in group 2
                if (taskStatus !== "x" && taskStatus !== "X") {
                    // Found an incomplete child task
                    return false;
                }
                else {
                    // Task IS marked [x] or [X]. Now, consider workflow.
                    if (plugin.settings.workflow.enableWorkflow) {
                        // Only perform the strict workflow stage check IF autoRemoveLastStageMarker is ON.
                        // If autoRemoveLastStageMarker is OFF, we trust the '[x]' status for parent completion.
                        if (plugin.settings.workflow.autoRemoveLastStageMarker) {
                            // Setting is ON: Rely on the stage check.
                            if (!isLastWorkflowStageOrNotWorkflow(lineText, i, doc, plugin)) {
                                // It's [x], workflow is enabled, marker removal is ON,
                                // but it's not considered the final stage by the check.
                                return false;
                            }
                        }
                        // else: Setting is OFF. Do nothing. The task is [x], so we consider it complete for parent checking.
                    }
                    // If workflow is disabled, or passed the workflow checks, continue loop.
                }
            }
        }
    }
    return foundChild;
}
/**
 * Completes a parent task by modifying the transaction
 * @param tr The transaction to modify
 * @param parentLineNumber The line number of the parent task
 * @param doc The document
 * @returns The modified transaction
 */
function completeParentTask(tr, parentLineNumber, doc) {
    const parentLine = doc.line(parentLineNumber);
    const parentLineText = parentLine.text;
    // Find the task marker position
    const taskMarkerMatch = parentLineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/);
    if (!taskMarkerMatch) {
        return tr;
    }
    // If the parent is already marked as completed, don't modify it again
    const currentStatus = taskMarkerMatch[2];
    if (currentStatus === "x" || currentStatus === "X") {
        return tr;
    }
    // Check if there's already a pending change for this parent task in this transaction
    let alreadyChanging = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        const checkboxStart = parentLineText.indexOf("[") + 1;
        const markerStart = parentLine.from + checkboxStart;
        // Check if any change in the transaction affects the checkbox character
        if (markerStart >= fromB && markerStart < toB) {
            alreadyChanging = true;
        }
    });
    // If the task is already being changed in this transaction, don't add another change
    if (alreadyChanging) {
        return tr;
    }
    // Calculate the position where we need to insert 'x'
    // Find the exact position of the checkbox character
    const checkboxStart = parentLineText.indexOf("[") + 1;
    const markerStart = parentLine.from + checkboxStart;
    // Create a new transaction that adds the completion marker 'x' to the parent task
    return {
        changes: [
            tr.changes,
            {
                from: markerStart,
                to: markerStart + 1,
                insert: "x",
            },
        ],
        selection: tr.selection,
        annotations: [taskStatusChangeAnnotation.of("autoCompleteParent.DONE")],
    };
}
/**
 * Checks if any sibling tasks have any status (not empty)
 * @param doc The document to check
 * @param parentLineNumber The line number of the parent task
 * @param parentIndentLevel The indentation level of the parent task
 * @param app The Obsidian app instance
 * @returns True if any siblings have a status, false otherwise
 */
function anySiblingWithStatus(doc, parentLineNumber, parentIndentLevel, app) {
    const tabSize = getTabSize(app);
    // The expected indentation level for child tasks
    const childIndentLevel = parentIndentLevel + tabSize;
    // Search forward from the parent line
    for (let i = parentLineNumber + 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Skip empty lines
        if (lineText.trim() === "") {
            continue;
        }
        // Get the indentation of this line
        const indentMatch = lineText.match(/^[\s|\t]*/);
        const indentLevel = indentMatch ? indentMatch[0].length : 0;
        // If we encounter a line with less or equal indentation to the parent,
        // we've moved out of the parent's children scope
        if (indentLevel <= parentIndentLevel) {
            break;
        }
        // If this is a direct child of the parent (exactly one level deeper)
        if (indentLevel === childIndentLevel) {
            // Check if it's a task
            const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/i;
            const taskMatch = lineText.match(taskRegex);
            if (taskMatch) {
                // If the task has any status other than space, return true
                const taskStatus = taskMatch[2]; // Status character is in group 2
                if (taskStatus !== " ") {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Gets the current status of a parent task
 * @param doc The document
 * @param parentLineNumber The line number of the parent task
 * @returns The task status character
 */
function getParentTaskStatus(doc, parentLineNumber) {
    const parentLine = doc.line(parentLineNumber);
    const parentLineText = parentLine.text;
    // Find the task marker
    const taskMarkerMatch = parentLineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/);
    if (!taskMarkerMatch) {
        return "";
    }
    return taskMarkerMatch[2];
}
/**
 * Marks a parent task as "In Progress" by modifying the transaction
 * @param tr The transaction to modify
 * @param parentLineNumber The line number of the parent task
 * @param doc The document
 * @returns The modified transaction
 */
function markParentAsInProgress(tr, parentLineNumber, doc, taskStatusCycle) {
    const parentLine = doc.line(parentLineNumber);
    const parentLineText = parentLine.text;
    // Find the task marker position, accepting any current status (not just empty)
    const taskMarkerMatch = parentLineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/);
    if (!taskMarkerMatch) {
        return tr;
    }
    // Get current status
    const currentStatus = taskMarkerMatch[2];
    // If the status is already the in-progress marker we want to set, don't change it
    if (currentStatus === taskStatusCycle[0]) {
        return tr;
    }
    // Check if there's already a pending change for this parent task in this transaction
    let alreadyChanging = false;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        const checkboxStart = parentLineText.indexOf("[") + 1;
        const markerStart = parentLine.from + checkboxStart;
        // Check if any change in the transaction affects the checkbox character
        if (markerStart >= fromB && markerStart < toB) {
            alreadyChanging = true;
        }
    });
    // If the task is already being changed in this transaction, don't add another change
    if (alreadyChanging) {
        return tr;
    }
    // Calculate the position where we need to insert the "In Progress" marker
    // Find the exact position of the checkbox character
    const checkboxStart = parentLineText.indexOf("[") + 1;
    const markerStart = parentLine.from + checkboxStart;
    // Create a new transaction that adds the "In Progress" marker to the parent task
    return {
        changes: [
            tr.changes,
            {
                from: markerStart,
                to: markerStart + 1,
                insert: taskStatusCycle[0],
            },
        ],
        selection: tr.selection,
        annotations: [
            taskStatusChangeAnnotation.of("autoCompleteParent.IN_PROGRESS"),
        ],
    };
}
/**
 * Checks if there are any child tasks at the specified indentation level
 * @param doc The document to check
 * @param parentLineNumber The line number of the parent task
 * @param parentIndentLevel The indentation level of the parent task
 * @param app The Obsidian app instance
 * @returns True if there are any child tasks, false otherwise
 */
function hasAnyChildTasksAtLevel(doc, parentLineNumber, parentIndentLevel, app) {
    const tabSize = getTabSize(app);
    // The expected indentation level for child tasks
    const childIndentLevel = parentIndentLevel + tabSize;
    // Search forward from the parent line
    for (let i = parentLineNumber + 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Skip empty lines
        if (lineText.trim() === "") {
            continue;
        }
        // Get the indentation of this line
        const indentMatch = lineText.match(/^[\s|\t]*/);
        const indentLevel = indentMatch ? indentMatch[0].length : 0;
        // If we encounter a line with less or equal indentation to the parent,
        // we've moved out of the parent's children scope
        if (indentLevel <= parentIndentLevel) {
            break;
        }
        // If this is a direct child of the parent (exactly one level deeper)
        if (indentLevel === childIndentLevel) {
            // Check if it's a task
            const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/i;
            if (taskRegex.test(lineText)) {
                return true; // Found at least one child task
            }
        }
    }
    return false;
}
export { handleParentTaskUpdateTransaction, findTaskStatusChange, findParentTask, areAllSiblingsCompleted, anySiblingWithStatus, getParentTaskStatus, hasAnyChildTasksAtLevel, taskStatusChangeAnnotation, };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50LXRhc2stdXBkYXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcmVudC10YXNrLXVwZGF0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLG1CQUFtQixDQUFDO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDckMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFakcsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLCtDQUErQyxDQUFDO0FBRXZEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUMxQyxHQUFRLEVBQ1IsTUFBNkI7SUFFN0IsT0FBTyxXQUFXLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7UUFDOUMsT0FBTyxpQ0FBaUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQVMsaUNBQWlDLENBQ3pDLEVBQWUsRUFDZixHQUFRLEVBQ1IsTUFBNkI7SUFFN0IscURBQXFEO0lBQ3JELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFO1FBQ25CLE9BQU8sRUFBRSxDQUFDO0tBQ1Y7SUFFRCwyQ0FBMkM7SUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUU7UUFDeEMsT0FBTyxFQUFFLENBQUM7S0FDVjtJQUVELG9GQUFvRjtJQUNwRixNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDbEUsSUFDQyxPQUFPLGVBQWUsS0FBSyxRQUFRO1FBQ25DLGVBQWUsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFDN0M7UUFDRCxPQUFPLEVBQUUsQ0FBQztLQUNW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QUFFRCxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixHQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRFZGl0b3JTdGF0ZSxcclxuXHRUZXh0LFxyXG5cdFRyYW5zYWN0aW9uLFxyXG5cdFRyYW5zYWN0aW9uU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsgZ2V0VGFiU2l6ZSB9IGZyb20gXCJAL3V0aWxzXCI7XHJcbmltcG9ydCB7IHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uIH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7XHJcblx0aXNMYXN0V29ya2Zsb3dTdGFnZU9yTm90V29ya2Zsb3csXHJcblx0d29ya2Zsb3dDaGFuZ2VBbm5vdGF0aW9uLFxyXG59IGZyb20gXCJAL2VkaXRvci1leHRlbnNpb25zL3dvcmtmbG93L3dvcmtmbG93LWhhbmRsZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuIGVkaXRvciBleHRlbnNpb24gdGhhdCBhdXRvbWF0aWNhbGx5IHVwZGF0ZXMgcGFyZW50IHRhc2tzIGJhc2VkIG9uIGNoaWxkIHRhc2sgc3RhdHVzIGNoYW5nZXNcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBBbiBlZGl0b3IgZXh0ZW5zaW9uIHRoYXQgY2FuIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgcGx1Z2luXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYXV0b0NvbXBsZXRlUGFyZW50RXh0ZW5zaW9uKFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbikge1xyXG5cdHJldHVybiBFZGl0b3JTdGF0ZS50cmFuc2FjdGlvbkZpbHRlci5vZigodHIpID0+IHtcclxuXHRcdHJldHVybiBoYW5kbGVQYXJlbnRUYXNrVXBkYXRlVHJhbnNhY3Rpb24odHIsIGFwcCwgcGx1Z2luKTtcclxuXHR9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXMgdHJhbnNhY3Rpb25zIHRvIGRldGVjdCB0YXNrIHN0YXR1cyBjaGFuZ2VzIGFuZCBtYW5hZ2UgcGFyZW50IHRhc2sgY29tcGxldGlvblxyXG4gKiBAcGFyYW0gdHIgVGhlIHRyYW5zYWN0aW9uIHRvIGhhbmRsZVxyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRoZSBvcmlnaW5hbCB0cmFuc2FjdGlvbiBvciBhIG1vZGlmaWVkIHRyYW5zYWN0aW9uIHdpdGggcGFyZW50IHRhc2sgdXBkYXRlc1xyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uKFxyXG5cdHRyOiBUcmFuc2FjdGlvbixcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBUcmFuc2FjdGlvblNwZWMge1xyXG5cdC8vIE9ubHkgcHJvY2VzcyB0cmFuc2FjdGlvbnMgdGhhdCBjaGFuZ2UgdGhlIGRvY3VtZW50XHJcblx0aWYgKCF0ci5kb2NDaGFuZ2VkKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBTa2lwIGlmIGF1dG8tY29tcGxldGUgcGFyZW50IGlzIGRpc2FibGVkXHJcblx0aWYgKCFwbHVnaW4uc2V0dGluZ3MuYXV0b0NvbXBsZXRlUGFyZW50KSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBTa2lwIGlmIHRoaXMgdHJhbnNhY3Rpb24gd2FzIHRyaWdnZXJlZCBieSB0aGUgYXV0by1jb21wbGV0ZSBwYXJlbnQgZmVhdHVyZSBpdHNlbGZcclxuXHRjb25zdCBhbm5vdGF0aW9uVmFsdWUgPSB0ci5hbm5vdGF0aW9uKHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uKTtcclxuXHRpZiAoXHJcblx0XHR0eXBlb2YgYW5ub3RhdGlvblZhbHVlID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRhbm5vdGF0aW9uVmFsdWUuaW5jbHVkZXMoXCJhdXRvQ29tcGxldGVQYXJlbnRcIilcclxuXHQpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIFNraXAgaWYgdGhpcyBpcyBhIHBhc3RlIG9wZXJhdGlvbiBvciBvdGhlciBidWxrIG9wZXJhdGlvbnNcclxuXHRpZiAodHIuaXNVc2VyRXZlbnQoXCJpbnB1dC5wYXN0ZVwiKSB8fCB0ci5pc1VzZXJFdmVudChcInNldFwiKSkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gU2tpcCBpZiB0aGlzIGxvb2tzIGxpa2UgYSBtb3ZlIG9wZXJhdGlvbiAoZGVsZXRlICsgaW5zZXJ0IG9mIHNhbWUgY29udGVudClcclxuXHRpZiAoaXNNb3ZlT3BlcmF0aW9uKHRyKSkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgYSB0YXNrIHN0YXR1cyB3YXMgY2hhbmdlZCBpbiB0aGlzIHRyYW5zYWN0aW9uXHJcblx0Y29uc3QgdGFza1N0YXR1c0NoYW5nZUluZm8gPSBmaW5kVGFza1N0YXR1c0NoYW5nZSh0cik7XHJcblxyXG5cdGlmICghdGFza1N0YXR1c0NoYW5nZUluZm8pIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHsgZG9jLCBsaW5lTnVtYmVyIH0gPSB0YXNrU3RhdHVzQ2hhbmdlSW5mbztcclxuXHJcblx0Ly8gRmluZCB0aGUgcGFyZW50IHRhc2sgb2YgdGhlIGNoYW5nZWQgdGFza1xyXG5cdGNvbnN0IHBhcmVudFRhc2tJbmZvID0gZmluZFBhcmVudFRhc2soZG9jLCBsaW5lTnVtYmVyKTtcclxuXHJcblx0aWYgKCFwYXJlbnRUYXNrSW5mbykge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgeyBsaW5lTnVtYmVyOiBwYXJlbnRMaW5lTnVtYmVyLCBpbmRlbnRhdGlvbkxldmVsIH0gPSBwYXJlbnRUYXNrSW5mbztcclxuXHJcblx0Ly8gSWYgYXV0by1jb21wbGV0aW9uIGlzIGVuYWJsZWQgYW5kIGFsbCBzaWJsaW5ncyBhcmUgY29tcGxldGVkXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy5hdXRvQ29tcGxldGVQYXJlbnQpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0YXJlQWxsU2libGluZ3NDb21wbGV0ZWQoXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdHBhcmVudExpbmVOdW1iZXIsXHJcblx0XHRcdFx0aW5kZW50YXRpb25MZXZlbCxcclxuXHRcdFx0XHRwbHVnaW5cclxuXHRcdFx0KVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBjb21wbGV0ZVBhcmVudFRhc2sodHIsIHBhcmVudExpbmVOdW1iZXIsIGRvYyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBJZiBhdXRvLWluLXByb2dyZXNzIGlzIGVuYWJsZWRcclxuXHRpZiAocGx1Z2luLnNldHRpbmdzLm1hcmtQYXJlbnRJblByb2dyZXNzV2hlblBhcnRpYWxseUNvbXBsZXRlKSB7XHJcblx0XHRjb25zdCBwYXJlbnRDdXJyZW50U3RhdHVzID0gZ2V0UGFyZW50VGFza1N0YXR1cyhkb2MsIHBhcmVudExpbmVOdW1iZXIpO1xyXG5cdFx0Y29uc3QgYWxsU2libGluZ3NDb21wbGV0ZWQgPSBhcmVBbGxTaWJsaW5nc0NvbXBsZXRlZChcclxuXHRcdFx0ZG9jLFxyXG5cdFx0XHRwYXJlbnRMaW5lTnVtYmVyLFxyXG5cdFx0XHRpbmRlbnRhdGlvbkxldmVsLFxyXG5cdFx0XHRwbHVnaW5cclxuXHRcdCk7XHJcblx0XHRjb25zdCBhbnlTaWJsaW5nSGFzU3RhdHVzID0gYW55U2libGluZ1dpdGhTdGF0dXMoXHJcblx0XHRcdGRvYyxcclxuXHRcdFx0cGFyZW50TGluZU51bWJlcixcclxuXHRcdFx0aW5kZW50YXRpb25MZXZlbCxcclxuXHRcdFx0YXBwXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY2hpbGQgdGFza3MgYXQgYWxsXHJcblx0Y29uc3QgaGFzQW55Q2hpbGRUYXNrcyA9IGhhc0FueUNoaWxkVGFza3NBdExldmVsKFxyXG5cdFx0ZG9jLFxyXG5cdFx0cGFyZW50TGluZU51bWJlcixcclxuXHRcdGluZGVudGF0aW9uTGV2ZWwsXHJcblx0XHRhcHBcclxuXHQpO1xyXG5cclxuXHQvLyBNYXJrIGFzIGluLXByb2dyZXNzIGlmOlxyXG5cdC8vIDEuIFBhcmVudCBpcyBjdXJyZW50bHkgZW1wdHkgYW5kIGFueSBzaWJsaW5nIGhhcyBzdGF0dXMsIE9SXHJcblx0Ly8gMi4gUGFyZW50IGlzIGN1cnJlbnRseSBjb21wbGV0ZSBidXQgbm90IGFsbCBzaWJsaW5ncyBhcmUgY29tcGxldGUgYW5kIHRoZXJlIGFyZSBjaGlsZCB0YXNrc1xyXG5cdGlmIChcclxuXHRcdChwYXJlbnRDdXJyZW50U3RhdHVzID09PSBcIiBcIiAmJiBhbnlTaWJsaW5nSGFzU3RhdHVzKSB8fFxyXG5cdFx0KHBhcmVudEN1cnJlbnRTdGF0dXMgPT09IFwieFwiICYmXHJcblx0XHRcdCFhbGxTaWJsaW5nc0NvbXBsZXRlZCAmJlxyXG5cdFx0XHRoYXNBbnlDaGlsZFRhc2tzKVxyXG5cdCkge1xyXG5cdFx0Y29uc3QgaW5Qcm9ncmVzc01hcmtlciA9XHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuaW5Qcm9ncmVzcy5zcGxpdChcInxcIilbMF0gfHwgXCIvXCI7XHJcblxyXG5cdFx0cmV0dXJuIG1hcmtQYXJlbnRBc0luUHJvZ3Jlc3ModHIsIHBhcmVudExpbmVOdW1iZXIsIGRvYywgW1xyXG5cdFx0XHRpblByb2dyZXNzTWFya2VyLFxyXG5cdFx0XHRdKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB0cjtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVjdHMgaWYgYSB0cmFuc2FjdGlvbiByZXByZXNlbnRzIGEgbW92ZSBvcGVyYXRpb24gKGxpbmUgcmVvcmRlcmluZylcclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBjaGVja1xyXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoaXMgYXBwZWFycyB0byBiZSBhIG1vdmUgb3BlcmF0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBpc01vdmVPcGVyYXRpb24odHI6IFRyYW5zYWN0aW9uKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgY2hhbmdlczogQXJyYXk8e1xyXG5cdFx0dHlwZTogXCJkZWxldGVcIiB8IFwiaW5zZXJ0XCI7XHJcblx0XHRjb250ZW50OiBzdHJpbmc7XHJcblx0XHRmcm9tQTogbnVtYmVyO1xyXG5cdFx0dG9BOiBudW1iZXI7XHJcblx0XHRmcm9tQjogbnVtYmVyO1xyXG5cdFx0dG9COiBudW1iZXI7XHJcblx0fT4gPSBbXTtcclxuXHJcblx0Ly8gQ29sbGVjdCBhbGwgY2hhbmdlcyBpbiB0aGUgdHJhbnNhY3Rpb25cclxuXHR0ci5jaGFuZ2VzLml0ZXJDaGFuZ2VzKChmcm9tQSwgdG9BLCBmcm9tQiwgdG9CLCBpbnNlcnRlZCkgPT4ge1xyXG5cdFx0Ly8gUmVjb3JkIGRlbGV0aW9uc1xyXG5cdFx0aWYgKGZyb21BIDwgdG9BKSB7XHJcblx0XHRcdGNvbnN0IGRlbGV0ZWRUZXh0ID0gdHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoZnJvbUEsIHRvQSk7XHJcblx0XHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0dHlwZTogXCJkZWxldGVcIixcclxuXHRcdFx0XHRjb250ZW50OiBkZWxldGVkVGV4dCxcclxuXHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHR0b0EsXHJcblx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0dG9CLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWNvcmQgaW5zZXJ0aW9uc1xyXG5cdFx0aWYgKGluc2VydGVkLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHR0eXBlOiBcImluc2VydFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IGluc2VydGVkLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0ZnJvbUEsXHJcblx0XHRcdFx0dG9BLFxyXG5cdFx0XHRcdGZyb21CLFxyXG5cdFx0XHRcdHRvQixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIENoZWNrIGlmIHdlIGhhdmUgYm90aCBkZWxldGlvbnMgYW5kIGluc2VydGlvbnNcclxuXHRjb25zdCBkZWxldGlvbnMgPSBjaGFuZ2VzLmZpbHRlcigoYykgPT4gYy50eXBlID09PSBcImRlbGV0ZVwiKTtcclxuXHRjb25zdCBpbnNlcnRpb25zID0gY2hhbmdlcy5maWx0ZXIoKGMpID0+IGMudHlwZSA9PT0gXCJpbnNlcnRcIik7XHJcblxyXG5cdGlmIChkZWxldGlvbnMubGVuZ3RoID09PSAwIHx8IGluc2VydGlvbnMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiBhbnkgZGVsZXRlZCBjb250ZW50IG1hdGNoZXMgYW55IGluc2VydGVkIGNvbnRlbnRcclxuXHQvLyBUaGlzIGNvdWxkIGluZGljYXRlIGEgbW92ZSBvcGVyYXRpb25cclxuXHRmb3IgKGNvbnN0IGRlbGV0aW9uIG9mIGRlbGV0aW9ucykge1xyXG5cdFx0Zm9yIChjb25zdCBpbnNlcnRpb24gb2YgaW5zZXJ0aW9ucykge1xyXG5cdFx0XHQvLyBDaGVjayBmb3IgZXhhY3QgbWF0Y2ggb3IgbWF0Y2ggd2l0aCB3aGl0ZXNwYWNlIGRpZmZlcmVuY2VzXHJcblx0XHRcdGNvbnN0IGRlbGV0ZWRMaW5lcyA9IGRlbGV0aW9uLmNvbnRlbnRcclxuXHRcdFx0XHQuc3BsaXQoXCJcXG5cIilcclxuXHRcdFx0XHQuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKSk7XHJcblx0XHRcdGNvbnN0IGluc2VydGVkTGluZXMgPSBpbnNlcnRpb24uY29udGVudFxyXG5cdFx0XHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRkZWxldGVkTGluZXMubGVuZ3RoID09PSBpbnNlcnRlZExpbmVzLmxlbmd0aCAmJlxyXG5cdFx0XHRcdGRlbGV0ZWRMaW5lcy5sZW5ndGggPiAwXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGxldCBpc01hdGNoID0gdHJ1ZTtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGRlbGV0ZWRMaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0Ly8gQ29tcGFyZSBjb250ZW50IHdpdGhvdXQgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSB0YXNrIHN0cnVjdHVyZVxyXG5cdFx0XHRcdFx0Y29uc3QgZGVsZXRlZExpbmUgPSBkZWxldGVkTGluZXNbaV0udHJpbSgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5zZXJ0ZWRMaW5lID0gaW5zZXJ0ZWRMaW5lc1tpXS50cmltKCk7XHJcblx0XHRcdFx0XHRpZiAoZGVsZXRlZExpbmUgIT09IGluc2VydGVkTGluZSkge1xyXG5cdFx0XHRcdFx0XHRpc01hdGNoID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoaXNNYXRjaCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kcyBhbnkgdGFzayBzdGF0dXMgY2hhbmdlIGluIHRoZSB0cmFuc2FjdGlvblxyXG4gKiBAcGFyYW0gdHIgVGhlIHRyYW5zYWN0aW9uIHRvIGNoZWNrXHJcbiAqIEByZXR1cm5zIEluZm9ybWF0aW9uIGFib3V0IHRoZSB0YXNrIHdpdGggY2hhbmdlZCBzdGF0dXMgb3IgbnVsbCBpZiBubyB0YXNrIHN0YXR1cyB3YXMgY2hhbmdlZFxyXG4gKi9cclxuZnVuY3Rpb24gZmluZFRhc2tTdGF0dXNDaGFuZ2UodHI6IFRyYW5zYWN0aW9uKToge1xyXG5cdGRvYzogVGV4dDtcclxuXHRsaW5lTnVtYmVyOiBudW1iZXI7XHJcbn0gfCBudWxsIHtcclxuXHRsZXQgdGFza0NoYW5nZWRMaW5lOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gQ2hlY2sgZWFjaCBjaGFuZ2UgaW4gdGhlIHRyYW5zYWN0aW9uXHJcblx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcyhcclxuXHRcdChcclxuXHRcdFx0ZnJvbUE6IG51bWJlcixcclxuXHRcdFx0dG9BOiBudW1iZXIsXHJcblx0XHRcdGZyb21COiBudW1iZXIsXHJcblx0XHRcdHRvQjogbnVtYmVyLFxyXG5cdFx0XHRpbnNlcnRlZDogVGV4dFxyXG5cdFx0KSA9PiB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgbGluZSBpbnNlcnRpb24gd2l0aCBhIHRhc2sgbWFya2VyXHJcblx0XHRcdGlmIChpbnNlcnRlZC5sZW5ndGggPiAwICYmIHRhc2tDaGFuZ2VkTGluZSA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdGNvbnN0IGluc2VydGVkVGV4dCA9IGluc2VydGVkLnRvU3RyaW5nKCk7XHJcblxyXG5cdFx0XHRcdC8vIEZpcnN0IGNoZWNrIGZvciB0YXNrcyB3aXRoIHByZWNlZGluZyBuZXdsaW5lIChjb21tb24gY2FzZSB3aGVuIGFkZGluZyBhIHRhc2sgaW4gdGhlIG1pZGRsZSBvZiBhIGRvY3VtZW50KVxyXG5cdFx0XHRcdGNvbnN0IG5ld1Rhc2tNYXRjaCA9IGluc2VydGVkVGV4dC5tYXRjaChcclxuXHRcdFx0XHRcdC9cXG5bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbIFxcXS9cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRpZiAobmV3VGFza01hdGNoKSB7XHJcblx0XHRcdFx0XHQvLyBBIG5ldyB0YXNrIHdhcyBhZGRlZCwgZmluZCB0aGUgbGluZSBudW1iZXJcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZUF0KFxyXG5cdFx0XHRcdFx0XHRcdGZyb21CICsgaW5zZXJ0ZWRUZXh0LmluZGV4T2YobmV3VGFza01hdGNoWzBdKSArIDFcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGFza0NoYW5nZWRMaW5lID0gbGluZS5udW1iZXI7XHJcblx0XHRcdFx0XHRcdHJldHVybjsgLy8gV2UgZm91bmQgYSBuZXcgdGFzaywgbm8gbmVlZCB0byBjb250aW51ZSBjaGVja2luZ1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBMaW5lIGNhbGN1bGF0aW9uIG1pZ2h0IGZhaWwsIGNvbnRpbnVlIHdpdGggb3RoZXIgY2hlY2tzXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBBbHNvIGNoZWNrIGZvciB0YXNrcyB3aXRob3V0IHByZWNlZGluZyBuZXdsaW5lIChlLmcuLCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgZG9jdW1lbnQpXHJcblx0XHRcdFx0Y29uc3QgdGFza0F0U3RhcnRNYXRjaCA9IGluc2VydGVkVGV4dC5tYXRjaChcclxuXHRcdFx0XHRcdC9eW1xcc3xcXHRdKihbLSorXXxcXGQrXFwuKVxcc1xcWyBcXF0vXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKHRhc2tBdFN0YXJ0TWF0Y2gpIHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZUF0KGZyb21CKTtcclxuXHRcdFx0XHRcdFx0dGFza0NoYW5nZWRMaW5lID0gbGluZS5udW1iZXI7XHJcblx0XHRcdFx0XHRcdHJldHVybjsgLy8gV2UgZm91bmQgYSBuZXcgdGFzaywgbm8gbmVlZCB0byBjb250aW51ZSBjaGVja2luZ1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBMaW5lIGNhbGN1bGF0aW9uIG1pZ2h0IGZhaWwsIGNvbnRpbnVlIHdpdGggb3RoZXIgY2hlY2tzXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIHBvc2l0aW9uIGNvbnRleHRcclxuXHRcdFx0Y29uc3QgcG9zID0gZnJvbUI7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZUF0KHBvcyk7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5lIGNvbnRhaW5zIGEgdGFzayBtYXJrZXJcclxuXHRcdFx0Y29uc3QgdGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbKC4pXS9pO1xyXG5cdFx0XHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lVGV4dC5tYXRjaCh0YXNrUmVnZXgpO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tNYXRjaCkge1xyXG5cdFx0XHRcdC8vIEdldCB0aGUgb2xkIGxpbmUgaWYgaXQgZXhpc3RzIGluIHRoZSBvbGQgZG9jdW1lbnRcclxuXHRcdFx0XHRsZXQgb2xkTGluZSA9IG51bGw7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IG9sZFBvcyA9IGZyb21BO1xyXG5cdFx0XHRcdFx0aWYgKG9sZFBvcyA+PSAwICYmIG9sZFBvcyA8IHRyLnN0YXJ0U3RhdGUuZG9jLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0XHRvbGRMaW5lID0gdHIuc3RhcnRTdGF0ZS5kb2MubGluZUF0KG9sZFBvcyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Ly8gTGluZSBtaWdodCBub3QgZXhpc3QgaW4gb2xkIGRvY3VtZW50XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBuZXdTdGF0dXMgPSB0YXNrTWF0Y2hbMl07XHJcblx0XHRcdFx0Y29uc3Qgb2xkU3RhdHVzID0gb2xkTGluZVxyXG5cdFx0XHRcdFx0PyAob2xkTGluZS50ZXh0Lm1hdGNoKC9eW1xcc3xcXHRdKihbLSorXXxcXGQrXFwuKVxcc1xcWyguKVxcXS9pKT8uWzJdID8/IG51bGwpXHJcblx0XHRcdFx0XHQ6IG51bGw7XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoZSBzdGF0dXMgY2hhcmFjdGVyIGNoYW5nZWQgb3Igd2UgY291bGRuJ3QgZ2V0IHRoZSBvbGQgbGluZSwgbWFyayBhcyBjaGFuZ2VkXHJcblx0XHRcdFx0aWYgKCFvbGRMaW5lIHx8IG5ld1N0YXR1cyAhPT0gb2xkU3RhdHVzKSB7XHJcblx0XHRcdFx0XHR0YXNrQ2hhbmdlZExpbmUgPSBsaW5lLm51bWJlcjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRpZiAodGFza0NoYW5nZWRMaW5lID09PSBudWxsKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRkb2M6IHRyLm5ld0RvYyxcclxuXHRcdGxpbmVOdW1iZXI6IHRhc2tDaGFuZ2VkTGluZSxcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogRmluZHMgdGhlIHBhcmVudCB0YXNrIG9mIGEgZ2l2ZW4gdGFzayBsaW5lXHJcbiAqIEBwYXJhbSBkb2MgVGhlIGRvY3VtZW50IHRvIHNlYXJjaCBpblxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgb2YgdGhlIHRhc2tcclxuICogQHJldHVybnMgSW5mb3JtYXRpb24gYWJvdXQgdGhlIHBhcmVudCB0YXNrIG9yIG51bGwgaWYgbm8gcGFyZW50IHdhcyBmb3VuZFxyXG4gKi9cclxuZnVuY3Rpb24gZmluZFBhcmVudFRhc2soXHJcblx0ZG9jOiBUZXh0LFxyXG5cdGxpbmVOdW1iZXI6IG51bWJlclxyXG4pOiB7XHJcblx0bGluZU51bWJlcjogbnVtYmVyO1xyXG5cdGluZGVudGF0aW9uTGV2ZWw6IG51bWJlcjtcclxufSB8IG51bGwge1xyXG5cdC8vIEdldCB0aGUgY3VycmVudCBsaW5lIGFuZCBpdHMgaW5kZW50YXRpb24gbGV2ZWxcclxuXHRjb25zdCBjdXJyZW50TGluZSA9IGRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGN1cnJlbnRMaW5lVGV4dCA9IGN1cnJlbnRMaW5lLnRleHQ7XHJcblx0Y29uc3QgY3VycmVudEluZGVudE1hdGNoID0gY3VycmVudExpbmVUZXh0Lm1hdGNoKC9eW1xcc3xcXHRdKi8pO1xyXG5cdGNvbnN0IGN1cnJlbnRJbmRlbnRMZXZlbCA9IGN1cnJlbnRJbmRlbnRNYXRjaFxyXG5cdFx0PyBjdXJyZW50SW5kZW50TWF0Y2hbMF0ubGVuZ3RoXHJcblx0XHQ6IDA7XHJcblxyXG5cdC8vIElmIHdlJ3JlIGF0IHRoZSB0b3AgbGV2ZWwsIHRoZXJlJ3Mgbm8gcGFyZW50XHJcblx0aWYgKGN1cnJlbnRJbmRlbnRMZXZlbCA9PT0gMCkge1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvLyBEZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgbGluZSB1c2VzIHNwYWNlcyBvciB0YWJzIGZvciBpbmRlbnRhdGlvblxyXG5cdGNvbnN0IHVzZXNTcGFjZXMgPVxyXG5cdFx0Y3VycmVudEluZGVudE1hdGNoICYmIGN1cnJlbnRJbmRlbnRNYXRjaFswXS5pbmNsdWRlcyhcIiBcIik7XHJcblx0Y29uc3QgdXNlc1RhYnMgPSBjdXJyZW50SW5kZW50TWF0Y2ggJiYgY3VycmVudEluZGVudE1hdGNoWzBdLmluY2x1ZGVzKFwiXFx0XCIpO1xyXG5cclxuXHQvLyBMb29rIGJhY2t3YXJkcyBmb3IgYSBsaW5lIHdpdGggbGVzcyBpbmRlbnRhdGlvbiB0aGF0IGNvbnRhaW5zIGEgdGFza1xyXG5cdGZvciAobGV0IGkgPSBsaW5lTnVtYmVyIC0gMTsgaSA+PSAxOyBpLS0pIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBkb2MubGluZShpKTtcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdC8vIFNraXAgZW1wdHkgbGluZXNcclxuXHRcdGlmIChsaW5lVGV4dC50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBpbmRlbnRhdGlvbiBsZXZlbCBvZiB0aGlzIGxpbmVcclxuXHRcdGNvbnN0IGluZGVudE1hdGNoID0gbGluZVRleHQubWF0Y2goL15bXFxzfFxcdF0qLyk7XHJcblx0XHRjb25zdCBpbmRlbnRMZXZlbCA9IGluZGVudE1hdGNoID8gaW5kZW50TWF0Y2hbMF0ubGVuZ3RoIDogMDtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgaW5kZW50YXRpb24gdHlwZSBtYXRjaGVzIChzcGFjZXMgdnMgdGFicylcclxuXHRcdGNvbnN0IGxpbmVVc2VzU3BhY2VzID0gaW5kZW50TWF0Y2ggJiYgaW5kZW50TWF0Y2hbMF0uaW5jbHVkZXMoXCIgXCIpO1xyXG5cdFx0Y29uc3QgbGluZVVzZXNUYWJzID0gaW5kZW50TWF0Y2ggJiYgaW5kZW50TWF0Y2hbMF0uaW5jbHVkZXMoXCJcXHRcIik7XHJcblxyXG5cdFx0Ly8gSWYgaW5kZW50YXRpb24gdHlwZXMgZG9uJ3QgbWF0Y2gsIHRoaXMgY2FuJ3QgYmUgYSBwYXJlbnRcclxuXHRcdC8vIE9ubHkgY29tcGFyZSB3aGVuIGJvdGggbGluZXMgaGF2ZSBzb21lIGluZGVudGF0aW9uXHJcblx0XHRpZiAoaW5kZW50TGV2ZWwgPiAwICYmIGN1cnJlbnRJbmRlbnRMZXZlbCA+IDApIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCh1c2VzU3BhY2VzICYmICFsaW5lVXNlc1NwYWNlcykgfHxcclxuXHRcdFx0XHQodXNlc1RhYnMgJiYgIWxpbmVVc2VzVGFicylcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGlzIGxpbmUgaGFzIGxlc3MgaW5kZW50YXRpb24gdGhhbiB0aGUgY3VycmVudCBsaW5lXHJcblx0XHRpZiAoaW5kZW50TGV2ZWwgPCBjdXJyZW50SW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIHRhc2tcclxuXHRcdFx0Y29uc3QgdGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbKC4pXFxdL2k7XHJcblx0XHRcdGlmICh0YXNrUmVnZXgudGVzdChsaW5lVGV4dCkpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0bGluZU51bWJlcjogaSxcclxuXHRcdFx0XHRcdGluZGVudGF0aW9uTGV2ZWw6IGluZGVudExldmVsLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIGl0J3Mgbm90IGEgdGFzaywgaXQgY2FuJ3QgYmUgYSBwYXJlbnQgdGFza1xyXG5cdFx0XHQvLyBJZiBpdCdzIGEgaGVhZGluZyBvciBvdGhlciBzdHJ1Y3R1cmFsIGVsZW1lbnQsIHdlIGtlZXAgbG9va2luZ1xyXG5cdFx0XHRpZiAoIWxpbmVUZXh0LnN0YXJ0c1dpdGgoXCIjXCIpICYmICFsaW5lVGV4dC5zdGFydHNXaXRoKFwiPlwiKSkge1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBhbGwgc2libGluZyB0YXNrcyBhdCB0aGUgc2FtZSBpbmRlbnRhdGlvbiBsZXZlbCBhcyB0aGUgcGFyZW50J3MgY2hpbGRyZW4gYXJlIGNvbXBsZXRlZC5cclxuICogQ29uc2lkZXJzIHdvcmtmbG93IHRhc2tzOiBvbmx5IHRyZWF0cyB0aGVtIGFzIGNvbXBsZXRlZCBpZiB0aGV5IGFyZSB0aGUgZmluYWwgc3RhZ2Ugb3Igbm90IHdvcmtmbG93IHRhc2tzLlxyXG4gKiBAcGFyYW0gZG9jIFRoZSBkb2N1bWVudCB0byBjaGVja1xyXG4gKiBAcGFyYW0gcGFyZW50TGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgb2YgdGhlIHBhcmVudCB0YXNrXHJcbiAqIEBwYXJhbSBwYXJlbnRJbmRlbnRMZXZlbCBUaGUgaW5kZW50YXRpb24gbGV2ZWwgb2YgdGhlIHBhcmVudCB0YXNrXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBUcnVlIGlmIGFsbCBzaWJsaW5ncyBhcmUgY29tcGxldGVkIChjb25zaWRlcmluZyB3b3JrZmxvdyBydWxlcyksIGZhbHNlIG90aGVyd2lzZVxyXG4gKi9cclxuZnVuY3Rpb24gYXJlQWxsU2libGluZ3NDb21wbGV0ZWQoXHJcblx0ZG9jOiBUZXh0LFxyXG5cdHBhcmVudExpbmVOdW1iZXI6IG51bWJlcixcclxuXHRwYXJlbnRJbmRlbnRMZXZlbDogbnVtYmVyLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IGJvb2xlYW4ge1xyXG5cdGNvbnN0IHRhYlNpemUgPSBnZXRUYWJTaXplKHBsdWdpbi5hcHApO1xyXG5cclxuXHQvLyBUaGUgZXhwZWN0ZWQgaW5kZW50YXRpb24gbGV2ZWwgZm9yIGNoaWxkIHRhc2tzXHJcblx0Y29uc3QgY2hpbGRJbmRlbnRMZXZlbCA9IHBhcmVudEluZGVudExldmVsICsgdGFiU2l6ZTtcclxuXHJcblx0Ly8gVHJhY2sgaWYgd2UgZm91bmQgYXQgbGVhc3Qgb25lIGNoaWxkXHJcblx0bGV0IGZvdW5kQ2hpbGQgPSBmYWxzZTtcclxuXHJcblx0Ly8gU2VhcmNoIGZvcndhcmQgZnJvbSB0aGUgcGFyZW50IGxpbmVcclxuXHRmb3IgKGxldCBpID0gcGFyZW50TGluZU51bWJlciArIDE7IGkgPD0gZG9jLmxpbmVzOyBpKyspIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBkb2MubGluZShpKTtcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdC8vIFNraXAgZW1wdHkgbGluZXNcclxuXHRcdGlmIChsaW5lVGV4dC50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBpbmRlbnRhdGlvbiBvZiB0aGlzIGxpbmVcclxuXHRcdGNvbnN0IGluZGVudE1hdGNoID0gbGluZVRleHQubWF0Y2goL15bXFxzfFxcdF0qLyk7XHJcblx0XHRjb25zdCBjdXJyZW50SW5kZW50VGV4dCA9IGluZGVudE1hdGNoID8gaW5kZW50TWF0Y2hbMF0gOiBcIlwiO1xyXG5cdFx0Y29uc3QgaW5kZW50TGV2ZWwgPSBjdXJyZW50SW5kZW50VGV4dC5sZW5ndGg7XHJcblxyXG5cdFx0Ly8gSWYgd2UgZW5jb3VudGVyIGEgbGluZSB3aXRoIGxlc3Mgb3IgZXF1YWwgaW5kZW50YXRpb24gdG8gdGhlIHBhcmVudCxcclxuXHRcdC8vIHdlJ3ZlIG1vdmVkIG91dCBvZiB0aGUgcGFyZW50J3MgY2hpbGRyZW4gc2NvcGVcclxuXHRcdGlmIChpbmRlbnRMZXZlbCA8PSBwYXJlbnRJbmRlbnRMZXZlbCkge1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgZGlyZWN0IGNoaWxkIChleGFjdGx5IG9uZSBsZXZlbCBkZWVwZXIpXHJcblx0XHRpZiAoaW5kZW50TGV2ZWwgPT09IGNoaWxkSW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIHRhc2tcclxuXHRcdFx0Y29uc3QgdGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbKC4pXFxdL2k7XHJcblx0XHRcdGNvbnN0IHRhc2tNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKHRhc2tSZWdleCk7XHJcblxyXG5cdFx0XHRpZiAodGFza01hdGNoKSB7XHJcblx0XHRcdFx0Zm91bmRDaGlsZCA9IHRydWU7IC8vIFdlIGZvdW5kIGF0IGxlYXN0IG9uZSBjaGlsZCB0YXNrXHJcblx0XHRcdFx0Y29uc3QgdGFza1N0YXR1cyA9IHRhc2tNYXRjaFsyXTsgLy8gU3RhdHVzIGNoYXJhY3RlciBpcyBpbiBncm91cCAyXHJcblxyXG5cdFx0XHRcdGlmICh0YXNrU3RhdHVzICE9PSBcInhcIiAmJiB0YXNrU3RhdHVzICE9PSBcIlhcIikge1xyXG5cdFx0XHRcdFx0Ly8gRm91bmQgYW4gaW5jb21wbGV0ZSBjaGlsZCB0YXNrXHJcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFRhc2sgSVMgbWFya2VkIFt4XSBvciBbWF0uIE5vdywgY29uc2lkZXIgd29ya2Zsb3cuXHJcblx0XHRcdFx0XHRpZiAocGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSB7XHJcblx0XHRcdFx0XHRcdC8vIE9ubHkgcGVyZm9ybSB0aGUgc3RyaWN0IHdvcmtmbG93IHN0YWdlIGNoZWNrIElGIGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXIgaXMgT04uXHJcblx0XHRcdFx0XHRcdC8vIElmIGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXIgaXMgT0ZGLCB3ZSB0cnVzdCB0aGUgJ1t4XScgc3RhdHVzIGZvciBwYXJlbnQgY29tcGxldGlvbi5cclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5hdXRvUmVtb3ZlTGFzdFN0YWdlTWFya2VyXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFNldHRpbmcgaXMgT046IFJlbHkgb24gdGhlIHN0YWdlIGNoZWNrLlxyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdCFpc0xhc3RXb3JrZmxvd1N0YWdlT3JOb3RXb3JrZmxvdyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGksXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRvYyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGx1Z2luXHJcblx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJdCdzIFt4XSwgd29ya2Zsb3cgaXMgZW5hYmxlZCwgbWFya2VyIHJlbW92YWwgaXMgT04sXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBidXQgaXQncyBub3QgY29uc2lkZXJlZCB0aGUgZmluYWwgc3RhZ2UgYnkgdGhlIGNoZWNrLlxyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBlbHNlOiBTZXR0aW5nIGlzIE9GRi4gRG8gbm90aGluZy4gVGhlIHRhc2sgaXMgW3hdLCBzbyB3ZSBjb25zaWRlciBpdCBjb21wbGV0ZSBmb3IgcGFyZW50IGNoZWNraW5nLlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gSWYgd29ya2Zsb3cgaXMgZGlzYWJsZWQsIG9yIHBhc3NlZCB0aGUgd29ya2Zsb3cgY2hlY2tzLCBjb250aW51ZSBsb29wLlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZvdW5kQ2hpbGQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wbGV0ZXMgYSBwYXJlbnQgdGFzayBieSBtb2RpZnlpbmcgdGhlIHRyYW5zYWN0aW9uXHJcbiAqIEBwYXJhbSB0ciBUaGUgdHJhbnNhY3Rpb24gdG8gbW9kaWZ5XHJcbiAqIEBwYXJhbSBwYXJlbnRMaW5lTnVtYmVyIFRoZSBsaW5lIG51bWJlciBvZiB0aGUgcGFyZW50IHRhc2tcclxuICogQHBhcmFtIGRvYyBUaGUgZG9jdW1lbnRcclxuICogQHJldHVybnMgVGhlIG1vZGlmaWVkIHRyYW5zYWN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjb21wbGV0ZVBhcmVudFRhc2soXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdHBhcmVudExpbmVOdW1iZXI6IG51bWJlcixcclxuXHRkb2M6IFRleHRcclxuKTogVHJhbnNhY3Rpb25TcGVjIHtcclxuXHRjb25zdCBwYXJlbnRMaW5lID0gZG9jLmxpbmUocGFyZW50TGluZU51bWJlcik7XHJcblx0Y29uc3QgcGFyZW50TGluZVRleHQgPSBwYXJlbnRMaW5lLnRleHQ7XHJcblxyXG5cdC8vIEZpbmQgdGhlIHRhc2sgbWFya2VyIHBvc2l0aW9uXHJcblx0Y29uc3QgdGFza01hcmtlck1hdGNoID0gcGFyZW50TGluZVRleHQubWF0Y2goXHJcblx0XHQvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHNcXFsoLilcXF0vXHJcblx0KTtcclxuXHRpZiAoIXRhc2tNYXJrZXJNYXRjaCkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gSWYgdGhlIHBhcmVudCBpcyBhbHJlYWR5IG1hcmtlZCBhcyBjb21wbGV0ZWQsIGRvbid0IG1vZGlmeSBpdCBhZ2FpblxyXG5cdGNvbnN0IGN1cnJlbnRTdGF0dXMgPSB0YXNrTWFya2VyTWF0Y2hbMl07XHJcblx0aWYgKGN1cnJlbnRTdGF0dXMgPT09IFwieFwiIHx8IGN1cnJlbnRTdGF0dXMgPT09IFwiWFwiKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB0aGVyZSdzIGFscmVhZHkgYSBwZW5kaW5nIGNoYW5nZSBmb3IgdGhpcyBwYXJlbnQgdGFzayBpbiB0aGlzIHRyYW5zYWN0aW9uXHJcblx0bGV0IGFscmVhZHlDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EsIGZyb21CLCB0b0IsIGluc2VydGVkKSA9PiB7XHJcblx0XHRjb25zdCBjaGVja2JveFN0YXJ0ID0gcGFyZW50TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdFx0Y29uc3QgbWFya2VyU3RhcnQgPSBwYXJlbnRMaW5lLmZyb20gKyBjaGVja2JveFN0YXJ0O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGFueSBjaGFuZ2UgaW4gdGhlIHRyYW5zYWN0aW9uIGFmZmVjdHMgdGhlIGNoZWNrYm94IGNoYXJhY3RlclxyXG5cdFx0aWYgKG1hcmtlclN0YXJ0ID49IGZyb21CICYmIG1hcmtlclN0YXJ0IDwgdG9CKSB7XHJcblx0XHRcdGFscmVhZHlDaGFuZ2luZyA9IHRydWU7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIElmIHRoZSB0YXNrIGlzIGFscmVhZHkgYmVpbmcgY2hhbmdlZCBpbiB0aGlzIHRyYW5zYWN0aW9uLCBkb24ndCBhZGQgYW5vdGhlciBjaGFuZ2VcclxuXHRpZiAoYWxyZWFkeUNoYW5naW5nKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDYWxjdWxhdGUgdGhlIHBvc2l0aW9uIHdoZXJlIHdlIG5lZWQgdG8gaW5zZXJ0ICd4J1xyXG5cdC8vIEZpbmQgdGhlIGV4YWN0IHBvc2l0aW9uIG9mIHRoZSBjaGVja2JveCBjaGFyYWN0ZXJcclxuXHRjb25zdCBjaGVja2JveFN0YXJ0ID0gcGFyZW50TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdGNvbnN0IG1hcmtlclN0YXJ0ID0gcGFyZW50TGluZS5mcm9tICsgY2hlY2tib3hTdGFydDtcclxuXHJcblx0Ly8gQ3JlYXRlIGEgbmV3IHRyYW5zYWN0aW9uIHRoYXQgYWRkcyB0aGUgY29tcGxldGlvbiBtYXJrZXIgJ3gnIHRvIHRoZSBwYXJlbnQgdGFza1xyXG5cdHJldHVybiB7XHJcblx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdHRyLmNoYW5nZXMsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmcm9tOiBtYXJrZXJTdGFydCxcclxuXHRcdFx0XHR0bzogbWFya2VyU3RhcnQgKyAxLFxyXG5cdFx0XHRcdGluc2VydDogXCJ4XCIsXHJcblx0XHRcdH0sXHJcblx0XHRdLFxyXG5cdFx0c2VsZWN0aW9uOiB0ci5zZWxlY3Rpb24sXHJcblx0XHRhbm5vdGF0aW9uczogW3Rhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFwiYXV0b0NvbXBsZXRlUGFyZW50LkRPTkVcIildLFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgYW55IHNpYmxpbmcgdGFza3MgaGF2ZSBhbnkgc3RhdHVzIChub3QgZW1wdHkpXHJcbiAqIEBwYXJhbSBkb2MgVGhlIGRvY3VtZW50IHRvIGNoZWNrXHJcbiAqIEBwYXJhbSBwYXJlbnRMaW5lTnVtYmVyIFRoZSBsaW5lIG51bWJlciBvZiB0aGUgcGFyZW50IHRhc2tcclxuICogQHBhcmFtIHBhcmVudEluZGVudExldmVsIFRoZSBpbmRlbnRhdGlvbiBsZXZlbCBvZiB0aGUgcGFyZW50IHRhc2tcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRydWUgaWYgYW55IHNpYmxpbmdzIGhhdmUgYSBzdGF0dXMsIGZhbHNlIG90aGVyd2lzZVxyXG4gKi9cclxuZnVuY3Rpb24gYW55U2libGluZ1dpdGhTdGF0dXMoXHJcblx0ZG9jOiBUZXh0LFxyXG5cdHBhcmVudExpbmVOdW1iZXI6IG51bWJlcixcclxuXHRwYXJlbnRJbmRlbnRMZXZlbDogbnVtYmVyLFxyXG5cdGFwcDogQXBwXHJcbik6IGJvb2xlYW4ge1xyXG5cdGNvbnN0IHRhYlNpemUgPSBnZXRUYWJTaXplKGFwcCk7XHJcblxyXG5cdC8vIFRoZSBleHBlY3RlZCBpbmRlbnRhdGlvbiBsZXZlbCBmb3IgY2hpbGQgdGFza3NcclxuXHRjb25zdCBjaGlsZEluZGVudExldmVsID0gcGFyZW50SW5kZW50TGV2ZWwgKyB0YWJTaXplO1xyXG5cclxuXHQvLyBTZWFyY2ggZm9yd2FyZCBmcm9tIHRoZSBwYXJlbnQgbGluZVxyXG5cdGZvciAobGV0IGkgPSBwYXJlbnRMaW5lTnVtYmVyICsgMTsgaSA8PSBkb2MubGluZXM7IGkrKykge1xyXG5cdFx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGkpO1xyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0Ly8gU2tpcCBlbXB0eSBsaW5lc1xyXG5cdFx0aWYgKGxpbmVUZXh0LnRyaW0oKSA9PT0gXCJcIikge1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgdGhlIGluZGVudGF0aW9uIG9mIHRoaXMgbGluZVxyXG5cdFx0Y29uc3QgaW5kZW50TWF0Y2ggPSBsaW5lVGV4dC5tYXRjaCgvXltcXHN8XFx0XSovKTtcclxuXHRcdGNvbnN0IGluZGVudExldmVsID0gaW5kZW50TWF0Y2ggPyBpbmRlbnRNYXRjaFswXS5sZW5ndGggOiAwO1xyXG5cclxuXHRcdC8vIElmIHdlIGVuY291bnRlciBhIGxpbmUgd2l0aCBsZXNzIG9yIGVxdWFsIGluZGVudGF0aW9uIHRvIHRoZSBwYXJlbnQsXHJcblx0XHQvLyB3ZSd2ZSBtb3ZlZCBvdXQgb2YgdGhlIHBhcmVudCdzIGNoaWxkcmVuIHNjb3BlXHJcblx0XHRpZiAoaW5kZW50TGV2ZWwgPD0gcGFyZW50SW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGhpcyBpcyBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgcGFyZW50IChleGFjdGx5IG9uZSBsZXZlbCBkZWVwZXIpXHJcblx0XHRpZiAoaW5kZW50TGV2ZWwgPT09IGNoaWxkSW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIHRhc2tcclxuXHRcdFx0Y29uc3QgdGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbKC4pXFxdL2k7XHJcblx0XHRcdGNvbnN0IHRhc2tNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKHRhc2tSZWdleCk7XHJcblxyXG5cdFx0XHRpZiAodGFza01hdGNoKSB7XHJcblx0XHRcdFx0Ly8gSWYgdGhlIHRhc2sgaGFzIGFueSBzdGF0dXMgb3RoZXIgdGhhbiBzcGFjZSwgcmV0dXJuIHRydWVcclxuXHRcdFx0XHRjb25zdCB0YXNrU3RhdHVzID0gdGFza01hdGNoWzJdOyAvLyBTdGF0dXMgY2hhcmFjdGVyIGlzIGluIGdyb3VwIDJcclxuXHRcdFx0XHRpZiAodGFza1N0YXR1cyAhPT0gXCIgXCIpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgY3VycmVudCBzdGF0dXMgb2YgYSBwYXJlbnQgdGFza1xyXG4gKiBAcGFyYW0gZG9jIFRoZSBkb2N1bWVudFxyXG4gKiBAcGFyYW0gcGFyZW50TGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgb2YgdGhlIHBhcmVudCB0YXNrXHJcbiAqIEByZXR1cm5zIFRoZSB0YXNrIHN0YXR1cyBjaGFyYWN0ZXJcclxuICovXHJcbmZ1bmN0aW9uIGdldFBhcmVudFRhc2tTdGF0dXMoZG9jOiBUZXh0LCBwYXJlbnRMaW5lTnVtYmVyOiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdGNvbnN0IHBhcmVudExpbmUgPSBkb2MubGluZShwYXJlbnRMaW5lTnVtYmVyKTtcclxuXHRjb25zdCBwYXJlbnRMaW5lVGV4dCA9IHBhcmVudExpbmUudGV4dDtcclxuXHJcblx0Ly8gRmluZCB0aGUgdGFzayBtYXJrZXJcclxuXHRjb25zdCB0YXNrTWFya2VyTWF0Y2ggPSBwYXJlbnRMaW5lVGV4dC5tYXRjaChcclxuXHRcdC9eW1xcc3xcXHRdKihbLSorXXxcXGQrXFwuKVxcc1xcWyguKV0vXHJcblx0KTtcclxuXHJcblx0aWYgKCF0YXNrTWFya2VyTWF0Y2gpIHtcclxuXHRcdHJldHVybiBcIlwiO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRhc2tNYXJrZXJNYXRjaFsyXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1hcmtzIGEgcGFyZW50IHRhc2sgYXMgXCJJbiBQcm9ncmVzc1wiIGJ5IG1vZGlmeWluZyB0aGUgdHJhbnNhY3Rpb25cclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBtb2RpZnlcclxuICogQHBhcmFtIHBhcmVudExpbmVOdW1iZXIgVGhlIGxpbmUgbnVtYmVyIG9mIHRoZSBwYXJlbnQgdGFza1xyXG4gKiBAcGFyYW0gZG9jIFRoZSBkb2N1bWVudFxyXG4gKiBAcmV0dXJucyBUaGUgbW9kaWZpZWQgdHJhbnNhY3Rpb25cclxuICovXHJcbmZ1bmN0aW9uIG1hcmtQYXJlbnRBc0luUHJvZ3Jlc3MoXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdHBhcmVudExpbmVOdW1iZXI6IG51bWJlcixcclxuXHRkb2M6IFRleHQsXHJcblx0dGFza1N0YXR1c0N5Y2xlOiBzdHJpbmdbXVxyXG4pOiBUcmFuc2FjdGlvblNwZWMge1xyXG5cdGNvbnN0IHBhcmVudExpbmUgPSBkb2MubGluZShwYXJlbnRMaW5lTnVtYmVyKTtcclxuXHRjb25zdCBwYXJlbnRMaW5lVGV4dCA9IHBhcmVudExpbmUudGV4dDtcclxuXHJcblx0Ly8gRmluZCB0aGUgdGFzayBtYXJrZXIgcG9zaXRpb24sIGFjY2VwdGluZyBhbnkgY3VycmVudCBzdGF0dXMgKG5vdCBqdXN0IGVtcHR5KVxyXG5cdGNvbnN0IHRhc2tNYXJrZXJNYXRjaCA9IHBhcmVudExpbmVUZXh0Lm1hdGNoKFxyXG5cdFx0L15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzXFxbKC4pXFxdL1xyXG5cdCk7XHJcblx0aWYgKCF0YXNrTWFya2VyTWF0Y2gpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBjdXJyZW50IHN0YXR1c1xyXG5cdGNvbnN0IGN1cnJlbnRTdGF0dXMgPSB0YXNrTWFya2VyTWF0Y2hbMl07XHJcblxyXG5cdC8vIElmIHRoZSBzdGF0dXMgaXMgYWxyZWFkeSB0aGUgaW4tcHJvZ3Jlc3MgbWFya2VyIHdlIHdhbnQgdG8gc2V0LCBkb24ndCBjaGFuZ2UgaXRcclxuXHRpZiAoY3VycmVudFN0YXR1cyA9PT0gdGFza1N0YXR1c0N5Y2xlWzBdKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB0aGVyZSdzIGFscmVhZHkgYSBwZW5kaW5nIGNoYW5nZSBmb3IgdGhpcyBwYXJlbnQgdGFzayBpbiB0aGlzIHRyYW5zYWN0aW9uXHJcblx0bGV0IGFscmVhZHlDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EsIGZyb21CLCB0b0IsIGluc2VydGVkKSA9PiB7XHJcblx0XHRjb25zdCBjaGVja2JveFN0YXJ0ID0gcGFyZW50TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdFx0Y29uc3QgbWFya2VyU3RhcnQgPSBwYXJlbnRMaW5lLmZyb20gKyBjaGVja2JveFN0YXJ0O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGFueSBjaGFuZ2UgaW4gdGhlIHRyYW5zYWN0aW9uIGFmZmVjdHMgdGhlIGNoZWNrYm94IGNoYXJhY3RlclxyXG5cdFx0aWYgKG1hcmtlclN0YXJ0ID49IGZyb21CICYmIG1hcmtlclN0YXJ0IDwgdG9CKSB7XHJcblx0XHRcdGFscmVhZHlDaGFuZ2luZyA9IHRydWU7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIElmIHRoZSB0YXNrIGlzIGFscmVhZHkgYmVpbmcgY2hhbmdlZCBpbiB0aGlzIHRyYW5zYWN0aW9uLCBkb24ndCBhZGQgYW5vdGhlciBjaGFuZ2VcclxuXHRpZiAoYWxyZWFkeUNoYW5naW5nKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDYWxjdWxhdGUgdGhlIHBvc2l0aW9uIHdoZXJlIHdlIG5lZWQgdG8gaW5zZXJ0IHRoZSBcIkluIFByb2dyZXNzXCIgbWFya2VyXHJcblx0Ly8gRmluZCB0aGUgZXhhY3QgcG9zaXRpb24gb2YgdGhlIGNoZWNrYm94IGNoYXJhY3RlclxyXG5cdGNvbnN0IGNoZWNrYm94U3RhcnQgPSBwYXJlbnRMaW5lVGV4dC5pbmRleE9mKFwiW1wiKSArIDE7XHJcblx0Y29uc3QgbWFya2VyU3RhcnQgPSBwYXJlbnRMaW5lLmZyb20gKyBjaGVja2JveFN0YXJ0O1xyXG5cclxuXHQvLyBDcmVhdGUgYSBuZXcgdHJhbnNhY3Rpb24gdGhhdCBhZGRzIHRoZSBcIkluIFByb2dyZXNzXCIgbWFya2VyIHRvIHRoZSBwYXJlbnQgdGFza1xyXG5cdHJldHVybiB7XHJcblx0XHRjaGFuZ2VzOiBbXHJcblx0XHRcdHRyLmNoYW5nZXMsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmcm9tOiBtYXJrZXJTdGFydCxcclxuXHRcdFx0XHR0bzogbWFya2VyU3RhcnQgKyAxLFxyXG5cdFx0XHRcdGluc2VydDogdGFza1N0YXR1c0N5Y2xlWzBdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XSxcclxuXHRcdHNlbGVjdGlvbjogdHIuc2VsZWN0aW9uLFxyXG5cdFx0YW5ub3RhdGlvbnM6IFtcclxuXHRcdFx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJhdXRvQ29tcGxldGVQYXJlbnQuSU5fUFJPR1JFU1NcIiksXHJcblx0XHRdLFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBjaGlsZCB0YXNrcyBhdCB0aGUgc3BlY2lmaWVkIGluZGVudGF0aW9uIGxldmVsXHJcbiAqIEBwYXJhbSBkb2MgVGhlIGRvY3VtZW50IHRvIGNoZWNrXHJcbiAqIEBwYXJhbSBwYXJlbnRMaW5lTnVtYmVyIFRoZSBsaW5lIG51bWJlciBvZiB0aGUgcGFyZW50IHRhc2tcclxuICogQHBhcmFtIHBhcmVudEluZGVudExldmVsIFRoZSBpbmRlbnRhdGlvbiBsZXZlbCBvZiB0aGUgcGFyZW50IHRhc2tcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlcmUgYXJlIGFueSBjaGlsZCB0YXNrcywgZmFsc2Ugb3RoZXJ3aXNlXHJcbiAqL1xyXG5mdW5jdGlvbiBoYXNBbnlDaGlsZFRhc2tzQXRMZXZlbChcclxuXHRkb2M6IFRleHQsXHJcblx0cGFyZW50TGluZU51bWJlcjogbnVtYmVyLFxyXG5cdHBhcmVudEluZGVudExldmVsOiBudW1iZXIsXHJcblx0YXBwOiBBcHBcclxuKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgdGFiU2l6ZSA9IGdldFRhYlNpemUoYXBwKTtcclxuXHJcblx0Ly8gVGhlIGV4cGVjdGVkIGluZGVudGF0aW9uIGxldmVsIGZvciBjaGlsZCB0YXNrc1xyXG5cdGNvbnN0IGNoaWxkSW5kZW50TGV2ZWwgPSBwYXJlbnRJbmRlbnRMZXZlbCArIHRhYlNpemU7XHJcblxyXG5cdC8vIFNlYXJjaCBmb3J3YXJkIGZyb20gdGhlIHBhcmVudCBsaW5lXHJcblx0Zm9yIChsZXQgaSA9IHBhcmVudExpbmVOdW1iZXIgKyAxOyBpIDw9IGRvYy5saW5lczsgaSsrKSB7XHJcblx0XHRjb25zdCBsaW5lID0gZG9jLmxpbmUoaSk7XHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0XHQvLyBTa2lwIGVtcHR5IGxpbmVzXHJcblx0XHRpZiAobGluZVRleHQudHJpbSgpID09PSBcIlwiKSB7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCB0aGUgaW5kZW50YXRpb24gb2YgdGhpcyBsaW5lXHJcblx0XHRjb25zdCBpbmRlbnRNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKC9eW1xcc3xcXHRdKi8pO1xyXG5cdFx0Y29uc3QgaW5kZW50TGV2ZWwgPSBpbmRlbnRNYXRjaCA/IGluZGVudE1hdGNoWzBdLmxlbmd0aCA6IDA7XHJcblxyXG5cdFx0Ly8gSWYgd2UgZW5jb3VudGVyIGEgbGluZSB3aXRoIGxlc3Mgb3IgZXF1YWwgaW5kZW50YXRpb24gdG8gdGhlIHBhcmVudCxcclxuXHRcdC8vIHdlJ3ZlIG1vdmVkIG91dCBvZiB0aGUgcGFyZW50J3MgY2hpbGRyZW4gc2NvcGVcclxuXHRcdGlmIChpbmRlbnRMZXZlbCA8PSBwYXJlbnRJbmRlbnRMZXZlbCkge1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGlzIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSBwYXJlbnQgKGV4YWN0bHkgb25lIGxldmVsIGRlZXBlcilcclxuXHRcdGlmIChpbmRlbnRMZXZlbCA9PT0gY2hpbGRJbmRlbnRMZXZlbCkge1xyXG5cdFx0XHQvLyBDaGVjayBpZiBpdCdzIGEgdGFza1xyXG5cdFx0XHRjb25zdCB0YXNrUmVnZXggPSAvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHNcXFsoLilcXF0vaTtcclxuXHRcdFx0aWYgKHRhc2tSZWdleC50ZXN0KGxpbmVUZXh0KSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlOyAvLyBGb3VuZCBhdCBsZWFzdCBvbmUgY2hpbGQgdGFza1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcblx0aGFuZGxlUGFyZW50VGFza1VwZGF0ZVRyYW5zYWN0aW9uLFxyXG5cdGZpbmRUYXNrU3RhdHVzQ2hhbmdlLFxyXG5cdGZpbmRQYXJlbnRUYXNrLFxyXG5cdGFyZUFsbFNpYmxpbmdzQ29tcGxldGVkLFxyXG5cdGFueVNpYmxpbmdXaXRoU3RhdHVzLFxyXG5cdGdldFBhcmVudFRhc2tTdGF0dXMsXHJcblx0aGFzQW55Q2hpbGRUYXNrc0F0TGV2ZWwsXHJcblx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24sXHJcbn07XHJcbiJdfQ==