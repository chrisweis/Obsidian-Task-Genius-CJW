/**
 * Manager for task indexing web workers
 */
import { __awaiter } from "tslib";
import { Component, } from "obsidian";
import { FileMetadataTaskParser } from "../../parsers/file-metadata-parser";
// Import worker and utilities
// @ts-ignore Ignore type error for worker import
import TaskWorker from "./TaskIndex.worker";
import { deferred } from "./deferred-promise";
// Using similar queue structure as importer.ts
import { Queue } from "@datastructures-js/queue";
/**
 * Default worker pool options
 */
export const DEFAULT_WORKER_OPTIONS = {
    maxWorkers: 1,
    cpuUtilization: 0.75,
    debug: false,
    settings: {
        preferMetadataFormat: "tasks",
        useDailyNotePathAsDate: false,
        dailyNoteFormat: "yyyy-MM-dd",
        useAsDateType: "due",
        dailyNotePath: "",
        ignoreHeading: "",
        focusHeading: "",
        fileParsingConfig: undefined,
        fileMetadataInheritance: undefined,
    },
};
/**
 * Task priority levels
 */
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["HIGH"] = 0] = "HIGH";
    TaskPriority[TaskPriority["NORMAL"] = 1] = "NORMAL";
    TaskPriority[TaskPriority["LOW"] = 2] = "LOW";
})(TaskPriority || (TaskPriority = {}));
/**
 * Worker pool for task processing
 */
