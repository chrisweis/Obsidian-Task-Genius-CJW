/**
 * Task Parsing Service
 *
 * Provides enhanced task parsing with project configuration support for main thread operations.
 * This service is designed to complement the Worker-based parsing system by providing:
 *
 * 1. File system access for project configuration files
 * 2. Frontmatter metadata resolution
 * 3. Enhanced project detection that requires file system traversal
 *
 * Note: The bulk of task parsing is handled by the Worker system, which already
 * includes basic project configuration support. This service is for cases where
 * main thread file system access is required.
 */
import { __awaiter } from "tslib";
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { ProjectConfigManager, } from "../managers/project-config-manager";
import { ProjectDataWorkerManager } from "../dataflow/workers/ProjectDataWorkerManager";
export class TaskParsingService {
    constructor(options) {
        var _a, _b, _c;
        this.vault = options.vault;
        this.metadataCache = options.metadataCache;
        this.parser = new MarkdownTaskParser(options.parserConfig);
        // Initialize project config manager if enhanced project is enabled
        if (((_a = options.parserConfig.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject) &&
            options.projectConfigOptions) {
            this.projectConfigManager = new ProjectConfigManager(Object.assign(Object.assign({ vault: options.vault, metadataCache: options.metadataCache }, options.projectConfigOptions), { enhancedProjectEnabled: options.parserConfig.projectConfig.enableEnhancedProject, metadataConfigEnabled: (_b = options.projectConfigOptions.metadataConfigEnabled) !== null && _b !== void 0 ? _b : false, configFileEnabled: (_c = options.projectConfigOptions.configFileEnabled) !== null && _c !== void 0 ? _c : false }));
            // Initialize project data worker manager for performance optimization
            this.projectDataWorkerManager = new ProjectDataWorkerManager({
                vault: options.vault,
                metadataCache: options.metadataCache,
                projectConfigManager: this.projectConfigManager,
            });
        }
    }
    /**
     * Parse tasks from content with enhanced project support
     */
    parseTasksFromContent(content, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            let fileMetadata;
            let projectConfigData;
            let tgProject;
            // Get metadata based on whether enhanced project is enabled
            if (this.projectConfigManager) {
                try {
                    // Always use enhanced metadata when project config manager is available
                    // as it only exists when enhanced project is enabled
                    const enhancedMetadata = yield this.projectConfigManager.getEnhancedMetadata(filePath);
                    fileMetadata = enhancedMetadata;
                    // Get project configuration data
                    projectConfigData =
                        (yield this.projectConfigManager.getProjectConfig(filePath)) || undefined;
                    // Determine tgProject
                    tgProject = yield this.projectConfigManager.determineTgProject(filePath);
                }
                catch (error) {
                    console.warn(`Failed to get enhanced metadata for ${filePath}:`, error);
                    // Fallback to basic file metadata if enhanced metadata fails
                    fileMetadata =
                        this.projectConfigManager.getFileMetadata(filePath) ||
                            undefined;
                }
            }
            // Parse tasks with metadata (enhanced or basic depending on configuration)
            return this.parser.parse(content, filePath, fileMetadata, projectConfigData, tgProject);
        });
    }
    /**
     * Parse tasks and return legacy Task format for compatibility
     */
    parseTasksFromContentLegacy(content, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            let fileMetadata;
            let projectConfigData;
            let tgProject;
            // Get metadata based on whether enhanced project is enabled
            if (this.projectConfigManager) {
                try {
                    // Always use enhanced metadata when project config manager is available
                    // as it only exists when enhanced project is enabled
                    const enhancedMetadata = yield this.projectConfigManager.getEnhancedMetadata(filePath);
                    fileMetadata = enhancedMetadata;
                    // Get project configuration data
                    projectConfigData =
                        (yield this.projectConfigManager.getProjectConfig(filePath)) || undefined;
                    // Determine tgProject
                    tgProject = yield this.projectConfigManager.determineTgProject(filePath);
                }
                catch (error) {
                    console.warn(`Failed to get enhanced metadata for ${filePath}:`, error);
                    // Fallback to basic file metadata if enhanced metadata fails
                    fileMetadata =
                        this.projectConfigManager.getFileMetadata(filePath) ||
                            undefined;
                }
            }
            // Parse tasks with metadata (enhanced or basic depending on configuration)
            return this.parser.parseLegacy(content, filePath, fileMetadata, projectConfigData, tgProject);
        });
    }
    /**
     * Parse tasks from content without enhanced project features
     * This method always uses basic file metadata without MetadataMapping transforms
     */
    parseTasksFromContentBasic(content, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Parse tasks with NO metadata, project config, or tgProject
            // This ensures no enhanced features are applied
            return this.parser.parseLegacy(content, filePath, undefined, // No file metadata
            undefined, // No project config data
            undefined // No tgProject
            );
        });
    }
    /**
     * Parse a single task line
     */
    parseTaskLine(line, filePath, lineNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const tasks = yield this.parseTasksFromContentLegacy(line, filePath);
            if (tasks.length > 0) {
                const task = tasks[0];
                // Override line number to match the expected behavior
                task.line = lineNumber;
                return task;
            }
            return null;
        });
    }
    /**
     * Get enhanced metadata for a file
     */
    getEnhancedMetadata(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectConfigManager) {
                return {};
            }
            try {
                return yield this.projectConfigManager.getEnhancedMetadata(filePath);
            }
            catch (error) {
                console.warn(`Failed to get enhanced metadata for ${filePath}:`, error);
                return {};
            }
        });
    }
    /**
     * Get tgProject for a file
     */
    getTgProject(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectConfigManager) {
                return undefined;
            }
            try {
                return yield this.projectConfigManager.determineTgProject(filePath);
            }
            catch (error) {
                console.warn(`Failed to determine tgProject for ${filePath}:`, error);
                return undefined;
            }
        });
    }
    /**
     * Clear project configuration cache
     */
    clearProjectConfigCache(filePath) {
        if (this.projectConfigManager) {
            this.projectConfigManager.clearCache(filePath);
        }
    }
    /**
     * Update parser configuration
     */
    updateParserConfig(config) {
        this.parser = new MarkdownTaskParser(config);
    }
    /**
     * Update project configuration options
     */
    updateProjectConfigOptions(options) {
        if (this.projectConfigManager) {
            this.projectConfigManager.updateOptions(options);
        }
    }
    /**
     * Enable or disable enhanced project support
     */
    setEnhancedProjectEnabled(enabled, projectConfigOptions) {
        var _a, _b, _c, _d;
        if (enabled && projectConfigOptions) {
            // Create or update project config manager
            if (!this.projectConfigManager) {
                this.projectConfigManager = new ProjectConfigManager(Object.assign(Object.assign({ vault: this.vault, metadataCache: this.metadataCache }, projectConfigOptions), { enhancedProjectEnabled: enabled, metadataConfigEnabled: (_a = projectConfigOptions.metadataConfigEnabled) !== null && _a !== void 0 ? _a : false, configFileEnabled: (_b = projectConfigOptions.configFileEnabled) !== null && _b !== void 0 ? _b : false }));
            }
            else {
                this.projectConfigManager.updateOptions(Object.assign(Object.assign({}, projectConfigOptions), { enhancedProjectEnabled: enabled, metadataConfigEnabled: (_c = projectConfigOptions.metadataConfigEnabled) !== null && _c !== void 0 ? _c : false, configFileEnabled: (_d = projectConfigOptions.configFileEnabled) !== null && _d !== void 0 ? _d : false }));
            }
        }
        else if (!enabled) {
            // Disable project config manager or set it to disabled state
            if (this.projectConfigManager) {
                this.projectConfigManager.setEnhancedProjectEnabled(false);
            }
            else {
                this.projectConfigManager = undefined;
            }
        }
    }
    /**
     * Check if enhanced project support is enabled
     */
    isEnhancedProjectEnabled() {
        return (!!this.projectConfigManager &&
            this.projectConfigManager.isEnhancedProjectEnabled());
    }
    /**
     * Pre-compute enhanced project data for all files in the vault
     * This is designed to be called before Worker processing to provide
     * complete project information that requires file system access
     *
     * PERFORMANCE OPTIMIZATION: Now uses ProjectDataWorkerManager for efficient
     * batch processing with caching and worker-based computation.
     */
    computeEnhancedProjectData(filePaths) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.projectConfigManager ||
                !this.projectConfigManager.isEnhancedProjectEnabled()) {
                return {
                    fileProjectMap: {},
                    fileMetadataMap: {},
                    projectConfigMap: {},
                };
            }
            const fileProjectMap = {};
            const fileMetadataMap = {};
            const projectConfigMap = {};
            // Use optimized batch processing with worker manager if available
            if (this.projectDataWorkerManager) {
                try {
                    console.log(`Computing enhanced project data for ${filePaths.length} files using optimized worker-based approach...`);
                    const startTime = Date.now();
                    // Get batch project data using optimized cache and worker processing
                    const projectDataMap = yield this.projectDataWorkerManager.getBatchProjectData(filePaths);
                    // Convert to the format expected by workers
                    for (const [filePath, cachedData] of projectDataMap) {
                        if (cachedData.tgProject) {
                            fileProjectMap[filePath] = {
                                project: cachedData.tgProject.name,
                                source: cachedData.tgProject.source ||
                                    cachedData.tgProject.type,
                                readonly: (_a = cachedData.tgProject.readonly) !== null && _a !== void 0 ? _a : true,
                            };
                        }
                        if (Object.keys(cachedData.enhancedMetadata).length > 0) {
                            fileMetadataMap[filePath] = cachedData.enhancedMetadata;
                        }
                    }
                    // Build project config map from unique directories
                    const uniqueDirectories = new Set();
                    for (const filePath of filePaths) {
                        const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
                        if (dirPath) {
                            uniqueDirectories.add(dirPath);
                        }
                    }
                    // Get project configs for unique directories only (optimization)
                    for (const dirPath of uniqueDirectories) {
                        try {
                            // Use a file from this directory to get project config
                            const sampleFilePath = filePaths.find((path) => path.substring(0, path.lastIndexOf("/")) ===
                                dirPath);
                            if (sampleFilePath) {
                                const projectConfig = yield this.projectConfigManager.getProjectConfig(sampleFilePath);
                                if (projectConfig &&
                                    Object.keys(projectConfig).length > 0) {
                                    const enhancedProjectConfig = this.projectConfigManager.applyMappingsToMetadata(projectConfig);
                                    projectConfigMap[dirPath] =
                                        enhancedProjectConfig;
                                }
                            }
                        }
                        catch (error) {
                            console.warn(`Failed to get project config for directory ${dirPath}:`, error);
                        }
                    }
                    const processingTime = Date.now() - startTime;
                    console.log(`Enhanced project data computation completed in ${processingTime}ms using optimized approach`);
                    return {
                        fileProjectMap,
                        fileMetadataMap,
                        projectConfigMap,
                    };
                }
                catch (error) {
                    console.warn("Failed to use optimized project data computation, falling back to synchronous method:", error);
                }
            }
            // Fallback to original synchronous method if worker manager is not available
            console.log(`Computing enhanced project data for ${filePaths.length} files using fallback synchronous approach...`);
            const startTime = Date.now();
            // Process each file to determine its project and metadata (original logic)
            for (const filePath of filePaths) {
                try {
                    // Get tgProject for this file
                    const tgProject = yield this.projectConfigManager.determineTgProject(filePath);
                    if (tgProject) {
                        fileProjectMap[filePath] = {
                            project: tgProject.name,
                            source: tgProject.source || tgProject.type,
                            readonly: (_b = tgProject.readonly) !== null && _b !== void 0 ? _b : true,
                        };
                    }
                    // Get enhanced metadata for this file
                    const enhancedMetadata = yield this.projectConfigManager.getEnhancedMetadata(filePath);
                    if (Object.keys(enhancedMetadata).length > 0) {
                        fileMetadataMap[filePath] = enhancedMetadata;
                    }
                    // Get project config for this file's directory
                    const projectConfig = yield this.projectConfigManager.getProjectConfig(filePath);
                    if (projectConfig && Object.keys(projectConfig).length > 0) {
                        // Apply metadata mappings to project config data as well
                        const enhancedProjectConfig = this.projectConfigManager.applyMappingsToMetadata(projectConfig);
                        // Use directory path as key for project config
                        const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
                        projectConfigMap[dirPath] = enhancedProjectConfig;
                    }
                }
                catch (error) {
                    console.warn(`Failed to compute enhanced project data for ${filePath}:`, error);
                }
            }
            const processingTime = Date.now() - startTime;
            console.log(`Enhanced project data computation completed in ${processingTime}ms using fallback approach`);
            return {
                fileProjectMap,
                fileMetadataMap,
                projectConfigMap,
            };
        });
    }
    /**
     * Get enhanced project data for a specific file (for single file operations)
     */
    getEnhancedDataForFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.projectConfigManager ||
                !this.projectConfigManager.isEnhancedProjectEnabled()) {
                return {};
            }
            try {
                const [tgProject, enhancedMetadata, projectConfigData] = yield Promise.all([
                    this.projectConfigManager.determineTgProject(filePath),
                    this.projectConfigManager.getEnhancedMetadata(filePath),
                    this.projectConfigManager.getProjectConfig(filePath),
                ]);
                return {
                    tgProject,
                    fileMetadata: Object.keys(enhancedMetadata).length > 0
                        ? enhancedMetadata
                        : undefined,
                    projectConfigData: projectConfigData &&
                        Object.keys(projectConfigData).length > 0
                        ? projectConfigData
                        : undefined,
                };
            }
            catch (error) {
                console.warn(`Failed to get enhanced data for ${filePath}:`, error);
                return {};
            }
        });
    }
    /**
     * Handle settings changes for project configuration
     */
    onSettingsChange() {
        if (this.projectDataWorkerManager) {
            this.projectDataWorkerManager.onSettingsChange();
        }
    }
    /**
     * Handle enhanced project setting changes
     */
    onEnhancedProjectSettingChange(enabled) {
        if (this.projectConfigManager) {
            this.projectConfigManager.setEnhancedProjectEnabled(enabled);
        }
        if (this.projectDataWorkerManager) {
            this.projectDataWorkerManager.onEnhancedProjectSettingChange(enabled);
        }
    }
    /**
     * Clear cache for project data
     */
    clearProjectDataCache(filePath) {
        if (this.projectDataWorkerManager) {
            this.projectDataWorkerManager.clearCache(filePath);
        }
        if (this.projectConfigManager) {
            this.projectConfigManager.clearCache(filePath);
        }
    }
    /**
     * Clear all caches (project config, project data, and enhanced metadata)
     * This is designed for scenarios like forceReindex where complete cache clearing is needed
     */
    clearAllCaches() {
        // Clear project configuration caches
        this.clearProjectConfigCache();
        // Clear project data caches
        this.clearProjectDataCache();
        // Force clear all ProjectConfigManager caches including our new timestamp caches
        if (this.projectConfigManager) {
            // Call clearCache without parameters to clear ALL caches
            this.projectConfigManager.clearCache();
        }
        // Force clear all ProjectDataWorkerManager caches
        if (this.projectDataWorkerManager) {
            // Call clearCache without parameters to clear ALL caches
            this.projectDataWorkerManager.clearCache();
        }
    }
    /**
     * Get cache performance statistics including detailed breakdown
     */
    getProjectDataCacheStats() {
        var _a, _b;
        const workerStats = (_a = this.projectDataWorkerManager) === null || _a === void 0 ? void 0 : _a.getCacheStats();
        const configStats = (_b = this.projectConfigManager) === null || _b === void 0 ? void 0 : _b.getCacheStats();
        return {
            workerManager: workerStats,
            configManager: configStats,
            combined: {
                totalFiles: ((workerStats === null || workerStats === void 0 ? void 0 : workerStats.fileCacheSize) || 0) + ((configStats === null || configStats === void 0 ? void 0 : configStats.fileMetadataCache.size) || 0),
                totalMemory: ((configStats === null || configStats === void 0 ? void 0 : configStats.totalMemoryUsage.estimatedBytes) || 0),
            }
        };
    }
    /**
     * Get detailed cache statistics for monitoring and debugging
     */
    getDetailedCacheStats() {
        var _a, _b;
        const configStats = (_a = this.projectConfigManager) === null || _a === void 0 ? void 0 : _a.getCacheStats();
        const workerStats = (_b = this.projectDataWorkerManager) === null || _b === void 0 ? void 0 : _b.getCacheStats();
        const totalFiles = ((configStats === null || configStats === void 0 ? void 0 : configStats.fileMetadataCache.size) || 0) +
            ((configStats === null || configStats === void 0 ? void 0 : configStats.enhancedMetadataCache.size) || 0) +
            ((workerStats === null || workerStats === void 0 ? void 0 : workerStats.fileCacheSize) || 0);
        const cacheTypes = [];
        if (configStats === null || configStats === void 0 ? void 0 : configStats.fileMetadataCache.size)
            cacheTypes.push('fileMetadata');
        if (configStats === null || configStats === void 0 ? void 0 : configStats.enhancedMetadataCache.size)
            cacheTypes.push('enhancedMetadata');
        if (configStats === null || configStats === void 0 ? void 0 : configStats.configCache.size)
            cacheTypes.push('projectConfig');
        if (workerStats === null || workerStats === void 0 ? void 0 : workerStats.fileCacheSize)
            cacheTypes.push('projectData');
        return {
            projectConfigManager: configStats,
            projectDataWorkerManager: workerStats,
            summary: {
                totalCachedFiles: totalFiles,
                estimatedMemoryUsage: (configStats === null || configStats === void 0 ? void 0 : configStats.totalMemoryUsage.estimatedBytes) || 0,
                cacheTypes,
            }
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.projectDataWorkerManager) {
            this.projectDataWorkerManager.destroy();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1wYXJzaW5nLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrLXBhcnNpbmctc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztHQWFHOztBQUdILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQXdDeEYsTUFBTSxPQUFPLGtCQUFrQjtJQU85QixZQUFZLE9BQWtDOztRQUM3QyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFM0QsbUVBQW1FO1FBQ25FLElBQ0MsQ0FBQSxNQUFBLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSwwQ0FBRSxxQkFBcUI7WUFDekQsT0FBTyxDQUFDLG9CQUFvQixFQUMzQjtZQUNELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQiwrQkFDbkQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQ3BCLGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYSxJQUNqQyxPQUFPLENBQUMsb0JBQW9CLEtBQy9CLHNCQUFzQixFQUN0QixPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsRUFDeEQscUJBQXFCLEVBQ3BCLE1BQUEsT0FBTyxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixtQ0FBSSxLQUFLLEVBQzVELGlCQUFpQixFQUNoQixNQUFBLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsbUNBQUksS0FBSyxJQUN2RCxD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V0FBVyx1QkFBWCxXQUFXLENBQUUsV0FBVyxDQUFDLElBQUk7WUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3BFLElBQUssV0FBbUIsYUFBbkIsV0FBVyx1QkFBWCxXQUFXLENBQVUsYUFBYTtZQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEUsT0FBTztZQUNOLG9CQUFvQixFQUFFLFdBQVc7WUFDakMsd0JBQXdCLEVBQUUsV0FBVztZQUNyQyxPQUFPLEVBQUU7Z0JBQ1IsZ0JBQWdCLEVBQUUsVUFBVTtnQkFDNUIsb0JBQW9CLEVBQUUsQ0FBQSxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUUsZ0JBQWdCLENBQUMsY0FBYyxLQUFJLENBQUM7Z0JBQ3ZFLFVBQVU7YUFDVjtTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDbEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ3hDO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRhc2sgUGFyc2luZyBTZXJ2aWNlXHJcbiAqXHJcbiAqIFByb3ZpZGVzIGVuaGFuY2VkIHRhc2sgcGFyc2luZyB3aXRoIHByb2plY3QgY29uZmlndXJhdGlvbiBzdXBwb3J0IGZvciBtYWluIHRocmVhZCBvcGVyYXRpb25zLlxyXG4gKiBUaGlzIHNlcnZpY2UgaXMgZGVzaWduZWQgdG8gY29tcGxlbWVudCB0aGUgV29ya2VyLWJhc2VkIHBhcnNpbmcgc3lzdGVtIGJ5IHByb3ZpZGluZzpcclxuICpcclxuICogMS4gRmlsZSBzeXN0ZW0gYWNjZXNzIGZvciBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZmlsZXNcclxuICogMi4gRnJvbnRtYXR0ZXIgbWV0YWRhdGEgcmVzb2x1dGlvblxyXG4gKiAzLiBFbmhhbmNlZCBwcm9qZWN0IGRldGVjdGlvbiB0aGF0IHJlcXVpcmVzIGZpbGUgc3lzdGVtIHRyYXZlcnNhbFxyXG4gKlxyXG4gKiBOb3RlOiBUaGUgYnVsayBvZiB0YXNrIHBhcnNpbmcgaXMgaGFuZGxlZCBieSB0aGUgV29ya2VyIHN5c3RlbSwgd2hpY2ggYWxyZWFkeVxyXG4gKiBpbmNsdWRlcyBiYXNpYyBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gc3VwcG9ydC4gVGhpcyBzZXJ2aWNlIGlzIGZvciBjYXNlcyB3aGVyZVxyXG4gKiBtYWluIHRocmVhZCBmaWxlIHN5c3RlbSBhY2Nlc3MgaXMgcmVxdWlyZWQuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgVmF1bHQsIE1ldGFkYXRhQ2FjaGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTWFya2Rvd25UYXNrUGFyc2VyIH0gZnJvbSBcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQge1xyXG5cdFByb2plY3RDb25maWdNYW5hZ2VyLFxyXG5cdFByb2plY3RDb25maWdNYW5hZ2VyT3B0aW9ucyxcclxufSBmcm9tIFwiLi4vbWFuYWdlcnMvcHJvamVjdC1jb25maWctbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvd29ya2Vycy9Qcm9qZWN0RGF0YVdvcmtlck1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVGFza1BhcnNlckNvbmZpZywgRW5oYW5jZWRUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL1Rhc2tQYXJzZXJDb25maWdcIjtcclxuaW1wb3J0IHsgVGFzaywgVGdQcm9qZWN0IH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgRW5oYW5jZWRQcm9qZWN0RGF0YSB9IGZyb20gXCJAL2RhdGFmbG93L3dvcmtlcnMvdGFzay1pbmRleC1tZXNzYWdlXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tQYXJzaW5nU2VydmljZU9wdGlvbnMge1xyXG5cdHZhdWx0OiBWYXVsdDtcclxuXHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cdHBhcnNlckNvbmZpZzogVGFza1BhcnNlckNvbmZpZztcclxuXHRwcm9qZWN0Q29uZmlnT3B0aW9ucz86IHtcclxuXHRcdGNvbmZpZ0ZpbGVOYW1lOiBzdHJpbmc7XHJcblx0XHRzZWFyY2hSZWN1cnNpdmVseTogYm9vbGVhbjtcclxuXHRcdG1ldGFkYXRhS2V5OiBzdHJpbmc7XHJcblx0XHRwYXRoTWFwcGluZ3M6IEFycmF5PHtcclxuXHRcdFx0cGF0aFBhdHRlcm46IHN0cmluZztcclxuXHRcdFx0cHJvamVjdE5hbWU6IHN0cmluZztcclxuXHRcdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRcdH0+O1xyXG5cdFx0bWV0YWRhdGFNYXBwaW5nczogQXJyYXk8e1xyXG5cdFx0XHRzb3VyY2VLZXk6IHN0cmluZztcclxuXHRcdFx0dGFyZ2V0S2V5OiBzdHJpbmc7XHJcblx0XHRcdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0XHR9PjtcclxuXHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIgfCBcImZvbGRlcm5hbWVcIiB8IFwibWV0YWRhdGFcIjtcclxuXHRcdFx0bWV0YWRhdGFLZXk/OiBzdHJpbmc7XHJcblx0XHRcdHN0cmlwRXh0ZW5zaW9uPzogYm9vbGVhbjtcclxuXHRcdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRcdH07XHJcblx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ/OiBib29sZWFuO1xyXG5cdFx0Y29uZmlnRmlsZUVuYWJsZWQ/OiBib29sZWFuO1xyXG5cdFx0ZGV0ZWN0aW9uTWV0aG9kcz86IEFycmF5PHtcclxuXHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiIHwgXCJ0YWdcIiB8IFwibGlua1wiO1xyXG5cdFx0XHRwcm9wZXJ0eUtleTogc3RyaW5nO1xyXG5cdFx0XHRsaW5rRmlsdGVyPzogc3RyaW5nO1xyXG5cdFx0XHRlbmFibGVkOiBib29sZWFuO1xyXG5cdFx0fT47XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRhc2tQYXJzaW5nU2VydmljZSB7XHJcblx0cHJpdmF0ZSBwYXJzZXI6IE1hcmtkb3duVGFza1BhcnNlcjtcclxuXHRwcml2YXRlIHByb2plY3RDb25maWdNYW5hZ2VyPzogUHJvamVjdENvbmZpZ01hbmFnZXI7XHJcblx0cHJpdmF0ZSBwcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI/OiBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI7XHJcblx0cHJpdmF0ZSB2YXVsdDogVmF1bHQ7XHJcblx0cHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zOiBUYXNrUGFyc2luZ1NlcnZpY2VPcHRpb25zKSB7XHJcblx0XHR0aGlzLnZhdWx0ID0gb3B0aW9ucy52YXVsdDtcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IG9wdGlvbnMubWV0YWRhdGFDYWNoZTtcclxuXHRcdHRoaXMucGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihvcHRpb25zLnBhcnNlckNvbmZpZyk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBwcm9qZWN0IGNvbmZpZyBtYW5hZ2VyIGlmIGVuaGFuY2VkIHByb2plY3QgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHRvcHRpb25zLnBhcnNlckNvbmZpZy5wcm9qZWN0Q29uZmlnPy5lbmFibGVFbmhhbmNlZFByb2plY3QgJiZcclxuXHRcdFx0b3B0aW9ucy5wcm9qZWN0Q29uZmlnT3B0aW9uc1xyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdHZhdWx0OiBvcHRpb25zLnZhdWx0LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ2FjaGU6IG9wdGlvbnMubWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0XHQuLi5vcHRpb25zLnByb2plY3RDb25maWdPcHRpb25zLFxyXG5cdFx0XHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6XHJcblx0XHRcdFx0b3B0aW9ucy5wYXJzZXJDb25maWcucHJvamVjdENvbmZpZy5lbmFibGVFbmhhbmNlZFByb2plY3QsXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOlxyXG5cdFx0XHRcdFx0b3B0aW9ucy5wcm9qZWN0Q29uZmlnT3B0aW9ucy5tZXRhZGF0YUNvbmZpZ0VuYWJsZWQgPz8gZmFsc2UsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6XHJcblx0XHRcdFx0XHRvcHRpb25zLnByb2plY3RDb25maWdPcHRpb25zLmNvbmZpZ0ZpbGVFbmFibGVkID8/IGZhbHNlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxpemUgcHJvamVjdCBkYXRhIHdvcmtlciBtYW5hZ2VyIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cclxuXHRcdFx0dGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIgPSBuZXcgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyKHtcclxuXHRcdFx0XHR2YXVsdDogb3B0aW9ucy52YXVsdCxcclxuXHRcdFx0XHRtZXRhZGF0YUNhY2hlOiBvcHRpb25zLm1ldGFkYXRhQ2FjaGUsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXI6IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGFza3MgZnJvbSBjb250ZW50IHdpdGggZW5oYW5jZWQgcHJvamVjdCBzdXBwb3J0XHJcblx0ICovXHJcblx0YXN5bmMgcGFyc2VUYXNrc0Zyb21Db250ZW50KFxyXG5cdFx0Y29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8RW5oYW5jZWRUYXNrW10+IHtcclxuXHRcdGxldCBmaWxlTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgcHJvamVjdENvbmZpZ0RhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgdGdQcm9qZWN0OiBUZ1Byb2plY3QgfCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0Ly8gR2V0IG1ldGFkYXRhIGJhc2VkIG9uIHdoZXRoZXIgZW5oYW5jZWQgcHJvamVjdCBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcikge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIEFsd2F5cyB1c2UgZW5oYW5jZWQgbWV0YWRhdGEgd2hlbiBwcm9qZWN0IGNvbmZpZyBtYW5hZ2VyIGlzIGF2YWlsYWJsZVxyXG5cdFx0XHRcdC8vIGFzIGl0IG9ubHkgZXhpc3RzIHdoZW4gZW5oYW5jZWQgcHJvamVjdCBpcyBlbmFibGVkXHJcblx0XHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmdldEVuaGFuY2VkTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YSA9IGVuaGFuY2VkTWV0YWRhdGE7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZGF0YVxyXG5cdFx0XHRcdHByb2plY3RDb25maWdEYXRhID1cclxuXHRcdFx0XHRcdChhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmdldFByb2plY3RDb25maWcoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoXHJcblx0XHRcdFx0XHQpKSB8fCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRcdC8vIERldGVybWluZSB0Z1Byb2plY3RcclxuXHRcdFx0XHR0Z1Byb2plY3QgPSBhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcdGZpbGVQYXRoXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgRmFpbGVkIHRvIGdldCBlbmhhbmNlZCBtZXRhZGF0YSBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBGYWxsYmFjayB0byBiYXNpYyBmaWxlIG1ldGFkYXRhIGlmIGVuaGFuY2VkIG1ldGFkYXRhIGZhaWxzXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhID1cclxuXHRcdFx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RmlsZU1ldGFkYXRhKGZpbGVQYXRoKSB8fFxyXG5cdFx0XHRcdFx0dW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUGFyc2UgdGFza3Mgd2l0aCBtZXRhZGF0YSAoZW5oYW5jZWQgb3IgYmFzaWMgZGVwZW5kaW5nIG9uIGNvbmZpZ3VyYXRpb24pXHJcblx0XHRyZXR1cm4gdGhpcy5wYXJzZXIucGFyc2UoXHJcblx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRmaWxlTWV0YWRhdGEsXHJcblx0XHRcdHByb2plY3RDb25maWdEYXRhLFxyXG5cdFx0XHR0Z1Byb2plY3RcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0YXNrcyBhbmQgcmV0dXJuIGxlZ2FjeSBUYXNrIGZvcm1hdCBmb3IgY29tcGF0aWJpbGl0eVxyXG5cdCAqL1xyXG5cdGFzeW5jIHBhcnNlVGFza3NGcm9tQ29udGVudExlZ2FjeShcclxuXHRcdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0bGV0IGZpbGVNZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCBwcm9qZWN0Q29uZmlnRGF0YTogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCB0Z1Byb2plY3Q6IFRnUHJvamVjdCB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBHZXQgbWV0YWRhdGEgYmFzZWQgb24gd2hldGhlciBlbmhhbmNlZCBwcm9qZWN0IGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gQWx3YXlzIHVzZSBlbmhhbmNlZCBtZXRhZGF0YSB3aGVuIHByb2plY3QgY29uZmlnIG1hbmFnZXIgaXMgYXZhaWxhYmxlXHJcblx0XHRcdFx0Ly8gYXMgaXQgb25seSBleGlzdHMgd2hlbiBlbmhhbmNlZCBwcm9qZWN0IGlzIGVuYWJsZWRcclxuXHRcdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID1cclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhID0gZW5oYW5jZWRNZXRhZGF0YTtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHByb2plY3QgY29uZmlndXJhdGlvbiBkYXRhXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ0RhdGEgPVxyXG5cdFx0XHRcdFx0KGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0UHJvamVjdENvbmZpZyhcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdCkpIHx8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRnUHJvamVjdFxyXG5cdFx0XHRcdHRnUHJvamVjdCA9IGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdGBGYWlsZWQgdG8gZ2V0IGVuaGFuY2VkIG1ldGFkYXRhIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGJhc2ljIGZpbGUgbWV0YWRhdGEgaWYgZW5oYW5jZWQgbWV0YWRhdGEgZmFpbHNcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGEgPVxyXG5cdFx0XHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpIHx8XHJcblx0XHRcdFx0XHR1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQYXJzZSB0YXNrcyB3aXRoIG1ldGFkYXRhIChlbmhhbmNlZCBvciBiYXNpYyBkZXBlbmRpbmcgb24gY29uZmlndXJhdGlvbilcclxuXHRcdHJldHVybiB0aGlzLnBhcnNlci5wYXJzZUxlZ2FjeShcclxuXHRcdFx0Y29udGVudCxcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGZpbGVNZXRhZGF0YSxcclxuXHRcdFx0cHJvamVjdENvbmZpZ0RhdGEsXHJcblx0XHRcdHRnUHJvamVjdFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIHRhc2tzIGZyb20gY29udGVudCB3aXRob3V0IGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXNcclxuXHQgKiBUaGlzIG1ldGhvZCBhbHdheXMgdXNlcyBiYXNpYyBmaWxlIG1ldGFkYXRhIHdpdGhvdXQgTWV0YWRhdGFNYXBwaW5nIHRyYW5zZm9ybXNcclxuXHQgKi9cclxuXHRhc3luYyBwYXJzZVRhc2tzRnJvbUNvbnRlbnRCYXNpYyhcclxuXHRcdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Ly8gUGFyc2UgdGFza3Mgd2l0aCBOTyBtZXRhZGF0YSwgcHJvamVjdCBjb25maWcsIG9yIHRnUHJvamVjdFxyXG5cdFx0Ly8gVGhpcyBlbnN1cmVzIG5vIGVuaGFuY2VkIGZlYXR1cmVzIGFyZSBhcHBsaWVkXHJcblx0XHRyZXR1cm4gdGhpcy5wYXJzZXIucGFyc2VMZWdhY3koXHJcblx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHR1bmRlZmluZWQsIC8vIE5vIGZpbGUgbWV0YWRhdGFcclxuXHRcdFx0dW5kZWZpbmVkLCAvLyBObyBwcm9qZWN0IGNvbmZpZyBkYXRhXHJcblx0XHRcdHVuZGVmaW5lZCAvLyBObyB0Z1Byb2plY3RcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBhIHNpbmdsZSB0YXNrIGxpbmVcclxuXHQgKi9cclxuXHRhc3luYyBwYXJzZVRhc2tMaW5lKFxyXG5cdFx0bGluZTogc3RyaW5nLFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGxpbmVOdW1iZXI6IG51bWJlclxyXG5cdCk6IFByb21pc2U8VGFzayB8IG51bGw+IHtcclxuXHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgdGhpcy5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3kobGluZSwgZmlsZVBhdGgpO1xyXG5cclxuXHRcdGlmICh0YXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0Ly8gT3ZlcnJpZGUgbGluZSBudW1iZXIgdG8gbWF0Y2ggdGhlIGV4cGVjdGVkIGJlaGF2aW9yXHJcblx0XHRcdHRhc2subGluZSA9IGxpbmVOdW1iZXI7XHJcblx0XHRcdHJldHVybiB0YXNrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGVuaGFuY2VkIG1ldGFkYXRhIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyBnZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIGFueT4+IHtcclxuXHRcdGlmICghdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcikge1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRmaWxlUGF0aFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBGYWlsZWQgdG8gZ2V0IGVuaGFuY2VkIG1ldGFkYXRhIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0Z1Byb2plY3QgZm9yIGEgZmlsZVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFRnUHJvamVjdChmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUZ1Byb2plY3QgfCB1bmRlZmluZWQ+IHtcclxuXHRcdGlmICghdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcikge1xyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChmaWxlUGF0aCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YEZhaWxlZCB0byBkZXRlcm1pbmUgdGdQcm9qZWN0IGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gY2FjaGVcclxuXHQgKi9cclxuXHRjbGVhclByb2plY3RDb25maWdDYWNoZShmaWxlUGF0aD86IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIpIHtcclxuXHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5jbGVhckNhY2hlKGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBwYXJzZXIgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHVwZGF0ZVBhcnNlckNvbmZpZyhjb25maWc6IFRhc2tQYXJzZXJDb25maWcpOiB2b2lkIHtcclxuXHRcdHRoaXMucGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHByb2plY3QgY29uZmlndXJhdGlvbiBvcHRpb25zXHJcblx0ICovXHJcblx0dXBkYXRlUHJvamVjdENvbmZpZ09wdGlvbnMoXHJcblx0XHRvcHRpb25zOiBQYXJ0aWFsPFByb2plY3RDb25maWdNYW5hZ2VyT3B0aW9ucz5cclxuXHQpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIudXBkYXRlT3B0aW9ucyhvcHRpb25zKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuYWJsZSBvciBkaXNhYmxlIGVuaGFuY2VkIHByb2plY3Qgc3VwcG9ydFxyXG5cdCAqL1xyXG5cdHNldEVuaGFuY2VkUHJvamVjdEVuYWJsZWQoXHJcblx0XHRlbmFibGVkOiBib29sZWFuLFxyXG5cdFx0cHJvamVjdENvbmZpZ09wdGlvbnM/OiB7XHJcblx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBzdHJpbmc7XHJcblx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiBib29sZWFuO1xyXG5cdFx0XHRtZXRhZGF0YUtleTogc3RyaW5nO1xyXG5cdFx0XHRwYXRoTWFwcGluZ3M6IEFycmF5PHtcclxuXHRcdFx0XHRwYXRoUGF0dGVybjogc3RyaW5nO1xyXG5cdFx0XHRcdHByb2plY3ROYW1lOiBzdHJpbmc7XHJcblx0XHRcdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRcdFx0fT47XHJcblx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IEFycmF5PHtcclxuXHRcdFx0XHRzb3VyY2VLZXk6IHN0cmluZztcclxuXHRcdFx0XHR0YXJnZXRLZXk6IHN0cmluZztcclxuXHRcdFx0XHRlbmFibGVkOiBib29sZWFuO1xyXG5cdFx0XHR9PjtcclxuXHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiIHwgXCJmb2xkZXJuYW1lXCIgfCBcIm1ldGFkYXRhXCI7XHJcblx0XHRcdFx0bWV0YWRhdGFLZXk/OiBzdHJpbmc7XHJcblx0XHRcdFx0c3RyaXBFeHRlbnNpb24/OiBib29sZWFuO1xyXG5cdFx0XHRcdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0XHRcdH07XHJcblx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZD86IGJvb2xlYW47XHJcblx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkPzogYm9vbGVhbjtcclxuXHRcdH1cclxuXHQpOiB2b2lkIHtcclxuXHRcdGlmIChlbmFibGVkICYmIHByb2plY3RDb25maWdPcHRpb25zKSB7XHJcblx0XHRcdC8vIENyZWF0ZSBvciB1cGRhdGUgcHJvamVjdCBjb25maWcgbWFuYWdlclxyXG5cdFx0XHRpZiAoIXRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIpIHtcclxuXHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHRcdHZhdWx0OiB0aGlzLnZhdWx0LFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFDYWNoZTogdGhpcy5tZXRhZGF0YUNhY2hlLFxyXG5cdFx0XHRcdFx0Li4ucHJvamVjdENvbmZpZ09wdGlvbnMsXHJcblx0XHRcdFx0XHRlbmhhbmNlZFByb2plY3RFbmFibGVkOiBlbmFibGVkLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOlxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0Q29uZmlnT3B0aW9ucy5tZXRhZGF0YUNvbmZpZ0VuYWJsZWQgPz8gZmFsc2UsXHJcblx0XHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDpcclxuXHRcdFx0XHRcdFx0cHJvamVjdENvbmZpZ09wdGlvbnMuY29uZmlnRmlsZUVuYWJsZWQgPz8gZmFsc2UsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci51cGRhdGVPcHRpb25zKHtcclxuXHRcdFx0XHRcdC4uLnByb2plY3RDb25maWdPcHRpb25zLFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogZW5hYmxlZCxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDpcclxuXHRcdFx0XHRcdFx0cHJvamVjdENvbmZpZ09wdGlvbnMubWV0YWRhdGFDb25maWdFbmFibGVkID8/IGZhbHNlLFxyXG5cdFx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6XHJcblx0XHRcdFx0XHRcdHByb2plY3RDb25maWdPcHRpb25zLmNvbmZpZ0ZpbGVFbmFibGVkID8/IGZhbHNlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKCFlbmFibGVkKSB7XHJcblx0XHRcdC8vIERpc2FibGUgcHJvamVjdCBjb25maWcgbWFuYWdlciBvciBzZXQgaXQgdG8gZGlzYWJsZWQgc3RhdGVcclxuXHRcdFx0aWYgKHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIpIHtcclxuXHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLnNldEVuaGFuY2VkUHJvamVjdEVuYWJsZWQoZmFsc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIgPSB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGVuaGFuY2VkIHByb2plY3Qgc3VwcG9ydCBpcyBlbmFibGVkXHJcblx0ICovXHJcblx0aXNFbmhhbmNlZFByb2plY3RFbmFibGVkKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0ISF0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyICYmXHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuaXNFbmhhbmNlZFByb2plY3RFbmFibGVkKClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcmUtY29tcHV0ZSBlbmhhbmNlZCBwcm9qZWN0IGRhdGEgZm9yIGFsbCBmaWxlcyBpbiB0aGUgdmF1bHRcclxuXHQgKiBUaGlzIGlzIGRlc2lnbmVkIHRvIGJlIGNhbGxlZCBiZWZvcmUgV29ya2VyIHByb2Nlc3NpbmcgdG8gcHJvdmlkZVxyXG5cdCAqIGNvbXBsZXRlIHByb2plY3QgaW5mb3JtYXRpb24gdGhhdCByZXF1aXJlcyBmaWxlIHN5c3RlbSBhY2Nlc3NcclxuXHQgKlxyXG5cdCAqIFBFUkZPUk1BTkNFIE9QVElNSVpBVElPTjogTm93IHVzZXMgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyIGZvciBlZmZpY2llbnRcclxuXHQgKiBiYXRjaCBwcm9jZXNzaW5nIHdpdGggY2FjaGluZyBhbmQgd29ya2VyLWJhc2VkIGNvbXB1dGF0aW9uLlxyXG5cdCAqL1xyXG5cdGFzeW5jIGNvbXB1dGVFbmhhbmNlZFByb2plY3REYXRhKFxyXG5cdFx0ZmlsZVBhdGhzOiBzdHJpbmdbXVxyXG5cdCk6IFByb21pc2U8RW5oYW5jZWRQcm9qZWN0RGF0YT4ge1xyXG5cdFx0Ly8gRWFybHkgcmV0dXJuIGlmIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXMgYXJlIGRpc2FibGVkXHJcblx0XHRpZiAoXHJcblx0XHRcdCF0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyIHx8XHJcblx0XHRcdCF0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmlzRW5oYW5jZWRQcm9qZWN0RW5hYmxlZCgpXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRmaWxlUHJvamVjdE1hcDoge30sXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhTWFwOiB7fSxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnTWFwOiB7fSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBmaWxlUHJvamVjdE1hcDogUmVjb3JkPFxyXG5cdFx0XHRzdHJpbmcsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRwcm9qZWN0OiBzdHJpbmc7XHJcblx0XHRcdFx0c291cmNlOiBzdHJpbmc7XHJcblx0XHRcdFx0cmVhZG9ubHk6IGJvb2xlYW47XHJcblx0XHRcdH1cclxuXHRcdD4gPSB7fTtcclxuXHRcdGNvbnN0IGZpbGVNZXRhZGF0YU1hcDogUmVjb3JkPHN0cmluZywgUmVjb3JkPHN0cmluZywgYW55Pj4gPSB7fTtcclxuXHRcdGNvbnN0IHByb2plY3RDb25maWdNYXA6IFJlY29yZDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIGFueT4+ID0ge307XHJcblxyXG5cdFx0Ly8gVXNlIG9wdGltaXplZCBiYXRjaCBwcm9jZXNzaW5nIHdpdGggd29ya2VyIG1hbmFnZXIgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBDb21wdXRpbmcgZW5oYW5jZWQgcHJvamVjdCBkYXRhIGZvciAke2ZpbGVQYXRocy5sZW5ndGh9IGZpbGVzIHVzaW5nIG9wdGltaXplZCB3b3JrZXItYmFzZWQgYXBwcm9hY2guLi5gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgYmF0Y2ggcHJvamVjdCBkYXRhIHVzaW5nIG9wdGltaXplZCBjYWNoZSBhbmQgd29ya2VyIHByb2Nlc3NpbmdcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0RGF0YU1hcCA9XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2plY3REYXRhV29ya2VyTWFuYWdlci5nZXRCYXRjaFByb2plY3REYXRhKFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aHNcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIENvbnZlcnQgdG8gdGhlIGZvcm1hdCBleHBlY3RlZCBieSB3b3JrZXJzXHJcblx0XHRcdFx0Zm9yIChjb25zdCBbZmlsZVBhdGgsIGNhY2hlZERhdGFdIG9mIHByb2plY3REYXRhTWFwKSB7XHJcblx0XHRcdFx0XHRpZiAoY2FjaGVkRGF0YS50Z1Byb2plY3QpIHtcclxuXHRcdFx0XHRcdFx0ZmlsZVByb2plY3RNYXBbZmlsZVBhdGhdID0ge1xyXG5cdFx0XHRcdFx0XHRcdHByb2plY3Q6IGNhY2hlZERhdGEudGdQcm9qZWN0Lm5hbWUsXHJcblx0XHRcdFx0XHRcdFx0c291cmNlOlxyXG5cdFx0XHRcdFx0XHRcdFx0Y2FjaGVkRGF0YS50Z1Byb2plY3Quc291cmNlIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRjYWNoZWREYXRhLnRnUHJvamVjdC50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdHJlYWRvbmx5OiBjYWNoZWREYXRhLnRnUHJvamVjdC5yZWFkb25seSA/PyB0cnVlLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChPYmplY3Qua2V5cyhjYWNoZWREYXRhLmVuaGFuY2VkTWV0YWRhdGEpLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhTWFwW2ZpbGVQYXRoXSA9IGNhY2hlZERhdGEuZW5oYW5jZWRNZXRhZGF0YTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEJ1aWxkIHByb2plY3QgY29uZmlnIG1hcCBmcm9tIHVuaXF1ZSBkaXJlY3Rvcmllc1xyXG5cdFx0XHRcdGNvbnN0IHVuaXF1ZURpcmVjdG9yaWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdFx0Zm9yIChjb25zdCBmaWxlUGF0aCBvZiBmaWxlUGF0aHMpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRpclBhdGggPSBmaWxlUGF0aC5zdWJzdHJpbmcoXHJcblx0XHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoLmxhc3RJbmRleE9mKFwiL1wiKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChkaXJQYXRoKSB7XHJcblx0XHRcdFx0XHRcdHVuaXF1ZURpcmVjdG9yaWVzLmFkZChkaXJQYXRoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEdldCBwcm9qZWN0IGNvbmZpZ3MgZm9yIHVuaXF1ZSBkaXJlY3RvcmllcyBvbmx5IChvcHRpbWl6YXRpb24pXHJcblx0XHRcdFx0Zm9yIChjb25zdCBkaXJQYXRoIG9mIHVuaXF1ZURpcmVjdG9yaWVzKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHQvLyBVc2UgYSBmaWxlIGZyb20gdGhpcyBkaXJlY3RvcnkgdG8gZ2V0IHByb2plY3QgY29uZmlnXHJcblx0XHRcdFx0XHRcdGNvbnN0IHNhbXBsZUZpbGVQYXRoID0gZmlsZVBhdGhzLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0KHBhdGgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKSkgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRkaXJQYXRoXHJcblx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoc2FtcGxlRmlsZVBhdGgpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBwcm9qZWN0Q29uZmlnID1cclxuXHRcdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0UHJvamVjdENvbmZpZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2FtcGxlRmlsZVBhdGhcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvamVjdENvbmZpZyAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0T2JqZWN0LmtleXMocHJvamVjdENvbmZpZykubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZW5oYW5jZWRQcm9qZWN0Q29uZmlnID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5hcHBseU1hcHBpbmdzVG9NZXRhZGF0YShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwcm9qZWN0Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRwcm9qZWN0Q29uZmlnTWFwW2RpclBhdGhdID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0Q29uZmlnO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdGBGYWlsZWQgdG8gZ2V0IHByb2plY3QgY29uZmlnIGZvciBkaXJlY3RvcnkgJHtkaXJQYXRofTpgLFxyXG5cdFx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBwcm9jZXNzaW5nVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgRW5oYW5jZWQgcHJvamVjdCBkYXRhIGNvbXB1dGF0aW9uIGNvbXBsZXRlZCBpbiAke3Byb2Nlc3NpbmdUaW1lfW1zIHVzaW5nIG9wdGltaXplZCBhcHByb2FjaGBcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0ZmlsZVByb2plY3RNYXAsXHJcblx0XHRcdFx0XHRmaWxlTWV0YWRhdGFNYXAsXHJcblx0XHRcdFx0XHRwcm9qZWN0Q29uZmlnTWFwLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJGYWlsZWQgdG8gdXNlIG9wdGltaXplZCBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb24sIGZhbGxpbmcgYmFjayB0byBzeW5jaHJvbm91cyBtZXRob2Q6XCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjayB0byBvcmlnaW5hbCBzeW5jaHJvbm91cyBtZXRob2QgaWYgd29ya2VyIG1hbmFnZXIgaXMgbm90IGF2YWlsYWJsZVxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBDb21wdXRpbmcgZW5oYW5jZWQgcHJvamVjdCBkYXRhIGZvciAke2ZpbGVQYXRocy5sZW5ndGh9IGZpbGVzIHVzaW5nIGZhbGxiYWNrIHN5bmNocm9ub3VzIGFwcHJvYWNoLi4uYFxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBlYWNoIGZpbGUgdG8gZGV0ZXJtaW5lIGl0cyBwcm9qZWN0IGFuZCBtZXRhZGF0YSAob3JpZ2luYWwgbG9naWMpXHJcblx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVQYXRocykge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIEdldCB0Z1Byb2plY3QgZm9yIHRoaXMgZmlsZVxyXG5cdFx0XHRcdGNvbnN0IHRnUHJvamVjdCA9XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKHRnUHJvamVjdCkge1xyXG5cdFx0XHRcdFx0ZmlsZVByb2plY3RNYXBbZmlsZVBhdGhdID0ge1xyXG5cdFx0XHRcdFx0XHRwcm9qZWN0OiB0Z1Byb2plY3QubmFtZSxcclxuXHRcdFx0XHRcdFx0c291cmNlOiB0Z1Byb2plY3Quc291cmNlIHx8IHRnUHJvamVjdC50eXBlLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdGdQcm9qZWN0LnJlYWRvbmx5ID8/IHRydWUsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gR2V0IGVuaGFuY2VkIG1ldGFkYXRhIGZvciB0aGlzIGZpbGVcclxuXHRcdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID1cclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKGVuaGFuY2VkTWV0YWRhdGEpLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdGZpbGVNZXRhZGF0YU1hcFtmaWxlUGF0aF0gPSBlbmhhbmNlZE1ldGFkYXRhO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gR2V0IHByb2plY3QgY29uZmlnIGZvciB0aGlzIGZpbGUncyBkaXJlY3RvcnlcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0Q29uZmlnID1cclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0UHJvamVjdENvbmZpZyhmaWxlUGF0aCk7XHJcblx0XHRcdFx0aWYgKHByb2plY3RDb25maWcgJiYgT2JqZWN0LmtleXMocHJvamVjdENvbmZpZykubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0Ly8gQXBwbHkgbWV0YWRhdGEgbWFwcGluZ3MgdG8gcHJvamVjdCBjb25maWcgZGF0YSBhcyB3ZWxsXHJcblx0XHRcdFx0XHRjb25zdCBlbmhhbmNlZFByb2plY3RDb25maWcgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmFwcGx5TWFwcGluZ3NUb01ldGFkYXRhKFxyXG5cdFx0XHRcdFx0XHRcdHByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBVc2UgZGlyZWN0b3J5IHBhdGggYXMga2V5IGZvciBwcm9qZWN0IGNvbmZpZ1xyXG5cdFx0XHRcdFx0Y29uc3QgZGlyUGF0aCA9IGZpbGVQYXRoLnN1YnN0cmluZyhcclxuXHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGgubGFzdEluZGV4T2YoXCIvXCIpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cHJvamVjdENvbmZpZ01hcFtkaXJQYXRoXSA9IGVuaGFuY2VkUHJvamVjdENvbmZpZztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YEZhaWxlZCB0byBjb21wdXRlIGVuaGFuY2VkIHByb2plY3QgZGF0YSBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHByb2Nlc3NpbmdUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgRW5oYW5jZWQgcHJvamVjdCBkYXRhIGNvbXB1dGF0aW9uIGNvbXBsZXRlZCBpbiAke3Byb2Nlc3NpbmdUaW1lfW1zIHVzaW5nIGZhbGxiYWNrIGFwcHJvYWNoYFxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRmaWxlUHJvamVjdE1hcCxcclxuXHRcdFx0ZmlsZU1ldGFkYXRhTWFwLFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFwLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBlbmhhbmNlZCBwcm9qZWN0IGRhdGEgZm9yIGEgc3BlY2lmaWMgZmlsZSAoZm9yIHNpbmdsZSBmaWxlIG9wZXJhdGlvbnMpXHJcblx0ICovXHJcblx0YXN5bmMgZ2V0RW5oYW5jZWREYXRhRm9yRmlsZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7XHJcblx0XHR0Z1Byb2plY3Q/OiBUZ1Byb2plY3Q7XHJcblx0XHRmaWxlTWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdFx0cHJvamVjdENvbmZpZ0RhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdH0+IHtcclxuXHRcdC8vIEVhcmx5IHJldHVybiBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBkaXNhYmxlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHQhdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlciB8fFxyXG5cdFx0XHQhdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBbdGdQcm9qZWN0LCBlbmhhbmNlZE1ldGFkYXRhLCBwcm9qZWN0Q29uZmlnRGF0YV0gPVxyXG5cdFx0XHRcdGF3YWl0IFByb21pc2UuYWxsKFtcclxuXHRcdFx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KGZpbGVQYXRoKSxcclxuXHRcdFx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShmaWxlUGF0aCksXHJcblx0XHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLmdldFByb2plY3RDb25maWcoZmlsZVBhdGgpLFxyXG5cdFx0XHRcdF0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR0Z1Byb2plY3QsXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhOlxyXG5cdFx0XHRcdFx0T2JqZWN0LmtleXMoZW5oYW5jZWRNZXRhZGF0YSkubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0XHQ/IGVuaGFuY2VkTWV0YWRhdGFcclxuXHRcdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ0RhdGE6XHJcblx0XHRcdFx0XHRwcm9qZWN0Q29uZmlnRGF0YSAmJlxyXG5cdFx0XHRcdFx0T2JqZWN0LmtleXMocHJvamVjdENvbmZpZ0RhdGEpLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdFx0PyBwcm9qZWN0Q29uZmlnRGF0YVxyXG5cdFx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihgRmFpbGVkIHRvIGdldCBlbmhhbmNlZCBkYXRhIGZvciAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzZXR0aW5ncyBjaGFuZ2VzIGZvciBwcm9qZWN0IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRvblNldHRpbmdzQ2hhbmdlKCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMucHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLm9uU2V0dGluZ3NDaGFuZ2UoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBlbmhhbmNlZCBwcm9qZWN0IHNldHRpbmcgY2hhbmdlc1xyXG5cdCAqL1xyXG5cdG9uRW5oYW5jZWRQcm9qZWN0U2V0dGluZ0NoYW5nZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyLnNldEVuaGFuY2VkUHJvamVjdEVuYWJsZWQoZW5hYmxlZCk7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIpIHtcclxuXHRcdFx0dGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIub25FbmhhbmNlZFByb2plY3RTZXR0aW5nQ2hhbmdlKFxyXG5cdFx0XHRcdGVuYWJsZWRcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGNhY2hlIGZvciBwcm9qZWN0IGRhdGFcclxuXHQgKi9cclxuXHRjbGVhclByb2plY3REYXRhQ2FjaGUoZmlsZVBhdGg/OiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLnByb2plY3REYXRhV29ya2VyTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLnByb2plY3REYXRhV29ya2VyTWFuYWdlci5jbGVhckNhY2hlKGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIuY2xlYXJDYWNoZShmaWxlUGF0aCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgY2FjaGVzIChwcm9qZWN0IGNvbmZpZywgcHJvamVjdCBkYXRhLCBhbmQgZW5oYW5jZWQgbWV0YWRhdGEpXHJcblx0ICogVGhpcyBpcyBkZXNpZ25lZCBmb3Igc2NlbmFyaW9zIGxpa2UgZm9yY2VSZWluZGV4IHdoZXJlIGNvbXBsZXRlIGNhY2hlIGNsZWFyaW5nIGlzIG5lZWRlZFxyXG5cdCAqL1xyXG5cdGNsZWFyQWxsQ2FjaGVzKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYXIgcHJvamVjdCBjb25maWd1cmF0aW9uIGNhY2hlc1xyXG5cdFx0dGhpcy5jbGVhclByb2plY3RDb25maWdDYWNoZSgpO1xyXG5cclxuXHRcdC8vIENsZWFyIHByb2plY3QgZGF0YSBjYWNoZXNcclxuXHRcdHRoaXMuY2xlYXJQcm9qZWN0RGF0YUNhY2hlKCk7XHJcblxyXG5cdFx0Ly8gRm9yY2UgY2xlYXIgYWxsIFByb2plY3RDb25maWdNYW5hZ2VyIGNhY2hlcyBpbmNsdWRpbmcgb3VyIG5ldyB0aW1lc3RhbXAgY2FjaGVzXHJcblx0XHRpZiAodGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcikge1xyXG5cdFx0XHQvLyBDYWxsIGNsZWFyQ2FjaGUgd2l0aG91dCBwYXJhbWV0ZXJzIHRvIGNsZWFyIEFMTCBjYWNoZXNcclxuXHRcdFx0dGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlci5jbGVhckNhY2hlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yY2UgY2xlYXIgYWxsIFByb2plY3REYXRhV29ya2VyTWFuYWdlciBjYWNoZXNcclxuXHRcdGlmICh0aGlzLnByb2plY3REYXRhV29ya2VyTWFuYWdlcikge1xyXG5cdFx0XHQvLyBDYWxsIGNsZWFyQ2FjaGUgd2l0aG91dCBwYXJhbWV0ZXJzIHRvIGNsZWFyIEFMTCBjYWNoZXNcclxuXHRcdFx0dGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIuY2xlYXJDYWNoZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlIHBlcmZvcm1hbmNlIHN0YXRpc3RpY3MgaW5jbHVkaW5nIGRldGFpbGVkIGJyZWFrZG93blxyXG5cdCAqL1xyXG5cdGdldFByb2plY3REYXRhQ2FjaGVTdGF0cygpIHtcclxuXHRcdGNvbnN0IHdvcmtlclN0YXRzID0gdGhpcy5wcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI/LmdldENhY2hlU3RhdHMoKTtcclxuXHRcdGNvbnN0IGNvbmZpZ1N0YXRzID0gdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcj8uZ2V0Q2FjaGVTdGF0cygpO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHdvcmtlck1hbmFnZXI6IHdvcmtlclN0YXRzLFxyXG5cdFx0XHRjb25maWdNYW5hZ2VyOiBjb25maWdTdGF0cyxcclxuXHRcdFx0Y29tYmluZWQ6IHtcclxuXHRcdFx0XHR0b3RhbEZpbGVzOiAoKHdvcmtlclN0YXRzIGFzIGFueSk/LmZpbGVDYWNoZVNpemUgfHwgMCkgKyAoY29uZmlnU3RhdHM/LmZpbGVNZXRhZGF0YUNhY2hlLnNpemUgfHwgMCksXHJcblx0XHRcdFx0dG90YWxNZW1vcnk6IChjb25maWdTdGF0cz8udG90YWxNZW1vcnlVc2FnZS5lc3RpbWF0ZWRCeXRlcyB8fCAwKSxcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBkZXRhaWxlZCBjYWNoZSBzdGF0aXN0aWNzIGZvciBtb25pdG9yaW5nIGFuZCBkZWJ1Z2dpbmdcclxuXHQgKi9cclxuXHRnZXREZXRhaWxlZENhY2hlU3RhdHMoKToge1xyXG5cdFx0cHJvamVjdENvbmZpZ01hbmFnZXI/OiBhbnk7XHJcblx0XHRwcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI/OiBhbnk7XHJcblx0XHRzdW1tYXJ5OiB7XHJcblx0XHRcdHRvdGFsQ2FjaGVkRmlsZXM6IG51bWJlcjtcclxuXHRcdFx0ZXN0aW1hdGVkTWVtb3J5VXNhZ2U6IG51bWJlcjtcclxuXHRcdFx0Y2FjaGVUeXBlczogc3RyaW5nW107XHJcblx0XHR9O1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgY29uZmlnU3RhdHMgPSB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyPy5nZXRDYWNoZVN0YXRzKCk7XHJcblx0XHRjb25zdCB3b3JrZXJTdGF0cyA9IHRoaXMucHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyPy5nZXRDYWNoZVN0YXRzKCk7XHJcblxyXG5cdFx0Y29uc3QgdG90YWxGaWxlcyA9IChjb25maWdTdGF0cz8uZmlsZU1ldGFkYXRhQ2FjaGUuc2l6ZSB8fCAwKSArXHJcblx0XHRcdChjb25maWdTdGF0cz8uZW5oYW5jZWRNZXRhZGF0YUNhY2hlLnNpemUgfHwgMCkgK1xyXG5cdFx0XHQoKHdvcmtlclN0YXRzIGFzIGFueSk/LmZpbGVDYWNoZVNpemUgfHwgMCk7XHJcblxyXG5cdFx0Y29uc3QgY2FjaGVUeXBlcyA9IFtdO1xyXG5cdFx0aWYgKGNvbmZpZ1N0YXRzPy5maWxlTWV0YWRhdGFDYWNoZS5zaXplKSBjYWNoZVR5cGVzLnB1c2goJ2ZpbGVNZXRhZGF0YScpO1xyXG5cdFx0aWYgKGNvbmZpZ1N0YXRzPy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUuc2l6ZSkgY2FjaGVUeXBlcy5wdXNoKCdlbmhhbmNlZE1ldGFkYXRhJyk7XHJcblx0XHRpZiAoY29uZmlnU3RhdHM/LmNvbmZpZ0NhY2hlLnNpemUpIGNhY2hlVHlwZXMucHVzaCgncHJvamVjdENvbmZpZycpO1xyXG5cdFx0aWYgKCh3b3JrZXJTdGF0cyBhcyBhbnkpPy5maWxlQ2FjaGVTaXplKSBjYWNoZVR5cGVzLnB1c2goJ3Byb2plY3REYXRhJyk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXI6IGNvbmZpZ1N0YXRzLFxyXG5cdFx0XHRwcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI6IHdvcmtlclN0YXRzLFxyXG5cdFx0XHRzdW1tYXJ5OiB7XHJcblx0XHRcdFx0dG90YWxDYWNoZWRGaWxlczogdG90YWxGaWxlcyxcclxuXHRcdFx0XHRlc3RpbWF0ZWRNZW1vcnlVc2FnZTogY29uZmlnU3RhdHM/LnRvdGFsTWVtb3J5VXNhZ2UuZXN0aW1hdGVkQnl0ZXMgfHwgMCxcclxuXHRcdFx0XHRjYWNoZVR5cGVzLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW51cCByZXNvdXJjZXNcclxuXHQgKi9cclxuXHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMucHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLmRlc3Ryb3koKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19