import { __rest } from "tslib";
import { enhanceTaskMetadata, extractTimeComponentsFromMetadata, hasTimeComponents, validateTimeComponent, } from "../utils/task-metadata-utils";
import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG, } from "./time-parsing-service";
/**
 * Service for migrating tasks to enhanced metadata format
 * Handles automatic migration when tasks are accessed or updated
 */
export class TaskMigrationService {
    constructor(timeParsingService) {
        this.migrationCache = new Map();
        this.migrationInProgress = new Set();
        this.timeParsingService =
            timeParsingService ||
                new TimeParsingService(DEFAULT_TIME_PARSING_CONFIG);
    }
    /**
     * Migrate a standard task to enhanced format
     * @param task - Standard task to migrate
     * @param preserveOriginal - Whether to preserve original timestamps
     * @returns Enhanced task with time components
     */
    migrateTaskToEnhanced(task, preserveOriginal = true) {
        // Check if already migrated
        if (this.isAlreadyMigrated(task)) {
            return task;
        }
        // Mark migration in progress to prevent circular calls
        const taskKey = this.getTaskKey(task);
        if (this.migrationInProgress.has(taskKey)) {
            return task;
        }
        this.migrationInProgress.add(taskKey);
        try {
            // Extract time components from existing timestamps
            const extractedTimeComponents = extractTimeComponentsFromMetadata(task.metadata);
            // Only add time components if they contain meaningful time information
            // (not just 00:00:00 which indicates date-only)
            const meaningfulTimeComponents = this.filterMeaningfulTimeComponents(extractedTimeComponents);
            const parsedTimeComponents = task.content
                ? this.getMeaningfulTimeComponentsFromContent(task.content)
                : {};
            const mergedTimeComponents = this.mergeTimeComponents(meaningfulTimeComponents, parsedTimeComponents);
            // Create enhanced metadata
            const enhancedMetadata = enhanceTaskMetadata(task.metadata, Object.keys(mergedTimeComponents).length > 0 ? mergedTimeComponents : undefined);
            // Create enhanced task
            const enhancedTask = Object.assign(Object.assign({}, task), { metadata: enhancedMetadata });
            // Mark as migrated
            this.migrationCache.set(taskKey, true);
            return enhancedTask;
        }
        finally {
            this.migrationInProgress.delete(taskKey);
        }
    }
    /**
     * Migrate multiple tasks in batch
     * @param tasks - Array of tasks to migrate
     * @returns Array of enhanced tasks
     */
    migrateBatch(tasks) {
        return tasks.map(task => this.migrateTaskToEnhanced(task));
    }
    /**
     * Check if a task needs migration
     * @param task - Task to check
     * @returns True if migration is needed
     */
    needsMigration(task) {
        return !this.isAlreadyMigrated(task);
    }
    /**
     * Migrate task only if it has meaningful time information
     * @param task - Task to conditionally migrate
     * @returns Enhanced task if migration occurred, original task otherwise
     */
    migrateIfNeeded(task) {
        if (!this.needsMigration(task)) {
            return task;
        }
        // Check if task has meaningful time information
        const extractedTimeComponents = extractTimeComponentsFromMetadata(task.metadata);
        const meaningfulTimeComponents = this.filterMeaningfulTimeComponents(extractedTimeComponents);
        const parsedTimeComponents = task.content
            ? this.getMeaningfulTimeComponentsFromContent(task.content)
            : {};
        if (Object.keys(meaningfulTimeComponents).length === 0 &&
            Object.keys(parsedTimeComponents).length === 0) {
            // No meaningful time information, return original task
            return task;
        }
        return this.migrateTaskToEnhanced(task);
    }
    /**
     * Clear migration cache (useful for testing or when task structure changes)
     */
    clearCache() {
        this.migrationCache.clear();
        this.migrationInProgress.clear();
    }
    /**
     * Get migration statistics
     * @returns Object with migration stats
     */
    getStats() {
        return {
            migratedCount: this.migrationCache.size,
            inProgressCount: this.migrationInProgress.size
        };
    }
    /**
     * Validate that a migrated task maintains data integrity
     * @param originalTask - Original task before migration
     * @param migratedTask - Task after migration
     * @returns True if migration preserved all data
     */
    validateMigration(originalTask, migratedTask) {
        // Check that all base task properties are preserved
        if (originalTask.id !== migratedTask.id ||
            originalTask.content !== migratedTask.content ||
            originalTask.filePath !== migratedTask.filePath ||
            originalTask.line !== migratedTask.line ||
            originalTask.completed !== migratedTask.completed ||
            originalTask.status !== migratedTask.status ||
            originalTask.originalMarkdown !== migratedTask.originalMarkdown) {
            return false;
        }
        // Check that all original metadata is preserved
        const originalMeta = originalTask.metadata;
        const migratedMeta = migratedTask.metadata;
        const metadataKeys = [
            'createdDate', 'startDate', 'scheduledDate', 'dueDate', 'completedDate',
            'cancelledDate', 'recurrence', 'onCompletion', 'dependsOn', 'id',
            'tags', 'project', 'context', 'area', 'priority', 'parent', 'children',
            'estimatedTime', 'actualTime', 'useAsDateType', 'heading', 'tgProject'
        ];
        for (const key of metadataKeys) {
            if (JSON.stringify(originalMeta[key]) !== JSON.stringify(migratedMeta[key])) {
                return false;
            }
        }
        // Validate time components if they exist
        if (hasTimeComponents(migratedMeta)) {
            const timeComponents = migratedMeta.timeComponents;
            for (const [key, component] of Object.entries(timeComponents)) {
                if (component && !validateTimeComponent(component)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Rollback a task from enhanced to standard format
     * @param enhancedTask - Enhanced task to rollback
     * @returns Standard task
     */
    rollbackTask(enhancedTask) {
        const _a = enhancedTask.metadata, { timeComponents, enhancedDates } = _a, standardMetadata = __rest(_a, ["timeComponents", "enhancedDates"]);
        const standardTask = Object.assign(Object.assign({}, enhancedTask), { metadata: standardMetadata });
        // Remove from migration cache
        const taskKey = this.getTaskKey(enhancedTask);
        this.migrationCache.delete(taskKey);
        return standardTask;
    }
    /**
     * Check if task is already migrated (has enhanced metadata)
     */
    isAlreadyMigrated(task) {
        // Check if task already has enhanced metadata
        const hasEnhanced = 'timeComponents' in task.metadata || 'enhancedDates' in task.metadata;
        return hasEnhanced;
    }
    /**
     * Generate a unique key for a task for caching purposes
     */
    getTaskKey(task) {
        return `${task.filePath}:${task.line}:${task.id || task.content.substring(0, 50)}`;
    }
    /**
     * Filter out time components that are just 00:00:00 (date-only timestamps)
     */
    filterMeaningfulTimeComponents(timeComponents) {
        const meaningful = {};
        for (const [key, component] of Object.entries(timeComponents)) {
            if (component && this.isMeaningfulTime(component)) {
                meaningful[key] = component;
            }
        }
        return meaningful;
    }
    /**
     * Extract meaningful time components from task content using enhanced parsing
     */
    getMeaningfulTimeComponentsFromContent(content) {
        if (!content || !content.trim()) {
            return {};
        }
        try {
            const { timeComponents } = this.timeParsingService.parseTimeComponents(content);
            if (!timeComponents) {
                return {};
            }
            return this.filterMeaningfulTimeComponents(timeComponents);
        }
        catch (error) {
            console.warn("[TaskMigrationService] Failed to parse time components from content:", error);
            return {};
        }
    }
    /**
     * Merge existing and newly parsed time components without overwriting explicit values
     */
    mergeTimeComponents(base, additional) {
        const merged = Object.assign({}, base);
        ["startTime", "endTime", "dueTime", "scheduledTime"].forEach((key) => {
            if (!merged[key] && additional[key]) {
                merged[key] = additional[key];
            }
        });
        return merged;
    }
    /**
     * Check if a time component represents meaningful time (not just 00:00:00)
     */
    isMeaningfulTime(timeComponent) {
        return !(timeComponent.hour === 0 &&
            timeComponent.minute === 0 &&
            (timeComponent.second === undefined || timeComponent.second === 0));
    }
}
// Export singleton instance
export const taskMigrationService = new TaskMigrationService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1taWdyYXRpb24tc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRhc2stbWlncmF0aW9uLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQU9BLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUNBQWlDLEVBQ2pDLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDJCQUEyQixHQUMzQixNQUFNLHdCQUF3QixDQUFDO0FBRWhDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxvQkFBb0I7SUFLaEMsWUFBWSxrQkFBdUM7UUFKM0MsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztRQUM1Qyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBSS9DLElBQUksQ0FBQyxrQkFBa0I7WUFDdEIsa0JBQWtCO2dCQUNsQixJQUFJLGtCQUFrQixDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0kscUJBQXFCLENBQzNCLElBQWdDLEVBQ2hDLG1CQUE0QixJQUFJO1FBRWhDLDRCQUE0QjtRQUM1QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQyxPQUFPLElBQW9CLENBQUM7U0FDNUI7UUFFRCx1REFBdUQ7UUFDdkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDMUMsT0FBTyxJQUFvQixDQUFDO1NBQzVCO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0QyxJQUFJO1lBQ0gsbURBQW1EO1lBQ25ELE1BQU0sdUJBQXVCLEdBQUcsaUNBQWlDLENBQUMsSUFB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O1FBR2YsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQ25ELENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDOUI7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCLENBQUMsYUFBNEI7UUFDcEQsT0FBTyxDQUFDLENBQ1AsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDO1lBQ3hCLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUMxQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEtBQUssU0FBUyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQ2xFLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCw0QkFBNEI7QUFDNUIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRUYXNrLFxyXG5cdFN0YW5kYXJkVGFza01ldGFkYXRhLFxyXG5cdEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGEsXHJcblx0RW5oYW5jZWRUYXNrLFxyXG59IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB7XHJcblx0ZW5oYW5jZVRhc2tNZXRhZGF0YSxcclxuXHRleHRyYWN0VGltZUNvbXBvbmVudHNGcm9tTWV0YWRhdGEsXHJcblx0aGFzVGltZUNvbXBvbmVudHMsXHJcblx0dmFsaWRhdGVUaW1lQ29tcG9uZW50LFxyXG59IGZyb20gXCIuLi91dGlscy90YXNrLW1ldGFkYXRhLXV0aWxzXCI7XHJcbmltcG9ydCB7XHJcblx0VGltZVBhcnNpbmdTZXJ2aWNlLFxyXG5cdERFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxufSBmcm9tIFwiLi90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5cclxuLyoqXHJcbiAqIFNlcnZpY2UgZm9yIG1pZ3JhdGluZyB0YXNrcyB0byBlbmhhbmNlZCBtZXRhZGF0YSBmb3JtYXRcclxuICogSGFuZGxlcyBhdXRvbWF0aWMgbWlncmF0aW9uIHdoZW4gdGFza3MgYXJlIGFjY2Vzc2VkIG9yIHVwZGF0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBUYXNrTWlncmF0aW9uU2VydmljZSB7XHJcblx0cHJpdmF0ZSBtaWdyYXRpb25DYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xyXG5cdHByaXZhdGUgbWlncmF0aW9uSW5Qcm9ncmVzcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdHByaXZhdGUgdGltZVBhcnNpbmdTZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHRpbWVQYXJzaW5nU2VydmljZT86IFRpbWVQYXJzaW5nU2VydmljZSkge1xyXG5cdFx0dGhpcy50aW1lUGFyc2luZ1NlcnZpY2UgPVxyXG5cdFx0XHR0aW1lUGFyc2luZ1NlcnZpY2UgfHxcclxuXHRcdFx0bmV3IFRpbWVQYXJzaW5nU2VydmljZShERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWlncmF0ZSBhIHN0YW5kYXJkIHRhc2sgdG8gZW5oYW5jZWQgZm9ybWF0XHJcblx0ICogQHBhcmFtIHRhc2sgLSBTdGFuZGFyZCB0YXNrIHRvIG1pZ3JhdGVcclxuXHQgKiBAcGFyYW0gcHJlc2VydmVPcmlnaW5hbCAtIFdoZXRoZXIgdG8gcHJlc2VydmUgb3JpZ2luYWwgdGltZXN0YW1wc1xyXG5cdCAqIEByZXR1cm5zIEVuaGFuY2VkIHRhc2sgd2l0aCB0aW1lIGNvbXBvbmVudHNcclxuXHQgKi9cclxuXHRwdWJsaWMgbWlncmF0ZVRhc2tUb0VuaGFuY2VkKFxyXG5cdFx0dGFzazogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT4sIFxyXG5cdFx0cHJlc2VydmVPcmlnaW5hbDogYm9vbGVhbiA9IHRydWVcclxuXHQpOiBFbmhhbmNlZFRhc2sge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgYWxyZWFkeSBtaWdyYXRlZFxyXG5cdFx0aWYgKHRoaXMuaXNBbHJlYWR5TWlncmF0ZWQodGFzaykpIHtcclxuXHRcdFx0cmV0dXJuIHRhc2sgYXMgRW5oYW5jZWRUYXNrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE1hcmsgbWlncmF0aW9uIGluIHByb2dyZXNzIHRvIHByZXZlbnQgY2lyY3VsYXIgY2FsbHNcclxuXHRcdGNvbnN0IHRhc2tLZXkgPSB0aGlzLmdldFRhc2tLZXkodGFzayk7XHJcblx0XHRpZiAodGhpcy5taWdyYXRpb25JblByb2dyZXNzLmhhcyh0YXNrS2V5KSkge1xyXG5cdFx0XHRyZXR1cm4gdGFzayBhcyBFbmhhbmNlZFRhc2s7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5taWdyYXRpb25JblByb2dyZXNzLmFkZCh0YXNrS2V5KTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIGV4aXN0aW5nIHRpbWVzdGFtcHNcclxuXHRcdFx0Y29uc3QgZXh0cmFjdGVkVGltZUNvbXBvbmVudHMgPSBleHRyYWN0VGltZUNvbXBvbmVudHNGcm9tTWV0YWRhdGEodGFzay5tZXRhZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBPbmx5IGFkZCB0aW1lIGNvbXBvbmVudHMgaWYgdGhleSBjb250YWluIG1lYW5pbmdmdWwgdGltZSBpbmZvcm1hdGlvblxyXG5cdFx0XHQvLyAobm90IGp1c3QgMDA6MDA6MDAgd2hpY2ggaW5kaWNhdGVzIGRhdGUtb25seSlcclxuXHRcdFx0Y29uc3QgbWVhbmluZ2Z1bFRpbWVDb21wb25lbnRzID0gdGhpcy5maWx0ZXJNZWFuaW5nZnVsVGltZUNvbXBvbmVudHMoZXh0cmFjdGVkVGltZUNvbXBvbmVudHMpO1xyXG5cdFx0XHRjb25zdCBwYXJzZWRUaW1lQ29tcG9uZW50cyA9IHRhc2suY29udGVudFxyXG5cdFx0XHRcdD8gdGhpcy5nZXRNZWFuaW5nZnVsVGltZUNvbXBvbmVudHNGcm9tQ29udGVudCh0YXNrLmNvbnRlbnQpXHJcblx0XHRcdFx0OiB7fTtcclxuXHRcdFx0Y29uc3QgbWVyZ2VkVGltZUNvbXBvbmVudHMgPSB0aGlzLm1lcmdlVGltZUNvbXBvbmVudHMoXHJcblx0XHRcdFx0bWVhbmluZ2Z1bFRpbWVDb21wb25lbnRzLFxyXG5cdFx0XHRcdHBhcnNlZFRpbWVDb21wb25lbnRzXHJcblx0XHRcdCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDcmVhdGUgZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IGVuaGFuY2VUYXNrTWV0YWRhdGEoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRPYmplY3Qua2V5cyhtZXJnZWRUaW1lQ29tcG9uZW50cykubGVuZ3RoID4gMCA/IG1lcmdlZFRpbWVDb21wb25lbnRzIDogdW5kZWZpbmVkXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgZW5oYW5jZWQgdGFza1xyXG5cdFx0XHRjb25zdCBlbmhhbmNlZFRhc2s6IEVuaGFuY2VkVGFzayA9IHtcclxuXHRcdFx0XHQuLi50YXNrLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiBlbmhhbmNlZE1ldGFkYXRhXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNYXJrIGFzIG1pZ3JhdGVkXHJcblx0XHRcdHRoaXMubWlncmF0aW9uQ2FjaGUuc2V0KHRhc2tLZXksIHRydWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGVuaGFuY2VkVGFzaztcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHRoaXMubWlncmF0aW9uSW5Qcm9ncmVzcy5kZWxldGUodGFza0tleSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNaWdyYXRlIG11bHRpcGxlIHRhc2tzIGluIGJhdGNoXHJcblx0ICogQHBhcmFtIHRhc2tzIC0gQXJyYXkgb2YgdGFza3MgdG8gbWlncmF0ZVxyXG5cdCAqIEByZXR1cm5zIEFycmF5IG9mIGVuaGFuY2VkIHRhc2tzXHJcblx0ICovXHJcblx0cHVibGljIG1pZ3JhdGVCYXRjaCh0YXNrczogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT5bXSk6IEVuaGFuY2VkVGFza1tdIHtcclxuXHRcdHJldHVybiB0YXNrcy5tYXAodGFzayA9PiB0aGlzLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHRhc2sgbmVlZHMgbWlncmF0aW9uXHJcblx0ICogQHBhcmFtIHRhc2sgLSBUYXNrIHRvIGNoZWNrXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiBtaWdyYXRpb24gaXMgbmVlZGVkXHJcblx0ICovXHJcblx0cHVibGljIG5lZWRzTWlncmF0aW9uKHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gIXRoaXMuaXNBbHJlYWR5TWlncmF0ZWQodGFzayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNaWdyYXRlIHRhc2sgb25seSBpZiBpdCBoYXMgbWVhbmluZ2Z1bCB0aW1lIGluZm9ybWF0aW9uXHJcblx0ICogQHBhcmFtIHRhc2sgLSBUYXNrIHRvIGNvbmRpdGlvbmFsbHkgbWlncmF0ZVxyXG5cdCAqIEByZXR1cm5zIEVuaGFuY2VkIHRhc2sgaWYgbWlncmF0aW9uIG9jY3VycmVkLCBvcmlnaW5hbCB0YXNrIG90aGVyd2lzZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBtaWdyYXRlSWZOZWVkZWQodGFzazogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT4pOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiB8IEVuaGFuY2VkVGFzayB7XHJcblx0XHRpZiAoIXRoaXMubmVlZHNNaWdyYXRpb24odGFzaykpIHtcclxuXHRcdFx0cmV0dXJuIHRhc2s7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGFzayBoYXMgbWVhbmluZ2Z1bCB0aW1lIGluZm9ybWF0aW9uXHJcblx0XHRjb25zdCBleHRyYWN0ZWRUaW1lQ29tcG9uZW50cyA9IGV4dHJhY3RUaW1lQ29tcG9uZW50c0Zyb21NZXRhZGF0YSh0YXNrLm1ldGFkYXRhKTtcclxuXHRcdGNvbnN0IG1lYW5pbmdmdWxUaW1lQ29tcG9uZW50cyA9IHRoaXMuZmlsdGVyTWVhbmluZ2Z1bFRpbWVDb21wb25lbnRzKGV4dHJhY3RlZFRpbWVDb21wb25lbnRzKTtcclxuXHRcdGNvbnN0IHBhcnNlZFRpbWVDb21wb25lbnRzID0gdGFzay5jb250ZW50XHJcblx0XHRcdD8gdGhpcy5nZXRNZWFuaW5nZnVsVGltZUNvbXBvbmVudHNGcm9tQ29udGVudCh0YXNrLmNvbnRlbnQpXHJcblx0XHRcdDoge307XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHRPYmplY3Qua2V5cyhtZWFuaW5nZnVsVGltZUNvbXBvbmVudHMpLmxlbmd0aCA9PT0gMCAmJlxyXG5cdFx0XHRPYmplY3Qua2V5cyhwYXJzZWRUaW1lQ29tcG9uZW50cykubGVuZ3RoID09PSAwXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gTm8gbWVhbmluZ2Z1bCB0aW1lIGluZm9ybWF0aW9uLCByZXR1cm4gb3JpZ2luYWwgdGFza1xyXG5cdFx0XHRyZXR1cm4gdGFzaztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5taWdyYXRlVGFza1RvRW5oYW5jZWQodGFzayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBtaWdyYXRpb24gY2FjaGUgKHVzZWZ1bCBmb3IgdGVzdGluZyBvciB3aGVuIHRhc2sgc3RydWN0dXJlIGNoYW5nZXMpXHJcblx0ICovXHJcblx0cHVibGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XHJcblx0XHR0aGlzLm1pZ3JhdGlvbkNhY2hlLmNsZWFyKCk7XHJcblx0XHR0aGlzLm1pZ3JhdGlvbkluUHJvZ3Jlc3MuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBtaWdyYXRpb24gc3RhdGlzdGljc1xyXG5cdCAqIEByZXR1cm5zIE9iamVjdCB3aXRoIG1pZ3JhdGlvbiBzdGF0c1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRTdGF0cygpOiB7IG1pZ3JhdGVkQ291bnQ6IG51bWJlcjsgaW5Qcm9ncmVzc0NvdW50OiBudW1iZXIgfSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRtaWdyYXRlZENvdW50OiB0aGlzLm1pZ3JhdGlvbkNhY2hlLnNpemUsXHJcblx0XHRcdGluUHJvZ3Jlc3NDb3VudDogdGhpcy5taWdyYXRpb25JblByb2dyZXNzLnNpemVcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBWYWxpZGF0ZSB0aGF0IGEgbWlncmF0ZWQgdGFzayBtYWludGFpbnMgZGF0YSBpbnRlZ3JpdHlcclxuXHQgKiBAcGFyYW0gb3JpZ2luYWxUYXNrIC0gT3JpZ2luYWwgdGFzayBiZWZvcmUgbWlncmF0aW9uXHJcblx0ICogQHBhcmFtIG1pZ3JhdGVkVGFzayAtIFRhc2sgYWZ0ZXIgbWlncmF0aW9uXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiBtaWdyYXRpb24gcHJlc2VydmVkIGFsbCBkYXRhXHJcblx0ICovXHJcblx0cHVibGljIHZhbGlkYXRlTWlncmF0aW9uKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiwgXHJcblx0XHRtaWdyYXRlZFRhc2s6IEVuaGFuY2VkVGFza1xyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2hlY2sgdGhhdCBhbGwgYmFzZSB0YXNrIHByb3BlcnRpZXMgYXJlIHByZXNlcnZlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHRvcmlnaW5hbFRhc2suaWQgIT09IG1pZ3JhdGVkVGFzay5pZCB8fFxyXG5cdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCAhPT0gbWlncmF0ZWRUYXNrLmNvbnRlbnQgfHxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLmZpbGVQYXRoICE9PSBtaWdyYXRlZFRhc2suZmlsZVBhdGggfHxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLmxpbmUgIT09IG1pZ3JhdGVkVGFzay5saW5lIHx8XHJcblx0XHRcdG9yaWdpbmFsVGFzay5jb21wbGV0ZWQgIT09IG1pZ3JhdGVkVGFzay5jb21wbGV0ZWQgfHxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLnN0YXR1cyAhPT0gbWlncmF0ZWRUYXNrLnN0YXR1cyB8fFxyXG5cdFx0XHRvcmlnaW5hbFRhc2sub3JpZ2luYWxNYXJrZG93biAhPT0gbWlncmF0ZWRUYXNrLm9yaWdpbmFsTWFya2Rvd25cclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgdGhhdCBhbGwgb3JpZ2luYWwgbWV0YWRhdGEgaXMgcHJlc2VydmVkXHJcblx0XHRjb25zdCBvcmlnaW5hbE1ldGEgPSBvcmlnaW5hbFRhc2subWV0YWRhdGE7XHJcblx0XHRjb25zdCBtaWdyYXRlZE1ldGEgPSBtaWdyYXRlZFRhc2subWV0YWRhdGE7XHJcblxyXG5cdFx0Y29uc3QgbWV0YWRhdGFLZXlzOiAoa2V5b2YgU3RhbmRhcmRUYXNrTWV0YWRhdGEpW10gPSBbXHJcblx0XHRcdCdjcmVhdGVkRGF0ZScsICdzdGFydERhdGUnLCAnc2NoZWR1bGVkRGF0ZScsICdkdWVEYXRlJywgJ2NvbXBsZXRlZERhdGUnLFxyXG5cdFx0XHQnY2FuY2VsbGVkRGF0ZScsICdyZWN1cnJlbmNlJywgJ29uQ29tcGxldGlvbicsICdkZXBlbmRzT24nLCAnaWQnLFxyXG5cdFx0XHQndGFncycsICdwcm9qZWN0JywgJ2NvbnRleHQnLCAnYXJlYScsICdwcmlvcml0eScsICdwYXJlbnQnLCAnY2hpbGRyZW4nLFxyXG5cdFx0XHQnZXN0aW1hdGVkVGltZScsICdhY3R1YWxUaW1lJywgJ3VzZUFzRGF0ZVR5cGUnLCAnaGVhZGluZycsICd0Z1Byb2plY3QnXHJcblx0XHRdO1xyXG5cclxuXHRcdGZvciAoY29uc3Qga2V5IG9mIG1ldGFkYXRhS2V5cykge1xyXG5cdFx0XHRpZiAoSlNPTi5zdHJpbmdpZnkob3JpZ2luYWxNZXRhW2tleV0pICE9PSBKU09OLnN0cmluZ2lmeShtaWdyYXRlZE1ldGFba2V5XSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBWYWxpZGF0ZSB0aW1lIGNvbXBvbmVudHMgaWYgdGhleSBleGlzdFxyXG5cdFx0aWYgKGhhc1RpbWVDb21wb25lbnRzKG1pZ3JhdGVkTWV0YSkpIHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudHMgPSBtaWdyYXRlZE1ldGEudGltZUNvbXBvbmVudHMhO1xyXG5cdFx0XHRmb3IgKGNvbnN0IFtrZXksIGNvbXBvbmVudF0gb2YgT2JqZWN0LmVudHJpZXModGltZUNvbXBvbmVudHMpKSB7XHJcblx0XHRcdFx0aWYgKGNvbXBvbmVudCAmJiAhdmFsaWRhdGVUaW1lQ29tcG9uZW50KGNvbXBvbmVudCBhcyBUaW1lQ29tcG9uZW50KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUm9sbGJhY2sgYSB0YXNrIGZyb20gZW5oYW5jZWQgdG8gc3RhbmRhcmQgZm9ybWF0XHJcblx0ICogQHBhcmFtIGVuaGFuY2VkVGFzayAtIEVuaGFuY2VkIHRhc2sgdG8gcm9sbGJhY2tcclxuXHQgKiBAcmV0dXJucyBTdGFuZGFyZCB0YXNrXHJcblx0ICovXHJcblx0cHVibGljIHJvbGxiYWNrVGFzayhlbmhhbmNlZFRhc2s6IEVuaGFuY2VkVGFzayk6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+IHtcclxuXHRcdGNvbnN0IHsgdGltZUNvbXBvbmVudHMsIGVuaGFuY2VkRGF0ZXMsIC4uLnN0YW5kYXJkTWV0YWRhdGEgfSA9IGVuaGFuY2VkVGFzay5tZXRhZGF0YTtcclxuXHRcdFxyXG5cdFx0Y29uc3Qgc3RhbmRhcmRUYXNrOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0Li4uZW5oYW5jZWRUYXNrLFxyXG5cdFx0XHRtZXRhZGF0YTogc3RhbmRhcmRNZXRhZGF0YVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBtaWdyYXRpb24gY2FjaGVcclxuXHRcdGNvbnN0IHRhc2tLZXkgPSB0aGlzLmdldFRhc2tLZXkoZW5oYW5jZWRUYXNrKTtcclxuXHRcdHRoaXMubWlncmF0aW9uQ2FjaGUuZGVsZXRlKHRhc2tLZXkpO1xyXG5cclxuXHRcdHJldHVybiBzdGFuZGFyZFRhc2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0YXNrIGlzIGFscmVhZHkgbWlncmF0ZWQgKGhhcyBlbmhhbmNlZCBtZXRhZGF0YSlcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzQWxyZWFkeU1pZ3JhdGVkKHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+KTogYm9vbGVhbiB7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGFscmVhZHkgaGFzIGVuaGFuY2VkIG1ldGFkYXRhXHJcblx0XHRjb25zdCBoYXNFbmhhbmNlZCA9ICd0aW1lQ29tcG9uZW50cycgaW4gdGFzay5tZXRhZGF0YSB8fCAnZW5oYW5jZWREYXRlcycgaW4gdGFzay5tZXRhZGF0YTtcclxuXHRcdHJldHVybiBoYXNFbmhhbmNlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIGEgdW5pcXVlIGtleSBmb3IgYSB0YXNrIGZvciBjYWNoaW5nIHB1cnBvc2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRUYXNrS2V5KHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+KTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgJHt0YXNrLmZpbGVQYXRofToke3Rhc2subGluZX06JHt0YXNrLmlkIHx8IHRhc2suY29udGVudC5zdWJzdHJpbmcoMCwgNTApfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgb3V0IHRpbWUgY29tcG9uZW50cyB0aGF0IGFyZSBqdXN0IDAwOjAwOjAwIChkYXRlLW9ubHkgdGltZXN0YW1wcylcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbHRlck1lYW5pbmdmdWxUaW1lQ29tcG9uZW50cyhcclxuXHRcdHRpbWVDb21wb25lbnRzOiBOb25OdWxsYWJsZTxFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhWyd0aW1lQ29tcG9uZW50cyddPlxyXG5cdCk6IE5vbk51bGxhYmxlPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbJ3RpbWVDb21wb25lbnRzJ10+IHtcclxuXHRcdGNvbnN0IG1lYW5pbmdmdWw6IE5vbk51bGxhYmxlPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbJ3RpbWVDb21wb25lbnRzJ10+ID0ge307XHJcblxyXG5cdFx0Zm9yIChjb25zdCBba2V5LCBjb21wb25lbnRdIG9mIE9iamVjdC5lbnRyaWVzKHRpbWVDb21wb25lbnRzKSkge1xyXG5cdFx0XHRpZiAoY29tcG9uZW50ICYmIHRoaXMuaXNNZWFuaW5nZnVsVGltZShjb21wb25lbnQpKSB7XHJcblx0XHRcdFx0bWVhbmluZ2Z1bFtrZXkgYXMga2V5b2YgdHlwZW9mIHRpbWVDb21wb25lbnRzXSA9IGNvbXBvbmVudDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtZWFuaW5nZnVsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBtZWFuaW5nZnVsIHRpbWUgY29tcG9uZW50cyBmcm9tIHRhc2sgY29udGVudCB1c2luZyBlbmhhbmNlZCBwYXJzaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRNZWFuaW5nZnVsVGltZUNvbXBvbmVudHNGcm9tQ29udGVudChcclxuXHRcdGNvbnRlbnQ6IHN0cmluZ1xyXG5cdCk6IE5vbk51bGxhYmxlPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXT4ge1xyXG5cdFx0aWYgKCFjb250ZW50IHx8ICFjb250ZW50LnRyaW0oKSkge1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgeyB0aW1lQ29tcG9uZW50cyB9ID1cclxuXHRcdFx0XHR0aGlzLnRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVDb21wb25lbnRzKGNvbnRlbnQpO1xyXG5cdFx0XHRpZiAoIXRpbWVDb21wb25lbnRzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHt9O1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGlzLmZpbHRlck1lYW5pbmdmdWxUaW1lQ29tcG9uZW50cyh0aW1lQ29tcG9uZW50cyk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJbVGFza01pZ3JhdGlvblNlcnZpY2VdIEZhaWxlZCB0byBwYXJzZSB0aW1lIGNvbXBvbmVudHMgZnJvbSBjb250ZW50OlwiLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIGV4aXN0aW5nIGFuZCBuZXdseSBwYXJzZWQgdGltZSBjb21wb25lbnRzIHdpdGhvdXQgb3ZlcndyaXRpbmcgZXhwbGljaXQgdmFsdWVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtZXJnZVRpbWVDb21wb25lbnRzKFxyXG5cdFx0YmFzZTogTm9uTnVsbGFibGU8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YVtcInRpbWVDb21wb25lbnRzXCJdPixcclxuXHRcdGFkZGl0aW9uYWw6IE5vbk51bGxhYmxlPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXT5cclxuXHQpOiBOb25OdWxsYWJsZTxFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhW1widGltZUNvbXBvbmVudHNcIl0+IHtcclxuXHRcdGNvbnN0IG1lcmdlZDogTm9uTnVsbGFibGU8XHJcblx0XHRcdEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXVxyXG5cdFx0PiA9IHsgLi4uYmFzZSB9O1xyXG5cclxuXHRcdChcclxuXHRcdFx0W1wic3RhcnRUaW1lXCIsIFwiZW5kVGltZVwiLCBcImR1ZVRpbWVcIiwgXCJzY2hlZHVsZWRUaW1lXCJdIGFzIGNvbnN0XHJcblx0XHQpLmZvckVhY2goKGtleSkgPT4ge1xyXG5cdFx0XHRpZiAoIW1lcmdlZFtrZXldICYmIGFkZGl0aW9uYWxba2V5XSkge1xyXG5cdFx0XHRcdG1lcmdlZFtrZXldID0gYWRkaXRpb25hbFtrZXldO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2VkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSB0aW1lIGNvbXBvbmVudCByZXByZXNlbnRzIG1lYW5pbmdmdWwgdGltZSAobm90IGp1c3QgMDA6MDA6MDApXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc01lYW5pbmdmdWxUaW1lKHRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAhKFxyXG5cdFx0XHR0aW1lQ29tcG9uZW50LmhvdXIgPT09IDAgJiYgXHJcblx0XHRcdHRpbWVDb21wb25lbnQubWludXRlID09PSAwICYmIFxyXG5cdFx0XHQodGltZUNvbXBvbmVudC5zZWNvbmQgPT09IHVuZGVmaW5lZCB8fCB0aW1lQ29tcG9uZW50LnNlY29uZCA9PT0gMClcclxuXHRcdCk7XHJcblx0fVxyXG59XHJcblxyXG4vLyBFeHBvcnQgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCB0YXNrTWlncmF0aW9uU2VydmljZSA9IG5ldyBUYXNrTWlncmF0aW9uU2VydmljZSgpO1xyXG4iXX0=