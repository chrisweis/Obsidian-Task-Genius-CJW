import { __awaiter } from "tslib";
import { BaseActionExecutor } from "./base-executor";
import { OnCompletionActionType, } from "../../types/onCompletion";
/**
 * Executor for archive action - moves the completed task to an archive file
 */
export class ArchiveActionExecutor extends BaseActionExecutor {
    constructor() {
        super(...arguments);
        this.DEFAULT_ARCHIVE_FILE = "Archive/Completed Tasks.md";
        this.DEFAULT_ARCHIVE_SECTION = "Completed Tasks";
    }
    /**
     * Execute archive action for Canvas tasks
     */
    executeForCanvas(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const archiveConfig = config;
            const { task, app } = context;
            console.log("executeForCanvas", context, config, task);
            try {
                // Get task content as markdown and clean it
                let taskContent = task.originalMarkdown ||
                    `- [${task.completed ? "x" : " "}] ${task.content}`;
                // Clean onCompletion metadata and ensure task is marked as completed
                taskContent = this.removeOnCompletionMetadata(taskContent);
                taskContent = this.ensureTaskIsCompleted(taskContent);
                // Archive to Markdown file FIRST (before deleting from source)
                const archiveFile = archiveConfig.archiveFile || this.DEFAULT_ARCHIVE_FILE;
                const archiveSection = archiveConfig.archiveSection || this.DEFAULT_ARCHIVE_SECTION;
                const archiveResult = yield this.addTaskToArchiveFile(app, taskContent, archiveFile, archiveSection, context);
                if (!archiveResult.success) {
                    return this.createErrorResult(archiveResult.error || "Failed to archive Canvas task");
                }
                // Only delete from Canvas source AFTER successful archiving
                const canvasUpdater = this.getCanvasTaskUpdater(context);
                const deleteResult = yield canvasUpdater.deleteCanvasTask(task);
                if (!deleteResult.success) {
                    // Archive succeeded but deletion failed - this is less critical
                    // The task is safely archived, just not removed from source
                    return this.createErrorResult(`Task archived successfully to ${archiveFile}, but failed to remove from Canvas: ${deleteResult.error}`);
                }
                return this.createSuccessResult(`Task archived from Canvas to ${archiveFile}`);
            }
            catch (error) {
                return this.createErrorResult(`Error archiving Canvas task: ${error.message}`);
            }
        });
    }
    /**
     * Execute archive action for Markdown tasks
     */
    executeForMarkdown(context, config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const archiveConfig = config;
            const { task, app, plugin } = context;
            try {
                // Determine archive file path
                const archiveFilePath = archiveConfig.archiveFile ||
                    ((_a = plugin.settings.onCompletion) === null || _a === void 0 ? void 0 : _a.defaultArchiveFile) ||
                    this.DEFAULT_ARCHIVE_FILE;
                // Determine archive section
                const archiveSection = archiveConfig.archiveSection || this.DEFAULT_ARCHIVE_SECTION;
                // Get the source file containing the task
                const sourceFile = app.vault.getFileByPath(task.filePath);
                if (!sourceFile) {
                    return this.createErrorResult(`Source file not found: ${task.filePath}`);
                }
                // Get or create the archive file
                let archiveFile = app.vault.getFileByPath(archiveFilePath);
                if (!archiveFile) {
                    // Try to create the archive file if it doesn't exist
                    try {
                        // Ensure the directory exists
                        const dirPath = archiveFilePath.substring(0, archiveFilePath.lastIndexOf("/"));
                        if (dirPath && !app.vault.getAbstractFileByPath(dirPath)) {
                            yield app.vault.createFolder(dirPath);
                        }
                        archiveFile = yield app.vault.create(archiveFilePath, `# Archive\n\n## ${archiveSection}\n\n`);
                    }
                    catch (error) {
                        return this.createErrorResult(`Failed to create archive file: ${archiveFilePath}`);
                    }
                }
                // Read source and archive file contents
                const sourceContent = yield app.vault.read(sourceFile);
                const archiveContent = yield app.vault.read(archiveFile);
                const sourceLines = sourceContent.split("\n");
                const archiveLines = archiveContent.split("\n");
                // Find and extract the task line from source
                if (task.line === undefined || task.line >= sourceLines.length) {
                    return this.createErrorResult("Task line not found in source file");
                }
                let taskLine = sourceLines[task.line];
                // Clean onCompletion metadata and ensure task is marked as completed
                taskLine = this.removeOnCompletionMetadata(taskLine);
                taskLine = this.ensureTaskIsCompleted(taskLine);
                // Add timestamp and source info to the task line
                const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
                const sourceInfo = `(from ${task.filePath})`;
                const completionMarker = this.getCompletionMarker(context, timestamp);
                const archivedTaskLine = `${taskLine} ${completionMarker} ${sourceInfo}`;
                // Remove the task from source file
                sourceLines.splice(task.line, 1);
                // Add the task to archive file
                const sectionIndex = archiveLines.findIndex((line) => line.trim().startsWith("#") && line.includes(archiveSection));
                if (sectionIndex !== -1) {
                    // Find the next section or end of file
                    let insertIndex = archiveLines.length;
                    for (let i = sectionIndex + 1; i < archiveLines.length; i++) {
                        if (archiveLines[i].trim().startsWith("#")) {
                            insertIndex = i;
                            break;
                        }
                    }
                    // Insert before the next section or at the end
                    archiveLines.splice(insertIndex, 0, archivedTaskLine);
                }
                else {
                    // Section not found, create it and add the task
                    archiveLines.push("", `## ${archiveSection}`, archivedTaskLine);
                }
                // Write updated contents back to files
                yield app.vault.modify(sourceFile, sourceLines.join("\n"));
                yield app.vault.modify(archiveFile, archiveLines.join("\n"));
                return this.createSuccessResult(`Task archived to ${archiveFilePath} (section: ${archiveSection})`);
            }
            catch (error) {
                return this.createErrorResult(`Failed to archive task: ${error.message}`);
            }
        });
    }
    /**
     * Add a task to the archive file
     */
    addTaskToArchiveFile(app, taskContent, archiveFilePath, archiveSection, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get or create the archive file
                let archiveFile = app.vault.getFileByPath(archiveFilePath);
                console.log("archiveFile", archiveFile, archiveFilePath);
                if (!archiveFile) {
                    // Try to create the archive file if it doesn't exist
                    try {
                        // Ensure the directory exists
                        const dirPath = archiveFilePath.substring(0, archiveFilePath.lastIndexOf("/"));
                        if (dirPath && !app.vault.getAbstractFileByPath(dirPath)) {
                            yield app.vault.createFolder(dirPath);
                        }
                        archiveFile = yield app.vault.create(archiveFilePath, `# Archive\n\n## ${archiveSection}\n\n`);
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `Failed to create archive file: ${archiveFilePath}`,
                        };
                    }
                }
                // Read archive file content
                const archiveContent = yield app.vault.read(archiveFile);
                const archiveLines = archiveContent.split("\n");
                // Add timestamp using preferMetadataFormat
                const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
                const completionMarker = this.getCompletionMarker(context, timestamp);
                const archivedTaskLine = `${taskContent} ${completionMarker}`;
                // Add the task to archive file
                const sectionIndex = archiveLines.findIndex((line) => line.trim().startsWith("#") && line.includes(archiveSection));
                if (sectionIndex !== -1) {
                    // Find the next section or end of file
                    let insertIndex = archiveLines.length;
                    for (let i = sectionIndex + 1; i < archiveLines.length; i++) {
                        if (archiveLines[i].trim().startsWith("#")) {
                            insertIndex = i;
                            break;
                        }
                    }
                    // Insert before the next section or at the end
                    archiveLines.splice(insertIndex, 0, archivedTaskLine);
                }
                else {
                    // Section not found, create it and add the task
                    archiveLines.push("", `## ${archiveSection}`, archivedTaskLine);
                }
                // Write updated archive file
                yield app.vault.modify(archiveFile, archiveLines.join("\n"));
                return { success: true };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to add task to archive: ${error.message}`,
                };
            }
        });
    }
    validateConfig(config) {
        return config.type === OnCompletionActionType.ARCHIVE;
    }
    getDescription(config) {
        const archiveConfig = config;
        const archiveFile = archiveConfig.archiveFile || this.DEFAULT_ARCHIVE_FILE;
        const archiveSection = archiveConfig.archiveSection || this.DEFAULT_ARCHIVE_SECTION;
        return `Archive task to ${archiveFile} (section: ${archiveSection})`;
    }
    /**
     * Remove onCompletion metadata from task content
     * Supports both emoji format (🏁) and dataview format ([onCompletion::])
     */
    removeOnCompletionMetadata(content) {
        let cleaned = content;
        // Remove emoji format onCompletion (🏁 value)
        // Handle simple formats first
        cleaned = cleaned.replace(/🏁\s+[^\s{]+/g, "");
        // Handle JSON format in emoji notation (🏁 {"type": "move", ...})
        // Find and remove complete JSON objects after 🏁
        let match;
        while ((match = cleaned.match(/🏁\s*\{/)) !== null) {
            const startIndex = match.index;
            const jsonStart = cleaned.indexOf("{", startIndex);
            let braceCount = 0;
            let jsonEnd = jsonStart;
            for (let i = jsonStart; i < cleaned.length; i++) {
                if (cleaned[i] === "{")
                    braceCount++;
                if (cleaned[i] === "}")
                    braceCount--;
                if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                }
            }
            if (braceCount === 0) {
                // Remove the entire 🏁 + JSON object
                cleaned =
                    cleaned.substring(0, startIndex) +
                        cleaned.substring(jsonEnd + 1);
            }
            else {
                // Malformed JSON, just remove the 🏁 part
                cleaned =
                    cleaned.substring(0, startIndex) +
                        cleaned.substring(startIndex + match[0].length);
            }
        }
        // Remove dataview format onCompletion ([onCompletion:: value])
        cleaned = cleaned.replace(/\[onCompletion::\s*[^\]]*\]/gi, "");
        // Clean up extra spaces
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        return cleaned;
    }
    /**
     * Ensure task is marked as completed (change [ ] to [x])
     */
    ensureTaskIsCompleted(content) {
        // Replace any checkbox format with completed checkbox
        return content.replace(/^(\s*[-*+]\s*)\[[^\]]*\](\s*)/, "$1[x]$2");
    }
    /**
     * Get completion marker based on preferMetadataFormat setting
     */
    getCompletionMarker(context, timestamp) {
        const useDataviewFormat = context.plugin.settings.preferMetadataFormat === "dataview";
        if (useDataviewFormat) {
            return `[completion:: ${timestamp}]`;
        }
        else {
            return `✅ ${timestamp}`;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl2ZS1leGVjdXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyY2hpdmUtZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFJTixzQkFBc0IsR0FFdEIsTUFBTSwwQkFBMEIsQ0FBQztBQUVsQzs7R0FFRztBQUNILE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxrQkFBa0I7SUFBN0Q7O1FBQ2tCLHlCQUFvQixHQUFHLDRCQUE0QixDQUFDO1FBQ3BELDRCQUF1QixHQUFHLGlCQUFpQixDQUFDO0lBK1c5RCxDQUFDO0lBN1dBOztPQUVHO0lBQ2EsZ0JBQWdCLENBQy9CLE9BQXFDLEVBQ3JDLE1BQTBCOztZQUUxQixNQUFNLGFBQWEsR0FBRyxNQUFtQyxDQUFDO1lBQzFELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFDO1lBRTlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV2RCxJQUFJO2dCQUNILDRDQUE0QztnQkFDNUMsSUFBSSxXQUFXLEdBQ2QsSUFBSSxDQUFDLGdCQUFnQjtvQkFDckIsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBRXJELHFFQUFxRTtnQkFDckUsV0FBVyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDM0QsV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFdEQsK0RBQStEO2dCQUMvRCxNQUFNLFdBQVcsR0FDaEIsYUFBYSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUM7Z0JB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RyxDQUFDLENBQUMsQ0FBQzthQUNoQztpQkFBTTtnQkFDTiwwQ0FBMEM7Z0JBQzFDLE9BQU87b0JBQ04sT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO3dCQUNoQyxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDakQ7U0FDRDtRQUVELCtEQUErRDtRQUMvRCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUvRCx3QkFBd0I7UUFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTlDLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNLLHFCQUFxQixDQUFDLE9BQWU7UUFDNUMsc0RBQXNEO1FBQ3RELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUIsQ0FDMUIsT0FBcUMsRUFDckMsU0FBaUI7UUFFakIsTUFBTSxpQkFBaUIsR0FDdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEtBQUssVUFBVSxDQUFDO1FBRTdELElBQUksaUJBQWlCLEVBQUU7WUFDdEIsT0FBTyxpQkFBaUIsU0FBUyxHQUFHLENBQUM7U0FDckM7YUFBTTtZQUNOLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztTQUN4QjtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgQmFzZUFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4vYmFzZS1leGVjdXRvclwiO1xyXG5pbXBvcnQge1xyXG5cdE9uQ29tcGxldGlvbkNvbmZpZyxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdCxcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcsXHJcbn0gZnJvbSBcIi4uLy4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dG9yIGZvciBhcmNoaXZlIGFjdGlvbiAtIG1vdmVzIHRoZSBjb21wbGV0ZWQgdGFzayB0byBhbiBhcmNoaXZlIGZpbGVcclxuICovXHJcbmV4cG9ydCBjbGFzcyBBcmNoaXZlQWN0aW9uRXhlY3V0b3IgZXh0ZW5kcyBCYXNlQWN0aW9uRXhlY3V0b3Ige1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgREVGQVVMVF9BUkNISVZFX0ZJTEUgPSBcIkFyY2hpdmUvQ29tcGxldGVkIFRhc2tzLm1kXCI7XHJcblx0cHJpdmF0ZSByZWFkb25seSBERUZBVUxUX0FSQ0hJVkVfU0VDVElPTiA9IFwiQ29tcGxldGVkIFRhc2tzXCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgYXJjaGl2ZSBhY3Rpb24gZm9yIENhbnZhcyB0YXNrc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhc3luYyBleGVjdXRlRm9yQ2FudmFzKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IGFyY2hpdmVDb25maWcgPSBjb25maWcgYXMgT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZztcclxuXHRcdGNvbnN0IHsgdGFzaywgYXBwIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiZXhlY3V0ZUZvckNhbnZhc1wiLCBjb250ZXh0LCBjb25maWcsIHRhc2spO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEdldCB0YXNrIGNvbnRlbnQgYXMgbWFya2Rvd24gYW5kIGNsZWFuIGl0XHJcblx0XHRcdGxldCB0YXNrQ29udGVudCA9XHJcblx0XHRcdFx0dGFzay5vcmlnaW5hbE1hcmtkb3duIHx8XHJcblx0XHRcdFx0YC0gWyR7dGFzay5jb21wbGV0ZWQgPyBcInhcIiA6IFwiIFwifV0gJHt0YXNrLmNvbnRlbnR9YDtcclxuXHJcblx0XHRcdC8vIENsZWFuIG9uQ29tcGxldGlvbiBtZXRhZGF0YSBhbmQgZW5zdXJlIHRhc2sgaXMgbWFya2VkIGFzIGNvbXBsZXRlZFxyXG5cdFx0XHR0YXNrQ29udGVudCA9IHRoaXMucmVtb3ZlT25Db21wbGV0aW9uTWV0YWRhdGEodGFza0NvbnRlbnQpO1xyXG5cdFx0XHR0YXNrQ29udGVudCA9IHRoaXMuZW5zdXJlVGFza0lzQ29tcGxldGVkKHRhc2tDb250ZW50KTtcclxuXHJcblx0XHRcdC8vIEFyY2hpdmUgdG8gTWFya2Rvd24gZmlsZSBGSVJTVCAoYmVmb3JlIGRlbGV0aW5nIGZyb20gc291cmNlKVxyXG5cdFx0XHRjb25zdCBhcmNoaXZlRmlsZSA9XHJcblx0XHRcdFx0YXJjaGl2ZUNvbmZpZy5hcmNoaXZlRmlsZSB8fCB0aGlzLkRFRkFVTFRfQVJDSElWRV9GSUxFO1xyXG5cdFx0XHRjb25zdCBhcmNoaXZlU2VjdGlvbiA9XHJcblx0XHRcdFx0YXJjaGl2ZUNvbmZpZy5hcmNoaXZlU2VjdGlvbiB8fCB0aGlzLkRFRkFVTFRfQVJDSElWRV9TRUNUSU9OO1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZVJlc3VsdCA9IGF3YWl0IHRoaXMuYWRkVGFza1RvQXJjaGl2ZUZpbGUoXHJcblx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdGFyY2hpdmVGaWxlLFxyXG5cdFx0XHRcdGFyY2hpdmVTZWN0aW9uLFxyXG5cdFx0XHRcdGNvbnRleHRcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghYXJjaGl2ZVJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRhcmNoaXZlUmVzdWx0LmVycm9yIHx8IFwiRmFpbGVkIHRvIGFyY2hpdmUgQ2FudmFzIHRhc2tcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE9ubHkgZGVsZXRlIGZyb20gQ2FudmFzIHNvdXJjZSBBRlRFUiBzdWNjZXNzZnVsIGFyY2hpdmluZ1xyXG5cdFx0XHRjb25zdCBjYW52YXNVcGRhdGVyID0gdGhpcy5nZXRDYW52YXNUYXNrVXBkYXRlcihjb250ZXh0KTtcclxuXHRcdFx0Y29uc3QgZGVsZXRlUmVzdWx0ID0gYXdhaXQgY2FudmFzVXBkYXRlci5kZWxldGVDYW52YXNUYXNrKHRhc2spO1xyXG5cclxuXHRcdFx0aWYgKCFkZWxldGVSZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdC8vIEFyY2hpdmUgc3VjY2VlZGVkIGJ1dCBkZWxldGlvbiBmYWlsZWQgLSB0aGlzIGlzIGxlc3MgY3JpdGljYWxcclxuXHRcdFx0XHQvLyBUaGUgdGFzayBpcyBzYWZlbHkgYXJjaGl2ZWQsIGp1c3Qgbm90IHJlbW92ZWQgZnJvbSBzb3VyY2VcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdGBUYXNrIGFyY2hpdmVkIHN1Y2Nlc3NmdWxseSB0byAke2FyY2hpdmVGaWxlfSwgYnV0IGZhaWxlZCB0byByZW1vdmUgZnJvbSBDYW52YXM6ICR7ZGVsZXRlUmVzdWx0LmVycm9yfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVTdWNjZXNzUmVzdWx0KFxyXG5cdFx0XHRcdGBUYXNrIGFyY2hpdmVkIGZyb20gQ2FudmFzIHRvICR7YXJjaGl2ZUZpbGV9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0YEVycm9yIGFyY2hpdmluZyBDYW52YXMgdGFzazogJHtlcnJvci5tZXNzYWdlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgYXJjaGl2ZSBhY3Rpb24gZm9yIE1hcmtkb3duIHRhc2tzXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGFzeW5jIGV4ZWN1dGVGb3JNYXJrZG93bihcclxuXHRcdGNvbnRleHQ6IE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0XHRjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZ1xyXG5cdCk6IFByb21pc2U8T25Db21wbGV0aW9uRXhlY3V0aW9uUmVzdWx0PiB7XHJcblx0XHRjb25zdCBhcmNoaXZlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWc7XHJcblx0XHRjb25zdCB7IHRhc2ssIGFwcCwgcGx1Z2luIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIERldGVybWluZSBhcmNoaXZlIGZpbGUgcGF0aFxyXG5cdFx0XHRjb25zdCBhcmNoaXZlRmlsZVBhdGggPVxyXG5cdFx0XHRcdGFyY2hpdmVDb25maWcuYXJjaGl2ZUZpbGUgfHxcclxuXHRcdFx0XHRwbHVnaW4uc2V0dGluZ3Mub25Db21wbGV0aW9uPy5kZWZhdWx0QXJjaGl2ZUZpbGUgfHxcclxuXHRcdFx0XHR0aGlzLkRFRkFVTFRfQVJDSElWRV9GSUxFO1xyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIGFyY2hpdmUgc2VjdGlvblxyXG5cdFx0XHRjb25zdCBhcmNoaXZlU2VjdGlvbiA9XHJcblx0XHRcdFx0YXJjaGl2ZUNvbmZpZy5hcmNoaXZlU2VjdGlvbiB8fCB0aGlzLkRFRkFVTFRfQVJDSElWRV9TRUNUSU9OO1xyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBzb3VyY2UgZmlsZSBjb250YWluaW5nIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IHNvdXJjZUZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKCFzb3VyY2VGaWxlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRgU291cmNlIGZpbGUgbm90IGZvdW5kOiAke3Rhc2suZmlsZVBhdGh9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEdldCBvciBjcmVhdGUgdGhlIGFyY2hpdmUgZmlsZVxyXG5cdFx0XHRsZXQgYXJjaGl2ZUZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChhcmNoaXZlRmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoIWFyY2hpdmVGaWxlKSB7XHJcblx0XHRcdFx0Ly8gVHJ5IHRvIGNyZWF0ZSB0aGUgYXJjaGl2ZSBmaWxlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIHRoZSBkaXJlY3RvcnkgZXhpc3RzXHJcblx0XHRcdFx0XHRjb25zdCBkaXJQYXRoID0gYXJjaGl2ZUZpbGVQYXRoLnN1YnN0cmluZyhcclxuXHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0YXJjaGl2ZUZpbGVQYXRoLmxhc3RJbmRleE9mKFwiL1wiKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChkaXJQYXRoICYmICFhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGRpclBhdGgpKSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IGFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZGlyUGF0aCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0YXJjaGl2ZUZpbGUgPSBhd2FpdCBhcHAudmF1bHQuY3JlYXRlKFxyXG5cdFx0XHRcdFx0XHRhcmNoaXZlRmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdGAjIEFyY2hpdmVcXG5cXG4jIyAke2FyY2hpdmVTZWN0aW9ufVxcblxcbmBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdFx0XHRgRmFpbGVkIHRvIGNyZWF0ZSBhcmNoaXZlIGZpbGU6ICR7YXJjaGl2ZUZpbGVQYXRofWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIHNvdXJjZSBhbmQgYXJjaGl2ZSBmaWxlIGNvbnRlbnRzXHJcblx0XHRcdGNvbnN0IHNvdXJjZUNvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZChzb3VyY2VGaWxlKTtcclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZChhcmNoaXZlRmlsZSBhcyBURmlsZSk7XHJcblxyXG5cdFx0XHRjb25zdCBzb3VyY2VMaW5lcyA9IHNvdXJjZUNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVMaW5lcyA9IGFyY2hpdmVDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Ly8gRmluZCBhbmQgZXh0cmFjdCB0aGUgdGFzayBsaW5lIGZyb20gc291cmNlXHJcblx0XHRcdGlmICh0YXNrLmxpbmUgPT09IHVuZGVmaW5lZCB8fCB0YXNrLmxpbmUgPj0gc291cmNlTGluZXMubGVuZ3RoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRcIlRhc2sgbGluZSBub3QgZm91bmQgaW4gc291cmNlIGZpbGVcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxldCB0YXNrTGluZSA9IHNvdXJjZUxpbmVzW3Rhc2subGluZV07XHJcblxyXG5cdFx0XHQvLyBDbGVhbiBvbkNvbXBsZXRpb24gbWV0YWRhdGEgYW5kIGVuc3VyZSB0YXNrIGlzIG1hcmtlZCBhcyBjb21wbGV0ZWRcclxuXHRcdFx0dGFza0xpbmUgPSB0aGlzLnJlbW92ZU9uQ29tcGxldGlvbk1ldGFkYXRhKHRhc2tMaW5lKTtcclxuXHRcdFx0dGFza0xpbmUgPSB0aGlzLmVuc3VyZVRhc2tJc0NvbXBsZXRlZCh0YXNrTGluZSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgdGltZXN0YW1wIGFuZCBzb3VyY2UgaW5mbyB0byB0aGUgdGFzayBsaW5lXHJcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07IC8vIFlZWVktTU0tREQgZm9ybWF0XHJcblx0XHRcdGNvbnN0IHNvdXJjZUluZm8gPSBgKGZyb20gJHt0YXNrLmZpbGVQYXRofSlgO1xyXG5cdFx0XHRjb25zdCBjb21wbGV0aW9uTWFya2VyID0gdGhpcy5nZXRDb21wbGV0aW9uTWFya2VyKFxyXG5cdFx0XHRcdGNvbnRleHQsXHJcblx0XHRcdFx0dGltZXN0YW1wXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVkVGFza0xpbmUgPSBgJHt0YXNrTGluZX0gJHtjb21wbGV0aW9uTWFya2VyfSAke3NvdXJjZUluZm99YDtcclxuXHJcblx0XHRcdC8vIFJlbW92ZSB0aGUgdGFzayBmcm9tIHNvdXJjZSBmaWxlXHJcblx0XHRcdHNvdXJjZUxpbmVzLnNwbGljZSh0YXNrLmxpbmUsIDEpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSB0YXNrIHRvIGFyY2hpdmUgZmlsZVxyXG5cdFx0XHRjb25zdCBzZWN0aW9uSW5kZXggPSBhcmNoaXZlTGluZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdChsaW5lKSA9PlxyXG5cdFx0XHRcdFx0bGluZS50cmltKCkuc3RhcnRzV2l0aChcIiNcIikgJiYgbGluZS5pbmNsdWRlcyhhcmNoaXZlU2VjdGlvbilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmIChzZWN0aW9uSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gRmluZCB0aGUgbmV4dCBzZWN0aW9uIG9yIGVuZCBvZiBmaWxlXHJcblx0XHRcdFx0bGV0IGluc2VydEluZGV4ID0gYXJjaGl2ZUxpbmVzLmxlbmd0aDtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gc2VjdGlvbkluZGV4ICsgMTsgaSA8IGFyY2hpdmVMaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKGFyY2hpdmVMaW5lc1tpXS50cmltKCkuc3RhcnRzV2l0aChcIiNcIikpIHtcclxuXHRcdFx0XHRcdFx0aW5zZXJ0SW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gSW5zZXJ0IGJlZm9yZSB0aGUgbmV4dCBzZWN0aW9uIG9yIGF0IHRoZSBlbmRcclxuXHRcdFx0XHRhcmNoaXZlTGluZXMuc3BsaWNlKGluc2VydEluZGV4LCAwLCBhcmNoaXZlZFRhc2tMaW5lKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBTZWN0aW9uIG5vdCBmb3VuZCwgY3JlYXRlIGl0IGFuZCBhZGQgdGhlIHRhc2tcclxuXHRcdFx0XHRhcmNoaXZlTGluZXMucHVzaChcIlwiLCBgIyMgJHthcmNoaXZlU2VjdGlvbn1gLCBhcmNoaXZlZFRhc2tMaW5lKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV3JpdGUgdXBkYXRlZCBjb250ZW50cyBiYWNrIHRvIGZpbGVzXHJcblx0XHRcdGF3YWl0IGFwcC52YXVsdC5tb2RpZnkoc291cmNlRmlsZSwgc291cmNlTGluZXMuam9pbihcIlxcblwiKSk7XHJcblx0XHRcdGF3YWl0IGFwcC52YXVsdC5tb2RpZnkoXHJcblx0XHRcdFx0YXJjaGl2ZUZpbGUgYXMgVEZpbGUsXHJcblx0XHRcdFx0YXJjaGl2ZUxpbmVzLmpvaW4oXCJcXG5cIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXHJcblx0XHRcdFx0YFRhc2sgYXJjaGl2ZWQgdG8gJHthcmNoaXZlRmlsZVBhdGh9IChzZWN0aW9uOiAke2FyY2hpdmVTZWN0aW9ufSlgXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRgRmFpbGVkIHRvIGFyY2hpdmUgdGFzazogJHtlcnJvci5tZXNzYWdlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhIHRhc2sgdG8gdGhlIGFyY2hpdmUgZmlsZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgYWRkVGFza1RvQXJjaGl2ZUZpbGUoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHRhc2tDb250ZW50OiBzdHJpbmcsXHJcblx0XHRhcmNoaXZlRmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGFyY2hpdmVTZWN0aW9uOiBzdHJpbmcsXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0XHJcblx0KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEdldCBvciBjcmVhdGUgdGhlIGFyY2hpdmUgZmlsZVxyXG5cdFx0XHRsZXQgYXJjaGl2ZUZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChhcmNoaXZlRmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJhcmNoaXZlRmlsZVwiLCBhcmNoaXZlRmlsZSwgYXJjaGl2ZUZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKCFhcmNoaXZlRmlsZSkge1xyXG5cdFx0XHRcdC8vIFRyeSB0byBjcmVhdGUgdGhlIGFyY2hpdmUgZmlsZSBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIEVuc3VyZSB0aGUgZGlyZWN0b3J5IGV4aXN0c1xyXG5cdFx0XHRcdFx0Y29uc3QgZGlyUGF0aCA9IGFyY2hpdmVGaWxlUGF0aC5zdWJzdHJpbmcoXHJcblx0XHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRcdGFyY2hpdmVGaWxlUGF0aC5sYXN0SW5kZXhPZihcIi9cIilcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoZGlyUGF0aCAmJiAhYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChkaXJQYXRoKSkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBhcHAudmF1bHQuY3JlYXRlRm9sZGVyKGRpclBhdGgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGFyY2hpdmVGaWxlID0gYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZShcclxuXHRcdFx0XHRcdFx0YXJjaGl2ZUZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRgIyBBcmNoaXZlXFxuXFxuIyMgJHthcmNoaXZlU2VjdGlvbn1cXG5cXG5gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0ZXJyb3I6IGBGYWlsZWQgdG8gY3JlYXRlIGFyY2hpdmUgZmlsZTogJHthcmNoaXZlRmlsZVBhdGh9YCxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIGFyY2hpdmUgZmlsZSBjb250ZW50XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb250ZW50ID0gYXdhaXQgYXBwLnZhdWx0LnJlYWQoYXJjaGl2ZUZpbGUgYXMgVEZpbGUpO1xyXG5cdFx0XHRjb25zdCBhcmNoaXZlTGluZXMgPSBhcmNoaXZlQ29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdC8vIEFkZCB0aW1lc3RhbXAgdXNpbmcgcHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0Y29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTsgLy8gWVlZWS1NTS1ERCBmb3JtYXRcclxuXHRcdFx0Y29uc3QgY29tcGxldGlvbk1hcmtlciA9IHRoaXMuZ2V0Q29tcGxldGlvbk1hcmtlcihcclxuXHRcdFx0XHRjb250ZXh0LFxyXG5cdFx0XHRcdHRpbWVzdGFtcFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBhcmNoaXZlZFRhc2tMaW5lID0gYCR7dGFza0NvbnRlbnR9ICR7Y29tcGxldGlvbk1hcmtlcn1gO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSB0YXNrIHRvIGFyY2hpdmUgZmlsZVxyXG5cdFx0XHRjb25zdCBzZWN0aW9uSW5kZXggPSBhcmNoaXZlTGluZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdChsaW5lOiBzdHJpbmcpID0+XHJcblx0XHRcdFx0XHRsaW5lLnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSAmJiBsaW5lLmluY2x1ZGVzKGFyY2hpdmVTZWN0aW9uKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKHNlY3Rpb25JbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBGaW5kIHRoZSBuZXh0IHNlY3Rpb24gb3IgZW5kIG9mIGZpbGVcclxuXHRcdFx0XHRsZXQgaW5zZXJ0SW5kZXggPSBhcmNoaXZlTGluZXMubGVuZ3RoO1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSBzZWN0aW9uSW5kZXggKyAxOyBpIDwgYXJjaGl2ZUxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoYXJjaGl2ZUxpbmVzW2ldLnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSkge1xyXG5cdFx0XHRcdFx0XHRpbnNlcnRJbmRleCA9IGk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBJbnNlcnQgYmVmb3JlIHRoZSBuZXh0IHNlY3Rpb24gb3IgYXQgdGhlIGVuZFxyXG5cdFx0XHRcdGFyY2hpdmVMaW5lcy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGFyY2hpdmVkVGFza0xpbmUpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFNlY3Rpb24gbm90IGZvdW5kLCBjcmVhdGUgaXQgYW5kIGFkZCB0aGUgdGFza1xyXG5cdFx0XHRcdGFyY2hpdmVMaW5lcy5wdXNoKFwiXCIsIGAjIyAke2FyY2hpdmVTZWN0aW9ufWAsIGFyY2hpdmVkVGFza0xpbmUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBXcml0ZSB1cGRhdGVkIGFyY2hpdmUgZmlsZVxyXG5cdFx0XHRhd2FpdCBhcHAudmF1bHQubW9kaWZ5KFxyXG5cdFx0XHRcdGFyY2hpdmVGaWxlIGFzIFRGaWxlLFxyXG5cdFx0XHRcdGFyY2hpdmVMaW5lcy5qb2luKFwiXFxuXCIpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgRmFpbGVkIHRvIGFkZCB0YXNrIHRvIGFyY2hpdmU6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJvdGVjdGVkIHZhbGlkYXRlQ29uZmlnKGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gY29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXREZXNjcmlwdGlvbihjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBhcmNoaXZlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWc7XHJcblx0XHRjb25zdCBhcmNoaXZlRmlsZSA9XHJcblx0XHRcdGFyY2hpdmVDb25maWcuYXJjaGl2ZUZpbGUgfHwgdGhpcy5ERUZBVUxUX0FSQ0hJVkVfRklMRTtcclxuXHRcdGNvbnN0IGFyY2hpdmVTZWN0aW9uID1cclxuXHRcdFx0YXJjaGl2ZUNvbmZpZy5hcmNoaXZlU2VjdGlvbiB8fCB0aGlzLkRFRkFVTFRfQVJDSElWRV9TRUNUSU9OO1xyXG5cdFx0cmV0dXJuIGBBcmNoaXZlIHRhc2sgdG8gJHthcmNoaXZlRmlsZX0gKHNlY3Rpb246ICR7YXJjaGl2ZVNlY3Rpb259KWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgb25Db21wbGV0aW9uIG1ldGFkYXRhIGZyb20gdGFzayBjb250ZW50XHJcblx0ICogU3VwcG9ydHMgYm90aCBlbW9qaSBmb3JtYXQgKPCfj4EpIGFuZCBkYXRhdmlldyBmb3JtYXQgKFtvbkNvbXBsZXRpb246Ol0pXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW1vdmVPbkNvbXBsZXRpb25NZXRhZGF0YShjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0bGV0IGNsZWFuZWQgPSBjb250ZW50O1xyXG5cclxuXHRcdC8vIFJlbW92ZSBlbW9qaSBmb3JtYXQgb25Db21wbGV0aW9uICjwn4+BIHZhbHVlKVxyXG5cdFx0Ly8gSGFuZGxlIHNpbXBsZSBmb3JtYXRzIGZpcnN0XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC/wn4+BXFxzK1teXFxze10rL2csIFwiXCIpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBKU09OIGZvcm1hdCBpbiBlbW9qaSBub3RhdGlvbiAo8J+PgSB7XCJ0eXBlXCI6IFwibW92ZVwiLCAuLi59KVxyXG5cdFx0Ly8gRmluZCBhbmQgcmVtb3ZlIGNvbXBsZXRlIEpTT04gb2JqZWN0cyBhZnRlciDwn4+BXHJcblx0XHRsZXQgbWF0Y2g7XHJcblx0XHR3aGlsZSAoKG1hdGNoID0gY2xlYW5lZC5tYXRjaCgv8J+PgVxccypcXHsvKSkgIT09IG51bGwpIHtcclxuXHRcdFx0Y29uc3Qgc3RhcnRJbmRleCA9IG1hdGNoLmluZGV4ITtcclxuXHRcdFx0Y29uc3QganNvblN0YXJ0ID0gY2xlYW5lZC5pbmRleE9mKFwie1wiLCBzdGFydEluZGV4KTtcclxuXHRcdFx0bGV0IGJyYWNlQ291bnQgPSAwO1xyXG5cdFx0XHRsZXQganNvbkVuZCA9IGpzb25TdGFydDtcclxuXHJcblx0XHRcdGZvciAobGV0IGkgPSBqc29uU3RhcnQ7IGkgPCBjbGVhbmVkLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGNsZWFuZWRbaV0gPT09IFwie1wiKSBicmFjZUNvdW50Kys7XHJcblx0XHRcdFx0aWYgKGNsZWFuZWRbaV0gPT09IFwifVwiKSBicmFjZUNvdW50LS07XHJcblx0XHRcdFx0aWYgKGJyYWNlQ291bnQgPT09IDApIHtcclxuXHRcdFx0XHRcdGpzb25FbmQgPSBpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoYnJhY2VDb3VudCA9PT0gMCkge1xyXG5cdFx0XHRcdC8vIFJlbW92ZSB0aGUgZW50aXJlIPCfj4EgKyBKU09OIG9iamVjdFxyXG5cdFx0XHRcdGNsZWFuZWQgPVxyXG5cdFx0XHRcdFx0Y2xlYW5lZC5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleCkgK1xyXG5cdFx0XHRcdFx0Y2xlYW5lZC5zdWJzdHJpbmcoanNvbkVuZCArIDEpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE1hbGZvcm1lZCBKU09OLCBqdXN0IHJlbW92ZSB0aGUg8J+PgSBwYXJ0XHJcblx0XHRcdFx0Y2xlYW5lZCA9XHJcblx0XHRcdFx0XHRjbGVhbmVkLnN1YnN0cmluZygwLCBzdGFydEluZGV4KSArXHJcblx0XHRcdFx0XHRjbGVhbmVkLnN1YnN0cmluZyhzdGFydEluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBkYXRhdmlldyBmb3JtYXQgb25Db21wbGV0aW9uIChbb25Db21wbGV0aW9uOjogdmFsdWVdKVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxbb25Db21wbGV0aW9uOjpcXHMqW15cXF1dKlxcXS9naSwgXCJcIik7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZXh0cmEgc3BhY2VzXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcblxyXG5cdFx0cmV0dXJuIGNsZWFuZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbnN1cmUgdGFzayBpcyBtYXJrZWQgYXMgY29tcGxldGVkIChjaGFuZ2UgWyBdIHRvIFt4XSlcclxuXHQgKi9cclxuXHRwcml2YXRlIGVuc3VyZVRhc2tJc0NvbXBsZXRlZChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Ly8gUmVwbGFjZSBhbnkgY2hlY2tib3ggZm9ybWF0IHdpdGggY29tcGxldGVkIGNoZWNrYm94XHJcblx0XHRyZXR1cm4gY29udGVudC5yZXBsYWNlKC9eKFxccypbLSorXVxccyopXFxbW15cXF1dKlxcXShcXHMqKS8sIFwiJDFbeF0kMlwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjb21wbGV0aW9uIG1hcmtlciBiYXNlZCBvbiBwcmVmZXJNZXRhZGF0YUZvcm1hdCBzZXR0aW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRDb21wbGV0aW9uTWFya2VyKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdHRpbWVzdGFtcDogc3RyaW5nXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0Y29udGV4dC5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0cmV0dXJuIGBbY29tcGxldGlvbjo6ICR7dGltZXN0YW1wfV1gO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGDinIUgJHt0aW1lc3RhbXB9YDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19