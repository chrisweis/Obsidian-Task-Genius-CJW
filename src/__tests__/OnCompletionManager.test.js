/**
 * OnCompletionManager Tests
 *
 * Tests for onCompletion functionality including:
 * - Configuration parsing (simple and JSON formats)
 * - Action executor dispatching
 * - Task completion event handling
 * - Error handling and validation
 */
import { __awaiter } from "tslib";
import { OnCompletionManager } from "../managers/completion-manager";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock all action executors
jest.mock("../executors/completion/delete-executor");
jest.mock("../executors/completion/keep-executor");
jest.mock("../executors/completion/complete-executor");
jest.mock("../executors/completion/move-executor");
jest.mock("../executors/completion/archive-executor");
jest.mock("../executors/completion/duplicate-executor");
describe("OnCompletionManager", () => {
    let manager;
    let mockApp;
    let mockPlugin;
    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin();
        // Mock workspace events
        mockApp.workspace = Object.assign(Object.assign({}, mockApp.workspace), { on: jest.fn().mockReturnValue({ unload: jest.fn() }) });
        // Mock plugin event registration
        mockPlugin.registerEvent = jest.fn();
        manager = new OnCompletionManager(mockApp, mockPlugin);
    });
    afterEach(() => {
        manager.unload();
    });
    describe("Initialization", () => {
        it("should initialize all action executors", () => {
            // Verify that all executor types are registered
            expect(manager["executors"].size).toBe(6);
            expect(manager["executors"].has(OnCompletionActionType.DELETE)).toBe(true);
            expect(manager["executors"].has(OnCompletionActionType.KEEP)).toBe(true);
            expect(manager["executors"].has(OnCompletionActionType.COMPLETE)).toBe(true);
            expect(manager["executors"].has(OnCompletionActionType.MOVE)).toBe(true);
            expect(manager["executors"].has(OnCompletionActionType.ARCHIVE)).toBe(true);
            expect(manager["executors"].has(OnCompletionActionType.DUPLICATE)).toBe(true);
        });
        it("should register task completion event listener on load", () => {
            manager.onload();
            expect(mockApp.workspace.on).toHaveBeenCalledWith("task-genius:task-completed", expect.any(Function));
            expect(mockPlugin.registerEvent).toHaveBeenCalled();
        });
    });
    describe("Configuration Parsing", () => {
        describe("Simple Format Parsing", () => {
            it("should parse simple delete action", () => {
                const result = manager.parseOnCompletion("delete");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.DELETE,
                });
                expect(result.error).toBeUndefined();
            });
            it("should parse simple keep action", () => {
                const result = manager.parseOnCompletion("keep");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.KEEP,
                });
            });
            it("should parse simple archive action", () => {
                const result = manager.parseOnCompletion("archive");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.ARCHIVE,
                });
            });
            it("should parse complete action with task IDs", () => {
                const result = manager.parseOnCompletion("complete:task1,task2,task3");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.COMPLETE,
                    taskIds: ["task1", "task2", "task3"],
                });
            });
            it("should parse move action with target file", () => {
                const result = manager.parseOnCompletion("move:archive/completed.md");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.MOVE,
                    targetFile: "archive/completed.md",
                });
            });
            it("should parse archive action with target file", () => {
                const result = manager.parseOnCompletion("archive:archive/old-tasks.md");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.ARCHIVE,
                    archiveFile: "archive/old-tasks.md",
                });
            });
            it("should parse duplicate action with target file", () => {
                const result = manager.parseOnCompletion("duplicate:templates/task-template.md");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.DUPLICATE,
                    targetFile: "templates/task-template.md",
                });
            });
            it("should parse move action with file containing spaces", () => {
                const result = manager.parseOnCompletion("move:my archive file.md");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.MOVE,
                    targetFile: "my archive file.md",
                });
            });
            it("should parse move action with heading", () => {
                const result = manager.parseOnCompletion("move:archive.md#completed-tasks");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.MOVE,
                    targetFile: "archive.md#completed-tasks",
                });
            });
            it("should handle case-insensitive parsing", () => {
                var _a, _b, _c;
                const result1 = manager.parseOnCompletion("DELETE");
                const result2 = manager.parseOnCompletion("Keep");
                const result3 = manager.parseOnCompletion("ARCHIVE");
                expect(result1.isValid).toBe(true);
                expect((_a = result1.config) === null || _a === void 0 ? void 0 : _a.type).toBe(OnCompletionActionType.DELETE);
                expect(result2.isValid).toBe(true);
                expect((_b = result2.config) === null || _b === void 0 ? void 0 : _b.type).toBe(OnCompletionActionType.KEEP);
                expect(result3.isValid).toBe(true);
                expect((_c = result3.config) === null || _c === void 0 ? void 0 : _c.type).toBe(OnCompletionActionType.ARCHIVE);
            });
            it("should handle whitespace in parsing", () => {
                const result = manager.parseOnCompletion("  complete: task1 , task2 , task3  ");
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.COMPLETE,
                    taskIds: ["task1", "task2", "task3"],
                });
            });
        });
        describe("JSON Format Parsing", () => {
            it("should parse JSON delete configuration", () => {
                const jsonConfig = '{"type": "delete"}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.DELETE,
                });
            });
            it("should parse JSON complete configuration", () => {
                const jsonConfig = '{"type": "complete", "taskIds": ["task1", "task2"]}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.COMPLETE,
                    taskIds: ["task1", "task2"],
                });
            });
            it("should parse JSON move configuration", () => {
                const jsonConfig = '{"type": "move", "targetFile": "done.md", "targetSection": "Completed"}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.MOVE,
                    targetFile: "done.md",
                    targetSection: "Completed",
                });
            });
            it("should parse JSON archive configuration", () => {
                const jsonConfig = '{"type": "archive", "archiveFile": "archive.md", "archiveSection": "Old Tasks"}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.ARCHIVE,
                    archiveFile: "archive.md",
                    archiveSection: "Old Tasks",
                });
            });
            it("should parse JSON duplicate configuration", () => {
                const jsonConfig = '{"type": "duplicate", "targetFile": "template.md", "preserveMetadata": true}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(true);
                expect(result.config).toEqual({
                    type: OnCompletionActionType.DUPLICATE,
                    targetFile: "template.md",
                    preserveMetadata: true,
                });
            });
        });
        describe("Error Handling", () => {
            it("should handle empty input", () => {
                const result = manager.parseOnCompletion("");
                expect(result.isValid).toBe(false);
                expect(result.config).toBeNull();
                expect(result.error).toBe("Empty or invalid onCompletion value");
            });
            it("should handle null input", () => {
                const result = manager.parseOnCompletion(null);
                expect(result.isValid).toBe(false);
                expect(result.config).toBeNull();
                expect(result.error).toBe("Empty or invalid onCompletion value");
            });
            it("should handle invalid JSON", () => {
                const result = manager.parseOnCompletion('{"type": "delete"'); // Missing closing brace
                expect(result.isValid).toBe(false);
                expect(result.config).toBeNull();
                expect(result.error).toContain("Parse error:");
            });
            it("should handle unrecognized simple format", () => {
                const result = manager.parseOnCompletion("unknown-action");
                expect(result.isValid).toBe(false);
                expect(result.config).toBeNull();
                expect(result.error).toBe("Unrecognized onCompletion format");
            });
            it("should handle invalid configuration structure", () => {
                const jsonConfig = '{"invalidKey": "value"}';
                const result = manager.parseOnCompletion(jsonConfig);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe("Invalid configuration structure");
            });
        });
    });
    describe("Configuration Validation", () => {
        it("should validate delete configuration", () => {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate keep configuration", () => {
            const config = {
                type: OnCompletionActionType.KEEP,
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate complete configuration with task IDs", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["task1", "task2"],
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate complete configuration with empty task IDs (partial config)", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: [],
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate move configuration with target file", () => {
            const config = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.md",
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate move configuration with empty target file (partial config)", () => {
            const config = {
                type: OnCompletionActionType.MOVE,
                targetFile: "",
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate archive configuration", () => {
            const config = {
                type: OnCompletionActionType.ARCHIVE,
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should validate duplicate configuration", () => {
            const config = {
                type: OnCompletionActionType.DUPLICATE,
            };
            expect(manager["validateConfig"](config)).toBe(true);
        });
        it("should invalidate configuration without type", () => {
            const config = {};
            expect(manager["validateConfig"](config)).toBe(false);
        });
    });
    describe("Action Execution", () => {
        let mockTask;
        beforeEach(() => {
            mockTask = {
                id: "test-task-id",
                content: "Test task",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Test task 🏁 delete",
            };
        });
        it("should execute delete action successfully", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const mockExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            if (mockExecutor) {
                mockExecutor.execute = jest.fn().mockResolvedValue({
                    success: true,
                    message: "Task deleted successfully",
                });
            }
            const result = yield manager.executeOnCompletion(mockTask, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Task deleted successfully");
            expect(mockExecutor === null || mockExecutor === void 0 ? void 0 : mockExecutor.execute).toHaveBeenCalledWith({
                task: mockTask,
                plugin: mockPlugin,
                app: mockApp,
            }, config);
        }));
        it("should handle executor not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: "unknown",
            };
            const result = yield manager.executeOnCompletion(mockTask, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("No executor found for action type: unknown");
        }));
        it("should handle executor execution error", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const mockExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            if (mockExecutor) {
                mockExecutor.execute = jest
                    .fn()
                    .mockRejectedValue(new Error("Execution failed"));
            }
            const result = yield manager.executeOnCompletion(mockTask, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Execution failed: Execution failed");
        }));
    });
    describe("Task Completion Event Handling", () => {
        let mockTask;
        beforeEach(() => {
            mockTask = {
                id: "test-task-id",
                content: "Test task",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Test task 🏁 delete",
            };
            // Mock the executeOnCompletion method
            manager.executeOnCompletion = jest.fn().mockResolvedValue({
                success: true,
                message: "Action executed successfully",
            });
        });
        it("should handle task completion with valid onCompletion config", () => __awaiter(void 0, void 0, void 0, function* () {
            yield manager["handleTaskCompleted"](mockTask);
            expect(manager.executeOnCompletion).toHaveBeenCalledWith(mockTask, {
                type: OnCompletionActionType.DELETE,
            });
        }));
        it("should ignore task completion without onCompletion config", () => __awaiter(void 0, void 0, void 0, function* () {
            const taskWithoutConfig = Object.assign({}, mockTask);
            delete taskWithoutConfig.metadata.onCompletion;
            yield manager["handleTaskCompleted"](taskWithoutConfig);
            expect(manager.executeOnCompletion).not.toHaveBeenCalled();
        }));
        it("should handle task completion with invalid onCompletion config", () => __awaiter(void 0, void 0, void 0, function* () {
            const taskWithInvalidConfig = Object.assign(Object.assign({}, mockTask), { metadata: {
                    onCompletion: "invalid-action",
                    tags: [],
                    children: [],
                } });
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
            yield manager["handleTaskCompleted"](taskWithInvalidConfig);
            expect(manager.executeOnCompletion).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith("Invalid onCompletion configuration:", "Unrecognized onCompletion format");
            consoleSpy.mockRestore();
        }));
        it("should handle execution errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            manager.executeOnCompletion = jest
                .fn()
                .mockRejectedValue(new Error("Execution error"));
            // 恢复原始 console.error
            const originalError = console.error;
            console.error = jest.fn();
            const consoleSpy = console.error;
            yield manager["handleTaskCompleted"](mockTask);
            expect(consoleSpy).toHaveBeenCalledWith("Error executing onCompletion action:", expect.any(Error));
            // 恢复原始方法
            console.error = originalError;
        }));
    });
    describe("Integration Tests", () => {
        it("should handle complete workflow from parsing to execution", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTask = {
                id: "integration-test-task",
                content: "Integration test task",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "complete:related-task-1,related-task-2",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Integration test task 🏁 complete:related-task-1,related-task-2",
            };
            const mockExecutor = manager["executors"].get(OnCompletionActionType.COMPLETE);
            if (mockExecutor) {
                mockExecutor.execute = jest.fn().mockResolvedValue({
                    success: true,
                    message: "Related tasks completed successfully",
                });
            }
            // Test the complete workflow
            yield manager["handleTaskCompleted"](mockTask);
            expect(mockExecutor === null || mockExecutor === void 0 ? void 0 : mockExecutor.execute).toHaveBeenCalledWith({
                task: mockTask,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["related-task-1", "related-task-2"],
            });
        }));
        it("should handle JSON configuration workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTask = {
                id: "json-test-task",
                content: "JSON test task",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "move", "targetFile": "archive.md", "targetSection": "Completed"}',
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: '- [x] JSON test task 🏁 {"type": "move", "targetFile": "archive.md", "targetSection": "Completed"}',
            };
            const mockExecutor = manager["executors"].get(OnCompletionActionType.MOVE);
            if (mockExecutor) {
                mockExecutor.execute = jest.fn().mockResolvedValue({
                    success: true,
                    message: "Task moved successfully",
                });
            }
            yield manager["handleTaskCompleted"](mockTask);
            expect(mockExecutor === null || mockExecutor === void 0 ? void 0 : mockExecutor.execute).toHaveBeenCalledWith({
                task: mockTask,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.MOVE,
                targetFile: "archive.md",
                targetSection: "Completed",
            });
        }));
    });
    describe("Cleanup", () => {
        it("should clear executors on unload", () => {
            manager.unload();
            expect(manager["executors"].size).toBe(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25Db21wbGV0aW9uTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiT25Db21wbGV0aW9uTWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOztBQUVILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFDTixzQkFBc0IsR0FJdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzlELDRCQUE0QjtBQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7QUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsMkNBQTJDLENBQUMsQ0FBQztBQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7QUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0FBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQUV4RCxRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLElBQUksT0FBNEIsQ0FBQztJQUNqQyxJQUFJLE9BQVksQ0FBQztJQUNqQixJQUFJLFVBQWlDLENBQUM7SUFFdEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUMxQixVQUFVLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUVoQyx3QkFBd0I7UUFDeEIsT0FBTyxDQUFDLFNBQVMsbUNBQ2IsT0FBTyxDQUFDLFNBQVMsS0FDcEIsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFF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QUFJLFlBQVksRUFBRTtnQkFDakIsWUFBWSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUM7b0JBQ2xELE9BQU8sRUFBRSxJQUFJO29CQUNiLE9BQU8sRUFBRSx5QkFBeUI7aUJBQ2xDLENBQUMsQ0FBQzthQUNIO1lBRUQsTUFBTSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUvQyxNQUFNLENBQUMsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLE9BQU8sQ0FBQyxDQUFDLG9CQUFvQixDQUNqRDtnQkFDQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsVUFBVTtnQkFDbEIsR0FBRyxFQUFFLE9BQU87YUFDWixFQUNEO2dCQUNDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxJQUFJO2dCQUNqQyxVQUFVLEVBQUUsWUFBWTtnQkFDeEIsYUFBYSxFQUFFLFdBQVc7YUFDMUIsQ0FDRCxDQUFDO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDeEIsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFakIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE9uQ29tcGxldGlvbk1hbmFnZXIgVGVzdHNcclxuICpcclxuICogVGVzdHMgZm9yIG9uQ29tcGxldGlvbiBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBDb25maWd1cmF0aW9uIHBhcnNpbmcgKHNpbXBsZSBhbmQgSlNPTiBmb3JtYXRzKVxyXG4gKiAtIEFjdGlvbiBleGVjdXRvciBkaXNwYXRjaGluZ1xyXG4gKiAtIFRhc2sgY29tcGxldGlvbiBldmVudCBoYW5kbGluZ1xyXG4gKiAtIEVycm9yIGhhbmRsaW5nIGFuZCB2YWxpZGF0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgT25Db21wbGV0aW9uTWFuYWdlciB9IGZyb20gXCIuLi9tYW5hZ2Vycy9jb21wbGV0aW9uLW1hbmFnZXJcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkNvbmZpZyxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25SZXN1bHQsXHJcblx0T25Db21wbGV0aW9uUGFyc2VSZXN1bHQsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiwgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuLy8gTW9jayBhbGwgYWN0aW9uIGV4ZWN1dG9yc1xyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kZWxldGUtZXhlY3V0b3JcIik7XHJcbmplc3QubW9jayhcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2tlZXAtZXhlY3V0b3JcIik7XHJcbmplc3QubW9jayhcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2NvbXBsZXRlLWV4ZWN1dG9yXCIpO1xyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9tb3ZlLWV4ZWN1dG9yXCIpO1xyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9hcmNoaXZlLWV4ZWN1dG9yXCIpO1xyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kdXBsaWNhdGUtZXhlY3V0b3JcIik7XHJcblxyXG5kZXNjcmliZShcIk9uQ29tcGxldGlvbk1hbmFnZXJcIiwgKCkgPT4ge1xyXG5cdGxldCBtYW5hZ2VyOiBPbkNvbXBsZXRpb25NYW5hZ2VyO1xyXG5cdGxldCBtb2NrQXBwOiBhbnk7XHJcblx0bGV0IG1vY2tQbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHJcblx0XHQvLyBNb2NrIHdvcmtzcGFjZSBldmVudHNcclxuXHRcdG1vY2tBcHAud29ya3NwYWNlID0ge1xyXG5cdFx0XHQuLi5tb2NrQXBwLndvcmtzcGFjZSxcclxuXHRcdFx0b246IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoeyB1bmxvYWQ6IGplc3QuZm4oKSB9KSxcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTW9jayBwbHVnaW4gZXZlbnQgcmVnaXN0cmF0aW9uXHJcblx0XHRtb2NrUGx1Z2luLnJlZ2lzdGVyRXZlbnQgPSBqZXN0LmZuKCk7XHJcblxyXG5cdFx0bWFuYWdlciA9IG5ldyBPbkNvbXBsZXRpb25NYW5hZ2VyKG1vY2tBcHAsIG1vY2tQbHVnaW4pO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0bWFuYWdlci51bmxvYWQoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJJbml0aWFsaXphdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBpbml0aWFsaXplIGFsbCBhY3Rpb24gZXhlY3V0b3JzXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVmVyaWZ5IHRoYXQgYWxsIGV4ZWN1dG9yIHR5cGVzIGFyZSByZWdpc3RlcmVkXHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLnNpemUpLnRvQmUoNik7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmhhcyhPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSlcclxuXHRcdFx0KS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobWFuYWdlcltcImV4ZWN1dG9yc1wiXS5oYXMoT25Db21wbGV0aW9uQWN0aW9uVHlwZS5LRUVQKSkudG9CZShcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmhhcyhPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFKVxyXG5cdFx0XHQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmhhcyhPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUpKS50b0JlKFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KFxyXG5cdFx0XHRcdG1hbmFnZXJbXCJleGVjdXRvcnNcIl0uaGFzKE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSlcclxuXHRcdFx0KS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QoXHJcblx0XHRcdFx0bWFuYWdlcltcImV4ZWN1dG9yc1wiXS5oYXMoT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUpXHJcblx0XHRcdCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlZ2lzdGVyIHRhc2sgY29tcGxldGlvbiBldmVudCBsaXN0ZW5lciBvbiBsb2FkXCIsICgpID0+IHtcclxuXHRcdFx0bWFuYWdlci5vbmxvYWQoKTtcclxuXHJcblx0XHRcdGV4cGVjdChtb2NrQXBwLndvcmtzcGFjZS5vbikudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdGV4cGVjdC5hbnkoRnVuY3Rpb24pXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2NrUGx1Z2luLnJlZ2lzdGVyRXZlbnQpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbmZpZ3VyYXRpb24gUGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRkZXNjcmliZShcIlNpbXBsZSBGb3JtYXQgUGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIHNpbXBsZSBkZWxldGUgYWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKFwiZGVsZXRlXCIpO1xyXG5cclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWcpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIHNpbXBsZSBrZWVwIGFjdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihcImtlZXBcIik7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLktFRVAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgcGFyc2Ugc2ltcGxlIGFyY2hpdmUgYWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKFwiYXJjaGl2ZVwiKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpdChcInNob3VsZCBwYXJzZSBjb21wbGV0ZSBhY3Rpb24gd2l0aCB0YXNrIElEc1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihcclxuXHRcdFx0XHRcdFwiY29tcGxldGU6dGFzazEsdGFzazIsdGFzazNcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLFxyXG5cdFx0XHRcdFx0dGFza0lkczogW1widGFzazFcIiwgXCJ0YXNrMlwiLCBcInRhc2szXCJdLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIG1vdmUgYWN0aW9uIHdpdGggdGFyZ2V0IGZpbGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXHJcblx0XHRcdFx0XHRcIm1vdmU6YXJjaGl2ZS9jb21wbGV0ZWQubWRcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiBcImFyY2hpdmUvY29tcGxldGVkLm1kXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgcGFyc2UgYXJjaGl2ZSBhY3Rpb24gd2l0aCB0YXJnZXQgZmlsZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihcclxuXHRcdFx0XHRcdFwiYXJjaGl2ZTphcmNoaXZlL29sZC10YXNrcy5tZFwiXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHRcdGFyY2hpdmVGaWxlOiBcImFyY2hpdmUvb2xkLXRhc2tzLm1kXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgcGFyc2UgZHVwbGljYXRlIGFjdGlvbiB3aXRoIHRhcmdldCBmaWxlXCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKFxyXG5cdFx0XHRcdFx0XCJkdXBsaWNhdGU6dGVtcGxhdGVzL3Rhc2stdGVtcGxhdGUubWRcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwidGVtcGxhdGVzL3Rhc2stdGVtcGxhdGUubWRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpdChcInNob3VsZCBwYXJzZSBtb3ZlIGFjdGlvbiB3aXRoIGZpbGUgY29udGFpbmluZyBzcGFjZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXHJcblx0XHRcdFx0XHRcIm1vdmU6bXkgYXJjaGl2ZSBmaWxlLm1kXCJcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWcpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRcdFx0dGFyZ2V0RmlsZTogXCJteSBhcmNoaXZlIGZpbGUubWRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpdChcInNob3VsZCBwYXJzZSBtb3ZlIGFjdGlvbiB3aXRoIGhlYWRpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXHJcblx0XHRcdFx0XHRcIm1vdmU6YXJjaGl2ZS5tZCNjb21wbGV0ZWQtdGFza3NcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiBcImFyY2hpdmUubWQjY29tcGxldGVkLXRhc2tzXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgaGFuZGxlIGNhc2UtaW5zZW5zaXRpdmUgcGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0MSA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXCJERUxFVEVcIik7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0MiA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXCJLZWVwXCIpO1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdDMgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKFwiQVJDSElWRVwiKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdDEuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0MS5jb25maWc/LnR5cGUpLnRvQmUoXHJcblx0XHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdDIuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0Mi5jb25maWc/LnR5cGUpLnRvQmUoT25Db21wbGV0aW9uQWN0aW9uVHlwZS5LRUVQKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0My5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQzLmNvbmZpZz8udHlwZSkudG9CZShcclxuXHRcdFx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgaGFuZGxlIHdoaXRlc3BhY2UgaW4gcGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihcclxuXHRcdFx0XHRcdFwiICBjb21wbGV0ZTogdGFzazEgLCB0YXNrMiAsIHRhc2szICBcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLFxyXG5cdFx0XHRcdFx0dGFza0lkczogW1widGFzazFcIiwgXCJ0YXNrMlwiLCBcInRhc2szXCJdLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGRlc2NyaWJlKFwiSlNPTiBGb3JtYXQgUGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIEpTT04gZGVsZXRlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGpzb25Db25maWcgPSAne1widHlwZVwiOiBcImRlbGV0ZVwifSc7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihqc29uQ29uZmlnKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIEpTT04gY29tcGxldGUgY29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QganNvbkNvbmZpZyA9XHJcblx0XHRcdFx0XHQne1widHlwZVwiOiBcImNvbXBsZXRlXCIsIFwidGFza0lkc1wiOiBbXCJ0YXNrMVwiLCBcInRhc2syXCJdfSc7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihqc29uQ29uZmlnKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0XHR0YXNrSWRzOiBbXCJ0YXNrMVwiLCBcInRhc2syXCJdLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIEpTT04gbW92ZSBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBqc29uQ29uZmlnID1cclxuXHRcdFx0XHRcdCd7XCJ0eXBlXCI6IFwibW92ZVwiLCBcInRhcmdldEZpbGVcIjogXCJkb25lLm1kXCIsIFwidGFyZ2V0U2VjdGlvblwiOiBcIkNvbXBsZXRlZFwifSc7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihqc29uQ29uZmlnKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwiZG9uZS5tZFwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJDb21wbGV0ZWRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpdChcInNob3VsZCBwYXJzZSBKU09OIGFyY2hpdmUgY29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QganNvbkNvbmZpZyA9XHJcblx0XHRcdFx0XHQne1widHlwZVwiOiBcImFyY2hpdmVcIiwgXCJhcmNoaXZlRmlsZVwiOiBcImFyY2hpdmUubWRcIiwgXCJhcmNoaXZlU2VjdGlvblwiOiBcIk9sZCBUYXNrc1wifSc7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihqc29uQ29uZmlnKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHRcdGFyY2hpdmVGaWxlOiBcImFyY2hpdmUubWRcIixcclxuXHRcdFx0XHRcdGFyY2hpdmVTZWN0aW9uOiBcIk9sZCBUYXNrc1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIHBhcnNlIEpTT04gZHVwbGljYXRlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGpzb25Db25maWcgPVxyXG5cdFx0XHRcdFx0J3tcInR5cGVcIjogXCJkdXBsaWNhdGVcIiwgXCJ0YXJnZXRGaWxlXCI6IFwidGVtcGxhdGUubWRcIiwgXCJwcmVzZXJ2ZU1ldGFkYXRhXCI6IHRydWV9JztcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKGpzb25Db25maWcpO1xyXG5cclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWcpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiBcInRlbXBsYXRlLm1kXCIsXHJcblx0XHRcdFx0XHRwcmVzZXJ2ZU1ldGFkYXRhOiB0cnVlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGRlc2NyaWJlKFwiRXJyb3IgSGFuZGxpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRpdChcInNob3VsZCBoYW5kbGUgZW1wdHkgaW5wdXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oXCJcIik7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWcpLnRvQmVOdWxsKCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZShcclxuXHRcdFx0XHRcdFwiRW1wdHkgb3IgaW52YWxpZCBvbkNvbXBsZXRpb24gdmFsdWVcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgaGFuZGxlIG51bGwgaW5wdXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24obnVsbCBhcyBhbnkpO1xyXG5cclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlnKS50b0JlTnVsbCgpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQmUoXHJcblx0XHRcdFx0XHRcIkVtcHR5IG9yIGludmFsaWQgb25Db21wbGV0aW9uIHZhbHVlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIEpTT05cIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG1hbmFnZXIucGFyc2VPbkNvbXBsZXRpb24oJ3tcInR5cGVcIjogXCJkZWxldGVcIicpOyAvLyBNaXNzaW5nIGNsb3NpbmcgYnJhY2VcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZykudG9CZU51bGwoKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXCJQYXJzZSBlcnJvcjpcIik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoXCJzaG91bGQgaGFuZGxlIHVucmVjb2duaXplZCBzaW1wbGUgZm9ybWF0XCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBtYW5hZ2VyLnBhcnNlT25Db21wbGV0aW9uKFwidW5rbm93bi1hY3Rpb25cIik7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWcpLnRvQmVOdWxsKCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZShcIlVucmVjb2duaXplZCBvbkNvbXBsZXRpb24gZm9ybWF0XCIpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gc3RydWN0dXJlXCIsICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBqc29uQ29uZmlnID0gJ3tcImludmFsaWRLZXlcIjogXCJ2YWx1ZVwifSc7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWFuYWdlci5wYXJzZU9uQ29tcGxldGlvbihqc29uQ29uZmlnKTtcclxuXHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFwiSW52YWxpZCBjb25maWd1cmF0aW9uIHN0cnVjdHVyZVwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgZGVsZXRlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSxcclxuXHRcdFx0fTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXJbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUga2VlcCBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5LRUVQLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlcltcInZhbGlkYXRlQ29uZmlnXCJdKGNvbmZpZykpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB2YWxpZGF0ZSBjb21wbGV0ZSBjb25maWd1cmF0aW9uIHdpdGggdGFzayBJRHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLFxyXG5cdFx0XHRcdHRhc2tJZHM6IFtcInRhc2sxXCIsIFwidGFzazJcIl0sXHJcblx0XHRcdH07XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHZhbGlkYXRlIGNvbXBsZXRlIGNvbmZpZ3VyYXRpb24gd2l0aCBlbXB0eSB0YXNrIElEcyAocGFydGlhbCBjb25maWcpXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHR0YXNrSWRzOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXJbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgbW92ZSBjb25maWd1cmF0aW9uIHdpdGggdGFyZ2V0IGZpbGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJ0YXJnZXQubWRcIixcclxuXHRcdFx0fTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXJbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgbW92ZSBjb25maWd1cmF0aW9uIHdpdGggZW1wdHkgdGFyZ2V0IGZpbGUgKHBhcnRpYWwgY29uZmlnKVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcIlwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlcltcInZhbGlkYXRlQ29uZmlnXCJdKGNvbmZpZykpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB2YWxpZGF0ZSBhcmNoaXZlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHZhbGlkYXRlIGR1cGxpY2F0ZSBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Db25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUsXHJcblx0XHRcdH07XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGludmFsaWRhdGUgY29uZmlndXJhdGlvbiB3aXRob3V0IHR5cGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSB7fSBhcyBPbkNvbXBsZXRpb25Db25maWc7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJBY3Rpb24gRXhlY3V0aW9uXCIsICgpID0+IHtcclxuXHRcdGxldCBtb2NrVGFzazogVGFzaztcclxuXHJcblx0XHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdFx0bW9ja1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrLWlkXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgdGFzayDwn4+BIGRlbGV0ZVwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZXhlY3V0ZSBkZWxldGUgYWN0aW9uIHN1Y2Nlc3NmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb25zdCBtb2NrRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKG1vY2tFeGVjdXRvcikge1xyXG5cdFx0XHRcdG1vY2tFeGVjdXRvci5leGVjdXRlID0gamVzdC5mbigpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiBcIlRhc2sgZGVsZXRlZCBzdWNjZXNzZnVsbHlcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uKG1vY2tUYXNrLCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQmUoXCJUYXNrIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0V4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YXNrOiBtb2NrVGFzayxcclxuXHRcdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGNvbmZpZ1xyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGV4ZWN1dG9yIG5vdCBmb3VuZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInVua25vd25cIiBhcyBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdFx0XHR9IGFzIE9uQ29tcGxldGlvbkNvbmZpZztcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbmFnZXIuZXhlY3V0ZU9uQ29tcGxldGlvbihtb2NrVGFzaywgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQmUoXHJcblx0XHRcdFx0XCJObyBleGVjdXRvciBmb3VuZCBmb3IgYWN0aW9uIHR5cGU6IHVua25vd25cIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGV4ZWN1dG9yIGV4ZWN1dGlvbiBlcnJvclwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb25zdCBtb2NrRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKG1vY2tFeGVjdXRvcikge1xyXG5cdFx0XHRcdG1vY2tFeGVjdXRvci5leGVjdXRlID0gamVzdFxyXG5cdFx0XHRcdFx0LmZuKClcclxuXHRcdFx0XHRcdC5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoXCJFeGVjdXRpb24gZmFpbGVkXCIpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uKG1vY2tUYXNrLCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZShcIkV4ZWN1dGlvbiBmYWlsZWQ6IEV4ZWN1dGlvbiBmYWlsZWRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIENvbXBsZXRpb24gRXZlbnQgSGFuZGxpbmdcIiwgKCkgPT4ge1xyXG5cdFx0bGV0IG1vY2tUYXNrOiBUYXNrO1xyXG5cclxuXHRcdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0XHRtb2NrVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2staWRcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiZGVsZXRlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCB0YXNrIPCfj4EgZGVsZXRlXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHRoZSBleGVjdXRlT25Db21wbGV0aW9uIG1ldGhvZFxyXG5cdFx0XHRtYW5hZ2VyLmV4ZWN1dGVPbkNvbXBsZXRpb24gPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdFx0bWVzc2FnZTogXCJBY3Rpb24gZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgY29tcGxldGlvbiB3aXRoIHZhbGlkIG9uQ29tcGxldGlvbiBjb25maWdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXShtb2NrVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QobWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChtb2NrVGFzaywge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGlnbm9yZSB0YXNrIGNvbXBsZXRpb24gd2l0aG91dCBvbkNvbXBsZXRpb24gY29uZmlnXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza1dpdGhvdXRDb25maWcgPSB7IC4uLm1vY2tUYXNrIH07XHJcblx0XHRcdGRlbGV0ZSB0YXNrV2l0aG91dENvbmZpZy5tZXRhZGF0YS5vbkNvbXBsZXRpb247XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrV2l0aG91dENvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QobWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgY29tcGxldGlvbiB3aXRoIGludmFsaWQgb25Db21wbGV0aW9uIGNvbmZpZ1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tXaXRoSW52YWxpZENvbmZpZyA9IHtcclxuXHRcdFx0XHQuLi5tb2NrVGFzayxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImludmFsaWQtYWN0aW9uXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgY29uc29sZVNweSA9IGplc3Quc3B5T24oY29uc29sZSwgXCJ3YXJuXCIpLm1vY2tJbXBsZW1lbnRhdGlvbigpO1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0odGFza1dpdGhJbnZhbGlkQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLmV4ZWN1dGVPbkNvbXBsZXRpb24pLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHRcdGV4cGVjdChjb25zb2xlU3B5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRcIkludmFsaWQgb25Db21wbGV0aW9uIGNvbmZpZ3VyYXRpb246XCIsXHJcblx0XHRcdFx0XCJVbnJlY29nbml6ZWQgb25Db21wbGV0aW9uIGZvcm1hdFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zb2xlU3B5Lm1vY2tSZXN0b3JlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZXhlY3V0aW9uIGVycm9ycyBncmFjZWZ1bGx5XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0bWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uID0gamVzdFxyXG5cdFx0XHRcdC5mbigpXHJcblx0XHRcdFx0Lm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcihcIkV4ZWN1dGlvbiBlcnJvclwiKSk7XHJcblxyXG5cdFx0XHQvLyDmgaLlpI3ljp/lp4sgY29uc29sZS5lcnJvclxyXG5cdFx0XHRjb25zdCBvcmlnaW5hbEVycm9yID0gY29uc29sZS5lcnJvcjtcclxuXHRcdFx0Y29uc29sZS5lcnJvciA9IGplc3QuZm4oKTtcclxuXHRcdFx0Y29uc3QgY29uc29sZVNweSA9IGNvbnNvbGUuZXJyb3I7XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXShtb2NrVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QoY29uc29sZVNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0XCJFcnJvciBleGVjdXRpbmcgb25Db21wbGV0aW9uIGFjdGlvbjpcIixcclxuXHRcdFx0XHRleHBlY3QuYW55KEVycm9yKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeL5pa55rOVXHJcblx0XHRcdGNvbnNvbGUuZXJyb3IgPSBvcmlnaW5hbEVycm9yO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiSW50ZWdyYXRpb24gVGVzdHNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGNvbXBsZXRlIHdvcmtmbG93IGZyb20gcGFyc2luZyB0byBleGVjdXRpb25cIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpbnRlZ3JhdGlvbi10ZXN0LXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkludGVncmF0aW9uIHRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiY29tcGxldGU6cmVsYXRlZC10YXNrLTEscmVsYXRlZC10YXNrLTJcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gSW50ZWdyYXRpb24gdGVzdCB0YXNrIPCfj4EgY29tcGxldGU6cmVsYXRlZC10YXNrLTEscmVsYXRlZC10YXNrLTJcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vY2tFeGVjdXRvciA9IG1hbmFnZXJbXCJleGVjdXRvcnNcIl0uZ2V0KFxyXG5cdFx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEVcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKG1vY2tFeGVjdXRvcikge1xyXG5cdFx0XHRcdG1vY2tFeGVjdXRvci5leGVjdXRlID0gamVzdC5mbigpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdFx0XHRtZXNzYWdlOiBcIlJlbGF0ZWQgdGFza3MgY29tcGxldGVkIHN1Y2Nlc3NmdWxseVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoZSBjb21wbGV0ZSB3b3JrZmxvd1xyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXShtb2NrVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QobW9ja0V4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YXNrOiBtb2NrVGFzayxcclxuXHRcdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0XHR0YXNrSWRzOiBbXCJyZWxhdGVkLXRhc2stMVwiLCBcInJlbGF0ZWQtdGFzay0yXCJdLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBKU09OIGNvbmZpZ3VyYXRpb24gd29ya2Zsb3dcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJqc29uLXRlc3QtdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiSlNPTiB0ZXN0IHRhc2tcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOlxyXG5cdFx0XHRcdFx0XHQne1widHlwZVwiOiBcIm1vdmVcIiwgXCJ0YXJnZXRGaWxlXCI6IFwiYXJjaGl2ZS5tZFwiLCBcInRhcmdldFNlY3Rpb25cIjogXCJDb21wbGV0ZWRcIn0nLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0Jy0gW3hdIEpTT04gdGVzdCB0YXNrIPCfj4Ege1widHlwZVwiOiBcIm1vdmVcIiwgXCJ0YXJnZXRGaWxlXCI6IFwiYXJjaGl2ZS5tZFwiLCBcInRhcmdldFNlY3Rpb25cIjogXCJDb21wbGV0ZWRcIn0nLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0V4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChtb2NrRXhlY3V0b3IpIHtcclxuXHRcdFx0XHRtb2NrRXhlY3V0b3IuZXhlY3V0ZSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHRcdFx0bWVzc2FnZTogXCJUYXNrIG1vdmVkIHN1Y2Nlc3NmdWxseVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXShtb2NrVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QobW9ja0V4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YXNrOiBtb2NrVGFzayxcclxuXHRcdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwiYXJjaGl2ZS5tZFwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJDb21wbGV0ZWRcIixcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDbGVhbnVwXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNsZWFyIGV4ZWN1dG9ycyBvbiB1bmxvYWRcIiwgKCkgPT4ge1xyXG5cdFx0XHRtYW5hZ2VyLnVubG9hZCgpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXJbXCJleGVjdXRvcnNcIl0uc2l6ZSkudG9CZSgwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19