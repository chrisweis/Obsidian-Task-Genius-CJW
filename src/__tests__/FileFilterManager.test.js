import { FileFilterManager } from "../managers/file-filter-manager";
import { FilterMode } from "../common/setting-definition";
// Mock TFile for testing
class MockTFile {
    constructor(path, extension) {
        this.path = path;
        this.extension = extension;
    }
}
describe("FileFilterManager", () => {
    describe("Basic Filtering", () => {
        it("should allow all files when disabled", () => {
            const config = {
                enabled: false,
                mode: FilterMode.BLACKLIST,
                rules: [{ type: "folder", path: ".obsidian", enabled: true }],
            };
            const manager = new FileFilterManager(config);
            const file = new MockTFile(".obsidian/config.json", "json");
            expect(manager.shouldIncludeFile(file)).toBe(true);
        });
        it("should filter files in blacklist mode", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [
                    { type: "folder", path: ".obsidian", enabled: true },
                    { type: "file", path: "temp.md", enabled: true },
                ],
            };
            const manager = new FileFilterManager(config);
            // Should exclude files in .obsidian folder
            const obsidianFile = new MockTFile(".obsidian/config.json", "json");
            expect(manager.shouldIncludeFile(obsidianFile)).toBe(false);
            // Should exclude specific file
            const tempFile = new MockTFile("temp.md", "md");
            expect(manager.shouldIncludeFile(tempFile)).toBe(false);
            // Should include other files
            const normalFile = new MockTFile("notes/my-note.md", "md");
            expect(manager.shouldIncludeFile(normalFile)).toBe(true);
        });
        it("should filter files in whitelist mode", () => {
            const config = {
                enabled: true,
                mode: FilterMode.WHITELIST,
                rules: [
                    { type: "folder", path: "notes", enabled: true },
                    { type: "file", path: "important.md", enabled: true },
                ],
            };
            const manager = new FileFilterManager(config);
            // Should include files in notes folder
            const notesFile = new MockTFile("notes/my-note.md", "md");
            expect(manager.shouldIncludeFile(notesFile)).toBe(true);
            // Should include specific file
            const importantFile = new MockTFile("important.md", "md");
            expect(manager.shouldIncludeFile(importantFile)).toBe(true);
            // Should exclude other files
            const otherFile = new MockTFile("other/file.md", "md");
            expect(manager.shouldIncludeFile(otherFile)).toBe(false);
        });
    });
    describe("Pattern Matching", () => {
        it("should match wildcard patterns", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [
                    { type: "pattern", path: "*.tmp", enabled: true },
                    { type: "pattern", path: "temp/*", enabled: true },
                ],
            };
            const manager = new FileFilterManager(config);
            // Should exclude .tmp files
            const tmpFile = new MockTFile("cache.tmp", "tmp");
            expect(manager.shouldIncludeFile(tmpFile)).toBe(false);
            // Should exclude files in temp folder
            const tempFile = new MockTFile("temp/data.json", "json");
            expect(manager.shouldIncludeFile(tempFile)).toBe(false);
            // Should include normal files
            const normalFile = new MockTFile("notes/note.md", "md");
            expect(manager.shouldIncludeFile(normalFile)).toBe(true);
        });
    });
    describe("Folder Hierarchy", () => {
        it("should match nested folders", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [{ type: "folder", path: "archive", enabled: true }],
            };
            const manager = new FileFilterManager(config);
            // Should exclude files in archive folder
            const archiveFile = new MockTFile("archive/old.md", "md");
            expect(manager.shouldIncludeFile(archiveFile)).toBe(false);
            // Should exclude files in nested archive folders
            const nestedArchiveFile = new MockTFile("archive/2023/old.md", "md");
            expect(manager.shouldIncludeFile(nestedArchiveFile)).toBe(false);
            // Should include files in other folders
            const normalFile = new MockTFile("notes/current.md", "md");
            expect(manager.shouldIncludeFile(normalFile)).toBe(true);
        });
    });
    describe("Rule Management", () => {
        it("should respect disabled rules", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [
                    { type: "folder", path: ".obsidian", enabled: false },
                    { type: "folder", path: ".trash", enabled: true },
                ],
            };
            const manager = new FileFilterManager(config);
            // Should include files from disabled rule
            const obsidianFile = new MockTFile(".obsidian/config.json", "json");
            expect(manager.shouldIncludeFile(obsidianFile)).toBe(true);
            // Should exclude files from enabled rule
            const trashFile = new MockTFile(".trash/deleted.md", "md");
            expect(manager.shouldIncludeFile(trashFile)).toBe(false);
        });
        it("should update configuration dynamically", () => {
            const initialConfig = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [{ type: "folder", path: ".obsidian", enabled: true }],
            };
            const manager = new FileFilterManager(initialConfig);
            const file = new MockTFile(".obsidian/config.json", "json");
            // Initially should exclude
            expect(manager.shouldIncludeFile(file)).toBe(false);
            // Update configuration to disable filtering
            const newConfig = {
                enabled: false,
                mode: FilterMode.BLACKLIST,
                rules: [],
            };
            manager.updateConfig(newConfig);
            // Should now include
            expect(manager.shouldIncludeFile(file)).toBe(true);
        });
    });
    describe("Performance and Caching", () => {
        it("should cache filter results", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [{ type: "folder", path: ".obsidian", enabled: true }],
            };
            const manager = new FileFilterManager(config);
            const file = new MockTFile(".obsidian/config.json", "json");
            // First call
            const result1 = manager.shouldIncludeFile(file);
            // Second call should use cache
            const result2 = manager.shouldIncludeFile(file);
            expect(result1).toBe(result2);
            expect(result1).toBe(false);
            // Verify cache is working
            const stats = manager.getStats();
            expect(stats.cacheSize).toBeGreaterThan(0);
        });
        it("should clear cache when configuration changes", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [{ type: "folder", path: ".obsidian", enabled: true }],
            };
            const manager = new FileFilterManager(config);
            const file = new MockTFile(".obsidian/config.json", "json");
            // Populate cache
            manager.shouldIncludeFile(file);
            expect(manager.getStats().cacheSize).toBeGreaterThan(0);
            // Update configuration
            const newConfig = {
                enabled: false,
                mode: FilterMode.BLACKLIST,
                rules: [],
            };
            manager.updateConfig(newConfig);
            // Cache should be cleared
            expect(manager.getStats().cacheSize).toBe(0);
        });
    });
    describe("Statistics", () => {
        it("should provide accurate statistics", () => {
            const config = {
                enabled: true,
                mode: FilterMode.BLACKLIST,
                rules: [
                    { type: "folder", path: ".obsidian", enabled: true },
                    { type: "file", path: "temp.md", enabled: false },
                    { type: "pattern", path: "*.tmp", enabled: true },
                ],
            };
            const manager = new FileFilterManager(config);
            const stats = manager.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.rulesCount).toBe(2); // Only enabled rules
            expect(stats.cacheSize).toBe(0); // No cache yet
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZUZpbHRlck1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVGaWx0ZXJNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRzFELHlCQUF5QjtBQUN6QixNQUFNLFNBQVM7SUFDZCxZQUFtQixJQUFZLEVBQVMsU0FBaUI7UUFBdEMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFBRyxDQUFDO0NBQzdEO0FBRUQsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFDL0MsTUFBTSxNQUFNLEdBQXVCO2dCQUNsQyxPQUFPLEVBQUUsS0FBSztnQkFDZCxJQUFJLEVBQUUsVUFBVSxDQUFDLFNBQVM7Z0JBQzFCLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUM3RCxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQVEsQ0FBQztZQUVuRSxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxNQUFNLE1BQU0s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Q0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUMzQixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1lBQzdDLE1BQU0sTUFBTSxHQUF1QjtnQkFDbEMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUMxQixLQUFLLEVBQUU7b0JBQ04sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtvQkFDcEQsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtvQkFDakQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtpQkFDakQ7YUFDRCxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7WUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlO1FBQ2pELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZpbGVGaWx0ZXJNYW5hZ2VyIH0gZnJvbSBcIi4uL21hbmFnZXJzL2ZpbGUtZmlsdGVyLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgRmlsdGVyTW9kZSB9IGZyb20gXCIuLi9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IEZpbGVGaWx0ZXJTZXR0aW5ncyB9IGZyb20gXCIuLi9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcblxyXG4vLyBNb2NrIFRGaWxlIGZvciB0ZXN0aW5nXHJcbmNsYXNzIE1vY2tURmlsZSB7XHJcblx0Y29uc3RydWN0b3IocHVibGljIHBhdGg6IHN0cmluZywgcHVibGljIGV4dGVuc2lvbjogc3RyaW5nKSB7fVxyXG59XHJcblxyXG5kZXNjcmliZShcIkZpbGVGaWx0ZXJNYW5hZ2VyXCIsICgpID0+IHtcclxuXHRkZXNjcmliZShcIkJhc2ljIEZpbHRlcmluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBhbGxvdyBhbGwgZmlsZXMgd2hlbiBkaXNhYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogRmlsZUZpbHRlclNldHRpbmdzID0ge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbeyB0eXBlOiBcImZvbGRlclwiLCBwYXRoOiBcIi5vYnNpZGlhblwiLCBlbmFibGVkOiB0cnVlIH1dLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihjb25maWcpO1xyXG5cdFx0XHRjb25zdCBmaWxlID0gbmV3IE1vY2tURmlsZShcIi5vYnNpZGlhbi9jb25maWcuanNvblwiLCBcImpzb25cIikgYXMgYW55O1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUoZmlsZSkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmaWx0ZXIgZmlsZXMgaW4gYmxhY2tsaXN0IG1vZGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwiZm9sZGVyXCIsIHBhdGg6IFwiLm9ic2lkaWFuXCIsIGVuYWJsZWQ6IHRydWUgfSxcclxuXHRcdFx0XHRcdHsgdHlwZTogXCJmaWxlXCIsIHBhdGg6IFwidGVtcC5tZFwiLCBlbmFibGVkOiB0cnVlIH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgRmlsZUZpbHRlck1hbmFnZXIoY29uZmlnKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIGZpbGVzIGluIC5vYnNpZGlhbiBmb2xkZXJcclxuXHRcdFx0Y29uc3Qgb2JzaWRpYW5GaWxlID0gbmV3IE1vY2tURmlsZShcclxuXHRcdFx0XHRcIi5vYnNpZGlhbi9jb25maWcuanNvblwiLFxyXG5cdFx0XHRcdFwianNvblwiXHJcblx0XHRcdCkgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShvYnNpZGlhbkZpbGUpKS50b0JlKGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIHNwZWNpZmljIGZpbGVcclxuXHRcdFx0Y29uc3QgdGVtcEZpbGUgPSBuZXcgTW9ja1RGaWxlKFwidGVtcC5tZFwiLCBcIm1kXCIpIGFzIGFueTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUodGVtcEZpbGUpKS50b0JlKGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBpbmNsdWRlIG90aGVyIGZpbGVzXHJcblx0XHRcdGNvbnN0IG5vcm1hbEZpbGUgPSBuZXcgTW9ja1RGaWxlKFwibm90ZXMvbXktbm90ZS5tZFwiLCBcIm1kXCIpIGFzIGFueTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUobm9ybWFsRmlsZSkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmaWx0ZXIgZmlsZXMgaW4gd2hpdGVsaXN0IG1vZGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuV0hJVEVMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwiZm9sZGVyXCIsIHBhdGg6IFwibm90ZXNcIiwgZW5hYmxlZDogdHJ1ZSB9LFxyXG5cdFx0XHRcdFx0eyB0eXBlOiBcImZpbGVcIiwgcGF0aDogXCJpbXBvcnRhbnQubWRcIiwgZW5hYmxlZDogdHJ1ZSB9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtYW5hZ2VyID0gbmV3IEZpbGVGaWx0ZXJNYW5hZ2VyKGNvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaW5jbHVkZSBmaWxlcyBpbiBub3RlcyBmb2xkZXJcclxuXHRcdFx0Y29uc3Qgbm90ZXNGaWxlID0gbmV3IE1vY2tURmlsZShcIm5vdGVzL215LW5vdGUubWRcIiwgXCJtZFwiKSBhcyBhbnk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLnNob3VsZEluY2x1ZGVGaWxlKG5vdGVzRmlsZSkpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaW5jbHVkZSBzcGVjaWZpYyBmaWxlXHJcblx0XHRcdGNvbnN0IGltcG9ydGFudEZpbGUgPSBuZXcgTW9ja1RGaWxlKFwiaW1wb3J0YW50Lm1kXCIsIFwibWRcIikgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShpbXBvcnRhbnRGaWxlKSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIG90aGVyIGZpbGVzXHJcblx0XHRcdGNvbnN0IG90aGVyRmlsZSA9IG5ldyBNb2NrVEZpbGUoXCJvdGhlci9maWxlLm1kXCIsIFwibWRcIikgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShvdGhlckZpbGUpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlBhdHRlcm4gTWF0Y2hpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgbWF0Y2ggd2lsZGNhcmQgcGF0dGVybnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwicGF0dGVyblwiLCBwYXRoOiBcIioudG1wXCIsIGVuYWJsZWQ6IHRydWUgfSxcclxuXHRcdFx0XHRcdHsgdHlwZTogXCJwYXR0ZXJuXCIsIHBhdGg6IFwidGVtcC8qXCIsIGVuYWJsZWQ6IHRydWUgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihjb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGV4Y2x1ZGUgLnRtcCBmaWxlc1xyXG5cdFx0XHRjb25zdCB0bXBGaWxlID0gbmV3IE1vY2tURmlsZShcImNhY2hlLnRtcFwiLCBcInRtcFwiKSBhcyBhbnk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLnNob3VsZEluY2x1ZGVGaWxlKHRtcEZpbGUpKS50b0JlKGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIGZpbGVzIGluIHRlbXAgZm9sZGVyXHJcblx0XHRcdGNvbnN0IHRlbXBGaWxlID0gbmV3IE1vY2tURmlsZShcInRlbXAvZGF0YS5qc29uXCIsIFwianNvblwiKSBhcyBhbnk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLnNob3VsZEluY2x1ZGVGaWxlKHRlbXBGaWxlKSkudG9CZShmYWxzZSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaW5jbHVkZSBub3JtYWwgZmlsZXNcclxuXHRcdFx0Y29uc3Qgbm9ybWFsRmlsZSA9IG5ldyBNb2NrVEZpbGUoXCJub3Rlcy9ub3RlLm1kXCIsIFwibWRcIikgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShub3JtYWxGaWxlKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkZvbGRlciBIaWVyYXJjaHlcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgbWF0Y2ggbmVzdGVkIGZvbGRlcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbeyB0eXBlOiBcImZvbGRlclwiLCBwYXRoOiBcImFyY2hpdmVcIiwgZW5hYmxlZDogdHJ1ZSB9XSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgRmlsZUZpbHRlck1hbmFnZXIoY29uZmlnKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIGZpbGVzIGluIGFyY2hpdmUgZm9sZGVyXHJcblx0XHRcdGNvbnN0IGFyY2hpdmVGaWxlID0gbmV3IE1vY2tURmlsZShcImFyY2hpdmUvb2xkLm1kXCIsIFwibWRcIikgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShhcmNoaXZlRmlsZSkpLnRvQmUoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGV4Y2x1ZGUgZmlsZXMgaW4gbmVzdGVkIGFyY2hpdmUgZm9sZGVyc1xyXG5cdFx0XHRjb25zdCBuZXN0ZWRBcmNoaXZlRmlsZSA9IG5ldyBNb2NrVEZpbGUoXHJcblx0XHRcdFx0XCJhcmNoaXZlLzIwMjMvb2xkLm1kXCIsXHJcblx0XHRcdFx0XCJtZFwiXHJcblx0XHRcdCkgYXMgYW55O1xyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShuZXN0ZWRBcmNoaXZlRmlsZSkpLnRvQmUoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGluY2x1ZGUgZmlsZXMgaW4gb3RoZXIgZm9sZGVyc1xyXG5cdFx0XHRjb25zdCBub3JtYWxGaWxlID0gbmV3IE1vY2tURmlsZShcIm5vdGVzL2N1cnJlbnQubWRcIiwgXCJtZFwiKSBhcyBhbnk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLnNob3VsZEluY2x1ZGVGaWxlKG5vcm1hbEZpbGUpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiUnVsZSBNYW5hZ2VtZW50XCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJlc3BlY3QgZGlzYWJsZWQgcnVsZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwiZm9sZGVyXCIsIHBhdGg6IFwiLm9ic2lkaWFuXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwiZm9sZGVyXCIsIHBhdGg6IFwiLnRyYXNoXCIsIGVuYWJsZWQ6IHRydWUgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihjb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGluY2x1ZGUgZmlsZXMgZnJvbSBkaXNhYmxlZCBydWxlXHJcblx0XHRcdGNvbnN0IG9ic2lkaWFuRmlsZSA9IG5ldyBNb2NrVEZpbGUoXHJcblx0XHRcdFx0XCIub2JzaWRpYW4vY29uZmlnLmpzb25cIixcclxuXHRcdFx0XHRcImpzb25cIlxyXG5cdFx0XHQpIGFzIGFueTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUob2JzaWRpYW5GaWxlKSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleGNsdWRlIGZpbGVzIGZyb20gZW5hYmxlZCBydWxlXHJcblx0XHRcdGNvbnN0IHRyYXNoRmlsZSA9IG5ldyBNb2NrVEZpbGUoXCIudHJhc2gvZGVsZXRlZC5tZFwiLCBcIm1kXCIpIGFzIGFueTtcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUodHJhc2hGaWxlKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1cGRhdGUgY29uZmlndXJhdGlvbiBkeW5hbWljYWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGluaXRpYWxDb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbeyB0eXBlOiBcImZvbGRlclwiLCBwYXRoOiBcIi5vYnNpZGlhblwiLCBlbmFibGVkOiB0cnVlIH1dLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihpbml0aWFsQ29uZmlnKTtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IG5ldyBNb2NrVEZpbGUoXCIub2JzaWRpYW4vY29uZmlnLmpzb25cIiwgXCJqc29uXCIpIGFzIGFueTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxseSBzaG91bGQgZXhjbHVkZVxyXG5cdFx0XHRleHBlY3QobWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShmaWxlKSkudG9CZShmYWxzZSk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY29uZmlndXJhdGlvbiB0byBkaXNhYmxlIGZpbHRlcmluZ1xyXG5cdFx0XHRjb25zdCBuZXdDb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRtb2RlOiBGaWx0ZXJNb2RlLkJMQUNLTElTVCxcclxuXHRcdFx0XHRydWxlczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZUNvbmZpZyhuZXdDb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG5vdyBpbmNsdWRlXHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLnNob3VsZEluY2x1ZGVGaWxlKGZpbGUpKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiUGVyZm9ybWFuY2UgYW5kIENhY2hpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY2FjaGUgZmlsdGVyIHJlc3VsdHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0XHRcdHJ1bGVzOiBbeyB0eXBlOiBcImZvbGRlclwiLCBwYXRoOiBcIi5vYnNpZGlhblwiLCBlbmFibGVkOiB0cnVlIH1dLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihjb25maWcpO1xyXG5cdFx0XHRjb25zdCBmaWxlID0gbmV3IE1vY2tURmlsZShcIi5vYnNpZGlhbi9jb25maWcuanNvblwiLCBcImpzb25cIikgYXMgYW55O1xyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2FsbFxyXG5cdFx0XHRjb25zdCByZXN1bHQxID0gbWFuYWdlci5zaG91bGRJbmNsdWRlRmlsZShmaWxlKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjYWxsIHNob3VsZCB1c2UgY2FjaGVcclxuXHRcdFx0Y29uc3QgcmVzdWx0MiA9IG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUoZmlsZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0MSkudG9CZShyZXN1bHQyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEpLnRvQmUoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGNhY2hlIGlzIHdvcmtpbmdcclxuXHRcdFx0Y29uc3Qgc3RhdHMgPSBtYW5hZ2VyLmdldFN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChzdGF0cy5jYWNoZVNpemUpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNsZWFyIGNhY2hlIHdoZW4gY29uZmlndXJhdGlvbiBjaGFuZ2VzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBGaWxlRmlsdGVyU2V0dGluZ3MgPSB7XHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRtb2RlOiBGaWx0ZXJNb2RlLkJMQUNLTElTVCxcclxuXHRcdFx0XHRydWxlczogW3sgdHlwZTogXCJmb2xkZXJcIiwgcGF0aDogXCIub2JzaWRpYW5cIiwgZW5hYmxlZDogdHJ1ZSB9XSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1hbmFnZXIgPSBuZXcgRmlsZUZpbHRlck1hbmFnZXIoY29uZmlnKTtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IG5ldyBNb2NrVEZpbGUoXCIub2JzaWRpYW4vY29uZmlnLmpzb25cIiwgXCJqc29uXCIpIGFzIGFueTtcclxuXHJcblx0XHRcdC8vIFBvcHVsYXRlIGNhY2hlXHJcblx0XHRcdG1hbmFnZXIuc2hvdWxkSW5jbHVkZUZpbGUoZmlsZSk7XHJcblx0XHRcdGV4cGVjdChtYW5hZ2VyLmdldFN0YXRzKCkuY2FjaGVTaXplKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY29uZmlndXJhdGlvblxyXG5cdFx0XHRjb25zdCBuZXdDb25maWc6IEZpbGVGaWx0ZXJTZXR0aW5ncyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRtb2RlOiBGaWx0ZXJNb2RlLkJMQUNLTElTVCxcclxuXHRcdFx0XHRydWxlczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtYW5hZ2VyLnVwZGF0ZUNvbmZpZyhuZXdDb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gQ2FjaGUgc2hvdWxkIGJlIGNsZWFyZWRcclxuXHRcdFx0ZXhwZWN0KG1hbmFnZXIuZ2V0U3RhdHMoKS5jYWNoZVNpemUpLnRvQmUoMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJTdGF0aXN0aWNzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByb3ZpZGUgYWNjdXJhdGUgc3RhdGlzdGljc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogRmlsZUZpbHRlclNldHRpbmdzID0ge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0bW9kZTogRmlsdGVyTW9kZS5CTEFDS0xJU1QsXHJcblx0XHRcdFx0cnVsZXM6IFtcclxuXHRcdFx0XHRcdHsgdHlwZTogXCJmb2xkZXJcIiwgcGF0aDogXCIub2JzaWRpYW5cIiwgZW5hYmxlZDogdHJ1ZSB9LFxyXG5cdFx0XHRcdFx0eyB0eXBlOiBcImZpbGVcIiwgcGF0aDogXCJ0ZW1wLm1kXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwicGF0dGVyblwiLCBwYXRoOiBcIioudG1wXCIsIGVuYWJsZWQ6IHRydWUgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBGaWxlRmlsdGVyTWFuYWdlcihjb25maWcpO1xyXG5cdFx0XHRjb25zdCBzdGF0cyA9IG1hbmFnZXIuZ2V0U3RhdHMoKTtcclxuXHJcblx0XHRcdGV4cGVjdChzdGF0cy5lbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMucnVsZXNDb3VudCkudG9CZSgyKTsgLy8gT25seSBlbmFibGVkIHJ1bGVzXHJcblx0XHRcdGV4cGVjdChzdGF0cy5jYWNoZVNpemUpLnRvQmUoMCk7IC8vIE5vIGNhY2hlIHlldFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=