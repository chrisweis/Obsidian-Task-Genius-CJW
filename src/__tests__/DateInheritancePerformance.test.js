/**
 * Performance tests for DateInheritanceAugmentor
 * Tests batch processing and caching efficiency for large task sets
 */
import { __awaiter } from "tslib";
import { DateInheritanceAugmentor } from "../dataflow/augment/DateInheritanceAugmentor";
// Mock Obsidian modules
jest.mock("obsidian", () => ({
    App: jest.fn(),
    TFile: jest.fn(),
    Vault: jest.fn(),
    MetadataCache: jest.fn(),
}));
describe("DateInheritanceAugmentor Performance", () => {
    let augmentor;
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
        augmentor = new DateInheritanceAugmentor(mockApp, mockVault, mockMetadataCache);
    });
    afterEach(() => {
        jest.clearAllMocks();
        augmentor.clearCache();
    });
    /**
     * Create a mock task with time components for testing
     */
    function createMockTaskWithTime(id, line, timeComponent, hasDate = false) {
        const metadata = {
            tags: [],
            children: [],
        };
        if (timeComponent) {
            metadata.timeComponents = {
                startTime: timeComponent,
            };
        }
        if (hasDate) {
            metadata.startDate = new Date(2024, 2, 15).getTime();
        }
        return {
            id,
            content: `Task ${id} 12:00～13:00`,
            filePath: "test.md",
            line,
            completed: false,
            status: "todo",
            originalMarkdown: `- [ ] Task ${id} 12:00～13:00`,
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
            isRange: true,
            rangePartner: {
                hour: hour + 1,
                minute: 0,
                originalText: `${hour + 1}:00`,
                isRange: true,
            },
        };
    }
    describe("batch processing performance", () => {
        it("should efficiently process large numbers of tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "2024-03-15.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 15).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            // Create a large number of tasks with time-only expressions
            const taskCount = 1000;
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const timeComponent = createTimeComponent(9 + (i % 8)); // Vary times from 9:00 to 16:00
                const task = createMockTaskWithTime(`task-${i}`, i, timeComponent, false);
                tasks.push(task);
            }
            const startTime = Date.now();
            // Process tasks in batch
            const result = yield augmentor.augmentTasksWithDateInheritance(tasks, "2024-03-15.md");
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            // Verify results
            expect(result).toHaveLength(taskCount);
            expect(result.every(task => {
                const metadata = task.metadata;
                return metadata.startDate !== undefined;
            })).toBe(true);
            // Performance assertions
            expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
            console.log(`Processed ${taskCount} tasks in ${processingTime}ms (${(processingTime / taskCount).toFixed(2)}ms per task)`);
            // Verify caching is working (file operations should be minimal)
            expect(mockVault.adapter.stat).toHaveBeenCalledTimes(1); // Only called once due to caching
        }));
        it("should handle mixed tasks efficiently (some with dates, some without)", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "mixed-tasks.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 10).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: { date: "2024-03-12" },
            });
            const taskCount = 500;
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const timeComponent = createTimeComponent(10 + (i % 6));
                const hasDate = i % 3 === 0; // Every third task has a date
                const task = createMockTaskWithTime(`mixed-${i}`, i, timeComponent, hasDate);
                tasks.push(task);
            }
            const startTime = Date.now();
            const result = yield augmentor.augmentTasksWithDateInheritance(tasks, "mixed-tasks.md");
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            // Verify results
            expect(result).toHaveLength(taskCount);
            // Tasks with existing dates should be unchanged
            const tasksWithOriginalDates = result.filter((_, i) => i % 3 === 0);
            expect(tasksWithOriginalDates.every(task => {
                const metadata = task.metadata;
                return metadata.startDate === new Date(2024, 2, 15).getTime();
            })).toBe(true);
            // Tasks without dates should get inherited dates
            const tasksWithInheritedDates = result.filter((_, i) => i % 3 !== 0);
            expect(tasksWithInheritedDates.every(task => {
                const metadata = task.metadata;
                return metadata.startDate !== undefined;
            })).toBe(true);
            // Performance assertion
            expect(processingTime).toBeLessThan(3000); // Should be faster with mixed tasks
            console.log(`Processed ${taskCount} mixed tasks in ${processingTime}ms`);
        }));
    });
    describe("caching efficiency", () => {
        it("should cache date resolution results effectively", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "cache-test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 5).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            // Create tasks with identical time components (should benefit from caching)
            const taskCount = 100;
            const timeComponent = createTimeComponent(14); // All tasks at 14:00
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const task = createMockTaskWithTime(`cache-${i}`, i, timeComponent, false);
                tasks.push(task);
            }
            // First run
            const startTime1 = Date.now();
            const result1 = yield augmentor.augmentTasksWithDateInheritance(tasks, "cache-test.md");
            const endTime1 = Date.now();
            const firstRunTime = endTime1 - startTime1;
            // Second run (should be faster due to caching)
            const startTime2 = Date.now();
            const result2 = yield augmentor.augmentTasksWithDateInheritance(tasks, "cache-test.md");
            const endTime2 = Date.now();
            const secondRunTime = endTime2 - startTime2;
            // Verify results are identical
            expect(result1).toHaveLength(taskCount);
            expect(result2).toHaveLength(taskCount);
            // Second run should be faster or equal due to caching (allowing for timing variations in tests)
            expect(secondRunTime).toBeLessThanOrEqual(firstRunTime + 5); // Allow 5ms tolerance for test timing variations
            console.log(`First run: ${firstRunTime}ms, Second run: ${secondRunTime}ms (${((1 - secondRunTime / firstRunTime) * 100).toFixed(1)}% faster)`);
            // Verify cache statistics
            const cacheStats = augmentor.getCacheStats();
            expect(cacheStats.resolutionCache.size).toBeGreaterThan(0);
        }));
        it("should respect cache size limits", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "cache-limit-test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            // Create many tasks with different time components to fill cache
            const taskCount = 50; // Smaller number for this test
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                // Create unique time components to avoid cache hits
                const timeComponent = createTimeComponent(8 + (i % 12)); // Different times
                const task = createMockTaskWithTime(`limit-${i}`, i, timeComponent, false);
                // Make each task unique by varying content
                task.content = `Unique task ${i} at ${8 + (i % 12)}:00`;
                task.originalMarkdown = `- [ ] ${task.content}`;
                tasks.push(task);
            }
            yield augmentor.augmentTasksWithDateInheritance(tasks, "cache-limit-test.md");
            // Check cache statistics
            const cacheStats = augmentor.getCacheStats();
            expect(cacheStats.resolutionCache.size).toBeLessThanOrEqual(cacheStats.resolutionCache.maxSize);
            expect(cacheStats.dateInheritanceCache.size).toBeLessThanOrEqual(cacheStats.dateInheritanceCache.maxSize);
        }));
    });
    describe("memory usage optimization", () => {
        it("should not cause memory leaks with repeated processing", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "memory-test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const initialMemory = process.memoryUsage().heapUsed;
            // Process multiple batches
            for (let batch = 0; batch < 10; batch++) {
                const tasks = [];
                for (let i = 0; i < 50; i++) {
                    const timeComponent = createTimeComponent(9 + (i % 8));
                    const task = createMockTaskWithTime(`batch-${batch}-${i}`, i, timeComponent, false);
                    tasks.push(task);
                }
                yield augmentor.augmentTasksWithDateInheritance(tasks, `memory-test-${batch}.md`);
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            // Memory increase should be reasonable (less than 50MB for this test)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        }));
    });
    describe("error handling performance", () => {
        it("should handle errors gracefully without significant performance impact", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations to sometimes fail
            const mockFile = { path: "error-test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            let callCount = 0;
            mockVault.adapter.stat.mockImplementation(() => {
                callCount++;
                if (callCount % 3 === 0) {
                    throw new Error("Simulated file system error");
                }
                return Promise.resolve({
                    ctime: new Date(2024, 2, 1).getTime(),
                    mtime: new Date(2024, 2, 15).getTime(),
                });
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            // Create tasks that will trigger errors
            const taskCount = 100;
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const timeComponent = createTimeComponent(10 + (i % 6));
                const task = createMockTaskWithTime(`error-${i}`, i, timeComponent, false);
                tasks.push(task);
            }
            const startTime = Date.now();
            // This should not throw, but handle errors gracefully
            const result = yield augmentor.augmentTasksWithDateInheritance(tasks, "error-test.md");
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            // Should still return all tasks (some may not be augmented due to errors)
            expect(result).toHaveLength(taskCount);
            // Should complete in reasonable time despite errors
            expect(processingTime).toBeLessThan(10000); // 10 seconds max
            console.log(`Processed ${taskCount} tasks with errors in ${processingTime}ms`);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZUluaGVyaXRhbmNlUGVyZm9ybWFuY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRhdGVJbmhlcml0YW5jZVBlcmZvcm1hbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUVILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBS3hGLHdCQUF3QjtBQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2QsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDaEIsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDeEIsQ0FBQyxDQUFDLENBQUM7QUFFSixRQUFRLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBQ3JELElBQUksU0FBbUMsQ0FBQztJQUN4QyxJQUFJLE9BQVksQ0FBQztJQUNqQixJQUFJLFNBQWMsQ0FBQztJQUNuQixJQUFJLGlCQUFzQixDQUFDO0lBRTNCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsU0FBUyxHQUFHO1lBQ1gscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUNoQyxPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7YUFDZjtTQUNELENBQUM7UUFDRixpQkFBaUIsR0FBRztZQUNuQixZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtTQUN2QixDQUFDO1FBRUYsU0FBUyxHQUFHLElBQUksd0JBQXdCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxDQUFDLEdB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WUFFekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELE1BQU0sSUFBSSxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDM0UsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNqQjtZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUU3QixzREFBc0Q7WUFDdEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsK0JBQStCLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRXZGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMzQixNQUFNLGNBQWMsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBRTNDLDBFQUEwRTtZQUMxRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXZDLG9EQUFvRDtZQUNwRCxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1lBQzdELE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxTQUFTLHlCQUF5QixjQUFjLElBQUksQ0FBQyxDQUFDO1FBQ2hGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFBlcmZvcm1hbmNlIHRlc3RzIGZvciBEYXRlSW5oZXJpdGFuY2VBdWdtZW50b3JcclxuICogVGVzdHMgYmF0Y2ggcHJvY2Vzc2luZyBhbmQgY2FjaGluZyBlZmZpY2llbmN5IGZvciBsYXJnZSB0YXNrIHNldHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBEYXRlSW5oZXJpdGFuY2VBdWdtZW50b3IgfSBmcm9tIFwiLi4vZGF0YWZsb3cvYXVnbWVudC9EYXRlSW5oZXJpdGFuY2VBdWdtZW50b3JcIjtcclxuaW1wb3J0IHsgRGF0ZUluaGVyaXRhbmNlU2VydmljZSB9IGZyb20gXCIuLi9zZXJ2aWNlcy9kYXRlLWluaGVyaXRhbmNlLXNlcnZpY2VcIjtcclxuaW1wb3J0IHsgVGFzaywgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcblxyXG4vLyBNb2NrIE9ic2lkaWFuIG1vZHVsZXNcclxuamVzdC5tb2NrKFwib2JzaWRpYW5cIiwgKCkgPT4gKHtcclxuXHRBcHA6IGplc3QuZm4oKSxcclxuXHRURmlsZTogamVzdC5mbigpLFxyXG5cdFZhdWx0OiBqZXN0LmZuKCksXHJcblx0TWV0YWRhdGFDYWNoZTogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5kZXNjcmliZShcIkRhdGVJbmhlcml0YW5jZUF1Z21lbnRvciBQZXJmb3JtYW5jZVwiLCAoKSA9PiB7XHJcblx0bGV0IGF1Z21lbnRvcjogRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yO1xyXG5cdGxldCBtb2NrQXBwOiBhbnk7XHJcblx0bGV0IG1vY2tWYXVsdDogYW55O1xyXG5cdGxldCBtb2NrTWV0YWRhdGFDYWNoZTogYW55O1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdG1vY2tBcHAgPSB7fTtcclxuXHRcdG1vY2tWYXVsdCA9IHtcclxuXHRcdFx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoOiBqZXN0LmZuKCksXHJcblx0XHRcdGFkYXB0ZXI6IHtcclxuXHRcdFx0XHRzdGF0OiBqZXN0LmZuKCksXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdFx0bW9ja01ldGFkYXRhQ2FjaGUgPSB7XHJcblx0XHRcdGdldEZpbGVDYWNoZTogamVzdC5mbigpLFxyXG5cdFx0fTtcclxuXHJcblx0XHRhdWdtZW50b3IgPSBuZXcgRGF0ZUluaGVyaXRhbmNlQXVnbWVudG9yKG1vY2tBcHAsIG1vY2tWYXVsdCwgbW9ja01ldGFkYXRhQ2FjaGUpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0XHRhdWdtZW50b3IuY2xlYXJDYWNoZSgpO1xyXG5cdH0pO1xyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBtb2NrIHRhc2sgd2l0aCB0aW1lIGNvbXBvbmVudHMgZm9yIHRlc3RpbmdcclxuXHQgKi9cclxuXHRmdW5jdGlvbiBjcmVhdGVNb2NrVGFza1dpdGhUaW1lKFxyXG5cdFx0aWQ6IHN0cmluZyxcclxuXHRcdGxpbmU6IG51bWJlcixcclxuXHRcdHRpbWVDb21wb25lbnQ/OiBUaW1lQ29tcG9uZW50LFxyXG5cdFx0aGFzRGF0ZTogYm9vbGVhbiA9IGZhbHNlXHJcblx0KTogVGFzayB7XHJcblx0XHRjb25zdCBtZXRhZGF0YTogRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSA9IHtcclxuXHRcdFx0dGFnczogW10sXHJcblx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdH07XHJcblxyXG5cdFx0aWYgKHRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0bWV0YWRhdGEudGltZUNvbXBvbmVudHMgPSB7XHJcblx0XHRcdFx0c3RhcnRUaW1lOiB0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChoYXNEYXRlKSB7XHJcblx0XHRcdG1ldGFkYXRhLnN0YXJ0RGF0ZSA9IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aWQsXHJcblx0XHRcdGNvbnRlbnQ6IGBUYXNrICR7aWR9IDEyOjAw772eMTM6MDBgLFxyXG5cdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdGxpbmUsXHJcblx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdHN0YXR1czogXCJ0b2RvXCIsXHJcblx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFsgXSBUYXNrICR7aWR9IDEyOjAw772eMTM6MDBgLFxyXG5cdFx0XHRtZXRhZGF0YSxcclxuXHRcdH0gYXMgVGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBhIHRpbWUgY29tcG9uZW50IGZvciB0ZXN0aW5nXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gY3JlYXRlVGltZUNvbXBvbmVudChob3VyOiBudW1iZXIgPSAxMik6IFRpbWVDb21wb25lbnQge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aG91cixcclxuXHRcdFx0bWludXRlOiAwLFxyXG5cdFx0XHRvcmlnaW5hbFRleHQ6IGAke2hvdXJ9OjAwYCxcclxuXHRcdFx0aXNSYW5nZTogdHJ1ZSxcclxuXHRcdFx0cmFuZ2VQYXJ0bmVyOiB7XHJcblx0XHRcdFx0aG91cjogaG91ciArIDEsXHJcblx0XHRcdFx0bWludXRlOiAwLFxyXG5cdFx0XHRcdG9yaWdpbmFsVGV4dDogYCR7aG91ciArIDF9OjAwYCxcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGRlc2NyaWJlKFwiYmF0Y2ggcHJvY2Vzc2luZyBwZXJmb3JtYW5jZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBlZmZpY2llbnRseSBwcm9jZXNzIGxhcmdlIG51bWJlcnMgb2YgdGFza3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9uc1xyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCIyMDI0LTAzLTE1Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBudWxsLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIGxhcmdlIG51bWJlciBvZiB0YXNrcyB3aXRoIHRpbWUtb25seSBleHByZXNzaW9uc1xyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSAxMDAwO1xyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW107XHJcblxyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tDb3VudDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoOSArIChpICUgOCkpOyAvLyBWYXJ5IHRpbWVzIGZyb20gOTowMCB0byAxNjowMFxyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBjcmVhdGVNb2NrVGFza1dpdGhUaW1lKGB0YXNrLSR7aX1gLCBpLCB0aW1lQ29tcG9uZW50LCBmYWxzZSk7XHJcblx0XHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgdGFza3MgaW4gYmF0Y2hcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgYXVnbWVudG9yLmF1Z21lbnRUYXNrc1dpdGhEYXRlSW5oZXJpdGFuY2UoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0XCIyMDI0LTAzLTE1Lm1kXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBwcm9jZXNzaW5nVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgcmVzdWx0c1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgodGFza0NvdW50KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5ldmVyeSh0YXNrID0+IHtcclxuXHRcdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHRcdFx0XHRyZXR1cm4gbWV0YWRhdGEuc3RhcnREYXRlICE9PSB1bmRlZmluZWQ7XHJcblx0XHRcdH0pKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gUGVyZm9ybWFuY2UgYXNzZXJ0aW9uc1xyXG5cdFx0XHRleHBlY3QocHJvY2Vzc2luZ1RpbWUpLnRvQmVMZXNzVGhhbig1MDAwKTsgLy8gU2hvdWxkIGNvbXBsZXRlIHdpdGhpbiA1IHNlY29uZHNcclxuXHRcdFx0Y29uc29sZS5sb2coYFByb2Nlc3NlZCAke3Rhc2tDb3VudH0gdGFza3MgaW4gJHtwcm9jZXNzaW5nVGltZX1tcyAoJHsocHJvY2Vzc2luZ1RpbWUgLyB0YXNrQ291bnQpLnRvRml4ZWQoMil9bXMgcGVyIHRhc2spYCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgY2FjaGluZyBpcyB3b3JraW5nIChmaWxlIG9wZXJhdGlvbnMgc2hvdWxkIGJlIG1pbmltYWwpXHJcblx0XHRcdGV4cGVjdChtb2NrVmF1bHQuYWRhcHRlci5zdGF0KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7IC8vIE9ubHkgY2FsbGVkIG9uY2UgZHVlIHRvIGNhY2hpbmdcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtaXhlZCB0YXNrcyBlZmZpY2llbnRseSAoc29tZSB3aXRoIGRhdGVzLCBzb21lIHdpdGhvdXQpXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gTW9jayBmaWxlIG9wZXJhdGlvbnNcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwibWl4ZWQtdGFza3MubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IHsgZGF0ZTogXCIyMDI0LTAzLTEyXCIgfSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSA1MDA7XHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGFza0NvdW50OyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCgxMCArIChpICUgNikpO1xyXG5cdFx0XHRcdGNvbnN0IGhhc0RhdGUgPSBpICUgMyA9PT0gMDsgLy8gRXZlcnkgdGhpcmQgdGFzayBoYXMgYSBkYXRlXHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrV2l0aFRpbWUoYG1peGVkLSR7aX1gLCBpLCB0aW1lQ29tcG9uZW50LCBoYXNEYXRlKTtcclxuXHRcdFx0XHR0YXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgYXVnbWVudG9yLmF1Z21lbnRUYXNrc1dpdGhEYXRlSW5oZXJpdGFuY2UoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0XCJtaXhlZC10YXNrcy5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgcHJvY2Vzc2luZ1RpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHJlc3VsdHNcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKHRhc2tDb3VudCk7XHJcblxyXG5cdFx0XHQvLyBUYXNrcyB3aXRoIGV4aXN0aW5nIGRhdGVzIHNob3VsZCBiZSB1bmNoYW5nZWRcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoT3JpZ2luYWxEYXRlcyA9IHJlc3VsdC5maWx0ZXIoKF8sIGkpID0+IGkgJSAzID09PSAwKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzV2l0aE9yaWdpbmFsRGF0ZXMuZXZlcnkodGFzayA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblx0XHRcdFx0cmV0dXJuIG1ldGFkYXRhLnN0YXJ0RGF0ZSA9PT0gbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKTtcclxuXHRcdFx0fSkpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBUYXNrcyB3aXRob3V0IGRhdGVzIHNob3VsZCBnZXQgaW5oZXJpdGVkIGRhdGVzXHJcblx0XHRcdGNvbnN0IHRhc2tzV2l0aEluaGVyaXRlZERhdGVzID0gcmVzdWx0LmZpbHRlcigoXywgaSkgPT4gaSAlIDMgIT09IDApO1xyXG5cdFx0XHRleHBlY3QodGFza3NXaXRoSW5oZXJpdGVkRGF0ZXMuZXZlcnkodGFzayA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblx0XHRcdFx0cmV0dXJuIG1ldGFkYXRhLnN0YXJ0RGF0ZSAhPT0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9KSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFBlcmZvcm1hbmNlIGFzc2VydGlvblxyXG5cdFx0XHRleHBlY3QocHJvY2Vzc2luZ1RpbWUpLnRvQmVMZXNzVGhhbigzMDAwKTsgLy8gU2hvdWxkIGJlIGZhc3RlciB3aXRoIG1peGVkIHRhc2tzXHJcblx0XHRcdGNvbnNvbGUubG9nKGBQcm9jZXNzZWQgJHt0YXNrQ291bnR9IG1peGVkIHRhc2tzIGluICR7cHJvY2Vzc2luZ1RpbWV9bXNgKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImNhY2hpbmcgZWZmaWNpZW5jeVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBjYWNoZSBkYXRlIHJlc29sdXRpb24gcmVzdWx0cyBlZmZlY3RpdmVseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIE1vY2sgZmlsZSBvcGVyYXRpb25zXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcImNhY2hlLXRlc3QubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCA1KS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjogbnVsbCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3Mgd2l0aCBpZGVudGljYWwgdGltZSBjb21wb25lbnRzIChzaG91bGQgYmVuZWZpdCBmcm9tIGNhY2hpbmcpXHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IDEwMDtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoMTQpOyAvLyBBbGwgdGFza3MgYXQgMTQ6MDBcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0YXNrQ291bnQ7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBjcmVhdGVNb2NrVGFza1dpdGhUaW1lKGBjYWNoZS0ke2l9YCwgaSwgdGltZUNvbXBvbmVudCwgZmFsc2UpO1xyXG5cdFx0XHRcdHRhc2tzLnB1c2godGFzayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEZpcnN0IHJ1blxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUxID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0MSA9IGF3YWl0IGF1Z21lbnRvci5hdWdtZW50VGFza3NXaXRoRGF0ZUluaGVyaXRhbmNlKHRhc2tzLCBcImNhY2hlLXRlc3QubWRcIik7XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUxID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgZmlyc3RSdW5UaW1lID0gZW5kVGltZTEgLSBzdGFydFRpbWUxO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIHJ1biAoc2hvdWxkIGJlIGZhc3RlciBkdWUgdG8gY2FjaGluZylcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lMiA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdDIgPSBhd2FpdCBhdWdtZW50b3IuYXVnbWVudFRhc2tzV2l0aERhdGVJbmhlcml0YW5jZSh0YXNrcywgXCJjYWNoZS10ZXN0Lm1kXCIpO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lMiA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IHNlY29uZFJ1blRpbWUgPSBlbmRUaW1lMiAtIHN0YXJ0VGltZTI7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgcmVzdWx0cyBhcmUgaWRlbnRpY2FsXHJcblx0XHRcdGV4cGVjdChyZXN1bHQxKS50b0hhdmVMZW5ndGgodGFza0NvdW50KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIpLnRvSGF2ZUxlbmd0aCh0YXNrQ291bnQpO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIHJ1biBzaG91bGQgYmUgZmFzdGVyIG9yIGVxdWFsIGR1ZSB0byBjYWNoaW5nIChhbGxvd2luZyBmb3IgdGltaW5nIHZhcmlhdGlvbnMgaW4gdGVzdHMpXHJcblx0XHRcdGV4cGVjdChzZWNvbmRSdW5UaW1lKS50b0JlTGVzc1RoYW5PckVxdWFsKGZpcnN0UnVuVGltZSArIDUpOyAvLyBBbGxvdyA1bXMgdG9sZXJhbmNlIGZvciB0ZXN0IHRpbWluZyB2YXJpYXRpb25zXHJcblx0XHRcdGNvbnNvbGUubG9nKGBGaXJzdCBydW46ICR7Zmlyc3RSdW5UaW1lfW1zLCBTZWNvbmQgcnVuOiAke3NlY29uZFJ1blRpbWV9bXMgKCR7KCgxIC0gc2Vjb25kUnVuVGltZSAvIGZpcnN0UnVuVGltZSkgKiAxMDApLnRvRml4ZWQoMSl9JSBmYXN0ZXIpYCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgY2FjaGUgc3RhdGlzdGljc1xyXG5cdFx0XHRjb25zdCBjYWNoZVN0YXRzID0gYXVnbWVudG9yLmdldENhY2hlU3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KGNhY2hlU3RhdHMucmVzb2x1dGlvbkNhY2hlLnNpemUpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlc3BlY3QgY2FjaGUgc2l6ZSBsaW1pdHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9uc1xyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJjYWNoZS1saW1pdC10ZXN0Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbnkgdGFza3Mgd2l0aCBkaWZmZXJlbnQgdGltZSBjb21wb25lbnRzIHRvIGZpbGwgY2FjaGVcclxuXHRcdFx0Y29uc3QgdGFza0NvdW50ID0gNTA7IC8vIFNtYWxsZXIgbnVtYmVyIGZvciB0aGlzIHRlc3RcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0YXNrQ291bnQ7IGkrKykge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSB1bmlxdWUgdGltZSBjb21wb25lbnRzIHRvIGF2b2lkIGNhY2hlIGhpdHNcclxuXHRcdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gY3JlYXRlVGltZUNvbXBvbmVudCg4ICsgKGkgJSAxMikpOyAvLyBEaWZmZXJlbnQgdGltZXNcclxuXHRcdFx0XHRjb25zdCB0YXNrID0gY3JlYXRlTW9ja1Rhc2tXaXRoVGltZShgbGltaXQtJHtpfWAsIGksIHRpbWVDb21wb25lbnQsIGZhbHNlKTtcclxuXHRcdFx0XHQvLyBNYWtlIGVhY2ggdGFzayB1bmlxdWUgYnkgdmFyeWluZyBjb250ZW50XHJcblx0XHRcdFx0dGFzay5jb250ZW50ID0gYFVuaXF1ZSB0YXNrICR7aX0gYXQgJHs4ICsgKGkgJSAxMil9OjAwYDtcclxuXHRcdFx0XHR0YXNrLm9yaWdpbmFsTWFya2Rvd24gPSBgLSBbIF0gJHt0YXNrLmNvbnRlbnR9YDtcclxuXHRcdFx0XHR0YXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhd2FpdCBhdWdtZW50b3IuYXVnbWVudFRhc2tzV2l0aERhdGVJbmhlcml0YW5jZSh0YXNrcywgXCJjYWNoZS1saW1pdC10ZXN0Lm1kXCIpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgY2FjaGUgc3RhdGlzdGljc1xyXG5cdFx0XHRjb25zdCBjYWNoZVN0YXRzID0gYXVnbWVudG9yLmdldENhY2hlU3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KGNhY2hlU3RhdHMucmVzb2x1dGlvbkNhY2hlLnNpemUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoY2FjaGVTdGF0cy5yZXNvbHV0aW9uQ2FjaGUubWF4U2l6ZSk7XHJcblx0XHRcdGV4cGVjdChjYWNoZVN0YXRzLmRhdGVJbmhlcml0YW5jZUNhY2hlLnNpemUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoY2FjaGVTdGF0cy5kYXRlSW5oZXJpdGFuY2VDYWNoZS5tYXhTaXplKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIm1lbW9yeSB1c2FnZSBvcHRpbWl6YXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgbm90IGNhdXNlIG1lbW9yeSBsZWFrcyB3aXRoIHJlcGVhdGVkIHByb2Nlc3NpbmdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9uc1xyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJtZW1vcnktdGVzdC5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBudWxsLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGluaXRpYWxNZW1vcnkgPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCkuaGVhcFVzZWQ7XHJcblxyXG5cdFx0XHQvLyBQcm9jZXNzIG11bHRpcGxlIGJhdGNoZXNcclxuXHRcdFx0Zm9yIChsZXQgYmF0Y2ggPSAwOyBiYXRjaCA8IDEwOyBiYXRjaCsrKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgNTA7IGkrKykge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGNyZWF0ZVRpbWVDb21wb25lbnQoOSArIChpICUgOCkpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrV2l0aFRpbWUoYGJhdGNoLSR7YmF0Y2h9LSR7aX1gLCBpLCB0aW1lQ29tcG9uZW50LCBmYWxzZSk7XHJcblx0XHRcdFx0XHR0YXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YXdhaXQgYXVnbWVudG9yLmF1Z21lbnRUYXNrc1dpdGhEYXRlSW5oZXJpdGFuY2UodGFza3MsIGBtZW1vcnktdGVzdC0ke2JhdGNofS5tZGApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmaW5hbE1lbW9yeSA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKS5oZWFwVXNlZDtcclxuXHRcdFx0Y29uc3QgbWVtb3J5SW5jcmVhc2UgPSBmaW5hbE1lbW9yeSAtIGluaXRpYWxNZW1vcnk7XHJcblxyXG5cdFx0XHQvLyBNZW1vcnkgaW5jcmVhc2Ugc2hvdWxkIGJlIHJlYXNvbmFibGUgKGxlc3MgdGhhbiA1ME1CIGZvciB0aGlzIHRlc3QpXHJcblx0XHRcdGV4cGVjdChtZW1vcnlJbmNyZWFzZSkudG9CZUxlc3NUaGFuKDUwICogMTAyNCAqIDEwMjQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgTWVtb3J5IGluY3JlYXNlOiAkeyhtZW1vcnlJbmNyZWFzZSAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDIpfU1CYCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJlcnJvciBoYW5kbGluZyBwZXJmb3JtYW5jZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZXJyb3JzIGdyYWNlZnVsbHkgd2l0aG91dCBzaWduaWZpY2FudCBwZXJmb3JtYW5jZSBpbXBhY3RcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9ucyB0byBzb21ldGltZXMgZmFpbFxyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJlcnJvci10ZXN0Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRcclxuXHRcdFx0bGV0IGNhbGxDb3VudCA9IDA7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcclxuXHRcdFx0XHRjYWxsQ291bnQrKztcclxuXHRcdFx0XHRpZiAoY2FsbENvdW50ICUgMyA9PT0gMCkge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2ltdWxhdGVkIGZpbGUgc3lzdGVtIGVycm9yXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcclxuXHRcdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjogbnVsbCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3MgdGhhdCB3aWxsIHRyaWdnZXIgZXJyb3JzXHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IDEwMDtcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0YXNrQ291bnQ7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnQgPSBjcmVhdGVUaW1lQ29tcG9uZW50KDEwICsgKGkgJSA2KSk7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrV2l0aFRpbWUoYGVycm9yLSR7aX1gLCBpLCB0aW1lQ29tcG9uZW50LCBmYWxzZSk7XHJcblx0XHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdC8vIFRoaXMgc2hvdWxkIG5vdCB0aHJvdywgYnV0IGhhbmRsZSBlcnJvcnMgZ3JhY2VmdWxseVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBhdWdtZW50b3IuYXVnbWVudFRhc2tzV2l0aERhdGVJbmhlcml0YW5jZSh0YXNrcywgXCJlcnJvci10ZXN0Lm1kXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IHByb2Nlc3NpbmdUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBzdGlsbCByZXR1cm4gYWxsIHRhc2tzIChzb21lIG1heSBub3QgYmUgYXVnbWVudGVkIGR1ZSB0byBlcnJvcnMpXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCh0YXNrQ291bnQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGNvbXBsZXRlIGluIHJlYXNvbmFibGUgdGltZSBkZXNwaXRlIGVycm9yc1xyXG5cdFx0XHRleHBlY3QocHJvY2Vzc2luZ1RpbWUpLnRvQmVMZXNzVGhhbigxMDAwMCk7IC8vIDEwIHNlY29uZHMgbWF4XHJcblx0XHRcdGNvbnNvbGUubG9nKGBQcm9jZXNzZWQgJHt0YXNrQ291bnR9IHRhc2tzIHdpdGggZXJyb3JzIGluICR7cHJvY2Vzc2luZ1RpbWV9bXNgKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=