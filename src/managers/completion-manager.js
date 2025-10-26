import { __awaiter } from "tslib";
import { Component } from "obsidian";
import { OnCompletionActionType, } from "../types/onCompletion";
import { DeleteActionExecutor } from "../executors/completion/delete-executor";
import { KeepActionExecutor } from "../executors/completion/keep-executor";
import { CompleteActionExecutor } from "../executors/completion/complete-executor";
import { MoveActionExecutor } from "../executors/completion/move-executor";
import { ArchiveActionExecutor } from "../executors/completion/archive-executor";
import { DuplicateActionExecutor } from "../executors/completion/duplicate-executor";
export class OnCompletionManager extends Component {
    constructor(app, plugin) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.executors = new Map();
        this.initializeExecutors();
    }
    onload() {
        // Listen for task completion events
        this.plugin.registerEvent(this.app.workspace.on("task-genius:task-completed", this.handleTaskCompleted.bind(this)));
        console.log("OnCompletionManager loaded");
    }
    initializeExecutors() {
        this.executors.set(OnCompletionActionType.DELETE, new DeleteActionExecutor());
        this.executors.set(OnCompletionActionType.KEEP, new KeepActionExecutor());
        this.executors.set(OnCompletionActionType.COMPLETE, new CompleteActionExecutor());
        this.executors.set(OnCompletionActionType.MOVE, new MoveActionExecutor());
        this.executors.set(OnCompletionActionType.ARCHIVE, new ArchiveActionExecutor());
        this.executors.set(OnCompletionActionType.DUPLICATE, new DuplicateActionExecutor());
    }
    handleTaskCompleted(task) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("handleTaskCompleted", task);
            // 检查是否存在 onCompletion 属性，但允许空值进入解析逻辑
            if (!task.metadata.hasOwnProperty("onCompletion")) {
                return;
            }
            try {
                const parseResult = this.parseOnCompletion(task.metadata.onCompletion || "");
                console.log("parseResult", parseResult);
                if (!parseResult.isValid || !parseResult.config) {
                    console.warn("Invalid onCompletion configuration:", parseResult.error);
                    return;
                }
                yield this.executeOnCompletion(task, parseResult.config);
            }
            catch (error) {
                console.error("Error executing onCompletion action:", error);
            }
        });
    }
    parseOnCompletion(onCompletionValue) {
        if (!onCompletionValue || typeof onCompletionValue !== "string") {
            return {
                config: null,
                rawValue: onCompletionValue || "",
                isValid: false,
                error: "Empty or invalid onCompletion value",
            };
        }
        const trimmedValue = onCompletionValue.trim();
        try {
            // Try to parse as JSON first (structured format)
            if (trimmedValue.startsWith("{")) {
                const config = JSON.parse(onCompletionValue);
                return {
                    config,
                    rawValue: onCompletionValue,
                    isValid: this.validateConfig(config),
                    error: this.validateConfig(config)
                        ? undefined
                        : "Invalid configuration structure",
                };
            }
            // Parse simple text format
            const config = this.parseSimpleFormat(trimmedValue);
            return {
                config,
                rawValue: onCompletionValue,
                isValid: config !== null,
                error: config === null
                    ? "Unrecognized onCompletion format"
                    : undefined,
            };
        }
        catch (error) {
            return {
                config: null,
                rawValue: onCompletionValue,
                isValid: false,
                error: `Parse error: ${error.message}`,
            };
        }
    }
    parseSimpleFormat(value) {
        const lowerValue = value.toLowerCase();
        switch (lowerValue) {
            case "delete":
                return { type: OnCompletionActionType.DELETE };
            case "keep":
                return { type: OnCompletionActionType.KEEP };
            case "archive":
                return { type: OnCompletionActionType.ARCHIVE };
            default:
                // Check for parameterized formats (case-insensitive)
                if (lowerValue.startsWith("complete:")) {
                    const taskIdsStr = value.substring(9);
                    const taskIds = taskIdsStr
                        .split(",")
                        .map((id) => id.trim())
                        .filter((id) => id);
                    return {
                        type: OnCompletionActionType.COMPLETE,
                        taskIds: taskIds.length > 0 ? taskIds : [], // Allow empty taskIds array
                    };
                }
                if (lowerValue.startsWith("move:")) {
                    const targetFile = value.substring(5).trim();
                    return {
                        type: OnCompletionActionType.MOVE,
                        targetFile: targetFile || "", // Allow empty targetFile
                    };
                }
                if (lowerValue.startsWith("archive:")) {
                    const archiveFile = value.substring(8).trim();
                    return {
                        type: OnCompletionActionType.ARCHIVE,
                        archiveFile,
                    };
                }
                if (lowerValue.startsWith("duplicate:")) {
                    const targetFile = value.substring(10).trim();
                    return {
                        type: OnCompletionActionType.DUPLICATE,
                        targetFile,
                    };
                }
                return null;
        }
    }
    validateConfig(config) {
        if (!config || !config.type) {
            return false;
        }
        switch (config.type) {
            case OnCompletionActionType.DELETE:
            case OnCompletionActionType.KEEP:
                return true;
            case OnCompletionActionType.COMPLETE:
                // Allow partial config - taskIds can be empty array
                return Array.isArray(config.taskIds);
            case OnCompletionActionType.MOVE:
                // Allow partial config - targetFile can be empty string
                return typeof config.targetFile === "string";
            case OnCompletionActionType.ARCHIVE:
            case OnCompletionActionType.DUPLICATE:
                return true; // These can work with default values
            default:
                return false;
        }
    }
    executeOnCompletion(task, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const executor = this.executors.get(config.type);
            if (!executor) {
                return {
                    success: false,
                    error: `No executor found for action type: ${config.type}`,
                };
            }
            const context = {
                task,
                plugin: this.plugin,
                app: this.app,
            };
            try {
                return yield executor.execute(context, config);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Execution failed: ${error.message}`,
                };
            }
        });
    }
    onunload() {
        this.executors.clear();
        console.log("OnCompletionManager unloaded");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tcGxldGlvbi1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFPLE1BQU0sVUFBVSxDQUFDO0FBRTFDLE9BQU8sRUFFTixzQkFBc0IsR0FJdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUcvQixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVyRixNQUFNLE9BQU8sbUJBQW9CLFNBQVEsU0FBUztJQUdqRCxZQUFvQixHQUFRLEVBQVUsTUFBNkI7UUFDbEUsS0FBSyxFQUFFLENBQUM7UUFEVyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFFbEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxNQUFNO1FBQ0wsb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQ3BCLDRCQUE0QixFQUM1QixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNuQyxDQUNELENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0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LE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQzthQUMvQztZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU87b0JBQ04sT0FBTyxFQUFFLEtBQUs7b0JBQ2QsS0FBSyxFQUFFLHFCQUFxQixLQUFLLENBQUMsT0FBTyxFQUFFO2lCQUMzQyxDQUFDO2FBQ0Y7UUFDRixDQUFDO0tBQUE7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDN0MsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0T25Db21wbGV0aW9uQ29uZmlnLFxyXG5cdE9uQ29tcGxldGlvbkFjdGlvblR5cGUsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQsXHJcblx0T25Db21wbGV0aW9uUGFyc2VSZXN1bHQsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBCYXNlQWN0aW9uRXhlY3V0b3IgfSBmcm9tIFwiLi4vZXhlY3V0b3JzL2NvbXBsZXRpb24vYmFzZS1leGVjdXRvclwiO1xyXG5pbXBvcnQgeyBEZWxldGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kZWxldGUtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHsgS2VlcEFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2tlZXAtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHsgQ29tcGxldGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9jb21wbGV0ZS1leGVjdXRvclwiO1xyXG5pbXBvcnQgeyBNb3ZlQWN0aW9uRXhlY3V0b3IgfSBmcm9tIFwiLi4vZXhlY3V0b3JzL2NvbXBsZXRpb24vbW92ZS1leGVjdXRvclwiO1xyXG5pbXBvcnQgeyBBcmNoaXZlQWN0aW9uRXhlY3V0b3IgfSBmcm9tIFwiLi4vZXhlY3V0b3JzL2NvbXBsZXRpb24vYXJjaGl2ZS1leGVjdXRvclwiO1xyXG5pbXBvcnQgeyBEdXBsaWNhdGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kdXBsaWNhdGUtZXhlY3V0b3JcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBPbkNvbXBsZXRpb25NYW5hZ2VyIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGV4ZWN1dG9yczogTWFwPE9uQ29tcGxldGlvbkFjdGlvblR5cGUsIEJhc2VBY3Rpb25FeGVjdXRvcj47XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHAsIHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmV4ZWN1dG9ycyA9IG5ldyBNYXAoKTtcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUV4ZWN1dG9ycygpO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gTGlzdGVuIGZvciB0YXNrIGNvbXBsZXRpb24gZXZlbnRzXHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uub24oXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbXBsZXRlZC5iaW5kKHRoaXMpXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJPbkNvbXBsZXRpb25NYW5hZ2VyIGxvYWRlZFwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZUV4ZWN1dG9ycygpIHtcclxuXHRcdHRoaXMuZXhlY3V0b3JzLnNldChcclxuXHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdG5ldyBEZWxldGVBY3Rpb25FeGVjdXRvcigpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5leGVjdXRvcnMuc2V0KFxyXG5cdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLktFRVAsXHJcblx0XHRcdG5ldyBLZWVwQWN0aW9uRXhlY3V0b3IoKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuZXhlY3V0b3JzLnNldChcclxuXHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0bmV3IENvbXBsZXRlQWN0aW9uRXhlY3V0b3IoKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuZXhlY3V0b3JzLnNldChcclxuXHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRuZXcgTW92ZUFjdGlvbkV4ZWN1dG9yKClcclxuXHRcdCk7XHJcblx0XHR0aGlzLmV4ZWN1dG9ycy5zZXQoXHJcblx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0bmV3IEFyY2hpdmVBY3Rpb25FeGVjdXRvcigpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5leGVjdXRvcnMuc2V0KFxyXG5cdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0bmV3IER1cGxpY2F0ZUFjdGlvbkV4ZWN1dG9yKClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZVRhc2tDb21wbGV0ZWQodGFzazogVGFzaykge1xyXG5cdFx0Y29uc29sZS5sb2coXCJoYW5kbGVUYXNrQ29tcGxldGVkXCIsIHRhc2spO1xyXG5cdFx0Ly8g5qOA5p+l5piv5ZCm5a2Y5ZyoIG9uQ29tcGxldGlvbiDlsZ7mgKfvvIzkvYblhYHorrjnqbrlgLzov5vlhaXop6PmnpDpgLvovpFcclxuXHRcdGlmICghdGFzay5tZXRhZGF0YS5oYXNPd25Qcm9wZXJ0eShcIm9uQ29tcGxldGlvblwiKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSB0aGlzLnBhcnNlT25Db21wbGV0aW9uKFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEub25Db21wbGV0aW9uIHx8IFwiXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFwicGFyc2VSZXN1bHRcIiwgcGFyc2VSZXN1bHQpO1xyXG5cclxuXHRcdFx0aWYgKCFwYXJzZVJlc3VsdC5pc1ZhbGlkIHx8ICFwYXJzZVJlc3VsdC5jb25maWcpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIkludmFsaWQgb25Db21wbGV0aW9uIGNvbmZpZ3VyYXRpb246XCIsXHJcblx0XHRcdFx0XHRwYXJzZVJlc3VsdC5lcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhd2FpdCB0aGlzLmV4ZWN1dGVPbkNvbXBsZXRpb24odGFzaywgcGFyc2VSZXN1bHQuY29uZmlnKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBleGVjdXRpbmcgb25Db21wbGV0aW9uIGFjdGlvbjpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHBhcnNlT25Db21wbGV0aW9uKFxyXG5cdFx0b25Db21wbGV0aW9uVmFsdWU6IHN0cmluZ1xyXG5cdCk6IE9uQ29tcGxldGlvblBhcnNlUmVzdWx0IHtcclxuXHRcdGlmICghb25Db21wbGV0aW9uVmFsdWUgfHwgdHlwZW9mIG9uQ29tcGxldGlvblZhbHVlICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29uZmlnOiBudWxsLFxyXG5cdFx0XHRcdHJhd1ZhbHVlOiBvbkNvbXBsZXRpb25WYWx1ZSB8fCBcIlwiLFxyXG5cdFx0XHRcdGlzVmFsaWQ6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBcIkVtcHR5IG9yIGludmFsaWQgb25Db21wbGV0aW9uIHZhbHVlXCIsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdHJpbW1lZFZhbHVlID0gb25Db21wbGV0aW9uVmFsdWUudHJpbSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFRyeSB0byBwYXJzZSBhcyBKU09OIGZpcnN0IChzdHJ1Y3R1cmVkIGZvcm1hdClcclxuXHRcdFx0aWYgKHRyaW1tZWRWYWx1ZS5zdGFydHNXaXRoKFwie1wiKSkge1xyXG5cdFx0XHRcdGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoXHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb25WYWx1ZVxyXG5cdFx0XHRcdCkgYXMgT25Db21wbGV0aW9uQ29uZmlnO1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRjb25maWcsXHJcblx0XHRcdFx0XHRyYXdWYWx1ZTogb25Db21wbGV0aW9uVmFsdWUsXHJcblx0XHRcdFx0XHRpc1ZhbGlkOiB0aGlzLnZhbGlkYXRlQ29uZmlnKGNvbmZpZyksXHJcblx0XHRcdFx0XHRlcnJvcjogdGhpcy52YWxpZGF0ZUNvbmZpZyhjb25maWcpXHJcblx0XHRcdFx0XHRcdD8gdW5kZWZpbmVkXHJcblx0XHRcdFx0XHRcdDogXCJJbnZhbGlkIGNvbmZpZ3VyYXRpb24gc3RydWN0dXJlXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGFyc2Ugc2ltcGxlIHRleHQgZm9ybWF0XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMucGFyc2VTaW1wbGVGb3JtYXQodHJpbW1lZFZhbHVlKTtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjb25maWcsXHJcblx0XHRcdFx0cmF3VmFsdWU6IG9uQ29tcGxldGlvblZhbHVlLFxyXG5cdFx0XHRcdGlzVmFsaWQ6IGNvbmZpZyAhPT0gbnVsbCxcclxuXHRcdFx0XHRlcnJvcjpcclxuXHRcdFx0XHRcdGNvbmZpZyA9PT0gbnVsbFxyXG5cdFx0XHRcdFx0XHQ/IFwiVW5yZWNvZ25pemVkIG9uQ29tcGxldGlvbiBmb3JtYXRcIlxyXG5cdFx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29uZmlnOiBudWxsLFxyXG5cdFx0XHRcdHJhd1ZhbHVlOiBvbkNvbXBsZXRpb25WYWx1ZSxcclxuXHRcdFx0XHRpc1ZhbGlkOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGFyc2VTaW1wbGVGb3JtYXQodmFsdWU6IHN0cmluZyk6IE9uQ29tcGxldGlvbkNvbmZpZyB8IG51bGwge1xyXG5cdFx0Y29uc3QgbG93ZXJWYWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0c3dpdGNoIChsb3dlclZhbHVlKSB7XHJcblx0XHRcdGNhc2UgXCJkZWxldGVcIjpcclxuXHRcdFx0XHRyZXR1cm4geyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSB9O1xyXG5cdFx0XHRjYXNlIFwia2VlcFwiOlxyXG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCB9O1xyXG5cdFx0XHRjYXNlIFwiYXJjaGl2ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSB9O1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdC8vIENoZWNrIGZvciBwYXJhbWV0ZXJpemVkIGZvcm1hdHMgKGNhc2UtaW5zZW5zaXRpdmUpXHJcblx0XHRcdFx0aWYgKGxvd2VyVmFsdWUuc3RhcnRzV2l0aChcImNvbXBsZXRlOlwiKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFza0lkc1N0ciA9IHZhbHVlLnN1YnN0cmluZyg5KTtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tJZHMgPSB0YXNrSWRzU3RyXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgoaWQpID0+IGlkLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoaWQpID0+IGlkKTtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0XHRcdHRhc2tJZHM6IHRhc2tJZHMubGVuZ3RoID4gMCA/IHRhc2tJZHMgOiBbXSwgLy8gQWxsb3cgZW1wdHkgdGFza0lkcyBhcnJheVxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKGxvd2VyVmFsdWUuc3RhcnRzV2l0aChcIm1vdmU6XCIpKSB7XHJcblx0XHRcdFx0XHRjb25zdCB0YXJnZXRGaWxlID0gdmFsdWUuc3Vic3RyaW5nKDUpLnRyaW0oKTtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0RmlsZTogdGFyZ2V0RmlsZSB8fCBcIlwiLCAvLyBBbGxvdyBlbXB0eSB0YXJnZXRGaWxlXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAobG93ZXJWYWx1ZS5zdGFydHNXaXRoKFwiYXJjaGl2ZTpcIikpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGFyY2hpdmVGaWxlID0gdmFsdWUuc3Vic3RyaW5nKDgpLnRyaW0oKTtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHRcdFx0YXJjaGl2ZUZpbGUsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAobG93ZXJWYWx1ZS5zdGFydHNXaXRoKFwiZHVwbGljYXRlOlwiKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0RmlsZSA9IHZhbHVlLnN1YnN0cmluZygxMCkudHJpbSgpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUsXHJcblx0XHRcdFx0XHRcdHRhcmdldEZpbGUsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdmFsaWRhdGVDb25maWcoY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcpOiBib29sZWFuIHtcclxuXHRcdGlmICghY29uZmlnIHx8ICFjb25maWcudHlwZSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0c3dpdGNoIChjb25maWcudHlwZSkge1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFOlxyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUDpcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFOlxyXG5cdFx0XHRcdC8vIEFsbG93IHBhcnRpYWwgY29uZmlnIC0gdGFza0lkcyBjYW4gYmUgZW1wdHkgYXJyYXlcclxuXHRcdFx0XHRyZXR1cm4gQXJyYXkuaXNBcnJheSgoY29uZmlnIGFzIGFueSkudGFza0lkcyk7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFOlxyXG5cdFx0XHRcdC8vIEFsbG93IHBhcnRpYWwgY29uZmlnIC0gdGFyZ2V0RmlsZSBjYW4gYmUgZW1wdHkgc3RyaW5nXHJcblx0XHRcdFx0cmV0dXJuIHR5cGVvZiAoY29uZmlnIGFzIGFueSkudGFyZ2V0RmlsZSA9PT0gXCJzdHJpbmdcIjtcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkU6XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEU6XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7IC8vIFRoZXNlIGNhbiB3b3JrIHdpdGggZGVmYXVsdCB2YWx1ZXNcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgZXhlY3V0ZU9uQ29tcGxldGlvbihcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHRjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZ1xyXG5cdCk6IFByb21pc2U8T25Db21wbGV0aW9uRXhlY3V0aW9uUmVzdWx0PiB7XHJcblx0XHRjb25zdCBleGVjdXRvciA9IHRoaXMuZXhlY3V0b3JzLmdldChjb25maWcudHlwZSk7XHJcblxyXG5cdFx0aWYgKCFleGVjdXRvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgTm8gZXhlY3V0b3IgZm91bmQgZm9yIGFjdGlvbiB0eXBlOiAke2NvbmZpZy50eXBlfWAsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0dGFzayxcclxuXHRcdFx0cGx1Z2luOiB0aGlzLnBsdWdpbixcclxuXHRcdFx0YXBwOiB0aGlzLmFwcCxcclxuXHRcdH07XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0cmV0dXJuIGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUoY29udGV4dCwgY29uZmlnKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGBFeGVjdXRpb24gZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy5leGVjdXRvcnMuY2xlYXIoKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiT25Db21wbGV0aW9uTWFuYWdlciB1bmxvYWRlZFwiKTtcclxuXHR9XHJcbn1cclxuIl19