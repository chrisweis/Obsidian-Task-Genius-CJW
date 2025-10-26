/**
 * Project Data Worker
 *
 * Handles project data computation in background thread to avoid blocking main thread.
 * This worker processes project mappings, path patterns, and metadata transformations.
 */
import { __awaiter } from "tslib";
// Global configuration for the worker
let workerConfig = null;
/**
 * Compute project data for a single file
 */
function computeProjectData(message) {
    if (!workerConfig) {
        throw new Error('Worker not configured');
    }
    const { filePath, fileMetadata, configData } = message;
    // Determine tgProject using the same logic as ProjectConfigManager
    const tgProject = determineTgProject(filePath, fileMetadata, configData);
    // Apply metadata mappings
    const enhancedMetadata = applyMetadataMappings(Object.assign(Object.assign({}, configData), fileMetadata));
    return {
        filePath,
        tgProject,
        enhancedMetadata,
        timestamp: Date.now()
    };
}
/**
 * Compute project data for multiple files
 */
function computeBatchProjectData(files) {
    if (!workerConfig) {
        throw new Error('Worker not configured');
    }
    const results = [];
    for (const file of files) {
        try {
            const result = computeProjectData({
                type: 'computeProjectData',
                requestId: '',
                filePath: file.filePath,
                fileMetadata: file.fileMetadata,
                configData: file.configData
            });
            results.push(result);
        }
        catch (error) {
            console.warn(`Failed to process project data for ${file.filePath}:`, error);
            // Add error result to maintain array order
            results.push({
                filePath: file.filePath,
                tgProject: undefined,
                enhancedMetadata: {},
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    return results;
}
/**
 * Determine tgProject for a file
 */
function determineTgProject(filePath, fileMetadata, configData) {
    if (!workerConfig) {
        return undefined;
    }
    // 1. Check path-based mappings first (highest priority)
    for (const mapping of workerConfig.pathMappings) {
        if (!mapping.enabled)
            continue;
        if (matchesPathPattern(filePath, mapping.pathPattern)) {
            return {
                type: "path",
                name: mapping.projectName,
                source: mapping.pathPattern,
                readonly: true,
            };
        }
    }
    // 2. Check file metadata (frontmatter)
    if (fileMetadata && fileMetadata[workerConfig.metadataKey]) {
        const projectFromMetadata = fileMetadata[workerConfig.metadataKey];
        if (typeof projectFromMetadata === "string" && projectFromMetadata.trim()) {
            return {
                type: "metadata",
                name: projectFromMetadata.trim(),
                source: workerConfig.metadataKey,
                readonly: true,
            };
        }
    }
    // 3. Check project config file (lower priority)  
    if (configData && configData.project) {
        const projectFromConfig = configData.project;
        if (typeof projectFromConfig === "string" && projectFromConfig.trim()) {
            return {
                type: "config",
                name: projectFromConfig.trim(),
                source: "project-config",
                readonly: true,
            };
        }
    }
    // 4. Apply default project naming strategy (lowest priority)
    if (workerConfig.defaultProjectNaming.enabled) {
        const defaultProject = generateDefaultProjectName(filePath, fileMetadata);
        if (defaultProject) {
            return {
                type: "default",
                name: defaultProject,
                source: workerConfig.defaultProjectNaming.strategy,
                readonly: true,
            };
        }
    }
    return undefined;
}
/**
 * Check if a file path matches a path pattern
 */
function matchesPathPattern(filePath, pattern) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const normalizedPattern = pattern.replace(/\\/g, "/");
    // Support wildcards
    if (pattern.includes("*")) {
        const regexPattern = pattern
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".");
        const regex = new RegExp(`^${regexPattern}$`, "i");
        return regex.test(normalizedPath);
    }
    // Simple substring match
    return normalizedPath.includes(normalizedPattern);
}
/**
 * Generate default project name based on strategy
 */
function generateDefaultProjectName(filePath, fileMetadata) {
    if (!workerConfig || !workerConfig.defaultProjectNaming.enabled) {
        return null;
    }
    switch (workerConfig.defaultProjectNaming.strategy) {
        case "filename": {
            const fileName = filePath.split("/").pop() || "";
            if (workerConfig.defaultProjectNaming.stripExtension) {
                return fileName.replace(/\.[^/.]+$/, "");
            }
            return fileName;
        }
        case "foldername": {
            const pathParts = filePath.split("/");
            if (pathParts.length > 1) {
                return pathParts[pathParts.length - 2] || "";
            }
            return "";
        }
        case "metadata": {
            const metadataKey = workerConfig.defaultProjectNaming.metadataKey;
            if (!metadataKey) {
                return null;
            }
            if (fileMetadata && fileMetadata[metadataKey]) {
                const value = fileMetadata[metadataKey];
                return typeof value === "string" ? value.trim() : String(value);
            }
            return null;
        }
        default:
            return null;
    }
}
/**
 * Apply metadata mappings to transform source metadata keys to target keys
 */
function applyMetadataMappings(metadata) {
    if (!workerConfig) {
        return metadata;
    }
    const result = Object.assign({}, metadata);
    for (const mapping of workerConfig.metadataMappings) {
        if (!mapping.enabled)
            continue;
        const sourceValue = metadata[mapping.sourceKey];
        if (sourceValue !== undefined) {
            result[mapping.targetKey] = convertMetadataValue(mapping.targetKey, sourceValue);
        }
    }
    return result;
}
/**
 * Convert metadata value based on target key type
 */
function convertMetadataValue(targetKey, value) {
    // Date field detection patterns
    const dateFieldPatterns = [
        "due", "dueDate", "deadline", "start", "startDate", "started",
        "scheduled", "scheduledDate", "scheduled_for", "completed",
        "completedDate", "finished", "created", "createdDate", "created_at"
    ];
    // Priority field detection patterns
    const priorityFieldPatterns = ["priority", "urgency", "importance"];
    // Check if it's a date field
    const isDateField = dateFieldPatterns.some((pattern) => targetKey.toLowerCase().includes(pattern.toLowerCase()));
    // Check if it's a priority field
    const isPriorityField = priorityFieldPatterns.some((pattern) => targetKey.toLowerCase().includes(pattern.toLowerCase()));
    if (isDateField && typeof value === "string") {
        // Try to convert date string to timestamp
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                return date.getTime();
            }
            catch (_a) {
                return value;
            }
        }
    }
    else if (isPriorityField && typeof value === "string") {
        // Convert priority string to number
        const priorityMap = {
            highest: 5, urgent: 5, critical: 5,
            high: 4, important: 4,
            medium: 3, normal: 3, moderate: 3,
            low: 2, minor: 2,
            lowest: 1, trivial: 1,
        };
        const numericPriority = parseInt(value, 10);
        if (!isNaN(numericPriority)) {
            return numericPriority;
        }
        const mappedPriority = priorityMap[value.toLowerCase()];
        if (mappedPriority !== undefined) {
            return mappedPriority;
        }
    }
    return value;
}
/**
 * Worker message handler - following the same pattern as TaskIndex.worker.ts
 */
