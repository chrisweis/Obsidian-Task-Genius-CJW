import { debounce, editorInfoField } from "obsidian";
import { EditorState } from "@codemirror/state";
import { parseTaskLine } from "@/utils/task/task-operations"; // Adjust path if needed
const debounceTrigger = debounce((app, task) => {
    app.workspace.trigger("task-genius:task-completed", task);
}, 200);
/**
 * Creates an editor extension that monitors task completion events.
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension
 */
export function monitorTaskCompletedExtension(app, plugin) {
    return EditorState.transactionFilter.of((tr) => {
        // Handle the transaction to check for task completions
        handleMonitorTaskCompletionTransaction(tr, app, plugin);
        // Always return the original transaction, as we are only monitoring
        return tr;
    });
}
/**
 * Detects if a transaction represents a move operation (line reordering)
 * @param tr The transaction to check
 * @returns True if this appears to be a move operation
 */
function isMoveOperation(tr) {
    const changes = [];
    // Count the number of changes to determine if this could be a move
    let changeCount = 0;
    // Collect all changes in the transaction
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        changeCount++;
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
    // Simple edits (like changing a single character) are unlikely to be moves
    // Most single-character task status changes involve only 1 change
    if (changeCount <= 1) {
        return false;
    }
    // Check if we have both deletions and insertions
    const deletions = changes.filter((c) => c.type === "delete");
    const insertions = changes.filter((c) => c.type === "insert");
    if (deletions.length === 0 || insertions.length === 0) {
        return false;
    }
    // For a move operation, we typically expect:
    // 1. Multiple changes (deletion + insertion)
    // 2. The deleted and inserted content should be substantial (not just a character)
    // 3. The content should match exactly
    // Check if any deleted content matches any inserted content
    for (const deletion of deletions) {
        for (const insertion of insertions) {
            // Skip if the content is too short (likely a status character change)
            if (deletion.content.trim().length < 10 ||
                insertion.content.trim().length < 10) {
                continue;
            }
            // Check for exact match
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
                // If we found a substantial content match, this is likely a move
                if (isMatch) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Handles transactions to detect when a task is marked as completed.
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 */
function handleMonitorTaskCompletionTransaction(tr, app, plugin) {
    // Only process transactions that change the document
    if (!tr.docChanged) {
        return;
    }
    console.log("monitorTaskCompletedExtension", tr.changes);
    if (tr.isUserEvent("set") && tr.changes.length > 1) {
        return tr;
    }
    if (tr.isUserEvent("input.paste")) {
        return tr;
    }
    // Skip if this looks like a move operation (delete + insert of same content)
    if (isMoveOperation(tr)) {
        return;
    }
    // Regex to identify a completed task line
    const completedTaskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[[xX]\]/;
    // Regex to identify any task line (to check the previous state)
    const anyTaskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[.\]/;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        var _a;
        // Only process actual insertions that might contain completed tasks
        if (inserted.length === 0) {
            return;
        }
        // Determine the range of lines affected by the change in the new document state
        const affectedLinesStart = tr.newDoc.lineAt(fromB).number;
        // Check the line where the change ends, in case the change spans lines or adds new lines
        const affectedLinesEnd = tr.newDoc.lineAt(toB).number;
        // Iterate through each line potentially affected by this change
        for (let i = affectedLinesStart; i <= affectedLinesEnd; i++) {
            // Ensure the line number is valid in the new document
            if (i > tr.newDoc.lines)
                continue;
            const newLine = tr.newDoc.line(i);
            const newLineText = newLine.text;
            // Check if the line in the new state represents a completed task
            if (completedTaskRegex.test(newLineText)) {
                let originalLineText = "";
                let wasTaskBefore = false;
                let foundCorrespondingTask = false;
                // First, try to find the corresponding task in deleted content
                tr.changes.iterChanges((oldFromA, oldToA, oldFromB, oldToB, oldInserted) => {
                    // Look for deletions that might correspond to this insertion
                    if (oldFromA < oldToA && !foundCorrespondingTask) {
                        try {
                            const deletedText = tr.startState.doc.sliceString(oldFromA, oldToA);
                            const deletedLines = deletedText.split("\n");
                            for (const deletedLine of deletedLines) {
                                const deletedTaskMatch = deletedLine.match(anyTaskRegex);
                                if (deletedTaskMatch) {
                                    // Compare the task content (without status) to see if it's the same task
                                    const newTaskContent = newLineText
                                        .replace(anyTaskRegex, "")
                                        .trim();
                                    const deletedTaskContent = deletedLine
                                        .replace(anyTaskRegex, "")
                                        .trim();
                                    // If the content matches, this is likely the same task
                                    if (newTaskContent ===
                                        deletedTaskContent) {
                                        originalLineText = deletedLine;
                                        wasTaskBefore = true;
                                        foundCorrespondingTask = true;
                                        break;
                                    }
                                }
                            }
                        }
                        catch (e) {
                            // Ignore errors when trying to get deleted text
                        }
                    }
                });
                // If we couldn't find a corresponding task in deletions, try the original method
                if (!foundCorrespondingTask) {
                    try {
                        // Map the beginning of the current line in the new doc back to the original doc
                        // Use -1 bias to prefer mapping to the state *before* the character was inserted
                        const originalPos = tr.changes.mapPos(newLine.from, -1);
                        if (originalPos !== null) {
                            const originalLine = tr.startState.doc.lineAt(originalPos);
                            originalLineText = originalLine.text;
                            // Check if the original line was a task (of any status)
                            wasTaskBefore = anyTaskRegex.test(originalLineText);
                            foundCorrespondingTask = true;
                        }
                    }
                    catch (e) {
                        // Ignore errors if the line didn't exist or changed drastically
                        // console.warn("Could not get original line state for completion check:", e);
                    }
                }
                // Log completion only if:
                // 1. We found a corresponding task in the original state
                // 2. The line was a task before
                // 3. It was NOT already complete in the previous state
                // 4. It's now complete
                if (foundCorrespondingTask &&
                    wasTaskBefore &&
                    !completedTaskRegex.test(originalLineText)) {
                    const editorInfo = tr.startState.field(editorInfoField);
                    const filePath = ((_a = editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.file) === null || _a === void 0 ? void 0 : _a.path) || "unknown file";
                    // Parse the task details using the utility function
                    const task = parseTaskLine(filePath, newLineText, newLine.number, // line numbers are 1-based
                    plugin.settings.preferMetadataFormat, // Use plugin setting for format preference
                    plugin // Pass plugin for configurable prefix support
                    );
                    console.log(task);
                    // Trigger a custom event and also ensure WriteAPI handles completion side-effects (completion date + recurrence)
                    if (task) {
                        console.log("trigger task-completed event");
                        debounceTrigger(app, task);
                        // Best-effort: if we can identify the taskId, call WriteAPI to append completion metadata and create next recurring instance
                        try {
                            if (plugin.writeAPI) {
                                // Prefer parsed id; fallback to file+line pattern used by indexer
                                const taskId = task.id || `${filePath}-L${newLine.number}`;
                                void plugin.writeAPI.updateTask({
                                    taskId,
                                    updates: {
                                        completed: true,
                                        status: "x",
                                        metadata: {
                                            completedDate: Date.now(),
                                        },
                                    },
                                });
                            }
                        }
                        catch (e) {
                            console.warn("completion-monitor: failed to call WriteAPI.updateTask for completion", e);
                        }
                    }
                    // Optimization: If we've confirmed completion for this line,
                    // no need to re-check it due to other changes within the same transaction.
                    // We break the inner loop (over lines) and continue to the next change set (iterChanges).
                    // Note: This assumes one completion per line per transaction is sufficient to log.
                    break;
                }
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi1tb25pdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tcGxldGlvbi1tb25pdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBTyxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQXFCLE1BQU0sbUJBQW1CLENBQUM7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDLENBQUMsd0JBQXdCO0FBR3RGLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQVEsRUFBRSxJQUFVLEVBQUUsRUFBRTtJQUN6RCxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMzRCxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFUjs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsR0FBUSxFQUNSLE1BQTZCO0lBRTdCLE9BQU8sV0FBVyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1FBQzlDLHVEQUF1RDtRQUN2RCxzQ0FBc0MsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELG9FQUFvRTtRQUNwRSxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxFQUFlO0lBQ3ZDLE1BQU0sT0FBTyxHQU9SLEVBQUUsQ0FBQztJQUVSLG1FQUFtRTtJQUNuRSxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFFcEIseUNBQXlDO0lBQ3pDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQzNE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LElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxRQUFRLEtBQUssT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dDQUM3QyxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO29DQUMvQixNQUFNO29DQUNOLE9BQU8sRUFBRTt3Q0FDUixTQUFTLEVBQUUsSUFBSTt3Q0FDZixNQUFNLEVBQUUsR0FBRzt3Q0FDWCxRQUFRLEVBQUU7NENBQ1QsYUFBYSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7eUNBQ2xCO3FDQUNSO2lDQUNELENBQUMsQ0FBQzs2QkFDSDt5QkFDRDt3QkFBQyxPQUFPLENBQUMsRUFBRTs0QkFDWCxPQUFPLENBQUMsSUFBSSxDQUNYLHVFQUF1RSxFQUN2RSxDQUFDLENBQ0QsQ0FBQzt5QkFDRjtxQkFDRDtvQkFFRCw2REFBNkQ7b0JBQzdELDJFQUEyRTtvQkFDM0UsMEZBQTBGO29CQUMxRixtRkFBbUY7b0JBQ25GLE1BQU07aUJBQ047YUFDRDtTQUNEO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBkZWJvdW5jZSwgZWRpdG9ySW5mb0ZpZWxkIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEVkaXRvclN0YXRlLCBUcmFuc2FjdGlvbiwgVGV4dCB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7IC8vIEFkanVzdCBwYXRoIGlmIG5lZWRlZFxyXG5pbXBvcnQgeyBwYXJzZVRhc2tMaW5lIH0gZnJvbSBcIkAvdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjsgLy8gQWRqdXN0IHBhdGggaWYgbmVlZGVkXHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcblxyXG5jb25zdCBkZWJvdW5jZVRyaWdnZXIgPSBkZWJvdW5jZSgoYXBwOiBBcHAsIHRhc2s6IFRhc2spID0+IHtcclxuXHRhcHAud29ya3NwYWNlLnRyaWdnZXIoXCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLCB0YXNrKTtcclxufSwgMjAwKTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuIGVkaXRvciBleHRlbnNpb24gdGhhdCBtb25pdG9ycyB0YXNrIGNvbXBsZXRpb24gZXZlbnRzLlxyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIEFuIGVkaXRvciBleHRlbnNpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtb25pdG9yVGFza0NvbXBsZXRlZEV4dGVuc2lvbihcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pIHtcclxuXHRyZXR1cm4gRWRpdG9yU3RhdGUudHJhbnNhY3Rpb25GaWx0ZXIub2YoKHRyKSA9PiB7XHJcblx0XHQvLyBIYW5kbGUgdGhlIHRyYW5zYWN0aW9uIHRvIGNoZWNrIGZvciB0YXNrIGNvbXBsZXRpb25zXHJcblx0XHRoYW5kbGVNb25pdG9yVGFza0NvbXBsZXRpb25UcmFuc2FjdGlvbih0ciwgYXBwLCBwbHVnaW4pO1xyXG5cdFx0Ly8gQWx3YXlzIHJldHVybiB0aGUgb3JpZ2luYWwgdHJhbnNhY3Rpb24sIGFzIHdlIGFyZSBvbmx5IG1vbml0b3JpbmdcclxuXHRcdHJldHVybiB0cjtcclxuXHR9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVjdHMgaWYgYSB0cmFuc2FjdGlvbiByZXByZXNlbnRzIGEgbW92ZSBvcGVyYXRpb24gKGxpbmUgcmVvcmRlcmluZylcclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBjaGVja1xyXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoaXMgYXBwZWFycyB0byBiZSBhIG1vdmUgb3BlcmF0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBpc01vdmVPcGVyYXRpb24odHI6IFRyYW5zYWN0aW9uKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgY2hhbmdlczogQXJyYXk8e1xyXG5cdFx0dHlwZTogXCJkZWxldGVcIiB8IFwiaW5zZXJ0XCI7XHJcblx0XHRjb250ZW50OiBzdHJpbmc7XHJcblx0XHRmcm9tQTogbnVtYmVyO1xyXG5cdFx0dG9BOiBudW1iZXI7XHJcblx0XHRmcm9tQjogbnVtYmVyO1xyXG5cdFx0dG9COiBudW1iZXI7XHJcblx0fT4gPSBbXTtcclxuXHJcblx0Ly8gQ291bnQgdGhlIG51bWJlciBvZiBjaGFuZ2VzIHRvIGRldGVybWluZSBpZiB0aGlzIGNvdWxkIGJlIGEgbW92ZVxyXG5cdGxldCBjaGFuZ2VDb3VudCA9IDA7XHJcblxyXG5cdC8vIENvbGxlY3QgYWxsIGNoYW5nZXMgaW4gdGhlIHRyYW5zYWN0aW9uXHJcblx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdGNoYW5nZUNvdW50Kys7XHJcblxyXG5cdFx0Ly8gUmVjb3JkIGRlbGV0aW9uc1xyXG5cdFx0aWYgKGZyb21BIDwgdG9BKSB7XHJcblx0XHRcdGNvbnN0IGRlbGV0ZWRUZXh0ID0gdHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoZnJvbUEsIHRvQSk7XHJcblx0XHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0dHlwZTogXCJkZWxldGVcIixcclxuXHRcdFx0XHRjb250ZW50OiBkZWxldGVkVGV4dCxcclxuXHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHR0b0EsXHJcblx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0dG9CLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWNvcmQgaW5zZXJ0aW9uc1xyXG5cdFx0aWYgKGluc2VydGVkLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHR0eXBlOiBcImluc2VydFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IGluc2VydGVkLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0ZnJvbUEsXHJcblx0XHRcdFx0dG9BLFxyXG5cdFx0XHRcdGZyb21CLFxyXG5cdFx0XHRcdHRvQixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIFNpbXBsZSBlZGl0cyAobGlrZSBjaGFuZ2luZyBhIHNpbmdsZSBjaGFyYWN0ZXIpIGFyZSB1bmxpa2VseSB0byBiZSBtb3Zlc1xyXG5cdC8vIE1vc3Qgc2luZ2xlLWNoYXJhY3RlciB0YXNrIHN0YXR1cyBjaGFuZ2VzIGludm9sdmUgb25seSAxIGNoYW5nZVxyXG5cdGlmIChjaGFuZ2VDb3VudCA8PSAxKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB3ZSBoYXZlIGJvdGggZGVsZXRpb25zIGFuZCBpbnNlcnRpb25zXHJcblx0Y29uc3QgZGVsZXRpb25zID0gY2hhbmdlcy5maWx0ZXIoKGMpID0+IGMudHlwZSA9PT0gXCJkZWxldGVcIik7XHJcblx0Y29uc3QgaW5zZXJ0aW9ucyA9IGNoYW5nZXMuZmlsdGVyKChjKSA9PiBjLnR5cGUgPT09IFwiaW5zZXJ0XCIpO1xyXG5cclxuXHRpZiAoZGVsZXRpb25zLmxlbmd0aCA9PT0gMCB8fCBpbnNlcnRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gRm9yIGEgbW92ZSBvcGVyYXRpb24sIHdlIHR5cGljYWxseSBleHBlY3Q6XHJcblx0Ly8gMS4gTXVsdGlwbGUgY2hhbmdlcyAoZGVsZXRpb24gKyBpbnNlcnRpb24pXHJcblx0Ly8gMi4gVGhlIGRlbGV0ZWQgYW5kIGluc2VydGVkIGNvbnRlbnQgc2hvdWxkIGJlIHN1YnN0YW50aWFsIChub3QganVzdCBhIGNoYXJhY3RlcilcclxuXHQvLyAzLiBUaGUgY29udGVudCBzaG91bGQgbWF0Y2ggZXhhY3RseVxyXG5cclxuXHQvLyBDaGVjayBpZiBhbnkgZGVsZXRlZCBjb250ZW50IG1hdGNoZXMgYW55IGluc2VydGVkIGNvbnRlbnRcclxuXHRmb3IgKGNvbnN0IGRlbGV0aW9uIG9mIGRlbGV0aW9ucykge1xyXG5cdFx0Zm9yIChjb25zdCBpbnNlcnRpb24gb2YgaW5zZXJ0aW9ucykge1xyXG5cdFx0XHQvLyBTa2lwIGlmIHRoZSBjb250ZW50IGlzIHRvbyBzaG9ydCAobGlrZWx5IGEgc3RhdHVzIGNoYXJhY3RlciBjaGFuZ2UpXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRkZWxldGlvbi5jb250ZW50LnRyaW0oKS5sZW5ndGggPCAxMCB8fFxyXG5cdFx0XHRcdGluc2VydGlvbi5jb250ZW50LnRyaW0oKS5sZW5ndGggPCAxMFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIGV4YWN0IG1hdGNoXHJcblx0XHRcdGNvbnN0IGRlbGV0ZWRMaW5lcyA9IGRlbGV0aW9uLmNvbnRlbnRcclxuXHRcdFx0XHQuc3BsaXQoXCJcXG5cIilcclxuXHRcdFx0XHQuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKSk7XHJcblx0XHRcdGNvbnN0IGluc2VydGVkTGluZXMgPSBpbnNlcnRpb24uY29udGVudFxyXG5cdFx0XHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRkZWxldGVkTGluZXMubGVuZ3RoID09PSBpbnNlcnRlZExpbmVzLmxlbmd0aCAmJlxyXG5cdFx0XHRcdGRlbGV0ZWRMaW5lcy5sZW5ndGggPiAwXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGxldCBpc01hdGNoID0gdHJ1ZTtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGRlbGV0ZWRMaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0Ly8gQ29tcGFyZSBjb250ZW50IHdpdGhvdXQgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSB0YXNrIHN0cnVjdHVyZVxyXG5cdFx0XHRcdFx0Y29uc3QgZGVsZXRlZExpbmUgPSBkZWxldGVkTGluZXNbaV0udHJpbSgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5zZXJ0ZWRMaW5lID0gaW5zZXJ0ZWRMaW5lc1tpXS50cmltKCk7XHJcblx0XHRcdFx0XHRpZiAoZGVsZXRlZExpbmUgIT09IGluc2VydGVkTGluZSkge1xyXG5cdFx0XHRcdFx0XHRpc01hdGNoID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgd2UgZm91bmQgYSBzdWJzdGFudGlhbCBjb250ZW50IG1hdGNoLCB0aGlzIGlzIGxpa2VseSBhIG1vdmVcclxuXHRcdFx0XHRpZiAoaXNNYXRjaCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVzIHRyYW5zYWN0aW9ucyB0byBkZXRlY3Qgd2hlbiBhIHRhc2sgaXMgbWFya2VkIGFzIGNvbXBsZXRlZC5cclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBoYW5kbGVcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlTW9uaXRvclRhc2tDb21wbGV0aW9uVHJhbnNhY3Rpb24oXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbikge1xyXG5cdC8vIE9ubHkgcHJvY2VzcyB0cmFuc2FjdGlvbnMgdGhhdCBjaGFuZ2UgdGhlIGRvY3VtZW50XHJcblx0aWYgKCF0ci5kb2NDaGFuZ2VkKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zb2xlLmxvZyhcIm1vbml0b3JUYXNrQ29tcGxldGVkRXh0ZW5zaW9uXCIsIHRyLmNoYW5nZXMpO1xyXG5cclxuXHRpZiAodHIuaXNVc2VyRXZlbnQoXCJzZXRcIikgJiYgdHIuY2hhbmdlcy5sZW5ndGggPiAxKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHRpZiAodHIuaXNVc2VyRXZlbnQoXCJpbnB1dC5wYXN0ZVwiKSkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gU2tpcCBpZiB0aGlzIGxvb2tzIGxpa2UgYSBtb3ZlIG9wZXJhdGlvbiAoZGVsZXRlICsgaW5zZXJ0IG9mIHNhbWUgY29udGVudClcclxuXHRpZiAoaXNNb3ZlT3BlcmF0aW9uKHRyKSkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Ly8gUmVnZXggdG8gaWRlbnRpZnkgYSBjb21wbGV0ZWQgdGFzayBsaW5lXHJcblx0Y29uc3QgY29tcGxldGVkVGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzK1xcW1t4WF1cXF0vO1xyXG5cdC8vIFJlZ2V4IHRvIGlkZW50aWZ5IGFueSB0YXNrIGxpbmUgKHRvIGNoZWNrIHRoZSBwcmV2aW91cyBzdGF0ZSlcclxuXHRjb25zdCBhbnlUYXNrUmVnZXggPSAvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHMrXFxbLlxcXS87XHJcblxyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EsIGZyb21CLCB0b0IsIGluc2VydGVkKSA9PiB7XHJcblx0XHQvLyBPbmx5IHByb2Nlc3MgYWN0dWFsIGluc2VydGlvbnMgdGhhdCBtaWdodCBjb250YWluIGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0aWYgKGluc2VydGVkLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHRoZSByYW5nZSBvZiBsaW5lcyBhZmZlY3RlZCBieSB0aGUgY2hhbmdlIGluIHRoZSBuZXcgZG9jdW1lbnQgc3RhdGVcclxuXHRcdGNvbnN0IGFmZmVjdGVkTGluZXNTdGFydCA9IHRyLm5ld0RvYy5saW5lQXQoZnJvbUIpLm51bWJlcjtcclxuXHRcdC8vIENoZWNrIHRoZSBsaW5lIHdoZXJlIHRoZSBjaGFuZ2UgZW5kcywgaW4gY2FzZSB0aGUgY2hhbmdlIHNwYW5zIGxpbmVzIG9yIGFkZHMgbmV3IGxpbmVzXHJcblx0XHRjb25zdCBhZmZlY3RlZExpbmVzRW5kID0gdHIubmV3RG9jLmxpbmVBdCh0b0IpLm51bWJlcjtcclxuXHJcblx0XHQvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBsaW5lIHBvdGVudGlhbGx5IGFmZmVjdGVkIGJ5IHRoaXMgY2hhbmdlXHJcblx0XHRmb3IgKGxldCBpID0gYWZmZWN0ZWRMaW5lc1N0YXJ0OyBpIDw9IGFmZmVjdGVkTGluZXNFbmQ7IGkrKykge1xyXG5cdFx0XHQvLyBFbnN1cmUgdGhlIGxpbmUgbnVtYmVyIGlzIHZhbGlkIGluIHRoZSBuZXcgZG9jdW1lbnRcclxuXHRcdFx0aWYgKGkgPiB0ci5uZXdEb2MubGluZXMpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3QgbmV3TGluZSA9IHRyLm5ld0RvYy5saW5lKGkpO1xyXG5cdFx0XHRjb25zdCBuZXdMaW5lVGV4dCA9IG5ld0xpbmUudGV4dDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBsaW5lIGluIHRoZSBuZXcgc3RhdGUgcmVwcmVzZW50cyBhIGNvbXBsZXRlZCB0YXNrXHJcblx0XHRcdGlmIChjb21wbGV0ZWRUYXNrUmVnZXgudGVzdChuZXdMaW5lVGV4dCkpIHtcclxuXHRcdFx0XHRsZXQgb3JpZ2luYWxMaW5lVGV4dCA9IFwiXCI7XHJcblx0XHRcdFx0bGV0IHdhc1Rhc2tCZWZvcmUgPSBmYWxzZTtcclxuXHRcdFx0XHRsZXQgZm91bmRDb3JyZXNwb25kaW5nVGFzayA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHQvLyBGaXJzdCwgdHJ5IHRvIGZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgdGFzayBpbiBkZWxldGVkIGNvbnRlbnRcclxuXHRcdFx0XHR0ci5jaGFuZ2VzLml0ZXJDaGFuZ2VzKFxyXG5cdFx0XHRcdFx0KG9sZEZyb21BLCBvbGRUb0EsIG9sZEZyb21CLCBvbGRUb0IsIG9sZEluc2VydGVkKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIExvb2sgZm9yIGRlbGV0aW9ucyB0aGF0IG1pZ2h0IGNvcnJlc3BvbmQgdG8gdGhpcyBpbnNlcnRpb25cclxuXHRcdFx0XHRcdFx0aWYgKG9sZEZyb21BIDwgb2xkVG9BICYmICFmb3VuZENvcnJlc3BvbmRpbmdUYXNrKSB7XHJcblx0XHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRlbGV0ZWRUZXh0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0b2xkRnJvbUEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0b2xkVG9BXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBkZWxldGVkTGluZXMgPSBkZWxldGVkVGV4dC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGRlbGV0ZWRMaW5lIG9mIGRlbGV0ZWRMaW5lcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkZWxldGVkVGFza01hdGNoID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWxldGVkTGluZS5tYXRjaChhbnlUYXNrUmVnZXgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZGVsZXRlZFRhc2tNYXRjaCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIENvbXBhcmUgdGhlIHRhc2sgY29udGVudCAod2l0aG91dCBzdGF0dXMpIHRvIHNlZSBpZiBpdCdzIHRoZSBzYW1lIHRhc2tcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBuZXdUYXNrQ29udGVudCA9IG5ld0xpbmVUZXh0XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucmVwbGFjZShhbnlUYXNrUmVnZXgsIFwiXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQudHJpbSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRlbGV0ZWRUYXNrQ29udGVudCA9IGRlbGV0ZWRMaW5lXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucmVwbGFjZShhbnlUYXNrUmVnZXgsIFwiXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgY29udGVudCBtYXRjaGVzLCB0aGlzIGlzIGxpa2VseSB0aGUgc2FtZSB0YXNrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3VGFza0NvbnRlbnQgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWxldGVkVGFza0NvbnRlbnRcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9yaWdpbmFsTGluZVRleHQgPSBkZWxldGVkTGluZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHdhc1Rhc2tCZWZvcmUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Zm91bmRDb3JyZXNwb25kaW5nVGFzayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJZ25vcmUgZXJyb3JzIHdoZW4gdHJ5aW5nIHRvIGdldCBkZWxldGVkIHRleHRcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBJZiB3ZSBjb3VsZG4ndCBmaW5kIGEgY29ycmVzcG9uZGluZyB0YXNrIGluIGRlbGV0aW9ucywgdHJ5IHRoZSBvcmlnaW5hbCBtZXRob2RcclxuXHRcdFx0XHRpZiAoIWZvdW5kQ29ycmVzcG9uZGluZ1Rhc2spIHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdC8vIE1hcCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjdXJyZW50IGxpbmUgaW4gdGhlIG5ldyBkb2MgYmFjayB0byB0aGUgb3JpZ2luYWwgZG9jXHJcblx0XHRcdFx0XHRcdC8vIFVzZSAtMSBiaWFzIHRvIHByZWZlciBtYXBwaW5nIHRvIHRoZSBzdGF0ZSAqYmVmb3JlKiB0aGUgY2hhcmFjdGVyIHdhcyBpbnNlcnRlZFxyXG5cdFx0XHRcdFx0XHRjb25zdCBvcmlnaW5hbFBvcyA9IHRyLmNoYW5nZXMubWFwUG9zKG5ld0xpbmUuZnJvbSwgLTEpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKG9yaWdpbmFsUG9zICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ2luYWxMaW5lID1cclxuXHRcdFx0XHRcdFx0XHRcdHRyLnN0YXJ0U3RhdGUuZG9jLmxpbmVBdChvcmlnaW5hbFBvcyk7XHJcblx0XHRcdFx0XHRcdFx0b3JpZ2luYWxMaW5lVGV4dCA9IG9yaWdpbmFsTGluZS50ZXh0O1xyXG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBvcmlnaW5hbCBsaW5lIHdhcyBhIHRhc2sgKG9mIGFueSBzdGF0dXMpXHJcblx0XHRcdFx0XHRcdFx0d2FzVGFza0JlZm9yZSA9IGFueVRhc2tSZWdleC50ZXN0KG9yaWdpbmFsTGluZVRleHQpO1xyXG5cdFx0XHRcdFx0XHRcdGZvdW5kQ29ycmVzcG9uZGluZ1Rhc2sgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdC8vIElnbm9yZSBlcnJvcnMgaWYgdGhlIGxpbmUgZGlkbid0IGV4aXN0IG9yIGNoYW5nZWQgZHJhc3RpY2FsbHlcclxuXHRcdFx0XHRcdFx0Ly8gY29uc29sZS53YXJuKFwiQ291bGQgbm90IGdldCBvcmlnaW5hbCBsaW5lIHN0YXRlIGZvciBjb21wbGV0aW9uIGNoZWNrOlwiLCBlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIExvZyBjb21wbGV0aW9uIG9ubHkgaWY6XHJcblx0XHRcdFx0Ly8gMS4gV2UgZm91bmQgYSBjb3JyZXNwb25kaW5nIHRhc2sgaW4gdGhlIG9yaWdpbmFsIHN0YXRlXHJcblx0XHRcdFx0Ly8gMi4gVGhlIGxpbmUgd2FzIGEgdGFzayBiZWZvcmVcclxuXHRcdFx0XHQvLyAzLiBJdCB3YXMgTk9UIGFscmVhZHkgY29tcGxldGUgaW4gdGhlIHByZXZpb3VzIHN0YXRlXHJcblx0XHRcdFx0Ly8gNC4gSXQncyBub3cgY29tcGxldGVcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRmb3VuZENvcnJlc3BvbmRpbmdUYXNrICYmXHJcblx0XHRcdFx0XHR3YXNUYXNrQmVmb3JlICYmXHJcblx0XHRcdFx0XHQhY29tcGxldGVkVGFza1JlZ2V4LnRlc3Qob3JpZ2luYWxMaW5lVGV4dClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRvckluZm8gPSB0ci5zdGFydFN0YXRlLmZpZWxkKGVkaXRvckluZm9GaWVsZCk7XHJcblx0XHRcdFx0XHRjb25zdCBmaWxlUGF0aCA9IGVkaXRvckluZm8/LmZpbGU/LnBhdGggfHwgXCJ1bmtub3duIGZpbGVcIjtcclxuXHJcblx0XHRcdFx0XHQvLyBQYXJzZSB0aGUgdGFzayBkZXRhaWxzIHVzaW5nIHRoZSB1dGlsaXR5IGZ1bmN0aW9uXHJcblx0XHRcdFx0XHRjb25zdCB0YXNrID0gcGFyc2VUYXNrTGluZShcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdG5ld0xpbmVUZXh0LFxyXG5cdFx0XHRcdFx0XHRuZXdMaW5lLm51bWJlciwgLy8gbGluZSBudW1iZXJzIGFyZSAxLWJhc2VkXHJcblx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCwgLy8gVXNlIHBsdWdpbiBzZXR0aW5nIGZvciBmb3JtYXQgcHJlZmVyZW5jZVxyXG5cdFx0XHRcdFx0XHRwbHVnaW4gLy8gUGFzcyBwbHVnaW4gZm9yIGNvbmZpZ3VyYWJsZSBwcmVmaXggc3VwcG9ydFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHRhc2spO1xyXG5cclxuXHRcdFx0XHRcdC8vIFRyaWdnZXIgYSBjdXN0b20gZXZlbnQgYW5kIGFsc28gZW5zdXJlIFdyaXRlQVBJIGhhbmRsZXMgY29tcGxldGlvbiBzaWRlLWVmZmVjdHMgKGNvbXBsZXRpb24gZGF0ZSArIHJlY3VycmVuY2UpXHJcblx0XHRcdFx0XHRpZiAodGFzaykge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcInRyaWdnZXIgdGFzay1jb21wbGV0ZWQgZXZlbnRcIik7XHJcblx0XHRcdFx0XHRcdGRlYm91bmNlVHJpZ2dlcihhcHAsIHRhc2spO1xyXG5cdFx0XHRcdFx0XHQvLyBCZXN0LWVmZm9ydDogaWYgd2UgY2FuIGlkZW50aWZ5IHRoZSB0YXNrSWQsIGNhbGwgV3JpdGVBUEkgdG8gYXBwZW5kIGNvbXBsZXRpb24gbWV0YWRhdGEgYW5kIGNyZWF0ZSBuZXh0IHJlY3VycmluZyBpbnN0YW5jZVxyXG5cdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChwbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFByZWZlciBwYXJzZWQgaWQ7IGZhbGxiYWNrIHRvIGZpbGUrbGluZSBwYXR0ZXJuIHVzZWQgYnkgaW5kZXhlclxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgdGFza0lkID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGFzay5pZCB8fCBgJHtmaWxlUGF0aH0tTCR7bmV3TGluZS5udW1iZXJ9YDtcclxuXHRcdFx0XHRcdFx0XHRcdHZvaWQgcGx1Z2luLndyaXRlQVBJLnVwZGF0ZVRhc2soe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9IGFzIGFueSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcdFwiY29tcGxldGlvbi1tb25pdG9yOiBmYWlsZWQgdG8gY2FsbCBXcml0ZUFQSS51cGRhdGVUYXNrIGZvciBjb21wbGV0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIE9wdGltaXphdGlvbjogSWYgd2UndmUgY29uZmlybWVkIGNvbXBsZXRpb24gZm9yIHRoaXMgbGluZSxcclxuXHRcdFx0XHRcdC8vIG5vIG5lZWQgdG8gcmUtY2hlY2sgaXQgZHVlIHRvIG90aGVyIGNoYW5nZXMgd2l0aGluIHRoZSBzYW1lIHRyYW5zYWN0aW9uLlxyXG5cdFx0XHRcdFx0Ly8gV2UgYnJlYWsgdGhlIGlubmVyIGxvb3AgKG92ZXIgbGluZXMpIGFuZCBjb250aW51ZSB0byB0aGUgbmV4dCBjaGFuZ2Ugc2V0IChpdGVyQ2hhbmdlcykuXHJcblx0XHRcdFx0XHQvLyBOb3RlOiBUaGlzIGFzc3VtZXMgb25lIGNvbXBsZXRpb24gcGVyIGxpbmUgcGVyIHRyYW5zYWN0aW9uIGlzIHN1ZmZpY2llbnQgdG8gbG9nLlxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuIl19