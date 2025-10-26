import { EditorView } from "@codemirror/view";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
/**
 * Extension to handle cleanup of task marks when text is selected and deleted
 * This ensures that when users select text containing task metadata (like priority marks)
 * and delete it, the marks are properly cleaned up
 */
export function taskMarkCleanupExtension() {
    return EditorView.updateListener.of((update) => {
        // Only process transactions that have changes
        if (!update.docChanged)
            return;
        // Check if this is a user deletion operation
        const tr = update.transactions[0];
        if (!tr || !isUserDeletion(tr))
            return;
        // Process each change to see if we need to clean up marks
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            // Only handle deletions (where text was removed)
            if (fromA >= toA)
                return;
            const deletedText = tr.startState.doc.sliceString(fromA, toA);
            const insertedText = inserted.toString();
            // Check if the deleted text contains task marks
            if (containsTaskMarks(deletedText)) {
                // Get the line containing the change
                const line = update.state.doc.lineAt(fromB);
                const lineText = line.text;
                // Check if this is a task line
                if (isTaskLine(lineText)) {
                    // Clean the line of any orphaned marks
                    const cleanedLine = cleanOrphanedMarks(lineText);
                    if (cleanedLine !== lineText) {
                        // Apply the cleanup
                        update.view.dispatch({
                            changes: {
                                from: line.from,
                                to: line.to,
                                insert: cleanedLine
                            }
                        });
                    }
                }
            }
        });
    });
}
/**
 * Check if a transaction represents a user deletion operation
 */
function isUserDeletion(tr) {
    // Check if this is a user input event
    if (!tr.isUserEvent("input.delete") && !tr.isUserEvent("input.deleteBackward")) {
        return false;
    }
    // Check if there are actual deletions
    let hasDeletions = false;
    tr.changes.iterChanges((fromA, toA) => {
        if (fromA < toA) {
            hasDeletions = true;
        }
    });
    return hasDeletions;
}
/**
 * Check if text contains task marks that might need cleanup
 */
