import { __awaiter } from "tslib";
import { BaseActionExecutor } from "./base-executor";
import { OnCompletionActionType, } from "../../types/onCompletion";
/**
 * Executor for complete action - marks related tasks as completed
 */
export class CompleteActionExecutor extends BaseActionExecutor {
    executeForCanvas(context, config) {
        return this.execute(context, config);
    }
    executeForMarkdown(context, config) {
        return this.execute(context, config);
    }
    execute(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.validateConfig(config)) {
                return this.createErrorResult("Invalid complete configuration");
            }
            return this.executeCommon(context, config);
        });
    }
    executeCommon(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const completeConfig = config;
            const { plugin } = context;
            try {
                const completedTasks = [];
                const failedTasks = [];
                // Get dataflow query API
                if (!plugin.dataflowOrchestrator) {
                    return this.createErrorResult("Dataflow orchestrator not available");
                }
                const queryAPI = plugin.dataflowOrchestrator.getQueryAPI();
                for (const taskId of completeConfig.taskIds) {
                    try {
                        // Find the task by ID
                        const targetTask = yield queryAPI.getTaskById(taskId);
                        if (!targetTask) {
                            failedTasks.push(`Task not found: ${taskId}`);
                            continue;
                        }
                        if (targetTask.completed) {
                            // Task is already completed, skip
                            continue;
                        }
                        // Create a completed version of the task
                        const updatedTask = Object.assign(Object.assign({}, targetTask), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, targetTask.metadata), { completedDate: Date.now() }) });
                        // Update the task using WriteAPI
                        if (context.plugin.writeAPI) {
                            const result = yield context.plugin.writeAPI.updateTask({
                                taskId: updatedTask.id,
                                updates: updatedTask
                            });
                            if (!result.success) {
                                throw new Error(result.error || "Failed to update task");
                            }
                        }
                        else {
                            throw new Error("WriteAPI not available");
                        }
                        completedTasks.push(taskId);
                    }
                    catch (error) {
                        failedTasks.push(`${taskId}: ${error.message}`);
                    }
                }
                // Build result message
                let message = "";
                if (completedTasks.length > 0) {
                    message += `Completed tasks: ${completedTasks.join(", ")}`;
                }
                if (failedTasks.length > 0) {
                    if (message)
                        message += "; ";
                    message += `Failed: ${failedTasks.join(", ")}`;
                }
                const success = completedTasks.length > 0;
                return success
                    ? this.createSuccessResult(message)
                    : this.createErrorResult(message || "No tasks were completed");
            }
            catch (error) {
                return this.createErrorResult(`Failed to complete related tasks: ${error.message}`);
            }
        });
    }
    validateConfig(config) {
        if (config.type !== OnCompletionActionType.COMPLETE) {
            return false;
        }
        const completeConfig = config;
        return (Array.isArray(completeConfig.taskIds) &&
            completeConfig.taskIds.length > 0);
    }
    getDescription(config) {
        var _a;
        const completeConfig = config;
        const taskCount = ((_a = completeConfig.taskIds) === null || _a === void 0 ? void 0 : _a.length) || 0;
        return `Complete ${taskCount} related task${taskCount !== 1 ? "s" : ""}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGUtZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21wbGV0ZS1leGVjdXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDckQsT0FBTyxFQUlOLHNCQUFzQixHQUV0QixNQUFNLDBCQUEwQixDQUFDO0FBR2xDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUM3RCxnQkFBZ0IsQ0FDZixPQUFxQyxFQUNyQyxNQUEwQjtRQUUxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxrQkFBa0IsQ0FDakIsT0FBcUMsRUFDckMsTUFBMEI7UUFFMUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ1ksT0FBTyxDQUNuQixPQUFxQyxFQUNyQyxNQUEwQjs7WUFFMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdDQUFnQyxDQUFDLENBQUM7YUFDaEU7WUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUM7S0FBQTtJQUVhLGFBQWEsQ0FDMUIsT0FBcUMsRUFDckMsTUFBMEI7O1lBRTFCLE1BQU0sY0FBYyxHQUFHLE1BQW9DLENBQUM7WUFDNUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUUzQixJQUFJO2dCQUNILE1BQU0sY0FBYyxHQUFhLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO2dCQUVqQyx5QkFBeUI7Z0JBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsb0JB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O1NBQ2I7UUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFvQyxDQUFDO1FBQzVELE9BQU8sQ0FDTixLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDckMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUNqQyxDQUFDO0lBQ0gsQ0FBQztJQUVNLGNBQWMsQ0FBQyxNQUEwQjs7UUFDL0MsTUFBTSxjQUFjLEdBQUcsTUFBb0MsQ0FBQztRQUM1RCxNQUFNLFNBQVMsR0FBRyxDQUFBLE1BQUEsY0FBYyxDQUFDLE9BQU8sMENBQUUsTUFBTSxLQUFJLENBQUMsQ0FBQztRQUN0RCxPQUFPLFlBQVksU0FBUyxnQkFDM0IsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUN6QixFQUFFLENBQUM7SUFDSixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlQWN0aW9uRXhlY3V0b3IgfSBmcm9tIFwiLi9iYXNlLWV4ZWN1dG9yXCI7XHJcbmltcG9ydCB7XHJcblx0T25Db21wbGV0aW9uQ29uZmlnLFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uUmVzdWx0LFxyXG5cdE9uQ29tcGxldGlvbkFjdGlvblR5cGUsXHJcblx0T25Db21wbGV0aW9uQ29tcGxldGVDb25maWcsXHJcbn0gZnJvbSBcIi4uLy4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIi4uLy4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8qKlxyXG4gKiBFeGVjdXRvciBmb3IgY29tcGxldGUgYWN0aW9uIC0gbWFya3MgcmVsYXRlZCB0YXNrcyBhcyBjb21wbGV0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb21wbGV0ZUFjdGlvbkV4ZWN1dG9yIGV4dGVuZHMgQmFzZUFjdGlvbkV4ZWN1dG9yIHtcclxuXHRleGVjdXRlRm9yQ2FudmFzKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdHJldHVybiB0aGlzLmV4ZWN1dGUoY29udGV4dCwgY29uZmlnKTtcclxuXHR9XHJcblx0ZXhlY3V0ZUZvck1hcmtkb3duKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdHJldHVybiB0aGlzLmV4ZWN1dGUoY29udGV4dCwgY29uZmlnKTtcclxuXHR9XHJcblx0cHVibGljIGFzeW5jIGV4ZWN1dGUoXHJcblx0XHRjb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdFx0Y29uZmlnOiBPbkNvbXBsZXRpb25Db25maWdcclxuXHQpOiBQcm9taXNlPE9uQ29tcGxldGlvbkV4ZWN1dGlvblJlc3VsdD4ge1xyXG5cdFx0aWYgKCF0aGlzLnZhbGlkYXRlQ29uZmlnKGNvbmZpZykpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXCJJbnZhbGlkIGNvbXBsZXRlIGNvbmZpZ3VyYXRpb25cIik7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuZXhlY3V0ZUNvbW1vbihjb250ZXh0LCBjb25maWcpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBleGVjdXRlQ29tbW9uKFxyXG5cdFx0Y29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRcdGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KTogUHJvbWlzZTxPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQ+IHtcclxuXHRcdGNvbnN0IGNvbXBsZXRlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkNvbXBsZXRlQ29uZmlnO1xyXG5cdFx0Y29uc3QgeyBwbHVnaW4gfSA9IGNvbnRleHQ7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY29tcGxldGVkVGFza3M6IHN0cmluZ1tdID0gW107XHJcblx0XHRcdGNvbnN0IGZhaWxlZFRhc2tzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gR2V0IGRhdGFmbG93IHF1ZXJ5IEFQSVxyXG5cdFx0XHRpZiAoIXBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzdWx0KFwiRGF0YWZsb3cgb3JjaGVzdHJhdG9yIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgcXVlcnlBUEkgPSBwbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIGNvbXBsZXRlQ29uZmlnLnRhc2tJZHMpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gRmluZCB0aGUgdGFzayBieSBJRFxyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0VGFzayA9IGF3YWl0IHF1ZXJ5QVBJLmdldFRhc2tCeUlkKHRhc2tJZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCF0YXJnZXRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdGZhaWxlZFRhc2tzLnB1c2goYFRhc2sgbm90IGZvdW5kOiAke3Rhc2tJZH1gKTtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRhcmdldFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdC8vIFRhc2sgaXMgYWxyZWFkeSBjb21wbGV0ZWQsIHNraXBcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgY29tcGxldGVkIHZlcnNpb24gb2YgdGhlIHRhc2tcclxuXHRcdFx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdFx0XHQuLi50YXJnZXRUYXNrLFxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0Li4udGFyZ2V0VGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgdXNpbmcgV3JpdGVBUElcclxuXHRcdFx0XHRcdGlmIChjb250ZXh0LnBsdWdpbi53cml0ZUFQSSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LnBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHRcdFx0XHR0YXNrSWQ6IHVwZGF0ZWRUYXNrLmlkLFxyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZXM6IHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byB1cGRhdGUgdGFza1wiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiV3JpdGVBUEkgbm90IGF2YWlsYWJsZVwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNvbXBsZXRlZFRhc2tzLnB1c2godGFza0lkKTtcclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0ZmFpbGVkVGFza3MucHVzaChgJHt0YXNrSWR9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBCdWlsZCByZXN1bHQgbWVzc2FnZVxyXG5cdFx0XHRsZXQgbWVzc2FnZSA9IFwiXCI7XHJcblx0XHRcdGlmIChjb21wbGV0ZWRUYXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0bWVzc2FnZSArPSBgQ29tcGxldGVkIHRhc2tzOiAke2NvbXBsZXRlZFRhc2tzLmpvaW4oXCIsIFwiKX1gO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChmYWlsZWRUYXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0aWYgKG1lc3NhZ2UpIG1lc3NhZ2UgKz0gXCI7IFwiO1xyXG5cdFx0XHRcdG1lc3NhZ2UgKz0gYEZhaWxlZDogJHtmYWlsZWRUYXNrcy5qb2luKFwiLCBcIil9YDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3VjY2VzcyA9IGNvbXBsZXRlZFRhc2tzLmxlbmd0aCA+IDA7XHJcblx0XHRcdHJldHVybiBzdWNjZXNzXHJcblx0XHRcdFx0PyB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXN1bHQobWVzc2FnZSlcclxuXHRcdFx0XHQ6IHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQobWVzc2FnZSB8fCBcIk5vIHRhc2tzIHdlcmUgY29tcGxldGVkXCIpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXN1bHQoXHJcblx0XHRcdFx0YEZhaWxlZCB0byBjb21wbGV0ZSByZWxhdGVkIHRhc2tzOiAke2Vycm9yLm1lc3NhZ2V9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJvdGVjdGVkIHZhbGlkYXRlQ29uZmlnKGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoY29uZmlnLnR5cGUgIT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbXBsZXRlQ29uZmlnID0gY29uZmlnIGFzIE9uQ29tcGxldGlvbkNvbXBsZXRlQ29uZmlnO1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0QXJyYXkuaXNBcnJheShjb21wbGV0ZUNvbmZpZy50YXNrSWRzKSAmJlxyXG5cdFx0XHRjb21wbGV0ZUNvbmZpZy50YXNrSWRzLmxlbmd0aCA+IDBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0RGVzY3JpcHRpb24oY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgY29tcGxldGVDb25maWcgPSBjb25maWcgYXMgT25Db21wbGV0aW9uQ29tcGxldGVDb25maWc7XHJcblx0XHRjb25zdCB0YXNrQ291bnQgPSBjb21wbGV0ZUNvbmZpZy50YXNrSWRzPy5sZW5ndGggfHwgMDtcclxuXHRcdHJldHVybiBgQ29tcGxldGUgJHt0YXNrQ291bnR9IHJlbGF0ZWQgdGFzayR7XHJcblx0XHRcdHRhc2tDb3VudCAhPT0gMSA/IFwic1wiIDogXCJcIlxyXG5cdFx0fWA7XHJcblx0fVxyXG59XHJcbiJdfQ==