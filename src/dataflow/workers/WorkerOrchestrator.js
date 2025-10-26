import { __awaiter } from "tslib";
import { MetadataParseMode } from "../../types/TaskParserConfig";
import { ConfigurableTaskParser } from "@/dataflow/core/ConfigurableTaskParser";
/**
 * WorkerOrchestrator - Unified task and project worker management
 *
 * This component provides a unified interface for coordinating both task parsing
 * and project data computation workers. It implements:
 * - Concurrent control and load balancing
 * - Retry mechanisms with exponential backoff
 * - Performance metrics and monitoring
 * - Fallback to main thread processing
 */
export class WorkerOrchestrator {
    constructor(taskWorkerManager, projectWorkerManager, options) {
        var _a;
        // Performance metrics
        this.metrics = {
            taskParsingSuccess: 0,
            taskParsingFailures: 0,
            projectDataSuccess: 0,
            projectDataFailures: 0,
            averageTaskParsingTime: 0,
            averageProjectDataTime: 0,
            totalOperations: 0,
            fallbackToMainThread: 0,
        };
        // Retry configuration
        this.maxRetries = 3;
        this.retryDelayMs = 1000; // Base delay for exponential backoff
        // Circuit breaker for worker failures
        this.workerFailureCount = 0;
        this.maxWorkerFailures = 10;
        this.workersDisabled = false;
        // Configuration options
        this.enableWorkerProcessing = true;
        this.taskWorkerManager = taskWorkerManager;
        this.projectWorkerManager = projectWorkerManager;
        this.enableWorkerProcessing = (_a = options === null || options === void 0 ? void 0 : options.enableWorkerProcessing) !== null && _a !== void 0 ? _a : true;
    }
    /**
     * Parse tasks from a file using workers with fallback
     */
    parseFileTasks(file, priority = "normal") {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                // Check if workers are enabled and available
                if (!this.enableWorkerProcessing || this.workersDisabled) {
                    return yield this.parseFileTasksMainThread(file);
                }
                const taskPriority = this.convertPriority(priority);
                const tasks = yield this.retryOperation(() => this.taskWorkerManager.processFile(file, taskPriority), `parseFileTasks:${file.path}`, this.maxRetries);
                // Update metrics
                this.metrics.taskParsingSuccess++;
                this.updateAverageTime("taskParsing", Date.now() - startTime);
                return tasks;
            }
            catch (error) {
                console.error(`WorkerOrchestrator: Failed to parse file ${file.path}:`, error);
                // Update failure metrics
                this.metrics.taskParsingFailures++;
                this.handleWorkerFailure();
                // Fallback to main thread
                return yield this.parseFileTasksMainThread(file);
            }
        });
    }
    /**
     * Parse multiple files in batch with intelligent distribution
     */
    batchParse(files, priority = "normal") {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                if (!this.enableWorkerProcessing ||
                    this.workersDisabled ||
                    files.length === 0) {
                    return yield this.batchParseMainThread(files);
                }
                const taskPriority = this.convertPriority(priority);
                const results = yield this.retryOperation(() => this.taskWorkerManager.processBatch(files, taskPriority), `batchParse:${files.length}files`, this.maxRetries);
                // Update metrics
                this.metrics.taskParsingSuccess += files.length;
                this.updateAverageTime("taskParsing", Date.now() - startTime);
                return results;
            }
            catch (error) {
                console.error(`WorkerOrchestrator: Failed to batch parse ${files.length} files:`, error);
                // Update failure metrics
                this.metrics.taskParsingFailures += files.length;
                this.handleWorkerFailure();
                // Fallback to main thread
                return yield this.batchParseMainThread(files);
            }
        });
    }
    /**
     * Compute project data for a file using workers with fallback
     */
    computeProjectData(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                if (this.workersDisabled) {
                    return yield this.computeProjectDataMainThread(filePath);
                }
                const projectData = yield this.retryOperation(() => this.projectWorkerManager.getProjectData(filePath), `computeProjectData:${filePath}`, this.maxRetries);
                // Update metrics
                this.metrics.projectDataSuccess++;
                this.updateAverageTime("projectData", Date.now() - startTime);
                return projectData;
            }
            catch (error) {
                console.error(`WorkerOrchestrator: Failed to compute project data for ${filePath}:`, error);
                // Update failure metrics
                this.metrics.projectDataFailures++;
                this.handleWorkerFailure();
                // Fallback to main thread
                return yield this.computeProjectDataMainThread(filePath);
            }
        });
    }
    /**
     * Compute project data for multiple files in batch
     */
    batchCompute(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                if (this.workersDisabled || filePaths.length === 0) {
                    return yield this.batchComputeMainThread(filePaths);
                }
                const results = yield this.retryOperation(() => this.projectWorkerManager.getBatchProjectData(filePaths), `batchCompute:${filePaths.length}files`, this.maxRetries);
                // Update metrics
                this.metrics.projectDataSuccess += filePaths.length;
                this.updateAverageTime("projectData", Date.now() - startTime);
                return results;
            }
            catch (error) {
                console.error(`WorkerOrchestrator: Failed to batch compute ${filePaths.length} files:`, error);
                // Update failure metrics
                this.metrics.projectDataFailures += filePaths.length;
                this.handleWorkerFailure();
                // Fallback to main thread
                return yield this.batchComputeMainThread(filePaths);
            }
        });
    }
    /**
     * Generic retry mechanism with exponential backoff
     */
    retryOperation(operation, operationName, maxRetries) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastError;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 0) {
                        // Exponential backoff: wait 1s, 2s, 4s, etc.
                        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
                        yield new Promise((resolve) => setTimeout(resolve, delay));
                        console.log(`WorkerOrchestrator: Retrying ${operationName}, attempt ${attempt}/${maxRetries}`);
                    }
                    return yield operation();
                }
                catch (error) {
                    lastError = error;
                    console.warn(`WorkerOrchestrator: ${operationName} failed, attempt ${attempt}/${maxRetries}:`, error);
                    // If this is the last attempt, don't wait
                    if (attempt === maxRetries) {
                        break;
                    }
                }
            }
            throw lastError;
        });
    }
    /**
     * Handle worker failures and implement circuit breaker
     */
    handleWorkerFailure() {
        this.workerFailureCount++;
        if (this.workerFailureCount >= this.maxWorkerFailures) {
            console.warn(`WorkerOrchestrator: Too many worker failures (${this.workerFailureCount}), disabling workers temporarily`);
            this.workersDisabled = true;
            this.metrics.fallbackToMainThread++;
            // Re-enable workers after 30 seconds
            setTimeout(() => {
                console.log("WorkerOrchestrator: Re-enabling workers after cooldown period");
                this.workersDisabled = false;
                this.workerFailureCount = 0;
            }, 30000);
        }
    }
    /**
     * Convert priority string to TaskWorkerManager priority enum
     */
    convertPriority(priority) {
        switch (priority) {
            case "high":
                return 0; // TaskPriority.HIGH
            case "normal":
                return 1; // TaskPriority.NORMAL
            case "low":
                return 2; // TaskPriority.LOW
            default:
                return 1;
        }
    }
    /**
     * Update running average for performance metrics
     */
    updateAverageTime(operation, duration) {
        const key = operation === "taskParsing"
            ? "averageTaskParsingTime"
            : "averageProjectDataTime";
        this.metrics.totalOperations++;
        // Calculate weighted average
        const currentAvg = this.metrics[key];
        const weight = Math.min(this.metrics.totalOperations, 100); // Limit weight to prevent stale averages
        this.metrics[key] = (currentAvg * (weight - 1) + duration) / weight;
    }
    /**
     * Update worker processing enabled state
     * Allows dynamic enabling/disabling of worker processing without restart
     */
    setWorkerProcessingEnabled(enabled) {
        this.enableWorkerProcessing = enabled;
        if (!enabled) {
            console.log("WorkerOrchestrator: Worker processing disabled, will use main thread parsing");
        }
        else {
            console.log("WorkerOrchestrator: Worker processing enabled");
            // Reset circuit breaker if re-enabling
            if (this.workersDisabled &&
                this.workerFailureCount < this.maxWorkerFailures) {
                this.workersDisabled = false;
                this.workerFailureCount = 0;
                console.log("WorkerOrchestrator: Circuit breaker reset");
            }
        }
    }
    /**
     * Get current worker processing status
     */
    isWorkerProcessingEnabled() {
        return this.enableWorkerProcessing && !this.workersDisabled;
    }
    // Removed duplicate getMetrics() - using the more comprehensive one below
    /**
     * Fallback implementations for main thread processing
     */
    parseFileTasksMainThread(file) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            this.metrics.fallbackToMainThread++;
            console.warn(`WorkerOrchestrator: Falling back to main thread parsing for ${file.path}`);
            // Import and use ConfigurableTaskParser for fallback
            const extension = file.extension.toLowerCase();
            const tasks = [];
            if (extension === "md") {
                // Get necessary data
                const vault = this.taskWorkerManager.vault;
                const metadataCache = this.taskWorkerManager.metadataCache;
                const content = yield vault.cachedRead(file);
                const fileCache = metadataCache.getFileCache(file);
                const fileMetadata = (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) || {};
                // Create parser with complete settings including metadataParseMode
                // Also inject projectConfig so fallback path can determine tgProject from metadataKey/frontmatter
                const workerSettings = (_a = this.taskWorkerManager.options) === null || _a === void 0 ? void 0 : _a.settings;
                const parser = new ConfigurableTaskParser({
                    parseMetadata: true,
                    parseTags: true,
                    parseComments: true,
                    parseHeadings: true,
                    metadataParseMode: MetadataParseMode.Both,
                    maxIndentSize: 8,
                    maxParseIterations: 4000,
                    maxMetadataIterations: 400,
                    maxTagLength: 100,
                    maxEmojiValueLength: 200,
                    maxStackOperations: 4000,
                    maxStackSize: 1000,
                    statusMapping: {},
                    emojiMapping: {
                        "📅": "dueDate",
                        "🛫": "startDate",
                        "⏳": "scheduledDate",
                        "✅": "completedDate",
                        "❌": "cancelledDate",
                        "➕": "createdDate",
                        "🔁": "recurrence",
                        "🏁": "onCompletion",
                        "⛔": "dependsOn",
                        "🆔": "id",
                        "🔺": "priority",
                        "⏫": "priority",
                        "🔼": "priority",
                        "🔽": "priority",
                        "⏬": "priority",
                    },
                    specialTagPrefixes: {},
                    projectConfig: ((_b = workerSettings === null || workerSettings === void 0 ? void 0 : workerSettings.projectConfig) === null || _b === void 0 ? void 0 : _b.enableEnhancedProject)
                        ? workerSettings.projectConfig
                        : undefined,
                });
                // Parse tasks - raw extraction only, no project enhancement
                // Project data will be handled by Augmentor per dataflow architecture
                const markdownTasks = parser.parseLegacy(content, file.path, fileMetadata, undefined, // No project config in fallback
                undefined // No tgProject in fallback
                );
                tasks.push(...markdownTasks);
            }
            else if (extension === "canvas") {
                // For canvas files, we need plugin instance
                console.warn(`WorkerOrchestrator: Canvas parsing requires plugin instance, returning empty`);
            }
            return tasks;
        });
    }
    batchParseMainThread(files) {
        return __awaiter(this, void 0, void 0, function* () {
            this.metrics.fallbackToMainThread++;
            const results = new Map();
            // Process files sequentially on main thread
            for (const file of files) {
                try {
                    const tasks = yield this.parseFileTasksMainThread(file);
                    results.set(file.path, tasks);
                }
                catch (error) {
                    console.error(`Main thread parsing failed for ${file.path}:`, error);
                    results.set(file.path, []);
                }
            }
            return results;
        });
    }
    computeProjectDataMainThread(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.metrics.fallbackToMainThread++;
            console.warn(`WorkerOrchestrator: Main thread project data computation not implemented for ${filePath}`);
            return null;
        });
    }
    batchComputeMainThread(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            this.metrics.fallbackToMainThread++;
            const results = new Map();
            // Process files sequentially on main thread
            for (const filePath of filePaths) {
                try {
                    const data = yield this.computeProjectDataMainThread(filePath);
                    if (data) {
                        results.set(filePath, data);
                    }
                }
                catch (error) {
                    console.error(`Main thread project data computation failed for ${filePath}:`, error);
                }
            }
            return results;
        });
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        const totalTasks = this.metrics.taskParsingSuccess + this.metrics.taskParsingFailures;
        const totalProjects = this.metrics.projectDataSuccess + this.metrics.projectDataFailures;
        return Object.assign(Object.assign({}, this.metrics), { taskParsingSuccessRate: totalTasks > 0
                ? this.metrics.taskParsingSuccess / totalTasks
                : 0, projectDataSuccessRate: totalProjects > 0
                ? this.metrics.projectDataSuccess / totalProjects
                : 0, workersEnabled: !this.workersDisabled, workerFailureCount: this.workerFailureCount, taskWorkerStats: this.taskWorkerManager.getStats(), projectWorkerStats: this.projectWorkerManager.getMemoryStats() });
    }
    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            taskParsingSuccess: 0,
            taskParsingFailures: 0,
            projectDataSuccess: 0,
            projectDataFailures: 0,
            averageTaskParsingTime: 0,
            averageProjectDataTime: 0,
            totalOperations: 0,
            fallbackToMainThread: 0,
        };
    }
    /**
     * Force enable/disable workers (for testing or configuration)
     */
    setWorkersEnabled(enabled) {
        this.workersDisabled = !enabled;
        if (enabled) {
            this.workerFailureCount = 0;
        }
    }
    /**
     * Check if a batch operation is currently in progress
     */
    isBatchProcessing() {
        return (this.taskWorkerManager.isProcessingBatchTask() ||
            this.projectWorkerManager.isWorkersEnabled());
    }
    /**
     * Get current queue sizes for monitoring
     */
    getQueueStats() {
        return {
            taskQueueSize: this.taskWorkerManager.getPendingTaskCount(),
            taskBatchProgress: this.taskWorkerManager.getBatchProgress(),
            projectMemoryStats: this.projectWorkerManager.getMemoryStats(),
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.taskWorkerManager.onunload();
        this.projectWorkerManager.destroy();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2VyT3JjaGVzdHJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV29ya2VyT3JjaGVzdHJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFLQSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVoRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBNEI5QixZQUNDLGlCQUFvQyxFQUNwQyxvQkFBOEMsRUFDOUMsT0FBOEM7O1FBM0IvQyxzQkFBc0I7UUFDZCxZQUFPLEdBQUc7WUFDakIsa0JBQWtCLEVBQUUsQ0FBQztZQUNyQixtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGtCQUFrQixFQUFFLENBQUM7WUFDckIsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QixzQkFBc0IsRUFBRSxDQUFDO1lBQ3pCLHNCQUFzQixFQUFFLENBQUM7WUFDekIsZUFBZSxFQUFFLENBQUM7WUFDbEIsb0JBQW9CLEVBQUUsQ0FBQztTQUN2QixDQUFDO1FBRUYsc0JBQXNCO1FBQ0wsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUNmLGlCQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMscUNBQXFDO1FBRTNFLHNDQUFzQztRQUM5Qix1QkFBa0IsR0FBRyxDQUFDLENBQUM7UUFDZCxzQkFBaUIsR0FBRyxFQUFFLENBQUM7UUFDaEMsb0JBQWUsR0FBRyxLQUFLLENBQUM7UUFFaEMsd0JBQXdCO1FBQ2hCLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQU9yQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO1FBQ2pELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxNQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxzQkFBc0IsbUNBQUksSUFBSSxDQUFDO0lBQ3ZF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QUNoQyxJQUFJLE9BQU8sRUFBRTtZQUNaLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUM7U0FDNUI7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxpQkFBaUI7UUFDaEIsT0FBTyxDQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRTtZQUM5QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsQ0FDNUMsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWE7UUFDWixPQUFPO1lBQ04sYUFBYSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzRCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUQsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRTtTQUM5RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSB7IFRhc2sgfSBmcm9tIFwiLi4vLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgdHlwZSB7IENhY2hlZFByb2plY3REYXRhIH0gZnJvbSBcIi4uLy4uL2NhY2hlL3Byb2plY3QtZGF0YS1jYWNoZVwiO1xyXG5pbXBvcnQgeyBUYXNrV29ya2VyTWFuYWdlciwgREVGQVVMVF9XT1JLRVJfT1BUSU9OUyB9IGZyb20gXCIuL1Rhc2tXb3JrZXJNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFByb2plY3REYXRhV29ya2VyTWFuYWdlciB9IGZyb20gXCIuL1Byb2plY3REYXRhV29ya2VyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBNZXRhZGF0YVBhcnNlTW9kZSB9IGZyb20gXCIuLi8uLi90eXBlcy9UYXNrUGFyc2VyQ29uZmlnXCI7XHJcbmltcG9ydCB7IENvbmZpZ3VyYWJsZVRhc2tQYXJzZXIgfSBmcm9tIFwiQC9kYXRhZmxvdy9jb3JlL0NvbmZpZ3VyYWJsZVRhc2tQYXJzZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBXb3JrZXJPcmNoZXN0cmF0b3IgLSBVbmlmaWVkIHRhc2sgYW5kIHByb2plY3Qgd29ya2VyIG1hbmFnZW1lbnRcclxuICpcclxuICogVGhpcyBjb21wb25lbnQgcHJvdmlkZXMgYSB1bmlmaWVkIGludGVyZmFjZSBmb3IgY29vcmRpbmF0aW5nIGJvdGggdGFzayBwYXJzaW5nXHJcbiAqIGFuZCBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb24gd29ya2Vycy4gSXQgaW1wbGVtZW50czpcclxuICogLSBDb25jdXJyZW50IGNvbnRyb2wgYW5kIGxvYWQgYmFsYW5jaW5nXHJcbiAqIC0gUmV0cnkgbWVjaGFuaXNtcyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICogLSBQZXJmb3JtYW5jZSBtZXRyaWNzIGFuZCBtb25pdG9yaW5nXHJcbiAqIC0gRmFsbGJhY2sgdG8gbWFpbiB0aHJlYWQgcHJvY2Vzc2luZ1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdvcmtlck9yY2hlc3RyYXRvciB7XHJcblx0cHJpdmF0ZSB0YXNrV29ya2VyTWFuYWdlcjogVGFza1dvcmtlck1hbmFnZXI7XHJcblx0cHJpdmF0ZSBwcm9qZWN0V29ya2VyTWFuYWdlcjogUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyO1xyXG5cclxuXHQvLyBQZXJmb3JtYW5jZSBtZXRyaWNzXHJcblx0cHJpdmF0ZSBtZXRyaWNzID0ge1xyXG5cdFx0dGFza1BhcnNpbmdTdWNjZXNzOiAwLFxyXG5cdFx0dGFza1BhcnNpbmdGYWlsdXJlczogMCxcclxuXHRcdHByb2plY3REYXRhU3VjY2VzczogMCxcclxuXHRcdHByb2plY3REYXRhRmFpbHVyZXM6IDAsXHJcblx0XHRhdmVyYWdlVGFza1BhcnNpbmdUaW1lOiAwLFxyXG5cdFx0YXZlcmFnZVByb2plY3REYXRhVGltZTogMCxcclxuXHRcdHRvdGFsT3BlcmF0aW9uczogMCxcclxuXHRcdGZhbGxiYWNrVG9NYWluVGhyZWFkOiAwLFxyXG5cdH07XHJcblxyXG5cdC8vIFJldHJ5IGNvbmZpZ3VyYXRpb25cclxuXHRwcml2YXRlIHJlYWRvbmx5IG1heFJldHJpZXMgPSAzO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgcmV0cnlEZWxheU1zID0gMTAwMDsgLy8gQmFzZSBkZWxheSBmb3IgZXhwb25lbnRpYWwgYmFja29mZlxyXG5cclxuXHQvLyBDaXJjdWl0IGJyZWFrZXIgZm9yIHdvcmtlciBmYWlsdXJlc1xyXG5cdHByaXZhdGUgd29ya2VyRmFpbHVyZUNvdW50ID0gMDtcclxuXHRwcml2YXRlIHJlYWRvbmx5IG1heFdvcmtlckZhaWx1cmVzID0gMTA7XHJcblx0cHJpdmF0ZSB3b3JrZXJzRGlzYWJsZWQgPSBmYWxzZTtcclxuXHJcblx0Ly8gQ29uZmlndXJhdGlvbiBvcHRpb25zXHJcblx0cHJpdmF0ZSBlbmFibGVXb3JrZXJQcm9jZXNzaW5nID0gdHJ1ZTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHR0YXNrV29ya2VyTWFuYWdlcjogVGFza1dvcmtlck1hbmFnZXIsXHJcblx0XHRwcm9qZWN0V29ya2VyTWFuYWdlcjogUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLFxyXG5cdFx0b3B0aW9ucz86IHsgZW5hYmxlV29ya2VyUHJvY2Vzc2luZz86IGJvb2xlYW4gfVxyXG5cdCkge1xyXG5cdFx0dGhpcy50YXNrV29ya2VyTWFuYWdlciA9IHRhc2tXb3JrZXJNYW5hZ2VyO1xyXG5cdFx0dGhpcy5wcm9qZWN0V29ya2VyTWFuYWdlciA9IHByb2plY3RXb3JrZXJNYW5hZ2VyO1xyXG5cdFx0dGhpcy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID0gb3B0aW9ucz8uZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA/PyB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGFza3MgZnJvbSBhIGZpbGUgdXNpbmcgd29ya2VycyB3aXRoIGZhbGxiYWNrXHJcblx0ICovXHJcblx0YXN5bmMgcGFyc2VGaWxlVGFza3MoXHJcblx0XHRmaWxlOiBURmlsZSxcclxuXHRcdHByaW9yaXR5OiBcImhpZ2hcIiB8IFwibm9ybWFsXCIgfCBcImxvd1wiID0gXCJub3JtYWxcIlxyXG5cdCk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHdvcmtlcnMgYXJlIGVuYWJsZWQgYW5kIGF2YWlsYWJsZVxyXG5cdFx0XHRpZiAoIXRoaXMuZW5hYmxlV29ya2VyUHJvY2Vzc2luZyB8fCB0aGlzLndvcmtlcnNEaXNhYmxlZCkge1xyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLnBhcnNlRmlsZVRhc2tzTWFpblRocmVhZChmaWxlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdGFza1ByaW9yaXR5ID0gdGhpcy5jb252ZXJ0UHJpb3JpdHkocHJpb3JpdHkpO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHRoaXMucmV0cnlPcGVyYXRpb24oXHJcblx0XHRcdFx0KCkgPT4gdGhpcy50YXNrV29ya2VyTWFuYWdlci5wcm9jZXNzRmlsZShmaWxlLCB0YXNrUHJpb3JpdHkpLFxyXG5cdFx0XHRcdGBwYXJzZUZpbGVUYXNrczoke2ZpbGUucGF0aH1gLFxyXG5cdFx0XHRcdHRoaXMubWF4UmV0cmllc1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIG1ldHJpY3NcclxuXHRcdFx0dGhpcy5tZXRyaWNzLnRhc2tQYXJzaW5nU3VjY2VzcysrO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUF2ZXJhZ2VUaW1lKFwidGFza1BhcnNpbmdcIiwgRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdGFza3M7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBXb3JrZXJPcmNoZXN0cmF0b3I6IEZhaWxlZCB0byBwYXJzZSBmaWxlICR7ZmlsZS5wYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgZmFpbHVyZSBtZXRyaWNzXHJcblx0XHRcdHRoaXMubWV0cmljcy50YXNrUGFyc2luZ0ZhaWx1cmVzKys7XHJcblx0XHRcdHRoaXMuaGFuZGxlV29ya2VyRmFpbHVyZSgpO1xyXG5cclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gbWFpbiB0aHJlYWRcclxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMucGFyc2VGaWxlVGFza3NNYWluVGhyZWFkKGZpbGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgbXVsdGlwbGUgZmlsZXMgaW4gYmF0Y2ggd2l0aCBpbnRlbGxpZ2VudCBkaXN0cmlidXRpb25cclxuXHQgKi9cclxuXHRhc3luYyBiYXRjaFBhcnNlKFxyXG5cdFx0ZmlsZXM6IFRGaWxlW10sXHJcblx0XHRwcmlvcml0eTogXCJoaWdoXCIgfCBcIm5vcm1hbFwiIHwgXCJsb3dcIiA9IFwibm9ybWFsXCJcclxuXHQpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFRhc2tbXT4+IHtcclxuXHRcdGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCF0aGlzLmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgfHxcclxuXHRcdFx0XHR0aGlzLndvcmtlcnNEaXNhYmxlZCB8fFxyXG5cdFx0XHRcdGZpbGVzLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5iYXRjaFBhcnNlTWFpblRocmVhZChmaWxlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHRhc2tQcmlvcml0eSA9IHRoaXMuY29udmVydFByaW9yaXR5KHByaW9yaXR5KTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMucmV0cnlPcGVyYXRpb24oXHJcblx0XHRcdFx0KCkgPT4gdGhpcy50YXNrV29ya2VyTWFuYWdlci5wcm9jZXNzQmF0Y2goZmlsZXMsIHRhc2tQcmlvcml0eSksXHJcblx0XHRcdFx0YGJhdGNoUGFyc2U6JHtmaWxlcy5sZW5ndGh9ZmlsZXNgLFxyXG5cdFx0XHRcdHRoaXMubWF4UmV0cmllc1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIG1ldHJpY3NcclxuXHRcdFx0dGhpcy5tZXRyaWNzLnRhc2tQYXJzaW5nU3VjY2VzcyArPSBmaWxlcy5sZW5ndGg7XHJcblx0XHRcdHRoaXMudXBkYXRlQXZlcmFnZVRpbWUoXCJ0YXNrUGFyc2luZ1wiLCBEYXRlLm5vdygpIC0gc3RhcnRUaW1lKTtcclxuXHJcblx0XHRcdHJldHVybiByZXN1bHRzO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRgV29ya2VyT3JjaGVzdHJhdG9yOiBGYWlsZWQgdG8gYmF0Y2ggcGFyc2UgJHtmaWxlcy5sZW5ndGh9IGZpbGVzOmAsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBmYWlsdXJlIG1ldHJpY3NcclxuXHRcdFx0dGhpcy5tZXRyaWNzLnRhc2tQYXJzaW5nRmFpbHVyZXMgKz0gZmlsZXMubGVuZ3RoO1xyXG5cdFx0XHR0aGlzLmhhbmRsZVdvcmtlckZhaWx1cmUoKTtcclxuXHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIG1haW4gdGhyZWFkXHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmJhdGNoUGFyc2VNYWluVGhyZWFkKGZpbGVzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGUgcHJvamVjdCBkYXRhIGZvciBhIGZpbGUgdXNpbmcgd29ya2VycyB3aXRoIGZhbGxiYWNrXHJcblx0ICovXHJcblx0YXN5bmMgY29tcHV0ZVByb2plY3REYXRhKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8Q2FjaGVkUHJvamVjdERhdGEgfCBudWxsPiB7XHJcblx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGlmICh0aGlzLndvcmtlcnNEaXNhYmxlZCkge1xyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNvbXB1dGVQcm9qZWN0RGF0YU1haW5UaHJlYWQoZmlsZVBhdGgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBwcm9qZWN0RGF0YSA9IGF3YWl0IHRoaXMucmV0cnlPcGVyYXRpb24oXHJcblx0XHRcdFx0KCkgPT4gdGhpcy5wcm9qZWN0V29ya2VyTWFuYWdlci5nZXRQcm9qZWN0RGF0YShmaWxlUGF0aCksXHJcblx0XHRcdFx0YGNvbXB1dGVQcm9qZWN0RGF0YToke2ZpbGVQYXRofWAsXHJcblx0XHRcdFx0dGhpcy5tYXhSZXRyaWVzXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgbWV0cmljc1xyXG5cdFx0XHR0aGlzLm1ldHJpY3MucHJvamVjdERhdGFTdWNjZXNzKys7XHJcblx0XHRcdHRoaXMudXBkYXRlQXZlcmFnZVRpbWUoXCJwcm9qZWN0RGF0YVwiLCBEYXRlLm5vdygpIC0gc3RhcnRUaW1lKTtcclxuXHJcblx0XHRcdHJldHVybiBwcm9qZWN0RGF0YTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0YFdvcmtlck9yY2hlc3RyYXRvcjogRmFpbGVkIHRvIGNvbXB1dGUgcHJvamVjdCBkYXRhIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgZmFpbHVyZSBtZXRyaWNzXHJcblx0XHRcdHRoaXMubWV0cmljcy5wcm9qZWN0RGF0YUZhaWx1cmVzKys7XHJcblx0XHRcdHRoaXMuaGFuZGxlV29ya2VyRmFpbHVyZSgpO1xyXG5cclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gbWFpbiB0aHJlYWRcclxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuY29tcHV0ZVByb2plY3REYXRhTWFpblRocmVhZChmaWxlUGF0aCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb21wdXRlIHByb2plY3QgZGF0YSBmb3IgbXVsdGlwbGUgZmlsZXMgaW4gYmF0Y2hcclxuXHQgKi9cclxuXHRhc3luYyBiYXRjaENvbXB1dGUoXHJcblx0XHRmaWxlUGF0aHM6IHN0cmluZ1tdXHJcblx0KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4+IHtcclxuXHRcdGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKHRoaXMud29ya2Vyc0Rpc2FibGVkIHx8IGZpbGVQYXRocy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5iYXRjaENvbXB1dGVNYWluVGhyZWFkKGZpbGVQYXRocyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLnJldHJ5T3BlcmF0aW9uKFxyXG5cdFx0XHRcdCgpID0+IHRoaXMucHJvamVjdFdvcmtlck1hbmFnZXIuZ2V0QmF0Y2hQcm9qZWN0RGF0YShmaWxlUGF0aHMpLFxyXG5cdFx0XHRcdGBiYXRjaENvbXB1dGU6JHtmaWxlUGF0aHMubGVuZ3RofWZpbGVzYCxcclxuXHRcdFx0XHR0aGlzLm1heFJldHJpZXNcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBtZXRyaWNzXHJcblx0XHRcdHRoaXMubWV0cmljcy5wcm9qZWN0RGF0YVN1Y2Nlc3MgKz0gZmlsZVBhdGhzLmxlbmd0aDtcclxuXHRcdFx0dGhpcy51cGRhdGVBdmVyYWdlVGltZShcInByb2plY3REYXRhXCIsIERhdGUubm93KCkgLSBzdGFydFRpbWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBXb3JrZXJPcmNoZXN0cmF0b3I6IEZhaWxlZCB0byBiYXRjaCBjb21wdXRlICR7ZmlsZVBhdGhzLmxlbmd0aH0gZmlsZXM6YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGZhaWx1cmUgbWV0cmljc1xyXG5cdFx0XHR0aGlzLm1ldHJpY3MucHJvamVjdERhdGFGYWlsdXJlcyArPSBmaWxlUGF0aHMubGVuZ3RoO1xyXG5cdFx0XHR0aGlzLmhhbmRsZVdvcmtlckZhaWx1cmUoKTtcclxuXHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIG1haW4gdGhyZWFkXHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmJhdGNoQ29tcHV0ZU1haW5UaHJlYWQoZmlsZVBhdGhzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyaWMgcmV0cnkgbWVjaGFuaXNtIHdpdGggZXhwb25lbnRpYWwgYmFja29mZlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcmV0cnlPcGVyYXRpb248VD4oXHJcblx0XHRvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXHJcblx0XHRvcGVyYXRpb25OYW1lOiBzdHJpbmcsXHJcblx0XHRtYXhSZXRyaWVzOiBudW1iZXJcclxuXHQpOiBQcm9taXNlPFQ+IHtcclxuXHRcdGxldCBsYXN0RXJyb3I6IEVycm9yO1xyXG5cclxuXHRcdGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IG1heFJldHJpZXM7IGF0dGVtcHQrKykge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGlmIChhdHRlbXB0ID4gMCkge1xyXG5cdFx0XHRcdFx0Ly8gRXhwb25lbnRpYWwgYmFja29mZjogd2FpdCAxcywgMnMsIDRzLCBldGMuXHJcblx0XHRcdFx0XHRjb25zdCBkZWxheSA9IHRoaXMucmV0cnlEZWxheU1zICogTWF0aC5wb3coMiwgYXR0ZW1wdCAtIDEpO1xyXG5cdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZGVsYXkpKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgV29ya2VyT3JjaGVzdHJhdG9yOiBSZXRyeWluZyAke29wZXJhdGlvbk5hbWV9LCBhdHRlbXB0ICR7YXR0ZW1wdH0vJHttYXhSZXRyaWVzfWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gYXdhaXQgb3BlcmF0aW9uKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0bGFzdEVycm9yID0gZXJyb3IgYXMgRXJyb3I7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YFdvcmtlck9yY2hlc3RyYXRvcjogJHtvcGVyYXRpb25OYW1lfSBmYWlsZWQsIGF0dGVtcHQgJHthdHRlbXB0fS8ke21heFJldHJpZXN9OmAsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgdGhlIGxhc3QgYXR0ZW1wdCwgZG9uJ3Qgd2FpdFxyXG5cdFx0XHRcdGlmIChhdHRlbXB0ID09PSBtYXhSZXRyaWVzKSB7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aHJvdyBsYXN0RXJyb3IhO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHdvcmtlciBmYWlsdXJlcyBhbmQgaW1wbGVtZW50IGNpcmN1aXQgYnJlYWtlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlV29ya2VyRmFpbHVyZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMud29ya2VyRmFpbHVyZUNvdW50Kys7XHJcblxyXG5cdFx0aWYgKHRoaXMud29ya2VyRmFpbHVyZUNvdW50ID49IHRoaXMubWF4V29ya2VyRmFpbHVyZXMpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBXb3JrZXJPcmNoZXN0cmF0b3I6IFRvbyBtYW55IHdvcmtlciBmYWlsdXJlcyAoJHt0aGlzLndvcmtlckZhaWx1cmVDb3VudH0pLCBkaXNhYmxpbmcgd29ya2VycyB0ZW1wb3JhcmlseWBcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy53b3JrZXJzRGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLm1ldHJpY3MuZmFsbGJhY2tUb01haW5UaHJlYWQrKztcclxuXHJcblx0XHRcdC8vIFJlLWVuYWJsZSB3b3JrZXJzIGFmdGVyIDMwIHNlY29uZHNcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIldvcmtlck9yY2hlc3RyYXRvcjogUmUtZW5hYmxpbmcgd29ya2VycyBhZnRlciBjb29sZG93biBwZXJpb2RcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy53b3JrZXJzRGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLndvcmtlckZhaWx1cmVDb3VudCA9IDA7XHJcblx0XHRcdH0sIDMwMDAwKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgcHJpb3JpdHkgc3RyaW5nIHRvIFRhc2tXb3JrZXJNYW5hZ2VyIHByaW9yaXR5IGVudW1cclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbnZlcnRQcmlvcml0eShwcmlvcml0eTogXCJoaWdoXCIgfCBcIm5vcm1hbFwiIHwgXCJsb3dcIik6IG51bWJlciB7XHJcblx0XHRzd2l0Y2ggKHByaW9yaXR5KSB7XHJcblx0XHRcdGNhc2UgXCJoaWdoXCI6XHJcblx0XHRcdFx0cmV0dXJuIDA7IC8vIFRhc2tQcmlvcml0eS5ISUdIXHJcblx0XHRcdGNhc2UgXCJub3JtYWxcIjpcclxuXHRcdFx0XHRyZXR1cm4gMTsgLy8gVGFza1ByaW9yaXR5Lk5PUk1BTFxyXG5cdFx0XHRjYXNlIFwibG93XCI6XHJcblx0XHRcdFx0cmV0dXJuIDI7IC8vIFRhc2tQcmlvcml0eS5MT1dcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBydW5uaW5nIGF2ZXJhZ2UgZm9yIHBlcmZvcm1hbmNlIG1ldHJpY3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZUF2ZXJhZ2VUaW1lKFxyXG5cdFx0b3BlcmF0aW9uOiBcInRhc2tQYXJzaW5nXCIgfCBcInByb2plY3REYXRhXCIsXHJcblx0XHRkdXJhdGlvbjogbnVtYmVyXHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBrZXkgPVxyXG5cdFx0XHRvcGVyYXRpb24gPT09IFwidGFza1BhcnNpbmdcIlxyXG5cdFx0XHRcdD8gXCJhdmVyYWdlVGFza1BhcnNpbmdUaW1lXCJcclxuXHRcdFx0XHQ6IFwiYXZlcmFnZVByb2plY3REYXRhVGltZVwiO1xyXG5cdFx0dGhpcy5tZXRyaWNzLnRvdGFsT3BlcmF0aW9ucysrO1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSB3ZWlnaHRlZCBhdmVyYWdlXHJcblx0XHRjb25zdCBjdXJyZW50QXZnID0gdGhpcy5tZXRyaWNzW2tleV07XHJcblx0XHRjb25zdCB3ZWlnaHQgPSBNYXRoLm1pbih0aGlzLm1ldHJpY3MudG90YWxPcGVyYXRpb25zLCAxMDApOyAvLyBMaW1pdCB3ZWlnaHQgdG8gcHJldmVudCBzdGFsZSBhdmVyYWdlc1xyXG5cdFx0dGhpcy5tZXRyaWNzW2tleV0gPSAoY3VycmVudEF2ZyAqICh3ZWlnaHQgLSAxKSArIGR1cmF0aW9uKSAvIHdlaWdodDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB3b3JrZXIgcHJvY2Vzc2luZyBlbmFibGVkIHN0YXRlXHJcblx0ICogQWxsb3dzIGR5bmFtaWMgZW5hYmxpbmcvZGlzYWJsaW5nIG9mIHdvcmtlciBwcm9jZXNzaW5nIHdpdGhvdXQgcmVzdGFydFxyXG5cdCAqL1xyXG5cdHNldFdvcmtlclByb2Nlc3NpbmdFbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdHRoaXMuZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA9IGVuYWJsZWQ7XHJcblx0XHRpZiAoIWVuYWJsZWQpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJXb3JrZXJPcmNoZXN0cmF0b3I6IFdvcmtlciBwcm9jZXNzaW5nIGRpc2FibGVkLCB3aWxsIHVzZSBtYWluIHRocmVhZCBwYXJzaW5nXCJcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiV29ya2VyT3JjaGVzdHJhdG9yOiBXb3JrZXIgcHJvY2Vzc2luZyBlbmFibGVkXCIpO1xyXG5cdFx0XHQvLyBSZXNldCBjaXJjdWl0IGJyZWFrZXIgaWYgcmUtZW5hYmxpbmdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMud29ya2Vyc0Rpc2FibGVkICYmXHJcblx0XHRcdFx0dGhpcy53b3JrZXJGYWlsdXJlQ291bnQgPCB0aGlzLm1heFdvcmtlckZhaWx1cmVzXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMud29ya2Vyc0Rpc2FibGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy53b3JrZXJGYWlsdXJlQ291bnQgPSAwO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiV29ya2VyT3JjaGVzdHJhdG9yOiBDaXJjdWl0IGJyZWFrZXIgcmVzZXRcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IHdvcmtlciBwcm9jZXNzaW5nIHN0YXR1c1xyXG5cdCAqL1xyXG5cdGlzV29ya2VyUHJvY2Vzc2luZ0VuYWJsZWQoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nICYmICF0aGlzLndvcmtlcnNEaXNhYmxlZDtcclxuXHR9XHJcblxyXG5cdC8vIFJlbW92ZWQgZHVwbGljYXRlIGdldE1ldHJpY3MoKSAtIHVzaW5nIHRoZSBtb3JlIGNvbXByZWhlbnNpdmUgb25lIGJlbG93XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9ucyBmb3IgbWFpbiB0aHJlYWQgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcGFyc2VGaWxlVGFza3NNYWluVGhyZWFkKGZpbGU6IFRGaWxlKTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdHRoaXMubWV0cmljcy5mYWxsYmFja1RvTWFpblRocmVhZCsrO1xyXG5cdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRgV29ya2VyT3JjaGVzdHJhdG9yOiBGYWxsaW5nIGJhY2sgdG8gbWFpbiB0aHJlYWQgcGFyc2luZyBmb3IgJHtmaWxlLnBhdGh9YFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBJbXBvcnQgYW5kIHVzZSBDb25maWd1cmFibGVUYXNrUGFyc2VyIGZvciBmYWxsYmFja1xyXG5cclxuXHJcblx0XHRjb25zdCBleHRlbnNpb24gPSBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdGlmIChleHRlbnNpb24gPT09IFwibWRcIikge1xyXG5cdFx0XHQvLyBHZXQgbmVjZXNzYXJ5IGRhdGFcclxuXHRcdFx0Y29uc3QgdmF1bHQgPSAodGhpcy50YXNrV29ya2VyTWFuYWdlciBhcyBhbnkpLnZhdWx0O1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YUNhY2hlID0gKHRoaXMudGFza1dvcmtlck1hbmFnZXIgYXMgYW55KS5tZXRhZGF0YUNhY2hlO1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc3QgZmlsZUNhY2hlID0gbWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IGZpbGVDYWNoZT8uZnJvbnRtYXR0ZXIgfHwge307XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgcGFyc2VyIHdpdGggY29tcGxldGUgc2V0dGluZ3MgaW5jbHVkaW5nIG1ldGFkYXRhUGFyc2VNb2RlXHJcblx0XHRcdC8vIEFsc28gaW5qZWN0IHByb2plY3RDb25maWcgc28gZmFsbGJhY2sgcGF0aCBjYW4gZGV0ZXJtaW5lIHRnUHJvamVjdCBmcm9tIG1ldGFkYXRhS2V5L2Zyb250bWF0dGVyXHJcblx0XHRcdGNvbnN0IHdvcmtlclNldHRpbmdzOiBhbnkgPSAodGhpcy50YXNrV29ya2VyTWFuYWdlciBhcyBhbnkpLm9wdGlvbnNcclxuXHRcdFx0XHQ/LnNldHRpbmdzO1xyXG5cdFx0XHRjb25zdCBwYXJzZXIgPSBuZXcgQ29uZmlndXJhYmxlVGFza1BhcnNlcih7XHJcblx0XHRcdFx0cGFyc2VNZXRhZGF0YTogdHJ1ZSxcclxuXHRcdFx0XHRwYXJzZVRhZ3M6IHRydWUsXHJcblx0XHRcdFx0cGFyc2VDb21tZW50czogdHJ1ZSxcclxuXHRcdFx0XHRwYXJzZUhlYWRpbmdzOiB0cnVlLFxyXG5cdFx0XHRcdG1ldGFkYXRhUGFyc2VNb2RlOiBNZXRhZGF0YVBhcnNlTW9kZS5Cb3RoLCAvLyBQYXJzZSBib3RoIGVtb2ppIGFuZCBkYXRhdmlldyBtZXRhZGF0YVxyXG5cdFx0XHRcdG1heEluZGVudFNpemU6IDgsXHJcblx0XHRcdFx0bWF4UGFyc2VJdGVyYXRpb25zOiA0MDAwLFxyXG5cdFx0XHRcdG1heE1ldGFkYXRhSXRlcmF0aW9uczogNDAwLFxyXG5cdFx0XHRcdG1heFRhZ0xlbmd0aDogMTAwLFxyXG5cdFx0XHRcdG1heEVtb2ppVmFsdWVMZW5ndGg6IDIwMCxcclxuXHRcdFx0XHRtYXhTdGFja09wZXJhdGlvbnM6IDQwMDAsXHJcblx0XHRcdFx0bWF4U3RhY2tTaXplOiAxMDAwLFxyXG5cdFx0XHRcdHN0YXR1c01hcHBpbmc6IHt9LFxyXG5cdFx0XHRcdGVtb2ppTWFwcGluZzoge1xyXG5cdFx0XHRcdFx0XCLwn5OFXCI6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XCLwn5urXCI6IFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFx0XHRcIuKPs1wiOiBcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XHRcdFwi4pyFXCI6IFwiY29tcGxldGVkRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XCLinYxcIjogXCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdFx0XHRcIuKelVwiOiBcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRcdFx0XHRcIvCflIFcIjogXCJyZWN1cnJlbmNlXCIsXHJcblx0XHRcdFx0XHRcIvCfj4FcIjogXCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFwi4puUXCI6IFwiZGVwZW5kc09uXCIsXHJcblx0XHRcdFx0XHRcIvCfhpRcIjogXCJpZFwiLFxyXG5cdFx0XHRcdFx0XCLwn5S6XCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFwi4o+rXCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFwi8J+UvFwiOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcIvCflL1cIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XCLij6xcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0c3BlY2lhbFRhZ1ByZWZpeGVzOiB7fSxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB3b3JrZXJTZXR0aW5ncz8ucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0Py5lbmFibGVFbmhhbmNlZFByb2plY3RcclxuXHRcdFx0XHRcdD8gd29ya2VyU2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gUGFyc2UgdGFza3MgLSByYXcgZXh0cmFjdGlvbiBvbmx5LCBubyBwcm9qZWN0IGVuaGFuY2VtZW50XHJcblx0XHRcdC8vIFByb2plY3QgZGF0YSB3aWxsIGJlIGhhbmRsZWQgYnkgQXVnbWVudG9yIHBlciBkYXRhZmxvdyBhcmNoaXRlY3R1cmVcclxuXHRcdFx0Y29uc3QgbWFya2Rvd25UYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShcclxuXHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdGZpbGUucGF0aCxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGEsXHJcblx0XHRcdFx0dW5kZWZpbmVkLCAvLyBObyBwcm9qZWN0IGNvbmZpZyBpbiBmYWxsYmFja1xyXG5cdFx0XHRcdHVuZGVmaW5lZCAvLyBObyB0Z1Byb2plY3QgaW4gZmFsbGJhY2tcclxuXHRcdFx0KTtcclxuXHRcdFx0dGFza3MucHVzaCguLi5tYXJrZG93blRhc2tzKTtcclxuXHRcdH0gZWxzZSBpZiAoZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiKSB7XHJcblx0XHRcdC8vIEZvciBjYW52YXMgZmlsZXMsIHdlIG5lZWQgcGx1Z2luIGluc3RhbmNlXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgV29ya2VyT3JjaGVzdHJhdG9yOiBDYW52YXMgcGFyc2luZyByZXF1aXJlcyBwbHVnaW4gaW5zdGFuY2UsIHJldHVybmluZyBlbXB0eWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGFza3M7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGJhdGNoUGFyc2VNYWluVGhyZWFkKFxyXG5cdFx0ZmlsZXM6IFRGaWxlW11cclxuXHQpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFRhc2tbXT4+IHtcclxuXHRcdHRoaXMubWV0cmljcy5mYWxsYmFja1RvTWFpblRocmVhZCsrO1xyXG5cdFx0Y29uc3QgcmVzdWx0cyA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrW10+KCk7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBmaWxlcyBzZXF1ZW50aWFsbHkgb24gbWFpbiB0aHJlYWRcclxuXHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgdGhpcy5wYXJzZUZpbGVUYXNrc01haW5UaHJlYWQoZmlsZSk7XHJcblx0XHRcdFx0cmVzdWx0cy5zZXQoZmlsZS5wYXRoLCB0YXNrcyk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdGBNYWluIHRocmVhZCBwYXJzaW5nIGZhaWxlZCBmb3IgJHtmaWxlLnBhdGh9OmAsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmVzdWx0cy5zZXQoZmlsZS5wYXRoLCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0cztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgY29tcHV0ZVByb2plY3REYXRhTWFpblRocmVhZChcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPENhY2hlZFByb2plY3REYXRhIHwgbnVsbD4ge1xyXG5cdFx0dGhpcy5tZXRyaWNzLmZhbGxiYWNrVG9NYWluVGhyZWFkKys7XHJcblx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdGBXb3JrZXJPcmNoZXN0cmF0b3I6IE1haW4gdGhyZWFkIHByb2plY3QgZGF0YSBjb21wdXRhdGlvbiBub3QgaW1wbGVtZW50ZWQgZm9yICR7ZmlsZVBhdGh9YFxyXG5cdFx0KTtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBiYXRjaENvbXB1dGVNYWluVGhyZWFkKFxyXG5cdFx0ZmlsZVBhdGhzOiBzdHJpbmdbXVxyXG5cdCk6IFByb21pc2U8TWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+PiB7XHJcblx0XHR0aGlzLm1ldHJpY3MuZmFsbGJhY2tUb01haW5UaHJlYWQrKztcclxuXHRcdGNvbnN0IHJlc3VsdHMgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+KCk7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBmaWxlcyBzZXF1ZW50aWFsbHkgb24gbWFpbiB0aHJlYWRcclxuXHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgZmlsZVBhdGhzKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuY29tcHV0ZVByb2plY3REYXRhTWFpblRocmVhZChmaWxlUGF0aCk7XHJcblx0XHRcdFx0aWYgKGRhdGEpIHtcclxuXHRcdFx0XHRcdHJlc3VsdHMuc2V0KGZpbGVQYXRoLCBkYXRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdGBNYWluIHRocmVhZCBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb24gZmFpbGVkIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcGVyZm9ybWFuY2UgbWV0cmljc1xyXG5cdCAqL1xyXG5cdGdldE1ldHJpY3MoKTogYW55IHtcclxuXHRcdGNvbnN0IHRvdGFsVGFza3MgPVxyXG5cdFx0XHR0aGlzLm1ldHJpY3MudGFza1BhcnNpbmdTdWNjZXNzICsgdGhpcy5tZXRyaWNzLnRhc2tQYXJzaW5nRmFpbHVyZXM7XHJcblx0XHRjb25zdCB0b3RhbFByb2plY3RzID1cclxuXHRcdFx0dGhpcy5tZXRyaWNzLnByb2plY3REYXRhU3VjY2VzcyArIHRoaXMubWV0cmljcy5wcm9qZWN0RGF0YUZhaWx1cmVzO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdC4uLnRoaXMubWV0cmljcyxcclxuXHRcdFx0dGFza1BhcnNpbmdTdWNjZXNzUmF0ZTpcclxuXHRcdFx0XHR0b3RhbFRhc2tzID4gMFxyXG5cdFx0XHRcdFx0PyB0aGlzLm1ldHJpY3MudGFza1BhcnNpbmdTdWNjZXNzIC8gdG90YWxUYXNrc1xyXG5cdFx0XHRcdFx0OiAwLFxyXG5cdFx0XHRwcm9qZWN0RGF0YVN1Y2Nlc3NSYXRlOlxyXG5cdFx0XHRcdHRvdGFsUHJvamVjdHMgPiAwXHJcblx0XHRcdFx0XHQ/IHRoaXMubWV0cmljcy5wcm9qZWN0RGF0YVN1Y2Nlc3MgLyB0b3RhbFByb2plY3RzXHJcblx0XHRcdFx0XHQ6IDAsXHJcblx0XHRcdHdvcmtlcnNFbmFibGVkOiAhdGhpcy53b3JrZXJzRGlzYWJsZWQsXHJcblx0XHRcdHdvcmtlckZhaWx1cmVDb3VudDogdGhpcy53b3JrZXJGYWlsdXJlQ291bnQsXHJcblx0XHRcdHRhc2tXb3JrZXJTdGF0czogdGhpcy50YXNrV29ya2VyTWFuYWdlci5nZXRTdGF0cygpLFxyXG5cdFx0XHRwcm9qZWN0V29ya2VyU3RhdHM6IHRoaXMucHJvamVjdFdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXNldCBwZXJmb3JtYW5jZSBtZXRyaWNzXHJcblx0ICovXHJcblx0cmVzZXRNZXRyaWNzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5tZXRyaWNzID0ge1xyXG5cdFx0XHR0YXNrUGFyc2luZ1N1Y2Nlc3M6IDAsXHJcblx0XHRcdHRhc2tQYXJzaW5nRmFpbHVyZXM6IDAsXHJcblx0XHRcdHByb2plY3REYXRhU3VjY2VzczogMCxcclxuXHRcdFx0cHJvamVjdERhdGFGYWlsdXJlczogMCxcclxuXHRcdFx0YXZlcmFnZVRhc2tQYXJzaW5nVGltZTogMCxcclxuXHRcdFx0YXZlcmFnZVByb2plY3REYXRhVGltZTogMCxcclxuXHRcdFx0dG90YWxPcGVyYXRpb25zOiAwLFxyXG5cdFx0XHRmYWxsYmFja1RvTWFpblRocmVhZDogMCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JjZSBlbmFibGUvZGlzYWJsZSB3b3JrZXJzIChmb3IgdGVzdGluZyBvciBjb25maWd1cmF0aW9uKVxyXG5cdCAqL1xyXG5cdHNldFdvcmtlcnNFbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdHRoaXMud29ya2Vyc0Rpc2FibGVkID0gIWVuYWJsZWQ7XHJcblx0XHRpZiAoZW5hYmxlZCkge1xyXG5cdFx0XHR0aGlzLndvcmtlckZhaWx1cmVDb3VudCA9IDA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIGJhdGNoIG9wZXJhdGlvbiBpcyBjdXJyZW50bHkgaW4gcHJvZ3Jlc3NcclxuXHQgKi9cclxuXHRpc0JhdGNoUHJvY2Vzc2luZygpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdHRoaXMudGFza1dvcmtlck1hbmFnZXIuaXNQcm9jZXNzaW5nQmF0Y2hUYXNrKCkgfHxcclxuXHRcdFx0dGhpcy5wcm9qZWN0V29ya2VyTWFuYWdlci5pc1dvcmtlcnNFbmFibGVkKClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCBxdWV1ZSBzaXplcyBmb3IgbW9uaXRvcmluZ1xyXG5cdCAqL1xyXG5cdGdldFF1ZXVlU3RhdHMoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0YXNrUXVldWVTaXplOiB0aGlzLnRhc2tXb3JrZXJNYW5hZ2VyLmdldFBlbmRpbmdUYXNrQ291bnQoKSxcclxuXHRcdFx0dGFza0JhdGNoUHJvZ3Jlc3M6IHRoaXMudGFza1dvcmtlck1hbmFnZXIuZ2V0QmF0Y2hQcm9ncmVzcygpLFxyXG5cdFx0XHRwcm9qZWN0TWVtb3J5U3RhdHM6IHRoaXMucHJvamVjdFdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwIHJlc291cmNlc1xyXG5cdCAqL1xyXG5cdGRlc3Ryb3koKTogdm9pZCB7XHJcblx0XHR0aGlzLnRhc2tXb3JrZXJNYW5hZ2VyLm9udW5sb2FkKCk7XHJcblx0XHR0aGlzLnByb2plY3RXb3JrZXJNYW5hZ2VyLmRlc3Ryb3koKTtcclxuXHR9XHJcbn1cclxuIl19