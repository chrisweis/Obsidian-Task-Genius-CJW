/**
 * Integration tests for Parent Task Date Inheritance
 * Tests hierarchical date inheritance with proper priority resolution
 */
import { __awaiter } from "tslib";
import { DateInheritanceService } from "../services/date-inheritance-service";
// Mock Obsidian modules
jest.mock("obsidian", () => ({
    App: jest.fn(),
    TFile: jest.fn(),
    Vault: jest.fn(),
    MetadataCache: jest.fn(),
}));
describe("Parent Task Date Inheritance", () => {
    let service;
    let mockApp;
    let mockVault;
    let mockMetadataCache;
    beforeEach(() => {
        mockApp = {};
        mockVault = {
            getAbstractFileByPath: jest.fn(),
            adapter: {
                stat: jest.fn(),
            },
        };
        mockMetadataCache = {
            getFileCache: jest.fn(),
        };
        service = new DateInheritanceService(mockApp, mockVault, mockMetadataCache);
    });
    afterEach(() => {
        jest.clearAllMocks();
        service.clearCache();
    });
    /**
     * Create a mock task for testing
     */
    function createMockTask(id, content, parentId, dates) {
        const metadata = Object.assign({ tags: [], children: [], parent: parentId }, dates);
        return {
            id,
            content,
            filePath: "test.md",
            line: parseInt(id.split('-')[1]) || 1,
            completed: false,
            status: "todo",
            originalMarkdown: `- [ ] ${content}`,
            metadata,
        };
    }
    /**
     * Create a time component for testing
     */
    function createTimeComponent(hour = 12) {
        return {
            hour,
            minute: 0,
            originalText: `${hour}:00`,
            isRange: false,
        };
    }
    describe("single-level parent inheritance", () => {
        it("should inherit start date from parent task", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-1", "Parent task", undefined, {
                startDate: new Date(2024, 2, 15).getTime(),
            });
            const childTask = createMockTask("child-1", "Child task 12:00", "parent-1");
            const timeComponent = createTimeComponent(12);
            const context = {
                currentLine: "  - [ ] Child task 12:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.confidence).toBe("high");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
            expect(result.context).toContain("depth: 0");
        }));
        it("should inherit due date when no start date available", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-2", "Parent task", undefined, {
                dueDate: new Date(2024, 2, 20).getTime(),
            });
            const childTask = createMockTask("child-2", "Child task 14:00", "parent-2");
            const timeComponent = createTimeComponent(14);
            const context = {
                currentLine: "  - [ ] Child task 14:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 20));
        }));
        it("should prioritize start date over due date", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-3", "Parent task", undefined, {
                startDate: new Date(2024, 2, 15).getTime(),
                dueDate: new Date(2024, 2, 20).getTime(),
            });
            const childTask = createMockTask("child-3", "Child task 16:00", "parent-3");
            const timeComponent = createTimeComponent(16);
            const context = {
                currentLine: "  - [ ] Child task 16:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15)); // Should use start date
        }));
        it("should inherit enhanced datetime objects when available", () => __awaiter(void 0, void 0, void 0, function* () {
            const enhancedMetadata = {
                tags: [],
                children: [],
                enhancedDates: {
                    startDateTime: new Date(2024, 2, 15, 9, 30, 0),
                },
            };
            const parentTask = {
                id: "parent-4",
                content: "Parent task with enhanced dates",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Parent task with enhanced dates",
                metadata: enhancedMetadata,
            };
            const childTask = createMockTask("child-4", "Child task 18:00", "parent-4");
            const timeComponent = createTimeComponent(18);
            const context = {
                currentLine: "  - [ ] Child task 18:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15, 9, 30, 0));
        }));
    });
    describe("multi-level hierarchical inheritance", () => {
        it("should inherit from grandparent when parent has no date", () => __awaiter(void 0, void 0, void 0, function* () {
            const grandparentTask = createMockTask("grandparent-1", "Grandparent task", undefined, {
                startDate: new Date(2024, 2, 10).getTime(),
            });
            const parentTask = createMockTask("parent-5", "Parent task (no date)", "grandparent-1");
            const childTask = createMockTask("child-5", "Child task 10:00", "parent-5");
            const timeComponent = createTimeComponent(10);
            const allTasks = [grandparentTask, parentTask, childTask];
            const context = {
                currentLine: "    - [ ] Child task 10:00",
                filePath: "test.md",
                parentTask,
                allTasks,
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.confidence).toBe("medium"); // Lower confidence for deeper inheritance
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 10));
            expect(result.context).toContain("depth: 1");
        }));
        it("should inherit from great-grandparent when needed", () => __awaiter(void 0, void 0, void 0, function* () {
            const greatGrandparentTask = createMockTask("great-grandparent-1", "Great-grandparent task", undefined, {
                dueDate: new Date(2024, 2, 25).getTime(),
            });
            const grandparentTask = createMockTask("grandparent-2", "Grandparent task (no date)", "great-grandparent-1");
            const parentTask = createMockTask("parent-6", "Parent task (no date)", "grandparent-2");
            const childTask = createMockTask("child-6", "Child task 15:00", "parent-6");
            const timeComponent = createTimeComponent(15);
            const allTasks = [greatGrandparentTask, grandparentTask, parentTask, childTask];
            const context = {
                currentLine: "      - [ ] Child task 15:00",
                filePath: "test.md",
                parentTask,
                allTasks,
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.confidence).toBe("low"); // Lowest confidence for deep inheritance
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 25));
            expect(result.context).toContain("depth: 2");
        }));
        it("should respect maximum depth limit", () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a deep hierarchy beyond the max depth (3)
            const level0Task = createMockTask("level-0", "Level 0 task", undefined, {
                startDate: new Date(2024, 2, 5).getTime(),
            });
            const level1Task = createMockTask("level-1", "Level 1 task", "level-0");
            const level2Task = createMockTask("level-2", "Level 2 task", "level-1");
            const level3Task = createMockTask("level-3", "Level 3 task", "level-2");
            const level4Task = createMockTask("level-4", "Level 4 task 11:00", "level-3");
            const timeComponent = createTimeComponent(11);
            const allTasks = [level0Task, level1Task, level2Task, level3Task, level4Task];
            // Mock file operations for fallback
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "        - [ ] Level 4 task 11:00",
                filePath: "test.md",
                parentTask: level3Task,
                allTasks,
            };
            const result = yield service.resolveDateForTimeOnly(level4Task, timeComponent, context);
            // Should fall back to file ctime since max depth is exceeded
            expect(result.source).toBe("file-ctime");
            expect(result.usedFallback).toBe(true);
        }));
    });
    describe("inheritance priority with other sources", () => {
        it("should prioritize line date over parent task date", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-7", "Parent task", undefined, {
                startDate: new Date(2024, 2, 10).getTime(),
            });
            const childTask = createMockTask("child-7", "Child task 2024-03-20 13:00", "parent-7");
            const timeComponent = createTimeComponent(13);
            const context = {
                currentLine: "  - [ ] Child task 2024-03-20 13:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("line-date");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 20)); // Should use line date, not parent
        }));
        it("should use parent task date when no line date available", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-8", "Parent task", undefined, {
                scheduledDate: new Date(2024, 2, 18).getTime(),
            });
            const childTask = createMockTask("child-8", "Child task 09:00", "parent-8");
            const timeComponent = createTimeComponent(9);
            // Mock file operations for fallback comparison
            const mockFile = { path: "regular-note.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "  - [ ] Child task 09:00",
                filePath: "regular-note.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 18));
        }));
    });
    describe("error handling and edge cases", () => {
        it("should handle missing parent task gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const childTask = createMockTask("child-9", "Orphaned child task 14:00", "missing-parent");
            const timeComponent = createTimeComponent(14);
            // Mock file operations for fallback
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 5).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "- [ ] Orphaned child task 14:00",
                filePath: "test.md",
                parentTask: undefined,
                allTasks: [childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            // Should fall back to file ctime
            expect(result.source).toBe("file-ctime");
            expect(result.usedFallback).toBe(true);
        }));
        it("should handle circular parent references", () => __awaiter(void 0, void 0, void 0, function* () {
            // Create circular reference: A -> B -> A
            const taskA = createMockTask("task-a", "Task A 10:00", "task-b");
            const taskB = createMockTask("task-b", "Task B", "task-a", {
                startDate: new Date(2024, 2, 15).getTime(),
            });
            const timeComponent = createTimeComponent(10);
            const context = {
                currentLine: "- [ ] Task A 10:00",
                filePath: "test.md",
                parentTask: taskB,
                allTasks: [taskA, taskB],
            };
            // This should not cause infinite recursion
            const result = yield service.resolveDateForTimeOnly(taskA, timeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
        }));
        it("should handle invalid parent task dates", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = createMockTask("parent-9", "Parent with invalid date", undefined, {
                startDate: NaN, // Invalid date
            });
            const childTask = createMockTask("child-10", "Child task 16:00", "parent-9");
            const timeComponent = createTimeComponent(16);
            // Mock file operations for fallback
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 8).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "  - [ ] Child task 16:00",
                filePath: "test.md",
                parentTask,
                allTasks: [parentTask, childTask],
            };
            const result = yield service.resolveDateForTimeOnly(childTask, timeComponent, context);
            // Should fall back to file ctime since parent date is invalid
            expect(result.source).toBe("file-ctime");
            expect(result.usedFallback).toBe(true);
        }));
    });
    describe("performance with complex hierarchies", () => {
        it("should efficiently handle large task hierarchies", () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a hierarchy with many siblings at each level
            const rootTask = createMockTask("root", "Root task", undefined, {
                startDate: new Date(2024, 2, 1).getTime(),
            });
            const allTasks = [rootTask];
            let currentParent = "root";
            // Create 2 levels with 10 tasks each (stay within max depth)
            for (let level = 1; level <= 2; level++) {
                const levelTasks = [];
                for (let i = 0; i < 10; i++) {
                    const taskId = `level-${level}-task-${i}`;
                    const task = createMockTask(taskId, `Level ${level} Task ${i}`, currentParent);
                    levelTasks.push(task);
                    allTasks.push(task);
                }
                currentParent = levelTasks[0].id; // Use first task as parent for next level
            }
            // Test inheritance from the deepest task
            const deepestTask = createMockTask("deepest", "Deepest task 12:00", currentParent);
            const timeComponent = createTimeComponent(12);
            allTasks.push(deepestTask);
            const parentTask = allTasks.find(t => t.id === currentParent);
            // Mock file operations for fallback (in case hierarchy fails)
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const startTime = Date.now();
            const context = {
                currentLine: "      - [ ] Deepest task 12:00",
                filePath: "test.md",
                parentTask,
                allTasks,
            };
            const result = yield service.resolveDateForTimeOnly(deepestTask, timeComponent, context);
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            // Should complete quickly even with large hierarchy
            expect(processingTime).toBeLessThan(100); // 100ms max
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 1));
            console.log(`Processed hierarchy with ${allTasks.length} tasks in ${processingTime}ms`);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFyZW50VGFza0RhdGVJbmhlcml0YW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUGFyZW50VGFza0RhdGVJbmhlcml0YW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFFSCxPQUFPLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sc0NBQXNDLENBQUM7QUFJckcsd0JBQXdCO0FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUIsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDZCxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQixLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUN4QixDQUFDLENBQUMsQ0FBQztBQUVKLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDN0MsSUFBSSxPQUErQixDQUFDO0lBQ3BDLElBQUksT0FBWSxDQUFDO0lBQ2pCLElBQUksU0FBYyxDQUFDO0lBQ25CLElBQUksaUJBQXNCLENBQUM7SUFFM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixTQUFTLEdBQUc7WUFDWCxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2hDLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTthQUNmO1NBQ0QsQ0FBQztRQUNGLGlCQUFpQixHQUFHO1lBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQ3ZCLENBQUM7UUFFRixPQUFPLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLENBQUMsR0FB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QyxDQUFDO1lBQ0gsaUJBQWlCLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQztnQkFDOUMsV0FBVyxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTdCLE1BQU0sT0FBTyxHQUEwQjtnQkFDdEMsV0FBVyxFQUFFLGdDQUFnQztnQkFDN0MsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLFVBQVU7Z0JBQ1YsUUFBUTthQUNSLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRXpGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMzQixNQUFNLGNBQWMsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBRTNDLG9EQUFvRDtZQUNwRCxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWTtZQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsUUFBUSxDQUFDLE1BQU0sYUFBYSxjQUFjLElBQUksQ0FBQyxDQUFDO1FBQ3pGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEludGVncmF0aW9uIHRlc3RzIGZvciBQYXJlbnQgVGFzayBEYXRlIEluaGVyaXRhbmNlXHJcbiAqIFRlc3RzIGhpZXJhcmNoaWNhbCBkYXRlIGluaGVyaXRhbmNlIHdpdGggcHJvcGVyIHByaW9yaXR5IHJlc29sdXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlLCBEYXRlUmVzb2x1dGlvbkNvbnRleHQgfSBmcm9tIFwiLi4vc2VydmljZXMvZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB7IFRhc2ssIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGEgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBtb2R1bGVzXHJcbmplc3QubW9jayhcIm9ic2lkaWFuXCIsICgpID0+ICh7XHJcblx0QXBwOiBqZXN0LmZuKCksXHJcblx0VEZpbGU6IGplc3QuZm4oKSxcclxuXHRWYXVsdDogamVzdC5mbigpLFxyXG5cdE1ldGFkYXRhQ2FjaGU6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuZGVzY3JpYmUoXCJQYXJlbnQgVGFzayBEYXRlIEluaGVyaXRhbmNlXCIsICgpID0+IHtcclxuXHRsZXQgc2VydmljZTogRGF0ZUluaGVyaXRhbmNlU2VydmljZTtcclxuXHRsZXQgbW9ja0FwcDogYW55O1xyXG5cdGxldCBtb2NrVmF1bHQ6IGFueTtcclxuXHRsZXQgbW9ja01ldGFkYXRhQ2FjaGU6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0ge307XHJcblx0XHRtb2NrVmF1bHQgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0XHRhZGFwdGVyOiB7XHJcblx0XHRcdFx0c3RhdDogamVzdC5mbigpLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdG1vY2tNZXRhZGF0YUNhY2hlID0ge1xyXG5cdFx0XHRnZXRGaWxlQ2FjaGU6IGplc3QuZm4oKSxcclxuXHRcdH07XHJcblxyXG5cdFx0c2VydmljZSA9IG5ldyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlKG1vY2tBcHAsIG1vY2tWYXVsdCwgbW9ja01ldGFkYXRhQ2FjaGUpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0XHRzZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHR9KTtcclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgbW9jayB0YXNrIGZvciB0ZXN0aW5nXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gY3JlYXRlTW9ja1Rhc2soXHJcblx0XHRpZDogc3RyaW5nLFxyXG5cdFx0Y29udGVudDogc3RyaW5nLFxyXG5cdFx0cGFyZW50SWQ/OiBzdHJpbmcsXHJcblx0XHRkYXRlcz86IHtcclxuXHRcdFx0c3RhcnREYXRlPzogbnVtYmVyO1xyXG5cdFx0XHRkdWVEYXRlPzogbnVtYmVyO1xyXG5cdFx0XHRzY2hlZHVsZWREYXRlPzogbnVtYmVyO1xyXG5cdFx0XHRjcmVhdGVkRGF0ZT86IG51bWJlcjtcclxuXHRcdH1cclxuXHQpOiBUYXNrIHtcclxuXHRcdGNvbnN0IG1ldGFkYXRhOiBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhID0ge1xyXG5cdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRwYXJlbnQ6IHBhcmVudElkLFxyXG5cdFx0XHQuLi5kYXRlcyxcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aWQsXHJcblx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0bGluZTogcGFyc2VJbnQoaWQuc3BsaXQoJy0nKVsxXSkgfHwgMSxcclxuXHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0b3JpZ2luYWxNYXJrZG93bjogYC0gWyBdICR7Y29udGVudH1gLFxyXG5cdFx0XHRtZXRhZGF0YSxcclxuXHRcdH0gYXMgVGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBhIHRpbWUgY29tcG9uZW50IGZvciB0ZXN0aW5nXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gY3JlYXRlVGltZUNvbXBvbmVudChob3VyOiBudW1iZXIgPSAxMik6IFRpbWVDb21wb25lbnQge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aG91cixcclxuXHRcdFx0bWludXRlOiAwLFxyXG5cdFx0XHRvcmlnaW5hbFRleHQ6IGAke2hvdXJ9OjAwYCxcclxuXHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZGVzY3JpYmUoXCJzaW5nbGUtbGV2ZWwgcGFyZW50IGluaGVyaXRhbmNlXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGluaGVyaXQgc3RhcnQgZGF0ZSBmcm9tIHBhcmVudCB0YXNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicGFyZW50LTFcIiwgXCJQYXJlbnQgdGFza1wiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJjaGlsZC0xXCIsIFwiQ2hpbGQgdGFzayAxMjowMFwiLCBcInBhcmVudC0xXCIpO1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxMik7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiICAtIFsgXSBDaGlsZCB0YXNrIDEyOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdFx0YWxsVGFza3M6IFtwYXJlbnRUYXNrLCBjaGlsZFRhc2tdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KGNoaWxkVGFzaywgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZGVuY2UpLnRvQmUoXCJoaWdoXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbnRleHQpLnRvQ29udGFpbihcImRlcHRoOiAwXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW5oZXJpdCBkdWUgZGF0ZSB3aGVuIG5vIHN0YXJ0IGRhdGUgYXZhaWxhYmxlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicGFyZW50LTJcIiwgXCJQYXJlbnQgdGFza1wiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAyMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNoaWxkVGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwiY2hpbGQtMlwiLCBcIkNoaWxkIHRhc2sgMTQ6MDBcIiwgXCJwYXJlbnQtMlwiKTtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTQpO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIiAgLSBbIF0gQ2hpbGQgdGFzayAxNDowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrLFxyXG5cdFx0XHRcdGFsbFRhc2tzOiBbcGFyZW50VGFzaywgY2hpbGRUYXNrXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShjaGlsZFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zb3VyY2UpLnRvQmUoXCJwYXJlbnQtdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZXNvbHZlZERhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAyNCwgMiwgMjApKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgc3RhcnQgZGF0ZSBvdmVyIGR1ZSBkYXRlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicGFyZW50LTNcIiwgXCJQYXJlbnQgdGFza1wiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoMjAyNCwgMiwgMjApLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGlsZFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImNoaWxkLTNcIiwgXCJDaGlsZCB0YXNrIDE2OjAwXCIsIFwicGFyZW50LTNcIik7XHJcblx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnQgPSBjcmVhdGVUaW1lQ29tcG9uZW50KDE2KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCIgIC0gWyBdIENoaWxkIHRhc2sgMTY6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0cGFyZW50VGFzayxcclxuXHRcdFx0XHRhbGxUYXNrczogW3BhcmVudFRhc2ssIGNoaWxkVGFza10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkoY2hpbGRUYXNrLCB0aW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwicGFyZW50LXRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDE1KSk7IC8vIFNob3VsZCB1c2Ugc3RhcnQgZGF0ZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW5oZXJpdCBlbmhhbmNlZCBkYXRldGltZSBvYmplY3RzIHdoZW4gYXZhaWxhYmxlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YTogRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0ZW5oYW5jZWREYXRlczoge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlVGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUsIDksIDMwLCAwKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJwYXJlbnQtNFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiUGFyZW50IHRhc2sgd2l0aCBlbmhhbmNlZCBkYXRlc1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFBhcmVudCB0YXNrIHdpdGggZW5oYW5jZWQgZGF0ZXNcIixcclxuXHRcdFx0XHRtZXRhZGF0YTogZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0fSBhcyBUYXNrO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJjaGlsZC00XCIsIFwiQ2hpbGQgdGFzayAxODowMFwiLCBcInBhcmVudC00XCIpO1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxOCk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiICAtIFsgXSBDaGlsZCB0YXNrIDE4OjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdFx0YWxsVGFza3M6IFtwYXJlbnRUYXNrLCBjaGlsZFRhc2tdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KGNoaWxkVGFzaywgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSwgOSwgMzAsIDApKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIm11bHRpLWxldmVsIGhpZXJhcmNoaWNhbCBpbmhlcml0YW5jZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBpbmhlcml0IGZyb20gZ3JhbmRwYXJlbnQgd2hlbiBwYXJlbnQgaGFzIG5vIGRhdGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBncmFuZHBhcmVudFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImdyYW5kcGFyZW50LTFcIiwgXCJHcmFuZHBhcmVudCB0YXNrXCIsIHVuZGVmaW5lZCwge1xyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogbmV3IERhdGUoMjAyNCwgMiwgMTApLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBwYXJlbnRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJwYXJlbnQtNVwiLCBcIlBhcmVudCB0YXNrIChubyBkYXRlKVwiLCBcImdyYW5kcGFyZW50LTFcIik7XHJcblxyXG5cdFx0XHRjb25zdCBjaGlsZFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImNoaWxkLTVcIiwgXCJDaGlsZCB0YXNrIDEwOjAwXCIsIFwicGFyZW50LTVcIik7XHJcblx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnQgPSBjcmVhdGVUaW1lQ29tcG9uZW50KDEwKTtcclxuXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tzID0gW2dyYW5kcGFyZW50VGFzaywgcGFyZW50VGFzaywgY2hpbGRUYXNrXTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCIgICAgLSBbIF0gQ2hpbGQgdGFzayAxMDowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrLFxyXG5cdFx0XHRcdGFsbFRhc2tzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KGNoaWxkVGFzaywgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZGVuY2UpLnRvQmUoXCJtZWRpdW1cIik7IC8vIExvd2VyIGNvbmZpZGVuY2UgZm9yIGRlZXBlciBpbmhlcml0YW5jZVxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxMCkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbnRleHQpLnRvQ29udGFpbihcImRlcHRoOiAxXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW5oZXJpdCBmcm9tIGdyZWF0LWdyYW5kcGFyZW50IHdoZW4gbmVlZGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZ3JlYXRHcmFuZHBhcmVudFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImdyZWF0LWdyYW5kcGFyZW50LTFcIiwgXCJHcmVhdC1ncmFuZHBhcmVudCB0YXNrXCIsIHVuZGVmaW5lZCwge1xyXG5cdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDI1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZ3JhbmRwYXJlbnRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJncmFuZHBhcmVudC0yXCIsIFwiR3JhbmRwYXJlbnQgdGFzayAobm8gZGF0ZSlcIiwgXCJncmVhdC1ncmFuZHBhcmVudC0xXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicGFyZW50LTZcIiwgXCJQYXJlbnQgdGFzayAobm8gZGF0ZSlcIiwgXCJncmFuZHBhcmVudC0yXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJjaGlsZC02XCIsIFwiQ2hpbGQgdGFzayAxNTowMFwiLCBcInBhcmVudC02XCIpO1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxNSk7XHJcblxyXG5cdFx0XHRjb25zdCBhbGxUYXNrcyA9IFtncmVhdEdyYW5kcGFyZW50VGFzaywgZ3JhbmRwYXJlbnRUYXNrLCBwYXJlbnRUYXNrLCBjaGlsZFRhc2tdO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIiAgICAgIC0gWyBdIENoaWxkIHRhc2sgMTU6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0cGFyZW50VGFzayxcclxuXHRcdFx0XHRhbGxUYXNrcyxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShjaGlsZFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zb3VyY2UpLnRvQmUoXCJwYXJlbnQtdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWRlbmNlKS50b0JlKFwibG93XCIpOyAvLyBMb3dlc3QgY29uZmlkZW5jZSBmb3IgZGVlcCBpbmhlcml0YW5jZVxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAyNSkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbnRleHQpLnRvQ29udGFpbihcImRlcHRoOiAyXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVzcGVjdCBtYXhpbXVtIGRlcHRoIGxpbWl0XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgZGVlcCBoaWVyYXJjaHkgYmV5b25kIHRoZSBtYXggZGVwdGggKDMpXHJcblx0XHRcdGNvbnN0IGxldmVsMFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImxldmVsLTBcIiwgXCJMZXZlbCAwIHRhc2tcIiwgdW5kZWZpbmVkLCB7XHJcblx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCA1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgbGV2ZWwxVGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwibGV2ZWwtMVwiLCBcIkxldmVsIDEgdGFza1wiLCBcImxldmVsLTBcIik7XHJcblx0XHRcdGNvbnN0IGxldmVsMlRhc2sgPSBjcmVhdGVNb2NrVGFzayhcImxldmVsLTJcIiwgXCJMZXZlbCAyIHRhc2tcIiwgXCJsZXZlbC0xXCIpO1xyXG5cdFx0XHRjb25zdCBsZXZlbDNUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJsZXZlbC0zXCIsIFwiTGV2ZWwgMyB0YXNrXCIsIFwibGV2ZWwtMlwiKTtcclxuXHRcdFx0Y29uc3QgbGV2ZWw0VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwibGV2ZWwtNFwiLCBcIkxldmVsIDQgdGFzayAxMTowMFwiLCBcImxldmVsLTNcIik7XHJcblxyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxMSk7XHJcblxyXG5cdFx0XHRjb25zdCBhbGxUYXNrcyA9IFtsZXZlbDBUYXNrLCBsZXZlbDFUYXNrLCBsZXZlbDJUYXNrLCBsZXZlbDNUYXNrLCBsZXZlbDRUYXNrXTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZmlsZSBvcGVyYXRpb25zIGZvciBmYWxsYmFja1xyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBudWxsLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCIgICAgICAgIC0gWyBdIExldmVsIDQgdGFzayAxMTowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrOiBsZXZlbDNUYXNrLFxyXG5cdFx0XHRcdGFsbFRhc2tzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KGxldmVsNFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGZhbGwgYmFjayB0byBmaWxlIGN0aW1lIHNpbmNlIG1heCBkZXB0aCBpcyBleGNlZWRlZFxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcImZpbGUtY3RpbWVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudXNlZEZhbGxiYWNrKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiaW5oZXJpdGFuY2UgcHJpb3JpdHkgd2l0aCBvdGhlciBzb3VyY2VzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgbGluZSBkYXRlIG92ZXIgcGFyZW50IHRhc2sgZGF0ZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcmVudFRhc2sgPSBjcmVhdGVNb2NrVGFzayhcInBhcmVudC03XCIsIFwiUGFyZW50IHRhc2tcIiwgdW5kZWZpbmVkLCB7XHJcblx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAxMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNoaWxkVGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwiY2hpbGQtN1wiLCBcIkNoaWxkIHRhc2sgMjAyNC0wMy0yMCAxMzowMFwiLCBcInBhcmVudC03XCIpO1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxMyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiICAtIFsgXSBDaGlsZCB0YXNrIDIwMjQtMDMtMjAgMTM6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0cGFyZW50VGFzayxcclxuXHRcdFx0XHRhbGxUYXNrczogW3BhcmVudFRhc2ssIGNoaWxkVGFza10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkoY2hpbGRUYXNrLCB0aW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwibGluZS1kYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAyMCkpOyAvLyBTaG91bGQgdXNlIGxpbmUgZGF0ZSwgbm90IHBhcmVudFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdXNlIHBhcmVudCB0YXNrIGRhdGUgd2hlbiBubyBsaW5lIGRhdGUgYXZhaWxhYmxlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicGFyZW50LThcIiwgXCJQYXJlbnQgdGFza1wiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAxOCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNoaWxkVGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwiY2hpbGQtOFwiLCBcIkNoaWxkIHRhc2sgMDk6MDBcIiwgXCJwYXJlbnQtOFwiKTtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoOSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9ucyBmb3IgZmFsbGJhY2sgY29tcGFyaXNvblxyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJyZWd1bGFyLW5vdGUubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIiAgLSBbIF0gQ2hpbGQgdGFzayAwOTowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInJlZ3VsYXItbm90ZS5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdFx0YWxsVGFza3M6IFtwYXJlbnRUYXNrLCBjaGlsZFRhc2tdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KGNoaWxkVGFzaywgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxOCkpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZXJyb3IgaGFuZGxpbmcgYW5kIGVkZ2UgY2FzZXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG1pc3NpbmcgcGFyZW50IHRhc2sgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNoaWxkVGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwiY2hpbGQtOVwiLCBcIk9ycGhhbmVkIGNoaWxkIHRhc2sgMTQ6MDBcIiwgXCJtaXNzaW5nLXBhcmVudFwiKTtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTQpO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBmaWxlIG9wZXJhdGlvbnMgZm9yIGZhbGxiYWNrXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCA1KS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIE9ycGhhbmVkIGNoaWxkIHRhc2sgMTQ6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0cGFyZW50VGFzazogdW5kZWZpbmVkLCAvLyBObyBwYXJlbnQgdGFza1xyXG5cdFx0XHRcdGFsbFRhc2tzOiBbY2hpbGRUYXNrXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShjaGlsZFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGZhbGwgYmFjayB0byBmaWxlIGN0aW1lXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwiZmlsZS1jdGltZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC51c2VkRmFsbGJhY2spLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgY2lyY3VsYXIgcGFyZW50IHJlZmVyZW5jZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgY2lyY3VsYXIgcmVmZXJlbmNlOiBBIC0+IEIgLT4gQVxyXG5cdFx0XHRjb25zdCB0YXNrQSA9IGNyZWF0ZU1vY2tUYXNrKFwidGFzay1hXCIsIFwiVGFzayBBIDEwOjAwXCIsIFwidGFzay1iXCIpO1xyXG5cdFx0XHRjb25zdCB0YXNrQiA9IGNyZWF0ZU1vY2tUYXNrKFwidGFzay1iXCIsIFwiVGFzayBCXCIsIFwidGFzay1hXCIsIHtcclxuXHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTApO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIFRhc2sgQSAxMDowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrOiB0YXNrQixcclxuXHRcdFx0XHRhbGxUYXNrczogW3Rhc2tBLCB0YXNrQl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBUaGlzIHNob3VsZCBub3QgY2F1c2UgaW5maW5pdGUgcmVjdXJzaW9uXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seSh0YXNrQSwgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGludmFsaWQgcGFyZW50IHRhc2sgZGF0ZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJlbnRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJwYXJlbnQtOVwiLCBcIlBhcmVudCB3aXRoIGludmFsaWQgZGF0ZVwiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRzdGFydERhdGU6IE5hTiwgLy8gSW52YWxpZCBkYXRlXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gY3JlYXRlTW9ja1Rhc2soXCJjaGlsZC0xMFwiLCBcIkNoaWxkIHRhc2sgMTY6MDBcIiwgXCJwYXJlbnQtOVwiKTtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTYpO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBmaWxlIG9wZXJhdGlvbnMgZm9yIGZhbGxiYWNrXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCA4KS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIiAgLSBbIF0gQ2hpbGQgdGFzayAxNjowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrLFxyXG5cdFx0XHRcdGFsbFRhc2tzOiBbcGFyZW50VGFzaywgY2hpbGRUYXNrXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShjaGlsZFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGZhbGwgYmFjayB0byBmaWxlIGN0aW1lIHNpbmNlIHBhcmVudCBkYXRlIGlzIGludmFsaWRcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zb3VyY2UpLnRvQmUoXCJmaWxlLWN0aW1lXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnVzZWRGYWxsYmFjaykudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcInBlcmZvcm1hbmNlIHdpdGggY29tcGxleCBoaWVyYXJjaGllc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBlZmZpY2llbnRseSBoYW5kbGUgbGFyZ2UgdGFzayBoaWVyYXJjaGllc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIGhpZXJhcmNoeSB3aXRoIG1hbnkgc2libGluZ3MgYXQgZWFjaCBsZXZlbFxyXG5cdFx0XHRjb25zdCByb290VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwicm9vdFwiLCBcIlJvb3QgdGFza1wiLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBhbGxUYXNrcyA9IFtyb290VGFza107XHJcblx0XHRcdGxldCBjdXJyZW50UGFyZW50ID0gXCJyb290XCI7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgMiBsZXZlbHMgd2l0aCAxMCB0YXNrcyBlYWNoIChzdGF5IHdpdGhpbiBtYXggZGVwdGgpXHJcblx0XHRcdGZvciAobGV0IGxldmVsID0gMTsgbGV2ZWwgPD0gMjsgbGV2ZWwrKykge1xyXG5cdFx0XHRcdGNvbnN0IGxldmVsVGFza3MgPSBbXTtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tJZCA9IGBsZXZlbC0ke2xldmVsfS10YXNrLSR7aX1gO1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrKHRhc2tJZCwgYExldmVsICR7bGV2ZWx9IFRhc2sgJHtpfWAsIGN1cnJlbnRQYXJlbnQpO1xyXG5cdFx0XHRcdFx0bGV2ZWxUYXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHRcdFx0YWxsVGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y3VycmVudFBhcmVudCA9IGxldmVsVGFza3NbMF0uaWQ7IC8vIFVzZSBmaXJzdCB0YXNrIGFzIHBhcmVudCBmb3IgbmV4dCBsZXZlbFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUZXN0IGluaGVyaXRhbmNlIGZyb20gdGhlIGRlZXBlc3QgdGFza1xyXG5cdFx0XHRjb25zdCBkZWVwZXN0VGFzayA9IGNyZWF0ZU1vY2tUYXNrKFwiZGVlcGVzdFwiLCBcIkRlZXBlc3QgdGFzayAxMjowMFwiLCBjdXJyZW50UGFyZW50KTtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTIpO1xyXG5cdFx0XHRhbGxUYXNrcy5wdXNoKGRlZXBlc3RUYXNrKTtcclxuXHJcblx0XHRcdGNvbnN0IHBhcmVudFRhc2sgPSBhbGxUYXNrcy5maW5kKHQgPT4gdC5pZCA9PT0gY3VycmVudFBhcmVudCk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9ucyBmb3IgZmFsbGJhY2sgKGluIGNhc2UgaGllcmFyY2h5IGZhaWxzKVxyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBudWxsLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiICAgICAgLSBbIF0gRGVlcGVzdCB0YXNrIDEyOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdFx0YWxsVGFza3MsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkoZGVlcGVzdFRhc2ssIHRpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IHByb2Nlc3NpbmdUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBjb21wbGV0ZSBxdWlja2x5IGV2ZW4gd2l0aCBsYXJnZSBoaWVyYXJjaHlcclxuXHRcdFx0ZXhwZWN0KHByb2Nlc3NpbmdUaW1lKS50b0JlTGVzc1RoYW4oMTAwKTsgLy8gMTAwbXMgbWF4XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwicGFyZW50LXRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDEpKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBQcm9jZXNzZWQgaGllcmFyY2h5IHdpdGggJHthbGxUYXNrcy5sZW5ndGh9IHRhc2tzIGluICR7cHJvY2Vzc2luZ1RpbWV9bXNgKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=