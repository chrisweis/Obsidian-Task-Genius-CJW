/**
 * TaskParsingService Integration Tests
 *
 * Tests the complete project parsing workflow including:
 * - Task parsing with enhanced project support
 * - Integration with ProjectConfigManager
 * - Metadata mapping functionality
 * - Default project naming strategies
 * - Priority order of different project sources
 */
import { __awaiter } from "tslib";
import { TaskParsingService, } from "../services/task-parsing-service";
import { MetadataParseMode } from "../types/TaskParserConfig";
// Mock Obsidian types (reuse from ProjectConfigManager tests)
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
class MockVault {
    constructor() {
        this.files = new Map();
        this.folders = new Map();
        this.fileContents = new Map();
    }
    addFile(path, content) {
        const fileName = path.split("/").pop() || "";
        const file = new MockTFile(path, fileName);
        this.files.set(path, file);
        this.fileContents.set(path, content);
        return file;
    }
    addFolder(path) {
        const folderName = path.split("/").pop() || "";
        const folder = new MockTFolder(path, folderName);
        this.folders.set(path, folder);
        return folder;
    }
    getAbstractFileByPath(path) {
        return this.files.get(path) || null;
    }
    getFileByPath(path) {
        return this.files.get(path) || null;
    }
    read(file) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fileContents.get(file.path) || "";
        });
    }
}
class MockMetadataCache {
    constructor() {
        this.cache = new Map();
    }
    setFileMetadata(path, metadata) {
        this.cache.set(path, { frontmatter: metadata });
    }
    getFileCache(file) {
        return this.cache.get(file.path);
    }
}
describe("TaskParsingService Integration", () => {
    let vault;
    let metadataCache;
    let parsingService;
    const createParserConfig = (enableEnhancedProject = true) => ({
        parseMetadata: true,
        parseTags: true,
        parseComments: false,
        parseHeadings: false,
        maxIndentSize: 4,
        maxParseIterations: 1000,
        maxMetadataIterations: 100,
        maxTagLength: 100,
        maxEmojiValueLength: 200,
        maxStackOperations: 1000,
        maxStackSize: 100,
        statusMapping: {
            todo: " ",
            done: "x",
            cancelled: "-",
        },
        emojiMapping: {
            "📅": "dueDate",
            "🔺": "priority",
        },
        metadataParseMode: MetadataParseMode.Both,
        specialTagPrefixes: {
            project: "project",
            area: "area",
            context: "context",
        },
        projectConfig: enableEnhancedProject
            ? {
                enableEnhancedProject: true,
                pathMappings: [],
                metadataConfig: {
                    metadataKey: "project",
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
                    enabled: false,
                },
            }
            : undefined,
    });
    const createServiceOptions = (parserConfig, customProjectOptions) => ({
        vault: vault,
        metadataCache: metadataCache,
        parserConfig,
        projectConfigOptions: customProjectOptions || {
            configFileName: "project.md",
            searchRecursively: true,
            metadataKey: "project",
            pathMappings: [],
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
            metadataConfigEnabled: true,
            configFileEnabled: true,
        },
    });
    beforeEach(() => {
        vault = new MockVault();
        metadataCache = new MockMetadataCache();
    });
    describe("Enhanced project parsing", () => {
        it("should parse tasks with path-based projects", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [
                    {
                        pathPattern: "Work",
                        projectName: "Work Project",
                        enabled: true,
                    },
                ],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                enhancedProjectEnabled: true,
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            const content = `
- [ ] Complete report 📅 2024-01-15
- [x] Review documentation
- [ ] Send email to team 🔺 high
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "Work/tasks.md");
            expect(tasks).toHaveLength(3);
            // Check that all tasks have the path-based project
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toEqual({
                    type: "path",
                    name: "Work Project",
                    source: "Work",
                    readonly: true,
                });
            });
            // Check specific task properties
            expect(tasks[0].content).toBe("Complete report");
            expect(tasks[0].metadata.dueDate).toBe(1705248000000);
            expect(tasks[0].completed).toBe(false);
            expect(tasks[1].content).toBe("Review documentation");
            expect(tasks[1].completed).toBe(true);
            expect(tasks[2].content).toBe("Send email to team");
            expect(tasks[2].metadata.priority).toBe(4);
        }));
        it("should parse tasks with metadata-based projects", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("Personal/notes.md", "# Personal Notes");
            metadataCache.setFileMetadata("Personal/notes.md", {
                project: "Personal Development",
                author: "John Doe",
            });
            const content = `
- [ ] Read self-help book 📅 2024-02-01
- [ ] Exercise for 30 minutes
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "Personal/notes.md");
            expect(tasks).toHaveLength(2);
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toEqual({
                    type: "metadata",
                    name: "Personal Development",
                    source: "project",
                    readonly: true,
                });
            });
        }));
        it("should parse tasks with config file-based projects", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Set up config file
            vault.addFile("Projects/project.md", "project: Research Project");
            vault.addFile("Projects/tasks.md", "# Research Tasks");
            // Set metadata for config file
            metadataCache.setFileMetadata("Projects/project.md", {
                project: "Research Project",
            });
            // Mock folder structure
            const file = vault.addFile("Projects/tasks.md", "# Research Tasks");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const content = `
- [ ] Literature review
- [ ] Data collection 🔺 medium
- [ ] Analysis 📅 2024-03-15
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "Projects/tasks.md");
            expect(tasks).toHaveLength(3);
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toEqual({
                    type: "config",
                    name: "Research Project",
                    source: "project.md",
                    readonly: true,
                });
            });
        }));
        it("should parse tasks with default project naming", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: true,
                },
                enhancedProjectEnabled: true,
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            const content = `
- [ ] Task without explicit project
- [x] Another completed task
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "Documents/my-project-notes.md");
            expect(tasks).toHaveLength(2);
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toEqual({
                    type: "default",
                    name: "my-project-notes",
                    source: "filename",
                    readonly: true,
                });
            });
        }));
    });
    describe("Metadata mappings", () => {
        it("should apply metadata mappings during parsing", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                    {
                        sourceKey: "importance",
                        targetKey: "priority",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                enhancedProjectEnabled: true,
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "Test Project",
                deadline: "2024-04-01",
                importance: "critical",
                category: "work",
            });
            const content = `
- [ ] Important task with metadata mapping
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "test.md");
            const enhancedMetadata = yield parsingService.getEnhancedMetadata("test.md");
            expect(enhancedMetadata).toEqual({
                project: "Test Project",
                deadline: "2024-04-01",
                importance: "critical",
                category: "work",
                dueDate: new Date(2024, 3, 1).getTime(),
                priority: 5, // 'critical' converted to number (highest priority)
            });
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tgProject).toEqual({
                type: "metadata",
                name: "Test Project",
                source: "project",
                readonly: true,
            });
        }));
        it("should apply metadata mappings in Worker environment simulation", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "优先级",
                        targetKey: "priority",
                        enabled: true,
                    },
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                enhancedProjectEnabled: true,
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("worker-test.md", "# Test file for worker");
            metadataCache.setFileMetadata("worker-test.md", {
                project: "Worker Test Project",
                优先级: "high",
                deadline: "2024-05-01",
                description: "Test description",
            });
            // Simulate the Worker pre-computation process
            const enhancedProjectData = yield parsingService.computeEnhancedProjectData([
                "worker-test.md",
            ]);
            // Verify that the enhanced project data contains mapped metadata
            expect(enhancedProjectData.fileMetadataMap["worker-test.md"]).toEqual({
                project: "Worker Test Project",
                优先级: "high",
                deadline: "2024-05-01",
                description: "Test description",
                priority: 4,
                dueDate: new Date(2024, 4, 1).getTime(), // Mapped from 'deadline' and converted to timestamp
            });
            expect(enhancedProjectData.fileProjectMap["worker-test.md"]).toEqual({
                project: "Worker Test Project",
                source: "project",
                readonly: true,
            });
            // Now test that the parser would use this enhanced metadata correctly
            const content = `
- [ ] Chinese priority task with mapping [优先级::urgent]
- [ ] Another task with deadline [deadline::2024-06-01]
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "worker-test.md");
            expect(tasks).toHaveLength(2);
            // Verify that tasks inherit the mapped metadata from file frontmatter
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toEqual({
                    type: "metadata",
                    name: "Worker Test Project",
                    source: "project",
                    readonly: true,
                });
            });
            // Note: The file frontmatter metadata mappings should be available to tasks
            // but the individual task metadata parsing might override some values
        }));
        it("should not apply metadata mappings when enhanced project is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            // Create service without project config options (enhanced project disabled)
            const serviceOptions = {
                vault: vault,
                metadataCache: metadataCache,
                parserConfig,
                // No projectConfigOptions - enhanced project is disabled
            };
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("test-no-mapping.md", "# Test file");
            metadataCache.setFileMetadata("test-no-mapping.md", {
                project: "Test Project",
                deadline: "2024-04-01",
                importance: "critical",
                category: "work",
            });
            const content = `
- [ ] Task without metadata mapping
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "test-no-mapping.md");
            expect(tasks).toHaveLength(1);
            // Should not have tgProject when enhanced project is disabled
            expect(tasks[0].metadata.tgProject).toBeUndefined();
            // Original metadata should be preserved without mapping
            // Note: Since enhanced project is disabled, we won't have access to enhanced metadata
            // The task should still be parsed but without the enhanced features
        }));
        it("should ignore disabled metadata mappings", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: false, // Disabled mapping
                    },
                    {
                        sourceKey: "importance",
                        targetKey: "priority",
                        enabled: true, // Enabled mapping
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("test-partial.md", "# Test file");
            metadataCache.setFileMetadata("test-partial.md", {
                project: "Test Project",
                deadline: "2024-04-01",
                importance: "critical",
                category: "work",
            });
            const enhancedMetadata = yield parsingService.getEnhancedMetadata("test-partial.md");
            expect(enhancedMetadata).toEqual({
                project: "Test Project",
                deadline: "2024-04-01",
                importance: "critical",
                category: "work",
                priority: 5, // Should be mapped from 'importance' to 'priority' and converted to number (critical = 5)
            });
            // Should NOT have 'dueDate' field since that mapping is disabled
            expect(enhancedMetadata.dueDate).toBeUndefined();
        }));
        it("should use basic metadata with parseTasksFromContentBasic method", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("test-basic.md", "# Test file");
            metadataCache.setFileMetadata("test-basic.md", {
                project: "Test Project",
                deadline: "2024-04-01",
            });
            const content = `
- [ ] Task parsed with basic method
`;
            // Use the basic parsing method which should NOT apply metadata mappings
            const tasks = yield parsingService.parseTasksFromContentBasic(content, "test-basic.md");
            expect(tasks).toHaveLength(1);
            // Should not have tgProject when using basic parsing
            expect(tasks[0].metadata.tgProject).toBeUndefined();
        }));
        it("should apply metadata mappings to project configuration data", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "优先级",
                        targetKey: "priority",
                        enabled: true,
                    },
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Set up project config file in folder
            vault.addFile("TestProject/project.md", "project: Test Project with Config");
            metadataCache.setFileMetadata("TestProject/project.md", {
                project: "Test Project with Config",
                优先级: "high",
                deadline: "2024-05-01",
                description: "Project-level metadata",
            });
            // Set up a regular file in the same folder
            vault.addFile("TestProject/tasks.md", "# Tasks");
            metadataCache.setFileMetadata("TestProject/tasks.md", {
            // No file-level metadata for this test
            });
            // Mock folder structure
            const file = vault.getAbstractFileByPath("TestProject/tasks.md");
            const folder = vault.addFolder("TestProject");
            const configFile = vault.getAbstractFileByPath("TestProject/project.md");
            if (configFile && file) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            // Test enhanced project data computation
            const enhancedProjectData = yield parsingService.computeEnhancedProjectData([
                "TestProject/tasks.md",
            ]);
            // Verify that the project config data has mappings applied
            expect(enhancedProjectData.projectConfigMap["TestProject"]).toEqual({
                project: "Test Project with Config",
                优先级: "high",
                deadline: "2024-05-01",
                description: "Project-level metadata",
                priority: 4,
                dueDate: new Date(2024, 4, 1).getTime(), // Mapped from 'deadline' and converted to timestamp
            });
            // Verify that the file project mapping is correct
            expect(enhancedProjectData.fileProjectMap["TestProject/tasks.md"]).toEqual({
                project: "Test Project with Config",
                source: "project.md",
                readonly: true,
            });
        }));
        it("should inherit project-level attributes to tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "优先级",
                        targetKey: "priority",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // 设置项目配置文件，包含元数据
            vault.addFile("TestProject/project.md", "project: Test Project");
            metadataCache.setFileMetadata("TestProject/project.md", {
                project: "Test Project",
                优先级: "high",
                context: "work", // 这个应该被直接继承
            });
            // 设置任务文件（没有自己的元数据）
            vault.addFile("TestProject/tasks.md", "# Tasks");
            metadataCache.setFileMetadata("TestProject/tasks.md", {});
            // Mock 文件夹结构
            const file = vault.getAbstractFileByPath("TestProject/tasks.md");
            const folder = vault.addFolder("TestProject");
            const configFile = vault.getAbstractFileByPath("TestProject/project.md");
            if (configFile && file) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const content = `- [ ] 简单任务，应该继承项目属性`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "TestProject/tasks.md");
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            // 验证任务能够检测到项目
            expect(task.metadata.tgProject).toEqual({
                type: "config",
                name: "Test Project",
                source: "project.md",
                readonly: true,
            });
            // 核心验证：MetadataMapping 转写功能和项目属性继承
            expect(task.metadata.priority).toBe(4); // 从 '优先级' 映射而来，应该是数字 4 (high)
            expect(task.metadata.context).toBe("work"); // 直接从项目配置继承
            // 这个测试证明了：
            // 1. MetadataMapping 正常工作（'优先级' -> 'priority'）
            // 2. 任务能够继承项目级别的元数据属性
        }));
        it("should automatically convert date and priority fields during metadata mapping", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                    {
                        sourceKey: "urgency",
                        targetKey: "priority",
                        enabled: true,
                    },
                    {
                        sourceKey: "start_time",
                        targetKey: "startDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            vault.addFile("smart-conversion-test.md", "Test content");
            metadataCache.setFileMetadata("smart-conversion-test.md", {
                project: "Smart Conversion Test",
                deadline: "2025-07-15",
                urgency: "high",
                start_time: "2025-06-01",
                description: "Some text", // Should remain as string
            });
            const enhancedMetadata = yield parsingService.getEnhancedMetadata("smart-conversion-test.md");
            // Verify that date fields were converted to timestamps
            expect(typeof enhancedMetadata.dueDate).toBe("number");
            expect(enhancedMetadata.dueDate).toBe(new Date(2025, 6, 15).getTime()); // July 15, 2025
            expect(typeof enhancedMetadata.startDate).toBe("number");
            expect(enhancedMetadata.startDate).toBe(new Date(2025, 5, 1).getTime()); // June 1, 2025
            // Verify that priority field was converted to number
            expect(typeof enhancedMetadata.priority).toBe("number");
            expect(enhancedMetadata.priority).toBe(4); // 'high' -> 4
            // Verify that non-mapped fields remain unchanged
            expect(enhancedMetadata.description).toBe("Some text");
            expect(enhancedMetadata.project).toBe("Smart Conversion Test");
            // Verify that original values are preserved
            expect(enhancedMetadata.deadline).toBe("2025-07-15");
            expect(enhancedMetadata.urgency).toBe("high");
            expect(enhancedMetadata.start_time).toBe("2025-06-01");
        }));
        it("should handle priority mapping for various string formats", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "urgency",
                        targetKey: "priority",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Test different priority formats
            const testCases = [
                { input: "highest", expected: 5 },
                { input: "urgent", expected: 5 },
                { input: "high", expected: 4 },
                { input: "medium", expected: 3 },
                { input: "low", expected: 2 },
                { input: "lowest", expected: 1 },
                { input: "3", expected: 3 },
                { input: "unknown", expected: "unknown" }, // Should remain unchanged
            ];
            for (const [index, testCase] of testCases.entries()) {
                const fileName = `priority-test-${index}.md`;
                vault.addFile(fileName, "Test content");
                metadataCache.setFileMetadata(fileName, {
                    project: "Priority Test",
                    urgency: testCase.input,
                });
                const enhancedMetadata = yield parsingService.getEnhancedMetadata(fileName);
                expect(enhancedMetadata.priority).toBe(testCase.expected);
            }
        }));
    });
    describe("Priority order integration", () => {
        it("should prioritize path mappings over metadata and config", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [
                    {
                        pathPattern: "Priority",
                        projectName: "Path Priority Project",
                        enabled: true,
                    },
                ],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: true,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Set up competing project sources
            vault.addFile("Priority/tasks.md", "# Tasks");
            vault.addFile("Priority/project.md", "project: Config Project");
            metadataCache.setFileMetadata("Priority/tasks.md", {
                project: "Metadata Project",
            });
            // Mock folder structure
            const file = vault.getAbstractFileByPath("Priority/tasks.md");
            const folder = vault.addFolder("Priority");
            const configFile = vault.getAbstractFileByPath("Priority/project.md");
            if (file && configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const content = `
- [ ] Task with multiple project sources
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "Priority/tasks.md");
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tgProject).toEqual({
                type: "path",
                name: "Path Priority Project",
                source: "Priority",
                readonly: true,
            });
        }));
    });
    describe("Single task parsing", () => {
        it("should parse single task line with project information", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [
                    {
                        pathPattern: "SingleTask",
                        projectName: "Single Task Project",
                        enabled: true,
                    },
                ],
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            const taskLine = "- [ ] Single line task 📅 2024-05-01 🔺 high";
            const task = yield parsingService.parseTaskLine(taskLine, "SingleTask/note.md", 5);
            expect(task).not.toBeNull();
            expect(task.content).toBe("Single line task");
            expect(task.line).toBe(5);
            expect(task.metadata.dueDate).toBe(1714492800000);
            expect(task.metadata.priority).toBe(4);
            expect(task.metadata.tgProject).toEqual({
                type: "path",
                name: "Single Task Project",
                source: "SingleTask",
                readonly: true,
            });
        }));
    });
    describe("Enhanced project data computation", () => {
        it("should compute enhanced project data for multiple files", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [
                    {
                        pathPattern: "Work",
                        projectName: "Work Project",
                        enabled: true,
                    },
                ],
                metadataMappings: [
                    {
                        sourceKey: "deadline",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: true,
                },
                metadataConfigEnabled: true,
                configFileEnabled: true,
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Set up multiple files with different project sources
            vault.addFile("Work/tasks.md", "# Work Tasks");
            vault.addFile("Personal/notes.md", "# Personal Notes");
            vault.addFile("Research/project.md", "project: Research Project");
            vault.addFile("Research/data.md", "# Research Data");
            vault.addFile("Other/random.md", "# Random File");
            metadataCache.setFileMetadata("Personal/notes.md", {
                project: "Personal Project",
                deadline: "2024-06-01",
            });
            metadataCache.setFileMetadata("Research/project.md", {
                project: "Research Project",
            });
            // Mock folder structure for Research
            const researchFile = vault.getAbstractFileByPath("Research/data.md");
            const researchFolder = vault.addFolder("Research");
            const researchConfigFile = vault.getAbstractFileByPath("Research/project.md");
            if (researchFile && researchConfigFile) {
                researchFolder.children.push(researchConfigFile);
                researchFile.parent = researchFolder;
            }
            const filePaths = [
                "Work/tasks.md",
                "Personal/notes.md",
                "Research/data.md",
                "Other/random.md",
            ];
            const enhancedData = yield parsingService.computeEnhancedProjectData(filePaths);
            expect(enhancedData.fileProjectMap).toEqual({
                "Work/tasks.md": {
                    project: "Work Project",
                    source: "Work",
                    readonly: true,
                },
                "Personal/notes.md": {
                    project: "Personal Project",
                    source: "project",
                    readonly: true,
                },
                "Research/data.md": {
                    project: "Research Project",
                    source: "project.md",
                    readonly: true,
                },
                "Other/random.md": {
                    project: "random",
                    source: "filename",
                    readonly: true,
                },
            });
            expect(enhancedData.fileMetadataMap["Personal/notes.md"]).toEqual({
                project: "Personal Project",
                deadline: "2024-06-01",
                dueDate: new Date(2024, 5, 1).getTime(), // Converted to timestamp
            });
        }));
    });
    describe("Error handling and edge cases", () => {
        it("should handle parsing errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig);
            parsingService = new TaskParsingService(serviceOptions);
            // Test with malformed content
            const malformedContent = `
- [ ] Good task
- This is not a task
- [x] Another good task
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(malformedContent, "test.md");
            // Should parse valid tasks and ignore malformed lines
            expect(tasks).toHaveLength(2);
            expect(tasks[0].content).toBe("Good task");
            expect(tasks[1].content).toBe("Another good task");
        }));
        it("should work without enhanced project support", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig(false); // Disable enhanced project
            const serviceOptions = {
                vault: vault,
                metadataCache: metadataCache,
                parserConfig,
                // No projectConfigOptions
            };
            parsingService = new TaskParsingService(serviceOptions);
            const content = `
- [ ] Task without enhanced project support
- [x] Completed task
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "test.md");
            expect(tasks).toHaveLength(2);
            // Tasks should not have tgProject when enhanced project is disabled
            tasks.forEach((task) => {
                expect(task.metadata.tgProject).toBeUndefined();
            });
        }));
        it("should handle missing project config options gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = {
                vault: vault,
                metadataCache: metadataCache,
                parserConfig,
                // projectConfigOptions is undefined
            };
            parsingService = new TaskParsingService(serviceOptions);
            const content = `
- [ ] Task with missing config options
`;
            const tasks = yield parsingService.parseTasksFromContentLegacy(content, "test.md");
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tgProject).toBeUndefined();
        }));
    });
    describe("Performance optimizations", () => {
        it("should use date cache to improve performance when parsing many tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const parserConfig = createParserConfig();
            const serviceOptions = createServiceOptions(parserConfig, {
                configFileName: "project.md",
                searchRecursively: true,
                metadataKey: "project",
                pathMappings: [],
                metadataMappings: [
                    {
                        sourceKey: "due",
                        targetKey: "dueDate",
                        enabled: true,
                    },
                ],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: true,
                    enabled: false,
                },
            });
            parsingService = new TaskParsingService(serviceOptions);
            // Clear cache before test
            const { MarkdownTaskParser } = yield import("../dataflow/core/ConfigurableTaskParser");
            MarkdownTaskParser.clearDateCache();
            // Create many tasks with the same due date to test caching
            const taskContent = Array.from({ length: 1000 }, (_, i) => `- [ ] Task ${i} [due::2025-06-17]`).join("\n");
            vault.addFile("performance-test.md", taskContent);
            metadataCache.setFileMetadata("performance-test.md", {
                project: "Performance Test",
            });
            const startTime = performance.now();
            const tasks = yield parsingService.parseTasksFromContentLegacy(taskContent, "performance-test.md");
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            // Verify that all tasks have the correct due date
            expect(tasks).toHaveLength(1000);
            const expectedDate = new Date(2025, 5, 17).getTime(); // June 17, 2025 in local time
            tasks.forEach((task) => {
                expect(task.metadata.dueDate).toBe(expectedDate);
            });
            // Check cache statistics
            const cacheStats = MarkdownTaskParser.getDateCacheStats();
            expect(cacheStats.size).toBeGreaterThan(0);
            expect(cacheStats.size).toBeLessThanOrEqual(cacheStats.maxSize);
            // Log performance info for manual verification
            console.log(`Parsed ${tasks.length} tasks in ${parseTime.toFixed(2)}ms`);
            console.log(`Cache hit ratio should be high due to repeated dates`);
            console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
            // Performance should be reasonable (less than 100ms for 1000 tasks)
            expect(parseTime).toBeLessThan(1000); // 1 second should be more than enough
        }));
        it("should handle date cache size limit correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            const { MarkdownTaskParser } = yield import("../dataflow/core/ConfigurableTaskParser");
            // Clear cache before test
            MarkdownTaskParser.clearDateCache();
            const parserConfig = createParserConfig();
            // Increase maxParseIterations to handle more tasks
            parserConfig.maxParseIterations = 20000;
            const parser = new MarkdownTaskParser(parserConfig);
            // Create tasks with many different dates to test cache limit (reduced to 5000 for performance)
            const taskCount = 5000;
            const uniqueDates = Array.from({ length: taskCount }, (_, i) => {
                const date = new Date("2025-01-01");
                date.setDate(date.getDate() + i);
                return date.toISOString().split("T")[0];
            });
            const taskContent = uniqueDates
                .map((date, i) => `- [ ] Task ${i} [due::${date}]`)
                .join("\n");
            const tasks = parser.parse(taskContent, "cache-limit-test.md");
            // Verify that cache size doesn't exceed the limit
            const cacheStats = MarkdownTaskParser.getDateCacheStats();
            expect(cacheStats.size).toBeLessThanOrEqual(cacheStats.maxSize);
            // All tasks should still be parsed correctly
            expect(tasks).toHaveLength(taskCount);
            console.log(`Cache size after parsing ${tasks.length} tasks with unique dates: ${cacheStats.size}/${cacheStats.maxSize}`);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1BhcnNpbmdTZXJ2aWNlLmludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrUGFyc2luZ1NlcnZpY2UuaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7O0dBU0c7O0FBRUgsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUdoRiw4REFBOEQ7QUFDOUQsTUFBTSxTQUFTO0lBQ2QsWUFDUSxJQUFZLEVBQ1osSUFBWSxFQUNaLFNBQTZCLElBQUk7UUFGakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUV4QyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0lBQ25DLENBQUM7Q0FFRDtBQUVELE1BQU0sV0FBVztJQUNoQixZQUNRLElBQVksRUFDWixJQUFZLEVBQ1osU0FBNkIsSUFBSSxFQUNqQyxXQUF3QyxFQUFFO1FBSDFDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFDakMsYUFBUSxHQUFSLFFBQVEsQ0FBa0M7SUFDL0MsQ0FBQztDQUNKO0FBRUQsTUFBTSxTQUFTO0lBQWY7UUFDUyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7UUFDckMsWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ3pDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUE0QmxELENBQUM7SUExQkEsT0FBTyxDQUFDLElBQVksRUFBRSxPQUFlO1FBQ3BDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFL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QztRQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRhc2tQYXJzaW5nU2VydmljZSBJbnRlZ3JhdGlvbiBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyB0aGUgY29tcGxldGUgcHJvamVjdCBwYXJzaW5nIHdvcmtmbG93IGluY2x1ZGluZzpcclxuICogLSBUYXNrIHBhcnNpbmcgd2l0aCBlbmhhbmNlZCBwcm9qZWN0IHN1cHBvcnRcclxuICogLSBJbnRlZ3JhdGlvbiB3aXRoIFByb2plY3RDb25maWdNYW5hZ2VyXHJcbiAqIC0gTWV0YWRhdGEgbWFwcGluZyBmdW5jdGlvbmFsaXR5XHJcbiAqIC0gRGVmYXVsdCBwcm9qZWN0IG5hbWluZyBzdHJhdGVnaWVzXHJcbiAqIC0gUHJpb3JpdHkgb3JkZXIgb2YgZGlmZmVyZW50IHByb2plY3Qgc291cmNlc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7XHJcblx0VGFza1BhcnNpbmdTZXJ2aWNlLFxyXG5cdFRhc2tQYXJzaW5nU2VydmljZU9wdGlvbnMsXHJcbn0gZnJvbSBcIi4uL3NlcnZpY2VzL3Rhc2stcGFyc2luZy1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRhc2tQYXJzZXJDb25maWcsIE1ldGFkYXRhUGFyc2VNb2RlIH0gZnJvbSBcIi4uL3R5cGVzL1Rhc2tQYXJzZXJDb25maWdcIjtcclxuaW1wb3J0IHsgVGFzaywgVGdQcm9qZWN0IH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8vIE1vY2sgT2JzaWRpYW4gdHlwZXMgKHJldXNlIGZyb20gUHJvamVjdENvbmZpZ01hbmFnZXIgdGVzdHMpXHJcbmNsYXNzIE1vY2tURmlsZSB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgcGF0aDogc3RyaW5nLFxyXG5cdFx0cHVibGljIG5hbWU6IHN0cmluZyxcclxuXHRcdHB1YmxpYyBwYXJlbnQ6IE1vY2tURm9sZGVyIHwgbnVsbCA9IG51bGxcclxuXHQpIHtcclxuXHRcdHRoaXMuc3RhdCA9IHsgbXRpbWU6IERhdGUubm93KCkgfTtcclxuXHR9XHJcblx0c3RhdDogeyBtdGltZTogbnVtYmVyIH07XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tURm9sZGVyIHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHB1YmxpYyBwYXRoOiBzdHJpbmcsXHJcblx0XHRwdWJsaWMgbmFtZTogc3RyaW5nLFxyXG5cdFx0cHVibGljIHBhcmVudDogTW9ja1RGb2xkZXIgfCBudWxsID0gbnVsbCxcclxuXHRcdHB1YmxpYyBjaGlsZHJlbjogKE1vY2tURmlsZSB8IE1vY2tURm9sZGVyKVtdID0gW11cclxuXHQpIHt9XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tWYXVsdCB7XHJcblx0cHJpdmF0ZSBmaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBNb2NrVEZpbGU+KCk7XHJcblx0cHJpdmF0ZSBmb2xkZXJzID0gbmV3IE1hcDxzdHJpbmcsIE1vY2tURm9sZGVyPigpO1xyXG5cdHByaXZhdGUgZmlsZUNvbnRlbnRzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHJcblx0YWRkRmlsZShwYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IE1vY2tURmlsZSB7XHJcblx0XHRjb25zdCBmaWxlTmFtZSA9IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IFwiXCI7XHJcblx0XHRjb25zdCBmaWxlID0gbmV3IE1vY2tURmlsZShwYXRoLCBmaWxlTmFtZSk7XHJcblx0XHR0aGlzLmZpbGVzLnNldChwYXRoLCBmaWxlKTtcclxuXHRcdHRoaXMuZmlsZUNvbnRlbnRzLnNldChwYXRoLCBjb250ZW50KTtcclxuXHRcdHJldHVybiBmaWxlO1xyXG5cdH1cclxuXHJcblx0YWRkRm9sZGVyKHBhdGg6IHN0cmluZyk6IE1vY2tURm9sZGVyIHtcclxuXHRcdGNvbnN0IGZvbGRlck5hbWUgPSBwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBcIlwiO1xyXG5cdFx0Y29uc3QgZm9sZGVyID0gbmV3IE1vY2tURm9sZGVyKHBhdGgsIGZvbGRlck5hbWUpO1xyXG5cdFx0dGhpcy5mb2xkZXJzLnNldChwYXRoLCBmb2xkZXIpO1xyXG5cdFx0cmV0dXJuIGZvbGRlcjtcclxuXHR9XHJcblxyXG5cdGdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoOiBzdHJpbmcpOiBNb2NrVEZpbGUgfCBudWxsIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbGVzLmdldChwYXRoKSB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0Z2V0RmlsZUJ5UGF0aChwYXRoOiBzdHJpbmcpOiBNb2NrVEZpbGUgfCBudWxsIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbGVzLmdldChwYXRoKSB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgcmVhZChmaWxlOiBNb2NrVEZpbGUpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZmlsZUNvbnRlbnRzLmdldChmaWxlLnBhdGgpIHx8IFwiXCI7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBNb2NrTWV0YWRhdGFDYWNoZSB7XHJcblx0cHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XHJcblxyXG5cdHNldEZpbGVNZXRhZGF0YShwYXRoOiBzdHJpbmcsIG1ldGFkYXRhOiBhbnkpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2FjaGUuc2V0KHBhdGgsIHsgZnJvbnRtYXR0ZXI6IG1ldGFkYXRhIH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RmlsZUNhY2hlKGZpbGU6IE1vY2tURmlsZSk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jYWNoZS5nZXQoZmlsZS5wYXRoKTtcclxuXHR9XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiVGFza1BhcnNpbmdTZXJ2aWNlIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRsZXQgdmF1bHQ6IE1vY2tWYXVsdDtcclxuXHRsZXQgbWV0YWRhdGFDYWNoZTogTW9ja01ldGFkYXRhQ2FjaGU7XHJcblx0bGV0IHBhcnNpbmdTZXJ2aWNlOiBUYXNrUGFyc2luZ1NlcnZpY2U7XHJcblxyXG5cdGNvbnN0IGNyZWF0ZVBhcnNlckNvbmZpZyA9IChcclxuXHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdCA9IHRydWVcclxuXHQpOiBUYXNrUGFyc2VyQ29uZmlnID0+ICh7XHJcblx0XHRwYXJzZU1ldGFkYXRhOiB0cnVlLFxyXG5cdFx0cGFyc2VUYWdzOiB0cnVlLFxyXG5cdFx0cGFyc2VDb21tZW50czogZmFsc2UsXHJcblx0XHRwYXJzZUhlYWRpbmdzOiBmYWxzZSxcclxuXHRcdG1heEluZGVudFNpemU6IDQsXHJcblx0XHRtYXhQYXJzZUl0ZXJhdGlvbnM6IDEwMDAsXHJcblx0XHRtYXhNZXRhZGF0YUl0ZXJhdGlvbnM6IDEwMCxcclxuXHRcdG1heFRhZ0xlbmd0aDogMTAwLFxyXG5cdFx0bWF4RW1vamlWYWx1ZUxlbmd0aDogMjAwLFxyXG5cdFx0bWF4U3RhY2tPcGVyYXRpb25zOiAxMDAwLFxyXG5cdFx0bWF4U3RhY2tTaXplOiAxMDAsXHJcblx0XHRzdGF0dXNNYXBwaW5nOiB7XHJcblx0XHRcdHRvZG86IFwiIFwiLFxyXG5cdFx0XHRkb25lOiBcInhcIixcclxuXHRcdFx0Y2FuY2VsbGVkOiBcIi1cIixcclxuXHRcdH0sXHJcblx0XHRlbW9qaU1hcHBpbmc6IHtcclxuXHRcdFx0XCLwn5OFXCI6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcIvCflLpcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0fSxcclxuXHRcdG1ldGFkYXRhUGFyc2VNb2RlOiBNZXRhZGF0YVBhcnNlTW9kZS5Cb3RoLFxyXG5cdFx0c3BlY2lhbFRhZ1ByZWZpeGVzOiB7XHJcblx0XHRcdHByb2plY3Q6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRhcmVhOiBcImFyZWFcIixcclxuXHRcdFx0Y29udGV4dDogXCJjb250ZXh0XCIsXHJcblx0XHR9LFxyXG5cdFx0cHJvamVjdENvbmZpZzogZW5hYmxlRW5oYW5jZWRQcm9qZWN0XHJcblx0XHRcdD8ge1xyXG5cdFx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiB0cnVlLFxyXG5cdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNvbmZpZ0ZpbGU6IHtcclxuXHRcdFx0XHRcdFx0ZmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdCAgfVxyXG5cdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHR9KTtcclxuXHJcblx0Y29uc3QgY3JlYXRlU2VydmljZU9wdGlvbnMgPSAoXHJcblx0XHRwYXJzZXJDb25maWc6IFRhc2tQYXJzZXJDb25maWcsXHJcblx0XHRjdXN0b21Qcm9qZWN0T3B0aW9ucz86IGFueVxyXG5cdCk6IFRhc2tQYXJzaW5nU2VydmljZU9wdGlvbnMgPT4gKHtcclxuXHRcdHZhdWx0OiB2YXVsdCBhcyBhbnksXHJcblx0XHRtZXRhZGF0YUNhY2hlOiBtZXRhZGF0YUNhY2hlIGFzIGFueSxcclxuXHRcdHBhcnNlckNvbmZpZyxcclxuXHRcdHByb2plY3RDb25maWdPcHRpb25zOiBjdXN0b21Qcm9qZWN0T3B0aW9ucyB8fCB7XHJcblx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0fSxcclxuXHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdH0sXHJcblx0fSk7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0dmF1bHQgPSBuZXcgTW9ja1ZhdWx0KCk7XHJcblx0XHRtZXRhZGF0YUNhY2hlID0gbmV3IE1vY2tNZXRhZGF0YUNhY2hlKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRW5oYW5jZWQgcHJvamVjdCBwYXJzaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHRhc2tzIHdpdGggcGF0aC1iYXNlZCBwcm9qZWN0c1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcIldvcmtcIixcclxuXHRcdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBgXHJcbi0gWyBdIENvbXBsZXRlIHJlcG9ydCDwn5OFIDIwMjQtMDEtMTVcclxuLSBbeF0gUmV2aWV3IGRvY3VtZW50YXRpb25cclxuLSBbIF0gU2VuZCBlbWFpbCB0byB0ZWFtIPCflLogaGlnaFxyXG5gO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRcIldvcmsvdGFza3MubWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMyk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IGFsbCB0YXNrcyBoYXZlIHRoZSBwYXRoLWJhc2VkIHByb2plY3RcclxuXHRcdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRzb3VyY2U6IFwiV29ya1wiLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgc3BlY2lmaWMgdGFzayBwcm9wZXJ0aWVzXHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5jb250ZW50KS50b0JlKFwiQ29tcGxldGUgcmVwb3J0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuZHVlRGF0ZSkudG9CZSgxNzA1MjQ4MDAwMDAwKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLmNvbXBsZXRlZCkudG9CZShmYWxzZSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3NbMV0uY29udGVudCkudG9CZShcIlJldmlldyBkb2N1bWVudGF0aW9uXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMV0uY29tcGxldGVkKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzJdLmNvbnRlbnQpLnRvQmUoXCJTZW5kIGVtYWlsIHRvIHRlYW1cIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1syXS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSg0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHRhc2tzIHdpdGggbWV0YWRhdGEtYmFzZWQgcHJvamVjdHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiUGVyc29uYWwvbm90ZXMubWRcIiwgXCIjIFBlcnNvbmFsIE5vdGVzXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcIlBlcnNvbmFsL25vdGVzLm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlBlcnNvbmFsIERldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0YXV0aG9yOiBcIkpvaG4gRG9lXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBcclxuLSBbIF0gUmVhZCBzZWxmLWhlbHAgYm9vayDwn5OFIDIwMjQtMDItMDFcclxuLSBbIF0gRXhlcmNpc2UgZm9yIDMwIG1pbnV0ZXNcclxuYDtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UucGFyc2VUYXNrc0Zyb21Db250ZW50TGVnYWN5KFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0XCJQZXJzb25hbC9ub3Rlcy5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHJcblx0XHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS50Z1Byb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJQZXJzb25hbCBEZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdFx0c291cmNlOiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHRhc2tzIHdpdGggY29uZmlnIGZpbGUtYmFzZWQgcHJvamVjdHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdXAgY29uZmlnIGZpbGVcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcIlByb2plY3RzL3Byb2plY3QubWRcIiwgXCJwcm9qZWN0OiBSZXNlYXJjaCBQcm9qZWN0XCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiUHJvamVjdHMvdGFza3MubWRcIiwgXCIjIFJlc2VhcmNoIFRhc2tzXCIpO1xyXG5cclxuXHRcdFx0Ly8gU2V0IG1ldGFkYXRhIGZvciBjb25maWcgZmlsZVxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcIlByb2plY3RzL3Byb2plY3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiUmVzZWFyY2ggUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuYWRkRmlsZShcIlByb2plY3RzL3Rhc2tzLm1kXCIsIFwiIyBSZXNlYXJjaCBUYXNrc1wiKTtcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gdmF1bHQuYWRkRm9sZGVyKFwiUHJvamVjdHNcIik7XHJcblx0XHRcdGNvbnN0IGNvbmZpZ0ZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGNvbmZpZ0ZpbGUpIHtcclxuXHRcdFx0XHRmb2xkZXIuY2hpbGRyZW4ucHVzaChjb25maWdGaWxlKTtcclxuXHRcdFx0XHRmaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBcclxuLSBbIF0gTGl0ZXJhdHVyZSByZXZpZXdcclxuLSBbIF0gRGF0YSBjb2xsZWN0aW9uIPCflLogbWVkaXVtXHJcbi0gWyBdIEFuYWx5c2lzIPCfk4UgMjAyNC0wMy0xNVxyXG5gO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRcIlByb2plY3RzL3Rhc2tzLm1kXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDMpO1xyXG5cclxuXHRcdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJSZXNlYXJjaCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcGFyc2UgdGFza3Mgd2l0aCBkZWZhdWx0IHByb2plY3QgbmFtaW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VyQ29uZmlnID0gY3JlYXRlUGFyc2VyQ29uZmlnKCk7XHJcblx0XHRcdGNvbnN0IHNlcnZpY2VPcHRpb25zID0gY3JlYXRlU2VydmljZU9wdGlvbnMocGFyc2VyQ29uZmlnLCB7XHJcblx0XHRcdFx0Y29uZmlnRmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLFxyXG5cdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBgXHJcbi0gWyBdIFRhc2sgd2l0aG91dCBleHBsaWNpdCBwcm9qZWN0XHJcbi0gW3hdIEFub3RoZXIgY29tcGxldGVkIHRhc2tcclxuYDtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UucGFyc2VUYXNrc0Zyb21Db250ZW50TGVnYWN5KFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0XCJEb2N1bWVudHMvbXktcHJvamVjdC1ub3Rlcy5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHJcblx0XHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS50Z1Byb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdFx0dHlwZTogXCJkZWZhdWx0XCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm15LXByb2plY3Qtbm90ZXNcIixcclxuXHRcdFx0XHRcdHNvdXJjZTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWV0YWRhdGEgbWFwcGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgYXBwbHkgbWV0YWRhdGEgbWFwcGluZ3MgZHVyaW5nIHBhcnNpbmdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VLZXk6IFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJpbXBvcnRhbmNlXCIsXHJcblx0XHRcdFx0XHRcdHRhcmdldEtleTogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiVGVzdCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0ZGVhZGxpbmU6IFwiMjAyNC0wNC0wMVwiLFxyXG5cdFx0XHRcdGltcG9ydGFuY2U6IFwiY3JpdGljYWxcIixcclxuXHRcdFx0XHRjYXRlZ29yeTogXCJ3b3JrXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBcclxuLSBbIF0gSW1wb3J0YW50IHRhc2sgd2l0aCBtZXRhZGF0YSBtYXBwaW5nXHJcbmA7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHBhcnNpbmdTZXJ2aWNlLnBhcnNlVGFza3NGcm9tQ29udGVudExlZ2FjeShcclxuXHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdFwidGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkTWV0YWRhdGEgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5nZXRFbmhhbmNlZE1ldGFkYXRhKFxyXG5cdFx0XHRcdFwidGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YSkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRkZWFkbGluZTogXCIyMDI0LTA0LTAxXCIsXHJcblx0XHRcdFx0aW1wb3J0YW5jZTogXCJjcml0aWNhbFwiLFxyXG5cdFx0XHRcdGNhdGVnb3J5OiBcIndvcmtcIixcclxuXHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZSgyMDI0LCAzLCAxKS5nZXRUaW1lKCksIC8vIERhdGUgY29udmVydGVkIHRvIHRpbWVzdGFtcFxyXG5cdFx0XHRcdHByaW9yaXR5OiA1LCAvLyAnY3JpdGljYWwnIGNvbnZlcnRlZCB0byBudW1iZXIgKGhpZ2hlc3QgcHJpb3JpdHkpXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50Z1Byb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRuYW1lOiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgYXBwbHkgbWV0YWRhdGEgbWFwcGluZ3MgaW4gV29ya2VyIGVudmlyb25tZW50IHNpbXVsYXRpb25cIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VLZXk6IFwi5LyY5YWI57qnXCIsXHJcblx0XHRcdFx0XHRcdHRhcmdldEtleTogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0c291cmNlS2V5OiBcImRlYWRsaW5lXCIsXHJcblx0XHRcdFx0XHRcdHRhcmdldEtleTogXCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ3b3JrZXItdGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlIGZvciB3b3JrZXJcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwid29ya2VyLXRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiV29ya2VyIFRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHRcdOS8mOWFiOe6pzogXCJoaWdoXCIsXHJcblx0XHRcdFx0ZGVhZGxpbmU6IFwiMjAyNC0wNS0wMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRlc3QgZGVzY3JpcHRpb25cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaW11bGF0ZSB0aGUgV29ya2VyIHByZS1jb21wdXRhdGlvbiBwcm9jZXNzXHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkUHJvamVjdERhdGEgPVxyXG5cdFx0XHRcdGF3YWl0IHBhcnNpbmdTZXJ2aWNlLmNvbXB1dGVFbmhhbmNlZFByb2plY3REYXRhKFtcclxuXHRcdFx0XHRcdFwid29ya2VyLXRlc3QubWRcIixcclxuXHRcdFx0XHRdKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IHRoZSBlbmhhbmNlZCBwcm9qZWN0IGRhdGEgY29udGFpbnMgbWFwcGVkIG1ldGFkYXRhXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRlbmhhbmNlZFByb2plY3REYXRhLmZpbGVNZXRhZGF0YU1hcFtcIndvcmtlci10ZXN0Lm1kXCJdXHJcblx0XHRcdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvamVjdDogXCJXb3JrZXIgVGVzdCBQcm9qZWN0XCIsXHJcblx0XHRcdFx05LyY5YWI57qnOiBcImhpZ2hcIixcclxuXHRcdFx0XHRkZWFkbGluZTogXCIyMDI0LTA1LTAxXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGVzdCBkZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdHByaW9yaXR5OiA0LCAvLyBNYXBwZWQgZnJvbSAn5LyY5YWI57qnJyBhbmQgY29udmVydGVkIHRvIG51bWJlclxyXG5cdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKDIwMjQsIDQsIDEpLmdldFRpbWUoKSwgLy8gTWFwcGVkIGZyb20gJ2RlYWRsaW5lJyBhbmQgY29udmVydGVkIHRvIHRpbWVzdGFtcFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRlbmhhbmNlZFByb2plY3REYXRhLmZpbGVQcm9qZWN0TWFwW1wid29ya2VyLXRlc3QubWRcIl1cclxuXHRcdFx0KS50b0VxdWFsKHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIldvcmtlciBUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE5vdyB0ZXN0IHRoYXQgdGhlIHBhcnNlciB3b3VsZCB1c2UgdGhpcyBlbmhhbmNlZCBtZXRhZGF0YSBjb3JyZWN0bHlcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBcclxuLSBbIF0gQ2hpbmVzZSBwcmlvcml0eSB0YXNrIHdpdGggbWFwcGluZyBb5LyY5YWI57qnOjp1cmdlbnRdXHJcbi0gWyBdIEFub3RoZXIgdGFzayB3aXRoIGRlYWRsaW5lIFtkZWFkbGluZTo6MjAyNC0wNi0wMV1cclxuYDtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UucGFyc2VUYXNrc0Zyb21Db250ZW50TGVnYWN5KFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0XCJ3b3JrZXItdGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IHRhc2tzIGluaGVyaXQgdGhlIG1hcHBlZCBtZXRhZGF0YSBmcm9tIGZpbGUgZnJvbnRtYXR0ZXJcclxuXHRcdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIldvcmtlciBUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBOb3RlOiBUaGUgZmlsZSBmcm9udG1hdHRlciBtZXRhZGF0YSBtYXBwaW5ncyBzaG91bGQgYmUgYXZhaWxhYmxlIHRvIHRhc2tzXHJcblx0XHRcdC8vIGJ1dCB0aGUgaW5kaXZpZHVhbCB0YXNrIG1ldGFkYXRhIHBhcnNpbmcgbWlnaHQgb3ZlcnJpZGUgc29tZSB2YWx1ZXNcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIG5vdCBhcHBseSBtZXRhZGF0YSBtYXBwaW5ncyB3aGVuIGVuaGFuY2VkIHByb2plY3QgaXMgZGlzYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Ly8gQ3JlYXRlIHNlcnZpY2Ugd2l0aG91dCBwcm9qZWN0IGNvbmZpZyBvcHRpb25zIChlbmhhbmNlZCBwcm9qZWN0IGRpc2FibGVkKVxyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9uczogVGFza1BhcnNpbmdTZXJ2aWNlT3B0aW9ucyA9IHtcclxuXHRcdFx0XHR2YXVsdDogdmF1bHQgYXMgYW55LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ2FjaGU6IG1ldGFkYXRhQ2FjaGUgYXMgYW55LFxyXG5cdFx0XHRcdHBhcnNlckNvbmZpZyxcclxuXHRcdFx0XHQvLyBObyBwcm9qZWN0Q29uZmlnT3B0aW9ucyAtIGVuaGFuY2VkIHByb2plY3QgaXMgZGlzYWJsZWRcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC1uby1tYXBwaW5nLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC1uby1tYXBwaW5nLm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHRcdGRlYWRsaW5lOiBcIjIwMjQtMDQtMDFcIiwgLy8gVGhpcyBzaG91bGQgTk9UIGJlIG1hcHBlZCB0byAnZHVlRGF0ZSdcclxuXHRcdFx0XHRpbXBvcnRhbmNlOiBcImNyaXRpY2FsXCIsIC8vIFRoaXMgc2hvdWxkIE5PVCBiZSBtYXBwZWQgdG8gJ3ByaW9yaXR5J1xyXG5cdFx0XHRcdGNhdGVnb3J5OiBcIndvcmtcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIHdpdGhvdXQgbWV0YWRhdGEgbWFwcGluZ1xyXG5gO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRcInRlc3Qtbm8tbWFwcGluZy5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCBoYXZlIHRnUHJvamVjdCB3aGVuIGVuaGFuY2VkIHByb2plY3QgaXMgZGlzYWJsZWRcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRnUHJvamVjdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gT3JpZ2luYWwgbWV0YWRhdGEgc2hvdWxkIGJlIHByZXNlcnZlZCB3aXRob3V0IG1hcHBpbmdcclxuXHRcdFx0Ly8gTm90ZTogU2luY2UgZW5oYW5jZWQgcHJvamVjdCBpcyBkaXNhYmxlZCwgd2Ugd29uJ3QgaGF2ZSBhY2Nlc3MgdG8gZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Ly8gVGhlIHRhc2sgc2hvdWxkIHN0aWxsIGJlIHBhcnNlZCBidXQgd2l0aG91dCB0aGUgZW5oYW5jZWQgZmVhdHVyZXNcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGlnbm9yZSBkaXNhYmxlZCBtZXRhZGF0YSBtYXBwaW5nc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJkZWFkbGluZVwiLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXRLZXk6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSwgLy8gRGlzYWJsZWQgbWFwcGluZ1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0c291cmNlS2V5OiBcImltcG9ydGFuY2VcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsIC8vIEVuYWJsZWQgbWFwcGluZ1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInRlc3QtcGFydGlhbC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QtcGFydGlhbC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRkZWFkbGluZTogXCIyMDI0LTA0LTAxXCIsXHJcblx0XHRcdFx0aW1wb3J0YW5jZTogXCJjcml0aWNhbFwiLFxyXG5cdFx0XHRcdGNhdGVnb3J5OiBcIndvcmtcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcInRlc3QtcGFydGlhbC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YSkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRkZWFkbGluZTogXCIyMDI0LTA0LTAxXCIsIC8vIFNob3VsZCByZW1haW4gYXMgJ2RlYWRsaW5lJywgbm90IG1hcHBlZCB0byAnZHVlRGF0ZSdcclxuXHRcdFx0XHRpbXBvcnRhbmNlOiBcImNyaXRpY2FsXCIsXHJcblx0XHRcdFx0Y2F0ZWdvcnk6IFwid29ya1wiLFxyXG5cdFx0XHRcdHByaW9yaXR5OiA1LCAvLyBTaG91bGQgYmUgbWFwcGVkIGZyb20gJ2ltcG9ydGFuY2UnIHRvICdwcmlvcml0eScgYW5kIGNvbnZlcnRlZCB0byBudW1iZXIgKGNyaXRpY2FsID0gNSlcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgTk9UIGhhdmUgJ2R1ZURhdGUnIGZpZWxkIHNpbmNlIHRoYXQgbWFwcGluZyBpcyBkaXNhYmxlZFxyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YS5kdWVEYXRlKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1c2UgYmFzaWMgbWV0YWRhdGEgd2l0aCBwYXJzZVRhc2tzRnJvbUNvbnRlbnRCYXNpYyBtZXRob2RcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VLZXk6IFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ0ZXN0LWJhc2ljLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC1iYXNpYy5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0XHRkZWFkbGluZTogXCIyMDI0LTA0LTAxXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBcclxuLSBbIF0gVGFzayBwYXJzZWQgd2l0aCBiYXNpYyBtZXRob2RcclxuYDtcclxuXHJcblx0XHRcdC8vIFVzZSB0aGUgYmFzaWMgcGFyc2luZyBtZXRob2Qgd2hpY2ggc2hvdWxkIE5PVCBhcHBseSBtZXRhZGF0YSBtYXBwaW5nc1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHBhcnNpbmdTZXJ2aWNlLnBhcnNlVGFza3NGcm9tQ29udGVudEJhc2ljKFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0XCJ0ZXN0LWJhc2ljLm1kXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHQvLyBTaG91bGQgbm90IGhhdmUgdGdQcm9qZWN0IHdoZW4gdXNpbmcgYmFzaWMgcGFyc2luZ1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEudGdQcm9qZWN0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBhcHBseSBtZXRhZGF0YSBtYXBwaW5ncyB0byBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZGF0YVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCLkvJjlhYjnuqdcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VLZXk6IFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdC8vIFNldCB1cCBwcm9qZWN0IGNvbmZpZyBmaWxlIGluIGZvbGRlclxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFxyXG5cdFx0XHRcdFwiVGVzdFByb2plY3QvcHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFwicHJvamVjdDogVGVzdCBQcm9qZWN0IHdpdGggQ29uZmlnXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJUZXN0UHJvamVjdC9wcm9qZWN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdCB3aXRoIENvbmZpZ1wiLFxyXG5cdFx0XHRcdOS8mOWFiOe6pzogXCJoaWdoXCIsXHJcblx0XHRcdFx0ZGVhZGxpbmU6IFwiMjAyNC0wNS0wMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlByb2plY3QtbGV2ZWwgbWV0YWRhdGFcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdXAgYSByZWd1bGFyIGZpbGUgaW4gdGhlIHNhbWUgZm9sZGVyXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJUZXN0UHJvamVjdC90YXNrcy5tZFwiLCBcIiMgVGFza3NcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwiVGVzdFByb2plY3QvdGFza3MubWRcIiwge1xyXG5cdFx0XHRcdC8vIE5vIGZpbGUtbGV2ZWwgbWV0YWRhdGEgZm9yIHRoaXMgdGVzdFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiVGVzdFByb2plY3QvdGFza3MubWRcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlRlc3RQcm9qZWN0XCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiVGVzdFByb2plY3QvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjb25maWdGaWxlICYmIGZpbGUpIHtcclxuXHRcdFx0XHRmb2xkZXIuY2hpbGRyZW4ucHVzaChjb25maWdGaWxlKTtcclxuXHRcdFx0XHRmaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCBlbmhhbmNlZCBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb25cclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRQcm9qZWN0RGF0YSA9XHJcblx0XHRcdFx0YXdhaXQgcGFyc2luZ1NlcnZpY2UuY29tcHV0ZUVuaGFuY2VkUHJvamVjdERhdGEoW1xyXG5cdFx0XHRcdFx0XCJUZXN0UHJvamVjdC90YXNrcy5tZFwiLFxyXG5cdFx0XHRcdF0pO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoYXQgdGhlIHByb2plY3QgY29uZmlnIGRhdGEgaGFzIG1hcHBpbmdzIGFwcGxpZWRcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkUHJvamVjdERhdGEucHJvamVjdENvbmZpZ01hcFtcIlRlc3RQcm9qZWN0XCJdKS50b0VxdWFsKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiVGVzdCBQcm9qZWN0IHdpdGggQ29uZmlnXCIsXHJcblx0XHRcdFx0XHTkvJjlhYjnuqc6IFwiaGlnaFwiLFxyXG5cdFx0XHRcdFx0ZGVhZGxpbmU6IFwiMjAyNC0wNS0wMVwiLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiUHJvamVjdC1sZXZlbCBtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0cHJpb3JpdHk6IDQsIC8vIE1hcHBlZCBmcm9tICfkvJjlhYjnuqcnIGFuZCBjb252ZXJ0ZWQgdG8gbnVtYmVyXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZSgyMDI0LCA0LCAxKS5nZXRUaW1lKCksIC8vIE1hcHBlZCBmcm9tICdkZWFkbGluZScgYW5kIGNvbnZlcnRlZCB0byB0aW1lc3RhbXBcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCB0aGUgZmlsZSBwcm9qZWN0IG1hcHBpbmcgaXMgY29ycmVjdFxyXG5cdFx0XHRleHBlY3QoXHJcblx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RGF0YS5maWxlUHJvamVjdE1hcFtcIlRlc3RQcm9qZWN0L3Rhc2tzLm1kXCJdXHJcblx0XHRcdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3Qgd2l0aCBDb25maWdcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGluaGVyaXQgcHJvamVjdC1sZXZlbCBhdHRyaWJ1dGVzIHRvIHRhc2tzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VyQ29uZmlnID0gY3JlYXRlUGFyc2VyQ29uZmlnKCk7XHJcblx0XHRcdGNvbnN0IHNlcnZpY2VPcHRpb25zID0gY3JlYXRlU2VydmljZU9wdGlvbnMocGFyc2VyQ29uZmlnLCB7XHJcblx0XHRcdFx0Y29uZmlnRmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLFxyXG5cdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0c291cmNlS2V5OiBcIuS8mOWFiOe6p1wiLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXRLZXk6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGFyc2luZ1NlcnZpY2UgPSBuZXcgVGFza1BhcnNpbmdTZXJ2aWNlKHNlcnZpY2VPcHRpb25zKTtcclxuXHJcblx0XHRcdC8vIOiuvue9rumhueebrumFjee9ruaWh+S7tu+8jOWMheWQq+WFg+aVsOaNrlxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiVGVzdFByb2plY3QvcHJvamVjdC5tZFwiLCBcInByb2plY3Q6IFRlc3QgUHJvamVjdFwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJUZXN0UHJvamVjdC9wcm9qZWN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHRcdOS8mOWFiOe6pzogXCJoaWdoXCIsIC8vIOi/meS4quW6lOivpeiiq+aYoOWwhOS4uiBwcmlvcml0eVxyXG5cdFx0XHRcdGNvbnRleHQ6IFwid29ya1wiLCAvLyDov5nkuKrlupTor6Xooqvnm7TmjqXnu6fmib9cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDorr7nva7ku7vliqHmlofku7bvvIjmsqHmnInoh6rlt7HnmoTlhYPmlbDmja7vvIlcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcIlRlc3RQcm9qZWN0L3Rhc2tzLm1kXCIsIFwiIyBUYXNrc1wiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJUZXN0UHJvamVjdC90YXNrcy5tZFwiLCB7fSk7XHJcblxyXG5cdFx0XHQvLyBNb2NrIOaWh+S7tuWkuee7k+aehFxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiVGVzdFByb2plY3QvdGFza3MubWRcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlRlc3RQcm9qZWN0XCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiVGVzdFByb2plY3QvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjb25maWdGaWxlICYmIGZpbGUpIHtcclxuXHRcdFx0XHRmb2xkZXIuY2hpbGRyZW4ucHVzaChjb25maWdGaWxlKTtcclxuXHRcdFx0XHRmaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtIFsgXSDnroDljZXku7vliqHvvIzlupTor6Xnu6fmib/pobnnm67lsZ7mgKdgO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRcIlRlc3RQcm9qZWN0L3Rhc2tzLm1kXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblxyXG5cdFx0XHQvLyDpqozor4Hku7vliqHog73lpJ/mo4DmtYvliLDpobnnm65cclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEudGdQcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwiVGVzdCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDmoLjlv4Ppqozor4HvvJpNZXRhZGF0YU1hcHBpbmcg6L2s5YaZ5Yqf6IO95ZKM6aG555uu5bGe5oCn57un5om/XHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlKDQpOyAvLyDku44gJ+S8mOWFiOe6pycg5pig5bCE6ICM5p2l77yM5bqU6K+l5piv5pWw5a2XIDQgKGhpZ2gpXHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLmNvbnRleHQpLnRvQmUoXCJ3b3JrXCIpOyAvLyDnm7TmjqXku47pobnnm67phY3nva7nu6fmib9cclxuXHJcblx0XHRcdC8vIOi/meS4qua1i+ivleivgeaYjuS6hu+8mlxyXG5cdFx0XHQvLyAxLiBNZXRhZGF0YU1hcHBpbmcg5q2j5bi45bel5L2c77yIJ+S8mOWFiOe6pycgLT4gJ3ByaW9yaXR5J++8iVxyXG5cdFx0XHQvLyAyLiDku7vliqHog73lpJ/nu6fmib/pobnnm67nuqfliKvnmoTlhYPmlbDmja7lsZ7mgKdcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGF1dG9tYXRpY2FsbHkgY29udmVydCBkYXRlIGFuZCBwcmlvcml0eSBmaWVsZHMgZHVyaW5nIG1ldGFkYXRhIG1hcHBpbmdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzb3VyY2VLZXk6IFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJ1cmdlbmN5XCIsXHJcblx0XHRcdFx0XHRcdHRhcmdldEtleTogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0c291cmNlS2V5OiBcInN0YXJ0X3RpbWVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInNtYXJ0LWNvbnZlcnNpb24tdGVzdC5tZFwiLCBcIlRlc3QgY29udGVudFwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJzbWFydC1jb252ZXJzaW9uLXRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiU21hcnQgQ29udmVyc2lvbiBUZXN0XCIsXHJcblx0XHRcdFx0ZGVhZGxpbmU6IFwiMjAyNS0wNy0xNVwiLCAvLyBTaG91bGQgYmUgY29udmVydGVkIHRvIHRpbWVzdGFtcFxyXG5cdFx0XHRcdHVyZ2VuY3k6IFwiaGlnaFwiLCAvLyBTaG91bGQgYmUgY29udmVydGVkIHRvIG51bWJlciAoMilcclxuXHRcdFx0XHRzdGFydF90aW1lOiBcIjIwMjUtMDYtMDFcIiwgLy8gU2hvdWxkIGJlIGNvbnZlcnRlZCB0byB0aW1lc3RhbXBcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJTb21lIHRleHRcIiwgLy8gU2hvdWxkIHJlbWFpbiBhcyBzdHJpbmdcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcInNtYXJ0LWNvbnZlcnNpb24tdGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCBkYXRlIGZpZWxkcyB3ZXJlIGNvbnZlcnRlZCB0byB0aW1lc3RhbXBzXHJcblx0XHRcdGV4cGVjdCh0eXBlb2YgZW5oYW5jZWRNZXRhZGF0YS5kdWVEYXRlKS50b0JlKFwibnVtYmVyXCIpO1xyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YS5kdWVEYXRlKS50b0JlKFxyXG5cdFx0XHRcdG5ldyBEYXRlKDIwMjUsIDYsIDE1KS5nZXRUaW1lKClcclxuXHRcdFx0KTsgLy8gSnVseSAxNSwgMjAyNVxyXG5cclxuXHRcdFx0ZXhwZWN0KHR5cGVvZiBlbmhhbmNlZE1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZShcIm51bWJlclwiKTtcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkTWV0YWRhdGEuc3RhcnREYXRlKS50b0JlKFxyXG5cdFx0XHRcdG5ldyBEYXRlKDIwMjUsIDUsIDEpLmdldFRpbWUoKVxyXG5cdFx0XHQpOyAvLyBKdW5lIDEsIDIwMjVcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IHByaW9yaXR5IGZpZWxkIHdhcyBjb252ZXJ0ZWQgdG8gbnVtYmVyXHJcblx0XHRcdGV4cGVjdCh0eXBlb2YgZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSkudG9CZShcIm51bWJlclwiKTtcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkTWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoNCk7IC8vICdoaWdoJyAtPiA0XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCBub24tbWFwcGVkIGZpZWxkcyByZW1haW4gdW5jaGFuZ2VkXHJcblx0XHRcdGV4cGVjdChlbmhhbmNlZE1ldGFkYXRhLmRlc2NyaXB0aW9uKS50b0JlKFwiU29tZSB0ZXh0XCIpO1xyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YS5wcm9qZWN0KS50b0JlKFwiU21hcnQgQ29udmVyc2lvbiBUZXN0XCIpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoYXQgb3JpZ2luYWwgdmFsdWVzIGFyZSBwcmVzZXJ2ZWRcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkTWV0YWRhdGEuZGVhZGxpbmUpLnRvQmUoXCIyMDI1LTA3LTE1XCIpO1xyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YS51cmdlbmN5KS50b0JlKFwiaGlnaFwiKTtcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkTWV0YWRhdGEuc3RhcnRfdGltZSkudG9CZShcIjIwMjUtMDYtMDFcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgcHJpb3JpdHkgbWFwcGluZyBmb3IgdmFyaW91cyBzdHJpbmcgZm9ybWF0c1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJ1cmdlbmN5XCIsXHJcblx0XHRcdFx0XHRcdHRhcmdldEtleTogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBkaWZmZXJlbnQgcHJpb3JpdHkgZm9ybWF0c1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0eyBpbnB1dDogXCJoaWdoZXN0XCIsIGV4cGVjdGVkOiA1IH0sXHJcblx0XHRcdFx0eyBpbnB1dDogXCJ1cmdlbnRcIiwgZXhwZWN0ZWQ6IDUgfSxcclxuXHRcdFx0XHR7IGlucHV0OiBcImhpZ2hcIiwgZXhwZWN0ZWQ6IDQgfSxcclxuXHRcdFx0XHR7IGlucHV0OiBcIm1lZGl1bVwiLCBleHBlY3RlZDogMyB9LFxyXG5cdFx0XHRcdHsgaW5wdXQ6IFwibG93XCIsIGV4cGVjdGVkOiAyIH0sXHJcblx0XHRcdFx0eyBpbnB1dDogXCJsb3dlc3RcIiwgZXhwZWN0ZWQ6IDEgfSxcclxuXHRcdFx0XHR7IGlucHV0OiBcIjNcIiwgZXhwZWN0ZWQ6IDMgfSwgLy8gTnVtZXJpYyBzdHJpbmdcclxuXHRcdFx0XHR7IGlucHV0OiBcInVua25vd25cIiwgZXhwZWN0ZWQ6IFwidW5rbm93blwiIH0sIC8vIFNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IFtpbmRleCwgdGVzdENhc2VdIG9mIHRlc3RDYXNlcy5lbnRyaWVzKCkpIHtcclxuXHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9IGBwcmlvcml0eS10ZXN0LSR7aW5kZXh9Lm1kYDtcclxuXHRcdFx0XHR2YXVsdC5hZGRGaWxlKGZpbGVOYW1lLCBcIlRlc3QgY29udGVudFwiKTtcclxuXHRcdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShmaWxlTmFtZSwge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJQcmlvcml0eSBUZXN0XCIsXHJcblx0XHRcdFx0XHR1cmdlbmN5OiB0ZXN0Q2FzZS5pbnB1dCxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9XHJcblx0XHRcdFx0XHRhd2FpdCBwYXJzaW5nU2VydmljZS5nZXRFbmhhbmNlZE1ldGFkYXRhKGZpbGVOYW1lKTtcclxuXHRcdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YS5wcmlvcml0eSkudG9CZSh0ZXN0Q2FzZS5leHBlY3RlZCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlByaW9yaXR5IG9yZGVyIGludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgcGF0aCBtYXBwaW5ncyBvdmVyIG1ldGFkYXRhIGFuZCBjb25maWdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoKTtcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnMgPSBjcmVhdGVTZXJ2aWNlT3B0aW9ucyhwYXJzZXJDb25maWcsIHtcclxuXHRcdFx0XHRjb25maWdGaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJQcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoIFByaW9yaXR5IFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gU2V0IHVwIGNvbXBldGluZyBwcm9qZWN0IHNvdXJjZXNcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcIlByaW9yaXR5L3Rhc2tzLm1kXCIsIFwiIyBUYXNrc1wiKTtcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcIlByaW9yaXR5L3Byb2plY3QubWRcIiwgXCJwcm9qZWN0OiBDb25maWcgUHJvamVjdFwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJQcmlvcml0eS90YXNrcy5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBmb2xkZXIgc3RydWN0dXJlXHJcblx0XHRcdGNvbnN0IGZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJQcmlvcml0eS90YXNrcy5tZFwiKTtcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gdmF1bHQuYWRkRm9sZGVyKFwiUHJpb3JpdHlcIik7XHJcblx0XHRcdGNvbnN0IGNvbmZpZ0ZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XCJQcmlvcml0eS9wcm9qZWN0Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGZpbGUgJiYgY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdGZvbGRlci5jaGlsZHJlbi5wdXNoKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHRcdGZpbGUucGFyZW50ID0gZm9sZGVyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIHdpdGggbXVsdGlwbGUgcHJvamVjdCBzb3VyY2VzXHJcbmA7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHBhcnNpbmdTZXJ2aWNlLnBhcnNlVGFza3NGcm9tQ29udGVudExlZ2FjeShcclxuXHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdFwiUHJpb3JpdHkvdGFza3MubWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50Z1Byb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHR5cGU6IFwicGF0aFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiUGF0aCBQcmlvcml0eSBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIlByaW9yaXR5XCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiU2luZ2xlIHRhc2sgcGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBwYXJzZSBzaW5nbGUgdGFzayBsaW5lIHdpdGggcHJvamVjdCBpbmZvcm1hdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcIlNpbmdsZVRhc2tcIixcclxuXHRcdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiU2luZ2xlIFRhc2sgUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0xpbmUgPSBcIi0gWyBdIFNpbmdsZSBsaW5lIHRhc2sg8J+ThSAyMDI0LTA1LTAxIPCflLogaGlnaFwiO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UucGFyc2VUYXNrTGluZShcclxuXHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcIlNpbmdsZVRhc2svbm90ZS5tZFwiLFxyXG5cdFx0XHRcdDVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrKS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2shLmNvbnRlbnQpLnRvQmUoXCJTaW5nbGUgbGluZSB0YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QodGFzayEubGluZSkudG9CZSg1KTtcclxuXHRcdFx0ZXhwZWN0KHRhc2shLm1ldGFkYXRhLmR1ZURhdGUpLnRvQmUoMTcxNDQ5MjgwMDAwMCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrIS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSg0KTtcclxuXHRcdFx0ZXhwZWN0KHRhc2shLm1ldGFkYXRhLnRnUHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0bmFtZTogXCJTaW5nbGUgVGFzayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIlNpbmdsZVRhc2tcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFbmhhbmNlZCBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY29tcHV0ZSBlbmhhbmNlZCBwcm9qZWN0IGRhdGEgZm9yIG11bHRpcGxlIGZpbGVzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VyQ29uZmlnID0gY3JlYXRlUGFyc2VyQ29uZmlnKCk7XHJcblx0XHRcdGNvbnN0IHNlcnZpY2VPcHRpb25zID0gY3JlYXRlU2VydmljZU9wdGlvbnMocGFyc2VyQ29uZmlnLCB7XHJcblx0XHRcdFx0Y29uZmlnRmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLFxyXG5cdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwiV29ya1wiLFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJXb3JrIFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJkZWFkbGluZVwiLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXRLZXk6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdXAgbXVsdGlwbGUgZmlsZXMgd2l0aCBkaWZmZXJlbnQgcHJvamVjdCBzb3VyY2VzXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJXb3JrL3Rhc2tzLm1kXCIsIFwiIyBXb3JrIFRhc2tzXCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiUGVyc29uYWwvbm90ZXMubWRcIiwgXCIjIFBlcnNvbmFsIE5vdGVzXCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiUmVzZWFyY2gvcHJvamVjdC5tZFwiLCBcInByb2plY3Q6IFJlc2VhcmNoIFByb2plY3RcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJSZXNlYXJjaC9kYXRhLm1kXCIsIFwiIyBSZXNlYXJjaCBEYXRhXCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiT3RoZXIvcmFuZG9tLm1kXCIsIFwiIyBSYW5kb20gRmlsZVwiKTtcclxuXHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwiUGVyc29uYWwvbm90ZXMubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiUGVyc29uYWwgUHJvamVjdFwiLFxyXG5cdFx0XHRcdGRlYWRsaW5lOiBcIjIwMjQtMDYtMDFcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcIlJlc2VhcmNoL3Byb2plY3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiUmVzZWFyY2ggUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZSBmb3IgUmVzZWFyY2hcclxuXHRcdFx0Y29uc3QgcmVzZWFyY2hGaWxlID1cclxuXHRcdFx0XHR2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJSZXNlYXJjaC9kYXRhLm1kXCIpO1xyXG5cdFx0XHRjb25zdCByZXNlYXJjaEZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlJlc2VhcmNoXCIpO1xyXG5cdFx0XHRjb25zdCByZXNlYXJjaENvbmZpZ0ZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XCJSZXNlYXJjaC9wcm9qZWN0Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHJlc2VhcmNoRmlsZSAmJiByZXNlYXJjaENvbmZpZ0ZpbGUpIHtcclxuXHRcdFx0XHRyZXNlYXJjaEZvbGRlci5jaGlsZHJlbi5wdXNoKHJlc2VhcmNoQ29uZmlnRmlsZSk7XHJcblx0XHRcdFx0cmVzZWFyY2hGaWxlLnBhcmVudCA9IHJlc2VhcmNoRm9sZGVyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlUGF0aHMgPSBbXHJcblx0XHRcdFx0XCJXb3JrL3Rhc2tzLm1kXCIsXHJcblx0XHRcdFx0XCJQZXJzb25hbC9ub3Rlcy5tZFwiLFxyXG5cdFx0XHRcdFwiUmVzZWFyY2gvZGF0YS5tZFwiLFxyXG5cdFx0XHRcdFwiT3RoZXIvcmFuZG9tLm1kXCIsXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZERhdGEgPVxyXG5cdFx0XHRcdGF3YWl0IHBhcnNpbmdTZXJ2aWNlLmNvbXB1dGVFbmhhbmNlZFByb2plY3REYXRhKGZpbGVQYXRocyk7XHJcblxyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWREYXRhLmZpbGVQcm9qZWN0TWFwKS50b0VxdWFsKHtcclxuXHRcdFx0XHRcIldvcmsvdGFza3MubWRcIjoge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJXb3JrIFByb2plY3RcIixcclxuXHRcdFx0XHRcdHNvdXJjZTogXCJXb3JrXCIsXHJcblx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdFwiUGVyc29uYWwvbm90ZXMubWRcIjoge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJQZXJzb25hbCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRcIlJlc2VhcmNoL2RhdGEubWRcIjoge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJSZXNlYXJjaCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRcIk90aGVyL3JhbmRvbS5tZFwiOiB7XHJcblx0XHRcdFx0XHRwcm9qZWN0OiBcInJhbmRvbVwiLFxyXG5cdFx0XHRcdFx0c291cmNlOiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4cGVjdChlbmhhbmNlZERhdGEuZmlsZU1ldGFkYXRhTWFwW1wiUGVyc29uYWwvbm90ZXMubWRcIl0pLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiUGVyc29uYWwgUHJvamVjdFwiLFxyXG5cdFx0XHRcdGRlYWRsaW5lOiBcIjIwMjQtMDYtMDFcIixcclxuXHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZSgyMDI0LCA1LCAxKS5nZXRUaW1lKCksIC8vIENvbnZlcnRlZCB0byB0aW1lc3RhbXBcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFcnJvciBoYW5kbGluZyBhbmQgZWRnZSBjYXNlc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgcGFyc2luZyBlcnJvcnMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZyk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB3aXRoIG1hbGZvcm1lZCBjb250ZW50XHJcblx0XHRcdGNvbnN0IG1hbGZvcm1lZENvbnRlbnQgPSBgXHJcbi0gWyBdIEdvb2QgdGFza1xyXG4tIFRoaXMgaXMgbm90IGEgdGFza1xyXG4tIFt4XSBBbm90aGVyIGdvb2QgdGFza1xyXG5gO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0bWFsZm9ybWVkQ29udGVudCxcclxuXHRcdFx0XHRcInRlc3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIHBhcnNlIHZhbGlkIHRhc2tzIGFuZCBpZ25vcmUgbWFsZm9ybWVkIGxpbmVzXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0uY29udGVudCkudG9CZShcIkdvb2QgdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzFdLmNvbnRlbnQpLnRvQmUoXCJBbm90aGVyIGdvb2QgdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHdvcmsgd2l0aG91dCBlbmhhbmNlZCBwcm9qZWN0IHN1cHBvcnRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJzZXJDb25maWcgPSBjcmVhdGVQYXJzZXJDb25maWcoZmFsc2UpOyAvLyBEaXNhYmxlIGVuaGFuY2VkIHByb2plY3RcclxuXHRcdFx0Y29uc3Qgc2VydmljZU9wdGlvbnM6IFRhc2tQYXJzaW5nU2VydmljZU9wdGlvbnMgPSB7XHJcblx0XHRcdFx0dmF1bHQ6IHZhdWx0IGFzIGFueSxcclxuXHRcdFx0XHRtZXRhZGF0YUNhY2hlOiBtZXRhZGF0YUNhY2hlIGFzIGFueSxcclxuXHRcdFx0XHRwYXJzZXJDb25maWcsXHJcblx0XHRcdFx0Ly8gTm8gcHJvamVjdENvbmZpZ09wdGlvbnNcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIHdpdGhvdXQgZW5oYW5jZWQgcHJvamVjdCBzdXBwb3J0XHJcbi0gW3hdIENvbXBsZXRlZCB0YXNrXHJcbmA7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHBhcnNpbmdTZXJ2aWNlLnBhcnNlVGFza3NGcm9tQ29udGVudExlZ2FjeShcclxuXHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdFwidGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHRcdFx0Ly8gVGFza3Mgc2hvdWxkIG5vdCBoYXZlIHRnUHJvamVjdCB3aGVuIGVuaGFuY2VkIHByb2plY3QgaXMgZGlzYWJsZWRcclxuXHRcdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtaXNzaW5nIHByb2plY3QgY29uZmlnIG9wdGlvbnMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9uczogVGFza1BhcnNpbmdTZXJ2aWNlT3B0aW9ucyA9IHtcclxuXHRcdFx0XHR2YXVsdDogdmF1bHQgYXMgYW55LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ2FjaGU6IG1ldGFkYXRhQ2FjaGUgYXMgYW55LFxyXG5cdFx0XHRcdHBhcnNlckNvbmZpZyxcclxuXHRcdFx0XHQvLyBwcm9qZWN0Q29uZmlnT3B0aW9ucyBpcyB1bmRlZmluZWRcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHBhcnNpbmdTZXJ2aWNlID0gbmV3IFRhc2tQYXJzaW5nU2VydmljZShzZXJ2aWNlT3B0aW9ucyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIHdpdGggbWlzc2luZyBjb25maWcgb3B0aW9uc1xyXG5gO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBwYXJzaW5nU2VydmljZS5wYXJzZVRhc2tzRnJvbUNvbnRlbnRMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRcInRlc3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50Z1Byb2plY3QpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlBlcmZvcm1hbmNlIG9wdGltaXphdGlvbnNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdXNlIGRhdGUgY2FjaGUgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aGVuIHBhcnNpbmcgbWFueSB0YXNrc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBzZXJ2aWNlT3B0aW9ucyA9IGNyZWF0ZVNlcnZpY2VPcHRpb25zKHBhcnNlckNvbmZpZywge1xyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJkdWVcIixcclxuXHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwYXJzaW5nU2VydmljZSA9IG5ldyBUYXNrUGFyc2luZ1NlcnZpY2Uoc2VydmljZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgY2FjaGUgYmVmb3JlIHRlc3RcclxuXHRcdFx0Y29uc3QgeyBNYXJrZG93blRhc2tQYXJzZXIgfSA9IGF3YWl0IGltcG9ydChcclxuXHRcdFx0XHRcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiXHJcblx0XHRcdCk7XHJcblx0XHRcdE1hcmtkb3duVGFza1BhcnNlci5jbGVhckRhdGVDYWNoZSgpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbnkgdGFza3Mgd2l0aCB0aGUgc2FtZSBkdWUgZGF0ZSB0byB0ZXN0IGNhY2hpbmdcclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBBcnJheS5mcm9tKFxyXG5cdFx0XHRcdHsgbGVuZ3RoOiAxMDAwIH0sXHJcblx0XHRcdFx0KF8sIGkpID0+IGAtIFsgXSBUYXNrICR7aX0gW2R1ZTo6MjAyNS0wNi0xN11gXHJcblx0XHRcdCkuam9pbihcIlxcblwiKTtcclxuXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwZXJmb3JtYW5jZS10ZXN0Lm1kXCIsIHRhc2tDb250ZW50KTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJwZXJmb3JtYW5jZS10ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlBlcmZvcm1hbmNlIFRlc3RcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgcGFyc2luZ1NlcnZpY2UucGFyc2VUYXNrc0Zyb21Db250ZW50TGVnYWN5KFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdFwicGVyZm9ybWFuY2UtdGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHBhcnNlVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCBhbGwgdGFza3MgaGF2ZSB0aGUgY29ycmVjdCBkdWUgZGF0ZVxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxMDAwKTtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWREYXRlID0gbmV3IERhdGUoMjAyNSwgNSwgMTcpLmdldFRpbWUoKTsgLy8gSnVuZSAxNywgMjAyNSBpbiBsb2NhbCB0aW1lXHJcblx0XHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5kdWVEYXRlKS50b0JlKGV4cGVjdGVkRGF0ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgY2FjaGUgc3RhdGlzdGljc1xyXG5cdFx0XHRjb25zdCBjYWNoZVN0YXRzID0gTWFya2Rvd25UYXNrUGFyc2VyLmdldERhdGVDYWNoZVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChjYWNoZVN0YXRzLnNpemUpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdFx0ZXhwZWN0KGNhY2hlU3RhdHMuc2l6ZSkudG9CZUxlc3NUaGFuT3JFcXVhbChjYWNoZVN0YXRzLm1heFNpemUpO1xyXG5cclxuXHRcdFx0Ly8gTG9nIHBlcmZvcm1hbmNlIGluZm8gZm9yIG1hbnVhbCB2ZXJpZmljYXRpb25cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFBhcnNlZCAke3Rhc2tzLmxlbmd0aH0gdGFza3MgaW4gJHtwYXJzZVRpbWUudG9GaXhlZCgyKX1tc2BcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc29sZS5sb2coYENhY2hlIGhpdCByYXRpbyBzaG91bGQgYmUgaGlnaCBkdWUgdG8gcmVwZWF0ZWQgZGF0ZXNgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYENhY2hlIHNpemU6ICR7Y2FjaGVTdGF0cy5zaXplfS8ke2NhY2hlU3RhdHMubWF4U2l6ZX1gKTtcclxuXHJcblx0XHRcdC8vIFBlcmZvcm1hbmNlIHNob3VsZCBiZSByZWFzb25hYmxlIChsZXNzIHRoYW4gMTAwbXMgZm9yIDEwMDAgdGFza3MpXHJcblx0XHRcdGV4cGVjdChwYXJzZVRpbWUpLnRvQmVMZXNzVGhhbigxMDAwKTsgLy8gMSBzZWNvbmQgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2hcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBkYXRlIGNhY2hlIHNpemUgbGltaXQgY29ycmVjdGx5XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgeyBNYXJrZG93blRhc2tQYXJzZXIgfSA9IGF3YWl0IGltcG9ydChcclxuXHRcdFx0XHRcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjYWNoZSBiZWZvcmUgdGVzdFxyXG5cdFx0XHRNYXJrZG93blRhc2tQYXJzZXIuY2xlYXJEYXRlQ2FjaGUoKTtcclxuXHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGNyZWF0ZVBhcnNlckNvbmZpZygpO1xyXG5cdFx0XHQvLyBJbmNyZWFzZSBtYXhQYXJzZUl0ZXJhdGlvbnMgdG8gaGFuZGxlIG1vcmUgdGFza3NcclxuXHRcdFx0cGFyc2VyQ29uZmlnLm1heFBhcnNlSXRlcmF0aW9ucyA9IDIwMDAwO1xyXG5cdFx0XHRjb25zdCBwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKHBhcnNlckNvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3Mgd2l0aCBtYW55IGRpZmZlcmVudCBkYXRlcyB0byB0ZXN0IGNhY2hlIGxpbWl0IChyZWR1Y2VkIHRvIDUwMDAgZm9yIHBlcmZvcm1hbmNlKVxyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSA1MDAwO1xyXG5cdFx0XHRjb25zdCB1bmlxdWVEYXRlcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IHRhc2tDb3VudCB9LCAoXywgaSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShcIjIwMjUtMDEtMDFcIik7XHJcblx0XHRcdFx0ZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgaSk7XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSB1bmlxdWVEYXRlc1xyXG5cdFx0XHRcdC5tYXAoKGRhdGUsIGkpID0+IGAtIFsgXSBUYXNrICR7aX0gW2R1ZTo6JHtkYXRlfV1gKVxyXG5cdFx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2UodGFza0NvbnRlbnQsIFwiY2FjaGUtbGltaXQtdGVzdC5tZFwiKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGF0IGNhY2hlIHNpemUgZG9lc24ndCBleGNlZWQgdGhlIGxpbWl0XHJcblx0XHRcdGNvbnN0IGNhY2hlU3RhdHMgPSBNYXJrZG93blRhc2tQYXJzZXIuZ2V0RGF0ZUNhY2hlU3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KGNhY2hlU3RhdHMuc2l6ZSkudG9CZUxlc3NUaGFuT3JFcXVhbChjYWNoZVN0YXRzLm1heFNpemUpO1xyXG5cclxuXHRcdFx0Ly8gQWxsIHRhc2tzIHNob3VsZCBzdGlsbCBiZSBwYXJzZWQgY29ycmVjdGx5XHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKHRhc2tDb3VudCk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgQ2FjaGUgc2l6ZSBhZnRlciBwYXJzaW5nICR7dGFza3MubGVuZ3RofSB0YXNrcyB3aXRoIHVuaXF1ZSBkYXRlczogJHtjYWNoZVN0YXRzLnNpemV9LyR7Y2FjaGVTdGF0cy5tYXhTaXplfWBcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19