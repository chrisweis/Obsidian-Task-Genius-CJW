/**
 * Tests for FileSourceConfig
 */
import { FileSourceConfig, DEFAULT_FILE_SOURCE_CONFIG } from "@/dataflow/sources/FileSourceConfig";
describe('FileSourceConfig', () => {
    let config;
    beforeEach(() => {
        config = new FileSourceConfig();
    });
    afterEach(() => {
        // Clean up any listeners
        if (config) {
            // Config doesn't expose cleanup method, but we can create a new instance
            config = new FileSourceConfig();
        }
    });
    describe('initialization', () => {
        it('should initialize with default configuration', () => {
            const result = config.getConfig();
            expect(result).toEqual(DEFAULT_FILE_SOURCE_CONFIG);
        });
        it('should initialize with partial configuration', () => {
            const partial = {
                enabled: true,
                recognitionStrategies: {
                    metadata: {
                        enabled: false,
                        taskFields: ['custom'],
                        requireAllFields: true
                    },
                    tags: {
                        enabled: false,
                        taskTags: [],
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
                }
            };
            const customConfig = new FileSourceConfig(partial);
            const result = customConfig.getConfig();
            expect(result.enabled).toBe(true);
            expect(result.recognitionStrategies.metadata.enabled).toBe(false);
            expect(result.recognitionStrategies.metadata.taskFields).toEqual(['custom']);
            expect(result.recognitionStrategies.metadata.requireAllFields).toBe(true);
            // Other properties should have defaults
            expect(result.recognitionStrategies.tags.enabled).toBe(false); // Set to false in partial config
        });
    });
    describe('configuration updates', () => {
        it('should update configuration and notify listeners', () => {
            return new Promise((resolve) => {
                const updates = {
                    enabled: true,
                    fileTaskProperties: {
                        contentSource: 'title',
                        stripExtension: false,
                        defaultStatus: 'x',
                        preferFrontmatterTitle: true
                    }
                };
                config.onChange((newConfig) => {
                    expect(newConfig.enabled).toBe(true);
                    expect(newConfig.fileTaskProperties.contentSource).toBe('title');
                    expect(newConfig.fileTaskProperties.stripExtension).toBe(false);
                    expect(newConfig.fileTaskProperties.defaultStatus).toBe('x');
                    resolve();
                });
                config.updateConfig(updates);
            });
        });
        it('should not notify listeners if configuration does not change', () => {
            const listener = jest.fn();
            config.onChange(listener);
            // Update with same values
            config.updateConfig({ enabled: false });
            expect(listener).not.toHaveBeenCalled();
        });
        it('should allow multiple listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            config.onChange(listener1);
            config.onChange(listener2);
            config.updateConfig({ enabled: true });
            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
        });
        it('should allow unsubscribing listeners', () => {
            const listener = jest.fn();
            const unsubscribe = config.onChange(listener);
            config.updateConfig({ enabled: true });
            expect(listener).toHaveBeenCalledTimes(1);
            unsubscribe();
            config.updateConfig({ enabled: false });
            expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
        });
    });
    describe('enabled strategies', () => {
        it('should return empty array when all strategies disabled', () => {
            config.updateConfig({
                recognitionStrategies: {
                    metadata: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.metadata), { enabled: false }),
                    tags: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.tags), { enabled: false }),
                    templates: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.templates), { enabled: false }),
                    paths: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.paths), { enabled: false })
                }
            });
            const strategies = config.getEnabledStrategies();
            expect(strategies).toEqual([]);
        });
        it('should return enabled strategies', () => {
            config.updateConfig({
                recognitionStrategies: {
                    metadata: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.metadata), { enabled: true }),
                    tags: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.tags), { enabled: true }),
                    templates: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.templates), { enabled: false }),
                    paths: Object.assign(Object.assign({}, DEFAULT_FILE_SOURCE_CONFIG.recognitionStrategies.paths), { enabled: false })
                }
            });
            const strategies = config.getEnabledStrategies();
            expect(strategies).toContain('metadata');
            expect(strategies).toContain('tags');
            expect(strategies).not.toContain('templates');
            expect(strategies).not.toContain('paths');
        });
    });
    describe('configuration validation', () => {
        it('should validate valid configuration', () => {
            const validConfig = {
                enabled: true,
                recognitionStrategies: {
                    metadata: {
                        enabled: true,
                        taskFields: ['dueDate', 'priority'],
                        requireAllFields: false
                    },
                    tags: {
                        enabled: false,
                        taskTags: ['#test'],
                        matchMode: 'exact'
                    },
                    templates: {
                        enabled: false,
                        templatePaths: ['template.md'],
                        checkTemplateMetadata: true
                    },
                    paths: {
                        enabled: false,
                        taskPaths: ['test/'],
                        matchMode: 'prefix'
                    }
                }
            };
            const errors = config.validateConfig(validConfig);
            expect(errors).toEqual([]);
        });
        it('should detect when no strategies are enabled', () => {
            const invalidConfig = {
                enabled: true,
                recognitionStrategies: {
                    metadata: { enabled: false, taskFields: [], requireAllFields: false },
                    tags: { enabled: false, taskTags: [], matchMode: 'exact' },
                    templates: { enabled: false, templatePaths: [], checkTemplateMetadata: true },
                    paths: { enabled: false, taskPaths: [], matchMode: 'prefix' }
                }
            };
            const errors = config.validateConfig(invalidConfig);
            expect(errors).toContain('At least one recognition strategy must be enabled');
        });
        it('should validate empty task fields', () => {
            const invalidConfig = {
                recognitionStrategies: {
                    metadata: {
                        enabled: true,
                        taskFields: [],
                        requireAllFields: false
                    },
                    tags: {
                        enabled: false,
                        taskTags: [],
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
                }
            };
            const errors = config.validateConfig(invalidConfig);
            expect(errors).toContain('Metadata strategy requires at least one task field');
        });
        it('should validate custom content source', () => {
            const invalidConfig = {
                fileTaskProperties: {
                    contentSource: 'custom',
                    stripExtension: true,
                    defaultStatus: ' ',
                    preferFrontmatterTitle: true
                    // Missing customContentField
                }
            };
            const errors = config.validateConfig(invalidConfig);
            expect(errors).toContain('Custom content source requires customContentField to be specified');
        });
        it('should validate cache TTL', () => {
            const invalidConfig = {
                performance: {
                    enableWorkerProcessing: true,
                    enableCaching: true,
                    cacheTTL: -1000
                }
            };
            const errors = config.validateConfig(invalidConfig);
            expect(errors).toContain('Cache TTL must be a positive number');
        });
    });
    describe('configuration presets', () => {
        it('should create basic preset', () => {
            var _a, _b, _c, _d;
            const preset = FileSourceConfig.createPreset('basic');
            expect(preset.enabled).toBe(true);
            expect((_a = preset.recognitionStrategies) === null || _a === void 0 ? void 0 : _a.metadata.enabled).toBe(true);
            expect((_b = preset.recognitionStrategies) === null || _b === void 0 ? void 0 : _b.tags.enabled).toBe(false);
            expect((_c = preset.recognitionStrategies) === null || _c === void 0 ? void 0 : _c.templates.enabled).toBe(false);
            expect((_d = preset.recognitionStrategies) === null || _d === void 0 ? void 0 : _d.paths.enabled).toBe(false);
        });
        it('should create metadata-only preset', () => {
            var _a, _b;
            const preset = FileSourceConfig.createPreset('metadata-only');
            expect(preset.enabled).toBe(true);
            expect((_a = preset.recognitionStrategies) === null || _a === void 0 ? void 0 : _a.metadata.enabled).toBe(true);
            expect((_b = preset.recognitionStrategies) === null || _b === void 0 ? void 0 : _b.tags.enabled).toBe(false);
        });
        it('should create tag-only preset', () => {
            var _a, _b;
            const preset = FileSourceConfig.createPreset('tag-only');
            expect(preset.enabled).toBe(true);
            expect((_a = preset.recognitionStrategies) === null || _a === void 0 ? void 0 : _a.metadata.enabled).toBe(false);
            expect((_b = preset.recognitionStrategies) === null || _b === void 0 ? void 0 : _b.tags.enabled).toBe(true);
        });
        it('should create full preset', () => {
            var _a, _b, _c, _d;
            const preset = FileSourceConfig.createPreset('full');
            expect(preset.enabled).toBe(true);
            expect((_a = preset.recognitionStrategies) === null || _a === void 0 ? void 0 : _a.metadata.enabled).toBe(true);
            expect((_b = preset.recognitionStrategies) === null || _b === void 0 ? void 0 : _b.tags.enabled).toBe(true);
            expect((_c = preset.recognitionStrategies) === null || _c === void 0 ? void 0 : _c.templates.enabled).toBe(false);
            expect((_d = preset.recognitionStrategies) === null || _d === void 0 ? void 0 : _d.paths.enabled).toBe(false);
        });
    });
    describe('isEnabled', () => {
        it('should return false by default', () => {
            expect(config.isEnabled()).toBe(false);
        });
        it('should return true when enabled', () => {
            config.updateConfig({ enabled: true });
            expect(config.isEnabled()).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVNvdXJjZUNvbmZpZy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZVNvdXJjZUNvbmZpZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBRUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLDBCQUEwQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHbkcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxJQUFJLE1BQXdCLENBQUM7SUFFN0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2QseUJBQXlCO1FBQ3pCLElBQUksTUFBTSxFQUFFO1lBQ1gseUVBQXlFO1lBQ3pFLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7U0FDaEM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLE9BQU8sR0FBcUM7Z0JBQ2pELE9BQU8sRUFBRSxJQUFJO2dCQUNiLHFCQUFxQixFQUFFO29CQUN0QixRQUFRLEVBQUU7d0JBQ1QsT0FBTyxFQUFFLEtBQUs7d0JBQ2QsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDO3dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO3FCQUN0QjtvQkFDRCxJQUFJLEVBQUU7d0JBQ0wsT0FBTyxFQUFF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SUFBSSxDQUFDLENBQUM7WUFDbEUsTUFBTSxDQUFDLE1BQUEsTUFBTSxDQUFDLHFCQUFxQiwwQ0FBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxNQUFBLE1BQU0sQ0FBQyxxQkFBcUIsMENBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwRSxNQUFNLENBQUMsTUFBQSxNQUFNLENBQUMscUJBQXFCLDBDQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQzFCLEVBQUUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7WUFDekMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDMUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3RzIGZvciBGaWxlU291cmNlQ29uZmlnXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRmlsZVNvdXJjZUNvbmZpZywgREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcgfSBmcm9tIFwiQC9kYXRhZmxvdy9zb3VyY2VzL0ZpbGVTb3VyY2VDb25maWdcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlU291cmNlQ29uZmlndXJhdGlvbiB9IGZyb20gXCJAL3R5cGVzL2ZpbGUtc291cmNlXCI7XHJcblxyXG5kZXNjcmliZSgnRmlsZVNvdXJjZUNvbmZpZycsICgpID0+IHtcclxuXHRsZXQgY29uZmlnOiBGaWxlU291cmNlQ29uZmlnO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdGNvbmZpZyA9IG5ldyBGaWxlU291cmNlQ29uZmlnKCk7XHJcblx0fSk7XHJcblxyXG5cdGFmdGVyRWFjaCgoKSA9PiB7XHJcblx0XHQvLyBDbGVhbiB1cCBhbnkgbGlzdGVuZXJzXHJcblx0XHRpZiAoY29uZmlnKSB7XHJcblx0XHRcdC8vIENvbmZpZyBkb2Vzbid0IGV4cG9zZSBjbGVhbnVwIG1ldGhvZCwgYnV0IHdlIGNhbiBjcmVhdGUgYSBuZXcgaW5zdGFuY2VcclxuXHRcdFx0Y29uZmlnID0gbmV3IEZpbGVTb3VyY2VDb25maWcoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ2luaXRpYWxpemF0aW9uJywgKCkgPT4ge1xyXG5cdFx0aXQoJ3Nob3VsZCBpbml0aWFsaXplIHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBjb25maWcuZ2V0Q29uZmlnKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCBpbml0aWFsaXplIHdpdGggcGFydGlhbCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJ0aWFsOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPiA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHRhc2tGaWVsZHM6IFsnY3VzdG9tJ10sXHJcblx0XHRcdFx0XHRcdHJlcXVpcmVBbGxGaWVsZHM6IHRydWVcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHR0YXNrVGFnczogW10sXHJcblx0XHRcdFx0XHRcdG1hdGNoTW9kZTogJ2V4YWN0J1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlczoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQYXRoczogW10sXHJcblx0XHRcdFx0XHRcdGNoZWNrVGVtcGxhdGVNZXRhZGF0YTogdHJ1ZVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHBhdGhzOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHR0YXNrUGF0aHM6IFtdLFxyXG5cdFx0XHRcdFx0XHRtYXRjaE1vZGU6ICdwcmVmaXgnXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgY3VzdG9tQ29uZmlnID0gbmV3IEZpbGVTb3VyY2VDb25maWcocGFydGlhbCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGN1c3RvbUNvbmZpZy5nZXRDb25maWcoKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEuZW5hYmxlZCkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnRhc2tGaWVsZHMpLnRvRXF1YWwoWydjdXN0b20nXSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnJlcXVpcmVBbGxGaWVsZHMpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBPdGhlciBwcm9wZXJ0aWVzIHNob3VsZCBoYXZlIGRlZmF1bHRzXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MuZW5hYmxlZCkudG9CZShmYWxzZSk7IC8vIFNldCB0byBmYWxzZSBpbiBwYXJ0aWFsIGNvbmZpZ1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKCdjb25maWd1cmF0aW9uIHVwZGF0ZXMnLCAoKSA9PiB7XHJcblx0XHRpdCgnc2hvdWxkIHVwZGF0ZSBjb25maWd1cmF0aW9uIGFuZCBub3RpZnkgbGlzdGVuZXJzJywgKCkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcclxuXHRcdFx0XHRjb25zdCB1cGRhdGVzOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPiA9IHtcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRmaWxlVGFza1Byb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0Y29udGVudFNvdXJjZTogJ3RpdGxlJyxcclxuXHRcdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0U3RhdHVzOiAneCcsXHJcblx0XHRcdFx0XHRcdHByZWZlckZyb250bWF0dGVyVGl0bGU6IHRydWVcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25maWcub25DaGFuZ2UoKG5ld0NvbmZpZykgPT4ge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KG5ld0NvbmZpZy5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdFx0ZXhwZWN0KG5ld0NvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMuY29udGVudFNvdXJjZSkudG9CZSgndGl0bGUnKTtcclxuXHRcdFx0XHRcdGV4cGVjdChuZXdDb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLnN0cmlwRXh0ZW5zaW9uKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0XHRcdGV4cGVjdChuZXdDb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLmRlZmF1bHRTdGF0dXMpLnRvQmUoJ3gnKTtcclxuXHRcdFx0XHRcdHJlc29sdmUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnVwZGF0ZUNvbmZpZyh1cGRhdGVzKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIG5vdCBub3RpZnkgbGlzdGVuZXJzIGlmIGNvbmZpZ3VyYXRpb24gZG9lcyBub3QgY2hhbmdlJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaXN0ZW5lciA9IGplc3QuZm4oKTtcclxuXHRcdFx0Y29uZmlnLm9uQ2hhbmdlKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB3aXRoIHNhbWUgdmFsdWVzXHJcblx0XHRcdGNvbmZpZy51cGRhdGVDb25maWcoe2VuYWJsZWQ6IGZhbHNlfSk7XHJcblxyXG5cdFx0XHRleHBlY3QobGlzdGVuZXIpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIGFsbG93IG11bHRpcGxlIGxpc3RlbmVycycsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGlzdGVuZXIxID0gamVzdC5mbigpO1xyXG5cdFx0XHRjb25zdCBsaXN0ZW5lcjIgPSBqZXN0LmZuKCk7XHJcblxyXG5cdFx0XHRjb25maWcub25DaGFuZ2UobGlzdGVuZXIxKTtcclxuXHRcdFx0Y29uZmlnLm9uQ2hhbmdlKGxpc3RlbmVyMik7XHJcblxyXG5cdFx0XHRjb25maWcudXBkYXRlQ29uZmlnKHtlbmFibGVkOiB0cnVlfSk7XHJcblxyXG5cdFx0XHRleHBlY3QobGlzdGVuZXIxKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XHJcblx0XHRcdGV4cGVjdChsaXN0ZW5lcjIpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgYWxsb3cgdW5zdWJzY3JpYmluZyBsaXN0ZW5lcnMnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpc3RlbmVyID0gamVzdC5mbigpO1xyXG5cdFx0XHRjb25zdCB1bnN1YnNjcmliZSA9IGNvbmZpZy5vbkNoYW5nZShsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRjb25maWcudXBkYXRlQ29uZmlnKHtlbmFibGVkOiB0cnVlfSk7XHJcblx0XHRcdGV4cGVjdChsaXN0ZW5lcikudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0Y29uZmlnLnVwZGF0ZUNvbmZpZyh7ZW5hYmxlZDogZmFsc2V9KTtcclxuXHRcdFx0ZXhwZWN0KGxpc3RlbmVyKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7IC8vIFNob3VsZCBub3QgYmUgY2FsbGVkIGFnYWluXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ2VuYWJsZWQgc3RyYXRlZ2llcycsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gYWxsIHN0cmF0ZWdpZXMgZGlzYWJsZWQnLCAoKSA9PiB7XHJcblx0XHRcdGNvbmZpZy51cGRhdGVDb25maWcoe1xyXG5cdFx0XHRcdHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHsuLi5ERUZBVUxUX0ZJTEVfU09VUkNFX0NPTkZJRy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEsIGVuYWJsZWQ6IGZhbHNlfSxcclxuXHRcdFx0XHRcdHRhZ3M6IHsuLi5ERUZBVUxUX0ZJTEVfU09VUkNFX0NPTkZJRy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMudGFncywgZW5hYmxlZDogZmFsc2V9LFxyXG5cdFx0XHRcdFx0dGVtcGxhdGVzOiB7Li4uREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRlbXBsYXRlcywgZW5hYmxlZDogZmFsc2V9LFxyXG5cdFx0XHRcdFx0cGF0aHM6IHsuLi5ERUZBVUxUX0ZJTEVfU09VUkNFX0NPTkZJRy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHMsIGVuYWJsZWQ6IGZhbHNlfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdHJhdGVnaWVzID0gY29uZmlnLmdldEVuYWJsZWRTdHJhdGVnaWVzKCk7XHJcblx0XHRcdGV4cGVjdChzdHJhdGVnaWVzKS50b0VxdWFsKFtdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIGVuYWJsZWQgc3RyYXRlZ2llcycsICgpID0+IHtcclxuXHRcdFx0Y29uZmlnLnVwZGF0ZUNvbmZpZyh7XHJcblx0XHRcdFx0cmVjb2duaXRpb25TdHJhdGVnaWVzOiB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YTogey4uLkRFRkFVTFRfRklMRV9TT1VSQ0VfQ09ORklHLnJlY29nbml0aW9uU3RyYXRlZ2llcy5tZXRhZGF0YSwgZW5hYmxlZDogdHJ1ZX0sXHJcblx0XHRcdFx0XHR0YWdzOiB7Li4uREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MsIGVuYWJsZWQ6IHRydWV9LFxyXG5cdFx0XHRcdFx0dGVtcGxhdGVzOiB7Li4uREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRlbXBsYXRlcywgZW5hYmxlZDogZmFsc2V9LFxyXG5cdFx0XHRcdFx0cGF0aHM6IHsuLi5ERUZBVUxUX0ZJTEVfU09VUkNFX0NPTkZJRy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHMsIGVuYWJsZWQ6IGZhbHNlfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdHJhdGVnaWVzID0gY29uZmlnLmdldEVuYWJsZWRTdHJhdGVnaWVzKCk7XHJcblx0XHRcdGV4cGVjdChzdHJhdGVnaWVzKS50b0NvbnRhaW4oJ21ldGFkYXRhJyk7XHJcblx0XHRcdGV4cGVjdChzdHJhdGVnaWVzKS50b0NvbnRhaW4oJ3RhZ3MnKTtcclxuXHRcdFx0ZXhwZWN0KHN0cmF0ZWdpZXMpLm5vdC50b0NvbnRhaW4oJ3RlbXBsYXRlcycpO1xyXG5cdFx0XHRleHBlY3Qoc3RyYXRlZ2llcykubm90LnRvQ29udGFpbigncGF0aHMnKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZSgnY29uZmlndXJhdGlvbiB2YWxpZGF0aW9uJywgKCkgPT4ge1xyXG5cdFx0aXQoJ3Nob3VsZCB2YWxpZGF0ZSB2YWxpZCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB2YWxpZENvbmZpZzogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4gPSB7XHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdHRhc2tGaWVsZHM6IFsnZHVlRGF0ZScsICdwcmlvcml0eSddLFxyXG5cdFx0XHRcdFx0XHRyZXF1aXJlQWxsRmllbGRzOiBmYWxzZVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHRhc2tUYWdzOiBbJyN0ZXN0J10sXHJcblx0XHRcdFx0XHRcdG1hdGNoTW9kZTogJ2V4YWN0J1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlczoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQYXRoczogWyd0ZW1wbGF0ZS5tZCddLFxyXG5cdFx0XHRcdFx0XHRjaGVja1RlbXBsYXRlTWV0YWRhdGE6IHRydWVcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRwYXRoczoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dGFza1BhdGhzOiBbJ3Rlc3QvJ10sXHJcblx0XHRcdFx0XHRcdG1hdGNoTW9kZTogJ3ByZWZpeCdcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBlcnJvcnMgPSBjb25maWcudmFsaWRhdGVDb25maWcodmFsaWRDb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZXJyb3JzKS50b0VxdWFsKFtdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgZGV0ZWN0IHdoZW4gbm8gc3RyYXRlZ2llcyBhcmUgZW5hYmxlZCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW52YWxpZENvbmZpZzogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4gPSB7XHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7ZW5hYmxlZDogZmFsc2UsIHRhc2tGaWVsZHM6IFtdLCByZXF1aXJlQWxsRmllbGRzOiBmYWxzZX0sXHJcblx0XHRcdFx0XHR0YWdzOiB7ZW5hYmxlZDogZmFsc2UsIHRhc2tUYWdzOiBbXSwgbWF0Y2hNb2RlOiAnZXhhY3QnfSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlczoge2VuYWJsZWQ6IGZhbHNlLCB0ZW1wbGF0ZVBhdGhzOiBbXSwgY2hlY2tUZW1wbGF0ZU1ldGFkYXRhOiB0cnVlfSxcclxuXHRcdFx0XHRcdHBhdGhzOiB7ZW5hYmxlZDogZmFsc2UsIHRhc2tQYXRoczogW10sIG1hdGNoTW9kZTogJ3ByZWZpeCd9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXJyb3JzID0gY29uZmlnLnZhbGlkYXRlQ29uZmlnKGludmFsaWRDb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZXJyb3JzKS50b0NvbnRhaW4oJ0F0IGxlYXN0IG9uZSByZWNvZ25pdGlvbiBzdHJhdGVneSBtdXN0IGJlIGVuYWJsZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgdmFsaWRhdGUgZW1wdHkgdGFzayBmaWVsZHMnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWc6IFBhcnRpYWw8RmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24+ID0ge1xyXG5cdFx0XHRcdHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFza0ZpZWxkczogW10sXHJcblx0XHRcdFx0XHRcdHJlcXVpcmVBbGxGaWVsZHM6IGZhbHNlXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dGFnczoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dGFza1RhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0XHRtYXRjaE1vZGU6ICdleGFjdCdcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0ZW1wbGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlUGF0aHM6IFtdLFxyXG5cdFx0XHRcdFx0XHRjaGVja1RlbXBsYXRlTWV0YWRhdGE6IHRydWVcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRwYXRoczoge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dGFza1BhdGhzOiBbXSxcclxuXHRcdFx0XHRcdFx0bWF0Y2hNb2RlOiAncHJlZml4J1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGVycm9ycyA9IGNvbmZpZy52YWxpZGF0ZUNvbmZpZyhpbnZhbGlkQ29uZmlnKTtcclxuXHRcdFx0ZXhwZWN0KGVycm9ycykudG9Db250YWluKCdNZXRhZGF0YSBzdHJhdGVneSByZXF1aXJlcyBhdCBsZWFzdCBvbmUgdGFzayBmaWVsZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCB2YWxpZGF0ZSBjdXN0b20gY29udGVudCBzb3VyY2UnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDb25maWc6IFBhcnRpYWw8RmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24+ID0ge1xyXG5cdFx0XHRcdGZpbGVUYXNrUHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0Y29udGVudFNvdXJjZTogJ2N1c3RvbScsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGRlZmF1bHRTdGF0dXM6ICcgJyxcclxuXHRcdFx0XHRcdHByZWZlckZyb250bWF0dGVyVGl0bGU6IHRydWVcclxuXHRcdFx0XHRcdC8vIE1pc3NpbmcgY3VzdG9tQ29udGVudEZpZWxkXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXJyb3JzID0gY29uZmlnLnZhbGlkYXRlQ29uZmlnKGludmFsaWRDb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZXJyb3JzKS50b0NvbnRhaW4oJ0N1c3RvbSBjb250ZW50IHNvdXJjZSByZXF1aXJlcyBjdXN0b21Db250ZW50RmllbGQgdG8gYmUgc3BlY2lmaWVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIHZhbGlkYXRlIGNhY2hlIFRUTCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW52YWxpZENvbmZpZzogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4gPSB7XHJcblx0XHRcdFx0cGVyZm9ybWFuY2U6IHtcclxuXHRcdFx0XHRcdGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVDYWNoaW5nOiB0cnVlLFxyXG5cdFx0XHRcdFx0Y2FjaGVUVEw6IC0xMDAwXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXJyb3JzID0gY29uZmlnLnZhbGlkYXRlQ29uZmlnKGludmFsaWRDb25maWcpO1xyXG5cdFx0XHRleHBlY3QoZXJyb3JzKS50b0NvbnRhaW4oJ0NhY2hlIFRUTCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ2NvbmZpZ3VyYXRpb24gcHJlc2V0cycsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgY3JlYXRlIGJhc2ljIHByZXNldCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJlc2V0ID0gRmlsZVNvdXJjZUNvbmZpZy5jcmVhdGVQcmVzZXQoJ2Jhc2ljJyk7XHJcblxyXG5cdFx0XHRleHBlY3QocHJlc2V0LmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChwcmVzZXQucmVjb2duaXRpb25TdHJhdGVnaWVzPy5tZXRhZGF0YS5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocHJlc2V0LnJlY29nbml0aW9uU3RyYXRlZ2llcz8udGFncy5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnRlbXBsYXRlcy5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnBhdGhzLmVuYWJsZWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCBjcmVhdGUgbWV0YWRhdGEtb25seSBwcmVzZXQnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHByZXNldCA9IEZpbGVTb3VyY2VDb25maWcuY3JlYXRlUHJlc2V0KCdtZXRhZGF0YS1vbmx5Jyk7XHJcblxyXG5cdFx0XHRleHBlY3QocHJlc2V0LmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChwcmVzZXQucmVjb2duaXRpb25TdHJhdGVnaWVzPy5tZXRhZGF0YS5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocHJlc2V0LnJlY29nbml0aW9uU3RyYXRlZ2llcz8udGFncy5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgY3JlYXRlIHRhZy1vbmx5IHByZXNldCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJlc2V0ID0gRmlsZVNvdXJjZUNvbmZpZy5jcmVhdGVQcmVzZXQoJ3RhZy1vbmx5Jyk7XHJcblxyXG5cdFx0XHRleHBlY3QocHJlc2V0LmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChwcmVzZXQucmVjb2duaXRpb25TdHJhdGVnaWVzPy5tZXRhZGF0YS5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnRhZ3MuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgY3JlYXRlIGZ1bGwgcHJlc2V0JywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcmVzZXQgPSBGaWxlU291cmNlQ29uZmlnLmNyZWF0ZVByZXNldCgnZnVsbCcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHByZXNldC5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocHJlc2V0LnJlY29nbml0aW9uU3RyYXRlZ2llcz8ubWV0YWRhdGEuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnRhZ3MuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnRlbXBsYXRlcy5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHByZXNldC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnBhdGhzLmVuYWJsZWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKCdpc0VuYWJsZWQnLCAoKSA9PiB7XHJcblx0XHRpdCgnc2hvdWxkIHJldHVybiBmYWxzZSBieSBkZWZhdWx0JywgKCkgPT4ge1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLmlzRW5hYmxlZCgpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIHRydWUgd2hlbiBlbmFibGVkJywgKCkgPT4ge1xyXG5cdFx0XHRjb25maWcudXBkYXRlQ29uZmlnKHtlbmFibGVkOiB0cnVlfSk7XHJcblx0XHRcdGV4cGVjdChjb25maWcuaXNFbmFibGVkKCkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==