function containsTaskMarks(text) {
    // Check for priority marks
    const priorityRegex = /(?:🔺|⏫|🔼|🔽|⏬️|\[#[A-C]\]|!)/;
    if (priorityRegex.test(text))
        return true;
    // Check for date marks
    const dateRegex = /(?:📅|🛫|⏳|✅|➕|❌)/;
    if (dateRegex.test(text))
        return true;
    // Check for other metadata marks
    const metadataRegex = /(?:🆔|⛔|🏁|🔁|@|#)/;
    if (metadataRegex.test(text))
        return true;
    return false;
}
/**
 * Check if a line is a task line
 */
function isTaskLine(line) {
    const taskRegex = /^\s*[-*+]\s*\[[^\]]*\]/;
    return taskRegex.test(line);
}
/**
 * Clean orphaned marks from a task line
 * This removes marks that are no longer properly associated with content
 */
function cleanOrphanedMarks(line) {
    // First, extract the task marker part
    const taskMarkerMatch = line.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
    if (!taskMarkerMatch)
        return line;
    const taskMarker = taskMarkerMatch[1];
    const content = line.substring(taskMarker.length);
    // Use the existing clearAllMarks function to clean the content
    const cleanedContent = clearAllMarks(content);
    // If the content is now empty or just whitespace, remove orphaned marks
    if (!cleanedContent.trim()) {
        // Remove any trailing marks that are now orphaned
        const cleanedLine = taskMarker.trim();
        return cleanedLine;
    }
    // Reconstruct the line with cleaned content
    return taskMarker + cleanedContent;
}
/**
 * Check if marks in the line are orphaned (not properly associated with content)
 */
function hasOrphanedMarks(line) {
    // Extract content after task marker
    const taskMarkerMatch = line.match(/^\s*[-*+]\s*\[[^\]]*\]\s*(.*)/);
    if (!taskMarkerMatch)
        return false;
    const content = taskMarkerMatch[1];
    // Check if there are marks but no meaningful content
    const hasMarks = containsTaskMarks(content);
    const hasContent = content.replace(/[🔺⏫🔼🔽⏬️📅🛫⏳✅➕❌🆔⛔🏁🔁@#!\[\]]/g, '').trim().length > 0;
    return hasMarks && !hasContent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1jbGVhbnVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFyay1jbGVhbnVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0U7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSx3QkFBd0I7SUFDdkMsT0FBTyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQzlDLDhDQUE4QztRQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBRS9CLDZDQUE2QztRQUM3QyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQUUsT0FBTztRQUV2QywwREFBMEQ7UUFDMUQsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDM0QsaURBQWlEO1lBQ2pELElBQUksS0FBSyxJQUFJLEdBQUc7Z0JBQUUsT0FBTztZQUV6QixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUV6QyxnREFBZ0Q7WUFDaEQsSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDbkMscUNBQXFDO2dCQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFD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Q25CO0lBRUQsNENBQTRDO0lBQzVDLE9BQU8sVUFBVSxHQUFHLGNBQWMsQ0FBQztBQUNwQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDckMsb0NBQW9DO0lBQ3BDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUNwRSxJQUFJLENBQUMsZUFBZTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRW5DLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuQyxxREFBcUQ7SUFDckQsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBRS9GLE9BQU8sUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ2hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgRXh0ZW5zaW9uLCBUcmFuc2FjdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgeyBjbGVhckFsbE1hcmtzIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiB0byBoYW5kbGUgY2xlYW51cCBvZiB0YXNrIG1hcmtzIHdoZW4gdGV4dCBpcyBzZWxlY3RlZCBhbmQgZGVsZXRlZFxyXG4gKiBUaGlzIGVuc3VyZXMgdGhhdCB3aGVuIHVzZXJzIHNlbGVjdCB0ZXh0IGNvbnRhaW5pbmcgdGFzayBtZXRhZGF0YSAobGlrZSBwcmlvcml0eSBtYXJrcylcclxuICogYW5kIGRlbGV0ZSBpdCwgdGhlIG1hcmtzIGFyZSBwcm9wZXJseSBjbGVhbmVkIHVwXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdGFza01hcmtDbGVhbnVwRXh0ZW5zaW9uKCk6IEV4dGVuc2lvbiB7XHJcblx0cmV0dXJuIEVkaXRvclZpZXcudXBkYXRlTGlzdGVuZXIub2YoKHVwZGF0ZSkgPT4ge1xyXG5cdFx0Ly8gT25seSBwcm9jZXNzIHRyYW5zYWN0aW9ucyB0aGF0IGhhdmUgY2hhbmdlc1xyXG5cdFx0aWYgKCF1cGRhdGUuZG9jQ2hhbmdlZCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSB1c2VyIGRlbGV0aW9uIG9wZXJhdGlvblxyXG5cdFx0Y29uc3QgdHIgPSB1cGRhdGUudHJhbnNhY3Rpb25zWzBdO1xyXG5cdFx0aWYgKCF0ciB8fCAhaXNVc2VyRGVsZXRpb24odHIpKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBlYWNoIGNoYW5nZSB0byBzZWUgaWYgd2UgbmVlZCB0byBjbGVhbiB1cCBtYXJrc1xyXG5cdFx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdFx0Ly8gT25seSBoYW5kbGUgZGVsZXRpb25zICh3aGVyZSB0ZXh0IHdhcyByZW1vdmVkKVxyXG5cdFx0XHRpZiAoZnJvbUEgPj0gdG9BKSByZXR1cm47XHJcblxyXG5cdFx0XHRjb25zdCBkZWxldGVkVGV4dCA9IHRyLnN0YXJ0U3RhdGUuZG9jLnNsaWNlU3RyaW5nKGZyb21BLCB0b0EpO1xyXG5cdFx0XHRjb25zdCBpbnNlcnRlZFRleHQgPSBpbnNlcnRlZC50b1N0cmluZygpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGRlbGV0ZWQgdGV4dCBjb250YWlucyB0YXNrIG1hcmtzXHJcblx0XHRcdGlmIChjb250YWluc1Rhc2tNYXJrcyhkZWxldGVkVGV4dCkpIHtcclxuXHRcdFx0XHQvLyBHZXQgdGhlIGxpbmUgY29udGFpbmluZyB0aGUgY2hhbmdlXHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IHVwZGF0ZS5zdGF0ZS5kb2MubGluZUF0KGZyb21CKTtcclxuXHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIHRhc2sgbGluZVxyXG5cdFx0XHRcdGlmIChpc1Rhc2tMaW5lKGxpbmVUZXh0KSkge1xyXG5cdFx0XHRcdFx0Ly8gQ2xlYW4gdGhlIGxpbmUgb2YgYW55IG9ycGhhbmVkIG1hcmtzXHJcblx0XHRcdFx0XHRjb25zdCBjbGVhbmVkTGluZSA9IGNsZWFuT3JwaGFuZWRNYXJrcyhsaW5lVGV4dCk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGlmIChjbGVhbmVkTGluZSAhPT0gbGluZVRleHQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQXBwbHkgdGhlIGNsZWFudXBcclxuXHRcdFx0XHRcdFx0dXBkYXRlLnZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGZyb206IGxpbmUuZnJvbSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvOiBsaW5lLnRvLFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5zZXJ0OiBjbGVhbmVkTGluZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgdHJhbnNhY3Rpb24gcmVwcmVzZW50cyBhIHVzZXIgZGVsZXRpb24gb3BlcmF0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1VzZXJEZWxldGlvbih0cjogVHJhbnNhY3Rpb24pOiBib29sZWFuIHtcclxuXHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgdXNlciBpbnB1dCBldmVudFxyXG5cdGlmICghdHIuaXNVc2VyRXZlbnQoXCJpbnB1dC5kZWxldGVcIikgJiYgIXRyLmlzVXNlckV2ZW50KFwiaW5wdXQuZGVsZXRlQmFja3dhcmRcIikpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBhY3R1YWwgZGVsZXRpb25zXHJcblx0bGV0IGhhc0RlbGV0aW9ucyA9IGZhbHNlO1xyXG5cdHRyLmNoYW5nZXMuaXRlckNoYW5nZXMoKGZyb21BLCB0b0EpID0+IHtcclxuXHRcdGlmIChmcm9tQSA8IHRvQSkge1xyXG5cdFx0XHRoYXNEZWxldGlvbnMgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4gaGFzRGVsZXRpb25zO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgdGV4dCBjb250YWlucyB0YXNrIG1hcmtzIHRoYXQgbWlnaHQgbmVlZCBjbGVhbnVwXHJcbiAqL1xyXG5mdW5jdGlvbiBjb250YWluc1Rhc2tNYXJrcyh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHQvLyBDaGVjayBmb3IgcHJpb3JpdHkgbWFya3NcclxuXHRjb25zdCBwcmlvcml0eVJlZ2V4ID0gLyg/OvCflLp84o+rfPCflLx88J+UvXzij6zvuI98XFxbI1tBLUNdXFxdfCEpLztcclxuXHRpZiAocHJpb3JpdHlSZWdleC50ZXN0KHRleHQpKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0Ly8gQ2hlY2sgZm9yIGRhdGUgbWFya3NcclxuXHRjb25zdCBkYXRlUmVnZXggPSAvKD868J+ThXzwn5urfOKPs3zinIV84p6VfOKdjCkvO1xyXG5cdGlmIChkYXRlUmVnZXgudGVzdCh0ZXh0KSkgcmV0dXJuIHRydWU7XHJcblxyXG5cdC8vIENoZWNrIGZvciBvdGhlciBtZXRhZGF0YSBtYXJrc1xyXG5cdGNvbnN0IG1ldGFkYXRhUmVnZXggPSAvKD868J+GlHzim5R88J+PgXzwn5SBfEB8IykvO1xyXG5cdGlmIChtZXRhZGF0YVJlZ2V4LnRlc3QodGV4dCkpIHJldHVybiB0cnVlO1xyXG5cclxuXHRyZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBhIGxpbmUgaXMgYSB0YXNrIGxpbmVcclxuICovXHJcbmZ1bmN0aW9uIGlzVGFza0xpbmUobGluZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgdGFza1JlZ2V4ID0gL15cXHMqWy0qK11cXHMqXFxbW15cXF1dKlxcXS87XHJcblx0cmV0dXJuIHRhc2tSZWdleC50ZXN0KGxpbmUpO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xlYW4gb3JwaGFuZWQgbWFya3MgZnJvbSBhIHRhc2sgbGluZVxyXG4gKiBUaGlzIHJlbW92ZXMgbWFya3MgdGhhdCBhcmUgbm8gbG9uZ2VyIHByb3Blcmx5IGFzc29jaWF0ZWQgd2l0aCBjb250ZW50XHJcbiAqL1xyXG5mdW5jdGlvbiBjbGVhbk9ycGhhbmVkTWFya3MobGluZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHQvLyBGaXJzdCwgZXh0cmFjdCB0aGUgdGFzayBtYXJrZXIgcGFydFxyXG5cdGNvbnN0IHRhc2tNYXJrZXJNYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKlstKitdXFxzKlxcW1teXFxdXSpcXF1cXHMqKS8pO1xyXG5cdGlmICghdGFza01hcmtlck1hdGNoKSByZXR1cm4gbGluZTtcclxuXHJcblx0Y29uc3QgdGFza01hcmtlciA9IHRhc2tNYXJrZXJNYXRjaFsxXTtcclxuXHRjb25zdCBjb250ZW50ID0gbGluZS5zdWJzdHJpbmcodGFza01hcmtlci5sZW5ndGgpO1xyXG5cclxuXHQvLyBVc2UgdGhlIGV4aXN0aW5nIGNsZWFyQWxsTWFya3MgZnVuY3Rpb24gdG8gY2xlYW4gdGhlIGNvbnRlbnRcclxuXHRjb25zdCBjbGVhbmVkQ29udGVudCA9IGNsZWFyQWxsTWFya3MoY29udGVudCk7XHJcblxyXG5cdC8vIElmIHRoZSBjb250ZW50IGlzIG5vdyBlbXB0eSBvciBqdXN0IHdoaXRlc3BhY2UsIHJlbW92ZSBvcnBoYW5lZCBtYXJrc1xyXG5cdGlmICghY2xlYW5lZENvbnRlbnQudHJpbSgpKSB7XHJcblx0XHQvLyBSZW1vdmUgYW55IHRyYWlsaW5nIG1hcmtzIHRoYXQgYXJlIG5vdyBvcnBoYW5lZFxyXG5cdFx0Y29uc3QgY2xlYW5lZExpbmUgPSB0YXNrTWFya2VyLnRyaW0oKTtcclxuXHRcdHJldHVybiBjbGVhbmVkTGluZTtcclxuXHR9XHJcblxyXG5cdC8vIFJlY29uc3RydWN0IHRoZSBsaW5lIHdpdGggY2xlYW5lZCBjb250ZW50XHJcblx0cmV0dXJuIHRhc2tNYXJrZXIgKyBjbGVhbmVkQ29udGVudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIG1hcmtzIGluIHRoZSBsaW5lIGFyZSBvcnBoYW5lZCAobm90IHByb3Blcmx5IGFzc29jaWF0ZWQgd2l0aCBjb250ZW50KVxyXG4gKi9cclxuZnVuY3Rpb24gaGFzT3JwaGFuZWRNYXJrcyhsaW5lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHQvLyBFeHRyYWN0IGNvbnRlbnQgYWZ0ZXIgdGFzayBtYXJrZXJcclxuXHRjb25zdCB0YXNrTWFya2VyTWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFxzKlstKitdXFxzKlxcW1teXFxdXSpcXF1cXHMqKC4qKS8pO1xyXG5cdGlmICghdGFza01hcmtlck1hdGNoKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdGNvbnN0IGNvbnRlbnQgPSB0YXNrTWFya2VyTWF0Y2hbMV07XHJcblx0XHJcblx0Ly8gQ2hlY2sgaWYgdGhlcmUgYXJlIG1hcmtzIGJ1dCBubyBtZWFuaW5nZnVsIGNvbnRlbnRcclxuXHRjb25zdCBoYXNNYXJrcyA9IGNvbnRhaW5zVGFza01hcmtzKGNvbnRlbnQpO1xyXG5cdGNvbnN0IGhhc0NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1vwn5S64o+r8J+UvPCflL3ij6zvuI/wn5OF8J+bq+KPs+KcheKeleKdjPCfhpTim5Twn4+B8J+UgUAjIVxcW1xcXV0vZywgJycpLnRyaW0oKS5sZW5ndGggPiAwO1xyXG5cclxuXHRyZXR1cm4gaGFzTWFya3MgJiYgIWhhc0NvbnRlbnQ7XHJcbn1cclxuIl19