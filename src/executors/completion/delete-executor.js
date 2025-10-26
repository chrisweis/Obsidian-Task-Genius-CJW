import { __awaiter } from "tslib";
import { BaseActionExecutor } from "./base-executor";
import { OnCompletionActionType, } from "../../types/onCompletion";
/**
 * Executor for delete action - removes the completed task from the file
 */
export class DeleteActionExecutor extends BaseActionExecutor {
    /**
     * Execute delete action for Canvas tasks
     */
    executeForCanvas(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const { task } = context;
            try {
                const canvasUpdater = this.getCanvasTaskUpdater(context);
                const result = yield canvasUpdater.deleteCanvasTask(task);
                if (result.success) {
                    return this.createSuccessResult(`Task deleted from Canvas file ${task.filePath}`);
                }
                else {
                    return this.createErrorResult(result.error || "Failed to delete Canvas task");
                }
            }
            catch (error) {
                return this.createErrorResult(`Error deleting Canvas task: ${error.message}`);
            }
        });
    }
    /**
     * Execute delete action for Markdown tasks
     */
    executeForMarkdown(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const { task, app } = context;
            try {
                // Get the file containing the task
                const file = app.vault.getFileByPath(task.filePath);
                if (!file) {
                    return this.createErrorResult(`File not found: ${task.filePath}`);
                }
                // Read the current content
                const content = yield app.vault.read(file);
                const lines = content.split("\n");
                // Find the task line to delete
                let taskLineIndex = -1;
                // First try to find by originalMarkdown if available
                if (task.originalMarkdown) {
                    taskLineIndex = lines.findIndex((line) => { var _a; return line.trim() === ((_a = task.originalMarkdown) === null || _a === void 0 ? void 0 : _a.trim()); });
                }
                // If not found by originalMarkdown, try by line number
                if (taskLineIndex === -1 &&
                    task.line !== undefined &&
                    task.line < lines.length) {
                    taskLineIndex = task.line;
                }
                // If still not found, try by lineNumber property (for backward compatibility)
                if (taskLineIndex === -1 &&
                    task.lineNumber !== undefined &&
                    task.lineNumber < lines.length) {
                    taskLineIndex = task.lineNumber;
                }
                if (taskLineIndex !== -1) {
                    // Remove the line containing the task
                    lines.splice(taskLineIndex, 1);
                    // Clean up consecutive empty lines that might result from deletion
                    this.cleanupConsecutiveEmptyLines(lines);
                    // Write the updated content back to the file
                    const updatedContent = lines.join("\n");
                    yield app.vault.modify(file, updatedContent);
                    return this.createSuccessResult("Task deleted successfully");
                }
                else {
                    return this.createErrorResult("Task not found in file");
                }
            }
            catch (error) {
                return this.createErrorResult(`Failed to delete task: ${error.message}`);
            }
        });
    }
    validateConfig(config) {
        return config.type === OnCompletionActionType.DELETE;
    }
    getDescription(config) {
        return "Delete the completed task from the file";
    }
    /**
     * Clean up consecutive empty lines, keeping at most one empty line between content
     */
    cleanupConsecutiveEmptyLines(lines) {
        for (let i = lines.length - 1; i >= 1; i--) {
            // If current line and previous line are both empty, remove current line
            if (lines[i].trim() === "" && lines[i - 1].trim() === "") {
                lines.splice(i, 1);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLWV4ZWN1dG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVsZXRlLWV4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRCxPQUFPLEVBSU4sc0JBQXNCLEdBRXRCLE1BQU0sMEJBQTBCLENBQUM7QUFFbEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsa0JBQWtCO0lBQzNEOztPQUVHO0lBQ2EsZ0JBQWdCLENBQy9CLE9BQXFDLEVBQ3JDLE1BQTBCOztZQUUxQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO1lBRXpCLElBQUk7Z0JBQ0gsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFMUQsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO29CQUNuQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FDOUIsaUNBQWlDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FDaEQsQ0FBQztpQkFDRjtxQkFBTTtvQkFDTixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FDNUIsTUFBTSxDQUFDLEtBQUssSUFBSSw4QkFBOEIsQ0FDOUMsQ0FBQztpQkFDRjthQUNEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQzVCLCtCQUErQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQzlDLENBQUM7YUFDRjtRQUNGLENBQUM7S0FBQTtJQUVEOztPQUVHO0lBQ2Esa0JBQWtCLENBQ2pDLE9BQXFDLEVBQ3JDLE1BQTBCOztZQUUxQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUU5QixJQUFJO2dCQUNI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QUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUN6RCxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNuQjtTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgQmFzZUFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4vYmFzZS1leGVjdXRvclwiO1xyXG5pbXBvcnQge1xyXG5cdE9uQ29tcGxldGlvbkNvbmZpZyxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdCxcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkRlbGV0ZUNvbmZpZyxcclxufSBmcm9tIFwiLi4vLi4vdHlwZXMvb25Db21wbGV0aW9uXCI7XHJcblxyXG4vKipcclxuICogRXhlY3V0b3IgZm9yIGRlbGV0ZSBhY3Rpb24gLSByZW1vdmVzIHRoZSBjb21wbGV0ZWQgdGFzayBmcm9tIHRoZSBmaWxlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRGVsZXRlQWN0aW9uRXhlY3V0b3IgZXh0ZW5kcyBCYXNlQWN0aW9uRXhlY3V0b3Ige1xyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgZGVsZXRlIGFjdGlvbiBmb3IgQ2FudmFzIHRhc2tzXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGFzeW5jIGV4ZWN1dGVGb3JDYW52YXMoXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdFx0Y29uZmlnOiBPbkNvbXBsZXRpb25Db25maWdcclxuXHQpOiBQcm9taXNlPE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdD4ge1xyXG5cdFx0Y29uc3QgeyB0YXNrIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1VwZGF0ZXIgPSB0aGlzLmdldENhbnZhc1Rhc2tVcGRhdGVyKGNvbnRleHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBjYW52YXNVcGRhdGVyLmRlbGV0ZUNhbnZhc1Rhc2sodGFzayk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVTdWNjZXNzUmVzdWx0KFxyXG5cdFx0XHRcdFx0YFRhc2sgZGVsZXRlZCBmcm9tIENhbnZhcyBmaWxlICR7dGFzay5maWxlUGF0aH1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3VsdChcclxuXHRcdFx0XHRcdHJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byBkZWxldGUgQ2FudmFzIHRhc2tcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFxyXG5cdFx0XHRcdGBFcnJvciBkZWxldGluZyBDYW52YXMgdGFzazogJHtlcnJvci5tZXNzYWdlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4ZWN1dGUgZGVsZXRlIGFjdGlvbiBmb3IgTWFya2Rvd24gdGFza3NcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgZXhlY3V0ZUZvck1hcmtkb3duKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IHsgdGFzaywgYXBwIH0gPSBjb250ZXh0O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEdldCB0aGUgZmlsZSBjb250YWluaW5nIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0XHRgRmlsZSBub3QgZm91bmQ6ICR7dGFzay5maWxlUGF0aH1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhZCB0aGUgY3VycmVudCBjb250ZW50XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgdGFzayBsaW5lIHRvIGRlbGV0ZVxyXG5cdFx0XHRsZXQgdGFza0xpbmVJbmRleCA9IC0xO1xyXG5cclxuXHRcdFx0Ly8gRmlyc3QgdHJ5IHRvIGZpbmQgYnkgb3JpZ2luYWxNYXJrZG93biBpZiBhdmFpbGFibGVcclxuXHRcdFx0aWYgKHRhc2sub3JpZ2luYWxNYXJrZG93bikge1xyXG5cdFx0XHRcdHRhc2tMaW5lSW5kZXggPSBsaW5lcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0XHQobGluZSkgPT4gbGluZS50cmltKCkgPT09IHRhc2sub3JpZ2luYWxNYXJrZG93bj8udHJpbSgpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm90IGZvdW5kIGJ5IG9yaWdpbmFsTWFya2Rvd24sIHRyeSBieSBsaW5lIG51bWJlclxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGFza0xpbmVJbmRleCA9PT0gLTEgJiZcclxuXHRcdFx0XHR0YXNrLmxpbmUgIT09IHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdHRhc2subGluZSA8IGxpbmVzLmxlbmd0aFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0YXNrTGluZUluZGV4ID0gdGFzay5saW5lO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBzdGlsbCBub3QgZm91bmQsIHRyeSBieSBsaW5lTnVtYmVyIHByb3BlcnR5IChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRhc2tMaW5lSW5kZXggPT09IC0xICYmXHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KS5saW5lTnVtYmVyICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHQodGFzayBhcyBhbnkpLmxpbmVOdW1iZXIgPCBsaW5lcy5sZW5ndGhcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGFza0xpbmVJbmRleCA9ICh0YXNrIGFzIGFueSkubGluZU51bWJlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRhc2tMaW5lSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIHRoZSBsaW5lIGNvbnRhaW5pbmcgdGhlIHRhc2tcclxuXHRcdFx0XHRsaW5lcy5zcGxpY2UodGFza0xpbmVJbmRleCwgMSk7XHJcblxyXG5cdFx0XHRcdC8vIENsZWFuIHVwIGNvbnNlY3V0aXZlIGVtcHR5IGxpbmVzIHRoYXQgbWlnaHQgcmVzdWx0IGZyb20gZGVsZXRpb25cclxuXHRcdFx0XHR0aGlzLmNsZWFudXBDb25zZWN1dGl2ZUVtcHR5TGluZXMobGluZXMpO1xyXG5cclxuXHRcdFx0XHQvLyBXcml0ZSB0aGUgdXBkYXRlZCBjb250ZW50IGJhY2sgdG8gdGhlIGZpbGVcclxuXHRcdFx0XHRjb25zdCB1cGRhdGVkQ29udGVudCA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XHJcblx0XHRcdFx0YXdhaXQgYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkQ29udGVudCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQoXCJUYXNrIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFwiVGFzayBub3QgZm91bmQgaW4gZmlsZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0YEZhaWxlZCB0byBkZWxldGUgdGFzazogJHtlcnJvci5tZXNzYWdlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByb3RlY3RlZCB2YWxpZGF0ZUNvbmZpZyhjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGNvbmZpZy50eXBlID09PSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXREZXNjcmlwdGlvbihjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gXCJEZWxldGUgdGhlIGNvbXBsZXRlZCB0YXNrIGZyb20gdGhlIGZpbGVcIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIGNvbnNlY3V0aXZlIGVtcHR5IGxpbmVzLCBrZWVwaW5nIGF0IG1vc3Qgb25lIGVtcHR5IGxpbmUgYmV0d2VlbiBjb250ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhbnVwQ29uc2VjdXRpdmVFbXB0eUxpbmVzKGxpbmVzOiBzdHJpbmdbXSk6IHZvaWQge1xyXG5cdFx0Zm9yIChsZXQgaSA9IGxpbmVzLmxlbmd0aCAtIDE7IGkgPj0gMTsgaS0tKSB7XHJcblx0XHRcdC8vIElmIGN1cnJlbnQgbGluZSBhbmQgcHJldmlvdXMgbGluZSBhcmUgYm90aCBlbXB0eSwgcmVtb3ZlIGN1cnJlbnQgbGluZVxyXG5cdFx0XHRpZiAobGluZXNbaV0udHJpbSgpID09PSBcIlwiICYmIGxpbmVzW2kgLSAxXS50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0XHRsaW5lcy5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19