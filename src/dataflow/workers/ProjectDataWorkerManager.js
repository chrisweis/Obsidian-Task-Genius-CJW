/**
 * Project Data Worker Manager
 *
 * Manages project data computation workers to avoid blocking the main thread
 * during startup and project data operations.
 */
import { __awaiter } from "tslib";
import { ProjectDataCache } from "@/cache/project-data-cache";
// @ts-ignore Ignore type error for worker import
import ProjectWorker from "./ProjectData.worker";
export class ProjectDataWorkerManager {
    constructor(options) {
        var _a;
        this.workers = [];
        this.requestId = 0;
        this.pendingRequests = new Map();
        // Worker round-robin index for load balancing
        this.currentWorkerIndex = 0;
        // Whether workers have been initialized to prevent multiple initialization
        this.initialized = false;
        this.vault = options.vault;
        this.metadataCache = options.metadataCache;
        this.projectConfigManager = options.projectConfigManager;
        // Reduced default worker count to minimize total indexer count
        // Use at most 2 workers, prefer 1 for most cases
        this.maxWorkers =
            options.maxWorkers ||
                Math.min(2, Math.max(1, Math.floor(navigator.hardwareConcurrency / 4)));
        this.enableWorkers = (_a = options.enableWorkers) !== null && _a !== void 0 ? _a : true;
        this.cache = new ProjectDataCache(this.vault, this.metadataCache, this.projectConfigManager);
        this.initializeWorkers();
    }
    /**
     * Initialize worker pool
     */
    initializeWorkers() {
        // Prevent multiple initialization
        if (this.initialized) {
            console.log("ProjectDataWorkerManager: Workers already initialized, skipping initialization");
            return;
        }
        if (!this.enableWorkers) {
            console.log("ProjectDataWorkerManager: Workers disabled, using cache-only optimization");
            return;
        }
        // Ensure any existing workers are cleaned up first
        if (this.workers.length > 0) {
            console.log("ProjectDataWorkerManager: Cleaning up existing workers before re-initialization");
            this.cleanupWorkers();
        }
        try {
            console.log(`ProjectDataWorkerManager: Initializing ${this.maxWorkers} workers`);
            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = new ProjectWorker();
                worker.onmessage = (event) => {
                    this.handleWorkerMessage(event.data);
                };
                worker.onerror = (error) => {
                    console.error(`Worker ${i} error:`, error);
                };
                this.workers.push(worker);
            }
            // Send initial configuration to all workers
            this.updateWorkerConfig();
            this.initialized = true;
            console.log(`ProjectDataWorkerManager: Successfully initialized ${this.workers.length} workers`);
        }
        catch (error) {
            console.warn("ProjectDataWorkerManager: Failed to initialize workers, falling back to synchronous processing", error);
            this.enableWorkers = false;
            this.workers = [];
        }
    }
    /**
     * Update worker configuration when settings change
     */
    updateWorkerConfig() {
        if (!this.enableWorkers || this.workers.length === 0) {
            return;
        }
        const config = this.projectConfigManager.getWorkerConfig();
        const configMessage = {
            type: "updateConfig",
            requestId: this.generateRequestId(),
            config,
        };
        // Send configuration to all workers
        for (const worker of this.workers) {
            try {
                worker.postMessage(configMessage);
            }
            catch (error) {
                console.warn("Failed to update worker config:", error);
            }
        }
        console.log("ProjectDataWorkerManager: Updated worker configuration");
    }
    /**
     * Get project data for a single file (uses cache first, then worker if needed)
     */
    getProjectData(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try cache first
            const cached = yield this.cache.getProjectData(filePath);
            if (cached) {
                return cached;
            }
            // Use worker if available, otherwise fallback to synchronous computation
            if (this.enableWorkers && this.workers.length > 0) {
                return yield this.computeProjectDataWithWorker(filePath);
            }
            else {
                return yield this.computeProjectDataSync(filePath);
            }
        });
    }
    /**
     * Get project data for multiple files with batch optimization
     */
    getBatchProjectData(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectConfigManager.isEnhancedProjectEnabled()) {
                return new Map();
            }
            // Use cache first for batch operation
            const cacheResult = yield this.cache.getBatchProjectData(filePaths);
            // Find files that weren't in cache
            const missingPaths = filePaths.filter((path) => !cacheResult.has(path));
            if (missingPaths.length > 0) {
                // Compute missing data using workers or fallback
                let workerResults;
                if (this.enableWorkers && this.workers.length > 0) {
                    workerResults = yield this.computeBatchProjectDataWithWorkers(missingPaths);
                }
                else {
                    workerResults = yield this.computeBatchProjectDataSync(missingPaths);
                }
                // Merge results
                for (const [path, data] of workerResults) {
                    cacheResult.set(path, data);
                }
            }
            return cacheResult;
        });
    }
    /**
     * Compute project data using worker
     */
    computeProjectDataWithWorker(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileMetadata = yield this.projectConfigManager.getFileMetadata(filePath);
                const configData = yield this.projectConfigManager.getProjectConfigData(filePath);
                const worker = this.getNextWorker();
                const requestId = this.generateRequestId();
                const message = {
                    type: "computeProjectData",
                    requestId,
                    filePath,
                    fileMetadata: fileMetadata || {},
                    configData: configData || {},
                };
                const response = yield this.sendWorkerMessage(worker, message);
                if (response.success && response.data) {
                    const projectData = {
                        tgProject: response.data.tgProject,
                        enhancedMetadata: response.data.enhancedMetadata,
                        timestamp: response.data.timestamp,
                    };
                    // Cache the result
                    yield this.cache.setProjectData(filePath, projectData);
                    return projectData;
                }
                else {
                    throw new Error(response.error || "Worker computation failed");
                }
            }
            catch (error) {
                console.warn(`Failed to compute project data with worker for ${filePath}:`, error);
                // Fallback to synchronous computation
                return yield this.computeProjectDataSync(filePath);
            }
        });
    }
    /**
     * Compute project data for multiple files using workers
     */
    computeBatchProjectDataWithWorkers(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = new Map();
            if (filePaths.length === 0) {
                return result;
            }
            console.log(`ProjectDataWorkerManager: Computing project data for ${filePaths.length} files using ${this.workers.length} workers`);
            try {
                // Prepare file data for workers
                const files = yield Promise.all(filePaths.map((filePath) => __awaiter(this, void 0, void 0, function* () {
                    const fileMetadata = yield this.projectConfigManager.getFileMetadata(filePath);
                    const configData = yield this.projectConfigManager.getProjectConfigData(filePath);
                    return {
                        filePath,
                        fileMetadata: fileMetadata || {},
                        configData: configData || {},
                    };
                })));
                // Distribute files across workers
                const filesPerWorker = Math.ceil(files.length / this.workers.length);
                const workerPromises = [];
                for (let i = 0; i < this.workers.length; i++) {
                    const startIndex = i * filesPerWorker;
                    const endIndex = Math.min(startIndex + filesPerWorker, files.length);
                    const workerFiles = files.slice(startIndex, endIndex);
                    if (workerFiles.length > 0) {
                        workerPromises.push(this.sendBatchRequestToWorker(i, workerFiles));
                    }
                }
                // Wait for all workers to complete
                const workerResults = yield Promise.all(workerPromises);
                // Process results
                for (const batchResults of workerResults) {
                    for (const response of batchResults) {
                        if (!response.error) {
                            const projectData = {
                                tgProject: response.tgProject,
                                enhancedMetadata: response.enhancedMetadata,
                                timestamp: response.timestamp,
                            };
                            result.set(response.filePath, projectData);
                            // Cache the result
                            yield this.cache.setProjectData(response.filePath, projectData);
                        }
                        else {
                            console.warn(`Worker failed to process ${response.filePath}:`, response.error);
                        }
                    }
                }
                console.log(`ProjectDataWorkerManager: Successfully processed ${result.size}/${filePaths.length} files with workers`);
            }
            catch (error) {
                console.warn("Failed to compute batch project data with workers:", error);
                // Fallback to synchronous computation
                return yield this.computeBatchProjectDataSync(filePaths);
            }
            return result;
        });
    }
    /**
     * Send batch request to a specific worker
     */
    sendBatchRequestToWorker(workerIndex, files) {
        return __awaiter(this, void 0, void 0, function* () {
            const worker = this.workers[workerIndex];
            const requestId = this.generateRequestId();
            const message = {
                type: "computeBatchProjectData",
                requestId,
                files,
            };
            const response = yield this.sendWorkerMessage(worker, message);
            if (response.success && response.data) {
                return response.data;
            }
            else {
                throw new Error(response.error || "Batch worker computation failed");
            }
        });
    }
    /**
     * Send message to worker and wait for response
     */
    sendWorkerMessage(worker, message) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingRequests.delete(message.requestId);
                    reject(new Error("Worker request timeout"));
                }, 30000); // 30 second timeout
                this.pendingRequests.set(message.requestId, {
                    resolve: (response) => {
                        clearTimeout(timeout);
                        resolve(response);
                    },
                    reject: (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    },
                });
                try {
                    worker.postMessage(message);
                }
                catch (error) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(message.requestId);
                    reject(error);
                }
            });
        });
    }
    /**
     * Get next worker for round-robin load balancing
     */
    getNextWorker() {
        if (this.workers.length === 0) {
            throw new Error("No workers available");
        }
        const worker = this.workers[this.currentWorkerIndex];
        this.currentWorkerIndex =
            (this.currentWorkerIndex + 1) % this.workers.length;
        return worker;
    }
    /**
     * Compute project data for multiple files using synchronous fallback
     */
    computeBatchProjectDataSync(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = new Map();
            console.log(`ProjectDataWorkerManager: Computing project data for ${filePaths.length} files using fallback method`);
            // Process files in parallel using Promise.all for better performance than sequential
            const dataPromises = filePaths.map((filePath) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const data = yield this.computeProjectDataSync(filePath);
                    return { filePath, data };
                }
                catch (error) {
                    console.warn(`Failed to compute project data for ${filePath}:`, error);
                    return { filePath, data: null };
                }
            }));
            const results = yield Promise.all(dataPromises);
            for (const { filePath, data } of results) {
                if (data) {
                    result.set(filePath, data);
                }
            }
            return result;
        });
    }
    /**
     * Compute project data synchronously (fallback)
     */
    computeProjectDataSync(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tgProject = yield this.projectConfigManager.determineTgProject(filePath);
                const enhancedMetadata = yield this.projectConfigManager.getEnhancedMetadata(filePath);
                const data = {
                    tgProject,
                    enhancedMetadata,
                    timestamp: Date.now(),
                };
                // Cache the result
                yield this.cache.setProjectData(filePath, data);
                return data;
            }
            catch (error) {
                console.warn(`Failed to compute project data for ${filePath}:`, error);
                return null;
            }
        });
    }
    /**
     * Handle worker messages
     */
    handleWorkerMessage(message) {
        const pendingRequest = this.pendingRequests.get(message.requestId);
        if (!pendingRequest) {
            return;
        }
        this.pendingRequests.delete(message.requestId);
        if (message.success) {
            pendingRequest.resolve(message);
        }
        else {
            pendingRequest.reject(new Error(message.error || "Unknown worker error"));
        }
    }
    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${++this.requestId}_${Date.now()}`;
    }
    /**
     * Clear cache
     */
    clearCache(filePath) {
        this.cache.clearCache(filePath);
        // Also clear ProjectConfigManager cache to ensure consistency
        this.projectConfigManager.clearCache(filePath);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Handle setting changes
     */
    onSettingsChange() {
        this.updateWorkerConfig();
        this.cache.clearCache(); // Clear cache when settings change
    }
    /**
     * Handle enhanced project setting change
     */
    onEnhancedProjectSettingChange(enabled) {
        this.cache.onEnhancedProjectSettingChange(enabled);
        // Reinitialize workers if needed
        if (enabled && this.enableWorkers && this.workers.length === 0) {
            this.initializeWorkers();
        }
    }
    /**
     * Enable or disable workers
     */
    setWorkersEnabled(enabled) {
        if (this.enableWorkers === enabled) {
            return;
        }
        this.enableWorkers = enabled;
        if (enabled) {
            this.initializeWorkers();
        }
        else {
            this.destroy();
        }
    }
    /**
     * Check if workers are enabled and available
     */
    isWorkersEnabled() {
        return this.enableWorkers && this.workers.length > 0;
    }
    /**
     * Preload project data for files (optimization for startup)
     */
    preloadProjectData(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            if (filePaths.length === 0) {
                return;
            }
            // Use batch processing for efficiency
            yield this.getBatchProjectData(filePaths);
        });
    }
    /**
     * Handle file modification for incremental updates
     */
    onFileModified(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.onFileModified(filePath);
        });
    }
    /**
     * Handle file deletion
     */
    onFileDeleted(filePath) {
        this.cache.onFileDeleted(filePath);
    }
    /**
     * Handle file creation
     */
    onFileCreated(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.onFileCreated(filePath);
        });
    }
    /**
     * Handle file rename/move
     */
    onFileRenamed(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.onFileRenamed(oldPath, newPath);
        });
    }
    /**
     * Refresh stale cache entries periodically
     */
    refreshStaleEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.refreshStaleEntries();
        });
    }
    /**
     * Preload data for recently accessed files
     */
    preloadRecentFiles(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.preloadRecentFiles(filePaths);
        });
    }
    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        var _a, _b;
        return {
            fileCacheSize: ((_a = this.cache.fileCache) === null || _a === void 0 ? void 0 : _a.size) || 0,
            directoryCacheSize: ((_b = this.cache.directoryCache) === null || _b === void 0 ? void 0 : _b.size) || 0,
            pendingRequests: this.pendingRequests.size,
            activeWorkers: this.workers.length,
            workersEnabled: this.enableWorkers,
        };
    }
    /**
     * Clean up existing workers without destroying the manager
     */
    cleanupWorkers() {
        // Terminate all workers
        for (const worker of this.workers) {
            try {
                worker.terminate();
            }
            catch (error) {
                console.warn("Error terminating worker:", error);
            }
        }
        this.workers = [];
        // Clear pending requests
        for (const { reject } of this.pendingRequests.values()) {
            reject(new Error("Workers being reinitialized"));
        }
        this.pendingRequests.clear();
        console.log("ProjectDataWorkerManager: Cleaned up existing workers");
    }
    /**
     * Cleanup resources
     */
    destroy() {
        // Clean up workers
        this.cleanupWorkers();
        // Reset initialization flag
        this.initialized = false;
        console.log("ProjectDataWorkerManager: Destroyed");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQUlILE9BQU8sRUFBRSxnQkFBZ0IsRUFBcUIsTUFBTSw0QkFBNEIsQ0FBQztBQVNqRixpREFBaUQ7QUFDakQsT0FBTyxhQUFhLE1BQU0sc0JBQXNCLENBQUM7QUFVakQsTUFBTSxPQUFPLHdCQUF3QjtJQXVCcEMsWUFBWSxPQUF3Qzs7UUFqQjVDLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFHdkIsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBTTlCLENBQUM7UUFFSiw4Q0FBOEM7UUFDdEMsdUJBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLDJFQUEyRTtRQUNuRSxnQkFBVyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzNDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUM7UUFDekQsK0RBQStEO1FBQy9ELGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsVUFBVTtZQUNkLE9BQU8sQ0FBQyxVQUFVO2dCQUNsQixJQUFJLENBQUMsR0FBRyxDQUNQLENBQUMsRUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUMxRCxDQUFDO1FBQ0gsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFBLE9BQU8sQ0FBQyxhQUFhLG1DQUFJLElBQUksQ0FBQztRQUVuRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQ2hDLElB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SUFBSTtnQkFDSCxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7YUFDbkI7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2pEO1NBQ0Q7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVsQix5QkFBeUI7UUFDekIsS0FBSyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN2RCxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU3QixPQUFPLENBQUMsR0FBRyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXpCLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUHJvamVjdCBEYXRhIFdvcmtlciBNYW5hZ2VyXHJcbiAqXHJcbiAqIE1hbmFnZXMgcHJvamVjdCBkYXRhIGNvbXB1dGF0aW9uIHdvcmtlcnMgdG8gYXZvaWQgYmxvY2tpbmcgdGhlIG1haW4gdGhyZWFkXHJcbiAqIGR1cmluZyBzdGFydHVwIGFuZCBwcm9qZWN0IGRhdGEgb3BlcmF0aW9ucy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBWYXVsdCwgTWV0YWRhdGFDYWNoZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0Q29uZmlnTWFuYWdlciB9IGZyb20gXCJAL21hbmFnZXJzL3Byb2plY3QtY29uZmlnLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgUHJvamVjdERhdGFDYWNoZSwgQ2FjaGVkUHJvamVjdERhdGEgfSBmcm9tIFwiQC9jYWNoZS9wcm9qZWN0LWRhdGEtY2FjaGVcIjtcclxuaW1wb3J0IHtcclxuXHRQcm9qZWN0RGF0YVJlc3BvbnNlLFxyXG5cdFdvcmtlclJlc3BvbnNlLFxyXG5cdFVwZGF0ZUNvbmZpZ01lc3NhZ2UsXHJcblx0UHJvamVjdERhdGFNZXNzYWdlLFxyXG5cdEJhdGNoUHJvamVjdERhdGFNZXNzYWdlLFxyXG59IGZyb20gXCIuL3Rhc2staW5kZXgtbWVzc2FnZVwiO1xyXG5cclxuLy8gQHRzLWlnbm9yZSBJZ25vcmUgdHlwZSBlcnJvciBmb3Igd29ya2VyIGltcG9ydFxyXG5pbXBvcnQgUHJvamVjdFdvcmtlciBmcm9tIFwiLi9Qcm9qZWN0RGF0YS53b3JrZXJcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyT3B0aW9ucyB7XHJcblx0dmF1bHQ6IFZhdWx0O1xyXG5cdG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XHJcblx0cHJvamVjdENvbmZpZ01hbmFnZXI6IFByb2plY3RDb25maWdNYW5hZ2VyO1xyXG5cdG1heFdvcmtlcnM/OiBudW1iZXI7XHJcblx0ZW5hYmxlV29ya2Vycz86IGJvb2xlYW47IC8vIEFkZCBvcHRpb24gdG8gZW5hYmxlL2Rpc2FibGUgd29ya2Vyc1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyIHtcclxuXHRwcml2YXRlIHZhdWx0OiBWYXVsdDtcclxuXHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XHJcblx0cHJpdmF0ZSBwcm9qZWN0Q29uZmlnTWFuYWdlcjogUHJvamVjdENvbmZpZ01hbmFnZXI7XHJcblx0cHJpdmF0ZSBjYWNoZTogUHJvamVjdERhdGFDYWNoZTtcclxuXHJcblx0cHJpdmF0ZSB3b3JrZXJzOiBXb3JrZXJbXSA9IFtdO1xyXG5cdHByaXZhdGUgbWF4V29ya2VyczogbnVtYmVyO1xyXG5cdHByaXZhdGUgZW5hYmxlV29ya2VyczogYm9vbGVhbjtcclxuXHRwcml2YXRlIHJlcXVlc3RJZCA9IDA7XHJcblx0cHJpdmF0ZSBwZW5kaW5nUmVxdWVzdHMgPSBuZXcgTWFwPFxyXG5cdFx0c3RyaW5nLFxyXG5cdFx0e1xyXG5cdFx0XHRyZXNvbHZlOiAodmFsdWU6IGFueSkgPT4gdm9pZDtcclxuXHRcdFx0cmVqZWN0OiAoZXJyb3I6IGFueSkgPT4gdm9pZDtcclxuXHRcdH1cclxuXHQ+KCk7XHJcblxyXG5cdC8vIFdvcmtlciByb3VuZC1yb2JpbiBpbmRleCBmb3IgbG9hZCBiYWxhbmNpbmdcclxuXHRwcml2YXRlIGN1cnJlbnRXb3JrZXJJbmRleCA9IDA7XHJcblx0Ly8gV2hldGhlciB3b3JrZXJzIGhhdmUgYmVlbiBpbml0aWFsaXplZCB0byBwcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9uXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zOiBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXJPcHRpb25zKSB7XHJcblx0XHR0aGlzLnZhdWx0ID0gb3B0aW9ucy52YXVsdDtcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IG9wdGlvbnMubWV0YWRhdGFDYWNoZTtcclxuXHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIgPSBvcHRpb25zLnByb2plY3RDb25maWdNYW5hZ2VyO1xyXG5cdFx0Ly8gUmVkdWNlZCBkZWZhdWx0IHdvcmtlciBjb3VudCB0byBtaW5pbWl6ZSB0b3RhbCBpbmRleGVyIGNvdW50XHJcblx0XHQvLyBVc2UgYXQgbW9zdCAyIHdvcmtlcnMsIHByZWZlciAxIGZvciBtb3N0IGNhc2VzXHJcblx0XHR0aGlzLm1heFdvcmtlcnMgPVxyXG5cdFx0XHRvcHRpb25zLm1heFdvcmtlcnMgfHxcclxuXHRcdFx0TWF0aC5taW4oXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRNYXRoLm1heCgxLCBNYXRoLmZsb29yKG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IC8gNCkpXHJcblx0XHRcdCk7XHJcblx0XHR0aGlzLmVuYWJsZVdvcmtlcnMgPSBvcHRpb25zLmVuYWJsZVdvcmtlcnMgPz8gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLmNhY2hlID0gbmV3IFByb2plY3REYXRhQ2FjaGUoXHJcblx0XHRcdHRoaXMudmF1bHQsXHJcblx0XHRcdHRoaXMubWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlclxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLmluaXRpYWxpemVXb3JrZXJzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHdvcmtlciBwb29sXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplV29ya2VycygpOiB2b2lkIHtcclxuXHRcdC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25cclxuXHRcdGlmICh0aGlzLmluaXRpYWxpemVkKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBXb3JrZXJzIGFscmVhZHkgaW5pdGlhbGl6ZWQsIHNraXBwaW5nIGluaXRpYWxpemF0aW9uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGhpcy5lbmFibGVXb3JrZXJzKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBXb3JrZXJzIGRpc2FibGVkLCB1c2luZyBjYWNoZS1vbmx5IG9wdGltaXphdGlvblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgYW55IGV4aXN0aW5nIHdvcmtlcnMgYXJlIGNsZWFuZWQgdXAgZmlyc3RcclxuXHRcdGlmICh0aGlzLndvcmtlcnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIlByb2plY3REYXRhV29ya2VyTWFuYWdlcjogQ2xlYW5pbmcgdXAgZXhpc3Rpbmcgd29ya2VycyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb25cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmNsZWFudXBXb3JrZXJzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFByb2plY3REYXRhV29ya2VyTWFuYWdlcjogSW5pdGlhbGl6aW5nICR7dGhpcy5tYXhXb3JrZXJzfSB3b3JrZXJzYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm1heFdvcmtlcnM7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IHdvcmtlciA9IG5ldyBQcm9qZWN0V29ya2VyKCk7XHJcblxyXG5cdFx0XHRcdHdvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVXb3JrZXJNZXNzYWdlKGV2ZW50LmRhdGEpO1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHdvcmtlci5vbmVycm9yID0gKGVycm9yOiBFcnJvckV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGBXb3JrZXIgJHtpfSBlcnJvcjpgLCBlcnJvcik7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy53b3JrZXJzLnB1c2god29ya2VyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2VuZCBpbml0aWFsIGNvbmZpZ3VyYXRpb24gdG8gYWxsIHdvcmtlcnNcclxuXHRcdFx0dGhpcy51cGRhdGVXb3JrZXJDb25maWcoKTtcclxuXHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBTdWNjZXNzZnVsbHkgaW5pdGlhbGl6ZWQgJHt0aGlzLndvcmtlcnMubGVuZ3RofSB3b3JrZXJzYFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBGYWlsZWQgdG8gaW5pdGlhbGl6ZSB3b3JrZXJzLCBmYWxsaW5nIGJhY2sgdG8gc3luY2hyb25vdXMgcHJvY2Vzc2luZ1wiLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuZW5hYmxlV29ya2VycyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLndvcmtlcnMgPSBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB3b3JrZXIgY29uZmlndXJhdGlvbiB3aGVuIHNldHRpbmdzIGNoYW5nZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlV29ya2VyQ29uZmlnKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmVuYWJsZVdvcmtlcnMgfHwgdGhpcy53b3JrZXJzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRXb3JrZXJDb25maWcoKTtcclxuXHJcblx0XHRjb25zdCBjb25maWdNZXNzYWdlOiBVcGRhdGVDb25maWdNZXNzYWdlID0ge1xyXG5cdFx0XHR0eXBlOiBcInVwZGF0ZUNvbmZpZ1wiLFxyXG5cdFx0XHRyZXF1ZXN0SWQ6IHRoaXMuZ2VuZXJhdGVSZXF1ZXN0SWQoKSxcclxuXHRcdFx0Y29uZmlnLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBTZW5kIGNvbmZpZ3VyYXRpb24gdG8gYWxsIHdvcmtlcnNcclxuXHRcdGZvciAoY29uc3Qgd29ya2VyIG9mIHRoaXMud29ya2Vycykge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHdvcmtlci5wb3N0TWVzc2FnZShjb25maWdNZXNzYWdlKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gdXBkYXRlIHdvcmtlciBjb25maWc6XCIsIGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBVcGRhdGVkIHdvcmtlciBjb25maWd1cmF0aW9uXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHByb2plY3QgZGF0YSBmb3IgYSBzaW5nbGUgZmlsZSAodXNlcyBjYWNoZSBmaXJzdCwgdGhlbiB3b3JrZXIgaWYgbmVlZGVkKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFByb2plY3REYXRhKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPENhY2hlZFByb2plY3REYXRhIHwgbnVsbD4ge1xyXG5cdFx0Ly8gVHJ5IGNhY2hlIGZpcnN0XHJcblx0XHRjb25zdCBjYWNoZWQgPSBhd2FpdCB0aGlzLmNhY2hlLmdldFByb2plY3REYXRhKGZpbGVQYXRoKTtcclxuXHRcdGlmIChjYWNoZWQpIHtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2Ugd29ya2VyIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGZhbGxiYWNrIHRvIHN5bmNocm9ub3VzIGNvbXB1dGF0aW9uXHJcblx0XHRpZiAodGhpcy5lbmFibGVXb3JrZXJzICYmIHRoaXMud29ya2Vycy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNvbXB1dGVQcm9qZWN0RGF0YVdpdGhXb3JrZXIoZmlsZVBhdGgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuY29tcHV0ZVByb2plY3REYXRhU3luYyhmaWxlUGF0aCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcHJvamVjdCBkYXRhIGZvciBtdWx0aXBsZSBmaWxlcyB3aXRoIGJhdGNoIG9wdGltaXphdGlvblxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldEJhdGNoUHJvamVjdERhdGEoXHJcblx0XHRmaWxlUGF0aHM6IHN0cmluZ1tdXHJcblx0KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4+IHtcclxuXHRcdGlmICghdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKSkge1xyXG5cdFx0XHRyZXR1cm4gbmV3IE1hcCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSBjYWNoZSBmaXJzdCBmb3IgYmF0Y2ggb3BlcmF0aW9uXHJcblx0XHRjb25zdCBjYWNoZVJlc3VsdCA9IGF3YWl0IHRoaXMuY2FjaGUuZ2V0QmF0Y2hQcm9qZWN0RGF0YShmaWxlUGF0aHMpO1xyXG5cclxuXHRcdC8vIEZpbmQgZmlsZXMgdGhhdCB3ZXJlbid0IGluIGNhY2hlXHJcblx0XHRjb25zdCBtaXNzaW5nUGF0aHMgPSBmaWxlUGF0aHMuZmlsdGVyKChwYXRoKSA9PiAhY2FjaGVSZXN1bHQuaGFzKHBhdGgpKTtcclxuXHJcblx0XHRpZiAobWlzc2luZ1BhdGhzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gQ29tcHV0ZSBtaXNzaW5nIGRhdGEgdXNpbmcgd29ya2VycyBvciBmYWxsYmFja1xyXG5cdFx0XHRsZXQgd29ya2VyUmVzdWx0czogTWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+O1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuZW5hYmxlV29ya2VycyAmJiB0aGlzLndvcmtlcnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHdvcmtlclJlc3VsdHMgPSBhd2FpdCB0aGlzLmNvbXB1dGVCYXRjaFByb2plY3REYXRhV2l0aFdvcmtlcnMoXHJcblx0XHRcdFx0XHRtaXNzaW5nUGF0aHNcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdvcmtlclJlc3VsdHMgPSBhd2FpdCB0aGlzLmNvbXB1dGVCYXRjaFByb2plY3REYXRhU3luYyhcclxuXHRcdFx0XHRcdG1pc3NpbmdQYXRoc1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE1lcmdlIHJlc3VsdHNcclxuXHRcdFx0Zm9yIChjb25zdCBbcGF0aCwgZGF0YV0gb2Ygd29ya2VyUmVzdWx0cykge1xyXG5cdFx0XHRcdGNhY2hlUmVzdWx0LnNldChwYXRoLCBkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjYWNoZVJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGUgcHJvamVjdCBkYXRhIHVzaW5nIHdvcmtlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgY29tcHV0ZVByb2plY3REYXRhV2l0aFdvcmtlcihcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPENhY2hlZFByb2plY3REYXRhIHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGNvbnN0IGNvbmZpZ0RhdGEgPVxyXG5cdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0UHJvamVjdENvbmZpZ0RhdGEoZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0Y29uc3Qgd29ya2VyID0gdGhpcy5nZXROZXh0V29ya2VyKCk7XHJcblx0XHRcdGNvbnN0IHJlcXVlc3RJZCA9IHRoaXMuZ2VuZXJhdGVSZXF1ZXN0SWQoKTtcclxuXHJcblx0XHRcdGNvbnN0IG1lc3NhZ2U6IFByb2plY3REYXRhTWVzc2FnZSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcImNvbXB1dGVQcm9qZWN0RGF0YVwiLFxyXG5cdFx0XHRcdHJlcXVlc3RJZCxcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGE6IGZpbGVNZXRhZGF0YSB8fCB7fSxcclxuXHRcdFx0XHRjb25maWdEYXRhOiBjb25maWdEYXRhIHx8IHt9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnNlbmRXb3JrZXJNZXNzYWdlKHdvcmtlciwgbWVzc2FnZSk7XHJcblxyXG5cdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdERhdGE6IENhY2hlZFByb2plY3REYXRhID0ge1xyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiByZXNwb25zZS5kYXRhLnRnUHJvamVjdCxcclxuXHRcdFx0XHRcdGVuaGFuY2VkTWV0YWRhdGE6IHJlc3BvbnNlLmRhdGEuZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHRcdHRpbWVzdGFtcDogcmVzcG9uc2UuZGF0YS50aW1lc3RhbXAsXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gQ2FjaGUgdGhlIHJlc3VsdFxyXG5cdFx0XHRcdGF3YWl0IHRoaXMuY2FjaGUuc2V0UHJvamVjdERhdGEoZmlsZVBhdGgsIHByb2plY3REYXRhKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHByb2plY3REYXRhO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXNwb25zZS5lcnJvciB8fCBcIldvcmtlciBjb21wdXRhdGlvbiBmYWlsZWRcIik7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgRmFpbGVkIHRvIGNvbXB1dGUgcHJvamVjdCBkYXRhIHdpdGggd29ya2VyIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIHN5bmNocm9ub3VzIGNvbXB1dGF0aW9uXHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNvbXB1dGVQcm9qZWN0RGF0YVN5bmMoZmlsZVBhdGgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZSBwcm9qZWN0IGRhdGEgZm9yIG11bHRpcGxlIGZpbGVzIHVzaW5nIHdvcmtlcnNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGNvbXB1dGVCYXRjaFByb2plY3REYXRhV2l0aFdvcmtlcnMoXHJcblx0XHRmaWxlUGF0aHM6IHN0cmluZ1tdXHJcblx0KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4+IHtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4oKTtcclxuXHJcblx0XHRpZiAoZmlsZVBhdGhzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyOiBDb21wdXRpbmcgcHJvamVjdCBkYXRhIGZvciAke2ZpbGVQYXRocy5sZW5ndGh9IGZpbGVzIHVzaW5nICR7dGhpcy53b3JrZXJzLmxlbmd0aH0gd29ya2Vyc2BcclxuXHRcdCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gUHJlcGFyZSBmaWxlIGRhdGEgZm9yIHdvcmtlcnNcclxuXHRcdFx0Y29uc3QgZmlsZXMgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuXHRcdFx0XHRmaWxlUGF0aHMubWFwKGFzeW5jIChmaWxlUGF0aCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID1cclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbmZpZ0RhdGEgPVxyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmdldFByb2plY3RDb25maWdEYXRhKFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXRoXHJcblx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YTogZmlsZU1ldGFkYXRhIHx8IHt9LFxyXG5cdFx0XHRcdFx0XHRjb25maWdEYXRhOiBjb25maWdEYXRhIHx8IHt9LFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gRGlzdHJpYnV0ZSBmaWxlcyBhY3Jvc3Mgd29ya2Vyc1xyXG5cdFx0XHRjb25zdCBmaWxlc1BlcldvcmtlciA9IE1hdGguY2VpbChcclxuXHRcdFx0XHRmaWxlcy5sZW5ndGggLyB0aGlzLndvcmtlcnMubGVuZ3RoXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHdvcmtlclByb21pc2VzOiBQcm9taXNlPFByb2plY3REYXRhUmVzcG9uc2VbXT5bXSA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLndvcmtlcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCBzdGFydEluZGV4ID0gaSAqIGZpbGVzUGVyV29ya2VyO1xyXG5cdFx0XHRcdGNvbnN0IGVuZEluZGV4ID0gTWF0aC5taW4oXHJcblx0XHRcdFx0XHRzdGFydEluZGV4ICsgZmlsZXNQZXJXb3JrZXIsXHJcblx0XHRcdFx0XHRmaWxlcy5sZW5ndGhcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IHdvcmtlckZpbGVzID0gZmlsZXMuc2xpY2Uoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xyXG5cclxuXHRcdFx0XHRpZiAod29ya2VyRmlsZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0d29ya2VyUHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0dGhpcy5zZW5kQmF0Y2hSZXF1ZXN0VG9Xb3JrZXIoaSwgd29ya2VyRmlsZXMpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV2FpdCBmb3IgYWxsIHdvcmtlcnMgdG8gY29tcGxldGVcclxuXHRcdFx0Y29uc3Qgd29ya2VyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHdvcmtlclByb21pc2VzKTtcclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgcmVzdWx0c1xyXG5cdFx0XHRmb3IgKGNvbnN0IGJhdGNoUmVzdWx0cyBvZiB3b3JrZXJSZXN1bHRzKSB7XHJcblx0XHRcdFx0Zm9yIChjb25zdCByZXNwb25zZSBvZiBiYXRjaFJlc3VsdHMpIHtcclxuXHRcdFx0XHRcdGlmICghcmVzcG9uc2UuZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJvamVjdERhdGE6IENhY2hlZFByb2plY3REYXRhID0ge1xyXG5cdFx0XHRcdFx0XHRcdHRnUHJvamVjdDogcmVzcG9uc2UudGdQcm9qZWN0LFxyXG5cdFx0XHRcdFx0XHRcdGVuaGFuY2VkTWV0YWRhdGE6IHJlc3BvbnNlLmVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFx0dGltZXN0YW1wOiByZXNwb25zZS50aW1lc3RhbXAsXHJcblx0XHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0XHRyZXN1bHQuc2V0KHJlc3BvbnNlLmZpbGVQYXRoLCBwcm9qZWN0RGF0YSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBDYWNoZSB0aGUgcmVzdWx0XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuY2FjaGUuc2V0UHJvamVjdERhdGEoXHJcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvamVjdERhdGFcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRgV29ya2VyIGZhaWxlZCB0byBwcm9jZXNzICR7cmVzcG9uc2UuZmlsZVBhdGh9OmAsXHJcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZXJyb3JcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI6IFN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQgJHtyZXN1bHQuc2l6ZX0vJHtmaWxlUGF0aHMubGVuZ3RofSBmaWxlcyB3aXRoIHdvcmtlcnNgXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJGYWlsZWQgdG8gY29tcHV0ZSBiYXRjaCBwcm9qZWN0IGRhdGEgd2l0aCB3b3JrZXJzOlwiLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIHN5bmNocm9ub3VzIGNvbXB1dGF0aW9uXHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNvbXB1dGVCYXRjaFByb2plY3REYXRhU3luYyhmaWxlUGF0aHMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZW5kIGJhdGNoIHJlcXVlc3QgdG8gYSBzcGVjaWZpYyB3b3JrZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHNlbmRCYXRjaFJlcXVlc3RUb1dvcmtlcihcclxuXHRcdHdvcmtlckluZGV4OiBudW1iZXIsXHJcblx0XHRmaWxlczogYW55W11cclxuXHQpOiBQcm9taXNlPFByb2plY3REYXRhUmVzcG9uc2VbXT4ge1xyXG5cdFx0Y29uc3Qgd29ya2VyID0gdGhpcy53b3JrZXJzW3dvcmtlckluZGV4XTtcclxuXHRcdGNvbnN0IHJlcXVlc3RJZCA9IHRoaXMuZ2VuZXJhdGVSZXF1ZXN0SWQoKTtcclxuXHJcblx0XHRjb25zdCBtZXNzYWdlOiBCYXRjaFByb2plY3REYXRhTWVzc2FnZSA9IHtcclxuXHRcdFx0dHlwZTogXCJjb21wdXRlQmF0Y2hQcm9qZWN0RGF0YVwiLFxyXG5cdFx0XHRyZXF1ZXN0SWQsXHJcblx0XHRcdGZpbGVzLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2VuZFdvcmtlck1lc3NhZ2Uod29ya2VyLCBtZXNzYWdlKTtcclxuXHJcblx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XHJcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFxyXG5cdFx0XHRcdHJlc3BvbnNlLmVycm9yIHx8IFwiQmF0Y2ggd29ya2VyIGNvbXB1dGF0aW9uIGZhaWxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZW5kIG1lc3NhZ2UgdG8gd29ya2VyIGFuZCB3YWl0IGZvciByZXNwb25zZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgc2VuZFdvcmtlck1lc3NhZ2UoXHJcblx0XHR3b3JrZXI6IFdvcmtlcixcclxuXHRcdG1lc3NhZ2U6IGFueVxyXG5cdCk6IFByb21pc2U8V29ya2VyUmVzcG9uc2U+IHtcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnBlbmRpbmdSZXF1ZXN0cy5kZWxldGUobWVzc2FnZS5yZXF1ZXN0SWQpO1xyXG5cdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoXCJXb3JrZXIgcmVxdWVzdCB0aW1lb3V0XCIpKTtcclxuXHRcdFx0fSwgMzAwMDApOyAvLyAzMCBzZWNvbmQgdGltZW91dFxyXG5cclxuXHRcdFx0dGhpcy5wZW5kaW5nUmVxdWVzdHMuc2V0KG1lc3NhZ2UucmVxdWVzdElkLCB7XHJcblx0XHRcdFx0cmVzb2x2ZTogKHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZW91dCk7XHJcblx0XHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJlamVjdDogKGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZW91dCk7XHJcblx0XHRcdFx0XHRyZWplY3QoZXJyb3IpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR3b3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG5cdFx0XHRcdHRoaXMucGVuZGluZ1JlcXVlc3RzLmRlbGV0ZShtZXNzYWdlLnJlcXVlc3RJZCk7XHJcblx0XHRcdFx0cmVqZWN0KGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgbmV4dCB3b3JrZXIgZm9yIHJvdW5kLXJvYmluIGxvYWQgYmFsYW5jaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXROZXh0V29ya2VyKCk6IFdvcmtlciB7XHJcblx0XHRpZiAodGhpcy53b3JrZXJzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyB3b3JrZXJzIGF2YWlsYWJsZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB3b3JrZXIgPSB0aGlzLndvcmtlcnNbdGhpcy5jdXJyZW50V29ya2VySW5kZXhdO1xyXG5cdFx0dGhpcy5jdXJyZW50V29ya2VySW5kZXggPVxyXG5cdFx0XHQodGhpcy5jdXJyZW50V29ya2VySW5kZXggKyAxKSAlIHRoaXMud29ya2Vycy5sZW5ndGg7XHJcblxyXG5cdFx0cmV0dXJuIHdvcmtlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGUgcHJvamVjdCBkYXRhIGZvciBtdWx0aXBsZSBmaWxlcyB1c2luZyBzeW5jaHJvbm91cyBmYWxsYmFja1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgY29tcHV0ZUJhdGNoUHJvamVjdERhdGFTeW5jKFxyXG5cdFx0ZmlsZVBhdGhzOiBzdHJpbmdbXVxyXG5cdCk6IFByb21pc2U8TWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+PiB7XHJcblx0XHRjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+KCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI6IENvbXB1dGluZyBwcm9qZWN0IGRhdGEgZm9yICR7ZmlsZVBhdGhzLmxlbmd0aH0gZmlsZXMgdXNpbmcgZmFsbGJhY2sgbWV0aG9kYFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBQcm9jZXNzIGZpbGVzIGluIHBhcmFsbGVsIHVzaW5nIFByb21pc2UuYWxsIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2UgdGhhbiBzZXF1ZW50aWFsXHJcblx0XHRjb25zdCBkYXRhUHJvbWlzZXMgPSBmaWxlUGF0aHMubWFwKGFzeW5jIChmaWxlUGF0aCkgPT4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmNvbXB1dGVQcm9qZWN0RGF0YVN5bmMoZmlsZVBhdGgpO1xyXG5cdFx0XHRcdHJldHVybiB7IGZpbGVQYXRoLCBkYXRhIH07XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YEZhaWxlZCB0byBjb21wdXRlIHByb2plY3QgZGF0YSBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm4geyBmaWxlUGF0aCwgZGF0YTogbnVsbCB9O1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoZGF0YVByb21pc2VzKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHsgZmlsZVBhdGgsIGRhdGEgfSBvZiByZXN1bHRzKSB7XHJcblx0XHRcdGlmIChkYXRhKSB7XHJcblx0XHRcdFx0cmVzdWx0LnNldChmaWxlUGF0aCwgZGF0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZSBwcm9qZWN0IGRhdGEgc3luY2hyb25vdXNseSAoZmFsbGJhY2spXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBjb21wdXRlUHJvamVjdERhdGFTeW5jKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8Q2FjaGVkUHJvamVjdERhdGEgfCBudWxsPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0Z1Byb2plY3QgPVxyXG5cdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KGZpbGVQYXRoKTtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdGNvbnN0IGRhdGE6IENhY2hlZFByb2plY3REYXRhID0ge1xyXG5cdFx0XHRcdHRnUHJvamVjdCxcclxuXHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENhY2hlIHRoZSByZXN1bHRcclxuXHRcdFx0YXdhaXQgdGhpcy5jYWNoZS5zZXRQcm9qZWN0RGF0YShmaWxlUGF0aCwgZGF0YSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gZGF0YTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgRmFpbGVkIHRvIGNvbXB1dGUgcHJvamVjdCBkYXRhIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHdvcmtlciBtZXNzYWdlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlV29ya2VyTWVzc2FnZShtZXNzYWdlOiBXb3JrZXJSZXNwb25zZSk6IHZvaWQge1xyXG5cdFx0Y29uc3QgcGVuZGluZ1JlcXVlc3QgPSB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5nZXQobWVzc2FnZS5yZXF1ZXN0SWQpO1xyXG5cdFx0aWYgKCFwZW5kaW5nUmVxdWVzdCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKG1lc3NhZ2UucmVxdWVzdElkKTtcclxuXHJcblx0XHRpZiAobWVzc2FnZS5zdWNjZXNzKSB7XHJcblx0XHRcdHBlbmRpbmdSZXF1ZXN0LnJlc29sdmUobWVzc2FnZSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRwZW5kaW5nUmVxdWVzdC5yZWplY3QoXHJcblx0XHRcdFx0bmV3IEVycm9yKG1lc3NhZ2UuZXJyb3IgfHwgXCJVbmtub3duIHdvcmtlciBlcnJvclwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgdW5pcXVlIHJlcXVlc3QgSURcclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlUmVxdWVzdElkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gYHJlcV8keysrdGhpcy5yZXF1ZXN0SWR9XyR7RGF0ZS5ub3coKX1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgY2FjaGVcclxuXHQgKi9cclxuXHRjbGVhckNhY2hlKGZpbGVQYXRoPzogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLmNhY2hlLmNsZWFyQ2FjaGUoZmlsZVBhdGgpO1xyXG5cdFx0Ly8gQWxzbyBjbGVhciBQcm9qZWN0Q29uZmlnTWFuYWdlciBjYWNoZSB0byBlbnN1cmUgY29uc2lzdGVuY3lcclxuXHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuY2xlYXJDYWNoZShmaWxlUGF0aCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY2FjaGUgc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGdldENhY2hlU3RhdHMoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jYWNoZS5nZXRTdGF0cygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHNldHRpbmcgY2hhbmdlc1xyXG5cdCAqL1xyXG5cdG9uU2V0dGluZ3NDaGFuZ2UoKTogdm9pZCB7XHJcblx0XHR0aGlzLnVwZGF0ZVdvcmtlckNvbmZpZygpO1xyXG5cdFx0dGhpcy5jYWNoZS5jbGVhckNhY2hlKCk7IC8vIENsZWFyIGNhY2hlIHdoZW4gc2V0dGluZ3MgY2hhbmdlXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZW5oYW5jZWQgcHJvamVjdCBzZXR0aW5nIGNoYW5nZVxyXG5cdCAqL1xyXG5cdG9uRW5oYW5jZWRQcm9qZWN0U2V0dGluZ0NoYW5nZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHR0aGlzLmNhY2hlLm9uRW5oYW5jZWRQcm9qZWN0U2V0dGluZ0NoYW5nZShlbmFibGVkKTtcclxuXHJcblx0XHQvLyBSZWluaXRpYWxpemUgd29ya2VycyBpZiBuZWVkZWRcclxuXHRcdGlmIChlbmFibGVkICYmIHRoaXMuZW5hYmxlV29ya2VycyAmJiB0aGlzLndvcmtlcnMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZVdvcmtlcnMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuYWJsZSBvciBkaXNhYmxlIHdvcmtlcnNcclxuXHQgKi9cclxuXHRzZXRXb3JrZXJzRW5hYmxlZChlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5lbmFibGVXb3JrZXJzID09PSBlbmFibGVkKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmVuYWJsZVdvcmtlcnMgPSBlbmFibGVkO1xyXG5cclxuXHRcdGlmIChlbmFibGVkKSB7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZVdvcmtlcnMoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZGVzdHJveSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgd29ya2VycyBhcmUgZW5hYmxlZCBhbmQgYXZhaWxhYmxlXHJcblx0ICovXHJcblx0aXNXb3JrZXJzRW5hYmxlZCgpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLmVuYWJsZVdvcmtlcnMgJiYgdGhpcy53b3JrZXJzLmxlbmd0aCA+IDA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcmVsb2FkIHByb2plY3QgZGF0YSBmb3IgZmlsZXMgKG9wdGltaXphdGlvbiBmb3Igc3RhcnR1cClcclxuXHQgKi9cclxuXHRhc3luYyBwcmVsb2FkUHJvamVjdERhdGEoZmlsZVBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKGZpbGVQYXRocy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSBiYXRjaCBwcm9jZXNzaW5nIGZvciBlZmZpY2llbmN5XHJcblx0XHRhd2FpdCB0aGlzLmdldEJhdGNoUHJvamVjdERhdGEoZmlsZVBhdGhzKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIG1vZGlmaWNhdGlvbiBmb3IgaW5jcmVtZW50YWwgdXBkYXRlc1xyXG5cdCAqL1xyXG5cdGFzeW5jIG9uRmlsZU1vZGlmaWVkKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMuY2FjaGUub25GaWxlTW9kaWZpZWQoZmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIGZpbGUgZGVsZXRpb25cclxuXHQgKi9cclxuXHRvbkZpbGVEZWxldGVkKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2FjaGUub25GaWxlRGVsZXRlZChmaWxlUGF0aCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZmlsZSBjcmVhdGlvblxyXG5cdCAqL1xyXG5cdGFzeW5jIG9uRmlsZUNyZWF0ZWQoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5vbkZpbGVDcmVhdGVkKGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIHJlbmFtZS9tb3ZlXHJcblx0ICovXHJcblx0YXN5bmMgb25GaWxlUmVuYW1lZChvbGRQYXRoOiBzdHJpbmcsIG5ld1BhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5vbkZpbGVSZW5hbWVkKG9sZFBhdGgsIG5ld1BhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVmcmVzaCBzdGFsZSBjYWNoZSBlbnRyaWVzIHBlcmlvZGljYWxseVxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlZnJlc2hTdGFsZUVudHJpZXMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCB0aGlzLmNhY2hlLnJlZnJlc2hTdGFsZUVudHJpZXMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByZWxvYWQgZGF0YSBmb3IgcmVjZW50bHkgYWNjZXNzZWQgZmlsZXNcclxuXHQgKi9cclxuXHRhc3luYyBwcmVsb2FkUmVjZW50RmlsZXMoZmlsZVBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5wcmVsb2FkUmVjZW50RmlsZXMoZmlsZVBhdGhzKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBtZW1vcnkgdXNhZ2Ugc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGdldE1lbW9yeVN0YXRzKCk6IHtcclxuXHRcdGZpbGVDYWNoZVNpemU6IG51bWJlcjtcclxuXHRcdGRpcmVjdG9yeUNhY2hlU2l6ZTogbnVtYmVyO1xyXG5cdFx0cGVuZGluZ1JlcXVlc3RzOiBudW1iZXI7XHJcblx0XHRhY3RpdmVXb3JrZXJzOiBudW1iZXI7XHJcblx0XHR3b3JrZXJzRW5hYmxlZDogYm9vbGVhbjtcclxuXHR9IHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGZpbGVDYWNoZVNpemU6ICh0aGlzLmNhY2hlIGFzIGFueSkuZmlsZUNhY2hlPy5zaXplIHx8IDAsXHJcblx0XHRcdGRpcmVjdG9yeUNhY2hlU2l6ZTogKHRoaXMuY2FjaGUgYXMgYW55KS5kaXJlY3RvcnlDYWNoZT8uc2l6ZSB8fCAwLFxyXG5cdFx0XHRwZW5kaW5nUmVxdWVzdHM6IHRoaXMucGVuZGluZ1JlcXVlc3RzLnNpemUsXHJcblx0XHRcdGFjdGl2ZVdvcmtlcnM6IHRoaXMud29ya2Vycy5sZW5ndGgsXHJcblx0XHRcdHdvcmtlcnNFbmFibGVkOiB0aGlzLmVuYWJsZVdvcmtlcnMsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgZXhpc3Rpbmcgd29ya2VycyB3aXRob3V0IGRlc3Ryb3lpbmcgdGhlIG1hbmFnZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFudXBXb3JrZXJzKCk6IHZvaWQge1xyXG5cdFx0Ly8gVGVybWluYXRlIGFsbCB3b3JrZXJzXHJcblx0XHRmb3IgKGNvbnN0IHdvcmtlciBvZiB0aGlzLndvcmtlcnMpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR3b3JrZXIudGVybWluYXRlKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgdGVybWluYXRpbmcgd29ya2VyOlwiLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHRoaXMud29ya2VycyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFyIHBlbmRpbmcgcmVxdWVzdHNcclxuXHRcdGZvciAoY29uc3QgeyByZWplY3QgfSBvZiB0aGlzLnBlbmRpbmdSZXF1ZXN0cy52YWx1ZXMoKSkge1xyXG5cdFx0XHRyZWplY3QobmV3IEVycm9yKFwiV29ya2VycyBiZWluZyByZWluaXRpYWxpemVkXCIpKTtcclxuXHRcdH1cclxuXHRcdHRoaXMucGVuZGluZ1JlcXVlc3RzLmNsZWFyKCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI6IENsZWFuZWQgdXAgZXhpc3Rpbmcgd29ya2Vyc1wiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXAgcmVzb3VyY2VzXHJcblx0ICovXHJcblx0ZGVzdHJveSgpOiB2b2lkIHtcclxuXHRcdC8vIENsZWFuIHVwIHdvcmtlcnNcclxuXHRcdHRoaXMuY2xlYW51cFdvcmtlcnMoKTtcclxuXHJcblx0XHQvLyBSZXNldCBpbml0aWFsaXphdGlvbiBmbGFnXHJcblx0XHR0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI6IERlc3Ryb3llZFwiKTtcclxuXHR9XHJcbn1cclxuIl19