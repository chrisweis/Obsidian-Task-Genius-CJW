import { EditorState, } from "@codemirror/state";
import { taskStatusChangeAnnotation } from "../task-operations/status-switcher";
/**
 * Creates an editor extension that automatically manages dates based on task status changes
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function autoDateManagerExtension(app, plugin) {
    return EditorState.transactionFilter.of((tr) => {
        return handleAutoDateManagerTransaction(tr, app, plugin);
    });
}
/**
 * Handles transactions to detect task status changes and manage dates accordingly
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
function handleAutoDateManagerTransaction(tr, app, plugin) {
    var _a;
    // Only process transactions that change the document
    if (!tr.docChanged) {
        return tr;
    }
    // Skip if auto date management is disabled
    if (!((_a = plugin.settings.autoDateManager) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return tr;
    }
    // Skip if this transaction was triggered by auto date management itself
    const annotationValue = tr.annotation(taskStatusChangeAnnotation);
    if (typeof annotationValue === "string" &&
        annotationValue.includes("autoDateManager")) {
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
    const { doc, lineNumber, oldStatus, newStatus } = taskStatusChangeInfo;
    // Determine what date operations need to be performed
    const dateOperations = determineDateOperations(oldStatus, newStatus, plugin, doc.line(lineNumber).text);
    if (dateOperations.length === 0) {
        return tr;
    }
    // Apply date operations to the task line
    return applyDateOperations(tr, doc, lineNumber, dateOperations, plugin);
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
    let taskChangedInfo = null;
    // Check each change in the transaction
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Only process actual insertions that contain task markers
        if (inserted.length === 0) {
            return;
        }
        // Get the position context
        const pos = fromB;
        const newLine = tr.newDoc.lineAt(pos);
        const newLineText = newLine.text;
        // Check if this line contains a task marker
        const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/i;
        const newTaskMatch = newLineText.match(taskRegex);
        if (newTaskMatch) {
            const newStatus = newTaskMatch[2];
            let oldStatus = " ";
            // Try to find the corresponding old task status
            // First, check if there was a deletion in this transaction that might correspond
            let foundCorrespondingOldTask = false;
            tr.changes.iterChanges((oldFromA, oldToA, oldFromB, oldToB, oldInserted) => {
                // Look for deletions that might correspond to this insertion
                if (oldFromA < oldToA && !foundCorrespondingOldTask) {
                    try {
                        const deletedText = tr.startState.doc.sliceString(oldFromA, oldToA);
                        const deletedLines = deletedText.split("\n");
                        for (const deletedLine of deletedLines) {
                            const oldTaskMatch = deletedLine.match(taskRegex);
                            if (oldTaskMatch) {
                                // Compare the task content (without status) to see if it's the same task
                                const newTaskContent = newLineText
                                    .replace(taskRegex, "")
                                    .trim();
                                const oldTaskContent = deletedLine
                                    .replace(taskRegex, "")
                                    .trim();
                                // If the content matches, this is likely the same task
                                if (newTaskContent === oldTaskContent) {
                                    oldStatus = oldTaskMatch[2];
                                    foundCorrespondingOldTask = true;
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
            // If we couldn't find a corresponding old task, try the original method
            if (!foundCorrespondingOldTask) {
                try {
                    // Check if the change is actually modifying the task status character
                    const taskStatusStart = newLineText.indexOf("[") + 1;
                    const taskStatusEnd = newLineText.indexOf("]");
                    // Only proceed if the change affects the task status area
                    if (fromB <= newLine.from + taskStatusEnd &&
                        toB >= newLine.from + taskStatusStart) {
                        const oldPos = fromA;
                        if (oldPos >= 0 &&
                            oldPos < tr.startState.doc.length) {
                            const oldLine = tr.startState.doc.lineAt(oldPos);
                            const oldTaskMatch = oldLine.text.match(taskRegex);
                            if (oldTaskMatch) {
                                oldStatus = oldTaskMatch[2];
                                foundCorrespondingOldTask = true;
                            }
                        }
                    }
                }
                catch (e) {
                    // Line might not exist in old document
                }
            }
            // Only process if we found a corresponding old task and the status actually changed
            if (foundCorrespondingOldTask && oldStatus !== newStatus) {
                taskChangedInfo = {
                    doc: tr.newDoc,
                    lineNumber: newLine.number,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                };
            }
        }
    });
    return taskChangedInfo;
}
/**
 * Determines what date operations need to be performed based on status change
 * @param oldStatus The old task status
 * @param newStatus The new task status
 * @param plugin The plugin instance
 * @param lineText The current line text to check for existing dates
 * @returns Array of date operations to perform
 */
function determineDateOperations(oldStatus, newStatus, plugin, lineText) {
    const operations = [];
    const settings = plugin.settings.autoDateManager;
    if (!settings)
        return operations;
    const oldStatusType = getStatusType(oldStatus, plugin);
    const newStatusType = getStatusType(newStatus, plugin);
    // If status types are the same, no date operations needed
    if (oldStatusType === newStatusType) {
        return operations;
    }
    // Remove old status date if it exists and is managed (but never remove start date)
    if (settings.manageCompletedDate && oldStatusType === "completed") {
        operations.push({
            type: "remove",
            dateType: "completed",
        });
    }
    if (settings.manageCancelledDate && oldStatusType === "abandoned") {
        operations.push({
            type: "remove",
            dateType: "cancelled",
        });
    }
    // Add new status date if it should be managed and doesn't already exist
    if (settings.manageCompletedDate && newStatusType === "completed") {
        operations.push({
            type: "add",
            dateType: "completed",
            format: settings.completedDateFormat || "YYYY-MM-DD",
        });
    }
    if (settings.manageStartDate && newStatusType === "inProgress") {
        // Only add start date if it doesn't already exist
        if (!hasExistingDate(lineText, "start", plugin)) {
            operations.push({
                type: "add",
                dateType: "start",
                format: settings.startDateFormat || "YYYY-MM-DD",
            });
        }
    }
    if (settings.manageCancelledDate && newStatusType === "abandoned") {
        operations.push({
            type: "add",
            dateType: "cancelled",
            format: settings.cancelledDateFormat || "YYYY-MM-DD",
        });
    }
    return operations;
}
/**
 * Checks if a specific date type already exists in the line
 * @param lineText The task line text
 * @param dateType The type of date to check for
 * @param plugin The plugin instance
 * @returns True if the date already exists
 */
function hasExistingDate(lineText, dateType, plugin) {
    const useDataviewFormat = plugin.settings.preferMetadataFormat === "dataview";
    if (useDataviewFormat) {
        const fieldName = dateType === "start" ? "start" : dateType;
        const pattern = new RegExp(`\\[${fieldName}::\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?\\]`);
        return pattern.test(lineText);
    }
    else {
        const dateMarker = getDateMarker(dateType, plugin);
        const pattern = new RegExp(`${escapeRegex(dateMarker)}\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?`);
        return pattern.test(lineText);
    }
}
/**
 * Gets the status type (completed, inProgress, etc.) for a given status character
 * @param status The status character
 * @param plugin The plugin instance
 * @returns The status type
 */
function getStatusType(status, plugin) {
    const taskStatuses = plugin.settings.taskStatuses;
    if (taskStatuses.completed.split("|").includes(status)) {
        return "completed";
    }
    if (taskStatuses.inProgress.split("|").includes(status)) {
        return "inProgress";
    }
    if (taskStatuses.abandoned.split("|").includes(status)) {
        return "abandoned";
    }
    if (taskStatuses.planned.split("|").includes(status)) {
        return "planned";
    }
    if (taskStatuses.notStarted.split("|").includes(status)) {
        return "notStarted";
    }
    return "unknown";
}
/**
 * Applies date operations to the task line
 * @param tr The transaction
 * @param doc The document
 * @param lineNumber The line number of the task
 * @param operations The date operations to perform
 * @param plugin The plugin instance
 * @returns The modified transaction
 */
function applyDateOperations(tr, doc, lineNumber, operations, plugin) {
    // IMPORTANT: Use the NEW document state, not the old one
    const line = tr.newDoc.line(lineNumber);
    let lineText = line.text;
    const changes = [];
    console.log(`[AutoDateManager] applyDateOperations - Working with line: "${lineText}"`);
    for (const operation of operations) {
        if (operation.type === "add") {
            // Add a new date
            const dateString = formatDate(operation.format);
            const dateMarker = getDateMarker(operation.dateType, plugin);
            const useDataviewFormat = plugin.settings.preferMetadataFormat === "dataview";
            let dateText;
            if (useDataviewFormat) {
                dateText = ` ${dateMarker}${dateString}]`;
            }
            else {
                dateText = ` ${dateMarker} ${dateString}`;
            }
            // Find the appropriate insert position based on date type
            let insertPosition;
            if (operation.dateType === "completed") {
                // Completed date goes at the end (before block reference ID)
                insertPosition = findCompletedDateInsertPosition(lineText, plugin);
            }
            else {
                // Start date and cancelled date go after existing metadata but before completed date
                insertPosition = findMetadataInsertPosition(lineText, plugin, operation.dateType);
            }
            const absolutePosition = line.from + insertPosition;
            console.log(`[AutoDateManager] Inserting ${operation.dateType} date:`);
            console.log(`  - Insert position (relative): ${insertPosition}`);
            console.log(`  - Line.from: ${line.from}`);
            console.log(`  - Absolute position: ${absolutePosition}`);
            console.log(`  - Date text: "${dateText}"`);
            console.log(`  - Text at insert point: "${lineText.substring(insertPosition)}"`);
            changes.push({
                from: absolutePosition,
                to: absolutePosition,
                insert: dateText,
            });
            // Update lineText for subsequent operations
            lineText =
                lineText.slice(0, insertPosition) +
                    dateText +
                    lineText.slice(insertPosition);
        }
        else if (operation.type === "remove") {
            // Remove existing date
            const useDataviewFormat = plugin.settings.preferMetadataFormat === "dataview";
            let datePattern;
            if (useDataviewFormat) {
                // For dataview format: [completion::2024-01-01] or [cancelled::2024-01-01]
                const fieldName = operation.dateType === "completed"
                    ? "completion"
                    : operation.dateType === "cancelled"
                        ? "cancelled"
                        : "unknown";
                datePattern = new RegExp(`\\s*\\[${fieldName}::\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?\\]`, "g");
            }
            else {
                // For emoji format: ✅ 2024-01-01 or ❌ 2024-01-01
                const dateMarker = getDateMarker(operation.dateType, plugin);
                datePattern = new RegExp(`\\s*${escapeRegex(dateMarker)}\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?`, "g");
            }
            // Find all matches and remove them (there might be multiple instances)
            // Work with the full lineText
            let match;
            const matchesToRemove = [];
            datePattern.lastIndex = 0; // Reset regex state
            while ((match = datePattern.exec(lineText)) !== null) {
                matchesToRemove.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                });
            }
            // Process matches in reverse order to maintain correct positions
            for (let i = matchesToRemove.length - 1; i >= 0; i--) {
                const matchToRemove = matchesToRemove[i];
                const absoluteFrom = line.from + matchToRemove.start;
                const absoluteTo = line.from + matchToRemove.end;
                changes.push({
                    from: absoluteFrom,
                    to: absoluteTo,
                    insert: "",
                });
                // Update lineText for subsequent operations
                lineText =
                    lineText.slice(0, matchToRemove.start) +
                        lineText.slice(matchToRemove.end);
            }
        }
    }
    if (changes.length > 0) {
        return {
            changes: [tr.changes, ...changes],
            selection: tr.selection,
            annotations: [
                taskStatusChangeAnnotation.of("autoDateManager.dateUpdate"),
            ],
        };
    }
    return tr;
}
/**
 * Formats a date according to the specified format
 * @param format The date format string
 * @returns The formatted date string
 */
