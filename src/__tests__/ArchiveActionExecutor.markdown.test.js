/**
 * ArchiveActionExecutor Markdown Tests
 *
 * Tests for ArchiveActionExecutor Markdown task functionality including:
 * - Basic archive operations
 * - OnCompletion metadata cleanup
 * - Task completion status enforcement
 */
import { __awaiter } from "tslib";
import { ArchiveActionExecutor } from "../executors/completion/archive-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Date to return consistent date for tests
const mockDate = new Date("2025-07-04T12:00:00.000Z");
const originalDate = Date;
// Mock vault
const mockVault = {
    getAbstractFileByPath: jest.fn(),
    getFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    createFolder: jest.fn(),
};
const mockApp = {
    vault: mockVault,
};
describe("ArchiveActionExecutor - Markdown Tasks", () => {
    let executor;
    let mockContext;
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        executor = new ArchiveActionExecutor();
        // Create fresh mock instances for each test
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        // Mock Date globally
        global.Date = jest.fn(() => mockDate);
        global.Date.now = jest.fn(() => mockDate.getTime());
        global.Date.parse = originalDate.parse;
        global.Date.UTC = originalDate.UTC;
        // Reset mocks
        jest.clearAllMocks();
        // Reset all vault method mocks to default behavior
        mockApp.vault.getAbstractFileByPath.mockReset();
        mockApp.vault.getFileByPath.mockReset();
        mockApp.vault.read.mockReset();
        mockApp.vault.modify.mockReset();
        mockApp.vault.create.mockReset();
        mockApp.vault.createFolder.mockReset();
        // Mock the current date to ensure consistent test results
        // Mock Date methods globally
        const mockDate = new Date("2025-07-07T00:00:00.000Z");
        jest.spyOn(global, "Date").mockImplementation(() => mockDate);
        Date.now = jest.fn(() => mockDate.getTime());
    });
    afterEach(() => {
        // Restore date mocks
        jest.restoreAllMocks();
    });
    afterEach(() => {
        // Restore original Date
        global.Date = originalDate;
    });
    describe("Markdown Task Archiving", () => {
        it("should successfully archive Markdown task with onCompletion metadata cleanup", () => __awaiter(void 0, void 0, void 0, function* () {
            const markdownTask = {
                id: "markdown-task-1",
                content: "Task with onCompletion",
                filePath: "source.md",
                line: 3,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task with onCompletion 🏁 archive:done.md",
                metadata: {
                    tags: [],
                    children: [],
                    onCompletion: "archive:done.md",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: markdownTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock source file
            const mockSourceFile = { path: "source.md" };
            mockApp.vault.getFileByPath
                .mockReturnValueOnce(mockSourceFile) // Source file
                .mockReturnValueOnce({ path: "Archive/Completed Tasks.md" }); // Archive file
            // Mock file contents
            const sourceContent = "# Tasks\n\n- [ ] Other task\n- [x] Task with onCompletion 🏁 archive:done.md\n- [ ] Another task";
            const archiveContent = "# Archive\n\n## Completed Tasks\n\n";
            mockApp.vault.read
                .mockResolvedValueOnce(sourceContent) // Read source
                .mockResolvedValueOnce(archiveContent); // Read archive
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            expect(result.message).toContain("Task archived to Archive/Completed Tasks.md");
            // Verify source file was updated (task removed)
            const sourceModifyCall = mockApp.vault.modify.mock.calls[0];
            const updatedSourceContent = sourceModifyCall[1];
            expect(updatedSourceContent).toBe("# Tasks\n\n- [ ] Other task\n- [ ] Another task");
            // Verify archive file was updated (task added without onCompletion metadata)
            const archiveModifyCall = mockApp.vault.modify.mock.calls[1];
            const updatedArchiveContent = archiveModifyCall[1];
            expect(updatedArchiveContent).toContain("- [x] Task with onCompletion ✅ 2025-07-07 (from source.md)");
            expect(updatedArchiveContent).not.toContain("🏁");
            expect(updatedArchiveContent).not.toContain("archive:done.md");
            expect(updatedArchiveContent).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
        }));
        it("should ensure incomplete Markdown task is marked as completed when archived", () => __awaiter(void 0, void 0, void 0, function* () {
            const incompleteMarkdownTask = {
                id: "markdown-task-incomplete",
                content: "Incomplete task to archive",
                filePath: "source.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Incomplete task to archive 🏁 archive",
                metadata: {
                    tags: [],
                    children: [],
                    onCompletion: "archive",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: incompleteMarkdownTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock source file
            const mockSourceFile = { path: "source.md" };
            mockApp.vault.getFileByPath
                .mockReturnValueOnce(mockSourceFile) // Source file
                .mockReturnValueOnce({ path: "Archive/Completed Tasks.md" }); // Archive file
            // Mock file contents
            const sourceContent = "# Tasks\n- [ ] Incomplete task to archive 🏁 archive\n- [ ] Other task";
            const archiveContent = "# Archive\n\n## Completed Tasks\n\n";
            mockApp.vault.read
                .mockResolvedValueOnce(sourceContent) // Read source
                .mockResolvedValueOnce(archiveContent); // Read archive
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify archive file contains completed task without onCompletion metadata
            const archiveModifyCall = mockApp.vault.modify.mock.calls[1];
            const updatedArchiveContent = archiveModifyCall[1];
            expect(updatedArchiveContent).toContain("- [x] Incomplete task to archive ✅ 2025-07-07 (from source.md)");
            expect(updatedArchiveContent).not.toContain("- [ ]"); // Should not contain incomplete checkbox
            expect(updatedArchiveContent).not.toContain("🏁");
        }));
        it("should remove dataview format onCompletion from Markdown task", () => __awaiter(void 0, void 0, void 0, function* () {
            const markdownTaskWithDataview = {
                id: "markdown-task-dataview",
                content: "Task with dataview onCompletion",
                filePath: "source.md",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task with dataview onCompletion [onCompletion:: archive:done.md]",
                metadata: {
                    tags: [],
                    children: [],
                    onCompletion: "archive:done.md",
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: markdownTaskWithDataview,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock source file
            const mockSourceFile = { path: "source.md" };
            mockApp.vault.getFileByPath
                .mockReturnValueOnce(mockSourceFile) // Source file
                .mockReturnValueOnce({ path: "Archive/Completed Tasks.md" }); // Archive file
            // Mock file contents
            const sourceContent = "- [x] Task with dataview onCompletion [onCompletion:: archive:done.md]";
            const archiveContent = "# Archive\n\n## Completed Tasks\n\n";
            mockApp.vault.read
                .mockResolvedValueOnce(sourceContent) // Read source
                .mockResolvedValueOnce(archiveContent); // Read archive
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify archive file contains task without dataview onCompletion metadata
            const archiveModifyCall = mockApp.vault.modify.mock.calls[1];
            const updatedArchiveContent = archiveModifyCall[1];
            expect(updatedArchiveContent).toContain("- [x] Task with dataview onCompletion ✅ 2025-07-07 (from source.md)");
            expect(updatedArchiveContent).not.toContain("[onCompletion::");
            expect(updatedArchiveContent).not.toContain("archive:done.md");
        }));
        it("should remove JSON format onCompletion from Markdown task", () => __awaiter(void 0, void 0, void 0, function* () {
            const markdownTaskWithJson = {
                id: "markdown-task-json",
                content: "Task with JSON onCompletion",
                filePath: "source.md",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: '- [x] Task with JSON onCompletion 🏁 {"type": "archive", "archiveFile": "custom.md"}',
                metadata: {
                    tags: [],
                    children: [],
                    onCompletion: '{"type": "archive", "archiveFile": "custom.md"}',
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: markdownTaskWithJson,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock source file
            const mockSourceFile = { path: "source.md" };
            mockApp.vault.getFileByPath
                .mockReturnValueOnce(mockSourceFile) // Source file
                .mockReturnValueOnce({ path: "Archive/Completed Tasks.md" }); // Archive file
            // Mock file contents
            const sourceContent = '- [x] Task with JSON onCompletion 🏁 {"type": "archive", "archiveFile": "custom.md"}';
            const archiveContent = "# Archive\n\n## Completed Tasks\n\n";
            mockApp.vault.read
                .mockResolvedValueOnce(sourceContent) // Read source
                .mockResolvedValueOnce(archiveContent); // Read archive
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(true);
            // Verify archive file contains task without JSON onCompletion metadata
            const archiveModifyCall = mockApp.vault.modify.mock.calls[1];
            const updatedArchiveContent = archiveModifyCall[1];
            expect(updatedArchiveContent).toContain("- [x] Task with JSON onCompletion ✅ 2025-07-07 (from source.md)");
            expect(updatedArchiveContent).not.toContain("🏁");
            expect(updatedArchiveContent).not.toContain('{"type": "archive"');
        }));
    });
    describe("Error Handling", () => {
        it("should handle source file not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const markdownTask = {
                id: "markdown-task-error",
                content: "Task in missing file",
                filePath: "missing.md",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task in missing file",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            const archiveConfig = {
                type: OnCompletionActionType.ARCHIVE,
            };
            mockContext = {
                task: markdownTask,
                plugin: mockPlugin,
                app: mockApp,
            };
            // Mock source file not found
            mockApp.vault.getFileByPath.mockReturnValue(null);
            const result = yield executor.execute(mockContext, archiveConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Source file not found: missing.md");
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yLm1hcmtkb3duLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJBcmNoaXZlQWN0aW9uRXhlY3V0b3IubWFya2Rvd24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztHQU9HOztBQUVILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pGLE9BQU8sRUFHTixzQkFBc0IsR0FDdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzlELGdEQUFnRDtBQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3RELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQztBQUUxQixhQUFhO0FBQ2IsTUFBTSxTQUFTLEdBQUc7SUFDakIscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNmLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2pCLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ3ZCLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRztJQUNmLEtBQUssRUFBRSxTQUFTO0NBQ2hCLENBQUM7QUFFRixRQUFRLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ3ZELElBQUksUUFBK0IsQ0FBQztJQUNwQyxJQUFJLFdBQXlDLENBQUM7SUFDOUMsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFZLENBQUM7SUFFakIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixFQUFF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LENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEFyY2hpdmVBY3Rpb25FeGVjdXRvciBNYXJrZG93biBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyBmb3IgQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yIE1hcmtkb3duIHRhc2sgZnVuY3Rpb25hbGl0eSBpbmNsdWRpbmc6XHJcbiAqIC0gQmFzaWMgYXJjaGl2ZSBvcGVyYXRpb25zXHJcbiAqIC0gT25Db21wbGV0aW9uIG1ldGFkYXRhIGNsZWFudXBcclxuICogLSBUYXNrIGNvbXBsZXRpb24gc3RhdHVzIGVuZm9yY2VtZW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXJjaGl2ZUFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2FyY2hpdmUtZXhlY3V0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25FeGVjdXRpb25Db250ZXh0LFxyXG5cdE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcsXHJcblx0T25Db21wbGV0aW9uQWN0aW9uVHlwZSxcclxufSBmcm9tIFwiLi4vdHlwZXMvb25Db21wbGV0aW9uXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrUGx1Z2luLCBjcmVhdGVNb2NrQXBwIH0gZnJvbSBcIi4vbW9ja1V0aWxzXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcblxyXG4vLyBNb2NrIERhdGUgdG8gcmV0dXJuIGNvbnNpc3RlbnQgZGF0ZSBmb3IgdGVzdHNcclxuY29uc3QgbW9ja0RhdGUgPSBuZXcgRGF0ZShcIjIwMjUtMDctMDRUMTI6MDA6MDAuMDAwWlwiKTtcclxuY29uc3Qgb3JpZ2luYWxEYXRlID0gRGF0ZTtcclxuXHJcbi8vIE1vY2sgdmF1bHRcclxuY29uc3QgbW9ja1ZhdWx0ID0ge1xyXG5cdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdGdldEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRyZWFkOiBqZXN0LmZuKCksXHJcblx0bW9kaWZ5OiBqZXN0LmZuKCksXHJcblx0Y3JlYXRlOiBqZXN0LmZuKCksXHJcblx0Y3JlYXRlRm9sZGVyOiBqZXN0LmZuKCksXHJcbn07XHJcblxyXG5jb25zdCBtb2NrQXBwID0ge1xyXG5cdHZhdWx0OiBtb2NrVmF1bHQsXHJcbn07XHJcblxyXG5kZXNjcmliZShcIkFyY2hpdmVBY3Rpb25FeGVjdXRvciAtIE1hcmtkb3duIFRhc2tzXCIsICgpID0+IHtcclxuXHRsZXQgZXhlY3V0b3I6IEFyY2hpdmVBY3Rpb25FeGVjdXRvcjtcclxuXHRsZXQgbW9ja0NvbnRleHQ6IE9uQ29tcGxldGlvbkV4ZWN1dGlvbkNvbnRleHQ7XHJcblx0bGV0IG1vY2tQbHVnaW46IGFueTtcclxuXHRsZXQgbW9ja0FwcDogYW55O1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdGV4ZWN1dG9yID0gbmV3IEFyY2hpdmVBY3Rpb25FeGVjdXRvcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBmcmVzaCBtb2NrIGluc3RhbmNlcyBmb3IgZWFjaCB0ZXN0XHJcblx0XHRtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0bW9ja0FwcCA9IGNyZWF0ZU1vY2tBcHAoKTtcclxuXHJcblx0XHQvLyBNb2NrIERhdGUgZ2xvYmFsbHlcclxuXHRcdGdsb2JhbC5EYXRlID0gamVzdC5mbigoKSA9PiBtb2NrRGF0ZSkgYXMgYW55O1xyXG5cdFx0Z2xvYmFsLkRhdGUubm93ID0gamVzdC5mbigoKSA9PiBtb2NrRGF0ZS5nZXRUaW1lKCkpO1xyXG5cdFx0Z2xvYmFsLkRhdGUucGFyc2UgPSBvcmlnaW5hbERhdGUucGFyc2U7XHJcblx0XHRnbG9iYWwuRGF0ZS5VVEMgPSBvcmlnaW5hbERhdGUuVVRDO1xyXG5cclxuXHRcdC8vIFJlc2V0IG1vY2tzXHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHJcblx0XHQvLyBSZXNldCBhbGwgdmF1bHQgbWV0aG9kIG1vY2tzIHRvIGRlZmF1bHQgYmVoYXZpb3JcclxuXHRcdG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXNldCgpO1xyXG5cdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXNldCgpO1xyXG5cdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNldCgpO1xyXG5cdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1Jlc2V0KCk7XHJcblx0XHRtb2NrQXBwLnZhdWx0LmNyZWF0ZS5tb2NrUmVzZXQoKTtcclxuXHRcdG1vY2tBcHAudmF1bHQuY3JlYXRlRm9sZGVyLm1vY2tSZXNldCgpO1xyXG5cclxuXHRcdC8vIE1vY2sgdGhlIGN1cnJlbnQgZGF0ZSB0byBlbnN1cmUgY29uc2lzdGVudCB0ZXN0IHJlc3VsdHNcclxuXHRcdC8vIE1vY2sgRGF0ZSBtZXRob2RzIGdsb2JhbGx5XHJcblx0XHRjb25zdCBtb2NrRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNS0wNy0wN1QwMDowMDowMC4wMDBaXCIpO1xyXG5cdFx0amVzdC5zcHlPbihnbG9iYWwsIFwiRGF0ZVwiKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gbW9ja0RhdGUgYXMgYW55KTtcclxuXHRcdERhdGUubm93ID0gamVzdC5mbigoKSA9PiBtb2NrRGF0ZS5nZXRUaW1lKCkpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0Ly8gUmVzdG9yZSBkYXRlIG1vY2tzXHJcblx0XHRqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0Ly8gUmVzdG9yZSBvcmlnaW5hbCBEYXRlXHJcblx0XHRnbG9iYWwuRGF0ZSA9IG9yaWdpbmFsRGF0ZTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJNYXJrZG93biBUYXNrIEFyY2hpdmluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBzdWNjZXNzZnVsbHkgYXJjaGl2ZSBNYXJrZG93biB0YXNrIHdpdGggb25Db21wbGV0aW9uIG1ldGFkYXRhIGNsZWFudXBcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtYXJrZG93blRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibWFya2Rvd24tdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggb25Db21wbGV0aW9uXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwic291cmNlLm1kXCIsXHJcblx0XHRcdFx0bGluZTogMyxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggb25Db21wbGV0aW9uIPCfj4EgYXJjaGl2ZTpkb25lLm1kXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImFyY2hpdmU6ZG9uZS5tZFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBhcmNoaXZlQ29uZmlnOiBPbkNvbXBsZXRpb25BcmNoaXZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IG1hcmtkb3duVGFzayxcclxuXHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0YXBwOiBtb2NrQXBwIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgc291cmNlIGZpbGVcclxuXHRcdFx0Y29uc3QgbW9ja1NvdXJjZUZpbGUgPSB7IHBhdGg6IFwic291cmNlLm1kXCIgfTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UobW9ja1NvdXJjZUZpbGUpIC8vIFNvdXJjZSBmaWxlXHJcblx0XHRcdFx0Lm1vY2tSZXR1cm5WYWx1ZU9uY2UoeyBwYXRoOiBcIkFyY2hpdmUvQ29tcGxldGVkIFRhc2tzLm1kXCIgfSk7IC8vIEFyY2hpdmUgZmlsZVxyXG5cclxuXHRcdFx0Ly8gTW9jayBmaWxlIGNvbnRlbnRzXHJcblx0XHRcdGNvbnN0IHNvdXJjZUNvbnRlbnQgPVxyXG5cdFx0XHRcdFwiIyBUYXNrc1xcblxcbi0gWyBdIE90aGVyIHRhc2tcXG4tIFt4XSBUYXNrIHdpdGggb25Db21wbGV0aW9uIPCfj4EgYXJjaGl2ZTpkb25lLm1kXFxuLSBbIF0gQW5vdGhlciB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb250ZW50ID0gXCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIjtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZFxyXG5cdFx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoc291cmNlQ29udGVudCkgLy8gUmVhZCBzb3VyY2VcclxuXHRcdFx0XHQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKGFyY2hpdmVDb250ZW50KTsgLy8gUmVhZCBhcmNoaXZlXHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWVzc2FnZSkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiVGFzayBhcmNoaXZlZCB0byBBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgc291cmNlIGZpbGUgd2FzIHVwZGF0ZWQgKHRhc2sgcmVtb3ZlZClcclxuXHRcdFx0Y29uc3Qgc291cmNlTW9kaWZ5Q2FsbCA9IG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2suY2FsbHNbMF07XHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRTb3VyY2VDb250ZW50ID0gc291cmNlTW9kaWZ5Q2FsbFsxXTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRTb3VyY2VDb250ZW50KS50b0JlKFxyXG5cdFx0XHRcdFwiIyBUYXNrc1xcblxcbi0gWyBdIE90aGVyIHRhc2tcXG4tIFsgXSBBbm90aGVyIHRhc2tcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGFyY2hpdmUgZmlsZSB3YXMgdXBkYXRlZCAodGFzayBhZGRlZCB3aXRob3V0IG9uQ29tcGxldGlvbiBtZXRhZGF0YSlcclxuXHRcdFx0Y29uc3QgYXJjaGl2ZU1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzFdO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkQXJjaGl2ZUNvbnRlbnQgPSBhcmNoaXZlTW9kaWZ5Q2FsbFsxXTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRBcmNoaXZlQ29udGVudCkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiLSBbeF0gVGFzayB3aXRoIG9uQ29tcGxldGlvbiDinIUgMjAyNS0wNy0wNyAoZnJvbSBzb3VyY2UubWQpXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRBcmNoaXZlQ29udGVudCkubm90LnRvQ29udGFpbihcIvCfj4FcIik7XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQXJjaGl2ZUNvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCJhcmNoaXZlOmRvbmUubWRcIik7XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQXJjaGl2ZUNvbnRlbnQpLnRvTWF0Y2goL1xcZHs0fS1cXGR7Mn0tXFxkezJ9Lyk7IC8vIERhdGUgcGF0dGVyblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZW5zdXJlIGluY29tcGxldGUgTWFya2Rvd24gdGFzayBpcyBtYXJrZWQgYXMgY29tcGxldGVkIHdoZW4gYXJjaGl2ZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbmNvbXBsZXRlTWFya2Rvd25UYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcIm1hcmtkb3duLXRhc2staW5jb21wbGV0ZVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiSW5jb21wbGV0ZSB0YXNrIHRvIGFyY2hpdmVcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsIC8vIFRhc2sgaXMgbm90IGNvbXBsZXRlZFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBJbmNvbXBsZXRlIHRhc2sgdG8gYXJjaGl2ZSDwn4+BIGFyY2hpdmVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBhcmNoaXZlQ29uZmlnOiBPbkNvbXBsZXRpb25BcmNoaXZlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHRcdHRhc2s6IGluY29tcGxldGVNYXJrZG93blRhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHNvdXJjZSBmaWxlXHJcblx0XHRcdGNvbnN0IG1vY2tTb3VyY2VGaWxlID0geyBwYXRoOiBcInNvdXJjZS5tZFwiIH07XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aFxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKG1vY2tTb3VyY2VGaWxlKSAvLyBTb3VyY2UgZmlsZVxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKHsgcGF0aDogXCJBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiIH0pOyAvLyBBcmNoaXZlIGZpbGVcclxuXHJcblx0XHRcdC8vIE1vY2sgZmlsZSBjb250ZW50c1xyXG5cdFx0XHRjb25zdCBzb3VyY2VDb250ZW50ID1cclxuXHRcdFx0XHRcIiMgVGFza3NcXG4tIFsgXSBJbmNvbXBsZXRlIHRhc2sgdG8gYXJjaGl2ZSDwn4+BIGFyY2hpdmVcXG4tIFsgXSBPdGhlciB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb250ZW50ID0gXCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIjtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZFxyXG5cdFx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoc291cmNlQ29udGVudCkgLy8gUmVhZCBzb3VyY2VcclxuXHRcdFx0XHQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKGFyY2hpdmVDb250ZW50KTsgLy8gUmVhZCBhcmNoaXZlXHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgYXJjaGl2ZSBmaWxlIGNvbnRhaW5zIGNvbXBsZXRlZCB0YXNrIHdpdGhvdXQgb25Db21wbGV0aW9uIG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVNb2RpZnlDYWxsID0gbW9ja0FwcC52YXVsdC5tb2RpZnkubW9jay5jYWxsc1sxXTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZEFyY2hpdmVDb250ZW50ID0gYXJjaGl2ZU1vZGlmeUNhbGxbMV07XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQXJjaGl2ZUNvbnRlbnQpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIi0gW3hdIEluY29tcGxldGUgdGFzayB0byBhcmNoaXZlIOKchSAyMDI1LTA3LTA3IChmcm9tIHNvdXJjZS5tZClcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlZEFyY2hpdmVDb250ZW50KS5ub3QudG9Db250YWluKFwiLSBbIF1cIik7IC8vIFNob3VsZCBub3QgY29udGFpbiBpbmNvbXBsZXRlIGNoZWNrYm94XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQXJjaGl2ZUNvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCLwn4+BXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVtb3ZlIGRhdGF2aWV3IGZvcm1hdCBvbkNvbXBsZXRpb24gZnJvbSBNYXJrZG93biB0YXNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbWFya2Rvd25UYXNrV2l0aERhdGF2aWV3OiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcIm1hcmtkb3duLXRhc2stZGF0YXZpZXdcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRhc2sgd2l0aCBkYXRhdmlldyBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gW3hdIFRhc2sgd2l0aCBkYXRhdmlldyBvbkNvbXBsZXRpb24gW29uQ29tcGxldGlvbjo6IGFyY2hpdmU6ZG9uZS5tZF1cIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiYXJjaGl2ZTpkb25lLm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogbWFya2Rvd25UYXNrV2l0aERhdGF2aWV3LFxyXG5cdFx0XHRcdHBsdWdpbjogbW9ja1BsdWdpbixcclxuXHRcdFx0XHRhcHA6IG1vY2tBcHAgYXMgYW55LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBzb3VyY2UgZmlsZVxyXG5cdFx0XHRjb25zdCBtb2NrU291cmNlRmlsZSA9IHsgcGF0aDogXCJzb3VyY2UubWRcIiB9O1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGhcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZShtb2NrU291cmNlRmlsZSkgLy8gU291cmNlIGZpbGVcclxuXHRcdFx0XHQubW9ja1JldHVyblZhbHVlT25jZSh7IHBhdGg6IFwiQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIiB9KTsgLy8gQXJjaGl2ZSBmaWxlXHJcblxyXG5cdFx0XHQvLyBNb2NrIGZpbGUgY29udGVudHNcclxuXHRcdFx0Y29uc3Qgc291cmNlQ29udGVudCA9XHJcblx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggZGF0YXZpZXcgb25Db21wbGV0aW9uIFtvbkNvbXBsZXRpb246OiBhcmNoaXZlOmRvbmUubWRdXCI7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb250ZW50ID0gXCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIjtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZFxyXG5cdFx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoc291cmNlQ29udGVudCkgLy8gUmVhZCBzb3VyY2VcclxuXHRcdFx0XHQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKGFyY2hpdmVDb250ZW50KTsgLy8gUmVhZCBhcmNoaXZlXHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgYXJjaGl2ZSBmaWxlIGNvbnRhaW5zIHRhc2sgd2l0aG91dCBkYXRhdmlldyBvbkNvbXBsZXRpb24gbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgYXJjaGl2ZU1vZGlmeUNhbGwgPSBtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrLmNhbGxzWzFdO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkQXJjaGl2ZUNvbnRlbnQgPSBhcmNoaXZlTW9kaWZ5Q2FsbFsxXTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRBcmNoaXZlQ29udGVudCkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiLSBbeF0gVGFzayB3aXRoIGRhdGF2aWV3IG9uQ29tcGxldGlvbiDinIUgMjAyNS0wNy0wNyAoZnJvbSBzb3VyY2UubWQpXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRBcmNoaXZlQ29udGVudCkubm90LnRvQ29udGFpbihcIltvbkNvbXBsZXRpb246OlwiKTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRBcmNoaXZlQ29udGVudCkubm90LnRvQ29udGFpbihcImFyY2hpdmU6ZG9uZS5tZFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlbW92ZSBKU09OIGZvcm1hdCBvbkNvbXBsZXRpb24gZnJvbSBNYXJrZG93biB0YXNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbWFya2Rvd25UYXNrV2l0aEpzb246IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibWFya2Rvd24tdGFzay1qc29uXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggSlNPTiBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzb3VyY2UubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHQnLSBbeF0gVGFzayB3aXRoIEpTT04gb25Db21wbGV0aW9uIPCfj4Ege1widHlwZVwiOiBcImFyY2hpdmVcIiwgXCJhcmNoaXZlRmlsZVwiOiBcImN1c3RvbS5tZFwifScsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOlxyXG5cdFx0XHRcdFx0XHQne1widHlwZVwiOiBcImFyY2hpdmVcIiwgXCJhcmNoaXZlRmlsZVwiOiBcImN1c3RvbS5tZFwifScsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb25maWc6IE9uQ29tcGxldGlvbkFyY2hpdmVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja0NvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFzazogbWFya2Rvd25UYXNrV2l0aEpzb24sXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHNvdXJjZSBmaWxlXHJcblx0XHRcdGNvbnN0IG1vY2tTb3VyY2VGaWxlID0geyBwYXRoOiBcInNvdXJjZS5tZFwiIH07XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aFxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKG1vY2tTb3VyY2VGaWxlKSAvLyBTb3VyY2UgZmlsZVxyXG5cdFx0XHRcdC5tb2NrUmV0dXJuVmFsdWVPbmNlKHsgcGF0aDogXCJBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiIH0pOyAvLyBBcmNoaXZlIGZpbGVcclxuXHJcblx0XHRcdC8vIE1vY2sgZmlsZSBjb250ZW50c1xyXG5cdFx0XHRjb25zdCBzb3VyY2VDb250ZW50ID1cclxuXHRcdFx0XHQnLSBbeF0gVGFzayB3aXRoIEpTT04gb25Db21wbGV0aW9uIPCfj4Ege1widHlwZVwiOiBcImFyY2hpdmVcIiwgXCJhcmNoaXZlRmlsZVwiOiBcImN1c3RvbS5tZFwifSc7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVDb250ZW50ID0gXCIjIEFyY2hpdmVcXG5cXG4jIyBDb21wbGV0ZWQgVGFza3NcXG5cXG5cIjtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZFxyXG5cdFx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoc291cmNlQ29udGVudCkgLy8gUmVhZCBzb3VyY2VcclxuXHRcdFx0XHQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKGFyY2hpdmVDb250ZW50KTsgLy8gUmVhZCBhcmNoaXZlXHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgYXJjaGl2ZSBmaWxlIGNvbnRhaW5zIHRhc2sgd2l0aG91dCBKU09OIG9uQ29tcGxldGlvbiBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBhcmNoaXZlTW9kaWZ5Q2FsbCA9IG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2suY2FsbHNbMV07XHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRBcmNoaXZlQ29udGVudCA9IGFyY2hpdmVNb2RpZnlDYWxsWzFdO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlZEFyY2hpdmVDb250ZW50KS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggSlNPTiBvbkNvbXBsZXRpb24g4pyFIDIwMjUtMDctMDcgKGZyb20gc291cmNlLm1kKVwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQXJjaGl2ZUNvbnRlbnQpLm5vdC50b0NvbnRhaW4oXCLwn4+BXCIpO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlZEFyY2hpdmVDb250ZW50KS5ub3QudG9Db250YWluKCd7XCJ0eXBlXCI6IFwiYXJjaGl2ZVwiJyk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFcnJvciBIYW5kbGluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgc291cmNlIGZpbGUgbm90IGZvdW5kXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbWFya2Rvd25UYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcIm1hcmtkb3duLXRhc2stZXJyb3JcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRhc2sgaW4gbWlzc2luZyBmaWxlXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwibWlzc2luZy5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUYXNrIGluIG1pc3NpbmcgZmlsZVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZzogT25Db21wbGV0aW9uQXJjaGl2ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrQ29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXNrOiBtYXJrZG93blRhc2ssXHJcblx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdGFwcDogbW9ja0FwcCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBNb2NrIHNvdXJjZSBmaWxlIG5vdCBmb3VuZFxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgYXJjaGl2ZUNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXCJTb3VyY2UgZmlsZSBub3QgZm91bmQ6IG1pc3NpbmcubWRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==