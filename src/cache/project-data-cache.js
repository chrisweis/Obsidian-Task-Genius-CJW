/**
 * Enhanced Project Data Cache Manager
 *
 * Provides high-performance caching for project data with directory-level optimizations
 * and batch processing capabilities to reduce main thread blocking.
 */
import { __awaiter } from "tslib";
export class ProjectDataCache {
    constructor(vault, metadataCache, projectConfigManager) {
        // File-level cache for computed project data
        this.fileCache = new Map();
        // Directory-level cache for project config files
        this.directoryCache = new Map();
        // Batch processing optimization
        this.pendingUpdates = new Set();
        this.BATCH_DELAY = 100; // ms
        // Performance tracking
        this.stats = {
            totalFiles: 0,
            cachedFiles: 0,
            directoryCacheHits: 0,
            configCacheHits: 0,
            lastUpdateTime: 0,
        };
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.projectConfigManager = projectConfigManager;
    }
    /**
     * Get cached project data for a file or compute if not cached
     */
    getProjectData(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectConfigManager.isEnhancedProjectEnabled()) {
                return null;
            }
            const cached = this.fileCache.get(filePath);
            if (cached && this.isCacheValid(filePath, cached)) {
                return cached;
            }
            return yield this.computeAndCacheProjectData(filePath);
        });
    }
    /**
     * Batch get project data for multiple files with optimizations
     */
    getBatchProjectData(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = new Map();
            if (!this.projectConfigManager.isEnhancedProjectEnabled()) {
                return result;
            }
            // Separate cached from uncached files
            const uncachedPaths = [];
            const cachedPaths = [];
            for (const filePath of filePaths) {
                const cached = this.fileCache.get(filePath);
                if (cached && this.isCacheValid(filePath, cached)) {
                    result.set(filePath, cached);
                    cachedPaths.push(filePath);
                }
                else {
                    uncachedPaths.push(filePath);
                }
            }
            this.stats.configCacheHits += cachedPaths.length;
            // Process uncached files in batches by directory for efficiency
            if (uncachedPaths.length > 0) {
                const batchedByDirectory = this.groupByDirectory(uncachedPaths);
                for (const [directory, paths] of batchedByDirectory) {
                    const directoryData = yield this.getOrCreateDirectoryCache(directory);
                    for (const filePath of paths) {
                        const projectData = yield this.computeProjectDataWithDirectoryCache(filePath, directoryData);
                        if (projectData) {
                            result.set(filePath, projectData);
                        }
                    }
                }
            }
            this.stats.totalFiles = filePaths.length;
            this.stats.cachedFiles = cachedPaths.length;
            this.stats.lastUpdateTime = Date.now();
            return result;
        });
    }
    /**
     * Compute project data using directory-level cache for efficiency
     */
    computeProjectDataWithDirectoryCache(filePath, directoryCache) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tgProject = yield this.projectConfigManager.determineTgProject(filePath);
                // Get enhanced metadata efficiently using cached config data
                let enhancedMetadata = {};
                // Get file metadata
                const fileMetadata = this.projectConfigManager.getFileMetadata(filePath) || {};
                // Use cached config data if available
                const configData = directoryCache.configData || {};
                // Merge and apply mappings
                const mergedMetadata = Object.assign(Object.assign({}, configData), fileMetadata);
                enhancedMetadata =
                    this.projectConfigManager.applyMappingsToMetadata(mergedMetadata);
                const projectData = {
                    tgProject,
                    enhancedMetadata,
                    timestamp: Date.now(),
                    configSource: (_a = directoryCache.configFile) === null || _a === void 0 ? void 0 : _a.path,
                };
                // Cache the result
                this.fileCache.set(filePath, projectData);
                // Update directory cache file tracking
                directoryCache.paths.add(filePath);
                return projectData;
            }
            catch (error) {
                console.warn(`Failed to compute project data for ${filePath}:`, error);
                return null;
            }
        });
    }
    /**
     * Get or create directory cache for project config files
     */
    getOrCreateDirectoryCache(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            let cached = this.directoryCache.get(directory);
            if (cached) {
                // Check if cache is still valid
                if (cached.configFile) {
                    const currentTimestamp = cached.configFile.stat.mtime;
                    if (currentTimestamp === cached.configTimestamp) {
                        this.stats.directoryCacheHits++;
                        return cached;
                    }
                }
                else {
                    // No config file in this directory, cache is still valid
                    return cached;
                }
            }
            // Create new directory cache
            cached = {
                configTimestamp: 0,
                paths: new Set(),
            };
            // Look for config file in this directory
            const configFile = yield this.findConfigFileInDirectory(directory);
            if (configFile) {
                cached.configFile = configFile;
                cached.configTimestamp = configFile.stat.mtime;
                // Read and cache config data
                try {
                    const content = yield this.vault.read(configFile);
                    const metadata = this.metadataCache.getFileCache(configFile);
                    let configData = {};
                    if (metadata === null || metadata === void 0 ? void 0 : metadata.frontmatter) {
                        configData = Object.assign({}, metadata.frontmatter);
                    }
                    // Parse additional config content
                    const contentConfig = this.parseConfigContent(content);
                    configData = Object.assign(Object.assign({}, configData), contentConfig);
                    cached.configData = configData;
                }
                catch (error) {
                    console.warn(`Failed to read config file ${configFile.path}:`, error);
                }
            }
            this.directoryCache.set(directory, cached);
            return cached;
        });
    }
    /**
     * Find project config file in a specific directory (non-recursive)
     */
    findConfigFileInDirectory(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.vault.getFileByPath(directory);
            if (!file || !("children" in file)) {
                return null;
            }
            const configFileName = "task-genius.config.md"; // TODO: Make configurable
            const configFile = file.children.find((child) => child && child.name === configFileName && "stat" in child);
            return configFile || null;
        });
    }
    /**
     * Group file paths by their parent directory
     */
    groupByDirectory(filePaths) {
        const groups = new Map();
        for (const filePath of filePaths) {
            const directory = this.getDirectoryPath(filePath);
            const existing = groups.get(directory) || [];
            existing.push(filePath);
            groups.set(directory, existing);
        }
        return groups;
    }
    /**
     * Get directory path from file path
     */
    getDirectoryPath(filePath) {
        const lastSlash = filePath.lastIndexOf("/");
        return lastSlash > 0 ? filePath.substring(0, lastSlash) : "";
    }
    /**
     * Check if cached data is still valid
     */
    isCacheValid(filePath, cached) {
        const file = this.vault.getAbstractFileByPath(filePath);
        if (!file || !("stat" in file)) {
            return false;
        }
        // Check if file has been modified since caching
        const fileTimestamp = file.stat.mtime;
        if (fileTimestamp > cached.timestamp) {
            return false;
        }
        // Check if config file has been modified
        if (cached.configSource) {
            const configFile = this.vault.getAbstractFileByPath(cached.configSource);
            if (configFile && "stat" in configFile) {
                const configTimestamp = configFile.stat.mtime;
                const directory = this.getDirectoryPath(filePath);
                const dirCache = this.directoryCache.get(directory);
                if (dirCache && configTimestamp > dirCache.configTimestamp) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Compute and cache project data for a single file
     */
    computeAndCacheProjectData(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const directory = this.getDirectoryPath(filePath);
            const directoryCache = yield this.getOrCreateDirectoryCache(directory);
            return yield this.computeProjectDataWithDirectoryCache(filePath, directoryCache);
        });
    }
    /**
     * Parse config file content (copied from ProjectConfigManager for efficiency)
     */
    parseConfigContent(content) {
        const config = {};
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed ||
                trimmed.startsWith("#") ||
                trimmed.startsWith("//")) {
                continue;
            }
            const colonIndex = trimmed.indexOf(":");
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                if (key && value) {
                    const cleanValue = value.replace(/^["']|["']$/g, "");
                    config[key] = cleanValue;
                }
            }
        }
        return config;
    }
    /**
     * Clear cache for specific file or all files
     */
    clearCache(filePath) {
        if (filePath) {
            this.fileCache.delete(filePath);
            // Clear from directory cache tracking
            const directory = this.getDirectoryPath(filePath);
            const dirCache = this.directoryCache.get(directory);
            if (dirCache) {
                dirCache.paths.delete(filePath);
            }
        }
        else {
            this.fileCache.clear();
            this.directoryCache.clear();
        }
    }
    /**
     * Clear directory cache when config files change
     */
    clearDirectoryCache(directory) {
        const dirCache = this.directoryCache.get(directory);
        if (dirCache) {
            // Clear all files that used this directory's config
            for (const filePath of dirCache.paths) {
                this.fileCache.delete(filePath);
            }
            this.directoryCache.delete(directory);
        }
    }
    /**
     * Get cache performance statistics
     */
    getStats() {
        return Object.assign({}, this.stats);
    }
    /**
     * Schedule batch update for multiple files
     */
    scheduleBatchUpdate(filePaths) {
        for (const filePath of filePaths) {
            this.pendingUpdates.add(filePath);
        }
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
        }
        this.batchUpdateTimer = setTimeout(() => {
            this.processBatchUpdates();
        }, this.BATCH_DELAY);
    }
    /**
     * Process pending batch updates
     */
    processBatchUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pendingUpdates.size === 0) {
                return;
            }
            const pathsToUpdate = Array.from(this.pendingUpdates);
            this.pendingUpdates.clear();
            // Clear cache for updated files
            for (const filePath of pathsToUpdate) {
                this.clearCache(filePath);
            }
            // Pre-compute data for updated files
            yield this.getBatchProjectData(pathsToUpdate);
        });
    }
    /**
     * Update cache when enhanced project setting changes
     */
    onEnhancedProjectSettingChange(enabled) {
        if (!enabled) {
            this.clearCache();
        }
    }
    /**
     * Handle file modification events for incremental updates
     */
    onFileModified(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear cache for the modified file
            this.clearCache(filePath);
            // Check if it's a project config file
            if (filePath.endsWith(".config.md") ||
                filePath.includes("task-genius")) {
                // Clear directory cache since config may have changed
                const directory = this.getDirectoryPath(filePath);
                this.clearDirectoryCache(directory);
            }
            // Schedule batch update for this file
            this.scheduleBatchUpdate([filePath]);
        });
    }
    /**
     * Handle file deletion events
     */
    onFileDeleted(filePath) {
        this.clearCache(filePath);
        // Update directory cache if it was a config file
        if (filePath.endsWith(".config.md") ||
            filePath.includes("task-genius")) {
            const directory = this.getDirectoryPath(filePath);
            this.clearDirectoryCache(directory);
        }
    }
    /**
     * Handle file creation events
     */
    onFileCreated(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // If it's a config file, clear directory cache to pick up new config
            if (filePath.endsWith(".config.md") ||
                filePath.includes("task-genius")) {
                const directory = this.getDirectoryPath(filePath);
                this.clearDirectoryCache(directory);
            }
            // Pre-compute data for new file
            yield this.getProjectData(filePath);
        });
    }
    /**
     * Handle file rename/move events
     */
    onFileRenamed(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear cache for old path
            this.clearCache(oldPath);
            // Update relevant directory caches
            const oldDirectory = this.getDirectoryPath(oldPath);
            const newDirectory = this.getDirectoryPath(newPath);
            if (oldPath.endsWith(".config.md") || oldPath.includes("task-genius")) {
                this.clearDirectoryCache(oldDirectory);
            }
            if (newPath.endsWith(".config.md") || newPath.includes("task-genius")) {
                this.clearDirectoryCache(newDirectory);
            }
            // Pre-compute data for new path
            yield this.getProjectData(newPath);
        });
    }
    /**
     * Validate and refresh cache entries that may be stale
     */
    refreshStaleEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            const staleFiles = [];
            for (const [filePath, cachedData] of this.fileCache.entries()) {
                if (!this.isCacheValid(filePath, cachedData)) {
                    staleFiles.push(filePath);
                }
            }
            if (staleFiles.length > 0) {
                console.log(`Refreshing ${staleFiles.length} stale project data cache entries`);
                yield this.getBatchProjectData(staleFiles);
            }
        });
    }
    /**
     * Preload project data for recently accessed files
     */
    preloadRecentFiles(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const uncachedFiles = filePaths.filter((path) => !this.fileCache.has(path));
            if (uncachedFiles.length > 0) {
                console.log(`Preloading project data for ${uncachedFiles.length} recent files`);
                yield this.getBatchProjectData(uncachedFiles);
            }
        });
    }
    /**
     * Set project data in cache (for external updates)
     */
    setProjectData(filePath, projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            this.fileCache.set(filePath, projectData);
            // Update directory cache tracking
            const directory = this.getDirectoryPath(filePath);
            const dirCache = this.directoryCache.get(directory);
            if (dirCache) {
                dirCache.paths.add(filePath);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1kYXRhLWNhY2hlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvamVjdC1kYXRhLWNhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQStCSCxNQUFNLE9BQU8sZ0JBQWdCO0lBeUI1QixZQUNDLEtBQVksRUFDWixhQUE0QixFQUM1QixvQkFBMEM7UUF2QjNDLDZDQUE2QztRQUNyQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7UUFFekQsaURBQWlEO1FBQ3pDLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7UUFFM0QsZ0NBQWdDO1FBQ3hCLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUUxQixnQkFBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUs7UUFFekMsdUJBQXVCO1FBQ2YsVUFBSyxHQUFzQjtZQUNsQyxVQUFVLEVBQUUsQ0FBQztZQUNiLFdBQVcsRUFBRSxDQUFDO1lBQ2Qsa0JBQWtCLEVBQUUsQ0FBQztZQUNyQixlQUFlLEVBQUUsQ0FBQztZQUNsQixjQUFjLEVBQUUsQ0FBQztTQUNqQixDQUFDO1FBT0QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNHLGNBQWMsQ0FBQyxRQUFnQjs7WUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFO2dCQUMxRCxPQUFPLElBQUksQ0FBQzthQUNaO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUU7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QUNsRSxDQUFDO2dCQUNGLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzNDO1FBQ0YsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDRyxrQkFBa0IsQ0FBQyxTQUFtQjs7WUFDM0MsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FDckMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQ25DLENBQUM7WUFFRixJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM3QixPQUFPLENBQUMsR0FBRyxDQUNWLCtCQUErQixhQUFhLENBQUMsTUFBTSxlQUFlLENBQ2xFLENBQUM7Z0JBQ0YsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7YUFDOUM7UUFDRixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNHLGNBQWMsQ0FDbkIsUUFBZ0IsRUFDaEIsV0FBOEI7O1lBRTlCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUUxQyxrQ0FBa0M7WUFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BELElBQUksUUFBUSxFQUFFO2dCQUNiLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzdCO1FBQ0YsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRW5oYW5jZWQgUHJvamVjdCBEYXRhIENhY2hlIE1hbmFnZXJcclxuICpcclxuICogUHJvdmlkZXMgaGlnaC1wZXJmb3JtYW5jZSBjYWNoaW5nIGZvciBwcm9qZWN0IGRhdGEgd2l0aCBkaXJlY3RvcnktbGV2ZWwgb3B0aW1pemF0aW9uc1xyXG4gKiBhbmQgYmF0Y2ggcHJvY2Vzc2luZyBjYXBhYmlsaXRpZXMgdG8gcmVkdWNlIG1haW4gdGhyZWFkIGJsb2NraW5nLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFRGaWxlLCBWYXVsdCwgTWV0YWRhdGFDYWNoZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUZ1Byb2plY3QgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQge1xyXG5cdFByb2plY3RDb25maWdEYXRhLFxyXG5cdFByb2plY3RDb25maWdNYW5hZ2VyLFxyXG59IGZyb20gXCIuLi9tYW5hZ2Vycy9wcm9qZWN0LWNvbmZpZy1tYW5hZ2VyXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENhY2hlZFByb2plY3REYXRhIHtcclxuXHR0Z1Byb2plY3Q/OiBUZ1Byb2plY3Q7XHJcblx0ZW5oYW5jZWRNZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHR0aW1lc3RhbXA6IG51bWJlcjtcclxuXHRjb25maWdTb3VyY2U/OiBzdHJpbmc7IC8vIHBhdGggdG8gY29uZmlnIGZpbGUgdXNlZFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdG9yeUNhY2hlIHtcclxuXHRjb25maWdGaWxlPzogVEZpbGU7XHJcblx0Y29uZmlnRGF0YT86IFByb2plY3RDb25maWdEYXRhO1xyXG5cdGNvbmZpZ1RpbWVzdGFtcDogbnVtYmVyO1xyXG5cdHBhdGhzOiBTZXQ8c3RyaW5nPjsgLy8gZmlsZXMgdXNpbmcgdGhpcyBjb25maWdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0Q2FjaGVTdGF0cyB7XHJcblx0dG90YWxGaWxlczogbnVtYmVyO1xyXG5cdGNhY2hlZEZpbGVzOiBudW1iZXI7XHJcblx0ZGlyZWN0b3J5Q2FjaGVIaXRzOiBudW1iZXI7XHJcblx0Y29uZmlnQ2FjaGVIaXRzOiBudW1iZXI7XHJcblx0bGFzdFVwZGF0ZVRpbWU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3REYXRhQ2FjaGUge1xyXG5cdHByaXZhdGUgdmF1bHQ6IFZhdWx0O1xyXG5cdHByaXZhdGUgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcclxuXHRwcml2YXRlIHByb2plY3RDb25maWdNYW5hZ2VyOiBQcm9qZWN0Q29uZmlnTWFuYWdlcjtcclxuXHJcblx0Ly8gRmlsZS1sZXZlbCBjYWNoZSBmb3IgY29tcHV0ZWQgcHJvamVjdCBkYXRhXHJcblx0cHJpdmF0ZSBmaWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVkUHJvamVjdERhdGE+KCk7XHJcblxyXG5cdC8vIERpcmVjdG9yeS1sZXZlbCBjYWNoZSBmb3IgcHJvamVjdCBjb25maWcgZmlsZXNcclxuXHRwcml2YXRlIGRpcmVjdG9yeUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIERpcmVjdG9yeUNhY2hlPigpO1xyXG5cclxuXHQvLyBCYXRjaCBwcm9jZXNzaW5nIG9wdGltaXphdGlvblxyXG5cdHByaXZhdGUgcGVuZGluZ1VwZGF0ZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRwcml2YXRlIGJhdGNoVXBkYXRlVGltZXI/OiBOb2RlSlMuVGltZW91dDtcclxuXHRwcml2YXRlIHJlYWRvbmx5IEJBVENIX0RFTEFZID0gMTAwOyAvLyBtc1xyXG5cclxuXHQvLyBQZXJmb3JtYW5jZSB0cmFja2luZ1xyXG5cdHByaXZhdGUgc3RhdHM6IFByb2plY3RDYWNoZVN0YXRzID0ge1xyXG5cdFx0dG90YWxGaWxlczogMCxcclxuXHRcdGNhY2hlZEZpbGVzOiAwLFxyXG5cdFx0ZGlyZWN0b3J5Q2FjaGVIaXRzOiAwLFxyXG5cdFx0Y29uZmlnQ2FjaGVIaXRzOiAwLFxyXG5cdFx0bGFzdFVwZGF0ZVRpbWU6IDAsXHJcblx0fTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHR2YXVsdDogVmF1bHQsXHJcblx0XHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlLFxyXG5cdFx0cHJvamVjdENvbmZpZ01hbmFnZXI6IFByb2plY3RDb25maWdNYW5hZ2VyXHJcblx0KSB7XHJcblx0XHR0aGlzLnZhdWx0ID0gdmF1bHQ7XHJcblx0XHR0aGlzLm1ldGFkYXRhQ2FjaGUgPSBtZXRhZGF0YUNhY2hlO1xyXG5cdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlciA9IHByb2plY3RDb25maWdNYW5hZ2VyO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlZCBwcm9qZWN0IGRhdGEgZm9yIGEgZmlsZSBvciBjb21wdXRlIGlmIG5vdCBjYWNoZWRcclxuXHQgKi9cclxuXHRhc3luYyBnZXRQcm9qZWN0RGF0YShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxDYWNoZWRQcm9qZWN0RGF0YSB8IG51bGw+IHtcclxuXHRcdGlmICghdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjYWNoZWQgPSB0aGlzLmZpbGVDYWNoZS5nZXQoZmlsZVBhdGgpO1xyXG5cdFx0aWYgKGNhY2hlZCAmJiB0aGlzLmlzQ2FjaGVWYWxpZChmaWxlUGF0aCwgY2FjaGVkKSkge1xyXG5cdFx0XHRyZXR1cm4gY2FjaGVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBhd2FpdCB0aGlzLmNvbXB1dGVBbmRDYWNoZVByb2plY3REYXRhKGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEJhdGNoIGdldCBwcm9qZWN0IGRhdGEgZm9yIG11bHRpcGxlIGZpbGVzIHdpdGggb3B0aW1pemF0aW9uc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldEJhdGNoUHJvamVjdERhdGEoXHJcblx0XHRmaWxlUGF0aHM6IHN0cmluZ1tdXHJcblx0KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4+IHtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBDYWNoZWRQcm9qZWN0RGF0YT4oKTtcclxuXHJcblx0XHRpZiAoIXRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuaXNFbmhhbmNlZFByb2plY3RFbmFibGVkKCkpIHtcclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXBhcmF0ZSBjYWNoZWQgZnJvbSB1bmNhY2hlZCBmaWxlc1xyXG5cdFx0Y29uc3QgdW5jYWNoZWRQYXRoczogc3RyaW5nW10gPSBbXTtcclxuXHRcdGNvbnN0IGNhY2hlZFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgZmlsZVBhdGhzKSB7XHJcblx0XHRcdGNvbnN0IGNhY2hlZCA9IHRoaXMuZmlsZUNhY2hlLmdldChmaWxlUGF0aCk7XHJcblx0XHRcdGlmIChjYWNoZWQgJiYgdGhpcy5pc0NhY2hlVmFsaWQoZmlsZVBhdGgsIGNhY2hlZCkpIHtcclxuXHRcdFx0XHRyZXN1bHQuc2V0KGZpbGVQYXRoLCBjYWNoZWQpO1xyXG5cdFx0XHRcdGNhY2hlZFBhdGhzLnB1c2goZmlsZVBhdGgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHVuY2FjaGVkUGF0aHMucHVzaChmaWxlUGF0aCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnN0YXRzLmNvbmZpZ0NhY2hlSGl0cyArPSBjYWNoZWRQYXRocy5sZW5ndGg7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyB1bmNhY2hlZCBmaWxlcyBpbiBiYXRjaGVzIGJ5IGRpcmVjdG9yeSBmb3IgZWZmaWNpZW5jeVxyXG5cdFx0aWYgKHVuY2FjaGVkUGF0aHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBiYXRjaGVkQnlEaXJlY3RvcnkgPSB0aGlzLmdyb3VwQnlEaXJlY3RvcnkodW5jYWNoZWRQYXRocyk7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IFtkaXJlY3RvcnksIHBhdGhzXSBvZiBiYXRjaGVkQnlEaXJlY3RvcnkpIHtcclxuXHRcdFx0XHRjb25zdCBkaXJlY3RvcnlEYXRhID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZURpcmVjdG9yeUNhY2hlKFxyXG5cdFx0XHRcdFx0ZGlyZWN0b3J5XHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Zm9yIChjb25zdCBmaWxlUGF0aCBvZiBwYXRocykge1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJvamVjdERhdGEgPVxyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmNvbXB1dGVQcm9qZWN0RGF0YVdpdGhEaXJlY3RvcnlDYWNoZShcclxuXHRcdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0XHRkaXJlY3RvcnlEYXRhXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAocHJvamVjdERhdGEpIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LnNldChmaWxlUGF0aCwgcHJvamVjdERhdGEpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc3RhdHMudG90YWxGaWxlcyA9IGZpbGVQYXRocy5sZW5ndGg7XHJcblx0XHR0aGlzLnN0YXRzLmNhY2hlZEZpbGVzID0gY2FjaGVkUGF0aHMubGVuZ3RoO1xyXG5cdFx0dGhpcy5zdGF0cy5sYXN0VXBkYXRlVGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGUgcHJvamVjdCBkYXRhIHVzaW5nIGRpcmVjdG9yeS1sZXZlbCBjYWNoZSBmb3IgZWZmaWNpZW5jeVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgY29tcHV0ZVByb2plY3REYXRhV2l0aERpcmVjdG9yeUNhY2hlKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGRpcmVjdG9yeUNhY2hlOiBEaXJlY3RvcnlDYWNoZVxyXG5cdCk6IFByb21pc2U8Q2FjaGVkUHJvamVjdERhdGEgfCBudWxsPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0Z1Byb2plY3QgPVxyXG5cdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdC8vIEdldCBlbmhhbmNlZCBtZXRhZGF0YSBlZmZpY2llbnRseSB1c2luZyBjYWNoZWQgY29uZmlnIGRhdGFcclxuXHRcdFx0bGV0IGVuaGFuY2VkTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcblx0XHRcdC8vIEdldCBmaWxlIG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpIHx8IHt9O1xyXG5cclxuXHRcdFx0Ly8gVXNlIGNhY2hlZCBjb25maWcgZGF0YSBpZiBhdmFpbGFibGVcclxuXHRcdFx0Y29uc3QgY29uZmlnRGF0YSA9IGRpcmVjdG9yeUNhY2hlLmNvbmZpZ0RhdGEgfHwge307XHJcblxyXG5cdFx0XHQvLyBNZXJnZSBhbmQgYXBwbHkgbWFwcGluZ3NcclxuXHRcdFx0Y29uc3QgbWVyZ2VkTWV0YWRhdGEgPSB7IC4uLmNvbmZpZ0RhdGEsIC4uLmZpbGVNZXRhZGF0YSB9O1xyXG5cdFx0XHRlbmhhbmNlZE1ldGFkYXRhID1cclxuXHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmFwcGx5TWFwcGluZ3NUb01ldGFkYXRhKFxyXG5cdFx0XHRcdFx0bWVyZ2VkTWV0YWRhdGFcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdERhdGE6IENhY2hlZFByb2plY3REYXRhID0ge1xyXG5cdFx0XHRcdHRnUHJvamVjdCxcclxuXHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRjb25maWdTb3VyY2U6IGRpcmVjdG9yeUNhY2hlLmNvbmZpZ0ZpbGU/LnBhdGgsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBDYWNoZSB0aGUgcmVzdWx0XHJcblx0XHRcdHRoaXMuZmlsZUNhY2hlLnNldChmaWxlUGF0aCwgcHJvamVjdERhdGEpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGRpcmVjdG9yeSBjYWNoZSBmaWxlIHRyYWNraW5nXHJcblx0XHRcdGRpcmVjdG9yeUNhY2hlLnBhdGhzLmFkZChmaWxlUGF0aCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcHJvamVjdERhdGE7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YEZhaWxlZCB0byBjb21wdXRlIHByb2plY3QgZGF0YSBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBvciBjcmVhdGUgZGlyZWN0b3J5IGNhY2hlIGZvciBwcm9qZWN0IGNvbmZpZyBmaWxlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZ2V0T3JDcmVhdGVEaXJlY3RvcnlDYWNoZShcclxuXHRcdGRpcmVjdG9yeTogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxEaXJlY3RvcnlDYWNoZT4ge1xyXG5cdFx0bGV0IGNhY2hlZCA9IHRoaXMuZGlyZWN0b3J5Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcblxyXG5cdFx0aWYgKGNhY2hlZCkge1xyXG5cdFx0XHQvLyBDaGVjayBpZiBjYWNoZSBpcyBzdGlsbCB2YWxpZFxyXG5cdFx0XHRpZiAoY2FjaGVkLmNvbmZpZ0ZpbGUpIHtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50VGltZXN0YW1wID0gY2FjaGVkLmNvbmZpZ0ZpbGUuc3RhdC5tdGltZTtcclxuXHRcdFx0XHRpZiAoY3VycmVudFRpbWVzdGFtcCA9PT0gY2FjaGVkLmNvbmZpZ1RpbWVzdGFtcCkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0cy5kaXJlY3RvcnlDYWNoZUhpdHMrKztcclxuXHRcdFx0XHRcdHJldHVybiBjYWNoZWQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5vIGNvbmZpZyBmaWxlIGluIHRoaXMgZGlyZWN0b3J5LCBjYWNoZSBpcyBzdGlsbCB2YWxpZFxyXG5cdFx0XHRcdHJldHVybiBjYWNoZWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgbmV3IGRpcmVjdG9yeSBjYWNoZVxyXG5cdFx0Y2FjaGVkID0ge1xyXG5cdFx0XHRjb25maWdUaW1lc3RhbXA6IDAsXHJcblx0XHRcdHBhdGhzOiBuZXcgU2V0KCksXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIExvb2sgZm9yIGNvbmZpZyBmaWxlIGluIHRoaXMgZGlyZWN0b3J5XHJcblx0XHRjb25zdCBjb25maWdGaWxlID0gYXdhaXQgdGhpcy5maW5kQ29uZmlnRmlsZUluRGlyZWN0b3J5KGRpcmVjdG9yeSk7XHJcblx0XHRpZiAoY29uZmlnRmlsZSkge1xyXG5cdFx0XHRjYWNoZWQuY29uZmlnRmlsZSA9IGNvbmZpZ0ZpbGU7XHJcblx0XHRcdGNhY2hlZC5jb25maWdUaW1lc3RhbXAgPSBjb25maWdGaWxlLnN0YXQubXRpbWU7XHJcblxyXG5cdFx0XHQvLyBSZWFkIGFuZCBjYWNoZSBjb25maWcgZGF0YVxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LnJlYWQoY29uZmlnRmlsZSk7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGNvbmZpZ0ZpbGUpO1xyXG5cclxuXHRcdFx0XHRsZXQgY29uZmlnRGF0YTogUHJvamVjdENvbmZpZ0RhdGEgPSB7fTtcclxuXHRcdFx0XHRpZiAobWV0YWRhdGE/LmZyb250bWF0dGVyKSB7XHJcblx0XHRcdFx0XHRjb25maWdEYXRhID0geyAuLi5tZXRhZGF0YS5mcm9udG1hdHRlciB9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUGFyc2UgYWRkaXRpb25hbCBjb25maWcgY29udGVudFxyXG5cdFx0XHRcdGNvbnN0IGNvbnRlbnRDb25maWcgPSB0aGlzLnBhcnNlQ29uZmlnQ29udGVudChjb250ZW50KTtcclxuXHRcdFx0XHRjb25maWdEYXRhID0geyAuLi5jb25maWdEYXRhLCAuLi5jb250ZW50Q29uZmlnIH07XHJcblxyXG5cdFx0XHRcdGNhY2hlZC5jb25maWdEYXRhID0gY29uZmlnRGF0YTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgRmFpbGVkIHRvIHJlYWQgY29uZmlnIGZpbGUgJHtjb25maWdGaWxlLnBhdGh9OmAsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmRpcmVjdG9yeUNhY2hlLnNldChkaXJlY3RvcnksIGNhY2hlZCk7XHJcblx0XHRyZXR1cm4gY2FjaGVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluZCBwcm9qZWN0IGNvbmZpZyBmaWxlIGluIGEgc3BlY2lmaWMgZGlyZWN0b3J5IChub24tcmVjdXJzaXZlKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZmluZENvbmZpZ0ZpbGVJbkRpcmVjdG9yeShcclxuXHRcdGRpcmVjdG9yeTogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEZpbGVCeVBhdGgoZGlyZWN0b3J5KTtcclxuXHRcdGlmICghZmlsZSB8fCAhKFwiY2hpbGRyZW5cIiBpbiBmaWxlKSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjb25maWdGaWxlTmFtZSA9IFwidGFzay1nZW5pdXMuY29uZmlnLm1kXCI7IC8vIFRPRE86IE1ha2UgY29uZmlndXJhYmxlXHJcblx0XHRjb25zdCBjb25maWdGaWxlID0gKGZpbGUgYXMgYW55KS5jaGlsZHJlbi5maW5kKFxyXG5cdFx0XHQoY2hpbGQ6IGFueSkgPT5cclxuXHRcdFx0XHRjaGlsZCAmJiBjaGlsZC5uYW1lID09PSBjb25maWdGaWxlTmFtZSAmJiBcInN0YXRcIiBpbiBjaGlsZFxyXG5cdFx0KSBhcyBURmlsZSB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRyZXR1cm4gY29uZmlnRmlsZSB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR3JvdXAgZmlsZSBwYXRocyBieSB0aGVpciBwYXJlbnQgZGlyZWN0b3J5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBncm91cEJ5RGlyZWN0b3J5KGZpbGVQYXRoczogc3RyaW5nW10pOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4ge1xyXG5cdFx0Y29uc3QgZ3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xyXG5cclxuXHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgZmlsZVBhdGhzKSB7XHJcblx0XHRcdGNvbnN0IGRpcmVjdG9yeSA9IHRoaXMuZ2V0RGlyZWN0b3J5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdGNvbnN0IGV4aXN0aW5nID0gZ3JvdXBzLmdldChkaXJlY3RvcnkpIHx8IFtdO1xyXG5cdFx0XHRleGlzdGluZy5wdXNoKGZpbGVQYXRoKTtcclxuXHRcdFx0Z3JvdXBzLnNldChkaXJlY3RvcnksIGV4aXN0aW5nKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZ3JvdXBzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGRpcmVjdG9yeSBwYXRoIGZyb20gZmlsZSBwYXRoXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXREaXJlY3RvcnlQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbGFzdFNsYXNoID0gZmlsZVBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xyXG5cdFx0cmV0dXJuIGxhc3RTbGFzaCA+IDAgPyBmaWxlUGF0aC5zdWJzdHJpbmcoMCwgbGFzdFNsYXNoKSA6IFwiXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBjYWNoZWQgZGF0YSBpcyBzdGlsbCB2YWxpZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNDYWNoZVZhbGlkKGZpbGVQYXRoOiBzdHJpbmcsIGNhY2hlZDogQ2FjaGVkUHJvamVjdERhdGEpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRpZiAoIWZpbGUgfHwgIShcInN0YXRcIiBpbiBmaWxlKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZmlsZSBoYXMgYmVlbiBtb2RpZmllZCBzaW5jZSBjYWNoaW5nXHJcblx0XHRjb25zdCBmaWxlVGltZXN0YW1wID0gKGZpbGUgYXMgVEZpbGUpLnN0YXQubXRpbWU7XHJcblx0XHRpZiAoZmlsZVRpbWVzdGFtcCA+IGNhY2hlZC50aW1lc3RhbXApIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGNvbmZpZyBmaWxlIGhhcyBiZWVuIG1vZGlmaWVkXHJcblx0XHRpZiAoY2FjaGVkLmNvbmZpZ1NvdXJjZSkge1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdGhpcy52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0Y2FjaGVkLmNvbmZpZ1NvdXJjZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoY29uZmlnRmlsZSAmJiBcInN0YXRcIiBpbiBjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0Y29uc3QgY29uZmlnVGltZXN0YW1wID0gKGNvbmZpZ0ZpbGUgYXMgVEZpbGUpLnN0YXQubXRpbWU7XHJcblx0XHRcdFx0Y29uc3QgZGlyZWN0b3J5ID0gdGhpcy5nZXREaXJlY3RvcnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdFx0XHRjb25zdCBkaXJDYWNoZSA9IHRoaXMuZGlyZWN0b3J5Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcblx0XHRcdFx0aWYgKGRpckNhY2hlICYmIGNvbmZpZ1RpbWVzdGFtcCA+IGRpckNhY2hlLmNvbmZpZ1RpbWVzdGFtcCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZSBhbmQgY2FjaGUgcHJvamVjdCBkYXRhIGZvciBhIHNpbmdsZSBmaWxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBjb21wdXRlQW5kQ2FjaGVQcm9qZWN0RGF0YShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPENhY2hlZFByb2plY3REYXRhIHwgbnVsbD4ge1xyXG5cdFx0Y29uc3QgZGlyZWN0b3J5ID0gdGhpcy5nZXREaXJlY3RvcnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdGNvbnN0IGRpcmVjdG9yeUNhY2hlID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZURpcmVjdG9yeUNhY2hlKGRpcmVjdG9yeSk7XHJcblx0XHRyZXR1cm4gYXdhaXQgdGhpcy5jb21wdXRlUHJvamVjdERhdGFXaXRoRGlyZWN0b3J5Q2FjaGUoXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRkaXJlY3RvcnlDYWNoZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGNvbmZpZyBmaWxlIGNvbnRlbnQgKGNvcGllZCBmcm9tIFByb2plY3RDb25maWdNYW5hZ2VyIGZvciBlZmZpY2llbmN5KVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VDb25maWdDb250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IFByb2plY3RDb25maWdEYXRhIHtcclxuXHRcdGNvbnN0IGNvbmZpZzogUHJvamVjdENvbmZpZ0RhdGEgPSB7fTtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0Y29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IXRyaW1tZWQgfHxcclxuXHRcdFx0XHR0cmltbWVkLnN0YXJ0c1dpdGgoXCIjXCIpIHx8XHJcblx0XHRcdFx0dHJpbW1lZC5zdGFydHNXaXRoKFwiLy9cIilcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGNvbG9uSW5kZXggPSB0cmltbWVkLmluZGV4T2YoXCI6XCIpO1xyXG5cdFx0XHRpZiAoY29sb25JbmRleCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBrZXkgPSB0cmltbWVkLnN1YnN0cmluZygwLCBjb2xvbkluZGV4KS50cmltKCk7XHJcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSB0cmltbWVkLnN1YnN0cmluZyhjb2xvbkluZGV4ICsgMSkudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRpZiAoa2V5ICYmIHZhbHVlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBjbGVhblZhbHVlID0gdmFsdWUucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCBcIlwiKTtcclxuXHRcdFx0XHRcdGNvbmZpZ1trZXldID0gY2xlYW5WYWx1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY29uZmlnO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIGZpbGUgb3IgYWxsIGZpbGVzXHJcblx0ICovXHJcblx0Y2xlYXJDYWNoZShmaWxlUGF0aD86IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKGZpbGVQYXRoKSB7XHJcblx0XHRcdHRoaXMuZmlsZUNhY2hlLmRlbGV0ZShmaWxlUGF0aCk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBmcm9tIGRpcmVjdG9yeSBjYWNoZSB0cmFja2luZ1xyXG5cdFx0XHRjb25zdCBkaXJlY3RvcnkgPSB0aGlzLmdldERpcmVjdG9yeVBhdGgoZmlsZVBhdGgpO1xyXG5cdFx0XHRjb25zdCBkaXJDYWNoZSA9IHRoaXMuZGlyZWN0b3J5Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcblx0XHRcdGlmIChkaXJDYWNoZSkge1xyXG5cdFx0XHRcdGRpckNhY2hlLnBhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZmlsZUNhY2hlLmNsZWFyKCk7XHJcblx0XHRcdHRoaXMuZGlyZWN0b3J5Q2FjaGUuY2xlYXIoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGRpcmVjdG9yeSBjYWNoZSB3aGVuIGNvbmZpZyBmaWxlcyBjaGFuZ2VcclxuXHQgKi9cclxuXHRjbGVhckRpcmVjdG9yeUNhY2hlKGRpcmVjdG9yeTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBkaXJDYWNoZSA9IHRoaXMuZGlyZWN0b3J5Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcblx0XHRpZiAoZGlyQ2FjaGUpIHtcclxuXHRcdFx0Ly8gQ2xlYXIgYWxsIGZpbGVzIHRoYXQgdXNlZCB0aGlzIGRpcmVjdG9yeSdzIGNvbmZpZ1xyXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGRpckNhY2hlLnBhdGhzKSB7XHJcblx0XHRcdFx0dGhpcy5maWxlQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmRpcmVjdG9yeUNhY2hlLmRlbGV0ZShkaXJlY3RvcnkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlIHBlcmZvcm1hbmNlIHN0YXRpc3RpY3NcclxuXHQgKi9cclxuXHRnZXRTdGF0cygpOiBQcm9qZWN0Q2FjaGVTdGF0cyB7XHJcblx0XHRyZXR1cm4geyAuLi50aGlzLnN0YXRzIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTY2hlZHVsZSBiYXRjaCB1cGRhdGUgZm9yIG11bHRpcGxlIGZpbGVzXHJcblx0ICovXHJcblx0c2NoZWR1bGVCYXRjaFVwZGF0ZShmaWxlUGF0aHM6IHN0cmluZ1tdKTogdm9pZCB7XHJcblx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVQYXRocykge1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdVcGRhdGVzLmFkZChmaWxlUGF0aCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuYmF0Y2hVcGRhdGVUaW1lcikge1xyXG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5iYXRjaFVwZGF0ZVRpbWVyKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmJhdGNoVXBkYXRlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5wcm9jZXNzQmF0Y2hVcGRhdGVzKCk7XHJcblx0XHR9LCB0aGlzLkJBVENIX0RFTEFZKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgcGVuZGluZyBiYXRjaCB1cGRhdGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBwcm9jZXNzQmF0Y2hVcGRhdGVzKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKHRoaXMucGVuZGluZ1VwZGF0ZXMuc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcGF0aHNUb1VwZGF0ZSA9IEFycmF5LmZyb20odGhpcy5wZW5kaW5nVXBkYXRlcyk7XHJcblx0XHR0aGlzLnBlbmRpbmdVcGRhdGVzLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgY2FjaGUgZm9yIHVwZGF0ZWQgZmlsZXNcclxuXHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgcGF0aHNUb1VwZGF0ZSkge1xyXG5cdFx0XHR0aGlzLmNsZWFyQ2FjaGUoZmlsZVBhdGgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByZS1jb21wdXRlIGRhdGEgZm9yIHVwZGF0ZWQgZmlsZXNcclxuXHRcdGF3YWl0IHRoaXMuZ2V0QmF0Y2hQcm9qZWN0RGF0YShwYXRoc1RvVXBkYXRlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjYWNoZSB3aGVuIGVuaGFuY2VkIHByb2plY3Qgc2V0dGluZyBjaGFuZ2VzXHJcblx0ICovXHJcblx0b25FbmhhbmNlZFByb2plY3RTZXR0aW5nQ2hhbmdlKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdGlmICghZW5hYmxlZCkge1xyXG5cdFx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIG1vZGlmaWNhdGlvbiBldmVudHMgZm9yIGluY3JlbWVudGFsIHVwZGF0ZXNcclxuXHQgKi9cclxuXHRhc3luYyBvbkZpbGVNb2RpZmllZChmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBDbGVhciBjYWNoZSBmb3IgdGhlIG1vZGlmaWVkIGZpbGVcclxuXHRcdHRoaXMuY2xlYXJDYWNoZShmaWxlUGF0aCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIHByb2plY3QgY29uZmlnIGZpbGVcclxuXHRcdGlmIChcclxuXHRcdFx0ZmlsZVBhdGguZW5kc1dpdGgoXCIuY29uZmlnLm1kXCIpIHx8XHJcblx0XHRcdGZpbGVQYXRoLmluY2x1ZGVzKFwidGFzay1nZW5pdXNcIilcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBDbGVhciBkaXJlY3RvcnkgY2FjaGUgc2luY2UgY29uZmlnIG1heSBoYXZlIGNoYW5nZWRcclxuXHRcdFx0Y29uc3QgZGlyZWN0b3J5ID0gdGhpcy5nZXREaXJlY3RvcnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdFx0dGhpcy5jbGVhckRpcmVjdG9yeUNhY2hlKGRpcmVjdG9yeSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2NoZWR1bGUgYmF0Y2ggdXBkYXRlIGZvciB0aGlzIGZpbGVcclxuXHRcdHRoaXMuc2NoZWR1bGVCYXRjaFVwZGF0ZShbZmlsZVBhdGhdKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIGRlbGV0aW9uIGV2ZW50c1xyXG5cdCAqL1xyXG5cdG9uRmlsZURlbGV0ZWQoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0dGhpcy5jbGVhckNhY2hlKGZpbGVQYXRoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgZGlyZWN0b3J5IGNhY2hlIGlmIGl0IHdhcyBhIGNvbmZpZyBmaWxlXHJcblx0XHRpZiAoXHJcblx0XHRcdGZpbGVQYXRoLmVuZHNXaXRoKFwiLmNvbmZpZy5tZFwiKSB8fFxyXG5cdFx0XHRmaWxlUGF0aC5pbmNsdWRlcyhcInRhc2stZ2VuaXVzXCIpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgZGlyZWN0b3J5ID0gdGhpcy5nZXREaXJlY3RvcnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdFx0dGhpcy5jbGVhckRpcmVjdG9yeUNhY2hlKGRpcmVjdG9yeSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZmlsZSBjcmVhdGlvbiBldmVudHNcclxuXHQgKi9cclxuXHRhc3luYyBvbkZpbGVDcmVhdGVkKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIElmIGl0J3MgYSBjb25maWcgZmlsZSwgY2xlYXIgZGlyZWN0b3J5IGNhY2hlIHRvIHBpY2sgdXAgbmV3IGNvbmZpZ1xyXG5cdFx0aWYgKFxyXG5cdFx0XHRmaWxlUGF0aC5lbmRzV2l0aChcIi5jb25maWcubWRcIikgfHxcclxuXHRcdFx0ZmlsZVBhdGguaW5jbHVkZXMoXCJ0YXNrLWdlbml1c1wiKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IGRpcmVjdG9yeSA9IHRoaXMuZ2V0RGlyZWN0b3J5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdHRoaXMuY2xlYXJEaXJlY3RvcnlDYWNoZShkaXJlY3RvcnkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByZS1jb21wdXRlIGRhdGEgZm9yIG5ldyBmaWxlXHJcblx0XHRhd2FpdCB0aGlzLmdldFByb2plY3REYXRhKGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIHJlbmFtZS9tb3ZlIGV2ZW50c1xyXG5cdCAqL1xyXG5cdGFzeW5jIG9uRmlsZVJlbmFtZWQob2xkUGF0aDogc3RyaW5nLCBuZXdQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIENsZWFyIGNhY2hlIGZvciBvbGQgcGF0aFxyXG5cdFx0dGhpcy5jbGVhckNhY2hlKG9sZFBhdGgpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSByZWxldmFudCBkaXJlY3RvcnkgY2FjaGVzXHJcblx0XHRjb25zdCBvbGREaXJlY3RvcnkgPSB0aGlzLmdldERpcmVjdG9yeVBhdGgob2xkUGF0aCk7XHJcblx0XHRjb25zdCBuZXdEaXJlY3RvcnkgPSB0aGlzLmdldERpcmVjdG9yeVBhdGgobmV3UGF0aCk7XHJcblxyXG5cdFx0aWYgKG9sZFBhdGguZW5kc1dpdGgoXCIuY29uZmlnLm1kXCIpIHx8IG9sZFBhdGguaW5jbHVkZXMoXCJ0YXNrLWdlbml1c1wiKSkge1xyXG5cdFx0XHR0aGlzLmNsZWFyRGlyZWN0b3J5Q2FjaGUob2xkRGlyZWN0b3J5KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAobmV3UGF0aC5lbmRzV2l0aChcIi5jb25maWcubWRcIikgfHwgbmV3UGF0aC5pbmNsdWRlcyhcInRhc2stZ2VuaXVzXCIpKSB7XHJcblx0XHRcdHRoaXMuY2xlYXJEaXJlY3RvcnlDYWNoZShuZXdEaXJlY3RvcnkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByZS1jb21wdXRlIGRhdGEgZm9yIG5ldyBwYXRoXHJcblx0XHRhd2FpdCB0aGlzLmdldFByb2plY3REYXRhKG5ld1BhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgYW5kIHJlZnJlc2ggY2FjaGUgZW50cmllcyB0aGF0IG1heSBiZSBzdGFsZVxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlZnJlc2hTdGFsZUVudHJpZXMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBzdGFsZUZpbGVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgW2ZpbGVQYXRoLCBjYWNoZWREYXRhXSBvZiB0aGlzLmZpbGVDYWNoZS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmlzQ2FjaGVWYWxpZChmaWxlUGF0aCwgY2FjaGVkRGF0YSkpIHtcclxuXHRcdFx0XHRzdGFsZUZpbGVzLnB1c2goZmlsZVBhdGgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHN0YWxlRmlsZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgUmVmcmVzaGluZyAke3N0YWxlRmlsZXMubGVuZ3RofSBzdGFsZSBwcm9qZWN0IGRhdGEgY2FjaGUgZW50cmllc2BcclxuXHRcdFx0KTtcclxuXHRcdFx0YXdhaXQgdGhpcy5nZXRCYXRjaFByb2plY3REYXRhKHN0YWxlRmlsZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJlbG9hZCBwcm9qZWN0IGRhdGEgZm9yIHJlY2VudGx5IGFjY2Vzc2VkIGZpbGVzXHJcblx0ICovXHJcblx0YXN5bmMgcHJlbG9hZFJlY2VudEZpbGVzKGZpbGVQYXRoczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHVuY2FjaGVkRmlsZXMgPSBmaWxlUGF0aHMuZmlsdGVyKFxyXG5cdFx0XHQocGF0aCkgPT4gIXRoaXMuZmlsZUNhY2hlLmhhcyhwYXRoKVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAodW5jYWNoZWRGaWxlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBQcmVsb2FkaW5nIHByb2plY3QgZGF0YSBmb3IgJHt1bmNhY2hlZEZpbGVzLmxlbmd0aH0gcmVjZW50IGZpbGVzYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLmdldEJhdGNoUHJvamVjdERhdGEodW5jYWNoZWRGaWxlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgcHJvamVjdCBkYXRhIGluIGNhY2hlIChmb3IgZXh0ZXJuYWwgdXBkYXRlcylcclxuXHQgKi9cclxuXHRhc3luYyBzZXRQcm9qZWN0RGF0YShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRwcm9qZWN0RGF0YTogQ2FjaGVkUHJvamVjdERhdGFcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRoaXMuZmlsZUNhY2hlLnNldChmaWxlUGF0aCwgcHJvamVjdERhdGEpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBkaXJlY3RvcnkgY2FjaGUgdHJhY2tpbmdcclxuXHRcdGNvbnN0IGRpcmVjdG9yeSA9IHRoaXMuZ2V0RGlyZWN0b3J5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRjb25zdCBkaXJDYWNoZSA9IHRoaXMuZGlyZWN0b3J5Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XHJcblx0XHRpZiAoZGlyQ2FjaGUpIHtcclxuXHRcdFx0ZGlyQ2FjaGUucGF0aHMuYWRkKGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19