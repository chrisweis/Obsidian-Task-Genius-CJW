/**
 * ProjectConfigManager Tests
 *
 * Tests for project configuration management including:
 * - Path-based project mappings
 * - Metadata-based project detection
 * - Config file-based project detection
 * - Metadata field mappings
 * - Default project naming strategies
 */
import { __awaiter } from "tslib";
import { ProjectConfigManager, } from "../managers/project-config-manager";
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
class MockVault {
    constructor() {
        this.files = new Map();
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
        return new MockTFolder(path, folderName);
    }
    getAbstractFileByPath(path) {
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
describe("ProjectConfigManager", () => {
    let vault = new MockVault();
    let metadataCache = new MockMetadataCache();
    let manager;
    const defaultOptions = {
        vault: vault,
        metadataCache: metadataCache,
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
        enhancedProjectEnabled: true,
        metadataConfigEnabled: true,
        configFileEnabled: true,
    };
    beforeEach(() => {
        vault = new MockVault();
        metadataCache = new MockMetadataCache();
        const options = Object.assign(Object.assign({}, defaultOptions), { vault: vault, metadataCache: metadataCache });
        manager = new ProjectConfigManager(options);
    });
    describe("Path-based project mapping", () => {
        it("should detect project from path mappings", () => __awaiter(void 0, void 0, void 0, function* () {
            const pathMappings = [
                {
                    pathPattern: "Projects/Work",
                    projectName: "Work Project",
                    enabled: true,
                },
                {
                    pathPattern: "Personal",
                    projectName: "Personal Project",
                    enabled: true,
                },
            ];
            manager.updateOptions({ pathMappings });
            const workProject = yield manager.determineTgProject("Projects/Work/task.md");
            expect(workProject).toEqual({
                type: "path",
                name: "Work Project",
                source: "Projects/Work",
                readonly: true,
            });
            const personalProject = yield manager.determineTgProject("Personal/notes.md");
            expect(personalProject).toEqual({
                type: "path",
                name: "Personal Project",
                source: "Personal",
                readonly: true,
            });
        }));
        it("should ignore disabled path mappings", () => __awaiter(void 0, void 0, void 0, function* () {
            const pathMappings = [
                {
                    pathPattern: "Projects/Work",
                    projectName: "Work Project",
                    enabled: false,
                },
            ];
            manager.updateOptions({ pathMappings });
            const project = yield manager.determineTgProject("Projects/Work/task.md");
            expect(project).toBeUndefined();
        }));
        it("should support wildcard patterns", () => __awaiter(void 0, void 0, void 0, function* () {
            const pathMappings = [
                {
                    pathPattern: "Projects/*",
                    projectName: "Any Project",
                    enabled: true,
                },
            ];
            manager.updateOptions({ pathMappings });
            const project = yield manager.determineTgProject("Projects/SomeProject/task.md");
            expect(project).toEqual({
                type: "path",
                name: "Any Project",
                source: "Projects/*",
                readonly: true,
            });
        }));
    });
    describe("Metadata-based project detection", () => {
        it("should detect project from file frontmatter", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", { project: "My Project" });
            const project = yield manager.determineTgProject("test.md");
            expect(project).toEqual({
                type: "metadata",
                name: "My Project",
                source: "project",
                readonly: true,
            });
        }));
        it("should use custom metadata key", () => __awaiter(void 0, void 0, void 0, function* () {
            manager.updateOptions({ metadataKey: "proj" });
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                proj: "Custom Project",
            });
            const project = yield manager.determineTgProject("test.md");
            expect(project).toEqual({
                type: "metadata",
                name: "Custom Project",
                source: "proj",
                readonly: true,
            });
        }));
        it("should handle missing files gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const project = yield manager.determineTgProject("nonexistent.md");
            expect(project).toBeUndefined();
        }));
    });
    describe("Config file-based project detection", () => {
        it("should detect project from config file", () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a project config file
            vault.addFile("Projects/project.md", `---
project: Config Project
---

# Project Configuration
`);
            // Mock the folder structure
            const file = vault.addFile("Projects/task.md", "- [ ] Test task");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            // Set metadata for config file
            metadataCache.setFileMetadata("Projects/project.md", {
                project: "Config Project",
            });
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toEqual({
                type: "config",
                name: "Config Project",
                source: "project.md",
                readonly: true,
            });
        }));
        it("should parse project from config file content", () => __awaiter(void 0, void 0, void 0, function* () {
            const configContent = `
# Project Configuration

project: Content Project
description: A project defined in content
`;
            vault.addFile("Projects/project.md", configContent);
            // Mock folder structure
            const file = vault.addFile("Projects/task.md", "- [ ] Test task");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toEqual({
                type: "config",
                name: "Content Project",
                source: "project.md",
                readonly: true,
            });
        }));
    });
    describe("Metadata mappings", () => {
        it("should apply metadata mappings", () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataMappings = [
                {
                    sourceKey: "proj",
                    targetKey: "project",
                    enabled: true,
                },
                {
                    sourceKey: "due_date",
                    targetKey: "due",
                    enabled: true,
                },
            ];
            manager.updateOptions({ metadataMappings });
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                proj: "Mapped Project",
                due_date: "2024-01-01",
                other: "value",
            });
            const enhancedMetadata = yield manager.getEnhancedMetadata("test.md");
            expect(enhancedMetadata).toEqual({
                proj: "Mapped Project",
                due_date: "2024-01-01",
                other: "value",
                project: "Mapped Project",
                due: 1704038400000,
            });
        }));
        it("should ignore disabled mappings", () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataMappings = [
                {
                    sourceKey: "proj",
                    targetKey: "project",
                    enabled: false,
                },
            ];
            manager.updateOptions({ metadataMappings });
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                proj: "Should Not Map",
            });
            const enhancedMetadata = yield manager.getEnhancedMetadata("test.md");
            expect(enhancedMetadata).toEqual({
                proj: "Should Not Map",
            });
            expect(enhancedMetadata.project).toBeUndefined();
        }));
    });
    describe("Default project naming", () => {
        it("should use filename as project name", () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultProjectNaming = {
                strategy: "filename",
                stripExtension: true,
                enabled: true,
            };
            manager.updateOptions({ defaultProjectNaming });
            const project = yield manager.determineTgProject("Projects/my-document.md");
            expect(project).toEqual({
                type: "default",
                name: "my-document",
                source: "filename",
                readonly: true,
            });
        }));
        it("should use filename without stripping extension", () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultProjectNaming = {
                strategy: "filename",
                stripExtension: false,
                enabled: true,
            };
            manager.updateOptions({ defaultProjectNaming });
            const project = yield manager.determineTgProject("Projects/my-document.md");
            expect(project).toEqual({
                type: "default",
                name: "my-document.md",
                source: "filename",
                readonly: true,
            });
        }));
        it("should use folder name as project name", () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultProjectNaming = {
                strategy: "foldername",
                enabled: true,
            };
            manager.updateOptions({ defaultProjectNaming });
            const project = yield manager.determineTgProject("Projects/WorkFolder/task.md");
            expect(project).toEqual({
                type: "default",
                name: "WorkFolder",
                source: "foldername",
                readonly: true,
            });
        }));
        it("should use metadata value as project name", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("anywhere/task.md", "# Test file");
            metadataCache.setFileMetadata("anywhere/task.md", {
                "project-name": "Global Project",
            });
            const defaultProjectNaming = {
                strategy: "metadata",
                metadataKey: "project-name",
                enabled: true,
            };
            manager.updateOptions({ defaultProjectNaming });
            const project = yield manager.determineTgProject("anywhere/task.md");
            expect(project).toEqual({
                type: "default",
                name: "Global Project",
                source: "metadata",
                readonly: true,
            });
        }));
        it("should not apply default naming when disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultProjectNaming = {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            };
            manager.updateOptions({ defaultProjectNaming });
            const project = yield manager.determineTgProject("Projects/my-document.md");
            expect(project).toBeUndefined();
        }));
    });
    describe("Priority order", () => {
        it("should prioritize path mappings over metadata", () => __awaiter(void 0, void 0, void 0, function* () {
            const pathMappings = [
                {
                    pathPattern: "Projects",
                    projectName: "Path Project",
                    enabled: true,
                },
            ];
            manager.updateOptions({ pathMappings });
            vault.addFile("Projects/task.md", "# Test file");
            metadataCache.setFileMetadata("Projects/task.md", {
                project: "Metadata Project",
            });
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toEqual({
                type: "path",
                name: "Path Project",
                source: "Projects",
                readonly: true,
            });
        }));
        it("should prioritize metadata over config file", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("Projects/task.md", "# Test file");
            vault.addFile("Projects/project.md", "project: Config Project");
            metadataCache.setFileMetadata("Projects/task.md", {
                project: "Metadata Project",
            });
            // Mock folder structure
            const file = vault.getAbstractFileByPath("Projects/task.md");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (file && configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toEqual({
                type: "metadata",
                name: "Metadata Project",
                source: "project",
                readonly: true,
            });
        }));
        it("should prioritize config file over default naming", () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultProjectNaming = {
                strategy: "filename",
                stripExtension: true,
                enabled: true,
            };
            manager.updateOptions({ defaultProjectNaming });
            vault.addFile("Projects/task.md", "# Test file");
            vault.addFile("Projects/project.md", "project: Config Project");
            // Mock folder structure
            const file = vault.getAbstractFileByPath("Projects/task.md");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (file && configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toEqual({
                type: "config",
                name: "Config Project",
                source: "project.md",
                readonly: true,
            });
        }));
    });
    describe("Caching", () => {
        it("should cache project config data", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("Projects/project.md", "project: Cached Project");
            vault.addFile("Projects/task.md", "# Test file");
            // Mock folder structure
            const file = vault.getAbstractFileByPath("Projects/task.md");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (file && configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            // First call should read and cache
            const project1 = yield manager.determineTgProject("Projects/task.md");
            // Second call should use cache
            const project2 = yield manager.determineTgProject("Projects/task.md");
            expect(project1).toEqual(project2);
            expect(project1 === null || project1 === void 0 ? void 0 : project1.name).toBe("Cached Project");
        }));
        it("should clear cache when options change", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "Original Project",
            });
            const project1 = yield manager.determineTgProject("test.md");
            expect(project1 === null || project1 === void 0 ? void 0 : project1.name).toBe("Original Project");
            // Change metadata key
            manager.updateOptions({ metadataKey: "proj" });
            metadataCache.setFileMetadata("test.md", { proj: "New Project" });
            const project2 = yield manager.determineTgProject("test.md");
            expect(project2 === null || project2 === void 0 ? void 0 : project2.name).toBe("New Project");
        }));
    });
    describe("Error handling", () => {
        it("should handle file access errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock vault that throws errors
            const errorVault = {
                getAbstractFileByPath: () => {
                    throw new Error("File access error");
                },
            };
            const errorManager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { vault: errorVault }));
            const project = yield errorManager.determineTgProject("test.md");
            expect(project).toBeUndefined();
        }));
        it("should handle malformed config files gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            vault.addFile("Projects/project.md", "Invalid content without proper format");
            vault.addFile("Projects/task.md", "# Test file");
            // Mock folder structure
            const file = vault.getAbstractFileByPath("Projects/task.md");
            const folder = vault.addFolder("Projects");
            const configFile = vault.getAbstractFileByPath("Projects/project.md");
            if (file && configFile) {
                folder.children.push(configFile);
                file.parent = folder;
            }
            const project = yield manager.determineTgProject("Projects/task.md");
            expect(project).toBeUndefined();
        }));
    });
    describe("Enhanced project feature flag", () => {
        it("should respect enhanced project enabled flag", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test data
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "Test Project",
            });
            // Create manager with enhanced project disabled
            const disabledManager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { enhancedProjectEnabled: false }));
            // All methods should return null/empty when disabled
            expect(yield disabledManager.getProjectConfig("test.md")).toBeNull();
            expect(disabledManager.getFileMetadata("test.md")).toBeNull();
            expect(yield disabledManager.determineTgProject("test.md")).toBeUndefined();
            expect(yield disabledManager.getEnhancedMetadata("test.md")).toEqual({});
            expect(disabledManager.isEnhancedProjectEnabled()).toBe(false);
        }));
        it("should allow enabling/disabling enhanced project features", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test data
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "Test Project",
            });
            // Start with enabled
            manager.setEnhancedProjectEnabled(true);
            expect(manager.isEnhancedProjectEnabled()).toBe(true);
            expect(manager.getFileMetadata("test.md")).toEqual({
                project: "Test Project",
            });
            // Disable
            manager.setEnhancedProjectEnabled(false);
            expect(manager.isEnhancedProjectEnabled()).toBe(false);
            expect(manager.getFileMetadata("test.md")).toBeNull();
            // Re-enable
            manager.setEnhancedProjectEnabled(true);
            expect(manager.isEnhancedProjectEnabled()).toBe(true);
            expect(manager.getFileMetadata("test.md")).toEqual({
                project: "Test Project",
            });
        }));
        it("should update enhanced project flag through updateOptions", () => {
            expect(manager.isEnhancedProjectEnabled()).toBe(true); // Default
            manager.updateOptions({ enhancedProjectEnabled: false });
            expect(manager.isEnhancedProjectEnabled()).toBe(false);
            manager.updateOptions({ enhancedProjectEnabled: true });
            expect(manager.isEnhancedProjectEnabled()).toBe(true);
        });
        it("should not process frontmatter metadata when enhanced project is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test data with frontmatter
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "Frontmatter Project",
                priority: 5,
                dueDate: "2024-01-01",
                customField: "custom value",
            });
            // Create manager with enhanced project disabled
            const disabledManager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { enhancedProjectEnabled: false }));
            // All metadata-related methods should return null/empty when disabled
            expect(disabledManager.getFileMetadata("test.md")).toBeNull();
            expect(yield disabledManager.getEnhancedMetadata("test.md")).toEqual({});
            // Even if frontmatter exists, it should not be accessible through disabled manager
            expect(yield disabledManager.determineTgProject("test.md")).toBeUndefined();
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdENvbmZpZ01hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlByb2plY3RDb25maWdNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHOztBQUVILE9BQU8sRUFDTixvQkFBb0IsR0FJcEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1QyxzQkFBc0I7QUFDdEIsTUFBTSxTQUFTO0lBQ2QsWUFDUSxJQUFZLEVBQ1osSUFBWSxFQUNaLFNBQTZCLElBQUk7UUFGakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUV4QyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0lBQ25DLENBQUM7Q0FFRDtBQUVELE1BQU0sV0FBVztJQUNoQixZQUNRLElBQVksRUFDWixJQUFZLEVBQ1osU0FBNkIsSUFBSSxFQUNqQyxXQUF3QyxFQUFFO1FBSDFDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFDakMsYUFBUSxHQUFSLFFBQVEsQ0FBa0M7SUFDL0MsQ0FBQztDQUNKO0FBRUQsTUFBTSxTQUFTO0lBQWY7UUFDUyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7UUFDckMsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQXNCbEQsQ0FBQztJQXBCQSxPQUFPLENBQUMsSUFBWSxFQUFFLE9BQWU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxD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ZSxHQUFHLElBQUksb0JBQW9CLGlDQUM1QyxjQUFjLEtBQ2pCLHNCQUFzQixFQUFFLEtBQUssSUFDNUIsQ0FBQztZQUVILHNFQUFzRTtZQUN0RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzlELE1BQU0sQ0FDTCxNQUFNLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FDcEQsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFZCxtRkFBbUY7WUFDbkYsTUFBTSxDQUNMLE1BQU0sZUFBZSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUNuRCxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25CLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2plY3RDb25maWdNYW5hZ2VyIFRlc3RzXHJcbiAqXHJcbiAqIFRlc3RzIGZvciBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gbWFuYWdlbWVudCBpbmNsdWRpbmc6XHJcbiAqIC0gUGF0aC1iYXNlZCBwcm9qZWN0IG1hcHBpbmdzXHJcbiAqIC0gTWV0YWRhdGEtYmFzZWQgcHJvamVjdCBkZXRlY3Rpb25cclxuICogLSBDb25maWcgZmlsZS1iYXNlZCBwcm9qZWN0IGRldGVjdGlvblxyXG4gKiAtIE1ldGFkYXRhIGZpZWxkIG1hcHBpbmdzXHJcbiAqIC0gRGVmYXVsdCBwcm9qZWN0IG5hbWluZyBzdHJhdGVnaWVzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuXHRQcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRQcm9qZWN0Q29uZmlnTWFuYWdlck9wdGlvbnMsXHJcblx0TWV0YWRhdGFNYXBwaW5nLFxyXG5cdFByb2plY3ROYW1pbmdTdHJhdGVneSxcclxufSBmcm9tIFwiLi4vbWFuYWdlcnMvcHJvamVjdC1jb25maWctbWFuYWdlclwiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiB0eXBlc1xyXG5jbGFzcyBNb2NrVEZpbGUge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHVibGljIHBhdGg6IHN0cmluZyxcclxuXHRcdHB1YmxpYyBuYW1lOiBzdHJpbmcsXHJcblx0XHRwdWJsaWMgcGFyZW50OiBNb2NrVEZvbGRlciB8IG51bGwgPSBudWxsXHJcblx0KSB7XHJcblx0XHR0aGlzLnN0YXQgPSB7IG10aW1lOiBEYXRlLm5vdygpIH07XHJcblx0fVxyXG5cdHN0YXQ6IHsgbXRpbWU6IG51bWJlciB9O1xyXG59XHJcblxyXG5jbGFzcyBNb2NrVEZvbGRlciB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgcGF0aDogc3RyaW5nLFxyXG5cdFx0cHVibGljIG5hbWU6IHN0cmluZyxcclxuXHRcdHB1YmxpYyBwYXJlbnQ6IE1vY2tURm9sZGVyIHwgbnVsbCA9IG51bGwsXHJcblx0XHRwdWJsaWMgY2hpbGRyZW46IChNb2NrVEZpbGUgfCBNb2NrVEZvbGRlcilbXSA9IFtdXHJcblx0KSB7fVxyXG59XHJcblxyXG5jbGFzcyBNb2NrVmF1bHQge1xyXG5cdHByaXZhdGUgZmlsZXMgPSBuZXcgTWFwPHN0cmluZywgTW9ja1RGaWxlPigpO1xyXG5cdHByaXZhdGUgZmlsZUNvbnRlbnRzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHJcblx0YWRkRmlsZShwYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IE1vY2tURmlsZSB7XHJcblx0XHRjb25zdCBmaWxlTmFtZSA9IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IFwiXCI7XHJcblx0XHRjb25zdCBmaWxlID0gbmV3IE1vY2tURmlsZShwYXRoLCBmaWxlTmFtZSk7XHJcblx0XHR0aGlzLmZpbGVzLnNldChwYXRoLCBmaWxlKTtcclxuXHRcdHRoaXMuZmlsZUNvbnRlbnRzLnNldChwYXRoLCBjb250ZW50KTtcclxuXHRcdHJldHVybiBmaWxlO1xyXG5cdH1cclxuXHJcblx0YWRkRm9sZGVyKHBhdGg6IHN0cmluZyk6IE1vY2tURm9sZGVyIHtcclxuXHRcdGNvbnN0IGZvbGRlck5hbWUgPSBwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBcIlwiO1xyXG5cdFx0cmV0dXJuIG5ldyBNb2NrVEZvbGRlcihwYXRoLCBmb2xkZXJOYW1lKTtcclxuXHR9XHJcblxyXG5cdGdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoOiBzdHJpbmcpOiBNb2NrVEZpbGUgfCBudWxsIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbGVzLmdldChwYXRoKSB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgcmVhZChmaWxlOiBNb2NrVEZpbGUpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZmlsZUNvbnRlbnRzLmdldChmaWxlLnBhdGgpIHx8IFwiXCI7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBNb2NrTWV0YWRhdGFDYWNoZSB7XHJcblx0cHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XHJcblxyXG5cdHNldEZpbGVNZXRhZGF0YShwYXRoOiBzdHJpbmcsIG1ldGFkYXRhOiBhbnkpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2FjaGUuc2V0KHBhdGgsIHsgZnJvbnRtYXR0ZXI6IG1ldGFkYXRhIH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RmlsZUNhY2hlKGZpbGU6IE1vY2tURmlsZSk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jYWNoZS5nZXQoZmlsZS5wYXRoKTtcclxuXHR9XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiUHJvamVjdENvbmZpZ01hbmFnZXJcIiwgKCkgPT4ge1xyXG5cdGxldCB2YXVsdDogTW9ja1ZhdWx0ID0gbmV3IE1vY2tWYXVsdCgpO1xyXG5cdGxldCBtZXRhZGF0YUNhY2hlOiBNb2NrTWV0YWRhdGFDYWNoZSA9IG5ldyBNb2NrTWV0YWRhdGFDYWNoZSgpO1xyXG5cdGxldCBtYW5hZ2VyOiBQcm9qZWN0Q29uZmlnTWFuYWdlcjtcclxuXHJcblx0Y29uc3QgZGVmYXVsdE9wdGlvbnM6IFByb2plY3RDb25maWdNYW5hZ2VyT3B0aW9ucyA9IHtcclxuXHRcdHZhdWx0OiB2YXVsdCBhcyBhbnksXHJcblx0XHRtZXRhZGF0YUNhY2hlOiBtZXRhZGF0YUNhY2hlIGFzIGFueSxcclxuXHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLFxyXG5cdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0fSxcclxuXHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6IHRydWUsXHJcblx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHR9O1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdHZhdWx0ID0gbmV3IE1vY2tWYXVsdCgpO1xyXG5cdFx0bWV0YWRhdGFDYWNoZSA9IG5ldyBNb2NrTWV0YWRhdGFDYWNoZSgpO1xyXG5cclxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XHJcblx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHR2YXVsdDogdmF1bHQgYXMgYW55LFxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlOiBtZXRhZGF0YUNhY2hlIGFzIGFueSxcclxuXHRcdH07XHJcblxyXG5cdFx0bWFuYWdlciA9IG5ldyBQcm9qZWN0Q29uZmlnTWFuYWdlcihvcHRpb25zKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQYXRoLWJhc2VkIHByb2plY3QgbWFwcGluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBkZXRlY3QgcHJvamVjdCBmcm9tIHBhdGggbWFwcGluZ3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXRoTWFwcGluZ3MgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwiUHJvamVjdHMvV29ya1wiLFxyXG5cdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwiUGVyc29uYWxcIixcclxuXHRcdFx0XHRcdHByb2plY3ROYW1lOiBcIlBlcnNvbmFsIFByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IHBhdGhNYXBwaW5ncyB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHdvcmtQcm9qZWN0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9Xb3JrL3Rhc2subWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3Qod29ya1Byb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHR5cGU6IFwicGF0aFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIlByb2plY3RzL1dvcmtcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBwZXJzb25hbFByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlBlcnNvbmFsL25vdGVzLm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHBlcnNvbmFsUHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0bmFtZTogXCJQZXJzb25hbCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIlBlcnNvbmFsXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaWdub3JlIGRpc2FibGVkIHBhdGggbWFwcGluZ3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXRoTWFwcGluZ3MgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwiUHJvamVjdHMvV29ya1wiLFxyXG5cdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0bWFuYWdlci51cGRhdGVPcHRpb25zKHsgcGF0aE1hcHBpbmdzIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvV29yay90YXNrLm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHByb2plY3QpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHN1cHBvcnQgd2lsZGNhcmQgcGF0dGVybnNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXRoTWFwcGluZ3MgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwiUHJvamVjdHMvKlwiLFxyXG5cdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiQW55IFByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IHBhdGhNYXBwaW5ncyB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL1NvbWVQcm9qZWN0L3Rhc2subWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0bmFtZTogXCJBbnkgUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0cy8qXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWV0YWRhdGEtYmFzZWQgcHJvamVjdCBkZXRlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgZGV0ZWN0IHByb2plY3QgZnJvbSBmaWxlIGZyb250bWF0dGVyXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInRlc3QubWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJ0ZXN0Lm1kXCIsIHsgcHJvamVjdDogXCJNeSBQcm9qZWN0XCIgfSk7XHJcblxyXG5cdFx0XHRjb25zdCBwcm9qZWN0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiTXkgUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdXNlIGN1c3RvbSBtZXRhZGF0YSBrZXlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBtZXRhZGF0YUtleTogXCJwcm9qXCIgfSk7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ0ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvajogXCJDdXN0b20gUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcInRlc3QubWRcIik7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0bmFtZTogXCJDdXN0b20gUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG1pc3NpbmcgZmlsZXMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcIm5vbmV4aXN0ZW50Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ29uZmlnIGZpbGUtYmFzZWQgcHJvamVjdCBkZXRlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgZGV0ZWN0IHByb2plY3QgZnJvbSBjb25maWcgZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIHByb2plY3QgY29uZmlnIGZpbGVcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcclxuXHRcdFx0XHRcIlByb2plY3RzL3Byb2plY3QubWRcIixcclxuXHRcdFx0XHRgLS0tXHJcbnByb2plY3Q6IENvbmZpZyBQcm9qZWN0XHJcbi0tLVxyXG5cclxuIyBQcm9qZWN0IENvbmZpZ3VyYXRpb25cclxuYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gTW9jayB0aGUgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuYWRkRmlsZShcIlByb2plY3RzL3Rhc2subWRcIiwgXCItIFsgXSBUZXN0IHRhc2tcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlByb2plY3RzXCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0Zm9sZGVyLmNoaWxkcmVuLnB1c2goY29uZmlnRmlsZSk7XHJcblx0XHRcdFx0ZmlsZS5wYXJlbnQgPSBmb2xkZXI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNldCBtZXRhZGF0YSBmb3IgY29uZmlnIGZpbGVcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIkNvbmZpZyBQcm9qZWN0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwiQ29uZmlnIFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHByb2plY3QgZnJvbSBjb25maWcgZmlsZSBjb250ZW50XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnQ29udGVudCA9IGBcclxuIyBQcm9qZWN0IENvbmZpZ3VyYXRpb25cclxuXHJcbnByb2plY3Q6IENvbnRlbnQgUHJvamVjdFxyXG5kZXNjcmlwdGlvbjogQSBwcm9qZWN0IGRlZmluZWQgaW4gY29udGVudFxyXG5gO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiUHJvamVjdHMvcHJvamVjdC5tZFwiLCBjb25maWdDb250ZW50KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuYWRkRmlsZShcIlByb2plY3RzL3Rhc2subWRcIiwgXCItIFsgXSBUZXN0IHRhc2tcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlByb2plY3RzXCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0Zm9sZGVyLmNoaWxkcmVuLnB1c2goY29uZmlnRmlsZSk7XHJcblx0XHRcdFx0ZmlsZS5wYXJlbnQgPSBmb2xkZXI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL3Rhc2subWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJjb25maWdcIixcclxuXHRcdFx0XHRuYW1lOiBcIkNvbnRlbnQgUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWV0YWRhdGEgbWFwcGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgYXBwbHkgbWV0YWRhdGEgbWFwcGluZ3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YU1hcHBpbmdzOiBNZXRhZGF0YU1hcHBpbmdbXSA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRzb3VyY2VLZXk6IFwicHJvalwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0S2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRzb3VyY2VLZXk6IFwiZHVlX2RhdGVcIixcclxuXHRcdFx0XHRcdHRhcmdldEtleTogXCJkdWVcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IG1ldGFkYXRhTWFwcGluZ3MgfSk7XHJcblxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2o6IFwiTWFwcGVkIFByb2plY3RcIixcclxuXHRcdFx0XHRkdWVfZGF0ZTogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0b3RoZXI6IFwidmFsdWVcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gYXdhaXQgbWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKFxyXG5cdFx0XHRcdFwidGVzdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChlbmhhbmNlZE1ldGFkYXRhKS50b0VxdWFsKHtcclxuXHRcdFx0XHRwcm9qOiBcIk1hcHBlZCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0ZHVlX2RhdGU6IFwiMjAyNC0wMS0wMVwiLFxyXG5cdFx0XHRcdG90aGVyOiBcInZhbHVlXCIsXHJcblx0XHRcdFx0cHJvamVjdDogXCJNYXBwZWQgUHJvamVjdFwiLFxyXG5cdFx0XHRcdGR1ZTogMTcwNDAzODQwMDAwMCxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBpZ25vcmUgZGlzYWJsZWQgbWFwcGluZ3NcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YU1hcHBpbmdzOiBNZXRhZGF0YU1hcHBpbmdbXSA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRzb3VyY2VLZXk6IFwicHJvalwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0S2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBtZXRhZGF0YU1hcHBpbmdzIH0pO1xyXG5cclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInRlc3QubWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJ0ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qOiBcIlNob3VsZCBOb3QgTWFwXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IGF3YWl0IG1hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShcclxuXHRcdFx0XHRcInRlc3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRNZXRhZGF0YSkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvajogXCJTaG91bGQgTm90IE1hcFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkTWV0YWRhdGEucHJvamVjdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRGVmYXVsdCBwcm9qZWN0IG5hbWluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCB1c2UgZmlsZW5hbWUgYXMgcHJvamVjdCBuYW1lXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdFByb2plY3ROYW1pbmc6IFByb2plY3ROYW1pbmdTdHJhdGVneSA9IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBkZWZhdWx0UHJvamVjdE5hbWluZyB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL215LWRvY3VtZW50Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHByb2plY3QpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHR5cGU6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwibXktZG9jdW1lbnRcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1c2UgZmlsZW5hbWUgd2l0aG91dCBzdHJpcHBpbmcgZXh0ZW5zaW9uXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdFByb2plY3ROYW1pbmc6IFByb2plY3ROYW1pbmdTdHJhdGVneSA9IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiBmYWxzZSxcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bWFuYWdlci51cGRhdGVPcHRpb25zKHsgZGVmYXVsdFByb2plY3ROYW1pbmcgfSk7XHJcblxyXG5cdFx0XHRjb25zdCBwcm9qZWN0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9teS1kb2N1bWVudC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0XHRuYW1lOiBcIm15LWRvY3VtZW50Lm1kXCIsXHJcblx0XHRcdFx0c291cmNlOiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdXNlIGZvbGRlciBuYW1lIGFzIHByb2plY3QgbmFtZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtaW5nOiBQcm9qZWN0TmFtaW5nU3RyYXRlZ3kgPSB7XHJcblx0XHRcdFx0c3RyYXRlZ3k6IFwiZm9sZGVybmFtZVwiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBkZWZhdWx0UHJvamVjdE5hbWluZyB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL1dvcmtGb2xkZXIvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0XHRuYW1lOiBcIldvcmtGb2xkZXJcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwiZm9sZGVybmFtZVwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHVzZSBtZXRhZGF0YSB2YWx1ZSBhcyBwcm9qZWN0IG5hbWVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwiYW55d2hlcmUvdGFzay5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcImFueXdoZXJlL3Rhc2subWRcIiwge1xyXG5cdFx0XHRcdFwicHJvamVjdC1uYW1lXCI6IFwiR2xvYmFsIFByb2plY3RcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBkZWZhdWx0UHJvamVjdE5hbWluZzogUHJvamVjdE5hbWluZ1N0cmF0ZWd5ID0ge1xyXG5cdFx0XHRcdHN0cmF0ZWd5OiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdC1uYW1lXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IGRlZmF1bHRQcm9qZWN0TmFtaW5nIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiYW55d2hlcmUvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0XHRuYW1lOiBcIkdsb2JhbCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbm90IGFwcGx5IGRlZmF1bHQgbmFtaW5nIHdoZW4gZGlzYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkZWZhdWx0UHJvamVjdE5hbWluZzogUHJvamVjdE5hbWluZ1N0cmF0ZWd5ID0ge1xyXG5cdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBkZWZhdWx0UHJvamVjdE5hbWluZyB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL215LWRvY3VtZW50Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHByb2plY3QpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlByaW9yaXR5IG9yZGVyXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgcGF0aCBtYXBwaW5ncyBvdmVyIG1ldGFkYXRhXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGF0aE1hcHBpbmdzID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcIlByb2plY3RzXCIsXHJcblx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoIFByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IHBhdGhNYXBwaW5ncyB9KTtcclxuXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy90YXNrLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwiUHJvamVjdHMvdGFzay5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRuYW1lOiBcIlBhdGggUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0c1wiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgbWV0YWRhdGEgb3ZlciBjb25maWcgZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy90YXNrLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogQ29uZmlnIFByb2plY3RcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwiUHJvamVjdHMvdGFzay5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBmb2xkZXIgc3RydWN0dXJlXHJcblx0XHRcdGNvbnN0IGZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJQcm9qZWN0cy90YXNrLm1kXCIpO1xyXG5cdFx0XHRjb25zdCBmb2xkZXIgPSB2YXVsdC5hZGRGb2xkZXIoXCJQcm9qZWN0c1wiKTtcclxuXHRcdFx0Y29uc3QgY29uZmlnRmlsZSA9IHZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcclxuXHRcdFx0XHRcIlByb2plY3RzL3Byb2plY3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoZmlsZSAmJiBjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0Zm9sZGVyLmNoaWxkcmVuLnB1c2goY29uZmlnRmlsZSk7XHJcblx0XHRcdFx0ZmlsZS5wYXJlbnQgPSBmb2xkZXI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL3Rhc2subWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiTWV0YWRhdGEgUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcHJpb3JpdGl6ZSBjb25maWcgZmlsZSBvdmVyIGRlZmF1bHQgbmFtaW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdFByb2plY3ROYW1pbmc6IFByb2plY3ROYW1pbmdTdHJhdGVneSA9IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBkZWZhdWx0UHJvamVjdE5hbWluZyB9KTtcclxuXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy90YXNrLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogQ29uZmlnIFByb2plY3RcIik7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGZvbGRlciBzdHJ1Y3R1cmVcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlByb2plY3RzL3Rhc2subWRcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlByb2plY3RzXCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChmaWxlICYmIGNvbmZpZ0ZpbGUpIHtcclxuXHRcdFx0XHRmb2xkZXIuY2hpbGRyZW4ucHVzaChjb25maWdGaWxlKTtcclxuXHRcdFx0XHRmaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChwcm9qZWN0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwiQ29uZmlnIFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNhY2hpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY2FjaGUgcHJvamVjdCBjb25maWcgZGF0YVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogQ2FjaGVkIFByb2plY3RcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJQcm9qZWN0cy90YXNrLm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblxyXG5cdFx0XHQvLyBNb2NrIGZvbGRlciBzdHJ1Y3R1cmVcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlByb2plY3RzL3Rhc2subWRcIik7XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcIlByb2plY3RzXCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvcHJvamVjdC5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChmaWxlICYmIGNvbmZpZ0ZpbGUpIHtcclxuXHRcdFx0XHRmb2xkZXIuY2hpbGRyZW4ucHVzaChjb25maWdGaWxlKTtcclxuXHRcdFx0XHRmaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2FsbCBzaG91bGQgcmVhZCBhbmQgY2FjaGVcclxuXHRcdFx0Y29uc3QgcHJvamVjdDEgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcclxuXHRcdFx0XHRcIlByb2plY3RzL3Rhc2subWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIGNhbGwgc2hvdWxkIHVzZSBjYWNoZVxyXG5cdFx0XHRjb25zdCBwcm9qZWN0MiA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMvdGFzay5tZFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocHJvamVjdDEpLnRvRXF1YWwocHJvamVjdDIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdDE/Lm5hbWUpLnRvQmUoXCJDYWNoZWQgUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNsZWFyIGNhY2hlIHdoZW4gb3B0aW9ucyBjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiT3JpZ2luYWwgUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QxID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdDE/Lm5hbWUpLnRvQmUoXCJPcmlnaW5hbCBQcm9qZWN0XCIpO1xyXG5cclxuXHRcdFx0Ly8gQ2hhbmdlIG1ldGFkYXRhIGtleVxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBtZXRhZGF0YUtleTogXCJwcm9qXCIgfSk7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiLCB7IHByb2o6IFwiTmV3IFByb2plY3RcIiB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3QyID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdDI/Lm5hbWUpLnRvQmUoXCJOZXcgUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVycm9yIGhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBmaWxlIGFjY2VzcyBlcnJvcnMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIE1vY2sgdmF1bHQgdGhhdCB0aHJvd3MgZXJyb3JzXHJcblx0XHRcdGNvbnN0IGVycm9yVmF1bHQgPSB7XHJcblx0XHRcdFx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoOiAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJGaWxlIGFjY2VzcyBlcnJvclwiKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXJyb3JNYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHR2YXVsdDogZXJyb3JWYXVsdCBhcyBhbnksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IGF3YWl0IGVycm9yTWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocHJvamVjdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCBjb25maWcgZmlsZXMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0XCJJbnZhbGlkIGNvbnRlbnQgd2l0aG91dCBwcm9wZXIgZm9ybWF0XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcIlByb2plY3RzL3Rhc2subWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiUHJvamVjdHMvdGFzay5tZFwiKTtcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gdmF1bHQuYWRkRm9sZGVyKFwiUHJvamVjdHNcIik7XHJcblx0XHRcdGNvbnN0IGNvbmZpZ0ZpbGUgPSB2YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9wcm9qZWN0Lm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGZpbGUgJiYgY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdGZvbGRlci5jaGlsZHJlbi5wdXNoKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHRcdGZpbGUucGFyZW50ID0gZm9sZGVyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBwcm9qZWN0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXHJcblx0XHRcdFx0XCJQcm9qZWN0cy90YXNrLm1kXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHByb2plY3QpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVuaGFuY2VkIHByb2plY3QgZmVhdHVyZSBmbGFnXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJlc3BlY3QgZW5oYW5jZWQgcHJvamVjdCBlbmFibGVkIGZsYWdcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCB0ZXN0IGRhdGFcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInRlc3QubWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJ0ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggZW5oYW5jZWQgcHJvamVjdCBkaXNhYmxlZFxyXG5cdFx0XHRjb25zdCBkaXNhYmxlZE1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFsbCBtZXRob2RzIHNob3VsZCByZXR1cm4gbnVsbC9lbXB0eSB3aGVuIGRpc2FibGVkXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRhd2FpdCBkaXNhYmxlZE1hbmFnZXIuZ2V0UHJvamVjdENvbmZpZyhcInRlc3QubWRcIilcclxuXHRcdFx0KS50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QoZGlzYWJsZWRNYW5hZ2VyLmdldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIikpLnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRhd2FpdCBkaXNhYmxlZE1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFwidGVzdC5tZFwiKVxyXG5cdFx0XHQpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KFxyXG5cdFx0XHRcdGF3YWl0IGRpc2FibGVkTWFuYWdlci5nZXRFbmhhbmNlZE1ldGFkYXRhKFwidGVzdC5tZFwiKVxyXG5cdFx0XHQpLnRvRXF1YWwoe30pO1xyXG5cdFx0XHRleHBlY3QoZGlzYWJsZWRNYW5hZ2VyLmlzRW5oYW5jZWRQcm9qZWN0RW5hYmxlZCgpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGFsbG93IGVuYWJsaW5nL2Rpc2FibGluZyBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0dXAgdGVzdCBkYXRhXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ0ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTdGFydCB3aXRoIGVuYWJsZWRcclxuXHRcdFx0bWFuYWdlci5zZXRFbmhhbmNlZFByb2plY3RFbmFibGVkKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKSkudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuZ2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiKSkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0IFByb2plY3RcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBEaXNhYmxlXHJcblx0XHRcdG1hbmFnZXIuc2V0RW5oYW5jZWRQcm9qZWN0RW5hYmxlZChmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLmlzRW5oYW5jZWRQcm9qZWN0RW5hYmxlZCgpKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuZ2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiKSkudG9CZU51bGwoKTtcclxuXHJcblx0XHRcdC8vIFJlLWVuYWJsZVxyXG5cdFx0XHRtYW5hZ2VyLnNldEVuaGFuY2VkUHJvamVjdEVuYWJsZWQodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLmlzRW5oYW5jZWRQcm9qZWN0RW5hYmxlZCgpKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5nZXRGaWxlTWV0YWRhdGEoXCJ0ZXN0Lm1kXCIpKS50b0VxdWFsKHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHVwZGF0ZSBlbmhhbmNlZCBwcm9qZWN0IGZsYWcgdGhyb3VnaCB1cGRhdGVPcHRpb25zXCIsICgpID0+IHtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuaXNFbmhhbmNlZFByb2plY3RFbmFibGVkKCkpLnRvQmUodHJ1ZSk7IC8vIERlZmF1bHRcclxuXHJcblx0XHRcdG1hbmFnZXIudXBkYXRlT3B0aW9ucyh7IGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6IGZhbHNlIH0pO1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKSkudG9CZShmYWxzZSk7XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZU9wdGlvbnMoeyBlbmhhbmNlZFByb2plY3RFbmFibGVkOiB0cnVlIH0pO1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5pc0VuaGFuY2VkUHJvamVjdEVuYWJsZWQoKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIG5vdCBwcm9jZXNzIGZyb250bWF0dGVyIG1ldGFkYXRhIHdoZW4gZW5oYW5jZWQgcHJvamVjdCBpcyBkaXNhYmxlZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIFNldHVwIHRlc3QgZGF0YSB3aXRoIGZyb250bWF0dGVyXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ0ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJGcm9udG1hdHRlciBQcm9qZWN0XCIsXHJcblx0XHRcdFx0cHJpb3JpdHk6IDUsXHJcblx0XHRcdFx0ZHVlRGF0ZTogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0Y3VzdG9tRmllbGQ6IFwiY3VzdG9tIHZhbHVlXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbmFnZXIgd2l0aCBlbmhhbmNlZCBwcm9qZWN0IGRpc2FibGVkXHJcblx0XHRcdGNvbnN0IGRpc2FibGVkTWFuYWdlciA9IG5ldyBQcm9qZWN0Q29uZmlnTWFuYWdlcih7XHJcblx0XHRcdFx0Li4uZGVmYXVsdE9wdGlvbnMsXHJcblx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWxsIG1ldGFkYXRhLXJlbGF0ZWQgbWV0aG9kcyBzaG91bGQgcmV0dXJuIG51bGwvZW1wdHkgd2hlbiBkaXNhYmxlZFxyXG5cdFx0XHRleHBlY3QoZGlzYWJsZWRNYW5hZ2VyLmdldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIikpLnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRhd2FpdCBkaXNhYmxlZE1hbmFnZXIuZ2V0RW5oYW5jZWRNZXRhZGF0YShcInRlc3QubWRcIilcclxuXHRcdFx0KS50b0VxdWFsKHt9KTtcclxuXHJcblx0XHRcdC8vIEV2ZW4gaWYgZnJvbnRtYXR0ZXIgZXhpc3RzLCBpdCBzaG91bGQgbm90IGJlIGFjY2Vzc2libGUgdGhyb3VnaCBkaXNhYmxlZCBtYW5hZ2VyXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRhd2FpdCBkaXNhYmxlZE1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFwidGVzdC5tZFwiKVxyXG5cdFx0XHQpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19