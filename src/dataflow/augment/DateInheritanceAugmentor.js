/**
 * Date Inheritance Augmentor for Dataflow System
 *
 * This augmentor integrates with the dataflow system to efficiently resolve dates
 * for time-only expressions using the DateInheritanceService with optimized caching.
 */
import { __awaiter } from "tslib";
import { DateInheritanceService } from "@/services/date-inheritance-service";
/**
 * Date inheritance augmentor that integrates with dataflow for efficient processing
 */
export class DateInheritanceAugmentor {
    constructor(app, vault, metadataCache) {
        this.resolutionCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
        this.MAX_CACHE_SIZE = 1000;
        this.dateInheritanceService = new DateInheritanceService(app, vault, metadataCache);
    }
    /**
     * Augment tasks with date inheritance for time-only expressions
     * Optimized for batch processing within dataflow
     */
    augmentTasksWithDateInheritance(tasks, filePath, fileContent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tasks.length === 0) {
                return tasks;
            }
            // Prepare batch context for efficient processing
            const batchContext = yield this.prepareBatchContext(tasks, filePath, fileContent);
            // Process tasks in batch
            const augmentedTasks = [];
            for (const task of tasks) {
                try {
                    const augmentedTask = yield this.augmentSingleTask(task, batchContext);
                    augmentedTasks.push(augmentedTask);
                }
                catch (error) {
                    console.warn(`[DateInheritanceAugmentor] Failed to augment task ${task.id}:`, error);
                    // Return original task on error
                    augmentedTasks.push(task);
                }
            }
            return augmentedTasks;
        });
    }
    /**
     * Prepare batch context for efficient processing
     */
    prepareBatchContext(tasks, filePath, fileContent) {
        return __awaiter(this, void 0, void 0, function* () {
            // Parse file content into lines if provided
            const allLines = fileContent ? fileContent.split(/\r?\n/) : [];
            // Build parent-child relationship map
            const parentChildMap = new Map();
            for (const task of tasks) {
                if (task.metadata.parent) {
                    parentChildMap.set(task.id, task.metadata.parent);
                }
            }
            // Create shared file metadata cache
            const fileMetadataCache = new Map();
            return {
                filePath,
                allTasks: tasks,
                allLines,
                fileMetadataCache,
                parentChildMap,
            };
        });
    }
    /**
     * Augment a single task with date inheritance
     */
    augmentSingleTask(task, batchContext) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if task has enhanced metadata with time components
            const enhancedMetadata = task.metadata;
            if (!enhancedMetadata.timeComponents) {
                return task; // No time components to process
            }
            // Check if we need date inheritance (time-only expressions)
            const needsDateInheritance = this.hasTimeOnlyExpressions(enhancedMetadata);
            if (!needsDateInheritance) {
                return task; // Task already has complete date+time information
            }
            // Resolve dates for time-only expressions
            const resolvedDates = yield this.resolveTimeOnlyDates(task, enhancedMetadata, batchContext);
            // Update task metadata with resolved dates
            if (resolvedDates.length > 0) {
                const updatedTask = this.updateTaskWithResolvedDates(task, resolvedDates);
                return updatedTask;
            }
            return task;
        });
    }
    /**
     * Check if task has time-only expressions that need date inheritance
     */
    hasTimeOnlyExpressions(metadata) {
        if (!metadata.timeComponents) {
            return false;
        }
        const { timeComponents } = metadata;
        // Check if we have time components but missing corresponding date fields
        const hasTimeWithoutDate = (timeComponents.startTime && !metadata.startDate) ||
            (timeComponents.endTime && !metadata.startDate && !metadata.dueDate) ||
            (timeComponents.dueTime && !metadata.dueDate) ||
            (timeComponents.scheduledTime && !metadata.scheduledDate);
        return hasTimeWithoutDate || false;
    }
    /**
     * Resolve dates for time-only expressions using cached results when possible
     */
    resolveTimeOnlyDates(task, metadata, batchContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolvedDates = [];
            if (!metadata.timeComponents) {
                return resolvedDates;
            }
            // Find parent task if exists
            const parentTaskId = batchContext.parentChildMap.get(task.id);
            const parentTask = parentTaskId ?
                batchContext.allTasks.find(t => t.id === parentTaskId) : undefined;
            // Get current line content
            const currentLine = task.originalMarkdown || task.content;
            // Create resolution context
            const context = {
                currentLine,
                filePath: batchContext.filePath,
                parentTask,
                fileMetadataCache: batchContext.fileMetadataCache,
                lineNumber: task.line,
                allLines: batchContext.allLines,
                allTasks: batchContext.allTasks, // Provide all tasks for hierarchical inheritance
            };
            // Resolve dates for each time component that needs it
            const timeComponents = metadata.timeComponents;
            // Start time without start date
            if (timeComponents.startTime && !metadata.startDate) {
                const result = yield this.resolveWithCache(task, timeComponents.startTime, context, 'startTime');
                if (result) {
                    resolvedDates.push({
                        type: 'startDate',
                        date: result.resolvedDate,
                        timeComponent: timeComponents.startTime,
                        result
                    });
                }
            }
            // Due time without due date
            if (timeComponents.dueTime && !metadata.dueDate) {
                const result = yield this.resolveWithCache(task, timeComponents.dueTime, context, 'dueTime');
                if (result) {
                    resolvedDates.push({
                        type: 'dueDate',
                        date: result.resolvedDate,
                        timeComponent: timeComponents.dueTime,
                        result
                    });
                }
            }
            // Scheduled time without scheduled date
            if (timeComponents.scheduledTime && !metadata.scheduledDate) {
                const result = yield this.resolveWithCache(task, timeComponents.scheduledTime, context, 'scheduledTime');
                if (result) {
                    resolvedDates.push({
                        type: 'scheduledDate',
                        date: result.resolvedDate,
                        timeComponent: timeComponents.scheduledTime,
                        result
                    });
                }
            }
            // End time without any date context (use start date if available, or resolve new date)
            if (timeComponents.endTime && !metadata.startDate && !metadata.dueDate) {
                const result = yield this.resolveWithCache(task, timeComponents.endTime, context, 'endTime');
                if (result) {
                    // For end time, we typically want to use the same date as start
                    // If no start date exists, treat end time as due date
                    const dateType = timeComponents.startTime ? 'startDate' : 'dueDate';
                    resolvedDates.push({
                        type: dateType,
                        date: result.resolvedDate,
                        timeComponent: timeComponents.endTime,
                        result
                    });
                }
            }
            return resolvedDates;
        });
    }
    /**
     * Resolve date with caching for performance
     */
    resolveWithCache(task, timeComponent, context, timeType) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create cache key based on context
            const contextHash = this.createContextHash(task, timeComponent, context, timeType);
            const cacheKey = `${task.filePath}:${task.line}:${timeType}:${contextHash}`;
            // Check cache first
            const cached = this.resolutionCache.get(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                return cached.result;
            }
            try {
                // Resolve date using DateInheritanceService
                const result = yield this.dateInheritanceService.resolveDateForTimeOnly(task, timeComponent, context);
                // Cache the result
                this.cacheResolution(cacheKey, result, contextHash);
                return result;
            }
            catch (error) {
                console.error(`[DateInheritanceAugmentor] Failed to resolve date for task ${task.id}:`, error);
                return null;
            }
        });
    }
    /**
     * Create a hash of the resolution context for caching
     */
    createContextHash(task, timeComponent, context, timeType) {
        var _a;
        const contextData = {
            currentLine: context.currentLine,
            filePath: context.filePath,
            parentTaskId: (_a = context.parentTask) === null || _a === void 0 ? void 0 : _a.id,
            timeComponentText: timeComponent.originalText,
            timeType,
            lineNumber: context.lineNumber,
        };
        // Simple hash function for context
        return JSON.stringify(contextData);
    }
    /**
     * Check if cached resolution is still valid
     */
    isCacheValid(cached) {
        const now = Date.now();
        const age = now - cached.timestamp;
        return age < this.CACHE_TTL;
    }
    /**
     * Cache a date resolution result
     */
    cacheResolution(key, result, contextHash) {
        // Implement LRU eviction
        if (this.resolutionCache.size >= this.MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = this.resolutionCache.keys().next().value;
            if (firstKey) {
                this.resolutionCache.delete(firstKey);
            }
        }
        this.resolutionCache.set(key, {
            result,
            timestamp: Date.now(),
            contextHash,
        });
    }
    /**
     * Update task with resolved dates
     */
    updateTaskWithResolvedDates(task, resolvedDates) {
        const updatedTask = Object.assign({}, task);
        const updatedMetadata = Object.assign({}, task.metadata);
        // Update date fields with resolved dates
        for (const { type, date, timeComponent, result } of resolvedDates) {
            const timestamp = date.getTime();
            switch (type) {
                case 'startDate':
                    updatedMetadata.startDate = timestamp;
                    break;
                case 'dueDate':
                    updatedMetadata.dueDate = timestamp;
                    break;
                case 'scheduledDate':
                    updatedMetadata.scheduledDate = timestamp;
                    break;
            }
            // Update enhanced datetime objects
            if (!updatedMetadata.enhancedDates) {
                updatedMetadata.enhancedDates = {};
            }
            const combinedDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeComponent.hour, timeComponent.minute, timeComponent.second || 0);
            switch (type) {
                case 'startDate':
                    updatedMetadata.enhancedDates.startDateTime = combinedDateTime;
                    if (timeComponent.rangePartner) {
                        // Also create end datetime for time ranges
                        const endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeComponent.rangePartner.hour, timeComponent.rangePartner.minute, timeComponent.rangePartner.second || 0);
                        updatedMetadata.enhancedDates.endDateTime = endDateTime;
                    }
                    break;
                case 'dueDate':
                    updatedMetadata.enhancedDates.dueDateTime = combinedDateTime;
                    break;
                case 'scheduledDate':
                    updatedMetadata.enhancedDates.scheduledDateTime = combinedDateTime;
                    break;
            }
            // Log successful resolution for debugging
            console.log(`[DateInheritanceAugmentor] Resolved ${type} for task ${task.id}: ${date.toISOString()} (${result.source}, confidence: ${result.confidence})`);
        }
        updatedTask.metadata = updatedMetadata;
        return updatedTask;
    }
    /**
     * Clear the resolution cache
     */
    clearCache() {
        this.resolutionCache.clear();
        this.dateInheritanceService.clearCache();
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return {
            resolutionCache: {
                size: this.resolutionCache.size,
                maxSize: this.MAX_CACHE_SIZE,
            },
            dateInheritanceCache: this.dateInheritanceService.getCacheStats(),
        };
    }
    /**
     * Update settings and clear relevant caches
     */
    onSettingsChange() {
        this.clearCache();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQUdILE9BQU8sRUFBRSxzQkFBc0IsRUFBK0MsTUFBTSxxQ0FBcUMsQ0FBQztBQTZCMUg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sd0JBQXdCO0lBTXBDLFlBQ0MsR0FBUSxFQUNSLEtBQVksRUFDWixhQUE0QjtRQVByQixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBQ2pELGNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLGFBQWE7UUFDekMsbUJBQWMsR0FBRyxJQUFJLENBQUM7UUFPdEMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0csK0JBQStCLENBQ3BDLEtBQWEsRUFDYixRQUFnQixFQUNoQixXQUFvQjs7WUFFcEIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDdkIsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUVELGlEQUFpRDtZQUNqRCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRWxGLHlCQUF5QjtZQUN6QixNQUFNLGNBQWMsR0FBVyxFQUFFLENBQUM7WUFFbEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3pCLElBQUk7b0JBQ0gsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUN2RSxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxD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QUMsYUFBYSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDO29CQUNuRSxNQUFNO2FBQ1A7WUFFRCwwQ0FBMEM7WUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsSUFBSSxhQUFhLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztTQUMzSjtRQUVELFdBQVcsQ0FBQyxRQUFRLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVU7UUFDVCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBSVosT0FBTztZQUNOLGVBQWUsRUFBRTtnQkFDaEIsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSTtnQkFDL0IsT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjO2FBQzVCO1lBQ0Qsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsRUFBRTtTQUNqRSxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCO1FBQ2YsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ25CLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEYXRlIEluaGVyaXRhbmNlIEF1Z21lbnRvciBmb3IgRGF0YWZsb3cgU3lzdGVtXHJcbiAqIFxyXG4gKiBUaGlzIGF1Z21lbnRvciBpbnRlZ3JhdGVzIHdpdGggdGhlIGRhdGFmbG93IHN5c3RlbSB0byBlZmZpY2llbnRseSByZXNvbHZlIGRhdGVzXHJcbiAqIGZvciB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgdXNpbmcgdGhlIERhdGVJbmhlcml0YW5jZVNlcnZpY2Ugd2l0aCBvcHRpbWl6ZWQgY2FjaGluZy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBcHAsIFRGaWxlLCBWYXVsdCwgTWV0YWRhdGFDYWNoZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlLCBEYXRlUmVzb2x1dGlvbkNvbnRleHQsIERhdGVSZXNvbHV0aW9uUmVzdWx0IH0gZnJvbSBcIkAvc2VydmljZXMvZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzaywgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcblxyXG4vKipcclxuICogQmF0Y2ggcHJvY2Vzc2luZyBjb250ZXh0IGZvciBlZmZpY2llbnQgZGF0ZSByZXNvbHV0aW9uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEJhdGNoRGF0ZVJlc29sdXRpb25Db250ZXh0IHtcclxuXHQvKiogRmlsZSBwYXRoIGJlaW5nIHByb2Nlc3NlZCAqL1xyXG5cdGZpbGVQYXRoOiBzdHJpbmc7XHJcblx0LyoqIEFsbCB0YXNrcyBpbiB0aGUgZmlsZSBmb3IgcGFyZW50LWNoaWxkIHJlbGF0aW9uc2hpcCBhbmFseXNpcyAqL1xyXG5cdGFsbFRhc2tzOiBUYXNrW107XHJcblx0LyoqIEFsbCBsaW5lcyBpbiB0aGUgZmlsZSBmb3IgY29udGV4dCBhbmFseXNpcyAqL1xyXG5cdGFsbExpbmVzOiBzdHJpbmdbXTtcclxuXHQvKiogRmlsZSBtZXRhZGF0YSBjYWNoZSBzaGFyZWQgYWNyb3NzIGFsbCB0YXNrcyBpbiB0aGUgZmlsZSAqL1xyXG5cdGZpbGVNZXRhZGF0YUNhY2hlOiBNYXA8c3RyaW5nLCBhbnk+O1xyXG5cdC8qKiBQYXJlbnQtY2hpbGQgcmVsYXRpb25zaGlwIG1hcCBmb3IgZWZmaWNpZW50IGxvb2t1cCAqL1xyXG5cdHBhcmVudENoaWxkTWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xyXG59XHJcblxyXG4vKipcclxuICogQ2FjaGVkIGRhdGUgcmVzb2x1dGlvbiByZXN1bHRcclxuICovXHJcbmludGVyZmFjZSBDYWNoZWREYXRlUmVzb2x1dGlvbiB7XHJcblx0cmVzdWx0OiBEYXRlUmVzb2x1dGlvblJlc3VsdDtcclxuXHR0aW1lc3RhbXA6IG51bWJlcjtcclxuXHRjb250ZXh0SGFzaDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogRGF0ZSBpbmhlcml0YW5jZSBhdWdtZW50b3IgdGhhdCBpbnRlZ3JhdGVzIHdpdGggZGF0YWZsb3cgZm9yIGVmZmljaWVudCBwcm9jZXNzaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yIHtcclxuXHRwcml2YXRlIGRhdGVJbmhlcml0YW5jZVNlcnZpY2U6IERhdGVJbmhlcml0YW5jZVNlcnZpY2U7XHJcblx0cHJpdmF0ZSByZXNvbHV0aW9uQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVkRGF0ZVJlc29sdXRpb24+KCk7XHJcblx0cHJpdmF0ZSByZWFkb25seSBDQUNIRV9UVEwgPSAxMCAqIDYwICogMTAwMDsgLy8gMTAgbWludXRlc1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgTUFYX0NBQ0hFX1NJWkUgPSAxMDAwO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0dmF1bHQ6IFZhdWx0LFxyXG5cdFx0bWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZVxyXG5cdCkge1xyXG5cdFx0dGhpcy5kYXRlSW5oZXJpdGFuY2VTZXJ2aWNlID0gbmV3IERhdGVJbmhlcml0YW5jZVNlcnZpY2UoYXBwLCB2YXVsdCwgbWV0YWRhdGFDYWNoZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBdWdtZW50IHRhc2tzIHdpdGggZGF0ZSBpbmhlcml0YW5jZSBmb3IgdGltZS1vbmx5IGV4cHJlc3Npb25zXHJcblx0ICogT3B0aW1pemVkIGZvciBiYXRjaCBwcm9jZXNzaW5nIHdpdGhpbiBkYXRhZmxvd1xyXG5cdCAqL1xyXG5cdGFzeW5jIGF1Z21lbnRUYXNrc1dpdGhEYXRlSW5oZXJpdGFuY2UoXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGZpbGVDb250ZW50Pzogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxUYXNrW10+IHtcclxuXHRcdGlmICh0YXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIHRhc2tzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByZXBhcmUgYmF0Y2ggY29udGV4dCBmb3IgZWZmaWNpZW50IHByb2Nlc3NpbmdcclxuXHRcdGNvbnN0IGJhdGNoQ29udGV4dCA9IGF3YWl0IHRoaXMucHJlcGFyZUJhdGNoQ29udGV4dCh0YXNrcywgZmlsZVBhdGgsIGZpbGVDb250ZW50KTtcclxuXHRcdFxyXG5cdFx0Ly8gUHJvY2VzcyB0YXNrcyBpbiBiYXRjaFxyXG5cdFx0Y29uc3QgYXVnbWVudGVkVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFx0XHJcblx0XHRmb3IgKGNvbnN0IHRhc2sgb2YgdGFza3MpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBhdWdtZW50ZWRUYXNrID0gYXdhaXQgdGhpcy5hdWdtZW50U2luZ2xlVGFzayh0YXNrLCBiYXRjaENvbnRleHQpO1xyXG5cdFx0XHRcdGF1Z21lbnRlZFRhc2tzLnB1c2goYXVnbWVudGVkVGFzayk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKGBbRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yXSBGYWlsZWQgdG8gYXVnbWVudCB0YXNrICR7dGFzay5pZH06YCwgZXJyb3IpO1xyXG5cdFx0XHRcdC8vIFJldHVybiBvcmlnaW5hbCB0YXNrIG9uIGVycm9yXHJcblx0XHRcdFx0YXVnbWVudGVkVGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBhdWdtZW50ZWRUYXNrcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByZXBhcmUgYmF0Y2ggY29udGV4dCBmb3IgZWZmaWNpZW50IHByb2Nlc3NpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHByZXBhcmVCYXRjaENvbnRleHQoXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGZpbGVDb250ZW50Pzogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxCYXRjaERhdGVSZXNvbHV0aW9uQ29udGV4dD4ge1xyXG5cdFx0Ly8gUGFyc2UgZmlsZSBjb250ZW50IGludG8gbGluZXMgaWYgcHJvdmlkZWRcclxuXHRcdGNvbnN0IGFsbExpbmVzID0gZmlsZUNvbnRlbnQgPyBmaWxlQ29udGVudC5zcGxpdCgvXFxyP1xcbi8pIDogW107XHJcblxyXG5cdFx0Ly8gQnVpbGQgcGFyZW50LWNoaWxkIHJlbGF0aW9uc2hpcCBtYXBcclxuXHRcdGNvbnN0IHBhcmVudENoaWxkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHRcdGZvciAoY29uc3QgdGFzayBvZiB0YXNrcykge1xyXG5cdFx0XHRpZiAodGFzay5tZXRhZGF0YS5wYXJlbnQpIHtcclxuXHRcdFx0XHRwYXJlbnRDaGlsZE1hcC5zZXQodGFzay5pZCwgdGFzay5tZXRhZGF0YS5wYXJlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHNoYXJlZCBmaWxlIG1ldGFkYXRhIGNhY2hlXHJcblx0XHRjb25zdCBmaWxlTWV0YWRhdGFDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGFsbFRhc2tzOiB0YXNrcyxcclxuXHRcdFx0YWxsTGluZXMsXHJcblx0XHRcdGZpbGVNZXRhZGF0YUNhY2hlLFxyXG5cdFx0XHRwYXJlbnRDaGlsZE1hcCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBdWdtZW50IGEgc2luZ2xlIHRhc2sgd2l0aCBkYXRlIGluaGVyaXRhbmNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBhdWdtZW50U2luZ2xlVGFzayhcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHRiYXRjaENvbnRleHQ6IEJhdGNoRGF0ZVJlc29sdXRpb25Db250ZXh0XHJcblx0KTogUHJvbWlzZTxUYXNrPiB7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGhhcyBlbmhhbmNlZCBtZXRhZGF0YSB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHRcdGlmICghZW5oYW5jZWRNZXRhZGF0YS50aW1lQ29tcG9uZW50cykge1xyXG5cdFx0XHRyZXR1cm4gdGFzazsgLy8gTm8gdGltZSBjb21wb25lbnRzIHRvIHByb2Nlc3NcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIGRhdGUgaW5oZXJpdGFuY2UgKHRpbWUtb25seSBleHByZXNzaW9ucylcclxuXHRcdGNvbnN0IG5lZWRzRGF0ZUluaGVyaXRhbmNlID0gdGhpcy5oYXNUaW1lT25seUV4cHJlc3Npb25zKGVuaGFuY2VkTWV0YWRhdGEpO1xyXG5cdFx0aWYgKCFuZWVkc0RhdGVJbmhlcml0YW5jZSkge1xyXG5cdFx0XHRyZXR1cm4gdGFzazsgLy8gVGFzayBhbHJlYWR5IGhhcyBjb21wbGV0ZSBkYXRlK3RpbWUgaW5mb3JtYXRpb25cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXNvbHZlIGRhdGVzIGZvciB0aW1lLW9ubHkgZXhwcmVzc2lvbnNcclxuXHRcdGNvbnN0IHJlc29sdmVkRGF0ZXMgPSBhd2FpdCB0aGlzLnJlc29sdmVUaW1lT25seURhdGVzKHRhc2ssIGVuaGFuY2VkTWV0YWRhdGEsIGJhdGNoQ29udGV4dCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRhc2sgbWV0YWRhdGEgd2l0aCByZXNvbHZlZCBkYXRlc1xyXG5cdFx0aWYgKHJlc29sdmVkRGF0ZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkVGFzayA9IHRoaXMudXBkYXRlVGFza1dpdGhSZXNvbHZlZERhdGVzKHRhc2ssIHJlc29sdmVkRGF0ZXMpO1xyXG5cdFx0XHRyZXR1cm4gdXBkYXRlZFRhc2s7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRhc2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0YXNrIGhhcyB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgdGhhdCBuZWVkIGRhdGUgaW5oZXJpdGFuY2VcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhc1RpbWVPbmx5RXhwcmVzc2lvbnMobWV0YWRhdGE6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGEpOiBib29sZWFuIHtcclxuXHRcdGlmICghbWV0YWRhdGEudGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHsgdGltZUNvbXBvbmVudHMgfSA9IG1ldGFkYXRhO1xyXG5cdFx0XHJcblx0XHQvLyBDaGVjayBpZiB3ZSBoYXZlIHRpbWUgY29tcG9uZW50cyBidXQgbWlzc2luZyBjb3JyZXNwb25kaW5nIGRhdGUgZmllbGRzXHJcblx0XHRjb25zdCBoYXNUaW1lV2l0aG91dERhdGUgPSBcclxuXHRcdFx0KHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSAmJiAhbWV0YWRhdGEuc3RhcnREYXRlKSB8fFxyXG5cdFx0XHQodGltZUNvbXBvbmVudHMuZW5kVGltZSAmJiAhbWV0YWRhdGEuc3RhcnREYXRlICYmICFtZXRhZGF0YS5kdWVEYXRlKSB8fFxyXG5cdFx0XHQodGltZUNvbXBvbmVudHMuZHVlVGltZSAmJiAhbWV0YWRhdGEuZHVlRGF0ZSkgfHxcclxuXHRcdFx0KHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUgJiYgIW1ldGFkYXRhLnNjaGVkdWxlZERhdGUpO1xyXG5cclxuXHRcdHJldHVybiBoYXNUaW1lV2l0aG91dERhdGUgfHwgZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXNvbHZlIGRhdGVzIGZvciB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgdXNpbmcgY2FjaGVkIHJlc3VsdHMgd2hlbiBwb3NzaWJsZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcmVzb2x2ZVRpbWVPbmx5RGF0ZXMoXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0bWV0YWRhdGE6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGEsXHJcblx0XHRiYXRjaENvbnRleHQ6IEJhdGNoRGF0ZVJlc29sdXRpb25Db250ZXh0XHJcblx0KTogUHJvbWlzZTxBcnJheTx7IHR5cGU6IHN0cmluZzsgZGF0ZTogRGF0ZTsgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudDsgcmVzdWx0OiBEYXRlUmVzb2x1dGlvblJlc3VsdCB9Pj4ge1xyXG5cdFx0Y29uc3QgcmVzb2x2ZWREYXRlczogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IGRhdGU6IERhdGU7IHRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQ7IHJlc3VsdDogRGF0ZVJlc29sdXRpb25SZXN1bHQgfT4gPSBbXTtcclxuXHRcdFxyXG5cdFx0aWYgKCFtZXRhZGF0YS50aW1lQ29tcG9uZW50cykge1xyXG5cdFx0XHRyZXR1cm4gcmVzb2x2ZWREYXRlcztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaW5kIHBhcmVudCB0YXNrIGlmIGV4aXN0c1xyXG5cdFx0Y29uc3QgcGFyZW50VGFza0lkID0gYmF0Y2hDb250ZXh0LnBhcmVudENoaWxkTWFwLmdldCh0YXNrLmlkKTtcclxuXHRcdGNvbnN0IHBhcmVudFRhc2sgPSBwYXJlbnRUYXNrSWQgPyBcclxuXHRcdFx0YmF0Y2hDb250ZXh0LmFsbFRhc2tzLmZpbmQodCA9PiB0LmlkID09PSBwYXJlbnRUYXNrSWQpIDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIEdldCBjdXJyZW50IGxpbmUgY29udGVudFxyXG5cdFx0Y29uc3QgY3VycmVudExpbmUgPSB0YXNrLm9yaWdpbmFsTWFya2Rvd24gfHwgdGFzay5jb250ZW50O1xyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBjb250ZXh0XHJcblx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdGN1cnJlbnRMaW5lLFxyXG5cdFx0XHRmaWxlUGF0aDogYmF0Y2hDb250ZXh0LmZpbGVQYXRoLFxyXG5cdFx0XHRwYXJlbnRUYXNrLFxyXG5cdFx0XHRmaWxlTWV0YWRhdGFDYWNoZTogYmF0Y2hDb250ZXh0LmZpbGVNZXRhZGF0YUNhY2hlLFxyXG5cdFx0XHRsaW5lTnVtYmVyOiB0YXNrLmxpbmUsXHJcblx0XHRcdGFsbExpbmVzOiBiYXRjaENvbnRleHQuYWxsTGluZXMsXHJcblx0XHRcdGFsbFRhc2tzOiBiYXRjaENvbnRleHQuYWxsVGFza3MsIC8vIFByb3ZpZGUgYWxsIHRhc2tzIGZvciBoaWVyYXJjaGljYWwgaW5oZXJpdGFuY2VcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gUmVzb2x2ZSBkYXRlcyBmb3IgZWFjaCB0aW1lIGNvbXBvbmVudCB0aGF0IG5lZWRzIGl0XHJcblx0XHRjb25zdCB0aW1lQ29tcG9uZW50cyA9IG1ldGFkYXRhLnRpbWVDb21wb25lbnRzO1xyXG5cclxuXHRcdC8vIFN0YXJ0IHRpbWUgd2l0aG91dCBzdGFydCBkYXRlXHJcblx0XHRpZiAodGltZUNvbXBvbmVudHMuc3RhcnRUaW1lICYmICFtZXRhZGF0YS5zdGFydERhdGUpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZXNvbHZlV2l0aENhY2hlKHRhc2ssIHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSwgY29udGV4dCwgJ3N0YXJ0VGltZScpO1xyXG5cdFx0XHRpZiAocmVzdWx0KSB7XHJcblx0XHRcdFx0cmVzb2x2ZWREYXRlcy5wdXNoKHtcclxuXHRcdFx0XHRcdHR5cGU6ICdzdGFydERhdGUnLFxyXG5cdFx0XHRcdFx0ZGF0ZTogcmVzdWx0LnJlc29sdmVkRGF0ZSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSxcclxuXHRcdFx0XHRcdHJlc3VsdFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRHVlIHRpbWUgd2l0aG91dCBkdWUgZGF0ZVxyXG5cdFx0aWYgKHRpbWVDb21wb25lbnRzLmR1ZVRpbWUgJiYgIW1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZXNvbHZlV2l0aENhY2hlKHRhc2ssIHRpbWVDb21wb25lbnRzLmR1ZVRpbWUsIGNvbnRleHQsICdkdWVUaW1lJyk7XHJcblx0XHRcdGlmIChyZXN1bHQpIHtcclxuXHRcdFx0XHRyZXNvbHZlZERhdGVzLnB1c2goe1xyXG5cdFx0XHRcdFx0dHlwZTogJ2R1ZURhdGUnLFxyXG5cdFx0XHRcdFx0ZGF0ZTogcmVzdWx0LnJlc29sdmVkRGF0ZSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHRpbWVDb21wb25lbnRzLmR1ZVRpbWUsXHJcblx0XHRcdFx0XHRyZXN1bHRcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNjaGVkdWxlZCB0aW1lIHdpdGhvdXQgc2NoZWR1bGVkIGRhdGVcclxuXHRcdGlmICh0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lICYmICFtZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucmVzb2x2ZVdpdGhDYWNoZSh0YXNrLCB0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lLCBjb250ZXh0LCAnc2NoZWR1bGVkVGltZScpO1xyXG5cdFx0XHRpZiAocmVzdWx0KSB7XHJcblx0XHRcdFx0cmVzb2x2ZWREYXRlcy5wdXNoKHtcclxuXHRcdFx0XHRcdHR5cGU6ICdzY2hlZHVsZWREYXRlJyxcclxuXHRcdFx0XHRcdGRhdGU6IHJlc3VsdC5yZXNvbHZlZERhdGUsXHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiB0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lLFxyXG5cdFx0XHRcdFx0cmVzdWx0XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbmQgdGltZSB3aXRob3V0IGFueSBkYXRlIGNvbnRleHQgKHVzZSBzdGFydCBkYXRlIGlmIGF2YWlsYWJsZSwgb3IgcmVzb2x2ZSBuZXcgZGF0ZSlcclxuXHRcdGlmICh0aW1lQ29tcG9uZW50cy5lbmRUaW1lICYmICFtZXRhZGF0YS5zdGFydERhdGUgJiYgIW1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZXNvbHZlV2l0aENhY2hlKHRhc2ssIHRpbWVDb21wb25lbnRzLmVuZFRpbWUsIGNvbnRleHQsICdlbmRUaW1lJyk7XHJcblx0XHRcdGlmIChyZXN1bHQpIHtcclxuXHRcdFx0XHQvLyBGb3IgZW5kIHRpbWUsIHdlIHR5cGljYWxseSB3YW50IHRvIHVzZSB0aGUgc2FtZSBkYXRlIGFzIHN0YXJ0XHJcblx0XHRcdFx0Ly8gSWYgbm8gc3RhcnQgZGF0ZSBleGlzdHMsIHRyZWF0IGVuZCB0aW1lIGFzIGR1ZSBkYXRlXHJcblx0XHRcdFx0Y29uc3QgZGF0ZVR5cGUgPSB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUgPyAnc3RhcnREYXRlJyA6ICdkdWVEYXRlJztcclxuXHRcdFx0XHRyZXNvbHZlZERhdGVzLnB1c2goe1xyXG5cdFx0XHRcdFx0dHlwZTogZGF0ZVR5cGUsXHJcblx0XHRcdFx0XHRkYXRlOiByZXN1bHQucmVzb2x2ZWREYXRlLFxyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudDogdGltZUNvbXBvbmVudHMuZW5kVGltZSxcclxuXHRcdFx0XHRcdHJlc3VsdFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc29sdmVkRGF0ZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXNvbHZlIGRhdGUgd2l0aCBjYWNoaW5nIGZvciBwZXJmb3JtYW5jZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcmVzb2x2ZVdpdGhDYWNoZShcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHR0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50LFxyXG5cdFx0Y29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0LFxyXG5cdFx0dGltZVR5cGU6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8RGF0ZVJlc29sdXRpb25SZXN1bHQgfCBudWxsPiB7XHJcblx0XHQvLyBDcmVhdGUgY2FjaGUga2V5IGJhc2VkIG9uIGNvbnRleHRcclxuXHRcdGNvbnN0IGNvbnRleHRIYXNoID0gdGhpcy5jcmVhdGVDb250ZXh0SGFzaCh0YXNrLCB0aW1lQ29tcG9uZW50LCBjb250ZXh0LCB0aW1lVHlwZSk7XHJcblx0XHRjb25zdCBjYWNoZUtleSA9IGAke3Rhc2suZmlsZVBhdGh9OiR7dGFzay5saW5lfToke3RpbWVUeXBlfToke2NvbnRleHRIYXNofWA7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgY2FjaGUgZmlyc3RcclxuXHRcdGNvbnN0IGNhY2hlZCA9IHRoaXMucmVzb2x1dGlvbkNhY2hlLmdldChjYWNoZUtleSk7XHJcblx0XHRpZiAoY2FjaGVkICYmIHRoaXMuaXNDYWNoZVZhbGlkKGNhY2hlZCkpIHtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZC5yZXN1bHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gUmVzb2x2ZSBkYXRlIHVzaW5nIERhdGVJbmhlcml0YW5jZVNlcnZpY2VcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYXRlSW5oZXJpdGFuY2VTZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkoXHJcblx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdGNvbnRleHRcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIENhY2hlIHRoZSByZXN1bHRcclxuXHRcdFx0dGhpcy5jYWNoZVJlc29sdXRpb24oY2FjaGVLZXksIHJlc3VsdCwgY29udGV4dEhhc2gpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoYFtEYXRlSW5oZXJpdGFuY2VBdWdtZW50b3JdIEZhaWxlZCB0byByZXNvbHZlIGRhdGUgZm9yIHRhc2sgJHt0YXNrLmlkfTpgLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgaGFzaCBvZiB0aGUgcmVzb2x1dGlvbiBjb250ZXh0IGZvciBjYWNoaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVDb250ZXh0SGFzaChcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHR0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50LFxyXG5cdFx0Y29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0LFxyXG5cdFx0dGltZVR5cGU6IHN0cmluZ1xyXG5cdCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBjb250ZXh0RGF0YSA9IHtcclxuXHRcdFx0Y3VycmVudExpbmU6IGNvbnRleHQuY3VycmVudExpbmUsXHJcblx0XHRcdGZpbGVQYXRoOiBjb250ZXh0LmZpbGVQYXRoLFxyXG5cdFx0XHRwYXJlbnRUYXNrSWQ6IGNvbnRleHQucGFyZW50VGFzaz8uaWQsXHJcblx0XHRcdHRpbWVDb21wb25lbnRUZXh0OiB0aW1lQ29tcG9uZW50Lm9yaWdpbmFsVGV4dCxcclxuXHRcdFx0dGltZVR5cGUsXHJcblx0XHRcdGxpbmVOdW1iZXI6IGNvbnRleHQubGluZU51bWJlcixcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU2ltcGxlIGhhc2ggZnVuY3Rpb24gZm9yIGNvbnRleHRcclxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShjb250ZXh0RGF0YSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBjYWNoZWQgcmVzb2x1dGlvbiBpcyBzdGlsbCB2YWxpZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNDYWNoZVZhbGlkKGNhY2hlZDogQ2FjaGVkRGF0ZVJlc29sdXRpb24pOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRjb25zdCBhZ2UgPSBub3cgLSBjYWNoZWQudGltZXN0YW1wO1xyXG5cdFx0cmV0dXJuIGFnZSA8IHRoaXMuQ0FDSEVfVFRMO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FjaGUgYSBkYXRlIHJlc29sdXRpb24gcmVzdWx0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjYWNoZVJlc29sdXRpb24oXHJcblx0XHRrZXk6IHN0cmluZyxcclxuXHRcdHJlc3VsdDogRGF0ZVJlc29sdXRpb25SZXN1bHQsXHJcblx0XHRjb250ZXh0SGFzaDogc3RyaW5nXHJcblx0KTogdm9pZCB7XHJcblx0XHQvLyBJbXBsZW1lbnQgTFJVIGV2aWN0aW9uXHJcblx0XHRpZiAodGhpcy5yZXNvbHV0aW9uQ2FjaGUuc2l6ZSA+PSB0aGlzLk1BWF9DQUNIRV9TSVpFKSB7XHJcblx0XHRcdC8vIFJlbW92ZSBvbGRlc3QgZW50cnlcclxuXHRcdFx0Y29uc3QgZmlyc3RLZXkgPSB0aGlzLnJlc29sdXRpb25DYWNoZS5rZXlzKCkubmV4dCgpLnZhbHVlO1xyXG5cdFx0XHRpZiAoZmlyc3RLZXkpIHtcclxuXHRcdFx0XHR0aGlzLnJlc29sdXRpb25DYWNoZS5kZWxldGUoZmlyc3RLZXkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5yZXNvbHV0aW9uQ2FjaGUuc2V0KGtleSwge1xyXG5cdFx0XHRyZXN1bHQsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0Y29udGV4dEhhc2gsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0YXNrIHdpdGggcmVzb2x2ZWQgZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tXaXRoUmVzb2x2ZWREYXRlcyhcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHRyZXNvbHZlZERhdGVzOiBBcnJheTx7IHR5cGU6IHN0cmluZzsgZGF0ZTogRGF0ZTsgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudDsgcmVzdWx0OiBEYXRlUmVzb2x1dGlvblJlc3VsdCB9PlxyXG5cdCk6IFRhc2sge1xyXG5cdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7IC4uLnRhc2sgfTtcclxuXHRcdGNvbnN0IHVwZGF0ZWRNZXRhZGF0YSA9IHsgLi4udGFzay5tZXRhZGF0YSB9IGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGRhdGUgZmllbGRzIHdpdGggcmVzb2x2ZWQgZGF0ZXNcclxuXHRcdGZvciAoY29uc3QgeyB0eXBlLCBkYXRlLCB0aW1lQ29tcG9uZW50LCByZXN1bHQgfSBvZiByZXNvbHZlZERhdGVzKSB7XHJcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IGRhdGUuZ2V0VGltZSgpO1xyXG5cclxuXHRcdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdFx0Y2FzZSAnc3RhcnREYXRlJzpcclxuXHRcdFx0XHRcdHVwZGF0ZWRNZXRhZGF0YS5zdGFydERhdGUgPSB0aW1lc3RhbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdkdWVEYXRlJzpcclxuXHRcdFx0XHRcdHVwZGF0ZWRNZXRhZGF0YS5kdWVEYXRlID0gdGltZXN0YW1wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc2NoZWR1bGVkRGF0ZSc6XHJcblx0XHRcdFx0XHR1cGRhdGVkTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IHRpbWVzdGFtcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgZW5oYW5jZWQgZGF0ZXRpbWUgb2JqZWN0c1xyXG5cdFx0XHRpZiAoIXVwZGF0ZWRNZXRhZGF0YS5lbmhhbmNlZERhdGVzKSB7XHJcblx0XHRcdFx0dXBkYXRlZE1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMgPSB7fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29tYmluZWREYXRlVGltZSA9IG5ldyBEYXRlKFxyXG5cdFx0XHRcdGRhdGUuZ2V0RnVsbFllYXIoKSxcclxuXHRcdFx0XHRkYXRlLmdldE1vbnRoKCksXHJcblx0XHRcdFx0ZGF0ZS5nZXREYXRlKCksXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudC5ob3VyLFxyXG5cdFx0XHRcdHRpbWVDb21wb25lbnQubWludXRlLFxyXG5cdFx0XHRcdHRpbWVDb21wb25lbnQuc2Vjb25kIHx8IDBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgJ3N0YXJ0RGF0ZSc6XHJcblx0XHRcdFx0XHR1cGRhdGVkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5zdGFydERhdGVUaW1lID0gY29tYmluZWREYXRlVGltZTtcclxuXHRcdFx0XHRcdGlmICh0aW1lQ29tcG9uZW50LnJhbmdlUGFydG5lcikge1xyXG5cdFx0XHRcdFx0XHQvLyBBbHNvIGNyZWF0ZSBlbmQgZGF0ZXRpbWUgZm9yIHRpbWUgcmFuZ2VzXHJcblx0XHRcdFx0XHRcdGNvbnN0IGVuZERhdGVUaW1lID0gbmV3IERhdGUoXHJcblx0XHRcdFx0XHRcdFx0ZGF0ZS5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGUuZ2V0TW9udGgoKSxcclxuXHRcdFx0XHRcdFx0XHRkYXRlLmdldERhdGUoKSxcclxuXHRcdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50LnJhbmdlUGFydG5lci5ob3VyLFxyXG5cdFx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQucmFuZ2VQYXJ0bmVyLm1pbnV0ZSxcclxuXHRcdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50LnJhbmdlUGFydG5lci5zZWNvbmQgfHwgMFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR1cGRhdGVkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5lbmREYXRlVGltZSA9IGVuZERhdGVUaW1lO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnZHVlRGF0ZSc6XHJcblx0XHRcdFx0XHR1cGRhdGVkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5kdWVEYXRlVGltZSA9IGNvbWJpbmVkRGF0ZVRpbWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzY2hlZHVsZWREYXRlJzpcclxuXHRcdFx0XHRcdHVwZGF0ZWRNZXRhZGF0YS5lbmhhbmNlZERhdGVzLnNjaGVkdWxlZERhdGVUaW1lID0gY29tYmluZWREYXRlVGltZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBMb2cgc3VjY2Vzc2Z1bCByZXNvbHV0aW9uIGZvciBkZWJ1Z2dpbmdcclxuXHRcdFx0Y29uc29sZS5sb2coYFtEYXRlSW5oZXJpdGFuY2VBdWdtZW50b3JdIFJlc29sdmVkICR7dHlwZX0gZm9yIHRhc2sgJHt0YXNrLmlkfTogJHtkYXRlLnRvSVNPU3RyaW5nKCl9ICgke3Jlc3VsdC5zb3VyY2V9LCBjb25maWRlbmNlOiAke3Jlc3VsdC5jb25maWRlbmNlfSlgKTtcclxuXHRcdH1cclxuXHJcblx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHVwZGF0ZWRNZXRhZGF0YTtcclxuXHRcdHJldHVybiB1cGRhdGVkVGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHRoZSByZXNvbHV0aW9uIGNhY2hlXHJcblx0ICovXHJcblx0Y2xlYXJDYWNoZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVzb2x1dGlvbkNhY2hlLmNsZWFyKCk7XHJcblx0XHR0aGlzLmRhdGVJbmhlcml0YW5jZVNlcnZpY2UuY2xlYXJDYWNoZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlIHN0YXRpc3RpY3MgZm9yIG1vbml0b3JpbmdcclxuXHQgKi9cclxuXHRnZXRDYWNoZVN0YXRzKCk6IHtcclxuXHRcdHJlc29sdXRpb25DYWNoZTogeyBzaXplOiBudW1iZXI7IG1heFNpemU6IG51bWJlciB9O1xyXG5cdFx0ZGF0ZUluaGVyaXRhbmNlQ2FjaGU6IHsgc2l6ZTogbnVtYmVyOyBtYXhTaXplOiBudW1iZXIgfTtcclxuXHR9IHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc29sdXRpb25DYWNoZToge1xyXG5cdFx0XHRcdHNpemU6IHRoaXMucmVzb2x1dGlvbkNhY2hlLnNpemUsXHJcblx0XHRcdFx0bWF4U2l6ZTogdGhpcy5NQVhfQ0FDSEVfU0laRSxcclxuXHRcdFx0fSxcclxuXHRcdFx0ZGF0ZUluaGVyaXRhbmNlQ2FjaGU6IHRoaXMuZGF0ZUluaGVyaXRhbmNlU2VydmljZS5nZXRDYWNoZVN0YXRzKCksXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHNldHRpbmdzIGFuZCBjbGVhciByZWxldmFudCBjYWNoZXNcclxuXHQgKi9cclxuXHRvblNldHRpbmdzQ2hhbmdlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jbGVhckNhY2hlKCk7XHJcblx0fVxyXG59Il19