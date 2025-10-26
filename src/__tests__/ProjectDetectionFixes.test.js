/**
 * Tests for Project Detection Fixes
 *
 * This test file verifies that the fixes for project detection issues work correctly:
 * 1. Metadata detection can be properly enabled/disabled
 * 2. Config file detection can be properly enabled/disabled
 * 3. Search recursively setting works correctly
 * 4. Each detection method respects its enabled state
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
describe("Project Detection Fixes", () => {
    let vault;
    let metadataCache;
    let defaultOptions;
    beforeEach(() => {
        vault = new MockVault();
        metadataCache = new MockMetadataCache();
        defaultOptions = {
            vault: vault,
            metadataCache: metadataCache,
            configFileName: "project.md",
            searchRecursively: false,
            metadataKey: "project",
            pathMappings: [],
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
            enhancedProjectEnabled: true,
            metadataConfigEnabled: false,
            configFileEnabled: false,
        };
    });
    describe("Metadata Detection Enable/Disable", () => {
        it("should NOT detect project from frontmatter when metadata detection is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test file with frontmatter
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                projectName: "MyProject",
                priority: 5,
            });
            // Create manager with metadata detection DISABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { metadataKey: "projectName", metadataConfigEnabled: false }));
            // Should NOT detect project from metadata when disabled
            const result = yield manager.determineTgProject("test.md");
            expect(result).toBeUndefined();
        }));
        it("should detect project from frontmatter when metadata detection is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test file with frontmatter
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                projectName: "MyProject",
                priority: 5,
            });
            // Create manager with metadata detection ENABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { metadataKey: "projectName", metadataConfigEnabled: true }));
            // Should detect project from metadata when enabled
            const result = yield manager.determineTgProject("test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("metadata");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("MyProject");
            expect(result === null || result === void 0 ? void 0 : result.source).toBe("projectName");
        }));
        it("should respect different metadata keys", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test file with custom metadata key
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                customProject: "CustomProject",
                project: "DefaultProject", // This should be ignored
            });
            // Create manager with custom metadata key
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { metadataKey: "customProject", metadataConfigEnabled: true }));
            const result = yield manager.determineTgProject("test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("CustomProject");
            expect(result === null || result === void 0 ? void 0 : result.source).toBe("customProject");
        }));
    });
    describe("Config File Detection Enable/Disable", () => {
        it("should NOT detect project from config file when config file detection is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test file and config file
            vault.addFile("folder/test.md", "# Test file");
            vault.addFile("folder/project.md", "project: ConfigProject\ndescription: Test project");
            // Create manager with config file detection DISABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { configFileEnabled: false }));
            // Should NOT detect project from config file when disabled
            const result = yield manager.determineTgProject("folder/test.md");
            expect(result).toBeUndefined();
        }));
        it("should detect project from config file when config file detection is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test file and config file
            const testFile = vault.addFile("folder/test.md", "# Test file");
            vault.addFile("folder/project.md", "project: ConfigProject\ndescription: Test project");
            // Mock folder structure
            const folder = vault.addFolder("folder");
            const configFile = vault.getAbstractFileByPath("folder/project.md");
            if (configFile) {
                folder.children.push(configFile);
                testFile.parent = folder;
            }
            // Create manager with config file detection ENABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { configFileEnabled: true }));
            // Should detect project from config file when enabled
            const result = yield manager.determineTgProject("folder/test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("config");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("ConfigProject");
            expect(result === null || result === void 0 ? void 0 : result.source).toBe("project.md");
        }));
    });
    describe("Search Recursively Setting", () => {
        it("should NOT search parent directories when searchRecursively is false", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup nested structure with config file in parent
            vault.addFile("parent/project.md", "project: ParentProject");
            vault.addFile("parent/child/test.md", "# Test file");
            // Create manager with recursive search DISABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { searchRecursively: false, configFileEnabled: true }));
            // Should NOT find parent config file
            const result = yield manager.determineTgProject("parent/child/test.md");
            expect(result).toBeUndefined();
        }));
        it("should search parent directories when searchRecursively is true", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup nested structure with config file in parent
            vault.addFile("parent/project.md", "project: ParentProject");
            const testFile = vault.addFile("parent/child/test.md", "# Test file");
            // Mock folder structure
            const parentFolder = vault.addFolder("parent");
            const childFolder = vault.addFolder("parent/child");
            const configFile = vault.getAbstractFileByPath("parent/project.md");
            if (configFile) {
                parentFolder.children.push(configFile);
            }
            parentFolder.children.push(childFolder);
            childFolder.parent = parentFolder;
            testFile.parent = childFolder;
            // Create manager with recursive search ENABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { searchRecursively: true, configFileEnabled: true }));
            // Should find parent config file
            const result = yield manager.determineTgProject("parent/child/test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("config");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("ParentProject");
        }));
    });
    describe("Detection Method Priority and Independence", () => {
        it("should respect priority: path > metadata > config file", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup all detection methods
            vault.addFile("projects/test.md", "# Test file");
            vault.addFile("projects/project.md", "project: ConfigProject");
            metadataCache.setFileMetadata("projects/test.md", {
                project: "MetadataProject",
            });
            // Create manager with path mapping (highest priority)
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { pathMappings: [
                    {
                        pathPattern: "projects/",
                        projectName: "PathProject",
                        enabled: true,
                    },
                ], metadataConfigEnabled: true, configFileEnabled: true }));
            const result = yield manager.determineTgProject("projects/test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("path");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("PathProject");
        }));
        it("should fall back to metadata when path mapping is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup all detection methods
            vault.addFile("projects/test.md", "# Test file");
            vault.addFile("projects/project.md", "project: ConfigProject");
            metadataCache.setFileMetadata("projects/test.md", {
                project: "MetadataProject",
            });
            // Create manager with path mapping disabled
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { pathMappings: [
                    {
                        pathPattern: "projects/",
                        projectName: "PathProject",
                        enabled: false, // DISABLED
                    },
                ], metadataConfigEnabled: true, configFileEnabled: true }));
            const result = yield manager.determineTgProject("projects/test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("metadata");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("MetadataProject");
        }));
        it("should fall back to config file when both path and metadata are disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup all detection methods
            const testFile = vault.addFile("projects/test.md", "# Test file");
            vault.addFile("projects/project.md", "project: ConfigProject");
            metadataCache.setFileMetadata("projects/test.md", {
                project: "MetadataProject",
            });
            // Mock folder structure
            const folder = vault.addFolder("projects");
            const configFile = vault.getAbstractFileByPath("projects/project.md");
            if (configFile) {
                folder.children.push(configFile);
                testFile.parent = folder;
            }
            // Create manager with path and metadata disabled
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { pathMappings: [
                    {
                        pathPattern: "projects/",
                        projectName: "PathProject",
                        enabled: false, // DISABLED
                    },
                ], metadataConfigEnabled: false, configFileEnabled: true }));
            const result = yield manager.determineTgProject("projects/test.md");
            expect(result).toBeDefined();
            expect(result === null || result === void 0 ? void 0 : result.type).toBe("config");
            expect(result === null || result === void 0 ? void 0 : result.name).toBe("ConfigProject");
        }));
        it("should return undefined when all detection methods are disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup all detection methods
            vault.addFile("projects/test.md", "# Test file");
            vault.addFile("projects/project.md", "project: ConfigProject");
            metadataCache.setFileMetadata("projects/test.md", {
                project: "MetadataProject",
            });
            // Create manager with ALL detection methods disabled
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { pathMappings: [
                    {
                        pathPattern: "projects/",
                        projectName: "PathProject",
                        enabled: false, // DISABLED
                    },
                ], metadataConfigEnabled: false, configFileEnabled: false }));
            const result = yield manager.determineTgProject("projects/test.md");
            expect(result).toBeUndefined();
        }));
    });
    describe("Enhanced Project Feature Toggle", () => {
        it("should return undefined when enhanced project is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            // Setup test data
            vault.addFile("test.md", "# Test file");
            metadataCache.setFileMetadata("test.md", {
                project: "TestProject",
            });
            // Create manager with enhanced project DISABLED
            const manager = new ProjectConfigManager(Object.assign(Object.assign({}, defaultOptions), { enhancedProjectEnabled: false, metadataConfigEnabled: true }));
            const result = yield manager.determineTgProject("test.md");
            expect(result).toBeUndefined();
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdERldGVjdGlvbkZpeGVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0RGV0ZWN0aW9uRml4ZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sb0NBQW9DLENBQUM7QUFFNUMsc0JBQXNCO0FBQ3RCLE1BQU0sU0FBUztJQUNkLFlBQ1EsSUFBWSxFQUNaLElBQVksRUFDWixTQUE2QixJQUFJO1FBRmpDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFFeEMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0NBRUQ7QUFFRCxNQUFNLFdBQVc7SUFDaEIsWUFDUSxJQUFZLEVBQ1osSUFBWSxFQUNaLFNBQTZCLElBQUksRUFDakMsV0FBd0MsRUFBRTtRQUgxQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFdBQU0sR0FBTixNQUFNLENBQTJCO1FBQ2pDLGFBQVEsR0FBUixRQUFRLENBQWtDO0lBQy9DLENBQUM7Q0FDSjtBQUVELE1BQU0sU0FBUztJQUFmO1FBQ1MsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFxQixDQUFDO1FBQ3JDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFzQmxELENBQUM7SUFwQkEsT0FBTyxDQUFDLElBQVksRUFBRSxPQUFlO1FBQ3BDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMs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QUFZLEVBQUU7b0JBQ2I7d0JBQ0MsV0FBVyxFQUFFLFdBQVc7d0JBQ3hCLFdBQVcsRUFBRSxhQUFhO3dCQUMxQixPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVc7cUJBQzNCO2lCQUNELEVBQ0QscUJBQXFCLEVBQUUsS0FBSyxFQUM1QixpQkFBaUIsRUFBRSxLQUFLLElBQ3ZCLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELEVBQUUsQ0FBQywyREFBMkQsRUFBRSxHQUFTLEVBQUU7WUFDMUUsa0JBQWtCO1lBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3hDLGFBQWEsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFO2dCQUN4QyxPQUFPLEVBQUUsYUFBYTthQUN0QixDQUFDLENBQUM7WUFFSCxnREFBZ0Q7WUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsaUNBQ3BDLGNBQWMsS0FDakIsc0JBQXNCLEVBQUUsS0FBSyxFQUM3QixxQkFBcUIsRUFBRSxJQUFJLElBQzFCLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzRCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGVzdHMgZm9yIFByb2plY3QgRGV0ZWN0aW9uIEZpeGVzXHJcbiAqXHJcbiAqIFRoaXMgdGVzdCBmaWxlIHZlcmlmaWVzIHRoYXQgdGhlIGZpeGVzIGZvciBwcm9qZWN0IGRldGVjdGlvbiBpc3N1ZXMgd29yayBjb3JyZWN0bHk6XHJcbiAqIDEuIE1ldGFkYXRhIGRldGVjdGlvbiBjYW4gYmUgcHJvcGVybHkgZW5hYmxlZC9kaXNhYmxlZFxyXG4gKiAyLiBDb25maWcgZmlsZSBkZXRlY3Rpb24gY2FuIGJlIHByb3Blcmx5IGVuYWJsZWQvZGlzYWJsZWRcclxuICogMy4gU2VhcmNoIHJlY3Vyc2l2ZWx5IHNldHRpbmcgd29ya3MgY29ycmVjdGx5XHJcbiAqIDQuIEVhY2ggZGV0ZWN0aW9uIG1ldGhvZCByZXNwZWN0cyBpdHMgZW5hYmxlZCBzdGF0ZVxyXG4gKi9cclxuXHJcbmltcG9ydCB7XHJcblx0UHJvamVjdENvbmZpZ01hbmFnZXIsXHJcblx0UHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zLFxyXG59IGZyb20gXCIuLi9tYW5hZ2Vycy9wcm9qZWN0LWNvbmZpZy1tYW5hZ2VyXCI7XHJcblxyXG4vLyBNb2NrIE9ic2lkaWFuIHR5cGVzXHJcbmNsYXNzIE1vY2tURmlsZSB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgcGF0aDogc3RyaW5nLFxyXG5cdFx0cHVibGljIG5hbWU6IHN0cmluZyxcclxuXHRcdHB1YmxpYyBwYXJlbnQ6IE1vY2tURm9sZGVyIHwgbnVsbCA9IG51bGxcclxuXHQpIHtcclxuXHRcdHRoaXMuc3RhdCA9IHsgbXRpbWU6IERhdGUubm93KCkgfTtcclxuXHR9XHJcblx0c3RhdDogeyBtdGltZTogbnVtYmVyIH07XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tURm9sZGVyIHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHB1YmxpYyBwYXRoOiBzdHJpbmcsXHJcblx0XHRwdWJsaWMgbmFtZTogc3RyaW5nLFxyXG5cdFx0cHVibGljIHBhcmVudDogTW9ja1RGb2xkZXIgfCBudWxsID0gbnVsbCxcclxuXHRcdHB1YmxpYyBjaGlsZHJlbjogKE1vY2tURmlsZSB8IE1vY2tURm9sZGVyKVtdID0gW11cclxuXHQpIHt9XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tWYXVsdCB7XHJcblx0cHJpdmF0ZSBmaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBNb2NrVEZpbGU+KCk7XHJcblx0cHJpdmF0ZSBmaWxlQ29udGVudHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xyXG5cclxuXHRhZGRGaWxlKHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogTW9ja1RGaWxlIHtcclxuXHRcdGNvbnN0IGZpbGVOYW1lID0gcGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgXCJcIjtcclxuXHRcdGNvbnN0IGZpbGUgPSBuZXcgTW9ja1RGaWxlKHBhdGgsIGZpbGVOYW1lKTtcclxuXHRcdHRoaXMuZmlsZXMuc2V0KHBhdGgsIGZpbGUpO1xyXG5cdFx0dGhpcy5maWxlQ29udGVudHMuc2V0KHBhdGgsIGNvbnRlbnQpO1xyXG5cdFx0cmV0dXJuIGZpbGU7XHJcblx0fVxyXG5cclxuXHRhZGRGb2xkZXIocGF0aDogc3RyaW5nKTogTW9ja1RGb2xkZXIge1xyXG5cdFx0Y29uc3QgZm9sZGVyTmFtZSA9IHBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IFwiXCI7XHJcblx0XHRyZXR1cm4gbmV3IE1vY2tURm9sZGVyKHBhdGgsIGZvbGRlck5hbWUpO1xyXG5cdH1cclxuXHJcblx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGg6IHN0cmluZyk6IE1vY2tURmlsZSB8IG51bGwge1xyXG5cdFx0cmV0dXJuIHRoaXMuZmlsZXMuZ2V0KHBhdGgpIHx8IG51bGw7XHJcblx0fVxyXG5cclxuXHRhc3luYyByZWFkKGZpbGU6IE1vY2tURmlsZSk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRyZXR1cm4gdGhpcy5maWxlQ29udGVudHMuZ2V0KGZpbGUucGF0aCkgfHwgXCJcIjtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tNZXRhZGF0YUNhY2hlIHtcclxuXHRwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcclxuXHJcblx0c2V0RmlsZU1ldGFkYXRhKHBhdGg6IHN0cmluZywgbWV0YWRhdGE6IGFueSk6IHZvaWQge1xyXG5cdFx0dGhpcy5jYWNoZS5zZXQocGF0aCwgeyBmcm9udG1hdHRlcjogbWV0YWRhdGEgfSk7XHJcblx0fVxyXG5cclxuXHRnZXRGaWxlQ2FjaGUoZmlsZTogTW9ja1RGaWxlKTogYW55IHtcclxuXHRcdHJldHVybiB0aGlzLmNhY2hlLmdldChmaWxlLnBhdGgpO1xyXG5cdH1cclxufVxyXG5cclxuZGVzY3JpYmUoXCJQcm9qZWN0IERldGVjdGlvbiBGaXhlc1wiLCAoKSA9PiB7XHJcblx0bGV0IHZhdWx0OiBNb2NrVmF1bHQ7XHJcblx0bGV0IG1ldGFkYXRhQ2FjaGU6IE1vY2tNZXRhZGF0YUNhY2hlO1xyXG5cdGxldCBkZWZhdWx0T3B0aW9uczogUHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdHZhdWx0ID0gbmV3IE1vY2tWYXVsdCgpO1xyXG5cdFx0bWV0YWRhdGFDYWNoZSA9IG5ldyBNb2NrTWV0YWRhdGFDYWNoZSgpO1xyXG5cclxuXHRcdGRlZmF1bHRPcHRpb25zID0ge1xyXG5cdFx0XHR2YXVsdDogdmF1bHQgYXMgYW55LFxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlOiBtZXRhZGF0YUNhY2hlIGFzIGFueSxcclxuXHRcdFx0Y29uZmlnRmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogZmFsc2UsXHJcblx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0fSxcclxuXHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0fTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJNZXRhZGF0YSBEZXRlY3Rpb24gRW5hYmxlL0Rpc2FibGVcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgTk9UIGRldGVjdCBwcm9qZWN0IGZyb20gZnJvbnRtYXR0ZXIgd2hlbiBtZXRhZGF0YSBkZXRlY3Rpb24gaXMgZGlzYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCB0ZXN0IGZpbGUgd2l0aCBmcm9udG1hdHRlclxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3ROYW1lOiBcIk15UHJvamVjdFwiLCAvLyBOb3RlOiB1c2luZyBwcm9qZWN0TmFtZSBpbnN0ZWFkIG9mIHByb2plY3RcclxuXHRcdFx0XHRwcmlvcml0eTogNSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgbWFuYWdlciB3aXRoIG1ldGFkYXRhIGRldGVjdGlvbiBESVNBQkxFRFxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0TmFtZVwiLCAvLyBTZXQgY29ycmVjdCBtZXRhZGF0YSBrZXlcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBOT1QgZGV0ZWN0IHByb2plY3QgZnJvbSBtZXRhZGF0YSB3aGVuIGRpc2FibGVkXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFwidGVzdC5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZGV0ZWN0IHByb2plY3QgZnJvbSBmcm9udG1hdHRlciB3aGVuIG1ldGFkYXRhIGRldGVjdGlvbiBpcyBlbmFibGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0dXAgdGVzdCBmaWxlIHdpdGggZnJvbnRtYXR0ZXJcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInRlc3QubWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJ0ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0TmFtZTogXCJNeVByb2plY3RcIixcclxuXHRcdFx0XHRwcmlvcml0eTogNSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgbWFuYWdlciB3aXRoIG1ldGFkYXRhIGRldGVjdGlvbiBFTkFCTEVEXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3ROYW1lXCIsIC8vIFNldCBjb3JyZWN0IG1ldGFkYXRhIGtleVxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSwgLy8gRU5BQkxFRFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBkZXRlY3QgcHJvamVjdCBmcm9tIG1ldGFkYXRhIHdoZW4gZW5hYmxlZFxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcInRlc3QubWRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LnR5cGUpLnRvQmUoXCJtZXRhZGF0YVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8ubmFtZSkudG9CZShcIk15UHJvamVjdFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8uc291cmNlKS50b0JlKFwicHJvamVjdE5hbWVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXNwZWN0IGRpZmZlcmVudCBtZXRhZGF0YSBrZXlzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0dXAgdGVzdCBmaWxlIHdpdGggY3VzdG9tIG1ldGFkYXRhIGtleVxyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwidGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInRlc3QubWRcIiwge1xyXG5cdFx0XHRcdGN1c3RvbVByb2plY3Q6IFwiQ3VzdG9tUHJvamVjdFwiLFxyXG5cdFx0XHRcdHByb2plY3Q6IFwiRGVmYXVsdFByb2plY3RcIiwgLy8gVGhpcyBzaG91bGQgYmUgaWdub3JlZFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggY3VzdG9tIG1ldGFkYXRhIGtleVxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJjdXN0b21Qcm9qZWN0XCIsXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFwidGVzdC5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8ubmFtZSkudG9CZShcIkN1c3RvbVByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LnNvdXJjZSkudG9CZShcImN1c3RvbVByb2plY3RcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWcgRmlsZSBEZXRlY3Rpb24gRW5hYmxlL0Rpc2FibGVcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgTk9UIGRldGVjdCBwcm9qZWN0IGZyb20gY29uZmlnIGZpbGUgd2hlbiBjb25maWcgZmlsZSBkZXRlY3Rpb24gaXMgZGlzYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCB0ZXN0IGZpbGUgYW5kIGNvbmZpZyBmaWxlXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJmb2xkZXIvdGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFxyXG5cdFx0XHRcdFwiZm9sZGVyL3Byb2plY3QubWRcIixcclxuXHRcdFx0XHRcInByb2plY3Q6IENvbmZpZ1Byb2plY3RcXG5kZXNjcmlwdGlvbjogVGVzdCBwcm9qZWN0XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggY29uZmlnIGZpbGUgZGV0ZWN0aW9uIERJU0FCTEVEXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdGNvbmZpZ0ZpbGVFbmFibGVkOiBmYWxzZSwgLy8gRElTQUJMRURcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgTk9UIGRldGVjdCBwcm9qZWN0IGZyb20gY29uZmlnIGZpbGUgd2hlbiBkaXNhYmxlZFxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcImZvbGRlci90ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBkZXRlY3QgcHJvamVjdCBmcm9tIGNvbmZpZyBmaWxlIHdoZW4gY29uZmlnIGZpbGUgZGV0ZWN0aW9uIGlzIGVuYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCB0ZXN0IGZpbGUgYW5kIGNvbmZpZyBmaWxlXHJcblx0XHRcdGNvbnN0IHRlc3RGaWxlID0gdmF1bHQuYWRkRmlsZShcImZvbGRlci90ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXHJcblx0XHRcdFx0XCJmb2xkZXIvcHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFwicHJvamVjdDogQ29uZmlnUHJvamVjdFxcbmRlc2NyaXB0aW9uOiBUZXN0IHByb2plY3RcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gTW9jayBmb2xkZXIgc3RydWN0dXJlXHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IHZhdWx0LmFkZEZvbGRlcihcImZvbGRlclwiKTtcclxuXHRcdFx0Y29uc3QgY29uZmlnRmlsZSA9IHZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcImZvbGRlci9wcm9qZWN0Lm1kXCIpO1xyXG5cdFx0XHRpZiAoY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdGZvbGRlci5jaGlsZHJlbi5wdXNoKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHRcdHRlc3RGaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbmFnZXIgd2l0aCBjb25maWcgZmlsZSBkZXRlY3Rpb24gRU5BQkxFRFxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSwgLy8gRU5BQkxFRFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBkZXRlY3QgcHJvamVjdCBmcm9tIGNvbmZpZyBmaWxlIHdoZW4gZW5hYmxlZFxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcImZvbGRlci90ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5uYW1lKS50b0JlKFwiQ29uZmlnUHJvamVjdFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8uc291cmNlKS50b0JlKFwicHJvamVjdC5tZFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlNlYXJjaCBSZWN1cnNpdmVseSBTZXR0aW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIE5PVCBzZWFyY2ggcGFyZW50IGRpcmVjdG9yaWVzIHdoZW4gc2VhcmNoUmVjdXJzaXZlbHkgaXMgZmFsc2VcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCBuZXN0ZWQgc3RydWN0dXJlIHdpdGggY29uZmlnIGZpbGUgaW4gcGFyZW50XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwYXJlbnQvcHJvamVjdC5tZFwiLCBcInByb2plY3Q6IFBhcmVudFByb2plY3RcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwYXJlbnQvY2hpbGQvdGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbmFnZXIgd2l0aCByZWN1cnNpdmUgc2VhcmNoIERJU0FCTEVEXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiBmYWxzZSwgLy8gRElTQUJMRURcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgTk9UIGZpbmQgcGFyZW50IGNvbmZpZyBmaWxlXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwicGFyZW50L2NoaWxkL3Rlc3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBzZWFyY2ggcGFyZW50IGRpcmVjdG9yaWVzIHdoZW4gc2VhcmNoUmVjdXJzaXZlbHkgaXMgdHJ1ZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIFNldHVwIG5lc3RlZCBzdHJ1Y3R1cmUgd2l0aCBjb25maWcgZmlsZSBpbiBwYXJlbnRcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInBhcmVudC9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogUGFyZW50UHJvamVjdFwiKTtcclxuXHRcdFx0Y29uc3QgdGVzdEZpbGUgPSB2YXVsdC5hZGRGaWxlKFxyXG5cdFx0XHRcdFwicGFyZW50L2NoaWxkL3Rlc3QubWRcIixcclxuXHRcdFx0XHRcIiMgVGVzdCBmaWxlXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBwYXJlbnRGb2xkZXIgPSB2YXVsdC5hZGRGb2xkZXIoXCJwYXJlbnRcIik7XHJcblx0XHRcdGNvbnN0IGNoaWxkRm9sZGVyID0gdmF1bHQuYWRkRm9sZGVyKFwicGFyZW50L2NoaWxkXCIpO1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gdmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwicGFyZW50L3Byb2plY3QubWRcIik7XHJcblxyXG5cdFx0XHRpZiAoY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdHBhcmVudEZvbGRlci5jaGlsZHJlbi5wdXNoKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHBhcmVudEZvbGRlci5jaGlsZHJlbi5wdXNoKGNoaWxkRm9sZGVyKTtcclxuXHRcdFx0Y2hpbGRGb2xkZXIucGFyZW50ID0gcGFyZW50Rm9sZGVyO1xyXG5cdFx0XHR0ZXN0RmlsZS5wYXJlbnQgPSBjaGlsZEZvbGRlcjtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggcmVjdXJzaXZlIHNlYXJjaCBFTkFCTEVEXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiB0cnVlLCAvLyBFTkFCTEVEXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGZpbmQgcGFyZW50IGNvbmZpZyBmaWxlXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbmFnZXIuZGV0ZXJtaW5lVGdQcm9qZWN0KFxyXG5cdFx0XHRcdFwicGFyZW50L2NoaWxkL3Rlc3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5uYW1lKS50b0JlKFwiUGFyZW50UHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRldGVjdGlvbiBNZXRob2QgUHJpb3JpdHkgYW5kIEluZGVwZW5kZW5jZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCByZXNwZWN0IHByaW9yaXR5OiBwYXRoID4gbWV0YWRhdGEgPiBjb25maWcgZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIFNldHVwIGFsbCBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwicHJvamVjdHMvdGVzdC5tZFwiLCBcIiMgVGVzdCBmaWxlXCIpO1xyXG5cdFx0XHR2YXVsdC5hZGRGaWxlKFwicHJvamVjdHMvcHJvamVjdC5tZFwiLCBcInByb2plY3Q6IENvbmZpZ1Byb2plY3RcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwicHJvamVjdHMvdGVzdC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNZXRhZGF0YVByb2plY3RcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgbWFuYWdlciB3aXRoIHBhdGggbWFwcGluZyAoaGlnaGVzdCBwcmlvcml0eSlcclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBQcm9qZWN0Q29uZmlnTWFuYWdlcih7XHJcblx0XHRcdFx0Li4uZGVmYXVsdE9wdGlvbnMsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcInByb2plY3RzL1wiLFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBtYW5hZ2VyLmRldGVybWluZVRnUHJvamVjdChcInByb2plY3RzL3Rlc3QubWRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LnR5cGUpLnRvQmUoXCJwYXRoXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5uYW1lKS50b0JlKFwiUGF0aFByb2plY3RcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsIGJhY2sgdG8gbWV0YWRhdGEgd2hlbiBwYXRoIG1hcHBpbmcgaXMgZGlzYWJsZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBTZXR1cCBhbGwgZGV0ZWN0aW9uIG1ldGhvZHNcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInByb2plY3RzL3Rlc3QubWRcIiwgXCIjIFRlc3QgZmlsZVwiKTtcclxuXHRcdFx0dmF1bHQuYWRkRmlsZShcInByb2plY3RzL3Byb2plY3QubWRcIiwgXCJwcm9qZWN0OiBDb25maWdQcm9qZWN0XCIpO1xyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLnNldEZpbGVNZXRhZGF0YShcInByb2plY3RzL3Rlc3QubWRcIiwge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiTWV0YWRhdGFQcm9qZWN0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbmFnZXIgd2l0aCBwYXRoIG1hcHBpbmcgZGlzYWJsZWRcclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBQcm9qZWN0Q29uZmlnTWFuYWdlcih7XHJcblx0XHRcdFx0Li4uZGVmYXVsdE9wdGlvbnMsXHJcblx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHBhdGhQYXR0ZXJuOiBcInByb2plY3RzL1wiLFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogXCJQYXRoUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSwgLy8gRElTQUJMRURcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJwcm9qZWN0cy90ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py50eXBlKS50b0JlKFwibWV0YWRhdGFcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/Lm5hbWUpLnRvQmUoXCJNZXRhZGF0YVByb2plY3RcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsIGJhY2sgdG8gY29uZmlnIGZpbGUgd2hlbiBib3RoIHBhdGggYW5kIG1ldGFkYXRhIGFyZSBkaXNhYmxlZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIFNldHVwIGFsbCBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdFx0XHRjb25zdCB0ZXN0RmlsZSA9IHZhdWx0LmFkZEZpbGUoXCJwcm9qZWN0cy90ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogQ29uZmlnUHJvamVjdFwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJwcm9qZWN0cy90ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIk1ldGFkYXRhUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZm9sZGVyIHN0cnVjdHVyZVxyXG5cdFx0XHRjb25zdCBmb2xkZXIgPSB2YXVsdC5hZGRGb2xkZXIoXCJwcm9qZWN0c1wiKTtcclxuXHRcdFx0Y29uc3QgY29uZmlnRmlsZSA9IHZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcclxuXHRcdFx0XHRcInByb2plY3RzL3Byb2plY3QubWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdGZvbGRlci5jaGlsZHJlbi5wdXNoKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHRcdHRlc3RGaWxlLnBhcmVudCA9IGZvbGRlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG1hbmFnZXIgd2l0aCBwYXRoIGFuZCBtZXRhZGF0YSBkaXNhYmxlZFxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0cGF0aFBhdHRlcm46IFwicHJvamVjdHMvXCIsXHJcblx0XHRcdFx0XHRcdHByb2plY3ROYW1lOiBcIlBhdGhQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLCAvLyBESVNBQkxFRFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogZmFsc2UsIC8vIERJU0FCTEVEXHJcblx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJwcm9qZWN0cy90ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5uYW1lKS50b0JlKFwiQ29uZmlnUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiB1bmRlZmluZWQgd2hlbiBhbGwgZGV0ZWN0aW9uIG1ldGhvZHMgYXJlIGRpc2FibGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0dXAgYWxsIGRldGVjdGlvbiBtZXRob2RzXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwcm9qZWN0cy90ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJwcm9qZWN0cy9wcm9qZWN0Lm1kXCIsIFwicHJvamVjdDogQ29uZmlnUHJvamVjdFwiKTtcclxuXHRcdFx0bWV0YWRhdGFDYWNoZS5zZXRGaWxlTWV0YWRhdGEoXCJwcm9qZWN0cy90ZXN0Lm1kXCIsIHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIk1ldGFkYXRhUHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggQUxMIGRldGVjdGlvbiBtZXRob2RzIGRpc2FibGVkXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgUHJvamVjdENvbmZpZ01hbmFnZXIoe1xyXG5cdFx0XHRcdC4uLmRlZmF1bHRPcHRpb25zLFxyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJwcm9qZWN0cy9cIixcclxuXHRcdFx0XHRcdFx0cHJvamVjdE5hbWU6IFwiUGF0aFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsIC8vIERJU0FCTEVEXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOiBmYWxzZSwgLy8gRElTQUJMRURcclxuXHRcdFx0XHRjb25maWdGaWxlRW5hYmxlZDogZmFsc2UsIC8vIERJU0FCTEVEXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJwcm9qZWN0cy90ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFbmhhbmNlZCBQcm9qZWN0IEZlYXR1cmUgVG9nZ2xlXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiB1bmRlZmluZWQgd2hlbiBlbmhhbmNlZCBwcm9qZWN0IGlzIGRpc2FibGVkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0dXAgdGVzdCBkYXRhXHJcblx0XHRcdHZhdWx0LmFkZEZpbGUoXCJ0ZXN0Lm1kXCIsIFwiIyBUZXN0IGZpbGVcIik7XHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUuc2V0RmlsZU1ldGFkYXRhKFwidGVzdC5tZFwiLCB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJUZXN0UHJvamVjdFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGggZW5oYW5jZWQgcHJvamVjdCBESVNBQkxFRFxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0XHQuLi5kZWZhdWx0T3B0aW9ucyxcclxuXHRcdFx0XHRlbmhhbmNlZFByb2plY3RFbmFibGVkOiBmYWxzZSwgLy8gRElTQUJMRURcclxuXHRcdFx0XHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5kZXRlcm1pbmVUZ1Byb2plY3QoXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==