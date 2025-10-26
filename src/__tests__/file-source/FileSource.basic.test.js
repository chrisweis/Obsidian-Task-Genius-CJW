/**
 * Basic tests for FileSource
 */
import { __awaiter } from "tslib";
import { FileSource } from "../../dataflow/sources/FileSource";
// Mock Obsidian API
const mockApp = {
    vault: {
        getAbstractFileByPath: jest.fn(),
        cachedRead: jest.fn(),
        offref: jest.fn(),
        getMarkdownFiles: jest.fn(() => [])
    },
    metadataCache: {
        getFileCache: jest.fn()
    },
    workspace: {
        trigger: jest.fn(),
        on: jest.fn(() => ({ unload: jest.fn() }))
    }
};
// Mock file object
const mockFile = {
    path: 'test.md',
    stat: {
        ctime: 1000000,
        mtime: 2000000
    }
};
describe('FileSource', () => {
    let fileSource;
    let config;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        config = {
            enabled: false,
            recognitionStrategies: {
                metadata: {
                    enabled: true,
                    taskFields: ['dueDate', 'status'],
                    requireAllFields: false
                },
                tags: {
                    enabled: true,
                    taskTags: ['#task', '#todo'],
                    matchMode: 'exact'
                },
                templates: {
                    enabled: false,
                    templatePaths: [],
                    checkTemplateMetadata: true
                },
                paths: {
                    enabled: false,
                    taskPaths: [],
                    matchMode: 'prefix'
                }
            },
            fileTaskProperties: {
                contentSource: 'filename',
                stripExtension: true,
                defaultStatus: ' ',
                preferFrontmatterTitle: true
            },
            performance: {
                enableWorkerProcessing: false,
                enableCaching: true,
                cacheTTL: 300000
            },
        };
        fileSource = new FileSource(mockApp, config);
    });
    afterEach(() => {
        if (fileSource) {
            fileSource.destroy();
        }
    });
    describe('initialization', () => {
        it('should initialize with provided configuration', () => {
            expect(fileSource).toBeInstanceOf(FileSource);
        });
        it('should not initialize when disabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            fileSource.initialize();
            expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('[FileSource] Initializing'));
            consoleSpy.mockRestore();
        });
        it('should initialize when enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            // Enable FileSource
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[FileSource] Initializing'));
            consoleSpy.mockRestore();
        });
        it('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            fileSource.initialize(); // Second call
            // Should only log once
            const initLogs = consoleSpy.mock.calls.filter((call) => { var _a; return (_a = call[0]) === null || _a === void 0 ? void 0 : _a.includes('[FileSource] Initializing'); });
            expect(initLogs).toHaveLength(1);
            consoleSpy.mockRestore();
        });
    });
    describe('file relevance checking', () => {
        beforeEach(() => {
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
        });
        it('should identify markdown files as relevant', () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.cachedRead.mockResolvedValue('# Test content');
            mockApp.metadataCache.getFileCache.mockReturnValue({});
            const result = yield fileSource.shouldCreateFileTask('test.md');
            // Should not throw error and should process the file
            expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith('test.md');
        }));
        it('should reject non-markdown files', () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.getAbstractFileByPath.mockReturnValue(Object.assign(Object.assign({}, mockFile), { path: 'test.txt' }));
            const result = yield fileSource.shouldCreateFileTask('test.txt');
            expect(result).toBe(false);
            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        }));
        it('should reject excluded patterns', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield fileSource.shouldCreateFileTask('.obsidian/workspace.json');
            expect(result).toBe(false);
            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        }));
        it('should reject hidden files', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield fileSource.shouldCreateFileTask('.hidden-file.md');
            expect(result).toBe(false);
            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        }));
    });
    describe('metadata-based recognition', () => {
        beforeEach(() => {
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.cachedRead.mockResolvedValue('# Test content');
        });
        it('should recognize file with task metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                frontmatter: {
                    dueDate: '2024-01-01',
                    status: 'pending'
                }
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(true);
        }));
        it('should recognize file with any task field when requireAllFields is false', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                frontmatter: {
                    dueDate: '2024-01-01'
                    // missing 'status' but requireAllFields is false
                }
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(true);
        }));
        it('should not recognize file without task metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                frontmatter: {
                    title: 'Test File',
                    description: 'Just a regular file'
                }
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(false);
        }));
        it('should not recognize file without frontmatter', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {};
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(false);
        }));
    });
    describe('tag-based recognition', () => {
        beforeEach(() => {
            fileSource.updateConfiguration({
                enabled: true,
                recognitionStrategies: {
                    metadata: {
                        enabled: false,
                        taskFields: config.recognitionStrategies.metadata.taskFields,
                        requireAllFields: config.recognitionStrategies.metadata.requireAllFields
                    },
                    tags: {
                        enabled: true,
                        taskTags: config.recognitionStrategies.tags.taskTags,
                        matchMode: config.recognitionStrategies.tags.matchMode
                    },
                    templates: config.recognitionStrategies.templates,
                    paths: config.recognitionStrategies.paths
                }
            });
            fileSource.initialize();
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.cachedRead.mockResolvedValue('# Test content');
        });
        it('should recognize file with task tags', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                tags: [
                    { tag: '#task' },
                    { tag: '#important' }
                ]
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(true);
        }));
        it('should not recognize file without task tags', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                tags: [
                    { tag: '#note' },
                    { tag: '#reference' }
                ]
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(false);
        }));
        it('should not recognize file without tags', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {};
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const result = yield fileSource.shouldCreateFileTask('test.md');
            expect(result).toBe(false);
        }));
    });
    describe('task creation', () => {
        beforeEach(() => {
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.cachedRead.mockResolvedValue('# Test content');
        });
        it('should create file task with correct structure', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                frontmatter: {
                    dueDate: '2024-01-01',
                    status: 'x',
                    priority: 2,
                    project: 'Test Project'
                }
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const task = yield fileSource.createFileTask('test.md');
            expect(task).toBeTruthy();
            expect(task.id).toBe('file-source:test.md');
            expect(task.content).toBe('test'); // filename without extension
            expect(task.filePath).toBe('test.md');
            expect(task.line).toBe(0);
            expect(task.completed).toBe(true); // status is 'x'
            expect(task.status).toBe('x');
            expect(task.metadata.source).toBe('file-source');
            expect(task.metadata.recognitionStrategy).toBe('metadata');
            expect(task.metadata.fileTimestamps.created).toBe(1000000);
            expect(task.metadata.fileTimestamps.modified).toBe(2000000);
            expect(task.metadata.priority).toBe(2);
            expect(task.metadata.project).toBe('Test Project');
        }));
        it('should use default status when not specified', () => __awaiter(void 0, void 0, void 0, function* () {
            const fileCache = {
                frontmatter: {
                    dueDate: '2024-01-01'
                }
            };
            mockApp.metadataCache.getFileCache.mockReturnValue(fileCache);
            const task = yield fileSource.createFileTask('test.md');
            expect(task.status).toBe(' '); // default status
            expect(task.completed).toBe(false);
        }));
        it('should handle missing file gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
            const task = yield fileSource.createFileTask('nonexistent.md');
            expect(task).toBeNull();
        }));
        it('should handle file read errors gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.cachedRead.mockRejectedValue(new Error('File read error'));
            const task = yield fileSource.createFileTask('test.md');
            expect(task).toBeNull();
        }));
    });
    describe('statistics', () => {
        it('should provide initial statistics', () => {
            const stats = fileSource.getStats();
            expect(stats.initialized).toBe(false);
            expect(stats.trackedFileCount).toBe(0);
            expect(stats.recognitionBreakdown.metadata).toBe(0);
            expect(stats.recognitionBreakdown.tag).toBe(0);
            expect(stats.lastUpdate).toBe(0);
            expect(stats.lastUpdateSeq).toBe(0);
        });
    });
    describe('configuration updates', () => {
        it('should update configuration', () => {
            const newConfig = { enabled: true };
            fileSource.updateConfiguration(newConfig);
            // Configuration should be updated (we can't directly test it without exposing the config)
            // But we can test that it doesn't throw errors
            expect(() => fileSource.updateConfiguration(newConfig)).not.toThrow();
        });
    });
    describe('cleanup', () => {
        it('should destroy cleanly', () => {
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            expect(() => fileSource.destroy()).not.toThrow();
            const stats = fileSource.getStats();
            expect(stats.initialized).toBe(false);
            expect(stats.trackedFileCount).toBe(0);
        });
        it('should handle destroy when not initialized', () => {
            expect(() => fileSource.destroy()).not.toThrow();
        });
    });
    describe('refresh', () => {
        it('should handle refresh when disabled', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(fileSource.refresh()).resolves.not.toThrow();
        }));
        it('should handle refresh when enabled', () => __awaiter(void 0, void 0, void 0, function* () {
            fileSource.updateConfiguration({ enabled: true });
            fileSource.initialize();
            yield expect(fileSource.refresh()).resolves.not.toThrow();
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVNvdXJjZS5iYXNpYy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZVNvdXJjZS5iYXNpYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHOztBQUVILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUcvRCxvQkFBb0I7QUFDcEIsTUFBTSxPQUFPLEdBQUc7SUFDZCxLQUFLLEVBQUU7UUFDTCxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ2hDLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ2pCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO0tBQ3BDO0lBQ0QsYUFBYSxFQUFFO1FBQ2IsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7S0FDeEI7SUFDRCxTQUFTLEVBQUU7UUFDVCxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUNsQixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDM0M7Q0FDSyxDQUFDO0FBRVQsbUJBQW1CO0FBQ25CLE1BQU0sUUFBUSxHQUFHO0lBQ2YsSUFBSSxFQUFFLFNBQVM7SUFDZixJQUFJLEVBQUU7UUFDSixLQUFLLEVBQUUsT0FBTztRQUNkLEtBQUssRUFBRSxPQUFPO0tBQ2Y7Q0FDRixDQUFDO0FBRUYsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxVQUFzQixDQUFDO0lBQzNCLElBQUksTUFBd0MsQ0FBQztJQUU3QyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2Qsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxhQUFhLEVBQUUs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SSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3BELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFTLEVBQUU7WUFDbkQsTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1RCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQVMsRUFBRTtZQUNsRCxVQUFVLENBQUMsbUJBQW1CLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFFeEIsTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBCYXNpYyB0ZXN0cyBmb3IgRmlsZVNvdXJjZVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEZpbGVTb3VyY2UgfSBmcm9tIFwiLi4vLi4vZGF0YWZsb3cvc291cmNlcy9GaWxlU291cmNlXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24gfSBmcm9tIFwiLi4vLi4vdHlwZXMvZmlsZS1zb3VyY2VcIjtcclxuXHJcbi8vIE1vY2sgT2JzaWRpYW4gQVBJXHJcbmNvbnN0IG1vY2tBcHAgPSB7XHJcbiAgdmF1bHQ6IHtcclxuICAgIGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG4gICAgY2FjaGVkUmVhZDogamVzdC5mbigpLFxyXG4gICAgb2ZmcmVmOiBqZXN0LmZuKCksXHJcbiAgICBnZXRNYXJrZG93bkZpbGVzOiBqZXN0LmZuKCgpID0+IFtdKVxyXG4gIH0sXHJcbiAgbWV0YWRhdGFDYWNoZToge1xyXG4gICAgZ2V0RmlsZUNhY2hlOiBqZXN0LmZuKClcclxuICB9LFxyXG4gIHdvcmtzcGFjZToge1xyXG4gICAgdHJpZ2dlcjogamVzdC5mbigpLFxyXG4gICAgb246IGplc3QuZm4oKCkgPT4gKHsgdW5sb2FkOiBqZXN0LmZuKCkgfSkpXHJcbiAgfVxyXG59IGFzIGFueTtcclxuXHJcbi8vIE1vY2sgZmlsZSBvYmplY3RcclxuY29uc3QgbW9ja0ZpbGUgPSB7XHJcbiAgcGF0aDogJ3Rlc3QubWQnLFxyXG4gIHN0YXQ6IHtcclxuICAgIGN0aW1lOiAxMDAwMDAwLFxyXG4gICAgbXRpbWU6IDIwMDAwMDBcclxuICB9XHJcbn07XHJcblxyXG5kZXNjcmliZSgnRmlsZVNvdXJjZScsICgpID0+IHtcclxuICBsZXQgZmlsZVNvdXJjZTogRmlsZVNvdXJjZTtcclxuICBsZXQgY29uZmlnOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPjtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAvLyBSZXNldCBhbGwgbW9ja3NcclxuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gICAgXHJcbiAgICBjb25maWcgPSB7XHJcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICByZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIHRhc2tGaWVsZHM6IFsnZHVlRGF0ZScsICdzdGF0dXMnXSxcclxuICAgICAgICAgIHJlcXVpcmVBbGxGaWVsZHM6IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0YWdzOiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgdGFza1RhZ3M6IFsnI3Rhc2snLCAnI3RvZG8nXSxcclxuICAgICAgICAgIG1hdGNoTW9kZTogJ2V4YWN0J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgIHRlbXBsYXRlUGF0aHM6IFtdLFxyXG4gICAgICAgICAgY2hlY2tUZW1wbGF0ZU1ldGFkYXRhOiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXRoczoge1xyXG4gICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICB0YXNrUGF0aHM6IFtdLFxyXG4gICAgICAgICAgbWF0Y2hNb2RlOiAncHJlZml4J1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgZmlsZVRhc2tQcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgY29udGVudFNvdXJjZTogJ2ZpbGVuYW1lJyxcclxuICAgICAgICBzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuICAgICAgICBkZWZhdWx0U3RhdHVzOiAnICcsXHJcbiAgICAgICAgcHJlZmVyRnJvbnRtYXR0ZXJUaXRsZTogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICBwZXJmb3JtYW5jZToge1xyXG4gICAgICAgIGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IGZhbHNlLFxyXG4gICAgICAgIGVuYWJsZUNhY2hpbmc6IHRydWUsXHJcbiAgICAgICAgY2FjaGVUVEw6IDMwMDAwMFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBmaWxlU291cmNlID0gbmV3IEZpbGVTb3VyY2UobW9ja0FwcCwgY29uZmlnKTtcclxuICB9KTtcclxuXHJcbiAgYWZ0ZXJFYWNoKCgpID0+IHtcclxuICAgIGlmIChmaWxlU291cmNlKSB7XHJcbiAgICAgIGZpbGVTb3VyY2UuZGVzdHJveSgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnaW5pdGlhbGl6YXRpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGluaXRpYWxpemUgd2l0aCBwcm92aWRlZCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG4gICAgICBleHBlY3QoZmlsZVNvdXJjZSkudG9CZUluc3RhbmNlT2YoRmlsZVNvdXJjZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIG5vdCBpbml0aWFsaXplIHdoZW4gZGlzYWJsZWQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbnNvbGVTcHkgPSBqZXN0LnNweU9uKGNvbnNvbGUsICdsb2cnKS5tb2NrSW1wbGVtZW50YXRpb24oKTtcclxuICAgICAgXHJcbiAgICAgIGZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KGNvbnNvbGVTcHkpLm5vdC50b0hhdmVCZWVuQ2FsbGVkV2l0aChleHBlY3Quc3RyaW5nQ29udGFpbmluZygnW0ZpbGVTb3VyY2VdIEluaXRpYWxpemluZycpKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGVTcHkubW9ja1Jlc3RvcmUoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaW5pdGlhbGl6ZSB3aGVuIGVuYWJsZWQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbnNvbGVTcHkgPSBqZXN0LnNweU9uKGNvbnNvbGUsICdsb2cnKS5tb2NrSW1wbGVtZW50YXRpb24oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEVuYWJsZSBGaWxlU291cmNlXHJcbiAgICAgIGZpbGVTb3VyY2UudXBkYXRlQ29uZmlndXJhdGlvbih7IGVuYWJsZWQ6IHRydWUgfSk7XHJcbiAgICAgIGZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KGNvbnNvbGVTcHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdbRmlsZVNvdXJjZV0gSW5pdGlhbGl6aW5nJykpO1xyXG4gICAgICBcclxuICAgICAgY29uc29sZVNweS5tb2NrUmVzdG9yZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBub3QgaW5pdGlhbGl6ZSB0d2ljZScsICgpID0+IHtcclxuICAgICAgY29uc3QgY29uc29sZVNweSA9IGplc3Quc3B5T24oY29uc29sZSwgJ2xvZycpLm1vY2tJbXBsZW1lbnRhdGlvbigpO1xyXG4gICAgICBcclxuICAgICAgZmlsZVNvdXJjZS51cGRhdGVDb25maWd1cmF0aW9uKHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgZmlsZVNvdXJjZS5pbml0aWFsaXplKCk7XHJcbiAgICAgIGZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpOyAvLyBTZWNvbmQgY2FsbFxyXG4gICAgICBcclxuICAgICAgLy8gU2hvdWxkIG9ubHkgbG9nIG9uY2VcclxuICAgICAgY29uc3QgaW5pdExvZ3MgPSBjb25zb2xlU3B5Lm1vY2suY2FsbHMuZmlsdGVyKChjYWxsOiBhbnlbXSkgPT4gXHJcbiAgICAgICAgY2FsbFswXT8uaW5jbHVkZXMoJ1tGaWxlU291cmNlXSBJbml0aWFsaXppbmcnKVxyXG4gICAgICApO1xyXG4gICAgICBleHBlY3QoaW5pdExvZ3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGVTcHkubW9ja1Jlc3RvcmUoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZmlsZSByZWxldmFuY2UgY2hlY2tpbmcnLCAoKSA9PiB7XHJcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgICAgZmlsZVNvdXJjZS51cGRhdGVDb25maWd1cmF0aW9uKHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgZmlsZVNvdXJjZS5pbml0aWFsaXplKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGlkZW50aWZ5IG1hcmtkb3duIGZpbGVzIGFzIHJlbGV2YW50JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmNhY2hlZFJlYWQubW9ja1Jlc29sdmVkVmFsdWUoJyMgVGVzdCBjb250ZW50Jyk7XHJcbiAgICAgIG1vY2tBcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHt9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFNob3VsZCBub3QgdGhyb3cgZXJyb3IgYW5kIHNob3VsZCBwcm9jZXNzIHRoZSBmaWxlXHJcbiAgICAgIGV4cGVjdChtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Rlc3QubWQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmVqZWN0IG5vbi1tYXJrZG93biBmaWxlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0FwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKHsgXHJcbiAgICAgICAgLi4ubW9ja0ZpbGUsIFxyXG4gICAgICAgIHBhdGg6ICd0ZXN0LnR4dCcgXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmlsZVNvdXJjZS5zaG91bGRDcmVhdGVGaWxlVGFzaygndGVzdC50eHQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBleHBlY3QobW9ja0FwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlamVjdCBleGNsdWRlZCBwYXR0ZXJucycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmlsZVNvdXJjZS5zaG91bGRDcmVhdGVGaWxlVGFzaygnLm9ic2lkaWFuL3dvcmtzcGFjZS5qc29uJyk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgaGlkZGVuIGZpbGVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaWxlU291cmNlLnNob3VsZENyZWF0ZUZpbGVUYXNrKCcuaGlkZGVuLWZpbGUubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBleHBlY3QobW9ja0FwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ21ldGFkYXRhLWJhc2VkIHJlY29nbml0aW9uJywgKCkgPT4ge1xyXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgIGZpbGVTb3VyY2UudXBkYXRlQ29uZmlndXJhdGlvbih7IGVuYWJsZWQ6IHRydWUgfSk7XHJcbiAgICAgIGZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmNhY2hlZFJlYWQubW9ja1Jlc29sdmVkVmFsdWUoJyMgVGVzdCBjb250ZW50Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlY29nbml6ZSBmaWxlIHdpdGggdGFzayBtZXRhZGF0YScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZUNhY2hlID0ge1xyXG4gICAgICAgIGZyb250bWF0dGVyOiB7XHJcbiAgICAgICAgICBkdWVEYXRlOiAnMjAyNC0wMS0wMScsXHJcbiAgICAgICAgICBzdGF0dXM6ICdwZW5kaW5nJ1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgbW9ja0FwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoZmlsZUNhY2hlKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlY29nbml6ZSBmaWxlIHdpdGggYW55IHRhc2sgZmllbGQgd2hlbiByZXF1aXJlQWxsRmllbGRzIGlzIGZhbHNlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlQ2FjaGUgPSB7XHJcbiAgICAgICAgZnJvbnRtYXR0ZXI6IHtcclxuICAgICAgICAgIGR1ZURhdGU6ICcyMDI0LTAxLTAxJ1xyXG4gICAgICAgICAgLy8gbWlzc2luZyAnc3RhdHVzJyBidXQgcmVxdWlyZUFsbEZpZWxkcyBpcyBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgbW9ja0FwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoZmlsZUNhY2hlKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIG5vdCByZWNvZ25pemUgZmlsZSB3aXRob3V0IHRhc2sgbWV0YWRhdGEnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuICAgICAgICBmcm9udG1hdHRlcjoge1xyXG4gICAgICAgICAgdGl0bGU6ICdUZXN0IEZpbGUnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdKdXN0IGEgcmVndWxhciBmaWxlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgbW9ja0FwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoZmlsZUNhY2hlKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBub3QgcmVjb2duaXplIGZpbGUgd2l0aG91dCBmcm9udG1hdHRlcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZUNhY2hlID0ge307XHJcbiAgICAgIG1vY2tBcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKGZpbGVDYWNoZSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaWxlU291cmNlLnNob3VsZENyZWF0ZUZpbGVUYXNrKCd0ZXN0Lm1kJyk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgndGFnLWJhc2VkIHJlY29nbml0aW9uJywgKCkgPT4ge1xyXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgIGZpbGVTb3VyY2UudXBkYXRlQ29uZmlndXJhdGlvbih7IFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgcmVjb2duaXRpb25TdHJhdGVnaWVzOiB7XHJcbiAgICAgICAgICBtZXRhZGF0YTogeyBcclxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIHRhc2tGaWVsZHM6IGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMhLm1ldGFkYXRhLnRhc2tGaWVsZHMsXHJcbiAgICAgICAgICAgIHJlcXVpcmVBbGxGaWVsZHM6IGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMhLm1ldGFkYXRhLnJlcXVpcmVBbGxGaWVsZHNcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0YWdzOiB7IFxyXG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICB0YXNrVGFnczogY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcyEudGFncy50YXNrVGFncyxcclxuICAgICAgICAgICAgbWF0Y2hNb2RlOiBjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzIS50YWdzLm1hdGNoTW9kZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRlbXBsYXRlczogY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcyEudGVtcGxhdGVzLFxyXG4gICAgICAgICAgcGF0aHM6IGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMhLnBhdGhzXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgZmlsZVNvdXJjZS5pbml0aWFsaXplKCk7XHJcbiAgICAgIG1vY2tBcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcbiAgICAgIG1vY2tBcHAudmF1bHQuY2FjaGVkUmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZSgnIyBUZXN0IGNvbnRlbnQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmVjb2duaXplIGZpbGUgd2l0aCB0YXNrIHRhZ3MnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuICAgICAgICB0YWdzOiBbXHJcbiAgICAgICAgICB7IHRhZzogJyN0YXNrJyB9LFxyXG4gICAgICAgICAgeyB0YWc6ICcjaW1wb3J0YW50JyB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9O1xyXG4gICAgICBtb2NrQXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZShmaWxlQ2FjaGUpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmlsZVNvdXJjZS5zaG91bGRDcmVhdGVGaWxlVGFzaygndGVzdC5tZCcpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgbm90IHJlY29nbml6ZSBmaWxlIHdpdGhvdXQgdGFzayB0YWdzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlQ2FjaGUgPSB7XHJcbiAgICAgICAgdGFnczogW1xyXG4gICAgICAgICAgeyB0YWc6ICcjbm90ZScgfSxcclxuICAgICAgICAgIHsgdGFnOiAnI3JlZmVyZW5jZScgfVxyXG4gICAgICAgIF1cclxuICAgICAgfTtcclxuICAgICAgbW9ja0FwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoZmlsZUNhY2hlKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBub3QgcmVjb2duaXplIGZpbGUgd2l0aG91dCB0YWdzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlQ2FjaGUgPSB7fTtcclxuICAgICAgbW9ja0FwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoZmlsZUNhY2hlKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVTb3VyY2Uuc2hvdWxkQ3JlYXRlRmlsZVRhc2soJ3Rlc3QubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCd0YXNrIGNyZWF0aW9uJywgKCkgPT4ge1xyXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgIGZpbGVTb3VyY2UudXBkYXRlQ29uZmlndXJhdGlvbih7IGVuYWJsZWQ6IHRydWUgfSk7XHJcbiAgICAgIGZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmNhY2hlZFJlYWQubW9ja1Jlc29sdmVkVmFsdWUoJyMgVGVzdCBjb250ZW50Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBmaWxlIHRhc2sgd2l0aCBjb3JyZWN0IHN0cnVjdHVyZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZUNhY2hlID0ge1xyXG4gICAgICAgIGZyb250bWF0dGVyOiB7XHJcbiAgICAgICAgICBkdWVEYXRlOiAnMjAyNC0wMS0wMScsXHJcbiAgICAgICAgICBzdGF0dXM6ICd4JyxcclxuICAgICAgICAgIHByaW9yaXR5OiAyLFxyXG4gICAgICAgICAgcHJvamVjdDogJ1Rlc3QgUHJvamVjdCdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIG1vY2tBcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKGZpbGVDYWNoZSk7XHJcblxyXG4gICAgICBjb25zdCB0YXNrID0gYXdhaXQgZmlsZVNvdXJjZS5jcmVhdGVGaWxlVGFzaygndGVzdC5tZCcpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KHRhc2spLnRvQmVUcnV0aHkoKTtcclxuICAgICAgZXhwZWN0KHRhc2shLmlkKS50b0JlKCdmaWxlLXNvdXJjZTp0ZXN0Lm1kJyk7XHJcbiAgICAgIGV4cGVjdCh0YXNrIS5jb250ZW50KS50b0JlKCd0ZXN0Jyk7IC8vIGZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXHJcbiAgICAgIGV4cGVjdCh0YXNrIS5maWxlUGF0aCkudG9CZSgndGVzdC5tZCcpO1xyXG4gICAgICBleHBlY3QodGFzayEubGluZSkudG9CZSgwKTtcclxuICAgICAgZXhwZWN0KHRhc2shLmNvbXBsZXRlZCkudG9CZSh0cnVlKTsgLy8gc3RhdHVzIGlzICd4J1xyXG4gICAgICBleHBlY3QodGFzayEuc3RhdHVzKS50b0JlKCd4Jyk7XHJcbiAgICAgIGV4cGVjdCh0YXNrIS5tZXRhZGF0YS5zb3VyY2UpLnRvQmUoJ2ZpbGUtc291cmNlJyk7XHJcbiAgICAgIGV4cGVjdCh0YXNrIS5tZXRhZGF0YS5yZWNvZ25pdGlvblN0cmF0ZWd5KS50b0JlKCdtZXRhZGF0YScpO1xyXG4gICAgICBleHBlY3QodGFzayEubWV0YWRhdGEuZmlsZVRpbWVzdGFtcHMuY3JlYXRlZCkudG9CZSgxMDAwMDAwKTtcclxuICAgICAgZXhwZWN0KHRhc2shLm1ldGFkYXRhLmZpbGVUaW1lc3RhbXBzLm1vZGlmaWVkKS50b0JlKDIwMDAwMDApO1xyXG4gICAgICBleHBlY3QodGFzayEubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoMik7XHJcbiAgICAgIGV4cGVjdCh0YXNrIS5tZXRhZGF0YS5wcm9qZWN0KS50b0JlKCdUZXN0IFByb2plY3QnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdXNlIGRlZmF1bHQgc3RhdHVzIHdoZW4gbm90IHNwZWNpZmllZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZUNhY2hlID0ge1xyXG4gICAgICAgIGZyb250bWF0dGVyOiB7XHJcbiAgICAgICAgICBkdWVEYXRlOiAnMjAyNC0wMS0wMSdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIG1vY2tBcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKGZpbGVDYWNoZSk7XHJcblxyXG4gICAgICBjb25zdCB0YXNrID0gYXdhaXQgZmlsZVNvdXJjZS5jcmVhdGVGaWxlVGFzaygndGVzdC5tZCcpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KHRhc2shLnN0YXR1cykudG9CZSgnICcpOyAvLyBkZWZhdWx0IHN0YXR1c1xyXG4gICAgICBleHBlY3QodGFzayEuY29tcGxldGVkKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG1pc3NpbmcgZmlsZSBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobnVsbCk7XHJcblxyXG4gICAgICBjb25zdCB0YXNrID0gYXdhaXQgZmlsZVNvdXJjZS5jcmVhdGVGaWxlVGFzaygnbm9uZXhpc3RlbnQubWQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdCh0YXNrKS50b0JlTnVsbCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZmlsZSByZWFkIGVycm9ycyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrQXBwLnZhdWx0LmNhY2hlZFJlYWQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdGaWxlIHJlYWQgZXJyb3InKSk7XHJcblxyXG4gICAgICBjb25zdCB0YXNrID0gYXdhaXQgZmlsZVNvdXJjZS5jcmVhdGVGaWxlVGFzaygndGVzdC5tZCcpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KHRhc2spLnRvQmVOdWxsKCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3N0YXRpc3RpY3MnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHByb3ZpZGUgaW5pdGlhbCBzdGF0aXN0aWNzJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzdGF0cyA9IGZpbGVTb3VyY2UuZ2V0U3RhdHMoKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChzdGF0cy5pbml0aWFsaXplZCkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChzdGF0cy50cmFja2VkRmlsZUNvdW50KS50b0JlKDApO1xyXG4gICAgICBleHBlY3Qoc3RhdHMucmVjb2duaXRpb25CcmVha2Rvd24ubWV0YWRhdGEpLnRvQmUoMCk7XHJcbiAgICAgIGV4cGVjdChzdGF0cy5yZWNvZ25pdGlvbkJyZWFrZG93bi50YWcpLnRvQmUoMCk7XHJcbiAgICAgIGV4cGVjdChzdGF0cy5sYXN0VXBkYXRlKS50b0JlKDApO1xyXG4gICAgICBleHBlY3Qoc3RhdHMubGFzdFVwZGF0ZVNlcSkudG9CZSgwKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnY29uZmlndXJhdGlvbiB1cGRhdGVzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCB1cGRhdGUgY29uZmlndXJhdGlvbicsICgpID0+IHtcclxuICAgICAgY29uc3QgbmV3Q29uZmlnID0geyBlbmFibGVkOiB0cnVlIH07XHJcbiAgICAgIFxyXG4gICAgICBmaWxlU291cmNlLnVwZGF0ZUNvbmZpZ3VyYXRpb24obmV3Q29uZmlnKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENvbmZpZ3VyYXRpb24gc2hvdWxkIGJlIHVwZGF0ZWQgKHdlIGNhbid0IGRpcmVjdGx5IHRlc3QgaXQgd2l0aG91dCBleHBvc2luZyB0aGUgY29uZmlnKVxyXG4gICAgICAvLyBCdXQgd2UgY2FuIHRlc3QgdGhhdCBpdCBkb2Vzbid0IHRocm93IGVycm9yc1xyXG4gICAgICBleHBlY3QoKCkgPT4gZmlsZVNvdXJjZS51cGRhdGVDb25maWd1cmF0aW9uKG5ld0NvbmZpZykpLm5vdC50b1Rocm93KCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ2NsZWFudXAnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGRlc3Ryb3kgY2xlYW5seScsICgpID0+IHtcclxuICAgICAgZmlsZVNvdXJjZS51cGRhdGVDb25maWd1cmF0aW9uKHsgZW5hYmxlZDogdHJ1ZSB9KTtcclxuICAgICAgZmlsZVNvdXJjZS5pbml0aWFsaXplKCk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QoKCkgPT4gZmlsZVNvdXJjZS5kZXN0cm95KCkpLm5vdC50b1Rocm93KCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBzdGF0cyA9IGZpbGVTb3VyY2UuZ2V0U3RhdHMoKTtcclxuICAgICAgZXhwZWN0KHN0YXRzLmluaXRpYWxpemVkKS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KHN0YXRzLnRyYWNrZWRGaWxlQ291bnQpLnRvQmUoMCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBkZXN0cm95IHdoZW4gbm90IGluaXRpYWxpemVkJywgKCkgPT4ge1xyXG4gICAgICBleHBlY3QoKCkgPT4gZmlsZVNvdXJjZS5kZXN0cm95KCkpLm5vdC50b1Rocm93KCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3JlZnJlc2gnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSByZWZyZXNoIHdoZW4gZGlzYWJsZWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IGV4cGVjdChmaWxlU291cmNlLnJlZnJlc2goKSkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHJlZnJlc2ggd2hlbiBlbmFibGVkJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBmaWxlU291cmNlLnVwZGF0ZUNvbmZpZ3VyYXRpb24oeyBlbmFibGVkOiB0cnVlIH0pO1xyXG4gICAgICBmaWxlU291cmNlLmluaXRpYWxpemUoKTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IGV4cGVjdChmaWxlU291cmNlLnJlZnJlc2goKSkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=