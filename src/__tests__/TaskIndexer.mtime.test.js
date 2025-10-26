/**
 * Tests for TaskIndexer mtime-based caching functionality
 */
import { TaskIndexer } from "../core/task-indexer";
// Mock obsidian Component class
jest.mock("obsidian", () => (Object.assign(Object.assign({}, jest.requireActual("obsidian")), { Component: class {
        constructor() {
            this.registerEvent = jest.fn();
            this.unload = jest.fn();
        }
    }, TFile: jest.fn() })));
// Mock dependencies
const mockApp = {};
const mockVault = {
    on: jest.fn().mockReturnValue({}),
    off: jest.fn(),
};
const mockMetadataCache = {};
describe("TaskIndexer mtime functionality", () => {
    let indexer;
    beforeEach(() => {
        indexer = new TaskIndexer(mockApp, mockVault, mockMetadataCache);
    });
    afterEach(() => {
        if (indexer && typeof indexer.unload === 'function') {
            indexer.unload();
        }
    });
    describe("mtime comparison", () => {
        test("should detect file changes when mtime is newer", () => {
            const filePath = "test.md";
            const oldMtime = 1000;
            const newMtime = 2000;
            // Set initial mtime
            indexer.updateFileMtime(filePath, oldMtime);
            // Check if file is changed with newer mtime
            expect(indexer.isFileChanged(filePath, newMtime)).toBe(true);
        });
        test("should not detect changes when mtime is same", () => {
            const filePath = "test.md";
            const mtime = 1000;
            // Set initial mtime
            indexer.updateFileMtime(filePath, mtime);
            // Check if file is changed with same mtime
            expect(indexer.isFileChanged(filePath, mtime)).toBe(false);
        });
        test("should detect changes for unknown files", () => {
            const filePath = "unknown.md";
            const mtime = 1000;
            // Check if unknown file is considered changed
            expect(indexer.isFileChanged(filePath, mtime)).toBe(true);
        });
    });
    describe("cache validation", () => {
        test("should have valid cache when file hasn't changed and has tasks", () => {
            const filePath = "test.md";
            const mtime = 1000;
            const tasks = [
                {
                    id: "task1",
                    content: "Test task",
                    filePath,
                    line: 1,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Test task",
                    metadata: {
                        tags: [],
                        project: undefined,
                        context: undefined,
                        priority: undefined,
                        dueDate: undefined,
                        startDate: undefined,
                        scheduledDate: undefined,
                        completedDate: undefined,
                        cancelledDate: undefined,
                        createdDate: undefined,
                        recurrence: undefined,
                        dependsOn: [],
                        onCompletion: undefined,
                        taskId: undefined,
                        children: [],
                    },
                },
            ];
            // Add tasks and set mtime
            indexer.updateIndexWithTasks(filePath, tasks, mtime);
            // Check if cache is valid
            expect(indexer.hasValidCache(filePath, mtime)).toBe(true);
        });
        test("should not have valid cache when file has changed", () => {
            const filePath = "test.md";
            const oldMtime = 1000;
            const newMtime = 2000;
            const tasks = [];
            // Add tasks with old mtime
            indexer.updateIndexWithTasks(filePath, tasks, oldMtime);
            // Check if cache is invalid with new mtime
            expect(indexer.hasValidCache(filePath, newMtime)).toBe(false);
        });
        test("should not have valid cache when no tasks exist", () => {
            const filePath = "test.md";
            const mtime = 1000;
            // Don't add any tasks, just set mtime
            indexer.updateFileMtime(filePath, mtime);
            // Check if cache is invalid when no tasks exist
            expect(indexer.hasValidCache(filePath, mtime)).toBe(false);
        });
    });
    describe("cache cleanup", () => {
        test("should clean up file cache properly", () => {
            const filePath = "test.md";
            const mtime = 1000;
            const tasks = [];
            // Add tasks and set mtime
            indexer.updateIndexWithTasks(filePath, tasks, mtime);
            // Verify cache exists
            expect(indexer.getFileLastMtime(filePath)).toBe(mtime);
            // Clean up cache
            indexer.cleanupFileCache(filePath);
            // Verify cache is cleaned
            expect(indexer.getFileLastMtime(filePath)).toBeUndefined();
        });
    });
    describe("cache consistency", () => {
        test("should validate and fix cache consistency", () => {
            const filePath = "test.md";
            const mtime = 1000;
            // Manually add mtime without tasks (inconsistent state)
            indexer.updateFileMtime(filePath, mtime);
            // Validate consistency (should clean up orphaned mtime)
            indexer.validateCacheConsistency();
            // Verify orphaned mtime is cleaned up
            expect(indexer.getFileLastMtime(filePath)).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0luZGV4ZXIubXRpbWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tJbmRleGVyLm10aW1lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHbkQsZ0NBQWdDO0FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLGlDQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUNqQyxTQUFTLEVBQUU7UUFBQTtZQUNWLGtCQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFCLFdBQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEIsQ0FBQztLQUFBLEVBQ0QsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFDZixDQUFDLENBQUM7QUFFSixvQkFBb0I7QUFDcEIsTUFBTSxPQUFPLEdBQUcsRUFBUyxDQUFDO0FBQzFCLE1BQU0sU0FBUyxHQUFHO0lBQ2pCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztJQUNqQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNQLENBQUM7QUFDVCxNQUFNLGlCQUFpQixHQUFHLEVBQVMsQ0FBQztBQUVwQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQ2hELElBQUksT0FBb0IsQ0FBQztJQUV6QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNsRSxDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLE9BQU8sSUFBSSxPQUFPLE9BQU8sQ0FBQyxNQUFNLEtBQUssVUFB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QUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFckQsc0JBQXNCO1lBQ3RCLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkQsaUJBQWlCO1lBQ2pCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVuQywwQkFBMEI7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7WUFDdEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQztZQUVuQix3REFBd0Q7WUFDeEQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFekMsd0RBQXdEO1lBQ3hELE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBRW5DLHNDQUFzQztZQUN0QyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3RzIGZvciBUYXNrSW5kZXhlciBtdGltZS1iYXNlZCBjYWNoaW5nIGZ1bmN0aW9uYWxpdHlcclxuICovXHJcblxyXG5pbXBvcnQgeyBUYXNrSW5kZXhlciB9IGZyb20gXCIuLi9jb3JlL3Rhc2staW5kZXhlclwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8vIE1vY2sgb2JzaWRpYW4gQ29tcG9uZW50IGNsYXNzXHJcbmplc3QubW9jayhcIm9ic2lkaWFuXCIsICgpID0+ICh7XHJcblx0Li4uamVzdC5yZXF1aXJlQWN0dWFsKFwib2JzaWRpYW5cIiksXHJcblx0Q29tcG9uZW50OiBjbGFzcyB7XHJcblx0XHRyZWdpc3RlckV2ZW50ID0gamVzdC5mbigpO1xyXG5cdFx0dW5sb2FkID0gamVzdC5mbigpO1xyXG5cdH0sXHJcblx0VEZpbGU6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuLy8gTW9jayBkZXBlbmRlbmNpZXNcclxuY29uc3QgbW9ja0FwcCA9IHt9IGFzIGFueTtcclxuY29uc3QgbW9ja1ZhdWx0ID0ge1xyXG5cdG9uOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKHt9KSxcclxuXHRvZmY6IGplc3QuZm4oKSxcclxufSBhcyBhbnk7XHJcbmNvbnN0IG1vY2tNZXRhZGF0YUNhY2hlID0ge30gYXMgYW55O1xyXG5cclxuZGVzY3JpYmUoXCJUYXNrSW5kZXhlciBtdGltZSBmdW5jdGlvbmFsaXR5XCIsICgpID0+IHtcclxuXHRsZXQgaW5kZXhlcjogVGFza0luZGV4ZXI7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0aW5kZXhlciA9IG5ldyBUYXNrSW5kZXhlcihtb2NrQXBwLCBtb2NrVmF1bHQsIG1vY2tNZXRhZGF0YUNhY2hlKTtcclxuXHR9KTtcclxuXHJcblx0YWZ0ZXJFYWNoKCgpID0+IHtcclxuXHRcdGlmIChpbmRleGVyICYmIHR5cGVvZiBpbmRleGVyLnVubG9hZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRpbmRleGVyLnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIm10aW1lIGNvbXBhcmlzb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBkZXRlY3QgZmlsZSBjaGFuZ2VzIHdoZW4gbXRpbWUgaXMgbmV3ZXJcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBvbGRNdGltZSA9IDEwMDA7XHJcblx0XHRcdGNvbnN0IG5ld010aW1lID0gMjAwMDtcclxuXHJcblx0XHRcdC8vIFNldCBpbml0aWFsIG10aW1lXHJcblx0XHRcdGluZGV4ZXIudXBkYXRlRmlsZU10aW1lKGZpbGVQYXRoLCBvbGRNdGltZSk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBmaWxlIGlzIGNoYW5nZWQgd2l0aCBuZXdlciBtdGltZVxyXG5cdFx0XHRleHBlY3QoaW5kZXhlci5pc0ZpbGVDaGFuZ2VkKGZpbGVQYXRoLCBuZXdNdGltZSkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBkZXRlY3QgY2hhbmdlcyB3aGVuIG10aW1lIGlzIHNhbWVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IDEwMDA7XHJcblxyXG5cdFx0XHQvLyBTZXQgaW5pdGlhbCBtdGltZVxyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUZpbGVNdGltZShmaWxlUGF0aCwgbXRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgZmlsZSBpcyBjaGFuZ2VkIHdpdGggc2FtZSBtdGltZVxyXG5cdFx0XHRleHBlY3QoaW5kZXhlci5pc0ZpbGVDaGFuZ2VkKGZpbGVQYXRoLCBtdGltZSkpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBkZXRlY3QgY2hhbmdlcyBmb3IgdW5rbm93biBmaWxlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJ1bmtub3duLm1kXCI7XHJcblx0XHRcdGNvbnN0IG10aW1lID0gMTAwMDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHVua25vd24gZmlsZSBpcyBjb25zaWRlcmVkIGNoYW5nZWRcclxuXHRcdFx0ZXhwZWN0KGluZGV4ZXIuaXNGaWxlQ2hhbmdlZChmaWxlUGF0aCwgbXRpbWUpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiY2FjaGUgdmFsaWRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhdmUgdmFsaWQgY2FjaGUgd2hlbiBmaWxlIGhhc24ndCBjaGFuZ2VkIGFuZCBoYXMgdGFza3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IDEwMDA7XHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwidGFzazFcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdFx0cHJvamVjdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjb250ZXh0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjYW5jZWxsZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGNyZWF0ZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHJlY3VycmVuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0ZGVwZW5kc09uOiBbXSxcclxuXHRcdFx0XHRcdFx0b25Db21wbGV0aW9uOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHRhc2tJZDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBBZGQgdGFza3MgYW5kIHNldCBtdGltZVxyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUluZGV4V2l0aFRhc2tzKGZpbGVQYXRoLCB0YXNrcywgbXRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2FjaGUgaXMgdmFsaWRcclxuXHRcdFx0ZXhwZWN0KGluZGV4ZXIuaGFzVmFsaWRDYWNoZShmaWxlUGF0aCwgbXRpbWUpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBub3QgaGF2ZSB2YWxpZCBjYWNoZSB3aGVuIGZpbGUgaGFzIGNoYW5nZWRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBvbGRNdGltZSA9IDEwMDA7XHJcblx0XHRcdGNvbnN0IG5ld010aW1lID0gMjAwMDtcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHRhc2tzIHdpdGggb2xkIG10aW1lXHJcblx0XHRcdGluZGV4ZXIudXBkYXRlSW5kZXhXaXRoVGFza3MoZmlsZVBhdGgsIHRhc2tzLCBvbGRNdGltZSk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBjYWNoZSBpcyBpbnZhbGlkIHdpdGggbmV3IG10aW1lXHJcblx0XHRcdGV4cGVjdChpbmRleGVyLmhhc1ZhbGlkQ2FjaGUoZmlsZVBhdGgsIG5ld010aW1lKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBoYXZlIHZhbGlkIGNhY2hlIHdoZW4gbm8gdGFza3MgZXhpc3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IDEwMDA7XHJcblxyXG5cdFx0XHQvLyBEb24ndCBhZGQgYW55IHRhc2tzLCBqdXN0IHNldCBtdGltZVxyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUZpbGVNdGltZShmaWxlUGF0aCwgbXRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2FjaGUgaXMgaW52YWxpZCB3aGVuIG5vIHRhc2tzIGV4aXN0XHJcblx0XHRcdGV4cGVjdChpbmRleGVyLmhhc1ZhbGlkQ2FjaGUoZmlsZVBhdGgsIG10aW1lKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJjYWNoZSBjbGVhbnVwXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgY2xlYW4gdXAgZmlsZSBjYWNoZSBwcm9wZXJseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJ0ZXN0Lm1kXCI7XHJcblx0XHRcdGNvbnN0IG10aW1lID0gMTAwMDtcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHRhc2tzIGFuZCBzZXQgbXRpbWVcclxuXHRcdFx0aW5kZXhlci51cGRhdGVJbmRleFdpdGhUYXNrcyhmaWxlUGF0aCwgdGFza3MsIG10aW1lKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBjYWNoZSBleGlzdHNcclxuXHRcdFx0ZXhwZWN0KGluZGV4ZXIuZ2V0RmlsZUxhc3RNdGltZShmaWxlUGF0aCkpLnRvQmUobXRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYW4gdXAgY2FjaGVcclxuXHRcdFx0aW5kZXhlci5jbGVhbnVwRmlsZUNhY2hlKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBjYWNoZSBpcyBjbGVhbmVkXHJcblx0XHRcdGV4cGVjdChpbmRleGVyLmdldEZpbGVMYXN0TXRpbWUoZmlsZVBhdGgpKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJjYWNoZSBjb25zaXN0ZW5jeVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHZhbGlkYXRlIGFuZCBmaXggY2FjaGUgY29uc2lzdGVuY3lcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IDEwMDA7XHJcblxyXG5cdFx0XHQvLyBNYW51YWxseSBhZGQgbXRpbWUgd2l0aG91dCB0YXNrcyAoaW5jb25zaXN0ZW50IHN0YXRlKVxyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUZpbGVNdGltZShmaWxlUGF0aCwgbXRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gVmFsaWRhdGUgY29uc2lzdGVuY3kgKHNob3VsZCBjbGVhbiB1cCBvcnBoYW5lZCBtdGltZSlcclxuXHRcdFx0aW5kZXhlci52YWxpZGF0ZUNhY2hlQ29uc2lzdGVuY3koKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBvcnBoYW5lZCBtdGltZSBpcyBjbGVhbmVkIHVwXHJcblx0XHRcdGV4cGVjdChpbmRleGVyLmdldEZpbGVMYXN0TXRpbWUoZmlsZVBhdGgpKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==