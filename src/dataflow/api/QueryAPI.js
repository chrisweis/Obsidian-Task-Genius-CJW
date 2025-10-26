import { __awaiter } from "tslib";
import { Repository } from "../indexer/Repository";
/**
 * QueryAPI - Public query interface for task data
 * This provides a clean, stable API for views to access task data
 */
export class QueryAPI {
    constructor(app, vault, metadataCache) {
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.taskCache = null;
        this.cacheTimestamp = 0;
        this.CACHE_DURATION = 100; // 100ms cache for synchronous access
        // Promise cache for async operations to prevent duplicate requests
        this.pendingPromise = null;
        this.repository = new Repository(app, vault, metadataCache);
    }
    /**
     * Initialize the API (loads persisted data)
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.repository.initialize();
        });
    }
    /**
     * Get all tasks with deduplication for concurrent requests
     */
    getAllTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            // If there's already a pending request, return the same promise
            if (this.pendingPromise) {
                return this.pendingPromise;
            }
            // Create new promise and cache it
            this.pendingPromise = this.repository.all().then(tasks => {
                // Update synchronous cache with fresh data
                this.taskCache = tasks;
                this.cacheTimestamp = Date.now();
                // Clear pending promise after completion
                this.pendingPromise = null;
                return tasks;
            }).catch(error => {
                // Clear pending promise on error
                this.pendingPromise = null;
                throw error;
            });
            return this.pendingPromise;
        });
    }
    /**
     * Get tasks by project
     */
    getTasksByProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.byProject(project);
        });
    }
    /**
     * Get tasks by tags (intersection)
     */
    getTasksByTags(tags) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.byTags(tags);
        });
    }
    /**
     * Get tasks by completion status
     */
    getTasksByStatus(completed) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.byStatus(completed);
        });
    }
    /**
     * Get tasks by date range
     */
    getTasksByDateRange(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.byDateRange(opts);
        });
    }
    /**
     * Get a task by ID
     */
    getTaskById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.byId(id);
        });
    }
    // Legacy method aliases for backward compatibility
    all() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAllTasks();
        });
    }
    byProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByProject(project);
        });
    }
    byTags(tags) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByTags(tags);
        });
    }
    byStatus(completed) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByStatus(completed);
        });
    }
    byDateRange(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByDateRange(opts);
        });
    }
    byId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTaskById(id);
        });
    }
    /**
     * Query tasks with filter and sorting
     */
    query(filter, sorting) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repository.query(filter, sorting);
        });
    }
    /**
     * Get index summary statistics
     */
    getIndexSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const summary = yield this.repository.getSummary();
            // Convert Maps to Records for easier consumption
            const byProject = {};
            for (const [key, value] of summary.byProject) {
                byProject[key] = value;
            }
            const byTag = {};
            for (const [key, value] of summary.byTag) {
                byTag[key] = value;
            }
            return {
                total: summary.total,
                byProject,
                byTag,
            };
        });
    }
    /**
     * Get detailed summary statistics (legacy method)
     */
    getSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const summary = yield this.repository.getSummary();
            // Convert Maps to Records for easier consumption
            const byProject = {};
            for (const [key, value] of summary.byProject) {
                byProject[key] = value;
            }
            const byTag = {};
            for (const [key, value] of summary.byTag) {
                byTag[key] = value;
            }
            const byStatus = {};
            for (const [key, value] of summary.byStatus) {
                byStatus[String(key)] = value;
            }
            return {
                total: summary.total,
                byProject,
                byTag,
                byStatus,
            };
        });
    }
    /**
     * Get the underlying repository (for advanced usage)
     */
    getRepository() {
        return this.repository;
    }
    // ===== Synchronous Cache Methods =====
    /**
     * Update the synchronous cache with fresh data
     */
    updateCache() {
        return __awaiter(this, void 0, void 0, function* () {
            this.taskCache = yield this.repository.all();
            this.cacheTimestamp = Date.now();
        });
    }
    /**
     * Get all tasks synchronously (uses cache)
     * Returns empty array if cache is not initialized
     */
    getAllTasksSync() {
        if (!this.taskCache || Date.now() - this.cacheTimestamp > this.CACHE_DURATION) {
            // Cache is stale or not initialized, trigger async update
            console.debug("[QueryAPI] Sync cache miss, triggering async update");
            this.updateCache().catch(error => {
                console.error("[QueryAPI] Failed to update cache:", error);
            });
            return this.taskCache || [];
        }
        return this.taskCache;
    }
    /**
     * Get task by ID synchronously (uses cache)
     * Returns null if not found or cache not initialized
     */
    getTaskByIdSync(id) {
        const tasks = this.getAllTasksSync();
        return tasks.find(task => task.id === id) || null;
    }
    /**
     * Ensure cache is populated (call this during initialization)
     */
    ensureCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.taskCache) {
                console.log("[QueryAPI] Populating initial cache...");
                try {
                    const tasks = yield this.repository.all();
                    this.taskCache = tasks;
                    this.cacheTimestamp = Date.now();
                    console.log(`[QueryAPI] Cache populated with ${tasks.length} tasks`);
                }
                catch (error) {
                    console.error("[QueryAPI] Failed to populate initial cache:", error);
                }
            }
        });
    }
    // ===== Convenience Query Methods =====
    /**
     * Get tasks for a specific file
     */
    getTasksForFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTasks = yield this.getAllTasks();
            return allTasks.filter(task => task.filePath === filePath);
        });
    }
    /**
     * Get tasks for a specific file (synchronous)
     */
    getTasksForFileSync(filePath) {
        const allTasks = this.getAllTasksSync();
        return allTasks.filter(task => task.filePath === filePath);
    }
    /**
     * Get incomplete tasks
     */
    getIncompleteTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByStatus(false);
        });
    }
    /**
     * Get incomplete tasks (synchronous)
     */
    getIncompleteTasksSync() {
        const allTasks = this.getAllTasksSync();
        return allTasks.filter(task => !task.completed);
    }
    /**
     * Get completed tasks
     */
    getCompletedTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getTasksByStatus(true);
        });
    }
    /**
     * Get completed tasks (synchronous)
     */
    getCompletedTasksSync() {
        const allTasks = this.getAllTasksSync();
        return allTasks.filter(task => task.completed);
    }
    /**
     * Get tasks due today
     */
    getTasksDueToday() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return this.getTasksByDateRange({
                from: today.getTime(),
                to: tomorrow.getTime(),
                field: 'due'
            });
        });
    }
    /**
     * Get tasks due today (synchronous)
     */
    getTasksDueTodaySync() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const allTasks = this.getAllTasksSync();
        return allTasks.filter(task => {
            var _a;
            if (!((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate))
                return false;
            return task.metadata.dueDate >= today.getTime() &&
                task.metadata.dueDate < tomorrow.getTime();
        });
    }
    /**
     * Get overdue tasks
     */
    getOverdueTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const allTasks = yield this.getAllTasks();
            return allTasks.filter(task => {
                var _a;
                return !task.completed &&
                    ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) &&
                    task.metadata.dueDate < now.getTime();
            });
        });
    }
    /**
     * Get overdue tasks (synchronous)
     */
    getOverdueTasksSync() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const allTasks = this.getAllTasksSync();
        return allTasks.filter(task => {
            var _a;
            return !task.completed &&
                ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) &&
                task.metadata.dueDate < now.getTime();
        });
    }
    /**
     * Get all available contexts and projects
     */
    getAvailableContextsAndProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            const allTasks = yield this.getAllTasks();
            const contexts = new Set();
            const projects = new Set();
            allTasks.forEach(task => {
                var _a, _b, _c;
                // Add context
                if ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.context) {
                    contexts.add(task.metadata.context);
                }
                // Add project (support multiple formats)
                if ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.project) {
                    projects.add(task.metadata.project);
                }
                // Support legacy tgProject format
                const metadata = task.metadata;
                if ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.tgProject) === null || _c === void 0 ? void 0 : _c.name) {
                    projects.add(metadata.tgProject.name);
                }
            });
            return {
                contexts: Array.from(contexts).sort(),
                projects: Array.from(projects).sort()
            };
        });
    }
    /**
     * Get all available contexts and projects (synchronous)
     */
    getAvailableContextsAndProjectsSync() {
        const allTasks = this.getAllTasksSync();
        const contexts = new Set();
        const projects = new Set();
        allTasks.forEach(task => {
            var _a, _b, _c;
            // Add context
            if ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.context) {
                contexts.add(task.metadata.context);
            }
            // Add project (support multiple formats)
            if ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.project) {
                projects.add(task.metadata.project);
            }
            // Support legacy tgProject format
            const metadata = task.metadata;
            if ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.tgProject) === null || _c === void 0 ? void 0 : _c.name) {
                projects.add(metadata.tgProject.name);
            }
        });
        return {
            contexts: Array.from(contexts).sort(),
            projects: Array.from(projects).sort()
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVlcnlBUEkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJRdWVyeUFQSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRW5EOzs7R0FHRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBU3BCLFlBQ1MsR0FBUSxFQUNSLEtBQVksRUFDWixhQUE0QjtRQUY1QixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBVjdCLGNBQVMsR0FBa0IsSUFBSSxDQUFDO1FBQ2hDLG1CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQ2xCLG1CQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMscUNBQXFDO1FBRTVFLG1FQUFtRTtRQUMzRCxtQkFBYyxHQUEyQixJQUFJLENBQUM7UUFPckQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRDs7T0FFRztJQUNHLFVBQVU7O1lBQ2YsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3BDLENBQUM7S0FBQTtJQUVEOztPQUVHO0lBQ0csV0FBVzs7WUFDaEIsZ0VBQWdFO1lBQ2hFLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO2FBQzNCO1lBRUQsa0NBQWtDO1lBQ2xDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3hELDJDQUEyQztnQkFDM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dC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VGFza0ZpbHRlciwgU29ydGluZ0NyaXRlcmlhIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgdHlwZSB7IEFwcCwgVmF1bHQsIE1ldGFkYXRhQ2FjaGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeSB9IGZyb20gXCIuLi9pbmRleGVyL1JlcG9zaXRvcnlcIjtcclxuXHJcbi8qKlxyXG4gKiBRdWVyeUFQSSAtIFB1YmxpYyBxdWVyeSBpbnRlcmZhY2UgZm9yIHRhc2sgZGF0YVxyXG4gKiBUaGlzIHByb3ZpZGVzIGEgY2xlYW4sIHN0YWJsZSBBUEkgZm9yIHZpZXdzIHRvIGFjY2VzcyB0YXNrIGRhdGFcclxuICovXHJcbmV4cG9ydCBjbGFzcyBRdWVyeUFQSSB7XHJcblx0cHJpdmF0ZSByZXBvc2l0b3J5OiBSZXBvc2l0b3J5O1xyXG5cdHByaXZhdGUgdGFza0NhY2hlOiBUYXNrW10gfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGNhY2hlVGltZXN0YW1wOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgQ0FDSEVfRFVSQVRJT04gPSAxMDA7IC8vIDEwMG1zIGNhY2hlIGZvciBzeW5jaHJvbm91cyBhY2Nlc3NcclxuXHJcblx0Ly8gUHJvbWlzZSBjYWNoZSBmb3IgYXN5bmMgb3BlcmF0aW9ucyB0byBwcmV2ZW50IGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdHByaXZhdGUgcGVuZGluZ1Byb21pc2U6IFByb21pc2U8VGFza1tdPiB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHZhdWx0OiBWYXVsdCxcclxuXHRcdHByaXZhdGUgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZVxyXG5cdCkge1xyXG5cdFx0dGhpcy5yZXBvc2l0b3J5ID0gbmV3IFJlcG9zaXRvcnkoYXBwLCB2YXVsdCwgbWV0YWRhdGFDYWNoZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHRoZSBBUEkgKGxvYWRzIHBlcnNpc3RlZCBkYXRhKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCB0aGlzLnJlcG9zaXRvcnkuaW5pdGlhbGl6ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0YXNrcyB3aXRoIGRlZHVwbGljYXRpb24gZm9yIGNvbmN1cnJlbnQgcmVxdWVzdHNcclxuXHQgKi9cclxuXHRhc3luYyBnZXRBbGxUYXNrcygpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Ly8gSWYgdGhlcmUncyBhbHJlYWR5IGEgcGVuZGluZyByZXF1ZXN0LCByZXR1cm4gdGhlIHNhbWUgcHJvbWlzZVxyXG5cdFx0aWYgKHRoaXMucGVuZGluZ1Byb21pc2UpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMucGVuZGluZ1Byb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG5ldyBwcm9taXNlIGFuZCBjYWNoZSBpdFxyXG5cdFx0dGhpcy5wZW5kaW5nUHJvbWlzZSA9IHRoaXMucmVwb3NpdG9yeS5hbGwoKS50aGVuKHRhc2tzID0+IHtcclxuXHRcdFx0Ly8gVXBkYXRlIHN5bmNocm9ub3VzIGNhY2hlIHdpdGggZnJlc2ggZGF0YVxyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZSA9IHRhc2tzO1xyXG5cdFx0XHR0aGlzLmNhY2hlVGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdC8vIENsZWFyIHBlbmRpbmcgcHJvbWlzZSBhZnRlciBjb21wbGV0aW9uXHJcblx0XHRcdHRoaXMucGVuZGluZ1Byb21pc2UgPSBudWxsO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRhc2tzO1xyXG5cdFx0fSkuY2F0Y2goZXJyb3IgPT4ge1xyXG5cdFx0XHQvLyBDbGVhciBwZW5kaW5nIHByb21pc2Ugb24gZXJyb3JcclxuXHRcdFx0dGhpcy5wZW5kaW5nUHJvbWlzZSA9IG51bGw7XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMucGVuZGluZ1Byb21pc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgYnkgcHJvamVjdFxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFRhc2tzQnlQcm9qZWN0KHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXBvc2l0b3J5LmJ5UHJvamVjdChwcm9qZWN0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXNrcyBieSB0YWdzIChpbnRlcnNlY3Rpb24pXHJcblx0ICovXHJcblx0YXN5bmMgZ2V0VGFza3NCeVRhZ3ModGFnczogc3RyaW5nW10pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMucmVwb3NpdG9yeS5ieVRhZ3ModGFncyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgYnkgY29tcGxldGlvbiBzdGF0dXNcclxuXHQgKi9cclxuXHRhc3luYyBnZXRUYXNrc0J5U3RhdHVzKGNvbXBsZXRlZDogYm9vbGVhbik6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXBvc2l0b3J5LmJ5U3RhdHVzKGNvbXBsZXRlZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgYnkgZGF0ZSByYW5nZVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFRhc2tzQnlEYXRlUmFuZ2Uob3B0czoge1xyXG5cdFx0ZnJvbT86IG51bWJlcjtcclxuXHRcdHRvPzogbnVtYmVyO1xyXG5cdFx0ZmllbGQ/OiBcImR1ZVwiIHwgXCJzdGFydFwiIHwgXCJzY2hlZHVsZWRcIlxyXG5cdH0pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMucmVwb3NpdG9yeS5ieURhdGVSYW5nZShvcHRzKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHRhc2sgYnkgSURcclxuXHQgKi9cclxuXHRhc3luYyBnZXRUYXNrQnlJZChpZDogc3RyaW5nKTogUHJvbWlzZTxUYXNrIHwgbnVsbD4ge1xyXG5cdFx0cmV0dXJuIHRoaXMucmVwb3NpdG9yeS5ieUlkKGlkKTtcclxuXHR9XHJcblxyXG5cdC8vIExlZ2FjeSBtZXRob2QgYWxpYXNlcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxyXG5cdGFzeW5jIGFsbCgpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0QWxsVGFza3MoKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGJ5UHJvamVjdChwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VGFza3NCeVByb2plY3QocHJvamVjdCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBieVRhZ3ModGFnczogc3RyaW5nW10pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VGFza3NCeVRhZ3ModGFncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBieVN0YXR1cyhjb21wbGV0ZWQ6IGJvb2xlYW4pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VGFza3NCeVN0YXR1cyhjb21wbGV0ZWQpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgYnlEYXRlUmFuZ2Uob3B0czoge1xyXG5cdFx0ZnJvbT86IG51bWJlcjtcclxuXHRcdHRvPzogbnVtYmVyO1xyXG5cdFx0ZmllbGQ/OiBcImR1ZVwiIHwgXCJzdGFydFwiIHwgXCJzY2hlZHVsZWRcIlxyXG5cdH0pOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VGFza3NCeURhdGVSYW5nZShvcHRzKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGJ5SWQoaWQ6IHN0cmluZyk6IFByb21pc2U8VGFzayB8IG51bGw+IHtcclxuXHRcdHJldHVybiB0aGlzLmdldFRhc2tCeUlkKGlkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIHdpdGggZmlsdGVyIGFuZCBzb3J0aW5nXHJcblx0ICovXHJcblx0YXN5bmMgcXVlcnkoZmlsdGVyPzogVGFza0ZpbHRlciwgc29ydGluZz86IFNvcnRpbmdDcml0ZXJpYVtdKTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdHJldHVybiB0aGlzLnJlcG9zaXRvcnkucXVlcnkoZmlsdGVyLCBzb3J0aW5nKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBpbmRleCBzdW1tYXJ5IHN0YXRpc3RpY3NcclxuXHQgKi9cclxuXHRhc3luYyBnZXRJbmRleFN1bW1hcnkoKTogUHJvbWlzZTx7XHJcblx0XHR0b3RhbDogbnVtYmVyO1xyXG5cdFx0YnlQcm9qZWN0OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xyXG5cdFx0YnlUYWc6IFJlY29yZDxzdHJpbmcsIG51bWJlcj47XHJcblx0fT4ge1xyXG5cdFx0Y29uc3Qgc3VtbWFyeSA9IGF3YWl0IHRoaXMucmVwb3NpdG9yeS5nZXRTdW1tYXJ5KCk7XHJcblxyXG5cdFx0Ly8gQ29udmVydCBNYXBzIHRvIFJlY29yZHMgZm9yIGVhc2llciBjb25zdW1wdGlvblxyXG5cdFx0Y29uc3QgYnlQcm9qZWN0OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBzdW1tYXJ5LmJ5UHJvamVjdCkge1xyXG5cdFx0XHRieVByb2plY3Rba2V5XSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGJ5VGFnOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBzdW1tYXJ5LmJ5VGFnKSB7XHJcblx0XHRcdGJ5VGFnW2tleV0gPSB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0b3RhbDogc3VtbWFyeS50b3RhbCxcclxuXHRcdFx0YnlQcm9qZWN0LFxyXG5cdFx0XHRieVRhZyxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgZGV0YWlsZWQgc3VtbWFyeSBzdGF0aXN0aWNzIChsZWdhY3kgbWV0aG9kKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFN1bW1hcnkoKTogUHJvbWlzZTx7XHJcblx0XHR0b3RhbDogbnVtYmVyO1xyXG5cdFx0YnlQcm9qZWN0OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xyXG5cdFx0YnlUYWc6IFJlY29yZDxzdHJpbmcsIG51bWJlcj47XHJcblx0XHRieVN0YXR1czogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcclxuXHR9PiB7XHJcblx0XHRjb25zdCBzdW1tYXJ5ID0gYXdhaXQgdGhpcy5yZXBvc2l0b3J5LmdldFN1bW1hcnkoKTtcclxuXHJcblx0XHQvLyBDb252ZXJ0IE1hcHMgdG8gUmVjb3JkcyBmb3IgZWFzaWVyIGNvbnN1bXB0aW9uXHJcblx0XHRjb25zdCBieVByb2plY3Q6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHN1bW1hcnkuYnlQcm9qZWN0KSB7XHJcblx0XHRcdGJ5UHJvamVjdFtrZXldID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYnlUYWc6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHN1bW1hcnkuYnlUYWcpIHtcclxuXHRcdFx0YnlUYWdba2V5XSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGJ5U3RhdHVzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBzdW1tYXJ5LmJ5U3RhdHVzKSB7XHJcblx0XHRcdGJ5U3RhdHVzW1N0cmluZyhrZXkpXSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRvdGFsOiBzdW1tYXJ5LnRvdGFsLFxyXG5cdFx0XHRieVByb2plY3QsXHJcblx0XHRcdGJ5VGFnLFxyXG5cdFx0XHRieVN0YXR1cyxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIHVuZGVybHlpbmcgcmVwb3NpdG9yeSAoZm9yIGFkdmFuY2VkIHVzYWdlKVxyXG5cdCAqL1xyXG5cdGdldFJlcG9zaXRvcnkoKTogUmVwb3NpdG9yeSB7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXBvc2l0b3J5O1xyXG5cdH1cclxuXHJcblx0Ly8gPT09PT0gU3luY2hyb25vdXMgQ2FjaGUgTWV0aG9kcyA9PT09PVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGhlIHN5bmNocm9ub3VzIGNhY2hlIHdpdGggZnJlc2ggZGF0YVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlQ2FjaGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLnRhc2tDYWNoZSA9IGF3YWl0IHRoaXMucmVwb3NpdG9yeS5hbGwoKTtcclxuXHRcdHRoaXMuY2FjaGVUaW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0YXNrcyBzeW5jaHJvbm91c2x5ICh1c2VzIGNhY2hlKVxyXG5cdCAqIFJldHVybnMgZW1wdHkgYXJyYXkgaWYgY2FjaGUgaXMgbm90IGluaXRpYWxpemVkXHJcblx0ICovXHJcblx0Z2V0QWxsVGFza3NTeW5jKCk6IFRhc2tbXSB7XHJcblx0XHRpZiAoIXRoaXMudGFza0NhY2hlIHx8IERhdGUubm93KCkgLSB0aGlzLmNhY2hlVGltZXN0YW1wID4gdGhpcy5DQUNIRV9EVVJBVElPTikge1xyXG5cdFx0XHQvLyBDYWNoZSBpcyBzdGFsZSBvciBub3QgaW5pdGlhbGl6ZWQsIHRyaWdnZXIgYXN5bmMgdXBkYXRlXHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXCJbUXVlcnlBUEldIFN5bmMgY2FjaGUgbWlzcywgdHJpZ2dlcmluZyBhc3luYyB1cGRhdGVcIik7XHJcblx0XHRcdHRoaXMudXBkYXRlQ2FjaGUoKS5jYXRjaChlcnJvciA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIltRdWVyeUFQSV0gRmFpbGVkIHRvIHVwZGF0ZSBjYWNoZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHRoaXMudGFza0NhY2hlIHx8IFtdO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMudGFza0NhY2hlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRhc2sgYnkgSUQgc3luY2hyb25vdXNseSAodXNlcyBjYWNoZSlcclxuXHQgKiBSZXR1cm5zIG51bGwgaWYgbm90IGZvdW5kIG9yIGNhY2hlIG5vdCBpbml0aWFsaXplZFxyXG5cdCAqL1xyXG5cdGdldFRhc2tCeUlkU3luYyhpZDogc3RyaW5nKTogVGFzayB8IG51bGwge1xyXG5cdFx0Y29uc3QgdGFza3MgPSB0aGlzLmdldEFsbFRhc2tzU3luYygpO1xyXG5cdFx0cmV0dXJuIHRhc2tzLmZpbmQodGFzayA9PiB0YXNrLmlkID09PSBpZCkgfHwgbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuc3VyZSBjYWNoZSBpcyBwb3B1bGF0ZWQgKGNhbGwgdGhpcyBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXHJcblx0ICovXHJcblx0YXN5bmMgZW5zdXJlQ2FjaGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMudGFza0NhY2hlKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1F1ZXJ5QVBJXSBQb3B1bGF0aW5nIGluaXRpYWwgY2FjaGUuLi5cIik7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnJlcG9zaXRvcnkuYWxsKCk7XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUgPSB0YXNrcztcclxuXHRcdFx0XHR0aGlzLmNhY2hlVGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhgW1F1ZXJ5QVBJXSBDYWNoZSBwb3B1bGF0ZWQgd2l0aCAke3Rhc2tzLmxlbmd0aH0gdGFza3NgKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiW1F1ZXJ5QVBJXSBGYWlsZWQgdG8gcG9wdWxhdGUgaW5pdGlhbCBjYWNoZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyA9PT09PSBDb252ZW5pZW5jZSBRdWVyeSBNZXRob2RzID09PT09XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXNrcyBmb3IgYSBzcGVjaWZpYyBmaWxlXHJcblx0ICovXHJcblx0YXN5bmMgZ2V0VGFza3NGb3JGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgYWxsVGFza3MgPSBhd2FpdCB0aGlzLmdldEFsbFRhc2tzKCk7XHJcblx0XHRyZXR1cm4gYWxsVGFza3MuZmlsdGVyKHRhc2sgPT4gdGFzay5maWxlUGF0aCA9PT0gZmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRhc2tzIGZvciBhIHNwZWNpZmljIGZpbGUgKHN5bmNocm9ub3VzKVxyXG5cdCAqL1xyXG5cdGdldFRhc2tzRm9yRmlsZVN5bmMoZmlsZVBhdGg6IHN0cmluZyk6IFRhc2tbXSB7XHJcblx0XHRjb25zdCBhbGxUYXNrcyA9IHRoaXMuZ2V0QWxsVGFza3NTeW5jKCk7XHJcblx0XHRyZXR1cm4gYWxsVGFza3MuZmlsdGVyKHRhc2sgPT4gdGFzay5maWxlUGF0aCA9PT0gZmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGluY29tcGxldGUgdGFza3NcclxuXHQgKi9cclxuXHRhc3luYyBnZXRJbmNvbXBsZXRlVGFza3MoKTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdHJldHVybiB0aGlzLmdldFRhc2tzQnlTdGF0dXMoZmFsc2UpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGluY29tcGxldGUgdGFza3MgKHN5bmNocm9ub3VzKVxyXG5cdCAqL1xyXG5cdGdldEluY29tcGxldGVUYXNrc1N5bmMoKTogVGFza1tdIHtcclxuXHRcdGNvbnN0IGFsbFRhc2tzID0gdGhpcy5nZXRBbGxUYXNrc1N5bmMoKTtcclxuXHRcdHJldHVybiBhbGxUYXNrcy5maWx0ZXIodGFzayA9PiAhdGFzay5jb21wbGV0ZWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNvbXBsZXRlZCB0YXNrc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldENvbXBsZXRlZFRhc2tzKCk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRUYXNrc0J5U3RhdHVzKHRydWUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNvbXBsZXRlZCB0YXNrcyAoc3luY2hyb25vdXMpXHJcblx0ICovXHJcblx0Z2V0Q29tcGxldGVkVGFza3NTeW5jKCk6IFRhc2tbXSB7XHJcblx0XHRjb25zdCBhbGxUYXNrcyA9IHRoaXMuZ2V0QWxsVGFza3NTeW5jKCk7XHJcblx0XHRyZXR1cm4gYWxsVGFza3MuZmlsdGVyKHRhc2sgPT4gdGFzay5jb21wbGV0ZWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRhc2tzIGR1ZSB0b2RheVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFRhc2tzRHVlVG9kYXkoKTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdHRvZGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHR0b21vcnJvdy5zZXREYXRlKHRvbW9ycm93LmdldERhdGUoKSArIDEpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLmdldFRhc2tzQnlEYXRlUmFuZ2Uoe1xyXG5cdFx0XHRmcm9tOiB0b2RheS5nZXRUaW1lKCksXHJcblx0XHRcdHRvOiB0b21vcnJvdy5nZXRUaW1lKCksXHJcblx0XHRcdGZpZWxkOiAnZHVlJ1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgZHVlIHRvZGF5IChzeW5jaHJvbm91cylcclxuXHQgKi9cclxuXHRnZXRUYXNrc0R1ZVRvZGF5U3luYygpOiBUYXNrW10ge1xyXG5cdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0dG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRjb25zdCB0b21vcnJvdyA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHRcdHRvbW9ycm93LnNldERhdGUodG9tb3Jyb3cuZ2V0RGF0ZSgpICsgMSk7XHJcblxyXG5cdFx0Y29uc3QgYWxsVGFza3MgPSB0aGlzLmdldEFsbFRhc2tzU3luYygpO1xyXG5cdFx0cmV0dXJuIGFsbFRhc2tzLmZpbHRlcih0YXNrID0+IHtcclxuXHRcdFx0aWYgKCF0YXNrLm1ldGFkYXRhPy5kdWVEYXRlKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLmR1ZURhdGUgPj0gdG9kYXkuZ2V0VGltZSgpICYmXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5kdWVEYXRlIDwgdG9tb3Jyb3cuZ2V0VGltZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgb3ZlcmR1ZSB0YXNrc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldE92ZXJkdWVUYXNrcygpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdG5vdy5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgdGhpcy5nZXRBbGxUYXNrcygpO1xyXG5cclxuXHRcdHJldHVybiBhbGxUYXNrcy5maWx0ZXIodGFzayA9PlxyXG5cdFx0XHQhdGFzay5jb21wbGV0ZWQgJiZcclxuXHRcdFx0dGFzay5tZXRhZGF0YT8uZHVlRGF0ZSAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGUgPCBub3cuZ2V0VGltZSgpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IG92ZXJkdWUgdGFza3MgKHN5bmNocm9ub3VzKVxyXG5cdCAqL1xyXG5cdGdldE92ZXJkdWVUYXNrc1N5bmMoKTogVGFza1tdIHtcclxuXHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRub3cuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRjb25zdCBhbGxUYXNrcyA9IHRoaXMuZ2V0QWxsVGFza3NTeW5jKCk7XHJcblxyXG5cdFx0cmV0dXJuIGFsbFRhc2tzLmZpbHRlcih0YXNrID0+XHJcblx0XHRcdCF0YXNrLmNvbXBsZXRlZCAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhPy5kdWVEYXRlICYmXHJcblx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZSA8IG5vdy5nZXRUaW1lKClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGF2YWlsYWJsZSBjb250ZXh0cyBhbmQgcHJvamVjdHNcclxuXHQgKi9cclxuXHRhc3luYyBnZXRBdmFpbGFibGVDb250ZXh0c0FuZFByb2plY3RzKCk6IFByb21pc2U8e1xyXG5cdFx0Y29udGV4dHM6IHN0cmluZ1tdO1xyXG5cdFx0cHJvamVjdHM6IHN0cmluZ1tdO1xyXG5cdH0+IHtcclxuXHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgdGhpcy5nZXRBbGxUYXNrcygpO1xyXG5cdFx0Y29uc3QgY29udGV4dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdGNvbnN0IHByb2plY3RzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0YWxsVGFza3MuZm9yRWFjaCh0YXNrID0+IHtcclxuXHRcdFx0Ly8gQWRkIGNvbnRleHRcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGE/LmNvbnRleHQpIHtcclxuXHRcdFx0XHRjb250ZXh0cy5hZGQodGFzay5tZXRhZGF0YS5jb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHByb2plY3QgKHN1cHBvcnQgbXVsdGlwbGUgZm9ybWF0cylcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGE/LnByb2plY3QpIHtcclxuXHRcdFx0XHRwcm9qZWN0cy5hZGQodGFzay5tZXRhZGF0YS5wcm9qZWN0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3VwcG9ydCBsZWdhY3kgdGdQcm9qZWN0IGZvcm1hdFxyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgYW55O1xyXG5cdFx0XHRpZiAobWV0YWRhdGE/LnRnUHJvamVjdD8ubmFtZSkge1xyXG5cdFx0XHRcdHByb2plY3RzLmFkZChtZXRhZGF0YS50Z1Byb2plY3QubmFtZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNvbnRleHRzOiBBcnJheS5mcm9tKGNvbnRleHRzKS5zb3J0KCksXHJcblx0XHRcdHByb2plY3RzOiBBcnJheS5mcm9tKHByb2plY3RzKS5zb3J0KClcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGF2YWlsYWJsZSBjb250ZXh0cyBhbmQgcHJvamVjdHMgKHN5bmNocm9ub3VzKVxyXG5cdCAqL1xyXG5cdGdldEF2YWlsYWJsZUNvbnRleHRzQW5kUHJvamVjdHNTeW5jKCk6IHtcclxuXHRcdGNvbnRleHRzOiBzdHJpbmdbXTtcclxuXHRcdHByb2plY3RzOiBzdHJpbmdbXTtcclxuXHR9IHtcclxuXHRcdGNvbnN0IGFsbFRhc2tzID0gdGhpcy5nZXRBbGxUYXNrc1N5bmMoKTtcclxuXHRcdGNvbnN0IGNvbnRleHRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRjb25zdCBwcm9qZWN0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuXHRcdGFsbFRhc2tzLmZvckVhY2godGFzayA9PiB7XHJcblx0XHRcdC8vIEFkZCBjb250ZXh0XHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhPy5jb250ZXh0KSB7XHJcblx0XHRcdFx0Y29udGV4dHMuYWRkKHRhc2subWV0YWRhdGEuY29udGV4dCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBwcm9qZWN0IChzdXBwb3J0IG11bHRpcGxlIGZvcm1hdHMpXHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhPy5wcm9qZWN0KSB7XHJcblx0XHRcdFx0cHJvamVjdHMuYWRkKHRhc2subWV0YWRhdGEucHJvamVjdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN1cHBvcnQgbGVnYWN5IHRnUHJvamVjdCBmb3JtYXRcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIGFueTtcclxuXHRcdFx0aWYgKG1ldGFkYXRhPy50Z1Byb2plY3Q/Lm5hbWUpIHtcclxuXHRcdFx0XHRwcm9qZWN0cy5hZGQobWV0YWRhdGEudGdQcm9qZWN0Lm5hbWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjb250ZXh0czogQXJyYXkuZnJvbShjb250ZXh0cykuc29ydCgpLFxyXG5cdFx0XHRwcm9qZWN0czogQXJyYXkuZnJvbShwcm9qZWN0cykuc29ydCgpXHJcblx0XHR9O1xyXG5cdH1cclxufVxyXG4iXX0=