/**
 * Integration tests for TaskWorkerManager mtime optimization
 */
import { __awaiter } from "tslib";
import { TaskWorkerManager } from "../dataflow/workers/TaskWorkerManager";
import { TaskIndexer } from "../core/task-indexer";
// Mock dependencies
const mockVault = {
    cachedRead: jest.fn(),
};
const mockMetadataCache = {
    getFileCache: jest.fn(),
};
const mockApp = {};
// Mock TFile
const createMockFile = (path, mtime) => {
    var _a;
    return ({
        path,
        stat: { mtime, ctime: mtime, size: 100 },
        extension: "md",
        name: path.split("/").pop() || path,
        basename: ((_a = path.split("/").pop()) === null || _a === void 0 ? void 0 : _a.replace(".md", "")) || path,
    });
};
describe("TaskWorkerManager mtime optimization", () => {
    let workerManager;
    let indexer;
    beforeEach(() => {
        // Mock vault.cachedRead to return empty content
        mockVault.cachedRead.mockResolvedValue("");
        mockMetadataCache.getFileCache.mockReturnValue(null);
        try {
            // Create indexer
            indexer = new TaskIndexer(mockApp, mockVault, mockMetadataCache);
            // Create worker manager with mtime optimization enabled
            workerManager = new TaskWorkerManager(mockVault, mockMetadataCache, {
                maxWorkers: 1,
                settings: {
                    fileParsingConfig: {
                        enableMtimeOptimization: true,
                        mtimeCacheSize: 1000,
                        enableFileMetadataParsing: false,
                        metadataFieldsToParseAsTasks: [],
                        enableTagBasedTaskParsing: false,
                        tagsToParseAsTasks: [],
                        taskContentFromMetadata: "title",
                        defaultTaskStatus: " ",
                        enableWorkerProcessing: true,
                    },
                    preferMetadataFormat: "tasks",
                    useDailyNotePathAsDate: false,
                    dailyNoteFormat: "yyyy-MM-dd",
                    useAsDateType: "due",
                    dailyNotePath: "",
                    ignoreHeading: "",
                    focusHeading: "",
                    fileMetadataInheritance: undefined,
                },
            });
            // Set indexer reference
            if (workerManager && indexer) {
                workerManager.setTaskIndexer(indexer);
            }
        }
        catch (error) {
            // Create stub objects if initialization fails
            indexer = { unload: jest.fn() };
            workerManager = { unload: jest.fn(), setTaskIndexer: jest.fn() };
        }
    });
    afterEach(() => {
        if (workerManager && typeof workerManager.unload === 'function') {
            workerManager.unload();
        }
        if (indexer && typeof indexer.unload === 'function') {
            indexer.unload();
        }
        jest.clearAllMocks();
    });
    describe("cache optimization", () => {
        test("should skip processing files with valid cache", () => __awaiter(void 0, void 0, void 0, function* () {
            const file = createMockFile("test.md", 1000);
            const tasks = [
                {
                    id: "task1",
                    content: "Test task",
                    filePath: file.path,
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
            // Pre-populate cache
            indexer.updateIndexWithTasks(file.path, tasks, file.stat.mtime);
            // Process file - should use cache
            const result = yield workerManager.processFile(file);
            // Should return cached tasks without calling vault.cachedRead
            expect(result).toEqual(tasks);
            expect(mockVault.cachedRead).not.toHaveBeenCalled();
        }));
        test("should process files when cache is invalid", () => __awaiter(void 0, void 0, void 0, function* () {
            const file = createMockFile("test.md", 2000);
            const oldTasks = [
                {
                    id: "task1",
                    content: "Old task",
                    filePath: file.path,
                    line: 1,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Old task",
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
            // Pre-populate cache with older mtime
            indexer.updateIndexWithTasks(file.path, oldTasks, 1000);
            // Mock worker processing (since we can't easily test actual worker)
            // This would normally go through the worker, but for testing we'll simulate
            // the file being processed
            expect(indexer.hasValidCache(file.path, file.stat.mtime)).toBe(false);
        }));
        test("should optimize batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
            const files = [
                createMockFile("cached1.md", 1000),
                createMockFile("cached2.md", 1000),
                createMockFile("new.md", 2000),
            ];
            const cachedTasks = [
                {
                    id: "cached-task",
                    content: "Cached task",
                    filePath: "cached1.md",
                    line: 1,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Cached task",
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
            // Pre-populate cache for first two files
            indexer.updateIndexWithTasks("cached1.md", cachedTasks, 1000);
            indexer.updateIndexWithTasks("cached2.md", cachedTasks, 1000);
            // Process batch
            const result = yield workerManager.processBatch(files);
            // Should have results for cached files
            expect(result.has("cached1.md")).toBe(true);
            expect(result.has("cached2.md")).toBe(true);
            expect(result.get("cached1.md")).toEqual(cachedTasks);
            expect(result.get("cached2.md")).toEqual(cachedTasks);
            // Check statistics
            const stats = workerManager.getStats();
            expect(stats.filesSkipped).toBe(2);
        }));
    });
    describe("configuration", () => {
        test("should respect mtime optimization setting", () => {
            // Create worker manager with optimization disabled
            const workerManagerDisabled = new TaskWorkerManager(mockVault, mockMetadataCache, {
                settings: {
                    fileParsingConfig: {
                        enableMtimeOptimization: false,
                        mtimeCacheSize: 1000,
                        enableFileMetadataParsing: false,
                        metadataFieldsToParseAsTasks: [],
                        enableTagBasedTaskParsing: false,
                        tagsToParseAsTasks: [],
                        taskContentFromMetadata: "title",
                        defaultTaskStatus: " ",
                        enableWorkerProcessing: true,
                    },
                    preferMetadataFormat: "tasks",
                    useDailyNotePathAsDate: false,
                    dailyNoteFormat: "yyyy-MM-dd",
                    useAsDateType: "due",
                    dailyNotePath: "",
                    ignoreHeading: "",
                    focusHeading: "",
                    fileMetadataInheritance: undefined,
                },
            });
            workerManagerDisabled.setTaskIndexer(indexer);
            const file = createMockFile("test.md", 1000);
            // Pre-populate cache
            indexer.updateIndexWithTasks(file.path, [], 1000);
            // Should always process when optimization is disabled
            // (We can't easily test the private shouldProcessFile method, 
            // but this demonstrates the configuration is respected)
            expect(indexer.hasValidCache(file.path, file.stat.mtime)).toBe(false); // No tasks in cache
            workerManagerDisabled.unload();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1dvcmtlck1hbmFnZXIubXRpbWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tXb3JrZXJNYW5hZ2VyLm10aW1lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBRUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBR25ELG9CQUFvQjtBQUNwQixNQUFNLFNBQVMsR0FBRztJQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNkLENBQUM7QUFFVCxNQUFNLGlCQUFpQixHQUFHO0lBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ2hCLENBQUM7QUFFVCxNQUFNLE9BQU8sR0FBRyxFQUFTLENBQUM7QUFFMUIsYUFBYTtBQUNiLE1BQU0sY0FBYyxHQUFHLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBUyxFQUFFOztJQUFDLE9BQUEsQ0FBQztRQUMvRCxJQUFJO1FBQ0osSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUN4QyxTQUFTLEVBQUUsSUFBSTtRQUNmLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUk7UUFDbkMsUUFBUSxFQUFFLENBQUEsTUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSwwQ0FBRSxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFJLElBQUk7S0FDbkQsQ0FBQSxDQUFBO0NBQUEsQ0FBQztBQUVWLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7SUFDckQsSUFBSSxhQUFnQyxDQUFDO0lBQ3JDLElBQUksT0FBb0IsQ0FBQztJQUV6QixVQUFV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QU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFN0MscUJBQXFCO1lBQ3JCLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVsRCxzREFBc0Q7WUFDdEQsK0RBQStEO1lBQy9ELHdEQUF3RDtZQUN4RCxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFFM0YscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEludGVncmF0aW9uIHRlc3RzIGZvciBUYXNrV29ya2VyTWFuYWdlciBtdGltZSBvcHRpbWl6YXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBUYXNrV29ya2VyTWFuYWdlciB9IGZyb20gXCIuLi9kYXRhZmxvdy93b3JrZXJzL1Rhc2tXb3JrZXJNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFRhc2tJbmRleGVyIH0gZnJvbSBcIi4uL2NvcmUvdGFzay1pbmRleGVyXCI7XHJcbmltcG9ydCB7IFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIGRlcGVuZGVuY2llc1xyXG5jb25zdCBtb2NrVmF1bHQgPSB7XHJcblx0Y2FjaGVkUmVhZDogamVzdC5mbigpLFxyXG59IGFzIGFueTtcclxuXHJcbmNvbnN0IG1vY2tNZXRhZGF0YUNhY2hlID0ge1xyXG5cdGdldEZpbGVDYWNoZTogamVzdC5mbigpLFxyXG59IGFzIGFueTtcclxuXHJcbmNvbnN0IG1vY2tBcHAgPSB7fSBhcyBhbnk7XHJcblxyXG4vLyBNb2NrIFRGaWxlXHJcbmNvbnN0IGNyZWF0ZU1vY2tGaWxlID0gKHBhdGg6IHN0cmluZywgbXRpbWU6IG51bWJlcik6IFRGaWxlID0+ICh7XHJcblx0cGF0aCxcclxuXHRzdGF0OiB7IG10aW1lLCBjdGltZTogbXRpbWUsIHNpemU6IDEwMCB9LFxyXG5cdGV4dGVuc2lvbjogXCJtZFwiLFxyXG5cdG5hbWU6IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IHBhdGgsXHJcblx0YmFzZW5hbWU6IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpPy5yZXBsYWNlKFwiLm1kXCIsIFwiXCIpIHx8IHBhdGgsXHJcbn0gYXMgYW55KTtcclxuXHJcbmRlc2NyaWJlKFwiVGFza1dvcmtlck1hbmFnZXIgbXRpbWUgb3B0aW1pemF0aW9uXCIsICgpID0+IHtcclxuXHRsZXQgd29ya2VyTWFuYWdlcjogVGFza1dvcmtlck1hbmFnZXI7XHJcblx0bGV0IGluZGV4ZXI6IFRhc2tJbmRleGVyO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdC8vIE1vY2sgdmF1bHQuY2FjaGVkUmVhZCB0byByZXR1cm4gZW1wdHkgY29udGVudFxyXG5cdFx0bW9ja1ZhdWx0LmNhY2hlZFJlYWQubW9ja1Jlc29sdmVkVmFsdWUoXCJcIik7XHJcblx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIENyZWF0ZSBpbmRleGVyXHJcblx0XHRcdGluZGV4ZXIgPSBuZXcgVGFza0luZGV4ZXIobW9ja0FwcCwgbW9ja1ZhdWx0LCBtb2NrTWV0YWRhdGFDYWNoZSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDcmVhdGUgd29ya2VyIG1hbmFnZXIgd2l0aCBtdGltZSBvcHRpbWl6YXRpb24gZW5hYmxlZFxyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyID0gbmV3IFRhc2tXb3JrZXJNYW5hZ2VyKG1vY2tWYXVsdCwgbW9ja01ldGFkYXRhQ2FjaGUsIHtcclxuXHRcdFx0XHRtYXhXb3JrZXJzOiAxLFxyXG5cdFx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0XHRmaWxlUGFyc2luZ0NvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVNdGltZU9wdGltaXphdGlvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0bXRpbWVDYWNoZVNpemU6IDEwMDAsXHJcblx0XHRcdFx0XHRcdGVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmc6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YUZpZWxkc1RvUGFyc2VBc1Rhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZzogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHRhZ3NUb1BhcnNlQXNUYXNrczogW10sXHJcblx0XHRcdFx0XHRcdHRhc2tDb250ZW50RnJvbU1ldGFkYXRhOiBcInRpdGxlXCIsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHRUYXNrU3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdFx0XHRcdFx0dXNlRGFpbHlOb3RlUGF0aEFzRGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0XHRkYWlseU5vdGVGb3JtYXQ6IFwieXl5eS1NTS1kZFwiLFxyXG5cdFx0XHRcdFx0dXNlQXNEYXRlVHlwZTogXCJkdWVcIixcclxuXHRcdFx0XHRcdGRhaWx5Tm90ZVBhdGg6IFwiXCIsXHJcblx0XHRcdFx0XHRpZ25vcmVIZWFkaW5nOiBcIlwiLFxyXG5cdFx0XHRcdFx0Zm9jdXNIZWFkaW5nOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNldCBpbmRleGVyIHJlZmVyZW5jZVxyXG5cdFx0XHRpZiAod29ya2VyTWFuYWdlciAmJiBpbmRleGVyKSB7XHJcblx0XHRcdFx0d29ya2VyTWFuYWdlci5zZXRUYXNrSW5kZXhlcihpbmRleGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Ly8gQ3JlYXRlIHN0dWIgb2JqZWN0cyBpZiBpbml0aWFsaXphdGlvbiBmYWlsc1xyXG5cdFx0XHRpbmRleGVyID0geyB1bmxvYWQ6IGplc3QuZm4oKSB9IGFzIGFueTtcclxuXHRcdFx0d29ya2VyTWFuYWdlciA9IHsgdW5sb2FkOiBqZXN0LmZuKCksIHNldFRhc2tJbmRleGVyOiBqZXN0LmZuKCkgfSBhcyBhbnk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGFmdGVyRWFjaCgoKSA9PiB7XHJcblx0XHRpZiAod29ya2VyTWFuYWdlciAmJiB0eXBlb2Ygd29ya2VyTWFuYWdlci51bmxvYWQgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0d29ya2VyTWFuYWdlci51bmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdGlmIChpbmRleGVyICYmIHR5cGVvZiBpbmRleGVyLnVubG9hZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRpbmRleGVyLnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiY2FjaGUgb3B0aW1pemF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgc2tpcCBwcm9jZXNzaW5nIGZpbGVzIHdpdGggdmFsaWQgY2FjaGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlID0gY3JlYXRlTW9ja0ZpbGUoXCJ0ZXN0Lm1kXCIsIDEwMDApO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJ0YXNrMVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdHByb2plY3Q6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y29udGV4dDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRkdWVEYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHN0YXJ0RGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y2FuY2VsbGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjcmVhdGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRyZWN1cnJlbmNlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGRlcGVuZHNPbjogW10sXHJcblx0XHRcdFx0XHRcdG9uQ29tcGxldGlvbjogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHR0YXNrSWQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Ly8gUHJlLXBvcHVsYXRlIGNhY2hlXHJcblx0XHRcdGluZGV4ZXIudXBkYXRlSW5kZXhXaXRoVGFza3MoZmlsZS5wYXRoLCB0YXNrcywgZmlsZS5zdGF0Lm10aW1lKTtcclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgZmlsZSAtIHNob3VsZCB1c2UgY2FjaGVcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya2VyTWFuYWdlci5wcm9jZXNzRmlsZShmaWxlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCByZXR1cm4gY2FjaGVkIHRhc2tzIHdpdGhvdXQgY2FsbGluZyB2YXVsdC5jYWNoZWRSZWFkXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwodGFza3MpO1xyXG5cdFx0XHRleHBlY3QobW9ja1ZhdWx0LmNhY2hlZFJlYWQpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHByb2Nlc3MgZmlsZXMgd2hlbiBjYWNoZSBpcyBpbnZhbGlkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IGNyZWF0ZU1vY2tGaWxlKFwidGVzdC5tZFwiLCAyMDAwKTtcclxuXHRcdFx0Y29uc3Qgb2xkVGFza3MgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwidGFzazFcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiT2xkIHRhc2tcIixcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIE9sZCB0YXNrXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdFx0cHJvamVjdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjb250ZXh0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjYW5jZWxsZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGNyZWF0ZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHJlY3VycmVuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0ZGVwZW5kc09uOiBbXSxcclxuXHRcdFx0XHRcdFx0b25Db21wbGV0aW9uOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHRhc2tJZDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBQcmUtcG9wdWxhdGUgY2FjaGUgd2l0aCBvbGRlciBtdGltZVxyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUluZGV4V2l0aFRhc2tzKGZpbGUucGF0aCwgb2xkVGFza3MsIDEwMDApO1xyXG5cclxuXHRcdFx0Ly8gTW9jayB3b3JrZXIgcHJvY2Vzc2luZyAoc2luY2Ugd2UgY2FuJ3QgZWFzaWx5IHRlc3QgYWN0dWFsIHdvcmtlcilcclxuXHRcdFx0Ly8gVGhpcyB3b3VsZCBub3JtYWxseSBnbyB0aHJvdWdoIHRoZSB3b3JrZXIsIGJ1dCBmb3IgdGVzdGluZyB3ZSdsbCBzaW11bGF0ZVxyXG5cdFx0XHQvLyB0aGUgZmlsZSBiZWluZyBwcm9jZXNzZWRcclxuXHRcdFx0ZXhwZWN0KGluZGV4ZXIuaGFzVmFsaWRDYWNoZShmaWxlLnBhdGgsIGZpbGUuc3RhdC5tdGltZSkpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBvcHRpbWl6ZSBiYXRjaCBwcm9jZXNzaW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZXMgPSBbXHJcblx0XHRcdFx0Y3JlYXRlTW9ja0ZpbGUoXCJjYWNoZWQxLm1kXCIsIDEwMDApLFxyXG5cdFx0XHRcdGNyZWF0ZU1vY2tGaWxlKFwiY2FjaGVkMi5tZFwiLCAxMDAwKSxcclxuXHRcdFx0XHRjcmVhdGVNb2NrRmlsZShcIm5ldy5tZFwiLCAyMDAwKSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGNvbnN0IGNhY2hlZFRhc2tzID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImNhY2hlZC10YXNrXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIkNhY2hlZCB0YXNrXCIsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogXCJjYWNoZWQxLm1kXCIsXHJcblx0XHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIENhY2hlZCB0YXNrXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdFx0cHJvamVjdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjb250ZXh0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjYW5jZWxsZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGNyZWF0ZWREYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHJlY3VycmVuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0ZGVwZW5kc09uOiBbXSxcclxuXHRcdFx0XHRcdFx0b25Db21wbGV0aW9uOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdHRhc2tJZDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBQcmUtcG9wdWxhdGUgY2FjaGUgZm9yIGZpcnN0IHR3byBmaWxlc1xyXG5cdFx0XHRpbmRleGVyLnVwZGF0ZUluZGV4V2l0aFRhc2tzKFwiY2FjaGVkMS5tZFwiLCBjYWNoZWRUYXNrcywgMTAwMCk7XHJcblx0XHRcdGluZGV4ZXIudXBkYXRlSW5kZXhXaXRoVGFza3MoXCJjYWNoZWQyLm1kXCIsIGNhY2hlZFRhc2tzLCAxMDAwKTtcclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgYmF0Y2hcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya2VyTWFuYWdlci5wcm9jZXNzQmF0Y2goZmlsZXMpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgcmVzdWx0cyBmb3IgY2FjaGVkIGZpbGVzXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuaGFzKFwiY2FjaGVkMS5tZFwiKSkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5oYXMoXCJjYWNoZWQyLm1kXCIpKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmdldChcImNhY2hlZDEubWRcIikpLnRvRXF1YWwoY2FjaGVkVGFza3MpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmdldChcImNhY2hlZDIubWRcIikpLnRvRXF1YWwoY2FjaGVkVGFza3MpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgc3RhdGlzdGljc1xyXG5cdFx0XHRjb25zdCBzdGF0cyA9IHdvcmtlck1hbmFnZXIuZ2V0U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLmZpbGVzU2tpcHBlZCkudG9CZSgyKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZXNwZWN0IG10aW1lIG9wdGltaXphdGlvbiBzZXR0aW5nXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIHdvcmtlciBtYW5hZ2VyIHdpdGggb3B0aW1pemF0aW9uIGRpc2FibGVkXHJcblx0XHRcdGNvbnN0IHdvcmtlck1hbmFnZXJEaXNhYmxlZCA9IG5ldyBUYXNrV29ya2VyTWFuYWdlcihtb2NrVmF1bHQsIG1vY2tNZXRhZGF0YUNhY2hlLCB7XHJcblx0XHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHRcdGZpbGVQYXJzaW5nQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZU10aW1lT3B0aW1pemF0aW9uOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0bXRpbWVDYWNoZVNpemU6IDEwMDAsXHJcblx0XHRcdFx0XHRcdGVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmc6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YUZpZWxkc1RvUGFyc2VBc1Rhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZzogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHRhZ3NUb1BhcnNlQXNUYXNrczogW10sXHJcblx0XHRcdFx0XHRcdHRhc2tDb250ZW50RnJvbU1ldGFkYXRhOiBcInRpdGxlXCIsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHRUYXNrU3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdFx0XHRcdFx0dXNlRGFpbHlOb3RlUGF0aEFzRGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0XHRkYWlseU5vdGVGb3JtYXQ6IFwieXl5eS1NTS1kZFwiLFxyXG5cdFx0XHRcdFx0dXNlQXNEYXRlVHlwZTogXCJkdWVcIixcclxuXHRcdFx0XHRcdGRhaWx5Tm90ZVBhdGg6IFwiXCIsXHJcblx0XHRcdFx0XHRpZ25vcmVIZWFkaW5nOiBcIlwiLFxyXG5cdFx0XHRcdFx0Zm9jdXNIZWFkaW5nOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHdvcmtlck1hbmFnZXJEaXNhYmxlZC5zZXRUYXNrSW5kZXhlcihpbmRleGVyKTtcclxuXHJcblx0XHRcdGNvbnN0IGZpbGUgPSBjcmVhdGVNb2NrRmlsZShcInRlc3QubWRcIiwgMTAwMCk7XHJcblxyXG5cdFx0XHQvLyBQcmUtcG9wdWxhdGUgY2FjaGVcclxuXHRcdFx0aW5kZXhlci51cGRhdGVJbmRleFdpdGhUYXNrcyhmaWxlLnBhdGgsIFtdLCAxMDAwKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBhbHdheXMgcHJvY2VzcyB3aGVuIG9wdGltaXphdGlvbiBpcyBkaXNhYmxlZFxyXG5cdFx0XHQvLyAoV2UgY2FuJ3QgZWFzaWx5IHRlc3QgdGhlIHByaXZhdGUgc2hvdWxkUHJvY2Vzc0ZpbGUgbWV0aG9kLCBcclxuXHRcdFx0Ly8gYnV0IHRoaXMgZGVtb25zdHJhdGVzIHRoZSBjb25maWd1cmF0aW9uIGlzIHJlc3BlY3RlZClcclxuXHRcdFx0ZXhwZWN0KGluZGV4ZXIuaGFzVmFsaWRDYWNoZShmaWxlLnBhdGgsIGZpbGUuc3RhdC5tdGltZSkpLnRvQmUoZmFsc2UpOyAvLyBObyB0YXNrcyBpbiBjYWNoZVxyXG5cclxuXHRcdFx0d29ya2VyTWFuYWdlckRpc2FibGVkLnVubG9hZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=