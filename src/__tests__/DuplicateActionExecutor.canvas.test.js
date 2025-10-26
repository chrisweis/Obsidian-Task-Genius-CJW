/**
 * DuplicateActionExecutor Canvas Tests
 *
 * Tests for Canvas task duplication functionality including:
 * - Duplicating Canvas tasks within Canvas files
 * - Duplicating Canvas tasks to Markdown files
 * - Metadata preservation options
 * - Cross-format task duplication
 */
import { __awaiter } from "tslib";
import { DuplicateActionExecutor } from "../executors/completion/duplicate-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Canvas task updater
const mockCanvasTaskUpdater = {
    duplicateCanvasTask: jest.fn(),
};
describe("DuplicateActionExecutor - Canvas Tasks", () => {
    let executor;
    let mockContext;
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        executor = new DuplicateActionExecutor();
        // Create fresh mock instances for each test
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        // Setup the Canvas task updater mock
        mockPlugin.taskManager.getCanvasTaskUpdater.mockReturnValue(mockCanvasTaskUpdater);
        // Reset mocks
        jest.clearAllMocks();
    });
    describe("Canvas to Canvas Duplication", () => {
        it("should successfully duplicate Canvas task within same file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-1",
                content: "Test Canvas task",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task #project/test",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: ["#project/test"],
                    children: [],
                },
            };
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                preserveMetadata: true,
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful duplication
            mockCanvasTaskUpdater.duplicateCanvasTask.mockResolvedValue({
                success: true,
            });
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task duplicated in same file");
            expect(mockCanvasTaskUpdater.duplicateCanvasTask).toHaveBeenCalledWith(canvasTask, "source.canvas", undefined, undefined, true);
        }));
        it("should successfully duplicate Canvas task to different Canvas file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-2",
                content: "Test Canvas task",
                filePath: "source.canvas",
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
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "target.canvas",
                targetSection: "Templates",
                preserveMetadata: false,
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful duplication
            mockCanvasTaskUpdater.duplicateCanvasTask.mockResolvedValue({
                success: true,
            });
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task duplicated to target.canvas");
            expect(result.message).toContain("section: Templates");
            expect(mockCanvasTaskUpdater.duplicateCanvasTask).toHaveBeenCalledWith(canvasTask, "target.canvas", undefined, "Templates", false);
        }));
        it("should handle Canvas duplication failure", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-3",
                content: "Test Canvas task",
                filePath: "source.canvas",
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
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "target.canvas",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock duplication failure
            mockCanvasTaskUpdater.duplicateCanvasTask.mockResolvedValue({
                success: false,
                error: "Target Canvas file not found",
            });
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Target Canvas file not found");
        }));
    });
    describe("Canvas to Markdown Duplication", () => {
        it("should successfully duplicate Canvas task to Markdown file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-4",
                content: "Test Canvas task",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task ✅ 2024-01-15",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                    completedDate: new Date("2024-01-15").getTime(),
                },
            };
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "templates.md",
                targetSection: "Task Templates",
                preserveMetadata: false,
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file exists
            const mockTargetFile = { path: "templates.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockTargetFile);
            mockApp.vault.read.mockResolvedValue("# Templates\n\n## Task Templates\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task duplicated from Canvas to templates.md");
            expect(result.message).toContain("section: Task Templates");
            expect(mockApp.vault.modify).toHaveBeenCalled();
            // Verify the task content was modified (completion date removed, status reset)
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [ ] Test Canvas task"); // Status reset to incomplete
            expect(modifiedContent).toContain("(duplicated"); // Duplicate timestamp added
            expect(modifiedContent).not.toContain("✅ 2024-01-15"); // Completion date removed
        }));
        it("should preserve metadata when requested", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-5",
                content: "Test Canvas task",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task #project/test ⏰ 2024-01-20",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: ["#project/test"],
                    children: [],
                    scheduledDate: new Date("2024-01-20").getTime(),
                },
            };
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "templates.md",
                preserveMetadata: true,
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file exists
            const mockTargetFile = { path: "templates.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockTargetFile);
            mockApp.vault.read.mockResolvedValue("# Templates\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(true);
            // Verify metadata was preserved
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [ ] Test Canvas task"); // Status reset
            expect(modifiedContent).toContain("#project/test"); // Project tag preserved
            expect(modifiedContent).toContain("⏰ 2024-01-20"); // Scheduled date preserved
            expect(modifiedContent).toContain("(duplicated"); // Duplicate timestamp added
        }));
        it("should create target Markdown file if it does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-6",
                content: "Test Canvas task",
                filePath: "source.canvas",
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
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "new-templates.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file does not exist, then gets created
            mockApp.vault.getFileByPath.mockReturnValue(null);
            const mockCreatedFile = { path: "new-templates.md" };
            mockApp.vault.create.mockResolvedValue(mockCreatedFile);
            mockApp.vault.read.mockResolvedValue("");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(true);
            expect(mockApp.vault.create).toHaveBeenCalledWith("new-templates.md", "");
            expect(mockApp.vault.modify).toHaveBeenCalled();
        }));
        it("should handle target file creation failure", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-7",
                content: "Test Canvas task",
                filePath: "source.canvas",
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
            const duplicateConfig = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "invalid/path/templates.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file does not exist and creation fails
            mockApp.vault.getFileByPath.mockReturnValue(null);
            mockApp.vault.create.mockRejectedValue(new Error("Invalid path"));
            const result = yield executor.execute(mockContext, duplicateConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to create target file: invalid/path/templates.md");
        }));
    });
    describe("Configuration Validation", () => {
        it("should validate correct duplicate configuration", () => {
            const validConfig = {
                type: OnCompletionActionType.DUPLICATE,
            };
            const isValid = executor["validateConfig"](validConfig);
            expect(isValid).toBe(true);
        });
        it("should reject invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.MOVE, // Wrong type
            };
            const canvasTask = {
                id: "canvas-task-8",
                content: "Test task",
                filePath: "source.canvas",
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
        it("should generate correct description for same file duplication", () => {
            const config = {
                type: OnCompletionActionType.DUPLICATE,
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Duplicate task in same file");
        });
        it("should generate correct description for different file duplication", () => {
            const config = {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "templates.canvas",
                targetSection: "Task Templates",
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Duplicate task to templates.canvas (section: Task Templates)");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRHVwbGljYXRlQWN0aW9uRXhlY3V0b3IuY2FudmFzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEdXBsaWNhdGVBY3Rpb25FeGVjdXRvci5jYW52YXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQ04sc0JBQXNCLEdBR3RCLE1BQU0sdUJBQXVCLENBQUM7QUFFL0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUU5RCwyQkFBMkI7QUFDM0IsTUFBTSxxQkFBcUIsR0FBRztJQUM3QixtQkFBbUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQzlCLENBQUM7QUFFRixRQUFRLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ3ZELElBQUksUUFBaUMsQ0FBQztJQUN0QyxJQUFJLFdBQXlDLENBQUM7SUFDOUMsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFZLENBQUM7SUFFakIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFFekMsNENBQTRDO1FBQzVDLFVBQVUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hDLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUUxQixxQ0FBcUM7UUFDckMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQzFELHFCQUFxQixDQUNyQixDQUFDO1FBRUYsY0FBYztRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDN0MsRUFBRSxDQUFDLDREQUE0RCxFQUFFLEdBQVMsRUFBRTtZQUMzRSxNQUFNLFVBQVUsR0FBNkI7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LENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLEVBQUUsQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7WUFDeEUsTUFBTSxNQUFNLEdBQWdDO2dCQUMzQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsU0FBUzthQUN0QyxDQUFDO1lBRUYsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsb0VBQW9FLEVBQUUsR0FBRyxFQUFFO1lBQzdFLE1BQU0sTUFBTSxHQUFnQztnQkFDM0MsSUFBSSxFQUFFLHNCQUFzQixDQUFDLFNBQVM7Z0JBQ3RDLFVBQVUsRUFBRSxrQkFBa0I7Z0JBQzlCLGFBQWEsRUFBRSxnQkFBZ0I7YUFDL0IsQ0FBQztZQUVGLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FDdkIsOERBQThELENBQzlELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRHVwbGljYXRlQWN0aW9uRXhlY3V0b3IgQ2FudmFzIFRlc3RzXHJcbiAqXHJcbiAqIFRlc3RzIGZvciBDYW52YXMgdGFzayBkdXBsaWNhdGlvbiBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBEdXBsaWNhdGluZyBDYW52YXMgdGFza3Mgd2l0aGluIENhbnZhcyBmaWxlc1xyXG4gKiAtIER1cGxpY2F0aW5nIENhbnZhcyB0YXNrcyB0byBNYXJrZG93biBmaWxlc1xyXG4gKiAtIE1ldGFkYXRhIHByZXNlcnZhdGlvbiBvcHRpb25zXHJcbiAqIC0gQ3Jvc3MtZm9ybWF0IHRhc2sgZHVwbGljYXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBEdXBsaWNhdGVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9kdXBsaWNhdGUtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0T25Db21wbGV0aW9uRHVwbGljYXRlQ29uZmlnLFxyXG59IGZyb20gXCIuLi90eXBlcy9vbkNvbXBsZXRpb25cIjtcclxuaW1wb3J0IHsgVGFzaywgQ2FudmFzVGFza01ldGFkYXRhIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiwgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuLy8gTW9jayBDYW52YXMgdGFzayB1cGRhdGVyXHJcbmNvbnN0IG1vY2tDYW52YXNUYXNrVXBkYXRlciA9IHtcclxuXHRkdXBsaWNhdGVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcbn07XHJcblxyXG5kZXNjcmliZShcIkR1cGxpY2F0ZUFjdGlvbkV4ZWN1dG9yIC0gQ2FudmFzIFRhc2tzXCIsICgpID0+IHtcclxuXHRsZXQgZXhlY3V0b3I6IER1cGxpY2F0ZUFjdGlvbkV4ZWN1dG9yO1xyXG5cdGxldCBtb2NrQ29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dDtcclxuXHRsZXQgbW9ja1BsdWdpbjogYW55O1xyXG5cdGxldCBtb2NrQXBwOiBhbnk7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0ZXhlY3V0b3IgPSBuZXcgRHVwbGljYXRlQWN0aW9uRXhlY3V0b3IoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZnJlc2ggbW9jayBpbnN0YW5jZXMgZm9yIGVhY2ggdGVzdFxyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHRcdG1vY2tBcHAgPSBjcmVhdGVNb2NrQXBwKCk7XHJcblxyXG5cdFx0Ly8gU2V0dXAgdGhlIENhbnZhcyB0YXNrIHVwZGF0ZXIgbW9ja1xyXG5cdFx0bW9ja1BsdWdpbi50YXNrTWFuYWdlci5nZXRDYW52YXNUYXNrVXBkYXRlci5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlclxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZXNldCBtb2Nrc1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FudmFzIHRvIENhbnZhcyBEdXBsaWNhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBzdWNjZXNzZnVsbHkgZHVwbGljYXRlIENhbnZhcyB0YXNrIHdpdGhpbiBzYW1lIGZpbGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFzayAjcHJvamVjdC90ZXN0XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXCIjcHJvamVjdC90ZXN0XCJdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkdXBsaWNhdGVDb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHRwcmVzZXJ2ZU1ldGFkYXRhOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHN1Y2Nlc3NmdWwgZHVwbGljYXRpb25cclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmR1cGxpY2F0ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgZHVwbGljYXRlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0NvbnRhaW4oXCJUYXNrIGR1cGxpY2F0ZWQgaW4gc2FtZSBmaWxlXCIpO1xyXG5cdFx0XHRleHBlY3QoXHJcblx0XHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmR1cGxpY2F0ZUNhbnZhc1Rhc2tcclxuXHRcdFx0KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRjYW52YXNUYXNrLFxyXG5cdFx0XHRcdFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgc3VjY2Vzc2Z1bGx5IGR1cGxpY2F0ZSBDYW52YXMgdGFzayB0byBkaWZmZXJlbnQgQ2FudmFzIGZpbGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stMlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGR1cGxpY2F0ZUNvbmZpZzogT25Db21wbGV0aW9uRHVwbGljYXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwidGFyZ2V0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdHRhcmdldFNlY3Rpb246IFwiVGVtcGxhdGVzXCIsXHJcblx0XHRcdFx0cHJlc2VydmVNZXRhZGF0YTogZmFsc2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgc3VjY2Vzc2Z1bCBkdXBsaWNhdGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZHVwbGljYXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBkdXBsaWNhdGVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgZHVwbGljYXRlZCB0byB0YXJnZXQuY2FudmFzXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0NvbnRhaW4oXCJzZWN0aW9uOiBUZW1wbGF0ZXNcIik7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZHVwbGljYXRlQ2FudmFzVGFza1xyXG5cdFx0XHQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0XCJ0YXJnZXQuY2FudmFzXCIsXHJcblx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFwiVGVtcGxhdGVzXCIsXHJcblx0XHRcdFx0ZmFsc2VcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBDYW52YXMgZHVwbGljYXRpb24gZmFpbHVyZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZHVwbGljYXRlQ29uZmlnOiBPbkNvbXBsZXRpb25EdXBsaWNhdGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJ0YXJnZXQuY2FudmFzXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZHVwbGljYXRpb24gZmFpbHVyZVxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZHVwbGljYXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IFwiVGFyZ2V0IENhbnZhcyBmaWxlIG5vdCBmb3VuZFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGR1cGxpY2F0ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXCJUYXJnZXQgQ2FudmFzIGZpbGUgbm90IGZvdW5kXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FudmFzIHRvIE1hcmtkb3duIER1cGxpY2F0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHN1Y2Nlc3NmdWxseSBkdXBsaWNhdGUgQ2FudmFzIHRhc2sgdG8gTWFya2Rvd24gZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay00XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrIOKchSAyMDI0LTAxLTE1XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGR1cGxpY2F0ZUNvbmZpZzogT25Db21wbGV0aW9uRHVwbGljYXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwidGVtcGxhdGVzLm1kXCIsXHJcblx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJUYXNrIFRlbXBsYXRlc1wiLFxyXG5cdFx0XHRcdHByZXNlcnZlTWV0YWRhdGE6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHRhcmdldCBmaWxlIGV4aXN0c1xyXG5cdFx0XHRjb25zdCBtb2NrVGFyZ2V0RmlsZSA9IHsgcGF0aDogXCJ0ZW1wbGF0ZXMubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tUYXJnZXRGaWxlKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBUZW1wbGF0ZXNcXG5cXG4jIyBUYXNrIFRlbXBsYXRlc1xcblxcblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBkdXBsaWNhdGVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgZHVwbGljYXRlZCBmcm9tIENhbnZhcyB0byB0ZW1wbGF0ZXMubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcInNlY3Rpb246IFRhc2sgVGVtcGxhdGVzXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgdGFzayBjb250ZW50IHdhcyBtb2RpZmllZCAoY29tcGxldGlvbiBkYXRlIHJlbW92ZWQsIHN0YXR1cyByZXNldClcclxuXHRcdFx0Y29uc3QgbW9kaWZ5Q2FsbCA9IG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2suY2FsbHNbMF07XHJcblx0XHRcdGNvbnN0IG1vZGlmaWVkQ29udGVudCA9IG1vZGlmeUNhbGxbMV07XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcIi0gWyBdIFRlc3QgQ2FudmFzIHRhc2tcIik7IC8vIFN0YXR1cyByZXNldCB0byBpbmNvbXBsZXRlXHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcIihkdXBsaWNhdGVkXCIpOyAvLyBEdXBsaWNhdGUgdGltZXN0YW1wIGFkZGVkXHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCLinIUgMjAyNC0wMS0xNVwiKTsgLy8gQ29tcGxldGlvbiBkYXRlIHJlbW92ZWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByZXNlcnZlIG1ldGFkYXRhIHdoZW4gcmVxdWVzdGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTVcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBUZXN0IENhbnZhcyB0YXNrICNwcm9qZWN0L3Rlc3Qg4o+wIDIwMjQtMDEtMjBcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L3Rlc3RcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMjBcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkdXBsaWNhdGVDb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcInRlbXBsYXRlcy5tZFwiLFxyXG5cdFx0XHRcdHByZXNlcnZlTWV0YWRhdGE6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgdGFyZ2V0IGZpbGUgZXhpc3RzXHJcblx0XHRcdGNvbnN0IG1vY2tUYXJnZXRGaWxlID0geyBwYXRoOiBcInRlbXBsYXRlcy5tZFwiIH07XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja1RhcmdldEZpbGUpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoXCIjIFRlbXBsYXRlc1xcblxcblwiKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGR1cGxpY2F0ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgbWV0YWRhdGEgd2FzIHByZXNlcnZlZFxyXG5cdFx0XHRjb25zdCBtb2RpZnlDYWxsID0gbW9ja0FwcC52YXVsdC5tb2RpZnkubW9jay5jYWxsc1swXTtcclxuXHRcdFx0Y29uc3QgbW9kaWZpZWRDb250ZW50ID0gbW9kaWZ5Q2FsbFsxXTtcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkudG9Db250YWluKFwiLSBbIF0gVGVzdCBDYW52YXMgdGFza1wiKTsgLy8gU3RhdHVzIHJlc2V0XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcIiNwcm9qZWN0L3Rlc3RcIik7IC8vIFByb2plY3QgdGFnIHByZXNlcnZlZFxyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b0NvbnRhaW4oXCLij7AgMjAyNC0wMS0yMFwiKTsgLy8gU2NoZWR1bGVkIGRhdGUgcHJlc2VydmVkXHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcIihkdXBsaWNhdGVkXCIpOyAvLyBEdXBsaWNhdGUgdGltZXN0YW1wIGFkZGVkXHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBjcmVhdGUgdGFyZ2V0IE1hcmtkb3duIGZpbGUgaWYgaXQgZG9lcyBub3QgZXhpc3RcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGR1cGxpY2F0ZUNvbmZpZzogT25Db21wbGV0aW9uRHVwbGljYXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwibmV3LXRlbXBsYXRlcy5tZFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHRhcmdldCBmaWxlIGRvZXMgbm90IGV4aXN0LCB0aGVuIGdldHMgY3JlYXRlZFxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cdFx0XHRjb25zdCBtb2NrQ3JlYXRlZEZpbGUgPSB7IHBhdGg6IFwibmV3LXRlbXBsYXRlcy5tZFwiIH07XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuY3JlYXRlLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tDcmVhdGVkRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcIlwiKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGR1cGxpY2F0ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtb2NrQXBwLnZhdWx0LmNyZWF0ZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0XCJuZXctdGVtcGxhdGVzLm1kXCIsXHJcblx0XHRcdFx0XCJcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB0YXJnZXQgZmlsZSBjcmVhdGlvbiBmYWlsdXJlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTdcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkdXBsaWNhdGVDb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcImludmFsaWQvcGF0aC90ZW1wbGF0ZXMubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayB0YXJnZXQgZmlsZSBkb2VzIG5vdCBleGlzdCBhbmQgY3JlYXRpb24gZmFpbHNcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5jcmVhdGUubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKFwiSW52YWxpZCBwYXRoXCIpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGR1cGxpY2F0ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCJGYWlsZWQgdG8gY3JlYXRlIHRhcmdldCBmaWxlOiBpbnZhbGlkL3BhdGgvdGVtcGxhdGVzLm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbmZpZ3VyYXRpb24gVmFsaWRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCB2YWxpZGF0ZSBjb3JyZWN0IGR1cGxpY2F0ZSBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdmFsaWRDb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGlzVmFsaWQgPSBleGVjdXRvcltcInZhbGlkYXRlQ29uZmlnXCJdKHZhbGlkQ29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KGlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZWplY3QgaW52YWxpZCBjb25maWd1cmF0aW9uXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW52YWxpZENvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsIC8vIFdyb25nIHR5cGVcclxuXHRcdFx0fSBhcyBhbnk7XHJcblxyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stOFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGludmFsaWRDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFwiSW52YWxpZCBjb25maWd1cmF0aW9uXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRGVzY3JpcHRpb24gR2VuZXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBnZW5lcmF0ZSBjb3JyZWN0IGRlc2NyaXB0aW9uIGZvciBzYW1lIGZpbGUgZHVwbGljYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gZXhlY3V0b3IuZ2V0RGVzY3JpcHRpb24oY29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KGRlc2NyaXB0aW9uKS50b0JlKFwiRHVwbGljYXRlIHRhc2sgaW4gc2FtZSBmaWxlXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZ2VuZXJhdGUgY29ycmVjdCBkZXNjcmlwdGlvbiBmb3IgZGlmZmVyZW50IGZpbGUgZHVwbGljYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkR1cGxpY2F0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcInRlbXBsYXRlcy5jYW52YXNcIixcclxuXHRcdFx0XHR0YXJnZXRTZWN0aW9uOiBcIlRhc2sgVGVtcGxhdGVzXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGV4ZWN1dG9yLmdldERlc2NyaXB0aW9uKGNvbmZpZyk7XHJcblx0XHRcdGV4cGVjdChkZXNjcmlwdGlvbikudG9CZShcclxuXHRcdFx0XHRcIkR1cGxpY2F0ZSB0YXNrIHRvIHRlbXBsYXRlcy5jYW52YXMgKHNlY3Rpb246IFRhc2sgVGVtcGxhdGVzKVwiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==