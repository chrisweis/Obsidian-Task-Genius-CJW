/**
 * Performance tests for ProjectConfigManager cache optimizations
 */
import { __awaiter } from "tslib";
import { ProjectConfigManager } from "../managers/project-config-manager";
// Mock implementations
const createMockFile = (path, mtime, frontmatter) => {
    var _a;
    return ({
        path,
        name: path.split("/").pop() || "",
        basename: ((_a = path.split("/").pop()) === null || _a === void 0 ? void 0 : _a.replace(/\.[^/.]+$/, "")) || "",
        extension: path.split(".").pop() || "",
        stat: {
            ctime: mtime - 1000,
            mtime,
            size: 1000
        },
        vault: {},
        parent: null,
    });
};
const createMockVault = (files) => ({
    getFileByPath: (path) => files.get(path) || null,
    getAbstractFileByPath: (path) => files.get(path) || null,
    read: (file) => __awaiter(void 0, void 0, void 0, function* () { return `---\nproject: test\n---\nContent`; }),
});
const createMockMetadataCache = (metadata) => ({
    getFileCache: (file) => ({
        frontmatter: metadata.get(file.path) || {}
    }),
});
describe("ProjectConfigManager Cache Performance", () => {
    let projectConfigManager;
    let mockFiles;
    let mockMetadata;
    let vault;
    let metadataCache;
    beforeEach(() => {
        mockFiles = new Map();
        mockMetadata = new Map();
        vault = createMockVault(mockFiles);
        metadataCache = createMockMetadataCache(mockMetadata);
        const options = {
            vault,
            metadataCache,
            configFileName: "task-genius.config.md",
            searchRecursively: true,
            metadataKey: "project",
            pathMappings: [],
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                enabled: false,
            },
            enhancedProjectEnabled: true,
        };
        projectConfigManager = new ProjectConfigManager(options);
    });
    describe("getFileMetadata caching", () => {
        it("should cache file metadata based on mtime", () => {
            const filePath = "test.md";
            const mtime = Date.now();
            const frontmatter = { project: "test-project", priority: "high" };
            // Setup mock file and metadata
            mockFiles.set(filePath, createMockFile(filePath, mtime, frontmatter));
            mockMetadata.set(filePath, frontmatter);
            // First call - should read from metadataCache
            const result1 = projectConfigManager.getFileMetadata(filePath);
            expect(result1).toEqual(frontmatter);
            // Second call with same mtime - should return cached result
            const result2 = projectConfigManager.getFileMetadata(filePath);
            expect(result2).toEqual(frontmatter);
            expect(result2).toBe(result1); // Should be same object reference (cached)
        });
        it("should invalidate cache when file mtime changes", () => {
            const filePath = "test.md";
            const initialMtime = Date.now();
            const updatedMtime = initialMtime + 1000;
            const initialFrontmatter = { project: "initial" };
            const updatedFrontmatter = { project: "updated" };
            // Setup initial file
            mockFiles.set(filePath, createMockFile(filePath, initialMtime));
            mockMetadata.set(filePath, initialFrontmatter);
            // First call
            const result1 = projectConfigManager.getFileMetadata(filePath);
            expect(result1).toEqual(initialFrontmatter);
            // Update file mtime and metadata
            mockFiles.set(filePath, createMockFile(filePath, updatedMtime));
            mockMetadata.set(filePath, updatedFrontmatter);
            // Second call - should detect file change and return new data
            const result2 = projectConfigManager.getFileMetadata(filePath);
            expect(result2).toEqual(updatedFrontmatter);
            expect(result2).not.toBe(result1); // Should be different object (cache miss)
        });
    });
    describe("getEnhancedMetadata caching", () => {
        it("should cache enhanced metadata based on composite key", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            const mtime = Date.now();
            const frontmatter = { priority: "high" };
            // Setup mock file
            mockFiles.set(filePath, createMockFile(filePath, mtime));
            mockMetadata.set(filePath, frontmatter);
            // First call
            const result1 = yield projectConfigManager.getEnhancedMetadata(filePath);
            expect(result1).toEqual(frontmatter);
            // Second call with same file state - should return cached result
            const result2 = yield projectConfigManager.getEnhancedMetadata(filePath);
            expect(result2).toEqual(frontmatter);
        }));
        it("should invalidate cache when either file or config changes", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            const initialMtime = Date.now();
            const updatedMtime = initialMtime + 1000;
            const initialFrontmatter = { priority: "high" };
            const updatedFrontmatter = { priority: "low" };
            // Setup initial state
            mockFiles.set(filePath, createMockFile(filePath, initialMtime));
            mockMetadata.set(filePath, initialFrontmatter);
            // First call
            const result1 = yield projectConfigManager.getEnhancedMetadata(filePath);
            expect(result1).toEqual(initialFrontmatter);
            // Update file
            mockFiles.set(filePath, createMockFile(filePath, updatedMtime));
            mockMetadata.set(filePath, updatedFrontmatter);
            // Second call - should detect change and return new data
            const result2 = yield projectConfigManager.getEnhancedMetadata(filePath);
            expect(result2).toEqual(updatedFrontmatter);
        }));
    });
    describe("Cache statistics", () => {
        it("should provide accurate cache statistics", () => {
            const filePath1 = "test1.md";
            const filePath2 = "test2.md";
            const mtime = Date.now();
            // Setup files
            mockFiles.set(filePath1, createMockFile(filePath1, mtime));
            mockFiles.set(filePath2, createMockFile(filePath2, mtime));
            mockMetadata.set(filePath1, { project: "test1" });
            mockMetadata.set(filePath2, { project: "test2" });
            // Load data into cache
            projectConfigManager.getFileMetadata(filePath1);
            projectConfigManager.getFileMetadata(filePath2);
            const stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(2);
            expect(stats.totalMemoryUsage.estimatedBytes).toBeGreaterThan(0);
        });
    });
    describe("Cache clearing", () => {
        it("should clear specific file from all related caches", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            const mtime = Date.now();
            mockFiles.set(filePath, createMockFile(filePath, mtime));
            mockMetadata.set(filePath, { project: "test" });
            // Load data into caches
            projectConfigManager.getFileMetadata(filePath);
            yield projectConfigManager.getEnhancedMetadata(filePath);
            // Verify data is cached
            let stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(1);
            expect(stats.enhancedMetadataCache.size).toBe(1);
            // Clear cache for specific file
            projectConfigManager.clearCache(filePath);
            // Verify cache is cleared
            stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(0);
            expect(stats.enhancedMetadataCache.size).toBe(0);
        }));
        it("should clear all caches when no file path provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath1 = "test1.md";
            const filePath2 = "test2.md";
            const mtime = Date.now();
            mockFiles.set(filePath1, createMockFile(filePath1, mtime));
            mockFiles.set(filePath2, createMockFile(filePath2, mtime));
            mockMetadata.set(filePath1, { project: "test1" });
            mockMetadata.set(filePath2, { project: "test2" });
            // Load data into caches
            projectConfigManager.getFileMetadata(filePath1);
            projectConfigManager.getFileMetadata(filePath2);
            // Verify data is cached
            let stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(2);
            // Clear all caches
            projectConfigManager.clearCache();
            // Verify all caches are cleared
            stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(0);
            expect(stats.enhancedMetadataCache.size).toBe(0);
        }));
    });
    describe("Stale cache cleanup", () => {
        it("should remove stale entries when clearStaleEntries is called", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            const initialMtime = Date.now();
            const frontmatter = { project: "test" };
            // Setup initial file
            mockFiles.set(filePath, createMockFile(filePath, initialMtime));
            mockMetadata.set(filePath, frontmatter);
            // Load into cache
            projectConfigManager.getFileMetadata(filePath);
            // Verify cache is populated
            let stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(1);
            // Simulate file deletion by removing from mock vault
            mockFiles.delete(filePath);
            // Clear stale entries
            const clearedCount = yield projectConfigManager.clearStaleEntries();
            expect(clearedCount).toBe(1);
            // Verify cache is cleaned
            stats = projectConfigManager.getCacheStats();
            expect(stats.fileMetadataCache.size).toBe(0);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdENvbmZpZ01hbmFnZXIuY2FjaGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlByb2plY3RDb25maWdNYW5hZ2VyLmNhY2hlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBRUgsT0FBTyxFQUFFLG9CQUFvQixFQUErQixNQUFNLG9DQUFvQyxDQUFDO0FBR3ZHLHVCQUF1QjtBQUN2QixNQUFNLGNBQWMsR0FBRyxDQUFDLElBQVksRUFBRSxLQUFhLEVBQUUsV0FBaUIsRUFBUyxFQUFFOztJQUFDLE9BQUEsQ0FBQztRQUNsRixJQUFJO1FBQ0osSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtRQUNqQyxRQUFRLEVBQUUsQ0FBQSxNQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLDBDQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLEtBQUksRUFBRTtRQUMvRCxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO1FBQ3RDLElBQUksRUFBRTtZQUNMLEtBQUssRUFBRSxLQUFLLEdBQUcsSUFBSTtZQUNuQixLQUFLO1lBQ0wsSUFBSSxFQUFFLElBQUk7U0FDVjtRQUNELEtBQUssRUFBRSxFQUFXO1FBQ2xCLE1BQU0sRUFBRSxJQUFJO0tBQ0YsQ0FBQSxDQUFBO0NBQUEsQ0FBQztBQUVaLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBeUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2RCxhQUFhLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSTtJQUN4RCxxQkFBcUIsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcs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QztZQUUvQyw0QkFBNEI7WUFDNUIsSUFBSSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFN0MscURBQXFEO1lBQ3JELFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFM0Isc0JBQXNCO1lBQ3RCLE1BQU0sWUFBWSxHQUFHLE1BQU0sb0JBQW9CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNwRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdCLDBCQUEwQjtZQUMxQixLQUFLLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUGVyZm9ybWFuY2UgdGVzdHMgZm9yIFByb2plY3RDb25maWdNYW5hZ2VyIGNhY2hlIG9wdGltaXphdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBQcm9qZWN0Q29uZmlnTWFuYWdlciwgUHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zIH0gZnJvbSBcIi4uL21hbmFnZXJzL3Byb2plY3QtY29uZmlnLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVEZpbGUsIFZhdWx0LCBNZXRhZGF0YUNhY2hlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIGltcGxlbWVudGF0aW9uc1xyXG5jb25zdCBjcmVhdGVNb2NrRmlsZSA9IChwYXRoOiBzdHJpbmcsIG10aW1lOiBudW1iZXIsIGZyb250bWF0dGVyPzogYW55KTogVEZpbGUgPT4gKHtcclxuXHRwYXRoLFxyXG5cdG5hbWU6IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IFwiXCIsXHJcblx0YmFzZW5hbWU6IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpPy5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIikgfHwgXCJcIixcclxuXHRleHRlbnNpb246IHBhdGguc3BsaXQoXCIuXCIpLnBvcCgpIHx8IFwiXCIsXHJcblx0c3RhdDogeyBcclxuXHRcdGN0aW1lOiBtdGltZSAtIDEwMDAsIFxyXG5cdFx0bXRpbWUsIFxyXG5cdFx0c2l6ZTogMTAwMCBcclxuXHR9LFxyXG5cdHZhdWx0OiB7fSBhcyBWYXVsdCxcclxuXHRwYXJlbnQ6IG51bGwsXHJcbn0gYXMgVEZpbGUpO1xyXG5cclxuY29uc3QgY3JlYXRlTW9ja1ZhdWx0ID0gKGZpbGVzOiBNYXA8c3RyaW5nLCBURmlsZT4pID0+ICh7XHJcblx0Z2V0RmlsZUJ5UGF0aDogKHBhdGg6IHN0cmluZykgPT4gZmlsZXMuZ2V0KHBhdGgpIHx8IG51bGwsXHJcblx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoOiAocGF0aDogc3RyaW5nKSA9PiBmaWxlcy5nZXQocGF0aCkgfHwgbnVsbCxcclxuXHRyZWFkOiBhc3luYyAoZmlsZTogVEZpbGUpID0+IGAtLS1cXG5wcm9qZWN0OiB0ZXN0XFxuLS0tXFxuQ29udGVudGAsXHJcbn0gYXMgVmF1bHQpO1xyXG5cclxuY29uc3QgY3JlYXRlTW9ja01ldGFkYXRhQ2FjaGUgPSAobWV0YWRhdGE6IE1hcDxzdHJpbmcsIGFueT4pID0+ICh7XHJcblx0Z2V0RmlsZUNhY2hlOiAoZmlsZTogVEZpbGUpID0+ICh7XHJcblx0XHRmcm9udG1hdHRlcjogbWV0YWRhdGEuZ2V0KGZpbGUucGF0aCkgfHwge31cclxuXHR9KSxcclxufSBhcyBNZXRhZGF0YUNhY2hlKTtcclxuXHJcbmRlc2NyaWJlKFwiUHJvamVjdENvbmZpZ01hbmFnZXIgQ2FjaGUgUGVyZm9ybWFuY2VcIiwgKCkgPT4ge1xyXG5cdGxldCBwcm9qZWN0Q29uZmlnTWFuYWdlcjogUHJvamVjdENvbmZpZ01hbmFnZXI7XHJcblx0bGV0IG1vY2tGaWxlczogTWFwPHN0cmluZywgVEZpbGU+O1xyXG5cdGxldCBtb2NrTWV0YWRhdGE6IE1hcDxzdHJpbmcsIGFueT47XHJcblx0bGV0IHZhdWx0OiBWYXVsdDtcclxuXHRsZXQgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrRmlsZXMgPSBuZXcgTWFwKCk7XHJcblx0XHRtb2NrTWV0YWRhdGEgPSBuZXcgTWFwKCk7XHJcblx0XHR2YXVsdCA9IGNyZWF0ZU1vY2tWYXVsdChtb2NrRmlsZXMpO1xyXG5cdFx0bWV0YWRhdGFDYWNoZSA9IGNyZWF0ZU1vY2tNZXRhZGF0YUNhY2hlKG1vY2tNZXRhZGF0YSk7XHJcblxyXG5cdFx0Y29uc3Qgb3B0aW9uczogUHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zID0ge1xyXG5cdFx0XHR2YXVsdCxcclxuXHRcdFx0bWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0Y29uZmlnRmlsZU5hbWU6IFwidGFzay1nZW5pdXMuY29uZmlnLm1kXCIsXHJcblx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLFxyXG5cdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6IHRydWUsXHJcblx0XHR9O1xyXG5cclxuXHRcdHByb2plY3RDb25maWdNYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKG9wdGlvbnMpO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImdldEZpbGVNZXRhZGF0YSBjYWNoaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNhY2hlIGZpbGUgbWV0YWRhdGEgYmFzZWQgb24gbXRpbWVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IGZyb250bWF0dGVyID0geyBwcm9qZWN0OiBcInRlc3QtcHJvamVjdFwiLCBwcmlvcml0eTogXCJoaWdoXCIgfTtcclxuXHJcblx0XHRcdC8vIFNldHVwIG1vY2sgZmlsZSBhbmQgbWV0YWRhdGFcclxuXHRcdFx0bW9ja0ZpbGVzLnNldChmaWxlUGF0aCwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgsIG10aW1lLCBmcm9udG1hdHRlcikpO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGEuc2V0KGZpbGVQYXRoLCBmcm9udG1hdHRlcik7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBjYWxsIC0gc2hvdWxkIHJlYWQgZnJvbSBtZXRhZGF0YUNhY2hlXHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0MSkudG9FcXVhbChmcm9udG1hdHRlcik7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgY2FsbCB3aXRoIHNhbWUgbXRpbWUgLSBzaG91bGQgcmV0dXJuIGNhY2hlZCByZXN1bHRcclxuXHRcdFx0Y29uc3QgcmVzdWx0MiA9IHByb2plY3RDb25maWdNYW5hZ2VyLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQyKS50b0VxdWFsKGZyb250bWF0dGVyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIpLnRvQmUocmVzdWx0MSk7IC8vIFNob3VsZCBiZSBzYW1lIG9iamVjdCByZWZlcmVuY2UgKGNhY2hlZClcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGludmFsaWRhdGUgY2FjaGUgd2hlbiBmaWxlIG10aW1lIGNoYW5nZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBpbml0aWFsTXRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkTXRpbWUgPSBpbml0aWFsTXRpbWUgKyAxMDAwO1xyXG5cdFx0XHRjb25zdCBpbml0aWFsRnJvbnRtYXR0ZXIgPSB7IHByb2plY3Q6IFwiaW5pdGlhbFwiIH07XHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRGcm9udG1hdHRlciA9IHsgcHJvamVjdDogXCJ1cGRhdGVkXCIgfTtcclxuXHJcblx0XHRcdC8vIFNldHVwIGluaXRpYWwgZmlsZVxyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoLCBjcmVhdGVNb2NrRmlsZShmaWxlUGF0aCwgaW5pdGlhbE10aW1lKSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YS5zZXQoZmlsZVBhdGgsIGluaXRpYWxGcm9udG1hdHRlcik7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBjYWxsXHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0MSkudG9FcXVhbChpbml0aWFsRnJvbnRtYXR0ZXIpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGZpbGUgbXRpbWUgYW5kIG1ldGFkYXRhXHJcblx0XHRcdG1vY2tGaWxlcy5zZXQoZmlsZVBhdGgsIGNyZWF0ZU1vY2tGaWxlKGZpbGVQYXRoLCB1cGRhdGVkTXRpbWUpKTtcclxuXHRcdFx0bW9ja01ldGFkYXRhLnNldChmaWxlUGF0aCwgdXBkYXRlZEZyb250bWF0dGVyKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjYWxsIC0gc2hvdWxkIGRldGVjdCBmaWxlIGNoYW5nZSBhbmQgcmV0dXJuIG5ldyBkYXRhXHJcblx0XHRcdGNvbnN0IHJlc3VsdDIgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0MikudG9FcXVhbCh1cGRhdGVkRnJvbnRtYXR0ZXIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Mikubm90LnRvQmUocmVzdWx0MSk7IC8vIFNob3VsZCBiZSBkaWZmZXJlbnQgb2JqZWN0IChjYWNoZSBtaXNzKVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZ2V0RW5oYW5jZWRNZXRhZGF0YSBjYWNoaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNhY2hlIGVuaGFuY2VkIG1ldGFkYXRhIGJhc2VkIG9uIGNvbXBvc2l0ZSBrZXlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IGZyb250bWF0dGVyID0geyBwcmlvcml0eTogXCJoaWdoXCIgfTtcclxuXHJcblx0XHRcdC8vIFNldHVwIG1vY2sgZmlsZVxyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoLCBjcmVhdGVNb2NrRmlsZShmaWxlUGF0aCwgbXRpbWUpKTtcclxuXHRcdFx0bW9ja01ldGFkYXRhLnNldChmaWxlUGF0aCwgZnJvbnRtYXR0ZXIpO1xyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2FsbFxyXG5cdFx0XHRjb25zdCByZXN1bHQxID0gYXdhaXQgcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQxKS50b0VxdWFsKGZyb250bWF0dGVyKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjYWxsIHdpdGggc2FtZSBmaWxlIHN0YXRlIC0gc2hvdWxkIHJldHVybiBjYWNoZWQgcmVzdWx0XHJcblx0XHRcdGNvbnN0IHJlc3VsdDIgPSBhd2FpdCBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVQYXRoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIpLnRvRXF1YWwoZnJvbnRtYXR0ZXIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW52YWxpZGF0ZSBjYWNoZSB3aGVuIGVpdGhlciBmaWxlIG9yIGNvbmZpZyBjaGFuZ2VzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgaW5pdGlhbE10aW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZE10aW1lID0gaW5pdGlhbE10aW1lICsgMTAwMDtcclxuXHRcdFx0Y29uc3QgaW5pdGlhbEZyb250bWF0dGVyID0geyBwcmlvcml0eTogXCJoaWdoXCIgfTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZEZyb250bWF0dGVyID0geyBwcmlvcml0eTogXCJsb3dcIiB9O1xyXG5cclxuXHRcdFx0Ly8gU2V0dXAgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoLCBjcmVhdGVNb2NrRmlsZShmaWxlUGF0aCwgaW5pdGlhbE10aW1lKSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YS5zZXQoZmlsZVBhdGgsIGluaXRpYWxGcm9udG1hdHRlcik7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBjYWxsXHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBhd2FpdCBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVQYXRoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEpLnRvRXF1YWwoaW5pdGlhbEZyb250bWF0dGVyKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBmaWxlXHJcblx0XHRcdG1vY2tGaWxlcy5zZXQoZmlsZVBhdGgsIGNyZWF0ZU1vY2tGaWxlKGZpbGVQYXRoLCB1cGRhdGVkTXRpbWUpKTtcclxuXHRcdFx0bW9ja01ldGFkYXRhLnNldChmaWxlUGF0aCwgdXBkYXRlZEZyb250bWF0dGVyKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjYWxsIC0gc2hvdWxkIGRldGVjdCBjaGFuZ2UgYW5kIHJldHVybiBuZXcgZGF0YVxyXG5cdFx0XHRjb25zdCByZXN1bHQyID0gYXdhaXQgcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQyKS50b0VxdWFsKHVwZGF0ZWRGcm9udG1hdHRlcik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDYWNoZSBzdGF0aXN0aWNzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByb3ZpZGUgYWNjdXJhdGUgY2FjaGUgc3RhdGlzdGljc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoMSA9IFwidGVzdDEubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGgyID0gXCJ0ZXN0Mi5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHQvLyBTZXR1cCBmaWxlc1xyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoMSwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgxLCBtdGltZSkpO1xyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoMiwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgyLCBtdGltZSkpO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGEuc2V0KGZpbGVQYXRoMSwgeyBwcm9qZWN0OiBcInRlc3QxXCIgfSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YS5zZXQoZmlsZVBhdGgyLCB7IHByb2plY3Q6IFwidGVzdDJcIiB9KTtcclxuXHJcblx0XHRcdC8vIExvYWQgZGF0YSBpbnRvIGNhY2hlXHJcblx0XHRcdHByb2plY3RDb25maWdNYW5hZ2VyLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aDEpO1xyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgyKTtcclxuXHJcblx0XHRcdGNvbnN0IHN0YXRzID0gcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0Q2FjaGVTdGF0cygpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZmlsZU1ldGFkYXRhQ2FjaGUuc2l6ZSkudG9CZSgyKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLnRvdGFsTWVtb3J5VXNhZ2UuZXN0aW1hdGVkQnl0ZXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNhY2hlIGNsZWFyaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNsZWFyIHNwZWNpZmljIGZpbGUgZnJvbSBhbGwgcmVsYXRlZCBjYWNoZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoLCBjcmVhdGVNb2NrRmlsZShmaWxlUGF0aCwgbXRpbWUpKTtcclxuXHRcdFx0bW9ja01ldGFkYXRhLnNldChmaWxlUGF0aCwgeyBwcm9qZWN0OiBcInRlc3RcIiB9KTtcclxuXHJcblx0XHRcdC8vIExvYWQgZGF0YSBpbnRvIGNhY2hlc1xyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpO1xyXG5cdFx0XHRhd2FpdCBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBkYXRhIGlzIGNhY2hlZFxyXG5cdFx0XHRsZXQgc3RhdHMgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRDYWNoZVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChzdGF0cy5maWxlTWV0YWRhdGFDYWNoZS5zaXplKS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZW5oYW5jZWRNZXRhZGF0YUNhY2hlLnNpemUpLnRvQmUoMSk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgZmlsZVxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlci5jbGVhckNhY2hlKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBjYWNoZSBpcyBjbGVhcmVkXHJcblx0XHRcdHN0YXRzID0gcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0Q2FjaGVTdGF0cygpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZmlsZU1ldGFkYXRhQ2FjaGUuc2l6ZSkudG9CZSgwKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLmVuaGFuY2VkTWV0YWRhdGFDYWNoZS5zaXplKS50b0JlKDApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY2xlYXIgYWxsIGNhY2hlcyB3aGVuIG5vIGZpbGUgcGF0aCBwcm92aWRlZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoMSA9IFwidGVzdDEubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGgyID0gXCJ0ZXN0Mi5tZFwiO1xyXG5cdFx0XHRjb25zdCBtdGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoMSwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgxLCBtdGltZSkpO1xyXG5cdFx0XHRtb2NrRmlsZXMuc2V0KGZpbGVQYXRoMiwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgyLCBtdGltZSkpO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGEuc2V0KGZpbGVQYXRoMSwgeyBwcm9qZWN0OiBcInRlc3QxXCIgfSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YS5zZXQoZmlsZVBhdGgyLCB7IHByb2plY3Q6IFwidGVzdDJcIiB9KTtcclxuXHJcblx0XHRcdC8vIExvYWQgZGF0YSBpbnRvIGNhY2hlc1xyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgxKTtcclxuXHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RmlsZU1ldGFkYXRhKGZpbGVQYXRoMik7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgZGF0YSBpcyBjYWNoZWRcclxuXHRcdFx0bGV0IHN0YXRzID0gcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0Q2FjaGVTdGF0cygpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZmlsZU1ldGFkYXRhQ2FjaGUuc2l6ZSkudG9CZSgyKTtcclxuXHJcblx0XHRcdC8vIENsZWFyIGFsbCBjYWNoZXNcclxuXHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXIuY2xlYXJDYWNoZSgpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGFsbCBjYWNoZXMgYXJlIGNsZWFyZWRcclxuXHRcdFx0c3RhdHMgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRDYWNoZVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChzdGF0cy5maWxlTWV0YWRhdGFDYWNoZS5zaXplKS50b0JlKDApO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZW5oYW5jZWRNZXRhZGF0YUNhY2hlLnNpemUpLnRvQmUoMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJTdGFsZSBjYWNoZSBjbGVhbnVwXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJlbW92ZSBzdGFsZSBlbnRyaWVzIHdoZW4gY2xlYXJTdGFsZUVudHJpZXMgaXMgY2FsbGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgaW5pdGlhbE10aW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSB7IHByb2plY3Q6IFwidGVzdFwiIH07XHJcblxyXG5cdFx0XHQvLyBTZXR1cCBpbml0aWFsIGZpbGVcclxuXHRcdFx0bW9ja0ZpbGVzLnNldChmaWxlUGF0aCwgY3JlYXRlTW9ja0ZpbGUoZmlsZVBhdGgsIGluaXRpYWxNdGltZSkpO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGEuc2V0KGZpbGVQYXRoLCBmcm9udG1hdHRlcik7XHJcblxyXG5cdFx0XHQvLyBMb2FkIGludG8gY2FjaGVcclxuXHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0RmlsZU1ldGFkYXRhKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBjYWNoZSBpcyBwb3B1bGF0ZWRcclxuXHRcdFx0bGV0IHN0YXRzID0gcHJvamVjdENvbmZpZ01hbmFnZXIuZ2V0Q2FjaGVTdGF0cygpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMuZmlsZU1ldGFkYXRhQ2FjaGUuc2l6ZSkudG9CZSgxKTtcclxuXHJcblx0XHRcdC8vIFNpbXVsYXRlIGZpbGUgZGVsZXRpb24gYnkgcmVtb3ZpbmcgZnJvbSBtb2NrIHZhdWx0XHJcblx0XHRcdG1vY2tGaWxlcy5kZWxldGUoZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgc3RhbGUgZW50cmllc1xyXG5cdFx0XHRjb25zdCBjbGVhcmVkQ291bnQgPSBhd2FpdCBwcm9qZWN0Q29uZmlnTWFuYWdlci5jbGVhclN0YWxlRW50cmllcygpO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJlZENvdW50KS50b0JlKDEpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGNhY2hlIGlzIGNsZWFuZWRcclxuXHRcdFx0c3RhdHMgPSBwcm9qZWN0Q29uZmlnTWFuYWdlci5nZXRDYWNoZVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChzdGF0cy5maWxlTWV0YWRhdGFDYWNoZS5zaXplKS50b0JlKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pOyJdfQ==