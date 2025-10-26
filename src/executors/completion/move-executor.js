import { __awaiter } from "tslib";
import { BaseActionExecutor } from "./base-executor";
import { OnCompletionActionType, } from "../../types/onCompletion";
/**
 * Executor for move action - moves the completed task to another file/section
 */
export class MoveActionExecutor extends BaseActionExecutor {
    /**
     * Execute move action for Canvas tasks
     */
    executeForCanvas(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const moveConfig = config;
            const { task, app } = context;
            try {
                const canvasUpdater = this.getCanvasTaskUpdater(context);
                // Check if target is a Canvas file
                if (moveConfig.targetFile.endsWith(".canvas")) {
                    // Canvas to Canvas move
                    // Create a cleaned version of the task without onCompletion metadata
                    const cleanedTask = Object.assign(Object.assign({}, task), { originalMarkdown: this.removeOnCompletionMetadata(task.originalMarkdown ||
                            `- [${task.completed ? "x" : " "}] ${task.content}`), metadata: Object.assign(Object.assign({}, task.metadata), { onCompletion: undefined }) });
                    const result = yield canvasUpdater.moveCanvasTask(cleanedTask, moveConfig.targetFile, undefined, // targetNodeId - could be enhanced later
                    moveConfig.targetSection);
                    if (result.success) {
                        const sectionText = moveConfig.targetSection
                            ? ` (section: ${moveConfig.targetSection})`
                            : "";
                        return this.createSuccessResult(`Task moved to Canvas file ${moveConfig.targetFile}${sectionText} successfully`);
                    }
                    else {
                        return this.createErrorResult(result.error || "Failed to move Canvas task");
                    }
                }
                else {
                    // Canvas to Markdown move
                    return this.moveCanvasToMarkdown(context, moveConfig);
                }
            }
            catch (error) {
                return this.createErrorResult(`Error moving Canvas task: ${error.message}`);
            }
        });
    }
    /**
     * Execute move action for Markdown tasks
     */
    executeForMarkdown(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const moveConfig = config;
            const { task, app } = context;
            try {
                // Get the source file containing the task
                const sourceFile = app.vault.getFileByPath(task.filePath);
                if (!sourceFile) {
                    return this.createErrorResult(`Source file not found: ${task.filePath}`);
                }
                // Get or create the target file
                let targetFile = app.vault.getFileByPath(moveConfig.targetFile);
                if (!targetFile) {
                    // Try to create the target file if it doesn't exist
                    try {
                        targetFile = yield app.vault.create(moveConfig.targetFile, "");
                    }
                    catch (error) {
                        return this.createErrorResult(`Failed to create target file: ${moveConfig.targetFile}`);
                    }
                }
                // Read source and target file contents
                const sourceContent = yield app.vault.read(sourceFile);
                const targetContent = yield app.vault.read(targetFile);
                const sourceLines = sourceContent.split("\n");
                const targetLines = targetContent.split("\n");
                // Find and extract the task line from source
                if (task.line === undefined || task.line >= sourceLines.length) {
                    return this.createErrorResult("Task line not found in source file");
                }
                let taskLine = sourceLines[task.line];
                // Clean onCompletion metadata from the task line before moving
                taskLine = this.removeOnCompletionMetadata(taskLine);
                // Remove the task from source file
                sourceLines.splice(task.line, 1);
                // Add the task to target file
                if (moveConfig.targetSection) {
                    // Find the target section and insert after it
                    const sectionIndex = targetLines.findIndex((line) => line.trim().startsWith("#") &&
                        line.includes(moveConfig.targetSection));
                    if (sectionIndex !== -1) {
                        // Find the end of this section (next section or end of file)
                        let insertIndex = targetLines.length;
                        for (let i = sectionIndex + 1; i < targetLines.length; i++) {
                            if (targetLines[i].trim().startsWith("#")) {
                                insertIndex = i;
                                break;
                            }
                        }
                        // Insert before the next section or at the end
                        targetLines.splice(insertIndex, 0, taskLine);
                    }
                    else {
                        // Section not found, create it and add the task
                        targetLines.push("", `## ${moveConfig.targetSection}`, taskLine);
                    }
                }
                else {
                    // No specific section, add to the end
                    targetLines.push(taskLine);
                }
                // Write updated contents back to files
                yield app.vault.modify(sourceFile, sourceLines.join("\n"));
                yield app.vault.modify(targetFile, targetLines.join("\n"));
                const sectionText = moveConfig.targetSection
                    ? ` (section: ${moveConfig.targetSection})`
                    : "";
                return this.createSuccessResult(`Task moved to ${moveConfig.targetFile}${sectionText} successfully`);
            }
            catch (error) {
                return this.createErrorResult(`Failed to move task: ${error.message}`);
            }
        });
    }
    /**
     * Move a Canvas task to a Markdown file
     */
    moveCanvasToMarkdown(context, moveConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const { task, app } = context;
            try {
                // Get task content as markdown
                let taskContent = task.originalMarkdown ||
                    `- [${task.completed ? "x" : " "}] ${task.content}`;
                // Clean onCompletion metadata from the task content before moving
                taskContent = this.removeOnCompletionMetadata(taskContent);
                // Add to Markdown target FIRST (before deleting from source)
                let targetFile = app.vault.getFileByPath(moveConfig.targetFile);
                if (!targetFile) {
                    // Try to create the target file if it doesn't exist
                    try {
                        targetFile = yield app.vault.create(moveConfig.targetFile, "");
                    }
                    catch (error) {
                        return this.createErrorResult(`Failed to create target file: ${moveConfig.targetFile}`);
                    }
                }
                // Read target file content
                const targetContent = yield app.vault.read(targetFile);
                const targetLines = targetContent.split("\n");
                // Find insertion point
                let insertPosition = targetLines.length;
                if (moveConfig.targetSection) {
                    for (let i = 0; i < targetLines.length; i++) {
                        if (targetLines[i]
                            .trim()
                            .toLowerCase()
                            .includes(moveConfig.targetSection.toLowerCase())) {
                            insertPosition = i + 1;
                            break;
                        }
                    }
                }
                // Insert task
                targetLines.splice(insertPosition, 0, taskContent);
                // Write updated target file
                yield app.vault.modify(targetFile, targetLines.join("\n"));
                // Only delete from Canvas source AFTER successful target file update
                const canvasUpdater = this.getCanvasTaskUpdater(context);
                const deleteResult = yield canvasUpdater.deleteCanvasTask(task);
                if (!deleteResult.success) {
                    // Move succeeded but deletion failed - this is less critical
                    // The task is safely moved, just not removed from source
                    const sectionText = moveConfig.targetSection
                        ? ` (section: ${moveConfig.targetSection})`
                        : "";
                    return this.createErrorResult(`Task moved successfully to ${moveConfig.targetFile}${sectionText}, but failed to remove from Canvas: ${deleteResult.error}`);
                }
                const sectionText = moveConfig.targetSection
                    ? ` (section: ${moveConfig.targetSection})`
                    : "";
                return this.createSuccessResult(`Task moved from Canvas to ${moveConfig.targetFile}${sectionText} successfully`);
            }
            catch (error) {
                return this.createErrorResult(`Failed to move Canvas task to Markdown: ${error.message}`);
            }
        });
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
    validateConfig(config) {
        if (config.type !== OnCompletionActionType.MOVE) {
            return false;
        }
        const moveConfig = config;
        return (typeof moveConfig.targetFile === "string" &&
            moveConfig.targetFile.trim().length > 0);
    }
    getDescription(config) {
        const moveConfig = config;
        const sectionText = moveConfig.targetSection
            ? ` (section: ${moveConfig.targetSection})`
            : "";
        return `Move task to ${moveConfig.targetFile}${sectionText}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZS1leGVjdXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vdmUtZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFJTixzQkFBc0IsR0FFdEIsTUFBTSwwQkFBMEIsQ0FBQztBQUVsQzs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxrQkFBa0I7SUFDekQ7O09BRUc7SUFDYSxnQkFBZ0IsQ0FDL0IsT0FBcUMsRUFDckMsTUFBMEI7O1lBRTFCLE1BQU0sVUFBVSxHQUFHLE1BQWdDLENBQUM7WUFDcEQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFFOUIsSUFBSTtnQkFDSCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRXpELG1DQUFtQztnQkFDbkMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDOUMsd0JBQXdCO29CQUN4QixxRUFBcUU7b0JBQ3JFLE1BQU0sV0FBVyxtQ0FDYixJQUFJLEtBQ1AsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUNoRCxJQUFJLENBQUMsZ0JBQWdCOzRCQUNwQixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FDcEQsRUFDRCxRQUFRLGtDQUNKLElBQUksQ0FBQyxRQUFRLEtBQ2hCLFlBQVksRUFBRSxTQUFTLE1BRXhCLENBQUM7b0JBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsY0FBYyxDQUNoRCxXQUFXLEVBQ1gsVUFBVSxDQUFDLFVBQVUsRUFDckIsU0FBUyxFQUFFLHlDQUF5QztvQkFDcEQsVUFBVSxD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TyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL0Qsd0JBQXdCO1FBQ3hCLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUU5QyxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRVMsY0FBYyxDQUFDLE1BQTBCO1FBQ2xELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUU7WUFDaEQsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUVELE1BQU0sVUFBVSxHQUFHLE1BQWdDLENBQUM7UUFDcEQsT0FBTyxDQUNOLE9BQU8sVUFBVSxDQUFDLFVBQVUsS0FBSyxRQUFRO1lBQ3pDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDdkMsQ0FBQztJQUNILENBQUM7SUFFTSxjQUFjLENBQUMsTUFBMEI7UUFDL0MsTUFBTSxVQUFVLEdBQUcsTUFBZ0MsQ0FBQztRQUNwRCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsYUFBYTtZQUMzQyxDQUFDLENBQUMsY0FBYyxVQUFVLENBQUMsYUFBYSxHQUFHO1lBQzNDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDTixPQUFPLGdCQUFnQixVQUFVLENBQUMsVUFBVSxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzlELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEJhc2VBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuL2Jhc2UtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25Db25maWcsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQsXHJcblx0T25Db21wbGV0aW9uQWN0aW9uVHlwZSxcclxuXHRPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnLFxyXG59IGZyb20gXCIuLi8uLi90eXBlcy9vbkNvbXBsZXRpb25cIjtcclxuXHJcbi8qKlxyXG4gKiBFeGVjdXRvciBmb3IgbW92ZSBhY3Rpb24gLSBtb3ZlcyB0aGUgY29tcGxldGVkIHRhc2sgdG8gYW5vdGhlciBmaWxlL3NlY3Rpb25cclxuICovXHJcbmV4cG9ydCBjbGFzcyBNb3ZlQWN0aW9uRXhlY3V0b3IgZXh0ZW5kcyBCYXNlQWN0aW9uRXhlY3V0b3Ige1xyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgbW92ZSBhY3Rpb24gZm9yIENhbnZhcyB0YXNrc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhc3luYyBleGVjdXRlRm9yQ2FudmFzKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IG1vdmVDb25maWcgPSBjb25maWcgYXMgT25Db21wbGV0aW9uTW92ZUNvbmZpZztcclxuXHRcdGNvbnN0IHsgdGFzaywgYXBwIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1VwZGF0ZXIgPSB0aGlzLmdldENhbnZhc1Rhc2tVcGRhdGVyKGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGFyZ2V0IGlzIGEgQ2FudmFzIGZpbGVcclxuXHRcdFx0aWYgKG1vdmVDb25maWcudGFyZ2V0RmlsZS5lbmRzV2l0aChcIi5jYW52YXNcIikpIHtcclxuXHRcdFx0XHQvLyBDYW52YXMgdG8gQ2FudmFzIG1vdmVcclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBjbGVhbmVkIHZlcnNpb24gb2YgdGhlIHRhc2sgd2l0aG91dCBvbkNvbXBsZXRpb24gbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBjbGVhbmVkVGFzayA9IHtcclxuXHRcdFx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiB0aGlzLnJlbW92ZU9uQ29tcGxldGlvbk1ldGFkYXRhKFxyXG5cdFx0XHRcdFx0XHR0YXNrLm9yaWdpbmFsTWFya2Rvd24gfHxcclxuXHRcdFx0XHRcdFx0XHRgLSBbJHt0YXNrLmNvbXBsZXRlZCA/IFwieFwiIDogXCIgXCJ9XSAke3Rhc2suY29udGVudH1gXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0Li4udGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0b25Db21wbGV0aW9uOiB1bmRlZmluZWQsIC8vIFJlbW92ZSBvbkNvbXBsZXRpb24gZnJvbSBtZXRhZGF0YVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBjYW52YXNVcGRhdGVyLm1vdmVDYW52YXNUYXNrKFxyXG5cdFx0XHRcdFx0Y2xlYW5lZFRhc2ssXHJcblx0XHRcdFx0XHRtb3ZlQ29uZmlnLnRhcmdldEZpbGUsXHJcblx0XHRcdFx0XHR1bmRlZmluZWQsIC8vIHRhcmdldE5vZGVJZCAtIGNvdWxkIGJlIGVuaGFuY2VkIGxhdGVyXHJcblx0XHRcdFx0XHRtb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb25cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHNlY3Rpb25UZXh0ID0gbW92ZUNvbmZpZy50YXJnZXRTZWN0aW9uXHJcblx0XHRcdFx0XHRcdD8gYCAoc2VjdGlvbjogJHttb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb259KWBcclxuXHRcdFx0XHRcdFx0OiBcIlwiO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlU3VjY2Vzc1Jlc3VsdChcclxuXHRcdFx0XHRcdFx0YFRhc2sgbW92ZWQgdG8gQ2FudmFzIGZpbGUgJHttb3ZlQ29uZmlnLnRhcmdldEZpbGV9JHtzZWN0aW9uVGV4dH0gc3VjY2Vzc2Z1bGx5YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRcdHJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byBtb3ZlIENhbnZhcyB0YXNrXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENhbnZhcyB0byBNYXJrZG93biBtb3ZlXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMubW92ZUNhbnZhc1RvTWFya2Rvd24oY29udGV4dCwgbW92ZUNvbmZpZyk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdGBFcnJvciBtb3ZpbmcgQ2FudmFzIHRhc2s6ICR7ZXJyb3IubWVzc2FnZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeGVjdXRlIG1vdmUgYWN0aW9uIGZvciBNYXJrZG93biB0YXNrc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhc3luYyBleGVjdXRlRm9yTWFya2Rvd24oXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdFx0Y29uZmlnOiBPbkNvbXBsZXRpb25Db25maWdcclxuXHQpOiBQcm9taXNlPE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdD4ge1xyXG5cdFx0Y29uc3QgbW92ZUNvbmZpZyA9IGNvbmZpZyBhcyBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnO1xyXG5cdFx0Y29uc3QgeyB0YXNrLCBhcHAgfSA9IGNvbnRleHQ7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gR2V0IHRoZSBzb3VyY2UgZmlsZSBjb250YWluaW5nIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IHNvdXJjZUZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKCFzb3VyY2VGaWxlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRgU291cmNlIGZpbGUgbm90IGZvdW5kOiAke3Rhc2suZmlsZVBhdGh9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEdldCBvciBjcmVhdGUgdGhlIHRhcmdldCBmaWxlXHJcblx0XHRcdGxldCB0YXJnZXRGaWxlID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobW92ZUNvbmZpZy50YXJnZXRGaWxlKTtcclxuXHRcdFx0aWYgKCF0YXJnZXRGaWxlKSB7XHJcblx0XHRcdFx0Ly8gVHJ5IHRvIGNyZWF0ZSB0aGUgdGFyZ2V0IGZpbGUgaWYgaXQgZG9lc24ndCBleGlzdFxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlID0gYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZShcclxuXHRcdFx0XHRcdFx0bW92ZUNvbmZpZy50YXJnZXRGaWxlLFxyXG5cdFx0XHRcdFx0XHRcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdFx0YEZhaWxlZCB0byBjcmVhdGUgdGFyZ2V0IGZpbGU6ICR7bW92ZUNvbmZpZy50YXJnZXRGaWxlfWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIHNvdXJjZSBhbmQgdGFyZ2V0IGZpbGUgY29udGVudHNcclxuXHRcdFx0Y29uc3Qgc291cmNlQ29udGVudCA9IGF3YWl0IGFwcC52YXVsdC5yZWFkKHNvdXJjZUZpbGUpO1xyXG5cdFx0XHRjb25zdCB0YXJnZXRDb250ZW50ID0gYXdhaXQgYXBwLnZhdWx0LnJlYWQodGFyZ2V0RmlsZSk7XHJcblxyXG5cdFx0XHRjb25zdCBzb3VyY2VMaW5lcyA9IHNvdXJjZUNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRcdGNvbnN0IHRhcmdldExpbmVzID0gdGFyZ2V0Q29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdC8vIEZpbmQgYW5kIGV4dHJhY3QgdGhlIHRhc2sgbGluZSBmcm9tIHNvdXJjZVxyXG5cdFx0XHRpZiAodGFzay5saW5lID09PSB1bmRlZmluZWQgfHwgdGFzay5saW5lID49IHNvdXJjZUxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdFx0XCJUYXNrIGxpbmUgbm90IGZvdW5kIGluIHNvdXJjZSBmaWxlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgdGFza0xpbmUgPSBzb3VyY2VMaW5lc1t0YXNrLmxpbmVdO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYW4gb25Db21wbGV0aW9uIG1ldGFkYXRhIGZyb20gdGhlIHRhc2sgbGluZSBiZWZvcmUgbW92aW5nXHJcblx0XHRcdHRhc2tMaW5lID0gdGhpcy5yZW1vdmVPbkNvbXBsZXRpb25NZXRhZGF0YSh0YXNrTGluZSk7XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgdGhlIHRhc2sgZnJvbSBzb3VyY2UgZmlsZVxyXG5cdFx0XHRzb3VyY2VMaW5lcy5zcGxpY2UodGFzay5saW5lLCAxKTtcclxuXHJcblx0XHRcdC8vIEFkZCB0aGUgdGFzayB0byB0YXJnZXQgZmlsZVxyXG5cdFx0XHRpZiAobW92ZUNvbmZpZy50YXJnZXRTZWN0aW9uKSB7XHJcblx0XHRcdFx0Ly8gRmluZCB0aGUgdGFyZ2V0IHNlY3Rpb24gYW5kIGluc2VydCBhZnRlciBpdFxyXG5cdFx0XHRcdGNvbnN0IHNlY3Rpb25JbmRleCA9IHRhcmdldExpbmVzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdChsaW5lKSA9PlxyXG5cdFx0XHRcdFx0XHRsaW5lLnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSAmJlxyXG5cdFx0XHRcdFx0XHRsaW5lLmluY2x1ZGVzKG1vdmVDb25maWcudGFyZ2V0U2VjdGlvbiEpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKHNlY3Rpb25JbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgdGhlIGVuZCBvZiB0aGlzIHNlY3Rpb24gKG5leHQgc2VjdGlvbiBvciBlbmQgb2YgZmlsZSlcclxuXHRcdFx0XHRcdGxldCBpbnNlcnRJbmRleCA9IHRhcmdldExpbmVzLmxlbmd0aDtcclxuXHRcdFx0XHRcdGZvciAoXHJcblx0XHRcdFx0XHRcdGxldCBpID0gc2VjdGlvbkluZGV4ICsgMTtcclxuXHRcdFx0XHRcdFx0aSA8IHRhcmdldExpbmVzLmxlbmd0aDtcclxuXHRcdFx0XHRcdFx0aSsrXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0aWYgKHRhcmdldExpbmVzW2ldLnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSkge1xyXG5cdFx0XHRcdFx0XHRcdGluc2VydEluZGV4ID0gaTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gSW5zZXJ0IGJlZm9yZSB0aGUgbmV4dCBzZWN0aW9uIG9yIGF0IHRoZSBlbmRcclxuXHRcdFx0XHRcdHRhcmdldExpbmVzLnNwbGljZShpbnNlcnRJbmRleCwgMCwgdGFza0xpbmUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBTZWN0aW9uIG5vdCBmb3VuZCwgY3JlYXRlIGl0IGFuZCBhZGQgdGhlIHRhc2tcclxuXHRcdFx0XHRcdHRhcmdldExpbmVzLnB1c2goXHJcblx0XHRcdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0XHRcdGAjIyAke21vdmVDb25maWcudGFyZ2V0U2VjdGlvbn1gLFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm8gc3BlY2lmaWMgc2VjdGlvbiwgYWRkIHRvIHRoZSBlbmRcclxuXHRcdFx0XHR0YXJnZXRMaW5lcy5wdXNoKHRhc2tMaW5lKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV3JpdGUgdXBkYXRlZCBjb250ZW50cyBiYWNrIHRvIGZpbGVzXHJcblx0XHRcdGF3YWl0IGFwcC52YXVsdC5tb2RpZnkoc291cmNlRmlsZSwgc291cmNlTGluZXMuam9pbihcIlxcblwiKSk7XHJcblx0XHRcdGF3YWl0IGFwcC52YXVsdC5tb2RpZnkodGFyZ2V0RmlsZSwgdGFyZ2V0TGluZXMuam9pbihcIlxcblwiKSk7XHJcblxyXG5cdFx0XHRjb25zdCBzZWN0aW9uVGV4dCA9IG1vdmVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdD8gYCAoc2VjdGlvbjogJHttb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb259KWBcclxuXHRcdFx0XHQ6IFwiXCI7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXHJcblx0XHRcdFx0YFRhc2sgbW92ZWQgdG8gJHttb3ZlQ29uZmlnLnRhcmdldEZpbGV9JHtzZWN0aW9uVGV4dH0gc3VjY2Vzc2Z1bGx5YFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0YEZhaWxlZCB0byBtb3ZlIHRhc2s6ICR7ZXJyb3IubWVzc2FnZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNb3ZlIGEgQ2FudmFzIHRhc2sgdG8gYSBNYXJrZG93biBmaWxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBtb3ZlQ2FudmFzVG9NYXJrZG93bihcclxuXHRcdGNvbnRleHQ6IE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0XHRtb3ZlQ29uZmlnOiBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IHsgdGFzaywgYXBwIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEdldCB0YXNrIGNvbnRlbnQgYXMgbWFya2Rvd25cclxuXHRcdFx0bGV0IHRhc2tDb250ZW50ID1cclxuXHRcdFx0XHR0YXNrLm9yaWdpbmFsTWFya2Rvd24gfHxcclxuXHRcdFx0XHRgLSBbJHt0YXNrLmNvbXBsZXRlZCA/IFwieFwiIDogXCIgXCJ9XSAke3Rhc2suY29udGVudH1gO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYW4gb25Db21wbGV0aW9uIG1ldGFkYXRhIGZyb20gdGhlIHRhc2sgY29udGVudCBiZWZvcmUgbW92aW5nXHJcblx0XHRcdHRhc2tDb250ZW50ID0gdGhpcy5yZW1vdmVPbkNvbXBsZXRpb25NZXRhZGF0YSh0YXNrQ29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgdG8gTWFya2Rvd24gdGFyZ2V0IEZJUlNUIChiZWZvcmUgZGVsZXRpbmcgZnJvbSBzb3VyY2UpXHJcblx0XHRcdGxldCB0YXJnZXRGaWxlID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgobW92ZUNvbmZpZy50YXJnZXRGaWxlKTtcclxuXHRcdFx0aWYgKCF0YXJnZXRGaWxlKSB7XHJcblx0XHRcdFx0Ly8gVHJ5IHRvIGNyZWF0ZSB0aGUgdGFyZ2V0IGZpbGUgaWYgaXQgZG9lc24ndCBleGlzdFxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlID0gYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZShcclxuXHRcdFx0XHRcdFx0bW92ZUNvbmZpZy50YXJnZXRGaWxlLFxyXG5cdFx0XHRcdFx0XHRcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdFx0YEZhaWxlZCB0byBjcmVhdGUgdGFyZ2V0IGZpbGU6ICR7bW92ZUNvbmZpZy50YXJnZXRGaWxlfWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIHRhcmdldCBmaWxlIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgdGFyZ2V0Q29udGVudCA9IGF3YWl0IGFwcC52YXVsdC5yZWFkKHRhcmdldEZpbGUgYXMgVEZpbGUpO1xyXG5cdFx0XHRjb25zdCB0YXJnZXRMaW5lcyA9IHRhcmdldENvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHQvLyBGaW5kIGluc2VydGlvbiBwb2ludFxyXG5cdFx0XHRsZXQgaW5zZXJ0UG9zaXRpb24gPSB0YXJnZXRMaW5lcy5sZW5ndGg7XHJcblx0XHRcdGlmIChtb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb24pIHtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhcmdldExpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHRhcmdldExpbmVzW2ldXHJcblx0XHRcdFx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdFx0XHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0XHRcdFx0LmluY2x1ZGVzKG1vdmVDb25maWcudGFyZ2V0U2VjdGlvbi50b0xvd2VyQ2FzZSgpKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGluc2VydFBvc2l0aW9uID0gaSArIDE7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSW5zZXJ0IHRhc2tcclxuXHRcdFx0dGFyZ2V0TGluZXMuc3BsaWNlKGluc2VydFBvc2l0aW9uLCAwLCB0YXNrQ29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBXcml0ZSB1cGRhdGVkIHRhcmdldCBmaWxlXHJcblx0XHRcdGF3YWl0IGFwcC52YXVsdC5tb2RpZnkodGFyZ2V0RmlsZSwgdGFyZ2V0TGluZXMuam9pbihcIlxcblwiKSk7XHJcblxyXG5cdFx0XHQvLyBPbmx5IGRlbGV0ZSBmcm9tIENhbnZhcyBzb3VyY2UgQUZURVIgc3VjY2Vzc2Z1bCB0YXJnZXQgZmlsZSB1cGRhdGVcclxuXHRcdFx0Y29uc3QgY2FudmFzVXBkYXRlciA9IHRoaXMuZ2V0Q2FudmFzVGFza1VwZGF0ZXIoY29udGV4dCk7XHJcblx0XHRcdGNvbnN0IGRlbGV0ZVJlc3VsdCA9IGF3YWl0IGNhbnZhc1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzayh0YXNrKTtcclxuXHJcblx0XHRcdGlmICghZGVsZXRlUmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHQvLyBNb3ZlIHN1Y2NlZWRlZCBidXQgZGVsZXRpb24gZmFpbGVkIC0gdGhpcyBpcyBsZXNzIGNyaXRpY2FsXHJcblx0XHRcdFx0Ly8gVGhlIHRhc2sgaXMgc2FmZWx5IG1vdmVkLCBqdXN0IG5vdCByZW1vdmVkIGZyb20gc291cmNlXHJcblx0XHRcdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBtb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb25cclxuXHRcdFx0XHRcdD8gYCAoc2VjdGlvbjogJHttb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb259KWBcclxuXHRcdFx0XHRcdDogXCJcIjtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdGBUYXNrIG1vdmVkIHN1Y2Nlc3NmdWxseSB0byAke21vdmVDb25maWcudGFyZ2V0RmlsZX0ke3NlY3Rpb25UZXh0fSwgYnV0IGZhaWxlZCB0byByZW1vdmUgZnJvbSBDYW52YXM6ICR7ZGVsZXRlUmVzdWx0LmVycm9yfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBzZWN0aW9uVGV4dCA9IG1vdmVDb25maWcudGFyZ2V0U2VjdGlvblxyXG5cdFx0XHRcdD8gYCAoc2VjdGlvbjogJHttb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb259KWBcclxuXHRcdFx0XHQ6IFwiXCI7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXHJcblx0XHRcdFx0YFRhc2sgbW92ZWQgZnJvbSBDYW52YXMgdG8gJHttb3ZlQ29uZmlnLnRhcmdldEZpbGV9JHtzZWN0aW9uVGV4dH0gc3VjY2Vzc2Z1bGx5YFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0YEZhaWxlZCB0byBtb3ZlIENhbnZhcyB0YXNrIHRvIE1hcmtkb3duOiAke2Vycm9yLm1lc3NhZ2V9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIG9uQ29tcGxldGlvbiBtZXRhZGF0YSBmcm9tIHRhc2sgY29udGVudFxyXG5cdCAqIFN1cHBvcnRzIGJvdGggZW1vamkgZm9ybWF0ICjwn4+BKSBhbmQgZGF0YXZpZXcgZm9ybWF0IChbb25Db21wbGV0aW9uOjpdKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVtb3ZlT25Db21wbGV0aW9uTWV0YWRhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGxldCBjbGVhbmVkID0gY29udGVudDtcclxuXHJcblx0XHQvLyBSZW1vdmUgZW1vamkgZm9ybWF0IG9uQ29tcGxldGlvbiAo8J+PgSB2YWx1ZSlcclxuXHRcdC8vIEhhbmRsZSBzaW1wbGUgZm9ybWF0cyBmaXJzdFxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv8J+PgVxccytbXlxcc3tdKy9nLCBcIlwiKTtcclxuXHJcblx0XHQvLyBIYW5kbGUgSlNPTiBmb3JtYXQgaW4gZW1vamkgbm90YXRpb24gKPCfj4Ege1widHlwZVwiOiBcIm1vdmVcIiwgLi4ufSlcclxuXHRcdC8vIEZpbmQgYW5kIHJlbW92ZSBjb21wbGV0ZSBKU09OIG9iamVjdHMgYWZ0ZXIg8J+PgVxyXG5cdFx0bGV0IG1hdGNoO1xyXG5cdFx0d2hpbGUgKChtYXRjaCA9IGNsZWFuZWQubWF0Y2goL/Cfj4FcXHMqXFx7LykpICE9PSBudWxsKSB7XHJcblx0XHRcdGNvbnN0IHN0YXJ0SW5kZXggPSBtYXRjaC5pbmRleCE7XHJcblx0XHRcdGNvbnN0IGpzb25TdGFydCA9IGNsZWFuZWQuaW5kZXhPZihcIntcIiwgc3RhcnRJbmRleCk7XHJcblx0XHRcdGxldCBicmFjZUNvdW50ID0gMDtcclxuXHRcdFx0bGV0IGpzb25FbmQgPSBqc29uU3RhcnQ7XHJcblxyXG5cdFx0XHRmb3IgKGxldCBpID0ganNvblN0YXJ0OyBpIDwgY2xlYW5lZC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChjbGVhbmVkW2ldID09PSBcIntcIikgYnJhY2VDb3VudCsrO1xyXG5cdFx0XHRcdGlmIChjbGVhbmVkW2ldID09PSBcIn1cIikgYnJhY2VDb3VudC0tO1xyXG5cdFx0XHRcdGlmIChicmFjZUNvdW50ID09PSAwKSB7XHJcblx0XHRcdFx0XHRqc29uRW5kID0gaTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGJyYWNlQ291bnQgPT09IDApIHtcclxuXHRcdFx0XHQvLyBSZW1vdmUgdGhlIGVudGlyZSDwn4+BICsgSlNPTiBvYmplY3RcclxuXHRcdFx0XHRjbGVhbmVkID1cclxuXHRcdFx0XHRcdGNsZWFuZWQuc3Vic3RyaW5nKDAsIHN0YXJ0SW5kZXgpICtcclxuXHRcdFx0XHRcdGNsZWFuZWQuc3Vic3RyaW5nKGpzb25FbmQgKyAxKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBNYWxmb3JtZWQgSlNPTiwganVzdCByZW1vdmUgdGhlIPCfj4EgcGFydFxyXG5cdFx0XHRcdGNsZWFuZWQgPVxyXG5cdFx0XHRcdFx0Y2xlYW5lZC5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleCkgK1xyXG5cdFx0XHRcdFx0Y2xlYW5lZC5zdWJzdHJpbmcoc3RhcnRJbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgZGF0YXZpZXcgZm9ybWF0IG9uQ29tcGxldGlvbiAoW29uQ29tcGxldGlvbjo6IHZhbHVlXSlcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xcW29uQ29tcGxldGlvbjo6XFxzKlteXFxdXSpcXF0vZ2ksIFwiXCIpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGV4dHJhIHNwYWNlc1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdHJldHVybiBjbGVhbmVkO1xyXG5cdH1cclxuXHJcblx0cHJvdGVjdGVkIHZhbGlkYXRlQ29uZmlnKGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoY29uZmlnLnR5cGUgIT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbW92ZUNvbmZpZyA9IGNvbmZpZyBhcyBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnO1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0dHlwZW9mIG1vdmVDb25maWcudGFyZ2V0RmlsZSA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRtb3ZlQ29uZmlnLnRhcmdldEZpbGUudHJpbSgpLmxlbmd0aCA+IDBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0RGVzY3JpcHRpb24oY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbW92ZUNvbmZpZyA9IGNvbmZpZyBhcyBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnO1xyXG5cdFx0Y29uc3Qgc2VjdGlvblRleHQgPSBtb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb25cclxuXHRcdFx0PyBgIChzZWN0aW9uOiAke21vdmVDb25maWcudGFyZ2V0U2VjdGlvbn0pYFxyXG5cdFx0XHQ6IFwiXCI7XHJcblx0XHRyZXR1cm4gYE1vdmUgdGFzayB0byAke21vdmVDb25maWcudGFyZ2V0RmlsZX0ke3NlY3Rpb25UZXh0fWA7XHJcblx0fVxyXG59XHJcbiJdfQ==