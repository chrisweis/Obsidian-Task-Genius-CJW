import { __awaiter } from "tslib";
import { ProjectConfigManager } from "@/managers/project-config-manager";
import { ProjectDataCache } from "@/cache/project-data-cache";
/**
 * Project resolver that integrates existing project management infrastructure
 * This is the single source of truth for project identification
 */
export class Resolver {
    constructor(app, vault, metadataCache, options) {
        var _a, _b, _c, _d;
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        // Initialize with default options that can be overridden
        const defaultOptions = {
            vault: this.vault,
            metadataCache: this.metadataCache,
            configFileName: (options === null || options === void 0 ? void 0 : options.configFileName) || "tg-project.md",
            searchRecursively: (_a = options === null || options === void 0 ? void 0 : options.searchRecursively) !== null && _a !== void 0 ? _a : true,
            metadataKey: (options === null || options === void 0 ? void 0 : options.metadataKey) || "tgProject",
            pathMappings: (options === null || options === void 0 ? void 0 : options.pathMappings) || [],
            metadataMappings: (options === null || options === void 0 ? void 0 : options.metadataMappings) || [],
            defaultProjectNaming: (options === null || options === void 0 ? void 0 : options.defaultProjectNaming) || {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
            enhancedProjectEnabled: (_b = options === null || options === void 0 ? void 0 : options.enhancedProjectEnabled) !== null && _b !== void 0 ? _b : true,
            metadataConfigEnabled: (_c = options === null || options === void 0 ? void 0 : options.metadataConfigEnabled) !== null && _c !== void 0 ? _c : false,
            configFileEnabled: (_d = options === null || options === void 0 ? void 0 : options.configFileEnabled) !== null && _d !== void 0 ? _d : false,
            detectionMethods: (options === null || options === void 0 ? void 0 : options.detectionMethods) || [],
        };
        this.projectConfigManager = new ProjectConfigManager(defaultOptions);
        this.projectDataCache = new ProjectDataCache(this.vault, this.metadataCache, this.projectConfigManager);
    }
    /**
     * Get project data for a file, using cache when available
     */
    get(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedData = yield this.projectDataCache.getProjectData(filePath);
            if (cachedData) {
                return {
                    tgProject: cachedData.tgProject,
                    enhancedMetadata: cachedData.enhancedMetadata,
                    timestamp: cachedData.timestamp,
                    configSource: cachedData.configSource,
                };
            }
            // If no project data found, return empty metadata
            return {
                enhancedMetadata: {},
                timestamp: Date.now(),
            };
        });
    }
    /**
     * Get project data for multiple files in batch
     */
    getBatch(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const batchData = yield this.projectDataCache.getBatchProjectData(filePaths);
            const result = new Map();
            for (const [path, cached] of batchData) {
                result.set(path, {
                    tgProject: cached.tgProject,
                    enhancedMetadata: cached.enhancedMetadata,
                    timestamp: cached.timestamp,
                    configSource: cached.configSource,
                });
            }
            // Fill in missing entries
            for (const path of filePaths) {
                if (!result.has(path)) {
                    result.set(path, {
                        enhancedMetadata: {},
                        timestamp: Date.now(),
                    });
                }
            }
            return result;
        });
    }
    /**
     * Clear cache for specific files
     */
    clearCache(filePaths) {
        this.projectDataCache.clearCache(filePaths);
    }
    /**
     * Update project config manager options
     */
    updateOptions(options) {
        this.projectConfigManager.updateOptions(options);
    }
    /**
     * Get the underlying project config manager (for advanced usage)
     */
    getConfigManager() {
        return this.projectConfigManager;
    }
    /**
     * Get the underlying project data cache (for advanced usage)
     */
    getDataCache() {
        return this.projectDataCache;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsT0FBTyxFQUFFLG9CQUFvQixFQUErQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBcUIsTUFBTSw0QkFBNEIsQ0FBQztBQVNqRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQUluQixZQUNVLEdBQVEsRUFDUixLQUFZLEVBQ1osYUFBNEIsRUFDcEMsT0FBOEM7O1FBSHRDLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osa0JBQWEsR0FBYixhQUFhLENBQWU7UUFHcEMseURBQXlEO1FBQ3pELE1BQU0sY0FBYyxHQUFnQztZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGNBQWMsRUFBRSxDQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxjQUFjLEtBQUksZUFBZTtZQUMxRCxpQkFBaUIsRUFBRSxNQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxpQkFBaUIsbUNBQUksSUFBSTtZQUNyRCxXQUFXLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsV0FBVyxLQUFJLFdBQVc7WUFDaEQsWUFBWSxFQUFFLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFlBQVksS0FBSSxFQUFFO1lBQ3pDLGdCQUFnQixFQUFFLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLGdCQUFnQixLQUFJLEVBQUU7WUFDakQsb0JBQW9CLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsb0JBQW9CLEtBQUk7Z0JBQ3JELFFBQVEsRUFBRSxVQUFVO2dCQUNwQixjQUFjLEVBQUUsSUFB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QW9CLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNWLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQy9CLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgVGdQcm9qZWN0IH0gZnJvbSBcIi4uLy4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHR5cGUgeyBBcHAsIFZhdWx0LCBNZXRhZGF0YUNhY2hlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFByb2plY3RDb25maWdNYW5hZ2VyLCBQcm9qZWN0Q29uZmlnTWFuYWdlck9wdGlvbnMgfSBmcm9tIFwiQC9tYW5hZ2Vycy9wcm9qZWN0LWNvbmZpZy1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFByb2plY3REYXRhQ2FjaGUsIENhY2hlZFByb2plY3REYXRhIH0gZnJvbSBcIkAvY2FjaGUvcHJvamVjdC1kYXRhLWNhY2hlXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3REYXRhIHtcclxuICB0Z1Byb2plY3Q/OiBUZ1Byb2plY3Q7XHJcbiAgZW5oYW5jZWRNZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PjtcclxuICB0aW1lc3RhbXA6IG51bWJlcjtcclxuICBjb25maWdTb3VyY2U/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9qZWN0IHJlc29sdmVyIHRoYXQgaW50ZWdyYXRlcyBleGlzdGluZyBwcm9qZWN0IG1hbmFnZW1lbnQgaW5mcmFzdHJ1Y3R1cmVcclxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgcHJvamVjdCBpZGVudGlmaWNhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJlc29sdmVyIHtcclxuICBwcml2YXRlIHByb2plY3RDb25maWdNYW5hZ2VyOiBQcm9qZWN0Q29uZmlnTWFuYWdlcjtcclxuICBwcml2YXRlIHByb2plY3REYXRhQ2FjaGU6IFByb2plY3REYXRhQ2FjaGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgdmF1bHQ6IFZhdWx0LFxyXG4gICAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlLFxyXG4gICAgb3B0aW9ucz86IFBhcnRpYWw8UHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zPlxyXG4gICkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgb3B0aW9ucyB0aGF0IGNhbiBiZSBvdmVycmlkZGVuXHJcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9uczogUHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zID0ge1xyXG4gICAgICB2YXVsdDogdGhpcy52YXVsdCxcclxuICAgICAgbWV0YWRhdGFDYWNoZTogdGhpcy5tZXRhZGF0YUNhY2hlLFxyXG4gICAgICBjb25maWdGaWxlTmFtZTogb3B0aW9ucz8uY29uZmlnRmlsZU5hbWUgfHwgXCJ0Zy1wcm9qZWN0Lm1kXCIsXHJcbiAgICAgIHNlYXJjaFJlY3Vyc2l2ZWx5OiBvcHRpb25zPy5zZWFyY2hSZWN1cnNpdmVseSA/PyB0cnVlLFxyXG4gICAgICBtZXRhZGF0YUtleTogb3B0aW9ucz8ubWV0YWRhdGFLZXkgfHwgXCJ0Z1Byb2plY3RcIixcclxuICAgICAgcGF0aE1hcHBpbmdzOiBvcHRpb25zPy5wYXRoTWFwcGluZ3MgfHwgW10sXHJcbiAgICAgIG1ldGFkYXRhTWFwcGluZ3M6IG9wdGlvbnM/Lm1ldGFkYXRhTWFwcGluZ3MgfHwgW10sXHJcbiAgICAgIGRlZmF1bHRQcm9qZWN0TmFtaW5nOiBvcHRpb25zPy5kZWZhdWx0UHJvamVjdE5hbWluZyB8fCB7XHJcbiAgICAgICAgc3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuICAgICAgICBzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogb3B0aW9ucz8uZW5oYW5jZWRQcm9qZWN0RW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICBtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IG9wdGlvbnM/Lm1ldGFkYXRhQ29uZmlnRW5hYmxlZCA/PyBmYWxzZSxcclxuICAgICAgY29uZmlnRmlsZUVuYWJsZWQ6IG9wdGlvbnM/LmNvbmZpZ0ZpbGVFbmFibGVkID8/IGZhbHNlLFxyXG4gICAgICBkZXRlY3Rpb25NZXRob2RzOiBvcHRpb25zPy5kZXRlY3Rpb25NZXRob2RzIHx8IFtdLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnByb2plY3RDb25maWdNYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKGRlZmF1bHRPcHRpb25zKTtcclxuICAgIHRoaXMucHJvamVjdERhdGFDYWNoZSA9IG5ldyBQcm9qZWN0RGF0YUNhY2hlKFxyXG4gICAgICB0aGlzLnZhdWx0LFxyXG4gICAgICB0aGlzLm1ldGFkYXRhQ2FjaGUsXHJcbiAgICAgIHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXJcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcHJvamVjdCBkYXRhIGZvciBhIGZpbGUsIHVzaW5nIGNhY2hlIHdoZW4gYXZhaWxhYmxlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0KGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3REYXRhPiB7XHJcbiAgICBjb25zdCBjYWNoZWREYXRhID0gYXdhaXQgdGhpcy5wcm9qZWN0RGF0YUNhY2hlLmdldFByb2plY3REYXRhKGZpbGVQYXRoKTtcclxuICAgIFxyXG4gICAgaWYgKGNhY2hlZERhdGEpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0Z1Byb2plY3Q6IGNhY2hlZERhdGEudGdQcm9qZWN0LFxyXG4gICAgICAgIGVuaGFuY2VkTWV0YWRhdGE6IGNhY2hlZERhdGEuZW5oYW5jZWRNZXRhZGF0YSxcclxuICAgICAgICB0aW1lc3RhbXA6IGNhY2hlZERhdGEudGltZXN0YW1wLFxyXG4gICAgICAgIGNvbmZpZ1NvdXJjZTogY2FjaGVkRGF0YS5jb25maWdTb3VyY2UsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgbm8gcHJvamVjdCBkYXRhIGZvdW5kLCByZXR1cm4gZW1wdHkgbWV0YWRhdGFcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGVuaGFuY2VkTWV0YWRhdGE6IHt9LFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHByb2plY3QgZGF0YSBmb3IgbXVsdGlwbGUgZmlsZXMgaW4gYmF0Y2hcclxuICAgKi9cclxuICBhc3luYyBnZXRCYXRjaChmaWxlUGF0aHM6IHN0cmluZ1tdKTogUHJvbWlzZTxNYXA8c3RyaW5nLCBQcm9qZWN0RGF0YT4+IHtcclxuICAgIGNvbnN0IGJhdGNoRGF0YSA9IGF3YWl0IHRoaXMucHJvamVjdERhdGFDYWNoZS5nZXRCYXRjaFByb2plY3REYXRhKGZpbGVQYXRocyk7XHJcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgUHJvamVjdERhdGE+KCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBbcGF0aCwgY2FjaGVkXSBvZiBiYXRjaERhdGEpIHtcclxuICAgICAgcmVzdWx0LnNldChwYXRoLCB7XHJcbiAgICAgICAgdGdQcm9qZWN0OiBjYWNoZWQudGdQcm9qZWN0LFxyXG4gICAgICAgIGVuaGFuY2VkTWV0YWRhdGE6IGNhY2hlZC5lbmhhbmNlZE1ldGFkYXRhLFxyXG4gICAgICAgIHRpbWVzdGFtcDogY2FjaGVkLnRpbWVzdGFtcCxcclxuICAgICAgICBjb25maWdTb3VyY2U6IGNhY2hlZC5jb25maWdTb3VyY2UsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpbGwgaW4gbWlzc2luZyBlbnRyaWVzXHJcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgZmlsZVBhdGhzKSB7XHJcbiAgICAgIGlmICghcmVzdWx0LmhhcyhwYXRoKSkge1xyXG4gICAgICAgIHJlc3VsdC5zZXQocGF0aCwge1xyXG4gICAgICAgICAgZW5oYW5jZWRNZXRhZGF0YToge30sXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIGZpbGVzXHJcbiAgICovXHJcbiAgY2xlYXJDYWNoZShmaWxlUGF0aHM/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIHRoaXMucHJvamVjdERhdGFDYWNoZS5jbGVhckNhY2hlKGZpbGVQYXRocyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgcHJvamVjdCBjb25maWcgbWFuYWdlciBvcHRpb25zXHJcbiAgICovXHJcbiAgdXBkYXRlT3B0aW9ucyhvcHRpb25zOiBQYXJ0aWFsPFByb2plY3RDb25maWdNYW5hZ2VyT3B0aW9ucz4pOiB2b2lkIHtcclxuICAgIHRoaXMucHJvamVjdENvbmZpZ01hbmFnZXIudXBkYXRlT3B0aW9ucyhvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgdW5kZXJseWluZyBwcm9qZWN0IGNvbmZpZyBtYW5hZ2VyIChmb3IgYWR2YW5jZWQgdXNhZ2UpXHJcbiAgICovXHJcbiAgZ2V0Q29uZmlnTWFuYWdlcigpOiBQcm9qZWN0Q29uZmlnTWFuYWdlciB7XHJcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0Q29uZmlnTWFuYWdlcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgdW5kZXJseWluZyBwcm9qZWN0IGRhdGEgY2FjaGUgKGZvciBhZHZhbmNlZCB1c2FnZSlcclxuICAgKi9cclxuICBnZXREYXRhQ2FjaGUoKTogUHJvamVjdERhdGFDYWNoZSB7XHJcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0RGF0YUNhY2hlO1xyXG4gIH1cclxufSJdfQ==