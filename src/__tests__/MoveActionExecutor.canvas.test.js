/**
 * MoveActionExecutor Canvas Tests
 *
 * Tests for Canvas task movement functionality including:
 * - Moving Canvas tasks between Canvas files
 * - Moving Canvas tasks to Markdown files
 * - Cross-format task movement
 * - Error handling and validation
 */
import { __awaiter } from "tslib";
import { MoveActionExecutor } from "../executors/completion/move-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Canvas task updater
const mockCanvasTaskUpdater = {
    moveCanvasTask: jest.fn(),
    deleteCanvasTask: jest.fn(),
};
// Mock TaskManager
const mockTaskManager = {
    getCanvasTaskUpdater: jest.fn(() => mockCanvasTaskUpdater),
};
// Mock plugin
const mockPlugin = Object.assign(Object.assign({}, createMockPlugin()), { taskManager: mockTaskManager });
// Mock vault
const mockVault = {
    getAbstractFileByPath: jest.fn(),
    getFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
};
const mockApp = Object.assign(Object.assign({}, createMockApp()), { vault: mockVault });
describe("MoveActionExecutor - Canvas Tasks", () => {
    let executor;
    let mockContext;
    beforeEach(() => {
        executor = new MoveActionExecutor();
        // Reset mocks
        jest.clearAllMocks();
        // Reset all vault method mocks to default behavior
        mockVault.getAbstractFileByPath.mockReset();
        mockVault.getFileByPath.mockReset();
        mockVault.read.mockReset();
        mockVault.modify.mockReset();
        mockVault.create.mockReset();
        // Reset Canvas task updater mocks
        mockCanvasTaskUpdater.moveCanvasTask.mockReset();
        mockCanvasTaskUpdater.deleteCanvasTask.mockReset();
    });
    describe("Canvas to Canvas Movement", () => {
        it("should successfully move Canvas task to another Canvas file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-1",
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.canvas",
                targetSection: "Completed Tasks",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful move
            mockCanvasTaskUpdater.moveCanvasTask.mockResolvedValue({
                success: true,
            });
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task moved to Canvas file target.canvas");
            expect(result.message).toContain("section: Completed Tasks");
            expect(mockCanvasTaskUpdater.moveCanvasTask).toHaveBeenCalledWith(canvasTask, "target.canvas", undefined, "Completed Tasks");
        }));
        it("should handle Canvas to Canvas move failure", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.canvas",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock move failure
            mockCanvasTaskUpdater.moveCanvasTask.mockResolvedValue({
                success: false,
                error: "Target Canvas file not found",
            });
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Target Canvas file not found");
        }));
    });
    describe("Canvas to Markdown Movement", () => {
        it("should successfully move Canvas task to Markdown file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-3",
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.md",
                targetSection: "Completed Tasks",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock target file exists
            const mockTargetFile = { path: "target.md" };
            mockVault.getFileByPath.mockReturnValue(mockTargetFile);
            mockVault.getAbstractFileByPath.mockReturnValue(mockTargetFile);
            mockVault.read.mockResolvedValue("# Target File\n\n## Completed Tasks\n\n");
            mockVault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task moved from Canvas to target.md");
            expect(result.message).toContain("section: Completed Tasks");
            expect(mockCanvasTaskUpdater.deleteCanvasTask).toHaveBeenCalledWith(canvasTask);
            expect(mockVault.modify).toHaveBeenCalled();
        }));
        it("should create target Markdown file if it does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-4",
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "new-target.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock target file does not exist initially, then gets created
            const mockCreatedFile = { path: "new-target.md" };
            mockVault.getFileByPath
                .mockReturnValueOnce(null) // File doesn't exist initially
                .mockReturnValueOnce(mockCreatedFile); // File exists after creation
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.create.mockResolvedValue(mockCreatedFile);
            mockVault.read.mockResolvedValue("");
            mockVault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(true);
            expect(mockVault.create).toHaveBeenCalledWith("new-target.md", "");
            expect(mockVault.modify).toHaveBeenCalled();
        }));
        it("should preserve task when target file creation fails", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-preserve",
                content: "Test Canvas task",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test Canvas task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-preserve",
                    tags: [],
                    children: [],
                },
            };
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "invalid/path/target.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file does not exist and creation fails
            mockVault.getFileByPath.mockReturnValue(null);
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.create.mockRejectedValue(new Error("Invalid path"));
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to create target file: invalid/path/target.md");
            // Verify that deleteCanvasTask was NOT called since move failed
            expect(mockCanvasTaskUpdater.deleteCanvasTask).not.toHaveBeenCalled();
        }));
        it("should handle Canvas deletion failure after successful move", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-5",
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful target file operations but Canvas deletion failure
            const mockTargetFile = { path: "target.md" };
            mockVault.getFileByPath.mockReturnValue(mockTargetFile);
            mockVault.getAbstractFileByPath.mockReturnValue(mockTargetFile);
            mockVault.read.mockResolvedValue("# Target File\n\n");
            mockVault.modify.mockResolvedValue(undefined);
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: false,
                error: "Canvas node not found",
            });
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Task moved successfully to target.md, but failed to remove from Canvas: Canvas node not found");
            // Verify that target file was modified first
            expect(mockVault.modify).toHaveBeenCalled();
        }));
        it("should handle target file creation failure", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const moveConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "invalid/path/target.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock target file does not exist and creation fails
            mockVault.getFileByPath.mockReturnValue(null);
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.create.mockRejectedValue(new Error("Invalid path"));
            const result = yield executor.execute(mockContext, moveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to create target file: invalid/path/target.md");
        }));
    });
    describe("Configuration Validation", () => {
        it("should validate correct move configuration", () => {
            const validConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "target.canvas",
            };
            const isValid = executor["validateConfig"](validConfig);
            expect(isValid).toBe(true);
        });
        it("should reject invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.MOVE,
                targetFile: "", // Empty target file
            };
            const canvasTask = {
                id: "canvas-task-7",
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
        it("should generate correct description with section", () => {
            const config = {
                type: OnCompletionActionType.MOVE,
                targetFile: "archive.canvas",
                targetSection: "Completed Tasks",
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Move task to archive.canvas (section: Completed Tasks)");
        });
        it("should generate correct description without section", () => {
            const config = {
                type: OnCompletionActionType.MOVE,
                targetFile: "archive.md",
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Move task to archive.md");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW92ZUFjdGlvbkV4ZWN1dG9yLmNhbnZhcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTW92ZUFjdGlvbkV4ZWN1dG9yLmNhbnZhcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOztBQUVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTlELDJCQUEyQjtBQUMzQixNQUFNLHFCQUFxQixHQUFHO0lBQzdCLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3pCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDM0IsQ0FBQztBQUVGLG1CQUFtQjtBQUNuQixNQUFNLGVBQWUsR0FBRztJQUN2QixvQkFBb0IsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDO0NBQzFELENBQUM7QUFFRixjQUFjO0FBQ2QsTUFBTSxVQUFVLEdBQUcsZ0NBQ2YsZ0JBQWdCLEVBQUUsS0FDckIsV0FBVyxFQUFFLGVBQWUsR0FDckIsQ0FBQztBQUVULGFBQWE7QUFDYixNQUFNLFNBQVMsR0FBRztJQUNqQixxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2hDLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3hCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDakIsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDakIsQ0FBQztBQUVGLE1BQU0sT0FBTyxHQUFHLGdDQUNaLGFBQWEsRUFBRSxLQUNsQixLQUFLLEVBQUUsU0FBUyxHQUNULENB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LENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE1vdmVBY3Rpb25FeGVjdXRvciBDYW52YXMgVGVzdHNcclxuICpcclxuICogVGVzdHMgZm9yIENhbnZhcyB0YXNrIG1vdmVtZW50IGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nOlxyXG4gKiAtIE1vdmluZyBDYW52YXMgdGFza3MgYmV0d2VlbiBDYW52YXMgZmlsZXNcclxuICogLSBNb3ZpbmcgQ2FudmFzIHRhc2tzIHRvIE1hcmtkb3duIGZpbGVzXHJcbiAqIC0gQ3Jvc3MtZm9ybWF0IHRhc2sgbW92ZW1lbnRcclxuICogLSBFcnJvciBoYW5kbGluZyBhbmQgdmFsaWRhdGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1vdmVBY3Rpb25FeGVjdXRvciB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9tb3ZlLWV4ZWN1dG9yXCI7XHJcbmltcG9ydCB7XHJcblx0T25Db21wbGV0aW9uQWN0aW9uVHlwZSxcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdE9uQ29tcGxldGlvbk1vdmVDb25maWcsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrLCBDYW52YXNUYXNrTWV0YWRhdGEgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrUGx1Z2luLCBjcmVhdGVNb2NrQXBwIH0gZnJvbSBcIi4vbW9ja1V0aWxzXCI7XHJcblxyXG4vLyBNb2NrIENhbnZhcyB0YXNrIHVwZGF0ZXJcclxuY29uc3QgbW9ja0NhbnZhc1Rhc2tVcGRhdGVyID0ge1xyXG5cdG1vdmVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcblx0ZGVsZXRlQ2FudmFzVGFzazogamVzdC5mbigpLFxyXG59O1xyXG5cclxuLy8gTW9jayBUYXNrTWFuYWdlclxyXG5jb25zdCBtb2NrVGFza01hbmFnZXIgPSB7XHJcblx0Z2V0Q2FudmFzVGFza1VwZGF0ZXI6IGplc3QuZm4oKCkgPT4gbW9ja0NhbnZhc1Rhc2tVcGRhdGVyKSxcclxufTtcclxuXHJcbi8vIE1vY2sgcGx1Z2luXHJcbmNvbnN0IG1vY2tQbHVnaW4gPSB7XHJcblx0Li4uY3JlYXRlTW9ja1BsdWdpbigpLFxyXG5cdHRhc2tNYW5hZ2VyOiBtb2NrVGFza01hbmFnZXIsXHJcbn0gYXMgYW55O1xyXG5cclxuLy8gTW9jayB2YXVsdFxyXG5jb25zdCBtb2NrVmF1bHQgPSB7XHJcblx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoOiBqZXN0LmZuKCksXHJcblx0Z2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdHJlYWQ6IGplc3QuZm4oKSxcclxuXHRtb2RpZnk6IGplc3QuZm4oKSxcclxuXHRjcmVhdGU6IGplc3QuZm4oKSxcclxufTtcclxuXHJcbmNvbnN0IG1vY2tBcHAgPSB7XHJcblx0Li4uY3JlYXRlTW9ja0FwcCgpLFxyXG5cdHZhdWx0OiBtb2NrVmF1bHQsXHJcbn0gYXMgYW55O1xyXG5cclxuZGVzY3JpYmUoXCJNb3ZlQWN0aW9uRXhlY3V0b3IgLSBDYW52YXMgVGFza3NcIiwgKCkgPT4ge1xyXG5cdGxldCBleGVjdXRvcjogTW92ZUFjdGlvbkV4ZWN1dG9yO1xyXG5cdGxldCBtb2NrQ29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dDtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRleGVjdXRvciA9IG5ldyBNb3ZlQWN0aW9uRXhlY3V0b3IoKTtcclxuXHJcblx0XHQvLyBSZXNldCBtb2Nrc1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblxyXG5cdFx0Ly8gUmVzZXQgYWxsIHZhdWx0IG1ldGhvZCBtb2NrcyB0byBkZWZhdWx0IGJlaGF2aW9yXHJcblx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXNldCgpO1xyXG5cdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1Jlc2V0KCk7XHJcblx0XHRtb2NrVmF1bHQucmVhZC5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tWYXVsdC5tb2RpZnkubW9ja1Jlc2V0KCk7XHJcblx0XHRtb2NrVmF1bHQuY3JlYXRlLm1vY2tSZXNldCgpO1xyXG5cclxuXHRcdC8vIFJlc2V0IENhbnZhcyB0YXNrIHVwZGF0ZXIgbW9ja3NcclxuXHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5tb3ZlQ2FudmFzVGFzay5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrLm1vY2tSZXNldCgpO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNhbnZhcyB0byBDYW52YXMgTW92ZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgc3VjY2Vzc2Z1bGx5IG1vdmUgQ2FudmFzIHRhc2sgdG8gYW5vdGhlciBDYW52YXMgZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW92ZUNvbmZpZzogT25Db21wbGV0aW9uTW92ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJ0YXJnZXQuY2FudmFzXCIsXHJcblx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJDb21wbGV0ZWQgVGFza3NcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIG1vdmVcclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLm1vdmVDYW52YXNUYXNrLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgbW92ZWQgdG8gQ2FudmFzIGZpbGUgdGFyZ2V0LmNhbnZhc1wiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWVzc2FnZSkudG9Db250YWluKFwic2VjdGlvbjogQ29tcGxldGVkIFRhc2tzXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0NhbnZhc1Rhc2tVcGRhdGVyLm1vdmVDYW52YXNUYXNrKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRjYW52YXNUYXNrLFxyXG5cdFx0XHRcdFwidGFyZ2V0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcIkNvbXBsZXRlZCBUYXNrc1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgQ2FudmFzIHRvIENhbnZhcyBtb3ZlIGZhaWx1cmVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stMlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vdmVDb25maWc6IE9uQ29tcGxldGlvbk1vdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwidGFyZ2V0LmNhbnZhc1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4gYXMgYW55LFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIG1vdmUgZmFpbHVyZVxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIubW92ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBcIlRhcmdldCBDYW52YXMgZmlsZSBub3QgZm91bmRcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBtb3ZlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcIlRhcmdldCBDYW52YXMgZmlsZSBub3QgZm91bmRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDYW52YXMgdG8gTWFya2Rvd24gTW92ZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgc3VjY2Vzc2Z1bGx5IG1vdmUgQ2FudmFzIHRhc2sgdG8gTWFya2Rvd24gZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrICNwcm9qZWN0L3Rlc3RcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L3Rlc3RcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vdmVDb25maWc6IE9uQ29tcGxldGlvbk1vdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwidGFyZ2V0Lm1kXCIsXHJcblx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJDb21wbGV0ZWQgVGFza3NcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIENhbnZhcyBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIHRhcmdldCBmaWxlIGV4aXN0c1xyXG5cdFx0XHRjb25zdCBtb2NrVGFyZ2V0RmlsZSA9IHsgcGF0aDogXCJ0YXJnZXQubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja1RhcmdldEZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrVGFyZ2V0RmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBUYXJnZXQgRmlsZVxcblxcbiMjIENvbXBsZXRlZCBUYXNrc1xcblxcblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tWYXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgbW92ZWQgZnJvbSBDYW52YXMgdG8gdGFyZ2V0Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0NvbnRhaW4oXCJzZWN0aW9uOiBDb21wbGV0ZWQgVGFza3NcIik7XHJcblx0XHRcdGV4cGVjdChtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0Y2FudmFzVGFza1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobW9ja1ZhdWx0Lm1vZGlmeSkudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIHRhcmdldCBNYXJrZG93biBmaWxlIGlmIGl0IGRvZXMgbm90IGV4aXN0XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTRcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtb3ZlQ29uZmlnOiBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcIm5ldy10YXJnZXQubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIENhbnZhcyBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIHRhcmdldCBmaWxlIGRvZXMgbm90IGV4aXN0IGluaXRpYWxseSwgdGhlbiBnZXRzIGNyZWF0ZWRcclxuXHRcdFx0Y29uc3QgbW9ja0NyZWF0ZWRGaWxlID0geyBwYXRoOiBcIm5ldy10YXJnZXQubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0RmlsZUJ5UGF0aFxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKG51bGwpIC8vIEZpbGUgZG9lc24ndCBleGlzdCBpbml0aWFsbHlcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShtb2NrQ3JlYXRlZEZpbGUpOyAvLyBGaWxlIGV4aXN0cyBhZnRlciBjcmVhdGlvblxyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmNyZWF0ZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrQ3JlYXRlZEZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcIlwiKTtcclxuXHRcdFx0bW9ja1ZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgbW92ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtb2NrVmF1bHQuY3JlYXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcIm5ldy10YXJnZXQubWRcIiwgXCJcIik7XHJcblx0XHRcdGV4cGVjdChtb2NrVmF1bHQubW9kaWZ5KS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwcmVzZXJ2ZSB0YXNrIHdoZW4gdGFyZ2V0IGZpbGUgY3JlYXRpb24gZmFpbHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stcHJlc2VydmVcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLXByZXNlcnZlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW92ZUNvbmZpZzogT25Db21wbGV0aW9uTW92ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJpbnZhbGlkL3BhdGgvdGFyZ2V0Lm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgdGFyZ2V0IGZpbGUgZG9lcyBub3QgZXhpc3QgYW5kIGNyZWF0aW9uIGZhaWxzXHJcblx0XHRcdG1vY2tWYXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobnVsbCk7XHJcblx0XHRcdG1vY2tWYXVsdC5jcmVhdGUubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKFwiSW52YWxpZCBwYXRoXCIpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIGNyZWF0ZSB0YXJnZXQgZmlsZTogaW52YWxpZC9wYXRoL3RhcmdldC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IGRlbGV0ZUNhbnZhc1Rhc2sgd2FzIE5PVCBjYWxsZWQgc2luY2UgbW92ZSBmYWlsZWRcclxuXHRcdFx0ZXhwZWN0KFxyXG5cdFx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrXHJcblx0XHRcdCkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBDYW52YXMgZGVsZXRpb24gZmFpbHVyZSBhZnRlciBzdWNjZXNzZnVsIG1vdmVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vdmVDb25maWc6IE9uQ29tcGxldGlvbk1vdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwidGFyZ2V0Lm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgc3VjY2Vzc2Z1bCB0YXJnZXQgZmlsZSBvcGVyYXRpb25zIGJ1dCBDYW52YXMgZGVsZXRpb24gZmFpbHVyZVxyXG5cdFx0XHRjb25zdCBtb2NrVGFyZ2V0RmlsZSA9IHsgcGF0aDogXCJ0YXJnZXQubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja1RhcmdldEZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrVGFyZ2V0RmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFwiIyBUYXJnZXQgRmlsZVxcblxcblwiKTtcclxuXHRcdFx0bW9ja1ZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmRlbGV0ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBcIkNhbnZhcyBub2RlIG5vdCBmb3VuZFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFxyXG5cdFx0XHRcdFwiVGFzayBtb3ZlZCBzdWNjZXNzZnVsbHkgdG8gdGFyZ2V0Lm1kLCBidXQgZmFpbGVkIHRvIHJlbW92ZSBmcm9tIENhbnZhczogQ2FudmFzIG5vZGUgbm90IGZvdW5kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gVmVyaWZ5IHRoYXQgdGFyZ2V0IGZpbGUgd2FzIG1vZGlmaWVkIGZpcnN0XHJcblx0XHRcdGV4cGVjdChtb2NrVmF1bHQubW9kaWZ5KS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFyZ2V0IGZpbGUgY3JlYXRpb24gZmFpbHVyZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay02XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW92ZUNvbmZpZzogT25Db21wbGV0aW9uTW92ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJpbnZhbGlkL3BhdGgvdGFyZ2V0Lm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbiBhcyBhbnksXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgdGFyZ2V0IGZpbGUgZG9lcyBub3QgZXhpc3QgYW5kIGNyZWF0aW9uIGZhaWxzXHJcblx0XHRcdG1vY2tWYXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobnVsbCk7XHJcblx0XHRcdG1vY2tWYXVsdC5jcmVhdGUubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKFwiSW52YWxpZCBwYXRoXCIpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIG1vdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIGNyZWF0ZSB0YXJnZXQgZmlsZTogaW52YWxpZC9wYXRoL3RhcmdldC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgY29ycmVjdCBtb3ZlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB2YWxpZENvbmZpZzogT25Db21wbGV0aW9uTW92ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0dGFyZ2V0RmlsZTogXCJ0YXJnZXQuY2FudmFzXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBpc1ZhbGlkID0gZXhlY3V0b3JbXCJ2YWxpZGF0ZUNvbmZpZ1wiXSh2YWxpZENvbmZpZyk7XHJcblx0XHRcdGV4cGVjdChpc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVqZWN0IGludmFsaWQgY29uZmlndXJhdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IFwiXCIsIC8vIEVtcHR5IHRhcmdldCBmaWxlXHJcblx0XHRcdH0gYXMgT25Db21wbGV0aW9uTW92ZUNvbmZpZztcclxuXHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay03XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luIGFzIGFueSxcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgaW52YWxpZENvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXCJJbnZhbGlkIGNvbmZpZ3VyYXRpb25cIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJEZXNjcmlwdGlvbiBHZW5lcmF0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGdlbmVyYXRlIGNvcnJlY3QgZGVzY3JpcHRpb24gd2l0aCBzZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcImFyY2hpdmUuY2FudmFzXCIsXHJcblx0XHRcdFx0dGFyZ2V0U2VjdGlvbjogXCJDb21wbGV0ZWQgVGFza3NcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gZXhlY3V0b3IuZ2V0RGVzY3JpcHRpb24oY29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KGRlc2NyaXB0aW9uKS50b0JlKFxyXG5cdFx0XHRcdFwiTW92ZSB0YXNrIHRvIGFyY2hpdmUuY2FudmFzIChzZWN0aW9uOiBDb21wbGV0ZWQgVGFza3MpXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGdlbmVyYXRlIGNvcnJlY3QgZGVzY3JpcHRpb24gd2l0aG91dCBzZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25Nb3ZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHR0YXJnZXRGaWxlOiBcImFyY2hpdmUubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gZXhlY3V0b3IuZ2V0RGVzY3JpcHRpb24oY29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KGRlc2NyaXB0aW9uKS50b0JlKFwiTW92ZSB0YXNrIHRvIGFyY2hpdmUubWRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==