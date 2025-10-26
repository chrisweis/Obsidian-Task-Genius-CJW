/**
 * Priority User Scenario Test
 *
 * This test simulates the exact scenario reported by the user:
 * 1. First load: priority appears correct initially
 * 2. Second load: data is completely lost (not just priority)
 * 3. Third load: data returns but ALL priorities show as 3 (regardless of actual emoji)
 */
import { __awaiter } from "tslib";
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { Augmentor } from "../dataflow/augment/Augmentor";
import { createDefaultParserConfig } from "../types/TaskParserConfig";
// Mock classes for testing
class MockApp {
    constructor() {
        this.vault = new MockVault();
        this.metadataCache = new MockMetadataCache();
        this.workspace = { editorSuggest: { suggests: [] } };
    }
}
class MockVault {
    constructor() {
        this.files = new Map();
        this.adapter = {
            stat(path) {
                return __awaiter(this, void 0, void 0, function* () {
                    const file = this.files.get(path);
                    return file ? { mtime: file.mtime || Date.now() } : null;
                });
            }
        };
    }
    getMarkdownFiles() {
        return Array.from(this.files.values()).filter(f => f.extension === 'md');
    }
    getFiles() {
        return Array.from(this.files.values());
    }
    getAbstractFileByPath(path) {
        return this.files.get(path);
    }
    cachedRead(file) {
        return __awaiter(this, void 0, void 0, function* () {
            return file.content || "";
        });
    }
    addFile(path, content, mtime) {
        this.files.set(path, {
            path,
            content,
            extension: path.split('.').pop() || '',
            mtime: mtime || Date.now()
        });
    }
}
class MockMetadataCache {
    constructor() {
        this.metadata = new Map();
    }
    getFileCache(file) {
        return this.metadata.get(file.path) || { frontmatter: {} };
    }
    setMetadata(path, meta) {
        this.metadata.set(path, { frontmatter: meta });
    }
}
class MockPlugin {
    constructor() {
        this.settings = {
            customDateFormats: [],
            statusMapping: {},
            emojiMapping: {
                "🔺": "priority",
                "⏫": "priority",
                "🔼": "priority",
                "🔽": "priority",
                "⏬": "priority"
            },
            specialTagPrefixes: {},
            fileMetadataInheritance: {
                enabled: true,
                inheritFromFrontmatter: true,
                inheritFromFrontmatterForSubtasks: false
            },
            projectConfig: {
                enableEnhancedProject: false
            },
            fileSourceConfig: {
                enabled: false
            }
        };
    }
    getIcsManager() {
        return null;
    }
}
describe("Priority User Scenario Test", () => {
    let mockApp;
    let mockPlugin;
    let parser;
    let augmentor;
    beforeEach(() => {
        mockApp = new MockApp();
        mockPlugin = new MockPlugin();
        const config = createDefaultParserConfig();
        parser = new MarkdownTaskParser(config);
        augmentor = new Augmentor();
    });
    test("should simulate exact user scenario: multiple tasks with different priorities", () => __awaiter(void 0, void 0, void 0, function* () {
        // Prepare test data with multiple tasks having different priority emojis
        const testContent = `# Test Tasks

- [ ] Highest priority task 🔺
- [ ] High priority task ⏫  
- [ ] Medium priority task 🔼
- [ ] Low priority task 🔽
- [ ] Lowest priority task ⏬
- [ ] No priority task`;
        const expectedPriorities = [
            { emoji: "🔺", expected: 5, name: "Highest" },
            { emoji: "⏫", expected: 4, name: "High" },
            { emoji: "🔼", expected: 3, name: "Medium" },
            { emoji: "🔽", expected: 2, name: "Low" },
            { emoji: "⏬", expected: 1, name: "Lowest" },
            { emoji: "", expected: undefined, name: "No priority" }
        ];
        console.log("\n=== User Scenario Simulation ===");
        // FIRST LOAD - Should work correctly
        console.log("\n--- FIRST LOAD ---");
        const firstLoadTasks = parser.parseLegacy(testContent, "test.md");
        const firstAugmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, firstLoadTasks);
        console.log("First load results:");
        firstAugmented.forEach((task, index) => {
            console.log(`  ${expectedPriorities[index].name}: ${task.metadata.priority} (expected: ${expectedPriorities[index].expected})`);
            expect(task.metadata.priority).toBe(expectedPriorities[index].expected);
        });
        // SECOND LOAD - Simulate cache miss/corruption where data might be lost
        console.log("\n--- SECOND LOAD (simulating cache issues) ---");
        // In the real scenario, this would be a cache miss, but the user reports
        // data is "completely lost". Let's simulate re-parsing the same content
        const secondLoadTasks = parser.parseLegacy(testContent, "test.md");
        const secondAugmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, secondLoadTasks);
        console.log("Second load results:");
        secondAugmented.forEach((task, index) => {
            console.log(`  ${expectedPriorities[index].name}: ${task.metadata.priority} (expected: ${expectedPriorities[index].expected})`);
            expect(task.metadata.priority).toBe(expectedPriorities[index].expected);
        });
        // THIRD LOAD - This is where the bug used to manifest (all priorities = 3)
        console.log("\n--- THIRD LOAD (testing for priority=3 bug) ---");
        // Simulate another reload cycle
        const thirdLoadTasks = parser.parseLegacy(testContent, "test.md");
        const thirdAugmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, thirdLoadTasks);
        console.log("Third load results:");
        let allPrioritiesAre3 = true;
        thirdAugmented.forEach((task, index) => {
            console.log(`  ${expectedPriorities[index].name}: ${task.metadata.priority} (expected: ${expectedPriorities[index].expected})`);
            expect(task.metadata.priority).toBe(expectedPriorities[index].expected);
            // Check if the bug manifests (all priorities become 3)
            if (task.metadata.priority !== 3 && task.metadata.priority !== undefined) {
                allPrioritiesAre3 = false;
            }
        });
        // Ensure the bug doesn't manifest (not all priorities should be 3)
        expect(allPrioritiesAre3).toBe(false);
        console.log("✓ Bug NOT reproduced - priorities correctly preserved!");
    }));
    test("should handle cached task data correctly through serialization cycles", () => __awaiter(void 0, void 0, void 0, function* () {
        const content = "- [ ] Important task 🔺";
        console.log("\n=== Serialization Cycle Test ===");
        // Initial parse
        const initialTasks = parser.parseLegacy(content, "test.md");
        const initialAugmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, initialTasks);
        expect(initialAugmented[0].metadata.priority).toBe(5);
        console.log("Initial priority:", initialAugmented[0].metadata.priority);
        // Simulate multiple cache storage/retrieval cycles (JSON serialization)
        let currentTask = initialAugmented[0];
        for (let cycle = 1; cycle <= 5; cycle++) {
            console.log(`\nCache cycle ${cycle}:`);
            // Simulate storage (JSON serialization)
            const serialized = JSON.stringify(currentTask);
            const deserialized = JSON.parse(serialized);
            console.log(`  After serialization: ${deserialized.metadata.priority}`);
            expect(deserialized.metadata.priority).toBe(5);
            // Simulate re-augmentation after cache load
            const reAugmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, [deserialized]);
            console.log(`  After re-augmentation: ${reAugmented[0].metadata.priority}`);
            expect(reAugmented[0].metadata.priority).toBe(5);
            currentTask = reAugmented[0];
        }
        console.log("✓ Priority preserved through all serialization cycles!");
    }));
    test("should not apply default priority=3 when no priority exists", () => __awaiter(void 0, void 0, void 0, function* () {
        const content = "- [ ] Task with no priority";
        console.log("\n=== Default Priority Test ===");
        for (let cycle = 1; cycle <= 3; cycle++) {
            console.log(`\nCycle ${cycle}:`);
            const tasks = parser.parseLegacy(content, "test.md");
            const augmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, tasks);
            console.log(`  Priority: ${augmented[0].metadata.priority}`);
            expect(augmented[0].metadata.priority).toBeUndefined();
            expect(augmented[0].metadata.priority).not.toBe(3); // Should NOT default to 3
        }
        console.log("✓ No default priority applied!");
    }));
    test("should preserve emoji priorities correctly after mixed operations", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("\n=== Mixed Operations Test ===");
        const testCases = [
            { content: "- [ ] Task A 🔺", expectedPriority: 5 },
            { content: "- [ ] Task B ⏫", expectedPriority: 4 },
            { content: "- [ ] Task C 🔼", expectedPriority: 3 },
            { content: "- [ ] Task D 🔽", expectedPriority: 2 },
            { content: "- [ ] Task E ⏬", expectedPriority: 1 }
        ];
        // Process all tasks multiple times with different contexts
        for (let iteration = 1; iteration <= 3; iteration++) {
            console.log(`\nIteration ${iteration}:`);
            for (const testCase of testCases) {
                const tasks = parser.parseLegacy(testCase.content, "test.md");
                const augmented = augmentor.mergeCompat({ filePath: "test.md", fileMeta: {}, project: null }, tasks);
                console.log(`  ${testCase.content} -> priority: ${augmented[0].metadata.priority}`);
                expect(augmented[0].metadata.priority).toBe(testCase.expectedPriority);
            }
        }
        console.log("✓ All emoji priorities preserved across iterations!");
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHktdXNlci1zY2VuYXJpby50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJpb3JpdHktdXNlci1zY2VuYXJpby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7O0dBT0c7O0FBR0gsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3RFLDJCQUEyQjtBQUMzQixNQUFNLE9BQU87SUFLWDtRQUNFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsYUFBYSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDdkQsQ0FBQztDQUNGO0FBRUQsTUFBTSxTQUFTO0lBQWY7UUFDVSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQWtCdkMsWUFBTyxHQUFHO1lBQ0YsSUFBSSxDQUFDLElBQVk7O29CQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbEMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDM0QsQ0FBQzthQUFBO1NBQ0YsQ0FBQztJQVVKLENBQUM7SUEvQkMsZ0JBQWdCO1FBQ2QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FB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QUU7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFFekMsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7Z0JBQ2hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FDckMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUNwRCxLQUFLLENBQ04sQ0FBQztnQkFFRixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLE9BQU8saUJBQWlCLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDcEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3hFO1NBQ0Y7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByaW9yaXR5IFVzZXIgU2NlbmFyaW8gVGVzdFxyXG4gKiBcclxuICogVGhpcyB0ZXN0IHNpbXVsYXRlcyB0aGUgZXhhY3Qgc2NlbmFyaW8gcmVwb3J0ZWQgYnkgdGhlIHVzZXI6XHJcbiAqIDEuIEZpcnN0IGxvYWQ6IHByaW9yaXR5IGFwcGVhcnMgY29ycmVjdCBpbml0aWFsbHlcclxuICogMi4gU2Vjb25kIGxvYWQ6IGRhdGEgaXMgY29tcGxldGVseSBsb3N0IChub3QganVzdCBwcmlvcml0eSkgXHJcbiAqIDMuIFRoaXJkIGxvYWQ6IGRhdGEgcmV0dXJucyBidXQgQUxMIHByaW9yaXRpZXMgc2hvdyBhcyAzIChyZWdhcmRsZXNzIG9mIGFjdHVhbCBlbW9qaSlcclxuICovXHJcblxyXG5pbXBvcnQgeyBEYXRhZmxvd09yY2hlc3RyYXRvciB9IGZyb20gXCIuLi9kYXRhZmxvdy9PcmNoZXN0cmF0b3JcIjtcclxuaW1wb3J0IHsgTWFya2Rvd25UYXNrUGFyc2VyIH0gZnJvbSBcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQgeyBBdWdtZW50b3IgfSBmcm9tIFwiLi4vZGF0YWZsb3cvYXVnbWVudC9BdWdtZW50b3JcIjtcclxuaW1wb3J0IHsgY3JlYXRlRGVmYXVsdFBhcnNlckNvbmZpZyB9IGZyb20gXCIuLi90eXBlcy9UYXNrUGFyc2VyQ29uZmlnXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuLy8gTW9jayBjbGFzc2VzIGZvciB0ZXN0aW5nXHJcbmNsYXNzIE1vY2tBcHAge1xyXG4gIHZhdWx0OiBhbnk7XHJcbiAgbWV0YWRhdGFDYWNoZTogYW55O1xyXG4gIHdvcmtzcGFjZTogYW55O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMudmF1bHQgPSBuZXcgTW9ja1ZhdWx0KCk7XHJcbiAgICB0aGlzLm1ldGFkYXRhQ2FjaGUgPSBuZXcgTW9ja01ldGFkYXRhQ2FjaGUoKTtcclxuICAgIHRoaXMud29ya3NwYWNlID0geyBlZGl0b3JTdWdnZXN0OiB7IHN1Z2dlc3RzOiBbXSB9IH07XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBNb2NrVmF1bHQge1xyXG4gIHByaXZhdGUgZmlsZXMgPSBuZXcgTWFwPHN0cmluZywgYW55PigpO1xyXG4gIFxyXG4gIGdldE1hcmtkb3duRmlsZXMoKSB7XHJcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmZpbGVzLnZhbHVlcygpKS5maWx0ZXIoZiA9PiBmLmV4dGVuc2lvbiA9PT0gJ21kJyk7XHJcbiAgfVxyXG4gIFxyXG4gIGdldEZpbGVzKCkge1xyXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5maWxlcy52YWx1ZXMoKSk7XHJcbiAgfVxyXG4gIFxyXG4gIGdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiB0aGlzLmZpbGVzLmdldChwYXRoKTtcclxuICB9XHJcbiAgXHJcbiAgYXN5bmMgY2FjaGVkUmVhZChmaWxlOiBhbnkpIHtcclxuICAgIHJldHVybiBmaWxlLmNvbnRlbnQgfHwgXCJcIjtcclxuICB9XHJcbiAgXHJcbiAgYWRhcHRlciA9IHtcclxuICAgIGFzeW5jIHN0YXQocGF0aDogc3RyaW5nKSB7XHJcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVzLmdldChwYXRoKTtcclxuICAgICAgcmV0dXJuIGZpbGUgPyB7IG10aW1lOiBmaWxlLm10aW1lIHx8IERhdGUubm93KCkgfSA6IG51bGw7XHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICBhZGRGaWxlKHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBtdGltZT86IG51bWJlcikge1xyXG4gICAgdGhpcy5maWxlcy5zZXQocGF0aCwge1xyXG4gICAgICBwYXRoLFxyXG4gICAgICBjb250ZW50LFxyXG4gICAgICBleHRlbnNpb246IHBhdGguc3BsaXQoJy4nKS5wb3AoKSB8fCAnJyxcclxuICAgICAgbXRpbWU6IG10aW1lIHx8IERhdGUubm93KClcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgTW9ja01ldGFkYXRhQ2FjaGUge1xyXG4gIHByaXZhdGUgbWV0YWRhdGEgPSBuZXcgTWFwPHN0cmluZywgYW55PigpO1xyXG4gIFxyXG4gIGdldEZpbGVDYWNoZShmaWxlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLm1ldGFkYXRhLmdldChmaWxlLnBhdGgpIHx8IHsgZnJvbnRtYXR0ZXI6IHt9IH07XHJcbiAgfVxyXG4gIFxyXG4gIHNldE1ldGFkYXRhKHBhdGg6IHN0cmluZywgbWV0YTogYW55KSB7XHJcbiAgICB0aGlzLm1ldGFkYXRhLnNldChwYXRoLCB7IGZyb250bWF0dGVyOiBtZXRhIH0pO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgTW9ja1BsdWdpbiB7XHJcbiAgc2V0dGluZ3MgPSB7XHJcbiAgICBjdXN0b21EYXRlRm9ybWF0czogW10sXHJcbiAgICBzdGF0dXNNYXBwaW5nOiB7fSxcclxuICAgIGVtb2ppTWFwcGluZzoge1xyXG4gICAgICBcIvCflLpcIjogXCJwcmlvcml0eVwiLFxyXG4gICAgICBcIuKPq1wiOiBcInByaW9yaXR5XCIsIFxyXG4gICAgICBcIvCflLxcIjogXCJwcmlvcml0eVwiLFxyXG4gICAgICBcIvCflL1cIjogXCJwcmlvcml0eVwiLFxyXG4gICAgICBcIuKPrFwiOiBcInByaW9yaXR5XCJcclxuICAgIH0sXHJcbiAgICBzcGVjaWFsVGFnUHJlZml4ZXM6IHt9LFxyXG4gICAgZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHtcclxuICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgaW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSxcclxuICAgICAgaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiBmYWxzZVxyXG4gICAgfSxcclxuICAgIHByb2plY3RDb25maWc6IHtcclxuICAgICAgZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiBmYWxzZVxyXG4gICAgfSxcclxuICAgIGZpbGVTb3VyY2VDb25maWc6IHtcclxuICAgICAgZW5hYmxlZDogZmFsc2VcclxuICAgIH1cclxuICB9O1xyXG4gIFxyXG4gIGdldEljc01hbmFnZXIoKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiUHJpb3JpdHkgVXNlciBTY2VuYXJpbyBUZXN0XCIsICgpID0+IHtcclxuICBsZXQgbW9ja0FwcDogTW9ja0FwcDtcclxuICBsZXQgbW9ja1BsdWdpbjogTW9ja1BsdWdpbjtcclxuICBsZXQgcGFyc2VyOiBNYXJrZG93blRhc2tQYXJzZXI7XHJcbiAgbGV0IGF1Z21lbnRvcjogQXVnbWVudG9yO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIG1vY2tBcHAgPSBuZXcgTW9ja0FwcCgpO1xyXG4gICAgbW9ja1BsdWdpbiA9IG5ldyBNb2NrUGx1Z2luKCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGNvbmZpZyA9IGNyZWF0ZURlZmF1bHRQYXJzZXJDb25maWcoKTtcclxuICAgIHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuICAgIGF1Z21lbnRvciA9IG5ldyBBdWdtZW50b3IoKTtcclxuICB9KTtcclxuXHJcbiAgdGVzdChcInNob3VsZCBzaW11bGF0ZSBleGFjdCB1c2VyIHNjZW5hcmlvOiBtdWx0aXBsZSB0YXNrcyB3aXRoIGRpZmZlcmVudCBwcmlvcml0aWVzXCIsIGFzeW5jICgpID0+IHtcclxuICAgIC8vIFByZXBhcmUgdGVzdCBkYXRhIHdpdGggbXVsdGlwbGUgdGFza3MgaGF2aW5nIGRpZmZlcmVudCBwcmlvcml0eSBlbW9qaXNcclxuICAgIGNvbnN0IHRlc3RDb250ZW50ID0gYCMgVGVzdCBUYXNrc1xyXG5cclxuLSBbIF0gSGlnaGVzdCBwcmlvcml0eSB0YXNrIPCflLpcclxuLSBbIF0gSGlnaCBwcmlvcml0eSB0YXNrIOKPqyAgXHJcbi0gWyBdIE1lZGl1bSBwcmlvcml0eSB0YXNrIPCflLxcclxuLSBbIF0gTG93IHByaW9yaXR5IHRhc2sg8J+UvVxyXG4tIFsgXSBMb3dlc3QgcHJpb3JpdHkgdGFzayDij6xcclxuLSBbIF0gTm8gcHJpb3JpdHkgdGFza2A7XHJcblxyXG4gICAgY29uc3QgZXhwZWN0ZWRQcmlvcml0aWVzID0gW1xyXG4gICAgICB7IGVtb2ppOiBcIvCflLpcIiwgZXhwZWN0ZWQ6IDUsIG5hbWU6IFwiSGlnaGVzdFwiIH0sXHJcbiAgICAgIHsgZW1vamk6IFwi4o+rXCIsIGV4cGVjdGVkOiA0LCBuYW1lOiBcIkhpZ2hcIiB9LFxyXG4gICAgICB7IGVtb2ppOiBcIvCflLxcIiwgZXhwZWN0ZWQ6IDMsIG5hbWU6IFwiTWVkaXVtXCIgfSwgIFxyXG4gICAgICB7IGVtb2ppOiBcIvCflL1cIiwgZXhwZWN0ZWQ6IDIsIG5hbWU6IFwiTG93XCIgfSxcclxuICAgICAgeyBlbW9qaTogXCLij6xcIiwgZXhwZWN0ZWQ6IDEsIG5hbWU6IFwiTG93ZXN0XCIgfSxcclxuICAgICAgeyBlbW9qaTogXCJcIiwgZXhwZWN0ZWQ6IHVuZGVmaW5lZCwgbmFtZTogXCJObyBwcmlvcml0eVwiIH1cclxuICAgIF07XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJcXG49PT0gVXNlciBTY2VuYXJpbyBTaW11bGF0aW9uID09PVwiKTtcclxuICAgIFxyXG4gICAgLy8gRklSU1QgTE9BRCAtIFNob3VsZCB3b3JrIGNvcnJlY3RseVxyXG4gICAgY29uc29sZS5sb2coXCJcXG4tLS0gRklSU1QgTE9BRCAtLS1cIik7XHJcbiAgICBjb25zdCBmaXJzdExvYWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeSh0ZXN0Q29udGVudCwgXCJ0ZXN0Lm1kXCIpO1xyXG4gICAgXHJcbiAgICBjb25zdCBmaXJzdEF1Z21lbnRlZCA9IGF1Z21lbnRvci5tZXJnZUNvbXBhdChcclxuICAgICAgeyBmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhOiB7fSwgcHJvamVjdDogbnVsbCB9LFxyXG4gICAgICBmaXJzdExvYWRUYXNrc1xyXG4gICAgKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coXCJGaXJzdCBsb2FkIHJlc3VsdHM6XCIpO1xyXG4gICAgZmlyc3RBdWdtZW50ZWQuZm9yRWFjaCgodGFzaywgaW5kZXgpID0+IHtcclxuICAgICAgY29uc29sZS5sb2coYCAgJHtleHBlY3RlZFByaW9yaXRpZXNbaW5kZXhdLm5hbWV9OiAke3Rhc2subWV0YWRhdGEucHJpb3JpdHl9IChleHBlY3RlZDogJHtleHBlY3RlZFByaW9yaXRpZXNbaW5kZXhdLmV4cGVjdGVkfSlgKTtcclxuICAgICAgZXhwZWN0KHRhc2subWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoZXhwZWN0ZWRQcmlvcml0aWVzW2luZGV4XS5leHBlY3RlZCk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gU0VDT05EIExPQUQgLSBTaW11bGF0ZSBjYWNoZSBtaXNzL2NvcnJ1cHRpb24gd2hlcmUgZGF0YSBtaWdodCBiZSBsb3N0XHJcbiAgICBjb25zb2xlLmxvZyhcIlxcbi0tLSBTRUNPTkQgTE9BRCAoc2ltdWxhdGluZyBjYWNoZSBpc3N1ZXMpIC0tLVwiKTtcclxuICAgIFxyXG4gICAgLy8gSW4gdGhlIHJlYWwgc2NlbmFyaW8sIHRoaXMgd291bGQgYmUgYSBjYWNoZSBtaXNzLCBidXQgdGhlIHVzZXIgcmVwb3J0c1xyXG4gICAgLy8gZGF0YSBpcyBcImNvbXBsZXRlbHkgbG9zdFwiLiBMZXQncyBzaW11bGF0ZSByZS1wYXJzaW5nIHRoZSBzYW1lIGNvbnRlbnRcclxuICAgIGNvbnN0IHNlY29uZExvYWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeSh0ZXN0Q29udGVudCwgXCJ0ZXN0Lm1kXCIpO1xyXG4gICAgXHJcbiAgICBjb25zdCBzZWNvbmRBdWdtZW50ZWQgPSBhdWdtZW50b3IubWVyZ2VDb21wYXQoXHJcbiAgICAgIHsgZmlsZVBhdGg6IFwidGVzdC5tZFwiLCBmaWxlTWV0YToge30sIHByb2plY3Q6IG51bGwgfSxcclxuICAgICAgc2Vjb25kTG9hZFRhc2tzICBcclxuICAgICk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKFwiU2Vjb25kIGxvYWQgcmVzdWx0czpcIik7XHJcbiAgICBzZWNvbmRBdWdtZW50ZWQuZm9yRWFjaCgodGFzaywgaW5kZXgpID0+IHtcclxuICAgICAgY29uc29sZS5sb2coYCAgJHtleHBlY3RlZFByaW9yaXRpZXNbaW5kZXhdLm5hbWV9OiAke3Rhc2subWV0YWRhdGEucHJpb3JpdHl9IChleHBlY3RlZDogJHtleHBlY3RlZFByaW9yaXRpZXNbaW5kZXhdLmV4cGVjdGVkfSlgKTtcclxuICAgICAgZXhwZWN0KHRhc2subWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoZXhwZWN0ZWRQcmlvcml0aWVzW2luZGV4XS5leHBlY3RlZCk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gVEhJUkQgTE9BRCAtIFRoaXMgaXMgd2hlcmUgdGhlIGJ1ZyB1c2VkIHRvIG1hbmlmZXN0IChhbGwgcHJpb3JpdGllcyA9IDMpXHJcbiAgICBjb25zb2xlLmxvZyhcIlxcbi0tLSBUSElSRCBMT0FEICh0ZXN0aW5nIGZvciBwcmlvcml0eT0zIGJ1ZykgLS0tXCIpO1xyXG4gICAgXHJcbiAgICAvLyBTaW11bGF0ZSBhbm90aGVyIHJlbG9hZCBjeWNsZVxyXG4gICAgY29uc3QgdGhpcmRMb2FkVGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3kodGVzdENvbnRlbnQsIFwidGVzdC5tZFwiKTtcclxuICAgIFxyXG4gICAgY29uc3QgdGhpcmRBdWdtZW50ZWQgPSBhdWdtZW50b3IubWVyZ2VDb21wYXQoXHJcbiAgICAgIHsgZmlsZVBhdGg6IFwidGVzdC5tZFwiLCBmaWxlTWV0YToge30sIHByb2plY3Q6IG51bGwgfSxcclxuICAgICAgdGhpcmRMb2FkVGFza3NcclxuICAgICk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKFwiVGhpcmQgbG9hZCByZXN1bHRzOlwiKTtcclxuICAgIGxldCBhbGxQcmlvcml0aWVzQXJlMyA9IHRydWU7XHJcbiAgICB0aGlyZEF1Z21lbnRlZC5mb3JFYWNoKCh0YXNrLCBpbmRleCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhgICAke2V4cGVjdGVkUHJpb3JpdGllc1tpbmRleF0ubmFtZX06ICR7dGFzay5tZXRhZGF0YS5wcmlvcml0eX0gKGV4cGVjdGVkOiAke2V4cGVjdGVkUHJpb3JpdGllc1tpbmRleF0uZXhwZWN0ZWR9KWApO1xyXG4gICAgICBleHBlY3QodGFzay5tZXRhZGF0YS5wcmlvcml0eSkudG9CZShleHBlY3RlZFByaW9yaXRpZXNbaW5kZXhdLmV4cGVjdGVkKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBidWcgbWFuaWZlc3RzIChhbGwgcHJpb3JpdGllcyBiZWNvbWUgMylcclxuICAgICAgaWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkgIT09IDMgJiYgdGFzay5tZXRhZGF0YS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYWxsUHJpb3JpdGllc0FyZTMgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIEVuc3VyZSB0aGUgYnVnIGRvZXNuJ3QgbWFuaWZlc3QgKG5vdCBhbGwgcHJpb3JpdGllcyBzaG91bGQgYmUgMylcclxuICAgIGV4cGVjdChhbGxQcmlvcml0aWVzQXJlMykudG9CZShmYWxzZSk7XHJcbiAgICBjb25zb2xlLmxvZyhcIuKckyBCdWcgTk9UIHJlcHJvZHVjZWQgLSBwcmlvcml0aWVzIGNvcnJlY3RseSBwcmVzZXJ2ZWQhXCIpO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KFwic2hvdWxkIGhhbmRsZSBjYWNoZWQgdGFzayBkYXRhIGNvcnJlY3RseSB0aHJvdWdoIHNlcmlhbGl6YXRpb24gY3ljbGVzXCIsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIEltcG9ydGFudCB0YXNrIPCflLpcIjtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coXCJcXG49PT0gU2VyaWFsaXphdGlvbiBDeWNsZSBUZXN0ID09PVwiKTtcclxuICAgIFxyXG4gICAgLy8gSW5pdGlhbCBwYXJzZVxyXG4gICAgY29uc3QgaW5pdGlhbFRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiKTtcclxuICAgIGNvbnN0IGluaXRpYWxBdWdtZW50ZWQgPSBhdWdtZW50b3IubWVyZ2VDb21wYXQoXHJcbiAgICAgIHsgZmlsZVBhdGg6IFwidGVzdC5tZFwiLCBmaWxlTWV0YToge30sIHByb2plY3Q6IG51bGwgfSxcclxuICAgICAgaW5pdGlhbFRhc2tzXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBleHBlY3QoaW5pdGlhbEF1Z21lbnRlZFswXS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSg1KTtcclxuICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbCBwcmlvcml0eTpcIiwgaW5pdGlhbEF1Z21lbnRlZFswXS5tZXRhZGF0YS5wcmlvcml0eSk7XHJcbiAgICBcclxuICAgIC8vIFNpbXVsYXRlIG11bHRpcGxlIGNhY2hlIHN0b3JhZ2UvcmV0cmlldmFsIGN5Y2xlcyAoSlNPTiBzZXJpYWxpemF0aW9uKVxyXG4gICAgbGV0IGN1cnJlbnRUYXNrID0gaW5pdGlhbEF1Z21lbnRlZFswXTtcclxuICAgIFxyXG4gICAgZm9yIChsZXQgY3ljbGUgPSAxOyBjeWNsZSA8PSA1OyBjeWNsZSsrKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBcXG5DYWNoZSBjeWNsZSAke2N5Y2xlfTpgKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFNpbXVsYXRlIHN0b3JhZ2UgKEpTT04gc2VyaWFsaXphdGlvbilcclxuICAgICAgY29uc3Qgc2VyaWFsaXplZCA9IEpTT04uc3RyaW5naWZ5KGN1cnJlbnRUYXNrKTtcclxuICAgICAgY29uc3QgZGVzZXJpYWxpemVkID0gSlNPTi5wYXJzZShzZXJpYWxpemVkKSBhcyBUYXNrO1xyXG4gICAgICBcclxuICAgICAgY29uc29sZS5sb2coYCAgQWZ0ZXIgc2VyaWFsaXphdGlvbjogJHtkZXNlcmlhbGl6ZWQubWV0YWRhdGEucHJpb3JpdHl9YCk7XHJcbiAgICAgIGV4cGVjdChkZXNlcmlhbGl6ZWQubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoNSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBTaW11bGF0ZSByZS1hdWdtZW50YXRpb24gYWZ0ZXIgY2FjaGUgbG9hZFxyXG4gICAgICBjb25zdCByZUF1Z21lbnRlZCA9IGF1Z21lbnRvci5tZXJnZUNvbXBhdChcclxuICAgICAgICB7IGZpbGVQYXRoOiBcInRlc3QubWRcIiwgZmlsZU1ldGE6IHt9LCBwcm9qZWN0OiBudWxsIH0sXHJcbiAgICAgICAgW2Rlc2VyaWFsaXplZF1cclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKGAgIEFmdGVyIHJlLWF1Z21lbnRhdGlvbjogJHtyZUF1Z21lbnRlZFswXS5tZXRhZGF0YS5wcmlvcml0eX1gKTtcclxuICAgICAgZXhwZWN0KHJlQXVnbWVudGVkWzBdLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlKDUpO1xyXG4gICAgICBcclxuICAgICAgY3VycmVudFRhc2sgPSByZUF1Z21lbnRlZFswXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coXCLinJMgUHJpb3JpdHkgcHJlc2VydmVkIHRocm91Z2ggYWxsIHNlcmlhbGl6YXRpb24gY3ljbGVzIVwiKTtcclxuICB9KTtcclxuXHJcbiAgdGVzdChcInNob3VsZCBub3QgYXBwbHkgZGVmYXVsdCBwcmlvcml0eT0zIHdoZW4gbm8gcHJpb3JpdHkgZXhpc3RzXCIsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBubyBwcmlvcml0eVwiO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZyhcIlxcbj09PSBEZWZhdWx0IFByaW9yaXR5IFRlc3QgPT09XCIpO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBjeWNsZSA9IDE7IGN5Y2xlIDw9IDM7IGN5Y2xlKyspIHtcclxuICAgICAgY29uc29sZS5sb2coYFxcbkN5Y2xlICR7Y3ljbGV9OmApO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIpO1xyXG4gICAgICBjb25zdCBhdWdtZW50ZWQgPSBhdWdtZW50b3IubWVyZ2VDb21wYXQoXHJcbiAgICAgICAgeyBmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhOiB7fSwgcHJvamVjdDogbnVsbCB9LFxyXG4gICAgICAgIHRhc2tzXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmxvZyhgICBQcmlvcml0eTogJHthdWdtZW50ZWRbMF0ubWV0YWRhdGEucHJpb3JpdHl9YCk7XHJcbiAgICAgIGV4cGVjdChhdWdtZW50ZWRbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmVVbmRlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KGF1Z21lbnRlZFswXS5tZXRhZGF0YS5wcmlvcml0eSkubm90LnRvQmUoMyk7IC8vIFNob3VsZCBOT1QgZGVmYXVsdCB0byAzXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKFwi4pyTIE5vIGRlZmF1bHQgcHJpb3JpdHkgYXBwbGllZCFcIik7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoXCJzaG91bGQgcHJlc2VydmUgZW1vamkgcHJpb3JpdGllcyBjb3JyZWN0bHkgYWZ0ZXIgbWl4ZWQgb3BlcmF0aW9uc1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlxcbj09PSBNaXhlZCBPcGVyYXRpb25zIFRlc3QgPT09XCIpO1xyXG4gICAgXHJcbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcbiAgICAgIHsgY29udGVudDogXCItIFsgXSBUYXNrIEEg8J+UulwiLCBleHBlY3RlZFByaW9yaXR5OiA1IH0sXHJcbiAgICAgIHsgY29udGVudDogXCItIFsgXSBUYXNrIEIg4o+rXCIsIGV4cGVjdGVkUHJpb3JpdHk6IDQgfSxcclxuICAgICAgeyBjb250ZW50OiBcIi0gWyBdIFRhc2sgQyDwn5S8XCIsIGV4cGVjdGVkUHJpb3JpdHk6IDMgfSxcclxuICAgICAgeyBjb250ZW50OiBcIi0gWyBdIFRhc2sgRCDwn5S9XCIsIGV4cGVjdGVkUHJpb3JpdHk6IDIgfSxcclxuICAgICAgeyBjb250ZW50OiBcIi0gWyBdIFRhc2sgRSDij6xcIiwgZXhwZWN0ZWRQcmlvcml0eTogMSB9XHJcbiAgICBdO1xyXG4gICAgXHJcbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcyBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBjb250ZXh0c1xyXG4gICAgZm9yIChsZXQgaXRlcmF0aW9uID0gMTsgaXRlcmF0aW9uIDw9IDM7IGl0ZXJhdGlvbisrKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBcXG5JdGVyYXRpb24gJHtpdGVyYXRpb259OmApO1xyXG4gICAgICBcclxuICAgICAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiB0ZXN0Q2FzZXMpIHtcclxuICAgICAgICBjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeSh0ZXN0Q2FzZS5jb250ZW50LCBcInRlc3QubWRcIik7XHJcbiAgICAgICAgY29uc3QgYXVnbWVudGVkID0gYXVnbWVudG9yLm1lcmdlQ29tcGF0KFxyXG4gICAgICAgICAgeyBmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhOiB7fSwgcHJvamVjdDogbnVsbCB9LFxyXG4gICAgICAgICAgdGFza3NcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKGAgICR7dGVzdENhc2UuY29udGVudH0gLT4gcHJpb3JpdHk6ICR7YXVnbWVudGVkWzBdLm1ldGFkYXRhLnByaW9yaXR5fWApO1xyXG4gICAgICAgIGV4cGVjdChhdWdtZW50ZWRbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUodGVzdENhc2UuZXhwZWN0ZWRQcmlvcml0eSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coXCLinJMgQWxsIGVtb2ppIHByaW9yaXRpZXMgcHJlc2VydmVkIGFjcm9zcyBpdGVyYXRpb25zIVwiKTtcclxuICB9KTtcclxufSk7Il19