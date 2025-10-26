/**
 * File Metadata Task Updater
 * Handles updating tasks that were created from file metadata and tags
 */
import { __awaiter } from "tslib";
import { TFile } from "obsidian";
export class FileMetadataTaskUpdater {
    constructor(app, config) {
        this.app = app;
        this.vault = app.vault;
        this.config = config;
    }
    /**
     * Update a task that was created from file metadata
     */
    updateFileMetadataTask(originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if this is a file metadata task
                if (!this.isFileMetadataTask(originalTask)) {
                    return {
                        success: false,
                        error: "Task is not a file metadata task",
                    };
                }
                const file = this.vault.getFileByPath(originalTask.filePath);
                if (!(file instanceof TFile)) {
                    return {
                        success: false,
                        error: `File not found: ${originalTask.filePath}`,
                    };
                }
                // Handle different types of file metadata tasks
                if (originalTask.metadata.source ===
                    "file-metadata") {
                    return yield this.updateMetadataFieldTask(file, originalTask, updatedTask);
                }
                else if (originalTask.metadata.source ===
                    "file-tag") {
                    return yield this.updateTagTask(file, originalTask, updatedTask);
                }
                return {
                    success: false,
                    error: "Unknown file metadata task type",
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error updating file metadata task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Check if a task is a file metadata task
     */
    isFileMetadataTask(task) {
        return (task.metadata.source ===
            "file-metadata" ||
            task.metadata.source === "file-tag");
    }
    /**
     * Update a task created from a metadata field
     */
    updateMetadataFieldTask(file, originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sourceField = originalTask.metadata.sourceField;
                if (!sourceField) {
                    return {
                        success: false,
                        error: "No source field found for metadata task",
                    };
                }
                // Read current file content
                const content = yield this.vault.read(file);
                const frontmatterUpdates = {};
                // Handle content changes (file renaming)
                if (updatedTask.content !== originalTask.content) {
                    yield this.updateFileName(file, updatedTask.content);
                }
                // Handle status changes
                if (updatedTask.status !== originalTask.status ||
                    updatedTask.completed !== originalTask.completed) {
                    frontmatterUpdates[sourceField] =
                        this.convertStatusToMetadataValue(sourceField, updatedTask.status, updatedTask.completed);
                }
                // Handle metadata changes
                if (this.hasMetadataChanges(originalTask, updatedTask)) {
                    const metadataUpdates = this.extractMetadataUpdates(originalTask, updatedTask);
                    Object.assign(frontmatterUpdates, metadataUpdates);
                }
                // Apply frontmatter updates if any
                if (Object.keys(frontmatterUpdates).length > 0) {
                    yield this.updateFrontmatter(file, frontmatterUpdates);
                }
                return { success: true };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error updating metadata field task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Update a task created from a file tag
     */
    updateTagTask(file, originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Handle content changes (file renaming)
                if (updatedTask.content !== originalTask.content) {
                    yield this.updateFileName(file, updatedTask.content);
                }
                // For tag-based tasks, we can update the frontmatter metadata
                // but we don't modify the tags themselves as they might be used for other purposes
                const frontmatterUpdates = {};
                // Handle metadata changes
                if (this.hasMetadataChanges(originalTask, updatedTask)) {
                    const metadataUpdates = this.extractMetadataUpdates(originalTask, updatedTask);
                    Object.assign(frontmatterUpdates, metadataUpdates);
                }
                // For status changes in tag-based tasks, we could add a completion field
                if (updatedTask.completed !== originalTask.completed) {
                    frontmatterUpdates.completed = updatedTask.completed;
                }
                // Apply frontmatter updates if any
                if (Object.keys(frontmatterUpdates).length > 0) {
                    yield this.updateFrontmatter(file, frontmatterUpdates);
                }
                return { success: true };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error updating tag task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Update file name when task content changes
     */
    updateFileName(file, newContent) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentPath = file.path;
                const lastSlashIndex = currentPath.lastIndexOf("/");
                const directory = lastSlashIndex > 0
                    ? currentPath.substring(0, lastSlashIndex)
                    : "";
                const extension = currentPath.substring(currentPath.lastIndexOf("."));
                // Ensure newContent doesn't already have the extension
                let cleanContent = newContent;
                if (cleanContent.endsWith(extension)) {
                    cleanContent = cleanContent.substring(0, cleanContent.length - extension.length);
                }
                // Sanitize filename
                const sanitizedContent = cleanContent.replace(/[<>:"/\\|?*]/g, "_");
                const newPath = directory
                    ? `${directory}/${sanitizedContent}${extension}`
                    : `${sanitizedContent}${extension}`;
                if (newPath !== currentPath) {
                    yield this.vault.rename(file, newPath);
                }
            }
            catch (error) {
                console.error("Error updating file name:", error);
                throw error;
            }
        });
    }
    /**
     * Update frontmatter metadata
     */
    updateFrontmatter(file, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                    Object.assign(frontmatter, updates);
                });
            }
            catch (error) {
                console.error("Error updating frontmatter:", error);
                throw error;
            }
        });
    }
    /**
     * Convert task status back to metadata value
     */
    convertStatusToMetadataValue(fieldName, status, completed) {
        // If field name suggests completion
        if (fieldName.toLowerCase().includes("complete") ||
            fieldName.toLowerCase().includes("done")) {
            return completed;
        }
        // If field name suggests todo/task
        if (fieldName.toLowerCase().includes("todo") ||
            fieldName.toLowerCase().includes("task")) {
            return completed;
        }
        // For other fields, return the status character
        return status;
    }
    /**
     * Check if there are metadata changes
     */
    hasMetadataChanges(originalTask, updatedTask) {
        const metadataFields = [
            "dueDate",
            "startDate",
            "scheduledDate",
            "priority",
            "project",
            "context",
            "area",
        ];
        return metadataFields.some((field) => {
            const originalValue = originalTask.metadata[field];
            const updatedValue = updatedTask.metadata[field];
            return originalValue !== updatedValue;
        });
    }
    /**
     * Extract metadata updates
     */
    extractMetadataUpdates(originalTask, updatedTask) {
        const updates = {};
        const metadataFields = [
            "dueDate",
            "startDate",
            "scheduledDate",
            "priority",
            "project",
            "context",
            "area",
        ];
        metadataFields.forEach((field) => {
            const originalValue = originalTask.metadata[field];
            const updatedValue = updatedTask.metadata[field];
            if (originalValue !== updatedValue) {
                if (field.includes("Date") &&
                    typeof updatedValue === "number") {
                    // Convert timestamp back to date string
                    updates[field] = new Date(updatedValue)
                        .toISOString()
                        .split("T")[0];
                }
                else {
                    updates[field] = updatedValue;
                }
            }
        });
        return updates;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS11cGRhdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZS1tZXRhZGF0YS11cGRhdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFFSCxPQUFPLEVBQU8sS0FBSyxFQUFTLE1BQU0sVUFBVSxDQUFDO0FBUzdDLE1BQU0sT0FBTyx1QkFBdUI7SUFLbkMsWUFBWSxHQUFRLEVBQUUsTUFBZ0M7UUFDckQsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0csc0JBQXNCLENBQzNCLFlBQWtCLEVBQ2xCLFdBQWlCOztZQUVqQixJQUFJO2dCQUNILHdDQUF3QztnQkFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRTtvQkFDM0MsT0FBTzt3QkFDTixPQUFPLEVBQUUsS0FBSzt3QkFDZCxLQUFLLEVBQUUsa0NBQWtDO3FCQUN6QyxDQUFDO2lCQUNGO2dCQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLEtBQUssQ0FBQyxFQUFFO29CQUM3QixPQUFPO3dCQUNOLE9BQU8sRUFBRSxLQUFLO3dCQUNkLEtBQUssRUFBRSxtQkFBbUIsWUFBWSxDQUFDLFFBQVEsRUFBRTtxQkFDakQsQ0FBQztpQkFDRjtnQkFFRCxnREFBZ0Q7Z0JBQ2hELElBQ0UsWUFBWSxDQUFDLFFBQXFDLENBQUMsTUFBTTtvQkFDMUQsZUFBZSxFQUNkO29CQUNELE9BQU8sTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQ3hDLElBQUksRUFDSixZQUFZLEVBQ1os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QUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGaWxlIE1ldGFkYXRhIFRhc2sgVXBkYXRlclxyXG4gKiBIYW5kbGVzIHVwZGF0aW5nIHRhc2tzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gZmlsZSBtZXRhZGF0YSBhbmQgdGFnc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFwcCwgVEZpbGUsIFZhdWx0IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSwgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IEZpbGVQYXJzaW5nQ29uZmlndXJhdGlvbiB9IGZyb20gXCIuLi9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVNZXRhZGF0YVVwZGF0ZVJlc3VsdCB7XHJcblx0c3VjY2VzczogYm9vbGVhbjtcclxuXHRlcnJvcj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVNZXRhZGF0YVRhc2tVcGRhdGVyIHtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHByaXZhdGUgdmF1bHQ6IFZhdWx0O1xyXG5cdHByaXZhdGUgY29uZmlnOiBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb247XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBjb25maWc6IEZpbGVQYXJzaW5nQ29uZmlndXJhdGlvbikge1xyXG5cdFx0dGhpcy5hcHAgPSBhcHA7XHJcblx0XHR0aGlzLnZhdWx0ID0gYXBwLnZhdWx0O1xyXG5cdFx0dGhpcy5jb25maWcgPSBjb25maWc7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSB0YXNrIHRoYXQgd2FzIGNyZWF0ZWQgZnJvbSBmaWxlIG1ldGFkYXRhXHJcblx0ICovXHJcblx0YXN5bmMgdXBkYXRlRmlsZU1ldGFkYXRhVGFzayhcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogUHJvbWlzZTxGaWxlTWV0YWRhdGFVcGRhdGVSZXN1bHQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBmaWxlIG1ldGFkYXRhIHRhc2tcclxuXHRcdFx0aWYgKCF0aGlzLmlzRmlsZU1ldGFkYXRhVGFzayhvcmlnaW5hbFRhc2spKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IFwiVGFzayBpcyBub3QgYSBmaWxlIG1ldGFkYXRhIHRhc2tcIixcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKG9yaWdpbmFsVGFzay5maWxlUGF0aCk7XHJcblx0XHRcdGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogYEZpbGUgbm90IGZvdW5kOiAke29yaWdpbmFsVGFzay5maWxlUGF0aH1gLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBkaWZmZXJlbnQgdHlwZXMgb2YgZmlsZSBtZXRhZGF0YSB0YXNrc1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZSA9PT1cclxuXHRcdFx0XHRcImZpbGUtbWV0YWRhdGFcIlxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy51cGRhdGVNZXRhZGF0YUZpZWxkVGFzayhcclxuXHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0KG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZSA9PT1cclxuXHRcdFx0XHRcImZpbGUtdGFnXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMudXBkYXRlVGFnVGFzayhcclxuXHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IFwiVW5rbm93biBmaWxlIG1ldGFkYXRhIHRhc2sgdHlwZVwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIHVwZGF0aW5nIGZpbGUgbWV0YWRhdGEgdGFzazogJHtlcnJvci5tZXNzYWdlfWAsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHRhc2sgaXMgYSBmaWxlIG1ldGFkYXRhIHRhc2tcclxuXHQgKi9cclxuXHRpc0ZpbGVNZXRhZGF0YVRhc2sodGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0KHRhc2subWV0YWRhdGEgYXMgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhKS5zb3VyY2UgPT09XHJcblx0XHRcdFx0XCJmaWxlLW1ldGFkYXRhXCIgfHxcclxuXHRcdFx0KHRhc2subWV0YWRhdGEgYXMgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhKS5zb3VyY2UgPT09IFwiZmlsZS10YWdcIlxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIHRhc2sgY3JlYXRlZCBmcm9tIGEgbWV0YWRhdGEgZmllbGRcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZU1ldGFkYXRhRmllbGRUYXNrKFxyXG5cdFx0ZmlsZTogVEZpbGUsXHJcblx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdCk6IFByb21pc2U8RmlsZU1ldGFkYXRhVXBkYXRlUmVzdWx0PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBzb3VyY2VGaWVsZCA9IChcclxuXHRcdFx0XHRvcmlnaW5hbFRhc2subWV0YWRhdGEgYXMgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhXHJcblx0XHRcdCkuc291cmNlRmllbGQ7XHJcblx0XHRcdGlmICghc291cmNlRmllbGQpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogXCJObyBzb3VyY2UgZmllbGQgZm91bmQgZm9yIG1ldGFkYXRhIHRhc2tcIixcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIGN1cnJlbnQgZmlsZSBjb250ZW50XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LnJlYWQoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGZyb250bWF0dGVyVXBkYXRlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIGNvbnRlbnQgY2hhbmdlcyAoZmlsZSByZW5hbWluZylcclxuXHRcdFx0aWYgKHVwZGF0ZWRUYXNrLmNvbnRlbnQgIT09IG9yaWdpbmFsVGFzay5jb250ZW50KSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVGaWxlTmFtZShmaWxlLCB1cGRhdGVkVGFzay5jb250ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIHN0YXR1cyBjaGFuZ2VzXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgIT09IG9yaWdpbmFsVGFzay5zdGF0dXMgfHxcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5jb21wbGV0ZWQgIT09IG9yaWdpbmFsVGFzay5jb21wbGV0ZWRcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXJVcGRhdGVzW3NvdXJjZUZpZWxkXSA9XHJcblx0XHRcdFx0XHR0aGlzLmNvbnZlcnRTdGF0dXNUb01ldGFkYXRhVmFsdWUoXHJcblx0XHRcdFx0XHRcdHNvdXJjZUZpZWxkLFxyXG5cdFx0XHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMsXHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbXBsZXRlZFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIG1ldGFkYXRhIGNoYW5nZXNcclxuXHRcdFx0aWYgKHRoaXMuaGFzTWV0YWRhdGFDaGFuZ2VzKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spKSB7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGFVcGRhdGVzID0gdGhpcy5leHRyYWN0TWV0YWRhdGFVcGRhdGVzKFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2tcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdE9iamVjdC5hc3NpZ24oZnJvbnRtYXR0ZXJVcGRhdGVzLCBtZXRhZGF0YVVwZGF0ZXMpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSBmcm9udG1hdHRlciB1cGRhdGVzIGlmIGFueVxyXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoZnJvbnRtYXR0ZXJVcGRhdGVzKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVGcm9udG1hdHRlcihmaWxlLCBmcm9udG1hdHRlclVwZGF0ZXMpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgRXJyb3IgdXBkYXRpbmcgbWV0YWRhdGEgZmllbGQgdGFzazogJHtlcnJvci5tZXNzYWdlfWAsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSB0YXNrIGNyZWF0ZWQgZnJvbSBhIGZpbGUgdGFnXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVUYWdUYXNrKFxyXG5cdFx0ZmlsZTogVEZpbGUsXHJcblx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdCk6IFByb21pc2U8RmlsZU1ldGFkYXRhVXBkYXRlUmVzdWx0PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBIYW5kbGUgY29udGVudCBjaGFuZ2VzIChmaWxlIHJlbmFtaW5nKVxyXG5cdFx0XHRpZiAodXBkYXRlZFRhc2suY29udGVudCAhPT0gb3JpZ2luYWxUYXNrLmNvbnRlbnQpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZUZpbGVOYW1lKGZpbGUsIHVwZGF0ZWRUYXNrLmNvbnRlbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGb3IgdGFnLWJhc2VkIHRhc2tzLCB3ZSBjYW4gdXBkYXRlIHRoZSBmcm9udG1hdHRlciBtZXRhZGF0YVxyXG5cdFx0XHQvLyBidXQgd2UgZG9uJ3QgbW9kaWZ5IHRoZSB0YWdzIHRoZW1zZWx2ZXMgYXMgdGhleSBtaWdodCBiZSB1c2VkIGZvciBvdGhlciBwdXJwb3Nlc1xyXG5cdFx0XHRjb25zdCBmcm9udG1hdHRlclVwZGF0ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBtZXRhZGF0YSBjaGFuZ2VzXHJcblx0XHRcdGlmICh0aGlzLmhhc01ldGFkYXRhQ2hhbmdlcyhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSkge1xyXG5cdFx0XHRcdGNvbnN0IG1ldGFkYXRhVXBkYXRlcyA9IHRoaXMuZXh0cmFjdE1ldGFkYXRhVXBkYXRlcyhcclxuXHRcdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRPYmplY3QuYXNzaWduKGZyb250bWF0dGVyVXBkYXRlcywgbWV0YWRhdGFVcGRhdGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRm9yIHN0YXR1cyBjaGFuZ2VzIGluIHRhZy1iYXNlZCB0YXNrcywgd2UgY291bGQgYWRkIGEgY29tcGxldGlvbiBmaWVsZFxyXG5cdFx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkICE9PSBvcmlnaW5hbFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXJVcGRhdGVzLmNvbXBsZXRlZCA9IHVwZGF0ZWRUYXNrLmNvbXBsZXRlZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXBwbHkgZnJvbnRtYXR0ZXIgdXBkYXRlcyBpZiBhbnlcclxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKGZyb250bWF0dGVyVXBkYXRlcykubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMudXBkYXRlRnJvbnRtYXR0ZXIoZmlsZSwgZnJvbnRtYXR0ZXJVcGRhdGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIHVwZGF0aW5nIHRhZyB0YXNrOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBmaWxlIG5hbWUgd2hlbiB0YXNrIGNvbnRlbnQgY2hhbmdlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlRmlsZU5hbWUoXHJcblx0XHRmaWxlOiBURmlsZSxcclxuXHRcdG5ld0NvbnRlbnQ6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY3VycmVudFBhdGggPSBmaWxlLnBhdGg7XHJcblx0XHRcdGNvbnN0IGxhc3RTbGFzaEluZGV4ID0gY3VycmVudFBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xyXG5cdFx0XHRjb25zdCBkaXJlY3RvcnkgPVxyXG5cdFx0XHRcdGxhc3RTbGFzaEluZGV4ID4gMFxyXG5cdFx0XHRcdFx0PyBjdXJyZW50UGF0aC5zdWJzdHJpbmcoMCwgbGFzdFNsYXNoSW5kZXgpXHJcblx0XHRcdFx0XHQ6IFwiXCI7XHJcblx0XHRcdGNvbnN0IGV4dGVuc2lvbiA9IGN1cnJlbnRQYXRoLnN1YnN0cmluZyhcclxuXHRcdFx0XHRjdXJyZW50UGF0aC5sYXN0SW5kZXhPZihcIi5cIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSBuZXdDb250ZW50IGRvZXNuJ3QgYWxyZWFkeSBoYXZlIHRoZSBleHRlbnNpb25cclxuXHRcdFx0bGV0IGNsZWFuQ29udGVudCA9IG5ld0NvbnRlbnQ7XHJcblx0XHRcdGlmIChjbGVhbkNvbnRlbnQuZW5kc1dpdGgoZXh0ZW5zaW9uKSkge1xyXG5cdFx0XHRcdGNsZWFuQ29udGVudCA9IGNsZWFuQ29udGVudC5zdWJzdHJpbmcoXHJcblx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0Y2xlYW5Db250ZW50Lmxlbmd0aCAtIGV4dGVuc2lvbi5sZW5ndGhcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTYW5pdGl6ZSBmaWxlbmFtZVxyXG5cdFx0XHRjb25zdCBzYW5pdGl6ZWRDb250ZW50ID0gY2xlYW5Db250ZW50LnJlcGxhY2UoL1s8PjpcIi9cXFxcfD8qXS9nLCBcIl9cIik7XHJcblx0XHRcdGNvbnN0IG5ld1BhdGggPSBkaXJlY3RvcnlcclxuXHRcdFx0XHQ/IGAke2RpcmVjdG9yeX0vJHtzYW5pdGl6ZWRDb250ZW50fSR7ZXh0ZW5zaW9ufWBcclxuXHRcdFx0XHQ6IGAke3Nhbml0aXplZENvbnRlbnR9JHtleHRlbnNpb259YDtcclxuXHJcblx0XHRcdGlmIChuZXdQYXRoICE9PSBjdXJyZW50UGF0aCkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMudmF1bHQucmVuYW1lKGZpbGUsIG5ld1BhdGgpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgdXBkYXRpbmcgZmlsZSBuYW1lOlwiLCBlcnJvcik7XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGZyb250bWF0dGVyIG1ldGFkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVGcm9udG1hdHRlcihcclxuXHRcdGZpbGU6IFRGaWxlLFxyXG5cdFx0dXBkYXRlczogUmVjb3JkPHN0cmluZywgYW55PlxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKFxyXG5cdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0KGZyb250bWF0dGVyKSA9PiB7XHJcblx0XHRcdFx0XHRPYmplY3QuYXNzaWduKGZyb250bWF0dGVyLCB1cGRhdGVzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgdXBkYXRpbmcgZnJvbnRtYXR0ZXI6XCIsIGVycm9yKTtcclxuXHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IHRhc2sgc3RhdHVzIGJhY2sgdG8gbWV0YWRhdGEgdmFsdWVcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbnZlcnRTdGF0dXNUb01ldGFkYXRhVmFsdWUoXHJcblx0XHRmaWVsZE5hbWU6IHN0cmluZyxcclxuXHRcdHN0YXR1czogc3RyaW5nLFxyXG5cdFx0Y29tcGxldGVkOiBib29sZWFuXHJcblx0KTogYW55IHtcclxuXHRcdC8vIElmIGZpZWxkIG5hbWUgc3VnZ2VzdHMgY29tcGxldGlvblxyXG5cdFx0aWYgKFxyXG5cdFx0XHRmaWVsZE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImNvbXBsZXRlXCIpIHx8XHJcblx0XHRcdGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiZG9uZVwiKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBjb21wbGV0ZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgZmllbGQgbmFtZSBzdWdnZXN0cyB0b2RvL3Rhc2tcclxuXHRcdGlmIChcclxuXHRcdFx0ZmllbGROYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJ0b2RvXCIpIHx8XHJcblx0XHRcdGZpZWxkTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwidGFza1wiKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBjb21wbGV0ZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIG90aGVyIGZpZWxkcywgcmV0dXJuIHRoZSBzdGF0dXMgY2hhcmFjdGVyXHJcblx0XHRyZXR1cm4gc3RhdHVzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdGhlcmUgYXJlIG1ldGFkYXRhIGNoYW5nZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhc01ldGFkYXRhQ2hhbmdlcyhvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBtZXRhZGF0YUZpZWxkcyA9IFtcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcInByaW9yaXR5XCIsXHJcblx0XHRcdFwicHJvamVjdFwiLFxyXG5cdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XCJhcmVhXCIsXHJcblx0XHRdIGFzIGNvbnN0O1xyXG5cclxuXHRcdHJldHVybiBtZXRhZGF0YUZpZWxkcy5zb21lKChmaWVsZCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZhbHVlID0gKG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBhbnkpW2ZpZWxkXTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFZhbHVlID0gKHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSlbZmllbGRdO1xyXG5cdFx0XHRyZXR1cm4gb3JpZ2luYWxWYWx1ZSAhPT0gdXBkYXRlZFZhbHVlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IG1ldGFkYXRhIHVwZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RNZXRhZGF0YVVwZGF0ZXMoXHJcblx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG5cdFx0Y29uc3QgdXBkYXRlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cdFx0Y29uc3QgbWV0YWRhdGFGaWVsZHMgPSBbXHJcblx0XHRcdFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcInByb2plY3RcIixcclxuXHRcdFx0XCJjb250ZXh0XCIsXHJcblx0XHRcdFwiYXJlYVwiLFxyXG5cdFx0XSBhcyBjb25zdDtcclxuXHJcblx0XHRtZXRhZGF0YUZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZhbHVlID0gKG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBhbnkpW2ZpZWxkXTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFZhbHVlID0gKHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSlbZmllbGRdO1xyXG5cclxuXHRcdFx0aWYgKG9yaWdpbmFsVmFsdWUgIT09IHVwZGF0ZWRWYWx1ZSkge1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGZpZWxkLmluY2x1ZGVzKFwiRGF0ZVwiKSAmJlxyXG5cdFx0XHRcdFx0dHlwZW9mIHVwZGF0ZWRWYWx1ZSA9PT0gXCJudW1iZXJcIlxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gQ29udmVydCB0aW1lc3RhbXAgYmFjayB0byBkYXRlIHN0cmluZ1xyXG5cdFx0XHRcdFx0dXBkYXRlc1tmaWVsZF0gPSBuZXcgRGF0ZSh1cGRhdGVkVmFsdWUpXHJcblx0XHRcdFx0XHRcdC50b0lTT1N0cmluZygpXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIlRcIilbMF07XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHVwZGF0ZXNbZmllbGRdID0gdXBkYXRlZFZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHVwZGF0ZXM7XHJcblx0fVxyXG59XHJcbiJdfQ==