self.onmessage = (event) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = event.data;
        switch (message.type) {
            case 'updateConfig':
                const configMsg = message;
                workerConfig = configMsg.config;
                self.postMessage({
                    type: 'configUpdated',
                    requestId: message.requestId,
                    success: true
                });
                break;
            case 'computeProjectData':
                const result = computeProjectData(message);
                self.postMessage({
                    type: 'projectDataResult',
                    requestId: message.requestId,
                    success: true,
                    data: result
                });
                break;
            case 'computeBatchProjectData':
                const batchMsg = message;
                const batchResult = computeBatchProjectData(batchMsg.files);
                self.postMessage({
                    type: 'batchProjectDataResult',
                    requestId: message.requestId,
                    success: true,
                    data: batchResult
                });
                break;
            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
    }
    catch (error) {
        self.postMessage({
            type: 'error',
            requestId: event.data.requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdERhdGEud29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvamVjdERhdGEud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQXNDSCxzQ0FBc0M7QUFDdEMsSUFBSSxZQUFZLEdBQStCLElBQUksQ0FBQztBQUVwRDs7R0FFRztBQUNILFNBQVMsa0JBQWtCLENBQUMsT0FBMkI7SUFDdEQsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7S0FDekM7SUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFdkQsbUVBQW1FO0lBQ25FLE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFekUsMEJBQTBCO0lBQzFCLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLGlDQUMxQyxVQUFVLEdBQ1YsWUFBWSxFQUNkLENBQUM7SUFFSCxPQUFPO1FBQ04sUUFBUTtRQUNSLFNBQVM7UUFDVCxnQkFBZ0I7UUFDaEIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7S0FDckIsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsdUJBQXVCLENBQUMsS0FBd0I7SUFDeEQsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7S0FDekM7SUFFRCxNQUFNLE9BQU8sR0FBMEIsRUFBRSxDQUFDO0lBRTFDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3pCLElBQUk7WUFDSCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQztnQkFDakMsSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsUUFBUSxFQUFFLElBQUks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QUNuRTtLQUNEO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZixJQUFJLENBQUMsV0FBVyxDQUFDO1lBQ2hCLElBQUksRUFBRSxPQUFPO1lBQ2IsU0FBUyxFQUFHLEtBQUssQ0FBQyxJQUFzQixDQUFDLFNBQVM7WUFDbEQsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUM3RCxDQUFDLENBQUM7S0FDSDtBQUNGLENBQUMsQ0FBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2plY3QgRGF0YSBXb3JrZXJcclxuICogXHJcbiAqIEhhbmRsZXMgcHJvamVjdCBkYXRhIGNvbXB1dGF0aW9uIGluIGJhY2tncm91bmQgdGhyZWFkIHRvIGF2b2lkIGJsb2NraW5nIG1haW4gdGhyZWFkLlxyXG4gKiBUaGlzIHdvcmtlciBwcm9jZXNzZXMgcHJvamVjdCBtYXBwaW5ncywgcGF0aCBwYXR0ZXJucywgYW5kIG1ldGFkYXRhIHRyYW5zZm9ybWF0aW9ucy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBXb3JrZXJNZXNzYWdlLCBQcm9qZWN0RGF0YU1lc3NhZ2UsIFByb2plY3REYXRhUmVzcG9uc2UsIFdvcmtlclJlc3BvbnNlIH0gZnJvbSAnLi90YXNrLWluZGV4LW1lc3NhZ2UnO1xyXG5cclxuLy8gSW50ZXJmYWNlcyBmb3IgcHJvamVjdCBkYXRhIHByb2Nlc3NpbmdcclxuaW50ZXJmYWNlIFByb2plY3RNYXBwaW5nIHtcclxuXHRwYXRoUGF0dGVybjogc3RyaW5nO1xyXG5cdHByb2plY3ROYW1lOiBzdHJpbmc7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxufVxyXG5cclxuaW50ZXJmYWNlIE1ldGFkYXRhTWFwcGluZyB7XHJcblx0c291cmNlS2V5OiBzdHJpbmc7XHJcblx0dGFyZ2V0S2V5OiBzdHJpbmc7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFByb2plY3ROYW1pbmdTdHJhdGVneSB7XHJcblx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIiB8IFwiZm9sZGVybmFtZVwiIHwgXCJtZXRhZGF0YVwiO1xyXG5cdG1ldGFkYXRhS2V5Pzogc3RyaW5nO1xyXG5cdHN0cmlwRXh0ZW5zaW9uPzogYm9vbGVhbjtcclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUHJvamVjdFdvcmtlckNvbmZpZyB7XHJcblx0cGF0aE1hcHBpbmdzOiBQcm9qZWN0TWFwcGluZ1tdO1xyXG5cdG1ldGFkYXRhTWFwcGluZ3M6IE1ldGFkYXRhTWFwcGluZ1tdO1xyXG5cdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiBQcm9qZWN0TmFtaW5nU3RyYXRlZ3k7XHJcblx0bWV0YWRhdGFLZXk6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEZpbGVQcm9qZWN0RGF0YSB7XHJcblx0ZmlsZVBhdGg6IHN0cmluZztcclxuXHRmaWxlTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0Y29uZmlnRGF0YTogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHRkaXJlY3RvcnlDb25maWdQYXRoPzogc3RyaW5nO1xyXG59XHJcblxyXG4vLyBHbG9iYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHdvcmtlclxyXG5sZXQgd29ya2VyQ29uZmlnOiBQcm9qZWN0V29ya2VyQ29uZmlnIHwgbnVsbCA9IG51bGw7XHJcblxyXG4vKipcclxuICogQ29tcHV0ZSBwcm9qZWN0IGRhdGEgZm9yIGEgc2luZ2xlIGZpbGVcclxuICovXHJcbmZ1bmN0aW9uIGNvbXB1dGVQcm9qZWN0RGF0YShtZXNzYWdlOiBQcm9qZWN0RGF0YU1lc3NhZ2UpOiBQcm9qZWN0RGF0YVJlc3BvbnNlIHtcclxuXHRpZiAoIXdvcmtlckNvbmZpZykge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdXb3JrZXIgbm90IGNvbmZpZ3VyZWQnKTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHsgZmlsZVBhdGgsIGZpbGVNZXRhZGF0YSwgY29uZmlnRGF0YSB9ID0gbWVzc2FnZTtcclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHRnUHJvamVjdCB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBQcm9qZWN0Q29uZmlnTWFuYWdlclxyXG5cdGNvbnN0IHRnUHJvamVjdCA9IGRldGVybWluZVRnUHJvamVjdChmaWxlUGF0aCwgZmlsZU1ldGFkYXRhLCBjb25maWdEYXRhKTtcclxuXHJcblx0Ly8gQXBwbHkgbWV0YWRhdGEgbWFwcGluZ3NcclxuXHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gYXBwbHlNZXRhZGF0YU1hcHBpbmdzKHtcclxuXHRcdC4uLmNvbmZpZ0RhdGEsXHJcblx0XHQuLi5maWxlTWV0YWRhdGFcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdGZpbGVQYXRoLFxyXG5cdFx0dGdQcm9qZWN0LFxyXG5cdFx0ZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wdXRlIHByb2plY3QgZGF0YSBmb3IgbXVsdGlwbGUgZmlsZXNcclxuICovXHJcbmZ1bmN0aW9uIGNvbXB1dGVCYXRjaFByb2plY3REYXRhKGZpbGVzOiBGaWxlUHJvamVjdERhdGFbXSk6IFByb2plY3REYXRhUmVzcG9uc2VbXSB7XHJcblx0aWYgKCF3b3JrZXJDb25maWcpIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcignV29ya2VyIG5vdCBjb25maWd1cmVkJyk7XHJcblx0fVxyXG5cclxuXHRjb25zdCByZXN1bHRzOiBQcm9qZWN0RGF0YVJlc3BvbnNlW10gPSBbXTtcclxuXHJcblx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBjb21wdXRlUHJvamVjdERhdGEoe1xyXG5cdFx0XHRcdHR5cGU6ICdjb21wdXRlUHJvamVjdERhdGEnLFxyXG5cdFx0XHRcdHJlcXVlc3RJZDogJycsIC8vIE5vdCB1c2VkIGluIGJhdGNoIHByb2Nlc3NpbmdcclxuXHRcdFx0XHRmaWxlUGF0aDogZmlsZS5maWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGE6IGZpbGUuZmlsZU1ldGFkYXRhLFxyXG5cdFx0XHRcdGNvbmZpZ0RhdGE6IGZpbGUuY29uZmlnRGF0YVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oYEZhaWxlZCB0byBwcm9jZXNzIHByb2plY3QgZGF0YSBmb3IgJHtmaWxlLmZpbGVQYXRofTpgLCBlcnJvcik7XHJcblx0XHRcdC8vIEFkZCBlcnJvciByZXN1bHQgdG8gbWFpbnRhaW4gYXJyYXkgb3JkZXJcclxuXHRcdFx0cmVzdWx0cy5wdXNoKHtcclxuXHRcdFx0XHRmaWxlUGF0aDogZmlsZS5maWxlUGF0aCxcclxuXHRcdFx0XHR0Z1Byb2plY3Q6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhOiB7fSxcclxuXHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdFx0ZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHRzO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIHRnUHJvamVjdCBmb3IgYSBmaWxlXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXRlcm1pbmVUZ1Byb2plY3QoXHJcblx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRmaWxlTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0Y29uZmlnRGF0YTogUmVjb3JkPHN0cmluZywgYW55PlxyXG4pOiBhbnkge1xyXG5cdGlmICghd29ya2VyQ29uZmlnKSB7XHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0Ly8gMS4gQ2hlY2sgcGF0aC1iYXNlZCBtYXBwaW5ncyBmaXJzdCAoaGlnaGVzdCBwcmlvcml0eSlcclxuXHRmb3IgKGNvbnN0IG1hcHBpbmcgb2Ygd29ya2VyQ29uZmlnLnBhdGhNYXBwaW5ncykge1xyXG5cdFx0aWYgKCFtYXBwaW5nLmVuYWJsZWQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdGlmIChtYXRjaGVzUGF0aFBhdHRlcm4oZmlsZVBhdGgsIG1hcHBpbmcucGF0aFBhdHRlcm4pKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0bmFtZTogbWFwcGluZy5wcm9qZWN0TmFtZSxcclxuXHRcdFx0XHRzb3VyY2U6IG1hcHBpbmcucGF0aFBhdHRlcm4sXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAyLiBDaGVjayBmaWxlIG1ldGFkYXRhIChmcm9udG1hdHRlcilcclxuXHRpZiAoZmlsZU1ldGFkYXRhICYmIGZpbGVNZXRhZGF0YVt3b3JrZXJDb25maWcubWV0YWRhdGFLZXldKSB7XHJcblx0XHRjb25zdCBwcm9qZWN0RnJvbU1ldGFkYXRhID0gZmlsZU1ldGFkYXRhW3dvcmtlckNvbmZpZy5tZXRhZGF0YUtleV07XHJcblx0XHRpZiAodHlwZW9mIHByb2plY3RGcm9tTWV0YWRhdGEgPT09IFwic3RyaW5nXCIgJiYgcHJvamVjdEZyb21NZXRhZGF0YS50cmltKCkpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0bmFtZTogcHJvamVjdEZyb21NZXRhZGF0YS50cmltKCksXHJcblx0XHRcdFx0c291cmNlOiB3b3JrZXJDb25maWcubWV0YWRhdGFLZXksXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAzLiBDaGVjayBwcm9qZWN0IGNvbmZpZyBmaWxlIChsb3dlciBwcmlvcml0eSkgIFxyXG5cdGlmIChjb25maWdEYXRhICYmIGNvbmZpZ0RhdGEucHJvamVjdCkge1xyXG5cdFx0Y29uc3QgcHJvamVjdEZyb21Db25maWcgPSBjb25maWdEYXRhLnByb2plY3Q7XHJcblx0XHRpZiAodHlwZW9mIHByb2plY3RGcm9tQ29uZmlnID09PSBcInN0cmluZ1wiICYmIHByb2plY3RGcm9tQ29uZmlnLnRyaW0oKSkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHR5cGU6IFwiY29uZmlnXCIsXHJcblx0XHRcdFx0bmFtZTogcHJvamVjdEZyb21Db25maWcudHJpbSgpLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0LWNvbmZpZ1wiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gNC4gQXBwbHkgZGVmYXVsdCBwcm9qZWN0IG5hbWluZyBzdHJhdGVneSAobG93ZXN0IHByaW9yaXR5KVxyXG5cdGlmICh3b3JrZXJDb25maWcuZGVmYXVsdFByb2plY3ROYW1pbmcuZW5hYmxlZCkge1xyXG5cdFx0Y29uc3QgZGVmYXVsdFByb2plY3QgPSBnZW5lcmF0ZURlZmF1bHRQcm9qZWN0TmFtZShmaWxlUGF0aCwgZmlsZU1ldGFkYXRhKTtcclxuXHRcdGlmIChkZWZhdWx0UHJvamVjdCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHR5cGU6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHRcdG5hbWU6IGRlZmF1bHRQcm9qZWN0LFxyXG5cdFx0XHRcdHNvdXJjZTogd29ya2VyQ29uZmlnLmRlZmF1bHRQcm9qZWN0TmFtaW5nLnN0cmF0ZWd5LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgZmlsZSBwYXRoIG1hdGNoZXMgYSBwYXRoIHBhdHRlcm5cclxuICovXHJcbmZ1bmN0aW9uIG1hdGNoZXNQYXRoUGF0dGVybihmaWxlUGF0aDogc3RyaW5nLCBwYXR0ZXJuOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRjb25zdCBub3JtYWxpemVkUGF0aCA9IGZpbGVQYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xyXG5cdGNvbnN0IG5vcm1hbGl6ZWRQYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcclxuXHJcblx0Ly8gU3VwcG9ydCB3aWxkY2FyZHNcclxuXHRpZiAocGF0dGVybi5pbmNsdWRlcyhcIipcIikpIHtcclxuXHRcdGNvbnN0IHJlZ2V4UGF0dGVybiA9IHBhdHRlcm5cclxuXHRcdFx0LnJlcGxhY2UoL1xcKi9nLCBcIi4qXCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXD8vZywgXCIuXCIpO1xyXG5cdFx0Y29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBeJHtyZWdleFBhdHRlcm59JGAsIFwiaVwiKTtcclxuXHRcdHJldHVybiByZWdleC50ZXN0KG5vcm1hbGl6ZWRQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8vIFNpbXBsZSBzdWJzdHJpbmcgbWF0Y2hcclxuXHRyZXR1cm4gbm9ybWFsaXplZFBhdGguaW5jbHVkZXMobm9ybWFsaXplZFBhdHRlcm4pO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgZGVmYXVsdCBwcm9qZWN0IG5hbWUgYmFzZWQgb24gc3RyYXRlZ3lcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlRGVmYXVsdFByb2plY3ROYW1lKGZpbGVQYXRoOiBzdHJpbmcsIGZpbGVNZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55Pik6IHN0cmluZyB8IG51bGwge1xyXG5cdGlmICghd29ya2VyQ29uZmlnIHx8ICF3b3JrZXJDb25maWcuZGVmYXVsdFByb2plY3ROYW1pbmcuZW5hYmxlZCkge1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRzd2l0Y2ggKHdvcmtlckNvbmZpZy5kZWZhdWx0UHJvamVjdE5hbWluZy5zdHJhdGVneSkge1xyXG5cdFx0Y2FzZSBcImZpbGVuYW1lXCI6IHtcclxuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgXCJcIjtcclxuXHRcdFx0aWYgKHdvcmtlckNvbmZpZy5kZWZhdWx0UHJvamVjdE5hbWluZy5zdHJpcEV4dGVuc2lvbikge1xyXG5cdFx0XHRcdHJldHVybiBmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZpbGVOYW1lO1xyXG5cdFx0fVxyXG5cdFx0Y2FzZSBcImZvbGRlcm5hbWVcIjoge1xyXG5cdFx0XHRjb25zdCBwYXRoUGFydHMgPSBmaWxlUGF0aC5zcGxpdChcIi9cIik7XHJcblx0XHRcdGlmIChwYXRoUGFydHMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRcdHJldHVybiBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDJdIHx8IFwiXCI7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIFwiXCI7XHJcblx0XHR9XHJcblx0XHRjYXNlIFwibWV0YWRhdGFcIjoge1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YUtleSA9IHdvcmtlckNvbmZpZy5kZWZhdWx0UHJvamVjdE5hbWluZy5tZXRhZGF0YUtleTtcclxuXHRcdFx0aWYgKCFtZXRhZGF0YUtleSkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChmaWxlTWV0YWRhdGEgJiYgZmlsZU1ldGFkYXRhW21ldGFkYXRhS2V5XSkge1xyXG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gZmlsZU1ldGFkYXRhW21ldGFkYXRhS2V5XTtcclxuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUudHJpbSgpIDogU3RyaW5nKHZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEFwcGx5IG1ldGFkYXRhIG1hcHBpbmdzIHRvIHRyYW5zZm9ybSBzb3VyY2UgbWV0YWRhdGEga2V5cyB0byB0YXJnZXQga2V5c1xyXG4gKi9cclxuZnVuY3Rpb24gYXBwbHlNZXRhZGF0YU1hcHBpbmdzKG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUmVjb3JkPHN0cmluZywgYW55PiB7XHJcblx0aWYgKCF3b3JrZXJDb25maWcpIHtcclxuXHRcdHJldHVybiBtZXRhZGF0YTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHJlc3VsdCA9IHsgLi4ubWV0YWRhdGEgfTtcclxuXHJcblx0Zm9yIChjb25zdCBtYXBwaW5nIG9mIHdvcmtlckNvbmZpZy5tZXRhZGF0YU1hcHBpbmdzKSB7XHJcblx0XHRpZiAoIW1hcHBpbmcuZW5hYmxlZCkgY29udGludWU7XHJcblxyXG5cdFx0Y29uc3Qgc291cmNlVmFsdWUgPSBtZXRhZGF0YVttYXBwaW5nLnNvdXJjZUtleV07XHJcblx0XHRpZiAoc291cmNlVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRyZXN1bHRbbWFwcGluZy50YXJnZXRLZXldID0gY29udmVydE1ldGFkYXRhVmFsdWUoXHJcblx0XHRcdFx0bWFwcGluZy50YXJnZXRLZXksXHJcblx0XHRcdFx0c291cmNlVmFsdWVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IG1ldGFkYXRhIHZhbHVlIGJhc2VkIG9uIHRhcmdldCBrZXkgdHlwZVxyXG4gKi9cclxuZnVuY3Rpb24gY29udmVydE1ldGFkYXRhVmFsdWUodGFyZ2V0S2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBhbnkge1xyXG5cdC8vIERhdGUgZmllbGQgZGV0ZWN0aW9uIHBhdHRlcm5zXHJcblx0Y29uc3QgZGF0ZUZpZWxkUGF0dGVybnMgPSBbXHJcblx0XHRcImR1ZVwiLCBcImR1ZURhdGVcIiwgXCJkZWFkbGluZVwiLCBcInN0YXJ0XCIsIFwic3RhcnREYXRlXCIsIFwic3RhcnRlZFwiLFxyXG5cdFx0XCJzY2hlZHVsZWRcIiwgXCJzY2hlZHVsZWREYXRlXCIsIFwic2NoZWR1bGVkX2ZvclwiLCBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XCJjb21wbGV0ZWREYXRlXCIsIFwiZmluaXNoZWRcIiwgXCJjcmVhdGVkXCIsIFwiY3JlYXRlZERhdGVcIiwgXCJjcmVhdGVkX2F0XCJcclxuXHRdO1xyXG5cclxuXHQvLyBQcmlvcml0eSBmaWVsZCBkZXRlY3Rpb24gcGF0dGVybnNcclxuXHRjb25zdCBwcmlvcml0eUZpZWxkUGF0dGVybnMgPSBbXCJwcmlvcml0eVwiLCBcInVyZ2VuY3lcIiwgXCJpbXBvcnRhbmNlXCJdO1xyXG5cclxuXHQvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBmaWVsZFxyXG5cdGNvbnN0IGlzRGF0ZUZpZWxkID0gZGF0ZUZpZWxkUGF0dGVybnMuc29tZSgocGF0dGVybikgPT5cclxuXHRcdHRhcmdldEtleS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHBhdHRlcm4udG9Mb3dlckNhc2UoKSlcclxuXHQpO1xyXG5cclxuXHQvLyBDaGVjayBpZiBpdCdzIGEgcHJpb3JpdHkgZmllbGRcclxuXHRjb25zdCBpc1ByaW9yaXR5RmllbGQgPSBwcmlvcml0eUZpZWxkUGF0dGVybnMuc29tZSgocGF0dGVybikgPT5cclxuXHRcdHRhcmdldEtleS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHBhdHRlcm4udG9Mb3dlckNhc2UoKSlcclxuXHQpO1xyXG5cclxuXHRpZiAoaXNEYXRlRmllbGQgJiYgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHQvLyBUcnkgdG8gY29udmVydCBkYXRlIHN0cmluZyB0byB0aW1lc3RhbXBcclxuXHRcdGlmICgvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9Ly50ZXN0KHZhbHVlKSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHR9IGNhdGNoIHtcclxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9IGVsc2UgaWYgKGlzUHJpb3JpdHlGaWVsZCAmJiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdC8vIENvbnZlcnQgcHJpb3JpdHkgc3RyaW5nIHRvIG51bWJlclxyXG5cdFx0Y29uc3QgcHJpb3JpdHlNYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcblx0XHRcdGhpZ2hlc3Q6IDUsIHVyZ2VudDogNSwgY3JpdGljYWw6IDUsXHJcblx0XHRcdGhpZ2g6IDQsIGltcG9ydGFudDogNCxcclxuXHRcdFx0bWVkaXVtOiAzLCBub3JtYWw6IDMsIG1vZGVyYXRlOiAzLFxyXG5cdFx0XHRsb3c6IDIsIG1pbm9yOiAyLFxyXG5cdFx0XHRsb3dlc3Q6IDEsIHRyaXZpYWw6IDEsXHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IG51bWVyaWNQcmlvcml0eSA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XHJcblx0XHRpZiAoIWlzTmFOKG51bWVyaWNQcmlvcml0eSkpIHtcclxuXHRcdFx0cmV0dXJuIG51bWVyaWNQcmlvcml0eTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBtYXBwZWRQcmlvcml0eSA9IHByaW9yaXR5TWFwW3ZhbHVlLnRvTG93ZXJDYXNlKCldO1xyXG5cdFx0aWYgKG1hcHBlZFByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0cmV0dXJuIG1hcHBlZFByaW9yaXR5O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogV29ya2VyIG1lc3NhZ2UgaGFuZGxlciAtIGZvbGxvd2luZyB0aGUgc2FtZSBwYXR0ZXJuIGFzIFRhc2tJbmRleC53b3JrZXIudHNcclxuICovXHJcbnNlbGYub25tZXNzYWdlID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcblx0dHJ5IHtcclxuXHRcdGNvbnN0IG1lc3NhZ2UgPSBldmVudC5kYXRhIGFzIFdvcmtlck1lc3NhZ2U7XHJcblxyXG5cdFx0c3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSAndXBkYXRlQ29uZmlnJzpcclxuXHRcdFx0XHRjb25zdCBjb25maWdNc2cgPSBtZXNzYWdlIGFzIGFueTtcclxuXHRcdFx0XHR3b3JrZXJDb25maWcgPSBjb25maWdNc2cuY29uZmlnO1xyXG5cdFx0XHRcdHNlbGYucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0XHRcdFx0dHlwZTogJ2NvbmZpZ1VwZGF0ZWQnLFxyXG5cdFx0XHRcdFx0cmVxdWVzdElkOiBtZXNzYWdlLnJlcXVlc3RJZCxcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWVcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgJ2NvbXB1dGVQcm9qZWN0RGF0YSc6XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gY29tcHV0ZVByb2plY3REYXRhKG1lc3NhZ2UgYXMgUHJvamVjdERhdGFNZXNzYWdlKTtcclxuXHRcdFx0XHRzZWxmLnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0XHRcdHR5cGU6ICdwcm9qZWN0RGF0YVJlc3VsdCcsXHJcblx0XHRcdFx0XHRyZXF1ZXN0SWQ6IG1lc3NhZ2UucmVxdWVzdElkLFxyXG5cdFx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHRcdGRhdGE6IHJlc3VsdFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAnY29tcHV0ZUJhdGNoUHJvamVjdERhdGEnOlxyXG5cdFx0XHRcdGNvbnN0IGJhdGNoTXNnID0gbWVzc2FnZSBhcyBhbnk7XHJcblx0XHRcdFx0Y29uc3QgYmF0Y2hSZXN1bHQgPSBjb21wdXRlQmF0Y2hQcm9qZWN0RGF0YShiYXRjaE1zZy5maWxlcyk7XHJcblx0XHRcdFx0c2VsZi5wb3N0TWVzc2FnZSh7XHJcblx0XHRcdFx0XHR0eXBlOiAnYmF0Y2hQcm9qZWN0RGF0YVJlc3VsdCcsXHJcblx0XHRcdFx0XHRyZXF1ZXN0SWQ6IG1lc3NhZ2UucmVxdWVzdElkLFxyXG5cdFx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHRcdGRhdGE6IGJhdGNoUmVzdWx0XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXNzYWdlIHR5cGU6ICR7KG1lc3NhZ2UgYXMgYW55KS50eXBlfWApO1xyXG5cdFx0fVxyXG5cdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRzZWxmLnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0dHlwZTogJ2Vycm9yJyxcclxuXHRcdFx0cmVxdWVzdElkOiAoZXZlbnQuZGF0YSBhcyBXb3JrZXJNZXNzYWdlKS5yZXF1ZXN0SWQsXHJcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXHJcblx0XHR9KTtcclxuXHR9XHJcbn07Il19