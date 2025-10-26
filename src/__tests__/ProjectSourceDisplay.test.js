/**
 * Tests for Project Source Display Issues
 *
 * This test file verifies that project sources are correctly identified and displayed:
 * 1. Metadata-based projects show as "metadata" type, not "config"
 * 2. Config file-based projects show as "config" type
 * 3. Path-based projects show as "path" type
 * 4. The backup determineTgProject method in ConfigurableTaskParser works correctly
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { MetadataParseMode } from "../types/TaskParserConfig";
// Mock Obsidian types
class MockTFile {
    constructor(path, name, parent = null) {
        this.path = path;
        this.name = name;
        this.parent = parent;
        this.stat = { mtime: Date.now() };
    }
}
class MockTFolder {
    constructor(path, name, parent = null, children = []) {
        this.path = path;
        this.name = name;
        this.parent = parent;
        this.children = children;
    }
}
describe("Project Source Display", () => {
    let parser;
    let defaultConfig;
    beforeEach(() => {
        defaultConfig = {
            parseMetadata: true,
            metadataParseMode: MetadataParseMode.Both,
            parseTags: true,
            parseComments: true,
            parseHeadings: true,
            maxIndentSize: 8,
            maxParseIterations: 100000,
            maxMetadataIterations: 10,
            maxTagLength: 100,
            maxEmojiValueLength: 200,
            maxStackOperations: 4000,
            maxStackSize: 1000,
            emojiMapping: {
                "🔺": "priority",
                "⏫": "priority",
                "🔼": "priority",
                "🔽": "priority",
                "⏬": "priority",
            },
            specialTagPrefixes: {
                due: "dueDate",
                start: "startDate",
                scheduled: "scheduledDate",
            },
            statusMapping: {
                todo: " ",
                done: "x",
                cancelled: "-",
                forwarded: ">",
                scheduled: "<",
                question: "?",
                important: "!",
                star: "*",
                quote: '"',
                location: "l",
                bookmark: "b",
                information: "i",
                savings: "S",
                idea: "I",
                pros: "p",
                cons: "c",
                fire: "f",
                key: "k",
                win: "w",
                up: "u",
                down: "d",
            },
            projectConfig: {
                enableEnhancedProject: true,
                metadataConfig: {
                    enabled: true,
                    metadataKey: "projectName",
                },
                configFile: {
                    enabled: true,
                    fileName: "project.md",
                    searchRecursively: false,
                },
                pathMappings: [],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
            },
        };
        parser = new MarkdownTaskParser(defaultConfig);
    });
    describe("Metadata-based Project Detection", () => {
        it("should correctly identify metadata-based projects with type 'metadata'", () => {
            var _a, _b, _c;
            const taskContent = "- [ ] Test task";
            const filePath = "test.md";
            const fileMetadata = {
                projectName: "MyMetadataProject",
                priority: 3,
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("metadata");
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("MyMetadataProject");
            expect((_c = task.tgProject) === null || _c === void 0 ? void 0 : _c.source).toBe("projectName");
        });
        it("should NOT detect metadata projects when metadata detection is disabled", () => {
            // Disable metadata detection
            const configWithDisabledMetadata = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { metadataConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig.metadataConfig), { enabled: false }) }) });
            parser = new MarkdownTaskParser(configWithDisabledMetadata);
            const taskContent = "- [ ] Test task";
            const filePath = "test.md";
            const fileMetadata = {
                projectName: "MyMetadataProject",
                priority: 3,
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeUndefined();
        });
        it("should use correct metadata key for project detection", () => {
            var _a, _b, _c;
            // Use custom metadata key
            const configWithCustomKey = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { metadataConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig.metadataConfig), { metadataKey: "customProject" }) }) });
            parser = new MarkdownTaskParser(configWithCustomKey);
            const taskContent = "- [ ] Test task";
            const filePath = "test.md";
            const fileMetadata = {
                customProject: "CustomKeyProject",
                projectName: "ShouldBeIgnored", // This should be ignored
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("metadata");
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("CustomKeyProject");
            expect((_c = task.tgProject) === null || _c === void 0 ? void 0 : _c.source).toBe("customProject");
        });
    });
    describe("Config File-based Project Detection", () => {
        it("should correctly identify config file-based projects with type 'config'", () => {
            var _a, _b, _c;
            const taskContent = "- [ ] Test task";
            const filePath = "folder/test.md";
            const projectConfigData = {
                project: "MyConfigProject",
                description: "Test project from config",
            };
            const tasks = parser.parse(taskContent, filePath, undefined, projectConfigData);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("config");
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("MyConfigProject");
            expect((_c = task.tgProject) === null || _c === void 0 ? void 0 : _c.source).toBe("project.md");
        });
        it("should NOT detect config file projects when config file detection is disabled", () => {
            // Disable config file detection
            const configWithDisabledConfigFile = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { configFile: Object.assign(Object.assign({}, defaultConfig.projectConfig.configFile), { enabled: false }) }) });
            parser = new MarkdownTaskParser(configWithDisabledConfigFile);
            const taskContent = "- [ ] Test task";
            const filePath = "folder/test.md";
            const projectConfigData = {
                project: "MyConfigProject",
                description: "Test project from config",
            };
            const tasks = parser.parse(taskContent, filePath, undefined, projectConfigData);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeUndefined();
        });
    });
    describe("Path-based Project Detection", () => {
        it("should correctly identify path-based projects with type 'path'", () => {
            var _a, _b, _c;
            // Enable path mapping
            const configWithPathMapping = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { pathMappings: [
                        {
                            pathPattern: "projects/",
                            projectName: "MyPathProject",
                            enabled: true,
                        },
                    ] }) });
            parser = new MarkdownTaskParser(configWithPathMapping);
            const taskContent = "- [ ] Test task";
            const filePath = "projects/subfolder/test.md";
            const tasks = parser.parse(taskContent, filePath);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("path");
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("MyPathProject");
            expect((_c = task.tgProject) === null || _c === void 0 ? void 0 : _c.source).toBe("projects/");
        });
        it("should NOT detect path projects when path mapping is disabled", () => {
            // Disable path mapping
            const configWithDisabledPathMapping = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { pathMappings: [
                        {
                            pathPattern: "projects/",
                            projectName: "MyPathProject",
                            enabled: false, // DISABLED
                        },
                    ] }) });
            parser = new MarkdownTaskParser(configWithDisabledPathMapping);
            const taskContent = "- [ ] Test task";
            const filePath = "projects/subfolder/test.md";
            const tasks = parser.parse(taskContent, filePath);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeUndefined();
        });
    });
    describe("Project Detection Priority", () => {
        it("should prioritize path > metadata > config file", () => {
            var _a, _b;
            // Enable all detection methods
            const configWithAllMethods = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { pathMappings: [
                        {
                            pathPattern: "projects/",
                            projectName: "PathProject",
                            enabled: true,
                        },
                    ], metadataConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig.metadataConfig), { enabled: true }), configFile: Object.assign(Object.assign({}, defaultConfig.projectConfig.configFile), { enabled: true }) }) });
            parser = new MarkdownTaskParser(configWithAllMethods);
            const taskContent = "- [ ] Test task";
            const filePath = "projects/test.md";
            const fileMetadata = {
                projectName: "MetadataProject",
            };
            const projectConfigData = {
                project: "ConfigProject",
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata, projectConfigData);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("path"); // Should prioritize path
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("PathProject");
        });
        it("should fall back to metadata when path is disabled", () => {
            var _a, _b;
            // Disable path mapping, enable metadata and config
            const configWithMetadataFallback = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { pathMappings: [
                        {
                            pathPattern: "projects/",
                            projectName: "PathProject",
                            enabled: false, // DISABLED
                        },
                    ], metadataConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig.metadataConfig), { enabled: true }), configFile: Object.assign(Object.assign({}, defaultConfig.projectConfig.configFile), { enabled: true }) }) });
            parser = new MarkdownTaskParser(configWithMetadataFallback);
            const taskContent = "- [ ] Test task";
            const filePath = "projects/test.md";
            const fileMetadata = {
                projectName: "MetadataProject",
            };
            const projectConfigData = {
                project: "ConfigProject",
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata, projectConfigData);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("metadata"); // Should fall back to metadata
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("MetadataProject");
        });
        it("should fall back to config file when both path and metadata are disabled", () => {
            var _a, _b;
            // Disable path and metadata, enable config file
            const configWithConfigFallback = Object.assign(Object.assign({}, defaultConfig), { projectConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig), { pathMappings: [
                        {
                            pathPattern: "projects/",
                            projectName: "PathProject",
                            enabled: false, // DISABLED
                        },
                    ], metadataConfig: Object.assign(Object.assign({}, defaultConfig.projectConfig.metadataConfig), { enabled: false }), configFile: Object.assign(Object.assign({}, defaultConfig.projectConfig.configFile), { enabled: true }) }) });
            parser = new MarkdownTaskParser(configWithConfigFallback);
            const taskContent = "- [ ] Test task";
            const filePath = "projects/test.md";
            const fileMetadata = {
                projectName: "MetadataProject",
            };
            const projectConfigData = {
                project: "ConfigProject",
            };
            const tasks = parser.parse(taskContent, filePath, fileMetadata, projectConfigData);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("config"); // Should fall back to config file
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("ConfigProject");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFNvdXJjZURpc3BsYXkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlByb2plY3RTb3VyY2VEaXNwbGF5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0dBUUc7QUFFSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFaEYsc0JBQXNCO0FBQ3RCLE1BQU0sU0FBUztJQUNkLFlBQ1EsSUFBWSxFQUNaLElBQVksRUFDWixTQUE2QixJQUFJO1FBRmpDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFFeEMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0NBRUQ7QUFFRCxNQUFNLFdBQVc7SUFDaEIsWUFDUSxJQUFZLEVBQ1osSUFBWSxFQUNaLFNBQTZCLElBQUksRUFDakMsV0FBd0MsRUFBRTtRQUgxQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFdBQU0sR0FBTixNQUFNLENBQTJCO1FBQ2pDLGFBQVEsR0FBUixRQUFRLENBQWtDO0lBQy9DLENBQUM7Q0FDSjtBQUVELFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdkMsSUFBSSxNQUEwQixDQUFDO0lBQy9CLElBQUksYUFBK0IsQ0FBQztJQUVwQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsYUFBYSxHQUFHO1lBQ2YsYUFBYSxFQUFFLElBQUk7WUFDbkIsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtZQUN6QyxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGFBQWEsRUFB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O2FBQzlCLENBQUM7WUFDRixNQUFNLGlCQUFpQixHQUFHO2dCQUN6QixPQUFPLEVBQUUsZUFBZTthQUN4QixDQUFDO1lBRUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FDekIsV0FBVyxFQUNYLFFBQVEsRUFDUixZQUFZLEVBQ1osaUJBQWlCLENBQ2pCLENBQUM7WUFFRixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFBLElBQUksQ0FBQyxTQUFTLDBDQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtDQUFrQztZQUMvRSxNQUFNLENBQUMsTUFBQSxJQUFJLENBQUMsU0FBUywwQ0FBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3RzIGZvciBQcm9qZWN0IFNvdXJjZSBEaXNwbGF5IElzc3Vlc1xyXG4gKlxyXG4gKiBUaGlzIHRlc3QgZmlsZSB2ZXJpZmllcyB0aGF0IHByb2plY3Qgc291cmNlcyBhcmUgY29ycmVjdGx5IGlkZW50aWZpZWQgYW5kIGRpc3BsYXllZDpcclxuICogMS4gTWV0YWRhdGEtYmFzZWQgcHJvamVjdHMgc2hvdyBhcyBcIm1ldGFkYXRhXCIgdHlwZSwgbm90IFwiY29uZmlnXCJcclxuICogMi4gQ29uZmlnIGZpbGUtYmFzZWQgcHJvamVjdHMgc2hvdyBhcyBcImNvbmZpZ1wiIHR5cGVcclxuICogMy4gUGF0aC1iYXNlZCBwcm9qZWN0cyBzaG93IGFzIFwicGF0aFwiIHR5cGVcclxuICogNC4gVGhlIGJhY2t1cCBkZXRlcm1pbmVUZ1Byb2plY3QgbWV0aG9kIGluIENvbmZpZ3VyYWJsZVRhc2tQYXJzZXIgd29ya3MgY29ycmVjdGx5XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTWFya2Rvd25UYXNrUGFyc2VyIH0gZnJvbSBcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQgeyBUYXNrUGFyc2VyQ29uZmlnLCBNZXRhZGF0YVBhcnNlTW9kZSB9IGZyb20gXCIuLi90eXBlcy9UYXNrUGFyc2VyQ29uZmlnXCI7XHJcblxyXG4vLyBNb2NrIE9ic2lkaWFuIHR5cGVzXHJcbmNsYXNzIE1vY2tURmlsZSB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgcGF0aDogc3RyaW5nLFxyXG5cdFx0cHVibGljIG5hbWU6IHN0cmluZyxcclxuXHRcdHB1YmxpYyBwYXJlbnQ6IE1vY2tURm9sZGVyIHwgbnVsbCA9IG51bGxcclxuXHQpIHtcclxuXHRcdHRoaXMuc3RhdCA9IHsgbXRpbWU6IERhdGUubm93KCkgfTtcclxuXHR9XHJcblx0c3RhdDogeyBtdGltZTogbnVtYmVyIH07XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tURm9sZGVyIHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHB1YmxpYyBwYXRoOiBzdHJpbmcsXHJcblx0XHRwdWJsaWMgbmFtZTogc3RyaW5nLFxyXG5cdFx0cHVibGljIHBhcmVudDogTW9ja1RGb2xkZXIgfCBudWxsID0gbnVsbCxcclxuXHRcdHB1YmxpYyBjaGlsZHJlbjogKE1vY2tURmlsZSB8IE1vY2tURm9sZGVyKVtdID0gW11cclxuXHQpIHt9XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiUHJvamVjdCBTb3VyY2UgRGlzcGxheVwiLCAoKSA9PiB7XHJcblx0bGV0IHBhcnNlcjogTWFya2Rvd25UYXNrUGFyc2VyO1xyXG5cdGxldCBkZWZhdWx0Q29uZmlnOiBUYXNrUGFyc2VyQ29uZmlnO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdGRlZmF1bHRDb25maWcgPSB7XHJcblx0XHRcdHBhcnNlTWV0YWRhdGE6IHRydWUsXHJcblx0XHRcdG1ldGFkYXRhUGFyc2VNb2RlOiBNZXRhZGF0YVBhcnNlTW9kZS5Cb3RoLFxyXG5cdFx0XHRwYXJzZVRhZ3M6IHRydWUsXHJcblx0XHRcdHBhcnNlQ29tbWVudHM6IHRydWUsXHJcblx0XHRcdHBhcnNlSGVhZGluZ3M6IHRydWUsXHJcblx0XHRcdG1heEluZGVudFNpemU6IDgsXHJcblx0XHRcdG1heFBhcnNlSXRlcmF0aW9uczogMTAwMDAwLFxyXG5cdFx0XHRtYXhNZXRhZGF0YUl0ZXJhdGlvbnM6IDEwLFxyXG5cdFx0XHRtYXhUYWdMZW5ndGg6IDEwMCxcclxuXHRcdFx0bWF4RW1vamlWYWx1ZUxlbmd0aDogMjAwLFxyXG5cdFx0XHRtYXhTdGFja09wZXJhdGlvbnM6IDQwMDAsXHJcblx0XHRcdG1heFN0YWNrU2l6ZTogMTAwMCxcclxuXHRcdFx0ZW1vamlNYXBwaW5nOiB7XHJcblx0XHRcdFx0XCLwn5S6XCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcIuKPq1wiOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XCLwn5S8XCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcIvCflL1cIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFwi4o+sXCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0c3BlY2lhbFRhZ1ByZWZpeGVzOiB7XHJcblx0XHRcdFx0ZHVlOiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRzdGFydDogXCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRzY2hlZHVsZWQ6IFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRzdGF0dXNNYXBwaW5nOiB7XHJcblx0XHRcdFx0dG9kbzogXCIgXCIsXHJcblx0XHRcdFx0ZG9uZTogXCJ4XCIsXHJcblx0XHRcdFx0Y2FuY2VsbGVkOiBcIi1cIixcclxuXHRcdFx0XHRmb3J3YXJkZWQ6IFwiPlwiLFxyXG5cdFx0XHRcdHNjaGVkdWxlZDogXCI8XCIsXHJcblx0XHRcdFx0cXVlc3Rpb246IFwiP1wiLFxyXG5cdFx0XHRcdGltcG9ydGFudDogXCIhXCIsXHJcblx0XHRcdFx0c3RhcjogXCIqXCIsXHJcblx0XHRcdFx0cXVvdGU6ICdcIicsXHJcblx0XHRcdFx0bG9jYXRpb246IFwibFwiLFxyXG5cdFx0XHRcdGJvb2ttYXJrOiBcImJcIixcclxuXHRcdFx0XHRpbmZvcm1hdGlvbjogXCJpXCIsXHJcblx0XHRcdFx0c2F2aW5nczogXCJTXCIsXHJcblx0XHRcdFx0aWRlYTogXCJJXCIsXHJcblx0XHRcdFx0cHJvczogXCJwXCIsXHJcblx0XHRcdFx0Y29uczogXCJjXCIsXHJcblx0XHRcdFx0ZmlyZTogXCJmXCIsXHJcblx0XHRcdFx0a2V5OiBcImtcIixcclxuXHRcdFx0XHR3aW46IFwid1wiLFxyXG5cdFx0XHRcdHVwOiBcInVcIixcclxuXHRcdFx0XHRkb3duOiBcImRcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0cHJvamVjdENvbmZpZzoge1xyXG5cdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3ROYW1lXCIsXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdGZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoZGVmYXVsdENvbmZpZyk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWV0YWRhdGEtYmFzZWQgUHJvamVjdCBEZXRlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY29ycmVjdGx5IGlkZW50aWZ5IG1ldGFkYXRhLWJhc2VkIHByb2plY3RzIHdpdGggdHlwZSAnbWV0YWRhdGEnXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJvamVjdE5hbWU6IFwiTXlNZXRhZGF0YVByb2plY3RcIixcclxuXHRcdFx0XHRwcmlvcml0eTogMyxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKHRhc2tDb250ZW50LCBmaWxlUGF0aCwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0Py50eXBlKS50b0JlKFwibWV0YWRhdGFcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8ubmFtZSkudG9CZShcIk15TWV0YWRhdGFQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/LnNvdXJjZSkudG9CZShcInByb2plY3ROYW1lXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgTk9UIGRldGVjdCBtZXRhZGF0YSBwcm9qZWN0cyB3aGVuIG1ldGFkYXRhIGRldGVjdGlvbiBpcyBkaXNhYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIERpc2FibGUgbWV0YWRhdGEgZGV0ZWN0aW9uXHJcblx0XHRcdGNvbnN0IGNvbmZpZ1dpdGhEaXNhYmxlZE1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRDb25maWcsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZzoge1xyXG5cdFx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZy5wcm9qZWN0Q29uZmlnISxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEubWV0YWRhdGFDb25maWcsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWdXaXRoRGlzYWJsZWRNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrQ29udGVudCA9IFwiLSBbIF0gVGVzdCB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJ0ZXN0Lm1kXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0TmFtZTogXCJNeU1ldGFkYXRhUHJvamVjdFwiLFxyXG5cdFx0XHRcdHByaW9yaXR5OiAzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2UodGFza0NvbnRlbnQsIGZpbGVQYXRoLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1c2UgY29ycmVjdCBtZXRhZGF0YSBrZXkgZm9yIHByb2plY3QgZGV0ZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVXNlIGN1c3RvbSBtZXRhZGF0YSBrZXlcclxuXHRcdFx0Y29uc3QgY29uZmlnV2l0aEN1c3RvbUtleSA9IHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEsXHJcblx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLm1ldGFkYXRhQ29uZmlnLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YUtleTogXCJjdXN0b21Qcm9qZWN0XCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZ1dpdGhDdXN0b21LZXkpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0Y3VzdG9tUHJvamVjdDogXCJDdXN0b21LZXlQcm9qZWN0XCIsXHJcblx0XHRcdFx0cHJvamVjdE5hbWU6IFwiU2hvdWxkQmVJZ25vcmVkXCIsIC8vIFRoaXMgc2hvdWxkIGJlIGlnbm9yZWRcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKHRhc2tDb250ZW50LCBmaWxlUGF0aCwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0Py50eXBlKS50b0JlKFwibWV0YWRhdGFcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8ubmFtZSkudG9CZShcIkN1c3RvbUtleVByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8uc291cmNlKS50b0JlKFwiY3VzdG9tUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbmZpZyBGaWxlLWJhc2VkIFByb2plY3QgRGV0ZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNvcnJlY3RseSBpZGVudGlmeSBjb25maWcgZmlsZS1iYXNlZCBwcm9qZWN0cyB3aXRoIHR5cGUgJ2NvbmZpZydcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrQ29udGVudCA9IFwiLSBbIF0gVGVzdCB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJmb2xkZXIvdGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0Q29uZmlnRGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIk15Q29uZmlnUHJvamVjdFwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRlc3QgcHJvamVjdCBmcm9tIGNvbmZpZ1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2UoXHJcblx0XHRcdFx0dGFza0NvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWdEYXRhXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3QpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8udHlwZSkudG9CZShcImNvbmZpZ1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0Py5uYW1lKS50b0JlKFwiTXlDb25maWdQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/LnNvdXJjZSkudG9CZShcInByb2plY3QubWRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBOT1QgZGV0ZWN0IGNvbmZpZyBmaWxlIHByb2plY3RzIHdoZW4gY29uZmlnIGZpbGUgZGV0ZWN0aW9uIGlzIGRpc2FibGVkXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gRGlzYWJsZSBjb25maWcgZmlsZSBkZXRlY3Rpb25cclxuXHRcdFx0Y29uc3QgY29uZmlnV2l0aERpc2FibGVkQ29uZmlnRmlsZSA9IHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEsXHJcblx0XHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEuY29uZmlnRmlsZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsIC8vIERJU0FCTEVEXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZ1dpdGhEaXNhYmxlZENvbmZpZ0ZpbGUpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwiZm9sZGVyL3Rlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgcHJvamVjdENvbmZpZ0RhdGEgPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNeUNvbmZpZ1Byb2plY3RcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUZXN0IHByb2plY3QgZnJvbSBjb25maWdcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnRGF0YVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQYXRoLWJhc2VkIFByb2plY3QgRGV0ZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNvcnJlY3RseSBpZGVudGlmeSBwYXRoLWJhc2VkIHByb2plY3RzIHdpdGggdHlwZSAncGF0aCdcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBFbmFibGUgcGF0aCBtYXBwaW5nXHJcblx0XHRcdGNvbnN0IGNvbmZpZ1dpdGhQYXRoTWFwcGluZyA9IHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEsXHJcblx0XHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcInByb2plY3RzL1wiLFxyXG5cdFx0XHRcdFx0XHRcdHByb2plY3ROYW1lOiBcIk15UGF0aFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWdXaXRoUGF0aE1hcHBpbmcpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwicHJvamVjdHMvc3ViZm9sZGVyL3Rlc3QubWRcIjtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKHRhc2tDb250ZW50LCBmaWxlUGF0aCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3QpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8udHlwZSkudG9CZShcInBhdGhcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8ubmFtZSkudG9CZShcIk15UGF0aFByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8uc291cmNlKS50b0JlKFwicHJvamVjdHMvXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgTk9UIGRldGVjdCBwYXRoIHByb2plY3RzIHdoZW4gcGF0aCBtYXBwaW5nIGlzIGRpc2FibGVkXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gRGlzYWJsZSBwYXRoIG1hcHBpbmdcclxuXHRcdFx0Y29uc3QgY29uZmlnV2l0aERpc2FibGVkUGF0aE1hcHBpbmcgPSB7XHJcblx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZyxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLFxyXG5cdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJwcm9qZWN0cy9cIixcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJNeVBhdGhQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsIC8vIERJU0FCTEVEXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZ1dpdGhEaXNhYmxlZFBhdGhNYXBwaW5nKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tDb250ZW50ID0gXCItIFsgXSBUZXN0IHRhc2tcIjtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInByb2plY3RzL3N1YmZvbGRlci90ZXN0Lm1kXCI7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZSh0YXNrQ29udGVudCwgZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQcm9qZWN0IERldGVjdGlvbiBQcmlvcml0eVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBwcmlvcml0aXplIHBhdGggPiBtZXRhZGF0YSA+IGNvbmZpZyBmaWxlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gRW5hYmxlIGFsbCBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdFx0XHRjb25zdCBjb25maWdXaXRoQWxsTWV0aG9kcyA9IHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEsXHJcblx0XHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcInByb2plY3RzL1wiLFxyXG5cdFx0XHRcdFx0XHRcdHByb2plY3ROYW1lOiBcIlBhdGhQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLm1ldGFkYXRhQ29uZmlnLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNvbmZpZ0ZpbGU6IHtcclxuXHRcdFx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZy5wcm9qZWN0Q29uZmlnIS5jb25maWdGaWxlLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWdXaXRoQWxsTWV0aG9kcyk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrQ29udGVudCA9IFwiLSBbIF0gVGVzdCB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJwcm9qZWN0cy90ZXN0Lm1kXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0TmFtZTogXCJNZXRhZGF0YVByb2plY3RcIixcclxuXHRcdFx0fTtcclxuXHRcdFx0Y29uc3QgcHJvamVjdENvbmZpZ0RhdGEgPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJDb25maWdQcm9qZWN0XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZShcclxuXHRcdFx0XHR0YXNrQ29udGVudCxcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGEsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ0RhdGFcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0Py50eXBlKS50b0JlKFwicGF0aFwiKTsgLy8gU2hvdWxkIHByaW9yaXRpemUgcGF0aFxyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/Lm5hbWUpLnRvQmUoXCJQYXRoUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGZhbGwgYmFjayB0byBtZXRhZGF0YSB3aGVuIHBhdGggaXMgZGlzYWJsZWRcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBEaXNhYmxlIHBhdGggbWFwcGluZywgZW5hYmxlIG1ldGFkYXRhIGFuZCBjb25maWdcclxuXHRcdFx0Y29uc3QgY29uZmlnV2l0aE1ldGFkYXRhRmFsbGJhY2sgPSB7XHJcblx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZyxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLFxyXG5cdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJwcm9qZWN0cy9cIixcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEubWV0YWRhdGFDb25maWcsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLmNvbmZpZ0ZpbGUsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZ1dpdGhNZXRhZGF0YUZhbGxiYWNrKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tDb250ZW50ID0gXCItIFsgXSBUZXN0IHRhc2tcIjtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInByb2plY3RzL3Rlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHByb2plY3ROYW1lOiBcIk1ldGFkYXRhUHJvamVjdFwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0Q29uZmlnRGF0YSA9IHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIkNvbmZpZ1Byb2plY3RcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YSxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnRGF0YVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0ZXhwZWN0KHRhc2sudGdQcm9qZWN0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/LnR5cGUpLnRvQmUoXCJtZXRhZGF0YVwiKTsgLy8gU2hvdWxkIGZhbGwgYmFjayB0byBtZXRhZGF0YVxyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/Lm5hbWUpLnRvQmUoXCJNZXRhZGF0YVByb2plY3RcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsIGJhY2sgdG8gY29uZmlnIGZpbGUgd2hlbiBib3RoIHBhdGggYW5kIG1ldGFkYXRhIGFyZSBkaXNhYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIERpc2FibGUgcGF0aCBhbmQgbWV0YWRhdGEsIGVuYWJsZSBjb25maWcgZmlsZVxyXG5cdFx0XHRjb25zdCBjb25maWdXaXRoQ29uZmlnRmFsbGJhY2sgPSB7XHJcblx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZyxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0XHQuLi5kZWZhdWx0Q29uZmlnLnByb2plY3RDb25maWchLFxyXG5cdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJwcm9qZWN0cy9cIixcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdC4uLmRlZmF1bHRDb25maWcucHJvamVjdENvbmZpZyEubWV0YWRhdGFDb25maWcsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNvbmZpZ0ZpbGU6IHtcclxuXHRcdFx0XHRcdFx0Li4uZGVmYXVsdENvbmZpZy5wcm9qZWN0Q29uZmlnIS5jb25maWdGaWxlLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWdXaXRoQ29uZmlnRmFsbGJhY2spO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwicHJvamVjdHMvdGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJvamVjdE5hbWU6IFwiTWV0YWRhdGFQcm9qZWN0XCIsXHJcblx0XHRcdH07XHJcblx0XHRcdGNvbnN0IHByb2plY3RDb25maWdEYXRhID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiQ29uZmlnUHJvamVjdFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2UoXHJcblx0XHRcdFx0dGFza0NvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWdEYXRhXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3QpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8udHlwZSkudG9CZShcImNvbmZpZ1wiKTsgLy8gU2hvdWxkIGZhbGwgYmFjayB0byBjb25maWcgZmlsZVxyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/Lm5hbWUpLnRvQmUoXCJDb25maWdQcm9qZWN0XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=