/**
 * CompleteActionExecutor Tests
 *
 * Tests for complete action executor functionality including:
 * - Completing related tasks by ID
 * - TaskManager integration
 * - Configuration validation
 * - Error handling
 */
import { __awaiter } from "tslib";
import { CompleteActionExecutor } from "../executors/completion/complete-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock TaskManager
const mockTaskManager = {
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
};
describe("CompleteActionExecutor", () => {
    let executor;
    let mockTask;
    let mockContext;
    let mockPlugin;
    beforeEach(() => {
        executor = new CompleteActionExecutor();
        mockPlugin = createMockPlugin();
        mockPlugin.taskManager = mockTaskManager;
        mockTask = {
            id: "main-task-id",
            content: "Main task",
            completed: true,
            status: "x",
            metadata: {
                onCompletion: "complete:related-1,related-2",
                tags: [],
                children: [],
            },
            filePath: "test.md",
            line: 1,
            originalMarkdown: "- [x] Main task",
        };
        mockContext = {
            task: mockTask,
            plugin: mockPlugin,
            app: createMockApp(),
        };
        // Reset mocks
        jest.clearAllMocks();
    });
    describe("Configuration Validation", () => {
        it("should validate correct complete configuration", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["task1", "task2"],
            };
            expect(executor["validateConfig"](config)).toBe(true);
        });
        it("should reject configuration with wrong type", () => {
            const config = {
                type: OnCompletionActionType.DELETE,
                taskIds: ["task1"],
            };
            expect(executor["validateConfig"](config)).toBe(false);
        });
        it("should reject configuration without taskIds", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
            };
            expect(executor["validateConfig"](config)).toBe(false);
        });
        it("should reject configuration with empty taskIds", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: [],
            };
            expect(executor["validateConfig"](config)).toBe(false);
        });
    });
    describe("Task Completion", () => {
        let config;
        beforeEach(() => {
            config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["related-task-1", "related-task-2"],
            };
        });
        it("should complete related tasks successfully", () => __awaiter(void 0, void 0, void 0, function* () {
            const relatedTask1 = {
                id: "related-task-1",
                content: "Related task 1",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 2,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task 1",
            };
            const relatedTask2 = {
                id: "related-task-2",
                content: "Related task 2",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 3,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task 2",
            };
            mockTaskManager.getTaskById
                .mockReturnValueOnce(relatedTask1)
                .mockReturnValueOnce(relatedTask2);
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Completed tasks: related-task-1, related-task-2");
            // Verify tasks were updated with completed status
            expect(mockTaskManager.updateTask).toHaveBeenCalledTimes(2);
            expect(mockTaskManager.updateTask).toHaveBeenCalledWith(Object.assign(Object.assign({}, relatedTask1), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, relatedTask1.metadata), { completedDate: expect.any(Number) }) }));
            expect(mockTaskManager.updateTask).toHaveBeenCalledWith(Object.assign(Object.assign({}, relatedTask2), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, relatedTask2.metadata), { completedDate: expect.any(Number) }) }));
        }));
        it("should skip already completed tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const relatedTask1 = {
                id: "related-task-1",
                content: "Related task 1",
                completed: true,
                status: "x",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 2,
                filePath: "test.md",
                originalMarkdown: "- [x] Related task 1",
            };
            const relatedTask2 = {
                id: "related-task-2",
                content: "Related task 2",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 3,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task 2",
            };
            mockTaskManager.getTaskById
                .mockReturnValueOnce(relatedTask1)
                .mockReturnValueOnce(relatedTask2);
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Completed tasks: related-task-2");
            // Only the incomplete task should be updated
            expect(mockTaskManager.updateTask).toHaveBeenCalledTimes(1);
            expect(mockTaskManager.updateTask).toHaveBeenCalledWith(Object.assign(Object.assign({}, relatedTask2), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, relatedTask2.metadata), { completedDate: expect.any(Number) }) }));
        }));
        it("should handle task not found", () => __awaiter(void 0, void 0, void 0, function* () {
            mockTaskManager.getTaskById
                .mockReturnValueOnce(null) // Task not found
                .mockReturnValueOnce({
                id: "related-task-2",
                content: "Related task 2",
                completed: false,
                status: " ",
                metadata: {},
                lineNumber: 3,
                filePath: "test.md",
            });
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Completed tasks: related-task-2; Failed: Task not found: related-task-1");
            // Only the found task should be updated
            expect(mockTaskManager.updateTask).toHaveBeenCalledTimes(1);
        }));
        it("should handle task update error", () => __awaiter(void 0, void 0, void 0, function* () {
            const relatedTask1 = {
                id: "related-task-1",
                content: "Related task 1",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 2,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task 1",
            };
            const relatedTask2 = {
                id: "related-task-2",
                content: "Related task 2",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 3,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task 2",
            };
            mockTaskManager.getTaskById
                .mockReturnValueOnce(relatedTask1)
                .mockReturnValueOnce(relatedTask2);
            mockTaskManager.updateTask
                .mockRejectedValueOnce(new Error("Update failed"))
                .mockResolvedValueOnce(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Completed tasks: related-task-2; Failed: related-task-1: Update failed");
            // Both tasks should be attempted to update
            expect(mockTaskManager.updateTask).toHaveBeenCalledTimes(2);
        }));
        it("should handle no task manager available", () => __awaiter(void 0, void 0, void 0, function* () {
            const contextWithoutTaskManager = Object.assign(Object.assign({}, mockContext), { plugin: Object.assign(Object.assign({}, mockPlugin), { taskManager: null }) });
            const result = yield executor.execute(contextWithoutTaskManager, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Task manager not available");
        }));
        it("should handle all tasks failing", () => __awaiter(void 0, void 0, void 0, function* () {
            mockTaskManager.getTaskById
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed: Task not found: related-task-1, Task not found: related-task-2");
        }));
        it("should preserve existing task metadata", () => __awaiter(void 0, void 0, void 0, function* () {
            const relatedTask = {
                id: "related-task-1",
                content: "Related task with metadata",
                completed: false,
                status: " ",
                metadata: {
                    priority: 3,
                    project: "test-project",
                    tags: ["important"],
                    children: [],
                },
                line: 2,
                filePath: "test.md",
                originalMarkdown: "- [ ] Related task with metadata 🔼 #important #project/test-project",
            };
            const singleTaskConfig = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["related-task-1"],
            };
            mockTaskManager.getTaskById.mockReturnValueOnce(relatedTask);
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, singleTaskConfig);
            expect(result.success).toBe(true);
            expect(mockTaskManager.updateTask).toHaveBeenCalledWith(Object.assign(Object.assign({}, relatedTask), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, relatedTask.metadata), { completedDate: expect.any(Number) }) }));
        }));
    });
    describe("Invalid Configuration Handling", () => {
        it("should return error for invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.DELETE,
            };
            const result = yield executor.execute(mockContext, invalidConfig);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Invalid complete configuration");
            expect(mockTaskManager.getTaskById).not.toHaveBeenCalled();
        }));
    });
    describe("Description Generation", () => {
        it("should return correct description for single task", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["task1"],
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Complete 1 related task");
        });
        it("should return correct description for multiple tasks", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["task1", "task2", "task3"],
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Complete 3 related tasks");
        });
        it("should handle empty taskIds in description", () => {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: [],
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Complete 0 related tasks");
        });
    });
    describe("Error Handling", () => {
        it("should handle general execution error", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["task1"],
            };
            // Mock taskManager to throw an error
            mockTaskManager.getTaskById.mockImplementation(() => {
                throw new Error("Unexpected error");
            });
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed: task1: Unexpected error");
        }));
    });
    describe("Edge Cases", () => {
        it("should handle single task completion", () => __awaiter(void 0, void 0, void 0, function* () {
            const singleTaskConfig = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["single-task"],
            };
            const relatedTask = {
                id: "single-task",
                content: "Single related task",
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 2,
                filePath: "test.md",
                originalMarkdown: "- [ ] Single related task",
            };
            mockTaskManager.getTaskById.mockReturnValueOnce(relatedTask);
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, singleTaskConfig);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Completed tasks: single-task");
        }));
        it("should handle large number of tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const manyTaskIds = Array.from({ length: 10 }, (_, i) => `task-${i}`);
            const manyTasksConfig = {
                type: OnCompletionActionType.COMPLETE,
                taskIds: manyTaskIds,
            };
            // Mock all tasks as found and incomplete
            manyTaskIds.forEach((taskId, index) => {
                mockTaskManager.getTaskById.mockReturnValueOnce({
                    id: taskId,
                    content: `Task ${index}`,
                    completed: false,
                    status: " ",
                    metadata: {},
                    lineNumber: index + 1,
                    filePath: "test.md",
                });
            });
            mockTaskManager.updateTask.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, manyTasksConfig);
            expect(result.success).toBe(true);
            expect(result.message).toBe(`Completed tasks: ${manyTaskIds.join(", ")}`);
            expect(mockTaskManager.updateTask).toHaveBeenCalledTimes(10);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29tcGxldGVBY3Rpb25FeGVjdXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ29tcGxldGVBY3Rpb25FeGVjdXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOztBQUVILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ25GLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTlELG1CQUFtQjtBQUNuQixNQUFNLGVBQWUsR0FBRztJQUN2QixXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUN0QixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNyQixDQUFDO0FBRUYsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUN2QyxJQUFJLFFBQWdDLENBQUM7SUFDckMsSUFBSSxRQUFjLENBQUM7SUFDbkIsSUFBSSxXQUF5QyxDQUFDO0lBQzlDLElBQUksVUFBZSxDQUFDO0lBRXBCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixRQUFRLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQ3hDLFVBQVUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1FBRXpDLFFBQVEsR0FBRztZQUNWLEVBQUUsRUFBRSxjQUFjO1lBQ2xCLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTSxFQUFFLEdBQUc7WUFDWCxRQUFRLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLDhCQUE4QjtnQkFDNUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLEVBQUU7YUFDWjtZQUNELFFBQVEsRUFBRSxTQUFTO1lBQ25CLElBQUksRUFBRSxDQUFDO1lBQ1As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QUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENvbXBsZXRlQWN0aW9uRXhlY3V0b3IgVGVzdHNcclxuICpcclxuICogVGVzdHMgZm9yIGNvbXBsZXRlIGFjdGlvbiBleGVjdXRvciBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBDb21wbGV0aW5nIHJlbGF0ZWQgdGFza3MgYnkgSURcclxuICogLSBUYXNrTWFuYWdlciBpbnRlZ3JhdGlvblxyXG4gKiAtIENvbmZpZ3VyYXRpb24gdmFsaWRhdGlvblxyXG4gKiAtIEVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29tcGxldGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9jb21wbGV0ZS1leGVjdXRvclwiO1xyXG5pbXBvcnQge1xyXG5cdE9uQ29tcGxldGlvbkFjdGlvblR5cGUsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRPbkNvbXBsZXRpb25Db21wbGV0ZUNvbmZpZyxcclxufSBmcm9tIFwiLi4vdHlwZXMvb25Db21wbGV0aW9uXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrUGx1Z2luLCBjcmVhdGVNb2NrQXBwIH0gZnJvbSBcIi4vbW9ja1V0aWxzXCI7XHJcblxyXG4vLyBNb2NrIFRhc2tNYW5hZ2VyXHJcbmNvbnN0IG1vY2tUYXNrTWFuYWdlciA9IHtcclxuXHRnZXRUYXNrQnlJZDogamVzdC5mbigpLFxyXG5cdHVwZGF0ZVRhc2s6IGplc3QuZm4oKSxcclxufTtcclxuXHJcbmRlc2NyaWJlKFwiQ29tcGxldGVBY3Rpb25FeGVjdXRvclwiLCAoKSA9PiB7XHJcblx0bGV0IGV4ZWN1dG9yOiBDb21wbGV0ZUFjdGlvbkV4ZWN1dG9yO1xyXG5cdGxldCBtb2NrVGFzazogVGFzaztcclxuXHRsZXQgbW9ja0NvbnRleHQ6IE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQ7XHJcblx0bGV0IG1vY2tQbHVnaW46IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRleGVjdXRvciA9IG5ldyBDb21wbGV0ZUFjdGlvbkV4ZWN1dG9yKCk7XHJcblx0XHRtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0bW9ja1BsdWdpbi50YXNrTWFuYWdlciA9IG1vY2tUYXNrTWFuYWdlcjtcclxuXHJcblx0XHRtb2NrVGFzayA9IHtcclxuXHRcdFx0aWQ6IFwibWFpbi10YXNrLWlkXCIsXHJcblx0XHRcdGNvbnRlbnQ6IFwiTWFpbiB0YXNrXCIsXHJcblx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRvbkNvbXBsZXRpb246IFwiY29tcGxldGU6cmVsYXRlZC0xLHJlbGF0ZWQtMlwiLFxyXG5cdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIE1haW4gdGFza1wiLFxyXG5cdFx0fTtcclxuXHJcblx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0dGFzazogbW9ja1Rhc2ssXHJcblx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0YXBwOiBjcmVhdGVNb2NrQXBwKCksXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlc2V0IG1vY2tzXHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgY29ycmVjdCBjb21wbGV0ZSBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Db21wbGV0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLFxyXG5cdFx0XHRcdHRhc2tJZHM6IFtcInRhc2sxXCIsIFwidGFzazJcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3QoZXhlY3V0b3JbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVqZWN0IGNvbmZpZ3VyYXRpb24gd2l0aCB3cm9uZyB0eXBlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHRcdHRhc2tJZHM6IFtcInRhc2sxXCJdLFxyXG5cdFx0XHR9IGFzIGFueTtcclxuXHJcblx0XHRcdGV4cGVjdChleGVjdXRvcltcInZhbGlkYXRlQ29uZmlnXCJdKGNvbmZpZykpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVqZWN0IGNvbmZpZ3VyYXRpb24gd2l0aG91dCB0YXNrSWRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdH0gYXMgYW55O1xyXG5cclxuXHRcdFx0ZXhwZWN0KGV4ZWN1dG9yW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZWplY3QgY29uZmlndXJhdGlvbiB3aXRoIGVtcHR5IHRhc2tJZHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbXBsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0dGFza0lkczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3QoZXhlY3V0b3JbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRhc2sgQ29tcGxldGlvblwiLCAoKSA9PiB7XHJcblx0XHRsZXQgY29uZmlnOiBPbkNvbXBsZXRpb25Db21wbGV0ZUNvbmZpZztcclxuXHJcblx0XHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdFx0Y29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0dGFza0lkczogW1wicmVsYXRlZC10YXNrLTFcIiwgXCJyZWxhdGVkLXRhc2stMlwiXSxcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNvbXBsZXRlIHJlbGF0ZWQgdGFza3Mgc3VjY2Vzc2Z1bGx5XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsYXRlZFRhc2sxOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInJlbGF0ZWQtdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJSZWxhdGVkIHRhc2sgMVwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlbGF0ZWQgdGFzayAxXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZWxhdGVkVGFzazI6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicmVsYXRlZC10YXNrLTJcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlbGF0ZWQgdGFzayAyXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDMsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gUmVsYXRlZCB0YXNrIDJcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tUYXNrTWFuYWdlci5nZXRUYXNrQnlJZFxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKHJlbGF0ZWRUYXNrMSlcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShyZWxhdGVkVGFzazIpO1xyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0JlKFxyXG5cdFx0XHRcdFwiQ29tcGxldGVkIHRhc2tzOiByZWxhdGVkLXRhc2stMSwgcmVsYXRlZC10YXNrLTJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRhc2tzIHdlcmUgdXBkYXRlZCB3aXRoIGNvbXBsZXRlZCBzdGF0dXNcclxuXHRcdFx0ZXhwZWN0KG1vY2tUYXNrTWFuYWdlci51cGRhdGVUYXNrKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMik7XHJcblx0XHRcdGV4cGVjdChtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG5cdFx0XHRcdC4uLnJlbGF0ZWRUYXNrMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0Li4ucmVsYXRlZFRhc2sxLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogZXhwZWN0LmFueShOdW1iZXIpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRleHBlY3QobW9ja1Rhc2tNYW5hZ2VyLnVwZGF0ZVRhc2spLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcclxuXHRcdFx0XHQuLi5yZWxhdGVkVGFzazIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdC4uLnJlbGF0ZWRUYXNrMi5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IGV4cGVjdC5hbnkoTnVtYmVyKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHNraXAgYWxyZWFkeSBjb21wbGV0ZWQgdGFza3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZWxhdGVkVGFzazE6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicmVsYXRlZC10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlbGF0ZWQgdGFzayAxXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLCAvLyBBbHJlYWR5IGNvbXBsZXRlZFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBSZWxhdGVkIHRhc2sgMVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVsYXRlZFRhc2syOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInJlbGF0ZWQtdGFzay0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJSZWxhdGVkIHRhc2sgMlwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAzLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlbGF0ZWQgdGFzayAyXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIuZ2V0VGFza0J5SWRcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShyZWxhdGVkVGFzazEpXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UocmVsYXRlZFRhc2syKTtcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLnVwZGF0ZVRhc2subW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWVzc2FnZSkudG9CZShcIkNvbXBsZXRlZCB0YXNrczogcmVsYXRlZC10YXNrLTJcIik7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHRoZSBpbmNvbXBsZXRlIHRhc2sgc2hvdWxkIGJlIHVwZGF0ZWRcclxuXHRcdFx0ZXhwZWN0KG1vY2tUYXNrTWFuYWdlci51cGRhdGVUYXNrKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XHJcblx0XHRcdGV4cGVjdChtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG5cdFx0XHRcdC4uLnJlbGF0ZWRUYXNrMixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0Li4ucmVsYXRlZFRhc2syLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogZXhwZWN0LmFueShOdW1iZXIpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgbm90IGZvdW5kXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UobnVsbCkgLy8gVGFzayBub3QgZm91bmRcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZSh7XHJcblx0XHRcdFx0XHRpZDogXCJyZWxhdGVkLXRhc2stMlwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJSZWxhdGVkIHRhc2sgMlwiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge30sXHJcblx0XHRcdFx0XHRsaW5lTnVtYmVyOiAzLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0JlKFxyXG5cdFx0XHRcdFwiQ29tcGxldGVkIHRhc2tzOiByZWxhdGVkLXRhc2stMjsgRmFpbGVkOiBUYXNrIG5vdCBmb3VuZDogcmVsYXRlZC10YXNrLTFcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gT25seSB0aGUgZm91bmQgdGFzayBzaG91bGQgYmUgdXBkYXRlZFxyXG5cdFx0XHRleHBlY3QobW9ja1Rhc2tNYW5hZ2VyLnVwZGF0ZVRhc2spLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB0YXNrIHVwZGF0ZSBlcnJvclwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlbGF0ZWRUYXNrMTogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJyZWxhdGVkLXRhc2stMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiUmVsYXRlZCB0YXNrIDFcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBSZWxhdGVkIHRhc2sgMVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVsYXRlZFRhc2syOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInJlbGF0ZWQtdGFzay0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJSZWxhdGVkIHRhc2sgMlwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAzLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlbGF0ZWQgdGFzayAyXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIuZ2V0VGFza0J5SWRcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShyZWxhdGVkVGFzazEpXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UocmVsYXRlZFRhc2syKTtcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLnVwZGF0ZVRhc2tcclxuXHRcdFx0XHQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcihcIlVwZGF0ZSBmYWlsZWRcIikpXHJcblx0XHRcdFx0Lm1vY2tSZXNvbHZlZFZhbHVlT25jZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0JlKFxyXG5cdFx0XHRcdFwiQ29tcGxldGVkIHRhc2tzOiByZWxhdGVkLXRhc2stMjsgRmFpbGVkOiByZWxhdGVkLXRhc2stMTogVXBkYXRlIGZhaWxlZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBCb3RoIHRhc2tzIHNob3VsZCBiZSBhdHRlbXB0ZWQgdG8gdXBkYXRlXHJcblx0XHRcdGV4cGVjdChtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzaykudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG5vIHRhc2sgbWFuYWdlciBhdmFpbGFibGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZXh0V2l0aG91dFRhc2tNYW5hZ2VyID0ge1xyXG5cdFx0XHRcdC4uLm1vY2tDb250ZXh0LFxyXG5cdFx0XHRcdHBsdWdpbjogeyAuLi5tb2NrUGx1Z2luLCB0YXNrTWFuYWdlcjogbnVsbCB9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShcclxuXHRcdFx0XHRjb250ZXh0V2l0aG91dFRhc2tNYW5hZ2VyLFxyXG5cdFx0XHRcdGNvbmZpZ1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZShcIlRhc2sgbWFuYWdlciBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGFsbCB0YXNrcyBmYWlsaW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UobnVsbClcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShudWxsKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFxyXG5cdFx0XHRcdFwiRmFpbGVkOiBUYXNrIG5vdCBmb3VuZDogcmVsYXRlZC10YXNrLTEsIFRhc2sgbm90IGZvdW5kOiByZWxhdGVkLXRhc2stMlwiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwcmVzZXJ2ZSBleGlzdGluZyB0YXNrIG1ldGFkYXRhXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsYXRlZFRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicmVsYXRlZC10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlbGF0ZWQgdGFzayB3aXRoIG1ldGFkYXRhXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRwcmlvcml0eTogMyxcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwidGVzdC1wcm9qZWN0XCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXCJpbXBvcnRhbnRcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFsgXSBSZWxhdGVkIHRhc2sgd2l0aCBtZXRhZGF0YSDwn5S8ICNpbXBvcnRhbnQgI3Byb2plY3QvdGVzdC1wcm9qZWN0XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBzaW5nbGVUYXNrQ29uZmlnOiBPbkNvbXBsZXRpb25Db21wbGV0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLFxyXG5cdFx0XHRcdHRhc2tJZHM6IFtcInJlbGF0ZWQtdGFzay0xXCJdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkLm1vY2tSZXR1cm5WYWx1ZU9uY2UocmVsYXRlZFRhc2spO1xyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShcclxuXHRcdFx0XHRtb2NrQ29udGV4dCxcclxuXHRcdFx0XHRzaW5nbGVUYXNrQ29uZmlnXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG5cdFx0XHRcdC4uLnJlbGF0ZWRUYXNrLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHQuLi5yZWxhdGVkVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IGV4cGVjdC5hbnkoTnVtYmVyKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkludmFsaWQgQ29uZmlndXJhdGlvbiBIYW5kbGluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gZXJyb3IgZm9yIGludmFsaWQgY29uZmlndXJhdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdH0gYXMgYW55O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgaW52YWxpZENvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFwiSW52YWxpZCBjb21wbGV0ZSBjb25maWd1cmF0aW9uXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRGVzY3JpcHRpb24gR2VuZXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gY29ycmVjdCBkZXNjcmlwdGlvbiBmb3Igc2luZ2xlIHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkNvbXBsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0dGFza0lkczogW1widGFzazFcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGV4ZWN1dG9yLmdldERlc2NyaXB0aW9uKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QoZGVzY3JpcHRpb24pLnRvQmUoXCJDb21wbGV0ZSAxIHJlbGF0ZWQgdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBjb3JyZWN0IGRlc2NyaXB0aW9uIGZvciBtdWx0aXBsZSB0YXNrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29tcGxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHR0YXNrSWRzOiBbXCJ0YXNrMVwiLCBcInRhc2syXCIsIFwidGFzazNcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGV4ZWN1dG9yLmdldERlc2NyaXB0aW9uKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QoZGVzY3JpcHRpb24pLnRvQmUoXCJDb21wbGV0ZSAzIHJlbGF0ZWQgdGFza3NcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZW1wdHkgdGFza0lkcyBpbiBkZXNjcmlwdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29tcGxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHR0YXNrSWRzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gZXhlY3V0b3IuZ2V0RGVzY3JpcHRpb24oY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChkZXNjcmlwdGlvbikudG9CZShcIkNvbXBsZXRlIDAgcmVsYXRlZCB0YXNrc1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVycm9yIEhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBnZW5lcmFsIGV4ZWN1dGlvbiBlcnJvclwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQ29tcGxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHR0YXNrSWRzOiBbXCJ0YXNrMVwiXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgdGFza01hbmFnZXIgdG8gdGhyb3cgYW4gZXJyb3JcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBlcnJvclwiKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9CZShcIkZhaWxlZDogdGFzazE6IFVuZXhwZWN0ZWQgZXJyb3JcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFZGdlIENhc2VzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBzaW5nbGUgdGFzayBjb21wbGV0aW9uXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc2luZ2xlVGFza0NvbmZpZzogT25Db21wbGV0aW9uQ29tcGxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHR0YXNrSWRzOiBbXCJzaW5nbGUtdGFza1wiXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlbGF0ZWRUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInNpbmdsZS10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJTaW5nbGUgcmVsYXRlZCB0YXNrXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gU2luZ2xlIHJlbGF0ZWQgdGFza1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkLm1vY2tSZXR1cm5WYWx1ZU9uY2UocmVsYXRlZFRhc2spO1xyXG5cdFx0XHRtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShcclxuXHRcdFx0XHRtb2NrQ29udGV4dCxcclxuXHRcdFx0XHRzaW5nbGVUYXNrQ29uZmlnXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWVzc2FnZSkudG9CZShcIkNvbXBsZXRlZCB0YXNrczogc2luZ2xlLXRhc2tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbGFyZ2UgbnVtYmVyIG9mIHRhc2tzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbWFueVRhc2tJZHMgPSBBcnJheS5mcm9tKFxyXG5cdFx0XHRcdHsgbGVuZ3RoOiAxMCB9LFxyXG5cdFx0XHRcdChfLCBpKSA9PiBgdGFzay0ke2l9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBtYW55VGFza3NDb25maWc6IE9uQ29tcGxldGlvbkNvbXBsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsXHJcblx0XHRcdFx0dGFza0lkczogbWFueVRhc2tJZHMsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIGFsbCB0YXNrcyBhcyBmb3VuZCBhbmQgaW5jb21wbGV0ZVxyXG5cdFx0XHRtYW55VGFza0lkcy5mb3JFYWNoKCh0YXNrSWQsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLmdldFRhc2tCeUlkLm1vY2tSZXR1cm5WYWx1ZU9uY2Uoe1xyXG5cdFx0XHRcdFx0aWQ6IHRhc2tJZCxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IGBUYXNrICR7aW5kZXh9YCxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHt9LFxyXG5cdFx0XHRcdFx0bGluZU51bWJlcjogaW5kZXggKyAxLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja1Rhc2tNYW5hZ2VyLnVwZGF0ZVRhc2subW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1hbnlUYXNrc0NvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWVzc2FnZSkudG9CZShcclxuXHRcdFx0XHRgQ29tcGxldGVkIHRhc2tzOiAke21hbnlUYXNrSWRzLmpvaW4oXCIsIFwiKX1gXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2NrVGFza01hbmFnZXIudXBkYXRlVGFzaykudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19