function formatDate(format) {
    const now = new Date();
    // Simple date formatting - you might want to use a more robust library
    return format
        .replace("YYYY", now.getFullYear().toString())
        .replace("MM", (now.getMonth() + 1).toString().padStart(2, "0"))
        .replace("DD", now.getDate().toString().padStart(2, "0"))
        .replace("HH", now.getHours().toString().padStart(2, "0"))
        .replace("mm", now.getMinutes().toString().padStart(2, "0"))
        .replace("ss", now.getSeconds().toString().padStart(2, "0"));
}
/**
 * Gets the date marker for a specific date type based on metadata format
 * @param dateType The type of date (completed, start, cancelled)
 * @param plugin The plugin instance
 * @returns The date marker string
 */
function getDateMarker(dateType, plugin) {
    const settings = plugin.settings.autoDateManager;
    const useDataviewFormat = plugin.settings.preferMetadataFormat === "dataview";
    if (!settings)
        return "📅";
    switch (dateType) {
        case "completed":
            if (useDataviewFormat) {
                return "[completion::";
            }
            return settings.completedDateMarker || "✅";
        case "start":
            if (useDataviewFormat) {
                return "[start::";
            }
            return settings.startDateMarker || "🚀";
        case "cancelled":
            if (useDataviewFormat) {
                return "[cancelled::";
            }
            return settings.cancelledDateMarker || "❌";
        default:
            return "📅";
    }
}
/**
 * Finds the position where metadata (start date, cancelled date, etc.) should be inserted
 * @param lineText The task line text
 * @param plugin The plugin instance
 * @param dateType The type of date being inserted
 * @returns The position index where the metadata should be inserted
 */
function findMetadataInsertPosition(lineText, plugin, dateType) {
    // Work with the full line text, don't extract block reference yet
    const blockRef = detectBlockReference(lineText);
    // Find the task marker and status
    const taskMatch = lineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]\s*/);
    if (!taskMatch)
        return blockRef ? blockRef.index : lineText.length;
    // Start position is right after the task checkbox
    let position = taskMatch[0].length;
    // Find the actual end of task content by scanning through the text
    // This handles content with special characters, links, etc.
    let contentEnd = position;
    let inLink = 0; // Track nested [[links]]
    let inDataview = false; // Track [field:: value] metadata
    const remainingText = lineText.slice(position);
    for (let i = 0; i < remainingText.length; i++) {
        const char = remainingText[i];
        const nextChar = remainingText[i + 1];
        const twoChars = char + (nextChar || '');
        // Handle [[wiki links]] - they are part of content
        if (twoChars === '[[') {
            inLink++;
            contentEnd = position + i + 2;
            i++; // Skip next char
            continue;
        }
        if (twoChars === ']]' && inLink > 0) {
            inLink--;
            contentEnd = position + i + 2;
            i++; // Skip next char
            continue;
        }
        // If we're inside a link, everything is content
        if (inLink > 0) {
            contentEnd = position + i + 1;
            continue;
        }
        // Check for dataview metadata [field:: value]
        if (char === '[' && !inDataview) {
            const afterBracket = remainingText.slice(i + 1);
            if (afterBracket.match(/^[a-zA-Z]+::/)) {
                // This is dataview metadata, stop here
                break;
            }
        }
        // Check for tags (only if preceded by whitespace or at start)
        if (char === '#') {
            if (i === 0 || remainingText[i - 1] === ' ' || remainingText[i - 1] === '\t') {
                // Check if this is actually a tag (followed by word characters)
                const afterHash = remainingText.slice(i + 1);
                if (afterHash.match(/^[\w-]+/)) {
                    // This is a tag, stop here
                    break;
                }
            }
        }
        // Check for date emojis (these are metadata markers)
        const dateEmojis = ['📅', '🚀', '✅', '❌', '🛫', '▶️', '⏰', '🏁'];
        if (dateEmojis.includes(char)) {
            // Check if this is followed by a date pattern
            const afterEmoji = remainingText.slice(i + 1);
            if (afterEmoji.match(/^\s*\d{4}-\d{2}-\d{2}/)) {
                // This is a date marker, stop here
                break;
            }
        }
        // Regular content character
        contentEnd = position + i + 1;
    }
    position = contentEnd;
    // Trim trailing whitespace
    while (position > taskMatch[0].length && lineText[position - 1] === ' ') {
        position--;
    }
    // For cancelled date, we need special handling to insert after start dates if present
    if (dateType === "cancelled") {
        const useDataviewFormat = plugin.settings.preferMetadataFormat === "dataview";
        // Look for existing start date
        let startDateFound = false;
        if (useDataviewFormat) {
            const startDateMatch = lineText.match(/\[start::[^\]]*\]/);
            if (startDateMatch && startDateMatch.index !== undefined) {
                position = startDateMatch.index + startDateMatch[0].length;
                startDateFound = true;
            }
        }
        else {
            // First try with the configured start marker
            const startMarker = getDateMarker("start", plugin);
            const escapedStartMarker = escapeRegex(startMarker);
            const startDatePattern = new RegExp(`${escapedStartMarker}\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?`);
            let startDateMatch = lineText.match(startDatePattern);
            // If not found, look for any common start date emoji patterns
            if (!startDateMatch) {
                // Common start date emojis: 🚀, 🛫, ▶️, ⏰, 🏁
                const commonStartEmojis = ["🚀", "🛫", "▶️", "⏰", "🏁"];
                for (const emoji of commonStartEmojis) {
                    const pattern = new RegExp(`${escapeRegex(emoji)}\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?`);
                    startDateMatch = lineText.match(pattern);
                    if (startDateMatch) {
                        break;
                    }
                }
            }
            if (startDateMatch && startDateMatch.index !== undefined) {
                position = startDateMatch.index + startDateMatch[0].length;
                startDateFound = true;
            }
        }
        // If no start date found, position is already correct from initial parsing
        // It points to the end of content before metadata
    }
    else if (dateType === "completed") {
        // For completed date, we want to go to the end of the line (before block reference)
        // This is different from cancelled/start dates which go after content/metadata
        position = lineText.length;
        // If there's a block reference, insert before it
        if (blockRef) {
            position = blockRef.index;
            // Remove trailing space if exists
            if (position > 0 && lineText[position - 1] === " ") {
                position--;
            }
        }
    }
    else {
        // For start date, the position has already been calculated correctly
        // in the initial content parsing above
        // No additional processing needed
    }
    // Ensure position doesn't exceed the block reference position
    if (blockRef && position > blockRef.index) {
        position = blockRef.index;
        // Remove trailing space if it exists
        if (position > 0 && lineText[position - 1] === " ") {
            position--;
        }
    }
    console.log(`[AutoDateManager] Final insert position for ${dateType}: ${position}`);
    return position;
}
/**
 * Finds the position where completed date should be inserted (at the end, before block reference ID)
 * @param lineText The task line text
 * @param plugin The plugin instance
 * @returns The position index where the completed date should be inserted
 */
function findCompletedDateInsertPosition(lineText, plugin) {
    // Use centralized block reference detection
    const blockRef = detectBlockReference(lineText);
    if (blockRef) {
        // Insert before the block reference ID
        // Remove trailing space if exists
        let position = blockRef.index;
        if (position > 0 && lineText[position - 1] === " ") {
            position--;
        }
        return position;
    }
    // If no block reference, insert at the very end
    return lineText.length;
}
/**
 * Escapes special regex characters
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Detects block reference ID in the text
 * @param text The text to check
 * @returns Object with block reference info or null if not found
 */
function detectBlockReference(text) {
    // More comprehensive block reference pattern:
    // - Matches ^block-id format
    // - Can have optional whitespace before and after
    // - Block ID can contain letters, numbers, hyphens, and underscores
    // - Must be at the end of the line
    const blockRefPattern = /\s*(\^[A-Za-z0-9_-]+)\s*$/;
    const match = text.match(blockRefPattern);
    if (match && match.index !== undefined) {
        return {
            blockId: match[1],
            index: match.index,
            length: match[0].length,
            fullMatch: match[0],
        };
    }
    return null;
}
/**
 * Removes block reference from text temporarily
 * @param text The text containing block reference
 * @returns Object with cleaned text and block reference info
 */
