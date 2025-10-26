import { __awaiter } from "tslib";
import { TFile } from "obsidian";
import { BaseActionExecutor } from "./base-executor";
import { OnCompletionActionType, } from "../../types/onCompletion";
/**
 * Executor for duplicate action - creates a copy of the completed task
 */
export class DuplicateActionExecutor extends BaseActionExecutor {
    /**
     * Execute duplicate action for Canvas tasks
     */
    executeForCanvas(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const duplicateConfig = config;
            const { task, app } = context;
            try {
                const canvasUpdater = this.getCanvasTaskUpdater(context);
                // Check if target is a Canvas file
                const targetFile = duplicateConfig.targetFile || task.filePath;
                if (targetFile.endsWith(".canvas")) {
                    // Canvas to Canvas duplicate
                    const result = yield canvasUpdater.duplicateCanvasTask(task, targetFile, undefined, // targetNodeId - could be enhanced later
                    duplicateConfig.targetSection, duplicateConfig.preserveMetadata);
                    if (result.success) {
                        const locationText = targetFile !== task.filePath
                            ? `to ${duplicateConfig.targetFile}`
                            : "in same file";
                        const sectionText = duplicateConfig.targetSection
                            ? ` (section: ${duplicateConfig.targetSection})`
                            : "";
                        return this.createSuccessResult(`Task duplicated ${locationText}${sectionText}`);
                    }
                    else {
                        return this.createErrorResult(result.error || "Failed to duplicate Canvas task");
                    }
                }
                else {
                    // Canvas to Markdown duplicate
                    return this.duplicateCanvasToMarkdown(context, duplicateConfig);
                }
            }
            catch (error) {
                return this.createErrorResult(`Error duplicating Canvas task: ${error.message}`);
            }
        });
    }
    /**
     * Execute duplicate action for Markdown tasks
     */
    executeForMarkdown(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const duplicateConfig = config;
            const { task, app } = context;
            try {
                // Get the source file containing the task
                const sourceFile = app.vault.getFileByPath(task.filePath);
                if (!(sourceFile instanceof TFile)) {
                    return this.createErrorResult(`Source file not found: ${task.filePath}`);
                }
                // Determine target file (default to same file if not specified)
                let targetFile;
                if (duplicateConfig.targetFile) {
                    targetFile = app.vault.getFileByPath(duplicateConfig.targetFile);
                    if (!(targetFile instanceof TFile)) {
                        // Try to create the target file if it doesn't exist
                        try {
                            targetFile = yield app.vault.create(duplicateConfig.targetFile, "");
                        }
                        catch (error) {
                            return this.createErrorResult(`Failed to create target file: ${duplicateConfig.targetFile}`);
                        }
                    }
                }
                else {
                    targetFile = sourceFile;
                }
                // Read source content
                const sourceContent = yield app.vault.read(sourceFile);
                const sourceLines = sourceContent.split("\n");
                // Find the task line
                if (task.line === undefined || task.line >= sourceLines.length) {
                    return this.createErrorResult("Task line not found in source file");
                }
                const originalTaskLine = sourceLines[task.line];
                // Create duplicate task line
                let duplicateTaskLine = this.createDuplicateTaskLine(originalTaskLine, duplicateConfig);
                // If target file is different from source, add to target file
                if (targetFile.path !== sourceFile.path) {
                    const targetContent = yield app.vault.read(targetFile);
                    const targetLines = targetContent.split("\n");
                    // Add to target file
                    if (duplicateConfig.targetSection) {
                        // Find the target section and insert after it
                        const sectionIndex = targetLines.findIndex((line) => line.trim().startsWith("#") &&
                            line.includes(duplicateConfig.targetSection));
                        if (sectionIndex !== -1) {
                            // Insert after the section header
                            targetLines.splice(sectionIndex + 1, 0, duplicateTaskLine);
                        }
                        else {
                            // Section not found, create it and add the task
                            targetLines.push("", `## ${duplicateConfig.targetSection}`, duplicateTaskLine);
                        }
                    }
                    else {
                        // No specific section, add to the end
                        targetLines.push(duplicateTaskLine);
                    }
                    // Write updated target file
                    yield app.vault.modify(targetFile, targetLines.join("\n"));
                }
                else {
                    // Same file - add duplicate after the original task
                    sourceLines.splice(task.line + 1, 0, duplicateTaskLine);
                    yield app.vault.modify(sourceFile, sourceLines.join("\n"));
                }
                const locationText = targetFile.path !== sourceFile.path
                    ? `to ${duplicateConfig.targetFile}`
                    : "in same file";
                const sectionText = duplicateConfig.targetSection
                    ? ` (section: ${duplicateConfig.targetSection})`
                    : "";
                return this.createSuccessResult(`Task duplicated ${locationText}${sectionText}`);
            }
            catch (error) {
                return this.createErrorResult(`Failed to duplicate task: ${error.message}`);
            }
        });
    }
    /**
     * Duplicate a Canvas task to a Markdown file
     */
    duplicateCanvasToMarkdown(context, duplicateConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const { task, app } = context;
            try {
                // Get task content as markdown
                let taskContent = task.originalMarkdown ||
                    `- [${task.completed ? "x" : " "}] ${task.content}`;
                // Reset completion status
                taskContent = taskContent.replace(/^(\s*[-*+]\s*\[)[xX\-](\])/, "$1 $2");
                if (!duplicateConfig.preserveMetadata) {
                    // Remove completion-related metadata
                    taskContent = taskContent
                        .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "") // Remove completion date
                        .replace(/⏰\s*\d{4}-\d{2}-\d{2}/g, "") // Remove scheduled date if desired
                        .trim();
                }
                // Add duplicate indicator
                const timestamp = new Date().toISOString().split("T")[0];
                taskContent += ` (duplicated ${timestamp})`;
                // Add to Markdown target
                const targetFile = duplicateConfig.targetFile || task.filePath;
                let targetFileObj = app.vault.getFileByPath(targetFile);
                if (!targetFileObj) {
                    // Try to create the target file if it doesn't exist
                    try {
                        targetFileObj = yield app.vault.create(targetFile, "");
                    }
                    catch (error) {
                        return this.createErrorResult(`Failed to create target file: ${targetFile}`);
                    }
                }
                // Read target file content
                const targetContent = yield app.vault.read(targetFileObj);
                const targetLines = targetContent.split("\n");
                // Find insertion point
                let insertPosition = targetLines.length;
                if (duplicateConfig.targetSection) {
                    for (let i = 0; i < targetLines.length; i++) {
                        if (targetLines[i]
                            .trim()
                            .toLowerCase()
                            .includes(duplicateConfig.targetSection.toLowerCase())) {
                            insertPosition = i + 1;
                            break;
                        }
                    }
                }
                // Insert task
                targetLines.splice(insertPosition, 0, taskContent);
                // Write updated target file
                yield app.vault.modify(targetFileObj, targetLines.join("\n"));
                const locationText = targetFile !== task.filePath
                    ? `to ${duplicateConfig.targetFile}`
                    : "in same file";
                const sectionText = duplicateConfig.targetSection
                    ? ` (section: ${duplicateConfig.targetSection})`
                    : "";
                return this.createSuccessResult(`Task duplicated from Canvas ${locationText}${sectionText}`);
            }
            catch (error) {
                return this.createErrorResult(`Failed to duplicate Canvas task to Markdown: ${error.message}`);
            }
        });
    }
    createDuplicateTaskLine(originalLine, config) {
        // Reset the task to incomplete state
        let duplicateLine = originalLine.replace(/^(\s*[-*+]\s*\[)[xX\-](\])/, "$1 $2");
        if (!config.preserveMetadata) {
            // Remove completion-related metadata
            duplicateLine = duplicateLine
                .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "") // Remove completion date
                .replace(/⏰\s*\d{4}-\d{2}-\d{2}/g, "") // Remove scheduled date if desired
                .trim();
        }
        // Add duplicate indicator
        const timestamp = new Date().toISOString().split("T")[0];
        duplicateLine += ` (duplicated ${timestamp})`;
        return duplicateLine;
    }
    validateConfig(config) {
        return config.type === OnCompletionActionType.DUPLICATE;
    }
    getDescription(config) {
        const duplicateConfig = config;
        if (duplicateConfig.targetFile) {
            const sectionText = duplicateConfig.targetSection
                ? ` (section: ${duplicateConfig.targetSection})`
                : "";
            return `Duplicate task to ${duplicateConfig.targetFile}${sectionText}`;
        }
        else {
            return "Duplicate task in same file";
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVwbGljYXRlLWV4ZWN1dG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHVwbGljYXRlLWV4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFJTixzQkFBc0IsR0FFdEIsTUFBTSwwQkFBMEIsQ0FBQztBQUVsQzs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxrQkFBa0I7SUFDOUQ7O09BRUc7SUFDYSxnQkFBZ0IsQ0FDL0IsT0FBcUMsRUFDckMsTUFBMEI7O1lBRTFCLE1BQU0sZUFBZSxHQUFHLE1BQXFDLENBQUM7WUFDOUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFFOUIsSUFBSTtnQkFDSCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRXpELG1DQUFtQztnQkFDbkMsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUMvRCxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7b0JBQ25DLDZCQUE2QjtvQkFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQ3JELElBQUksRUFDSixVQUFVLEVBQ1YsU0FBUyxFQUFFLHlDQUF5QztvQkFDcEQsZUFBZSxDQUFDLGFBQWEsRUFDN0IsZUFBZSxDQUFDLGdCQUFnQixDQUNoQyxDQUFDO29CQUVGLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTt3QkFDbkIsTUFBTSxZQUFZLEdBQ2pCLFVBQVUsS0FBSyxJQUFJLENBQUMsUUFBUTs0QkFDM0IsQ0FBQyxDQUFDLE1BQU0sZUFBZSxDQUFDLFVBQVUsRUFBRTs0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dCB7IFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEJhc2VBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuL2Jhc2UtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25Db25maWcsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQsXHJcblx0T25Db21wbGV0aW9uQWN0aW9uVHlwZSxcclxuXHRPbkNvbXBsZXRpb25EdXBsaWNhdGVDb25maWcsXHJcbn0gZnJvbSBcIi4uLy4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dG9yIGZvciBkdXBsaWNhdGUgYWN0aW9uIC0gY3JlYXRlcyBhIGNvcHkgb2YgdGhlIGNvbXBsZXRlZCB0YXNrXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRHVwbGljYXRlQWN0aW9uRXhlY3V0b3IgZXh0ZW5kcyBCYXNlQWN0aW9uRXhlY3V0b3Ige1xyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgZHVwbGljYXRlIGFjdGlvbiBmb3IgQ2FudmFzIHRhc2tzXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGFzeW5jIGV4ZWN1dGVGb3JDYW52YXMoXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdFx0Y29uZmlnOiBPbkNvbXBsZXRpb25Db25maWdcclxuXHQpOiBQcm9taXNlPE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdD4ge1xyXG5cdFx0Y29uc3QgZHVwbGljYXRlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZztcclxuXHRcdGNvbnN0IHsgdGFzaywgYXBwIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1VwZGF0ZXIgPSB0aGlzLmdldENhbnZhc1Rhc2tVcGRhdGVyKGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGFyZ2V0IGlzIGEgQ2FudmFzIGZpbGVcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RmlsZSA9IGR1cGxpY2F0ZUNvbmZpZy50YXJnZXRGaWxlIHx8IHRhc2suZmlsZVBhdGg7XHJcblx0XHRcdGlmICh0YXJnZXRGaWxlLmVuZHNXaXRoKFwiLmNhbnZhc1wiKSkge1xyXG5cdFx0XHRcdC8vIENhbnZhcyB0byBDYW52YXMgZHVwbGljYXRlXHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgY2FudmFzVXBkYXRlci5kdXBsaWNhdGVDYW52YXNUYXNrKFxyXG5cdFx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGUsXHJcblx0XHRcdFx0XHR1bmRlZmluZWQsIC8vIHRhcmdldE5vZGVJZCAtIGNvdWxkIGJlIGVuaGFuY2VkIGxhdGVyXHJcblx0XHRcdFx0XHRkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvbixcclxuXHRcdFx0XHRcdGR1cGxpY2F0ZUNvbmZpZy5wcmVzZXJ2ZU1ldGFkYXRhXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRjb25zdCBsb2NhdGlvblRleHQgPVxyXG5cdFx0XHRcdFx0XHR0YXJnZXRGaWxlICE9PSB0YXNrLmZpbGVQYXRoXHJcblx0XHRcdFx0XHRcdFx0PyBgdG8gJHtkdXBsaWNhdGVDb25maWcudGFyZ2V0RmlsZX1gXHJcblx0XHRcdFx0XHRcdFx0OiBcImluIHNhbWUgZmlsZVwiO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdFx0XHQ/IGAgKHNlY3Rpb246ICR7ZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb259KWBcclxuXHRcdFx0XHRcdFx0OiBcIlwiO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlU3VjY2Vzc1Jlc3VsdChcclxuXHRcdFx0XHRcdFx0YFRhc2sgZHVwbGljYXRlZCAke2xvY2F0aW9uVGV4dH0ke3NlY3Rpb25UZXh0fWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdFx0XHRyZXN1bHQuZXJyb3IgfHwgXCJGYWlsZWQgdG8gZHVwbGljYXRlIENhbnZhcyB0YXNrXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENhbnZhcyB0byBNYXJrZG93biBkdXBsaWNhdGVcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5kdXBsaWNhdGVDYW52YXNUb01hcmtkb3duKGNvbnRleHQsIGR1cGxpY2F0ZUNvbmZpZyk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdGBFcnJvciBkdXBsaWNhdGluZyBDYW52YXMgdGFzazogJHtlcnJvci5tZXNzYWdlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgZHVwbGljYXRlIGFjdGlvbiBmb3IgTWFya2Rvd24gdGFza3NcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgZXhlY3V0ZUZvck1hcmtkb3duKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IGR1cGxpY2F0ZUNvbmZpZyA9IGNvbmZpZyBhcyBPbkNvbXBsZXRpb25EdXBsaWNhdGVDb25maWc7XHJcblx0XHRjb25zdCB7IHRhc2ssIGFwcCB9ID0gY29udGV4dDtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgdGhlIHNvdXJjZSBmaWxlIGNvbnRhaW5pbmcgdGhlIHRhc2tcclxuXHRcdFx0Y29uc3Qgc291cmNlRmlsZSA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoIShzb3VyY2VGaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRgU291cmNlIGZpbGUgbm90IGZvdW5kOiAke3Rhc2suZmlsZVBhdGh9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERldGVybWluZSB0YXJnZXQgZmlsZSAoZGVmYXVsdCB0byBzYW1lIGZpbGUgaWYgbm90IHNwZWNpZmllZClcclxuXHRcdFx0bGV0IHRhcmdldEZpbGU6IFRGaWxlO1xyXG5cdFx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGUpIHtcclxuXHRcdFx0XHR0YXJnZXRGaWxlID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XHRkdXBsaWNhdGVDb25maWcudGFyZ2V0RmlsZVxyXG5cdFx0XHRcdCkgYXMgVEZpbGU7XHJcblx0XHRcdFx0aWYgKCEodGFyZ2V0RmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xyXG5cdFx0XHRcdFx0Ly8gVHJ5IHRvIGNyZWF0ZSB0aGUgdGFyZ2V0IGZpbGUgaWYgaXQgZG9lc24ndCBleGlzdFxyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0RmlsZSA9IGF3YWl0IGFwcC52YXVsdC5jcmVhdGUoXHJcblx0XHRcdFx0XHRcdFx0ZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGUsXHJcblx0XHRcdFx0XHRcdFx0XCJcIlxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRcdFx0YEZhaWxlZCB0byBjcmVhdGUgdGFyZ2V0IGZpbGU6ICR7ZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGV9YFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0YXJnZXRGaWxlID0gc291cmNlRmlsZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhZCBzb3VyY2UgY29udGVudFxyXG5cdFx0XHRjb25zdCBzb3VyY2VDb250ZW50ID0gYXdhaXQgYXBwLnZhdWx0LnJlYWQoc291cmNlRmlsZSk7XHJcblx0XHRcdGNvbnN0IHNvdXJjZUxpbmVzID0gc291cmNlQ29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdC8vIEZpbmQgdGhlIHRhc2sgbGluZVxyXG5cdFx0XHRpZiAodGFzay5saW5lID09PSB1bmRlZmluZWQgfHwgdGFzay5saW5lID49IHNvdXJjZUxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdFx0XCJUYXNrIGxpbmUgbm90IGZvdW5kIGluIHNvdXJjZSBmaWxlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFRhc2tMaW5lID0gc291cmNlTGluZXNbdGFzay5saW5lXTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBkdXBsaWNhdGUgdGFzayBsaW5lXHJcblx0XHRcdGxldCBkdXBsaWNhdGVUYXNrTGluZSA9IHRoaXMuY3JlYXRlRHVwbGljYXRlVGFza0xpbmUoXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrTGluZSxcclxuXHRcdFx0XHRkdXBsaWNhdGVDb25maWdcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIElmIHRhcmdldCBmaWxlIGlzIGRpZmZlcmVudCBmcm9tIHNvdXJjZSwgYWRkIHRvIHRhcmdldCBmaWxlXHJcblx0XHRcdGlmICh0YXJnZXRGaWxlLnBhdGggIT09IHNvdXJjZUZpbGUucGF0aCkge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldENvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZCh0YXJnZXRGaWxlKTtcclxuXHRcdFx0XHRjb25zdCB0YXJnZXRMaW5lcyA9IHRhcmdldENvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCB0byB0YXJnZXQgZmlsZVxyXG5cdFx0XHRcdGlmIChkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvbikge1xyXG5cdFx0XHRcdFx0Ly8gRmluZCB0aGUgdGFyZ2V0IHNlY3Rpb24gYW5kIGluc2VydCBhZnRlciBpdFxyXG5cdFx0XHRcdFx0Y29uc3Qgc2VjdGlvbkluZGV4ID0gdGFyZ2V0TGluZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0XHQobGluZSkgPT5cclxuXHRcdFx0XHRcdFx0XHRsaW5lLnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSAmJlxyXG5cdFx0XHRcdFx0XHRcdGxpbmUuaW5jbHVkZXMoZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24hKVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoc2VjdGlvbkluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHQvLyBJbnNlcnQgYWZ0ZXIgdGhlIHNlY3Rpb24gaGVhZGVyXHJcblx0XHRcdFx0XHRcdHRhcmdldExpbmVzLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRzZWN0aW9uSW5kZXggKyAxLFxyXG5cdFx0XHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRcdFx0ZHVwbGljYXRlVGFza0xpbmVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIFNlY3Rpb24gbm90IGZvdW5kLCBjcmVhdGUgaXQgYW5kIGFkZCB0aGUgdGFza1xyXG5cdFx0XHRcdFx0XHR0YXJnZXRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0XHRcdFx0YCMjICR7ZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb259YCxcclxuXHRcdFx0XHRcdFx0XHRkdXBsaWNhdGVUYXNrTGluZVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBObyBzcGVjaWZpYyBzZWN0aW9uLCBhZGQgdG8gdGhlIGVuZFxyXG5cdFx0XHRcdFx0dGFyZ2V0TGluZXMucHVzaChkdXBsaWNhdGVUYXNrTGluZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBXcml0ZSB1cGRhdGVkIHRhcmdldCBmaWxlXHJcblx0XHRcdFx0YXdhaXQgYXBwLnZhdWx0Lm1vZGlmeSh0YXJnZXRGaWxlLCB0YXJnZXRMaW5lcy5qb2luKFwiXFxuXCIpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBTYW1lIGZpbGUgLSBhZGQgZHVwbGljYXRlIGFmdGVyIHRoZSBvcmlnaW5hbCB0YXNrXHJcblx0XHRcdFx0c291cmNlTGluZXMuc3BsaWNlKHRhc2subGluZSArIDEsIDAsIGR1cGxpY2F0ZVRhc2tMaW5lKTtcclxuXHRcdFx0XHRhd2FpdCBhcHAudmF1bHQubW9kaWZ5KHNvdXJjZUZpbGUsIHNvdXJjZUxpbmVzLmpvaW4oXCJcXG5cIikpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBsb2NhdGlvblRleHQgPVxyXG5cdFx0XHRcdHRhcmdldEZpbGUucGF0aCAhPT0gc291cmNlRmlsZS5wYXRoXHJcblx0XHRcdFx0XHQ/IGB0byAke2R1cGxpY2F0ZUNvbmZpZy50YXJnZXRGaWxlfWBcclxuXHRcdFx0XHRcdDogXCJpbiBzYW1lIGZpbGVcIjtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdD8gYCAoc2VjdGlvbjogJHtkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvbn0pYFxyXG5cdFx0XHRcdDogXCJcIjtcclxuXHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXHJcblx0XHRcdFx0YFRhc2sgZHVwbGljYXRlZCAke2xvY2F0aW9uVGV4dH0ke3NlY3Rpb25UZXh0fWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdGBGYWlsZWQgdG8gZHVwbGljYXRlIHRhc2s6ICR7ZXJyb3IubWVzc2FnZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEdXBsaWNhdGUgYSBDYW52YXMgdGFzayB0byBhIE1hcmtkb3duIGZpbGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGR1cGxpY2F0ZUNhbnZhc1RvTWFya2Rvd24oXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdFx0ZHVwbGljYXRlQ29uZmlnOiBPbkNvbXBsZXRpb25EdXBsaWNhdGVDb25maWdcclxuXHQpOiBQcm9taXNlPE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdD4ge1xyXG5cdFx0Y29uc3QgeyB0YXNrLCBhcHAgfSA9IGNvbnRleHQ7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gR2V0IHRhc2sgY29udGVudCBhcyBtYXJrZG93blxyXG5cdFx0XHRsZXQgdGFza0NvbnRlbnQgPVxyXG5cdFx0XHRcdHRhc2sub3JpZ2luYWxNYXJrZG93biB8fFxyXG5cdFx0XHRcdGAtIFske3Rhc2suY29tcGxldGVkID8gXCJ4XCIgOiBcIiBcIn1dICR7dGFzay5jb250ZW50fWA7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdFx0XHR0YXNrQ29udGVudCA9IHRhc2tDb250ZW50LnJlcGxhY2UoXHJcblx0XHRcdFx0L14oXFxzKlstKitdXFxzKlxcWylbeFhcXC1dKFxcXSkvLFxyXG5cdFx0XHRcdFwiJDEgJDJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKCFkdXBsaWNhdGVDb25maWcucHJlc2VydmVNZXRhZGF0YSkge1xyXG5cdFx0XHRcdC8vIFJlbW92ZSBjb21wbGV0aW9uLXJlbGF0ZWQgbWV0YWRhdGFcclxuXHRcdFx0XHR0YXNrQ29udGVudCA9IHRhc2tDb250ZW50XHJcblx0XHRcdFx0XHQucmVwbGFjZSgv4pyFXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9L2csIFwiXCIpIC8vIFJlbW92ZSBjb21wbGV0aW9uIGRhdGVcclxuXHRcdFx0XHRcdC5yZXBsYWNlKC/ij7BcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIikgLy8gUmVtb3ZlIHNjaGVkdWxlZCBkYXRlIGlmIGRlc2lyZWRcclxuXHRcdFx0XHRcdC50cmltKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBkdXBsaWNhdGUgaW5kaWNhdG9yXHJcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblx0XHRcdHRhc2tDb250ZW50ICs9IGAgKGR1cGxpY2F0ZWQgJHt0aW1lc3RhbXB9KWA7XHJcblxyXG5cdFx0XHQvLyBBZGQgdG8gTWFya2Rvd24gdGFyZ2V0XHJcblx0XHRcdGNvbnN0IHRhcmdldEZpbGUgPSBkdXBsaWNhdGVDb25maWcudGFyZ2V0RmlsZSB8fCB0YXNrLmZpbGVQYXRoO1xyXG5cdFx0XHRsZXQgdGFyZ2V0RmlsZU9iaiA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhcmdldEZpbGUpO1xyXG5cdFx0XHRpZiAoIXRhcmdldEZpbGVPYmopIHtcclxuXHRcdFx0XHQvLyBUcnkgdG8gY3JlYXRlIHRoZSB0YXJnZXQgZmlsZSBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdHRhcmdldEZpbGVPYmogPSBhd2FpdCBhcHAudmF1bHQuY3JlYXRlKHRhcmdldEZpbGUsIFwiXCIpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdFx0YEZhaWxlZCB0byBjcmVhdGUgdGFyZ2V0IGZpbGU6ICR7dGFyZ2V0RmlsZX1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhZCB0YXJnZXQgZmlsZSBjb250ZW50XHJcblx0XHRcdGNvbnN0IHRhcmdldENvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZCh0YXJnZXRGaWxlT2JqIGFzIFRGaWxlKTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0TGluZXMgPSB0YXJnZXRDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Ly8gRmluZCBpbnNlcnRpb24gcG9pbnRcclxuXHRcdFx0bGV0IGluc2VydFBvc2l0aW9uID0gdGFyZ2V0TGluZXMubGVuZ3RoO1xyXG5cdFx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24pIHtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhcmdldExpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHRhcmdldExpbmVzW2ldXHJcblx0XHRcdFx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdFx0XHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0XHRcdFx0LmluY2x1ZGVzKFxyXG5cdFx0XHRcdFx0XHRcdFx0ZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24udG9Mb3dlckNhc2UoKVxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRpbnNlcnRQb3NpdGlvbiA9IGkgKyAxO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEluc2VydCB0YXNrXHJcblx0XHRcdHRhcmdldExpbmVzLnNwbGljZShpbnNlcnRQb3NpdGlvbiwgMCwgdGFza0NvbnRlbnQpO1xyXG5cclxuXHRcdFx0Ly8gV3JpdGUgdXBkYXRlZCB0YXJnZXQgZmlsZVxyXG5cdFx0XHRhd2FpdCBhcHAudmF1bHQubW9kaWZ5KHRhcmdldEZpbGVPYmosIHRhcmdldExpbmVzLmpvaW4oXCJcXG5cIikpO1xyXG5cclxuXHRcdFx0Y29uc3QgbG9jYXRpb25UZXh0ID1cclxuXHRcdFx0XHR0YXJnZXRGaWxlICE9PSB0YXNrLmZpbGVQYXRoXHJcblx0XHRcdFx0XHQ/IGB0byAke2R1cGxpY2F0ZUNvbmZpZy50YXJnZXRGaWxlfWBcclxuXHRcdFx0XHRcdDogXCJpbiBzYW1lIGZpbGVcIjtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdD8gYCAoc2VjdGlvbjogJHtkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvbn0pYFxyXG5cdFx0XHRcdDogXCJcIjtcclxuXHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXHJcblx0XHRcdFx0YFRhc2sgZHVwbGljYXRlZCBmcm9tIENhbnZhcyAke2xvY2F0aW9uVGV4dH0ke3NlY3Rpb25UZXh0fWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdGBGYWlsZWQgdG8gZHVwbGljYXRlIENhbnZhcyB0YXNrIHRvIE1hcmtkb3duOiAke2Vycm9yLm1lc3NhZ2V9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVEdXBsaWNhdGVUYXNrTGluZShcclxuXHRcdG9yaWdpbmFsTGluZTogc3RyaW5nLFxyXG5cdFx0Y29uZmlnOiBPbkNvbXBsZXRpb25EdXBsaWNhdGVDb25maWdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Ly8gUmVzZXQgdGhlIHRhc2sgdG8gaW5jb21wbGV0ZSBzdGF0ZVxyXG5cdFx0bGV0IGR1cGxpY2F0ZUxpbmUgPSBvcmlnaW5hbExpbmUucmVwbGFjZShcclxuXHRcdFx0L14oXFxzKlstKitdXFxzKlxcWylbeFhcXC1dKFxcXSkvLFxyXG5cdFx0XHRcIiQxICQyXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKCFjb25maWcucHJlc2VydmVNZXRhZGF0YSkge1xyXG5cdFx0XHQvLyBSZW1vdmUgY29tcGxldGlvbi1yZWxhdGVkIG1ldGFkYXRhXHJcblx0XHRcdGR1cGxpY2F0ZUxpbmUgPSBkdXBsaWNhdGVMaW5lXHJcblx0XHRcdFx0LnJlcGxhY2UoL+KchVxccypcXGR7NH0tXFxkezJ9LVxcZHsyfS9nLCBcIlwiKSAvLyBSZW1vdmUgY29tcGxldGlvbiBkYXRlXHJcblx0XHRcdFx0LnJlcGxhY2UoL+KPsFxccypcXGR7NH0tXFxkezJ9LVxcZHsyfS9nLCBcIlwiKSAvLyBSZW1vdmUgc2NoZWR1bGVkIGRhdGUgaWYgZGVzaXJlZFxyXG5cdFx0XHRcdC50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGR1cGxpY2F0ZSBpbmRpY2F0b3JcclxuXHRcdGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblx0XHRkdXBsaWNhdGVMaW5lICs9IGAgKGR1cGxpY2F0ZWQgJHt0aW1lc3RhbXB9KWA7XHJcblxyXG5cdFx0cmV0dXJuIGR1cGxpY2F0ZUxpbmU7XHJcblx0fVxyXG5cclxuXHRwcm90ZWN0ZWQgdmFsaWRhdGVDb25maWcoY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBjb25maWcudHlwZSA9PT0gT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEU7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0RGVzY3JpcHRpb24oY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZHVwbGljYXRlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZztcclxuXHJcblx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGUpIHtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdD8gYCAoc2VjdGlvbjogJHtkdXBsaWNhdGVDb25maWcudGFyZ2V0U2VjdGlvbn0pYFxyXG5cdFx0XHRcdDogXCJcIjtcclxuXHRcdFx0cmV0dXJuIGBEdXBsaWNhdGUgdGFzayB0byAke2R1cGxpY2F0ZUNvbmZpZy50YXJnZXRGaWxlfSR7c2VjdGlvblRleHR9YDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBcIkR1cGxpY2F0ZSB0YXNrIGluIHNhbWUgZmlsZVwiO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=