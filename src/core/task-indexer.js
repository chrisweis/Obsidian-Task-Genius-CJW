/**
 * High-performance task indexer implementation
 *
 * This indexer focuses solely on indexing and querying tasks.
 * Parsing is handled by external components.
 */
import { __awaiter } from "tslib";
import { Component, TFile, } from "obsidian";
import { isSupportedFileWithFilter } from "../utils/file/file-type-detector";
/**
 * Utility to format a date for index keys (YYYY-MM-DD)
 */
function formatDateForIndex(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/**
 * Implementation of the task indexer that focuses only on indexing and querying
 */
export class TaskIndexer extends Component {
    constructor(app, vault, metadataCache) {
        super();
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.lastIndexTime = new Map();
        // Queue for throttling file indexing
        this.indexQueue = [];
        this.isProcessingQueue = false;
        this.taskCache = this.initEmptyCache();
        // Setup file change listeners for incremental updates
        this.setupEventListeners();
    }
    /**
     * Set the callback function for parsing files
     */
    setParseFileCallback(callback) {
        this.parseFileCallback = callback;
    }
    /**
     * Set the file filter manager
     */
    setFileFilterManager(filterManager) {
        this.fileFilterManager = filterManager;
    }
    /**
     * Initialize an empty task cache
     */
    initEmptyCache() {
        return {
            tasks: new Map(),
            files: new Map(),
            tags: new Map(),
            projects: new Map(),
            contexts: new Map(),
            dueDate: new Map(),
            startDate: new Map(),
            scheduledDate: new Map(),
            completed: new Map(),
            priority: new Map(),
            cancelledDate: new Map(),
            onCompletion: new Map(),
            dependsOn: new Map(),
            taskId: new Map(),
            fileMtimes: new Map(),
            fileProcessedTimes: new Map(),
        };
    }
    /**
     * Setup file change event listeners
     */
    setupEventListeners() {
        // Watch for file modifications
        this.registerEvent(this.vault.on("modify", (file) => {
            if (file instanceof TFile) {
                const include = isSupportedFileWithFilter(file, this.fileFilterManager, "inline");
                // Reduce log spam: only log when include=true (actual work),
                // or randomly sample the false cases.
                if (include || Math.random() < 0.1) {
                    console.log("[TaskIndexer] modify event inline filter", {
                        path: file.path,
                        include,
                    });
                }
                if (include)
                    this.queueFileForIndexing(file);
            }
        }));
        // Watch for file deletions
        this.registerEvent(this.vault.on("delete", (file) => {
            if (file instanceof TFile) {
                const include = isSupportedFileWithFilter(file, this.fileFilterManager, "inline");
                console.log("[TaskIndexer] delete event inline filter", {
                    path: file.path,
                    include,
                });
                if (include)
                    this.removeFileFromIndex(file);
            }
        }));
        // Watch for new files
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(this.vault.on("create", (file) => {
                if (file instanceof TFile) {
                    const include = isSupportedFileWithFilter(file, this.fileFilterManager, "inline");
                    console.log("[TaskIndexer] create event inline filter", {
                        path: file.path,
                        include,
                    });
                    if (include)
                        this.queueFileForIndexing(file);
                }
            }));
        });
    }
    /**
     * Queue a file for indexing with throttling
     */
    queueFileForIndexing(file) {
        if (!this.indexQueue.some((f) => f.path === file.path)) {
            this.indexQueue.push(file);
        }
        if (!this.isProcessingQueue) {
            this.processIndexQueue();
        }
    }
    /**
     * Process the file index queue with throttling
     */
    processIndexQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.indexQueue.length === 0) {
                this.isProcessingQueue = false;
                return;
            }
            this.isProcessingQueue = true;
            const file = this.indexQueue.shift();
            if (file && this.parseFileCallback) {
                try {
                    // Use the external parsing callback
                    const tasks = yield this.parseFileCallback(file);
                    this.updateIndexWithTasks(file.path, tasks);
                }
                catch (error) {
                    console.error(`Error processing file ${file.path} in queue:`, error);
                }
            }
            // Process next file after a small delay
            setTimeout(() => this.processIndexQueue(), 50);
        });
    }
    /**
     * Initialize the task indexer
     * Note: This no longer does any parsing - external components must provide tasks
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // Start with an empty cache
            this.taskCache = this.initEmptyCache();
            console.log(`Task indexer initialized with empty cache. Use updateIndexWithTasks to populate.`);
        });
    }
    /**
     * Get the current task cache
     */
    getCache() {
        // Ensure cache structure is complete
        this.ensureCacheStructure(this.taskCache);
        return this.taskCache;
    }
    /**
     * Index all files in the vault
     * This is now a no-op - external components should handle parsing and call updateIndexWithTasks
     */
    indexAllFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn("TaskIndexer.indexAllFiles is deprecated. Use external parsing components instead.");
            yield this.initialize();
        });
    }
    // ---- Minimal adapter methods expected by Repository ----
    restoreFromSnapshot(cache) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setCache(cache);
        });
    }
    getTotalTaskCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.taskCache.tasks.size;
        });
    }
    getAllTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.taskCache.tasks.values());
        });
    }
    getTaskIdsByProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.taskCache.projects.get(project) || new Set();
        });
    }
    getTaskIdsByTag(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.taskCache.tags.get(tag) || new Set();
        });
    }
    getTaskIdsByCompletionStatus(completed) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.taskCache.completed.get(completed) || new Set();
        });
    }
    getIndexSnapshot() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getCache();
        });
    }
    clearIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetCache();
        });
    }
    removeTasksFromFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.removeFileFromIndex(filePath);
        });
    }
    /**
     * Index a single file using external parsing
     * @deprecated Use updateIndexWithTasks with external parsing instead
     */
    indexFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.parseFileCallback) {
                try {
                    const tasks = yield this.parseFileCallback(file);
                    this.updateIndexWithTasks(file.path, tasks);
                }
                catch (error) {
                    console.error(`Error indexing file ${file.path}:`, error);
                }
            }
            else {
                console.warn(`No parse callback set for indexFile. Use setParseFileCallback() or updateIndexWithTasks() instead.`);
            }
        });
    }
    /**
     * Update the index with tasks parsed by external components
     * This is the primary method for updating the index
     */
    updateIndexWithTasks(filePath, tasks, fileMtime) {
        // Remove existing tasks for this file first
        this.removeFileFromIndex(filePath);
        // Update cache with new tasks
        const fileTaskIds = new Set();
        for (const task of tasks) {
            // Store task in main task map
            this.taskCache.tasks.set(task.id, task);
            fileTaskIds.add(task.id);
            // Update all indexes
            this.updateIndexMaps(task);
        }
        // Update file index
        this.taskCache.files.set(filePath, fileTaskIds);
        this.lastIndexTime.set(filePath, Date.now());
        // Update file mtime if provided
        if (fileMtime !== undefined) {
            this.updateFileMtime(filePath, fileMtime);
        }
    }
    /**
     * Update index for a modified file - just an alias for deprecated indexFile
     */
    updateIndex(file) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.indexFile(file);
        });
    }
    /**
     * Remove a file from the index
     */
    removeFileFromIndex(file) {
        const filePath = typeof file === "string" ? file : file.path;
        const taskIds = this.taskCache.files.get(filePath);
        if (!taskIds)
            return;
        // Remove each task from all indexes
        for (const taskId of taskIds) {
            const task = this.taskCache.tasks.get(taskId);
            if (task) {
                this.removeTaskFromIndexes(task);
            }
            // Remove from main task map
            this.taskCache.tasks.delete(taskId);
        }
        // Remove from file index
        this.taskCache.files.delete(filePath);
        this.lastIndexTime.delete(filePath);
    }
    /**
     * Update all index maps for a task
     */
    updateIndexMaps(task) {
        // Update completed status index
        let completedTasks = this.taskCache.completed.get(task.completed) || new Set();
        completedTasks.add(task.id);
        this.taskCache.completed.set(task.completed, completedTasks);
        // Update tag index
        for (const tag of task.metadata.tags) {
            let tagTasks = this.taskCache.tags.get(tag) || new Set();
            tagTasks.add(task.id);
            this.taskCache.tags.set(tag, tagTasks);
        }
        // Update project index
        if (task.metadata.project) {
            let projectTasks = this.taskCache.projects.get(task.metadata.project) || new Set();
            projectTasks.add(task.id);
            this.taskCache.projects.set(task.metadata.project, projectTasks);
        }
        // Update context index
        if (task.metadata.context) {
            let contextTasks = this.taskCache.contexts.get(task.metadata.context) || new Set();
            contextTasks.add(task.id);
            this.taskCache.contexts.set(task.metadata.context, contextTasks);
        }
        // Update date indexes
        if (task.metadata.dueDate) {
            const dateStr = formatDateForIndex(task.metadata.dueDate);
            let dueTasks = this.taskCache.dueDate.get(dateStr) || new Set();
            dueTasks.add(task.id);
            this.taskCache.dueDate.set(dateStr, dueTasks);
        }
        if (task.metadata.startDate) {
            const dateStr = formatDateForIndex(task.metadata.startDate);
            let startTasks = this.taskCache.startDate.get(dateStr) || new Set();
            startTasks.add(task.id);
            this.taskCache.startDate.set(dateStr, startTasks);
        }
        if (task.metadata.scheduledDate) {
            const dateStr = formatDateForIndex(task.metadata.scheduledDate);
            let scheduledTasks = this.taskCache.scheduledDate.get(dateStr) || new Set();
            scheduledTasks.add(task.id);
            this.taskCache.scheduledDate.set(dateStr, scheduledTasks);
        }
        // Update priority index
        if (task.metadata.priority !== undefined) {
            let priorityTasks = this.taskCache.priority.get(task.metadata.priority) ||
                new Set();
            priorityTasks.add(task.id);
            this.taskCache.priority.set(task.metadata.priority, priorityTasks);
        }
        // Update cancelled date index
        if (task.metadata.cancelledDate) {
            const dateStr = formatDateForIndex(task.metadata.cancelledDate);
            let cancelledTasks = this.taskCache.cancelledDate.get(dateStr) || new Set();
            cancelledTasks.add(task.id);
            this.taskCache.cancelledDate.set(dateStr, cancelledTasks);
        }
        // Update onCompletion index
        if (task.metadata.onCompletion) {
            let onCompletionTasks = this.taskCache.onCompletion.get(task.metadata.onCompletion) ||
                new Set();
            onCompletionTasks.add(task.id);
            this.taskCache.onCompletion.set(task.metadata.onCompletion, onCompletionTasks);
        }
        // Update dependsOn index
        if (task.metadata.dependsOn && task.metadata.dependsOn.length > 0) {
            for (const dependency of task.metadata.dependsOn) {
                let dependsOnTasks = this.taskCache.dependsOn.get(dependency) || new Set();
                dependsOnTasks.add(task.id);
                this.taskCache.dependsOn.set(dependency, dependsOnTasks);
            }
        }
        // Update task ID index
        if (task.metadata.id) {
            let taskIdTasks = this.taskCache.taskId.get(task.metadata.id) || new Set();
            taskIdTasks.add(task.id);
            this.taskCache.taskId.set(task.metadata.id, taskIdTasks);
        }
    }
    /**
     * Remove a task from all indexes
     */
    removeTaskFromIndexes(task) {
        // Remove from completed index
        const completedTasks = this.taskCache.completed.get(task.completed);
        if (completedTasks) {
            completedTasks.delete(task.id);
            if (completedTasks.size === 0) {
                this.taskCache.completed.delete(task.completed);
            }
        }
        // Remove from tag index
        for (const tag of task.metadata.tags) {
            const tagTasks = this.taskCache.tags.get(tag);
            if (tagTasks) {
                tagTasks.delete(task.id);
                if (tagTasks.size === 0) {
                    this.taskCache.tags.delete(tag);
                }
            }
        }
        // Remove from project index
        if (task.metadata.project) {
            const projectTasks = this.taskCache.projects.get(task.metadata.project);
            if (projectTasks) {
                projectTasks.delete(task.id);
                if (projectTasks.size === 0) {
                    this.taskCache.projects.delete(task.metadata.project);
                }
            }
        }
        // Remove from context index
        if (task.metadata.context) {
            const contextTasks = this.taskCache.contexts.get(task.metadata.context);
            if (contextTasks) {
                contextTasks.delete(task.id);
                if (contextTasks.size === 0) {
                    this.taskCache.contexts.delete(task.metadata.context);
                }
            }
        }
        // Remove from date indexes
        if (task.metadata.dueDate) {
            const dateStr = formatDateForIndex(task.metadata.dueDate);
            const dueTasks = this.taskCache.dueDate.get(dateStr);
            if (dueTasks) {
                dueTasks.delete(task.id);
                if (dueTasks.size === 0) {
                    this.taskCache.dueDate.delete(dateStr);
                }
            }
        }
        if (task.metadata.startDate) {
            const dateStr = formatDateForIndex(task.metadata.startDate);
            const startTasks = this.taskCache.startDate.get(dateStr);
            if (startTasks) {
                startTasks.delete(task.id);
                if (startTasks.size === 0) {
                    this.taskCache.startDate.delete(dateStr);
                }
            }
        }
        if (task.metadata.scheduledDate) {
            const dateStr = formatDateForIndex(task.metadata.scheduledDate);
            const scheduledTasks = this.taskCache.scheduledDate.get(dateStr);
            if (scheduledTasks) {
                scheduledTasks.delete(task.id);
                if (scheduledTasks.size === 0) {
                    this.taskCache.scheduledDate.delete(dateStr);
                }
            }
        }
        // Remove from priority index
        if (task.metadata.priority !== undefined) {
            const priorityTasks = this.taskCache.priority.get(task.metadata.priority);
            if (priorityTasks) {
                priorityTasks.delete(task.id);
                if (priorityTasks.size === 0) {
                    this.taskCache.priority.delete(task.metadata.priority);
                }
            }
        }
        // Remove from cancelled date index
        if (task.metadata.cancelledDate) {
            const dateStr = formatDateForIndex(task.metadata.cancelledDate);
            const cancelledTasks = this.taskCache.cancelledDate.get(dateStr);
            if (cancelledTasks) {
                cancelledTasks.delete(task.id);
                if (cancelledTasks.size === 0) {
                    this.taskCache.cancelledDate.delete(dateStr);
                }
            }
        }
        // Remove from onCompletion index
        if (task.metadata.onCompletion) {
            const onCompletionTasks = this.taskCache.onCompletion.get(task.metadata.onCompletion);
            if (onCompletionTasks) {
                onCompletionTasks.delete(task.id);
                if (onCompletionTasks.size === 0) {
                    this.taskCache.onCompletion.delete(task.metadata.onCompletion);
                }
            }
        }
        // Remove from dependsOn index
        if (task.metadata.dependsOn && task.metadata.dependsOn.length > 0) {
            for (const dependency of task.metadata.dependsOn) {
                const dependsOnTasks = this.taskCache.dependsOn.get(dependency);
                if (dependsOnTasks) {
                    dependsOnTasks.delete(task.id);
                    if (dependsOnTasks.size === 0) {
                        this.taskCache.dependsOn.delete(dependency);
                    }
                }
            }
        }
        // Remove from task ID index
        if (task.metadata.id) {
            const taskIdTasks = this.taskCache.taskId.get(task.metadata.id);
            if (taskIdTasks) {
                taskIdTasks.delete(task.id);
                if (taskIdTasks.size === 0) {
                    this.taskCache.taskId.delete(task.metadata.id);
                }
            }
        }
    }
    /**
     * Query tasks based on filters and sorting criteria
     */
    queryTasks(filters, sortBy = []) {
        if (filters.length === 0 && this.taskCache.tasks.size < 1000) {
            // If no filters and small task count, just return all tasks
            const allTasks = Array.from(this.taskCache.tasks.values());
            return this.applySorting(allTasks, sortBy);
        }
        // Start with a null set to indicate we haven't applied any filters yet
        let resultTaskIds = null;
        // Apply each filter
        for (const filter of filters) {
            const filteredIds = this.applyFilter(filter);
            if (resultTaskIds === null) {
                // First filter
                resultTaskIds = filteredIds;
            }
            else if (filter.conjunction === "OR") {
                // Union sets (OR)
                filteredIds.forEach((id) => resultTaskIds.add(id));
            }
            else {
                // Intersection (AND is default)
                resultTaskIds = new Set([...resultTaskIds].filter((id) => filteredIds.has(id)));
            }
        }
        // If we have no filters, include all tasks
        if (resultTaskIds === null) {
            resultTaskIds = new Set(this.taskCache.tasks.keys());
        }
        // Convert to task array
        const tasks = Array.from(resultTaskIds)
            .map((id) => this.taskCache.tasks.get(id))
            .filter((task) => task !== undefined);
        // Apply sorting
        return this.applySorting(tasks, sortBy);
    }
    /**
     * Apply a filter to the task cache
     */
    applyFilter(filter) {
        switch (filter.type) {
            case "tag":
                return this.filterByTag(filter);
            case "project":
                return this.filterByProject(filter);
            case "context":
                return this.filterByContext(filter);
            case "status":
                return this.filterByStatus(filter);
            case "priority":
                return this.filterByPriority(filter);
            case "dueDate":
                return this.filterByDueDate(filter);
            case "startDate":
                return this.filterByStartDate(filter);
            case "scheduledDate":
                return this.filterByScheduledDate(filter);
            default:
                console.warn(`Unsupported filter type: ${filter.type}`);
                return new Set();
        }
    }
    /**
     * Filter tasks by tag
     */
    filterByTag(filter) {
        if (filter.operator === "contains") {
            return this.taskCache.tags.get(filter.value) || new Set();
        }
        else if (filter.operator === "!=") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get tasks with the specified tag
            const tagTaskIds = this.taskCache.tags.get(filter.value) || new Set();
            // Return tasks that don't have the tag
            return new Set([...allTaskIds].filter((id) => !tagTaskIds.has(id)));
        }
        return new Set();
    }
    /**
     * Filter tasks by project
     */
    filterByProject(filter) {
        if (filter.operator === "=") {
            return (this.taskCache.projects.get(filter.value) || new Set());
        }
        else if (filter.operator === "!=") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get tasks with the specified project
            const projectTaskIds = this.taskCache.projects.get(filter.value) ||
                new Set();
            // Return tasks that don't have the project
            return new Set([...allTaskIds].filter((id) => !projectTaskIds.has(id)));
        }
        else if (filter.operator === "empty") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get all tasks with any project
            const tasksWithProject = new Set();
            for (const projectTasks of this.taskCache.projects.values()) {
                for (const taskId of projectTasks) {
                    tasksWithProject.add(taskId);
                }
            }
            // Return tasks without a project
            return new Set([...allTaskIds].filter((id) => !tasksWithProject.has(id)));
        }
        return new Set();
    }
    /**
     * Filter tasks by context
     */
    filterByContext(filter) {
        if (filter.operator === "=") {
            return (this.taskCache.contexts.get(filter.value) || new Set());
        }
        else if (filter.operator === "!=") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get tasks with the specified context
            const contextTaskIds = this.taskCache.contexts.get(filter.value) ||
                new Set();
            // Return tasks that don't have the context
            return new Set([...allTaskIds].filter((id) => !contextTaskIds.has(id)));
        }
        else if (filter.operator === "empty") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get all tasks with any context
            const tasksWithContext = new Set();
            for (const contextTasks of this.taskCache.contexts.values()) {
                for (const taskId of contextTasks) {
                    tasksWithContext.add(taskId);
                }
            }
            // Return tasks without a context
            return new Set([...allTaskIds].filter((id) => !tasksWithContext.has(id)));
        }
        return new Set();
    }
    /**
     * Filter tasks by status (completed or not)
     */
    filterByStatus(filter) {
        if (filter.operator === "=") {
            return (this.taskCache.completed.get(filter.value) ||
                new Set());
        }
        return new Set();
    }
    /**
     * Filter tasks by priority
     */
    filterByPriority(filter) {
        if (filter.operator === "=") {
            return (this.taskCache.priority.get(filter.value) || new Set());
        }
        else if (filter.operator === ">") {
            // Get tasks with priority higher than the specified value
            const result = new Set();
            for (const [priority, taskIds,] of this.taskCache.priority.entries()) {
                if (priority > filter.value) {
                    for (const taskId of taskIds) {
                        result.add(taskId);
                    }
                }
            }
            return result;
        }
        else if (filter.operator === "<") {
            // Get tasks with priority lower than the specified value
            const result = new Set();
            for (const [priority, taskIds,] of this.taskCache.priority.entries()) {
                if (priority < filter.value) {
                    for (const taskId of taskIds) {
                        result.add(taskId);
                    }
                }
            }
            return result;
        }
        return new Set();
    }
    /**
     * Filter tasks by due date
     */
    filterByDueDate(filter) {
        if (filter.operator === "=") {
            // Exact match on date string (YYYY-MM-DD)
            return (this.taskCache.dueDate.get(filter.value) || new Set());
        }
        else if (filter.operator === "before" ||
            filter.operator === "after") {
            // Convert value to Date if it's a string
            let compareDate;
            if (typeof filter.value === "string") {
                compareDate = new Date(filter.value);
            }
            else {
                compareDate = new Date(filter.value);
            }
            // Get all tasks with due dates
            const result = new Set();
            for (const [dateStr, taskIds] of this.taskCache.dueDate.entries()) {
                const date = new Date(dateStr);
                if ((filter.operator === "before" && date < compareDate) ||
                    (filter.operator === "after" && date > compareDate)) {
                    for (const taskId of taskIds) {
                        result.add(taskId);
                    }
                }
            }
            return result;
        }
        else if (filter.operator === "empty") {
            // Get all task IDs
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            // Get all tasks with any due date
            const tasksWithDueDate = new Set();
            for (const dueTasks of this.taskCache.dueDate.values()) {
                for (const taskId of dueTasks) {
                    tasksWithDueDate.add(taskId);
                }
            }
            // Return tasks without a due date
            return new Set([...allTaskIds].filter((id) => !tasksWithDueDate.has(id)));
        }
        return new Set();
    }
    /**
     * Filter tasks by start date
     */
    filterByStartDate(filter) {
        // Similar implementation to filterByDueDate
        if (filter.operator === "=") {
            return (this.taskCache.startDate.get(filter.value) ||
                new Set());
        }
        else if (filter.operator === "before" ||
            filter.operator === "after") {
            let compareDate;
            if (typeof filter.value === "string") {
                compareDate = new Date(filter.value);
            }
            else {
                compareDate = new Date(filter.value);
            }
            const result = new Set();
            for (const [dateStr, taskIds,] of this.taskCache.startDate.entries()) {
                const date = new Date(dateStr);
                if ((filter.operator === "before" && date < compareDate) ||
                    (filter.operator === "after" && date > compareDate)) {
                    for (const taskId of taskIds) {
                        result.add(taskId);
                    }
                }
            }
            return result;
        }
        else if (filter.operator === "empty") {
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            const tasksWithStartDate = new Set();
            for (const startTasks of this.taskCache.startDate.values()) {
                for (const taskId of startTasks) {
                    tasksWithStartDate.add(taskId);
                }
            }
            return new Set([...allTaskIds].filter((id) => !tasksWithStartDate.has(id)));
        }
        return new Set();
    }
    /**
     * Filter tasks by scheduled date
     */
    filterByScheduledDate(filter) {
        // Similar implementation to filterByDueDate
        if (filter.operator === "=") {
            return (this.taskCache.scheduledDate.get(filter.value) ||
                new Set());
        }
        else if (filter.operator === "before" ||
            filter.operator === "after") {
            let compareDate;
            if (typeof filter.value === "string") {
                compareDate = new Date(filter.value);
            }
            else {
                compareDate = new Date(filter.value);
            }
            const result = new Set();
            for (const [dateStr, taskIds,] of this.taskCache.scheduledDate.entries()) {
                const date = new Date(dateStr);
                if ((filter.operator === "before" && date < compareDate) ||
                    (filter.operator === "after" && date > compareDate)) {
                    for (const taskId of taskIds) {
                        result.add(taskId);
                    }
                }
            }
            return result;
        }
        else if (filter.operator === "empty") {
            const allTaskIds = new Set(this.taskCache.tasks.keys());
            const tasksWithScheduledDate = new Set();
            for (const scheduledTasks of this.taskCache.scheduledDate.values()) {
                for (const taskId of scheduledTasks) {
                    tasksWithScheduledDate.add(taskId);
                }
            }
            return new Set([...allTaskIds].filter((id) => !tasksWithScheduledDate.has(id)));
        }
        return new Set();
    }
    /**
     * Apply sorting to tasks
     */
    applySorting(tasks, sortBy) {
        if (sortBy.length === 0) {
            // Default sorting: priority desc, due date asc
            return [...tasks].sort((a, b) => {
                // First by priority (high to low)
                const priorityA = a.metadata.priority || 0;
                const priorityB = b.metadata.priority || 0;
                if (priorityA !== priorityB) {
                    return priorityB - priorityA;
                }
                // Then by due date (earliest first)
                const dueDateA = a.metadata.dueDate || Number.MAX_SAFE_INTEGER;
                const dueDateB = b.metadata.dueDate || Number.MAX_SAFE_INTEGER;
                return dueDateA - dueDateB;
            });
        }
        return [...tasks].sort((a, b) => {
            for (const { field, direction } of sortBy) {
                let valueA;
                let valueB;
                // Check if field is in base task or metadata
                if (field in a) {
                    valueA = a[field];
                    valueB = b[field];
                }
                else {
                    valueA = a.metadata[field];
                    valueB = b.metadata[field];
                }
                // Handle undefined values
                if (valueA === undefined && valueB === undefined) {
                    continue;
                }
                else if (valueA === undefined) {
                    return direction === "asc" ? 1 : -1;
                }
                else if (valueB === undefined) {
                    return direction === "asc" ? -1 : 1;
                }
                // Compare values
                if (valueA !== valueB) {
                    const multiplier = direction === "asc" ? 1 : -1;
                    if (typeof valueA === "string" &&
                        typeof valueB === "string") {
                        return valueA.localeCompare(valueB) * multiplier;
                    }
                    else if (typeof valueA === "number" &&
                        typeof valueB === "number") {
                        return (valueA - valueB) * multiplier;
                    }
                    else if (valueA instanceof Date &&
                        valueB instanceof Date) {
                        return ((valueA.getTime() - valueB.getTime()) * multiplier);
                    }
                    else {
                        // Convert to string and compare as fallback
                        return (String(valueA).localeCompare(String(valueB)) *
                            multiplier);
                    }
                }
            }
            return 0;
        });
    }
    /**
     * Get task by ID
     */
    getTaskById(id) {
        return this.taskCache.tasks.get(id);
    }
    /**
     * Remove a single task by ID
     */
    removeTask(id) {
        const task = this.taskCache.tasks.get(id);
        if (!task)
            return;
        // Remove from all indexes
        this.removeTaskFromIndexes(task);
        // Remove from main task map
        this.taskCache.tasks.delete(id);
        // Remove from file index if it's the only task in that file
        const fileTasks = this.taskCache.files.get(task.filePath);
        if (fileTasks) {
            fileTasks.delete(id);
            if (fileTasks.size === 0) {
                this.taskCache.files.delete(task.filePath);
            }
        }
    }
    /**
     * Create a new task - Not implemented (handled by external components)
     */
    createTask(taskData) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Task creation should be handled by external components");
        });
    }
    /**
     * Update an existing task - Not implemented (handled by external components)
     */
    updateTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Task updates should be handled by external components");
        });
    }
    /**
     * Delete a task - Not implemented (handled by external components)
     */
    deleteTask(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Task deletion should be handled by external components");
        });
    }
    /**
     * Reset the cache to empty
     */
    resetCache() {
        this.taskCache = this.initEmptyCache();
    }
    /**
     * Check if a file has changed since last processing
     */
    isFileChanged(filePath, currentMtime) {
        const lastMtime = this.taskCache.fileMtimes.get(filePath);
        return lastMtime === undefined || lastMtime < currentMtime;
    }
    /**
     * Get the last known modification time for a file
     */
    getFileLastMtime(filePath) {
        return this.taskCache.fileMtimes.get(filePath);
    }
    /**
     * Update the modification time for a file
     */
    updateFileMtime(filePath, mtime) {
        // Ensure Map objects exist before using them
        if (!this.taskCache.fileMtimes) {
            this.taskCache.fileMtimes = new Map();
        }
        if (!this.taskCache.fileProcessedTimes) {
            this.taskCache.fileProcessedTimes = new Map();
        }
        this.taskCache.fileMtimes.set(filePath, mtime);
        this.taskCache.fileProcessedTimes.set(filePath, Date.now());
    }
    /**
     * Check if we have valid cache for a file
     */
    hasValidCache(filePath, currentMtime) {
        // Check if file has tasks in cache
        const hasTasksInCache = this.taskCache.files.has(filePath);
        // Check if file hasn't changed
        const hasNotChanged = !this.isFileChanged(filePath, currentMtime);
        return hasTasksInCache && hasNotChanged;
    }
    /**
     * Clean up cache for a specific file
     */
    cleanupFileCache(filePath) {
        // Remove from file mtime cache
        this.taskCache.fileMtimes.delete(filePath);
        this.taskCache.fileProcessedTimes.delete(filePath);
        // Remove from other caches (handled by existing removeFileFromIndex)
        this.removeFileFromIndex(filePath);
    }
    /**
     * Validate cache consistency and fix any issues
     */
    validateCacheConsistency() {
        // Check for files in mtime cache but not in file index
        for (const filePath of this.taskCache.fileMtimes.keys()) {
            if (!this.taskCache.files.has(filePath)) {
                this.taskCache.fileMtimes.delete(filePath);
                this.taskCache.fileProcessedTimes.delete(filePath);
            }
        }
        // Check for files in file index but not in mtime cache
        for (const filePath of this.taskCache.files.keys()) {
            if (!this.taskCache.fileMtimes.has(filePath)) {
                // This is acceptable - mtime might not be set for older cache entries
                // We don't need to remove the file from index
            }
        }
    }
    /**
     * Ensure cache structure is complete
     */
    ensureCacheStructure(cache) {
        // Ensure fileMtimes exists
        if (!cache.fileMtimes) {
            cache.fileMtimes = new Map();
        }
        // Ensure fileProcessedTimes exists
        if (!cache.fileProcessedTimes) {
            cache.fileProcessedTimes = new Map();
        }
    }
    /**
     * Set the cache from an external source (e.g. persisted cache)
     */
    setCache(cache) {
        // Ensure cache structure is complete
        this.ensureCacheStructure(cache);
        this.taskCache = cache;
        // Update lastIndexTime for all files in the cache
        for (const filePath of this.taskCache.files.keys()) {
            this.lastIndexTime.set(filePath, Date.now());
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1pbmRleGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFzay1pbmRleGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQUVILE9BQU8sRUFFTixTQUFTLEVBR1QsS0FBSyxHQUVMLE1BQU0sVUFBVSxDQUFDO0FBUWxCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRzdFOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxJQUFZO0lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQzdELENBQUMsRUFDRCxHQUFHLENBQ0gsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQzdDLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsU0FBUztJQWN6QyxZQUNTLEdBQVEsRUFDUixLQUFZLEVBQ1osYUFBNEI7UUFFcEMsS0FBSyxFQUFFLENBQUM7UUFKQSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBZjdCLGtCQUFhLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFFdkQscUNBQXFDO1FBQzdCLGVBQVUsR0FBWSxFQUFFLENBQUM7UUFDekIsc0JBQWlCLEdBQUcsS0FBSyxDQUFDO1FBY2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXZDLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FB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QUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM3QyxzRUFBc0U7Z0JBQ3RFLDhDQUE4QzthQUM5QztTQUNEO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssb0JBQW9CLENBQUMsS0FBZ0I7UUFDNUMsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFO1lBQ3RCLEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7U0FDN0M7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtZQUM5QixLQUFLLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7U0FDckQ7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxRQUFRLENBQUMsS0FBZ0I7UUFDL0IscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV2QixrREFBa0Q7UUFDbEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDN0M7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogSGlnaC1wZXJmb3JtYW5jZSB0YXNrIGluZGV4ZXIgaW1wbGVtZW50YXRpb25cclxuICpcclxuICogVGhpcyBpbmRleGVyIGZvY3VzZXMgc29sZWx5IG9uIGluZGV4aW5nIGFuZCBxdWVyeWluZyB0YXNrcy5cclxuICogUGFyc2luZyBpcyBoYW5kbGVkIGJ5IGV4dGVybmFsIGNvbXBvbmVudHMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0Q29tcG9uZW50LFxyXG5cdEZpbGVTdGF0cyxcclxuXHRNZXRhZGF0YUNhY2hlLFxyXG5cdFRGaWxlLFxyXG5cdFZhdWx0LFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdFNvcnRpbmdDcml0ZXJpYSxcclxuXHRUYXNrLFxyXG5cdFRhc2tDYWNoZSxcclxuXHRUYXNrRmlsdGVyLFxyXG5cdFRhc2tJbmRleGVyIGFzIFRhc2tJbmRleGVySW50ZXJmYWNlLFxyXG59IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IGlzU3VwcG9ydGVkRmlsZVdpdGhGaWx0ZXIgfSBmcm9tIFwiLi4vdXRpbHMvZmlsZS9maWxlLXR5cGUtZGV0ZWN0b3JcIjtcclxuaW1wb3J0IHsgRmlsZUZpbHRlck1hbmFnZXIgfSBmcm9tIFwiLi4vbWFuYWdlcnMvZmlsZS1maWx0ZXItbWFuYWdlclwiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdHkgdG8gZm9ybWF0IGEgZGF0ZSBmb3IgaW5kZXgga2V5cyAoWVlZWS1NTS1ERClcclxuICovXHJcbmZ1bmN0aW9uIGZvcm1hdERhdGVGb3JJbmRleChkYXRlOiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdGNvbnN0IGQgPSBuZXcgRGF0ZShkYXRlKTtcclxuXHRyZXR1cm4gYCR7ZC5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydChcclxuXHRcdDIsXHJcblx0XHRcIjBcIlxyXG5cdCl9LSR7U3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEltcGxlbWVudGF0aW9uIG9mIHRoZSB0YXNrIGluZGV4ZXIgdGhhdCBmb2N1c2VzIG9ubHkgb24gaW5kZXhpbmcgYW5kIHF1ZXJ5aW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFza0luZGV4ZXIgZXh0ZW5kcyBDb21wb25lbnQgaW1wbGVtZW50cyBUYXNrSW5kZXhlckludGVyZmFjZSB7XHJcblx0cHJpdmF0ZSB0YXNrQ2FjaGU6IFRhc2tDYWNoZTtcclxuXHRwcml2YXRlIGxhc3RJbmRleFRpbWU6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdC8vIFF1ZXVlIGZvciB0aHJvdHRsaW5nIGZpbGUgaW5kZXhpbmdcclxuXHRwcml2YXRlIGluZGV4UXVldWU6IFRGaWxlW10gPSBbXTtcclxuXHRwcml2YXRlIGlzUHJvY2Vzc2luZ1F1ZXVlID0gZmFsc2U7XHJcblxyXG5cdC8vIENhbGxiYWNrIGZvciBleHRlcm5hbCBwYXJzaW5nXHJcblx0cHJpdmF0ZSBwYXJzZUZpbGVDYWxsYmFjaz86IChmaWxlOiBURmlsZSkgPT4gUHJvbWlzZTxUYXNrW10+O1xyXG5cclxuXHQvLyBGaWxlIGZpbHRlciBtYW5hZ2VyXHJcblx0cHJpdmF0ZSBmaWxlRmlsdGVyTWFuYWdlcj86IEZpbGVGaWx0ZXJNYW5hZ2VyO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHZhdWx0OiBWYXVsdCxcclxuXHRcdHByaXZhdGUgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMudGFza0NhY2hlID0gdGhpcy5pbml0RW1wdHlDYWNoZSgpO1xyXG5cclxuXHRcdC8vIFNldHVwIGZpbGUgY2hhbmdlIGxpc3RlbmVycyBmb3IgaW5jcmVtZW50YWwgdXBkYXRlc1xyXG5cdFx0dGhpcy5zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBwYXJzaW5nIGZpbGVzXHJcblx0ICovXHJcblx0cHVibGljIHNldFBhcnNlRmlsZUNhbGxiYWNrKFxyXG5cdFx0Y2FsbGJhY2s6IChmaWxlOiBURmlsZSkgPT4gUHJvbWlzZTxUYXNrW10+XHJcblx0KTogdm9pZCB7XHJcblx0XHR0aGlzLnBhcnNlRmlsZUNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIGZpbGUgZmlsdGVyIG1hbmFnZXJcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0RmlsZUZpbHRlck1hbmFnZXIoZmlsdGVyTWFuYWdlcj86IEZpbGVGaWx0ZXJNYW5hZ2VyKTogdm9pZCB7XHJcblx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyID0gZmlsdGVyTWFuYWdlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgYW4gZW1wdHkgdGFzayBjYWNoZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaW5pdEVtcHR5Q2FjaGUoKTogVGFza0NhY2hlIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhc2tzOiBuZXcgTWFwPHN0cmluZywgVGFzaz4oKSxcclxuXHRcdFx0ZmlsZXM6IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKSxcclxuXHRcdFx0dGFnczogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRwcm9qZWN0czogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRjb250ZXh0czogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRkdWVEYXRlOiBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCksXHJcblx0XHRcdHN0YXJ0RGF0ZTogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCksXHJcblx0XHRcdGNvbXBsZXRlZDogbmV3IE1hcDxib29sZWFuLCBTZXQ8c3RyaW5nPj4oKSxcclxuXHRcdFx0cHJpb3JpdHk6IG5ldyBNYXA8bnVtYmVyLCBTZXQ8c3RyaW5nPj4oKSxcclxuXHRcdFx0Y2FuY2VsbGVkRGF0ZTogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRvbkNvbXBsZXRpb246IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKSxcclxuXHRcdFx0ZGVwZW5kc09uOiBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCksXHJcblx0XHRcdHRhc2tJZDogbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpLFxyXG5cdFx0XHRmaWxlTXRpbWVzOiBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpLFxyXG5cdFx0XHRmaWxlUHJvY2Vzc2VkVGltZXM6IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCksXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgZmlsZSBjaGFuZ2UgZXZlbnQgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXR1cEV2ZW50TGlzdGVuZXJzKCk6IHZvaWQge1xyXG5cdFx0Ly8gV2F0Y2ggZm9yIGZpbGUgbW9kaWZpY2F0aW9uc1xyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLnZhdWx0Lm9uKFwibW9kaWZ5XCIsIChmaWxlKSA9PiB7XHJcblx0XHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5jbHVkZSA9IGlzU3VwcG9ydGVkRmlsZVdpdGhGaWx0ZXIoXHJcblx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIsXHJcblx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHQvLyBSZWR1Y2UgbG9nIHNwYW06IG9ubHkgbG9nIHdoZW4gaW5jbHVkZT10cnVlIChhY3R1YWwgd29yayksXHJcblx0XHRcdFx0XHQvLyBvciByYW5kb21seSBzYW1wbGUgdGhlIGZhbHNlIGNhc2VzLlxyXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGUgfHwgTWF0aC5yYW5kb20oKSA8IDAuMSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcIltUYXNrSW5kZXhlcl0gbW9kaWZ5IGV2ZW50IGlubGluZSBmaWx0ZXJcIixcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0XHRcdFx0XHRpbmNsdWRlLFxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChpbmNsdWRlKSB0aGlzLnF1ZXVlRmlsZUZvckluZGV4aW5nKGZpbGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gV2F0Y2ggZm9yIGZpbGUgZGVsZXRpb25zXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMudmF1bHQub24oXCJkZWxldGVcIiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpbmNsdWRlID0gaXNTdXBwb3J0ZWRGaWxlV2l0aEZpbHRlcihcclxuXHRcdFx0XHRcdFx0ZmlsZSxcclxuXHRcdFx0XHRcdFx0dGhpcy5maWxlRmlsdGVyTWFuYWdlcixcclxuXHRcdFx0XHRcdFx0XCJpbmxpbmVcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tJbmRleGVyXSBkZWxldGUgZXZlbnQgaW5saW5lIGZpbHRlclwiLCB7XHJcblx0XHRcdFx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0XHRcdFx0aW5jbHVkZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGUpIHRoaXMucmVtb3ZlRmlsZUZyb21JbmRleChmaWxlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFdhdGNoIGZvciBuZXcgZmlsZXNcclxuXHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdHRoaXMudmF1bHQub24oXCJjcmVhdGVcIiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW5jbHVkZSA9IGlzU3VwcG9ydGVkRmlsZVdpdGhGaWx0ZXIoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZSxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLFxyXG5cdFx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0XCJbVGFza0luZGV4ZXJdIGNyZWF0ZSBldmVudCBpbmxpbmUgZmlsdGVyXCIsXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5jbHVkZSxcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmIChpbmNsdWRlKSB0aGlzLnF1ZXVlRmlsZUZvckluZGV4aW5nKGZpbGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXVlIGEgZmlsZSBmb3IgaW5kZXhpbmcgd2l0aCB0aHJvdHRsaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBxdWV1ZUZpbGVGb3JJbmRleGluZyhmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmluZGV4UXVldWUuc29tZSgoZikgPT4gZi5wYXRoID09PSBmaWxlLnBhdGgpKSB7XHJcblx0XHRcdHRoaXMuaW5kZXhRdWV1ZS5wdXNoKGZpbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGhpcy5pc1Byb2Nlc3NpbmdRdWV1ZSkge1xyXG5cdFx0XHR0aGlzLnByb2Nlc3NJbmRleFF1ZXVlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcm9jZXNzIHRoZSBmaWxlIGluZGV4IHF1ZXVlIHdpdGggdGhyb3R0bGluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcHJvY2Vzc0luZGV4UXVldWUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAodGhpcy5pbmRleFF1ZXVlLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmlzUHJvY2Vzc2luZ1F1ZXVlID0gZmFsc2U7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmlzUHJvY2Vzc2luZ1F1ZXVlID0gdHJ1ZTtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmluZGV4UXVldWUuc2hpZnQoKTtcclxuXHJcblx0XHRpZiAoZmlsZSAmJiB0aGlzLnBhcnNlRmlsZUNhbGxiYWNrKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBleHRlcm5hbCBwYXJzaW5nIGNhbGxiYWNrXHJcblx0XHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnBhcnNlRmlsZUNhbGxiYWNrKGZpbGUpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlSW5kZXhXaXRoVGFza3MoZmlsZS5wYXRoLCB0YXNrcyk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdGBFcnJvciBwcm9jZXNzaW5nIGZpbGUgJHtmaWxlLnBhdGh9IGluIHF1ZXVlOmAsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcm9jZXNzIG5leHQgZmlsZSBhZnRlciBhIHNtYWxsIGRlbGF5XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucHJvY2Vzc0luZGV4UXVldWUoKSwgNTApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB0aGUgdGFzayBpbmRleGVyXHJcblx0ICogTm90ZTogVGhpcyBubyBsb25nZXIgZG9lcyBhbnkgcGFyc2luZyAtIGV4dGVybmFsIGNvbXBvbmVudHMgbXVzdCBwcm92aWRlIHRhc2tzXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBTdGFydCB3aXRoIGFuIGVtcHR5IGNhY2hlXHJcblx0XHR0aGlzLnRhc2tDYWNoZSA9IHRoaXMuaW5pdEVtcHR5Q2FjaGUoKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFRhc2sgaW5kZXhlciBpbml0aWFsaXplZCB3aXRoIGVtcHR5IGNhY2hlLiBVc2UgdXBkYXRlSW5kZXhXaXRoVGFza3MgdG8gcG9wdWxhdGUuYFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY3VycmVudCB0YXNrIGNhY2hlXHJcblx0ICovXHJcblx0cHVibGljIGdldENhY2hlKCk6IFRhc2tDYWNoZSB7XHJcblx0XHQvLyBFbnN1cmUgY2FjaGUgc3RydWN0dXJlIGlzIGNvbXBsZXRlXHJcblx0XHR0aGlzLmVuc3VyZUNhY2hlU3RydWN0dXJlKHRoaXMudGFza0NhY2hlKTtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tDYWNoZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluZGV4IGFsbCBmaWxlcyBpbiB0aGUgdmF1bHRcclxuXHQgKiBUaGlzIGlzIG5vdyBhIG5vLW9wIC0gZXh0ZXJuYWwgY29tcG9uZW50cyBzaG91bGQgaGFuZGxlIHBhcnNpbmcgYW5kIGNhbGwgdXBkYXRlSW5kZXhXaXRoVGFza3NcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgaW5kZXhBbGxGaWxlcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XCJUYXNrSW5kZXhlci5pbmRleEFsbEZpbGVzIGlzIGRlcHJlY2F0ZWQuIFVzZSBleHRlcm5hbCBwYXJzaW5nIGNvbXBvbmVudHMgaW5zdGVhZC5cIlxyXG5cdFx0KTtcclxuXHRcdGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdH1cclxuXHJcblx0Ly8gLS0tLSBNaW5pbWFsIGFkYXB0ZXIgbWV0aG9kcyBleHBlY3RlZCBieSBSZXBvc2l0b3J5IC0tLS1cclxuXHRwdWJsaWMgYXN5bmMgcmVzdG9yZUZyb21TbmFwc2hvdChjYWNoZTogVGFza0NhY2hlKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLnNldENhY2hlKGNhY2hlKTtcclxuXHR9XHJcblx0cHVibGljIGFzeW5jIGdldFRvdGFsVGFza0NvdW50KCk6IFByb21pc2U8bnVtYmVyPiB7XHJcblx0XHRyZXR1cm4gdGhpcy50YXNrQ2FjaGUudGFza3Muc2l6ZTtcclxuXHR9XHJcblx0cHVibGljIGFzeW5jIGdldEFsbFRhc2tzKCk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnRhc2tDYWNoZS50YXNrcy52YWx1ZXMoKSk7XHJcblx0fVxyXG5cdHB1YmxpYyBhc3luYyBnZXRUYXNrSWRzQnlQcm9qZWN0KHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tDYWNoZS5wcm9qZWN0cy5nZXQocHJvamVjdCkgfHwgbmV3IFNldCgpO1xyXG5cdH1cclxuXHRwdWJsaWMgYXN5bmMgZ2V0VGFza0lkc0J5VGFnKHRhZzogc3RyaW5nKTogUHJvbWlzZTxTZXQ8c3RyaW5nPj4ge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFza0NhY2hlLnRhZ3MuZ2V0KHRhZykgfHwgbmV3IFNldCgpO1xyXG5cdH1cclxuXHRwdWJsaWMgYXN5bmMgZ2V0VGFza0lkc0J5Q29tcGxldGlvblN0YXR1cyhcclxuXHRcdGNvbXBsZXRlZDogYm9vbGVhblxyXG5cdCk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tDYWNoZS5jb21wbGV0ZWQuZ2V0KGNvbXBsZXRlZCkgfHwgbmV3IFNldCgpO1xyXG5cdH1cclxuXHRwdWJsaWMgYXN5bmMgZ2V0SW5kZXhTbmFwc2hvdCgpOiBQcm9taXNlPFRhc2tDYWNoZT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0Q2FjaGUoKTtcclxuXHR9XHJcblx0cHVibGljIGFzeW5jIGNsZWFySW5kZXgoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLnJlc2V0Q2FjaGUoKTtcclxuXHR9XHJcblx0cHVibGljIGFzeW5jIHJlbW92ZVRhc2tzRnJvbUZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dGhpcy5yZW1vdmVGaWxlRnJvbUluZGV4KGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluZGV4IGEgc2luZ2xlIGZpbGUgdXNpbmcgZXh0ZXJuYWwgcGFyc2luZ1xyXG5cdCAqIEBkZXByZWNhdGVkIFVzZSB1cGRhdGVJbmRleFdpdGhUYXNrcyB3aXRoIGV4dGVybmFsIHBhcnNpbmcgaW5zdGVhZFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBpbmRleEZpbGUoZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICh0aGlzLnBhcnNlRmlsZUNhbGxiYWNrKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnBhcnNlRmlsZUNhbGxiYWNrKGZpbGUpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlSW5kZXhXaXRoVGFza3MoZmlsZS5wYXRoLCB0YXNrcyk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3IgaW5kZXhpbmcgZmlsZSAke2ZpbGUucGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YE5vIHBhcnNlIGNhbGxiYWNrIHNldCBmb3IgaW5kZXhGaWxlLiBVc2Ugc2V0UGFyc2VGaWxlQ2FsbGJhY2soKSBvciB1cGRhdGVJbmRleFdpdGhUYXNrcygpIGluc3RlYWQuYFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRoZSBpbmRleCB3aXRoIHRhc2tzIHBhcnNlZCBieSBleHRlcm5hbCBjb21wb25lbnRzXHJcblx0ICogVGhpcyBpcyB0aGUgcHJpbWFyeSBtZXRob2QgZm9yIHVwZGF0aW5nIHRoZSBpbmRleFxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVJbmRleFdpdGhUYXNrcyhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZmlsZU10aW1lPzogbnVtYmVyXHJcblx0KTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgdGFza3MgZm9yIHRoaXMgZmlsZSBmaXJzdFxyXG5cdFx0dGhpcy5yZW1vdmVGaWxlRnJvbUluZGV4KGZpbGVQYXRoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY2FjaGUgd2l0aCBuZXcgdGFza3NcclxuXHRcdGNvbnN0IGZpbGVUYXNrSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XHJcblx0XHRcdC8vIFN0b3JlIHRhc2sgaW4gbWFpbiB0YXNrIG1hcFxyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZS50YXNrcy5zZXQodGFzay5pZCwgdGFzayk7XHJcblx0XHRcdGZpbGVUYXNrSWRzLmFkZCh0YXNrLmlkKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBhbGwgaW5kZXhlc1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUluZGV4TWFwcyh0YXNrKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgZmlsZSBpbmRleFxyXG5cdFx0dGhpcy50YXNrQ2FjaGUuZmlsZXMuc2V0KGZpbGVQYXRoLCBmaWxlVGFza0lkcyk7XHJcblx0XHR0aGlzLmxhc3RJbmRleFRpbWUuc2V0KGZpbGVQYXRoLCBEYXRlLm5vdygpKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgZmlsZSBtdGltZSBpZiBwcm92aWRlZFxyXG5cdFx0aWYgKGZpbGVNdGltZSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMudXBkYXRlRmlsZU10aW1lKGZpbGVQYXRoLCBmaWxlTXRpbWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGluZGV4IGZvciBhIG1vZGlmaWVkIGZpbGUgLSBqdXN0IGFuIGFsaWFzIGZvciBkZXByZWNhdGVkIGluZGV4RmlsZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyB1cGRhdGVJbmRleChmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5pbmRleEZpbGUoZmlsZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBmaWxlIGZyb20gdGhlIGluZGV4XHJcblx0ICovXHJcblxyXG5cdHByaXZhdGUgcmVtb3ZlRmlsZUZyb21JbmRleChmaWxlOiBURmlsZSB8IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSB0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIiA/IGZpbGUgOiBmaWxlLnBhdGg7XHJcblx0XHRjb25zdCB0YXNrSWRzID0gdGhpcy50YXNrQ2FjaGUuZmlsZXMuZ2V0KGZpbGVQYXRoKTtcclxuXHRcdGlmICghdGFza0lkcykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBlYWNoIHRhc2sgZnJvbSBhbGwgaW5kZXhlc1xyXG5cdFx0Zm9yIChjb25zdCB0YXNrSWQgb2YgdGFza0lkcykge1xyXG5cdFx0XHRjb25zdCB0YXNrID0gdGhpcy50YXNrQ2FjaGUudGFza3MuZ2V0KHRhc2tJZCk7XHJcblx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVUYXNrRnJvbUluZGV4ZXModGFzayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlbW92ZSBmcm9tIG1haW4gdGFzayBtYXBcclxuXHRcdFx0dGhpcy50YXNrQ2FjaGUudGFza3MuZGVsZXRlKHRhc2tJZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gZmlsZSBpbmRleFxyXG5cdFx0dGhpcy50YXNrQ2FjaGUuZmlsZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdHRoaXMubGFzdEluZGV4VGltZS5kZWxldGUoZmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGFsbCBpbmRleCBtYXBzIGZvciBhIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZUluZGV4TWFwcyh0YXNrOiBUYXNrKTogdm9pZCB7XHJcblx0XHQvLyBVcGRhdGUgY29tcGxldGVkIHN0YXR1cyBpbmRleFxyXG5cdFx0bGV0IGNvbXBsZXRlZFRhc2tzID1cclxuXHRcdFx0dGhpcy50YXNrQ2FjaGUuY29tcGxldGVkLmdldCh0YXNrLmNvbXBsZXRlZCkgfHwgbmV3IFNldCgpO1xyXG5cdFx0Y29tcGxldGVkVGFza3MuYWRkKHRhc2suaWQpO1xyXG5cdFx0dGhpcy50YXNrQ2FjaGUuY29tcGxldGVkLnNldCh0YXNrLmNvbXBsZXRlZCwgY29tcGxldGVkVGFza3MpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YWcgaW5kZXhcclxuXHRcdGZvciAoY29uc3QgdGFnIG9mIHRhc2subWV0YWRhdGEudGFncykge1xyXG5cdFx0XHRsZXQgdGFnVGFza3MgPSB0aGlzLnRhc2tDYWNoZS50YWdzLmdldCh0YWcpIHx8IG5ldyBTZXQoKTtcclxuXHRcdFx0dGFnVGFza3MuYWRkKHRhc2suaWQpO1xyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZS50YWdzLnNldCh0YWcsIHRhZ1Rhc2tzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgcHJvamVjdCBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHRsZXQgcHJvamVjdFRhc2tzID1cclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5wcm9qZWN0cy5nZXQodGFzay5tZXRhZGF0YS5wcm9qZWN0KSB8fCBuZXcgU2V0KCk7XHJcblx0XHRcdHByb2plY3RUYXNrcy5hZGQodGFzay5pZCk7XHJcblx0XHRcdHRoaXMudGFza0NhY2hlLnByb2plY3RzLnNldCh0YXNrLm1ldGFkYXRhLnByb2plY3QsIHByb2plY3RUYXNrcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbnRleHQgaW5kZXhcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmNvbnRleHQpIHtcclxuXHRcdFx0bGV0IGNvbnRleHRUYXNrcyA9XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuY29udGV4dHMuZ2V0KHRhc2subWV0YWRhdGEuY29udGV4dCkgfHwgbmV3IFNldCgpO1xyXG5cdFx0XHRjb250ZXh0VGFza3MuYWRkKHRhc2suaWQpO1xyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZS5jb250ZXh0cy5zZXQodGFzay5tZXRhZGF0YS5jb250ZXh0LCBjb250ZXh0VGFza3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBkYXRlIGluZGV4ZXNcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGZvcm1hdERhdGVGb3JJbmRleCh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRsZXQgZHVlVGFza3MgPSB0aGlzLnRhc2tDYWNoZS5kdWVEYXRlLmdldChkYXRlU3RyKSB8fCBuZXcgU2V0KCk7XHJcblx0XHRcdGR1ZVRhc2tzLmFkZCh0YXNrLmlkKTtcclxuXHRcdFx0dGhpcy50YXNrQ2FjaGUuZHVlRGF0ZS5zZXQoZGF0ZVN0ciwgZHVlVGFza3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZUZvckluZGV4KHRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdFx0bGV0IHN0YXJ0VGFza3MgPSB0aGlzLnRhc2tDYWNoZS5zdGFydERhdGUuZ2V0KGRhdGVTdHIpIHx8IG5ldyBTZXQoKTtcclxuXHRcdFx0c3RhcnRUYXNrcy5hZGQodGFzay5pZCk7XHJcblx0XHRcdHRoaXMudGFza0NhY2hlLnN0YXJ0RGF0ZS5zZXQoZGF0ZVN0ciwgc3RhcnRUYXNrcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZUZvckluZGV4KHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSk7XHJcblx0XHRcdGxldCBzY2hlZHVsZWRUYXNrcyA9XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuc2NoZWR1bGVkRGF0ZS5nZXQoZGF0ZVN0cikgfHwgbmV3IFNldCgpO1xyXG5cdFx0XHRzY2hlZHVsZWRUYXNrcy5hZGQodGFzay5pZCk7XHJcblx0XHRcdHRoaXMudGFza0NhY2hlLnNjaGVkdWxlZERhdGUuc2V0KGRhdGVTdHIsIHNjaGVkdWxlZFRhc2tzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgcHJpb3JpdHkgaW5kZXhcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0bGV0IHByaW9yaXR5VGFza3MgPVxyXG5cdFx0XHRcdHRoaXMudGFza0NhY2hlLnByaW9yaXR5LmdldCh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KSB8fFxyXG5cdFx0XHRcdG5ldyBTZXQoKTtcclxuXHRcdFx0cHJpb3JpdHlUYXNrcy5hZGQodGFzay5pZCk7XHJcblx0XHRcdHRoaXMudGFza0NhY2hlLnByaW9yaXR5LnNldCh0YXNrLm1ldGFkYXRhLnByaW9yaXR5LCBwcmlvcml0eVRhc2tzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgY2FuY2VsbGVkIGRhdGUgaW5kZXhcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGZvcm1hdERhdGVGb3JJbmRleCh0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpO1xyXG5cdFx0XHRsZXQgY2FuY2VsbGVkVGFza3MgPVxyXG5cdFx0XHRcdHRoaXMudGFza0NhY2hlLmNhbmNlbGxlZERhdGUuZ2V0KGRhdGVTdHIpIHx8IG5ldyBTZXQoKTtcclxuXHRcdFx0Y2FuY2VsbGVkVGFza3MuYWRkKHRhc2suaWQpO1xyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZS5jYW5jZWxsZWREYXRlLnNldChkYXRlU3RyLCBjYW5jZWxsZWRUYXNrcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIG9uQ29tcGxldGlvbiBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdGxldCBvbkNvbXBsZXRpb25UYXNrcyA9XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUub25Db21wbGV0aW9uLmdldCh0YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbikgfHxcclxuXHRcdFx0XHRuZXcgU2V0KCk7XHJcblx0XHRcdG9uQ29tcGxldGlvblRhc2tzLmFkZCh0YXNrLmlkKTtcclxuXHRcdFx0dGhpcy50YXNrQ2FjaGUub25Db21wbGV0aW9uLnNldChcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbixcclxuXHRcdFx0XHRvbkNvbXBsZXRpb25UYXNrc1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBkZXBlbmRzT24gaW5kZXhcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmRlcGVuZHNPbiAmJiB0YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGZvciAoY29uc3QgZGVwZW5kZW5jeSBvZiB0YXNrLm1ldGFkYXRhLmRlcGVuZHNPbikge1xyXG5cdFx0XHRcdGxldCBkZXBlbmRzT25UYXNrcyA9XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5kZXBlbmRzT24uZ2V0KGRlcGVuZGVuY3kpIHx8IG5ldyBTZXQoKTtcclxuXHRcdFx0XHRkZXBlbmRzT25UYXNrcy5hZGQodGFzay5pZCk7XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuZGVwZW5kc09uLnNldChkZXBlbmRlbmN5LCBkZXBlbmRzT25UYXNrcyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGFzayBJRCBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuaWQpIHtcclxuXHRcdFx0bGV0IHRhc2tJZFRhc2tzID1cclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS50YXNrSWQuZ2V0KHRhc2subWV0YWRhdGEuaWQpIHx8IG5ldyBTZXQoKTtcclxuXHRcdFx0dGFza0lkVGFza3MuYWRkKHRhc2suaWQpO1xyXG5cdFx0XHR0aGlzLnRhc2tDYWNoZS50YXNrSWQuc2V0KHRhc2subWV0YWRhdGEuaWQsIHRhc2tJZFRhc2tzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHRhc2sgZnJvbSBhbGwgaW5kZXhlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVtb3ZlVGFza0Zyb21JbmRleGVzKHRhc2s6IFRhc2spOiB2b2lkIHtcclxuXHRcdC8vIFJlbW92ZSBmcm9tIGNvbXBsZXRlZCBpbmRleFxyXG5cdFx0Y29uc3QgY29tcGxldGVkVGFza3MgPSB0aGlzLnRhc2tDYWNoZS5jb21wbGV0ZWQuZ2V0KHRhc2suY29tcGxldGVkKTtcclxuXHRcdGlmIChjb21wbGV0ZWRUYXNrcykge1xyXG5cdFx0XHRjb21wbGV0ZWRUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdGlmIChjb21wbGV0ZWRUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuY29tcGxldGVkLmRlbGV0ZSh0YXNrLmNvbXBsZXRlZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSB0YWcgaW5kZXhcclxuXHRcdGZvciAoY29uc3QgdGFnIG9mIHRhc2subWV0YWRhdGEudGFncykge1xyXG5cdFx0XHRjb25zdCB0YWdUYXNrcyA9IHRoaXMudGFza0NhY2hlLnRhZ3MuZ2V0KHRhZyk7XHJcblx0XHRcdGlmICh0YWdUYXNrcykge1xyXG5cdFx0XHRcdHRhZ1Rhc2tzLmRlbGV0ZSh0YXNrLmlkKTtcclxuXHRcdFx0XHRpZiAodGFnVGFza3Muc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrQ2FjaGUudGFncy5kZWxldGUodGFnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBwcm9qZWN0IGluZGV4XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5wcm9qZWN0KSB7XHJcblx0XHRcdGNvbnN0IHByb2plY3RUYXNrcyA9IHRoaXMudGFza0NhY2hlLnByb2plY3RzLmdldChcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnByb2plY3RcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHByb2plY3RUYXNrcykge1xyXG5cdFx0XHRcdHByb2plY3RUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKHByb2plY3RUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5wcm9qZWN0cy5kZWxldGUodGFzay5tZXRhZGF0YS5wcm9qZWN0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBjb250ZXh0IGluZGV4XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5jb250ZXh0KSB7XHJcblx0XHRcdGNvbnN0IGNvbnRleHRUYXNrcyA9IHRoaXMudGFza0NhY2hlLmNvbnRleHRzLmdldChcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmNvbnRleHRcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGNvbnRleHRUYXNrcykge1xyXG5cdFx0XHRcdGNvbnRleHRUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKGNvbnRleHRUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5jb250ZXh0cy5kZWxldGUodGFzay5tZXRhZGF0YS5jb250ZXh0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBkYXRlIGluZGV4ZXNcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGZvcm1hdERhdGVGb3JJbmRleCh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRjb25zdCBkdWVUYXNrcyA9IHRoaXMudGFza0NhY2hlLmR1ZURhdGUuZ2V0KGRhdGVTdHIpO1xyXG5cdFx0XHRpZiAoZHVlVGFza3MpIHtcclxuXHRcdFx0XHRkdWVUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKGR1ZVRhc2tzLnNpemUgPT09IDApIHtcclxuXHRcdFx0XHRcdHRoaXMudGFza0NhY2hlLmR1ZURhdGUuZGVsZXRlKGRhdGVTdHIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZUZvckluZGV4KHRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdFx0Y29uc3Qgc3RhcnRUYXNrcyA9IHRoaXMudGFza0NhY2hlLnN0YXJ0RGF0ZS5nZXQoZGF0ZVN0cik7XHJcblx0XHRcdGlmIChzdGFydFRhc2tzKSB7XHJcblx0XHRcdFx0c3RhcnRUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKHN0YXJ0VGFza3Muc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuc3RhcnREYXRlLmRlbGV0ZShkYXRlU3RyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBmb3JtYXREYXRlRm9ySW5kZXgodGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKTtcclxuXHRcdFx0Y29uc3Qgc2NoZWR1bGVkVGFza3MgPSB0aGlzLnRhc2tDYWNoZS5zY2hlZHVsZWREYXRlLmdldChkYXRlU3RyKTtcclxuXHRcdFx0aWYgKHNjaGVkdWxlZFRhc2tzKSB7XHJcblx0XHRcdFx0c2NoZWR1bGVkVGFza3MuZGVsZXRlKHRhc2suaWQpO1xyXG5cdFx0XHRcdGlmIChzY2hlZHVsZWRUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5zY2hlZHVsZWREYXRlLmRlbGV0ZShkYXRlU3RyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBwcmlvcml0eSBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eVRhc2tzID0gdGhpcy50YXNrQ2FjaGUucHJpb3JpdHkuZ2V0KFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHByaW9yaXR5VGFza3MpIHtcclxuXHRcdFx0XHRwcmlvcml0eVRhc2tzLmRlbGV0ZSh0YXNrLmlkKTtcclxuXHRcdFx0XHRpZiAocHJpb3JpdHlUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5wcmlvcml0eS5kZWxldGUodGFzay5tZXRhZGF0YS5wcmlvcml0eSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gY2FuY2VsbGVkIGRhdGUgaW5kZXhcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGZvcm1hdERhdGVGb3JJbmRleCh0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpO1xyXG5cdFx0XHRjb25zdCBjYW5jZWxsZWRUYXNrcyA9IHRoaXMudGFza0NhY2hlLmNhbmNlbGxlZERhdGUuZ2V0KGRhdGVTdHIpO1xyXG5cdFx0XHRpZiAoY2FuY2VsbGVkVGFza3MpIHtcclxuXHRcdFx0XHRjYW5jZWxsZWRUYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKGNhbmNlbGxlZFRhc2tzLnNpemUgPT09IDApIHtcclxuXHRcdFx0XHRcdHRoaXMudGFza0NhY2hlLmNhbmNlbGxlZERhdGUuZGVsZXRlKGRhdGVTdHIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIG9uQ29tcGxldGlvbiBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdGNvbnN0IG9uQ29tcGxldGlvblRhc2tzID0gdGhpcy50YXNrQ2FjaGUub25Db21wbGV0aW9uLmdldChcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvblxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAob25Db21wbGV0aW9uVGFza3MpIHtcclxuXHRcdFx0XHRvbkNvbXBsZXRpb25UYXNrcy5kZWxldGUodGFzay5pZCk7XHJcblx0XHRcdFx0aWYgKG9uQ29tcGxldGlvblRhc2tzLnNpemUgPT09IDApIHtcclxuXHRcdFx0XHRcdHRoaXMudGFza0NhY2hlLm9uQ29tcGxldGlvbi5kZWxldGUoXHJcblx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEub25Db21wbGV0aW9uXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIGRlcGVuZHNPbiBpbmRleFxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuZGVwZW5kc09uICYmIHRhc2subWV0YWRhdGEuZGVwZW5kc09uLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Zm9yIChjb25zdCBkZXBlbmRlbmN5IG9mIHRhc2subWV0YWRhdGEuZGVwZW5kc09uKSB7XHJcblx0XHRcdFx0Y29uc3QgZGVwZW5kc09uVGFza3MgPSB0aGlzLnRhc2tDYWNoZS5kZXBlbmRzT24uZ2V0KGRlcGVuZGVuY3kpO1xyXG5cdFx0XHRcdGlmIChkZXBlbmRzT25UYXNrcykge1xyXG5cdFx0XHRcdFx0ZGVwZW5kc09uVGFza3MuZGVsZXRlKHRhc2suaWQpO1xyXG5cdFx0XHRcdFx0aWYgKGRlcGVuZHNPblRhc2tzLnNpemUgPT09IDApIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuZGVwZW5kc09uLmRlbGV0ZShkZXBlbmRlbmN5KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSB0YXNrIElEIGluZGV4XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5pZCkge1xyXG5cdFx0XHRjb25zdCB0YXNrSWRUYXNrcyA9IHRoaXMudGFza0NhY2hlLnRhc2tJZC5nZXQodGFzay5tZXRhZGF0YS5pZCk7XHJcblx0XHRcdGlmICh0YXNrSWRUYXNrcykge1xyXG5cdFx0XHRcdHRhc2tJZFRhc2tzLmRlbGV0ZSh0YXNrLmlkKTtcclxuXHRcdFx0XHRpZiAodGFza0lkVGFza3Muc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrQ2FjaGUudGFza0lkLmRlbGV0ZSh0YXNrLm1ldGFkYXRhLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIGJhc2VkIG9uIGZpbHRlcnMgYW5kIHNvcnRpbmcgY3JpdGVyaWFcclxuXHQgKi9cclxuXHRwdWJsaWMgcXVlcnlUYXNrcyhcclxuXHRcdGZpbHRlcnM6IFRhc2tGaWx0ZXJbXSxcclxuXHRcdHNvcnRCeTogU29ydGluZ0NyaXRlcmlhW10gPSBbXVxyXG5cdCk6IFRhc2tbXSB7XHJcblx0XHRpZiAoZmlsdGVycy5sZW5ndGggPT09IDAgJiYgdGhpcy50YXNrQ2FjaGUudGFza3Muc2l6ZSA8IDEwMDApIHtcclxuXHRcdFx0Ly8gSWYgbm8gZmlsdGVycyBhbmQgc21hbGwgdGFzayBjb3VudCwganVzdCByZXR1cm4gYWxsIHRhc2tzXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tzID0gQXJyYXkuZnJvbSh0aGlzLnRhc2tDYWNoZS50YXNrcy52YWx1ZXMoKSk7XHJcblx0XHRcdHJldHVybiB0aGlzLmFwcGx5U29ydGluZyhhbGxUYXNrcywgc29ydEJ5KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdGFydCB3aXRoIGEgbnVsbCBzZXQgdG8gaW5kaWNhdGUgd2UgaGF2ZW4ndCBhcHBsaWVkIGFueSBmaWx0ZXJzIHlldFxyXG5cdFx0bGV0IHJlc3VsdFRhc2tJZHM6IFNldDxzdHJpbmc+IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdFx0Ly8gQXBwbHkgZWFjaCBmaWx0ZXJcclxuXHRcdGZvciAoY29uc3QgZmlsdGVyIG9mIGZpbHRlcnMpIHtcclxuXHRcdFx0Y29uc3QgZmlsdGVyZWRJZHMgPSB0aGlzLmFwcGx5RmlsdGVyKGZpbHRlcik7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0VGFza0lkcyA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdC8vIEZpcnN0IGZpbHRlclxyXG5cdFx0XHRcdHJlc3VsdFRhc2tJZHMgPSBmaWx0ZXJlZElkcztcclxuXHRcdFx0fSBlbHNlIGlmIChmaWx0ZXIuY29uanVuY3Rpb24gPT09IFwiT1JcIikge1xyXG5cdFx0XHRcdC8vIFVuaW9uIHNldHMgKE9SKVxyXG5cdFx0XHRcdGZpbHRlcmVkSWRzLmZvckVhY2goKGlkKSA9PiByZXN1bHRUYXNrSWRzIS5hZGQoaWQpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBJbnRlcnNlY3Rpb24gKEFORCBpcyBkZWZhdWx0KVxyXG5cdFx0XHRcdHJlc3VsdFRhc2tJZHMgPSBuZXcgU2V0KFxyXG5cdFx0XHRcdFx0Wy4uLnJlc3VsdFRhc2tJZHNdLmZpbHRlcigoaWQpID0+IGZpbHRlcmVkSWRzLmhhcyhpZCkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHdlIGhhdmUgbm8gZmlsdGVycywgaW5jbHVkZSBhbGwgdGFza3NcclxuXHRcdGlmIChyZXN1bHRUYXNrSWRzID09PSBudWxsKSB7XHJcblx0XHRcdHJlc3VsdFRhc2tJZHMgPSBuZXcgU2V0KHRoaXMudGFza0NhY2hlLnRhc2tzLmtleXMoKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29udmVydCB0byB0YXNrIGFycmF5XHJcblx0XHRjb25zdCB0YXNrcyA9IEFycmF5LmZyb20ocmVzdWx0VGFza0lkcylcclxuXHRcdFx0Lm1hcCgoaWQpID0+IHRoaXMudGFza0NhY2hlLnRhc2tzLmdldChpZCkhKVxyXG5cdFx0XHQuZmlsdGVyKCh0YXNrKSA9PiB0YXNrICE9PSB1bmRlZmluZWQpO1xyXG5cclxuXHRcdC8vIEFwcGx5IHNvcnRpbmdcclxuXHRcdHJldHVybiB0aGlzLmFwcGx5U29ydGluZyh0YXNrcywgc29ydEJ5KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IGEgZmlsdGVyIHRvIHRoZSB0YXNrIGNhY2hlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseUZpbHRlcihmaWx0ZXI6IFRhc2tGaWx0ZXIpOiBTZXQ8c3RyaW5nPiB7XHJcblx0XHRzd2l0Y2ggKGZpbHRlci50eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJ0YWdcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5maWx0ZXJCeVRhZyhmaWx0ZXIpO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmZpbHRlckJ5UHJvamVjdChmaWx0ZXIpO1xyXG5cdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmZpbHRlckJ5Q29udGV4dChmaWx0ZXIpO1xyXG5cdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsdGVyQnlTdGF0dXMoZmlsdGVyKTtcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsdGVyQnlQcmlvcml0eShmaWx0ZXIpO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmZpbHRlckJ5RHVlRGF0ZShmaWx0ZXIpO1xyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsdGVyQnlTdGFydERhdGUoZmlsdGVyKTtcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5maWx0ZXJCeVNjaGVkdWxlZERhdGUoZmlsdGVyKTtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oYFVuc3VwcG9ydGVkIGZpbHRlciB0eXBlOiAke2ZpbHRlci50eXBlfWApO1xyXG5cdFx0XHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgdGFnXHJcblx0ICovXHJcblx0cHJpdmF0ZSBmaWx0ZXJCeVRhZyhmaWx0ZXI6IFRhc2tGaWx0ZXIpOiBTZXQ8c3RyaW5nPiB7XHJcblx0XHRpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcImNvbnRhaW5zXCIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMudGFza0NhY2hlLnRhZ3MuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8IG5ldyBTZXQoKTtcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcIiE9XCIpIHtcclxuXHRcdFx0Ly8gR2V0IGFsbCB0YXNrIElEc1xyXG5cdFx0XHRjb25zdCBhbGxUYXNrSWRzID0gbmV3IFNldCh0aGlzLnRhc2tDYWNoZS50YXNrcy5rZXlzKCkpO1xyXG5cdFx0XHQvLyBHZXQgdGFza3Mgd2l0aCB0aGUgc3BlY2lmaWVkIHRhZ1xyXG5cdFx0XHRjb25zdCB0YWdUYXNrSWRzID1cclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS50YWdzLmdldChmaWx0ZXIudmFsdWUgYXMgc3RyaW5nKSB8fCBuZXcgU2V0KCk7XHJcblx0XHRcdC8vIFJldHVybiB0YXNrcyB0aGF0IGRvbid0IGhhdmUgdGhlIHRhZ1xyXG5cdFx0XHRyZXR1cm4gbmV3IFNldChbLi4uYWxsVGFza0lkc10uZmlsdGVyKChpZCkgPT4gIXRhZ1Rhc2tJZHMuaGFzKGlkKSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgcHJvamVjdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmlsdGVyQnlQcm9qZWN0KGZpbHRlcjogVGFza0ZpbHRlcik6IFNldDxzdHJpbmc+IHtcclxuXHRcdGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiPVwiKSB7XHJcblx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUucHJvamVjdHMuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8IG5ldyBTZXQoKVxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiIT1cIikge1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2sgSURzXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tJZHMgPSBuZXcgU2V0KHRoaXMudGFza0NhY2hlLnRhc2tzLmtleXMoKSk7XHJcblx0XHRcdC8vIEdldCB0YXNrcyB3aXRoIHRoZSBzcGVjaWZpZWQgcHJvamVjdFxyXG5cdFx0XHRjb25zdCBwcm9qZWN0VGFza0lkcyA9XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUucHJvamVjdHMuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8XHJcblx0XHRcdFx0bmV3IFNldCgpO1xyXG5cdFx0XHQvLyBSZXR1cm4gdGFza3MgdGhhdCBkb24ndCBoYXZlIHRoZSBwcm9qZWN0XHJcblx0XHRcdHJldHVybiBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5hbGxUYXNrSWRzXS5maWx0ZXIoKGlkKSA9PiAhcHJvamVjdFRhc2tJZHMuaGFzKGlkKSlcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcImVtcHR5XCIpIHtcclxuXHRcdFx0Ly8gR2V0IGFsbCB0YXNrIElEc1xyXG5cdFx0XHRjb25zdCBhbGxUYXNrSWRzID0gbmV3IFNldCh0aGlzLnRhc2tDYWNoZS50YXNrcy5rZXlzKCkpO1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2tzIHdpdGggYW55IHByb2plY3RcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoUHJvamVjdCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IHByb2plY3RUYXNrcyBvZiB0aGlzLnRhc2tDYWNoZS5wcm9qZWN0cy52YWx1ZXMoKSkge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHByb2plY3RUYXNrcykge1xyXG5cdFx0XHRcdFx0dGFza3NXaXRoUHJvamVjdC5hZGQodGFza0lkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gUmV0dXJuIHRhc2tzIHdpdGhvdXQgYSBwcm9qZWN0XHJcblx0XHRcdHJldHVybiBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5hbGxUYXNrSWRzXS5maWx0ZXIoKGlkKSA9PiAhdGFza3NXaXRoUHJvamVjdC5oYXMoaWQpKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgY29udGV4dFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmlsdGVyQnlDb250ZXh0KGZpbHRlcjogVGFza0ZpbHRlcik6IFNldDxzdHJpbmc+IHtcclxuXHRcdGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiPVwiKSB7XHJcblx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuY29udGV4dHMuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8IG5ldyBTZXQoKVxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiIT1cIikge1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2sgSURzXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tJZHMgPSBuZXcgU2V0KHRoaXMudGFza0NhY2hlLnRhc2tzLmtleXMoKSk7XHJcblx0XHRcdC8vIEdldCB0YXNrcyB3aXRoIHRoZSBzcGVjaWZpZWQgY29udGV4dFxyXG5cdFx0XHRjb25zdCBjb250ZXh0VGFza0lkcyA9XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuY29udGV4dHMuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8XHJcblx0XHRcdFx0bmV3IFNldCgpO1xyXG5cdFx0XHQvLyBSZXR1cm4gdGFza3MgdGhhdCBkb24ndCBoYXZlIHRoZSBjb250ZXh0XHJcblx0XHRcdHJldHVybiBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5hbGxUYXNrSWRzXS5maWx0ZXIoKGlkKSA9PiAhY29udGV4dFRhc2tJZHMuaGFzKGlkKSlcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcImVtcHR5XCIpIHtcclxuXHRcdFx0Ly8gR2V0IGFsbCB0YXNrIElEc1xyXG5cdFx0XHRjb25zdCBhbGxUYXNrSWRzID0gbmV3IFNldCh0aGlzLnRhc2tDYWNoZS50YXNrcy5rZXlzKCkpO1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2tzIHdpdGggYW55IGNvbnRleHRcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoQ29udGV4dCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IGNvbnRleHRUYXNrcyBvZiB0aGlzLnRhc2tDYWNoZS5jb250ZXh0cy52YWx1ZXMoKSkge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIGNvbnRleHRUYXNrcykge1xyXG5cdFx0XHRcdFx0dGFza3NXaXRoQ29udGV4dC5hZGQodGFza0lkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gUmV0dXJuIHRhc2tzIHdpdGhvdXQgYSBjb250ZXh0XHJcblx0XHRcdHJldHVybiBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5hbGxUYXNrSWRzXS5maWx0ZXIoKGlkKSA9PiAhdGFza3NXaXRoQ29udGV4dC5oYXMoaWQpKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgc3RhdHVzIChjb21wbGV0ZWQgb3Igbm90KVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmlsdGVyQnlTdGF0dXMoZmlsdGVyOiBUYXNrRmlsdGVyKTogU2V0PHN0cmluZz4ge1xyXG5cdFx0aWYgKGZpbHRlci5vcGVyYXRvciA9PT0gXCI9XCIpIHtcclxuXHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5jb21wbGV0ZWQuZ2V0KGZpbHRlci52YWx1ZSBhcyBib29sZWFuKSB8fFxyXG5cdFx0XHRcdG5ldyBTZXQoKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgcHJpb3JpdHlcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbHRlckJ5UHJpb3JpdHkoZmlsdGVyOiBUYXNrRmlsdGVyKTogU2V0PHN0cmluZz4ge1xyXG5cdFx0aWYgKGZpbHRlci5vcGVyYXRvciA9PT0gXCI9XCIpIHtcclxuXHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5wcmlvcml0eS5nZXQoZmlsdGVyLnZhbHVlIGFzIG51bWJlcikgfHwgbmV3IFNldCgpXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKGZpbHRlci5vcGVyYXRvciA9PT0gXCI+XCIpIHtcclxuXHRcdFx0Ly8gR2V0IHRhc2tzIHdpdGggcHJpb3JpdHkgaGlnaGVyIHRoYW4gdGhlIHNwZWNpZmllZCB2YWx1ZVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0Zm9yIChjb25zdCBbXHJcblx0XHRcdFx0cHJpb3JpdHksXHJcblx0XHRcdFx0dGFza0lkcyxcclxuXHRcdFx0XSBvZiB0aGlzLnRhc2tDYWNoZS5wcmlvcml0eS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0XHRpZiAocHJpb3JpdHkgPiAoZmlsdGVyLnZhbHVlIGFzIG51bWJlcikpIHtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LmFkZCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiPFwiKSB7XHJcblx0XHRcdC8vIEdldCB0YXNrcyB3aXRoIHByaW9yaXR5IGxvd2VyIHRoYW4gdGhlIHNwZWNpZmllZCB2YWx1ZVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0Zm9yIChjb25zdCBbXHJcblx0XHRcdFx0cHJpb3JpdHksXHJcblx0XHRcdFx0dGFza0lkcyxcclxuXHRcdFx0XSBvZiB0aGlzLnRhc2tDYWNoZS5wcmlvcml0eS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0XHRpZiAocHJpb3JpdHkgPCAoZmlsdGVyLnZhbHVlIGFzIG51bWJlcikpIHtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LmFkZCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgU2V0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgdGFza3MgYnkgZHVlIGRhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbHRlckJ5RHVlRGF0ZShmaWx0ZXI6IFRhc2tGaWx0ZXIpOiBTZXQ8c3RyaW5nPiB7XHJcblx0XHRpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcIj1cIikge1xyXG5cdFx0XHQvLyBFeGFjdCBtYXRjaCBvbiBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcclxuXHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5kdWVEYXRlLmdldChmaWx0ZXIudmFsdWUgYXMgc3RyaW5nKSB8fCBuZXcgU2V0KClcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdGZpbHRlci5vcGVyYXRvciA9PT0gXCJiZWZvcmVcIiB8fFxyXG5cdFx0XHRmaWx0ZXIub3BlcmF0b3IgPT09IFwiYWZ0ZXJcIlxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIENvbnZlcnQgdmFsdWUgdG8gRGF0ZSBpZiBpdCdzIGEgc3RyaW5nXHJcblx0XHRcdGxldCBjb21wYXJlRGF0ZTogRGF0ZTtcclxuXHRcdFx0aWYgKHR5cGVvZiBmaWx0ZXIudmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb21wYXJlRGF0ZSA9IG5ldyBEYXRlKGZpbHRlci52YWx1ZSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29tcGFyZURhdGUgPSBuZXcgRGF0ZShmaWx0ZXIudmFsdWUgYXMgbnVtYmVyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IGFsbCB0YXNrcyB3aXRoIGR1ZSBkYXRlc1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0Zm9yIChjb25zdCBbZGF0ZVN0ciwgdGFza0lkc10gb2YgdGhpcy50YXNrQ2FjaGUuZHVlRGF0ZS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcblxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdChmaWx0ZXIub3BlcmF0b3IgPT09IFwiYmVmb3JlXCIgJiYgZGF0ZSA8IGNvbXBhcmVEYXRlKSB8fFxyXG5cdFx0XHRcdFx0KGZpbHRlci5vcGVyYXRvciA9PT0gXCJhZnRlclwiICYmIGRhdGUgPiBjb21wYXJlRGF0ZSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LmFkZCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiZW1wdHlcIikge1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2sgSURzXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tJZHMgPSBuZXcgU2V0KHRoaXMudGFza0NhY2hlLnRhc2tzLmtleXMoKSk7XHJcblx0XHRcdC8vIEdldCBhbGwgdGFza3Mgd2l0aCBhbnkgZHVlIGRhdGVcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoRHVlRGF0ZSA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IGR1ZVRhc2tzIG9mIHRoaXMudGFza0NhY2hlLmR1ZURhdGUudmFsdWVzKCkpIHtcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiBkdWVUYXNrcykge1xyXG5cdFx0XHRcdFx0dGFza3NXaXRoRHVlRGF0ZS5hZGQodGFza0lkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gUmV0dXJuIHRhc2tzIHdpdGhvdXQgYSBkdWUgZGF0ZVxyXG5cdFx0XHRyZXR1cm4gbmV3IFNldChcclxuXHRcdFx0XHRbLi4uYWxsVGFza0lkc10uZmlsdGVyKChpZCkgPT4gIXRhc2tzV2l0aER1ZURhdGUuaGFzKGlkKSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbmV3IFNldCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmlsdGVyIHRhc2tzIGJ5IHN0YXJ0IGRhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbHRlckJ5U3RhcnREYXRlKGZpbHRlcjogVGFza0ZpbHRlcik6IFNldDxzdHJpbmc+IHtcclxuXHRcdC8vIFNpbWlsYXIgaW1wbGVtZW50YXRpb24gdG8gZmlsdGVyQnlEdWVEYXRlXHJcblx0XHRpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcIj1cIikge1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdHRoaXMudGFza0NhY2hlLnN0YXJ0RGF0ZS5nZXQoZmlsdGVyLnZhbHVlIGFzIHN0cmluZykgfHxcclxuXHRcdFx0XHRuZXcgU2V0KClcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdGZpbHRlci5vcGVyYXRvciA9PT0gXCJiZWZvcmVcIiB8fFxyXG5cdFx0XHRmaWx0ZXIub3BlcmF0b3IgPT09IFwiYWZ0ZXJcIlxyXG5cdFx0KSB7XHJcblx0XHRcdGxldCBjb21wYXJlRGF0ZTogRGF0ZTtcclxuXHRcdFx0aWYgKHR5cGVvZiBmaWx0ZXIudmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb21wYXJlRGF0ZSA9IG5ldyBEYXRlKGZpbHRlci52YWx1ZSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29tcGFyZURhdGUgPSBuZXcgRGF0ZShmaWx0ZXIudmFsdWUgYXMgbnVtYmVyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdGZvciAoY29uc3QgW1xyXG5cdFx0XHRcdGRhdGVTdHIsXHJcblx0XHRcdFx0dGFza0lkcyxcclxuXHRcdFx0XSBvZiB0aGlzLnRhc2tDYWNoZS5zdGFydERhdGUuZW50cmllcygpKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIpO1xyXG5cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHQoZmlsdGVyLm9wZXJhdG9yID09PSBcImJlZm9yZVwiICYmIGRhdGUgPCBjb21wYXJlRGF0ZSkgfHxcclxuXHRcdFx0XHRcdChmaWx0ZXIub3BlcmF0b3IgPT09IFwiYWZ0ZXJcIiAmJiBkYXRlID4gY29tcGFyZURhdGUpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiB0YXNrSWRzKSB7XHJcblx0XHRcdFx0XHRcdHJlc3VsdC5hZGQodGFza0lkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcImVtcHR5XCIpIHtcclxuXHRcdFx0Y29uc3QgYWxsVGFza0lkcyA9IG5ldyBTZXQodGhpcy50YXNrQ2FjaGUudGFza3Mua2V5cygpKTtcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoU3RhcnREYXRlID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdGZvciAoY29uc3Qgc3RhcnRUYXNrcyBvZiB0aGlzLnRhc2tDYWNoZS5zdGFydERhdGUudmFsdWVzKCkpIHtcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiBzdGFydFRhc2tzKSB7XHJcblx0XHRcdFx0XHR0YXNrc1dpdGhTdGFydERhdGUuYWRkKHRhc2tJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuZXcgU2V0KFxyXG5cdFx0XHRcdFsuLi5hbGxUYXNrSWRzXS5maWx0ZXIoKGlkKSA9PiAhdGFza3NXaXRoU3RhcnREYXRlLmhhcyhpZCkpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBTZXQoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpbHRlciB0YXNrcyBieSBzY2hlZHVsZWQgZGF0ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmlsdGVyQnlTY2hlZHVsZWREYXRlKGZpbHRlcjogVGFza0ZpbHRlcik6IFNldDxzdHJpbmc+IHtcclxuXHRcdC8vIFNpbWlsYXIgaW1wbGVtZW50YXRpb24gdG8gZmlsdGVyQnlEdWVEYXRlXHJcblx0XHRpZiAoZmlsdGVyLm9wZXJhdG9yID09PSBcIj1cIikge1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdHRoaXMudGFza0NhY2hlLnNjaGVkdWxlZERhdGUuZ2V0KGZpbHRlci52YWx1ZSBhcyBzdHJpbmcpIHx8XHJcblx0XHRcdFx0bmV3IFNldCgpXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRmaWx0ZXIub3BlcmF0b3IgPT09IFwiYmVmb3JlXCIgfHxcclxuXHRcdFx0ZmlsdGVyLm9wZXJhdG9yID09PSBcImFmdGVyXCJcclxuXHRcdCkge1xyXG5cdFx0XHRsZXQgY29tcGFyZURhdGU6IERhdGU7XHJcblx0XHRcdGlmICh0eXBlb2YgZmlsdGVyLnZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0Y29tcGFyZURhdGUgPSBuZXcgRGF0ZShmaWx0ZXIudmFsdWUpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbXBhcmVEYXRlID0gbmV3IERhdGUoZmlsdGVyLnZhbHVlIGFzIG51bWJlcik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IFtcclxuXHRcdFx0XHRkYXRlU3RyLFxyXG5cdFx0XHRcdHRhc2tJZHMsXHJcblx0XHRcdF0gb2YgdGhpcy50YXNrQ2FjaGUuc2NoZWR1bGVkRGF0ZS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcblxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdChmaWx0ZXIub3BlcmF0b3IgPT09IFwiYmVmb3JlXCIgJiYgZGF0ZSA8IGNvbXBhcmVEYXRlKSB8fFxyXG5cdFx0XHRcdFx0KGZpbHRlci5vcGVyYXRvciA9PT0gXCJhZnRlclwiICYmIGRhdGUgPiBjb21wYXJlRGF0ZSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LmFkZCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXIub3BlcmF0b3IgPT09IFwiZW1wdHlcIikge1xyXG5cdFx0XHRjb25zdCBhbGxUYXNrSWRzID0gbmV3IFNldCh0aGlzLnRhc2tDYWNoZS50YXNrcy5rZXlzKCkpO1xyXG5cdFx0XHRjb25zdCB0YXNrc1dpdGhTY2hlZHVsZWREYXRlID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdGZvciAoY29uc3Qgc2NoZWR1bGVkVGFza3Mgb2YgdGhpcy50YXNrQ2FjaGUuc2NoZWR1bGVkRGF0ZS52YWx1ZXMoKSkge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIHNjaGVkdWxlZFRhc2tzKSB7XHJcblx0XHRcdFx0XHR0YXNrc1dpdGhTY2hlZHVsZWREYXRlLmFkZCh0YXNrSWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbmV3IFNldChcclxuXHRcdFx0XHRbLi4uYWxsVGFza0lkc10uZmlsdGVyKChpZCkgPT4gIXRhc2tzV2l0aFNjaGVkdWxlZERhdGUuaGFzKGlkKSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbmV3IFNldCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXBwbHkgc29ydGluZyB0byB0YXNrc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXBwbHlTb3J0aW5nKHRhc2tzOiBUYXNrW10sIHNvcnRCeTogU29ydGluZ0NyaXRlcmlhW10pOiBUYXNrW10ge1xyXG5cdFx0aWYgKHNvcnRCeS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Ly8gRGVmYXVsdCBzb3J0aW5nOiBwcmlvcml0eSBkZXNjLCBkdWUgZGF0ZSBhc2NcclxuXHRcdFx0cmV0dXJuIFsuLi50YXNrc10uc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIEZpcnN0IGJ5IHByaW9yaXR5IChoaWdoIHRvIGxvdylcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUEgPSBhLm1ldGFkYXRhLnByaW9yaXR5IHx8IDA7XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlCID0gYi5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRcdGlmIChwcmlvcml0eUEgIT09IHByaW9yaXR5Qikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByaW9yaXR5QiAtIHByaW9yaXR5QTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFRoZW4gYnkgZHVlIGRhdGUgKGVhcmxpZXN0IGZpcnN0KVxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVBID0gYS5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVCID0gYi5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdHJldHVybiBkdWVEYXRlQSAtIGR1ZURhdGVCO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gWy4uLnRhc2tzXS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdGZvciAoY29uc3QgeyBmaWVsZCwgZGlyZWN0aW9uIH0gb2Ygc29ydEJ5KSB7XHJcblx0XHRcdFx0bGV0IHZhbHVlQTogYW55O1xyXG5cdFx0XHRcdGxldCB2YWx1ZUI6IGFueTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgZmllbGQgaXMgaW4gYmFzZSB0YXNrIG9yIG1ldGFkYXRhXHJcblx0XHRcdFx0aWYgKGZpZWxkIGluIGEpIHtcclxuXHRcdFx0XHRcdHZhbHVlQSA9IChhIGFzIGFueSlbZmllbGRdO1xyXG5cdFx0XHRcdFx0dmFsdWVCID0gKGIgYXMgYW55KVtmaWVsZF07XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHZhbHVlQSA9IChhLm1ldGFkYXRhIGFzIGFueSlbZmllbGRdO1xyXG5cdFx0XHRcdFx0dmFsdWVCID0gKGIubWV0YWRhdGEgYXMgYW55KVtmaWVsZF07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBIYW5kbGUgdW5kZWZpbmVkIHZhbHVlc1xyXG5cdFx0XHRcdGlmICh2YWx1ZUEgPT09IHVuZGVmaW5lZCAmJiB2YWx1ZUIgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZUEgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGRpcmVjdGlvbiA9PT0gXCJhc2NcIiA/IDEgOiAtMTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHZhbHVlQiA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZGlyZWN0aW9uID09PSBcImFzY1wiID8gLTEgOiAxO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ29tcGFyZSB2YWx1ZXNcclxuXHRcdFx0XHRpZiAodmFsdWVBICE9PSB2YWx1ZUIpIHtcclxuXHRcdFx0XHRcdGNvbnN0IG11bHRpcGxpZXIgPSBkaXJlY3Rpb24gPT09IFwiYXNjXCIgPyAxIDogLTE7XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHR0eXBlb2YgdmFsdWVBID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdFx0XHRcdHR5cGVvZiB2YWx1ZUIgPT09IFwic3RyaW5nXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWVBLmxvY2FsZUNvbXBhcmUodmFsdWVCKSAqIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdFx0XHR0eXBlb2YgdmFsdWVBID09PSBcIm51bWJlclwiICYmXHJcblx0XHRcdFx0XHRcdHR5cGVvZiB2YWx1ZUIgPT09IFwibnVtYmVyXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gKHZhbHVlQSAtIHZhbHVlQikgKiBtdWx0aXBsaWVyO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdFx0dmFsdWVBIGluc3RhbmNlb2YgRGF0ZSAmJlxyXG5cdFx0XHRcdFx0XHR2YWx1ZUIgaW5zdGFuY2VvZiBEYXRlXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0XHQodmFsdWVBLmdldFRpbWUoKSAtIHZhbHVlQi5nZXRUaW1lKCkpICogbXVsdGlwbGllclxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gQ29udmVydCB0byBzdHJpbmcgYW5kIGNvbXBhcmUgYXMgZmFsbGJhY2tcclxuXHRcdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0XHRTdHJpbmcodmFsdWVBKS5sb2NhbGVDb21wYXJlKFN0cmluZyh2YWx1ZUIpKSAqXHJcblx0XHRcdFx0XHRcdFx0bXVsdGlwbGllclxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIDA7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXNrIGJ5IElEXHJcblx0ICovXHJcblx0cHVibGljIGdldFRhc2tCeUlkKGlkOiBzdHJpbmcpOiBUYXNrIHwgdW5kZWZpbmVkIHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tDYWNoZS50YXNrcy5nZXQoaWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgc2luZ2xlIHRhc2sgYnkgSURcclxuXHQgKi9cclxuXHRwdWJsaWMgcmVtb3ZlVGFzayhpZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCB0YXNrID0gdGhpcy50YXNrQ2FjaGUudGFza3MuZ2V0KGlkKTtcclxuXHRcdGlmICghdGFzaykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIGFsbCBpbmRleGVzXHJcblx0XHR0aGlzLnJlbW92ZVRhc2tGcm9tSW5kZXhlcyh0YXNrKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBtYWluIHRhc2sgbWFwXHJcblx0XHR0aGlzLnRhc2tDYWNoZS50YXNrcy5kZWxldGUoaWQpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIGZpbGUgaW5kZXggaWYgaXQncyB0aGUgb25seSB0YXNrIGluIHRoYXQgZmlsZVxyXG5cdFx0Y29uc3QgZmlsZVRhc2tzID0gdGhpcy50YXNrQ2FjaGUuZmlsZXMuZ2V0KHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0aWYgKGZpbGVUYXNrcykge1xyXG5cdFx0XHRmaWxlVGFza3MuZGVsZXRlKGlkKTtcclxuXHRcdFx0aWYgKGZpbGVUYXNrcy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrQ2FjaGUuZmlsZXMuZGVsZXRlKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBuZXcgdGFzayAtIE5vdCBpbXBsZW1lbnRlZCAoaGFuZGxlZCBieSBleHRlcm5hbCBjb21wb25lbnRzKVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBjcmVhdGVUYXNrKHRhc2tEYXRhOiBQYXJ0aWFsPFRhc2s+KTogUHJvbWlzZTxUYXNrPiB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXHJcblx0XHRcdFwiVGFzayBjcmVhdGlvbiBzaG91bGQgYmUgaGFuZGxlZCBieSBleHRlcm5hbCBjb21wb25lbnRzXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYW4gZXhpc3RpbmcgdGFzayAtIE5vdCBpbXBsZW1lbnRlZCAoaGFuZGxlZCBieSBleHRlcm5hbCBjb21wb25lbnRzKVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyB1cGRhdGVUYXNrKHRhc2s6IFRhc2spOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcclxuXHRcdFx0XCJUYXNrIHVwZGF0ZXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgZXh0ZXJuYWwgY29tcG9uZW50c1wiXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGVsZXRlIGEgdGFzayAtIE5vdCBpbXBsZW1lbnRlZCAoaGFuZGxlZCBieSBleHRlcm5hbCBjb21wb25lbnRzKVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBkZWxldGVUYXNrKHRhc2tJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXHJcblx0XHRcdFwiVGFzayBkZWxldGlvbiBzaG91bGQgYmUgaGFuZGxlZCBieSBleHRlcm5hbCBjb21wb25lbnRzXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXNldCB0aGUgY2FjaGUgdG8gZW1wdHlcclxuXHQgKi9cclxuXHRwdWJsaWMgcmVzZXRDYWNoZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMudGFza0NhY2hlID0gdGhpcy5pbml0RW1wdHlDYWNoZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBmaWxlIGhhcyBjaGFuZ2VkIHNpbmNlIGxhc3QgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBpc0ZpbGVDaGFuZ2VkKGZpbGVQYXRoOiBzdHJpbmcsIGN1cnJlbnRNdGltZTogbnVtYmVyKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBsYXN0TXRpbWUgPSB0aGlzLnRhc2tDYWNoZS5maWxlTXRpbWVzLmdldChmaWxlUGF0aCk7XHJcblx0XHRyZXR1cm4gbGFzdE10aW1lID09PSB1bmRlZmluZWQgfHwgbGFzdE10aW1lIDwgY3VycmVudE10aW1lO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBsYXN0IGtub3duIG1vZGlmaWNhdGlvbiB0aW1lIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0RmlsZUxhc3RNdGltZShmaWxlUGF0aDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tDYWNoZS5maWxlTXRpbWVzLmdldChmaWxlUGF0aCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGhlIG1vZGlmaWNhdGlvbiB0aW1lIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlRmlsZU10aW1lKGZpbGVQYXRoOiBzdHJpbmcsIG10aW1lOiBudW1iZXIpOiB2b2lkIHtcclxuXHRcdC8vIEVuc3VyZSBNYXAgb2JqZWN0cyBleGlzdCBiZWZvcmUgdXNpbmcgdGhlbVxyXG5cdFx0aWYgKCF0aGlzLnRhc2tDYWNoZS5maWxlTXRpbWVzKSB7XHJcblx0XHRcdHRoaXMudGFza0NhY2hlLmZpbGVNdGltZXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCF0aGlzLnRhc2tDYWNoZS5maWxlUHJvY2Vzc2VkVGltZXMpIHtcclxuXHRcdFx0dGhpcy50YXNrQ2FjaGUuZmlsZVByb2Nlc3NlZFRpbWVzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnRhc2tDYWNoZS5maWxlTXRpbWVzLnNldChmaWxlUGF0aCwgbXRpbWUpO1xyXG5cdFx0dGhpcy50YXNrQ2FjaGUuZmlsZVByb2Nlc3NlZFRpbWVzLnNldChmaWxlUGF0aCwgRGF0ZS5ub3coKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB3ZSBoYXZlIHZhbGlkIGNhY2hlIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRwdWJsaWMgaGFzVmFsaWRDYWNoZShmaWxlUGF0aDogc3RyaW5nLCBjdXJyZW50TXRpbWU6IG51bWJlcik6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgZmlsZSBoYXMgdGFza3MgaW4gY2FjaGVcclxuXHRcdGNvbnN0IGhhc1Rhc2tzSW5DYWNoZSA9IHRoaXMudGFza0NhY2hlLmZpbGVzLmhhcyhmaWxlUGF0aCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZmlsZSBoYXNuJ3QgY2hhbmdlZFxyXG5cdFx0Y29uc3QgaGFzTm90Q2hhbmdlZCA9ICF0aGlzLmlzRmlsZUNoYW5nZWQoZmlsZVBhdGgsIGN1cnJlbnRNdGltZSk7XHJcblxyXG5cdFx0cmV0dXJuIGhhc1Rhc2tzSW5DYWNoZSAmJiBoYXNOb3RDaGFuZ2VkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgY2FjaGUgZm9yIGEgc3BlY2lmaWMgZmlsZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBjbGVhbnVwRmlsZUNhY2hlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdC8vIFJlbW92ZSBmcm9tIGZpbGUgbXRpbWUgY2FjaGVcclxuXHRcdHRoaXMudGFza0NhY2hlLmZpbGVNdGltZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdHRoaXMudGFza0NhY2hlLmZpbGVQcm9jZXNzZWRUaW1lcy5kZWxldGUoZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBmcm9tIG90aGVyIGNhY2hlcyAoaGFuZGxlZCBieSBleGlzdGluZyByZW1vdmVGaWxlRnJvbUluZGV4KVxyXG5cdFx0dGhpcy5yZW1vdmVGaWxlRnJvbUluZGV4KGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIGNhY2hlIGNvbnNpc3RlbmN5IGFuZCBmaXggYW55IGlzc3Vlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyB2YWxpZGF0ZUNhY2hlQ29uc2lzdGVuY3koKTogdm9pZCB7XHJcblx0XHQvLyBDaGVjayBmb3IgZmlsZXMgaW4gbXRpbWUgY2FjaGUgYnV0IG5vdCBpbiBmaWxlIGluZGV4XHJcblx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIHRoaXMudGFza0NhY2hlLmZpbGVNdGltZXMua2V5cygpKSB7XHJcblx0XHRcdGlmICghdGhpcy50YXNrQ2FjaGUuZmlsZXMuaGFzKGZpbGVQYXRoKSkge1xyXG5cdFx0XHRcdHRoaXMudGFza0NhY2hlLmZpbGVNdGltZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0XHR0aGlzLnRhc2tDYWNoZS5maWxlUHJvY2Vzc2VkVGltZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGZvciBmaWxlcyBpbiBmaWxlIGluZGV4IGJ1dCBub3QgaW4gbXRpbWUgY2FjaGVcclxuXHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgdGhpcy50YXNrQ2FjaGUuZmlsZXMua2V5cygpKSB7XHJcblx0XHRcdGlmICghdGhpcy50YXNrQ2FjaGUuZmlsZU10aW1lcy5oYXMoZmlsZVBhdGgpKSB7XHJcblx0XHRcdFx0Ly8gVGhpcyBpcyBhY2NlcHRhYmxlIC0gbXRpbWUgbWlnaHQgbm90IGJlIHNldCBmb3Igb2xkZXIgY2FjaGUgZW50cmllc1xyXG5cdFx0XHRcdC8vIFdlIGRvbid0IG5lZWQgdG8gcmVtb3ZlIHRoZSBmaWxlIGZyb20gaW5kZXhcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW5zdXJlIGNhY2hlIHN0cnVjdHVyZSBpcyBjb21wbGV0ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZW5zdXJlQ2FjaGVTdHJ1Y3R1cmUoY2FjaGU6IFRhc2tDYWNoZSk6IHZvaWQge1xyXG5cdFx0Ly8gRW5zdXJlIGZpbGVNdGltZXMgZXhpc3RzXHJcblx0XHRpZiAoIWNhY2hlLmZpbGVNdGltZXMpIHtcclxuXHRcdFx0Y2FjaGUuZmlsZU10aW1lcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRW5zdXJlIGZpbGVQcm9jZXNzZWRUaW1lcyBleGlzdHNcclxuXHRcdGlmICghY2FjaGUuZmlsZVByb2Nlc3NlZFRpbWVzKSB7XHJcblx0XHRcdGNhY2hlLmZpbGVQcm9jZXNzZWRUaW1lcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIGNhY2hlIGZyb20gYW4gZXh0ZXJuYWwgc291cmNlIChlLmcuIHBlcnNpc3RlZCBjYWNoZSlcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0Q2FjaGUoY2FjaGU6IFRhc2tDYWNoZSk6IHZvaWQge1xyXG5cdFx0Ly8gRW5zdXJlIGNhY2hlIHN0cnVjdHVyZSBpcyBjb21wbGV0ZVxyXG5cdFx0dGhpcy5lbnN1cmVDYWNoZVN0cnVjdHVyZShjYWNoZSk7XHJcblxyXG5cdFx0dGhpcy50YXNrQ2FjaGUgPSBjYWNoZTtcclxuXHJcblx0XHQvLyBVcGRhdGUgbGFzdEluZGV4VGltZSBmb3IgYWxsIGZpbGVzIGluIHRoZSBjYWNoZVxyXG5cdFx0Zm9yIChjb25zdCBmaWxlUGF0aCBvZiB0aGlzLnRhc2tDYWNoZS5maWxlcy5rZXlzKCkpIHtcclxuXHRcdFx0dGhpcy5sYXN0SW5kZXhUaW1lLnNldChmaWxlUGF0aCwgRGF0ZS5ub3coKSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==