function extractBlockReference(text) {
    const blockRef = detectBlockReference(text);
    if (blockRef) {
        const cleanedText = text.substring(0, blockRef.index).trimEnd();
        return { cleanedText, blockRef };
    }
    return { cleanedText: text, blockRef: null };
}
export { handleAutoDateManagerTransaction, findTaskStatusChange, determineDateOperations, getStatusType, applyDateOperations, isMoveOperation, findMetadataInsertPosition, findCompletedDateInsertPosition, };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0ZS1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFDTixXQUFXLEdBSVgsTUFBTSxtQkFBbUIsQ0FBQztBQUUzQixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVoRjs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsR0FBUSxFQUNSLE1BQTZCO0lBRTdCLE9BQU8sV0FBVyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1FBQzlDLE9BQU8sZ0NBQWdDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLGdDQUFnQyxDQUN4QyxFQUFlLEVBQ2YsR0FBUSxFQUNSLE1BQTZCOztJQUU3QixxREFBcUQ7SUFDckQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUU7UUFDbkIsT0FBTyxFQUFFLENBQUM7S0FDVjtJQUVELDJDQUEyQztJQUMzQyxJQUFJLENBQUMsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSwwQ0FBRSxPQUFPLENBQUEsRUFBRTtRQUM5QyxPQUFPLEVBQUUsQ0FBQztLQUNWO0lBRUQsd0VBQXdFO0lBQ3hFLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUNsRSxJQUNDLE9BQU8sZUFBZSxLQUFLLFFBQVE7UUFDbkMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUMxQztRQUNELE9BQU8sRUFBRSxDQUFDO0tBQ1Y7SUFFRCw2REFBNkQ7SUFDN0QsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENB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QVMsRUFBRTtRQUN2QyxPQUFPO1lBQ04sT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUN2QixTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNuQixDQUFDO0tBQ0Y7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxJQUFZO0lBSTFDLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTVDLElBQUksUUFBUSxFQUFFO1FBQ2IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUM7S0FDakM7SUFFRCxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDOUMsQ0FBQztBQVdELE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsb0JBQW9CLEVBQ3BCLHVCQUF1QixFQUN2QixhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZiwwQkFBMEIsRUFDMUIsK0JBQStCLEdBQy9CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRFZGl0b3JTdGF0ZSxcclxuXHRUZXh0LFxyXG5cdFRyYW5zYWN0aW9uLFxyXG5cdFRyYW5zYWN0aW9uU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24gfSBmcm9tIFwiLi4vdGFzay1vcGVyYXRpb25zL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYW4gZWRpdG9yIGV4dGVuc2lvbiB0aGF0IGF1dG9tYXRpY2FsbHkgbWFuYWdlcyBkYXRlcyBiYXNlZCBvbiB0YXNrIHN0YXR1cyBjaGFuZ2VzXHJcbiAqIEBwYXJhbSBhcHAgVGhlIE9ic2lkaWFuIGFwcCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgQW4gZWRpdG9yIGV4dGVuc2lvbiB0aGF0IGNhbiBiZSByZWdpc3RlcmVkIHdpdGggdGhlIHBsdWdpblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGF1dG9EYXRlTWFuYWdlckV4dGVuc2lvbihcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pIHtcclxuXHRyZXR1cm4gRWRpdG9yU3RhdGUudHJhbnNhY3Rpb25GaWx0ZXIub2YoKHRyKSA9PiB7XHJcblx0XHRyZXR1cm4gaGFuZGxlQXV0b0RhdGVNYW5hZ2VyVHJhbnNhY3Rpb24odHIsIGFwcCwgcGx1Z2luKTtcclxuXHR9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXMgdHJhbnNhY3Rpb25zIHRvIGRldGVjdCB0YXNrIHN0YXR1cyBjaGFuZ2VzIGFuZCBtYW5hZ2UgZGF0ZXMgYWNjb3JkaW5nbHlcclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBoYW5kbGVcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBUaGUgb3JpZ2luYWwgdHJhbnNhY3Rpb24gb3IgYSBtb2RpZmllZCB0cmFuc2FjdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlQXV0b0RhdGVNYW5hZ2VyVHJhbnNhY3Rpb24oXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IFRyYW5zYWN0aW9uU3BlYyB7XHJcblx0Ly8gT25seSBwcm9jZXNzIHRyYW5zYWN0aW9ucyB0aGF0IGNoYW5nZSB0aGUgZG9jdW1lbnRcclxuXHRpZiAoIXRyLmRvY0NoYW5nZWQpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIFNraXAgaWYgYXV0byBkYXRlIG1hbmFnZW1lbnQgaXMgZGlzYWJsZWRcclxuXHRpZiAoIXBsdWdpbi5zZXR0aW5ncy5hdXRvRGF0ZU1hbmFnZXI/LmVuYWJsZWQpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIFNraXAgaWYgdGhpcyB0cmFuc2FjdGlvbiB3YXMgdHJpZ2dlcmVkIGJ5IGF1dG8gZGF0ZSBtYW5hZ2VtZW50IGl0c2VsZlxyXG5cdGNvbnN0IGFubm90YXRpb25WYWx1ZSA9IHRyLmFubm90YXRpb24odGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24pO1xyXG5cdGlmIChcclxuXHRcdHR5cGVvZiBhbm5vdGF0aW9uVmFsdWUgPT09IFwic3RyaW5nXCIgJiZcclxuXHRcdGFubm90YXRpb25WYWx1ZS5pbmNsdWRlcyhcImF1dG9EYXRlTWFuYWdlclwiKVxyXG5cdCkge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gU2tpcCBpZiB0aGlzIGlzIGEgcGFzdGUgb3BlcmF0aW9uIG9yIG90aGVyIGJ1bGsgb3BlcmF0aW9uc1xyXG5cdGlmICh0ci5pc1VzZXJFdmVudChcImlucHV0LnBhc3RlXCIpIHx8IHRyLmlzVXNlckV2ZW50KFwic2V0XCIpKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBTa2lwIGlmIHRoaXMgbG9va3MgbGlrZSBhIG1vdmUgb3BlcmF0aW9uIChkZWxldGUgKyBpbnNlcnQgb2Ygc2FtZSBjb250ZW50KVxyXG5cdGlmIChpc01vdmVPcGVyYXRpb24odHIpKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiBhIHRhc2sgc3RhdHVzIHdhcyBjaGFuZ2VkIGluIHRoaXMgdHJhbnNhY3Rpb25cclxuXHRjb25zdCB0YXNrU3RhdHVzQ2hhbmdlSW5mbyA9IGZpbmRUYXNrU3RhdHVzQ2hhbmdlKHRyKTtcclxuXHJcblx0aWYgKCF0YXNrU3RhdHVzQ2hhbmdlSW5mbykge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgeyBkb2MsIGxpbmVOdW1iZXIsIG9sZFN0YXR1cywgbmV3U3RhdHVzIH0gPSB0YXNrU3RhdHVzQ2hhbmdlSW5mbztcclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHdoYXQgZGF0ZSBvcGVyYXRpb25zIG5lZWQgdG8gYmUgcGVyZm9ybWVkXHJcblx0Y29uc3QgZGF0ZU9wZXJhdGlvbnMgPSBkZXRlcm1pbmVEYXRlT3BlcmF0aW9ucyhcclxuXHRcdG9sZFN0YXR1cyxcclxuXHRcdG5ld1N0YXR1cyxcclxuXHRcdHBsdWdpbixcclxuXHRcdGRvYy5saW5lKGxpbmVOdW1iZXIpLnRleHRcclxuXHQpO1xyXG5cclxuXHRpZiAoZGF0ZU9wZXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRyZXR1cm4gdHI7XHJcblx0fVxyXG5cclxuXHQvLyBBcHBseSBkYXRlIG9wZXJhdGlvbnMgdG8gdGhlIHRhc2sgbGluZVxyXG5cdHJldHVybiBhcHBseURhdGVPcGVyYXRpb25zKHRyLCBkb2MsIGxpbmVOdW1iZXIsIGRhdGVPcGVyYXRpb25zLCBwbHVnaW4pO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZWN0cyBpZiBhIHRyYW5zYWN0aW9uIHJlcHJlc2VudHMgYSBtb3ZlIG9wZXJhdGlvbiAobGluZSByZW9yZGVyaW5nKVxyXG4gKiBAcGFyYW0gdHIgVGhlIHRyYW5zYWN0aW9uIHRvIGNoZWNrXHJcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhpcyBhcHBlYXJzIHRvIGJlIGEgbW92ZSBvcGVyYXRpb25cclxuICovXHJcbmZ1bmN0aW9uIGlzTW92ZU9wZXJhdGlvbih0cjogVHJhbnNhY3Rpb24pOiBib29sZWFuIHtcclxuXHRjb25zdCBjaGFuZ2VzOiBBcnJheTx7XHJcblx0XHR0eXBlOiBcImRlbGV0ZVwiIHwgXCJpbnNlcnRcIjtcclxuXHRcdGNvbnRlbnQ6IHN0cmluZztcclxuXHRcdGZyb21BOiBudW1iZXI7XHJcblx0XHR0b0E6IG51bWJlcjtcclxuXHRcdGZyb21COiBudW1iZXI7XHJcblx0XHR0b0I6IG51bWJlcjtcclxuXHR9PiA9IFtdO1xyXG5cclxuXHQvLyBDb2xsZWN0IGFsbCBjaGFuZ2VzIGluIHRoZSB0cmFuc2FjdGlvblxyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EsIGZyb21CLCB0b0IsIGluc2VydGVkKSA9PiB7XHJcblx0XHQvLyBSZWNvcmQgZGVsZXRpb25zXHJcblx0XHRpZiAoZnJvbUEgPCB0b0EpIHtcclxuXHRcdFx0Y29uc3QgZGVsZXRlZFRleHQgPSB0ci5zdGFydFN0YXRlLmRvYy5zbGljZVN0cmluZyhmcm9tQSwgdG9BKTtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHR0eXBlOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IGRlbGV0ZWRUZXh0LFxyXG5cdFx0XHRcdGZyb21BLFxyXG5cdFx0XHRcdHRvQSxcclxuXHRcdFx0XHRmcm9tQixcclxuXHRcdFx0XHR0b0IsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlY29yZCBpbnNlcnRpb25zXHJcblx0XHRpZiAoaW5zZXJ0ZWQubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdHR5cGU6IFwiaW5zZXJ0XCIsXHJcblx0XHRcdFx0Y29udGVudDogaW5zZXJ0ZWQudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRmcm9tQSxcclxuXHRcdFx0XHR0b0EsXHJcblx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0dG9CLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gQ2hlY2sgaWYgd2UgaGF2ZSBib3RoIGRlbGV0aW9ucyBhbmQgaW5zZXJ0aW9uc1xyXG5cdGNvbnN0IGRlbGV0aW9ucyA9IGNoYW5nZXMuZmlsdGVyKChjKSA9PiBjLnR5cGUgPT09IFwiZGVsZXRlXCIpO1xyXG5cdGNvbnN0IGluc2VydGlvbnMgPSBjaGFuZ2VzLmZpbHRlcigoYykgPT4gYy50eXBlID09PSBcImluc2VydFwiKTtcclxuXHJcblx0aWYgKGRlbGV0aW9ucy5sZW5ndGggPT09IDAgfHwgaW5zZXJ0aW9ucy5sZW5ndGggPT09IDApIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGlmIGFueSBkZWxldGVkIGNvbnRlbnQgbWF0Y2hlcyBhbnkgaW5zZXJ0ZWQgY29udGVudFxyXG5cdC8vIFRoaXMgY291bGQgaW5kaWNhdGUgYSBtb3ZlIG9wZXJhdGlvblxyXG5cdGZvciAoY29uc3QgZGVsZXRpb24gb2YgZGVsZXRpb25zKSB7XHJcblx0XHRmb3IgKGNvbnN0IGluc2VydGlvbiBvZiBpbnNlcnRpb25zKSB7XHJcblx0XHRcdC8vIENoZWNrIGZvciBleGFjdCBtYXRjaCBvciBtYXRjaCB3aXRoIHdoaXRlc3BhY2UgZGlmZmVyZW5jZXNcclxuXHRcdFx0Y29uc3QgZGVsZXRlZExpbmVzID0gZGVsZXRpb24uY29udGVudFxyXG5cdFx0XHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcclxuXHRcdFx0Y29uc3QgaW5zZXJ0ZWRMaW5lcyA9IGluc2VydGlvbi5jb250ZW50XHJcblx0XHRcdFx0LnNwbGl0KFwiXFxuXCIpXHJcblx0XHRcdFx0LmZpbHRlcigobGluZSkgPT4gbGluZS50cmltKCkpO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGRlbGV0ZWRMaW5lcy5sZW5ndGggPT09IGluc2VydGVkTGluZXMubGVuZ3RoICYmXHJcblx0XHRcdFx0ZGVsZXRlZExpbmVzLmxlbmd0aCA+IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bGV0IGlzTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZGVsZXRlZExpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHQvLyBDb21wYXJlIGNvbnRlbnQgd2l0aG91dCBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIHRhc2sgc3RydWN0dXJlXHJcblx0XHRcdFx0XHRjb25zdCBkZWxldGVkTGluZSA9IGRlbGV0ZWRMaW5lc1tpXS50cmltKCk7XHJcblx0XHRcdFx0XHRjb25zdCBpbnNlcnRlZExpbmUgPSBpbnNlcnRlZExpbmVzW2ldLnRyaW0oKTtcclxuXHRcdFx0XHRcdGlmIChkZWxldGVkTGluZSAhPT0gaW5zZXJ0ZWRMaW5lKSB7XHJcblx0XHRcdFx0XHRcdGlzTWF0Y2ggPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChpc01hdGNoKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbmRzIGFueSB0YXNrIHN0YXR1cyBjaGFuZ2UgaW4gdGhlIHRyYW5zYWN0aW9uXHJcbiAqIEBwYXJhbSB0ciBUaGUgdHJhbnNhY3Rpb24gdG8gY2hlY2tcclxuICogQHJldHVybnMgSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRhc2sgd2l0aCBjaGFuZ2VkIHN0YXR1cyBvciBudWxsIGlmIG5vIHRhc2sgc3RhdHVzIHdhcyBjaGFuZ2VkXHJcbiAqL1xyXG5mdW5jdGlvbiBmaW5kVGFza1N0YXR1c0NoYW5nZSh0cjogVHJhbnNhY3Rpb24pOiB7XHJcblx0ZG9jOiBUZXh0O1xyXG5cdGxpbmVOdW1iZXI6IG51bWJlcjtcclxuXHRvbGRTdGF0dXM6IHN0cmluZztcclxuXHRuZXdTdGF0dXM6IHN0cmluZztcclxufSB8IG51bGwge1xyXG5cdGxldCB0YXNrQ2hhbmdlZEluZm86IHtcclxuXHRcdGRvYzogVGV4dDtcclxuXHRcdGxpbmVOdW1iZXI6IG51bWJlcjtcclxuXHRcdG9sZFN0YXR1czogc3RyaW5nO1xyXG5cdFx0bmV3U3RhdHVzOiBzdHJpbmc7XHJcblx0fSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBDaGVjayBlYWNoIGNoYW5nZSBpbiB0aGUgdHJhbnNhY3Rpb25cclxuXHR0ci5jaGFuZ2VzLml0ZXJDaGFuZ2VzKFxyXG5cdFx0KFxyXG5cdFx0XHRmcm9tQTogbnVtYmVyLFxyXG5cdFx0XHR0b0E6IG51bWJlcixcclxuXHRcdFx0ZnJvbUI6IG51bWJlcixcclxuXHRcdFx0dG9COiBudW1iZXIsXHJcblx0XHRcdGluc2VydGVkOiBUZXh0XHJcblx0XHQpID0+IHtcclxuXHRcdFx0Ly8gT25seSBwcm9jZXNzIGFjdHVhbCBpbnNlcnRpb25zIHRoYXQgY29udGFpbiB0YXNrIG1hcmtlcnNcclxuXHRcdFx0aWYgKGluc2VydGVkLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBwb3NpdGlvbiBjb250ZXh0XHJcblx0XHRcdGNvbnN0IHBvcyA9IGZyb21CO1xyXG5cdFx0XHRjb25zdCBuZXdMaW5lID0gdHIubmV3RG9jLmxpbmVBdChwb3MpO1xyXG5cdFx0XHRjb25zdCBuZXdMaW5lVGV4dCA9IG5ld0xpbmUudGV4dDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgbGluZSBjb250YWlucyBhIHRhc2sgbWFya2VyXHJcblx0XHRcdGNvbnN0IHRhc2tSZWdleCA9IC9eW1xcc3xcXHRdKihbLSorXXxcXGQrXFwuKVxcc1xcWyguKV0vaTtcclxuXHRcdFx0Y29uc3QgbmV3VGFza01hdGNoID0gbmV3TGluZVRleHQubWF0Y2godGFza1JlZ2V4KTtcclxuXHJcblx0XHRcdGlmIChuZXdUYXNrTWF0Y2gpIHtcclxuXHRcdFx0XHRjb25zdCBuZXdTdGF0dXMgPSBuZXdUYXNrTWF0Y2hbMl07XHJcblx0XHRcdFx0bGV0IG9sZFN0YXR1cyA9IFwiIFwiO1xyXG5cclxuXHRcdFx0XHQvLyBUcnkgdG8gZmluZCB0aGUgY29ycmVzcG9uZGluZyBvbGQgdGFzayBzdGF0dXNcclxuXHRcdFx0XHQvLyBGaXJzdCwgY2hlY2sgaWYgdGhlcmUgd2FzIGEgZGVsZXRpb24gaW4gdGhpcyB0cmFuc2FjdGlvbiB0aGF0IG1pZ2h0IGNvcnJlc3BvbmRcclxuXHRcdFx0XHRsZXQgZm91bmRDb3JyZXNwb25kaW5nT2xkVGFzayA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHR0ci5jaGFuZ2VzLml0ZXJDaGFuZ2VzKFxyXG5cdFx0XHRcdFx0KG9sZEZyb21BLCBvbGRUb0EsIG9sZEZyb21CLCBvbGRUb0IsIG9sZEluc2VydGVkKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIExvb2sgZm9yIGRlbGV0aW9ucyB0aGF0IG1pZ2h0IGNvcnJlc3BvbmQgdG8gdGhpcyBpbnNlcnRpb25cclxuXHRcdFx0XHRcdFx0aWYgKG9sZEZyb21BIDwgb2xkVG9BICYmICFmb3VuZENvcnJlc3BvbmRpbmdPbGRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRlbGV0ZWRUZXh0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dHIuc3RhcnRTdGF0ZS5kb2Muc2xpY2VTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0b2xkRnJvbUEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0b2xkVG9BXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBkZWxldGVkTGluZXMgPSBkZWxldGVkVGV4dC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGRlbGV0ZWRMaW5lIG9mIGRlbGV0ZWRMaW5lcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBvbGRUYXNrTWF0Y2ggPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZWRMaW5lLm1hdGNoKHRhc2tSZWdleCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChvbGRUYXNrTWF0Y2gpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBDb21wYXJlIHRoZSB0YXNrIGNvbnRlbnQgKHdpdGhvdXQgc3RhdHVzKSB0byBzZWUgaWYgaXQncyB0aGUgc2FtZSB0YXNrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3VGFza0NvbnRlbnQgPSBuZXdMaW5lVGV4dFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnJlcGxhY2UodGFza1JlZ2V4LCBcIlwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnRyaW0oKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBvbGRUYXNrQ29udGVudCA9IGRlbGV0ZWRMaW5lXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQucmVwbGFjZSh0YXNrUmVnZXgsIFwiXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgY29udGVudCBtYXRjaGVzLCB0aGlzIGlzIGxpa2VseSB0aGUgc2FtZSB0YXNrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKG5ld1Rhc2tDb250ZW50ID09PSBvbGRUYXNrQ29udGVudCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b2xkU3RhdHVzID0gb2xkVGFza01hdGNoWzJdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Zm91bmRDb3JyZXNwb25kaW5nT2xkVGFzayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJZ25vcmUgZXJyb3JzIHdoZW4gdHJ5aW5nIHRvIGdldCBkZWxldGVkIHRleHRcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBJZiB3ZSBjb3VsZG4ndCBmaW5kIGEgY29ycmVzcG9uZGluZyBvbGQgdGFzaywgdHJ5IHRoZSBvcmlnaW5hbCBtZXRob2RcclxuXHRcdFx0XHRpZiAoIWZvdW5kQ29ycmVzcG9uZGluZ09sZFRhc2spIHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBjaGFuZ2UgaXMgYWN0dWFsbHkgbW9kaWZ5aW5nIHRoZSB0YXNrIHN0YXR1cyBjaGFyYWN0ZXJcclxuXHRcdFx0XHRcdFx0Y29uc3QgdGFza1N0YXR1c1N0YXJ0ID0gbmV3TGluZVRleHQuaW5kZXhPZihcIltcIikgKyAxO1xyXG5cdFx0XHRcdFx0XHRjb25zdCB0YXNrU3RhdHVzRW5kID0gbmV3TGluZVRleHQuaW5kZXhPZihcIl1cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBPbmx5IHByb2NlZWQgaWYgdGhlIGNoYW5nZSBhZmZlY3RzIHRoZSB0YXNrIHN0YXR1cyBhcmVhXHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRmcm9tQiA8PSBuZXdMaW5lLmZyb20gKyB0YXNrU3RhdHVzRW5kICYmXHJcblx0XHRcdFx0XHRcdFx0dG9CID49IG5ld0xpbmUuZnJvbSArIHRhc2tTdGF0dXNTdGFydFxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBvbGRQb3MgPSBmcm9tQTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRvbGRQb3MgPj0gMCAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0b2xkUG9zIDwgdHIuc3RhcnRTdGF0ZS5kb2MubGVuZ3RoXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBvbGRMaW5lID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dHIuc3RhcnRTdGF0ZS5kb2MubGluZUF0KG9sZFBvcyk7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBvbGRUYXNrTWF0Y2ggPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRvbGRMaW5lLnRleHQubWF0Y2godGFza1JlZ2V4KTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChvbGRUYXNrTWF0Y2gpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0b2xkU3RhdHVzID0gb2xkVGFza01hdGNoWzJdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRmb3VuZENvcnJlc3BvbmRpbmdPbGRUYXNrID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0Ly8gTGluZSBtaWdodCBub3QgZXhpc3QgaW4gb2xkIGRvY3VtZW50XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBPbmx5IHByb2Nlc3MgaWYgd2UgZm91bmQgYSBjb3JyZXNwb25kaW5nIG9sZCB0YXNrIGFuZCB0aGUgc3RhdHVzIGFjdHVhbGx5IGNoYW5nZWRcclxuXHRcdFx0XHRpZiAoZm91bmRDb3JyZXNwb25kaW5nT2xkVGFzayAmJiBvbGRTdGF0dXMgIT09IG5ld1N0YXR1cykge1xyXG5cdFx0XHRcdFx0dGFza0NoYW5nZWRJbmZvID0ge1xyXG5cdFx0XHRcdFx0XHRkb2M6IHRyLm5ld0RvYyxcclxuXHRcdFx0XHRcdFx0bGluZU51bWJlcjogbmV3TGluZS5udW1iZXIsXHJcblx0XHRcdFx0XHRcdG9sZFN0YXR1czogb2xkU3RhdHVzLFxyXG5cdFx0XHRcdFx0XHRuZXdTdGF0dXM6IG5ld1N0YXR1cyxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0KTtcclxuXHJcblx0cmV0dXJuIHRhc2tDaGFuZ2VkSW5mbztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZXMgd2hhdCBkYXRlIG9wZXJhdGlvbnMgbmVlZCB0byBiZSBwZXJmb3JtZWQgYmFzZWQgb24gc3RhdHVzIGNoYW5nZVxyXG4gKiBAcGFyYW0gb2xkU3RhdHVzIFRoZSBvbGQgdGFzayBzdGF0dXNcclxuICogQHBhcmFtIG5ld1N0YXR1cyBUaGUgbmV3IHRhc2sgc3RhdHVzXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gbGluZVRleHQgVGhlIGN1cnJlbnQgbGluZSB0ZXh0IHRvIGNoZWNrIGZvciBleGlzdGluZyBkYXRlc1xyXG4gKiBAcmV0dXJucyBBcnJheSBvZiBkYXRlIG9wZXJhdGlvbnMgdG8gcGVyZm9ybVxyXG4gKi9cclxuZnVuY3Rpb24gZGV0ZXJtaW5lRGF0ZU9wZXJhdGlvbnMoXHJcblx0b2xkU3RhdHVzOiBzdHJpbmcsXHJcblx0bmV3U3RhdHVzOiBzdHJpbmcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0bGluZVRleHQ6IHN0cmluZ1xyXG4pOiBEYXRlT3BlcmF0aW9uW10ge1xyXG5cdGNvbnN0IG9wZXJhdGlvbnM6IERhdGVPcGVyYXRpb25bXSA9IFtdO1xyXG5cdGNvbnN0IHNldHRpbmdzID0gcGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlcjtcclxuXHJcblx0aWYgKCFzZXR0aW5ncykgcmV0dXJuIG9wZXJhdGlvbnM7XHJcblxyXG5cdGNvbnN0IG9sZFN0YXR1c1R5cGUgPSBnZXRTdGF0dXNUeXBlKG9sZFN0YXR1cywgcGx1Z2luKTtcclxuXHRjb25zdCBuZXdTdGF0dXNUeXBlID0gZ2V0U3RhdHVzVHlwZShuZXdTdGF0dXMsIHBsdWdpbik7XHJcblxyXG5cdC8vIElmIHN0YXR1cyB0eXBlcyBhcmUgdGhlIHNhbWUsIG5vIGRhdGUgb3BlcmF0aW9ucyBuZWVkZWRcclxuXHRpZiAob2xkU3RhdHVzVHlwZSA9PT0gbmV3U3RhdHVzVHlwZSkge1xyXG5cdFx0cmV0dXJuIG9wZXJhdGlvbnM7XHJcblx0fVxyXG5cclxuXHQvLyBSZW1vdmUgb2xkIHN0YXR1cyBkYXRlIGlmIGl0IGV4aXN0cyBhbmQgaXMgbWFuYWdlZCAoYnV0IG5ldmVyIHJlbW92ZSBzdGFydCBkYXRlKVxyXG5cdGlmIChzZXR0aW5ncy5tYW5hZ2VDb21wbGV0ZWREYXRlICYmIG9sZFN0YXR1c1R5cGUgPT09IFwiY29tcGxldGVkXCIpIHtcclxuXHRcdG9wZXJhdGlvbnMucHVzaCh7XHJcblx0XHRcdHR5cGU6IFwicmVtb3ZlXCIsXHJcblx0XHRcdGRhdGVUeXBlOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdGlmIChzZXR0aW5ncy5tYW5hZ2VDYW5jZWxsZWREYXRlICYmIG9sZFN0YXR1c1R5cGUgPT09IFwiYWJhbmRvbmVkXCIpIHtcclxuXHRcdG9wZXJhdGlvbnMucHVzaCh7XHJcblx0XHRcdHR5cGU6IFwicmVtb3ZlXCIsXHJcblx0XHRcdGRhdGVUeXBlOiBcImNhbmNlbGxlZFwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgbmV3IHN0YXR1cyBkYXRlIGlmIGl0IHNob3VsZCBiZSBtYW5hZ2VkIGFuZCBkb2Vzbid0IGFscmVhZHkgZXhpc3RcclxuXHRpZiAoc2V0dGluZ3MubWFuYWdlQ29tcGxldGVkRGF0ZSAmJiBuZXdTdGF0dXNUeXBlID09PSBcImNvbXBsZXRlZFwiKSB7XHJcblx0XHRvcGVyYXRpb25zLnB1c2goe1xyXG5cdFx0XHR0eXBlOiBcImFkZFwiLFxyXG5cdFx0XHRkYXRlVHlwZTogXCJjb21wbGV0ZWRcIixcclxuXHRcdFx0Zm9ybWF0OiBzZXR0aW5ncy5jb21wbGV0ZWREYXRlRm9ybWF0IHx8IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdGlmIChzZXR0aW5ncy5tYW5hZ2VTdGFydERhdGUgJiYgbmV3U3RhdHVzVHlwZSA9PT0gXCJpblByb2dyZXNzXCIpIHtcclxuXHRcdC8vIE9ubHkgYWRkIHN0YXJ0IGRhdGUgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0XHJcblx0XHRpZiAoIWhhc0V4aXN0aW5nRGF0ZShsaW5lVGV4dCwgXCJzdGFydFwiLCBwbHVnaW4pKSB7XHJcblx0XHRcdG9wZXJhdGlvbnMucHVzaCh7XHJcblx0XHRcdFx0dHlwZTogXCJhZGRcIixcclxuXHRcdFx0XHRkYXRlVHlwZTogXCJzdGFydFwiLFxyXG5cdFx0XHRcdGZvcm1hdDogc2V0dGluZ3Muc3RhcnREYXRlRm9ybWF0IHx8IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblx0aWYgKHNldHRpbmdzLm1hbmFnZUNhbmNlbGxlZERhdGUgJiYgbmV3U3RhdHVzVHlwZSA9PT0gXCJhYmFuZG9uZWRcIikge1xyXG5cdFx0b3BlcmF0aW9ucy5wdXNoKHtcclxuXHRcdFx0dHlwZTogXCJhZGRcIixcclxuXHRcdFx0ZGF0ZVR5cGU6IFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdGZvcm1hdDogc2V0dGluZ3MuY2FuY2VsbGVkRGF0ZUZvcm1hdCB8fCBcIllZWVktTU0tRERcIixcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9wZXJhdGlvbnM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgYSBzcGVjaWZpYyBkYXRlIHR5cGUgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGxpbmVcclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSB0YXNrIGxpbmUgdGV4dFxyXG4gKiBAcGFyYW0gZGF0ZVR5cGUgVGhlIHR5cGUgb2YgZGF0ZSB0byBjaGVjayBmb3JcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGRhdGUgYWxyZWFkeSBleGlzdHNcclxuICovXHJcbmZ1bmN0aW9uIGhhc0V4aXN0aW5nRGF0ZShcclxuXHRsaW5lVGV4dDogc3RyaW5nLFxyXG5cdGRhdGVUeXBlOiBzdHJpbmcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0cGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PSBcImRhdGF2aWV3XCI7XHJcblxyXG5cdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0Y29uc3QgZmllbGROYW1lID0gZGF0ZVR5cGUgPT09IFwic3RhcnRcIiA/IFwic3RhcnRcIiA6IGRhdGVUeXBlO1xyXG5cdFx0Y29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdGBcXFxcWyR7ZmllbGROYW1lfTo6XFxcXHMqXFxcXGR7NH0tXFxcXGR7Mn0tXFxcXGR7Mn0oPzpcXFxccytcXFxcZHsyfTpcXFxcZHsyfSg/OjpcXFxcZHsyfSk/KT9cXFxcXWBcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KGxpbmVUZXh0KTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0Y29uc3QgZGF0ZU1hcmtlciA9IGdldERhdGVNYXJrZXIoZGF0ZVR5cGUsIHBsdWdpbik7XHJcblx0XHRjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChcclxuXHRcdFx0YCR7ZXNjYXBlUmVnZXgoXHJcblx0XHRcdFx0ZGF0ZU1hcmtlclxyXG5cdFx0XHQpfVxcXFxzKlxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9KD86XFxcXHMrXFxcXGR7Mn06XFxcXGR7Mn0oPzo6XFxcXGR7Mn0pPyk/YFxyXG5cdFx0KTtcclxuXHRcdHJldHVybiBwYXR0ZXJuLnRlc3QobGluZVRleHQpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIHN0YXR1cyB0eXBlIChjb21wbGV0ZWQsIGluUHJvZ3Jlc3MsIGV0Yy4pIGZvciBhIGdpdmVuIHN0YXR1cyBjaGFyYWN0ZXJcclxuICogQHBhcmFtIHN0YXR1cyBUaGUgc3RhdHVzIGNoYXJhY3RlclxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgVGhlIHN0YXR1cyB0eXBlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRTdGF0dXNUeXBlKHN0YXR1czogc3RyaW5nLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbik6IHN0cmluZyB7XHJcblx0Y29uc3QgdGFza1N0YXR1c2VzID0gcGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcztcclxuXHJcblx0aWYgKHRhc2tTdGF0dXNlcy5jb21wbGV0ZWQuc3BsaXQoXCJ8XCIpLmluY2x1ZGVzKHN0YXR1cykpIHtcclxuXHRcdHJldHVybiBcImNvbXBsZXRlZFwiO1xyXG5cdH1cclxuXHRpZiAodGFza1N0YXR1c2VzLmluUHJvZ3Jlc3Muc3BsaXQoXCJ8XCIpLmluY2x1ZGVzKHN0YXR1cykpIHtcclxuXHRcdHJldHVybiBcImluUHJvZ3Jlc3NcIjtcclxuXHR9XHJcblx0aWYgKHRhc2tTdGF0dXNlcy5hYmFuZG9uZWQuc3BsaXQoXCJ8XCIpLmluY2x1ZGVzKHN0YXR1cykpIHtcclxuXHRcdHJldHVybiBcImFiYW5kb25lZFwiO1xyXG5cdH1cclxuXHRpZiAodGFza1N0YXR1c2VzLnBsYW5uZWQuc3BsaXQoXCJ8XCIpLmluY2x1ZGVzKHN0YXR1cykpIHtcclxuXHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHR9XHJcblx0aWYgKHRhc2tTdGF0dXNlcy5ub3RTdGFydGVkLnNwbGl0KFwifFwiKS5pbmNsdWRlcyhzdGF0dXMpKSB7XHJcblx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gXCJ1bmtub3duXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIGRhdGUgb3BlcmF0aW9ucyB0byB0aGUgdGFzayBsaW5lXHJcbiAqIEBwYXJhbSB0ciBUaGUgdHJhbnNhY3Rpb25cclxuICogQHBhcmFtIGRvYyBUaGUgZG9jdW1lbnRcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGxpbmUgbnVtYmVyIG9mIHRoZSB0YXNrXHJcbiAqIEBwYXJhbSBvcGVyYXRpb25zIFRoZSBkYXRlIG9wZXJhdGlvbnMgdG8gcGVyZm9ybVxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgVGhlIG1vZGlmaWVkIHRyYW5zYWN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBhcHBseURhdGVPcGVyYXRpb25zKFxyXG5cdHRyOiBUcmFuc2FjdGlvbixcclxuXHRkb2M6IFRleHQsXHJcblx0bGluZU51bWJlcjogbnVtYmVyLFxyXG5cdG9wZXJhdGlvbnM6IERhdGVPcGVyYXRpb25bXSxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBUcmFuc2FjdGlvblNwZWMge1xyXG5cdC8vIElNUE9SVEFOVDogVXNlIHRoZSBORVcgZG9jdW1lbnQgc3RhdGUsIG5vdCB0aGUgb2xkIG9uZVxyXG5cdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZShsaW5lTnVtYmVyKTtcclxuXHRsZXQgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblx0Y29uc3QgY2hhbmdlcyA9IFtdO1xyXG5cclxuXHRjb25zb2xlLmxvZyhcclxuXHRcdGBbQXV0b0RhdGVNYW5hZ2VyXSBhcHBseURhdGVPcGVyYXRpb25zIC0gV29ya2luZyB3aXRoIGxpbmU6IFwiJHtsaW5lVGV4dH1cImBcclxuXHQpO1xyXG5cclxuXHRmb3IgKGNvbnN0IG9wZXJhdGlvbiBvZiBvcGVyYXRpb25zKSB7XHJcblx0XHRpZiAob3BlcmF0aW9uLnR5cGUgPT09IFwiYWRkXCIpIHtcclxuXHRcdFx0Ly8gQWRkIGEgbmV3IGRhdGVcclxuXHRcdFx0Y29uc3QgZGF0ZVN0cmluZyA9IGZvcm1hdERhdGUob3BlcmF0aW9uLmZvcm1hdCEpO1xyXG5cdFx0XHRjb25zdCBkYXRlTWFya2VyID0gZ2V0RGF0ZU1hcmtlcihvcGVyYXRpb24uZGF0ZVR5cGUsIHBsdWdpbik7XHJcblx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHRcdGxldCBkYXRlVGV4dDogc3RyaW5nO1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRkYXRlVGV4dCA9IGAgJHtkYXRlTWFya2VyfSR7ZGF0ZVN0cmluZ31dYDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRkYXRlVGV4dCA9IGAgJHtkYXRlTWFya2VyfSAke2RhdGVTdHJpbmd9YDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgYXBwcm9wcmlhdGUgaW5zZXJ0IHBvc2l0aW9uIGJhc2VkIG9uIGRhdGUgdHlwZVxyXG5cdFx0XHRsZXQgaW5zZXJ0UG9zaXRpb246IG51bWJlcjtcclxuXHRcdFx0aWYgKG9wZXJhdGlvbi5kYXRlVHlwZSA9PT0gXCJjb21wbGV0ZWRcIikge1xyXG5cdFx0XHRcdC8vIENvbXBsZXRlZCBkYXRlIGdvZXMgYXQgdGhlIGVuZCAoYmVmb3JlIGJsb2NrIHJlZmVyZW5jZSBJRClcclxuXHRcdFx0XHRpbnNlcnRQb3NpdGlvbiA9IGZpbmRDb21wbGV0ZWREYXRlSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRcdHBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU3RhcnQgZGF0ZSBhbmQgY2FuY2VsbGVkIGRhdGUgZ28gYWZ0ZXIgZXhpc3RpbmcgbWV0YWRhdGEgYnV0IGJlZm9yZSBjb21wbGV0ZWQgZGF0ZVxyXG5cdFx0XHRcdGluc2VydFBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdG9wZXJhdGlvbi5kYXRlVHlwZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGFic29sdXRlUG9zaXRpb24gPSBsaW5lLmZyb20gKyBpbnNlcnRQb3NpdGlvbjtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbQXV0b0RhdGVNYW5hZ2VyXSBJbnNlcnRpbmcgJHtvcGVyYXRpb24uZGF0ZVR5cGV9IGRhdGU6YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgICAtIEluc2VydCBwb3NpdGlvbiAocmVsYXRpdmUpOiAke2luc2VydFBvc2l0aW9ufWApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgICAtIExpbmUuZnJvbTogJHtsaW5lLmZyb219YCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGAgIC0gQWJzb2x1dGUgcG9zaXRpb246ICR7YWJzb2x1dGVQb3NpdGlvbn1gKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYCAgLSBEYXRlIHRleHQ6IFwiJHtkYXRlVGV4dH1cImApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgICAtIFRleHQgYXQgaW5zZXJ0IHBvaW50OiBcIiR7bGluZVRleHQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0aW5zZXJ0UG9zaXRpb25cclxuXHRcdFx0XHQpfVwiYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRmcm9tOiBhYnNvbHV0ZVBvc2l0aW9uLFxyXG5cdFx0XHRcdHRvOiBhYnNvbHV0ZVBvc2l0aW9uLFxyXG5cdFx0XHRcdGluc2VydDogZGF0ZVRleHQsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGxpbmVUZXh0IGZvciBzdWJzZXF1ZW50IG9wZXJhdGlvbnNcclxuXHRcdFx0bGluZVRleHQgPVxyXG5cdFx0XHRcdGxpbmVUZXh0LnNsaWNlKDAsIGluc2VydFBvc2l0aW9uKSArXHJcblx0XHRcdFx0ZGF0ZVRleHQgK1xyXG5cdFx0XHRcdGxpbmVUZXh0LnNsaWNlKGluc2VydFBvc2l0aW9uKTtcclxuXHRcdH0gZWxzZSBpZiAob3BlcmF0aW9uLnR5cGUgPT09IFwicmVtb3ZlXCIpIHtcclxuXHRcdFx0Ly8gUmVtb3ZlIGV4aXN0aW5nIGRhdGVcclxuXHRcdFx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cdFx0XHRsZXQgZGF0ZVBhdHRlcm46IFJlZ0V4cDtcclxuXHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdC8vIEZvciBkYXRhdmlldyBmb3JtYXQ6IFtjb21wbGV0aW9uOjoyMDI0LTAxLTAxXSBvciBbY2FuY2VsbGVkOjoyMDI0LTAxLTAxXVxyXG5cdFx0XHRcdGNvbnN0IGZpZWxkTmFtZSA9XHJcblx0XHRcdFx0XHRvcGVyYXRpb24uZGF0ZVR5cGUgPT09IFwiY29tcGxldGVkXCJcclxuXHRcdFx0XHRcdFx0PyBcImNvbXBsZXRpb25cIlxyXG5cdFx0XHRcdFx0XHQ6IG9wZXJhdGlvbi5kYXRlVHlwZSA9PT0gXCJjYW5jZWxsZWRcIlxyXG5cdFx0XHRcdFx0XHQ/IFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0XHRcdFx0OiBcInVua25vd25cIjtcclxuXHRcdFx0XHRkYXRlUGF0dGVybiA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRgXFxcXHMqXFxcXFske2ZpZWxkTmFtZX06OlxcXFxzKlxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9KD86XFxcXHMrXFxcXGR7Mn06XFxcXGR7Mn0oPzo6XFxcXGR7Mn0pPyk/XFxcXF1gLFxyXG5cdFx0XHRcdFx0XCJnXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZvciBlbW9qaSBmb3JtYXQ6IOKchSAyMDI0LTAxLTAxIG9yIOKdjCAyMDI0LTAxLTAxXHJcblx0XHRcdFx0Y29uc3QgZGF0ZU1hcmtlciA9IGdldERhdGVNYXJrZXIob3BlcmF0aW9uLmRhdGVUeXBlLCBwbHVnaW4pO1xyXG5cdFx0XHRcdGRhdGVQYXR0ZXJuID0gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdGBcXFxccyoke2VzY2FwZVJlZ2V4KFxyXG5cdFx0XHRcdFx0XHRkYXRlTWFya2VyXHJcblx0XHRcdFx0XHQpfVxcXFxzKlxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9KD86XFxcXHMrXFxcXGR7Mn06XFxcXGR7Mn0oPzo6XFxcXGR7Mn0pPyk/YCxcclxuXHRcdFx0XHRcdFwiZ1wiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmluZCBhbGwgbWF0Y2hlcyBhbmQgcmVtb3ZlIHRoZW0gKHRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIGluc3RhbmNlcylcclxuXHRcdFx0Ly8gV29yayB3aXRoIHRoZSBmdWxsIGxpbmVUZXh0XHJcblx0XHRcdGxldCBtYXRjaDtcclxuXHRcdFx0Y29uc3QgbWF0Y2hlc1RvUmVtb3ZlID0gW107XHJcblx0XHRcdGRhdGVQYXR0ZXJuLmxhc3RJbmRleCA9IDA7IC8vIFJlc2V0IHJlZ2V4IHN0YXRlXHJcblxyXG5cdFx0XHR3aGlsZSAoKG1hdGNoID0gZGF0ZVBhdHRlcm4uZXhlYyhsaW5lVGV4dCkpICE9PSBudWxsKSB7XHJcblx0XHRcdFx0bWF0Y2hlc1RvUmVtb3ZlLnB1c2goe1xyXG5cdFx0XHRcdFx0c3RhcnQ6IG1hdGNoLmluZGV4LFxyXG5cdFx0XHRcdFx0ZW5kOiBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCxcclxuXHRcdFx0XHRcdHRleHQ6IG1hdGNoWzBdLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQcm9jZXNzIG1hdGNoZXMgaW4gcmV2ZXJzZSBvcmRlciB0byBtYWludGFpbiBjb3JyZWN0IHBvc2l0aW9uc1xyXG5cdFx0XHRmb3IgKGxldCBpID0gbWF0Y2hlc1RvUmVtb3ZlLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdFx0Y29uc3QgbWF0Y2hUb1JlbW92ZSA9IG1hdGNoZXNUb1JlbW92ZVtpXTtcclxuXHRcdFx0XHRjb25zdCBhYnNvbHV0ZUZyb20gPSBsaW5lLmZyb20gKyBtYXRjaFRvUmVtb3ZlLnN0YXJ0O1xyXG5cdFx0XHRcdGNvbnN0IGFic29sdXRlVG8gPSBsaW5lLmZyb20gKyBtYXRjaFRvUmVtb3ZlLmVuZDtcclxuXHJcblx0XHRcdFx0Y2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRcdGZyb206IGFic29sdXRlRnJvbSxcclxuXHRcdFx0XHRcdHRvOiBhYnNvbHV0ZVRvLFxyXG5cdFx0XHRcdFx0aW5zZXJ0OiBcIlwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgbGluZVRleHQgZm9yIHN1YnNlcXVlbnQgb3BlcmF0aW9uc1xyXG5cdFx0XHRcdGxpbmVUZXh0ID1cclxuXHRcdFx0XHRcdGxpbmVUZXh0LnNsaWNlKDAsIG1hdGNoVG9SZW1vdmUuc3RhcnQpICtcclxuXHRcdFx0XHRcdGxpbmVUZXh0LnNsaWNlKG1hdGNoVG9SZW1vdmUuZW5kKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYgKGNoYW5nZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2hhbmdlczogW3RyLmNoYW5nZXMsIC4uLmNoYW5nZXNdLFxyXG5cdFx0XHRzZWxlY3Rpb246IHRyLnNlbGVjdGlvbixcclxuXHRcdFx0YW5ub3RhdGlvbnM6IFtcclxuXHRcdFx0XHR0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcImF1dG9EYXRlTWFuYWdlci5kYXRlVXBkYXRlXCIpLFxyXG5cdFx0XHRdLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvcm1hdHMgYSBkYXRlIGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIGZvcm1hdFxyXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBkYXRlIGZvcm1hdCBzdHJpbmdcclxuICogQHJldHVybnMgVGhlIGZvcm1hdHRlZCBkYXRlIHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gZm9ybWF0RGF0ZShmb3JtYXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gU2ltcGxlIGRhdGUgZm9ybWF0dGluZyAtIHlvdSBtaWdodCB3YW50IHRvIHVzZSBhIG1vcmUgcm9idXN0IGxpYnJhcnlcclxuXHRyZXR1cm4gZm9ybWF0XHJcblx0XHQucmVwbGFjZShcIllZWVlcIiwgbm93LmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKSlcclxuXHRcdC5yZXBsYWNlKFwiTU1cIiwgKG5vdy5nZXRNb250aCgpICsgMSkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCBcIjBcIikpXHJcblx0XHQucmVwbGFjZShcIkREXCIsIG5vdy5nZXREYXRlKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCBcIjBcIikpXHJcblx0XHQucmVwbGFjZShcIkhIXCIsIG5vdy5nZXRIb3VycygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpKVxyXG5cdFx0LnJlcGxhY2UoXCJtbVwiLCBub3cuZ2V0TWludXRlcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpKVxyXG5cdFx0LnJlcGxhY2UoXCJzc1wiLCBub3cuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIGRhdGUgbWFya2VyIGZvciBhIHNwZWNpZmljIGRhdGUgdHlwZSBiYXNlZCBvbiBtZXRhZGF0YSBmb3JtYXRcclxuICogQHBhcmFtIGRhdGVUeXBlIFRoZSB0eXBlIG9mIGRhdGUgKGNvbXBsZXRlZCwgc3RhcnQsIGNhbmNlbGxlZClcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRoZSBkYXRlIG1hcmtlciBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGdldERhdGVNYXJrZXIoXHJcblx0ZGF0ZVR5cGU6IHN0cmluZyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBzdHJpbmcge1xyXG5cdGNvbnN0IHNldHRpbmdzID0gcGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlcjtcclxuXHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRwbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0aWYgKCFzZXR0aW5ncykgcmV0dXJuIFwi8J+ThVwiO1xyXG5cclxuXHRzd2l0Y2ggKGRhdGVUeXBlKSB7XHJcblx0XHRjYXNlIFwiY29tcGxldGVkXCI6XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdHJldHVybiBcIltjb21wbGV0aW9uOjpcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gc2V0dGluZ3MuY29tcGxldGVkRGF0ZU1hcmtlciB8fCBcIuKchVwiO1xyXG5cdFx0Y2FzZSBcInN0YXJ0XCI6XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdHJldHVybiBcIltzdGFydDo6XCI7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHNldHRpbmdzLnN0YXJ0RGF0ZU1hcmtlciB8fCBcIvCfmoBcIjtcclxuXHRcdGNhc2UgXCJjYW5jZWxsZWRcIjpcclxuXHRcdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdFx0cmV0dXJuIFwiW2NhbmNlbGxlZDo6XCI7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHNldHRpbmdzLmNhbmNlbGxlZERhdGVNYXJrZXIgfHwgXCLinYxcIjtcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiBcIvCfk4VcIjtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kcyB0aGUgcG9zaXRpb24gd2hlcmUgbWV0YWRhdGEgKHN0YXJ0IGRhdGUsIGNhbmNlbGxlZCBkYXRlLCBldGMuKSBzaG91bGQgYmUgaW5zZXJ0ZWRcclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSB0YXNrIGxpbmUgdGV4dFxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHBhcmFtIGRhdGVUeXBlIFRoZSB0eXBlIG9mIGRhdGUgYmVpbmcgaW5zZXJ0ZWRcclxuICogQHJldHVybnMgVGhlIHBvc2l0aW9uIGluZGV4IHdoZXJlIHRoZSBtZXRhZGF0YSBzaG91bGQgYmUgaW5zZXJ0ZWRcclxuICovXHJcbmZ1bmN0aW9uIGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdGxpbmVUZXh0OiBzdHJpbmcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0ZGF0ZVR5cGU6IHN0cmluZ1xyXG4pOiBudW1iZXIge1xyXG5cdC8vIFdvcmsgd2l0aCB0aGUgZnVsbCBsaW5lIHRleHQsIGRvbid0IGV4dHJhY3QgYmxvY2sgcmVmZXJlbmNlIHlldFxyXG5cdGNvbnN0IGJsb2NrUmVmID0gZGV0ZWN0QmxvY2tSZWZlcmVuY2UobGluZVRleHQpO1xyXG5cdC8vIEZpbmQgdGhlIHRhc2sgbWFya2VyIGFuZCBzdGF0dXNcclxuXHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lVGV4dC5tYXRjaCgvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHNcXFsoLilcXF1cXHMqLyk7XHJcblx0aWYgKCF0YXNrTWF0Y2gpIHJldHVybiBibG9ja1JlZiA/IGJsb2NrUmVmLmluZGV4IDogbGluZVRleHQubGVuZ3RoO1xyXG5cclxuXHQvLyBTdGFydCBwb3NpdGlvbiBpcyByaWdodCBhZnRlciB0aGUgdGFzayBjaGVja2JveFxyXG5cdGxldCBwb3NpdGlvbiA9IHRhc2tNYXRjaFswXS5sZW5ndGg7XHJcblxyXG5cdC8vIEZpbmQgdGhlIGFjdHVhbCBlbmQgb2YgdGFzayBjb250ZW50IGJ5IHNjYW5uaW5nIHRocm91Z2ggdGhlIHRleHRcclxuXHQvLyBUaGlzIGhhbmRsZXMgY29udGVudCB3aXRoIHNwZWNpYWwgY2hhcmFjdGVycywgbGlua3MsIGV0Yy5cclxuXHRsZXQgY29udGVudEVuZCA9IHBvc2l0aW9uO1xyXG5cdGxldCBpbkxpbmsgPSAwOyAvLyBUcmFjayBuZXN0ZWQgW1tsaW5rc11dXHJcblx0bGV0IGluRGF0YXZpZXcgPSBmYWxzZTsgLy8gVHJhY2sgW2ZpZWxkOjogdmFsdWVdIG1ldGFkYXRhXHJcblx0Y29uc3QgcmVtYWluaW5nVGV4dCA9IGxpbmVUZXh0LnNsaWNlKHBvc2l0aW9uKTtcclxuXHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCByZW1haW5pbmdUZXh0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjb25zdCBjaGFyID0gcmVtYWluaW5nVGV4dFtpXTtcclxuXHRcdGNvbnN0IG5leHRDaGFyID0gcmVtYWluaW5nVGV4dFtpICsgMV07XHJcblx0XHRjb25zdCB0d29DaGFycyA9IGNoYXIgKyAobmV4dENoYXIgfHwgJycpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBbW3dpa2kgbGlua3NdXSAtIHRoZXkgYXJlIHBhcnQgb2YgY29udGVudFxyXG5cdFx0aWYgKHR3b0NoYXJzID09PSAnW1snKSB7XHJcblx0XHRcdGluTGluaysrO1xyXG5cdFx0XHRjb250ZW50RW5kID0gcG9zaXRpb24gKyBpICsgMjtcclxuXHRcdFx0aSsrOyAvLyBTa2lwIG5leHQgY2hhclxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHRcdGlmICh0d29DaGFycyA9PT0gJ11dJyAmJiBpbkxpbmsgPiAwKSB7XHJcblx0XHRcdGluTGluay0tO1xyXG5cdFx0XHRjb250ZW50RW5kID0gcG9zaXRpb24gKyBpICsgMjtcclxuXHRcdFx0aSsrOyAvLyBTa2lwIG5leHQgY2hhclxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSdyZSBpbnNpZGUgYSBsaW5rLCBldmVyeXRoaW5nIGlzIGNvbnRlbnRcclxuXHRcdGlmIChpbkxpbmsgPiAwKSB7XHJcblx0XHRcdGNvbnRlbnRFbmQgPSBwb3NpdGlvbiArIGkgKyAxO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3IgZGF0YXZpZXcgbWV0YWRhdGEgW2ZpZWxkOjogdmFsdWVdXHJcblx0XHRpZiAoY2hhciA9PT0gJ1snICYmICFpbkRhdGF2aWV3KSB7XHJcblx0XHRcdGNvbnN0IGFmdGVyQnJhY2tldCA9IHJlbWFpbmluZ1RleHQuc2xpY2UoaSArIDEpO1xyXG5cdFx0XHRpZiAoYWZ0ZXJCcmFja2V0Lm1hdGNoKC9eW2EtekEtWl0rOjovKSkge1xyXG5cdFx0XHRcdC8vIFRoaXMgaXMgZGF0YXZpZXcgbWV0YWRhdGEsIHN0b3AgaGVyZVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIHRhZ3MgKG9ubHkgaWYgcHJlY2VkZWQgYnkgd2hpdGVzcGFjZSBvciBhdCBzdGFydClcclxuXHRcdGlmIChjaGFyID09PSAnIycpIHtcclxuXHRcdFx0aWYgKGkgPT09IDAgfHwgcmVtYWluaW5nVGV4dFtpIC0gMV0gPT09ICcgJyB8fCByZW1haW5pbmdUZXh0W2kgLSAxXSA9PT0gJ1xcdCcpIHtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGFjdHVhbGx5IGEgdGFnIChmb2xsb3dlZCBieSB3b3JkIGNoYXJhY3RlcnMpXHJcblx0XHRcdFx0Y29uc3QgYWZ0ZXJIYXNoID0gcmVtYWluaW5nVGV4dC5zbGljZShpICsgMSk7XHJcblx0XHRcdFx0aWYgKGFmdGVySGFzaC5tYXRjaCgvXltcXHctXSsvKSkge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyBhIHRhZywgc3RvcCBoZXJlXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3IgZGF0ZSBlbW9qaXMgKHRoZXNlIGFyZSBtZXRhZGF0YSBtYXJrZXJzKVxyXG5cdFx0Y29uc3QgZGF0ZUVtb2ppcyA9IFsn8J+ThScsICfwn5qAJywgJ+KchScsICfinYwnLCAn8J+bqycsICfilrbvuI8nLCAn4o+wJywgJ/Cfj4EnXTtcclxuXHRcdGlmIChkYXRlRW1vamlzLmluY2x1ZGVzKGNoYXIpKSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgZm9sbG93ZWQgYnkgYSBkYXRlIHBhdHRlcm5cclxuXHRcdFx0Y29uc3QgYWZ0ZXJFbW9qaSA9IHJlbWFpbmluZ1RleHQuc2xpY2UoaSArIDEpO1xyXG5cdFx0XHRpZiAoYWZ0ZXJFbW9qaS5tYXRjaCgvXlxccypcXGR7NH0tXFxkezJ9LVxcZHsyfS8pKSB7XHJcblx0XHRcdFx0Ly8gVGhpcyBpcyBhIGRhdGUgbWFya2VyLCBzdG9wIGhlcmVcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlZ3VsYXIgY29udGVudCBjaGFyYWN0ZXJcclxuXHRcdGNvbnRlbnRFbmQgPSBwb3NpdGlvbiArIGkgKyAxO1xyXG5cdH1cclxuXHJcblx0cG9zaXRpb24gPSBjb250ZW50RW5kO1xyXG5cclxuXHQvLyBUcmltIHRyYWlsaW5nIHdoaXRlc3BhY2VcclxuXHR3aGlsZSAocG9zaXRpb24gPiB0YXNrTWF0Y2hbMF0ubGVuZ3RoICYmIGxpbmVUZXh0W3Bvc2l0aW9uIC0gMV0gPT09ICcgJykge1xyXG5cdFx0cG9zaXRpb24tLTtcclxuXHR9XHJcblxyXG5cdC8vIEZvciBjYW5jZWxsZWQgZGF0ZSwgd2UgbmVlZCBzcGVjaWFsIGhhbmRsaW5nIHRvIGluc2VydCBhZnRlciBzdGFydCBkYXRlcyBpZiBwcmVzZW50XHJcblx0aWYgKGRhdGVUeXBlID09PSBcImNhbmNlbGxlZFwiKSB7XHJcblx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRcdC8vIExvb2sgZm9yIGV4aXN0aW5nIHN0YXJ0IGRhdGVcclxuXHRcdGxldCBzdGFydERhdGVGb3VuZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZU1hdGNoID0gbGluZVRleHQubWF0Y2goL1xcW3N0YXJ0OjpbXlxcXV0qXFxdLyk7XHJcblx0XHRcdGlmIChzdGFydERhdGVNYXRjaCAmJiBzdGFydERhdGVNYXRjaC5pbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBzdGFydERhdGVNYXRjaC5pbmRleCArIHN0YXJ0RGF0ZU1hdGNoWzBdLmxlbmd0aDtcclxuXHRcdFx0XHRzdGFydERhdGVGb3VuZCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZpcnN0IHRyeSB3aXRoIHRoZSBjb25maWd1cmVkIHN0YXJ0IG1hcmtlclxyXG5cdFx0XHRjb25zdCBzdGFydE1hcmtlciA9IGdldERhdGVNYXJrZXIoXCJzdGFydFwiLCBwbHVnaW4pO1xyXG5cdFx0XHRjb25zdCBlc2NhcGVkU3RhcnRNYXJrZXIgPSBlc2NhcGVSZWdleChzdGFydE1hcmtlcik7XHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZVBhdHRlcm4gPSBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdGAke2VzY2FwZWRTdGFydE1hcmtlcn1cXFxccypcXFxcZHs0fS1cXFxcZHsyfS1cXFxcZHsyfSg/OlxcXFxzK1xcXFxkezJ9OlxcXFxkezJ9KD86OlxcXFxkezJ9KT8pP2BcclxuXHRcdFx0KTtcclxuXHRcdFx0bGV0IHN0YXJ0RGF0ZU1hdGNoID0gbGluZVRleHQubWF0Y2goc3RhcnREYXRlUGF0dGVybik7XHJcblxyXG5cdFx0XHQvLyBJZiBub3QgZm91bmQsIGxvb2sgZm9yIGFueSBjb21tb24gc3RhcnQgZGF0ZSBlbW9qaSBwYXR0ZXJuc1xyXG5cdFx0XHRpZiAoIXN0YXJ0RGF0ZU1hdGNoKSB7XHJcblx0XHRcdFx0Ly8gQ29tbW9uIHN0YXJ0IGRhdGUgZW1vamlzOiDwn5qALCDwn5urLCDilrbvuI8sIOKPsCwg8J+PgVxyXG5cdFx0XHRcdGNvbnN0IGNvbW1vblN0YXJ0RW1vamlzID0gW1wi8J+agFwiLCBcIvCfm6tcIiwgXCLilrbvuI9cIiwgXCLij7BcIiwgXCLwn4+BXCJdO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgZW1vamkgb2YgY29tbW9uU3RhcnRFbW9qaXMpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0XHRgJHtlc2NhcGVSZWdleChcclxuXHRcdFx0XHRcdFx0XHRlbW9qaVxyXG5cdFx0XHRcdFx0XHQpfVxcXFxzKlxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9KD86XFxcXHMrXFxcXGR7Mn06XFxcXGR7Mn0oPzo6XFxcXGR7Mn0pPyk/YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZU1hdGNoID0gbGluZVRleHQubWF0Y2gocGF0dGVybik7XHJcblx0XHRcdFx0XHRpZiAoc3RhcnREYXRlTWF0Y2gpIHtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoc3RhcnREYXRlTWF0Y2ggJiYgc3RhcnREYXRlTWF0Y2guaW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHBvc2l0aW9uID0gc3RhcnREYXRlTWF0Y2guaW5kZXggKyBzdGFydERhdGVNYXRjaFswXS5sZW5ndGg7XHJcblx0XHRcdFx0c3RhcnREYXRlRm91bmQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgbm8gc3RhcnQgZGF0ZSBmb3VuZCwgcG9zaXRpb24gaXMgYWxyZWFkeSBjb3JyZWN0IGZyb20gaW5pdGlhbCBwYXJzaW5nXHJcblx0XHQvLyBJdCBwb2ludHMgdG8gdGhlIGVuZCBvZiBjb250ZW50IGJlZm9yZSBtZXRhZGF0YVxyXG5cdH0gZWxzZSBpZiAoZGF0ZVR5cGUgPT09IFwiY29tcGxldGVkXCIpIHtcclxuXHRcdC8vIEZvciBjb21wbGV0ZWQgZGF0ZSwgd2Ugd2FudCB0byBnbyB0byB0aGUgZW5kIG9mIHRoZSBsaW5lIChiZWZvcmUgYmxvY2sgcmVmZXJlbmNlKVxyXG5cdFx0Ly8gVGhpcyBpcyBkaWZmZXJlbnQgZnJvbSBjYW5jZWxsZWQvc3RhcnQgZGF0ZXMgd2hpY2ggZ28gYWZ0ZXIgY29udGVudC9tZXRhZGF0YVxyXG5cdFx0cG9zaXRpb24gPSBsaW5lVGV4dC5sZW5ndGg7XHJcblxyXG5cdFx0Ly8gSWYgdGhlcmUncyBhIGJsb2NrIHJlZmVyZW5jZSwgaW5zZXJ0IGJlZm9yZSBpdFxyXG5cdFx0aWYgKGJsb2NrUmVmKSB7XHJcblx0XHRcdHBvc2l0aW9uID0gYmxvY2tSZWYuaW5kZXg7XHJcblx0XHRcdC8vIFJlbW92ZSB0cmFpbGluZyBzcGFjZSBpZiBleGlzdHNcclxuXHRcdFx0aWYgKHBvc2l0aW9uID4gMCAmJiBsaW5lVGV4dFtwb3NpdGlvbiAtIDFdID09PSBcIiBcIikge1xyXG5cdFx0XHRcdHBvc2l0aW9uLS07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9IGVsc2Uge1xyXG5cdFx0Ly8gRm9yIHN0YXJ0IGRhdGUsIHRoZSBwb3NpdGlvbiBoYXMgYWxyZWFkeSBiZWVuIGNhbGN1bGF0ZWQgY29ycmVjdGx5XHJcblx0XHQvLyBpbiB0aGUgaW5pdGlhbCBjb250ZW50IHBhcnNpbmcgYWJvdmVcclxuXHRcdC8vIE5vIGFkZGl0aW9uYWwgcHJvY2Vzc2luZyBuZWVkZWRcclxuXHR9XHJcblxyXG5cdC8vIEVuc3VyZSBwb3NpdGlvbiBkb2Vzbid0IGV4Y2VlZCB0aGUgYmxvY2sgcmVmZXJlbmNlIHBvc2l0aW9uXHJcblx0aWYgKGJsb2NrUmVmICYmIHBvc2l0aW9uID4gYmxvY2tSZWYuaW5kZXgpIHtcclxuXHRcdHBvc2l0aW9uID0gYmxvY2tSZWYuaW5kZXg7XHJcblx0XHQvLyBSZW1vdmUgdHJhaWxpbmcgc3BhY2UgaWYgaXQgZXhpc3RzXHJcblx0XHRpZiAocG9zaXRpb24gPiAwICYmIGxpbmVUZXh0W3Bvc2l0aW9uIC0gMV0gPT09IFwiIFwiKSB7XHJcblx0XHRcdHBvc2l0aW9uLS07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjb25zb2xlLmxvZyhcclxuXHRcdGBbQXV0b0RhdGVNYW5hZ2VyXSBGaW5hbCBpbnNlcnQgcG9zaXRpb24gZm9yICR7ZGF0ZVR5cGV9OiAke3Bvc2l0aW9ufWBcclxuXHQpO1xyXG5cdHJldHVybiBwb3NpdGlvbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbmRzIHRoZSBwb3NpdGlvbiB3aGVyZSBjb21wbGV0ZWQgZGF0ZSBzaG91bGQgYmUgaW5zZXJ0ZWQgKGF0IHRoZSBlbmQsIGJlZm9yZSBibG9jayByZWZlcmVuY2UgSUQpXHJcbiAqIEBwYXJhbSBsaW5lVGV4dCBUaGUgdGFzayBsaW5lIHRleHRcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIFRoZSBwb3NpdGlvbiBpbmRleCB3aGVyZSB0aGUgY29tcGxldGVkIGRhdGUgc2hvdWxkIGJlIGluc2VydGVkXHJcbiAqL1xyXG5mdW5jdGlvbiBmaW5kQ29tcGxldGVkRGF0ZUluc2VydFBvc2l0aW9uKFxyXG5cdGxpbmVUZXh0OiBzdHJpbmcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogbnVtYmVyIHtcclxuXHQvLyBVc2UgY2VudHJhbGl6ZWQgYmxvY2sgcmVmZXJlbmNlIGRldGVjdGlvblxyXG5cdGNvbnN0IGJsb2NrUmVmID0gZGV0ZWN0QmxvY2tSZWZlcmVuY2UobGluZVRleHQpO1xyXG5cdGlmIChibG9ja1JlZikge1xyXG5cdFx0Ly8gSW5zZXJ0IGJlZm9yZSB0aGUgYmxvY2sgcmVmZXJlbmNlIElEXHJcblx0XHQvLyBSZW1vdmUgdHJhaWxpbmcgc3BhY2UgaWYgZXhpc3RzXHJcblx0XHRsZXQgcG9zaXRpb24gPSBibG9ja1JlZi5pbmRleDtcclxuXHRcdGlmIChwb3NpdGlvbiA+IDAgJiYgbGluZVRleHRbcG9zaXRpb24gLSAxXSA9PT0gXCIgXCIpIHtcclxuXHRcdFx0cG9zaXRpb24tLTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBwb3NpdGlvbjtcclxuXHR9XHJcblxyXG5cdC8vIElmIG5vIGJsb2NrIHJlZmVyZW5jZSwgaW5zZXJ0IGF0IHRoZSB2ZXJ5IGVuZFxyXG5cdHJldHVybiBsaW5lVGV4dC5sZW5ndGg7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFc2NhcGVzIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVyc1xyXG4gKiBAcGFyYW0gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZXNjYXBlXHJcbiAqIEByZXR1cm5zIFRoZSBlc2NhcGVkIHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnZXgoc3RyaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZWN0cyBibG9jayByZWZlcmVuY2UgSUQgaW4gdGhlIHRleHRcclxuICogQHBhcmFtIHRleHQgVGhlIHRleHQgdG8gY2hlY2tcclxuICogQHJldHVybnMgT2JqZWN0IHdpdGggYmxvY2sgcmVmZXJlbmNlIGluZm8gb3IgbnVsbCBpZiBub3QgZm91bmRcclxuICovXHJcbmZ1bmN0aW9uIGRldGVjdEJsb2NrUmVmZXJlbmNlKHRleHQ6IHN0cmluZyk6IHtcclxuXHRibG9ja0lkOiBzdHJpbmc7XHJcblx0aW5kZXg6IG51bWJlcjtcclxuXHRsZW5ndGg6IG51bWJlcjtcclxuXHRmdWxsTWF0Y2g6IHN0cmluZztcclxufSB8IG51bGwge1xyXG5cdC8vIE1vcmUgY29tcHJlaGVuc2l2ZSBibG9jayByZWZlcmVuY2UgcGF0dGVybjpcclxuXHQvLyAtIE1hdGNoZXMgXmJsb2NrLWlkIGZvcm1hdFxyXG5cdC8vIC0gQ2FuIGhhdmUgb3B0aW9uYWwgd2hpdGVzcGFjZSBiZWZvcmUgYW5kIGFmdGVyXHJcblx0Ly8gLSBCbG9jayBJRCBjYW4gY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBoeXBoZW5zLCBhbmQgdW5kZXJzY29yZXNcclxuXHQvLyAtIE11c3QgYmUgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxyXG5cdGNvbnN0IGJsb2NrUmVmUGF0dGVybiA9IC9cXHMqKFxcXltBLVphLXowLTlfLV0rKVxccyokLztcclxuXHRjb25zdCBtYXRjaCA9IHRleHQubWF0Y2goYmxvY2tSZWZQYXR0ZXJuKTtcclxuXHJcblx0aWYgKG1hdGNoICYmIG1hdGNoLmluZGV4ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGJsb2NrSWQ6IG1hdGNoWzFdLFxyXG5cdFx0XHRpbmRleDogbWF0Y2guaW5kZXgsXHJcblx0XHRcdGxlbmd0aDogbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRmdWxsTWF0Y2g6IG1hdGNoWzBdLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogUmVtb3ZlcyBibG9jayByZWZlcmVuY2UgZnJvbSB0ZXh0IHRlbXBvcmFyaWx5XHJcbiAqIEBwYXJhbSB0ZXh0IFRoZSB0ZXh0IGNvbnRhaW5pbmcgYmxvY2sgcmVmZXJlbmNlXHJcbiAqIEByZXR1cm5zIE9iamVjdCB3aXRoIGNsZWFuZWQgdGV4dCBhbmQgYmxvY2sgcmVmZXJlbmNlIGluZm9cclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RCbG9ja1JlZmVyZW5jZSh0ZXh0OiBzdHJpbmcpOiB7XHJcblx0Y2xlYW5lZFRleHQ6IHN0cmluZztcclxuXHRibG9ja1JlZjogUmV0dXJuVHlwZTx0eXBlb2YgZGV0ZWN0QmxvY2tSZWZlcmVuY2U+O1xyXG59IHtcclxuXHRjb25zdCBibG9ja1JlZiA9IGRldGVjdEJsb2NrUmVmZXJlbmNlKHRleHQpO1xyXG5cclxuXHRpZiAoYmxvY2tSZWYpIHtcclxuXHRcdGNvbnN0IGNsZWFuZWRUZXh0ID0gdGV4dC5zdWJzdHJpbmcoMCwgYmxvY2tSZWYuaW5kZXgpLnRyaW1FbmQoKTtcclxuXHRcdHJldHVybiB7IGNsZWFuZWRUZXh0LCBibG9ja1JlZiB9O1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHsgY2xlYW5lZFRleHQ6IHRleHQsIGJsb2NrUmVmOiBudWxsIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbnRlcmZhY2UgZm9yIGRhdGUgb3BlcmF0aW9uc1xyXG4gKi9cclxuaW50ZXJmYWNlIERhdGVPcGVyYXRpb24ge1xyXG5cdHR5cGU6IFwiYWRkXCIgfCBcInJlbW92ZVwiO1xyXG5cdGRhdGVUeXBlOiBcImNvbXBsZXRlZFwiIHwgXCJzdGFydFwiIHwgXCJjYW5jZWxsZWRcIjtcclxuXHRmb3JtYXQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcblx0aGFuZGxlQXV0b0RhdGVNYW5hZ2VyVHJhbnNhY3Rpb24sXHJcblx0ZmluZFRhc2tTdGF0dXNDaGFuZ2UsXHJcblx0ZGV0ZXJtaW5lRGF0ZU9wZXJhdGlvbnMsXHJcblx0Z2V0U3RhdHVzVHlwZSxcclxuXHRhcHBseURhdGVPcGVyYXRpb25zLFxyXG5cdGlzTW92ZU9wZXJhdGlvbixcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxuXHRmaW5kQ29tcGxldGVkRGF0ZUluc2VydFBvc2l0aW9uLFxyXG59O1xyXG4iXX0=