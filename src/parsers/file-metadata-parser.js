/**
 * File Metadata Task Parser
 * Extracts tasks from file metadata and tags
 */
export class FileMetadataTaskParser {
    constructor(config, projectDetectionMethods) {
        this.config = config;
        this.projectDetectionMethods = projectDetectionMethods;
    }
    /**
     * Parse tasks from a file's metadata and tags
     */
    parseFileForTasks(filePath, fileContent, fileCache) {
        const tasks = [];
        const errors = [];
        try {
            // Parse tasks from frontmatter metadata
            if (this.config.enableFileMetadataParsing &&
                (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter)) {
                const metadataTasks = this.parseMetadataTasks(filePath, fileCache.frontmatter, fileContent, fileCache);
                tasks.push(...metadataTasks.tasks);
                errors.push(...metadataTasks.errors);
            }
            // Parse tasks from file tags
            if (this.config.enableTagBasedTaskParsing && (fileCache === null || fileCache === void 0 ? void 0 : fileCache.tags)) {
                const tagTasks = this.parseTagTasks(filePath, fileCache.tags, fileCache.frontmatter, fileContent, fileCache);
                tasks.push(...tagTasks.tasks);
                errors.push(...tagTasks.errors);
            }
        }
        catch (error) {
            errors.push(`Error parsing file ${filePath}: ${error.message}`);
        }
        return { tasks, errors };
    }
    /**
     * Parse tasks from file frontmatter metadata
     */
    parseMetadataTasks(filePath, frontmatter, fileContent, fileCache) {
        const tasks = [];
        const errors = [];
        for (const fieldName of this.config.metadataFieldsToParseAsTasks) {
            if (frontmatter[fieldName] !== undefined) {
                try {
                    const task = this.createTaskFromMetadata(filePath, fieldName, frontmatter[fieldName], frontmatter, fileContent, fileCache);
                    if (task) {
                        tasks.push(task);
                    }
                }
                catch (error) {
                    errors.push(`Error creating task from metadata field ${fieldName} in ${filePath}: ${error.message}`);
                }
            }
        }
        return { tasks, errors };
    }
    /**
     * Parse tasks from file tags
     */
    parseTagTasks(filePath, tags, frontmatter, fileContent, fileCache) {
        const tasks = [];
        const errors = [];
        const fileTags = tags.map((t) => t.tag);
        for (const targetTag of this.config.tagsToParseAsTasks) {
            // Normalize tag format (ensure it starts with #)
            const normalizedTargetTag = targetTag.startsWith("#")
                ? targetTag
                : `#${targetTag}`;
            if (fileTags.some((tag) => tag === normalizedTargetTag)) {
                try {
                    const task = this.createTaskFromTag(filePath, normalizedTargetTag, frontmatter, fileContent, fileCache);
                    if (task) {
                        tasks.push(task);
                    }
                }
                catch (error) {
                    errors.push(`Error creating task from tag ${normalizedTargetTag} in ${filePath}: ${error.message}`);
                }
            }
        }
        return { tasks, errors };
    }
    /**
     * Create a task from metadata field
     */
    createTaskFromMetadata(filePath, fieldName, fieldValue, frontmatter, fileContent, fileCache) {
        // Get task content from specified metadata field or filename
        const taskContent = this.getTaskContent(frontmatter, filePath);
        // Create unique task ID
        const taskId = `${filePath}-metadata-${fieldName}`;
        // Determine task status based on field value and name
        const status = this.determineTaskStatus(fieldName, fieldValue);
        const completed = status.toLowerCase() === "x";
        // Extract additional metadata
        const metadata = this.extractTaskMetadata(filePath, frontmatter, fieldName, fieldValue, fileCache);
        console.log("metadata", metadata);
        const task = {
            id: taskId,
            content: taskContent,
            filePath,
            line: 0,
            completed,
            status,
            originalMarkdown: `- [${status}] ${taskContent}`,
            metadata: Object.assign(Object.assign({}, metadata), { tags: this.extractTags(frontmatter), children: [], heading: [], 
                // Add source information
                source: "file-metadata", sourceField: fieldName, sourceValue: fieldValue }),
        };
        return task;
    }
    /**
     * Create a task from file tag
     */
    createTaskFromTag(filePath, tag, frontmatter, fileContent, fileCache) {
        // Get task content from specified metadata field or filename
        const taskContent = this.getTaskContent(frontmatter, filePath);
        // Create unique task ID
        const taskId = `${filePath}-tag-${tag.replace("#", "")}`;
        // Use default task status
        const status = this.config.defaultTaskStatus;
        const completed = status.toLowerCase() === "x";
        // Extract additional metadata
        const metadata = this.extractTaskMetadata(filePath, frontmatter || {}, "tag", tag, fileCache);
        const task = {
            id: taskId,
            content: taskContent,
            filePath,
            line: 0,
            completed,
            status,
            originalMarkdown: `- [${status}] ${taskContent}`,
            metadata: Object.assign(Object.assign({}, metadata), { tags: this.extractTags(frontmatter), children: [], heading: [], 
                // Add source information
                source: "file-tag", sourceTag: tag }),
        };
        return task;
    }
    /**
     * Get task content from metadata or filename
     */
    getTaskContent(frontmatter, filePath) {
        if (frontmatter && frontmatter[this.config.taskContentFromMetadata]) {
            return String(frontmatter[this.config.taskContentFromMetadata]);
        }
        // Fallback to filename without extension
        const fileName = filePath.split("/").pop() || filePath;
        return fileName.replace(/\.[^/.]+$/, "");
    }
    /**
     * Determine task status based on field name and value
     */
    determineTaskStatus(fieldName, fieldValue) {
        // If field name suggests completion
        if (fieldName.toLowerCase().includes("complete") ||
            fieldName.toLowerCase().includes("done")) {
            return fieldValue ? "x" : " ";
        }
        // If field name suggests todo/task
        if (fieldName.toLowerCase().includes("todo") ||
            fieldName.toLowerCase().includes("task")) {
            // If it's a boolean, use it to determine status
            if (typeof fieldValue === "boolean") {
                return fieldValue ? "x" : " ";
            }
            // If it's a string that looks like a status
            if (typeof fieldValue === "string" && fieldValue.length === 1) {
                return fieldValue;
            }
        }
        // If field name suggests due date
        if (fieldName.toLowerCase().includes("due")) {
            return " "; // Due dates are typically incomplete tasks
        }
        // Default to configured default status
        return this.config.defaultTaskStatus;
    }
    /**
     * Extract task metadata from frontmatter
     */
    extractTaskMetadata(filePath, frontmatter, sourceField, sourceValue, fileCache) {
        const metadata = {};
        // Extract common task metadata fields
        if (frontmatter.dueDate) {
            metadata.dueDate = this.parseDate(frontmatter.dueDate);
        }
        if (frontmatter.startDate) {
            metadata.startDate = this.parseDate(frontmatter.startDate);
        }
        if (frontmatter.scheduledDate) {
            metadata.scheduledDate = this.parseDate(frontmatter.scheduledDate);
        }
        if (frontmatter.priority) {
            metadata.priority = this.parsePriority(frontmatter.priority);
        }
        // Try custom project detection methods first
        // Note: Pass fileCache to detect from tags and links
        const detectedProject = this.detectProjectFromFile(filePath, frontmatter, fileCache);
        if (detectedProject) {
            metadata.project = detectedProject;
        }
        else if (frontmatter.project) {
            // Fallback to legacy project field
            metadata.project = String(frontmatter.project);
        }
        if (frontmatter.context) {
            metadata.context = String(frontmatter.context);
        }
        if (frontmatter.area) {
            metadata.area = String(frontmatter.area);
        }
        // If the source field is a date field, use it appropriately
        if (sourceField.toLowerCase().includes("due") && sourceValue) {
            metadata.dueDate = this.parseDate(sourceValue);
        }
        return metadata;
    }
    /**
     * Detect project from file using custom detection methods
     */
    detectProjectFromFile(filePath, frontmatter, fileCache) {
        if (!this.projectDetectionMethods || this.projectDetectionMethods.length === 0) {
            return undefined;
        }
        for (const method of this.projectDetectionMethods) {
            if (!method.enabled)
                continue;
            switch (method.type) {
                case "metadata":
                    // Check if the specified metadata property exists in frontmatter
                    if (frontmatter[method.propertyKey]) {
                        return String(frontmatter[method.propertyKey]);
                    }
                    break;
                case "tag":
                    // Check if file has the specified tag in content (using CachedMetadata.tags)
                    if (fileCache === null || fileCache === void 0 ? void 0 : fileCache.tags) {
                        const targetTag = method.propertyKey.startsWith("#")
                            ? method.propertyKey
                            : `#${method.propertyKey}`;
                        // Check if any tag in the file matches our target
                        const hasTag = fileCache.tags.some(tagCache => tagCache.tag === targetTag);
                        if (hasTag) {
                            // First try to use title or name from frontmatter as project name
                            if (frontmatter.title) {
                                return String(frontmatter.title);
                            }
                            if (frontmatter.name) {
                                return String(frontmatter.name);
                            }
                            // Fallback: use the file name (without extension)
                            const fileName = filePath.split('/').pop() || filePath;
                            return fileName.replace(/\.md$/i, '');
                        }
                    }
                    break;
                case "link":
                    // Check all links in the file (using CachedMetadata.links)
                    if (fileCache === null || fileCache === void 0 ? void 0 : fileCache.links) {
                        // Look for links that match our filter
                        for (const linkCache of fileCache.links) {
                            const linkedNote = linkCache.link;
                            // If there's a filter, check if the link matches
                            if (method.linkFilter) {
                                if (linkedNote.includes(method.linkFilter)) {
                                    // First try to use title or name from frontmatter as project name
                                    if (frontmatter.title) {
                                        return String(frontmatter.title);
                                    }
                                    if (frontmatter.name) {
                                        return String(frontmatter.name);
                                    }
                                    // Fallback: use the file name (without extension)
                                    const fileName = filePath.split('/').pop() || filePath;
                                    return fileName.replace(/\.md$/i, '');
                                }
                            }
                            else if (method.propertyKey) {
                                // If a property key is specified, only check links in that metadata field
                                if (frontmatter[method.propertyKey]) {
                                    const propValue = String(frontmatter[method.propertyKey]);
                                    // Check if this link is mentioned in the property
                                    if (propValue.includes(`[[${linkedNote}]]`)) {
                                        // First try to use title or name from frontmatter as project name
                                        if (frontmatter.title) {
                                            return String(frontmatter.title);
                                        }
                                        if (frontmatter.name) {
                                            return String(frontmatter.name);
                                        }
                                        // Fallback: use the file name (without extension)
                                        const fileName = filePath.split('/').pop() || filePath;
                                        return fileName.replace(/\.md$/i, '');
                                    }
                                }
                            }
                            else {
                                // No filter and no specific property, use first link as project
                                // First try to use title or name from frontmatter as project name
                                if (frontmatter.title) {
                                    return String(frontmatter.title);
                                }
                                if (frontmatter.name) {
                                    return String(frontmatter.name);
                                }
                                // Fallback: use the file name (without extension)
                                const fileName = filePath.split('/').pop() || filePath;
                                return fileName.replace(/\.md$/i, '');
                            }
                        }
                    }
                    break;
            }
        }
        return undefined;
    }
    /**
     * Extract tags from frontmatter
     */
    extractTags(frontmatter) {
        if (!frontmatter)
            return [];
        const tags = [];
        // Extract from tags field
        if (frontmatter.tags) {
            if (Array.isArray(frontmatter.tags)) {
                tags.push(...frontmatter.tags.map((tag) => String(tag)));
            }
            else {
                tags.push(String(frontmatter.tags));
            }
        }
        // Extract from tag field (singular)
        if (frontmatter.tag) {
            if (Array.isArray(frontmatter.tag)) {
                tags.push(...frontmatter.tag.map((tag) => String(tag)));
            }
            else {
                tags.push(String(frontmatter.tag));
            }
        }
        return tags;
    }
    /**
     * Parse date from various formats
     */
    parseDate(dateValue) {
        if (!dateValue)
            return undefined;
        if (typeof dateValue === "number") {
            return dateValue;
        }
        if (typeof dateValue === "string") {
            const parsed = Date.parse(dateValue);
            return isNaN(parsed) ? undefined : parsed;
        }
        if (dateValue instanceof Date) {
            return dateValue.getTime();
        }
        return undefined;
    }
    /**
     * Parse priority from various formats
     */
    parsePriority(priorityValue) {
        if (typeof priorityValue === "number") {
            return Math.max(1, Math.min(3, Math.round(priorityValue)));
        }
        if (typeof priorityValue === "string") {
            const num = parseInt(priorityValue, 10);
            if (!isNaN(num)) {
                return Math.max(1, Math.min(3, num));
            }
            // Handle text priorities
            const lower = priorityValue.toLowerCase();
            if (lower.includes("high") || lower.includes("urgent"))
                return 3;
            if (lower.includes("medium") || lower.includes("normal"))
                return 2;
            if (lower.includes("low"))
                return 1;
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLW1ldGFkYXRhLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFXSCxNQUFNLE9BQU8sc0JBQXNCO0lBSWxDLFlBQVksTUFBZ0MsRUFBRSx1QkFBa0Q7UUFDL0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHVCQUF1QixDQUFDO0lBQ3hELENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQixDQUNoQixRQUFnQixFQUNoQixXQUFtQixFQUNuQixTQUEwQjtRQUUxQixNQUFNLEtBQUssR0FBVyxFQUFFLENBQUM7UUFDekIsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBRTVCLElBQUk7WUFDSCx3Q0FBd0M7WUFDeEMsSUFDQyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QjtpQkFDckMsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFdBQVcsQ0FBQSxFQUNyQjtnQkFDRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQzVDLFFBQVEsRUFDUixTQUFTLENBQUMsV0FBVyxFQUNyQixXQUFXLEVBQ1gsU0FBUyxDQUNULENBQUM7Z0JBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNyQztZQUVELDZCQUE2QjtZQUM3QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLEtBQUksU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLElBQUksQ0FBQSxFQUFFO2dCQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUNsQyxRQUFRLEVBQ1IsU0FBUyxDQUFDLElBQUksRUFD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LFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxhQUFhLENBQUMsYUFBa0I7UUFDdkMsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUU7WUFDdEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzRDtRQUVELElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO1lBQ3RDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDaEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ3JDO1lBRUQseUJBQXlCO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMxQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsT0FBTyxDQUFDLENBQUM7WUFDakUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsT0FBTyxDQUFDLENBQUM7U0FDcEM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRmlsZSBNZXRhZGF0YSBUYXNrIFBhcnNlclxyXG4gKiBFeHRyYWN0cyB0YXNrcyBmcm9tIGZpbGUgbWV0YWRhdGEgYW5kIHRhZ3NcclxuICovXHJcblxyXG5pbXBvcnQgeyBURmlsZSwgQ2FjaGVkTWV0YWRhdGEgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhLCBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgRmlsZVBhcnNpbmdDb25maWd1cmF0aW9uLCBQcm9qZWN0RGV0ZWN0aW9uTWV0aG9kIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVRhc2tQYXJzaW5nUmVzdWx0IHtcclxuXHR0YXNrczogVGFza1tdO1xyXG5cdGVycm9yczogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlTWV0YWRhdGFUYXNrUGFyc2VyIHtcclxuXHRwcml2YXRlIGNvbmZpZzogRmlsZVBhcnNpbmdDb25maWd1cmF0aW9uO1xyXG5cdHByaXZhdGUgcHJvamVjdERldGVjdGlvbk1ldGhvZHM/OiBQcm9qZWN0RGV0ZWN0aW9uTWV0aG9kW107XHJcblxyXG5cdGNvbnN0cnVjdG9yKGNvbmZpZzogRmlsZVBhcnNpbmdDb25maWd1cmF0aW9uLCBwcm9qZWN0RGV0ZWN0aW9uTWV0aG9kcz86IFByb2plY3REZXRlY3Rpb25NZXRob2RbXSkge1xyXG5cdFx0dGhpcy5jb25maWcgPSBjb25maWc7XHJcblx0XHR0aGlzLnByb2plY3REZXRlY3Rpb25NZXRob2RzID0gcHJvamVjdERldGVjdGlvbk1ldGhvZHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0YXNrcyBmcm9tIGEgZmlsZSdzIG1ldGFkYXRhIGFuZCB0YWdzXHJcblx0ICovXHJcblx0cGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZT86IENhY2hlZE1ldGFkYXRhXHJcblx0KTogRmlsZVRhc2tQYXJzaW5nUmVzdWx0IHtcclxuXHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRcdGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBQYXJzZSB0YXNrcyBmcm9tIGZyb250bWF0dGVyIG1ldGFkYXRhXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmNvbmZpZy5lbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nICYmXHJcblx0XHRcdFx0ZmlsZUNhY2hlPy5mcm9udG1hdHRlclxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBtZXRhZGF0YVRhc2tzID0gdGhpcy5wYXJzZU1ldGFkYXRhVGFza3MoXHJcblx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdGZpbGVDYWNoZS5mcm9udG1hdHRlcixcclxuXHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0ZmlsZUNhY2hlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0YXNrcy5wdXNoKC4uLm1ldGFkYXRhVGFza3MudGFza3MpO1xyXG5cdFx0XHRcdGVycm9ycy5wdXNoKC4uLm1ldGFkYXRhVGFza3MuZXJyb3JzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGFyc2UgdGFza3MgZnJvbSBmaWxlIHRhZ3NcclxuXHRcdFx0aWYgKHRoaXMuY29uZmlnLmVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmcgJiYgZmlsZUNhY2hlPy50YWdzKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFnVGFza3MgPSB0aGlzLnBhcnNlVGFnVGFza3MoXHJcblx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdGZpbGVDYWNoZS50YWdzLFxyXG5cdFx0XHRcdFx0ZmlsZUNhY2hlLmZyb250bWF0dGVyLFxyXG5cdFx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRmaWxlQ2FjaGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRhc2tzLnB1c2goLi4udGFnVGFza3MudGFza3MpO1xyXG5cdFx0XHRcdGVycm9ycy5wdXNoKC4uLnRhZ1Rhc2tzLmVycm9ycyk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGVycm9ycy5wdXNoKGBFcnJvciBwYXJzaW5nIGZpbGUgJHtmaWxlUGF0aH06ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyB0YXNrcywgZXJyb3JzIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0YXNrcyBmcm9tIGZpbGUgZnJvbnRtYXR0ZXIgbWV0YWRhdGFcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlTWV0YWRhdGFUYXNrcyhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdGZpbGVDb250ZW50OiBzdHJpbmcsXHJcblx0XHRmaWxlQ2FjaGU/OiBDYWNoZWRNZXRhZGF0YVxyXG5cdCk6IEZpbGVUYXNrUGFyc2luZ1Jlc3VsdCB7XHJcblx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW107XHJcblx0XHRjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWVsZE5hbWUgb2YgdGhpcy5jb25maWcubWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrcykge1xyXG5cdFx0XHRpZiAoZnJvbnRtYXR0ZXJbZmllbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2sgPSB0aGlzLmNyZWF0ZVRhc2tGcm9tTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRmaWVsZE5hbWUsXHJcblx0XHRcdFx0XHRcdGZyb250bWF0dGVyW2ZpZWxkTmFtZV0sXHJcblx0XHRcdFx0XHRcdGZyb250bWF0dGVyLFxyXG5cdFx0XHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRcdFx0ZmlsZUNhY2hlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0XHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0ZXJyb3JzLnB1c2goXHJcblx0XHRcdFx0XHRcdGBFcnJvciBjcmVhdGluZyB0YXNrIGZyb20gbWV0YWRhdGEgZmllbGQgJHtmaWVsZE5hbWV9IGluICR7ZmlsZVBhdGh9OiAke2Vycm9yLm1lc3NhZ2V9YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyB0YXNrcywgZXJyb3JzIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0YXNrcyBmcm9tIGZpbGUgdGFnc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VUYWdUYXNrcyhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHR0YWdzOiBBcnJheTx7IHRhZzogc3RyaW5nOyBwb3NpdGlvbjogYW55IH0+LFxyXG5cdFx0ZnJvbnRtYXR0ZXI6IFJlY29yZDxzdHJpbmcsIGFueT4gfCB1bmRlZmluZWQsXHJcblx0XHRmaWxlQ29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNhY2hlPzogQ2FjaGVkTWV0YWRhdGFcclxuXHQpOiBGaWxlVGFza1BhcnNpbmdSZXN1bHQge1xyXG5cdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFx0Y29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGNvbnN0IGZpbGVUYWdzID0gdGFncy5tYXAoKHQpID0+IHQudGFnKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhcmdldFRhZyBvZiB0aGlzLmNvbmZpZy50YWdzVG9QYXJzZUFzVGFza3MpIHtcclxuXHRcdFx0Ly8gTm9ybWFsaXplIHRhZyBmb3JtYXQgKGVuc3VyZSBpdCBzdGFydHMgd2l0aCAjKVxyXG5cdFx0XHRjb25zdCBub3JtYWxpemVkVGFyZ2V0VGFnID0gdGFyZ2V0VGFnLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0PyB0YXJnZXRUYWdcclxuXHRcdFx0XHQ6IGAjJHt0YXJnZXRUYWd9YDtcclxuXHJcblx0XHRcdGlmIChmaWxlVGFncy5zb21lKCh0YWcpID0+IHRhZyA9PT0gbm9ybWFsaXplZFRhcmdldFRhZykpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IHRoaXMuY3JlYXRlVGFza0Zyb21UYWcoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRub3JtYWxpemVkVGFyZ2V0VGFnLFxyXG5cdFx0XHRcdFx0XHRmcm9udG1hdHRlcixcclxuXHRcdFx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGZpbGVDYWNoZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0XHRcdHRhc2tzLnB1c2godGFzayk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGVycm9ycy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRgRXJyb3IgY3JlYXRpbmcgdGFzayBmcm9tIHRhZyAke25vcm1hbGl6ZWRUYXJnZXRUYWd9IGluICR7ZmlsZVBhdGh9OiAke2Vycm9yLm1lc3NhZ2V9YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyB0YXNrcywgZXJyb3JzIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSB0YXNrIGZyb20gbWV0YWRhdGEgZmllbGRcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVRhc2tGcm9tTWV0YWRhdGEoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmllbGROYW1lOiBzdHJpbmcsXHJcblx0XHRmaWVsZFZhbHVlOiBhbnksXHJcblx0XHRmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdGZpbGVDb250ZW50OiBzdHJpbmcsXHJcblx0XHRmaWxlQ2FjaGU/OiBDYWNoZWRNZXRhZGF0YVxyXG5cdCk6IFRhc2sgfCBudWxsIHtcclxuXHRcdC8vIEdldCB0YXNrIGNvbnRlbnQgZnJvbSBzcGVjaWZpZWQgbWV0YWRhdGEgZmllbGQgb3IgZmlsZW5hbWVcclxuXHRcdGNvbnN0IHRhc2tDb250ZW50ID0gdGhpcy5nZXRUYXNrQ29udGVudChmcm9udG1hdHRlciwgZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB1bmlxdWUgdGFzayBJRFxyXG5cdFx0Y29uc3QgdGFza0lkID0gYCR7ZmlsZVBhdGh9LW1ldGFkYXRhLSR7ZmllbGROYW1lfWA7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHRhc2sgc3RhdHVzIGJhc2VkIG9uIGZpZWxkIHZhbHVlIGFuZCBuYW1lXHJcblx0XHRjb25zdCBzdGF0dXMgPSB0aGlzLmRldGVybWluZVRhc2tTdGF0dXMoZmllbGROYW1lLCBmaWVsZFZhbHVlKTtcclxuXHRcdGNvbnN0IGNvbXBsZXRlZCA9IHN0YXR1cy50b0xvd2VyQ2FzZSgpID09PSBcInhcIjtcclxuXHJcblx0XHQvLyBFeHRyYWN0IGFkZGl0aW9uYWwgbWV0YWRhdGFcclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy5leHRyYWN0VGFza01ldGFkYXRhKFxyXG5cdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0ZnJvbnRtYXR0ZXIsXHJcblx0XHRcdGZpZWxkTmFtZSxcclxuXHRcdFx0ZmllbGRWYWx1ZSxcclxuXHRcdFx0ZmlsZUNhY2hlXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwibWV0YWRhdGFcIiwgbWV0YWRhdGEpO1xyXG5cclxuXHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdGlkOiB0YXNrSWQsXHJcblx0XHRcdGNvbnRlbnQ6IHRhc2tDb250ZW50LFxyXG5cdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0bGluZTogMCwgLy8gTWV0YWRhdGEgdGFza3MgZG9uJ3QgaGF2ZSBhIHNwZWNpZmljIGxpbmVcclxuXHRcdFx0Y29tcGxldGVkLFxyXG5cdFx0XHRzdGF0dXMsXHJcblx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFske3N0YXR1c31dICR7dGFza0NvbnRlbnR9YCxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHQuLi5tZXRhZGF0YSxcclxuXHRcdFx0XHR0YWdzOiB0aGlzLmV4dHJhY3RUYWdzKGZyb250bWF0dGVyKSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0Ly8gQWRkIHNvdXJjZSBpbmZvcm1hdGlvblxyXG5cdFx0XHRcdHNvdXJjZTogXCJmaWxlLW1ldGFkYXRhXCIsXHJcblx0XHRcdFx0c291cmNlRmllbGQ6IGZpZWxkTmFtZSxcclxuXHRcdFx0XHRzb3VyY2VWYWx1ZTogZmllbGRWYWx1ZSxcclxuXHRcdFx0fSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEsXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB0YXNrO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgdGFzayBmcm9tIGZpbGUgdGFnXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUYXNrRnJvbVRhZyhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHR0YWc6IHN0cmluZyxcclxuXHRcdGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgdW5kZWZpbmVkLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZT86IENhY2hlZE1ldGFkYXRhXHJcblx0KTogVGFzayB8IG51bGwge1xyXG5cdFx0Ly8gR2V0IHRhc2sgY29udGVudCBmcm9tIHNwZWNpZmllZCBtZXRhZGF0YSBmaWVsZCBvciBmaWxlbmFtZVxyXG5cdFx0Y29uc3QgdGFza0NvbnRlbnQgPSB0aGlzLmdldFRhc2tDb250ZW50KGZyb250bWF0dGVyLCBmaWxlUGF0aCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHVuaXF1ZSB0YXNrIElEXHJcblx0XHRjb25zdCB0YXNrSWQgPSBgJHtmaWxlUGF0aH0tdGFnLSR7dGFnLnJlcGxhY2UoXCIjXCIsIFwiXCIpfWA7XHJcblxyXG5cdFx0Ly8gVXNlIGRlZmF1bHQgdGFzayBzdGF0dXNcclxuXHRcdGNvbnN0IHN0YXR1cyA9IHRoaXMuY29uZmlnLmRlZmF1bHRUYXNrU3RhdHVzO1xyXG5cdFx0Y29uc3QgY29tcGxldGVkID0gc3RhdHVzLnRvTG93ZXJDYXNlKCkgPT09IFwieFwiO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgYWRkaXRpb25hbCBtZXRhZGF0YVxyXG5cdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLmV4dHJhY3RUYXNrTWV0YWRhdGEoXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRmcm9udG1hdHRlciB8fCB7fSxcclxuXHRcdFx0XCJ0YWdcIixcclxuXHRcdFx0dGFnLFxyXG5cdFx0XHRmaWxlQ2FjaGVcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0aWQ6IHRhc2tJZCxcclxuXHRcdFx0Y29udGVudDogdGFza0NvbnRlbnQsXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRsaW5lOiAwLCAvLyBUYWcgdGFza3MgZG9uJ3QgaGF2ZSBhIHNwZWNpZmljIGxpbmVcclxuXHRcdFx0Y29tcGxldGVkLFxyXG5cdFx0XHRzdGF0dXMsXHJcblx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFske3N0YXR1c31dICR7dGFza0NvbnRlbnR9YCxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHQuLi5tZXRhZGF0YSxcclxuXHRcdFx0XHR0YWdzOiB0aGlzLmV4dHJhY3RUYWdzKGZyb250bWF0dGVyKSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0Ly8gQWRkIHNvdXJjZSBpbmZvcm1hdGlvblxyXG5cdFx0XHRcdHNvdXJjZTogXCJmaWxlLXRhZ1wiLFxyXG5cdFx0XHRcdHNvdXJjZVRhZzogdGFnLFxyXG5cdFx0XHR9IGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSxcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHRhc2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFzayBjb250ZW50IGZyb20gbWV0YWRhdGEgb3IgZmlsZW5hbWVcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFRhc2tDb250ZW50KFxyXG5cdFx0ZnJvbnRtYXR0ZXI6IFJlY29yZDxzdHJpbmcsIGFueT4gfCB1bmRlZmluZWQsXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGlmIChmcm9udG1hdHRlciAmJiBmcm9udG1hdHRlclt0aGlzLmNvbmZpZy50YXNrQ29udGVudEZyb21NZXRhZGF0YV0pIHtcclxuXHRcdFx0cmV0dXJuIFN0cmluZyhmcm9udG1hdHRlclt0aGlzLmNvbmZpZy50YXNrQ29udGVudEZyb21NZXRhZGF0YV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIHRvIGZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXHJcblx0XHRjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBmaWxlUGF0aDtcclxuXHRcdHJldHVybiBmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlcm1pbmUgdGFzayBzdGF0dXMgYmFzZWQgb24gZmllbGQgbmFtZSBhbmQgdmFsdWVcclxuXHQgKi9cclxuXHRwcml2YXRlIGRldGVybWluZVRhc2tTdGF0dXMoZmllbGROYW1lOiBzdHJpbmcsIGZpZWxkVmFsdWU6IGFueSk6IHN0cmluZyB7XHJcblx0XHQvLyBJZiBmaWVsZCBuYW1lIHN1Z2dlc3RzIGNvbXBsZXRpb25cclxuXHRcdGlmIChcclxuXHRcdFx0ZmllbGROYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJjb21wbGV0ZVwiKSB8fFxyXG5cdFx0XHRmaWVsZE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImRvbmVcIilcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmllbGRWYWx1ZSA/IFwieFwiIDogXCIgXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgZmllbGQgbmFtZSBzdWdnZXN0cyB0b2RvL3Rhc2tcclxuXHRcdGlmIChcclxuXHRcdFx0ZmllbGROYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJ0b2RvXCIpIHx8XHJcblx0XHRcdGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwidGFza1wiKVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIElmIGl0J3MgYSBib29sZWFuLCB1c2UgaXQgdG8gZGV0ZXJtaW5lIHN0YXR1c1xyXG5cdFx0XHRpZiAodHlwZW9mIGZpZWxkVmFsdWUgPT09IFwiYm9vbGVhblwiKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZpZWxkVmFsdWUgPyBcInhcIiA6IFwiIFwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIElmIGl0J3MgYSBzdHJpbmcgdGhhdCBsb29rcyBsaWtlIGEgc3RhdHVzXHJcblx0XHRcdGlmICh0eXBlb2YgZmllbGRWYWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiBmaWVsZFZhbHVlLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdHJldHVybiBmaWVsZFZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgZmllbGQgbmFtZSBzdWdnZXN0cyBkdWUgZGF0ZVxyXG5cdFx0aWYgKGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiZHVlXCIpKSB7XHJcblx0XHRcdHJldHVybiBcIiBcIjsgLy8gRHVlIGRhdGVzIGFyZSB0eXBpY2FsbHkgaW5jb21wbGV0ZSB0YXNrc1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlZmF1bHQgdG8gY29uZmlndXJlZCBkZWZhdWx0IHN0YXR1c1xyXG5cdFx0cmV0dXJuIHRoaXMuY29uZmlnLmRlZmF1bHRUYXNrU3RhdHVzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCB0YXNrIG1ldGFkYXRhIGZyb20gZnJvbnRtYXR0ZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RUYXNrTWV0YWRhdGEoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZnJvbnRtYXR0ZXI6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRzb3VyY2VGaWVsZDogc3RyaW5nLFxyXG5cdFx0c291cmNlVmFsdWU6IGFueSxcclxuXHRcdGZpbGVDYWNoZT86IENhY2hlZE1ldGFkYXRhXHJcblx0KTogUmVjb3JkPHN0cmluZywgYW55PiB7XHJcblx0XHRjb25zdCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgY29tbW9uIHRhc2sgbWV0YWRhdGEgZmllbGRzXHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIuZHVlRGF0ZSkge1xyXG5cdFx0XHRtZXRhZGF0YS5kdWVEYXRlID0gdGhpcy5wYXJzZURhdGUoZnJvbnRtYXR0ZXIuZHVlRGF0ZSk7XHJcblx0XHR9XHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIuc3RhcnREYXRlKSB7XHJcblx0XHRcdG1ldGFkYXRhLnN0YXJ0RGF0ZSA9IHRoaXMucGFyc2VEYXRlKGZyb250bWF0dGVyLnN0YXJ0RGF0ZSk7XHJcblx0XHR9XHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIuc2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRtZXRhZGF0YS5zY2hlZHVsZWREYXRlID0gdGhpcy5wYXJzZURhdGUoZnJvbnRtYXR0ZXIuc2NoZWR1bGVkRGF0ZSk7XHJcblx0XHR9XHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIucHJpb3JpdHkpIHtcclxuXHRcdFx0bWV0YWRhdGEucHJpb3JpdHkgPSB0aGlzLnBhcnNlUHJpb3JpdHkoZnJvbnRtYXR0ZXIucHJpb3JpdHkpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gVHJ5IGN1c3RvbSBwcm9qZWN0IGRldGVjdGlvbiBtZXRob2RzIGZpcnN0XHJcblx0XHQvLyBOb3RlOiBQYXNzIGZpbGVDYWNoZSB0byBkZXRlY3QgZnJvbSB0YWdzIGFuZCBsaW5rc1xyXG5cdFx0Y29uc3QgZGV0ZWN0ZWRQcm9qZWN0ID0gdGhpcy5kZXRlY3RQcm9qZWN0RnJvbUZpbGUoZmlsZVBhdGgsIGZyb250bWF0dGVyLCBmaWxlQ2FjaGUpO1xyXG5cdFx0aWYgKGRldGVjdGVkUHJvamVjdCkge1xyXG5cdFx0XHRtZXRhZGF0YS5wcm9qZWN0ID0gZGV0ZWN0ZWRQcm9qZWN0O1xyXG5cdFx0fSBlbHNlIGlmIChmcm9udG1hdHRlci5wcm9qZWN0KSB7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIGxlZ2FjeSBwcm9qZWN0IGZpZWxkXHJcblx0XHRcdG1ldGFkYXRhLnByb2plY3QgPSBTdHJpbmcoZnJvbnRtYXR0ZXIucHJvamVjdCk7XHJcblx0XHR9XHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIuY29udGV4dCkge1xyXG5cdFx0XHRtZXRhZGF0YS5jb250ZXh0ID0gU3RyaW5nKGZyb250bWF0dGVyLmNvbnRleHQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGZyb250bWF0dGVyLmFyZWEpIHtcclxuXHRcdFx0bWV0YWRhdGEuYXJlYSA9IFN0cmluZyhmcm9udG1hdHRlci5hcmVhKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGUgc291cmNlIGZpZWxkIGlzIGEgZGF0ZSBmaWVsZCwgdXNlIGl0IGFwcHJvcHJpYXRlbHlcclxuXHRcdGlmIChzb3VyY2VGaWVsZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiZHVlXCIpICYmIHNvdXJjZVZhbHVlKSB7XHJcblx0XHRcdG1ldGFkYXRhLmR1ZURhdGUgPSB0aGlzLnBhcnNlRGF0ZShzb3VyY2VWYWx1ZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1ldGFkYXRhO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGV0ZWN0IHByb2plY3QgZnJvbSBmaWxlIHVzaW5nIGN1c3RvbSBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZWN0UHJvamVjdEZyb21GaWxlKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG5cdFx0ZmlsZUNhY2hlPzogQ2FjaGVkTWV0YWRhdGFcclxuXHQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCF0aGlzLnByb2plY3REZXRlY3Rpb25NZXRob2RzIHx8IHRoaXMucHJvamVjdERldGVjdGlvbk1ldGhvZHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yIChjb25zdCBtZXRob2Qgb2YgdGhpcy5wcm9qZWN0RGV0ZWN0aW9uTWV0aG9kcykge1xyXG5cdFx0XHRpZiAoIW1ldGhvZC5lbmFibGVkKSBjb250aW51ZTtcclxuXHJcblx0XHRcdHN3aXRjaCAobWV0aG9kLnR5cGUpIHtcclxuXHRcdFx0XHRjYXNlIFwibWV0YWRhdGFcIjpcclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBzcGVjaWZpZWQgbWV0YWRhdGEgcHJvcGVydHkgZXhpc3RzIGluIGZyb250bWF0dGVyXHJcblx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXJbbWV0aG9kLnByb3BlcnR5S2V5XSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nKGZyb250bWF0dGVyW21ldGhvZC5wcm9wZXJ0eUtleV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJ0YWdcIjpcclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIGZpbGUgaGFzIHRoZSBzcGVjaWZpZWQgdGFnIGluIGNvbnRlbnQgKHVzaW5nIENhY2hlZE1ldGFkYXRhLnRhZ3MpXHJcblx0XHRcdFx0XHRpZiAoZmlsZUNhY2hlPy50YWdzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhcmdldFRhZyA9IG1ldGhvZC5wcm9wZXJ0eUtleS5zdGFydHNXaXRoKFwiI1wiKSBcclxuXHRcdFx0XHRcdFx0XHQ/IG1ldGhvZC5wcm9wZXJ0eUtleSBcclxuXHRcdFx0XHRcdFx0XHQ6IGAjJHttZXRob2QucHJvcGVydHlLZXl9YDtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIGFueSB0YWcgaW4gdGhlIGZpbGUgbWF0Y2hlcyBvdXIgdGFyZ2V0XHJcblx0XHRcdFx0XHRcdGNvbnN0IGhhc1RhZyA9IGZpbGVDYWNoZS50YWdzLnNvbWUodGFnQ2FjaGUgPT4gXHJcblx0XHRcdFx0XHRcdFx0dGFnQ2FjaGUudGFnID09PSB0YXJnZXRUYWdcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGlmIChoYXNUYWcpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBGaXJzdCB0cnkgdG8gdXNlIHRpdGxlIG9yIG5hbWUgZnJvbSBmcm9udG1hdHRlciBhcyBwcm9qZWN0IG5hbWVcclxuXHRcdFx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXIudGl0bGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBTdHJpbmcoZnJvbnRtYXR0ZXIudGl0bGUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXIubmFtZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIFN0cmluZyhmcm9udG1hdHRlci5uYW1lKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2s6IHVzZSB0aGUgZmlsZSBuYW1lICh3aXRob3V0IGV4dGVuc2lvbilcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLnNwbGl0KCcvJykucG9wKCkgfHwgZmlsZVBhdGg7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLm1kJC9pLCAnJyk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIFwibGlua1wiOlxyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgYWxsIGxpbmtzIGluIHRoZSBmaWxlICh1c2luZyBDYWNoZWRNZXRhZGF0YS5saW5rcylcclxuXHRcdFx0XHRcdGlmIChmaWxlQ2FjaGU/LmxpbmtzKSB7XHJcblx0XHRcdFx0XHRcdC8vIExvb2sgZm9yIGxpbmtzIHRoYXQgbWF0Y2ggb3VyIGZpbHRlclxyXG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGxpbmtDYWNoZSBvZiBmaWxlQ2FjaGUubGlua3MpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBsaW5rZWROb3RlID0gbGlua0NhY2hlLmxpbms7XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgdGhlcmUncyBhIGZpbHRlciwgY2hlY2sgaWYgdGhlIGxpbmsgbWF0Y2hlc1xyXG5cdFx0XHRcdFx0XHRcdGlmIChtZXRob2QubGlua0ZpbHRlcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGxpbmtlZE5vdGUuaW5jbHVkZXMobWV0aG9kLmxpbmtGaWx0ZXIpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIEZpcnN0IHRyeSB0byB1c2UgdGl0bGUgb3IgbmFtZSBmcm9tIGZyb250bWF0dGVyIGFzIHByb2plY3QgbmFtZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXIudGl0bGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nKGZyb250bWF0dGVyLnRpdGxlKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXIubmFtZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBTdHJpbmcoZnJvbnRtYXR0ZXIubmFtZSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2s6IHVzZSB0aGUgZmlsZSBuYW1lICh3aXRob3V0IGV4dGVuc2lvbilcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdCgnLycpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwubWQkL2ksICcnKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKG1ldGhvZC5wcm9wZXJ0eUtleSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gSWYgYSBwcm9wZXJ0eSBrZXkgaXMgc3BlY2lmaWVkLCBvbmx5IGNoZWNrIGxpbmtzIGluIHRoYXQgbWV0YWRhdGEgZmllbGRcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChmcm9udG1hdHRlclttZXRob2QucHJvcGVydHlLZXldKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHByb3BWYWx1ZSA9IFN0cmluZyhmcm9udG1hdHRlclttZXRob2QucHJvcGVydHlLZXldKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5rIGlzIG1lbnRpb25lZCBpbiB0aGUgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHByb3BWYWx1ZS5pbmNsdWRlcyhgW1ske2xpbmtlZE5vdGV9XV1gKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEZpcnN0IHRyeSB0byB1c2UgdGl0bGUgb3IgbmFtZSBmcm9tIGZyb250bWF0dGVyIGFzIHByb2plY3QgbmFtZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChmcm9udG1hdHRlci50aXRsZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIFN0cmluZyhmcm9udG1hdHRlci50aXRsZSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChmcm9udG1hdHRlci5uYW1lKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nKGZyb250bWF0dGVyLm5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBGYWxsYmFjazogdXNlIHRoZSBmaWxlIG5hbWUgKHdpdGhvdXQgZXh0ZW5zaW9uKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoJy8nKS5wb3AoKSB8fCBmaWxlUGF0aDtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwubWQkL2ksICcnKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBObyBmaWx0ZXIgYW5kIG5vIHNwZWNpZmljIHByb3BlcnR5LCB1c2UgZmlyc3QgbGluayBhcyBwcm9qZWN0XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBGaXJzdCB0cnkgdG8gdXNlIHRpdGxlIG9yIG5hbWUgZnJvbSBmcm9udG1hdHRlciBhcyBwcm9qZWN0IG5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChmcm9udG1hdHRlci50aXRsZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nKGZyb250bWF0dGVyLnRpdGxlKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGlmIChmcm9udG1hdHRlci5uYW1lKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBTdHJpbmcoZnJvbnRtYXR0ZXIubmFtZSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBGYWxsYmFjazogdXNlIHRoZSBmaWxlIG5hbWUgKHdpdGhvdXQgZXh0ZW5zaW9uKVxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBmaWxlUGF0aC5zcGxpdCgnLycpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLm1kJC9pLCAnJyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IHRhZ3MgZnJvbSBmcm9udG1hdHRlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdFRhZ3MoXHJcblx0XHRmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZFxyXG5cdCk6IHN0cmluZ1tdIHtcclxuXHRcdGlmICghZnJvbnRtYXR0ZXIpIHJldHVybiBbXTtcclxuXHJcblx0XHRjb25zdCB0YWdzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgZnJvbSB0YWdzIGZpZWxkXHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIudGFncykge1xyXG5cdFx0XHRpZiAoQXJyYXkuaXNBcnJheShmcm9udG1hdHRlci50YWdzKSkge1xyXG5cdFx0XHRcdHRhZ3MucHVzaCguLi5mcm9udG1hdHRlci50YWdzLm1hcCgodGFnKSA9PiBTdHJpbmcodGFnKSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRhZ3MucHVzaChTdHJpbmcoZnJvbnRtYXR0ZXIudGFncykpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBmcm9tIHRhZyBmaWVsZCAoc2luZ3VsYXIpXHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIudGFnKSB7XHJcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KGZyb250bWF0dGVyLnRhZykpIHtcclxuXHRcdFx0XHR0YWdzLnB1c2goLi4uZnJvbnRtYXR0ZXIudGFnLm1hcCgodGFnKSA9PiBTdHJpbmcodGFnKSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRhZ3MucHVzaChTdHJpbmcoZnJvbnRtYXR0ZXIudGFnKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGFncztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGRhdGUgZnJvbSB2YXJpb3VzIGZvcm1hdHNcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlRGF0ZShkYXRlVmFsdWU6IGFueSk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoIWRhdGVWYWx1ZSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAodHlwZW9mIGRhdGVWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG5cdFx0XHRyZXR1cm4gZGF0ZVZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdGNvbnN0IHBhcnNlZCA9IERhdGUucGFyc2UoZGF0ZVZhbHVlKTtcclxuXHRcdFx0cmV0dXJuIGlzTmFOKHBhcnNlZCkgPyB1bmRlZmluZWQgOiBwYXJzZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRhdGVWYWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcclxuXHRcdFx0cmV0dXJuIGRhdGVWYWx1ZS5nZXRUaW1lKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIHByaW9yaXR5IGZyb20gdmFyaW91cyBmb3JtYXRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZVByaW9yaXR5KHByaW9yaXR5VmFsdWU6IGFueSk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAodHlwZW9mIHByaW9yaXR5VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWF4KDEsIE1hdGgubWluKDMsIE1hdGgucm91bmQocHJpb3JpdHlWYWx1ZSkpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodHlwZW9mIHByaW9yaXR5VmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0Y29uc3QgbnVtID0gcGFyc2VJbnQocHJpb3JpdHlWYWx1ZSwgMTApO1xyXG5cdFx0XHRpZiAoIWlzTmFOKG51bSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oMywgbnVtKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSB0ZXh0IHByaW9yaXRpZXNcclxuXHRcdFx0Y29uc3QgbG93ZXIgPSBwcmlvcml0eVZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGlmIChsb3dlci5pbmNsdWRlcyhcImhpZ2hcIikgfHwgbG93ZXIuaW5jbHVkZXMoXCJ1cmdlbnRcIikpIHJldHVybiAzO1xyXG5cdFx0XHRpZiAobG93ZXIuaW5jbHVkZXMoXCJtZWRpdW1cIikgfHwgbG93ZXIuaW5jbHVkZXMoXCJub3JtYWxcIikpIHJldHVybiAyO1xyXG5cdFx0XHRpZiAobG93ZXIuaW5jbHVkZXMoXCJsb3dcIikpIHJldHVybiAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG59XHJcbiJdfQ==