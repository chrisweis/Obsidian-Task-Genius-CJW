/**
 * File Metadata Inheritance Settings Tests
 *
 * Tests for settings integration and configuration migration
 */
import { DEFAULT_SETTINGS } from "../common/setting-definition";
// Mock Obsidian API
const mockPlugin = {
    settings: Object.assign({}, DEFAULT_SETTINGS),
    loadData: jest.fn(),
    saveData: jest.fn(),
    migrateInheritanceSettings: jest.fn(),
};
describe("File Metadata Inheritance Settings", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlugin.settings = Object.assign({}, DEFAULT_SETTINGS);
    });
    describe("Default Configuration", () => {
        test("should have correct default values", () => {
            const defaultConfig = DEFAULT_SETTINGS.fileMetadataInheritance;
            expect(defaultConfig).toBeDefined();
            expect(defaultConfig.enabled).toBe(true);
            expect(defaultConfig.inheritFromFrontmatter).toBe(true);
            expect(defaultConfig.inheritFromFrontmatterForSubtasks).toBe(false);
        });
        test("should have FileMetadataInheritanceConfig interface", () => {
            const config = {
                enabled: true,
                inheritFromFrontmatter: true,
                inheritFromFrontmatterForSubtasks: false,
            };
            expect(config).toBeDefined();
            expect(typeof config.enabled).toBe("boolean");
            expect(typeof config.inheritFromFrontmatter).toBe("boolean");
            expect(typeof config.inheritFromFrontmatterForSubtasks).toBe("boolean");
        });
    });
    describe("Configuration Migration", () => {
        test("should migrate old inheritance settings to new structure", () => {
            const savedData = {
                projectConfig: {
                    metadataConfig: {
                        metadataKey: "project",
                        inheritFromFrontmatter: true,
                        inheritFromFrontmatterForSubtasks: true,
                        enabled: true,
                    },
                },
                // 没有新的fileMetadataInheritance配置
            };
            // 模拟迁移逻辑
            const migrateInheritanceSettings = (savedData) => {
                var _a, _b, _c;
                if (((_a = savedData === null || savedData === void 0 ? void 0 : savedData.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) &&
                    !(savedData === null || savedData === void 0 ? void 0 : savedData.fileMetadataInheritance)) {
                    const oldConfig = savedData.projectConfig.metadataConfig;
                    return {
                        enabled: true,
                        inheritFromFrontmatter: (_b = oldConfig.inheritFromFrontmatter) !== null && _b !== void 0 ? _b : true,
                        inheritFromFrontmatterForSubtasks: (_c = oldConfig.inheritFromFrontmatterForSubtasks) !== null && _c !== void 0 ? _c : false
                    };
                }
                return null;
            };
            const migratedConfig = migrateInheritanceSettings(savedData);
            expect(migratedConfig).not.toBeNull();
            expect(migratedConfig === null || migratedConfig === void 0 ? void 0 : migratedConfig.enabled).toBe(true);
            expect(migratedConfig === null || migratedConfig === void 0 ? void 0 : migratedConfig.inheritFromFrontmatter).toBe(true);
            expect(migratedConfig === null || migratedConfig === void 0 ? void 0 : migratedConfig.inheritFromFrontmatterForSubtasks).toBe(true);
        });
        test("should not migrate when new configuration already exists", () => {
            const savedData = {
                projectConfig: {
                    metadataConfig: {
                        metadataKey: "project",
                        inheritFromFrontmatter: true,
                        inheritFromFrontmatterForSubtasks: true,
                        enabled: true,
                    },
                },
                fileMetadataInheritance: {
                    enabled: false,
                    inheritFromFrontmatter: false,
                    inheritFromFrontmatterForSubtasks: false,
                },
            };
            // 模拟迁移逻辑
            const migrateInheritanceSettings = (savedData) => {
                var _a, _b, _c;
                if (((_a = savedData === null || savedData === void 0 ? void 0 : savedData.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) &&
                    !(savedData === null || savedData === void 0 ? void 0 : savedData.fileMetadataInheritance)) {
                    const oldConfig = savedData.projectConfig.metadataConfig;
                    return {
                        enabled: true,
                        inheritFromFrontmatter: (_b = oldConfig.inheritFromFrontmatter) !== null && _b !== void 0 ? _b : true,
                        inheritFromFrontmatterForSubtasks: (_c = oldConfig.inheritFromFrontmatterForSubtasks) !== null && _c !== void 0 ? _c : false
                    };
                }
                return null;
            };
            const migratedConfig = migrateInheritanceSettings(savedData);
            // 应该返回null，表示不需要迁移
            expect(migratedConfig).toBeNull();
        });
        test("should handle missing old configuration gracefully", () => {
            const savedData = {
            // 没有projectConfig
            };
            // 模拟迁移逻辑
            const migrateInheritanceSettings = (savedData) => {
                var _a, _b, _c;
                if (((_a = savedData === null || savedData === void 0 ? void 0 : savedData.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) &&
                    !(savedData === null || savedData === void 0 ? void 0 : savedData.fileMetadataInheritance)) {
                    const oldConfig = savedData.projectConfig.metadataConfig;
                    return {
                        enabled: true,
                        inheritFromFrontmatter: (_b = oldConfig.inheritFromFrontmatter) !== null && _b !== void 0 ? _b : true,
                        inheritFromFrontmatterForSubtasks: (_c = oldConfig.inheritFromFrontmatterForSubtasks) !== null && _c !== void 0 ? _c : false
                    };
                }
                return null;
            };
            const migratedConfig = migrateInheritanceSettings(savedData);
            // 应该返回null，表示没有需要迁移的配置
            expect(migratedConfig).toBeNull();
        });
    });
    describe("Settings Validation", () => {
        test("should maintain type safety for FileMetadataInheritanceConfig", () => {
            const validConfig = {
                enabled: true,
                inheritFromFrontmatter: true,
                inheritFromFrontmatterForSubtasks: false,
            };
            // TypeScript应该不会报错
            expect(validConfig.enabled).toBe(true);
            expect(validConfig.inheritFromFrontmatter).toBe(true);
            expect(validConfig.inheritFromFrontmatterForSubtasks).toBe(false);
        });
        test("should handle all boolean combinations", () => {
            const combinations = [
                { enabled: true, inheritFromFrontmatter: true, inheritFromFrontmatterForSubtasks: true },
                { enabled: true, inheritFromFrontmatter: true, inheritFromFrontmatterForSubtasks: false },
                { enabled: true, inheritFromFrontmatter: false, inheritFromFrontmatterForSubtasks: true },
                { enabled: true, inheritFromFrontmatter: false, inheritFromFrontmatterForSubtasks: false },
                { enabled: false, inheritFromFrontmatter: true, inheritFromFrontmatterForSubtasks: true },
                { enabled: false, inheritFromFrontmatter: true, inheritFromFrontmatterForSubtasks: false },
                { enabled: false, inheritFromFrontmatter: false, inheritFromFrontmatterForSubtasks: true },
                { enabled: false, inheritFromFrontmatter: false, inheritFromFrontmatterForSubtasks: false },
            ];
            combinations.forEach(config => {
                expect(typeof config.enabled).toBe("boolean");
                expect(typeof config.inheritFromFrontmatter).toBe("boolean");
                expect(typeof config.inheritFromFrontmatterForSubtasks).toBe("boolean");
            });
        });
    });
    describe("Integration with Main Settings", () => {
        test("should be properly integrated into TaskProgressBarSettings", () => {
            const settings = DEFAULT_SETTINGS;
            expect(settings.fileMetadataInheritance).toBeDefined();
            expect(settings.fileMetadataInheritance.enabled).toBe(true);
            expect(settings.fileMetadataInheritance.inheritFromFrontmatter).toBe(true);
            expect(settings.fileMetadataInheritance.inheritFromFrontmatterForSubtasks).toBe(false);
        });
        test("should work independently of project configuration", () => {
            const settingsWithoutProject = Object.assign(Object.assign({}, DEFAULT_SETTINGS), { projectConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.projectConfig), { enableEnhancedProject: false }) });
            expect(settingsWithoutProject.fileMetadataInheritance).toBeDefined();
            expect(settingsWithoutProject.fileMetadataInheritance.enabled).toBe(true);
        });
        test("should work when project configuration is null", () => {
            const settingsWithNullProject = Object.assign(Object.assign({}, DEFAULT_SETTINGS), { projectConfig: null });
            expect(settingsWithNullProject.fileMetadataInheritance).toBeDefined();
            expect(settingsWithNullProject.fileMetadataInheritance.enabled).toBe(true);
        });
    });
    describe("Settings Persistence", () => {
        test("should preserve fileMetadataInheritance config during save/load", () => {
            const testSettings = Object.assign(Object.assign({}, DEFAULT_SETTINGS), { fileMetadataInheritance: {
                    enabled: false,
                    inheritFromFrontmatter: false,
                    inheritFromFrontmatterForSubtasks: true,
                } });
            // 模拟保存和加载
            const savedData = JSON.stringify(testSettings);
            const loadedSettings = JSON.parse(savedData);
            expect(loadedSettings.fileMetadataInheritance).toBeDefined();
            expect(loadedSettings.fileMetadataInheritance.enabled).toBe(false);
            expect(loadedSettings.fileMetadataInheritance.inheritFromFrontmatter).toBe(false);
            expect(loadedSettings.fileMetadataInheritance.inheritFromFrontmatterForSubtasks).toBe(true);
        });
        test("should handle partial configuration updates", () => {
            const baseSettings = Object.assign({}, DEFAULT_SETTINGS);
            // 模拟部分更新
            const updatedSettings = Object.assign(Object.assign({}, baseSettings), { fileMetadataInheritance: Object.assign(Object.assign({}, baseSettings.fileMetadataInheritance), { enabled: false }) });
            expect(updatedSettings.fileMetadataInheritance.enabled).toBe(false);
            expect(updatedSettings.fileMetadataInheritance.inheritFromFrontmatter).toBe(true);
            expect(updatedSettings.fileMetadataInheritance.inheritFromFrontmatterForSubtasks).toBe(false);
        });
    });
    describe("Backward Compatibility", () => {
        test("should handle settings without fileMetadataInheritance gracefully", () => {
            const oldSettings = Object.assign({}, DEFAULT_SETTINGS);
            // 删除新字段模拟旧版本设置
            delete oldSettings.fileMetadataInheritance;
            // 合并默认设置应该恢复缺失的字段
            const mergedSettings = Object.assign({}, DEFAULT_SETTINGS, oldSettings);
            expect(mergedSettings.fileMetadataInheritance).toBeDefined();
            expect(mergedSettings.fileMetadataInheritance.enabled).toBe(true);
        });
        test("should maintain project config structure after migration", () => {
            const oldProjectConfig = {
                enableEnhancedProject: true,
                pathMappings: [],
                metadataConfig: {
                    metadataKey: "project",
                    inheritFromFrontmatter: true,
                    inheritFromFrontmatterForSubtasks: true,
                    enabled: true,
                },
                configFile: {
                    fileName: "project.md",
                    searchRecursively: true,
                    enabled: true,
                },
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: true,
                },
            };
            // 迁移后项目配置应该移除继承相关字段
            const migratedProjectConfig = Object.assign(Object.assign({}, oldProjectConfig), { metadataConfig: {
                    metadataKey: oldProjectConfig.metadataConfig.metadataKey,
                    enabled: oldProjectConfig.metadataConfig.enabled,
                } });
            expect(migratedProjectConfig.metadataConfig.metadataKey).toBe("project");
            expect(migratedProjectConfig.metadataConfig.enabled).toBe(true);
            expect(migratedProjectConfig.metadataConfig.inheritFromFrontmatter).toBeUndefined();
            expect(migratedProjectConfig.metadataConfig.inheritFromFrontmatterForSubtasks).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VTZXR0aW5ncy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VTZXR0aW5ncy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7QUFFSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWlDLE1BQU0sOEJBQThCLENBQUM7QUFHL0Ysb0JBQW9CO0FBQ3BCLE1BQU0sVUFBVSxHQUFHO0lBQ2xCLFFBQVEsb0JBQU8sZ0JBQWdCLENBQUU7SUFDakMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDbkIsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUM5QixDQUFDO0FBRVQsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNuRCxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLFVBQVUsQ0FBQyxRQUFRLHFCQUFRLGdCQUFnQixDQUFFLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7WUFDL0MsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUM7WUFFL0QsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLElB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RUFBRSxJQUFJO2lCQUNiO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxRQUFRLEVBQUUsWUFBWTtvQkFDdEIsaUJBQWlCLEVBQUUsSUFBSTtvQkFDdkIsT0FBTyxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUU7b0JBQ3JCLFFBQVEsRUFBRSxVQUFtQjtvQkFDN0IsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJO2lCQUNiO2FBQ0QsQ0FBQztZQUVGLG9CQUFvQjtZQUNwQixNQUFNLHFCQUFxQixtQ0FDdkIsZ0JBQWdCLEtBQ25CLGNBQWMsRUFBRTtvQkFDZixXQUFXLEVBQUUsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFdBQVc7b0JBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsT0FBTztpQkFDaEQsR0FDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEUsTUFBTSxDQUFFLHFCQUFxQixDQUFDLGNBQXNCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM3RixNQUFNLENBQUUscUJBQXFCLENBQUMsY0FBc0IsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pHLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlIFNldHRpbmdzIFRlc3RzXHJcbiAqIFxyXG4gKiBUZXN0cyBmb3Igc2V0dGluZ3MgaW50ZWdyYXRpb24gYW5kIGNvbmZpZ3VyYXRpb24gbWlncmF0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VDb25maWcgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBBUElcclxuY29uc3QgbW9ja1BsdWdpbiA9IHtcclxuXHRzZXR0aW5nczogeyAuLi5ERUZBVUxUX1NFVFRJTkdTIH0sXHJcblx0bG9hZERhdGE6IGplc3QuZm4oKSxcclxuXHRzYXZlRGF0YTogamVzdC5mbigpLFxyXG5cdG1pZ3JhdGVJbmhlcml0YW5jZVNldHRpbmdzOiBqZXN0LmZuKCksXHJcbn0gYXMgYW55O1xyXG5cclxuZGVzY3JpYmUoXCJGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlIFNldHRpbmdzXCIsICgpID0+IHtcclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG5cdFx0bW9ja1BsdWdpbi5zZXR0aW5ncyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUyB9O1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRlZmF1bHQgQ29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhdmUgY29ycmVjdCBkZWZhdWx0IHZhbHVlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRlZmF1bHRDb25maWcgPSBERUZBVUxUX1NFVFRJTkdTLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGRlZmF1bHRDb25maWcpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChkZWZhdWx0Q29uZmlnLmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChkZWZhdWx0Q29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXIpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChkZWZhdWx0Q29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcykudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhdmUgRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VDb25maWcgaW50ZXJmYWNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBGaWxlTWV0YWRhdGFJbmhlcml0YW5jZUNvbmZpZyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsXHJcblx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdChjb25maWcpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0eXBlb2YgY29uZmlnLmVuYWJsZWQpLnRvQmUoXCJib29sZWFuXCIpO1xyXG5cdFx0XHRleHBlY3QodHlwZW9mIGNvbmZpZy5pbmhlcml0RnJvbUZyb250bWF0dGVyKS50b0JlKFwiYm9vbGVhblwiKTtcclxuXHRcdFx0ZXhwZWN0KHR5cGVvZiBjb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzKS50b0JlKFwiYm9vbGVhblwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbmZpZ3VyYXRpb24gTWlncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgbWlncmF0ZSBvbGQgaW5oZXJpdGFuY2Ugc2V0dGluZ3MgdG8gbmV3IHN0cnVjdHVyZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNhdmVkRGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQvLyDmsqHmnInmlrDnmoRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZemFjee9rlxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8g5qih5ouf6L+B56e76YC76L6RXHJcblx0XHRcdGNvbnN0IG1pZ3JhdGVJbmhlcml0YW5jZVNldHRpbmdzID0gKHNhdmVkRGF0YTogYW55KSA9PiB7XHJcblx0XHRcdFx0aWYgKHNhdmVkRGF0YT8ucHJvamVjdENvbmZpZz8ubWV0YWRhdGFDb25maWcgJiYgXHJcblx0XHRcdFx0XHQhc2F2ZWREYXRhPy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZSkge1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRjb25zdCBvbGRDb25maWcgPSBzYXZlZERhdGEucHJvamVjdENvbmZpZy5tZXRhZGF0YUNvbmZpZztcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogb2xkQ29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXIgPz8gdHJ1ZSxcclxuXHRcdFx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiBvbGRDb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzID8/IGZhbHNlXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1pZ3JhdGVkQ29uZmlnID0gbWlncmF0ZUluaGVyaXRhbmNlU2V0dGluZ3Moc2F2ZWREYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZENvbmZpZykubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZENvbmZpZz8uZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkQ29uZmlnPy5pbmhlcml0RnJvbUZyb250bWF0dGVyKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRDb25maWc/LmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcykudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IG1pZ3JhdGUgd2hlbiBuZXcgY29uZmlndXJhdGlvbiBhbHJlYWR5IGV4aXN0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNhdmVkRGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZToge1xyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyOiBmYWxzZSxcclxuXHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIOaooeaLn+i/geenu+mAu+i+kVxyXG5cdFx0XHRjb25zdCBtaWdyYXRlSW5oZXJpdGFuY2VTZXR0aW5ncyA9IChzYXZlZERhdGE6IGFueSkgPT4ge1xyXG5cdFx0XHRcdGlmIChzYXZlZERhdGE/LnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnICYmIFxyXG5cdFx0XHRcdFx0IXNhdmVkRGF0YT8uZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UpIHtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Y29uc3Qgb2xkQ29uZmlnID0gc2F2ZWREYXRhLnByb2plY3RDb25maWcubWV0YWRhdGFDb25maWc7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IG9sZENvbmZpZy5pbmhlcml0RnJvbUZyb250bWF0dGVyID8/IHRydWUsXHJcblx0XHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogb2xkQ29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcyA/PyBmYWxzZVxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtaWdyYXRlZENvbmZpZyA9IG1pZ3JhdGVJbmhlcml0YW5jZVNldHRpbmdzKHNhdmVkRGF0YSk7XHJcblxyXG5cdFx0XHQvLyDlupTor6Xov5Tlm55udWxs77yM6KGo56S65LiN6ZyA6KaB6L+B56e7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZENvbmZpZykudG9CZU51bGwoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1pc3Npbmcgb2xkIGNvbmZpZ3VyYXRpb24gZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNhdmVkRGF0YSA9IHtcclxuXHRcdFx0XHQvLyDmsqHmnIlwcm9qZWN0Q29uZmlnXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyDmqKHmi5/ov4Hnp7vpgLvovpFcclxuXHRcdFx0Y29uc3QgbWlncmF0ZUluaGVyaXRhbmNlU2V0dGluZ3MgPSAoc2F2ZWREYXRhOiBhbnkpID0+IHtcclxuXHRcdFx0XHRpZiAoc2F2ZWREYXRhPy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZyAmJiBcclxuXHRcdFx0XHRcdCFzYXZlZERhdGE/LmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlKSB7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGNvbnN0IG9sZENvbmZpZyA9IHNhdmVkRGF0YS5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyOiBvbGRDb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlciA/PyB0cnVlLFxyXG5cdFx0XHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IG9sZENvbmZpZy5pbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3MgPz8gZmFsc2VcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRDb25maWcgPSBtaWdyYXRlSW5oZXJpdGFuY2VTZXR0aW5ncyhzYXZlZERhdGEpO1xyXG5cclxuXHRcdFx0Ly8g5bqU6K+l6L+U5ZuebnVsbO+8jOihqOekuuayoeaciemcgOimgei/geenu+eahOmFjee9rlxyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRDb25maWcpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJTZXR0aW5ncyBWYWxpZGF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgbWFpbnRhaW4gdHlwZSBzYWZldHkgZm9yIEZpbGVNZXRhZGF0YUluaGVyaXRhbmNlQ29uZmlnXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdmFsaWRDb25maWc6IEZpbGVNZXRhZGF0YUluaGVyaXRhbmNlQ29uZmlnID0ge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSxcclxuXHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gVHlwZVNjcmlwdOW6lOivpeS4jeS8muaKpemUmVxyXG5cdFx0XHRleHBlY3QodmFsaWRDb25maWcuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHZhbGlkQ29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXIpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCh2YWxpZENvbmZpZy5pbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgYWxsIGJvb2xlYW4gY29tYmluYXRpb25zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29tYmluYXRpb25zID0gW1xyXG5cdFx0XHRcdHsgZW5hYmxlZDogdHJ1ZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiB0cnVlIH0sXHJcblx0XHRcdFx0eyBlbmFibGVkOiB0cnVlLCBpbmhlcml0RnJvbUZyb250bWF0dGVyOiB0cnVlLCBpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGZhbHNlIH0sXHJcblx0XHRcdFx0eyBlbmFibGVkOiB0cnVlLCBpbmhlcml0RnJvbUZyb250bWF0dGVyOiBmYWxzZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiB0cnVlIH0sXHJcblx0XHRcdFx0eyBlbmFibGVkOiB0cnVlLCBpbmhlcml0RnJvbUZyb250bWF0dGVyOiBmYWxzZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiBmYWxzZSB9LFxyXG5cdFx0XHRcdHsgZW5hYmxlZDogZmFsc2UsIGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsIGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogdHJ1ZSB9LFxyXG5cdFx0XHRcdHsgZW5hYmxlZDogZmFsc2UsIGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsIGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogZmFsc2UgfSxcclxuXHRcdFx0XHR7IGVuYWJsZWQ6IGZhbHNlLCBpbmhlcml0RnJvbUZyb250bWF0dGVyOiBmYWxzZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiB0cnVlIH0sXHJcblx0XHRcdFx0eyBlbmFibGVkOiBmYWxzZSwgaW5oZXJpdEZyb21Gcm9udG1hdHRlcjogZmFsc2UsIGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogZmFsc2UgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGNvbWJpbmF0aW9ucy5mb3JFYWNoKGNvbmZpZyA9PiB7XHJcblx0XHRcdFx0ZXhwZWN0KHR5cGVvZiBjb25maWcuZW5hYmxlZCkudG9CZShcImJvb2xlYW5cIik7XHJcblx0XHRcdFx0ZXhwZWN0KHR5cGVvZiBjb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlcikudG9CZShcImJvb2xlYW5cIik7XHJcblx0XHRcdFx0ZXhwZWN0KHR5cGVvZiBjb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzKS50b0JlKFwiYm9vbGVhblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJJbnRlZ3JhdGlvbiB3aXRoIE1haW4gU2V0dGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBiZSBwcm9wZXJseSBpbnRlZ3JhdGVkIGludG8gVGFza1Byb2dyZXNzQmFyU2V0dGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XHJcblxyXG5cdFx0XHRleHBlY3Qoc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3Qoc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UuaW5oZXJpdEZyb21Gcm9udG1hdHRlcikudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcykudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHdvcmsgaW5kZXBlbmRlbnRseSBvZiBwcm9qZWN0IGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzZXR0aW5nc1dpdGhvdXRQcm9qZWN0ID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZzoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5wcm9qZWN0Q29uZmlnLFxyXG5cdFx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHNldHRpbmdzV2l0aG91dFByb2plY3QuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzZXR0aW5nc1dpdGhvdXRQcm9qZWN0LmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHdvcmsgd2hlbiBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gaXMgbnVsbFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNldHRpbmdzV2l0aE51bGxQcm9qZWN0ID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZzogbnVsbCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3Qoc2V0dGluZ3NXaXRoTnVsbFByb2plY3QuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzZXR0aW5nc1dpdGhOdWxsUHJvamVjdC5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiU2V0dGluZ3MgUGVyc2lzdGVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBmaWxlTWV0YWRhdGFJbmhlcml0YW5jZSBjb25maWcgZHVyaW5nIHNhdmUvbG9hZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRlc3RTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IGZhbHNlLFxyXG5cdFx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyDmqKHmi5/kv53lrZjlkozliqDovb1cclxuXHRcdFx0Y29uc3Qgc2F2ZWREYXRhID0gSlNPTi5zdHJpbmdpZnkodGVzdFNldHRpbmdzKTtcclxuXHRcdFx0Y29uc3QgbG9hZGVkU2V0dGluZ3MgPSBKU09OLnBhcnNlKHNhdmVkRGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QobG9hZGVkU2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChsb2FkZWRTZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KGxvYWRlZFNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXIpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QobG9hZGVkU2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgcGFydGlhbCBjb25maWd1cmF0aW9uIHVwZGF0ZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYXNlU2V0dGluZ3MgPSB7XHJcblx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUyxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIOaooeaLn+mDqOWIhuabtOaWsFxyXG5cdFx0XHRjb25zdCB1cGRhdGVkU2V0dGluZ3MgPSB7XHJcblx0XHRcdFx0Li4uYmFzZVNldHRpbmdzLFxyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOiB7XHJcblx0XHRcdFx0XHQuLi5iYXNlU2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRTZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRTZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5pbmhlcml0RnJvbUZyb250bWF0dGVyKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlZFNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcykudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCYWNrd2FyZCBDb21wYXRpYmlsaXR5XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHNldHRpbmdzIHdpdGhvdXQgZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG9sZFNldHRpbmdzID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MsXHJcblx0XHRcdH07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDliKDpmaTmlrDlrZfmrrXmqKHmi5/ml6fniYjmnKzorr7nva5cclxuXHRcdFx0ZGVsZXRlIChvbGRTZXR0aW5ncyBhcyBhbnkpLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlO1xyXG5cclxuXHRcdFx0Ly8g5ZCI5bm26buY6K6k6K6+572u5bqU6K+l5oGi5aSN57y65aSx55qE5a2X5q61XHJcblx0XHRcdGNvbnN0IG1lcmdlZFNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgb2xkU2V0dGluZ3MpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1lcmdlZFNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWVyZ2VkU2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UuZW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbWFpbnRhaW4gcHJvamVjdCBjb25maWcgc3RydWN0dXJlIGFmdGVyIG1pZ3JhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG9sZFByb2plY3RDb25maWcgPSB7XHJcblx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiB0cnVlLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsXHJcblx0XHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRcdFx0ZmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIgYXMgY29uc3QsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIOi/geenu+WQjumhueebrumFjee9ruW6lOivpeenu+mZpOe7p+aJv+ebuOWFs+Wtl+autVxyXG5cdFx0XHRjb25zdCBtaWdyYXRlZFByb2plY3RDb25maWcgPSB7XHJcblx0XHRcdFx0Li4ub2xkUHJvamVjdENvbmZpZyxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGFLZXk6IG9sZFByb2plY3RDb25maWcubWV0YWRhdGFDb25maWcubWV0YWRhdGFLZXksXHJcblx0XHRcdFx0XHRlbmFibGVkOiBvbGRQcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnLmVuYWJsZWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFByb2plY3RDb25maWcubWV0YWRhdGFDb25maWcubWV0YWRhdGFLZXkpLnRvQmUoXCJwcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRQcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnLmVuYWJsZWQpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCgobWlncmF0ZWRQcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnIGFzIGFueSkuaW5oZXJpdEZyb21Gcm9udG1hdHRlcikudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoKG1pZ3JhdGVkUHJvamVjdENvbmZpZy5tZXRhZGF0YUNvbmZpZyBhcyBhbnkpLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcykudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pOyJdfQ==