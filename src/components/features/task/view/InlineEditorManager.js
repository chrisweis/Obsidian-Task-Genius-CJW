import { Component } from "obsidian";
import { InlineEditor } from "./InlineEditor";
/**
 * Manages InlineEditor instances with lazy initialization and pooling
 * to improve performance when rendering many tasks
 *
 * Performance optimizations:
 * - Object pooling to reduce GC pressure
 * - Lazy initialization
 * - Memory-efficient editor reuse
 * - Automatic cleanup of unused editors
 */
export class InlineEditorManager extends Component {
    constructor(app, plugin) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.editorPool = [];
        this.activeEditors = new Map();
        this.maxPoolSize = 3; // Reduced pool size for better memory usage
        this.lastCleanupTime = 0;
        this.cleanupInterval = 30000; // 30 seconds
        // Performance tracking
        this.stats = {
            editorsCreated: 0,
            editorsReused: 0,
            editorsDestroyed: 0,
        };
    }
    /**
     * Get or create an InlineEditor for a task
     * Uses pooling to reuse editor instances
     */
    getEditor(task, options) {
        // Check if we already have an active editor for this task
        const existingEditor = this.activeEditors.get(task.id);
        if (existingEditor) {
            // Update the existing editor with new options if needed
            if (this.shouldUpdateEditor(existingEditor, options)) {
                existingEditor.updateTask(task, options);
            }
            return existingEditor;
        }
        // Periodic cleanup of unused editors
        this.performPeriodicCleanup();
        // Try to get an editor from the pool
        let editor = this.editorPool.pop();
        if (!editor) {
            // Create new editor if pool is empty
            editor = this.createNewEditor(task, options);
            this.stats.editorsCreated++;
        }
        else {
            // Reuse pooled editor with new task and options
            editor.updateTask(task, options);
            this.stats.editorsReused++;
        }
        // Track active editor
        this.activeEditors.set(task.id, editor);
        return editor;
    }
    /**
     * Return an editor to the pool when no longer needed
     */
    releaseEditor(taskId) {
        const editor = this.activeEditors.get(taskId);
        if (!editor)
            return;
        // Remove from active editors
        this.activeEditors.delete(taskId);
        // Don't pool editors that are currently editing
        if (editor.isCurrentlyEditing()) {
            // Destroy the editor if it's still editing (safety measure)
            this.destroyEditor(editor);
            return;
        }
        // Reset editor state
        editor.reset();
        // Return to pool if not full
        if (this.editorPool.length < this.maxPoolSize) {
            this.editorPool.push(editor);
        }
        else {
            // Pool is full, destroy the editor
            this.destroyEditor(editor);
        }
    }
    /**
     * Force release an editor (useful for cleanup)
     */
    forceReleaseEditor(taskId) {
        const editor = this.activeEditors.get(taskId);
        if (!editor)
            return;
        // Remove from active editors
        this.activeEditors.delete(taskId);
        // Always destroy when force releasing
        this.destroyEditor(editor);
    }
    /**
     * Check if a task has an active editor
     */
    hasActiveEditor(taskId) {
        return this.activeEditors.has(taskId);
    }
    /**
     * Get the active editor for a task if it exists
     */
    getActiveEditor(taskId) {
        return this.activeEditors.get(taskId);
    }
    /**
     * Release all active editors (useful for cleanup)
     */
    releaseAllEditors() {
        const taskIds = Array.from(this.activeEditors.keys());
        for (const taskId of taskIds) {
            this.releaseEditor(taskId);
        }
    }
    /**
     * Force release all editors and clear pools
     */
    forceReleaseAllEditors() {
        // Force release all active editors
        const taskIds = Array.from(this.activeEditors.keys());
        for (const taskId of taskIds) {
            this.forceReleaseEditor(taskId);
        }
        // Clear and destroy pooled editors
        for (const editor of this.editorPool) {
            this.destroyEditor(editor);
        }
        this.editorPool = [];
    }
    /**
     * Get performance statistics
     */
    getStats() {
        return Object.assign(Object.assign({}, this.stats), { activeEditors: this.activeEditors.size, pooledEditors: this.editorPool.length, totalMemoryUsage: this.activeEditors.size + this.editorPool.length });
    }
    /**
     * Reset performance statistics
     */
    resetStats() {
        this.stats = {
            editorsCreated: 0,
            editorsReused: 0,
            editorsDestroyed: 0,
        };
    }
    createNewEditor(task, options) {
        const editor = new InlineEditor(this.app, this.plugin, task, options);
        this.addChild(editor);
        return editor;
    }
    destroyEditor(editor) {
        this.removeChild(editor);
        editor.unload();
        this.stats.editorsDestroyed++;
    }
    shouldUpdateEditor(editor, newOptions) {
        // Simple heuristic: always update if the editor is not currently editing
        // In a more sophisticated implementation, we could compare options
        return !editor.isCurrentlyEditing();
    }
    performPeriodicCleanup() {
        const now = Date.now();
        if (now - this.lastCleanupTime < this.cleanupInterval) {
            return;
        }
        this.lastCleanupTime = now;
        // Clean up any editors that might be stuck in editing state
        const stuckEditors = [];
        for (const [taskId, editor] of this.activeEditors) {
            // If an editor has been editing for too long, consider it stuck
            if (editor.isCurrentlyEditing()) {
                // In a real implementation, you might want to track edit start time
                // For now, we'll just log it
                console.warn(`Editor for task ${taskId} appears to be stuck in editing state`);
            }
        }
        // Optionally reduce pool size if we have too many unused editors
        if (this.editorPool.length > this.maxPoolSize) {
            const excessEditors = this.editorPool.splice(this.maxPoolSize);
            for (const editor of excessEditors) {
                this.destroyEditor(editor);
            }
        }
    }
    onload() {
        // Initialize any necessary resources
        this.lastCleanupTime = Date.now();
    }
    onunload() {
        // Clean up all active editors
        this.forceReleaseAllEditors();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5saW5lRWRpdG9yTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIklubGluZUVkaXRvck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUcxQyxPQUFPLEVBQUUsWUFBWSxFQUF1QixNQUFNLGdCQUFnQixDQUFDO0FBRW5FOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxTQUFTO0lBY2pELFlBQW9CLEdBQVEsRUFBVSxNQUE2QjtRQUNsRSxLQUFLLEVBQUUsQ0FBQztRQURXLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFBVSxXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQWIzRCxlQUFVLEdBQW1CLEVBQUUsQ0FBQztRQUNoQyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBQ2hELGdCQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsNENBQTRDO1FBQzdELG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLG9CQUFlLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYTtRQUU5Qyx1QkFBdUI7UUFDZixVQUFLLEdBQUc7WUFDZixjQUFjLEVBQUUsQ0FBQztZQUNqQixhQUFhLEVBQUUsQ0FBQztZQUNoQixnQkFBZ0IsRUFBRSxDQUFDO1NBQ25CLENBQUM7SUFJRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksU0FBUyxDQUFDLElBQVUsRUFBRSxPQUE0QjtRQUN4RCwwREFBMEQ7UUFDMUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksY0FBYyxFQUFFO1lBQ25CLHdEQUF3RDtZQUN4RCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3JELGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9B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UUFDTCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELFFBQVE7UUFDUCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDL0IsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBJbmxpbmVFZGl0b3IsIElubGluZUVkaXRvck9wdGlvbnMgfSBmcm9tIFwiLi9JbmxpbmVFZGl0b3JcIjtcclxuXHJcbi8qKlxyXG4gKiBNYW5hZ2VzIElubGluZUVkaXRvciBpbnN0YW5jZXMgd2l0aCBsYXp5IGluaXRpYWxpemF0aW9uIGFuZCBwb29saW5nXHJcbiAqIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2hlbiByZW5kZXJpbmcgbWFueSB0YXNrc1xyXG4gKlxyXG4gKiBQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zOlxyXG4gKiAtIE9iamVjdCBwb29saW5nIHRvIHJlZHVjZSBHQyBwcmVzc3VyZVxyXG4gKiAtIExhenkgaW5pdGlhbGl6YXRpb25cclxuICogLSBNZW1vcnktZWZmaWNpZW50IGVkaXRvciByZXVzZVxyXG4gKiAtIEF1dG9tYXRpYyBjbGVhbnVwIG9mIHVudXNlZCBlZGl0b3JzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5saW5lRWRpdG9yTWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBlZGl0b3JQb29sOiBJbmxpbmVFZGl0b3JbXSA9IFtdO1xyXG5cdHByaXZhdGUgYWN0aXZlRWRpdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBJbmxpbmVFZGl0b3I+KCk7XHJcblx0cHJpdmF0ZSBtYXhQb29sU2l6ZSA9IDM7IC8vIFJlZHVjZWQgcG9vbCBzaXplIGZvciBiZXR0ZXIgbWVtb3J5IHVzYWdlXHJcblx0cHJpdmF0ZSBsYXN0Q2xlYW51cFRpbWUgPSAwO1xyXG5cdHByaXZhdGUgY2xlYW51cEludGVydmFsID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcclxuXHJcblx0Ly8gUGVyZm9ybWFuY2UgdHJhY2tpbmdcclxuXHRwcml2YXRlIHN0YXRzID0ge1xyXG5cdFx0ZWRpdG9yc0NyZWF0ZWQ6IDAsXHJcblx0XHRlZGl0b3JzUmV1c2VkOiAwLFxyXG5cdFx0ZWRpdG9yc0Rlc3Ryb3llZDogMCxcclxuXHR9O1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGFwcDogQXBwLCBwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IG9yIGNyZWF0ZSBhbiBJbmxpbmVFZGl0b3IgZm9yIGEgdGFza1xyXG5cdCAqIFVzZXMgcG9vbGluZyB0byByZXVzZSBlZGl0b3IgaW5zdGFuY2VzXHJcblx0ICovXHJcblx0cHVibGljIGdldEVkaXRvcih0YXNrOiBUYXNrLCBvcHRpb25zOiBJbmxpbmVFZGl0b3JPcHRpb25zKTogSW5saW5lRWRpdG9yIHtcclxuXHRcdC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhbiBhY3RpdmUgZWRpdG9yIGZvciB0aGlzIHRhc2tcclxuXHRcdGNvbnN0IGV4aXN0aW5nRWRpdG9yID0gdGhpcy5hY3RpdmVFZGl0b3JzLmdldCh0YXNrLmlkKTtcclxuXHRcdGlmIChleGlzdGluZ0VkaXRvcikge1xyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIGV4aXN0aW5nIGVkaXRvciB3aXRoIG5ldyBvcHRpb25zIGlmIG5lZWRlZFxyXG5cdFx0XHRpZiAodGhpcy5zaG91bGRVcGRhdGVFZGl0b3IoZXhpc3RpbmdFZGl0b3IsIG9wdGlvbnMpKSB7XHJcblx0XHRcdFx0ZXhpc3RpbmdFZGl0b3IudXBkYXRlVGFzayh0YXNrLCBvcHRpb25zKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZXhpc3RpbmdFZGl0b3I7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUGVyaW9kaWMgY2xlYW51cCBvZiB1bnVzZWQgZWRpdG9yc1xyXG5cdFx0dGhpcy5wZXJmb3JtUGVyaW9kaWNDbGVhbnVwKCk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGdldCBhbiBlZGl0b3IgZnJvbSB0aGUgcG9vbFxyXG5cdFx0bGV0IGVkaXRvciA9IHRoaXMuZWRpdG9yUG9vbC5wb3AoKTtcclxuXHJcblx0XHRpZiAoIWVkaXRvcikge1xyXG5cdFx0XHQvLyBDcmVhdGUgbmV3IGVkaXRvciBpZiBwb29sIGlzIGVtcHR5XHJcblx0XHRcdGVkaXRvciA9IHRoaXMuY3JlYXRlTmV3RWRpdG9yKHRhc2ssIG9wdGlvbnMpO1xyXG5cdFx0XHR0aGlzLnN0YXRzLmVkaXRvcnNDcmVhdGVkKys7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBSZXVzZSBwb29sZWQgZWRpdG9yIHdpdGggbmV3IHRhc2sgYW5kIG9wdGlvbnNcclxuXHRcdFx0ZWRpdG9yLnVwZGF0ZVRhc2sodGFzaywgb3B0aW9ucyk7XHJcblx0XHRcdHRoaXMuc3RhdHMuZWRpdG9yc1JldXNlZCsrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyYWNrIGFjdGl2ZSBlZGl0b3JcclxuXHRcdHRoaXMuYWN0aXZlRWRpdG9ycy5zZXQodGFzay5pZCwgZWRpdG9yKTtcclxuXHJcblx0XHRyZXR1cm4gZWRpdG9yO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmV0dXJuIGFuIGVkaXRvciB0byB0aGUgcG9vbCB3aGVuIG5vIGxvbmdlciBuZWVkZWRcclxuXHQgKi9cclxuXHRwdWJsaWMgcmVsZWFzZUVkaXRvcih0YXNrSWQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5hY3RpdmVFZGl0b3JzLmdldCh0YXNrSWQpO1xyXG5cdFx0aWYgKCFlZGl0b3IpIHJldHVybjtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBhY3RpdmUgZWRpdG9yc1xyXG5cdFx0dGhpcy5hY3RpdmVFZGl0b3JzLmRlbGV0ZSh0YXNrSWQpO1xyXG5cclxuXHRcdC8vIERvbid0IHBvb2wgZWRpdG9ycyB0aGF0IGFyZSBjdXJyZW50bHkgZWRpdGluZ1xyXG5cdFx0aWYgKGVkaXRvci5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHQvLyBEZXN0cm95IHRoZSBlZGl0b3IgaWYgaXQncyBzdGlsbCBlZGl0aW5nIChzYWZldHkgbWVhc3VyZSlcclxuXHRcdFx0dGhpcy5kZXN0cm95RWRpdG9yKGVkaXRvcik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXNldCBlZGl0b3Igc3RhdGVcclxuXHRcdGVkaXRvci5yZXNldCgpO1xyXG5cclxuXHRcdC8vIFJldHVybiB0byBwb29sIGlmIG5vdCBmdWxsXHJcblx0XHRpZiAodGhpcy5lZGl0b3JQb29sLmxlbmd0aCA8IHRoaXMubWF4UG9vbFNpemUpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3JQb29sLnB1c2goZWRpdG9yKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFBvb2wgaXMgZnVsbCwgZGVzdHJveSB0aGUgZWRpdG9yXHJcblx0XHRcdHRoaXMuZGVzdHJveUVkaXRvcihlZGl0b3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgcmVsZWFzZSBhbiBlZGl0b3IgKHVzZWZ1bCBmb3IgY2xlYW51cClcclxuXHQgKi9cclxuXHRwdWJsaWMgZm9yY2VSZWxlYXNlRWRpdG9yKHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBlZGl0b3IgPSB0aGlzLmFjdGl2ZUVkaXRvcnMuZ2V0KHRhc2tJZCk7XHJcblx0XHRpZiAoIWVkaXRvcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIGFjdGl2ZSBlZGl0b3JzXHJcblx0XHR0aGlzLmFjdGl2ZUVkaXRvcnMuZGVsZXRlKHRhc2tJZCk7XHJcblxyXG5cdFx0Ly8gQWx3YXlzIGRlc3Ryb3kgd2hlbiBmb3JjZSByZWxlYXNpbmdcclxuXHRcdHRoaXMuZGVzdHJveUVkaXRvcihlZGl0b3IpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSB0YXNrIGhhcyBhbiBhY3RpdmUgZWRpdG9yXHJcblx0ICovXHJcblx0cHVibGljIGhhc0FjdGl2ZUVkaXRvcih0YXNrSWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuYWN0aXZlRWRpdG9ycy5oYXModGFza0lkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgYWN0aXZlIGVkaXRvciBmb3IgYSB0YXNrIGlmIGl0IGV4aXN0c1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRBY3RpdmVFZGl0b3IodGFza0lkOiBzdHJpbmcpOiBJbmxpbmVFZGl0b3IgfCB1bmRlZmluZWQge1xyXG5cdFx0cmV0dXJuIHRoaXMuYWN0aXZlRWRpdG9ycy5nZXQodGFza0lkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbGVhc2UgYWxsIGFjdGl2ZSBlZGl0b3JzICh1c2VmdWwgZm9yIGNsZWFudXApXHJcblx0ICovXHJcblx0cHVibGljIHJlbGVhc2VBbGxFZGl0b3JzKCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgdGFza0lkcyA9IEFycmF5LmZyb20odGhpcy5hY3RpdmVFZGl0b3JzLmtleXMoKSk7XHJcblx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiB0YXNrSWRzKSB7XHJcblx0XHRcdHRoaXMucmVsZWFzZUVkaXRvcih0YXNrSWQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgcmVsZWFzZSBhbGwgZWRpdG9ycyBhbmQgY2xlYXIgcG9vbHNcclxuXHQgKi9cclxuXHRwdWJsaWMgZm9yY2VSZWxlYXNlQWxsRWRpdG9ycygpOiB2b2lkIHtcclxuXHRcdC8vIEZvcmNlIHJlbGVhc2UgYWxsIGFjdGl2ZSBlZGl0b3JzXHJcblx0XHRjb25zdCB0YXNrSWRzID0gQXJyYXkuZnJvbSh0aGlzLmFjdGl2ZUVkaXRvcnMua2V5cygpKTtcclxuXHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHRhc2tJZHMpIHtcclxuXHRcdFx0dGhpcy5mb3JjZVJlbGVhc2VFZGl0b3IodGFza0lkKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhciBhbmQgZGVzdHJveSBwb29sZWQgZWRpdG9yc1xyXG5cdFx0Zm9yIChjb25zdCBlZGl0b3Igb2YgdGhpcy5lZGl0b3JQb29sKSB7XHJcblx0XHRcdHRoaXMuZGVzdHJveUVkaXRvcihlZGl0b3IpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5lZGl0b3JQb29sID0gW107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcGVyZm9ybWFuY2Ugc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRTdGF0cygpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdC4uLnRoaXMuc3RhdHMsXHJcblx0XHRcdGFjdGl2ZUVkaXRvcnM6IHRoaXMuYWN0aXZlRWRpdG9ycy5zaXplLFxyXG5cdFx0XHRwb29sZWRFZGl0b3JzOiB0aGlzLmVkaXRvclBvb2wubGVuZ3RoLFxyXG5cdFx0XHR0b3RhbE1lbW9yeVVzYWdlOiB0aGlzLmFjdGl2ZUVkaXRvcnMuc2l6ZSArIHRoaXMuZWRpdG9yUG9vbC5sZW5ndGgsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVzZXQgcGVyZm9ybWFuY2Ugc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyByZXNldFN0YXRzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zdGF0cyA9IHtcclxuXHRcdFx0ZWRpdG9yc0NyZWF0ZWQ6IDAsXHJcblx0XHRcdGVkaXRvcnNSZXVzZWQ6IDAsXHJcblx0XHRcdGVkaXRvcnNEZXN0cm95ZWQ6IDAsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVOZXdFZGl0b3IoXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0b3B0aW9uczogSW5saW5lRWRpdG9yT3B0aW9uc1xyXG5cdCk6IElubGluZUVkaXRvciB7XHJcblx0XHRjb25zdCBlZGl0b3IgPSBuZXcgSW5saW5lRWRpdG9yKHRoaXMuYXBwLCB0aGlzLnBsdWdpbiwgdGFzaywgb3B0aW9ucyk7XHJcblx0XHR0aGlzLmFkZENoaWxkKGVkaXRvcik7XHJcblx0XHRyZXR1cm4gZWRpdG9yO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkZXN0cm95RWRpdG9yKGVkaXRvcjogSW5saW5lRWRpdG9yKTogdm9pZCB7XHJcblx0XHR0aGlzLnJlbW92ZUNoaWxkKGVkaXRvcik7XHJcblx0XHRlZGl0b3IudW5sb2FkKCk7XHJcblx0XHR0aGlzLnN0YXRzLmVkaXRvcnNEZXN0cm95ZWQrKztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvdWxkVXBkYXRlRWRpdG9yKFxyXG5cdFx0ZWRpdG9yOiBJbmxpbmVFZGl0b3IsXHJcblx0XHRuZXdPcHRpb25zOiBJbmxpbmVFZGl0b3JPcHRpb25zXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHQvLyBTaW1wbGUgaGV1cmlzdGljOiBhbHdheXMgdXBkYXRlIGlmIHRoZSBlZGl0b3IgaXMgbm90IGN1cnJlbnRseSBlZGl0aW5nXHJcblx0XHQvLyBJbiBhIG1vcmUgc29waGlzdGljYXRlZCBpbXBsZW1lbnRhdGlvbiwgd2UgY291bGQgY29tcGFyZSBvcHRpb25zXHJcblx0XHRyZXR1cm4gIWVkaXRvci5pc0N1cnJlbnRseUVkaXRpbmcoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGVyZm9ybVBlcmlvZGljQ2xlYW51cCgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRpZiAobm93IC0gdGhpcy5sYXN0Q2xlYW51cFRpbWUgPCB0aGlzLmNsZWFudXBJbnRlcnZhbCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5sYXN0Q2xlYW51cFRpbWUgPSBub3c7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgYW55IGVkaXRvcnMgdGhhdCBtaWdodCBiZSBzdHVjayBpbiBlZGl0aW5nIHN0YXRlXHJcblx0XHRjb25zdCBzdHVja0VkaXRvcnM6IHN0cmluZ1tdID0gW107XHJcblx0XHRmb3IgKGNvbnN0IFt0YXNrSWQsIGVkaXRvcl0gb2YgdGhpcy5hY3RpdmVFZGl0b3JzKSB7XHJcblx0XHRcdC8vIElmIGFuIGVkaXRvciBoYXMgYmVlbiBlZGl0aW5nIGZvciB0b28gbG9uZywgY29uc2lkZXIgaXQgc3R1Y2tcclxuXHRcdFx0aWYgKGVkaXRvci5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IG1pZ2h0IHdhbnQgdG8gdHJhY2sgZWRpdCBzdGFydCB0aW1lXHJcblx0XHRcdFx0Ly8gRm9yIG5vdywgd2UnbGwganVzdCBsb2cgaXRcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgRWRpdG9yIGZvciB0YXNrICR7dGFza0lkfSBhcHBlYXJzIHRvIGJlIHN0dWNrIGluIGVkaXRpbmcgc3RhdGVgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9wdGlvbmFsbHkgcmVkdWNlIHBvb2wgc2l6ZSBpZiB3ZSBoYXZlIHRvbyBtYW55IHVudXNlZCBlZGl0b3JzXHJcblx0XHRpZiAodGhpcy5lZGl0b3JQb29sLmxlbmd0aCA+IHRoaXMubWF4UG9vbFNpemUpIHtcclxuXHRcdFx0Y29uc3QgZXhjZXNzRWRpdG9ycyA9IHRoaXMuZWRpdG9yUG9vbC5zcGxpY2UodGhpcy5tYXhQb29sU2l6ZSk7XHJcblx0XHRcdGZvciAoY29uc3QgZWRpdG9yIG9mIGV4Y2Vzc0VkaXRvcnMpIHtcclxuXHRcdFx0XHR0aGlzLmRlc3Ryb3lFZGl0b3IoZWRpdG9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBhbnkgbmVjZXNzYXJ5IHJlc291cmNlc1xyXG5cdFx0dGhpcy5sYXN0Q2xlYW51cFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHQvLyBDbGVhbiB1cCBhbGwgYWN0aXZlIGVkaXRvcnNcclxuXHRcdHRoaXMuZm9yY2VSZWxlYXNlQWxsRWRpdG9ycygpO1xyXG5cdH1cclxufVxyXG4iXX0=