export class TaskWorkerManager extends Component {
    /**
     * Create a new worker pool
     */
    constructor(vault, metadataCache, options = {}) {
        super();
        /** Worker pool */
        this.workers = new Map();
        /** Prioritized task queues */
        this.queues = [
            new Queue(),
            new Queue(),
            new Queue(), // 低优先级队列
        ];
        /** Map of outstanding tasks by file path */
        this.outstanding = new Map();
        /** Whether the pool is currently active */
        this.active = true;
        /** Next worker ID to assign */
        this.nextWorkerId = 0;
        /** Tracking progress for large operations */
        this.processedFiles = 0;
        this.totalFilesToProcess = 0;
        /** Whether we're currently processing a large batch */
        this.isProcessingBatch = false;
        /** Maximum number of retry attempts for a task */
        this.maxRetries = 2;
        /** Whether workers have been initialized to prevent multiple initialization */
        this.initialized = false;
        /** Performance statistics */
        this.stats = {
            filesSkipped: 0,
            filesProcessed: 0,
            cacheHitRatio: 0,
        };
        this.options = Object.assign(Object.assign({}, DEFAULT_WORKER_OPTIONS), options);
        this.vault = vault;
        this.metadataCache = metadataCache;
        // Initialize workers up to max
        this.initializeWorkers();
    }
    /**
     * Set file parsing configuration
     */
    setFileParsingConfig(config, projectDetectionMethods) {
        if (config.enableFileMetadataParsing ||
            config.enableTagBasedTaskParsing) {
            this.fileMetadataParser = new FileMetadataTaskParser(config, projectDetectionMethods);
        }
        else {
            this.fileMetadataParser = undefined;
        }
        // Update worker options to include file parsing config
        if (this.options.settings) {
            this.options.settings.fileParsingConfig = config;
        }
        else {
            this.options.settings = {
                preferMetadataFormat: "tasks",
                useDailyNotePathAsDate: false,
                dailyNoteFormat: "yyyy-MM-dd",
                useAsDateType: "due",
                dailyNotePath: "",
                ignoreHeading: "",
                focusHeading: "",
                fileParsingConfig: config,
                fileMetadataInheritance: undefined,
            };
        }
    }
    /**
     * Initialize workers in the pool
     */
    initializeWorkers() {
        // Prevent multiple initialization
        if (this.initialized) {
            this.log("Workers already initialized, skipping initialization");
            return;
        }
        // Ensure any existing workers are cleaned up first
        if (this.workers.size > 0) {
            this.log("Cleaning up existing workers before re-initialization");
            this.cleanupWorkers();
        }
        const workerCount = Math.min(this.options.maxWorkers, navigator.hardwareConcurrency || 2);
        for (let i = 0; i < workerCount; i++) {
            try {
                const worker = this.newWorker();
                this.workers.set(worker.id, worker);
                this.log(`Initialized worker #${worker.id}`);
            }
            catch (error) {
                console.error("Failed to initialize worker:", error);
            }
        }
        this.initialized = true;
        this.log(`Initialized ${this.workers.size} workers (requested ${workerCount})`);
        // Check if we have any workers
        if (this.workers.size === 0) {
            console.warn("No workers could be initialized, falling back to main thread processing");
        }
    }
    /**
     * Create a new worker
     */
    newWorker() {
        const worker = {
            id: this.nextWorkerId++,
            worker: new TaskWorker(),
            availableAt: Date.now(),
        };
        worker.worker.onmessage = (evt) => {
            this.finish(worker, evt.data).catch((error) => {
                console.error("Error in finish handler:", error);
                // Handle the error by rejecting the active promise if it exists
                if (worker.active) {
                    const [file, promise] = worker.active;
                    promise.reject(error);
                    worker.active = undefined;
                    this.outstanding.delete(file.path);
                    this.schedule();
                }
            });
        };
        worker.worker.onerror = (event) => {
            console.error("Worker error:", event);
            // If there's an active task, retry or reject it
            if (worker.active) {
                const [file, promise, retries, priority] = worker.active;
                if (retries < this.maxRetries) {
                    // Retry the task
                    this.log(`Retrying task for ${file.path} (attempt ${retries + 1})`);
                    this.queueTaskWithPriority(file, promise, priority, retries + 1);
                }
                else {
                    // Max retries reached, reject the promise
                    promise.reject("Worker error after max retries");
                }
                worker.active = undefined;
                this.schedule();
            }
        };
        return worker;
    }
    /**
     * Set the task indexer reference for cache checking
     */
    setTaskIndexer(taskIndexer) {
        this.taskIndexer = taskIndexer;
    }
    /**
     * Update cache hit ratio statistics
     */
    updateCacheHitRatio() {
        const totalFiles = this.stats.filesSkipped + this.stats.filesProcessed;
        this.stats.cacheHitRatio =
            totalFiles > 0 ? this.stats.filesSkipped / totalFiles : 0;
    }
    /**
     * Get performance statistics
     */
    getStats() {
        return Object.assign({}, this.stats);
    }
    /**
     * Check if a file should be processed (not in valid cache)
     */
    shouldProcessFile(file) {
        var _a, _b;
        if (!this.taskIndexer) {
            return true; // No indexer, always process
        }
        // Check if mtime optimization is enabled
        if (!((_b = (_a = this.options.settings) === null || _a === void 0 ? void 0 : _a.fileParsingConfig) === null || _b === void 0 ? void 0 : _b.enableMtimeOptimization)) {
            return true; // Optimization disabled, always process
        }
        return !this.taskIndexer.hasValidCache(file.path, file.stat.mtime);
    }
    /**
     * Get cached tasks for a file if available
     */
    getCachedTasksForFile(filePath) {
        if (!this.taskIndexer) {
            return null;
        }
        const taskIds = this.taskIndexer.getCache().files.get(filePath);
        if (!taskIds) {
            return null;
        }
        const tasks = [];
        const taskCache = this.taskIndexer.getCache().tasks;
        for (const taskId of taskIds) {
            const task = taskCache.get(taskId);
            if (task) {
                tasks.push(task);
            }
        }
        return tasks.length > 0 ? tasks : null;
    }
    /**
     * Process a single file for tasks
     */
    processFile(file, priority = TaskPriority.NORMAL) {
        // De-bounce repeated requests for the same file
        let existing = this.outstanding.get(file.path);
        if (existing)
            return existing;
        // Check if we can use cached results
        if (!this.shouldProcessFile(file)) {
            const cachedTasks = this.getCachedTasksForFile(file.path);
            if (cachedTasks) {
                this.stats.filesSkipped++;
                this.updateCacheHitRatio();
                this.log(`Using cached tasks for ${file.path} (${cachedTasks.length} tasks)`);
                return Promise.resolve(cachedTasks);
            }
        }
        let promise = deferred();
        this.outstanding.set(file.path, promise);
        this.queueTaskWithPriority(file, promise, priority);
        return promise;
    }
    /**
     * Queue a task with specified priority
     */
    queueTaskWithPriority(file, promise, priority, retries = 0) {
        this.queues[priority].enqueue({
            file,
            promise,
            priority,
        });
        // If this is the first retry, schedule immediately
        if (retries === 0) {
            this.schedule();
        }
    }
    /**
     * Process multiple files in a batch
     */
    processBatch(files, priority = TaskPriority.HIGH) {
        return __awaiter(this, void 0, void 0, function* () {
            if (files.length === 0) {
                return new Map();
            }
            // Pre-filter files: separate cached from uncached
            const filesToProcess = [];
            const resultMap = new Map();
            let cachedCount = 0;
            for (const file of files) {
                if (!this.shouldProcessFile(file)) {
                    const cachedTasks = this.getCachedTasksForFile(file.path);
                    if (cachedTasks) {
                        resultMap.set(file.path, cachedTasks);
                        cachedCount++;
                        continue;
                    }
                }
                filesToProcess.push(file);
            }
            this.log(`Batch processing: ${cachedCount} files from cache, ${filesToProcess.length} files to process (cache hit ratio: ${cachedCount > 0
                ? ((cachedCount / files.length) * 100).toFixed(1)
                : 0}%)`);
            if (filesToProcess.length === 0) {
                return resultMap; // All files were cached
            }
            this.isProcessingBatch = true;
            this.processedFiles = 0;
            this.totalFilesToProcess = filesToProcess.length;
            this.log(`Processing batch of ${filesToProcess.length} files (${cachedCount} cached)`);
            try {
                // 将文件分成更小的批次，避免一次性提交太多任务
                const batchSize = 10;
                // 限制并发处理的文件数
                const concurrencyLimit = Math.min(this.options.maxWorkers * 2, 5);
                // 使用一个简单的信号量来控制并发
                let activePromises = 0;
                const processingQueue = [];
                // 辅助函数，处理队列中的下一个任务
                const processNext = () => __awaiter(this, void 0, void 0, function* () {
                    if (processingQueue.length === 0)
                        return;
                    if (activePromises < concurrencyLimit) {
                        activePromises++;
                        const nextTask = processingQueue.shift();
                        if (nextTask) {
                            try {
                                yield nextTask();
                            }
                            catch (error) {
                                console.error("Error processing batch task:", error);
                            }
                            finally {
                                activePromises--;
                                // 继续处理队列
                                yield processNext();
                            }
                        }
                    }
                });
                for (let i = 0; i < filesToProcess.length; i += batchSize) {
                    const subBatch = filesToProcess.slice(i, i + batchSize);
                    // 为子批次创建处理任务并添加到队列
                    processingQueue.push(() => __awaiter(this, void 0, void 0, function* () {
                        // 为每个文件创建Promise
                        const subBatchPromises = subBatch.map((file) => __awaiter(this, void 0, void 0, function* () {
                            try {
                                const tasks = yield this.processFile(file, priority);
                                resultMap.set(file.path, tasks);
                                return { file, tasks };
                            }
                            catch (error) {
                                console.error(`Error processing file ${file.path}:`, error);
                                return { file, tasks: [] };
                            }
                        }));
                        // 等待所有子批次文件处理完成
                        const results = yield Promise.all(subBatchPromises);
                        // 更新进度
                        this.processedFiles += results.length;
                        const progress = Math.round((this.processedFiles / this.totalFilesToProcess) * 100);
                        if (progress % 10 === 0 ||
                            this.processedFiles === this.totalFilesToProcess) {
                            this.log(`Batch progress: ${progress}% (${this.processedFiles}/${this.totalFilesToProcess})`);
                        }
                    }));
                    // 启动处理队列
                    processNext();
                }
                // 等待所有队列中的任务完成
                while (activePromises > 0 || processingQueue.length > 0) {
                    yield new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            catch (error) {
                console.error("Error during batch processing:", error);
            }
            finally {
                this.isProcessingBatch = false;
                this.log(`Completed batch processing of ${files.length} files (${cachedCount} from cache, ${filesToProcess.length} processed)`);
            }
            return resultMap;
        });
    }
    /**
     * Safely serialize CachedMetadata for worker transfer
     * Removes non-serializable objects like functions and circular references
     */
    serializeCachedMetadata(fileCache) {
        if (!fileCache)
            return undefined;
        try {
            // Create a safe copy with only serializable properties
            const safeCopy = {};
            // Copy basic properties that are typically safe to serialize
            const safeProperties = [
                "frontmatter",
                "tags",
                "headings",
                "sections",
                "listItems",
                "links",
                "embeds",
                "blocks",
            ];
            for (const prop of safeProperties) {
                if (fileCache[prop] !== undefined) {
                    // Deep clone to avoid any potential circular references
                    safeCopy[prop] = JSON.parse(JSON.stringify(fileCache[prop]));
                }
            }
            return safeCopy;
        }
        catch (error) {
            console.warn("Failed to serialize CachedMetadata, using fallback:", error);
            // Fallback: only include frontmatter which is most commonly needed
            return {
                frontmatter: fileCache.frontmatter
                    ? JSON.parse(JSON.stringify(fileCache.frontmatter))
                    : undefined,
            };
        }
    }
    /**
     * Get task metadata from the file and Obsidian cache
     */
    getTaskMetadata(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get file content
            const content = yield this.vault.cachedRead(file);
            // Get file metadata from Obsidian cache
            const fileCache = this.metadataCache.getFileCache(file);
            return {
                listItems: fileCache === null || fileCache === void 0 ? void 0 : fileCache.listItems,
                content,
                stats: {
                    ctime: file.stat.ctime,
                    mtime: file.stat.mtime,
                    size: file.stat.size,
                },
            };
        });
    }
    /**
     * Execute next task from the queue
     */
    schedule() {
        if (!this.active)
            return;
        // 检查所有队列，按优先级从高到低获取任务
        let queueItem;
        for (let priority = 0; priority < this.queues.length; priority++) {
            if (!this.queues[priority].isEmpty()) {
                queueItem = this.queues[priority].dequeue();
                break;
            }
        }
        if (!queueItem)
            return; // 所有队列都为空
        const worker = this.availableWorker();
        if (!worker) {
            // 没有可用的工作线程，将任务重新入队
            this.queues[queueItem.priority].enqueue(queueItem);
            return;
        }
        const { file, promise, priority } = queueItem;
        worker.active = [file, promise, 0, priority]; // 0 表示重试次数
        try {
            this.getTaskMetadata(file)
                .then((metadata) => {
                const command = {
                    type: "parseTasks",
                    filePath: file.path,
                    content: metadata.content,
                    fileExtension: file.extension,
                    stats: metadata.stats,
                    metadata: {
                        listItems: metadata.listItems || [],
                        fileCache: this.serializeCachedMetadata(this.metadataCache.getFileCache(file)),
                    },
                    settings: this.options.settings || {
                        preferMetadataFormat: "tasks",
                        useDailyNotePathAsDate: false,
                        dailyNoteFormat: "yyyy-MM-dd",
                        useAsDateType: "due",
                        dailyNotePath: "",
                        ignoreHeading: "",
                        focusHeading: "",
                        fileParsingConfig: undefined,
                        fileMetadataInheritance: undefined,
                    },
                };
                worker.worker.postMessage(command);
            })
                .catch((error) => {
                console.error(`Error reading file ${file.path}:`, error);
                promise.reject(error);
                worker.active = undefined;
                // 移除未完成的任务
                this.outstanding.delete(file.path);
                // 处理下一个任务
                this.schedule();
            });
        }
        catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
            promise.reject(error);
            worker.active = undefined;
            // 移除未完成的任务
            this.outstanding.delete(file.path);
            // 处理下一个任务
            this.schedule();
        }
    }
    /**
     * Handle worker completion and process result
     */
    finish(worker, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!worker.active) {
                console.log("Received a stale worker message. Ignoring.", data);
                return;
            }
            const [file, promise, retries, priority] = worker.active;
            // Resolve or reject the promise based on result
            if (data.type === "error") {
                // 错误处理 - 如果没有超过重试次数，重试
                const errorResult = data;
                if (retries < this.maxRetries) {
                    this.log(`Retrying task for ${file.path} due to error: ${errorResult.error}`);
                    this.queueTaskWithPriority(file, promise, priority, retries + 1);
                }
                else {
                    promise.reject(new Error(errorResult.error));
                    this.outstanding.delete(file.path);
                }
            }
            else if (data.type === "parseResult") {
                const parseResult = data;
                // Combine worker tasks with file metadata tasks
                let allTasks = [...parseResult.tasks];
                if (this.fileMetadataParser) {
                    try {
                        const fileCache = this.metadataCache.getFileCache(file);
                        const fileContent = yield this.vault.cachedRead(file);
                        const fileMetadataResult = this.fileMetadataParser.parseFileForTasks(file.path, fileContent, fileCache || undefined);
                        // Add file metadata tasks to the result
                        allTasks.push(...fileMetadataResult.tasks);
                        // Log any errors from file metadata parsing
                        if (fileMetadataResult.errors.length > 0) {
                            console.warn(`File metadata parsing errors for ${file.path}:`, fileMetadataResult.errors);
                        }
                    }
                    catch (error) {
                        console.error(`Error in file metadata parsing for ${file.path}:`, error);
                    }
                }
                promise.resolve(allTasks);
                this.outstanding.delete(file.path);
                // Update statistics
                this.stats.filesProcessed++;
                this.updateCacheHitRatio();
            }
            else if (data.type === "batchResult") {
                // For batch results, we handle differently as we don't have tasks directly
                promise.reject(new Error("Batch results should be handled by processBatch"));
                this.outstanding.delete(file.path);
            }
            else {
                promise.reject(new Error(`Unexpected result type: ${data.type}`));
                this.outstanding.delete(file.path);
            }
            // Check if we should remove this worker (if we're over capacity)
            if (this.workers.size > this.options.maxWorkers) {
                this.workers.delete(worker.id);
                this.terminate(worker);
            }
            else {
                // Calculate delay based on CPU utilization target
                const now = Date.now();
                const processingTime = worker.active ? now - worker.availableAt : 0;
                const throttle = Math.max(0.1, this.options.cpuUtilization) - 1.0;
                const delay = Math.max(0, processingTime * throttle);
                worker.active = undefined;
                if (delay <= 0) {
                    worker.availableAt = now;
                    this.schedule();
                }
                else {
                    worker.availableAt = now + delay;
                    setTimeout(() => this.schedule(), delay);
                }
            }
        });
    }
    /**
     * Get an available worker
     */
    availableWorker() {
        const now = Date.now();
        // Find a worker that's not busy and is available
        for (const worker of this.workers.values()) {
            if (!worker.active && worker.availableAt <= now) {
                return worker;
            }
        }
        // Create a new worker if we haven't reached capacity
        if (this.workers.size < this.options.maxWorkers) {
            const worker = this.newWorker();
            this.workers.set(worker.id, worker);
            return worker;
        }
        return undefined;
    }
    /**
     * Terminate a worker
     */
    terminate(worker) {
        worker.worker.terminate();
        if (worker.active) {
            worker.active[1].reject("Terminated");
            worker.active = undefined;
        }
        this.log(`Terminated worker #${worker.id}`);
    }
    /**
     * Clean up existing workers without affecting the active state
     */
    cleanupWorkers() {
        // Terminate all workers
        for (const worker of this.workers.values()) {
            this.terminate(worker);
        }
        this.workers.clear();
        // Clear all remaining queued tasks and reject their promises
        for (const queue of this.queues) {
            while (!queue.isEmpty()) {
                const queueItem = queue.dequeue();
                if (queueItem) {
                    queueItem.promise.reject("Workers being reinitialized");
                    this.outstanding.delete(queueItem.file.path);
                }
            }
        }
        this.log("Cleaned up existing workers");
    }
    /**
     * Reset throttling for all workers
     */
    unthrottle() {
        const now = Date.now();
        for (const worker of this.workers.values()) {
            worker.availableAt = now;
        }
        this.schedule();
    }
    /**
     * Shutdown the worker pool
     */
    onunload() {
        this.active = false;
        // Terminate all workers
        for (const worker of this.workers.values()) {
            this.terminate(worker);
            this.workers.delete(worker.id);
        }
        // Clear all remaining queued tasks and reject their promises
        for (const queue of this.queues) {
            while (!queue.isEmpty()) {
                const queueItem = queue.dequeue();
                if (queueItem) {
                    queueItem.promise.reject("Terminated");
                    this.outstanding.delete(queueItem.file.path);
                }
            }
        }
        // Reset initialization flag to allow re-initialization if needed
        this.initialized = false;
        this.log("Worker pool shut down");
    }
    /**
     * Get the number of pending tasks
     */
    getPendingTaskCount() {
        return this.queues.reduce((total, queue) => total + queue.size(), 0);
    }
    /**
     * Get the current batch processing progress
     */
    getBatchProgress() {
        return {
            current: this.processedFiles,
            total: this.totalFilesToProcess,
            percentage: this.totalFilesToProcess > 0
                ? Math.round((this.processedFiles / this.totalFilesToProcess) *
                    100)
                : 0,
        };
    }
    /**
     * @deprecated Project data is now handled by Augmentor in main thread per dataflow architecture.
     * Workers only perform raw task extraction without project enhancement.
     */
    setEnhancedProjectData(enhancedProjectData) {
        // NO-OP: Project data is handled by Augmentor, not Workers
        // This method is kept for backward compatibility but does nothing
    }
    /**
     * Update worker settings dynamically
     */
    updateSettings(settings) {
        // Update the settings
        if (this.options.settings) {
            Object.assign(this.options.settings, settings);
        }
    }
    /**
     * Check if the worker pool is currently processing a batch
     */
    isProcessingBatchTask() {
        return this.isProcessingBatch;
    }
    /**
     * Log a message if debugging is enabled
     */
    log(message) {
        if (this.options.debug) {
            console.log(`[TaskWorkerManager] ${message}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1dvcmtlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrV29ya2VyTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRzs7QUFFSCxPQUFPLEVBRU4sU0FBUyxHQUtULE1BQU0sVUFBVSxDQUFDO0FBU2xCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBTTVFLDhCQUE4QjtBQUM5QixpREFBaUQ7QUFDakQsT0FBTyxVQUFVLE1BQU0sb0JBQW9CLENBQUM7QUFDNUMsT0FBTyxFQUFZLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXhELCtDQUErQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFnQ2pEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQXNCO0lBQ3hELFVBQVUsRUFBRSxDQUFDO0lBQ2IsY0FBYyxFQUFFLElBQUk7SUFDcEIsS0FBSyxFQUFFLEtBQUs7SUFDWixRQUFRLEVBQUU7UUFDVCxvQkFBb0IsRUFBRSxPQUFPO1FBQzdCLHNCQUFzQixFQUFFLEtBQUs7UUFDN0IsZUFBZSxFQUFFLFlBQVk7UUFDN0IsYUFBYSxFQUFFLEtBQUs7UUFDcEIsYUFBYSxFQUFFLEVBQUU7UUFDakIsYUFBYSxFQUFFLEVBQUU7UUFDakIsWUFBWSxFQUFFLEVBQUU7UUFDaEIsaUJBQWlCLEVBQUUsU0FBUztRQUM1Qix1QkFBdUIsRUFBRSxTQUFTO0tBQ2xDO0NBQ0QsQ0FBQztBQUVGOztHQUVHO0FBQ0gsSUFBSyxZQUlKO0FBSkQsV0FBSyxZQUFZO0lBQ2hCLCtDQUFRLENBQUE7SUFDUixtREFBVSxDQUFBO0lBQ1YsNkNBQU8sQ0FBQTtBQUNSLENBQUMsRUFKSSxZQUFZLEtBQVosWUFBWSxRQUloQjtBQTJDRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxTQUFTO0lBeUMvQzs7T0FFRztJQUNILFlBQ0Ms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QUNOLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYztZQUM1QixLQUFLLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtZQUMvQixVQUFVLEVBQ1QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUNYLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUM7b0JBQ2hELEdBQUcsQ0FDSDtnQkFDRCxDQUFDLENBQUMsQ0FBQztTQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksc0JBQXNCLENBQzVCLG1CQUF3QztRQUV4QywyREFBMkQ7UUFDM0Qsa0VBQWtFO0lBQ25FLENBQUM7SUFFRDs7T0FFRztJQUNJLGNBQWMsQ0FDcEIsUUFVRTtRQUVGLHNCQUFzQjtRQUN0QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQzFCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDL0M7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssR0FBRyxDQUFDLE9BQWU7UUFDMUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixPQUFPLEVBQUUsQ0FBQyxDQUFDO1NBQzlDO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE1hbmFnZXIgZm9yIHRhc2sgaW5kZXhpbmcgd2ViIHdvcmtlcnNcclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdENhY2hlZE1ldGFkYXRhLFxyXG5cdENvbXBvbmVudCxcclxuXHRMaXN0SXRlbUNhY2hlLFxyXG5cdE1ldGFkYXRhQ2FjaGUsXHJcblx0VEZpbGUsXHJcblx0VmF1bHQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQge1xyXG5cdEVuaGFuY2VkUHJvamVjdERhdGEsXHJcblx0RXJyb3JSZXN1bHQsXHJcblx0SW5kZXhlclJlc3VsdCxcclxuXHRQYXJzZVRhc2tzQ29tbWFuZCxcclxuXHRUYXNrUGFyc2VSZXN1bHQsXHJcbn0gZnJvbSBcIi4vdGFzay1pbmRleC1tZXNzYWdlXCI7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVRhc2tQYXJzZXIgfSBmcm9tIFwiLi4vLi4vcGFyc2Vycy9maWxlLW1ldGFkYXRhLXBhcnNlclwiO1xyXG5pbXBvcnQge1xyXG5cdEZpbGVQYXJzaW5nQ29uZmlndXJhdGlvbixcclxuXHRGaWxlTWV0YWRhdGFJbmhlcml0YW5jZUNvbmZpZyxcclxufSBmcm9tIFwiLi4vLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLy8gSW1wb3J0IHdvcmtlciBhbmQgdXRpbGl0aWVzXHJcbi8vIEB0cy1pZ25vcmUgSWdub3JlIHR5cGUgZXJyb3IgZm9yIHdvcmtlciBpbXBvcnRcclxuaW1wb3J0IFRhc2tXb3JrZXIgZnJvbSBcIi4vVGFza0luZGV4LndvcmtlclwiO1xyXG5pbXBvcnQgeyBEZWZlcnJlZCwgZGVmZXJyZWQgfSBmcm9tIFwiLi9kZWZlcnJlZC1wcm9taXNlXCI7XHJcblxyXG4vLyBVc2luZyBzaW1pbGFyIHF1ZXVlIHN0cnVjdHVyZSBhcyBpbXBvcnRlci50c1xyXG5pbXBvcnQgeyBRdWV1ZSB9IGZyb20gXCJAZGF0YXN0cnVjdHVyZXMtanMvcXVldWVcIjtcclxuXHJcbi8qKlxyXG4gKiBPcHRpb25zIGZvciB3b3JrZXIgcG9vbFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBXb3JrZXJQb29sT3B0aW9ucyB7XHJcblx0LyoqIE1heGltdW0gbnVtYmVyIG9mIHdvcmtlcnMgdG8gdXNlICovXHJcblx0bWF4V29ya2VyczogbnVtYmVyO1xyXG5cdC8qKiBUYXJnZXQgQ1BVIHV0aWxpemF0aW9uICgwLjEgdG8gMS4wKSAqL1xyXG5cdGNwdVV0aWxpemF0aW9uOiBudW1iZXI7XHJcblx0LyoqIFdoZXRoZXIgdG8gZW5hYmxlIGRlYnVnIGxvZ2dpbmcgKi9cclxuXHRkZWJ1Zz86IGJvb2xlYW47XHJcblx0LyoqIFNldHRpbmdzIGZvciB0aGUgdGFzayBpbmRleGVyICovXHJcblx0c2V0dGluZ3M/OiB7XHJcblx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJkYXRhdmlld1wiIHwgXCJ0YXNrc1wiO1xyXG5cdFx0dXNlRGFpbHlOb3RlUGF0aEFzRGF0ZTogYm9vbGVhbjtcclxuXHRcdGRhaWx5Tm90ZUZvcm1hdDogc3RyaW5nO1xyXG5cdFx0dXNlQXNEYXRlVHlwZTogXCJkdWVcIiB8IFwic3RhcnRcIiB8IFwic2NoZWR1bGVkXCI7XHJcblx0XHRkYWlseU5vdGVQYXRoOiBzdHJpbmc7XHJcblx0XHRpZ25vcmVIZWFkaW5nOiBzdHJpbmc7XHJcblx0XHRmb2N1c0hlYWRpbmc6IHN0cmluZztcclxuXHRcdGZpbGVQYXJzaW5nQ29uZmlnPzogRmlsZVBhcnNpbmdDb25maWd1cmF0aW9uO1xyXG5cdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U/OiBGaWxlTWV0YWRhdGFJbmhlcml0YW5jZUNvbmZpZztcclxuXHRcdGVuYWJsZUN1c3RvbURhdGVGb3JtYXRzPzogYm9vbGVhbjtcclxuXHRcdGN1c3RvbURhdGVGb3JtYXRzPzogc3RyaW5nW107XHJcblx0XHQvLyBUYWcgcHJlZml4IGNvbmZpZ3VyYXRpb25zIChvcHRpb25hbClcclxuXHRcdHByb2plY3RUYWdQcmVmaXg/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG5cdFx0Y29udGV4dFRhZ1ByZWZpeD86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcblx0XHRhcmVhVGFnUHJlZml4PzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogRGVmYXVsdCB3b3JrZXIgcG9vbCBvcHRpb25zXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9XT1JLRVJfT1BUSU9OUzogV29ya2VyUG9vbE9wdGlvbnMgPSB7XHJcblx0bWF4V29ya2VyczogMSwgLy8gUmVkdWNlZCBmcm9tIDIgdG8gMSB0byBtaW5pbWl6ZSB0b3RhbCB3b3JrZXIgY291bnRcclxuXHRjcHVVdGlsaXphdGlvbjogMC43NSxcclxuXHRkZWJ1ZzogZmFsc2UsXHJcblx0c2V0dGluZ3M6IHtcclxuXHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsXHJcblx0XHR1c2VEYWlseU5vdGVQYXRoQXNEYXRlOiBmYWxzZSxcclxuXHRcdGRhaWx5Tm90ZUZvcm1hdDogXCJ5eXl5LU1NLWRkXCIsXHJcblx0XHR1c2VBc0RhdGVUeXBlOiBcImR1ZVwiLFxyXG5cdFx0ZGFpbHlOb3RlUGF0aDogXCJcIixcclxuXHRcdGlnbm9yZUhlYWRpbmc6IFwiXCIsXHJcblx0XHRmb2N1c0hlYWRpbmc6IFwiXCIsXHJcblx0XHRmaWxlUGFyc2luZ0NvbmZpZzogdW5kZWZpbmVkLFxyXG5cdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHVuZGVmaW5lZCxcclxuXHR9LFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRhc2sgcHJpb3JpdHkgbGV2ZWxzXHJcbiAqL1xyXG5lbnVtIFRhc2tQcmlvcml0eSB7XHJcblx0SElHSCA9IDAsIC8vIOmrmOS8mOWFiOe6pyAtIOeUqOS6juWIneWni+WMluWSjOeUqOaIt+S6pOS6kuS7u+WKoVxyXG5cdE5PUk1BTCA9IDEsIC8vIOaZrumAmuS8mOWFiOe6pyAtIOeUqOS6juagh+WHhueahOaWh+S7tue0ouW8leabtOaWsFxyXG5cdExPVyA9IDIsIC8vIOS9juS8mOWFiOe6pyAtIOeUqOS6juaJuemHj+WQjuWPsOS7u+WKoVxyXG59XHJcblxyXG4vKipcclxuICogQSB3b3JrZXIgaW4gdGhlIHBvb2wgb2YgZXhlY3V0aW5nIHdvcmtlcnNcclxuICovXHJcbmludGVyZmFjZSBQb29sV29ya2VyIHtcclxuXHQvKiogVGhlIGlkIG9mIHRoaXMgd29ya2VyICovXHJcblx0aWQ6IG51bWJlcjtcclxuXHQvKiogVGhlIHJhdyB1bmRlcmx5aW5nIHdvcmtlciAqL1xyXG5cdHdvcmtlcjogV29ya2VyO1xyXG5cdC8qKiBVTklYIHRpbWUgaW5kaWNhdGluZyB0aGUgbmV4dCB0aW1lIHRoaXMgd29ya2VyIGlzIGF2YWlsYWJsZSBmb3IgZXhlY3V0aW9uICovXHJcblx0YXZhaWxhYmxlQXQ6IG51bWJlcjtcclxuXHQvKiogVGhlIGFjdGl2ZSB0YXNrIHRoaXMgd29ya2VyIGlzIHByb2Nlc3NpbmcsIGlmIGFueSAqL1xyXG5cdGFjdGl2ZT86IFtURmlsZSwgRGVmZXJyZWQ8YW55PiwgbnVtYmVyLCBUYXNrUHJpb3JpdHldO1xyXG59XHJcblxyXG4vKipcclxuICogVGFzayBtZXRhZGF0YSBmcm9tIE9ic2lkaWFuIGNhY2hlXHJcbiAqL1xyXG5pbnRlcmZhY2UgVGFza01ldGFkYXRhIHtcclxuXHQvKiogTGlzdCBpdGVtIGNhY2hlIGluZm9ybWF0aW9uICovXHJcblx0bGlzdEl0ZW1zPzogTGlzdEl0ZW1DYWNoZVtdO1xyXG5cdC8qKiBSYXcgZmlsZSBjb250ZW50ICovXHJcblx0Y29udGVudDogc3RyaW5nO1xyXG5cdC8qKiBGaWxlIHN0YXRzICovXHJcblx0c3RhdHM6IHtcclxuXHRcdGN0aW1lOiBudW1iZXI7XHJcblx0XHRtdGltZTogbnVtYmVyO1xyXG5cdFx0c2l6ZTogbnVtYmVyO1xyXG5cdH07XHJcblx0LyoqIFdoZXRoZXIgdGhpcyBtZXRhZGF0YSBjYW1lIGZyb20gY2FjaGUgKi9cclxuXHRmcm9tQ2FjaGU/OiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogUXVldWUgaXRlbSB3aXRoIHByaW9yaXR5XHJcbiAqL1xyXG5pbnRlcmZhY2UgUXVldWVJdGVtIHtcclxuXHRmaWxlOiBURmlsZTtcclxuXHRwcm9taXNlOiBEZWZlcnJlZDxhbnk+O1xyXG5cdHByaW9yaXR5OiBUYXNrUHJpb3JpdHk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXb3JrZXIgcG9vbCBmb3IgdGFzayBwcm9jZXNzaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFza1dvcmtlck1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdC8qKiBXb3JrZXIgcG9vbCAqL1xyXG5cdHByaXZhdGUgd29ya2VyczogTWFwPG51bWJlciwgUG9vbFdvcmtlcj4gPSBuZXcgTWFwKCk7XHJcblx0LyoqIFByaW9yaXRpemVkIHRhc2sgcXVldWVzICovXHJcblx0cHJpdmF0ZSBxdWV1ZXM6IFF1ZXVlPFF1ZXVlSXRlbT5bXSA9IFtcclxuXHRcdG5ldyBRdWV1ZTxRdWV1ZUl0ZW0+KCksIC8vIOmrmOS8mOWFiOe6p+mYn+WIl1xyXG5cdFx0bmV3IFF1ZXVlPFF1ZXVlSXRlbT4oKSwgLy8g5pmu6YCa5LyY5YWI57qn6Zif5YiXXHJcblx0XHRuZXcgUXVldWU8UXVldWVJdGVtPigpLCAvLyDkvY7kvJjlhYjnuqfpmJ/liJdcclxuXHRdO1xyXG5cdC8qKiBNYXAgb2Ygb3V0c3RhbmRpbmcgdGFza3MgYnkgZmlsZSBwYXRoICovXHJcblx0cHJpdmF0ZSBvdXRzdGFuZGluZzogTWFwPHN0cmluZywgUHJvbWlzZTxhbnk+PiA9IG5ldyBNYXAoKTtcclxuXHQvKiogV2hldGhlciB0aGUgcG9vbCBpcyBjdXJyZW50bHkgYWN0aXZlICovXHJcblx0cHJpdmF0ZSBhY3RpdmU6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdC8qKiBXb3JrZXIgcG9vbCBvcHRpb25zICovXHJcblx0cHJpdmF0ZSBvcHRpb25zOiBXb3JrZXJQb29sT3B0aW9ucztcclxuXHQvKiogVmF1bHQgaW5zdGFuY2UgKi9cclxuXHRwcml2YXRlIHZhdWx0OiBWYXVsdDtcclxuXHQvKiogTWV0YWRhdGEgY2FjaGUgZm9yIGFjY2Vzc2luZyBmaWxlIG1ldGFkYXRhICovXHJcblx0cHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cdC8qKiBOZXh0IHdvcmtlciBJRCB0byBhc3NpZ24gKi9cclxuXHRwcml2YXRlIG5leHRXb3JrZXJJZDogbnVtYmVyID0gMDtcclxuXHQvKiogVHJhY2tpbmcgcHJvZ3Jlc3MgZm9yIGxhcmdlIG9wZXJhdGlvbnMgKi9cclxuXHRwcml2YXRlIHByb2Nlc3NlZEZpbGVzOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgdG90YWxGaWxlc1RvUHJvY2VzczogbnVtYmVyID0gMDtcclxuXHQvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcHJvY2Vzc2luZyBhIGxhcmdlIGJhdGNoICovXHJcblx0cHJpdmF0ZSBpc1Byb2Nlc3NpbmdCYXRjaDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdC8qKiBNYXhpbXVtIG51bWJlciBvZiByZXRyeSBhdHRlbXB0cyBmb3IgYSB0YXNrICovXHJcblx0cHJpdmF0ZSBtYXhSZXRyaWVzOiBudW1iZXIgPSAyO1xyXG5cdC8qKiBGaWxlIG1ldGFkYXRhIHRhc2sgcGFyc2VyICovXHJcblx0cHJpdmF0ZSBmaWxlTWV0YWRhdGFQYXJzZXI/OiBGaWxlTWV0YWRhdGFUYXNrUGFyc2VyO1xyXG5cdC8qKiBXaGV0aGVyIHdvcmtlcnMgaGF2ZSBiZWVuIGluaXRpYWxpemVkIHRvIHByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb24gKi9cclxuXHRwcml2YXRlIGluaXRpYWxpemVkOiBib29sZWFuID0gZmFsc2U7XHJcblx0LyoqIFJlZmVyZW5jZSB0byB0YXNrIGluZGV4ZXIgZm9yIGNhY2hlIGNoZWNraW5nICovXHJcblx0cHJpdmF0ZSB0YXNrSW5kZXhlcj86IGFueTtcclxuXHQvKiogUGVyZm9ybWFuY2Ugc3RhdGlzdGljcyAqL1xyXG5cdHByaXZhdGUgc3RhdHMgPSB7XHJcblx0XHRmaWxlc1NraXBwZWQ6IDAsXHJcblx0XHRmaWxlc1Byb2Nlc3NlZDogMCxcclxuXHRcdGNhY2hlSGl0UmF0aW86IDAsXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgbmV3IHdvcmtlciBwb29sXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHR2YXVsdDogVmF1bHQsXHJcblx0XHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlLFxyXG5cdFx0b3B0aW9uczogUGFydGlhbDxXb3JrZXJQb29sT3B0aW9ucz4gPSB7fVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMub3B0aW9ucyA9IHsuLi5ERUZBVUxUX1dPUktFUl9PUFRJT05TLCAuLi5vcHRpb25zfTtcclxuXHRcdHRoaXMudmF1bHQgPSB2YXVsdDtcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IG1ldGFkYXRhQ2FjaGU7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB3b3JrZXJzIHVwIHRvIG1heFxyXG5cdFx0dGhpcy5pbml0aWFsaXplV29ya2VycygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGZpbGUgcGFyc2luZyBjb25maWd1cmF0aW9uXHJcblx0ICovXHJcblx0cHVibGljIHNldEZpbGVQYXJzaW5nQ29uZmlnKFxyXG5cdFx0Y29uZmlnOiBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb24sXHJcblx0XHRwcm9qZWN0RGV0ZWN0aW9uTWV0aG9kcz86IGFueVtdXHJcblx0KTogdm9pZCB7XHJcblx0XHRpZiAoXHJcblx0XHRcdGNvbmZpZy5lbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nIHx8XHJcblx0XHRcdGNvbmZpZy5lbmFibGVUYWdCYXNlZFRhc2tQYXJzaW5nXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy5maWxlTWV0YWRhdGFQYXJzZXIgPSBuZXcgRmlsZU1ldGFkYXRhVGFza1BhcnNlcihcclxuXHRcdFx0XHRjb25maWcsXHJcblx0XHRcdFx0cHJvamVjdERldGVjdGlvbk1ldGhvZHNcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZmlsZU1ldGFkYXRhUGFyc2VyID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB3b3JrZXIgb3B0aW9ucyB0byBpbmNsdWRlIGZpbGUgcGFyc2luZyBjb25maWdcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuc2V0dGluZ3MpIHtcclxuXHRcdFx0dGhpcy5vcHRpb25zLnNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnID0gY29uZmlnO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5vcHRpb25zLnNldHRpbmdzID0ge1xyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsXHJcblx0XHRcdFx0dXNlRGFpbHlOb3RlUGF0aEFzRGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0ZGFpbHlOb3RlRm9ybWF0OiBcInl5eXktTU0tZGRcIixcclxuXHRcdFx0XHR1c2VBc0RhdGVUeXBlOiBcImR1ZVwiLFxyXG5cdFx0XHRcdGRhaWx5Tm90ZVBhdGg6IFwiXCIsXHJcblx0XHRcdFx0aWdub3JlSGVhZGluZzogXCJcIixcclxuXHRcdFx0XHRmb2N1c0hlYWRpbmc6IFwiXCIsXHJcblx0XHRcdFx0ZmlsZVBhcnNpbmdDb25maWc6IGNvbmZpZyxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZTogdW5kZWZpbmVkLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB3b3JrZXJzIGluIHRoZSBwb29sXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplV29ya2VycygpOiB2b2lkIHtcclxuXHRcdC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25cclxuXHRcdGlmICh0aGlzLmluaXRpYWxpemVkKSB7XHJcblx0XHRcdHRoaXMubG9nKFwiV29ya2VycyBhbHJlYWR5IGluaXRpYWxpemVkLCBza2lwcGluZyBpbml0aWFsaXphdGlvblwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuc3VyZSBhbnkgZXhpc3Rpbmcgd29ya2VycyBhcmUgY2xlYW5lZCB1cCBmaXJzdFxyXG5cdFx0aWYgKHRoaXMud29ya2Vycy5zaXplID4gMCkge1xyXG5cdFx0XHR0aGlzLmxvZyhcIkNsZWFuaW5nIHVwIGV4aXN0aW5nIHdvcmtlcnMgYmVmb3JlIHJlLWluaXRpYWxpemF0aW9uXCIpO1xyXG5cdFx0XHR0aGlzLmNsZWFudXBXb3JrZXJzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgd29ya2VyQ291bnQgPSBNYXRoLm1pbihcclxuXHRcdFx0dGhpcy5vcHRpb25zLm1heFdvcmtlcnMsXHJcblx0XHRcdG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IHx8IDJcclxuXHRcdCk7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZXJDb3VudDsgaSsrKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3Qgd29ya2VyID0gdGhpcy5uZXdXb3JrZXIoKTtcclxuXHRcdFx0XHR0aGlzLndvcmtlcnMuc2V0KHdvcmtlci5pZCwgd29ya2VyKTtcclxuXHRcdFx0XHR0aGlzLmxvZyhgSW5pdGlhbGl6ZWQgd29ya2VyICMke3dvcmtlci5pZH1gKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgd29ya2VyOlwiLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcclxuXHRcdHRoaXMubG9nKFxyXG5cdFx0XHRgSW5pdGlhbGl6ZWQgJHt0aGlzLndvcmtlcnMuc2l6ZX0gd29ya2VycyAocmVxdWVzdGVkICR7d29ya2VyQ291bnR9KWBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgd2UgaGF2ZSBhbnkgd29ya2Vyc1xyXG5cdFx0aWYgKHRoaXMud29ya2Vycy5zaXplID09PSAwKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIk5vIHdvcmtlcnMgY291bGQgYmUgaW5pdGlhbGl6ZWQsIGZhbGxpbmcgYmFjayB0byBtYWluIHRocmVhZCBwcm9jZXNzaW5nXCJcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBhIG5ldyB3b3JrZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIG5ld1dvcmtlcigpOiBQb29sV29ya2VyIHtcclxuXHRcdGNvbnN0IHdvcmtlcjogUG9vbFdvcmtlciA9IHtcclxuXHRcdFx0aWQ6IHRoaXMubmV4dFdvcmtlcklkKyssXHJcblx0XHRcdHdvcmtlcjogbmV3IFRhc2tXb3JrZXIoKSxcclxuXHRcdFx0YXZhaWxhYmxlQXQ6IERhdGUubm93KCksXHJcblx0XHR9O1xyXG5cclxuXHRcdHdvcmtlci53b3JrZXIub25tZXNzYWdlID0gKGV2dDogTWVzc2FnZUV2ZW50KSA9PiB7XHJcblx0XHRcdHRoaXMuZmluaXNoKHdvcmtlciwgZXZ0LmRhdGEpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBmaW5pc2ggaGFuZGxlcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdC8vIEhhbmRsZSB0aGUgZXJyb3IgYnkgcmVqZWN0aW5nIHRoZSBhY3RpdmUgcHJvbWlzZSBpZiBpdCBleGlzdHNcclxuXHRcdFx0XHRpZiAod29ya2VyLmFjdGl2ZSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgW2ZpbGUsIHByb21pc2VdID0gd29ya2VyLmFjdGl2ZTtcclxuXHRcdFx0XHRcdHByb21pc2UucmVqZWN0KGVycm9yKTtcclxuXHRcdFx0XHRcdHdvcmtlci5hY3RpdmUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHR0aGlzLm91dHN0YW5kaW5nLmRlbGV0ZShmaWxlLnBhdGgpO1xyXG5cdFx0XHRcdFx0dGhpcy5zY2hlZHVsZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cdFx0d29ya2VyLndvcmtlci5vbmVycm9yID0gKGV2ZW50OiBFcnJvckV2ZW50KSA9PiB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXb3JrZXIgZXJyb3I6XCIsIGV2ZW50KTtcclxuXHJcblx0XHRcdC8vIElmIHRoZXJlJ3MgYW4gYWN0aXZlIHRhc2ssIHJldHJ5IG9yIHJlamVjdCBpdFxyXG5cdFx0XHRpZiAod29ya2VyLmFjdGl2ZSkge1xyXG5cdFx0XHRcdGNvbnN0IFtmaWxlLCBwcm9taXNlLCByZXRyaWVzLCBwcmlvcml0eV0gPSB3b3JrZXIuYWN0aXZlO1xyXG5cclxuXHRcdFx0XHRpZiAocmV0cmllcyA8IHRoaXMubWF4UmV0cmllcykge1xyXG5cdFx0XHRcdFx0Ly8gUmV0cnkgdGhlIHRhc2tcclxuXHRcdFx0XHRcdHRoaXMubG9nKFxyXG5cdFx0XHRcdFx0XHRgUmV0cnlpbmcgdGFzayBmb3IgJHtmaWxlLnBhdGh9IChhdHRlbXB0ICR7XHJcblx0XHRcdFx0XHRcdFx0cmV0cmllcyArIDFcclxuXHRcdFx0XHRcdFx0fSlgXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy5xdWV1ZVRhc2tXaXRoUHJpb3JpdHkoXHJcblx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdHByb21pc2UsXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5LFxyXG5cdFx0XHRcdFx0XHRyZXRyaWVzICsgMVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gTWF4IHJldHJpZXMgcmVhY2hlZCwgcmVqZWN0IHRoZSBwcm9taXNlXHJcblx0XHRcdFx0XHRwcm9taXNlLnJlamVjdChcIldvcmtlciBlcnJvciBhZnRlciBtYXggcmV0cmllc1wiKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHdvcmtlci5hY3RpdmUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0dGhpcy5zY2hlZHVsZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB3b3JrZXI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIHRhc2sgaW5kZXhlciByZWZlcmVuY2UgZm9yIGNhY2hlIGNoZWNraW5nXHJcblx0ICovXHJcblx0cHVibGljIHNldFRhc2tJbmRleGVyKHRhc2tJbmRleGVyOiBhbnkpOiB2b2lkIHtcclxuXHRcdHRoaXMudGFza0luZGV4ZXIgPSB0YXNrSW5kZXhlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjYWNoZSBoaXQgcmF0aW8gc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlQ2FjaGVIaXRSYXRpbygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHRvdGFsRmlsZXMgPSB0aGlzLnN0YXRzLmZpbGVzU2tpcHBlZCArIHRoaXMuc3RhdHMuZmlsZXNQcm9jZXNzZWQ7XHJcblx0XHR0aGlzLnN0YXRzLmNhY2hlSGl0UmF0aW8gPVxyXG5cdFx0XHR0b3RhbEZpbGVzID4gMCA/IHRoaXMuc3RhdHMuZmlsZXNTa2lwcGVkIC8gdG90YWxGaWxlcyA6IDA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcGVyZm9ybWFuY2Ugc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRTdGF0cygpIHtcclxuXHRcdHJldHVybiB7Li4udGhpcy5zdGF0c307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIGZpbGUgc2hvdWxkIGJlIHByb2Nlc3NlZCAobm90IGluIHZhbGlkIGNhY2hlKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvdWxkUHJvY2Vzc0ZpbGUoZmlsZTogVEZpbGUpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGhpcy50YXNrSW5kZXhlcikge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gTm8gaW5kZXhlciwgYWx3YXlzIHByb2Nlc3NcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiBtdGltZSBvcHRpbWl6YXRpb24gaXMgZW5hYmxlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHQhdGhpcy5vcHRpb25zLnNldHRpbmdzPy5maWxlUGFyc2luZ0NvbmZpZz8uZW5hYmxlTXRpbWVPcHRpbWl6YXRpb25cclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gT3B0aW1pemF0aW9uIGRpc2FibGVkLCBhbHdheXMgcHJvY2Vzc1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAhdGhpcy50YXNrSW5kZXhlci5oYXNWYWxpZENhY2hlKGZpbGUucGF0aCwgZmlsZS5zdGF0Lm10aW1lKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjYWNoZWQgdGFza3MgZm9yIGEgZmlsZSBpZiBhdmFpbGFibGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldENhY2hlZFRhc2tzRm9yRmlsZShmaWxlUGF0aDogc3RyaW5nKTogVGFza1tdIHwgbnVsbCB7XHJcblx0XHRpZiAoIXRoaXMudGFza0luZGV4ZXIpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdGFza0lkcyA9IHRoaXMudGFza0luZGV4ZXIuZ2V0Q2FjaGUoKS5maWxlcy5nZXQoZmlsZVBhdGgpO1xyXG5cdFx0aWYgKCF0YXNrSWRzKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRcdGNvbnN0IHRhc2tDYWNoZSA9IHRoaXMudGFza0luZGV4ZXIuZ2V0Q2FjaGUoKS50YXNrcztcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiB0YXNrSWRzKSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrQ2FjaGUuZ2V0KHRhc2tJZCk7XHJcblx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0YXNrcy5sZW5ndGggPiAwID8gdGFza3MgOiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBhIHNpbmdsZSBmaWxlIGZvciB0YXNrc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBwcm9jZXNzRmlsZShcclxuXHRcdGZpbGU6IFRGaWxlLFxyXG5cdFx0cHJpb3JpdHk6IFRhc2tQcmlvcml0eSA9IFRhc2tQcmlvcml0eS5OT1JNQUxcclxuXHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Ly8gRGUtYm91bmNlIHJlcGVhdGVkIHJlcXVlc3RzIGZvciB0aGUgc2FtZSBmaWxlXHJcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLm91dHN0YW5kaW5nLmdldChmaWxlLnBhdGgpO1xyXG5cdFx0aWYgKGV4aXN0aW5nKSByZXR1cm4gZXhpc3Rpbmc7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgd2UgY2FuIHVzZSBjYWNoZWQgcmVzdWx0c1xyXG5cdFx0aWYgKCF0aGlzLnNob3VsZFByb2Nlc3NGaWxlKGZpbGUpKSB7XHJcblx0XHRcdGNvbnN0IGNhY2hlZFRhc2tzID0gdGhpcy5nZXRDYWNoZWRUYXNrc0ZvckZpbGUoZmlsZS5wYXRoKTtcclxuXHRcdFx0aWYgKGNhY2hlZFRhc2tzKSB7XHJcblx0XHRcdFx0dGhpcy5zdGF0cy5maWxlc1NraXBwZWQrKztcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUNhY2hlSGl0UmF0aW8oKTtcclxuXHRcdFx0XHR0aGlzLmxvZyhcclxuXHRcdFx0XHRcdGBVc2luZyBjYWNoZWQgdGFza3MgZm9yICR7ZmlsZS5wYXRofSAoJHtjYWNoZWRUYXNrcy5sZW5ndGh9IHRhc2tzKWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoY2FjaGVkVGFza3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IHByb21pc2UgPSBkZWZlcnJlZDxUYXNrW10+KCk7XHJcblx0XHR0aGlzLm91dHN0YW5kaW5nLnNldChmaWxlLnBhdGgsIHByb21pc2UpO1xyXG5cclxuXHRcdHRoaXMucXVldWVUYXNrV2l0aFByaW9yaXR5KGZpbGUsIHByb21pc2UsIHByaW9yaXR5KTtcclxuXHRcdHJldHVybiBwcm9taXNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUXVldWUgYSB0YXNrIHdpdGggc3BlY2lmaWVkIHByaW9yaXR5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBxdWV1ZVRhc2tXaXRoUHJpb3JpdHkoXHJcblx0XHRmaWxlOiBURmlsZSxcclxuXHRcdHByb21pc2U6IERlZmVycmVkPFRhc2tbXT4sXHJcblx0XHRwcmlvcml0eTogVGFza1ByaW9yaXR5LFxyXG5cdFx0cmV0cmllczogbnVtYmVyID0gMFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0dGhpcy5xdWV1ZXNbcHJpb3JpdHldLmVucXVldWUoe1xyXG5cdFx0XHRmaWxlLFxyXG5cdFx0XHRwcm9taXNlLFxyXG5cdFx0XHRwcmlvcml0eSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIElmIHRoaXMgaXMgdGhlIGZpcnN0IHJldHJ5LCBzY2hlZHVsZSBpbW1lZGlhdGVseVxyXG5cdFx0aWYgKHJldHJpZXMgPT09IDApIHtcclxuXHRcdFx0dGhpcy5zY2hlZHVsZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBtdWx0aXBsZSBmaWxlcyBpbiBhIGJhdGNoXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIHByb2Nlc3NCYXRjaChcclxuXHRcdGZpbGVzOiBURmlsZVtdLFxyXG5cdFx0cHJpb3JpdHk6IFRhc2tQcmlvcml0eSA9IFRhc2tQcmlvcml0eS5ISUdIXHJcblx0KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBUYXNrW10+PiB7XHJcblx0XHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiBuZXcgTWFwPHN0cmluZywgVGFza1tdPigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByZS1maWx0ZXIgZmlsZXM6IHNlcGFyYXRlIGNhY2hlZCBmcm9tIHVuY2FjaGVkXHJcblx0XHRjb25zdCBmaWxlc1RvUHJvY2VzczogVEZpbGVbXSA9IFtdO1xyXG5cdFx0Y29uc3QgcmVzdWx0TWFwID0gbmV3IE1hcDxzdHJpbmcsIFRhc2tbXT4oKTtcclxuXHRcdGxldCBjYWNoZWRDb3VudCA9IDA7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcblx0XHRcdGlmICghdGhpcy5zaG91bGRQcm9jZXNzRmlsZShmaWxlKSkge1xyXG5cdFx0XHRcdGNvbnN0IGNhY2hlZFRhc2tzID0gdGhpcy5nZXRDYWNoZWRUYXNrc0ZvckZpbGUoZmlsZS5wYXRoKTtcclxuXHRcdFx0XHRpZiAoY2FjaGVkVGFza3MpIHtcclxuXHRcdFx0XHRcdHJlc3VsdE1hcC5zZXQoZmlsZS5wYXRoLCBjYWNoZWRUYXNrcyk7XHJcblx0XHRcdFx0XHRjYWNoZWRDb3VudCsrO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGZpbGVzVG9Qcm9jZXNzLnB1c2goZmlsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5sb2coXHJcblx0XHRcdGBCYXRjaCBwcm9jZXNzaW5nOiAke2NhY2hlZENvdW50fSBmaWxlcyBmcm9tIGNhY2hlLCAke1xyXG5cdFx0XHRcdGZpbGVzVG9Qcm9jZXNzLmxlbmd0aFxyXG5cdFx0XHR9IGZpbGVzIHRvIHByb2Nlc3MgKGNhY2hlIGhpdCByYXRpbzogJHtcclxuXHRcdFx0XHRjYWNoZWRDb3VudCA+IDBcclxuXHRcdFx0XHRcdD8gKChjYWNoZWRDb3VudCAvIGZpbGVzLmxlbmd0aCkgKiAxMDApLnRvRml4ZWQoMSlcclxuXHRcdFx0XHRcdDogMFxyXG5cdFx0XHR9JSlgXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmIChmaWxlc1RvUHJvY2Vzcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIHJlc3VsdE1hcDsgLy8gQWxsIGZpbGVzIHdlcmUgY2FjaGVkXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc1Byb2Nlc3NpbmdCYXRjaCA9IHRydWU7XHJcblx0XHR0aGlzLnByb2Nlc3NlZEZpbGVzID0gMDtcclxuXHRcdHRoaXMudG90YWxGaWxlc1RvUHJvY2VzcyA9IGZpbGVzVG9Qcm9jZXNzLmxlbmd0aDtcclxuXHJcblx0XHR0aGlzLmxvZyhcclxuXHRcdFx0YFByb2Nlc3NpbmcgYmF0Y2ggb2YgJHtmaWxlc1RvUHJvY2Vzcy5sZW5ndGh9IGZpbGVzICgke2NhY2hlZENvdW50fSBjYWNoZWQpYFxyXG5cdFx0KTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyDlsIbmlofku7bliIbmiJDmm7TlsI/nmoTmibnmrKHvvIzpgb/lhY3kuIDmrKHmgKfmj5DkuqTlpKrlpJrku7vliqFcclxuXHRcdFx0Y29uc3QgYmF0Y2hTaXplID0gMTA7XHJcblx0XHRcdC8vIOmZkOWItuW5tuWPkeWkhOeQhueahOaWh+S7tuaVsFxyXG5cdFx0XHRjb25zdCBjb25jdXJyZW5jeUxpbWl0ID0gTWF0aC5taW4odGhpcy5vcHRpb25zLm1heFdvcmtlcnMgKiAyLCA1KTtcclxuXHJcblx0XHRcdC8vIOS9v+eUqOS4gOS4queugOWNleeahOS/oeWPt+mHj+adpeaOp+WItuW5tuWPkVxyXG5cdFx0XHRsZXQgYWN0aXZlUHJvbWlzZXMgPSAwO1xyXG5cdFx0XHRjb25zdCBwcm9jZXNzaW5nUXVldWU6IEFycmF5PCgpID0+IFByb21pc2U8dm9pZD4+ID0gW107XHJcblxyXG5cdFx0XHQvLyDovoXliqnlh73mlbDvvIzlpITnkIbpmJ/liJfkuK3nmoTkuIvkuIDkuKrku7vliqFcclxuXHRcdFx0Y29uc3QgcHJvY2Vzc05leHQgPSBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKHByb2Nlc3NpbmdRdWV1ZS5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcblx0XHRcdFx0aWYgKGFjdGl2ZVByb21pc2VzIDwgY29uY3VycmVuY3lMaW1pdCkge1xyXG5cdFx0XHRcdFx0YWN0aXZlUHJvbWlzZXMrKztcclxuXHRcdFx0XHRcdGNvbnN0IG5leHRUYXNrID0gcHJvY2Vzc2luZ1F1ZXVlLnNoaWZ0KCk7XHJcblx0XHRcdFx0XHRpZiAobmV4dFRhc2spIHtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCBuZXh0VGFzaygpO1xyXG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdFx0XHRcIkVycm9yIHByb2Nlc3NpbmcgYmF0Y2ggdGFzazpcIixcclxuXHRcdFx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0XHRcdFx0XHRhY3RpdmVQcm9taXNlcy0tO1xyXG5cdFx0XHRcdFx0XHRcdC8vIOe7p+e7reWkhOeQhumYn+WIl1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHByb2Nlc3NOZXh0KCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVzVG9Qcm9jZXNzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcclxuXHRcdFx0XHRjb25zdCBzdWJCYXRjaCA9IGZpbGVzVG9Qcm9jZXNzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpO1xyXG5cclxuXHRcdFx0XHQvLyDkuLrlrZDmibnmrKHliJvlu7rlpITnkIbku7vliqHlubbmt7vliqDliLDpmJ/liJdcclxuXHRcdFx0XHRwcm9jZXNzaW5nUXVldWUucHVzaChhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyDkuLrmr4/kuKrmlofku7bliJvlu7pQcm9taXNlXHJcblx0XHRcdFx0XHRjb25zdCBzdWJCYXRjaFByb21pc2VzID0gc3ViQmF0Y2gubWFwKGFzeW5jIChmaWxlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnByb2Nlc3NGaWxlKFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByaW9yaXR5XHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRyZXN1bHRNYXAuc2V0KGZpbGUucGF0aCwgdGFza3MpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB7ZmlsZSwgdGFza3N9O1xyXG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdFx0XHRgRXJyb3IgcHJvY2Vzc2luZyBmaWxlICR7ZmlsZS5wYXRofTpgLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB7ZmlsZSwgdGFza3M6IFtdfTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8g562J5b6F5omA5pyJ5a2Q5om55qyh5paH5Lu25aSE55CG5a6M5oiQXHJcblx0XHRcdFx0XHRjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoc3ViQmF0Y2hQcm9taXNlcyk7XHJcblxyXG5cdFx0XHRcdFx0Ly8g5pu05paw6L+b5bqmXHJcblx0XHRcdFx0XHR0aGlzLnByb2Nlc3NlZEZpbGVzICs9IHJlc3VsdHMubGVuZ3RoO1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJvZ3Jlc3MgPSBNYXRoLnJvdW5kKFxyXG5cdFx0XHRcdFx0XHQodGhpcy5wcm9jZXNzZWRGaWxlcyAvIHRoaXMudG90YWxGaWxlc1RvUHJvY2VzcykgKiAxMDBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHByb2dyZXNzICUgMTAgPT09IDAgfHxcclxuXHRcdFx0XHRcdFx0dGhpcy5wcm9jZXNzZWRGaWxlcyA9PT0gdGhpcy50b3RhbEZpbGVzVG9Qcm9jZXNzXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2coXHJcblx0XHRcdFx0XHRcdFx0YEJhdGNoIHByb2dyZXNzOiAke3Byb2dyZXNzfSUgKCR7dGhpcy5wcm9jZXNzZWRGaWxlc30vJHt0aGlzLnRvdGFsRmlsZXNUb1Byb2Nlc3N9KWBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8g5ZCv5Yqo5aSE55CG6Zif5YiXXHJcblx0XHRcdFx0cHJvY2Vzc05leHQoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g562J5b6F5omA5pyJ6Zif5YiX5Lit55qE5Lu75Yqh5a6M5oiQXHJcblx0XHRcdHdoaWxlIChhY3RpdmVQcm9taXNlcyA+IDAgfHwgcHJvY2Vzc2luZ1F1ZXVlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgZHVyaW5nIGJhdGNoIHByb2Nlc3Npbmc6XCIsIGVycm9yKTtcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHRoaXMuaXNQcm9jZXNzaW5nQmF0Y2ggPSBmYWxzZTtcclxuXHRcdFx0dGhpcy5sb2coXHJcblx0XHRcdFx0YENvbXBsZXRlZCBiYXRjaCBwcm9jZXNzaW5nIG9mICR7ZmlsZXMubGVuZ3RofSBmaWxlcyAoJHtjYWNoZWRDb3VudH0gZnJvbSBjYWNoZSwgJHtmaWxlc1RvUHJvY2Vzcy5sZW5ndGh9IHByb2Nlc3NlZClgXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdE1hcDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNhZmVseSBzZXJpYWxpemUgQ2FjaGVkTWV0YWRhdGEgZm9yIHdvcmtlciB0cmFuc2ZlclxyXG5cdCAqIFJlbW92ZXMgbm9uLXNlcmlhbGl6YWJsZSBvYmplY3RzIGxpa2UgZnVuY3Rpb25zIGFuZCBjaXJjdWxhciByZWZlcmVuY2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXJpYWxpemVDYWNoZWRNZXRhZGF0YShmaWxlQ2FjaGU6IENhY2hlZE1ldGFkYXRhIHwgbnVsbCk6IGFueSB7XHJcblx0XHRpZiAoIWZpbGVDYWNoZSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDcmVhdGUgYSBzYWZlIGNvcHkgd2l0aCBvbmx5IHNlcmlhbGl6YWJsZSBwcm9wZXJ0aWVzXHJcblx0XHRcdGNvbnN0IHNhZmVDb3B5OiBhbnkgPSB7fTtcclxuXHJcblx0XHRcdC8vIENvcHkgYmFzaWMgcHJvcGVydGllcyB0aGF0IGFyZSB0eXBpY2FsbHkgc2FmZSB0byBzZXJpYWxpemVcclxuXHRcdFx0Y29uc3Qgc2FmZVByb3BlcnRpZXMgPSBbXHJcblx0XHRcdFx0XCJmcm9udG1hdHRlclwiLFxyXG5cdFx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcdFwiaGVhZGluZ3NcIixcclxuXHRcdFx0XHRcInNlY3Rpb25zXCIsXHJcblx0XHRcdFx0XCJsaXN0SXRlbXNcIixcclxuXHRcdFx0XHRcImxpbmtzXCIsXHJcblx0XHRcdFx0XCJlbWJlZHNcIixcclxuXHRcdFx0XHRcImJsb2Nrc1wiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBwcm9wIG9mIHNhZmVQcm9wZXJ0aWVzKSB7XHJcblx0XHRcdFx0aWYgKChmaWxlQ2FjaGUgYXMgYW55KVtwcm9wXSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHQvLyBEZWVwIGNsb25lIHRvIGF2b2lkIGFueSBwb3RlbnRpYWwgY2lyY3VsYXIgcmVmZXJlbmNlc1xyXG5cdFx0XHRcdFx0c2FmZUNvcHlbcHJvcF0gPSBKU09OLnBhcnNlKFxyXG5cdFx0XHRcdFx0XHRKU09OLnN0cmluZ2lmeSgoZmlsZUNhY2hlIGFzIGFueSlbcHJvcF0pXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHNhZmVDb3B5O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIHNlcmlhbGl6ZSBDYWNoZWRNZXRhZGF0YSwgdXNpbmcgZmFsbGJhY2s6XCIsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gRmFsbGJhY2s6IG9ubHkgaW5jbHVkZSBmcm9udG1hdHRlciB3aGljaCBpcyBtb3N0IGNvbW1vbmx5IG5lZWRlZFxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXJcclxuXHRcdFx0XHRcdD8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIpKVxyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFzayBtZXRhZGF0YSBmcm9tIHRoZSBmaWxlIGFuZCBPYnNpZGlhbiBjYWNoZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZ2V0VGFza01ldGFkYXRhKGZpbGU6IFRGaWxlKTogUHJvbWlzZTxUYXNrTWV0YWRhdGE+IHtcclxuXHRcdC8vIEdldCBmaWxlIGNvbnRlbnRcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XHJcblxyXG5cdFx0Ly8gR2V0IGZpbGUgbWV0YWRhdGEgZnJvbSBPYnNpZGlhbiBjYWNoZVxyXG5cdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRsaXN0SXRlbXM6IGZpbGVDYWNoZT8ubGlzdEl0ZW1zLFxyXG5cdFx0XHRjb250ZW50LFxyXG5cdFx0XHRzdGF0czoge1xyXG5cdFx0XHRcdGN0aW1lOiBmaWxlLnN0YXQuY3RpbWUsXHJcblx0XHRcdFx0bXRpbWU6IGZpbGUuc3RhdC5tdGltZSxcclxuXHRcdFx0XHRzaXplOiBmaWxlLnN0YXQuc2l6ZSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeGVjdXRlIG5leHQgdGFzayBmcm9tIHRoZSBxdWV1ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2NoZWR1bGUoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuYWN0aXZlKSByZXR1cm47XHJcblxyXG5cdFx0Ly8g5qOA5p+l5omA5pyJ6Zif5YiX77yM5oyJ5LyY5YWI57qn5LuO6auY5Yiw5L2O6I635Y+W5Lu75YqhXHJcblx0XHRsZXQgcXVldWVJdGVtOiBRdWV1ZUl0ZW0gfCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0Zm9yIChsZXQgcHJpb3JpdHkgPSAwOyBwcmlvcml0eSA8IHRoaXMucXVldWVzLmxlbmd0aDsgcHJpb3JpdHkrKykge1xyXG5cdFx0XHRpZiAoIXRoaXMucXVldWVzW3ByaW9yaXR5XS5pc0VtcHR5KCkpIHtcclxuXHRcdFx0XHRxdWV1ZUl0ZW0gPSB0aGlzLnF1ZXVlc1twcmlvcml0eV0uZGVxdWV1ZSgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFxdWV1ZUl0ZW0pIHJldHVybjsgLy8g5omA5pyJ6Zif5YiX6YO95Li656m6XHJcblxyXG5cdFx0Y29uc3Qgd29ya2VyID0gdGhpcy5hdmFpbGFibGVXb3JrZXIoKTtcclxuXHRcdGlmICghd29ya2VyKSB7XHJcblx0XHRcdC8vIOayoeacieWPr+eUqOeahOW3peS9nOe6v+eoi++8jOWwhuS7u+WKoemHjeaWsOWFpemYn1xyXG5cdFx0XHR0aGlzLnF1ZXVlc1txdWV1ZUl0ZW0ucHJpb3JpdHldLmVucXVldWUocXVldWVJdGVtKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHtmaWxlLCBwcm9taXNlLCBwcmlvcml0eX0gPSBxdWV1ZUl0ZW07XHJcblx0XHR3b3JrZXIuYWN0aXZlID0gW2ZpbGUsIHByb21pc2UsIDAsIHByaW9yaXR5XTsgLy8gMCDooajnpLrph43or5XmrKHmlbBcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLmdldFRhc2tNZXRhZGF0YShmaWxlKVxyXG5cdFx0XHRcdC50aGVuKChtZXRhZGF0YSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgY29tbWFuZDogUGFyc2VUYXNrc0NvbW1hbmQgPSB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwicGFyc2VUYXNrc1wiLFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50OiBtZXRhZGF0YS5jb250ZW50LFxyXG5cdFx0XHRcdFx0XHRmaWxlRXh0ZW5zaW9uOiBmaWxlLmV4dGVuc2lvbixcclxuXHRcdFx0XHRcdFx0c3RhdHM6IG1ldGFkYXRhLnN0YXRzLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRcdGxpc3RJdGVtczogbWV0YWRhdGEubGlzdEl0ZW1zIHx8IFtdLFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVDYWNoZTogdGhpcy5zZXJpYWxpemVDYWNoZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSlcclxuXHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nczogdGhpcy5vcHRpb25zLnNldHRpbmdzIHx8IHtcclxuXHRcdFx0XHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdFx0XHRcdFx0XHRcdHVzZURhaWx5Tm90ZVBhdGhBc0RhdGU6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdGRhaWx5Tm90ZUZvcm1hdDogXCJ5eXl5LU1NLWRkXCIsXHJcblx0XHRcdFx0XHRcdFx0dXNlQXNEYXRlVHlwZTogXCJkdWVcIixcclxuXHRcdFx0XHRcdFx0XHRkYWlseU5vdGVQYXRoOiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdGlnbm9yZUhlYWRpbmc6IFwiXCIsXHJcblx0XHRcdFx0XHRcdFx0Zm9jdXNIZWFkaW5nOiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXJzaW5nQ29uZmlnOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0d29ya2VyLndvcmtlci5wb3N0TWVzc2FnZShjb21tYW5kKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5jYXRjaCgoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoYEVycm9yIHJlYWRpbmcgZmlsZSAke2ZpbGUucGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0cHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHRcdFx0d29ya2VyLmFjdGl2ZSA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0XHQvLyDnp7vpmaTmnKrlrozmiJDnmoTku7vliqFcclxuXHRcdFx0XHRcdHRoaXMub3V0c3RhbmRpbmcuZGVsZXRlKGZpbGUucGF0aCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8g5aSE55CG5LiL5LiA5Liq5Lu75YqhXHJcblx0XHRcdFx0XHR0aGlzLnNjaGVkdWxlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIGZpbGUgJHtmaWxlLnBhdGh9OmAsIGVycm9yKTtcclxuXHRcdFx0cHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR3b3JrZXIuYWN0aXZlID0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0Ly8g56e76Zmk5pyq5a6M5oiQ55qE5Lu75YqhXHJcblx0XHRcdHRoaXMub3V0c3RhbmRpbmcuZGVsZXRlKGZpbGUucGF0aCk7XHJcblxyXG5cdFx0XHQvLyDlpITnkIbkuIvkuIDkuKrku7vliqFcclxuXHRcdFx0dGhpcy5zY2hlZHVsZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHdvcmtlciBjb21wbGV0aW9uIGFuZCBwcm9jZXNzIHJlc3VsdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZmluaXNoKFxyXG5cdFx0d29ya2VyOiBQb29sV29ya2VyLFxyXG5cdFx0ZGF0YTogSW5kZXhlclJlc3VsdFxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF3b3JrZXIuYWN0aXZlKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgYSBzdGFsZSB3b3JrZXIgbWVzc2FnZS4gSWdub3JpbmcuXCIsIGRhdGEpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgW2ZpbGUsIHByb21pc2UsIHJldHJpZXMsIHByaW9yaXR5XSA9IHdvcmtlci5hY3RpdmU7XHJcblxyXG5cdFx0Ly8gUmVzb2x2ZSBvciByZWplY3QgdGhlIHByb21pc2UgYmFzZWQgb24gcmVzdWx0XHJcblx0XHRpZiAoZGF0YS50eXBlID09PSBcImVycm9yXCIpIHtcclxuXHRcdFx0Ly8g6ZSZ6K+v5aSE55CGIC0g5aaC5p6c5rKh5pyJ6LaF6L+H6YeN6K+V5qyh5pWw77yM6YeN6K+VXHJcblx0XHRcdGNvbnN0IGVycm9yUmVzdWx0ID0gZGF0YSBhcyBFcnJvclJlc3VsdDtcclxuXHJcblx0XHRcdGlmIChyZXRyaWVzIDwgdGhpcy5tYXhSZXRyaWVzKSB7XHJcblx0XHRcdFx0dGhpcy5sb2coXHJcblx0XHRcdFx0XHRgUmV0cnlpbmcgdGFzayBmb3IgJHtmaWxlLnBhdGh9IGR1ZSB0byBlcnJvcjogJHtlcnJvclJlc3VsdC5lcnJvcn1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnF1ZXVlVGFza1dpdGhQcmlvcml0eShcclxuXHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRwcm9taXNlLFxyXG5cdFx0XHRcdFx0cHJpb3JpdHksXHJcblx0XHRcdFx0XHRyZXRyaWVzICsgMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGVycm9yUmVzdWx0LmVycm9yKSk7XHJcblx0XHRcdFx0dGhpcy5vdXRzdGFuZGluZy5kZWxldGUoZmlsZS5wYXRoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwicGFyc2VSZXN1bHRcIikge1xyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IGRhdGEgYXMgVGFza1BhcnNlUmVzdWx0O1xyXG5cclxuXHRcdFx0Ly8gQ29tYmluZSB3b3JrZXIgdGFza3Mgd2l0aCBmaWxlIG1ldGFkYXRhIHRhc2tzXHJcblx0XHRcdGxldCBhbGxUYXNrcyA9IFsuLi5wYXJzZVJlc3VsdC50YXNrc107XHJcblxyXG5cdFx0XHRpZiAodGhpcy5maWxlTWV0YWRhdGFQYXJzZXIpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdFx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhUmVzdWx0ID1cclxuXHRcdFx0XHRcdFx0dGhpcy5maWxlTWV0YWRhdGFQYXJzZXIucGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZS5wYXRoLFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVDYWNoZSB8fCB1bmRlZmluZWRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgZmlsZSBtZXRhZGF0YSB0YXNrcyB0byB0aGUgcmVzdWx0XHJcblx0XHRcdFx0XHRhbGxUYXNrcy5wdXNoKC4uLmZpbGVNZXRhZGF0YVJlc3VsdC50YXNrcyk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTG9nIGFueSBlcnJvcnMgZnJvbSBmaWxlIG1ldGFkYXRhIHBhcnNpbmdcclxuXHRcdFx0XHRcdGlmIChmaWxlTWV0YWRhdGFSZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdGBGaWxlIG1ldGFkYXRhIHBhcnNpbmcgZXJyb3JzIGZvciAke2ZpbGUucGF0aH06YCxcclxuXHRcdFx0XHRcdFx0XHRmaWxlTWV0YWRhdGFSZXN1bHQuZXJyb3JzXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdGBFcnJvciBpbiBmaWxlIG1ldGFkYXRhIHBhcnNpbmcgZm9yICR7ZmlsZS5wYXRofTpgLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHByb21pc2UucmVzb2x2ZShhbGxUYXNrcyk7XHJcblx0XHRcdHRoaXMub3V0c3RhbmRpbmcuZGVsZXRlKGZpbGUucGF0aCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc3RhdGlzdGljc1xyXG5cdFx0XHR0aGlzLnN0YXRzLmZpbGVzUHJvY2Vzc2VkKys7XHJcblx0XHRcdHRoaXMudXBkYXRlQ2FjaGVIaXRSYXRpbygpO1xyXG5cdFx0fSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwiYmF0Y2hSZXN1bHRcIikge1xyXG5cdFx0XHQvLyBGb3IgYmF0Y2ggcmVzdWx0cywgd2UgaGFuZGxlIGRpZmZlcmVudGx5IGFzIHdlIGRvbid0IGhhdmUgdGFza3MgZGlyZWN0bHlcclxuXHRcdFx0cHJvbWlzZS5yZWplY3QoXHJcblx0XHRcdFx0bmV3IEVycm9yKFwiQmF0Y2ggcmVzdWx0cyBzaG91bGQgYmUgaGFuZGxlZCBieSBwcm9jZXNzQmF0Y2hcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5vdXRzdGFuZGluZy5kZWxldGUoZmlsZS5wYXRoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHByb21pc2UucmVqZWN0KFxyXG5cdFx0XHRcdG5ldyBFcnJvcihgVW5leHBlY3RlZCByZXN1bHQgdHlwZTogJHsoZGF0YSBhcyBhbnkpLnR5cGV9YClcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5vdXRzdGFuZGluZy5kZWxldGUoZmlsZS5wYXRoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoaXMgd29ya2VyIChpZiB3ZSdyZSBvdmVyIGNhcGFjaXR5KVxyXG5cdFx0aWYgKHRoaXMud29ya2Vycy5zaXplID4gdGhpcy5vcHRpb25zLm1heFdvcmtlcnMpIHtcclxuXHRcdFx0dGhpcy53b3JrZXJzLmRlbGV0ZSh3b3JrZXIuaWQpO1xyXG5cdFx0XHR0aGlzLnRlcm1pbmF0ZSh3b3JrZXIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gQ2FsY3VsYXRlIGRlbGF5IGJhc2VkIG9uIENQVSB1dGlsaXphdGlvbiB0YXJnZXRcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgcHJvY2Vzc2luZ1RpbWUgPSB3b3JrZXIuYWN0aXZlID8gbm93IC0gd29ya2VyLmF2YWlsYWJsZUF0IDogMDtcclxuXHRcdFx0Y29uc3QgdGhyb3R0bGUgPSBNYXRoLm1heCgwLjEsIHRoaXMub3B0aW9ucy5jcHVVdGlsaXphdGlvbikgLSAxLjA7XHJcblx0XHRcdGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMCwgcHJvY2Vzc2luZ1RpbWUgKiB0aHJvdHRsZSk7XHJcblxyXG5cdFx0XHR3b3JrZXIuYWN0aXZlID0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0aWYgKGRlbGF5IDw9IDApIHtcclxuXHRcdFx0XHR3b3JrZXIuYXZhaWxhYmxlQXQgPSBub3c7XHJcblx0XHRcdFx0dGhpcy5zY2hlZHVsZSgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdvcmtlci5hdmFpbGFibGVBdCA9IG5vdyArIGRlbGF5O1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5zY2hlZHVsZSgpLCBkZWxheSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbiBhdmFpbGFibGUgd29ya2VyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhdmFpbGFibGVXb3JrZXIoKTogUG9vbFdvcmtlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIEZpbmQgYSB3b3JrZXIgdGhhdCdzIG5vdCBidXN5IGFuZCBpcyBhdmFpbGFibGVcclxuXHRcdGZvciAoY29uc3Qgd29ya2VyIG9mIHRoaXMud29ya2Vycy52YWx1ZXMoKSkge1xyXG5cdFx0XHRpZiAoIXdvcmtlci5hY3RpdmUgJiYgd29ya2VyLmF2YWlsYWJsZUF0IDw9IG5vdykge1xyXG5cdFx0XHRcdHJldHVybiB3b3JrZXI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgYSBuZXcgd29ya2VyIGlmIHdlIGhhdmVuJ3QgcmVhY2hlZCBjYXBhY2l0eVxyXG5cdFx0aWYgKHRoaXMud29ya2Vycy5zaXplIDwgdGhpcy5vcHRpb25zLm1heFdvcmtlcnMpIHtcclxuXHRcdFx0Y29uc3Qgd29ya2VyID0gdGhpcy5uZXdXb3JrZXIoKTtcclxuXHRcdFx0dGhpcy53b3JrZXJzLnNldCh3b3JrZXIuaWQsIHdvcmtlcik7XHJcblx0XHRcdHJldHVybiB3b3JrZXI7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRlcm1pbmF0ZSBhIHdvcmtlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdGVybWluYXRlKHdvcmtlcjogUG9vbFdvcmtlcik6IHZvaWQge1xyXG5cdFx0d29ya2VyLndvcmtlci50ZXJtaW5hdGUoKTtcclxuXHJcblx0XHRpZiAod29ya2VyLmFjdGl2ZSkge1xyXG5cdFx0XHR3b3JrZXIuYWN0aXZlWzFdLnJlamVjdChcIlRlcm1pbmF0ZWRcIik7XHJcblx0XHRcdHdvcmtlci5hY3RpdmUgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5sb2coYFRlcm1pbmF0ZWQgd29ya2VyICMke3dvcmtlci5pZH1gKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIGV4aXN0aW5nIHdvcmtlcnMgd2l0aG91dCBhZmZlY3RpbmcgdGhlIGFjdGl2ZSBzdGF0ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2xlYW51cFdvcmtlcnMoKTogdm9pZCB7XHJcblx0XHQvLyBUZXJtaW5hdGUgYWxsIHdvcmtlcnNcclxuXHRcdGZvciAoY29uc3Qgd29ya2VyIG9mIHRoaXMud29ya2Vycy52YWx1ZXMoKSkge1xyXG5cdFx0XHR0aGlzLnRlcm1pbmF0ZSh3b3JrZXIpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy53b3JrZXJzLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgYWxsIHJlbWFpbmluZyBxdWV1ZWQgdGFza3MgYW5kIHJlamVjdCB0aGVpciBwcm9taXNlc1xyXG5cdFx0Zm9yIChjb25zdCBxdWV1ZSBvZiB0aGlzLnF1ZXVlcykge1xyXG5cdFx0XHR3aGlsZSAoIXF1ZXVlLmlzRW1wdHkoKSkge1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXVlSXRlbSA9IHF1ZXVlLmRlcXVldWUoKTtcclxuXHRcdFx0XHRpZiAocXVldWVJdGVtKSB7XHJcblx0XHRcdFx0XHRxdWV1ZUl0ZW0ucHJvbWlzZS5yZWplY3QoXCJXb3JrZXJzIGJlaW5nIHJlaW5pdGlhbGl6ZWRcIik7XHJcblx0XHRcdFx0XHR0aGlzLm91dHN0YW5kaW5nLmRlbGV0ZShxdWV1ZUl0ZW0uZmlsZS5wYXRoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmxvZyhcIkNsZWFuZWQgdXAgZXhpc3Rpbmcgd29ya2Vyc1wiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IHRocm90dGxpbmcgZm9yIGFsbCB3b3JrZXJzXHJcblx0ICovXHJcblx0cHVibGljIHVudGhyb3R0bGUoKTogdm9pZCB7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0Zm9yIChjb25zdCB3b3JrZXIgb2YgdGhpcy53b3JrZXJzLnZhbHVlcygpKSB7XHJcblx0XHRcdHdvcmtlci5hdmFpbGFibGVBdCA9IG5vdztcclxuXHRcdH1cclxuXHRcdHRoaXMuc2NoZWR1bGUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNodXRkb3duIHRoZSB3b3JrZXIgcG9vbFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gVGVybWluYXRlIGFsbCB3b3JrZXJzXHJcblx0XHRmb3IgKGNvbnN0IHdvcmtlciBvZiB0aGlzLndvcmtlcnMudmFsdWVzKCkpIHtcclxuXHRcdFx0dGhpcy50ZXJtaW5hdGUod29ya2VyKTtcclxuXHRcdFx0dGhpcy53b3JrZXJzLmRlbGV0ZSh3b3JrZXIuaWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIGFsbCByZW1haW5pbmcgcXVldWVkIHRhc2tzIGFuZCByZWplY3QgdGhlaXIgcHJvbWlzZXNcclxuXHRcdGZvciAoY29uc3QgcXVldWUgb2YgdGhpcy5xdWV1ZXMpIHtcclxuXHRcdFx0d2hpbGUgKCFxdWV1ZS5pc0VtcHR5KCkpIHtcclxuXHRcdFx0XHRjb25zdCBxdWV1ZUl0ZW0gPSBxdWV1ZS5kZXF1ZXVlKCk7XHJcblx0XHRcdFx0aWYgKHF1ZXVlSXRlbSkge1xyXG5cdFx0XHRcdFx0cXVldWVJdGVtLnByb21pc2UucmVqZWN0KFwiVGVybWluYXRlZFwiKTtcclxuXHRcdFx0XHRcdHRoaXMub3V0c3RhbmRpbmcuZGVsZXRlKHF1ZXVlSXRlbS5maWxlLnBhdGgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc2V0IGluaXRpYWxpemF0aW9uIGZsYWcgdG8gYWxsb3cgcmUtaW5pdGlhbGl6YXRpb24gaWYgbmVlZGVkXHJcblx0XHR0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5sb2coXCJXb3JrZXIgcG9vbCBzaHV0IGRvd25cIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIG51bWJlciBvZiBwZW5kaW5nIHRhc2tzXHJcblx0ICovXHJcblx0cHVibGljIGdldFBlbmRpbmdUYXNrQ291bnQoKTogbnVtYmVyIHtcclxuXHRcdHJldHVybiB0aGlzLnF1ZXVlcy5yZWR1Y2UoKHRvdGFsLCBxdWV1ZSkgPT4gdG90YWwgKyBxdWV1ZS5zaXplKCksIDApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjdXJyZW50IGJhdGNoIHByb2Nlc3NpbmcgcHJvZ3Jlc3NcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0QmF0Y2hQcm9ncmVzcygpOiB7XHJcblx0XHRjdXJyZW50OiBudW1iZXI7XHJcblx0XHR0b3RhbDogbnVtYmVyO1xyXG5cdFx0cGVyY2VudGFnZTogbnVtYmVyO1xyXG5cdH0ge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y3VycmVudDogdGhpcy5wcm9jZXNzZWRGaWxlcyxcclxuXHRcdFx0dG90YWw6IHRoaXMudG90YWxGaWxlc1RvUHJvY2VzcyxcclxuXHRcdFx0cGVyY2VudGFnZTpcclxuXHRcdFx0XHR0aGlzLnRvdGFsRmlsZXNUb1Byb2Nlc3MgPiAwXHJcblx0XHRcdFx0XHQ/IE1hdGgucm91bmQoXHJcblx0XHRcdFx0XHRcdCh0aGlzLnByb2Nlc3NlZEZpbGVzIC8gdGhpcy50b3RhbEZpbGVzVG9Qcm9jZXNzKSAqXHJcblx0XHRcdFx0XHRcdDEwMFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0OiAwLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEBkZXByZWNhdGVkIFByb2plY3QgZGF0YSBpcyBub3cgaGFuZGxlZCBieSBBdWdtZW50b3IgaW4gbWFpbiB0aHJlYWQgcGVyIGRhdGFmbG93IGFyY2hpdGVjdHVyZS5cclxuXHQgKiBXb3JrZXJzIG9ubHkgcGVyZm9ybSByYXcgdGFzayBleHRyYWN0aW9uIHdpdGhvdXQgcHJvamVjdCBlbmhhbmNlbWVudC5cclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0RW5oYW5jZWRQcm9qZWN0RGF0YShcclxuXHRcdGVuaGFuY2VkUHJvamVjdERhdGE6IEVuaGFuY2VkUHJvamVjdERhdGFcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIE5PLU9QOiBQcm9qZWN0IGRhdGEgaXMgaGFuZGxlZCBieSBBdWdtZW50b3IsIG5vdCBXb3JrZXJzXHJcblx0XHQvLyBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IGJ1dCBkb2VzIG5vdGhpbmdcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB3b3JrZXIgc2V0dGluZ3MgZHluYW1pY2FsbHlcclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlU2V0dGluZ3MoXHJcblx0XHRzZXR0aW5nczogUGFydGlhbDx7XHJcblx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImRhdGF2aWV3XCIgfCBcInRhc2tzXCI7XHJcblx0XHRcdGN1c3RvbURhdGVGb3JtYXRzPzogc3RyaW5nW107XHJcblx0XHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlPzogYW55O1xyXG5cdFx0XHRwcm9qZWN0Q29uZmlnPzogYW55O1xyXG5cdFx0XHRpZ25vcmVIZWFkaW5nPzogc3RyaW5nO1xyXG5cdFx0XHRmb2N1c0hlYWRpbmc/OiBzdHJpbmc7XHJcblx0XHRcdHByb2plY3RUYWdQcmVmaXg/OiBhbnk7XHJcblx0XHRcdGNvbnRleHRUYWdQcmVmaXg/OiBhbnk7XHJcblx0XHRcdGFyZWFUYWdQcmVmaXg/OiBhbnk7XHJcblx0XHR9PlxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gVXBkYXRlIHRoZSBzZXR0aW5nc1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zZXR0aW5ncykge1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKHRoaXMub3B0aW9ucy5zZXR0aW5ncywgc2V0dGluZ3MpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdGhlIHdvcmtlciBwb29sIGlzIGN1cnJlbnRseSBwcm9jZXNzaW5nIGEgYmF0Y2hcclxuXHQgKi9cclxuXHRwdWJsaWMgaXNQcm9jZXNzaW5nQmF0Y2hUYXNrKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaXNQcm9jZXNzaW5nQmF0Y2g7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2cgYSBtZXNzYWdlIGlmIGRlYnVnZ2luZyBpcyBlbmFibGVkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBsb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmRlYnVnKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1dvcmtlck1hbmFnZXJdICR7bWVzc2FnZX1gKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19