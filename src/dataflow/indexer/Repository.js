import { __awaiter } from "tslib";
import { TaskIndexer } from "@/core/task-indexer";
import { Storage } from "@/dataflow/persistence/Storage";
import { emit, Events, Seq } from "@/dataflow/events/Events";
/**
 * Task Repository - combines TaskIndexer with Storage for a complete data layer
 * This is the central repository for all task data operations
 */
export class Repository {
    constructor(app, vault, metadataCache) {
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.lastSequence = 0;
        this.sourceSeq = 0; // Track source sequence to differentiate events
        this.icsEvents = []; // Store ICS events separately
        this.fileTasks = new Map(); // Store file-level tasks
        // Persistence queue management
        this.persistQueue = new Set();
        this.persistTimer = null;
        this.lastPersistTime = 0;
        this.PERSIST_DELAY = 1000; // 1 second debounce
        this.MAX_QUEUE_SIZE = 10; // Max 10 files before forcing persist
        this.MAX_PERSIST_INTERVAL = 5000; // Max 5 seconds between persists
        this.indexer = new TaskIndexer(app, vault, metadataCache);
        // Use a stable version string to avoid cache invalidation
        this.storage = new Storage(app.appId || "obsidian-task-genius", "1.0.0");
    }
    /** Allow orchestrator to pass a central FileFilterManager down to indexer */
    setFileFilterManager(filterManager) {
        var _a, _b;
        // TaskIndexer has setFileFilterManager API
        (_b = (_a = this.indexer).setFileFilterManager) === null || _b === void 0 ? void 0 : _b.call(_a, filterManager);
    }
    /** Get all file paths currently present in the inline index */
    getIndexedFilePaths() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.indexer.getIndexSnapshot();
            return Array.from(snapshot.files.keys());
        });
    }
    /** Get all file paths that currently have file-level tasks */
    getFileTaskPaths() {
        return Array.from(this.fileTasks.keys());
    }
    /**
     * Initialize the repository (load persisted data if available)
     */
    initialize() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[Repository] Initializing repository...");
            try {
                // Try to load consolidated index from storage
                console.log("[Repository] Attempting to load consolidated index from storage...");
                const consolidated = yield this.storage.loadConsolidated();
                if (consolidated && consolidated.data) {
                    // Restore the index from persisted data
                    const snapshotTaskCount = ((_a = consolidated.data) === null || _a === void 0 ? void 0 : _a.tasks)
                        ? consolidated.data.tasks instanceof Map
                            ? consolidated.data.tasks.size
                            : Object.keys(consolidated.data.tasks).length
                        : 0;
                    console.log(`[Repository] Found persisted snapshot with ${snapshotTaskCount} tasks, restoring...`);
                    yield this.indexer.restoreFromSnapshot(consolidated.data);
                    const taskCount = yield this.indexer.getTotalTaskCount();
                    console.log(`[Repository] Index restored successfully with ${taskCount} tasks`);
                    // Emit cache ready event
                    emit(this.app, Events.CACHE_READY, {
                        initial: true,
                        timestamp: Date.now(),
                        seq: Seq.next(),
                    });
                }
                else {
                    console.log("[Repository] No persisted data found, starting with empty index");
                }
                // Load ICS events from storage
                console.log("[Repository] Loading ICS events from storage...");
                this.icsEvents = yield this.storage.loadIcsEvents();
                console.log(`[Repository] Loaded ${this.icsEvents.length} ICS events from storage`);
            }
            catch (error) {
                console.error("[Repository] Error during initialization:", error);
                // Continue with empty index on error
                console.log("[Repository] Continuing with empty index after error");
            }
        });
    }
    /**
     * Update tasks for a specific file
     * @param filePath - Path of the file
     * @param tasks - Tasks to update
     * @param sourceSeq - Optional source sequence to track event origin
     * @param options - Optional controls (persist to storage, force event emission)
     */
    updateFile(filePath, tasks, sourceSeq, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const persist = (options === null || options === void 0 ? void 0 : options.persist) !== false; // default true
            const forceEmit = (options === null || options === void 0 ? void 0 : options.forceEmit) === true;
            // Check if tasks have actually changed relative to storage
            const existingAugmented = yield this.storage.loadAugmented(filePath);
            const hasChanges = !existingAugmented ||
                JSON.stringify(tasks) !== JSON.stringify(existingAugmented.data);
            // Always update the in-memory index for consistency
            yield this.indexer.updateIndexWithTasks(filePath, tasks);
            // Optionally store augmented tasks to cache
            if (persist) {
                yield this.storage.storeAugmented(filePath, tasks);
            }
            // Schedule persist operation for single file updates
            if (persist && hasChanges) {
                this.schedulePersist(filePath);
            }
            // Emit update event if there are actual changes OR forced by caller
            if (hasChanges || forceEmit) {
                this.lastSequence = Seq.next();
                emit(this.app, Events.TASK_CACHE_UPDATED, {
                    changedFiles: [filePath],
                    stats: {
                        total: yield this.indexer.getTotalTaskCount(),
                        changed: tasks.length,
                    },
                    timestamp: Date.now(),
                    seq: this.lastSequence,
                    sourceSeq: sourceSeq || 0, // Include source sequence for loop detection
                });
            }
        });
    }
    /**
     * Update tasks for multiple files in batch
     * @param updates - Map of file paths to tasks
     * @param sourceSeq - Optional source sequence to track event origin
     * @param options - Optional controls (persist to storage, force event emission)
     */
    updateBatch(updates, sourceSeq, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const persist = (options === null || options === void 0 ? void 0 : options.persist) !== false; // default true
            const forceEmit = (options === null || options === void 0 ? void 0 : options.forceEmit) === true;
            const changedFiles = [];
            let totalChanged = 0;
            let hasActualChanges = false;
            // Process each file update and check for actual changes
            for (const [filePath, tasks] of updates) {
                // Check if tasks have actually changed relative to storage
                const existingAugmented = yield this.storage.loadAugmented(filePath);
                const hasChanges = !existingAugmented ||
                    JSON.stringify(tasks) !==
                        JSON.stringify(existingAugmented.data);
                yield this.indexer.updateIndexWithTasks(filePath, tasks);
                if (persist) {
                    yield this.storage.storeAugmented(filePath, tasks);
                }
                if (hasChanges) {
                    changedFiles.push(filePath);
                    totalChanged += tasks.length;
                    hasActualChanges = true;
                }
            }
            // Emit events and persist if there are actual changes OR forced by caller
            if (hasActualChanges || forceEmit) {
                if (persist && hasActualChanges) {
                    // Persist the consolidated index after batch updates
                    yield this.persist();
                    console.log(`[Repository] Persisted index after batch update of ${changedFiles.length} files with changes`);
                }
                // If forced emit but no changedFiles computed, include all update keys
                const filesToReport = changedFiles.length > 0
                    ? changedFiles
                    : Array.from(updates.keys());
                this.lastSequence = Seq.next();
                emit(this.app, Events.TASK_CACHE_UPDATED, {
                    changedFiles: filesToReport,
                    stats: {
                        total: yield this.indexer.getTotalTaskCount(),
                        changed: totalChanged,
                    },
                    timestamp: Date.now(),
                    seq: this.lastSequence,
                    sourceSeq: sourceSeq || 0, // Include source sequence for loop detection
                });
            }
            else {
                console.log(`[Repository] Batch update completed with no actual changes - skipping event emission`);
            }
        });
    }
    /**
     * Remove tasks for a file
     */
    removeFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.indexer.removeTasksFromFile(filePath);
            // Clear storage for this file
            yield this.storage.clearFile(filePath);
            // Emit update event
            this.lastSequence = Seq.next();
            emit(this.app, Events.TASK_CACHE_UPDATED, {
                changedFiles: [filePath],
                stats: {
                    total: yield this.indexer.getTotalTaskCount(),
                    changed: 0,
                },
                timestamp: Date.now(),
                seq: this.lastSequence,
            });
        });
    }
    /**
     * Remove a single task by ID
     */
    removeTaskById(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the task to find its file path
            const task = yield this.indexer.getTaskById(taskId);
            if (!task)
                return;
            // Remove from indexer
            yield this.indexer.removeTask(taskId);
            // Schedule persist for the task's file
            this.schedulePersist(task.filePath);
        });
    }
    /**
     * Update ICS events in the repository
     */
    updateIcsEvents(events, sourceSeq) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[Repository] Updating ${events.length} ICS events`);
            // Store the new ICS events
            this.icsEvents = events;
            // Store ICS events to persistence
            yield this.storage.storeIcsEvents(events);
            // Emit update event to notify views
            this.lastSequence = Seq.next();
            emit(this.app, Events.TASK_CACHE_UPDATED, {
                changedFiles: ["ics:events"],
                stats: {
                    total: yield this.getTotalTaskCount(),
                    changed: events.length,
                    icsEvents: events.length,
                },
                timestamp: Date.now(),
                seq: this.lastSequence,
                sourceSeq: sourceSeq || 0,
            });
        });
    }
    /**
     * Get total task count including ICS events and file tasks
     */
    getTotalTaskCount() {
        return __awaiter(this, void 0, void 0, function* () {
            const fileTaskCount = yield this.indexer.getTotalTaskCount();
            return fileTaskCount + this.icsEvents.length + this.fileTasks.size;
        });
    }
    /**
     * Get all tasks from the index (including ICS events and file tasks)
     */
    all() {
        return __awaiter(this, void 0, void 0, function* () {
            const regularTasks = yield this.indexer.getAllTasks();
            const fileTaskArray = Array.from(this.fileTasks.values());
            // Merge file-based tasks with ICS events and file tasks
            return [...regularTasks, ...this.icsEvents, ...fileTaskArray];
        });
    }
    /**
     * Get tasks by project
     */
    byProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskIds = yield this.indexer.getTaskIdsByProject(project);
            const fileTasks = yield this.getTasksByIds(taskIds);
            // Also filter ICS events by project if they have one
            const icsProjectTasks = this.icsEvents.filter((task) => { var _a; return ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.project) === project; });
            return [...fileTasks, ...icsProjectTasks];
        });
    }
    /**
     * Get tasks by tags
     */
    byTags(tags) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskIdSets = yield Promise.all(tags.map((tag) => this.indexer.getTaskIdsByTag(tag)));
            // Find intersection of all tag sets
            if (taskIdSets.length === 0)
                return [];
            let intersection = new Set(taskIdSets[0]);
            for (let i = 1; i < taskIdSets.length; i++) {
                intersection = new Set([...intersection].filter((id) => taskIdSets[i].has(id)));
            }
            return this.getTasksByIds(intersection);
        });
    }
    /**
     * Get tasks by completion status
     */
    byStatus(completed) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskIds = yield this.indexer.getTaskIdsByCompletionStatus(completed);
            return this.getTasksByIds(taskIds);
        });
    }
    /**
     * Get tasks by date range
     */
    byDateRange(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const field = opts.field || "due";
            const cache = yield this.indexer.getCache();
            const dateIndex = field === "due"
                ? cache.dueDate
                : field === "start"
                    ? cache.startDate
                    : cache.scheduledDate;
            const taskIds = new Set();
            for (const [dateStr, ids] of dateIndex) {
                const date = new Date(dateStr).getTime();
                if (opts.from && date < opts.from)
                    continue;
                if (opts.to && date > opts.to)
                    continue;
                for (const id of ids) {
                    taskIds.add(id);
                }
            }
            return this.getTasksByIds(taskIds);
        });
    }
    /**
     * Get a task by ID
     */
    byId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.indexer.getTaskById(id) || null;
        });
    }
    /**
     * Query tasks with filter and sorting
     */
    query(filter, sorting) {
        return __awaiter(this, void 0, void 0, function* () {
            const filters = filter ? [filter] : [];
            return this.indexer.queryTasks(filters, sorting);
        });
    }
    /**
     * Get index summary statistics
     */
    getSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = yield this.indexer.getCache();
            const byProject = new Map();
            for (const [project, ids] of cache.projects) {
                byProject.set(project, ids.size);
            }
            const byTag = new Map();
            for (const [tag, ids] of cache.tags) {
                byTag.set(tag, ids.size);
            }
            const byStatus = new Map();
            for (const [status, ids] of cache.completed) {
                byStatus.set(status, ids.size);
            }
            return {
                total: cache.tasks.size,
                byProject,
                byTag,
                byStatus,
            };
        });
    }
    /**
     * Save the current index to persistent storage
     */
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.indexer.getIndexSnapshot();
            yield this.storage.storeConsolidated(snapshot);
        });
    }
    /**
     * Schedule a persist operation with debouncing and batching
     */
    schedulePersist(source) {
        this.persistQueue.add(source);
        // Check if we should persist immediately
        const shouldPersistNow = this.persistQueue.size >= this.MAX_QUEUE_SIZE ||
            Date.now() - this.lastPersistTime > this.MAX_PERSIST_INTERVAL;
        if (shouldPersistNow) {
            this.executePersist();
        }
        else {
            // Schedule delayed persist
            if (this.persistTimer) {
                clearTimeout(this.persistTimer);
            }
            this.persistTimer = setTimeout(() => {
                this.executePersist();
            }, this.PERSIST_DELAY);
        }
    }
    /**
     * Execute the pending persist operation
     */
    executePersist() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.persistTimer) {
                clearTimeout(this.persistTimer);
                this.persistTimer = null;
            }
            if (this.persistQueue.size > 0) {
                const queueSize = this.persistQueue.size;
                console.log(`[Repository] Persisting after ${queueSize} changes`);
                yield this.persist();
                this.persistQueue.clear();
                this.lastPersistTime = Date.now();
            }
        });
    }
    /**
     * Clear all data
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.indexer.clearIndex();
            yield this.storage.clear();
        });
    }
    /**
     * Set the parse file callback for the indexer
     */
    setParseFileCallback(callback) {
        this.indexer.setParseFileCallback(callback);
    }
    /**
     * Get the underlying indexer (for advanced usage)
     */
    getIndexer() {
        return this.indexer;
    }
    /**
     * Get the underlying storage (for advanced usage)
     */
    getStorage() {
        return this.storage;
    }
    /**
     * Helper: Get tasks by a set of IDs
     */
    getTasksByIds(taskIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const tasks = [];
            const ids = Array.isArray(taskIds) ? taskIds : Array.from(taskIds);
            for (const id of ids) {
                const task = yield this.indexer.getTaskById(id);
                if (task) {
                    tasks.push(task);
                }
            }
            return tasks;
        });
    }
    /**
     * Cleanup and ensure all pending data is persisted
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            // Execute any pending persist operations
            yield this.executePersist();
        });
    }
    /**
     * Update a file-level task (from FileSource)
     */
    updateFileTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = task.filePath;
            if (!filePath)
                return;
            // Store the file task
            this.fileTasks.set(filePath, task);
            // Schedule persist for file tasks
            this.schedulePersist(`file-task:${filePath}`);
            // Emit update event
            this.lastSequence = Seq.next();
            emit(this.app, Events.TASK_CACHE_UPDATED, {
                changedFiles: [`file-task:${filePath}`],
                stats: {
                    total: yield this.getTotalTaskCount(),
                    changed: 1,
                    fileTasks: this.fileTasks.size,
                },
                timestamp: Date.now(),
                seq: this.lastSequence,
            });
        });
    }
    /**
     * Remove a file-level task (from FileSource)
     */
    removeFileTask(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fileTasks.has(filePath))
                return;
            // Remove the file task
            this.fileTasks.delete(filePath);
            // Schedule persist for file tasks
            this.schedulePersist(`file-task:${filePath}`);
            // Emit update event
            this.lastSequence = Seq.next();
            emit(this.app, Events.TASK_CACHE_UPDATED, {
                changedFiles: [`file-task:${filePath}`],
                stats: {
                    total: yield this.getTotalTaskCount(),
                    changed: -1,
                    fileTasks: this.fileTasks.size,
                },
                timestamp: Date.now(),
                seq: this.lastSequence,
            });
        });
    }
    /**
     * Get a task by its ID
     */
    getTaskById(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all tasks from the repository
            const allTasks = yield this.all();
            // Find the task by ID
            const task = allTasks.find((t) => t.id === taskId);
            return task;
        });
    }
    /**
     * Update a single task directly (for inline editing)
     * This avoids re-parsing the entire file
     */
    updateSingleTask(updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = updatedTask.filePath;
            if (!filePath)
                return;
            console.log(`[Repository] Updating single task: ${updatedTask.id} in ${filePath}`);
            // Load existing augmented tasks for the file
            const existingAugmented = yield this.storage.loadAugmented(filePath);
            if (!existingAugmented) {
                console.warn(`[Repository] No existing tasks found for ${filePath}, cannot update single task`);
                return;
            }
            // Find and replace the task in the array
            const tasks = existingAugmented.data;
            const taskIndex = tasks.findIndex((t) => t.id === updatedTask.id);
            if (taskIndex === -1) {
                console.warn(`[Repository] Task ${updatedTask.id} not found in ${filePath}`);
                return;
            }
            // Update the task
            tasks[taskIndex] = updatedTask;
            // Update the index and storage
            yield this.indexer.updateIndexWithTasks(filePath, tasks);
            yield this.storage.storeAugmented(filePath, tasks);
            // Schedule persist operation
            this.schedulePersist(filePath);
            // Emit update event
            this.lastSequence = Seq.next();
            emit(this.app, Events.TASK_CACHE_UPDATED, {
                changedFiles: [filePath],
                stats: {
                    total: yield this.getTotalTaskCount(),
                    changed: 1,
                },
                timestamp: Date.now(),
                seq: this.lastSequence,
                sourceSeq: undefined,
            });
            console.log(`[Repository] Single task ${updatedTask.id} updated successfully`);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVwb3NpdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJlcG9zaXRvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQVFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFN0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFVBQVU7SUFnQnRCLFlBQ1MsR0FBUSxFQUNSLEtBQVksRUFDWixhQUE0QjtRQUY1QixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBaEI3QixpQkFBWSxHQUFXLENBQUMsQ0FBQztRQUN6QixjQUFTLEdBQVcsQ0FBQyxDQUFDLENBQUMsZ0RBQWdEO1FBQ3ZFLGNBQVMsR0FBVyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7UUFDdEQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFnQixDQUFDLENBQUMseUJBQXlCO1FBRXRFLCtCQUErQjtRQUN2QixpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDakMsaUJBQVksR0FBMEIsSUFBSSxDQUFDO1FBQzNDLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsa0JBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxvQkFBb0I7UUFDMUMsbUJBQWMsR0FBRyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7UUFDM0QseUJBQW9CLEdBQUcsSUFBSSxDQUFDLENBQUMsaUNBQWlDO1FBTzlFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMxRCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8s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Iiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUge1xyXG5cdFRhc2ssXHJcblx0VGFza0NhY2hlLFxyXG5cdFRhc2tGaWx0ZXIsXHJcblx0U29ydGluZ0NyaXRlcmlhLFxyXG5cdFRhc2tJbmRleGVyIGFzIFRhc2tJbmRleGVySW50ZXJmYWNlLFxyXG59IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB0eXBlIHsgQXBwLCBWYXVsdCwgTWV0YWRhdGFDYWNoZSwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFza0luZGV4ZXIgfSBmcm9tIFwiQC9jb3JlL3Rhc2staW5kZXhlclwiO1xyXG5pbXBvcnQgeyBTdG9yYWdlIH0gZnJvbSBcIkAvZGF0YWZsb3cvcGVyc2lzdGVuY2UvU3RvcmFnZVwiO1xyXG5pbXBvcnQgeyBlbWl0LCBFdmVudHMsIFNlcSB9IGZyb20gXCJAL2RhdGFmbG93L2V2ZW50cy9FdmVudHNcIjtcclxuXHJcbi8qKlxyXG4gKiBUYXNrIFJlcG9zaXRvcnkgLSBjb21iaW5lcyBUYXNrSW5kZXhlciB3aXRoIFN0b3JhZ2UgZm9yIGEgY29tcGxldGUgZGF0YSBsYXllclxyXG4gKiBUaGlzIGlzIHRoZSBjZW50cmFsIHJlcG9zaXRvcnkgZm9yIGFsbCB0YXNrIGRhdGEgb3BlcmF0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJlcG9zaXRvcnkge1xyXG5cdHByaXZhdGUgaW5kZXhlcjogVGFza0luZGV4ZXI7XHJcblx0cHJpdmF0ZSBzdG9yYWdlOiBTdG9yYWdlO1xyXG5cdHByaXZhdGUgbGFzdFNlcXVlbmNlOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgc291cmNlU2VxOiBudW1iZXIgPSAwOyAvLyBUcmFjayBzb3VyY2Ugc2VxdWVuY2UgdG8gZGlmZmVyZW50aWF0ZSBldmVudHNcclxuXHRwcml2YXRlIGljc0V2ZW50czogVGFza1tdID0gW107IC8vIFN0b3JlIElDUyBldmVudHMgc2VwYXJhdGVseVxyXG5cdHByaXZhdGUgZmlsZVRhc2tzID0gbmV3IE1hcDxzdHJpbmcsIFRhc2s+KCk7IC8vIFN0b3JlIGZpbGUtbGV2ZWwgdGFza3NcclxuXHJcblx0Ly8gUGVyc2lzdGVuY2UgcXVldWUgbWFuYWdlbWVudFxyXG5cdHByaXZhdGUgcGVyc2lzdFF1ZXVlID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0cHJpdmF0ZSBwZXJzaXN0VGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBsYXN0UGVyc2lzdFRpbWUgPSAwO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgUEVSU0lTVF9ERUxBWSA9IDEwMDA7IC8vIDEgc2Vjb25kIGRlYm91bmNlXHJcblx0cHJpdmF0ZSByZWFkb25seSBNQVhfUVVFVUVfU0laRSA9IDEwOyAvLyBNYXggMTAgZmlsZXMgYmVmb3JlIGZvcmNpbmcgcGVyc2lzdFxyXG5cdHByaXZhdGUgcmVhZG9ubHkgTUFYX1BFUlNJU1RfSU5URVJWQUwgPSA1MDAwOyAvLyBNYXggNSBzZWNvbmRzIGJldHdlZW4gcGVyc2lzdHNcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSB2YXVsdDogVmF1bHQsXHJcblx0XHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGVcclxuXHQpIHtcclxuXHRcdHRoaXMuaW5kZXhlciA9IG5ldyBUYXNrSW5kZXhlcihhcHAsIHZhdWx0LCBtZXRhZGF0YUNhY2hlKTtcclxuXHRcdC8vIFVzZSBhIHN0YWJsZSB2ZXJzaW9uIHN0cmluZyB0byBhdm9pZCBjYWNoZSBpbnZhbGlkYXRpb25cclxuXHRcdHRoaXMuc3RvcmFnZSA9IG5ldyBTdG9yYWdlKFxyXG5cdFx0XHRhcHAuYXBwSWQgfHwgXCJvYnNpZGlhbi10YXNrLWdlbml1c1wiLFxyXG5cdFx0XHRcIjEuMC4wXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKiogQWxsb3cgb3JjaGVzdHJhdG9yIHRvIHBhc3MgYSBjZW50cmFsIEZpbGVGaWx0ZXJNYW5hZ2VyIGRvd24gdG8gaW5kZXhlciAqL1xyXG5cdHB1YmxpYyBzZXRGaWxlRmlsdGVyTWFuYWdlcihmaWx0ZXJNYW5hZ2VyOiBhbnkpIHtcclxuXHRcdC8vIFRhc2tJbmRleGVyIGhhcyBzZXRGaWxlRmlsdGVyTWFuYWdlciBBUElcclxuXHRcdCh0aGlzLmluZGV4ZXIgYXMgYW55KS5zZXRGaWxlRmlsdGVyTWFuYWdlcj8uKGZpbHRlck1hbmFnZXIpO1xyXG5cdH1cclxuXHJcblx0LyoqIEdldCBhbGwgZmlsZSBwYXRocyBjdXJyZW50bHkgcHJlc2VudCBpbiB0aGUgaW5saW5lIGluZGV4ICovXHJcblx0cHVibGljIGFzeW5jIGdldEluZGV4ZWRGaWxlUGF0aHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0Y29uc3Qgc25hcHNob3QgPSBhd2FpdCB0aGlzLmluZGV4ZXIuZ2V0SW5kZXhTbmFwc2hvdCgpO1xyXG5cdFx0cmV0dXJuIEFycmF5LmZyb20oc25hcHNob3QuZmlsZXMua2V5cygpKTtcclxuXHR9XHJcblxyXG5cdC8qKiBHZXQgYWxsIGZpbGUgcGF0aHMgdGhhdCBjdXJyZW50bHkgaGF2ZSBmaWxlLWxldmVsIHRhc2tzICovXHJcblx0cHVibGljIGdldEZpbGVUYXNrUGF0aHMoKTogc3RyaW5nW10ge1xyXG5cdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5maWxlVGFza3Mua2V5cygpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgdGhlIHJlcG9zaXRvcnkgKGxvYWQgcGVyc2lzdGVkIGRhdGEgaWYgYXZhaWxhYmxlKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltSZXBvc2l0b3J5XSBJbml0aWFsaXppbmcgcmVwb3NpdG9yeS4uLlwiKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUcnkgdG8gbG9hZCBjb25zb2xpZGF0ZWQgaW5kZXggZnJvbSBzdG9yYWdlXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW1JlcG9zaXRvcnldIEF0dGVtcHRpbmcgdG8gbG9hZCBjb25zb2xpZGF0ZWQgaW5kZXggZnJvbSBzdG9yYWdlLi4uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgY29uc29saWRhdGVkID0gYXdhaXQgdGhpcy5zdG9yYWdlLmxvYWRDb25zb2xpZGF0ZWQoKTtcclxuXHJcblx0XHRcdGlmIChjb25zb2xpZGF0ZWQgJiYgY29uc29saWRhdGVkLmRhdGEpIHtcclxuXHRcdFx0XHQvLyBSZXN0b3JlIHRoZSBpbmRleCBmcm9tIHBlcnNpc3RlZCBkYXRhXHJcblx0XHRcdFx0Y29uc3Qgc25hcHNob3RUYXNrQ291bnQgPSBjb25zb2xpZGF0ZWQuZGF0YT8udGFza3NcclxuXHRcdFx0XHRcdD8gY29uc29saWRhdGVkLmRhdGEudGFza3MgaW5zdGFuY2VvZiBNYXBcclxuXHRcdFx0XHRcdFx0PyBjb25zb2xpZGF0ZWQuZGF0YS50YXNrcy5zaXplXHJcblx0XHRcdFx0XHRcdDogT2JqZWN0LmtleXMoY29uc29saWRhdGVkLmRhdGEudGFza3MpLmxlbmd0aFxyXG5cdFx0XHRcdFx0OiAwO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFtSZXBvc2l0b3J5XSBGb3VuZCBwZXJzaXN0ZWQgc25hcHNob3Qgd2l0aCAke3NuYXBzaG90VGFza0NvdW50fSB0YXNrcywgcmVzdG9yaW5nLi4uYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5pbmRleGVyLnJlc3RvcmVGcm9tU25hcHNob3QoY29uc29saWRhdGVkLmRhdGEpO1xyXG5cclxuXHRcdFx0XHRjb25zdCB0YXNrQ291bnQgPSBhd2FpdCB0aGlzLmluZGV4ZXIuZ2V0VG90YWxUYXNrQ291bnQoKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbUmVwb3NpdG9yeV0gSW5kZXggcmVzdG9yZWQgc3VjY2Vzc2Z1bGx5IHdpdGggJHt0YXNrQ291bnR9IHRhc2tzYFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEVtaXQgY2FjaGUgcmVhZHkgZXZlbnRcclxuXHRcdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuQ0FDSEVfUkVBRFksIHtcclxuXHRcdFx0XHRcdGluaXRpYWw6IHRydWUsXHJcblx0XHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHRzZXE6IFNlcS5uZXh0KCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltSZXBvc2l0b3J5XSBObyBwZXJzaXN0ZWQgZGF0YSBmb3VuZCwgc3RhcnRpbmcgd2l0aCBlbXB0eSBpbmRleFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTG9hZCBJQ1MgZXZlbnRzIGZyb20gc3RvcmFnZVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltSZXBvc2l0b3J5XSBMb2FkaW5nIElDUyBldmVudHMgZnJvbSBzdG9yYWdlLi4uXCIpO1xyXG5cdFx0XHR0aGlzLmljc0V2ZW50cyA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkSWNzRXZlbnRzKCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbUmVwb3NpdG9yeV0gTG9hZGVkICR7dGhpcy5pY3NFdmVudHMubGVuZ3RofSBJQ1MgZXZlbnRzIGZyb20gc3RvcmFnZWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbUmVwb3NpdG9yeV0gRXJyb3IgZHVyaW5nIGluaXRpYWxpemF0aW9uOlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIENvbnRpbnVlIHdpdGggZW1wdHkgaW5kZXggb24gZXJyb3JcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbUmVwb3NpdG9yeV0gQ29udGludWluZyB3aXRoIGVtcHR5IGluZGV4IGFmdGVyIGVycm9yXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2tzIGZvciBhIHNwZWNpZmljIGZpbGVcclxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIG9mIHRoZSBmaWxlXHJcblx0ICogQHBhcmFtIHRhc2tzIC0gVGFza3MgdG8gdXBkYXRlXHJcblx0ICogQHBhcmFtIHNvdXJjZVNlcSAtIE9wdGlvbmFsIHNvdXJjZSBzZXF1ZW5jZSB0byB0cmFjayBldmVudCBvcmlnaW5cclxuXHQgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGNvbnRyb2xzIChwZXJzaXN0IHRvIHN0b3JhZ2UsIGZvcmNlIGV2ZW50IGVtaXNzaW9uKVxyXG5cdCAqL1xyXG5cdGFzeW5jIHVwZGF0ZUZpbGUoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdHNvdXJjZVNlcT86IG51bWJlcixcclxuXHRcdG9wdGlvbnM/OiB7IHBlcnNpc3Q/OiBib29sZWFuOyBmb3JjZUVtaXQ/OiBib29sZWFuIH1cclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHBlcnNpc3QgPSBvcHRpb25zPy5wZXJzaXN0ICE9PSBmYWxzZTsgLy8gZGVmYXVsdCB0cnVlXHJcblx0XHRjb25zdCBmb3JjZUVtaXQgPSBvcHRpb25zPy5mb3JjZUVtaXQgPT09IHRydWU7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrcyBoYXZlIGFjdHVhbGx5IGNoYW5nZWQgcmVsYXRpdmUgdG8gc3RvcmFnZVxyXG5cdFx0Y29uc3QgZXhpc3RpbmdBdWdtZW50ZWQgPSBhd2FpdCB0aGlzLnN0b3JhZ2UubG9hZEF1Z21lbnRlZChmaWxlUGF0aCk7XHJcblx0XHRjb25zdCBoYXNDaGFuZ2VzID1cclxuXHRcdFx0IWV4aXN0aW5nQXVnbWVudGVkIHx8XHJcblx0XHRcdEpTT04uc3RyaW5naWZ5KHRhc2tzKSAhPT0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdBdWdtZW50ZWQuZGF0YSk7XHJcblxyXG5cdFx0Ly8gQWx3YXlzIHVwZGF0ZSB0aGUgaW4tbWVtb3J5IGluZGV4IGZvciBjb25zaXN0ZW5jeVxyXG5cdFx0YXdhaXQgdGhpcy5pbmRleGVyLnVwZGF0ZUluZGV4V2l0aFRhc2tzKGZpbGVQYXRoLCB0YXNrcyk7XHJcblxyXG5cdFx0Ly8gT3B0aW9uYWxseSBzdG9yZSBhdWdtZW50ZWQgdGFza3MgdG8gY2FjaGVcclxuXHRcdGlmIChwZXJzaXN0KSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuc3RvcmFnZS5zdG9yZUF1Z21lbnRlZChmaWxlUGF0aCwgdGFza3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNjaGVkdWxlIHBlcnNpc3Qgb3BlcmF0aW9uIGZvciBzaW5nbGUgZmlsZSB1cGRhdGVzXHJcblx0XHRpZiAocGVyc2lzdCAmJiBoYXNDaGFuZ2VzKSB7XHJcblx0XHRcdHRoaXMuc2NoZWR1bGVQZXJzaXN0KGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbWl0IHVwZGF0ZSBldmVudCBpZiB0aGVyZSBhcmUgYWN0dWFsIGNoYW5nZXMgT1IgZm9yY2VkIGJ5IGNhbGxlclxyXG5cdFx0aWYgKGhhc0NoYW5nZXMgfHwgZm9yY2VFbWl0KSB7XHJcblx0XHRcdHRoaXMubGFzdFNlcXVlbmNlID0gU2VxLm5leHQoKTtcclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlRBU0tfQ0FDSEVfVVBEQVRFRCwge1xyXG5cdFx0XHRcdGNoYW5nZWRGaWxlczogW2ZpbGVQYXRoXSxcclxuXHRcdFx0XHRzdGF0czoge1xyXG5cdFx0XHRcdFx0dG90YWw6IGF3YWl0IHRoaXMuaW5kZXhlci5nZXRUb3RhbFRhc2tDb3VudCgpLFxyXG5cdFx0XHRcdFx0Y2hhbmdlZDogdGFza3MubGVuZ3RoLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdHNlcTogdGhpcy5sYXN0U2VxdWVuY2UsXHJcblx0XHRcdFx0c291cmNlU2VxOiBzb3VyY2VTZXEgfHwgMCwgLy8gSW5jbHVkZSBzb3VyY2Ugc2VxdWVuY2UgZm9yIGxvb3AgZGV0ZWN0aW9uXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2tzIGZvciBtdWx0aXBsZSBmaWxlcyBpbiBiYXRjaFxyXG5cdCAqIEBwYXJhbSB1cGRhdGVzIC0gTWFwIG9mIGZpbGUgcGF0aHMgdG8gdGFza3NcclxuXHQgKiBAcGFyYW0gc291cmNlU2VxIC0gT3B0aW9uYWwgc291cmNlIHNlcXVlbmNlIHRvIHRyYWNrIGV2ZW50IG9yaWdpblxyXG5cdCAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgY29udHJvbHMgKHBlcnNpc3QgdG8gc3RvcmFnZSwgZm9yY2UgZXZlbnQgZW1pc3Npb24pXHJcblx0ICovXHJcblx0YXN5bmMgdXBkYXRlQmF0Y2goXHJcblx0XHR1cGRhdGVzOiBNYXA8c3RyaW5nLCBUYXNrW10+LFxyXG5cdFx0c291cmNlU2VxPzogbnVtYmVyLFxyXG5cdFx0b3B0aW9ucz86IHsgcGVyc2lzdD86IGJvb2xlYW47IGZvcmNlRW1pdD86IGJvb2xlYW4gfVxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgcGVyc2lzdCA9IG9wdGlvbnM/LnBlcnNpc3QgIT09IGZhbHNlOyAvLyBkZWZhdWx0IHRydWVcclxuXHRcdGNvbnN0IGZvcmNlRW1pdCA9IG9wdGlvbnM/LmZvcmNlRW1pdCA9PT0gdHJ1ZTtcclxuXHRcdGNvbnN0IGNoYW5nZWRGaWxlczogc3RyaW5nW10gPSBbXTtcclxuXHRcdGxldCB0b3RhbENoYW5nZWQgPSAwO1xyXG5cdFx0bGV0IGhhc0FjdHVhbENoYW5nZXMgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBQcm9jZXNzIGVhY2ggZmlsZSB1cGRhdGUgYW5kIGNoZWNrIGZvciBhY3R1YWwgY2hhbmdlc1xyXG5cdFx0Zm9yIChjb25zdCBbZmlsZVBhdGgsIHRhc2tzXSBvZiB1cGRhdGVzKSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRhc2tzIGhhdmUgYWN0dWFsbHkgY2hhbmdlZCByZWxhdGl2ZSB0byBzdG9yYWdlXHJcblx0XHRcdGNvbnN0IGV4aXN0aW5nQXVnbWVudGVkID0gYXdhaXQgdGhpcy5zdG9yYWdlLmxvYWRBdWdtZW50ZWQoXHJcblx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgaGFzQ2hhbmdlcyA9XHJcblx0XHRcdFx0IWV4aXN0aW5nQXVnbWVudGVkIHx8XHJcblx0XHRcdFx0SlNPTi5zdHJpbmdpZnkodGFza3MpICE9PVxyXG5cdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdBdWdtZW50ZWQuZGF0YSk7XHJcblxyXG5cdFx0XHRhd2FpdCB0aGlzLmluZGV4ZXIudXBkYXRlSW5kZXhXaXRoVGFza3MoZmlsZVBhdGgsIHRhc2tzKTtcclxuXHRcdFx0aWYgKHBlcnNpc3QpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnN0b3JhZ2Uuc3RvcmVBdWdtZW50ZWQoZmlsZVBhdGgsIHRhc2tzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGhhc0NoYW5nZXMpIHtcclxuXHRcdFx0XHRjaGFuZ2VkRmlsZXMucHVzaChmaWxlUGF0aCk7XHJcblx0XHRcdFx0dG90YWxDaGFuZ2VkICs9IHRhc2tzLmxlbmd0aDtcclxuXHRcdFx0XHRoYXNBY3R1YWxDaGFuZ2VzID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVtaXQgZXZlbnRzIGFuZCBwZXJzaXN0IGlmIHRoZXJlIGFyZSBhY3R1YWwgY2hhbmdlcyBPUiBmb3JjZWQgYnkgY2FsbGVyXHJcblx0XHRpZiAoaGFzQWN0dWFsQ2hhbmdlcyB8fCBmb3JjZUVtaXQpIHtcclxuXHRcdFx0aWYgKHBlcnNpc3QgJiYgaGFzQWN0dWFsQ2hhbmdlcykge1xyXG5cdFx0XHRcdC8vIFBlcnNpc3QgdGhlIGNvbnNvbGlkYXRlZCBpbmRleCBhZnRlciBiYXRjaCB1cGRhdGVzXHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0KCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW1JlcG9zaXRvcnldIFBlcnNpc3RlZCBpbmRleCBhZnRlciBiYXRjaCB1cGRhdGUgb2YgJHtjaGFuZ2VkRmlsZXMubGVuZ3RofSBmaWxlcyB3aXRoIGNoYW5nZXNgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgZm9yY2VkIGVtaXQgYnV0IG5vIGNoYW5nZWRGaWxlcyBjb21wdXRlZCwgaW5jbHVkZSBhbGwgdXBkYXRlIGtleXNcclxuXHRcdFx0Y29uc3QgZmlsZXNUb1JlcG9ydCA9XHJcblx0XHRcdFx0Y2hhbmdlZEZpbGVzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdD8gY2hhbmdlZEZpbGVzXHJcblx0XHRcdFx0XHQ6IEFycmF5LmZyb20odXBkYXRlcy5rZXlzKCkpO1xyXG5cclxuXHRcdFx0dGhpcy5sYXN0U2VxdWVuY2UgPSBTZXEubmV4dCgpO1xyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCB7XHJcblx0XHRcdFx0Y2hhbmdlZEZpbGVzOiBmaWxlc1RvUmVwb3J0LFxyXG5cdFx0XHRcdHN0YXRzOiB7XHJcblx0XHRcdFx0XHR0b3RhbDogYXdhaXQgdGhpcy5pbmRleGVyLmdldFRvdGFsVGFza0NvdW50KCksXHJcblx0XHRcdFx0XHRjaGFuZ2VkOiB0b3RhbENoYW5nZWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdFx0c2VxOiB0aGlzLmxhc3RTZXF1ZW5jZSxcclxuXHRcdFx0XHRzb3VyY2VTZXE6IHNvdXJjZVNlcSB8fCAwLCAvLyBJbmNsdWRlIHNvdXJjZSBzZXF1ZW5jZSBmb3IgbG9vcCBkZXRlY3Rpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgW1JlcG9zaXRvcnldIEJhdGNoIHVwZGF0ZSBjb21wbGV0ZWQgd2l0aCBubyBhY3R1YWwgY2hhbmdlcyAtIHNraXBwaW5nIGV2ZW50IGVtaXNzaW9uYFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIHRhc2tzIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyByZW1vdmVGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMuaW5kZXhlci5yZW1vdmVUYXNrc0Zyb21GaWxlKGZpbGVQYXRoKTtcclxuXHJcblx0XHQvLyBDbGVhciBzdG9yYWdlIGZvciB0aGlzIGZpbGVcclxuXHRcdGF3YWl0IHRoaXMuc3RvcmFnZS5jbGVhckZpbGUoZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIEVtaXQgdXBkYXRlIGV2ZW50XHJcblx0XHR0aGlzLmxhc3RTZXF1ZW5jZSA9IFNlcS5uZXh0KCk7XHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCB7XHJcblx0XHRcdGNoYW5nZWRGaWxlczogW2ZpbGVQYXRoXSxcclxuXHRcdFx0c3RhdHM6IHtcclxuXHRcdFx0XHR0b3RhbDogYXdhaXQgdGhpcy5pbmRleGVyLmdldFRvdGFsVGFza0NvdW50KCksXHJcblx0XHRcdFx0Y2hhbmdlZDogMCxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRzZXE6IHRoaXMubGFzdFNlcXVlbmNlLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBzaW5nbGUgdGFzayBieSBJRFxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlbW92ZVRhc2tCeUlkKHRhc2tJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBHZXQgdGhlIHRhc2sgdG8gZmluZCBpdHMgZmlsZSBwYXRoXHJcblx0XHRjb25zdCB0YXNrID0gYXdhaXQgdGhpcy5pbmRleGVyLmdldFRhc2tCeUlkKHRhc2tJZCk7XHJcblx0XHRpZiAoIXRhc2spIHJldHVybjtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBpbmRleGVyXHJcblx0XHRhd2FpdCB0aGlzLmluZGV4ZXIucmVtb3ZlVGFzayh0YXNrSWQpO1xyXG5cclxuXHRcdC8vIFNjaGVkdWxlIHBlcnNpc3QgZm9yIHRoZSB0YXNrJ3MgZmlsZVxyXG5cdFx0dGhpcy5zY2hlZHVsZVBlcnNpc3QodGFzay5maWxlUGF0aCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgSUNTIGV2ZW50cyBpbiB0aGUgcmVwb3NpdG9yeVxyXG5cdCAqL1xyXG5cdGFzeW5jIHVwZGF0ZUljc0V2ZW50cyhldmVudHM6IFRhc2tbXSwgc291cmNlU2VxPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zb2xlLmxvZyhgW1JlcG9zaXRvcnldIFVwZGF0aW5nICR7ZXZlbnRzLmxlbmd0aH0gSUNTIGV2ZW50c2ApO1xyXG5cclxuXHRcdC8vIFN0b3JlIHRoZSBuZXcgSUNTIGV2ZW50c1xyXG5cdFx0dGhpcy5pY3NFdmVudHMgPSBldmVudHM7XHJcblxyXG5cdFx0Ly8gU3RvcmUgSUNTIGV2ZW50cyB0byBwZXJzaXN0ZW5jZVxyXG5cdFx0YXdhaXQgdGhpcy5zdG9yYWdlLnN0b3JlSWNzRXZlbnRzKGV2ZW50cyk7XHJcblxyXG5cdFx0Ly8gRW1pdCB1cGRhdGUgZXZlbnQgdG8gbm90aWZ5IHZpZXdzXHJcblx0XHR0aGlzLmxhc3RTZXF1ZW5jZSA9IFNlcS5uZXh0KCk7XHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCB7XHJcblx0XHRcdGNoYW5nZWRGaWxlczogW1wiaWNzOmV2ZW50c1wiXSwgLy8gU3BlY2lhbCBtYXJrZXIgZm9yIElDUyBldmVudHNcclxuXHRcdFx0c3RhdHM6IHtcclxuXHRcdFx0XHR0b3RhbDogYXdhaXQgdGhpcy5nZXRUb3RhbFRhc2tDb3VudCgpLFxyXG5cdFx0XHRcdGNoYW5nZWQ6IGV2ZW50cy5sZW5ndGgsXHJcblx0XHRcdFx0aWNzRXZlbnRzOiBldmVudHMubGVuZ3RoLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcTogdGhpcy5sYXN0U2VxdWVuY2UsXHJcblx0XHRcdHNvdXJjZVNlcTogc291cmNlU2VxIHx8IDAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0b3RhbCB0YXNrIGNvdW50IGluY2x1ZGluZyBJQ1MgZXZlbnRzIGFuZCBmaWxlIHRhc2tzXHJcblx0ICovXHJcblx0YXN5bmMgZ2V0VG90YWxUYXNrQ291bnQoKTogUHJvbWlzZTxudW1iZXI+IHtcclxuXHRcdGNvbnN0IGZpbGVUYXNrQ291bnQgPSBhd2FpdCB0aGlzLmluZGV4ZXIuZ2V0VG90YWxUYXNrQ291bnQoKTtcclxuXHRcdHJldHVybiBmaWxlVGFza0NvdW50ICsgdGhpcy5pY3NFdmVudHMubGVuZ3RoICsgdGhpcy5maWxlVGFza3Muc2l6ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGFza3MgZnJvbSB0aGUgaW5kZXggKGluY2x1ZGluZyBJQ1MgZXZlbnRzIGFuZCBmaWxlIHRhc2tzKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGFsbCgpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgcmVndWxhclRhc2tzID0gYXdhaXQgdGhpcy5pbmRleGVyLmdldEFsbFRhc2tzKCk7XHJcblx0XHRjb25zdCBmaWxlVGFza0FycmF5ID0gQXJyYXkuZnJvbSh0aGlzLmZpbGVUYXNrcy52YWx1ZXMoKSk7XHJcblx0XHQvLyBNZXJnZSBmaWxlLWJhc2VkIHRhc2tzIHdpdGggSUNTIGV2ZW50cyBhbmQgZmlsZSB0YXNrc1xyXG5cdFx0cmV0dXJuIFsuLi5yZWd1bGFyVGFza3MsIC4uLnRoaXMuaWNzRXZlbnRzLCAuLi5maWxlVGFza0FycmF5XTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXNrcyBieSBwcm9qZWN0XHJcblx0ICovXHJcblx0YXN5bmMgYnlQcm9qZWN0KHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRjb25zdCB0YXNrSWRzID0gYXdhaXQgdGhpcy5pbmRleGVyLmdldFRhc2tJZHNCeVByb2plY3QocHJvamVjdCk7XHJcblx0XHRjb25zdCBmaWxlVGFza3MgPSBhd2FpdCB0aGlzLmdldFRhc2tzQnlJZHModGFza0lkcyk7XHJcblxyXG5cdFx0Ly8gQWxzbyBmaWx0ZXIgSUNTIGV2ZW50cyBieSBwcm9qZWN0IGlmIHRoZXkgaGF2ZSBvbmVcclxuXHRcdGNvbnN0IGljc1Byb2plY3RUYXNrcyA9IHRoaXMuaWNzRXZlbnRzLmZpbHRlcihcclxuXHRcdFx0KHRhc2spID0+IHRhc2subWV0YWRhdGE/LnByb2plY3QgPT09IHByb2plY3RcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFsuLi5maWxlVGFza3MsIC4uLmljc1Byb2plY3RUYXNrc107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgYnkgdGFnc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGJ5VGFncyh0YWdzOiBzdHJpbmdbXSk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRjb25zdCB0YXNrSWRTZXRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXHJcblx0XHRcdHRhZ3MubWFwKCh0YWcpID0+IHRoaXMuaW5kZXhlci5nZXRUYXNrSWRzQnlUYWcodGFnKSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRmluZCBpbnRlcnNlY3Rpb24gb2YgYWxsIHRhZyBzZXRzXHJcblx0XHRpZiAodGFza0lkU2V0cy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcclxuXHJcblx0XHRsZXQgaW50ZXJzZWN0aW9uID0gbmV3IFNldCh0YXNrSWRTZXRzWzBdKTtcclxuXHRcdGZvciAobGV0IGkgPSAxOyBpIDwgdGFza0lkU2V0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpbnRlcnNlY3Rpb24gPSBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5pbnRlcnNlY3Rpb25dLmZpbHRlcigoaWQpID0+IHRhc2tJZFNldHNbaV0uaGFzKGlkKSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5nZXRUYXNrc0J5SWRzKGludGVyc2VjdGlvbik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgYnkgY29tcGxldGlvbiBzdGF0dXNcclxuXHQgKi9cclxuXHRhc3luYyBieVN0YXR1cyhjb21wbGV0ZWQ6IGJvb2xlYW4pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgdGFza0lkcyA9IGF3YWl0IHRoaXMuaW5kZXhlci5nZXRUYXNrSWRzQnlDb21wbGV0aW9uU3RhdHVzKFxyXG5cdFx0XHRjb21wbGV0ZWRcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRUYXNrc0J5SWRzKHRhc2tJZHMpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRhc2tzIGJ5IGRhdGUgcmFuZ2VcclxuXHQgKi9cclxuXHRhc3luYyBieURhdGVSYW5nZShvcHRzOiB7XHJcblx0XHRmcm9tPzogbnVtYmVyO1xyXG5cdFx0dG8/OiBudW1iZXI7XHJcblx0XHRmaWVsZD86IFwiZHVlXCIgfCBcInN0YXJ0XCIgfCBcInNjaGVkdWxlZFwiO1xyXG5cdH0pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgZmllbGQgPSBvcHRzLmZpZWxkIHx8IFwiZHVlXCI7XHJcblx0XHRjb25zdCBjYWNoZSA9IGF3YWl0IHRoaXMuaW5kZXhlci5nZXRDYWNoZSgpO1xyXG5cclxuXHRcdGNvbnN0IGRhdGVJbmRleCA9XHJcblx0XHRcdGZpZWxkID09PSBcImR1ZVwiXHJcblx0XHRcdFx0PyBjYWNoZS5kdWVEYXRlXHJcblx0XHRcdFx0OiBmaWVsZCA9PT0gXCJzdGFydFwiXHJcblx0XHRcdFx0PyBjYWNoZS5zdGFydERhdGVcclxuXHRcdFx0XHQ6IGNhY2hlLnNjaGVkdWxlZERhdGU7XHJcblxyXG5cdFx0Y29uc3QgdGFza0lkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuXHRcdGZvciAoY29uc3QgW2RhdGVTdHIsIGlkc10gb2YgZGF0ZUluZGV4KSB7XHJcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyKS5nZXRUaW1lKCk7XHJcblxyXG5cdFx0XHRpZiAob3B0cy5mcm9tICYmIGRhdGUgPCBvcHRzLmZyb20pIGNvbnRpbnVlO1xyXG5cdFx0XHRpZiAob3B0cy50byAmJiBkYXRlID4gb3B0cy50bykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xyXG5cdFx0XHRcdHRhc2tJZHMuYWRkKGlkKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmdldFRhc2tzQnlJZHModGFza0lkcyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSB0YXNrIGJ5IElEXHJcblx0ICovXHJcblx0YXN5bmMgYnlJZChpZDogc3RyaW5nKTogUHJvbWlzZTxUYXNrIHwgbnVsbD4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaW5kZXhlci5nZXRUYXNrQnlJZChpZCkgfHwgbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIHdpdGggZmlsdGVyIGFuZCBzb3J0aW5nXHJcblx0ICovXHJcblx0YXN5bmMgcXVlcnkoXHJcblx0XHRmaWx0ZXI/OiBUYXNrRmlsdGVyLFxyXG5cdFx0c29ydGluZz86IFNvcnRpbmdDcml0ZXJpYVtdXHJcblx0KTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdGNvbnN0IGZpbHRlcnMgPSBmaWx0ZXIgPyBbZmlsdGVyXSA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaW5kZXhlci5xdWVyeVRhc2tzKGZpbHRlcnMsIHNvcnRpbmcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGluZGV4IHN1bW1hcnkgc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFN1bW1hcnkoKTogUHJvbWlzZTx7XHJcblx0XHR0b3RhbDogbnVtYmVyO1xyXG5cdFx0YnlQcm9qZWN0OiBNYXA8c3RyaW5nLCBudW1iZXI+O1xyXG5cdFx0YnlUYWc6IE1hcDxzdHJpbmcsIG51bWJlcj47XHJcblx0XHRieVN0YXR1czogTWFwPGJvb2xlYW4sIG51bWJlcj47XHJcblx0fT4ge1xyXG5cdFx0Y29uc3QgY2FjaGUgPSBhd2FpdCB0aGlzLmluZGV4ZXIuZ2V0Q2FjaGUoKTtcclxuXHJcblx0XHRjb25zdCBieVByb2plY3QgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG5cdFx0Zm9yIChjb25zdCBbcHJvamVjdCwgaWRzXSBvZiBjYWNoZS5wcm9qZWN0cykge1xyXG5cdFx0XHRieVByb2plY3Quc2V0KHByb2plY3QsIGlkcy5zaXplKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBieVRhZyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblx0XHRmb3IgKGNvbnN0IFt0YWcsIGlkc10gb2YgY2FjaGUudGFncykge1xyXG5cdFx0XHRieVRhZy5zZXQodGFnLCBpZHMuc2l6ZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYnlTdGF0dXMgPSBuZXcgTWFwPGJvb2xlYW4sIG51bWJlcj4oKTtcclxuXHRcdGZvciAoY29uc3QgW3N0YXR1cywgaWRzXSBvZiBjYWNoZS5jb21wbGV0ZWQpIHtcclxuXHRcdFx0YnlTdGF0dXMuc2V0KHN0YXR1cywgaWRzLnNpemUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRvdGFsOiBjYWNoZS50YXNrcy5zaXplLFxyXG5cdFx0XHRieVByb2plY3QsXHJcblx0XHRcdGJ5VGFnLFxyXG5cdFx0XHRieVN0YXR1cyxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTYXZlIHRoZSBjdXJyZW50IGluZGV4IHRvIHBlcnNpc3RlbnQgc3RvcmFnZVxyXG5cdCAqL1xyXG5cdGFzeW5jIHBlcnNpc3QoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBzbmFwc2hvdCA9IGF3YWl0IHRoaXMuaW5kZXhlci5nZXRJbmRleFNuYXBzaG90KCk7XHJcblx0XHRhd2FpdCB0aGlzLnN0b3JhZ2Uuc3RvcmVDb25zb2xpZGF0ZWQoc25hcHNob3QpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2NoZWR1bGUgYSBwZXJzaXN0IG9wZXJhdGlvbiB3aXRoIGRlYm91bmNpbmcgYW5kIGJhdGNoaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzY2hlZHVsZVBlcnNpc3Qoc291cmNlOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMucGVyc2lzdFF1ZXVlLmFkZChzb3VyY2UpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHdlIHNob3VsZCBwZXJzaXN0IGltbWVkaWF0ZWx5XHJcblx0XHRjb25zdCBzaG91bGRQZXJzaXN0Tm93ID1cclxuXHRcdFx0dGhpcy5wZXJzaXN0UXVldWUuc2l6ZSA+PSB0aGlzLk1BWF9RVUVVRV9TSVpFIHx8XHJcblx0XHRcdERhdGUubm93KCkgLSB0aGlzLmxhc3RQZXJzaXN0VGltZSA+IHRoaXMuTUFYX1BFUlNJU1RfSU5URVJWQUw7XHJcblxyXG5cdFx0aWYgKHNob3VsZFBlcnNpc3ROb3cpIHtcclxuXHRcdFx0dGhpcy5leGVjdXRlUGVyc2lzdCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gU2NoZWR1bGUgZGVsYXllZCBwZXJzaXN0XHJcblx0XHRcdGlmICh0aGlzLnBlcnNpc3RUaW1lcikge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnBlcnNpc3RUaW1lcik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5wZXJzaXN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmV4ZWN1dGVQZXJzaXN0KCk7XHJcblx0XHRcdH0sIHRoaXMuUEVSU0lTVF9ERUxBWSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeGVjdXRlIHRoZSBwZW5kaW5nIHBlcnNpc3Qgb3BlcmF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBleGVjdXRlUGVyc2lzdCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICh0aGlzLnBlcnNpc3RUaW1lcikge1xyXG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5wZXJzaXN0VGltZXIpO1xyXG5cdFx0XHR0aGlzLnBlcnNpc3RUaW1lciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMucGVyc2lzdFF1ZXVlLnNpemUgPiAwKSB7XHJcblx0XHRcdGNvbnN0IHF1ZXVlU2l6ZSA9IHRoaXMucGVyc2lzdFF1ZXVlLnNpemU7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBbUmVwb3NpdG9yeV0gUGVyc2lzdGluZyBhZnRlciAke3F1ZXVlU2l6ZX0gY2hhbmdlc2ApO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBlcnNpc3QoKTtcclxuXHRcdFx0dGhpcy5wZXJzaXN0UXVldWUuY2xlYXIoKTtcclxuXHRcdFx0dGhpcy5sYXN0UGVyc2lzdFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgYWxsIGRhdGFcclxuXHQgKi9cclxuXHRhc3luYyBjbGVhcigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMuaW5kZXhlci5jbGVhckluZGV4KCk7XHJcblx0XHRhd2FpdCB0aGlzLnN0b3JhZ2UuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCB0aGUgcGFyc2UgZmlsZSBjYWxsYmFjayBmb3IgdGhlIGluZGV4ZXJcclxuXHQgKi9cclxuXHRzZXRQYXJzZUZpbGVDYWxsYmFjayhjYWxsYmFjazogKGZpbGU6IFRGaWxlKSA9PiBQcm9taXNlPFRhc2tbXT4pOiB2b2lkIHtcclxuXHRcdHRoaXMuaW5kZXhlci5zZXRQYXJzZUZpbGVDYWxsYmFjayhjYWxsYmFjayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIHVuZGVybHlpbmcgaW5kZXhlciAoZm9yIGFkdmFuY2VkIHVzYWdlKVxyXG5cdCAqL1xyXG5cdGdldEluZGV4ZXIoKTogVGFza0luZGV4ZXIge1xyXG5cdFx0cmV0dXJuIHRoaXMuaW5kZXhlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgdW5kZXJseWluZyBzdG9yYWdlIChmb3IgYWR2YW5jZWQgdXNhZ2UpXHJcblx0ICovXHJcblx0Z2V0U3RvcmFnZSgpOiBTdG9yYWdlIHtcclxuXHRcdHJldHVybiB0aGlzLnN0b3JhZ2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIZWxwZXI6IEdldCB0YXNrcyBieSBhIHNldCBvZiBJRHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGdldFRhc2tzQnlJZHMoXHJcblx0XHR0YXNrSWRzOiBTZXQ8c3RyaW5nPiB8IHN0cmluZ1tdXHJcblx0KTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRcdGNvbnN0IGlkcyA9IEFycmF5LmlzQXJyYXkodGFza0lkcykgPyB0YXNrSWRzIDogQXJyYXkuZnJvbSh0YXNrSWRzKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xyXG5cdFx0XHRjb25zdCB0YXNrID0gYXdhaXQgdGhpcy5pbmRleGVyLmdldFRhc2tCeUlkKGlkKTtcclxuXHRcdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0XHR0YXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRhc2tzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW51cCBhbmQgZW5zdXJlIGFsbCBwZW5kaW5nIGRhdGEgaXMgcGVyc2lzdGVkXHJcblx0ICovXHJcblx0YXN5bmMgY2xlYW51cCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIEV4ZWN1dGUgYW55IHBlbmRpbmcgcGVyc2lzdCBvcGVyYXRpb25zXHJcblx0XHRhd2FpdCB0aGlzLmV4ZWN1dGVQZXJzaXN0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSBmaWxlLWxldmVsIHRhc2sgKGZyb20gRmlsZVNvdXJjZSlcclxuXHQgKi9cclxuXHRhc3luYyB1cGRhdGVGaWxlVGFzayh0YXNrOiBUYXNrKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBmaWxlUGF0aCA9IHRhc2suZmlsZVBhdGg7XHJcblx0XHRpZiAoIWZpbGVQYXRoKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gU3RvcmUgdGhlIGZpbGUgdGFza1xyXG5cdFx0dGhpcy5maWxlVGFza3Muc2V0KGZpbGVQYXRoLCB0YXNrKTtcclxuXHJcblx0XHQvLyBTY2hlZHVsZSBwZXJzaXN0IGZvciBmaWxlIHRhc2tzXHJcblx0XHR0aGlzLnNjaGVkdWxlUGVyc2lzdChgZmlsZS10YXNrOiR7ZmlsZVBhdGh9YCk7XHJcblxyXG5cdFx0Ly8gRW1pdCB1cGRhdGUgZXZlbnRcclxuXHRcdHRoaXMubGFzdFNlcXVlbmNlID0gU2VxLm5leHQoKTtcclxuXHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5UQVNLX0NBQ0hFX1VQREFURUQsIHtcclxuXHRcdFx0Y2hhbmdlZEZpbGVzOiBbYGZpbGUtdGFzazoke2ZpbGVQYXRofWBdLFxyXG5cdFx0XHRzdGF0czoge1xyXG5cdFx0XHRcdHRvdGFsOiBhd2FpdCB0aGlzLmdldFRvdGFsVGFza0NvdW50KCksXHJcblx0XHRcdFx0Y2hhbmdlZDogMSxcclxuXHRcdFx0XHRmaWxlVGFza3M6IHRoaXMuZmlsZVRhc2tzLnNpemUsXHJcblx0XHRcdH0sXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0c2VxOiB0aGlzLmxhc3RTZXF1ZW5jZSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgZmlsZS1sZXZlbCB0YXNrIChmcm9tIEZpbGVTb3VyY2UpXHJcblx0ICovXHJcblx0YXN5bmMgcmVtb3ZlRmlsZVRhc2soZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLmZpbGVUYXNrcy5oYXMoZmlsZVBhdGgpKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSBmaWxlIHRhc2tcclxuXHRcdHRoaXMuZmlsZVRhc2tzLmRlbGV0ZShmaWxlUGF0aCk7XHJcblxyXG5cdFx0Ly8gU2NoZWR1bGUgcGVyc2lzdCBmb3IgZmlsZSB0YXNrc1xyXG5cdFx0dGhpcy5zY2hlZHVsZVBlcnNpc3QoYGZpbGUtdGFzazoke2ZpbGVQYXRofWApO1xyXG5cclxuXHRcdC8vIEVtaXQgdXBkYXRlIGV2ZW50XHJcblx0XHR0aGlzLmxhc3RTZXF1ZW5jZSA9IFNlcS5uZXh0KCk7XHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCB7XHJcblx0XHRcdGNoYW5nZWRGaWxlczogW2BmaWxlLXRhc2s6JHtmaWxlUGF0aH1gXSxcclxuXHRcdFx0c3RhdHM6IHtcclxuXHRcdFx0XHR0b3RhbDogYXdhaXQgdGhpcy5nZXRUb3RhbFRhc2tDb3VudCgpLFxyXG5cdFx0XHRcdGNoYW5nZWQ6IC0xLFxyXG5cdFx0XHRcdGZpbGVUYXNrczogdGhpcy5maWxlVGFza3Muc2l6ZSxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRzZXE6IHRoaXMubGFzdFNlcXVlbmNlLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSB0YXNrIGJ5IGl0cyBJRFxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFRhc2tCeUlkKHRhc2tJZDogc3RyaW5nKTogUHJvbWlzZTxUYXNrIHwgdW5kZWZpbmVkPiB7XHJcblx0XHQvLyBHZXQgYWxsIHRhc2tzIGZyb20gdGhlIHJlcG9zaXRvcnlcclxuXHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgdGhpcy5hbGwoKTtcclxuXHJcblx0XHQvLyBGaW5kIHRoZSB0YXNrIGJ5IElEXHJcblx0XHRjb25zdCB0YXNrID0gYWxsVGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFza0lkKTtcclxuXHJcblx0XHRyZXR1cm4gdGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIHNpbmdsZSB0YXNrIGRpcmVjdGx5IChmb3IgaW5saW5lIGVkaXRpbmcpXHJcblx0ICogVGhpcyBhdm9pZHMgcmUtcGFyc2luZyB0aGUgZW50aXJlIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyB1cGRhdGVTaW5nbGVUYXNrKHVwZGF0ZWRUYXNrOiBUYXNrKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBmaWxlUGF0aCA9IHVwZGF0ZWRUYXNrLmZpbGVQYXRoO1xyXG5cdFx0aWYgKCFmaWxlUGF0aCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW1JlcG9zaXRvcnldIFVwZGF0aW5nIHNpbmdsZSB0YXNrOiAke3VwZGF0ZWRUYXNrLmlkfSBpbiAke2ZpbGVQYXRofWBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gTG9hZCBleGlzdGluZyBhdWdtZW50ZWQgdGFza3MgZm9yIHRoZSBmaWxlXHJcblx0XHRjb25zdCBleGlzdGluZ0F1Z21lbnRlZCA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkQXVnbWVudGVkKGZpbGVQYXRoKTtcclxuXHRcdGlmICghZXhpc3RpbmdBdWdtZW50ZWQpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBbUmVwb3NpdG9yeV0gTm8gZXhpc3RpbmcgdGFza3MgZm91bmQgZm9yICR7ZmlsZVBhdGh9LCBjYW5ub3QgdXBkYXRlIHNpbmdsZSB0YXNrYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmluZCBhbmQgcmVwbGFjZSB0aGUgdGFzayBpbiB0aGUgYXJyYXlcclxuXHRcdGNvbnN0IHRhc2tzID0gZXhpc3RpbmdBdWdtZW50ZWQuZGF0YTtcclxuXHRcdGNvbnN0IHRhc2tJbmRleCA9IHRhc2tzLmZpbmRJbmRleCgodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWQpO1xyXG5cclxuXHRcdGlmICh0YXNrSW5kZXggPT09IC0xKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgW1JlcG9zaXRvcnldIFRhc2sgJHt1cGRhdGVkVGFzay5pZH0gbm90IGZvdW5kIGluICR7ZmlsZVBhdGh9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSB0YXNrXHJcblx0XHR0YXNrc1t0YXNrSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSBpbmRleCBhbmQgc3RvcmFnZVxyXG5cdFx0YXdhaXQgdGhpcy5pbmRleGVyLnVwZGF0ZUluZGV4V2l0aFRhc2tzKGZpbGVQYXRoLCB0YXNrcyk7XHJcblx0XHRhd2FpdCB0aGlzLnN0b3JhZ2Uuc3RvcmVBdWdtZW50ZWQoZmlsZVBhdGgsIHRhc2tzKTtcclxuXHJcblx0XHQvLyBTY2hlZHVsZSBwZXJzaXN0IG9wZXJhdGlvblxyXG5cdFx0dGhpcy5zY2hlZHVsZVBlcnNpc3QoZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIEVtaXQgdXBkYXRlIGV2ZW50XHJcblx0XHR0aGlzLmxhc3RTZXF1ZW5jZSA9IFNlcS5uZXh0KCk7XHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCB7XHJcblx0XHRcdGNoYW5nZWRGaWxlczogW2ZpbGVQYXRoXSxcclxuXHRcdFx0c3RhdHM6IHtcclxuXHRcdFx0XHR0b3RhbDogYXdhaXQgdGhpcy5nZXRUb3RhbFRhc2tDb3VudCgpLFxyXG5cdFx0XHRcdGNoYW5nZWQ6IDEsXHJcblx0XHRcdH0sXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0c2VxOiB0aGlzLmxhc3RTZXF1ZW5jZSxcclxuXHRcdFx0c291cmNlU2VxOiB1bmRlZmluZWQsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFtSZXBvc2l0b3J5XSBTaW5nbGUgdGFzayAke3VwZGF0ZWRUYXNrLmlkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseWBcclxuXHRcdCk7XHJcblx0fVxyXG59XHJcbiJdfQ==