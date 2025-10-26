/**
 * Tests for frontmatter title protection in FileTaskManager
 */
import { __awaiter } from "tslib";
import { FileTaskManagerImpl } from "@/managers/file-task-manager";
// Mock Obsidian App
const mockApp = {
    vault: {
        getFileByPath: jest.fn(),
    },
    fileManager: {
        renameFile: jest.fn(),
    },
};
// Mock BasesEntry
const createMockBasesEntry = (filePath, properties = {}) => ({
    ctx: {
        _local: {},
        app: mockApp,
        filter: {},
        formulas: {},
        localUsed: false,
    },
    file: {
        parent: null,
        deleted: false,
        vault: null,
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        extension: 'md',
        getShortName: () => filePath.split('/').pop() || filePath,
    },
    formulas: {},
    implicit: {
        file: null,
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        folder: filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '',
        ext: 'md',
    },
    lazyEvalCache: {},
    properties,
    updateProperty: jest.fn(),
    getValue: jest.fn((prop) => {
        if (prop.type === 'property') {
            return properties[prop.name];
        }
        return undefined;
    }),
    getFormulaValue: jest.fn(),
    getPropertyKeys: jest.fn(() => Object.keys(properties)),
});
describe('FileTaskManager - Frontmatter Title Protection', () => {
    let fileTaskManager;
    let mockConfig;
    beforeEach(() => {
        jest.clearAllMocks();
        mockConfig = {
            enabled: true,
            recognitionStrategies: {
                metadata: { enabled: true, taskFields: ['status'], requireAllFields: false },
                tags: { enabled: false, taskTags: [], matchMode: 'exact' },
                templates: { enabled: false, templatePaths: [], checkTemplateMetadata: false },
                paths: { enabled: false, taskPaths: [], matchMode: 'prefix' }
            },
            fileTaskProperties: {
                contentSource: 'title',
                stripExtension: true,
                defaultStatus: ' ',
                preferFrontmatterTitle: true
            },
            relationships: {
                enableChildRelationships: false,
                enableMetadataInheritance: false,
                inheritanceFields: []
            },
            performance: {
                enableWorkerProcessing: false,
                enableCaching: false,
                cacheTTL: 0
            },
            statusMapping: {
                enabled: true,
                metadataToSymbol: {},
                symbolToMetadata: {},
                autoDetect: false,
                caseSensitive: false
            }
        };
        fileTaskManager = new FileTaskManagerImpl(mockApp, mockConfig);
    });
    describe('handleContentUpdate', () => {
        it('should update frontmatter title when preferFrontmatterTitle is enabled and contentSource is title', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockEntry = createMockBasesEntry('test-file.md', { title: 'Original Title' });
            const fileTask = {
                id: 'test-id',
                content: 'Original Title',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'New Title' });
            // Should update frontmatter title, not rename file
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('title', 'New Title');
            expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
        }));
        it('should rename file when preferFrontmatterTitle is disabled', () => __awaiter(void 0, void 0, void 0, function* () {
            // Disable frontmatter title preference
            mockConfig.fileTaskProperties.preferFrontmatterTitle = false;
            fileTaskManager = new FileTaskManagerImpl(mockApp, mockConfig);
            const mockFile = { path: 'test-file.md' };
            jest.mocked(mockApp.vault.getFileByPath).mockReturnValue(mockFile);
            const mockEntry = createMockBasesEntry('test-file.md', { title: 'Original Title' });
            const fileTask = {
                id: 'test-id',
                content: 'Original Title',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'New Title' });
            // Should rename file, not update frontmatter
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(mockFile, 'New Title.md');
            expect(mockEntry.updateProperty).not.toHaveBeenCalledWith('title', 'New Title');
        }));
        it('should rename file when contentSource is not title', () => __awaiter(void 0, void 0, void 0, function* () {
            // Change content source to filename
            mockConfig.fileTaskProperties.contentSource = 'filename';
            fileTaskManager = new FileTaskManagerImpl(mockApp, mockConfig);
            const mockFile = { path: 'test-file.md' };
            jest.mocked(mockApp.vault.getFileByPath).mockReturnValue(mockFile);
            const mockEntry = createMockBasesEntry('test-file.md');
            const fileTask = {
                id: 'test-id',
                content: 'test-file',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'new-filename' });
            // Should rename file even with preferFrontmatterTitle enabled
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(mockFile, 'new-filename.md');
            expect(mockEntry.updateProperty).not.toHaveBeenCalledWith('title', 'new-filename');
        }));
        it('should fallback to file renaming when frontmatter update fails', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockFile = { path: 'test-file.md' };
            jest.mocked(mockApp.vault.getFileByPath).mockReturnValue(mockFile);
            const mockEntry = createMockBasesEntry('test-file.md', { title: 'Original Title' });
            // Make updateProperty throw an error
            mockEntry.updateProperty.mockImplementation(() => {
                throw new Error('Failed to update property');
            });
            const fileTask = {
                id: 'test-id',
                content: 'Original Title',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'New Title' });
            // Should try frontmatter first, then fallback to file renaming
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('title', 'New Title');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(mockFile, 'New Title.md');
        }));
        it('should update content property when contentSource is not filename', () => __awaiter(void 0, void 0, void 0, function* () {
            // Set contentSource to 'title' (not filename)
            mockConfig.fileTaskProperties.contentSource = 'title';
            fileTaskManager = new FileTaskManagerImpl(mockApp, mockConfig);
            const mockEntry = createMockBasesEntry('test-file.md', { title: 'Original Title' });
            const fileTask = {
                id: 'test-id',
                content: 'Original Title',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'New Title', status: 'x' });
            // Should update both content and status properties
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('title', 'New Title');
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('status', 'x');
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('completed', false);
        }));
        it('should handle custom content field updates', () => __awaiter(void 0, void 0, void 0, function* () {
            // Set contentSource to 'custom' with a custom field
            mockConfig.fileTaskProperties.contentSource = 'custom';
            mockConfig.fileTaskProperties.customContentField = 'taskName';
            fileTaskManager = new FileTaskManagerImpl(mockApp, mockConfig);
            const mockEntry = createMockBasesEntry('test-file.md', { taskName: 'Original Task' });
            const fileTask = {
                id: 'test-id',
                content: 'Original Task',
                filePath: 'test-file.md',
                completed: false,
                status: ' ',
                metadata: {
                    tags: [],
                    children: []
                },
                sourceEntry: mockEntry,
                isFileTask: true
            };
            yield fileTaskManager.updateFileTask(fileTask, { content: 'New Task Name' });
            // Should update the custom field
            expect(mockEntry.updateProperty).toHaveBeenCalledWith('taskName', 'New Task Name');
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRtYXR0ZXItdGl0bGUtcHJvdGVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnJvbnRtYXR0ZXItdGl0bGUtcHJvdGVjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHOztBQUdILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBSW5FLG9CQUFvQjtBQUNwQixNQUFNLE9BQU8sR0FBRztJQUNkLEtBQUssRUFBRTtRQUNMLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0tBQ3pCO0lBQ0QsV0FBVyxFQUFFO1FBQ1gsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7S0FDdEI7Q0FDZ0IsQ0FBQztBQUVwQixrQkFBa0I7QUFDbEIsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFFBQWdCLEVBQUUsYUFBa0MsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLEdBQUcsRUFBRTtRQUNILE1BQU0sRUFBRSxFQUFFO1FBQ1YsR0FBRyxFQUFFLE9BQU87UUFDWixNQUFNLEVBQUUsRUFBRTtRQUNWLFFBQVEsRUFBRSxFQUFFO1FBQ1osU0FBUyxFQUFFLEtBQUs7S0FDakI7SUFDRCxJQUFJLEVBQUU7UUFDSixNQUFNLEVBQUUsSUFBSTtRQUNaLE9BQU8sRUFBRSxLQUFLO1FBQ2QsS0FBSyxFQUFFLElBQUk7UUFDWCxJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLFFBQVE7UUFDM0MsU0FBUyxFQUFFLElBQUk7UUFDZixZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxRQUFRO0tBQzFEO0lBQ0QsUUFBUSxFQUFFLEVBQUU7SUFDWixRQUFRLEVBQUU7UUFDUixJQUFJLEVBQUUsSUFBSTtR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QUFjO2dCQUN4QixTQUFTLEVBQUUsS0FBSztnQkFDaEIsTUFBTSxFQUFFLEdBQUc7Z0JBQ1gsUUFBUSxFQUFFO29CQUNSLElBQUksRUFBRSxFQUFFO29CQUNSLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2dCQUNELFdBQVcsRUFBRSxTQUFTO2dCQUN0QixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDO1lBRUYsTUFBTSxlQUFlLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBRTdFLGlDQUFpQztZQUNqQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUZXN0cyBmb3IgZnJvbnRtYXR0ZXIgdGl0bGUgcHJvdGVjdGlvbiBpbiBGaWxlVGFza01hbmFnZXJcclxuICovXHJcblxyXG5pbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgRmlsZVRhc2tNYW5hZ2VySW1wbCB9IGZyb20gXCJAL21hbmFnZXJzL2ZpbGUtdGFzay1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEZpbGVUYXNrIH0gZnJvbSBcIi4uLy4uL3R5cGVzL2ZpbGUtdGFza1wiO1xyXG5pbXBvcnQgeyBGaWxlU291cmNlQ29uZmlndXJhdGlvbiB9IGZyb20gXCIuLi8uLi90eXBlcy9maWxlLXNvdXJjZVwiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBBcHBcclxuY29uc3QgbW9ja0FwcCA9IHtcclxuICB2YXVsdDoge1xyXG4gICAgZ2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG4gIH0sXHJcbiAgZmlsZU1hbmFnZXI6IHtcclxuICAgIHJlbmFtZUZpbGU6IGplc3QuZm4oKSxcclxuICB9LFxyXG59IGFzIHVua25vd24gYXMgQXBwO1xyXG5cclxuLy8gTW9jayBCYXNlc0VudHJ5XHJcbmNvbnN0IGNyZWF0ZU1vY2tCYXNlc0VudHJ5ID0gKGZpbGVQYXRoOiBzdHJpbmcsIHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fSkgPT4gKHtcclxuICBjdHg6IHtcclxuICAgIF9sb2NhbDoge30sXHJcbiAgICBhcHA6IG1vY2tBcHAsXHJcbiAgICBmaWx0ZXI6IHt9LFxyXG4gICAgZm9ybXVsYXM6IHt9LFxyXG4gICAgbG9jYWxVc2VkOiBmYWxzZSxcclxuICB9LFxyXG4gIGZpbGU6IHtcclxuICAgIHBhcmVudDogbnVsbCxcclxuICAgIGRlbGV0ZWQ6IGZhbHNlLFxyXG4gICAgdmF1bHQ6IG51bGwsXHJcbiAgICBwYXRoOiBmaWxlUGF0aCxcclxuICAgIG5hbWU6IGZpbGVQYXRoLnNwbGl0KCcvJykucG9wKCkgfHwgZmlsZVBhdGgsXHJcbiAgICBleHRlbnNpb246ICdtZCcsXHJcbiAgICBnZXRTaG9ydE5hbWU6ICgpID0+IGZpbGVQYXRoLnNwbGl0KCcvJykucG9wKCkgfHwgZmlsZVBhdGgsXHJcbiAgfSxcclxuICBmb3JtdWxhczoge30sXHJcbiAgaW1wbGljaXQ6IHtcclxuICAgIGZpbGU6IG51bGwsXHJcbiAgICBuYW1lOiBmaWxlUGF0aC5zcGxpdCgnLycpLnBvcCgpIHx8IGZpbGVQYXRoLFxyXG4gICAgcGF0aDogZmlsZVBhdGgsXHJcbiAgICBmb2xkZXI6IGZpbGVQYXRoLmluY2x1ZGVzKCcvJykgPyBmaWxlUGF0aC5zdWJzdHJpbmcoMCwgZmlsZVBhdGgubGFzdEluZGV4T2YoJy8nKSkgOiAnJyxcclxuICAgIGV4dDogJ21kJyxcclxuICB9LFxyXG4gIGxhenlFdmFsQ2FjaGU6IHt9LFxyXG4gIHByb3BlcnRpZXMsXHJcbiAgdXBkYXRlUHJvcGVydHk6IGplc3QuZm4oKSxcclxuICBnZXRWYWx1ZTogamVzdC5mbigocHJvcDogYW55KSA9PiB7XHJcbiAgICBpZiAocHJvcC50eXBlID09PSAncHJvcGVydHknKSB7XHJcbiAgICAgIHJldHVybiBwcm9wZXJ0aWVzW3Byb3AubmFtZV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH0pLFxyXG4gIGdldEZvcm11bGFWYWx1ZTogamVzdC5mbigpLFxyXG4gIGdldFByb3BlcnR5S2V5czogamVzdC5mbigoKSA9PiBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSksXHJcbn0pO1xyXG5cclxuZGVzY3JpYmUoJ0ZpbGVUYXNrTWFuYWdlciAtIEZyb250bWF0dGVyIFRpdGxlIFByb3RlY3Rpb24nLCAoKSA9PiB7XHJcbiAgbGV0IGZpbGVUYXNrTWFuYWdlcjogRmlsZVRhc2tNYW5hZ2VySW1wbDtcclxuICBsZXQgbW9ja0NvbmZpZzogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb247XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgICBcclxuICAgIG1vY2tDb25maWcgPSB7XHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG4gICAgICAgIG1ldGFkYXRhOiB7IGVuYWJsZWQ6IHRydWUsIHRhc2tGaWVsZHM6IFsnc3RhdHVzJ10sIHJlcXVpcmVBbGxGaWVsZHM6IGZhbHNlIH0sXHJcbiAgICAgICAgdGFnczogeyBlbmFibGVkOiBmYWxzZSwgdGFza1RhZ3M6IFtdLCBtYXRjaE1vZGU6ICdleGFjdCcgfSxcclxuICAgICAgICB0ZW1wbGF0ZXM6IHsgZW5hYmxlZDogZmFsc2UsIHRlbXBsYXRlUGF0aHM6IFtdLCBjaGVja1RlbXBsYXRlTWV0YWRhdGE6IGZhbHNlIH0sXHJcbiAgICAgICAgcGF0aHM6IHsgZW5hYmxlZDogZmFsc2UsIHRhc2tQYXRoczogW10sIG1hdGNoTW9kZTogJ3ByZWZpeCcgfVxyXG4gICAgICB9LFxyXG4gICAgICBmaWxlVGFza1Byb3BlcnRpZXM6IHtcclxuICAgICAgICBjb250ZW50U291cmNlOiAndGl0bGUnLFxyXG4gICAgICAgIHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG4gICAgICAgIGRlZmF1bHRTdGF0dXM6ICcgJyxcclxuICAgICAgICBwcmVmZXJGcm9udG1hdHRlclRpdGxlOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlbGF0aW9uc2hpcHM6IHtcclxuICAgICAgICBlbmFibGVDaGlsZFJlbGF0aW9uc2hpcHM6IGZhbHNlLFxyXG4gICAgICAgIGVuYWJsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IGZhbHNlLFxyXG4gICAgICAgIGluaGVyaXRhbmNlRmllbGRzOiBbXVxyXG4gICAgICB9LFxyXG4gICAgICBwZXJmb3JtYW5jZToge1xyXG4gICAgICAgIGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IGZhbHNlLFxyXG4gICAgICAgIGVuYWJsZUNhY2hpbmc6IGZhbHNlLFxyXG4gICAgICAgIGNhY2hlVFRMOiAwXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YXR1c01hcHBpbmc6IHtcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG1ldGFkYXRhVG9TeW1ib2w6IHt9LFxyXG4gICAgICAgIHN5bWJvbFRvTWV0YWRhdGE6IHt9LFxyXG4gICAgICAgIGF1dG9EZXRlY3Q6IGZhbHNlLFxyXG4gICAgICAgIGNhc2VTZW5zaXRpdmU6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgZmlsZVRhc2tNYW5hZ2VyID0gbmV3IEZpbGVUYXNrTWFuYWdlckltcGwobW9ja0FwcCwgbW9ja0NvbmZpZyk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdoYW5kbGVDb250ZW50VXBkYXRlJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCB1cGRhdGUgZnJvbnRtYXR0ZXIgdGl0bGUgd2hlbiBwcmVmZXJGcm9udG1hdHRlclRpdGxlIGlzIGVuYWJsZWQgYW5kIGNvbnRlbnRTb3VyY2UgaXMgdGl0bGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tFbnRyeSA9IGNyZWF0ZU1vY2tCYXNlc0VudHJ5KCd0ZXN0LWZpbGUubWQnLCB7IHRpdGxlOiAnT3JpZ2luYWwgVGl0bGUnIH0pO1xyXG4gICAgICBjb25zdCBmaWxlVGFzazogRmlsZVRhc2sgPSB7XHJcbiAgICAgICAgaWQ6ICd0ZXN0LWlkJyxcclxuICAgICAgICBjb250ZW50OiAnT3JpZ2luYWwgVGl0bGUnLFxyXG4gICAgICAgIGZpbGVQYXRoOiAndGVzdC1maWxlLm1kJyxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc291cmNlRW50cnk6IG1vY2tFbnRyeSxcclxuICAgICAgICBpc0ZpbGVUYXNrOiB0cnVlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCBmaWxlVGFza01hbmFnZXIudXBkYXRlRmlsZVRhc2soZmlsZVRhc2ssIHsgY29udGVudDogJ05ldyBUaXRsZScgfSk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgdXBkYXRlIGZyb250bWF0dGVyIHRpdGxlLCBub3QgcmVuYW1lIGZpbGVcclxuICAgICAgZXhwZWN0KG1vY2tFbnRyeS51cGRhdGVQcm9wZXJ0eSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3RpdGxlJywgJ05ldyBUaXRsZScpO1xyXG4gICAgICBleHBlY3QobW9ja0FwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZW5hbWUgZmlsZSB3aGVuIHByZWZlckZyb250bWF0dGVyVGl0bGUgaXMgZGlzYWJsZWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIERpc2FibGUgZnJvbnRtYXR0ZXIgdGl0bGUgcHJlZmVyZW5jZVxyXG4gICAgICBtb2NrQ29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5wcmVmZXJGcm9udG1hdHRlclRpdGxlID0gZmFsc2U7XHJcbiAgICAgIGZpbGVUYXNrTWFuYWdlciA9IG5ldyBGaWxlVGFza01hbmFnZXJJbXBsKG1vY2tBcHAsIG1vY2tDb25maWcpO1xyXG5cclxuICAgICAgY29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6ICd0ZXN0LWZpbGUubWQnIH07XHJcbiAgICAgIGplc3QubW9ja2VkKG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCkubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHJcbiAgICAgIGNvbnN0IG1vY2tFbnRyeSA9IGNyZWF0ZU1vY2tCYXNlc0VudHJ5KCd0ZXN0LWZpbGUubWQnLCB7IHRpdGxlOiAnT3JpZ2luYWwgVGl0bGUnIH0pO1xyXG4gICAgICBjb25zdCBmaWxlVGFzazogRmlsZVRhc2sgPSB7XHJcbiAgICAgICAgaWQ6ICd0ZXN0LWlkJyxcclxuICAgICAgICBjb250ZW50OiAnT3JpZ2luYWwgVGl0bGUnLFxyXG4gICAgICAgIGZpbGVQYXRoOiAndGVzdC1maWxlLm1kJyxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc291cmNlRW50cnk6IG1vY2tFbnRyeSxcclxuICAgICAgICBpc0ZpbGVUYXNrOiB0cnVlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCBmaWxlVGFza01hbmFnZXIudXBkYXRlRmlsZVRhc2soZmlsZVRhc2ssIHsgY29udGVudDogJ05ldyBUaXRsZScgfSk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgcmVuYW1lIGZpbGUsIG5vdCB1cGRhdGUgZnJvbnRtYXR0ZXJcclxuICAgICAgZXhwZWN0KG1vY2tBcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgobW9ja0ZpbGUsICdOZXcgVGl0bGUubWQnKTtcclxuICAgICAgZXhwZWN0KG1vY2tFbnRyeS51cGRhdGVQcm9wZXJ0eSkubm90LnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCd0aXRsZScsICdOZXcgVGl0bGUnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmVuYW1lIGZpbGUgd2hlbiBjb250ZW50U291cmNlIGlzIG5vdCB0aXRsZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gQ2hhbmdlIGNvbnRlbnQgc291cmNlIHRvIGZpbGVuYW1lXHJcbiAgICAgIG1vY2tDb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLmNvbnRlbnRTb3VyY2UgPSAnZmlsZW5hbWUnO1xyXG4gICAgICBmaWxlVGFza01hbmFnZXIgPSBuZXcgRmlsZVRhc2tNYW5hZ2VySW1wbChtb2NrQXBwLCBtb2NrQ29uZmlnKTtcclxuXHJcbiAgICAgIGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiAndGVzdC1maWxlLm1kJyB9O1xyXG4gICAgICBqZXN0Lm1vY2tlZChtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgpLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblxyXG4gICAgICBjb25zdCBtb2NrRW50cnkgPSBjcmVhdGVNb2NrQmFzZXNFbnRyeSgndGVzdC1maWxlLm1kJyk7XHJcbiAgICAgIGNvbnN0IGZpbGVUYXNrOiBGaWxlVGFzayA9IHtcclxuICAgICAgICBpZDogJ3Rlc3QtaWQnLFxyXG4gICAgICAgIGNvbnRlbnQ6ICd0ZXN0LWZpbGUnLFxyXG4gICAgICAgIGZpbGVQYXRoOiAndGVzdC1maWxlLm1kJyxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc291cmNlRW50cnk6IG1vY2tFbnRyeSxcclxuICAgICAgICBpc0ZpbGVUYXNrOiB0cnVlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCBmaWxlVGFza01hbmFnZXIudXBkYXRlRmlsZVRhc2soZmlsZVRhc2ssIHsgY29udGVudDogJ25ldy1maWxlbmFtZScgfSk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgcmVuYW1lIGZpbGUgZXZlbiB3aXRoIHByZWZlckZyb250bWF0dGVyVGl0bGUgZW5hYmxlZFxyXG4gICAgICBleHBlY3QobW9ja0FwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChtb2NrRmlsZSwgJ25ldy1maWxlbmFtZS5tZCcpO1xyXG4gICAgICBleHBlY3QobW9ja0VudHJ5LnVwZGF0ZVByb3BlcnR5KS5ub3QudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3RpdGxlJywgJ25ldy1maWxlbmFtZScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBmYWxsYmFjayB0byBmaWxlIHJlbmFtaW5nIHdoZW4gZnJvbnRtYXR0ZXIgdXBkYXRlIGZhaWxzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogJ3Rlc3QtZmlsZS5tZCcgfTtcclxuICAgICAgamVzdC5tb2NrZWQobW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoKS5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cclxuICAgICAgY29uc3QgbW9ja0VudHJ5ID0gY3JlYXRlTW9ja0Jhc2VzRW50cnkoJ3Rlc3QtZmlsZS5tZCcsIHsgdGl0bGU6ICdPcmlnaW5hbCBUaXRsZScgfSk7XHJcbiAgICAgIC8vIE1ha2UgdXBkYXRlUHJvcGVydHkgdGhyb3cgYW4gZXJyb3JcclxuICAgICAgbW9ja0VudHJ5LnVwZGF0ZVByb3BlcnR5Lm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHByb3BlcnR5Jyk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZmlsZVRhc2s6IEZpbGVUYXNrID0ge1xyXG4gICAgICAgIGlkOiAndGVzdC1pZCcsXHJcbiAgICAgICAgY29udGVudDogJ09yaWdpbmFsIFRpdGxlJyxcclxuICAgICAgICBmaWxlUGF0aDogJ3Rlc3QtZmlsZS5tZCcsXHJcbiAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICBzdGF0dXM6ICcgJyxcclxuICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHNvdXJjZUVudHJ5OiBtb2NrRW50cnksXHJcbiAgICAgICAgaXNGaWxlVGFzazogdHJ1ZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXdhaXQgZmlsZVRhc2tNYW5hZ2VyLnVwZGF0ZUZpbGVUYXNrKGZpbGVUYXNrLCB7IGNvbnRlbnQ6ICdOZXcgVGl0bGUnIH0pO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHRyeSBmcm9udG1hdHRlciBmaXJzdCwgdGhlbiBmYWxsYmFjayB0byBmaWxlIHJlbmFtaW5nXHJcbiAgICAgIGV4cGVjdChtb2NrRW50cnkudXBkYXRlUHJvcGVydHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCd0aXRsZScsICdOZXcgVGl0bGUnKTtcclxuICAgICAgZXhwZWN0KG1vY2tBcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgobW9ja0ZpbGUsICdOZXcgVGl0bGUubWQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGNvbnRlbnQgcHJvcGVydHkgd2hlbiBjb250ZW50U291cmNlIGlzIG5vdCBmaWxlbmFtZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gU2V0IGNvbnRlbnRTb3VyY2UgdG8gJ3RpdGxlJyAobm90IGZpbGVuYW1lKVxyXG4gICAgICBtb2NrQ29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5jb250ZW50U291cmNlID0gJ3RpdGxlJztcclxuICAgICAgZmlsZVRhc2tNYW5hZ2VyID0gbmV3IEZpbGVUYXNrTWFuYWdlckltcGwobW9ja0FwcCwgbW9ja0NvbmZpZyk7XHJcblxyXG4gICAgICBjb25zdCBtb2NrRW50cnkgPSBjcmVhdGVNb2NrQmFzZXNFbnRyeSgndGVzdC1maWxlLm1kJywgeyB0aXRsZTogJ09yaWdpbmFsIFRpdGxlJyB9KTtcclxuICAgICAgY29uc3QgZmlsZVRhc2s6IEZpbGVUYXNrID0ge1xyXG4gICAgICAgIGlkOiAndGVzdC1pZCcsXHJcbiAgICAgICAgY29udGVudDogJ09yaWdpbmFsIFRpdGxlJyxcclxuICAgICAgICBmaWxlUGF0aDogJ3Rlc3QtZmlsZS5tZCcsXHJcbiAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcclxuICAgICAgICBzdGF0dXM6ICcgJyxcclxuICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgdGFnczogW10sXHJcbiAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHNvdXJjZUVudHJ5OiBtb2NrRW50cnksXHJcbiAgICAgICAgaXNGaWxlVGFzazogdHJ1ZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXdhaXQgZmlsZVRhc2tNYW5hZ2VyLnVwZGF0ZUZpbGVUYXNrKGZpbGVUYXNrLCB7IGNvbnRlbnQ6ICdOZXcgVGl0bGUnLCBzdGF0dXM6ICd4JyB9KTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCB1cGRhdGUgYm90aCBjb250ZW50IGFuZCBzdGF0dXMgcHJvcGVydGllc1xyXG4gICAgICBleHBlY3QobW9ja0VudHJ5LnVwZGF0ZVByb3BlcnR5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aCgndGl0bGUnLCAnTmV3IFRpdGxlJyk7XHJcbiAgICAgIGV4cGVjdChtb2NrRW50cnkudXBkYXRlUHJvcGVydHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCdzdGF0dXMnLCAneCcpO1xyXG4gICAgICBleHBlY3QobW9ja0VudHJ5LnVwZGF0ZVByb3BlcnR5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aCgnY29tcGxldGVkJywgZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgY3VzdG9tIGNvbnRlbnQgZmllbGQgdXBkYXRlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gU2V0IGNvbnRlbnRTb3VyY2UgdG8gJ2N1c3RvbScgd2l0aCBhIGN1c3RvbSBmaWVsZFxyXG4gICAgICBtb2NrQ29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5jb250ZW50U291cmNlID0gJ2N1c3RvbSc7XHJcbiAgICAgIG1vY2tDb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLmN1c3RvbUNvbnRlbnRGaWVsZCA9ICd0YXNrTmFtZSc7XHJcbiAgICAgIGZpbGVUYXNrTWFuYWdlciA9IG5ldyBGaWxlVGFza01hbmFnZXJJbXBsKG1vY2tBcHAsIG1vY2tDb25maWcpO1xyXG5cclxuICAgICAgY29uc3QgbW9ja0VudHJ5ID0gY3JlYXRlTW9ja0Jhc2VzRW50cnkoJ3Rlc3QtZmlsZS5tZCcsIHsgdGFza05hbWU6ICdPcmlnaW5hbCBUYXNrJyB9KTtcclxuICAgICAgY29uc3QgZmlsZVRhc2s6IEZpbGVUYXNrID0ge1xyXG4gICAgICAgIGlkOiAndGVzdC1pZCcsXHJcbiAgICAgICAgY29udGVudDogJ09yaWdpbmFsIFRhc2snLFxyXG4gICAgICAgIGZpbGVQYXRoOiAndGVzdC1maWxlLm1kJyxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHN0YXR1czogJyAnLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc291cmNlRW50cnk6IG1vY2tFbnRyeSxcclxuICAgICAgICBpc0ZpbGVUYXNrOiB0cnVlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCBmaWxlVGFza01hbmFnZXIudXBkYXRlRmlsZVRhc2soZmlsZVRhc2ssIHsgY29udGVudDogJ05ldyBUYXNrIE5hbWUnIH0pO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHVwZGF0ZSB0aGUgY3VzdG9tIGZpZWxkXHJcbiAgICAgIGV4cGVjdChtb2NrRW50cnkudXBkYXRlUHJvcGVydHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCd0YXNrTmFtZScsICdOZXcgVGFzayBOYW1lJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==