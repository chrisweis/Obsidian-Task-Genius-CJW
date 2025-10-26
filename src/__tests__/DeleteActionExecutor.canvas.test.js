/**
 * DeleteActionExecutor Canvas Tests
 *
 * Tests for Canvas task deletion functionality including:
 * - Deleting Canvas tasks from text nodes
 * - Error handling for missing files/nodes
 * - Canvas file structure integrity
 */
import { __awaiter } from "tslib";
import { DeleteActionExecutor } from "../executors/completion/delete-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Canvas task updater
const mockCanvasTaskUpdater = {
    deleteCanvasTask: jest.fn(),
};
describe("DeleteActionExecutor - Canvas Tasks", () => {
    let executor;
    let mockContext;
    let mockConfig;
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        executor = new DeleteActionExecutor();
        mockConfig = {
            type: OnCompletionActionType.DELETE,
        };
        // Create fresh mock instances for each test
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        // Setup the Canvas task updater mock
        mockPlugin.taskManager.getCanvasTaskUpdater.mockReturnValue(mockCanvasTaskUpdater);
        // Reset mocks
        jest.clearAllMocks();
    });
    describe("Canvas Task Deletion", () => {
        it("should successfully delete a Canvas task", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-1",
                content: "Test Canvas task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            const result = yield executor.execute(mockContext, mockConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task deleted from Canvas file");
            expect(mockCanvasTaskUpdater.deleteCanvasTask).toHaveBeenCalledWith(canvasTask);
        }));
        it("should handle Canvas task deletion failure", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-2",
                content: "Test Canvas task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock deletion failure
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: false,
                error: "Canvas node not found",
            });
            const result = yield executor.execute(mockContext, mockConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Canvas node not found");
        }));
        it("should handle Canvas task updater exceptions", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-3",
                content: "Test Canvas task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock exception
            mockCanvasTaskUpdater.deleteCanvasTask.mockRejectedValue(new Error("Network error"));
            const result = yield executor.execute(mockContext, mockConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Error deleting Canvas task: Network error");
        }));
        it("should correctly identify Canvas tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-4",
                content: "Test Canvas task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            const markdownTask = {
                id: "markdown-task-1",
                content: "Test Markdown task",
                filePath: "test.md",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Markdown task",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            // Test Canvas task routing
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            yield executor.execute(mockContext, mockConfig);
            expect(mockCanvasTaskUpdater.deleteCanvasTask).toHaveBeenCalled();
            // Reset mock
            jest.clearAllMocks();
            // Test Markdown task routing (should not call Canvas updater)
            mockContext = {
                task: markdownTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock vault for Markdown task
            mockApp.vault.getAbstractFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue("- [x] Test Markdown task");
            mockApp.vault.modify.mockResolvedValue(undefined);
            yield executor.execute(mockContext, mockConfig);
            expect(mockCanvasTaskUpdater.deleteCanvasTask).not.toHaveBeenCalled();
        }));
    });
    describe("Configuration Validation", () => {
        it("should validate correct delete configuration", () => {
            const validConfig = {
                type: OnCompletionActionType.DELETE,
            };
            const canvasTask = {
                id: "canvas-task-5",
                content: "Test task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Should not throw validation error
            expect(() => {
                executor["validateConfig"](validConfig);
            }).not.toThrow();
        });
        it("should reject invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.MOVE, // Wrong type
            };
            const canvasTask = {
                id: "canvas-task-6",
                content: "Test task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            const result = yield executor.execute(mockContext, invalidConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Invalid configuration");
        }));
    });
    describe("Description Generation", () => {
        it("should generate correct description", () => {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Delete the completed task from the file");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVsZXRlQWN0aW9uRXhlY3V0b3IuY2FudmFzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEZWxldGVBY3Rpb25FeGVjdXRvci5jYW52YXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztHQU9HOztBQUVILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9FLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTlELDJCQUEyQjtBQUMzQixNQUFNLHFCQUFxQixHQUFHO0lBQzdCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDM0IsQ0FBQztBQUVGLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDcEQsSUFBSSxRQUE4QixDQUFDO0lBQ25DLElBQUksV0FBeUMsQ0FBQztJQUM5QyxJQUFJLFVBQW9DLENBQUM7SUFDekMsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFZLENBQUM7SUFFakIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFFdEMsVUFBVSxHQUFHO1lBQ1osSUFBSSxFQUFFLHNCQUFzQixDQUFDLE1BQU07U0FDbkMsQ0FBQztRQUVGLDRDQUE0QztRQUM1QyxVQUFVLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoQyxPQUFPLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFFMUIscUNBQXFDO1FBQ3JDLFVBQVUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUMxRCxxQkFBcUIsQ0FDckIsQ0FBQztRQUVGLGNBQWM7UUFDZCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsc0JBQXNCLEVB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TSxDQUFDLENBQUM7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEZWxldGVBY3Rpb25FeGVjdXRvciBDYW52YXMgVGVzdHNcclxuICpcclxuICogVGVzdHMgZm9yIENhbnZhcyB0YXNrIGRlbGV0aW9uIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nOlxyXG4gKiAtIERlbGV0aW5nIENhbnZhcyB0YXNrcyBmcm9tIHRleHQgbm9kZXNcclxuICogLSBFcnJvciBoYW5kbGluZyBmb3IgbWlzc2luZyBmaWxlcy9ub2Rlc1xyXG4gKiAtIENhbnZhcyBmaWxlIHN0cnVjdHVyZSBpbnRlZ3JpdHlcclxuICovXHJcblxyXG5pbXBvcnQgeyBEZWxldGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kZWxldGUtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0T25Db21wbGV0aW9uRGVsZXRlQ29uZmlnLFxyXG59IGZyb20gXCIuLi90eXBlcy9vbkNvbXBsZXRpb25cIjtcclxuaW1wb3J0IHsgVGFzaywgQ2FudmFzVGFza01ldGFkYXRhIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiwgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuLy8gTW9jayBDYW52YXMgdGFzayB1cGRhdGVyXHJcbmNvbnN0IG1vY2tDYW52YXNUYXNrVXBkYXRlciA9IHtcclxuXHRkZWxldGVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcbn07XHJcblxyXG5kZXNjcmliZShcIkRlbGV0ZUFjdGlvbkV4ZWN1dG9yIC0gQ2FudmFzIFRhc2tzXCIsICgpID0+IHtcclxuXHRsZXQgZXhlY3V0b3I6IERlbGV0ZUFjdGlvbkV4ZWN1dG9yO1xyXG5cdGxldCBtb2NrQ29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dDtcclxuXHRsZXQgbW9ja0NvbmZpZzogT25Db21wbGV0aW9uRGVsZXRlQ29uZmlnO1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblx0bGV0IG1vY2tBcHA6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRleGVjdXRvciA9IG5ldyBEZWxldGVBY3Rpb25FeGVjdXRvcigpO1xyXG5cclxuXHRcdG1vY2tDb25maWcgPSB7XHJcblx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZnJlc2ggbW9jayBpbnN0YW5jZXMgZm9yIGVhY2ggdGVzdFxyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHRcdG1vY2tBcHAgPSBjcmVhdGVNb2NrQXBwKCk7XHJcblxyXG5cdFx0Ly8gU2V0dXAgdGhlIENhbnZhcyB0YXNrIHVwZGF0ZXIgbW9ja1xyXG5cdFx0bW9ja1BsdWdpbi50YXNrTWFuYWdlci5nZXRDYW52YXNUYXNrVXBkYXRlci5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlclxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZXNldCBtb2Nrc1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FudmFzIFRhc2sgRGVsZXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgc3VjY2Vzc2Z1bGx5IGRlbGV0ZSBhIENhbnZhcyB0YXNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgc3VjY2Vzc2Z1bCBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBtb2NrQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0NvbnRhaW4oXCJUYXNrIGRlbGV0ZWQgZnJvbSBDYW52YXMgZmlsZVwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRjYW52YXNUYXNrXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgQ2FudmFzIHRhc2sgZGVsZXRpb24gZmFpbHVyZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIGRlbGV0aW9uIGZhaWx1cmVcclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmRlbGV0ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBcIkNhbnZhcyBub2RlIG5vdCBmb3VuZFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vY2tDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFwiQ2FudmFzIG5vZGUgbm90IGZvdW5kXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIENhbnZhcyB0YXNrIHVwZGF0ZXIgZXhjZXB0aW9uc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIGV4Y2VwdGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVqZWN0ZWRWYWx1ZShcclxuXHRcdFx0XHRuZXcgRXJyb3IoXCJOZXR3b3JrIGVycm9yXCIpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBtb2NrQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIkVycm9yIGRlbGV0aW5nIENhbnZhcyB0YXNrOiBOZXR3b3JrIGVycm9yXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNvcnJlY3RseSBpZGVudGlmeSBDYW52YXMgdGFza3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtYXJrZG93blRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibWFya2Rvd24tdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IE1hcmtkb3duIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgTWFya2Rvd24gdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBDYW52YXMgdGFzayByb3V0aW5nXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBtb2NrQ29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBtb2NrXHJcblx0XHRcdGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBNYXJrZG93biB0YXNrIHJvdXRpbmcgKHNob3VsZCBub3QgY2FsbCBDYW52YXMgdXBkYXRlcilcclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogbWFya2Rvd25UYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayB2YXVsdCBmb3IgTWFya2Rvd24gdGFza1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdHBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFwiLSBbeF0gVGVzdCBNYXJrZG93biB0YXNrXCIpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0YXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgbW9ja0NvbmZpZyk7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFza1xyXG5cdFx0XHQpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgY29ycmVjdCBkZWxldGUgY29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHZhbGlkQ29uZmlnOiBPbkNvbXBsZXRpb25EZWxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgdGhyb3cgdmFsaWRhdGlvbiBlcnJvclxyXG5cdFx0XHRleHBlY3QoKCkgPT4ge1xyXG5cdFx0XHRcdGV4ZWN1dG9yW1widmFsaWRhdGVDb25maWdcIl0odmFsaWRDb25maWcpO1xyXG5cdFx0XHR9KS5ub3QudG9UaHJvdygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVqZWN0IGludmFsaWQgY29uZmlndXJhdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLCAvLyBXcm9uZyB0eXBlXHJcblx0XHRcdH0gYXMgYW55O1xyXG5cclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTZcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBpbnZhbGlkQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcIkludmFsaWQgY29uZmlndXJhdGlvblwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRlc2NyaXB0aW9uIEdlbmVyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgZ2VuZXJhdGUgY29ycmVjdCBkZXNjcmlwdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uRGVsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZGVzY3JpcHRpb24gPSBleGVjdXRvci5nZXREZXNjcmlwdGlvbihjb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZGVzY3JpcHRpb24pLnRvQmUoXCJEZWxldGUgdGhlIGNvbXBsZXRlZCB0YXNrIGZyb20gdGhlIGZpbGVcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==