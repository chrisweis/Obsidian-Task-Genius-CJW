import { __awaiter } from "tslib";
import { DateInheritanceAugmentor } from "./DateInheritanceAugmentor";
/**
 * TaskAugmentor - Complete inheritance and augmentation implementation
 *
 * Implements the full inheritance strategy as specified in the refactor plan:
 * - Scalar fields: task explicit > file > project > default
 * - Arrays: merge and deduplicate (preserving stable order)
 * - Status/completion: only from task level
 * - Recurrence: task explicit priority
 * - Subtask inheritance: per-key control based on configuration
 */
export class Augmentor {
    constructor(options) {
        // Respect plugin setting: file frontmatter inheritance toggle
        this.fileFrontmatterInheritanceEnabled = true;
        // Default strategy based on refactor plan requirements
        this.strategy = Object.assign({ scalarPriority: ["task", "file", "project", "default"], arrayMergeStrategy: "task-first", statusCompletionSource: "task-only", recurrenceSource: "task-explicit", subtaskInheritance: {
                // Default: most fields inherit, sensitive fields don't
                tags: true,
                project: true,
                priority: true,
                dueDate: false,
                startDate: false,
                scheduledDate: false,
                completed: false,
                status: false,
                recurrence: false,
                onCompletion: false,
            } }, options === null || options === void 0 ? void 0 : options.strategy);
        // Initialize date inheritance augmentor if Obsidian context is available
        if ((options === null || options === void 0 ? void 0 : options.app) && (options === null || options === void 0 ? void 0 : options.vault) && (options === null || options === void 0 ? void 0 : options.metadataCache)) {
            this.dateInheritanceAugmentor = new DateInheritanceAugmentor(options.app, options.vault, options.metadataCache);
        }
    }
    /**
     * Update settings from plugin to control inheritance behavior
     */
    updateSettings(settings) {
        const f = settings.fileMetadataInheritance;
        if (f) {
            this.fileFrontmatterInheritanceEnabled = !!(f.enabled && f.inheritFromFrontmatter);
        }
        if (settings.projectConfig) {
            this.projectConfig = settings.projectConfig;
        }
    }
    /**
     * Main merge method with enhanced context support
     */
    merge(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            // First apply standard augmentation
            let augmentedTasks = ctx.tasks.map((task) => this.augmentTask(task, ctx));
            // Then apply date inheritance for time-only expressions if available
            if (this.dateInheritanceAugmentor) {
                try {
                    augmentedTasks =
                        yield this.dateInheritanceAugmentor.augmentTasksWithDateInheritance(augmentedTasks, ctx.filePath);
                }
                catch (error) {
                    console.warn("[Augmentor] Date inheritance augmentation failed:", error);
                    // Continue with standard augmentation if date inheritance fails
                }
            }
            return augmentedTasks;
        });
    }
    /**
     * Legacy merge method for backward compatibility
     */
    mergeCompat(ctx, tasks) {
        var _a, _b;
        const augmentCtx = {
            filePath: ctx.filePath,
            fileMeta: ctx.fileMeta,
            projectName: (_a = ctx.project) === null || _a === void 0 ? void 0 : _a.name,
            projectMeta: (_b = ctx.project) === null || _b === void 0 ? void 0 : _b.data,
            tasks,
        };
        return tasks.map((task) => this.augmentTask(task, augmentCtx));
    }
    /**
     * Augment a single task with file and project metadata
     */
    augmentTask(task, ctx) {
        const originalMetadata = task.metadata || {};
        const enhancedMetadata = Object.assign({}, originalMetadata);
        // Special handling for priority: check both task.priority and metadata.priority
        // Priority might be at task root level (from parser) or in metadata
        // IMPORTANT: Once priority is set, it should NOT be overridden by inheritance
        // Debug logging for priority processing
        // First, ensure we have the priority from task-level if it exists
        if ((enhancedMetadata.priority === undefined ||
            enhancedMetadata.priority === null) &&
            task.priority !== undefined &&
            task.priority !== null) {
            enhancedMetadata.priority = task.priority;
        }
        // Ensure priority is properly converted to numeric format if it exists
        // Clean up null values to undefined for consistency
        if (enhancedMetadata.priority === null) {
            enhancedMetadata.priority = undefined;
        }
        else if (enhancedMetadata.priority !== undefined) {
            const originalPriority = enhancedMetadata.priority;
            enhancedMetadata.priority = this.convertPriorityValue(enhancedMetadata.priority);
        }
        // Apply inheritance for each metadata field
        this.applyScalarInheritance(enhancedMetadata, ctx);
        this.applyArrayInheritance(enhancedMetadata, ctx);
        this.applySpecialFieldRules(enhancedMetadata, ctx);
        this.applyProjectReference(enhancedMetadata, ctx);
        // Handle subtask inheritance if this is a parent task
        if (originalMetadata.children &&
            Array.isArray(originalMetadata.children)) {
            this.applySubtaskInheritance(task, enhancedMetadata, ctx);
        }
        return Object.assign(Object.assign({}, task), { metadata: enhancedMetadata });
    }
    /**
     * Apply scalar field inheritance: task > file > project > default
     */
    applyScalarInheritance(metadata, ctx) {
        var _a, _b, _c, _d;
        const scalarFields = [
            "priority",
            "context",
            "area",
            "estimatedTime",
            "actualTime",
            "useAsDateType",
            "heading",
        ];
        for (const field of scalarFields) {
            // Skip if task already has explicit value
            if (metadata[field] !== undefined && metadata[field] !== null) {
                continue;
            }
            // Special handling for priority - NEVER apply default value
            // Priority should only come from task itself, file, or project
            if (field === "priority") {
                // Only check file and project sources, skip default
                for (const source of ["file", "project"]) {
                    let value;
                    if (source === "file") {
                        value = (_a = ctx.fileMeta) === null || _a === void 0 ? void 0 : _a[field];
                    }
                    else if (source === "project") {
                        value = (_b = ctx.projectMeta) === null || _b === void 0 ? void 0 : _b[field];
                    }
                    if (value !== undefined && value !== null) {
                        // Convert priority value to numeric format
                        metadata[field] = this.convertPriorityValue(value);
                        break;
                    }
                }
                // If no priority found, leave it undefined (don't set default)
                continue;
            }
            // Apply inheritance priority for other fields: file > project > default
            for (const source of this.strategy.scalarPriority.slice(1)) {
                // Skip 'task' since we checked above
                let value;
                switch (source) {
                    case "file":
                        if (!this.fileFrontmatterInheritanceEnabled) {
                            continue; // Skip applying file-level values when inheritance is disabled
                        }
                        value = (_c = ctx.fileMeta) === null || _c === void 0 ? void 0 : _c[field];
                        break;
                    case "project":
                        value = (_d = ctx.projectMeta) === null || _d === void 0 ? void 0 : _d[field];
                        break;
                    case "default":
                        value = this.getDefaultValue(field);
                        break;
                }
                if (value !== undefined && value !== null) {
                    metadata[field] = value;
                    break;
                }
            }
        }
    }
    /**
     * Apply array field inheritance with merge and deduplication
     */
    applyArrayInheritance(metadata, ctx) {
        const arrayFields = ["tags", "dependsOn"];
        for (const field of arrayFields) {
            const taskArray = Array.isArray(metadata[field])
                ? metadata[field]
                : [];
            const fileArrayRaw = ctx.fileMeta && Array.isArray(ctx.fileMeta[field])
                ? ctx.fileMeta[field]
                : [];
            const fileArray = this.fileFrontmatterInheritanceEnabled
                ? fileArrayRaw
                : [];
            const projectArray = ctx.projectMeta &&
                Array.isArray(ctx.projectMeta[field])
                ? ctx.projectMeta[field]
                : [];
            // Normalize tags consistently (ensure leading #) before merging/dedup
            const normalizeIfTags = (arr) => {
                if (field !== "tags")
                    return arr;
                return arr
                    .filter((t) => typeof t === "string" && t.trim().length > 0)
                    .map((t) => this.normalizeTag(t));
            };
            // If user disabled file frontmatter inheritance, do not inherit tags from file or project
            if (field === "tags" && !this.fileFrontmatterInheritanceEnabled) {
                metadata[field] = normalizeIfTags(taskArray);
                continue;
            }
            const taskArrNorm = normalizeIfTags(taskArray);
            const fileArrNorm = normalizeIfTags(fileArray);
            const projectArrNorm = normalizeIfTags(projectArray);
            let mergedArray;
            // Merge based on strategy
            switch (this.strategy.arrayMergeStrategy) {
                case "task-first":
                    mergedArray = [
                        ...taskArrNorm,
                        ...fileArrNorm,
                        ...projectArrNorm,
                    ];
                    break;
                case "file-first":
                    mergedArray = [
                        ...fileArrNorm,
                        ...taskArrNorm,
                        ...projectArrNorm,
                    ];
                    break;
                case "project-first":
                    mergedArray = [
                        ...projectArrNorm,
                        ...taskArrNorm,
                        ...fileArrNorm,
                    ];
                    break;
                default:
                    mergedArray = [
                        ...taskArrNorm,
                        ...fileArrNorm,
                        ...projectArrNorm,
                    ];
            }
            // Deduplicate while preserving order
            const deduped = Array.from(new Set(mergedArray));
            metadata[field] = deduped;
        }
    }
    // Normalize a tag to include leading # and trim whitespace
    normalizeTag(tag) {
        if (typeof tag !== "string")
            return tag;
        const trimmed = tag.trim();
        if (!trimmed)
            return trimmed;
        return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    /**
     * Apply special field rules for status/completion and recurrence
     */
    applySpecialFieldRules(metadata, ctx) {
        var _a, _b;
        // Status and completion: only from task level (never inherit)
        if (this.strategy.statusCompletionSource === "task-only") {
            // These fields should only come from the task itself, never inherit
            // (No action needed as we don't override existing task values)
        }
        // Recurrence: task explicit priority
        if (this.strategy.recurrenceSource === "task-explicit") {
            // Only use recurrence if explicitly set on task
            if (!metadata.recurrence) {
                // Don't inherit recurrence from file or project
                delete metadata.recurrence;
            }
        }
        // Date fields: inherit only if not already set
        const dateFields = [
            "dueDate",
            "startDate",
            "scheduledDate",
            "createdDate",
        ];
        for (const field of dateFields) {
            if (metadata[field] === undefined || metadata[field] === null) {
                // Try file first, then project
                const fileValue = (_a = ctx.fileMeta) === null || _a === void 0 ? void 0 : _a[field];
                const projectValue = (_b = ctx.projectMeta) === null || _b === void 0 ? void 0 : _b[field];
                if (fileValue !== undefined && fileValue !== null) {
                    metadata[field] = fileValue;
                }
                else if (projectValue !== undefined &&
                    projectValue !== null) {
                    metadata[field] = projectValue;
                }
            }
        }
    }
    /**
     * Apply TgProject reference
     */
    applyProjectReference(metadata, ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        // Derive project name from multiple sources with priority:
        // 1) ctx.projectName (resolver-provided tgProject name)
        // 2) ctx.projectMeta.project
        // 3) ctx.fileMeta.project (frontmatter) - new fallback to avoid losing projects
        const projectFromMeta = typeof ((_a = ctx.projectMeta) === null || _a === void 0 ? void 0 : _a.project) === "string" &&
            ctx.projectMeta.project.trim()
            ? ctx.projectMeta.project.trim()
            : undefined;
        const projectFromFrontmatter = typeof ((_b = ctx.fileMeta) === null || _b === void 0 ? void 0 : _b.project) === "string" &&
            ctx.fileMeta.project.trim()
            ? ctx.fileMeta.project.trim()
            : undefined;
        // Also consider configured metadataKey in frontmatter (e.g., projectName)
        const metadataKeyFromConfig = (_d = (_c = this.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) === null || _d === void 0 ? void 0 : _d.metadataKey;
        const projectFromMetadataKey = metadataKeyFromConfig &&
            typeof ((_e = ctx.fileMeta) === null || _e === void 0 ? void 0 : _e[metadataKeyFromConfig]) === "string" &&
            String((_f = ctx.fileMeta) === null || _f === void 0 ? void 0 : _f[metadataKeyFromConfig]).trim().length > 0
            ? String((_g = ctx.fileMeta) === null || _g === void 0 ? void 0 : _g[metadataKeyFromConfig]).trim()
            : undefined;
        const effectiveProjectName = ctx.projectName ||
            projectFromMeta ||
            projectFromMetadataKey ||
            projectFromFrontmatter;
        // Set project name if not already set
        if (!metadata.project && effectiveProjectName) {
            metadata.project = effectiveProjectName;
        }
        // If tgProject missing but metadataKey-derived value exists, synthesize tgProject now
        if (!metadata.tgProject && projectFromMetadataKey) {
            metadata.tgProject = {
                type: "metadata",
                name: projectFromMetadataKey,
                source: metadataKeyFromConfig || "metadata",
                readonly: true,
            };
        }
        // Set TgProject if project metadata is available
        // Prefer resolver-provided tgProject; otherwise synthesize from available context
        if (ctx.projectMeta) {
            // Only set from ctx.projectMeta when task doesn't already have a tgProject
            if (ctx.projectMeta.tgProject && !metadata.tgProject) {
                metadata.tgProject = ctx.projectMeta.tgProject;
            }
            else if (effectiveProjectName && !metadata.tgProject) {
                // Infer type/source when resolver didn't provide tgProject
                const inferredType = ctx.projectMeta
                    .configSource
                    ? "config"
                    : "metadata";
                metadata.tgProject = {
                    type: inferredType,
                    name: effectiveProjectName,
                    source: ctx.projectMeta.source ||
                        ctx.projectMeta.configSource ||
                        "unknown",
                    readonly: ctx.projectMeta.readonly || true,
                };
            }
        }
        // 2) If neither project nor tgProject are set, but we do have frontmatter project
        //    then set both from frontmatter to restore project recognition/counting
        if (!metadata.project &&
            !metadata.tgProject &&
            projectFromFrontmatter) {
            metadata.project = projectFromFrontmatter;
            metadata.tgProject = {
                type: "metadata",
                name: projectFromFrontmatter,
                source: "frontmatter",
                readonly: true,
            };
        }
    }
    /**
     * Apply subtask inheritance based on per-key control
     */
    applySubtaskInheritance(parentTask, parentMetadata, ctx) {
        // This would typically involve finding child tasks and applying inheritance
        // For now, we'll store the inheritance rules on the parent for child processing
        parentMetadata._subtaskInheritanceRules =
            this.strategy.subtaskInheritance;
    }
    /**
     * Convert priority value to consistent numeric format
     */
    convertPriorityValue(value) {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        // If it's already a number, return it
        if (typeof value === "number") {
            return value;
        }
        // If it's a string, try to convert
        const strValue = String(value);
        // Priority mapping for text and emoji values
        const priorityMap = {
            // Text priorities
            highest: 5,
            high: 4,
            medium: 3,
            low: 2,
            lowest: 1,
            urgent: 5,
            critical: 5,
            important: 4,
            normal: 3,
            moderate: 3,
            minor: 2,
            trivial: 1,
            // Emoji priorities (Tasks plugin compatible)
            "🔺": 5,
            "⏫": 4,
            "🔼": 3,
            "🔽": 2,
            "⏬️": 1,
            "⏬": 1,
        };
        // Try numeric conversion first
        const numericValue = parseInt(strValue, 10);
        if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
            return numericValue;
        }
        // Try priority mapping (including emojis)
        const mappedPriority = priorityMap[strValue.toLowerCase()] || priorityMap[strValue];
        if (mappedPriority !== undefined) {
            return mappedPriority;
        }
        // If we can't convert, return undefined to avoid setting invalid values
        return undefined;
    }
    /**
     * Get default value for a field
     */
    getDefaultValue(field) {
        const defaults = {
            // Don't set default priority for now - it should come from parser
            // If we need to add it back, we should check if task already has priority elsewhere
            tags: [],
            dependsOn: [],
            estimatedTime: undefined,
            actualTime: undefined,
            useAsDateType: "due",
        };
        return defaults[field];
    }
    /**
     * Update inheritance strategy
     */
    updateStrategy(strategy) {
        this.strategy = Object.assign(Object.assign({}, this.strategy), strategy);
    }
    /**
     * Get current inheritance strategy
     */
    getStrategy() {
        return Object.assign({}, this.strategy);
    }
    /**
     * Process inheritance for a specific field type
     */
    processFieldInheritance(field, taskValue, fileValue, projectValue) {
        // Handle arrays specially
        if (Array.isArray(taskValue) ||
            Array.isArray(fileValue) ||
            Array.isArray(projectValue)) {
            const taskArray = Array.isArray(taskValue) ? taskValue : [];
            const fileArray = Array.isArray(fileValue) ? fileValue : [];
            const projectArray = Array.isArray(projectValue)
                ? projectValue
                : [];
            let merged;
            switch (this.strategy.arrayMergeStrategy) {
                case "task-first":
                    merged = [...taskArray, ...fileArray, ...projectArray];
                    break;
                case "file-first":
                    merged = [...fileArray, ...taskArray, ...projectArray];
                    break;
                case "project-first":
                    merged = [...projectArray, ...taskArray, ...fileArray];
                    break;
                default:
                    merged = [...taskArray, ...fileArray, ...projectArray];
            }
            return Array.from(new Set(merged));
        }
        // Handle scalars with priority order
        for (const source of this.strategy.scalarPriority) {
            let value;
            switch (source) {
                case "task":
                    value = taskValue;
                    break;
                case "file":
                    value = fileValue;
                    break;
                case "project":
                    value = projectValue;
                    break;
                case "default":
                    value = this.getDefaultValue(field);
                    break;
            }
            if (value !== undefined && value !== null) {
                return value;
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXVnbWVudG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXVnbWVudG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQThCdEU7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFPckIsWUFBWSxPQU1YO1FBVEQsOERBQThEO1FBQ3RELHNDQUFpQyxHQUFZLElBQUksQ0FBQztRQVN6RCx1REFBdUQ7UUFDdkQsSUFBSSxDQUFDLFFBQVEsbUJBQ1osY0FBYyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQ3RELGtCQUFrQixFQUFFLFlBQVksRUFDaEMsc0JBQXNCLEVBQUUsV0FBVyxFQUNuQyxnQkFBZ0IsRUFBRSxlQUFlLEVBQ2pDLGtCQUFrQixFQUFFO2dCQUNuQix1REFBdUQ7Z0JBQ3ZELElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFFBQVEsRUFBRSxJQUFJO2dCQUNkLE9BQU8sRUFBRSxLQUFLO2dCQUNkLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixhQUFhLEVBQUUsS0FBSztnQkFDcEIsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxLQUFLO2dCQUNiLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixZQUFZLEVBQUUsS0FBSzthQUNuQixJQUNFLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxRQUFRLENBQ3BCLENBQUM7UUFFRix5RUFBeUU7UUFDekUsSUFBSSxDQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxHQUFHLE1BQUksT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLEtBQUssQ0FBQSxLQUFJLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhLENBQUEsRUFBRTtZQUM3RCxJQUFJLENBQUMsd0JBQXdCLEdBQUcs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QUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFO1lBQ2xELElBQUksS0FBVSxDQUFDO1lBQ2YsUUFBUSxNQUFNLEVBQUU7Z0JBQ2YsS0FBSyxNQUFNO29CQUNWLEtBQUssR0FBRyxTQUFTLENBQUM7b0JBQ2xCLE1BQU07Z0JBQ1AsS0FBSyxNQUFNO29CQUNWLEtBQUssR0FBRyxTQUFTLENBQUM7b0JBQ2xCLE1BQU07Z0JBQ1AsS0FBSyxTQUFTO29CQUNiLEtBQUssR0FBRyxZQUFZLENBQUM7b0JBQ3JCLE1BQU07Z0JBQ1AsS0FBSyxTQUFTO29CQUNiLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNwQyxNQUFNO2FBQ1A7WUFFRCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtnQkFDMUMsT0FBTyxLQUFLLENBQUM7YUFDYjtTQUNEO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBUYXNrLCBUZ1Byb2plY3QgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IERhdGVJbmhlcml0YW5jZUF1Z21lbnRvciB9IGZyb20gXCIuL0RhdGVJbmhlcml0YW5jZUF1Z21lbnRvclwiO1xyXG5pbXBvcnQgeyBBcHAsIFZhdWx0LCBNZXRhZGF0YUNhY2hlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFByb2plY3RDb25maWd1cmF0aW9uIH0gZnJvbSBcIi4uLy4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXVnbWVudENvbnRleHQge1xyXG5cdGZpbGVQYXRoOiBzdHJpbmc7XHJcblx0ZmlsZU1ldGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdHByb2plY3ROYW1lPzogc3RyaW5nO1xyXG5cdHByb2plY3RNZXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHR0YXNrczogVGFza1tdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVDb250ZXh0IHtcclxuXHRmaWxlUGF0aDogc3RyaW5nO1xyXG5cdGZpbGVNZXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHRwcm9qZWN0PzogeyBuYW1lPzogc3RyaW5nOyBkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PiB9IHwgbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmhlcml0YW5jZVN0cmF0ZWd5IHtcclxuXHQvLyBQcmlvcml0eSBvcmRlcjogdGFzayA+IGZpbGUgPiBwcm9qZWN0ID4gZGVmYXVsdFxyXG5cdHNjYWxhclByaW9yaXR5OiAoXCJ0YXNrXCIgfCBcImZpbGVcIiB8IFwicHJvamVjdFwiIHwgXCJkZWZhdWx0XCIpW107XHJcblx0Ly8gRm9yIGFycmF5czogbWVyZ2UgYW5kIGRlZHVwbGljYXRlIHdpdGggc3RhYmxlIG9yZGVyaW5nXHJcblx0YXJyYXlNZXJnZVN0cmF0ZWd5OiBcInRhc2stZmlyc3RcIiB8IFwiZmlsZS1maXJzdFwiIHwgXCJwcm9qZWN0LWZpcnN0XCI7XHJcblx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3Igc3BlY2lmaWMgZmllbGRzXHJcblx0c3RhdHVzQ29tcGxldGlvblNvdXJjZTogXCJ0YXNrLW9ubHlcIiB8IFwiYWxsb3ctaW5oZXJpdGFuY2VcIjtcclxuXHRyZWN1cnJlbmNlU291cmNlOiBcInRhc2stZXhwbGljaXRcIiB8IFwiYWxsb3ctaW5oZXJpdGFuY2VcIjtcclxuXHQvLyBQZXIta2V5IGluaGVyaXRhbmNlIGNvbnRyb2wgZm9yIHN1YnRhc2tzXHJcblx0c3VidGFza0luaGVyaXRhbmNlOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRhc2tBdWdtZW50b3IgLSBDb21wbGV0ZSBpbmhlcml0YW5jZSBhbmQgYXVnbWVudGF0aW9uIGltcGxlbWVudGF0aW9uXHJcbiAqXHJcbiAqIEltcGxlbWVudHMgdGhlIGZ1bGwgaW5oZXJpdGFuY2Ugc3RyYXRlZ3kgYXMgc3BlY2lmaWVkIGluIHRoZSByZWZhY3RvciBwbGFuOlxyXG4gKiAtIFNjYWxhciBmaWVsZHM6IHRhc2sgZXhwbGljaXQgPiBmaWxlID4gcHJvamVjdCA+IGRlZmF1bHRcclxuICogLSBBcnJheXM6IG1lcmdlIGFuZCBkZWR1cGxpY2F0ZSAocHJlc2VydmluZyBzdGFibGUgb3JkZXIpXHJcbiAqIC0gU3RhdHVzL2NvbXBsZXRpb246IG9ubHkgZnJvbSB0YXNrIGxldmVsXHJcbiAqIC0gUmVjdXJyZW5jZTogdGFzayBleHBsaWNpdCBwcmlvcml0eVxyXG4gKiAtIFN1YnRhc2sgaW5oZXJpdGFuY2U6IHBlci1rZXkgY29udHJvbCBiYXNlZCBvbiBjb25maWd1cmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQXVnbWVudG9yIHtcclxuXHRwcml2YXRlIHN0cmF0ZWd5OiBJbmhlcml0YW5jZVN0cmF0ZWd5O1xyXG5cdHByaXZhdGUgZGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yPzogRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yO1xyXG5cdHByaXZhdGUgcHJvamVjdENvbmZpZz86IFByb2plY3RDb25maWd1cmF0aW9uO1xyXG5cdC8vIFJlc3BlY3QgcGx1Z2luIHNldHRpbmc6IGZpbGUgZnJvbnRtYXR0ZXIgaW5oZXJpdGFuY2UgdG9nZ2xlXHJcblx0cHJpdmF0ZSBmaWxlRnJvbnRtYXR0ZXJJbmhlcml0YW5jZUVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zPzoge1xyXG5cdFx0aW5oZXJpdD86IFJlY29yZDxzdHJpbmcsIFwidGFza1wiIHwgXCJmaWxlXCIgfCBcInByb2plY3RcIiB8IFwibWVyZ2UtYXJyYXlcIj47XHJcblx0XHRzdHJhdGVneT86IFBhcnRpYWw8SW5oZXJpdGFuY2VTdHJhdGVneT47XHJcblx0XHRhcHA/OiBBcHA7XHJcblx0XHR2YXVsdD86IFZhdWx0O1xyXG5cdFx0bWV0YWRhdGFDYWNoZT86IE1ldGFkYXRhQ2FjaGU7XHJcblx0fSkge1xyXG5cdFx0Ly8gRGVmYXVsdCBzdHJhdGVneSBiYXNlZCBvbiByZWZhY3RvciBwbGFuIHJlcXVpcmVtZW50c1xyXG5cdFx0dGhpcy5zdHJhdGVneSA9IHtcclxuXHRcdFx0c2NhbGFyUHJpb3JpdHk6IFtcInRhc2tcIiwgXCJmaWxlXCIsIFwicHJvamVjdFwiLCBcImRlZmF1bHRcIl0sXHJcblx0XHRcdGFycmF5TWVyZ2VTdHJhdGVneTogXCJ0YXNrLWZpcnN0XCIsXHJcblx0XHRcdHN0YXR1c0NvbXBsZXRpb25Tb3VyY2U6IFwidGFzay1vbmx5XCIsXHJcblx0XHRcdHJlY3VycmVuY2VTb3VyY2U6IFwidGFzay1leHBsaWNpdFwiLFxyXG5cdFx0XHRzdWJ0YXNrSW5oZXJpdGFuY2U6IHtcclxuXHRcdFx0XHQvLyBEZWZhdWx0OiBtb3N0IGZpZWxkcyBpbmhlcml0LCBzZW5zaXRpdmUgZmllbGRzIGRvbid0XHJcblx0XHRcdFx0dGFnczogdHJ1ZSxcclxuXHRcdFx0XHRwcm9qZWN0OiB0cnVlLFxyXG5cdFx0XHRcdHByaW9yaXR5OiB0cnVlLFxyXG5cdFx0XHRcdGR1ZURhdGU6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IGZhbHNlLFxyXG5cdFx0XHRcdHJlY3VycmVuY2U6IGZhbHNlLFxyXG5cdFx0XHRcdG9uQ29tcGxldGlvbjogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdC4uLm9wdGlvbnM/LnN0cmF0ZWd5LFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGRhdGUgaW5oZXJpdGFuY2UgYXVnbWVudG9yIGlmIE9ic2lkaWFuIGNvbnRleHQgaXMgYXZhaWxhYmxlXHJcblx0XHRpZiAob3B0aW9ucz8uYXBwICYmIG9wdGlvbnM/LnZhdWx0ICYmIG9wdGlvbnM/Lm1ldGFkYXRhQ2FjaGUpIHtcclxuXHRcdFx0dGhpcy5kYXRlSW5oZXJpdGFuY2VBdWdtZW50b3IgPSBuZXcgRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yKFxyXG5cdFx0XHRcdG9wdGlvbnMuYXBwLFxyXG5cdFx0XHRcdG9wdGlvbnMudmF1bHQsXHJcblx0XHRcdFx0b3B0aW9ucy5tZXRhZGF0YUNhY2hlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgc2V0dGluZ3MgZnJvbSBwbHVnaW4gdG8gY29udHJvbCBpbmhlcml0YW5jZSBiZWhhdmlvclxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVTZXR0aW5ncyhcclxuXHRcdHNldHRpbmdzOiBQYXJ0aWFsPHtcclxuXHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U/OiB7XHJcblx0XHRcdFx0ZW5hYmxlZD86IGJvb2xlYW47XHJcblx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcj86IGJvb2xlYW47XHJcblx0XHRcdH07XHJcblx0XHRcdHByb2plY3RDb25maWc/OiBQcm9qZWN0Q29uZmlndXJhdGlvbjtcclxuXHRcdH0+XHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBmID0gc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U7XHJcblx0XHRpZiAoZikge1xyXG5cdFx0XHR0aGlzLmZpbGVGcm9udG1hdHRlckluaGVyaXRhbmNlRW5hYmxlZCA9ICEhKFxyXG5cdFx0XHRcdGYuZW5hYmxlZCAmJiBmLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdGlmIChzZXR0aW5ncy5wcm9qZWN0Q29uZmlnKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZyA9IHNldHRpbmdzLnByb2plY3RDb25maWc7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYWluIG1lcmdlIG1ldGhvZCB3aXRoIGVuaGFuY2VkIGNvbnRleHQgc3VwcG9ydFxyXG5cdCAqL1xyXG5cdGFzeW5jIG1lcmdlKGN0eDogQXVnbWVudENvbnRleHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Ly8gRmlyc3QgYXBwbHkgc3RhbmRhcmQgYXVnbWVudGF0aW9uXHJcblx0XHRsZXQgYXVnbWVudGVkVGFza3MgPSBjdHgudGFza3MubWFwKCh0YXNrKSA9PlxyXG5cdFx0XHR0aGlzLmF1Z21lbnRUYXNrKHRhc2ssIGN0eClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVGhlbiBhcHBseSBkYXRlIGluaGVyaXRhbmNlIGZvciB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy5kYXRlSW5oZXJpdGFuY2VBdWdtZW50b3IpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRhdWdtZW50ZWRUYXNrcyA9XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmRhdGVJbmhlcml0YW5jZUF1Z21lbnRvci5hdWdtZW50VGFza3NXaXRoRGF0ZUluaGVyaXRhbmNlKFxyXG5cdFx0XHRcdFx0XHRhdWdtZW50ZWRUYXNrcyxcclxuXHRcdFx0XHRcdFx0Y3R4LmZpbGVQYXRoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiW0F1Z21lbnRvcl0gRGF0ZSBpbmhlcml0YW5jZSBhdWdtZW50YXRpb24gZmFpbGVkOlwiLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIENvbnRpbnVlIHdpdGggc3RhbmRhcmQgYXVnbWVudGF0aW9uIGlmIGRhdGUgaW5oZXJpdGFuY2UgZmFpbHNcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBhdWdtZW50ZWRUYXNrcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExlZ2FjeSBtZXJnZSBtZXRob2QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcclxuXHQgKi9cclxuXHRtZXJnZUNvbXBhdChjdHg6IEZpbGVDb250ZXh0LCB0YXNrczogVGFza1tdKTogVGFza1tdIHtcclxuXHRcdGNvbnN0IGF1Z21lbnRDdHg6IEF1Z21lbnRDb250ZXh0ID0ge1xyXG5cdFx0XHRmaWxlUGF0aDogY3R4LmZpbGVQYXRoLFxyXG5cdFx0XHRmaWxlTWV0YTogY3R4LmZpbGVNZXRhLFxyXG5cdFx0XHRwcm9qZWN0TmFtZTogY3R4LnByb2plY3Q/Lm5hbWUsXHJcblx0XHRcdHByb2plY3RNZXRhOiBjdHgucHJvamVjdD8uZGF0YSxcclxuXHRcdFx0dGFza3MsXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB0YXNrcy5tYXAoKHRhc2spID0+IHRoaXMuYXVnbWVudFRhc2sodGFzaywgYXVnbWVudEN0eCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXVnbWVudCBhIHNpbmdsZSB0YXNrIHdpdGggZmlsZSBhbmQgcHJvamVjdCBtZXRhZGF0YVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXVnbWVudFRhc2sodGFzazogVGFzaywgY3R4OiBBdWdtZW50Q29udGV4dCk6IFRhc2sge1xyXG5cdFx0Y29uc3Qgb3JpZ2luYWxNZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gey4uLm9yaWdpbmFsTWV0YWRhdGF9O1xyXG5cclxuXHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHByaW9yaXR5OiBjaGVjayBib3RoIHRhc2sucHJpb3JpdHkgYW5kIG1ldGFkYXRhLnByaW9yaXR5XHJcblx0XHQvLyBQcmlvcml0eSBtaWdodCBiZSBhdCB0YXNrIHJvb3QgbGV2ZWwgKGZyb20gcGFyc2VyKSBvciBpbiBtZXRhZGF0YVxyXG5cdFx0Ly8gSU1QT1JUQU5UOiBPbmNlIHByaW9yaXR5IGlzIHNldCwgaXQgc2hvdWxkIE5PVCBiZSBvdmVycmlkZGVuIGJ5IGluaGVyaXRhbmNlXHJcblxyXG5cdFx0Ly8gRGVidWcgbG9nZ2luZyBmb3IgcHJpb3JpdHkgcHJvY2Vzc2luZ1xyXG5cclxuXHRcdC8vIEZpcnN0LCBlbnN1cmUgd2UgaGF2ZSB0aGUgcHJpb3JpdHkgZnJvbSB0YXNrLWxldmVsIGlmIGl0IGV4aXN0c1xyXG5cdFx0aWYgKFxyXG5cdFx0XHQoZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSA9PT0gdW5kZWZpbmVkIHx8XHJcblx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSA9PT0gbnVsbCkgJiZcclxuXHRcdFx0KHRhc2sgYXMgYW55KS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdCh0YXNrIGFzIGFueSkucHJpb3JpdHkgIT09IG51bGxcclxuXHRcdCkge1xyXG5cdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnByaW9yaXR5ID0gKHRhc2sgYXMgYW55KS5wcmlvcml0eTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgcHJpb3JpdHkgaXMgcHJvcGVybHkgY29udmVydGVkIHRvIG51bWVyaWMgZm9ybWF0IGlmIGl0IGV4aXN0c1xyXG5cdFx0Ly8gQ2xlYW4gdXAgbnVsbCB2YWx1ZXMgdG8gdW5kZWZpbmVkIGZvciBjb25zaXN0ZW5jeVxyXG5cdFx0aWYgKGVuaGFuY2VkTWV0YWRhdGEucHJpb3JpdHkgPT09IG51bGwpIHtcclxuXHRcdFx0ZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSA9IHVuZGVmaW5lZDtcclxuXHRcdH0gZWxzZSBpZiAoZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsUHJpb3JpdHkgPSBlbmhhbmNlZE1ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnByaW9yaXR5ID0gdGhpcy5jb252ZXJ0UHJpb3JpdHlWYWx1ZShcclxuXHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnByaW9yaXR5XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQXBwbHkgaW5oZXJpdGFuY2UgZm9yIGVhY2ggbWV0YWRhdGEgZmllbGRcclxuXHRcdHRoaXMuYXBwbHlTY2FsYXJJbmhlcml0YW5jZShlbmhhbmNlZE1ldGFkYXRhLCBjdHgpO1xyXG5cdFx0dGhpcy5hcHBseUFycmF5SW5oZXJpdGFuY2UoZW5oYW5jZWRNZXRhZGF0YSwgY3R4KTtcclxuXHRcdHRoaXMuYXBwbHlTcGVjaWFsRmllbGRSdWxlcyhlbmhhbmNlZE1ldGFkYXRhLCBjdHgpO1xyXG5cdFx0dGhpcy5hcHBseVByb2plY3RSZWZlcmVuY2UoZW5oYW5jZWRNZXRhZGF0YSwgY3R4KTtcclxuXHJcblx0XHQvLyBIYW5kbGUgc3VidGFzayBpbmhlcml0YW5jZSBpZiB0aGlzIGlzIGEgcGFyZW50IHRhc2tcclxuXHRcdGlmIChcclxuXHRcdFx0b3JpZ2luYWxNZXRhZGF0YS5jaGlsZHJlbiAmJlxyXG5cdFx0XHRBcnJheS5pc0FycmF5KG9yaWdpbmFsTWV0YWRhdGEuY2hpbGRyZW4pXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy5hcHBseVN1YnRhc2tJbmhlcml0YW5jZSh0YXNrLCBlbmhhbmNlZE1ldGFkYXRhLCBjdHgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdG1ldGFkYXRhOiBlbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0fSBhcyBUYXNrO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXBwbHkgc2NhbGFyIGZpZWxkIGluaGVyaXRhbmNlOiB0YXNrID4gZmlsZSA+IHByb2plY3QgPiBkZWZhdWx0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseVNjYWxhckluaGVyaXRhbmNlKFxyXG5cdFx0bWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRjdHg6IEF1Z21lbnRDb250ZXh0XHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBzY2FsYXJGaWVsZHMgPSBbXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJjb250ZXh0XCIsXHJcblx0XHRcdFwiYXJlYVwiLFxyXG5cdFx0XHRcImVzdGltYXRlZFRpbWVcIixcclxuXHRcdFx0XCJhY3R1YWxUaW1lXCIsXHJcblx0XHRcdFwidXNlQXNEYXRlVHlwZVwiLFxyXG5cdFx0XHRcImhlYWRpbmdcIixcclxuXHRcdF07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBzY2FsYXJGaWVsZHMpIHtcclxuXHRcdFx0Ly8gU2tpcCBpZiB0YXNrIGFscmVhZHkgaGFzIGV4cGxpY2l0IHZhbHVlXHJcblx0XHRcdGlmIChtZXRhZGF0YVtmaWVsZF0gIT09IHVuZGVmaW5lZCAmJiBtZXRhZGF0YVtmaWVsZF0gIT09IG51bGwpIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgcHJpb3JpdHkgLSBORVZFUiBhcHBseSBkZWZhdWx0IHZhbHVlXHJcblx0XHRcdC8vIFByaW9yaXR5IHNob3VsZCBvbmx5IGNvbWUgZnJvbSB0YXNrIGl0c2VsZiwgZmlsZSwgb3IgcHJvamVjdFxyXG5cdFx0XHRpZiAoZmllbGQgPT09IFwicHJpb3JpdHlcIikge1xyXG5cdFx0XHRcdC8vIE9ubHkgY2hlY2sgZmlsZSBhbmQgcHJvamVjdCBzb3VyY2VzLCBza2lwIGRlZmF1bHRcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHNvdXJjZSBvZiBbXCJmaWxlXCIsIFwicHJvamVjdFwiXSkge1xyXG5cdFx0XHRcdFx0bGV0IHZhbHVlOiBhbnk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHNvdXJjZSA9PT0gXCJmaWxlXCIpIHtcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBjdHguZmlsZU1ldGE/LltmaWVsZF07XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHNvdXJjZSA9PT0gXCJwcm9qZWN0XCIpIHtcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBjdHgucHJvamVjdE1ldGE/LltmaWVsZF07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQ29udmVydCBwcmlvcml0eSB2YWx1ZSB0byBudW1lcmljIGZvcm1hdFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YVtmaWVsZF0gPSB0aGlzLmNvbnZlcnRQcmlvcml0eVZhbHVlKHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIElmIG5vIHByaW9yaXR5IGZvdW5kLCBsZWF2ZSBpdCB1bmRlZmluZWQgKGRvbid0IHNldCBkZWZhdWx0KVxyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSBpbmhlcml0YW5jZSBwcmlvcml0eSBmb3Igb3RoZXIgZmllbGRzOiBmaWxlID4gcHJvamVjdCA+IGRlZmF1bHRcclxuXHRcdFx0Zm9yIChjb25zdCBzb3VyY2Ugb2YgdGhpcy5zdHJhdGVneS5zY2FsYXJQcmlvcml0eS5zbGljZSgxKSkge1xyXG5cdFx0XHRcdC8vIFNraXAgJ3Rhc2snIHNpbmNlIHdlIGNoZWNrZWQgYWJvdmVcclxuXHRcdFx0XHRsZXQgdmFsdWU6IGFueTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChzb3VyY2UpIHtcclxuXHRcdFx0XHRcdGNhc2UgXCJmaWxlXCI6XHJcblx0XHRcdFx0XHRcdGlmICghdGhpcy5maWxlRnJvbnRtYXR0ZXJJbmhlcml0YW5jZUVuYWJsZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTsgLy8gU2tpcCBhcHBseWluZyBmaWxlLWxldmVsIHZhbHVlcyB3aGVuIGluaGVyaXRhbmNlIGlzIGRpc2FibGVkXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBjdHguZmlsZU1ldGE/LltmaWVsZF07XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBjdHgucHJvamVjdE1ldGE/LltmaWVsZF07XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImRlZmF1bHRcIjpcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSB0aGlzLmdldERlZmF1bHRWYWx1ZShmaWVsZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhW2ZpZWxkXSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBhcnJheSBmaWVsZCBpbmhlcml0YW5jZSB3aXRoIG1lcmdlIGFuZCBkZWR1cGxpY2F0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseUFycmF5SW5oZXJpdGFuY2UoXHJcblx0XHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdGN0eDogQXVnbWVudENvbnRleHRcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGFycmF5RmllbGRzID0gW1widGFnc1wiLCBcImRlcGVuZHNPblwiXTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGZpZWxkIG9mIGFycmF5RmllbGRzKSB7XHJcblx0XHRcdGNvbnN0IHRhc2tBcnJheSA9IEFycmF5LmlzQXJyYXkobWV0YWRhdGFbZmllbGRdKVxyXG5cdFx0XHRcdD8gbWV0YWRhdGFbZmllbGRdXHJcblx0XHRcdFx0OiBbXTtcclxuXHRcdFx0Y29uc3QgZmlsZUFycmF5UmF3ID1cclxuXHRcdFx0XHRjdHguZmlsZU1ldGEgJiYgQXJyYXkuaXNBcnJheSgoY3R4LmZpbGVNZXRhIGFzIGFueSlbZmllbGRdKVxyXG5cdFx0XHRcdFx0PyAoY3R4LmZpbGVNZXRhIGFzIGFueSlbZmllbGRdXHJcblx0XHRcdFx0XHQ6IFtdO1xyXG5cdFx0XHRjb25zdCBmaWxlQXJyYXkgPSB0aGlzLmZpbGVGcm9udG1hdHRlckluaGVyaXRhbmNlRW5hYmxlZFxyXG5cdFx0XHRcdD8gZmlsZUFycmF5UmF3XHJcblx0XHRcdFx0OiBbXTtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEFycmF5ID1cclxuXHRcdFx0XHRjdHgucHJvamVjdE1ldGEgJiZcclxuXHRcdFx0XHRBcnJheS5pc0FycmF5KChjdHgucHJvamVjdE1ldGEgYXMgYW55KVtmaWVsZF0pXHJcblx0XHRcdFx0XHQ/IChjdHgucHJvamVjdE1ldGEgYXMgYW55KVtmaWVsZF1cclxuXHRcdFx0XHRcdDogW107XHJcblxyXG5cdFx0XHQvLyBOb3JtYWxpemUgdGFncyBjb25zaXN0ZW50bHkgKGVuc3VyZSBsZWFkaW5nICMpIGJlZm9yZSBtZXJnaW5nL2RlZHVwXHJcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZUlmVGFncyA9IChhcnI6IGFueVtdKSA9PiB7XHJcblx0XHRcdFx0aWYgKGZpZWxkICE9PSBcInRhZ3NcIikgcmV0dXJuIGFycjtcclxuXHRcdFx0XHRyZXR1cm4gYXJyXHJcblx0XHRcdFx0XHQuZmlsdGVyKCh0KSA9PiB0eXBlb2YgdCA9PT0gXCJzdHJpbmdcIiAmJiB0LnRyaW0oKS5sZW5ndGggPiAwKVxyXG5cdFx0XHRcdFx0Lm1hcCgodDogc3RyaW5nKSA9PiB0aGlzLm5vcm1hbGl6ZVRhZyh0KSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBJZiB1c2VyIGRpc2FibGVkIGZpbGUgZnJvbnRtYXR0ZXIgaW5oZXJpdGFuY2UsIGRvIG5vdCBpbmhlcml0IHRhZ3MgZnJvbSBmaWxlIG9yIHByb2plY3RcclxuXHRcdFx0aWYgKGZpZWxkID09PSBcInRhZ3NcIiAmJiAhdGhpcy5maWxlRnJvbnRtYXR0ZXJJbmhlcml0YW5jZUVuYWJsZWQpIHtcclxuXHRcdFx0XHRtZXRhZGF0YVtmaWVsZF0gPSBub3JtYWxpemVJZlRhZ3ModGFza0FycmF5KTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdGFza0Fyck5vcm0gPSBub3JtYWxpemVJZlRhZ3ModGFza0FycmF5KTtcclxuXHRcdFx0Y29uc3QgZmlsZUFyck5vcm0gPSBub3JtYWxpemVJZlRhZ3MoZmlsZUFycmF5KTtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEFyck5vcm0gPSBub3JtYWxpemVJZlRhZ3MocHJvamVjdEFycmF5KTtcclxuXHJcblx0XHRcdGxldCBtZXJnZWRBcnJheTogYW55W107XHJcblxyXG5cdFx0XHQvLyBNZXJnZSBiYXNlZCBvbiBzdHJhdGVneVxyXG5cdFx0XHRzd2l0Y2ggKHRoaXMuc3RyYXRlZ3kuYXJyYXlNZXJnZVN0cmF0ZWd5KSB7XHJcblx0XHRcdFx0Y2FzZSBcInRhc2stZmlyc3RcIjpcclxuXHRcdFx0XHRcdG1lcmdlZEFycmF5ID0gW1xyXG5cdFx0XHRcdFx0XHQuLi50YXNrQXJyTm9ybSxcclxuXHRcdFx0XHRcdFx0Li4uZmlsZUFyck5vcm0sXHJcblx0XHRcdFx0XHRcdC4uLnByb2plY3RBcnJOb3JtLFxyXG5cdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJmaWxlLWZpcnN0XCI6XHJcblx0XHRcdFx0XHRtZXJnZWRBcnJheSA9IFtcclxuXHRcdFx0XHRcdFx0Li4uZmlsZUFyck5vcm0sXHJcblx0XHRcdFx0XHRcdC4uLnRhc2tBcnJOb3JtLFxyXG5cdFx0XHRcdFx0XHQuLi5wcm9qZWN0QXJyTm9ybSxcclxuXHRcdFx0XHRcdF07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicHJvamVjdC1maXJzdFwiOlxyXG5cdFx0XHRcdFx0bWVyZ2VkQXJyYXkgPSBbXHJcblx0XHRcdFx0XHRcdC4uLnByb2plY3RBcnJOb3JtLFxyXG5cdFx0XHRcdFx0XHQuLi50YXNrQXJyTm9ybSxcclxuXHRcdFx0XHRcdFx0Li4uZmlsZUFyck5vcm0sXHJcblx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdG1lcmdlZEFycmF5ID0gW1xyXG5cdFx0XHRcdFx0XHQuLi50YXNrQXJyTm9ybSxcclxuXHRcdFx0XHRcdFx0Li4uZmlsZUFyck5vcm0sXHJcblx0XHRcdFx0XHRcdC4uLnByb2plY3RBcnJOb3JtLFxyXG5cdFx0XHRcdFx0XTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGVkdXBsaWNhdGUgd2hpbGUgcHJlc2VydmluZyBvcmRlclxyXG5cdFx0XHRjb25zdCBkZWR1cGVkID0gQXJyYXkuZnJvbShuZXcgU2V0KG1lcmdlZEFycmF5KSk7XHJcblx0XHRcdG1ldGFkYXRhW2ZpZWxkXSA9IGRlZHVwZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBOb3JtYWxpemUgYSB0YWcgdG8gaW5jbHVkZSBsZWFkaW5nICMgYW5kIHRyaW0gd2hpdGVzcGFjZVxyXG5cdHByaXZhdGUgbm9ybWFsaXplVGFnKHRhZzogYW55KTogc3RyaW5nIHtcclxuXHRcdGlmICh0eXBlb2YgdGFnICE9PSBcInN0cmluZ1wiKSByZXR1cm4gdGFnO1xyXG5cdFx0Y29uc3QgdHJpbW1lZCA9IHRhZy50cmltKCk7XHJcblx0XHRpZiAoIXRyaW1tZWQpIHJldHVybiB0cmltbWVkO1xyXG5cdFx0cmV0dXJuIHRyaW1tZWQuc3RhcnRzV2l0aChcIiNcIikgPyB0cmltbWVkIDogYCMke3RyaW1tZWR9YDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IHNwZWNpYWwgZmllbGQgcnVsZXMgZm9yIHN0YXR1cy9jb21wbGV0aW9uIGFuZCByZWN1cnJlbmNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseVNwZWNpYWxGaWVsZFJ1bGVzKFxyXG5cdFx0bWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRjdHg6IEF1Z21lbnRDb250ZXh0XHJcblx0KTogdm9pZCB7XHJcblx0XHQvLyBTdGF0dXMgYW5kIGNvbXBsZXRpb246IG9ubHkgZnJvbSB0YXNrIGxldmVsIChuZXZlciBpbmhlcml0KVxyXG5cdFx0aWYgKHRoaXMuc3RyYXRlZ3kuc3RhdHVzQ29tcGxldGlvblNvdXJjZSA9PT0gXCJ0YXNrLW9ubHlcIikge1xyXG5cdFx0XHQvLyBUaGVzZSBmaWVsZHMgc2hvdWxkIG9ubHkgY29tZSBmcm9tIHRoZSB0YXNrIGl0c2VsZiwgbmV2ZXIgaW5oZXJpdFxyXG5cdFx0XHQvLyAoTm8gYWN0aW9uIG5lZWRlZCBhcyB3ZSBkb24ndCBvdmVycmlkZSBleGlzdGluZyB0YXNrIHZhbHVlcylcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWN1cnJlbmNlOiB0YXNrIGV4cGxpY2l0IHByaW9yaXR5XHJcblx0XHRpZiAodGhpcy5zdHJhdGVneS5yZWN1cnJlbmNlU291cmNlID09PSBcInRhc2stZXhwbGljaXRcIikge1xyXG5cdFx0XHQvLyBPbmx5IHVzZSByZWN1cnJlbmNlIGlmIGV4cGxpY2l0bHkgc2V0IG9uIHRhc2tcclxuXHRcdFx0aWYgKCFtZXRhZGF0YS5yZWN1cnJlbmNlKSB7XHJcblx0XHRcdFx0Ly8gRG9uJ3QgaW5oZXJpdCByZWN1cnJlbmNlIGZyb20gZmlsZSBvciBwcm9qZWN0XHJcblx0XHRcdFx0ZGVsZXRlIG1ldGFkYXRhLnJlY3VycmVuY2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBEYXRlIGZpZWxkczogaW5oZXJpdCBvbmx5IGlmIG5vdCBhbHJlYWR5IHNldFxyXG5cdFx0Y29uc3QgZGF0ZUZpZWxkcyA9IFtcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRdO1xyXG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBkYXRlRmllbGRzKSB7XHJcblx0XHRcdGlmIChtZXRhZGF0YVtmaWVsZF0gPT09IHVuZGVmaW5lZCB8fCBtZXRhZGF0YVtmaWVsZF0gPT09IG51bGwpIHtcclxuXHRcdFx0XHQvLyBUcnkgZmlsZSBmaXJzdCwgdGhlbiBwcm9qZWN0XHJcblx0XHRcdFx0Y29uc3QgZmlsZVZhbHVlID0gY3R4LmZpbGVNZXRhPy5bZmllbGRdO1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RWYWx1ZSA9IGN0eC5wcm9qZWN0TWV0YT8uW2ZpZWxkXTtcclxuXHJcblx0XHRcdFx0aWYgKGZpbGVWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIGZpbGVWYWx1ZSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGFbZmllbGRdID0gZmlsZVZhbHVlO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0XHRwcm9qZWN0VmFsdWUgIT09IHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdFx0cHJvamVjdFZhbHVlICE9PSBudWxsXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YVtmaWVsZF0gPSBwcm9qZWN0VmFsdWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBUZ1Byb2plY3QgcmVmZXJlbmNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseVByb2plY3RSZWZlcmVuY2UoXHJcblx0XHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdGN0eDogQXVnbWVudENvbnRleHRcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIERlcml2ZSBwcm9qZWN0IG5hbWUgZnJvbSBtdWx0aXBsZSBzb3VyY2VzIHdpdGggcHJpb3JpdHk6XHJcblx0XHQvLyAxKSBjdHgucHJvamVjdE5hbWUgKHJlc29sdmVyLXByb3ZpZGVkIHRnUHJvamVjdCBuYW1lKVxyXG5cdFx0Ly8gMikgY3R4LnByb2plY3RNZXRhLnByb2plY3RcclxuXHRcdC8vIDMpIGN0eC5maWxlTWV0YS5wcm9qZWN0IChmcm9udG1hdHRlcikgLSBuZXcgZmFsbGJhY2sgdG8gYXZvaWQgbG9zaW5nIHByb2plY3RzXHJcblx0XHRjb25zdCBwcm9qZWN0RnJvbU1ldGEgPVxyXG5cdFx0XHR0eXBlb2YgY3R4LnByb2plY3RNZXRhPy5wcm9qZWN0ID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdGN0eC5wcm9qZWN0TWV0YS5wcm9qZWN0LnRyaW0oKVxyXG5cdFx0XHRcdD8gY3R4LnByb2plY3RNZXRhLnByb2plY3QudHJpbSgpXHJcblx0XHRcdFx0OiB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCBwcm9qZWN0RnJvbUZyb250bWF0dGVyID1cclxuXHRcdFx0dHlwZW9mIGN0eC5maWxlTWV0YT8ucHJvamVjdCA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRjdHguZmlsZU1ldGEucHJvamVjdC50cmltKClcclxuXHRcdFx0XHQ/IGN0eC5maWxlTWV0YS5wcm9qZWN0LnRyaW0oKVxyXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIEFsc28gY29uc2lkZXIgY29uZmlndXJlZCBtZXRhZGF0YUtleSBpbiBmcm9udG1hdHRlciAoZS5nLiwgcHJvamVjdE5hbWUpXHJcblx0XHRjb25zdCBtZXRhZGF0YUtleUZyb21Db25maWcgPVxyXG5cdFx0XHR0aGlzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnPy5tZXRhZGF0YUtleTtcclxuXHRcdGNvbnN0IHByb2plY3RGcm9tTWV0YWRhdGFLZXkgPVxyXG5cdFx0XHRtZXRhZGF0YUtleUZyb21Db25maWcgJiZcclxuXHRcdFx0dHlwZW9mIGN0eC5maWxlTWV0YT8uW21ldGFkYXRhS2V5RnJvbUNvbmZpZ10gPT09IFwic3RyaW5nXCIgJiZcclxuXHRcdFx0U3RyaW5nKGN0eC5maWxlTWV0YT8uW21ldGFkYXRhS2V5RnJvbUNvbmZpZ10pLnRyaW0oKS5sZW5ndGggPiAwXHJcblx0XHRcdFx0PyBTdHJpbmcoY3R4LmZpbGVNZXRhPy5bbWV0YWRhdGFLZXlGcm9tQ29uZmlnXSkudHJpbSgpXHJcblx0XHRcdFx0OiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0Y29uc3QgZWZmZWN0aXZlUHJvamVjdE5hbWUgPVxyXG5cdFx0XHRjdHgucHJvamVjdE5hbWUgfHxcclxuXHRcdFx0cHJvamVjdEZyb21NZXRhIHx8XHJcblx0XHRcdHByb2plY3RGcm9tTWV0YWRhdGFLZXkgfHxcclxuXHRcdFx0cHJvamVjdEZyb21Gcm9udG1hdHRlcjtcclxuXHJcblx0XHQvLyBTZXQgcHJvamVjdCBuYW1lIGlmIG5vdCBhbHJlYWR5IHNldFxyXG5cdFx0aWYgKCFtZXRhZGF0YS5wcm9qZWN0ICYmIGVmZmVjdGl2ZVByb2plY3ROYW1lKSB7XHJcblx0XHRcdG1ldGFkYXRhLnByb2plY3QgPSBlZmZlY3RpdmVQcm9qZWN0TmFtZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0Z1Byb2plY3QgbWlzc2luZyBidXQgbWV0YWRhdGFLZXktZGVyaXZlZCB2YWx1ZSBleGlzdHMsIHN5bnRoZXNpemUgdGdQcm9qZWN0IG5vd1xyXG5cdFx0aWYgKCFtZXRhZGF0YS50Z1Byb2plY3QgJiYgcHJvamVjdEZyb21NZXRhZGF0YUtleSkge1xyXG5cdFx0XHRtZXRhZGF0YS50Z1Byb2plY3QgPSB7XHJcblx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdG5hbWU6IHByb2plY3RGcm9tTWV0YWRhdGFLZXksXHJcblx0XHRcdFx0c291cmNlOiBtZXRhZGF0YUtleUZyb21Db25maWcgfHwgXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9IGFzIFRnUHJvamVjdDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgVGdQcm9qZWN0IGlmIHByb2plY3QgbWV0YWRhdGEgaXMgYXZhaWxhYmxlXHJcblx0XHQvLyBQcmVmZXIgcmVzb2x2ZXItcHJvdmlkZWQgdGdQcm9qZWN0OyBvdGhlcndpc2Ugc3ludGhlc2l6ZSBmcm9tIGF2YWlsYWJsZSBjb250ZXh0XHJcblx0XHRpZiAoY3R4LnByb2plY3RNZXRhKSB7XHJcblx0XHRcdC8vIE9ubHkgc2V0IGZyb20gY3R4LnByb2plY3RNZXRhIHdoZW4gdGFzayBkb2Vzbid0IGFscmVhZHkgaGF2ZSBhIHRnUHJvamVjdFxyXG5cdFx0XHRpZiAoY3R4LnByb2plY3RNZXRhLnRnUHJvamVjdCAmJiAhbWV0YWRhdGEudGdQcm9qZWN0KSB7XHJcblx0XHRcdFx0bWV0YWRhdGEudGdQcm9qZWN0ID0gY3R4LnByb2plY3RNZXRhLnRnUHJvamVjdDtcclxuXHRcdFx0fSBlbHNlIGlmIChlZmZlY3RpdmVQcm9qZWN0TmFtZSAmJiAhbWV0YWRhdGEudGdQcm9qZWN0KSB7XHJcblx0XHRcdFx0Ly8gSW5mZXIgdHlwZS9zb3VyY2Ugd2hlbiByZXNvbHZlciBkaWRuJ3QgcHJvdmlkZSB0Z1Byb2plY3RcclxuXHRcdFx0XHRjb25zdCBpbmZlcnJlZFR5cGU6IFRnUHJvamVjdFtcInR5cGVcIl0gPSBjdHgucHJvamVjdE1ldGFcclxuXHRcdFx0XHRcdC5jb25maWdTb3VyY2VcclxuXHRcdFx0XHRcdD8gXCJjb25maWdcIlxyXG5cdFx0XHRcdFx0OiBcIm1ldGFkYXRhXCI7XHJcblx0XHRcdFx0bWV0YWRhdGEudGdQcm9qZWN0ID0ge1xyXG5cdFx0XHRcdFx0dHlwZTogaW5mZXJyZWRUeXBlLFxyXG5cdFx0XHRcdFx0bmFtZTogZWZmZWN0aXZlUHJvamVjdE5hbWUsXHJcblx0XHRcdFx0XHRzb3VyY2U6XHJcblx0XHRcdFx0XHRcdChjdHgucHJvamVjdE1ldGEgYXMgYW55KS5zb3VyY2UgfHxcclxuXHRcdFx0XHRcdFx0Y3R4LnByb2plY3RNZXRhLmNvbmZpZ1NvdXJjZSB8fFxyXG5cdFx0XHRcdFx0XHRcInVua25vd25cIixcclxuXHRcdFx0XHRcdHJlYWRvbmx5OiAoY3R4LnByb2plY3RNZXRhIGFzIGFueSkucmVhZG9ubHkgfHwgdHJ1ZSxcclxuXHRcdFx0XHR9IGFzIFRnUHJvamVjdDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDIpIElmIG5laXRoZXIgcHJvamVjdCBub3IgdGdQcm9qZWN0IGFyZSBzZXQsIGJ1dCB3ZSBkbyBoYXZlIGZyb250bWF0dGVyIHByb2plY3RcclxuXHRcdC8vICAgIHRoZW4gc2V0IGJvdGggZnJvbSBmcm9udG1hdHRlciB0byByZXN0b3JlIHByb2plY3QgcmVjb2duaXRpb24vY291bnRpbmdcclxuXHRcdGlmIChcclxuXHRcdFx0IW1ldGFkYXRhLnByb2plY3QgJiZcclxuXHRcdFx0IW1ldGFkYXRhLnRnUHJvamVjdCAmJlxyXG5cdFx0XHRwcm9qZWN0RnJvbUZyb250bWF0dGVyXHJcblx0XHQpIHtcclxuXHRcdFx0bWV0YWRhdGEucHJvamVjdCA9IHByb2plY3RGcm9tRnJvbnRtYXR0ZXI7XHJcblx0XHRcdG1ldGFkYXRhLnRnUHJvamVjdCA9IHtcclxuXHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0bmFtZTogcHJvamVjdEZyb21Gcm9udG1hdHRlcixcclxuXHRcdFx0XHRzb3VyY2U6IFwiZnJvbnRtYXR0ZXJcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fSBhcyBUZ1Byb2plY3Q7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBzdWJ0YXNrIGluaGVyaXRhbmNlIGJhc2VkIG9uIHBlci1rZXkgY29udHJvbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXBwbHlTdWJ0YXNrSW5oZXJpdGFuY2UoXHJcblx0XHRwYXJlbnRUYXNrOiBUYXNrLFxyXG5cdFx0cGFyZW50TWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRjdHg6IEF1Z21lbnRDb250ZXh0XHJcblx0KTogdm9pZCB7XHJcblx0XHQvLyBUaGlzIHdvdWxkIHR5cGljYWxseSBpbnZvbHZlIGZpbmRpbmcgY2hpbGQgdGFza3MgYW5kIGFwcGx5aW5nIGluaGVyaXRhbmNlXHJcblx0XHQvLyBGb3Igbm93LCB3ZSdsbCBzdG9yZSB0aGUgaW5oZXJpdGFuY2UgcnVsZXMgb24gdGhlIHBhcmVudCBmb3IgY2hpbGQgcHJvY2Vzc2luZ1xyXG5cdFx0cGFyZW50TWV0YWRhdGEuX3N1YnRhc2tJbmhlcml0YW5jZVJ1bGVzID1cclxuXHRcdFx0dGhpcy5zdHJhdGVneS5zdWJ0YXNrSW5oZXJpdGFuY2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IHByaW9yaXR5IHZhbHVlIHRvIGNvbnNpc3RlbnQgbnVtZXJpYyBmb3JtYXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbnZlcnRQcmlvcml0eVZhbHVlKHZhbHVlOiBhbnkpOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHtcclxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBpdCdzIGFscmVhZHkgYSBudW1iZXIsIHJldHVybiBpdFxyXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG5cdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgaXQncyBhIHN0cmluZywgdHJ5IHRvIGNvbnZlcnRcclxuXHRcdGNvbnN0IHN0clZhbHVlID0gU3RyaW5nKHZhbHVlKTtcclxuXHJcblx0XHQvLyBQcmlvcml0eSBtYXBwaW5nIGZvciB0ZXh0IGFuZCBlbW9qaSB2YWx1ZXNcclxuXHRcdGNvbnN0IHByaW9yaXR5TWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xyXG5cdFx0XHQvLyBUZXh0IHByaW9yaXRpZXNcclxuXHRcdFx0aGlnaGVzdDogNSxcclxuXHRcdFx0aGlnaDogNCxcclxuXHRcdFx0bWVkaXVtOiAzLFxyXG5cdFx0XHRsb3c6IDIsXHJcblx0XHRcdGxvd2VzdDogMSxcclxuXHRcdFx0dXJnZW50OiA1LFxyXG5cdFx0XHRjcml0aWNhbDogNSxcclxuXHRcdFx0aW1wb3J0YW50OiA0LFxyXG5cdFx0XHRub3JtYWw6IDMsXHJcblx0XHRcdG1vZGVyYXRlOiAzLFxyXG5cdFx0XHRtaW5vcjogMixcclxuXHRcdFx0dHJpdmlhbDogMSxcclxuXHRcdFx0Ly8gRW1vamkgcHJpb3JpdGllcyAoVGFza3MgcGx1Z2luIGNvbXBhdGlibGUpXHJcblx0XHRcdFwi8J+UulwiOiA1LFxyXG5cdFx0XHRcIuKPq1wiOiA0LFxyXG5cdFx0XHRcIvCflLxcIjogMyxcclxuXHRcdFx0XCLwn5S9XCI6IDIsXHJcblx0XHRcdFwi4o+s77iPXCI6IDEsXHJcblx0XHRcdFwi4o+sXCI6IDEsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFRyeSBudW1lcmljIGNvbnZlcnNpb24gZmlyc3RcclxuXHRcdGNvbnN0IG51bWVyaWNWYWx1ZSA9IHBhcnNlSW50KHN0clZhbHVlLCAxMCk7XHJcblx0XHRpZiAoIWlzTmFOKG51bWVyaWNWYWx1ZSkgJiYgbnVtZXJpY1ZhbHVlID49IDEgJiYgbnVtZXJpY1ZhbHVlIDw9IDUpIHtcclxuXHRcdFx0cmV0dXJuIG51bWVyaWNWYWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUcnkgcHJpb3JpdHkgbWFwcGluZyAoaW5jbHVkaW5nIGVtb2ppcylcclxuXHRcdGNvbnN0IG1hcHBlZFByaW9yaXR5ID1cclxuXHRcdFx0cHJpb3JpdHlNYXBbc3RyVmFsdWUudG9Mb3dlckNhc2UoKV0gfHwgcHJpb3JpdHlNYXBbc3RyVmFsdWVdO1xyXG5cdFx0aWYgKG1hcHBlZFByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0cmV0dXJuIG1hcHBlZFByaW9yaXR5O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHdlIGNhbid0IGNvbnZlcnQsIHJldHVybiB1bmRlZmluZWQgdG8gYXZvaWQgc2V0dGluZyBpbnZhbGlkIHZhbHVlc1xyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBkZWZhdWx0IHZhbHVlIGZvciBhIGZpZWxkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXREZWZhdWx0VmFsdWUoZmllbGQ6IHN0cmluZyk6IGFueSB7XHJcblx0XHRjb25zdCBkZWZhdWx0czogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcclxuXHRcdFx0Ly8gRG9uJ3Qgc2V0IGRlZmF1bHQgcHJpb3JpdHkgZm9yIG5vdyAtIGl0IHNob3VsZCBjb21lIGZyb20gcGFyc2VyXHJcblx0XHRcdC8vIElmIHdlIG5lZWQgdG8gYWRkIGl0IGJhY2ssIHdlIHNob3VsZCBjaGVjayBpZiB0YXNrIGFscmVhZHkgaGFzIHByaW9yaXR5IGVsc2V3aGVyZVxyXG5cdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0ZGVwZW5kc09uOiBbXSxcclxuXHRcdFx0ZXN0aW1hdGVkVGltZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRhY3R1YWxUaW1lOiB1bmRlZmluZWQsXHJcblx0XHRcdHVzZUFzRGF0ZVR5cGU6IFwiZHVlXCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBkZWZhdWx0c1tmaWVsZF07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgaW5oZXJpdGFuY2Ugc3RyYXRlZ3lcclxuXHQgKi9cclxuXHR1cGRhdGVTdHJhdGVneShzdHJhdGVneTogUGFydGlhbDxJbmhlcml0YW5jZVN0cmF0ZWd5Pik6IHZvaWQge1xyXG5cdFx0dGhpcy5zdHJhdGVneSA9IHsuLi50aGlzLnN0cmF0ZWd5LCAuLi5zdHJhdGVneX07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCBpbmhlcml0YW5jZSBzdHJhdGVneVxyXG5cdCAqL1xyXG5cdGdldFN0cmF0ZWd5KCk6IEluaGVyaXRhbmNlU3RyYXRlZ3kge1xyXG5cdFx0cmV0dXJuIHsuLi50aGlzLnN0cmF0ZWd5fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgaW5oZXJpdGFuY2UgZm9yIGEgc3BlY2lmaWMgZmllbGQgdHlwZVxyXG5cdCAqL1xyXG5cdHByb2Nlc3NGaWVsZEluaGVyaXRhbmNlKFxyXG5cdFx0ZmllbGQ6IHN0cmluZyxcclxuXHRcdHRhc2tWYWx1ZTogYW55LFxyXG5cdFx0ZmlsZVZhbHVlOiBhbnksXHJcblx0XHRwcm9qZWN0VmFsdWU6IGFueVxyXG5cdCk6IGFueSB7XHJcblx0XHQvLyBIYW5kbGUgYXJyYXlzIHNwZWNpYWxseVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRBcnJheS5pc0FycmF5KHRhc2tWYWx1ZSkgfHxcclxuXHRcdFx0QXJyYXkuaXNBcnJheShmaWxlVmFsdWUpIHx8XHJcblx0XHRcdEFycmF5LmlzQXJyYXkocHJvamVjdFZhbHVlKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IHRhc2tBcnJheSA9IEFycmF5LmlzQXJyYXkodGFza1ZhbHVlKSA/IHRhc2tWYWx1ZSA6IFtdO1xyXG5cdFx0XHRjb25zdCBmaWxlQXJyYXkgPSBBcnJheS5pc0FycmF5KGZpbGVWYWx1ZSkgPyBmaWxlVmFsdWUgOiBbXTtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEFycmF5ID0gQXJyYXkuaXNBcnJheShwcm9qZWN0VmFsdWUpXHJcblx0XHRcdFx0PyBwcm9qZWN0VmFsdWVcclxuXHRcdFx0XHQ6IFtdO1xyXG5cclxuXHRcdFx0bGV0IG1lcmdlZDogYW55W107XHJcblx0XHRcdHN3aXRjaCAodGhpcy5zdHJhdGVneS5hcnJheU1lcmdlU3RyYXRlZ3kpIHtcclxuXHRcdFx0XHRjYXNlIFwidGFzay1maXJzdFwiOlxyXG5cdFx0XHRcdFx0bWVyZ2VkID0gWy4uLnRhc2tBcnJheSwgLi4uZmlsZUFycmF5LCAuLi5wcm9qZWN0QXJyYXldO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImZpbGUtZmlyc3RcIjpcclxuXHRcdFx0XHRcdG1lcmdlZCA9IFsuLi5maWxlQXJyYXksIC4uLnRhc2tBcnJheSwgLi4ucHJvamVjdEFycmF5XTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJwcm9qZWN0LWZpcnN0XCI6XHJcblx0XHRcdFx0XHRtZXJnZWQgPSBbLi4ucHJvamVjdEFycmF5LCAuLi50YXNrQXJyYXksIC4uLmZpbGVBcnJheV07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0bWVyZ2VkID0gWy4uLnRhc2tBcnJheSwgLi4uZmlsZUFycmF5LCAuLi5wcm9qZWN0QXJyYXldO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbShuZXcgU2V0KG1lcmdlZCkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBzY2FsYXJzIHdpdGggcHJpb3JpdHkgb3JkZXJcclxuXHRcdGZvciAoY29uc3Qgc291cmNlIG9mIHRoaXMuc3RyYXRlZ3kuc2NhbGFyUHJpb3JpdHkpIHtcclxuXHRcdFx0bGV0IHZhbHVlOiBhbnk7XHJcblx0XHRcdHN3aXRjaCAoc291cmNlKSB7XHJcblx0XHRcdFx0Y2FzZSBcInRhc2tcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFza1ZhbHVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImZpbGVcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gZmlsZVZhbHVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gcHJvamVjdFZhbHVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImRlZmF1bHRcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGhpcy5nZXREZWZhdWx0VmFsdWUoZmllbGQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcbn1cclxuIl19