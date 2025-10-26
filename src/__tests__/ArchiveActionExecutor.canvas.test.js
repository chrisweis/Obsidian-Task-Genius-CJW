/**
 * ArchiveActionExecutor Canvas Tests
 *
 * Tests for Canvas task archiving functionality including:
 * - Archiving Canvas tasks to Markdown files
 * - Default and custom archive locations
 * - Archive file creation and section management
 * - Error handling and validation
 */
import { __awaiter } from "tslib";
import { ArchiveActionExecutor } from "../executors/completion/archive-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Date to return consistent date for tests
const mockDate = new Date("2025-07-04T12:00:00.000Z");
const originalDate = Date;
// Mock Canvas task updater
const mockCanvasTaskUpdater = {
    deleteCanvasTask: jest.fn(),
};
describe("ArchiveActionExecutor - Canvas Tasks", () => {
    let executor;
    let mockContext;
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        executor = new ArchiveActionExecutor();
        // Create fresh mock instances for each test
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        // Setup the Canvas task updater mock
        mockPlugin.taskManager.getCanvasTaskUpdater.mockReturnValue(mockCanvasTaskUpdater);
        // Reset mocks
        jest.clearAllMocks();
        // Reset all vault method mocks to default behavior
        mockApp.vault.getAbstractFileByPath.mockReset();
        mockApp.vault.getFileByPath.mockReset();
        mockApp.vault.read.mockReset();
        mockApp.vault.modify.mockReset();
        mockApp.vault.create.mockReset();
        mockApp.vault.createFolder.mockReset();
        // Reset Canvas task updater mocks
        mockCanvasTaskUpdater.deleteCanvasTask.mockReset();
        // Mock the current date to ensure consistent test results
        jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2025-07-07T00:00:00.000Z");
        jest.spyOn(Date.prototype, "getFullYear").mockReturnValue(2025);
        jest.spyOn(Date.prototype, "getMonth").mockReturnValue(6); // July (0-indexed)
        jest.spyOn(Date.prototype, "getDate").mockReturnValue(7);
    });
    afterEach(() => {
        // Restore date mocks
        jest.restoreAllMocks();
    });
    describe("Canvas Task Archiving", () => {
        it("should successfully archive Canvas task to default archive file", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
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
            // Mock archive file exists
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task archived from Canvas to Archive/Completed Tasks.md");
            expect(mockApp.vault.modify).toHaveBeenCalled(); // Archive happens first
            expect(mockCanvasTaskUpdater.deleteCanvasTask).toHaveBeenCalledWith(canvasTask); // Delete happens after
            // Verify the archived task content includes timestamp
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [x] Test Canvas task #project/test ✅ 2025-07-07");
            expect(modifiedContent).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
        }));
        it("should successfully archive Canvas task to custom archive file", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTask = {
                id: "canvas-task-2",
                content: "Important Canvas task",
                filePath: "project.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Important Canvas task ⏫",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-2",
                    tags: [],
                    children: [],
                    priority: 4,
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "Project Archive.md",
                archiveSection: "High Priority Tasks",
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
            // Mock custom archive file exists
            const mockArchiveFile = { path: "Project Archive.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Project Archive\n\n## High Priority Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task archived from Canvas to Project Archive.md");
            expect(mockApp.vault.modify).toHaveBeenCalled();
            // Verify the task was added to the correct section
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("## High Priority Tasks");
            expect(modifiedContent).toContain("- [x] Important Canvas task ⏫ ✅ 2025-07-07");
        }));
        it("should create archive file if it does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
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
                    canvasNodeId: "node-3",
                    tags: [],
                    children: [],
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "New Archive/Tasks.md",
                archiveSection: "Completed Tasks",
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
            // Mock archive file does not exist initially, then exists after creation
            const mockCreatedFile = { path: "New Archive/Tasks.md" };
            mockApp.vault.getFileByPath
                .mockReturnValueOnce(null) // Archive file doesn't exist initially
                .mockReturnValueOnce(mockCreatedFile); // File exists after creation
            mockApp.vault.getAbstractFileByPath
                .mockReturnValueOnce(null) // Directory doesn't exist
                .mockReturnValueOnce(mockCreatedFile); // File after creation
            // Mock file creation
            mockApp.vault.create.mockResolvedValue(mockCreatedFile);
            mockApp.vault.createFolder.mockResolvedValue(undefined);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith("New Archive");
            expect(mockApp.vault.create).toHaveBeenCalledWith("New Archive/Tasks.md", "# Archive\n\n## Completed Tasks\n\n");
            expect(mockApp.vault.modify).toHaveBeenCalled();
        }));
        it("should preserve task when archive operation fails", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "invalid/path/archive.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock archive file creation failure - file doesn't exist and creation fails
            mockApp.vault.getFileByPath.mockReturnValue(null);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
            mockApp.vault.createFolder.mockRejectedValue(new Error("Invalid path"));
            mockApp.vault.create.mockRejectedValue(new Error("Invalid path"));
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to create archive file");
            // Verify that deleteCanvasTask was NOT called since archive failed
            expect(mockCanvasTaskUpdater.deleteCanvasTask).not.toHaveBeenCalled();
        }));
        it("should handle Canvas deletion failure after successful archive", () => __awaiter(void 0, void 0, void 0, function* () {
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
                    canvasNodeId: "node-4",
                    tags: [],
                    children: [],
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful archive but Canvas deletion failure
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: false,
                error: "Canvas node not found",
            });
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Task archived successfully to Archive/Completed Tasks.md, but failed to remove from Canvas: Canvas node not found");
            // Verify that archive operation was attempted first
            expect(mockApp.vault.modify).toHaveBeenCalled();
        }));
        it("should handle archive file creation failure", () => __awaiter(void 0, void 0, void 0, function* () {
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
                    canvasNodeId: "node-5",
                    tags: [],
                    children: [],
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "invalid/path/archive.md",
            };
            mockContext = {
                task: canvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock archive file creation failure
            mockApp.vault.getFileByPath.mockReturnValue(null);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
            mockApp.vault.create.mockRejectedValue(new Error("Invalid path"));
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to create archive file");
        }));
        it("should create new section if section does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
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
                    canvasNodeId: "node-6",
                    tags: [],
                    children: [],
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
                archiveSection: "New Section",
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
            // Mock archive file exists but without the target section
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Other Section\n\nSome content\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify the new section was created
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("## New Section");
            expect(modifiedContent).toContain("- [x] Test Canvas task ✅ 2025-07-07");
        }));
    });
    describe("Configuration Validation", () => {
        it("should validate correct archive configuration", () => {
            const validConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            const isValid = executor["validateConfig"](validConfig);
            expect(isValid).toBe(true);
        });
        it("should reject invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.DELETE, // Wrong type
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
                    canvasNodeId: "node-7",
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
        it("should generate correct description with default settings", () => {
            const config = {
                type: OnCompletionActionType.ARCHIVE,
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Archive task to Archive/Completed Tasks.md (section: Completed Tasks)");
        });
        it("should generate correct description with custom settings", () => {
            const config = {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "Custom Archive.md",
                archiveSection: "Done Tasks",
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Archive task to Custom Archive.md (section: Done Tasks)");
        });
    });
    describe("OnCompletion Metadata Cleanup", () => {
        it("should remove onCompletion metadata when archiving Canvas task", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTaskWithOnCompletion = {
                id: "canvas-task-oncompletion",
                content: "Task with onCompletion",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task with onCompletion 🏁 archive:done.md",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-oncompletion",
                    tags: [],
                    children: [],
                    onCompletion: "archive:done.md",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: canvasTaskWithOnCompletion,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock archive file exists
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify the archived task content has onCompletion metadata removed
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [x] Task with onCompletion ✅ 2025-07-07");
            expect(modifiedContent).not.toContain("🏁");
            expect(modifiedContent).not.toContain("archive:done.md");
        }));
        it("should remove onCompletion metadata in JSON format when archiving", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTaskWithJsonOnCompletion = {
                id: "canvas-task-json-oncompletion",
                content: "Task with JSON onCompletion",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: '- [x] Task with JSON onCompletion 🏁 {"type": "archive", "archiveFile": "custom.md"}',
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-json-oncompletion",
                    tags: [],
                    children: [],
                    onCompletion: '{"type": "archive", "archiveFile": "custom.md"}',
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: canvasTaskWithJsonOnCompletion,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock archive file exists
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify the archived task content has JSON onCompletion metadata removed
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [x] Task with JSON onCompletion ✅ 2025-07-07");
            expect(modifiedContent).not.toContain("🏁");
            expect(modifiedContent).not.toContain('{"type": "archive"');
        }));
        it("should ensure task is marked as completed when archiving", () => __awaiter(void 0, void 0, void 0, function* () {
            const incompleteCanvasTask = {
                id: "canvas-task-incomplete",
                content: "Incomplete task to archive",
                filePath: "source.canvas",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Incomplete task to archive 🏁 archive",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-incomplete",
                    tags: [],
                    children: [],
                    onCompletion: "archive",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: incompleteCanvasTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock archive file exists
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify the archived task is marked as completed
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [x] Incomplete task to archive ✅ 2025-07-07");
            expect(modifiedContent).not.toContain("- [ ]"); // Should not contain incomplete checkbox
            expect(modifiedContent).not.toContain("🏁");
        }));
        it("should remove dataview format onCompletion when archiving", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasTaskWithDataviewOnCompletion = {
                id: "canvas-task-dataview-oncompletion",
                content: "Task with dataview onCompletion",
                filePath: "source.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task with dataview onCompletion [onCompletion:: archive:done.md]",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-dataview-oncompletion",
                    tags: [],
                    children: [],
                    onCompletion: "archive:done.md",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: canvasTaskWithDataviewOnCompletion,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock successful Canvas deletion
            mockCanvasTaskUpdater.deleteCanvasTask.mockResolvedValue({
                success: true,
            });
            // Mock archive file exists
            const mockArchiveFile = { path: "Archive/Completed Tasks.md" };
            mockApp.vault.getFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockArchiveFile);
            mockApp.vault.read.mockResolvedValue("# Archive\n\n## Completed Tasks\n\n");
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify the archived task content has dataview onCompletion metadata removed
            const modifyCall = mockApp.vault.modify.mock.calls[0];
            const modifiedContent = modifyCall[1];
            expect(modifiedContent).toContain("- [x] Task with dataview onCompletion ✅ 2025-07-07");
            expect(modifiedContent).not.toContain("[onCompletion::");
            expect(modifiedContent).not.toContain("archive:done.md");
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yLmNhbnZhcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yLmNhbnZhcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOztBQUVILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pGLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTlELGdEQUFnRDtBQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3RELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQztBQUUxQiwyQkFBMkI7QUFDM0IsTUFBTSxxQkFBcUIsR0FBRztJQUM3QixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQzNCLENBQUM7QUFFRixRQUFRLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBQ3JELElBQUksUUFBK0IsQ0FBQztJQUNwQyxJQUFJLFdBQXlDLENBQUM7SUFDOUMsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFZLENBQUM7SUFFakIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFFdkMsNENBQTRDO1FBQzVDLFVBQVUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hDLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUUxQixxQ0FBcUM7UUFDckMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQzFELHFCQUFxQixDQUNyQixDQUFDO1FBRUYsY0FBYztRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQixtREFBbUQ7UUFDbkQsT0FBTyxD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QUNyQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFbEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUVsRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVsQyw4RUFBOEU7WUFDOUUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FDaEMsb0RBQW9ELENBQ3BELENBQUM7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yIENhbnZhcyBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyBmb3IgQ2FudmFzIHRhc2sgYXJjaGl2aW5nIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nOlxyXG4gKiAtIEFyY2hpdmluZyBDYW52YXMgdGFza3MgdG8gTWFya2Rvd24gZmlsZXNcclxuICogLSBEZWZhdWx0IGFuZCBjdXN0b20gYXJjaGl2ZSBsb2NhdGlvbnNcclxuICogLSBBcmNoaXZlIGZpbGUgY3JlYXRpb24gYW5kIHNlY3Rpb24gbWFuYWdlbWVudFxyXG4gKiAtIEVycm9yIGhhbmRsaW5nIGFuZCB2YWxpZGF0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2FyY2hpdmUtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLFxyXG5cdE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQsXHJcblx0T25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyxcclxufSBmcm9tIFwiLi4vdHlwZXMvb25Db21wbGV0aW9uXCI7XHJcbmltcG9ydCB7IFRhc2ssIENhbnZhc1Rhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IGNyZWF0ZU1vY2tQbHVnaW4sIGNyZWF0ZU1vY2tBcHAgfSBmcm9tIFwiLi9tb2NrVXRpbHNcIjtcclxuXHJcbi8vIE1vY2sgRGF0ZSB0byByZXR1cm4gY29uc2lzdGVudCBkYXRlIGZvciB0ZXN0c1xyXG5jb25zdCBtb2NrRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNS0wNy0wNFQxMjowMDowMC4wMDBaXCIpO1xyXG5jb25zdCBvcmlnaW5hbERhdGUgPSBEYXRlO1xyXG5cclxuLy8gTW9jayBDYW52YXMgdGFzayB1cGRhdGVyXHJcbmNvbnN0IG1vY2tDYW52YXNUYXNrVXBkYXRlciA9IHtcclxuXHRkZWxldGVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcbn07XHJcblxyXG5kZXNjcmliZShcIkFyY2hpdmVBY3Rpb25FeGVjdXRvciAtIENhbnZhcyBUYXNrc1wiLCAoKSA9PiB7XHJcblx0bGV0IGV4ZWN1dG9yOiBBcmNoaXZlQWN0aW9uRXhlY3V0b3I7XHJcblx0bGV0IG1vY2tDb250ZXh0OiBPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0O1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblx0bGV0IG1vY2tBcHA6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRleGVjdXRvciA9IG5ldyBBcmNoaXZlQWN0aW9uRXhlY3V0b3IoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZnJlc2ggbW9jayBpbnN0YW5jZXMgZm9yIGVhY2ggdGVzdFxyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHRcdG1vY2tBcHAgPSBjcmVhdGVNb2NrQXBwKCk7XHJcblxyXG5cdFx0Ly8gU2V0dXAgdGhlIENhbnZhcyB0YXNrIHVwZGF0ZXIgbW9ja1xyXG5cdFx0bW9ja1BsdWdpbi50YXNrTWFuYWdlci5nZXRDYW52YXNUYXNrVXBkYXRlci5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlclxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZXNldCBtb2Nrc1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblxyXG5cdFx0Ly8gUmVzZXQgYWxsIHZhdWx0IG1ldGhvZCBtb2NrcyB0byBkZWZhdWx0IGJlaGF2aW9yXHJcblx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNldCgpO1xyXG5cdFx0bW9ja0FwcC52YXVsdC5jcmVhdGUubW9ja1Jlc2V0KCk7XHJcblx0XHRtb2NrQXBwLnZhdWx0LmNyZWF0ZUZvbGRlci5tb2NrUmVzZXQoKTtcclxuXHJcblx0XHQvLyBSZXNldCBDYW52YXMgdGFzayB1cGRhdGVyIG1vY2tzXHJcblx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzZXQoKTtcclxuXHJcblx0XHQvLyBNb2NrIHRoZSBjdXJyZW50IGRhdGUgdG8gZW5zdXJlIGNvbnNpc3RlbnQgdGVzdCByZXN1bHRzXHJcblx0XHRqZXN0LnNweU9uKERhdGUucHJvdG90eXBlLCBcInRvSVNPU3RyaW5nXCIpLm1vY2tSZXR1cm5WYWx1ZShcclxuXHRcdFx0XCIyMDI1LTA3LTA3VDAwOjAwOjAwLjAwMFpcIlxyXG5cdFx0KTtcclxuXHRcdGplc3Quc3B5T24oRGF0ZS5wcm90b3R5cGUsIFwiZ2V0RnVsbFllYXJcIikubW9ja1JldHVyblZhbHVlKDIwMjUpO1xyXG5cdFx0amVzdC5zcHlPbihEYXRlLnByb3RvdHlwZSwgXCJnZXRNb250aFwiKS5tb2NrUmV0dXJuVmFsdWUoNik7IC8vIEp1bHkgKDAtaW5kZXhlZClcclxuXHRcdGplc3Quc3B5T24oRGF0ZS5wcm90b3R5cGUsIFwiZ2V0RGF0ZVwiKS5tb2NrUmV0dXJuVmFsdWUoNyk7XHJcblx0fSk7XHJcblxyXG5cdGFmdGVyRWFjaCgoKSA9PiB7XHJcblx0XHQvLyBSZXN0b3JlIGRhdGUgbW9ja3NcclxuXHRcdGplc3QucmVzdG9yZUFsbE1vY2tzKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FudmFzIFRhc2sgQXJjaGl2aW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHN1Y2Nlc3NmdWxseSBhcmNoaXZlIENhbnZhcyB0YXNrIHRvIGRlZmF1bHQgYXJjaGl2ZSBmaWxlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2sgI3Byb2plY3QvdGVzdFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW1wiI3Byb2plY3QvdGVzdFwiXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHN1Y2Nlc3NmdWwgQ2FudmFzIGRlbGV0aW9uXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgYXJjaGl2ZSBmaWxlIGV4aXN0c1xyXG5cdFx0XHRjb25zdCBtb2NrQXJjaGl2ZUZpbGUgPSB7IHBhdGg6IFwiQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tBcmNoaXZlRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShcclxuXHRcdFx0XHRtb2NrQXJjaGl2ZUZpbGVcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBBcmNoaXZlXFxuXFxuIyMgQ29tcGxldGVkIFRhc2tzXFxuXFxuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgYXJjaGl2ZWQgZnJvbSBDYW52YXMgdG8gQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWQoKTsgLy8gQXJjaGl2ZSBoYXBwZW5zIGZpcnN0XHJcblx0XHRcdGV4cGVjdChtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzaykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0Y2FudmFzVGFza1xyXG5cdFx0XHQpOyAvLyBEZWxldGUgaGFwcGVucyBhZnRlclxyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoZSBhcmNoaXZlZCB0YXNrIGNvbnRlbnQgaW5jbHVkZXMgdGltZXN0YW1wXHJcblx0XHRcdGNvbnN0IG1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzBdO1xyXG5cdFx0XHRjb25zdCBtb2RpZmllZENvbnRlbnQgPSBtb2RpZnlDYWxsWzFdO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCItIFt4XSBUZXN0IENhbnZhcyB0YXNrICNwcm9qZWN0L3Rlc3Qg4pyFIDIwMjUtMDctMDdcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b01hdGNoKC9cXGR7NH0tXFxkezJ9LVxcZHsyfS8pOyAvLyBEYXRlIHBhdHRlcm5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHN1Y2Nlc3NmdWxseSBhcmNoaXZlIENhbnZhcyB0YXNrIHRvIGN1c3RvbSBhcmNoaXZlIGZpbGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stMlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiSW1wb3J0YW50IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwicHJvamVjdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gSW1wb3J0YW50IENhbnZhcyB0YXNrIOKPq1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMlwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRwcmlvcml0eTogNCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdFx0YXJjaGl2ZUZpbGU6IFwiUHJvamVjdCBBcmNoaXZlLm1kXCIsXHJcblx0XHRcdFx0YXJjaGl2ZVNlY3Rpb246IFwiSGlnaCBQcmlvcml0eSBUYXNrc1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIENhbnZhcyBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGN1c3RvbSBhcmNoaXZlIGZpbGUgZXhpc3RzXHJcblx0XHRcdGNvbnN0IG1vY2tBcmNoaXZlRmlsZSA9IHsgcGF0aDogXCJQcm9qZWN0IEFyY2hpdmUubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tBcmNoaXZlRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShcclxuXHRcdFx0XHRtb2NrQXJjaGl2ZUZpbGVcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBQcm9qZWN0IEFyY2hpdmVcXG5cXG4jIyBIaWdoIFByaW9yaXR5IFRhc2tzXFxuXFxuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIlRhc2sgYXJjaGl2ZWQgZnJvbSBDYW52YXMgdG8gUHJvamVjdCBBcmNoaXZlLm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQubW9kaWZ5KS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhlIHRhc2sgd2FzIGFkZGVkIHRvIHRoZSBjb3JyZWN0IHNlY3Rpb25cclxuXHRcdFx0Y29uc3QgbW9kaWZ5Q2FsbCA9IG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2suY2FsbHNbMF07XHJcblx0XHRcdGNvbnN0IG1vZGlmaWVkQ29udGVudCA9IG1vZGlmeUNhbGxbMV07XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcIiMjIEhpZ2ggUHJpb3JpdHkgVGFza3NcIik7XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIi0gW3hdIEltcG9ydGFudCBDYW52YXMgdGFzayDij6sg4pyFIDIwMjUtMDctMDdcIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIGFyY2hpdmUgZmlsZSBpZiBpdCBkb2VzIG5vdCBleGlzdFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IENhbnZhcyB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0zXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdFx0YXJjaGl2ZUZpbGU6IFwiTmV3IEFyY2hpdmUvVGFza3MubWRcIixcclxuXHRcdFx0XHRhcmNoaXZlU2VjdGlvbjogXCJDb21wbGV0ZWQgVGFza3NcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGNhbnZhc1Rhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgc3VjY2Vzc2Z1bCBDYW52YXMgZGVsZXRpb25cclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmRlbGV0ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBhcmNoaXZlIGZpbGUgZG9lcyBub3QgZXhpc3QgaW5pdGlhbGx5LCB0aGVuIGV4aXN0cyBhZnRlciBjcmVhdGlvblxyXG5cdFx0XHRjb25zdCBtb2NrQ3JlYXRlZEZpbGUgPSB7IHBhdGg6IFwiTmV3IEFyY2hpdmUvVGFza3MubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGhcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShudWxsKSAvLyBBcmNoaXZlIGZpbGUgZG9lc24ndCBleGlzdCBpbml0aWFsbHlcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShtb2NrQ3JlYXRlZEZpbGUpOyAvLyBGaWxlIGV4aXN0cyBhZnRlciBjcmVhdGlvblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aFxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKG51bGwpIC8vIERpcmVjdG9yeSBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UobW9ja0NyZWF0ZWRGaWxlKTsgLy8gRmlsZSBhZnRlciBjcmVhdGlvblxyXG5cclxuXHRcdFx0Ly8gTW9jayBmaWxlIGNyZWF0aW9uXHJcblx0XHRcdG1vY2tBcHAudmF1bHQuY3JlYXRlLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tDcmVhdGVkRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuY3JlYXRlRm9sZGVyLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcclxuXHRcdFx0XHRcIiMgQXJjaGl2ZVxcblxcbiMjIENvbXBsZXRlZCBUYXNrc1xcblxcblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBhcmNoaXZlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQuY3JlYXRlRm9sZGVyKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRcIk5ldyBBcmNoaXZlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQuY3JlYXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRcIk5ldyBBcmNoaXZlL1Rhc2tzLm1kXCIsXHJcblx0XHRcdFx0XCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByZXNlcnZlIHRhc2sgd2hlbiBhcmNoaXZlIG9wZXJhdGlvbiBmYWlsc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay1wcmVzZXJ2ZVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtcHJlc2VydmVcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBhcmNoaXZlQ29uZmlnOiBPbkNvbXBsZXRpb25BcmNoaXZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHRhcmNoaXZlRmlsZTogXCJpbnZhbGlkL3BhdGgvYXJjaGl2ZS5tZFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBhcmNoaXZlIGZpbGUgY3JlYXRpb24gZmFpbHVyZSAtIGZpbGUgZG9lc24ndCBleGlzdCBhbmQgY3JlYXRpb24gZmFpbHNcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmNyZWF0ZUZvbGRlci5tb2NrUmVqZWN0ZWRWYWx1ZShcclxuXHRcdFx0XHRuZXcgRXJyb3IoXCJJbnZhbGlkIHBhdGhcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5jcmVhdGUubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKFwiSW52YWxpZCBwYXRoXCIpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFwiRmFpbGVkIHRvIGNyZWF0ZSBhcmNoaXZlIGZpbGVcIik7XHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IGRlbGV0ZUNhbnZhc1Rhc2sgd2FzIE5PVCBjYWxsZWQgc2luY2UgYXJjaGl2ZSBmYWlsZWRcclxuXHRcdFx0ZXhwZWN0KFxyXG5cdFx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrXHJcblx0XHRcdCkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBDYW52YXMgZGVsZXRpb24gZmFpbHVyZSBhZnRlciBzdWNjZXNzZnVsIGFyY2hpdmVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtNFwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIGFyY2hpdmUgYnV0IENhbnZhcyBkZWxldGlvbiBmYWlsdXJlXHJcblx0XHRcdGNvbnN0IG1vY2tBcmNoaXZlRmlsZSA9IHsgcGF0aDogXCJBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiIH07XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0FyY2hpdmVGaWxlKTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKFxyXG5cdFx0XHRcdG1vY2tBcmNoaXZlRmlsZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoXHJcblx0XHRcdFx0XCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0bW9ja0NhbnZhc1Rhc2tVcGRhdGVyLmRlbGV0ZUNhbnZhc1Rhc2subW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBcIkNhbnZhcyBub2RlIG5vdCBmb3VuZFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFxyXG5cdFx0XHRcdFwiVGFzayBhcmNoaXZlZCBzdWNjZXNzZnVsbHkgdG8gQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWQsIGJ1dCBmYWlsZWQgdG8gcmVtb3ZlIGZyb20gQ2FudmFzOiBDYW52YXMgbm9kZSBub3QgZm91bmRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCBhcmNoaXZlIG9wZXJhdGlvbiB3YXMgYXR0ZW1wdGVkIGZpcnN0XHJcblx0XHRcdGV4cGVjdChtb2NrQXBwLnZhdWx0Lm1vZGlmeSkudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGFyY2hpdmUgZmlsZSBjcmVhdGlvbiBmYWlsdXJlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLTVcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRlc3QgQ2FudmFzIHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTVcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBhcmNoaXZlQ29uZmlnOiBPbkNvbXBsZXRpb25BcmNoaXZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0XHRhcmNoaXZlRmlsZTogXCJpbnZhbGlkL3BhdGgvYXJjaGl2ZS5tZFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBhcmNoaXZlIGZpbGUgY3JlYXRpb24gZmFpbHVyZVxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobnVsbCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuY3JlYXRlLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcihcIkludmFsaWQgcGF0aFwiKSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBhcmNoaXZlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcIkZhaWxlZCB0byBjcmVhdGUgYXJjaGl2ZSBmaWxlXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIG5ldyBzZWN0aW9uIGlmIHNlY3Rpb24gZG9lcyBub3QgZXhpc3RcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stNlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCBDYW52YXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtNlwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHRcdGFyY2hpdmVTZWN0aW9uOiBcIk5ldyBTZWN0aW9uXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHN1Y2Nlc3NmdWwgQ2FudmFzIGRlbGV0aW9uXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgYXJjaGl2ZSBmaWxlIGV4aXN0cyBidXQgd2l0aG91dCB0aGUgdGFyZ2V0IHNlY3Rpb25cclxuXHRcdFx0Y29uc3QgbW9ja0FyY2hpdmVGaWxlID0geyBwYXRoOiBcIkFyY2hpdmUvQ29tcGxldGVkIFRhc2tzLm1kXCIgfTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrQXJjaGl2ZUZpbGUpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdFx0bW9ja0FyY2hpdmVGaWxlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcclxuXHRcdFx0XHRcIiMgQXJjaGl2ZVxcblxcbiMjIE90aGVyIFNlY3Rpb25cXG5cXG5Tb21lIGNvbnRlbnRcXG5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhlIG5ldyBzZWN0aW9uIHdhcyBjcmVhdGVkXHJcblx0XHRcdGNvbnN0IG1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzBdO1xyXG5cdFx0XHRjb25zdCBtb2RpZmllZENvbnRlbnQgPSBtb2RpZnlDYWxsWzFdO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b0NvbnRhaW4oXCIjIyBOZXcgU2VjdGlvblwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiLSBbeF0gVGVzdCBDYW52YXMgdGFzayDinIUgMjAyNS0wNy0wN1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgY29ycmVjdCBhcmNoaXZlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB2YWxpZENvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBpc1ZhbGlkID0gZXhlY3V0b3JbXCJ2YWxpZGF0ZUNvbmZpZ1wiXSh2YWxpZENvbmZpZyk7XHJcblx0XHRcdGV4cGVjdChpc1ZhbGlkKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVqZWN0IGludmFsaWQgY29uZmlndXJhdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsIC8vIFdyb25nIHR5cGVcclxuXHRcdFx0fSBhcyBhbnk7XHJcblxyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stN1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTdcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBpbnZhbGlkQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcIkludmFsaWQgY29uZmlndXJhdGlvblwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRlc2NyaXB0aW9uIEdlbmVyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgZ2VuZXJhdGUgY29ycmVjdCBkZXNjcmlwdGlvbiB3aXRoIGRlZmF1bHQgc2V0dGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZGVzY3JpcHRpb24gPSBleGVjdXRvci5nZXREZXNjcmlwdGlvbihjb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZGVzY3JpcHRpb24pLnRvQmUoXHJcblx0XHRcdFx0XCJBcmNoaXZlIHRhc2sgdG8gQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWQgKHNlY3Rpb246IENvbXBsZXRlZCBUYXNrcylcIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZ2VuZXJhdGUgY29ycmVjdCBkZXNjcmlwdGlvbiB3aXRoIGN1c3RvbSBzZXR0aW5nc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdFx0YXJjaGl2ZUZpbGU6IFwiQ3VzdG9tIEFyY2hpdmUubWRcIixcclxuXHRcdFx0XHRhcmNoaXZlU2VjdGlvbjogXCJEb25lIFRhc2tzXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGV4ZWN1dG9yLmdldERlc2NyaXB0aW9uKGNvbmZpZyk7XHJcblx0XHRcdGV4cGVjdChkZXNjcmlwdGlvbikudG9CZShcclxuXHRcdFx0XHRcIkFyY2hpdmUgdGFzayB0byBDdXN0b20gQXJjaGl2ZS5tZCAoc2VjdGlvbjogRG9uZSBUYXNrcylcIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiT25Db21wbGV0aW9uIE1ldGFkYXRhIENsZWFudXBcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcmVtb3ZlIG9uQ29tcGxldGlvbiBtZXRhZGF0YSB3aGVuIGFyY2hpdmluZyBDYW52YXMgdGFza1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2tXaXRoT25Db21wbGV0aW9uOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stb25jb21wbGV0aW9uXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggb25Db21wbGV0aW9uXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGFzayB3aXRoIG9uQ29tcGxldGlvbiDwn4+BIGFyY2hpdmU6ZG9uZS5tZFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtb25jb21wbGV0aW9uXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbjogXCJhcmNoaXZlOmRvbmUubWRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrV2l0aE9uQ29tcGxldGlvbixcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIENhbnZhcyBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGFyY2hpdmUgZmlsZSBleGlzdHNcclxuXHRcdFx0Y29uc3QgbW9ja0FyY2hpdmVGaWxlID0geyBwYXRoOiBcIkFyY2hpdmUvQ29tcGxldGVkIFRhc2tzLm1kXCIgfTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrQXJjaGl2ZUZpbGUpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdFx0bW9ja0FyY2hpdmVGaWxlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcclxuXHRcdFx0XHRcIiMgQXJjaGl2ZVxcblxcbiMjIENvbXBsZXRlZCBUYXNrc1xcblxcblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBhcmNoaXZlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgYXJjaGl2ZWQgdGFzayBjb250ZW50IGhhcyBvbkNvbXBsZXRpb24gbWV0YWRhdGEgcmVtb3ZlZFxyXG5cdFx0XHRjb25zdCBtb2RpZnlDYWxsID0gbW9ja0FwcC52YXVsdC5tb2RpZnkubW9jay5jYWxsc1swXTtcclxuXHRcdFx0Y29uc3QgbW9kaWZpZWRDb250ZW50ID0gbW9kaWZ5Q2FsbFsxXTtcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiLSBbeF0gVGFzayB3aXRoIG9uQ29tcGxldGlvbiDinIUgMjAyNS0wNy0wN1wiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCLwn4+BXCIpO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS5ub3QudG9Db250YWluKFwiYXJjaGl2ZTpkb25lLm1kXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVtb3ZlIG9uQ29tcGxldGlvbiBtZXRhZGF0YSBpbiBKU09OIGZvcm1hdCB3aGVuIGFyY2hpdmluZ1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2tXaXRoSnNvbk9uQ29tcGxldGlvbjogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImNhbnZhcy10YXNrLWpzb24tb25jb21wbGV0aW9uXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggSlNPTiBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0Jy0gW3hdIFRhc2sgd2l0aCBKU09OIG9uQ29tcGxldGlvbiDwn4+BIHtcInR5cGVcIjogXCJhcmNoaXZlXCIsIFwiYXJjaGl2ZUZpbGVcIjogXCJjdXN0b20ubWRcIn0nLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtanNvbi1vbmNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOlxyXG5cdFx0XHRcdFx0XHQne1widHlwZVwiOiBcImFyY2hpdmVcIiwgXCJhcmNoaXZlRmlsZVwiOiBcImN1c3RvbS5tZFwifScsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogY2FudmFzVGFza1dpdGhKc29uT25Db21wbGV0aW9uLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHN1Y2Nlc3NmdWwgQ2FudmFzIGRlbGV0aW9uXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgYXJjaGl2ZSBmaWxlIGV4aXN0c1xyXG5cdFx0XHRjb25zdCBtb2NrQXJjaGl2ZUZpbGUgPSB7IHBhdGg6IFwiQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tBcmNoaXZlRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShcclxuXHRcdFx0XHRtb2NrQXJjaGl2ZUZpbGVcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBBcmNoaXZlXFxuXFxuIyMgQ29tcGxldGVkIFRhc2tzXFxuXFxuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoZSBhcmNoaXZlZCB0YXNrIGNvbnRlbnQgaGFzIEpTT04gb25Db21wbGV0aW9uIG1ldGFkYXRhIHJlbW92ZWRcclxuXHRcdFx0Y29uc3QgbW9kaWZ5Q2FsbCA9IG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2suY2FsbHNbMF07XHJcblx0XHRcdGNvbnN0IG1vZGlmaWVkQ29udGVudCA9IG1vZGlmeUNhbGxbMV07XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIi0gW3hdIFRhc2sgd2l0aCBKU09OIG9uQ29tcGxldGlvbiDinIUgMjAyNS0wNy0wN1wiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCLwn4+BXCIpO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS5ub3QudG9Db250YWluKCd7XCJ0eXBlXCI6IFwiYXJjaGl2ZVwiJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBlbnN1cmUgdGFzayBpcyBtYXJrZWQgYXMgY29tcGxldGVkIHdoZW4gYXJjaGl2aW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5jb21wbGV0ZUNhbnZhc1Rhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJjYW52YXMtdGFzay1pbmNvbXBsZXRlXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJJbmNvbXBsZXRlIHRhc2sgdG8gYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsIC8vIFRhc2sgaXMgbm90IGNvbXBsZXRlZFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBJbmNvbXBsZXRlIHRhc2sgdG8gYXJjaGl2ZSDwn4+BIGFyY2hpdmVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLWluY29tcGxldGVcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImFyY2hpdmVcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBpbmNvbXBsZXRlQ2FudmFzVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzdWNjZXNzZnVsIENhbnZhcyBkZWxldGlvblxyXG5cdFx0XHRtb2NrQ2FudmFzVGFza1VwZGF0ZXIuZGVsZXRlQ2FudmFzVGFzay5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGFyY2hpdmUgZmlsZSBleGlzdHNcclxuXHRcdFx0Y29uc3QgbW9ja0FyY2hpdmVGaWxlID0geyBwYXRoOiBcIkFyY2hpdmUvQ29tcGxldGVkIFRhc2tzLm1kXCIgfTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrQXJjaGl2ZUZpbGUpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoXHJcblx0XHRcdFx0bW9ja0FyY2hpdmVGaWxlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcclxuXHRcdFx0XHRcIiMgQXJjaGl2ZVxcblxcbiMjIENvbXBsZXRlZCBUYXNrc1xcblxcblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBhcmNoaXZlQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgYXJjaGl2ZWQgdGFzayBpcyBtYXJrZWQgYXMgY29tcGxldGVkXHJcblx0XHRcdGNvbnN0IG1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzBdO1xyXG5cdFx0XHRjb25zdCBtb2RpZmllZENvbnRlbnQgPSBtb2RpZnlDYWxsWzFdO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCItIFt4XSBJbmNvbXBsZXRlIHRhc2sgdG8gYXJjaGl2ZSDinIUgMjAyNS0wNy0wN1wiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2RpZmllZENvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCItIFsgXVwiKTsgLy8gU2hvdWxkIG5vdCBjb250YWluIGluY29tcGxldGUgY2hlY2tib3hcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkubm90LnRvQ29udGFpbihcIvCfj4FcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZW1vdmUgZGF0YXZpZXcgZm9ybWF0IG9uQ29tcGxldGlvbiB3aGVuIGFyY2hpdmluZ1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc1Rhc2tXaXRoRGF0YXZpZXdPbkNvbXBsZXRpb246IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9XHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiY2FudmFzLXRhc2stZGF0YXZpZXctb25jb21wbGV0aW9uXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIlRhc2sgd2l0aCBkYXRhdmlldyBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBcInNvdXJjZS5jYW52YXNcIixcclxuXHRcdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggZGF0YXZpZXcgb25Db21wbGV0aW9uIFtvbkNvbXBsZXRpb246OiBhcmNoaXZlOmRvbmUubWRdXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS1kYXRhdmlldy1vbmNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImFyY2hpdmU6ZG9uZS5tZFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBjYW52YXNUYXNrV2l0aERhdGF2aWV3T25Db21wbGV0aW9uLFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHN1Y2Nlc3NmdWwgQ2FudmFzIGRlbGV0aW9uXHJcblx0XHRcdG1vY2tDYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgYXJjaGl2ZSBmaWxlIGV4aXN0c1xyXG5cdFx0XHRjb25zdCBtb2NrQXJjaGl2ZUZpbGUgPSB7IHBhdGg6IFwiQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tBcmNoaXZlRmlsZSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShcclxuXHRcdFx0XHRtb2NrQXJjaGl2ZUZpbGVcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKFxyXG5cdFx0XHRcdFwiIyBBcmNoaXZlXFxuXFxuIyMgQ29tcGxldGVkIFRhc2tzXFxuXFxuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGFyY2hpdmVDb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoZSBhcmNoaXZlZCB0YXNrIGNvbnRlbnQgaGFzIGRhdGF2aWV3IG9uQ29tcGxldGlvbiBtZXRhZGF0YSByZW1vdmVkXHJcblx0XHRcdGNvbnN0IG1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzBdO1xyXG5cdFx0XHRjb25zdCBtb2RpZmllZENvbnRlbnQgPSBtb2RpZnlDYWxsWzFdO1xyXG5cdFx0XHRleHBlY3QobW9kaWZpZWRDb250ZW50KS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggZGF0YXZpZXcgb25Db21wbGV0aW9uIOKchSAyMDI1LTA3LTA3XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkubm90LnRvQ29udGFpbihcIltvbkNvbXBsZXRpb246OlwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vZGlmaWVkQ29udGVudCkubm90LnRvQ29udGFpbihcImFyY2hpdmU6ZG9uZS5tZFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19