import { debounce, Component, } from "obsidian";
import { Events, emit, on } from "../events/Events";
/**
 * ObsidianSource - Independent event source management
 *
 * This component manages all Obsidian vault events and transforms them into
 * standardized internal events. It provides:
 * - Unified debouncing and batch merging
 * - Event transformation and filtering
 * - Independent lifecycle management
 */
export class ObsidianSource extends Component {
    constructor(app, vault, metadataCache) {
        super();
        // Event references for cleanup
        this.eventRefs = [];
        // Debouncing configuration
        this.DEBOUNCE_DELAY = 300; // ms
        this.BATCH_DELAY = 150; // ms for batch operations
        // Debouncing maps (use Obsidian's debounce per path)
        this.pendingFileChanges = new Map();
        this.pendingMetadataChanges = new Map();
        this.pendingBatch = new Set();
        this.debouncedBatch = null;
        // Event filtering
        this.IGNORED_EXTENSIONS = new Set([".tmp", ".swp", ".log"]);
        this.RELEVANT_EXTENSIONS = new Set(["md", "canvas"]);
        // Skip modification tracking for WriteAPI operations
        this.skipNextModify = new Set();
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
    }
    onload() {
        this.initialize();
    }
    /**
     * Initialize event subscriptions
     */
    initialize() {
        console.log("ObsidianSource: Initializing event subscriptions");
        this.registerEvent(on(this.app, Events.WRITE_OPERATION_START, ({ path }) => {
            this.skipNextModify.add(path);
            // Auto cleanup after 5 seconds to prevent memory leaks
            setTimeout(() => this.skipNextModify.delete(path), 5000);
        }));
        this.registerEvent(on(this.app, Events.WRITE_OPERATION_COMPLETE, ({ path }) => {
            // Delay cleanup slightly to ensure metadata changes are also skipped
            setTimeout(() => {
                this.skipNextModify.delete(path);
            }, 100);
        }));
        this.registerEvent(this.vault.on("create", this.onFileCreate.bind(this)));
        this.registerEvent(this.vault.on("modify", this.onFileModify.bind(this)));
        this.registerEvent(this.vault.on("delete", this.onFileDelete.bind(this)));
        this.registerEvent(this.vault.on("rename", this.onFileRename.bind(this)));
        this.registerEvent(this.metadataCache.on("changed", this.onMetadataChange.bind(this)));
        this.registerEvent(this.metadataCache.on("resolve", this.onMetadataResolve.bind(this)));
        console.log(`ObsidianSource: Subscribed to ${this.eventRefs.length} event types`);
    }
    /**
     * Handle file creation
     */
    onFileCreate(file) {
        if (!this.app.workspace.layoutReady) {
            return;
        }
        if (!this.isRelevantFile(file)) {
            return;
        }
        console.log(`ObsidianSource: File created - ${file.path}`);
        // Emit immediate event for file creation
        emit(this.app, Events.FILE_UPDATED, {
            path: file.path,
            reason: "create",
            timestamp: Date.now(),
        });
    }
    /**
     * Handle file modification with debouncing
     */
    onFileModify(file) {
        if (!this.isRelevantFile(file)) {
            return;
        }
        // Skip if this modification is from WriteAPI
        // The WriteAPI will emit WRITE_OPERATION_COMPLETE event which is handled by Orchestrator
        if (this.skipNextModify.has(file.path)) {
            this.skipNextModify.delete(file.path);
            console.log(`ObsidianSource: Skipping modify event for ${file.path} (handled by WriteAPI)`);
            return;
        }
        // Debounced emit per path using Obsidian's debounce
        let debounced = this.pendingFileChanges.get(file.path);
        if (!debounced) {
            debounced = debounce(() => {
                this.emitFileUpdated(file.path, "modify");
            }, this.DEBOUNCE_DELAY, false);
            this.pendingFileChanges.set(file.path, debounced);
        }
        debounced();
    }
    /**
     * Handle file deletion
     */
    onFileDelete(file) {
        if (!this.isRelevantFile(file)) {
            return;
        }
        console.log(`ObsidianSource: File deleted - ${file.path}`);
        // Clear any pending debounced action for this file (drop reference)
        if (this.pendingFileChanges.has(file.path)) {
            this.pendingFileChanges.delete(file.path);
        }
        // Emit immediate event for file deletion
        emit(this.app, Events.FILE_UPDATED, {
            path: file.path,
            reason: "delete",
            timestamp: Date.now(),
        });
    }
    /**
     * Handle file rename/move
     */
    onFileRename(file, oldPath) {
        if (!this.isRelevantFile(file)) {
            return;
        }
        console.log(`ObsidianSource: File renamed - ${oldPath} -> ${file.path}`);
        // Clear any pending debounced action for the old path (drop reference)
        if (this.pendingFileChanges.has(oldPath)) {
            this.pendingFileChanges.delete(oldPath);
        }
        // Emit immediate events for both old and new paths
        emit(this.app, Events.FILE_UPDATED, {
            path: oldPath,
            reason: "delete",
            timestamp: Date.now(),
        });
        emit(this.app, Events.FILE_UPDATED, {
            path: file.path,
            reason: "rename",
            timestamp: Date.now(),
        });
    }
    /**
     * Handle metadata changes with debouncing
     */
    onMetadataChange(file) {
        if (!this.isRelevantFile(file)) {
            return;
        }
        // Skip if this metadata change is from WriteAPI
        // WriteAPI operations can trigger metadata changes, but we handle them via TASK_UPDATED
        if (this.skipNextModify.has(file.path)) {
            console.log(`ObsidianSource: Skipping metadata change for ${file.path} (handled by WriteAPI)`);
            return;
        }
        // Debounced emit per path using Obsidian's debounce
        let debounced = this.pendingMetadataChanges.get(file.path);
        if (!debounced) {
            debounced = debounce(() => {
                this.emitFileUpdated(file.path, "frontmatter");
            }, this.DEBOUNCE_DELAY, false);
            this.pendingMetadataChanges.set(file.path, debounced);
        }
        debounced();
    }
    /**
     * Handle metadata resolution (usually after initial scan)
     */
    onMetadataResolve(file) {
        if (!this.isRelevantFile(file)) {
            return;
        }
        // Add to batch for bulk processing
        this.addToBatch(file.path);
    }
    /**
     * Add file to batch processing queue
     */
    addToBatch(filePath) {
        this.pendingBatch.add(filePath);
        // Debounced batch processing using Obsidian's debounce
        if (!this.debouncedBatch) {
            this.debouncedBatch = debounce(() => this.processBatch(), this.BATCH_DELAY, false);
        }
        this.debouncedBatch();
    }
    /**
     * Process accumulated batch of file changes
     */
    processBatch() {
        if (this.pendingBatch.size === 0) {
            return;
        }
        const files = Array.from(this.pendingBatch);
        this.pendingBatch.clear();
        console.log(`ObsidianSource: Processing batch of ${files.length} files`);
        // Emit batch update event
        emit(this.app, Events.TASK_CACHE_UPDATED, {
            changedFiles: files,
            stats: {
                total: files.length,
                changed: files.length,
            },
            timestamp: Date.now(),
            seq: Date.now(), // Events module will handle proper sequence numbering
        });
    }
    /**
     * Emit a file updated event
     */
    emitFileUpdated(filePath, reason) {
        console.log(`ObsidianSource: Emitting file update - ${filePath} (${reason})`);
        emit(this.app, Events.FILE_UPDATED, {
            path: filePath,
            reason,
            timestamp: Date.now(),
        });
    }
    /**
     * Check if a file is relevant for task processing
     */
    isRelevantFile(file) {
        var _a;
        // Skip non-files
        if (!file || typeof file.path !== "string") {
            return false;
        }
        // Skip files with ignored extensions
        const extension = (_a = file.extension) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!extension || this.IGNORED_EXTENSIONS.has(`.${extension}`)) {
            return false;
        }
        // Only process relevant file types
        if (!this.RELEVANT_EXTENSIONS.has(extension)) {
            return false;
        }
        // Skip system/hidden files
        if (file.path.startsWith(".") || file.path.includes("/.")) {
            return false;
        }
        return true;
    }
    /**
     * Manually trigger processing of specific files (for testing or recovery)
     */
    triggerFileUpdate(filePath, reason = "modify") {
        this.emitFileUpdated(filePath, reason);
    }
    /**
     * Trigger batch processing of multiple files
     */
    triggerBatchUpdate(filePaths) {
        if (filePaths.length === 0) {
            return;
        }
        console.log(`ObsidianSource: Manual batch trigger for ${filePaths.length} files`);
        emit(this.app, Events.TASK_CACHE_UPDATED, {
            changedFiles: filePaths,
            stats: {
                total: filePaths.length,
                changed: filePaths.length,
            },
            timestamp: Date.now(),
            seq: Date.now(),
        });
    }
    /**
     * Force flush all pending debounced changes
     */
    flush() {
        console.log("ObsidianSource: Flushing all pending changes");
        // Process all pending file changes (invoke immediately and drop references)
        for (const filePath of Array.from(this.pendingFileChanges.keys())) {
            this.pendingFileChanges.delete(filePath);
            this.emitFileUpdated(filePath, "modify");
        }
        // Process all pending metadata changes (invoke immediately and drop references)
        for (const filePath of Array.from(this.pendingMetadataChanges.keys())) {
            this.pendingMetadataChanges.delete(filePath);
            this.emitFileUpdated(filePath, "frontmatter");
        }
        // Process pending batch immediately
        this.processBatch();
    }
    /**
     * Get statistics about pending operations
     */
    getStats() {
        return {
            pendingFileChanges: this.pendingFileChanges.size,
            pendingMetadataChanges: this.pendingMetadataChanges.size,
            pendingBatchSize: this.pendingBatch.size,
            hasBatchDebounce: this.debouncedBatch !== null,
        };
    }
    /**
     * Cleanup resources and unsubscribe from events
     */
    destroy() {
        console.log("ObsidianSource: Cleaning up event subscriptions");
        // Drop references to all pending debounced actions
        this.pendingFileChanges.clear();
        this.pendingMetadataChanges.clear();
        this.debouncedBatch = null;
        this.pendingBatch.clear();
        console.log("ObsidianSource: Cleanup complete");
        this.unload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT2JzaWRpYW5Tb3VyY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJPYnNpZGlhblNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04sUUFBUSxFQU1SLFNBQVMsR0FDVCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVwRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxjQUFlLFNBQVEsU0FBUztJQXlCNUMsWUFBWSxHQUFRLEVBQUUsS0FBWSxFQUFFLGFBQTRCO1FBQy9ELEtBQUssRUFBRSxDQUFDO1FBckJULCtCQUErQjtRQUN2QixjQUFTLEdBQWUsRUFBRSxDQUFDO1FBRW5DLDJCQUEyQjtRQUNWLG1CQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSztRQUMzQixnQkFBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQjtRQUU5RCxxREFBcUQ7UUFDN0MsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7UUFDbkQsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7UUFDdkQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2pDLG1CQUFjLEdBQXdCLElBQUksQ0FBQztRQUVuRCxrQkFBa0I7UUFDRCx1QkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN2RCx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWpFLHFEQUFxRDtRQUM3QyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJMUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJ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LENBQUM7WUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7U0FDOUM7UUFFRCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCxPQUFPO1lBQ04sa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUk7WUFDaEQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUk7WUFDeEQsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJO1lBQ3hDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSTtTQUM5QyxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUUvRCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUdoRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdGRlYm91bmNlLFxyXG5cdHR5cGUgQXBwLFxyXG5cdHR5cGUgVEZpbGUsXHJcblx0dHlwZSBWYXVsdCxcclxuXHR0eXBlIE1ldGFkYXRhQ2FjaGUsXHJcblx0dHlwZSBFdmVudFJlZixcclxuXHRDb21wb25lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEV2ZW50cywgZW1pdCwgb24gfSBmcm9tIFwiLi4vZXZlbnRzL0V2ZW50c1wiO1xyXG5cclxuLyoqXHJcbiAqIE9ic2lkaWFuU291cmNlIC0gSW5kZXBlbmRlbnQgZXZlbnQgc291cmNlIG1hbmFnZW1lbnRcclxuICpcclxuICogVGhpcyBjb21wb25lbnQgbWFuYWdlcyBhbGwgT2JzaWRpYW4gdmF1bHQgZXZlbnRzIGFuZCB0cmFuc2Zvcm1zIHRoZW0gaW50b1xyXG4gKiBzdGFuZGFyZGl6ZWQgaW50ZXJuYWwgZXZlbnRzLiBJdCBwcm92aWRlczpcclxuICogLSBVbmlmaWVkIGRlYm91bmNpbmcgYW5kIGJhdGNoIG1lcmdpbmdcclxuICogLSBFdmVudCB0cmFuc2Zvcm1hdGlvbiBhbmQgZmlsdGVyaW5nXHJcbiAqIC0gSW5kZXBlbmRlbnQgbGlmZWN5Y2xlIG1hbmFnZW1lbnRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBPYnNpZGlhblNvdXJjZSBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHZhdWx0OiBWYXVsdDtcclxuXHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XHJcblxyXG5cdC8vIEV2ZW50IHJlZmVyZW5jZXMgZm9yIGNsZWFudXBcclxuXHRwcml2YXRlIGV2ZW50UmVmczogRXZlbnRSZWZbXSA9IFtdO1xyXG5cclxuXHQvLyBEZWJvdW5jaW5nIGNvbmZpZ3VyYXRpb25cclxuXHRwcml2YXRlIHJlYWRvbmx5IERFQk9VTkNFX0RFTEFZID0gMzAwOyAvLyBtc1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgQkFUQ0hfREVMQVkgPSAxNTA7IC8vIG1zIGZvciBiYXRjaCBvcGVyYXRpb25zXHJcblxyXG5cdC8vIERlYm91bmNpbmcgbWFwcyAodXNlIE9ic2lkaWFuJ3MgZGVib3VuY2UgcGVyIHBhdGgpXHJcblx0cHJpdmF0ZSBwZW5kaW5nRmlsZUNoYW5nZXMgPSBuZXcgTWFwPHN0cmluZywgKCkgPT4gdm9pZD4oKTtcclxuXHRwcml2YXRlIHBlbmRpbmdNZXRhZGF0YUNoYW5nZXMgPSBuZXcgTWFwPHN0cmluZywgKCkgPT4gdm9pZD4oKTtcclxuXHRwcml2YXRlIHBlbmRpbmdCYXRjaCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdHByaXZhdGUgZGVib3VuY2VkQmF0Y2g6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBFdmVudCBmaWx0ZXJpbmdcclxuXHRwcml2YXRlIHJlYWRvbmx5IElHTk9SRURfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1wiLnRtcFwiLCBcIi5zd3BcIiwgXCIubG9nXCJdKTtcclxuXHRwcml2YXRlIHJlYWRvbmx5IFJFTEVWQU5UX0VYVEVOU0lPTlMgPSBuZXcgU2V0KFtcIm1kXCIsIFwiY2FudmFzXCJdKTtcclxuXHJcblx0Ly8gU2tpcCBtb2RpZmljYXRpb24gdHJhY2tpbmcgZm9yIFdyaXRlQVBJIG9wZXJhdGlvbnNcclxuXHRwcml2YXRlIHNraXBOZXh0TW9kaWZ5ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCB2YXVsdDogVmF1bHQsIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMudmF1bHQgPSB2YXVsdDtcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IG1ldGFkYXRhQ2FjaGU7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmluaXRpYWxpemUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgZXZlbnQgc3Vic2NyaXB0aW9uc1xyXG5cdCAqL1xyXG5cdGluaXRpYWxpemUoKTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhcIk9ic2lkaWFuU291cmNlOiBJbml0aWFsaXppbmcgZXZlbnQgc3Vic2NyaXB0aW9uc1wiKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX1NUQVJULCAoeyBwYXRoIH0pID0+IHtcclxuXHRcdFx0XHR0aGlzLnNraXBOZXh0TW9kaWZ5LmFkZChwYXRoKTtcclxuXHRcdFx0XHQvLyBBdXRvIGNsZWFudXAgYWZ0ZXIgNSBzZWNvbmRzIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXHJcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnNraXBOZXh0TW9kaWZ5LmRlbGV0ZShwYXRoKSwgNTAwMCk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5XUklURV9PUEVSQVRJT05fQ09NUExFVEUsICh7IHBhdGggfSkgPT4ge1xyXG5cdFx0XHRcdC8vIERlbGF5IGNsZWFudXAgc2xpZ2h0bHkgdG8gZW5zdXJlIG1ldGFkYXRhIGNoYW5nZXMgYXJlIGFsc28gc2tpcHBlZFxyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5za2lwTmV4dE1vZGlmeS5kZWxldGUocGF0aCk7XHJcblx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KHRoaXMudmF1bHQub24oXCJjcmVhdGVcIiwgdGhpcy5vbkZpbGVDcmVhdGUuYmluZCh0aGlzKSkpXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy52YXVsdC5vbihcIm1vZGlmeVwiLCB0aGlzLm9uRmlsZU1vZGlmeS5iaW5kKHRoaXMpKSlcclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLnZhdWx0Lm9uKFwiZGVsZXRlXCIsIHRoaXMub25GaWxlRGVsZXRlLmJpbmQodGhpcykpKVxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KHRoaXMudmF1bHQub24oXCJyZW5hbWVcIiwgdGhpcy5vbkZpbGVSZW5hbWUuYmluZCh0aGlzKSkpXHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KHRoaXMubWV0YWRhdGFDYWNoZS5vbihcImNoYW5nZWRcIiwgdGhpcy5vbk1ldGFkYXRhQ2hhbmdlLmJpbmQodGhpcykpKVxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KHRoaXMubWV0YWRhdGFDYWNoZS5vbihcInJlc29sdmVcIiwgdGhpcy5vbk1ldGFkYXRhUmVzb2x2ZS5iaW5kKHRoaXMpKSlcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YE9ic2lkaWFuU291cmNlOiBTdWJzY3JpYmVkIHRvICR7dGhpcy5ldmVudFJlZnMubGVuZ3RofSBldmVudCB0eXBlc2BcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZmlsZSBjcmVhdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgb25GaWxlQ3JlYXRlKGZpbGU6IFRGaWxlKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuYXBwLndvcmtzcGFjZS5sYXlvdXRSZWFkeSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLmlzUmVsZXZhbnRGaWxlKGZpbGUpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhgT2JzaWRpYW5Tb3VyY2U6IEZpbGUgY3JlYXRlZCAtICR7ZmlsZS5wYXRofWApO1xyXG5cclxuXHRcdC8vIEVtaXQgaW1tZWRpYXRlIGV2ZW50IGZvciBmaWxlIGNyZWF0aW9uXHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuRklMRV9VUERBVEVELCB7XHJcblx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0cmVhc29uOiBcImNyZWF0ZVwiLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIG1vZGlmaWNhdGlvbiB3aXRoIGRlYm91bmNpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIG9uRmlsZU1vZGlmeShmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmlzUmVsZXZhbnRGaWxlKGZpbGUpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTa2lwIGlmIHRoaXMgbW9kaWZpY2F0aW9uIGlzIGZyb20gV3JpdGVBUElcclxuXHRcdC8vIFRoZSBXcml0ZUFQSSB3aWxsIGVtaXQgV1JJVEVfT1BFUkFUSU9OX0NPTVBMRVRFIGV2ZW50IHdoaWNoIGlzIGhhbmRsZWQgYnkgT3JjaGVzdHJhdG9yXHJcblx0XHRpZiAodGhpcy5za2lwTmV4dE1vZGlmeS5oYXMoZmlsZS5wYXRoKSkge1xyXG5cdFx0XHR0aGlzLnNraXBOZXh0TW9kaWZ5LmRlbGV0ZShmaWxlLnBhdGgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgT2JzaWRpYW5Tb3VyY2U6IFNraXBwaW5nIG1vZGlmeSBldmVudCBmb3IgJHtmaWxlLnBhdGh9IChoYW5kbGVkIGJ5IFdyaXRlQVBJKWBcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlYm91bmNlZCBlbWl0IHBlciBwYXRoIHVzaW5nIE9ic2lkaWFuJ3MgZGVib3VuY2VcclxuXHRcdGxldCBkZWJvdW5jZWQgPSB0aGlzLnBlbmRpbmdGaWxlQ2hhbmdlcy5nZXQoZmlsZS5wYXRoKTtcclxuXHRcdGlmICghZGVib3VuY2VkKSB7XHJcblx0XHRcdGRlYm91bmNlZCA9IGRlYm91bmNlKFxyXG5cdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZW1pdEZpbGVVcGRhdGVkKGZpbGUucGF0aCwgXCJtb2RpZnlcIik7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0aGlzLkRFQk9VTkNFX0RFTEFZLFxyXG5cdFx0XHRcdGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMucGVuZGluZ0ZpbGVDaGFuZ2VzLnNldChmaWxlLnBhdGgsIGRlYm91bmNlZCk7XHJcblx0XHR9XHJcblx0XHRkZWJvdW5jZWQoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIGRlbGV0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBvbkZpbGVEZWxldGUoZmlsZTogVEZpbGUpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pc1JlbGV2YW50RmlsZShmaWxlKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coYE9ic2lkaWFuU291cmNlOiBGaWxlIGRlbGV0ZWQgLSAke2ZpbGUucGF0aH1gKTtcclxuXHJcblx0XHQvLyBDbGVhciBhbnkgcGVuZGluZyBkZWJvdW5jZWQgYWN0aW9uIGZvciB0aGlzIGZpbGUgKGRyb3AgcmVmZXJlbmNlKVxyXG5cdFx0aWYgKHRoaXMucGVuZGluZ0ZpbGVDaGFuZ2VzLmhhcyhmaWxlLnBhdGgpKSB7XHJcblx0XHRcdHRoaXMucGVuZGluZ0ZpbGVDaGFuZ2VzLmRlbGV0ZShmaWxlLnBhdGgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVtaXQgaW1tZWRpYXRlIGV2ZW50IGZvciBmaWxlIGRlbGV0aW9uXHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuRklMRV9VUERBVEVELCB7XHJcblx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0cmVhc29uOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIHJlbmFtZS9tb3ZlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBvbkZpbGVSZW5hbWUoZmlsZTogVEZpbGUsIG9sZFBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmlzUmVsZXZhbnRGaWxlKGZpbGUpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YE9ic2lkaWFuU291cmNlOiBGaWxlIHJlbmFtZWQgLSAke29sZFBhdGh9IC0+ICR7ZmlsZS5wYXRofWBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgYW55IHBlbmRpbmcgZGVib3VuY2VkIGFjdGlvbiBmb3IgdGhlIG9sZCBwYXRoIChkcm9wIHJlZmVyZW5jZSlcclxuXHRcdGlmICh0aGlzLnBlbmRpbmdGaWxlQ2hhbmdlcy5oYXMob2xkUGF0aCkpIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nRmlsZUNoYW5nZXMuZGVsZXRlKG9sZFBhdGgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVtaXQgaW1tZWRpYXRlIGV2ZW50cyBmb3IgYm90aCBvbGQgYW5kIG5ldyBwYXRoc1xyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVVBEQVRFRCwge1xyXG5cdFx0XHRwYXRoOiBvbGRQYXRoLFxyXG5cdFx0XHRyZWFzb246IFwiZGVsZXRlXCIsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5GSUxFX1VQREFURUQsIHtcclxuXHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRyZWFzb246IFwicmVuYW1lXCIsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIG1ldGFkYXRhIGNoYW5nZXMgd2l0aCBkZWJvdW5jaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBvbk1ldGFkYXRhQ2hhbmdlKGZpbGU6IFRGaWxlKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaXNSZWxldmFudEZpbGUoZmlsZSkpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNraXAgaWYgdGhpcyBtZXRhZGF0YSBjaGFuZ2UgaXMgZnJvbSBXcml0ZUFQSVxyXG5cdFx0Ly8gV3JpdGVBUEkgb3BlcmF0aW9ucyBjYW4gdHJpZ2dlciBtZXRhZGF0YSBjaGFuZ2VzLCBidXQgd2UgaGFuZGxlIHRoZW0gdmlhIFRBU0tfVVBEQVRFRFxyXG5cdFx0aWYgKHRoaXMuc2tpcE5leHRNb2RpZnkuaGFzKGZpbGUucGF0aCkpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YE9ic2lkaWFuU291cmNlOiBTa2lwcGluZyBtZXRhZGF0YSBjaGFuZ2UgZm9yICR7ZmlsZS5wYXRofSAoaGFuZGxlZCBieSBXcml0ZUFQSSlgXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZWJvdW5jZWQgZW1pdCBwZXIgcGF0aCB1c2luZyBPYnNpZGlhbidzIGRlYm91bmNlXHJcblx0XHRsZXQgZGVib3VuY2VkID0gdGhpcy5wZW5kaW5nTWV0YWRhdGFDaGFuZ2VzLmdldChmaWxlLnBhdGgpO1xyXG5cdFx0aWYgKCFkZWJvdW5jZWQpIHtcclxuXHRcdFx0ZGVib3VuY2VkID0gZGVib3VuY2UoXHJcblx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5lbWl0RmlsZVVwZGF0ZWQoZmlsZS5wYXRoLCBcImZyb250bWF0dGVyXCIpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGhpcy5ERUJPVU5DRV9ERUxBWSxcclxuXHRcdFx0XHRmYWxzZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdNZXRhZGF0YUNoYW5nZXMuc2V0KGZpbGUucGF0aCwgZGVib3VuY2VkKTtcclxuXHRcdH1cclxuXHRcdGRlYm91bmNlZCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIG1ldGFkYXRhIHJlc29sdXRpb24gKHVzdWFsbHkgYWZ0ZXIgaW5pdGlhbCBzY2FuKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgb25NZXRhZGF0YVJlc29sdmUoZmlsZTogVEZpbGUpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pc1JlbGV2YW50RmlsZShmaWxlKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRvIGJhdGNoIGZvciBidWxrIHByb2Nlc3NpbmdcclxuXHRcdHRoaXMuYWRkVG9CYXRjaChmaWxlLnBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGZpbGUgdG8gYmF0Y2ggcHJvY2Vzc2luZyBxdWV1ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYWRkVG9CYXRjaChmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLnBlbmRpbmdCYXRjaC5hZGQoZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIERlYm91bmNlZCBiYXRjaCBwcm9jZXNzaW5nIHVzaW5nIE9ic2lkaWFuJ3MgZGVib3VuY2VcclxuXHRcdGlmICghdGhpcy5kZWJvdW5jZWRCYXRjaCkge1xyXG5cdFx0XHR0aGlzLmRlYm91bmNlZEJhdGNoID0gZGVib3VuY2UoXHJcblx0XHRcdFx0KCkgPT4gdGhpcy5wcm9jZXNzQmF0Y2goKSxcclxuXHRcdFx0XHR0aGlzLkJBVENIX0RFTEFZLFxyXG5cdFx0XHRcdGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmRlYm91bmNlZEJhdGNoKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcm9jZXNzIGFjY3VtdWxhdGVkIGJhdGNoIG9mIGZpbGUgY2hhbmdlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcHJvY2Vzc0JhdGNoKCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMucGVuZGluZ0JhdGNoLnNpemUgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZpbGVzID0gQXJyYXkuZnJvbSh0aGlzLnBlbmRpbmdCYXRjaCk7XHJcblx0XHR0aGlzLnBlbmRpbmdCYXRjaC5jbGVhcigpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgT2JzaWRpYW5Tb3VyY2U6IFByb2Nlc3NpbmcgYmF0Y2ggb2YgJHtmaWxlcy5sZW5ndGh9IGZpbGVzYFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBFbWl0IGJhdGNoIHVwZGF0ZSBldmVudFxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlRBU0tfQ0FDSEVfVVBEQVRFRCwge1xyXG5cdFx0XHRjaGFuZ2VkRmlsZXM6IGZpbGVzLFxyXG5cdFx0XHRzdGF0czoge1xyXG5cdFx0XHRcdHRvdGFsOiBmaWxlcy5sZW5ndGgsXHJcblx0XHRcdFx0Y2hhbmdlZDogZmlsZXMubGVuZ3RoLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcTogRGF0ZS5ub3coKSwgLy8gRXZlbnRzIG1vZHVsZSB3aWxsIGhhbmRsZSBwcm9wZXIgc2VxdWVuY2UgbnVtYmVyaW5nXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYSBmaWxlIHVwZGF0ZWQgZXZlbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIGVtaXRGaWxlVXBkYXRlZChcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRyZWFzb246IFwibW9kaWZ5XCIgfCBcImZyb250bWF0dGVyXCIgfCBcImNyZWF0ZVwiIHwgXCJkZWxldGVcIiB8IFwicmVuYW1lXCJcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgT2JzaWRpYW5Tb3VyY2U6IEVtaXR0aW5nIGZpbGUgdXBkYXRlIC0gJHtmaWxlUGF0aH0gKCR7cmVhc29ufSlgXHJcblx0XHQpO1xyXG5cclxuXHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5GSUxFX1VQREFURUQsIHtcclxuXHRcdFx0cGF0aDogZmlsZVBhdGgsXHJcblx0XHRcdHJlYXNvbixcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIGZpbGUgaXMgcmVsZXZhbnQgZm9yIHRhc2sgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNSZWxldmFudEZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcclxuXHRcdC8vIFNraXAgbm9uLWZpbGVzXHJcblx0XHRpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUucGF0aCAhPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2tpcCBmaWxlcyB3aXRoIGlnbm9yZWQgZXh0ZW5zaW9uc1xyXG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gZmlsZS5leHRlbnNpb24/LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRpZiAoIWV4dGVuc2lvbiB8fCB0aGlzLklHTk9SRURfRVhURU5TSU9OUy5oYXMoYC4ke2V4dGVuc2lvbn1gKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT25seSBwcm9jZXNzIHJlbGV2YW50IGZpbGUgdHlwZXNcclxuXHRcdGlmICghdGhpcy5SRUxFVkFOVF9FWFRFTlNJT05TLmhhcyhleHRlbnNpb24pKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTa2lwIHN5c3RlbS9oaWRkZW4gZmlsZXNcclxuXHRcdGlmIChmaWxlLnBhdGguc3RhcnRzV2l0aChcIi5cIikgfHwgZmlsZS5wYXRoLmluY2x1ZGVzKFwiLy5cIikpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFudWFsbHkgdHJpZ2dlciBwcm9jZXNzaW5nIG9mIHNwZWNpZmljIGZpbGVzIChmb3IgdGVzdGluZyBvciByZWNvdmVyeSlcclxuXHQgKi9cclxuXHR0cmlnZ2VyRmlsZVVwZGF0ZShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRyZWFzb246XHJcblx0XHRcdHwgXCJtb2RpZnlcIlxyXG5cdFx0XHR8IFwiZnJvbnRtYXR0ZXJcIlxyXG5cdFx0XHR8IFwiY3JlYXRlXCJcclxuXHRcdFx0fCBcImRlbGV0ZVwiXHJcblx0XHRcdHwgXCJyZW5hbWVcIiA9IFwibW9kaWZ5XCJcclxuXHQpOiB2b2lkIHtcclxuXHRcdHRoaXMuZW1pdEZpbGVVcGRhdGVkKGZpbGVQYXRoLCByZWFzb24pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVHJpZ2dlciBiYXRjaCBwcm9jZXNzaW5nIG9mIG11bHRpcGxlIGZpbGVzXHJcblx0ICovXHJcblx0dHJpZ2dlckJhdGNoVXBkYXRlKGZpbGVQYXRoczogc3RyaW5nW10pOiB2b2lkIHtcclxuXHRcdGlmIChmaWxlUGF0aHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YE9ic2lkaWFuU291cmNlOiBNYW51YWwgYmF0Y2ggdHJpZ2dlciBmb3IgJHtmaWxlUGF0aHMubGVuZ3RofSBmaWxlc2BcclxuXHRcdCk7XHJcblxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlRBU0tfQ0FDSEVfVVBEQVRFRCwge1xyXG5cdFx0XHRjaGFuZ2VkRmlsZXM6IGZpbGVQYXRocyxcclxuXHRcdFx0c3RhdHM6IHtcclxuXHRcdFx0XHR0b3RhbDogZmlsZVBhdGhzLmxlbmd0aCxcclxuXHRcdFx0XHRjaGFuZ2VkOiBmaWxlUGF0aHMubGVuZ3RoLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcTogRGF0ZS5ub3coKSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgZmx1c2ggYWxsIHBlbmRpbmcgZGVib3VuY2VkIGNoYW5nZXNcclxuXHQgKi9cclxuXHRmbHVzaCgpOiB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiT2JzaWRpYW5Tb3VyY2U6IEZsdXNoaW5nIGFsbCBwZW5kaW5nIGNoYW5nZXNcIik7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBhbGwgcGVuZGluZyBmaWxlIGNoYW5nZXMgKGludm9rZSBpbW1lZGlhdGVseSBhbmQgZHJvcCByZWZlcmVuY2VzKVxyXG5cdFx0Zm9yIChjb25zdCBmaWxlUGF0aCBvZiBBcnJheS5mcm9tKHRoaXMucGVuZGluZ0ZpbGVDaGFuZ2VzLmtleXMoKSkpIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nRmlsZUNoYW5nZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0dGhpcy5lbWl0RmlsZVVwZGF0ZWQoZmlsZVBhdGgsIFwibW9kaWZ5XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByb2Nlc3MgYWxsIHBlbmRpbmcgbWV0YWRhdGEgY2hhbmdlcyAoaW52b2tlIGltbWVkaWF0ZWx5IGFuZCBkcm9wIHJlZmVyZW5jZXMpXHJcblx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIEFycmF5LmZyb20odGhpcy5wZW5kaW5nTWV0YWRhdGFDaGFuZ2VzLmtleXMoKSkpIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nTWV0YWRhdGFDaGFuZ2VzLmRlbGV0ZShmaWxlUGF0aCk7XHJcblx0XHRcdHRoaXMuZW1pdEZpbGVVcGRhdGVkKGZpbGVQYXRoLCBcImZyb250bWF0dGVyXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByb2Nlc3MgcGVuZGluZyBiYXRjaCBpbW1lZGlhdGVseVxyXG5cdFx0dGhpcy5wcm9jZXNzQmF0Y2goKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzdGF0aXN0aWNzIGFib3V0IHBlbmRpbmcgb3BlcmF0aW9uc1xyXG5cdCAqL1xyXG5cdGdldFN0YXRzKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cGVuZGluZ0ZpbGVDaGFuZ2VzOiB0aGlzLnBlbmRpbmdGaWxlQ2hhbmdlcy5zaXplLFxyXG5cdFx0XHRwZW5kaW5nTWV0YWRhdGFDaGFuZ2VzOiB0aGlzLnBlbmRpbmdNZXRhZGF0YUNoYW5nZXMuc2l6ZSxcclxuXHRcdFx0cGVuZGluZ0JhdGNoU2l6ZTogdGhpcy5wZW5kaW5nQmF0Y2guc2l6ZSxcclxuXHRcdFx0aGFzQmF0Y2hEZWJvdW5jZTogdGhpcy5kZWJvdW5jZWRCYXRjaCAhPT0gbnVsbCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwIHJlc291cmNlcyBhbmQgdW5zdWJzY3JpYmUgZnJvbSBldmVudHNcclxuXHQgKi9cclxuXHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5sb2coXCJPYnNpZGlhblNvdXJjZTogQ2xlYW5pbmcgdXAgZXZlbnQgc3Vic2NyaXB0aW9uc1wiKTtcclxuXHJcblx0XHQvLyBEcm9wIHJlZmVyZW5jZXMgdG8gYWxsIHBlbmRpbmcgZGVib3VuY2VkIGFjdGlvbnNcclxuXHRcdHRoaXMucGVuZGluZ0ZpbGVDaGFuZ2VzLmNsZWFyKCk7XHJcblx0XHR0aGlzLnBlbmRpbmdNZXRhZGF0YUNoYW5nZXMuY2xlYXIoKTtcclxuXHRcdHRoaXMuZGVib3VuY2VkQmF0Y2ggPSBudWxsO1xyXG5cdFx0dGhpcy5wZW5kaW5nQmF0Y2guY2xlYXIoKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIk9ic2lkaWFuU291cmNlOiBDbGVhbnVwIGNvbXBsZXRlXCIpO1xyXG5cclxuXHJcblx0XHR0aGlzLnVubG9hZCgpO1xyXG5cdH1cclxufVxyXG4iXX0=