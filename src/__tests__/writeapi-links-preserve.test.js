import { __awaiter } from "tslib";
import { App, MetadataCache } from "obsidian";
import { WriteAPI } from "@/dataflow/api/WriteAPI";
/**
 * Ensures updateTask preserves wiki/markdown links and inline code in task content
 * while replacing/rewriting trailing metadata.
 */
describe("WriteAPI.updateTask preserves links in content when regenerating metadata", () => {
    it("keeps [[wiki#section|alias]] and [text](url#anchor) and `code` intact and replaces metadata", () => __awaiter(void 0, void 0, void 0, function* () {
        // In-memory vault mock
        let fileContent = "- [ ] Do [[Page#Heading|alias]] and [text](https://ex.com/a#b) `inline` #oldtag 🔁 every day 🛫 2024-12-01";
        const filePath = "Test.md";
        const fakeVault = {
            getAbstractFileByPath: (path) => ({ path }),
            read: (_file) => __awaiter(void 0, void 0, void 0, function* () { return fileContent; }),
            modify: (_file, newContent) => __awaiter(void 0, void 0, void 0, function* () {
                fileContent = newContent;
            }),
        };
        // Minimal app and metadataCache mocks
        const app = new App();
        const metadataCache = new MetadataCache();
        // Ensure workspace has trigger/on for Events.emit compatibility
        app.workspace = Object.assign(Object.assign({}, app.workspace), { trigger: jest.fn(), on: jest.fn(() => ({ unload: () => { } })) });
        // Minimal plugin settings used by generateMetadata
        const plugin = {
            settings: {
                preferMetadataFormat: "tasks",
                projectTagPrefix: { tasks: "project", dataview: "project" },
                contextTagPrefix: { tasks: "@", dataview: "context" },
                taskStatuses: { completed: "x" },
                autoDateManager: {
                    manageStartDate: false,
                    manageCancelledDate: false,
                },
            },
        };
        // getTaskById returns a task pointing to line 0 in file
        const getTaskById = (id) => __awaiter(void 0, void 0, void 0, function* () {
            if (id !== "1")
                return null;
            return {
                id: "1",
                content: "Do [[Page#Heading|alias]] and [text](https://ex.com/a#b) `inline`",
                filePath,
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: fileContent,
                metadata: {
                    tags: ["oldtag"],
                    children: [],
                },
            };
        });
        const writeAPI = new WriteAPI(app, fakeVault, metadataCache, plugin, getTaskById);
        // Act: update metadata only (do not touch content/status)
        const due = new Date("2025-01-15").valueOf();
        const res = yield writeAPI.updateTask({
            taskId: "1",
            updates: {
                metadata: { tags: ["newtag"], dueDate: due },
            },
        });
        expect(res.success).toBe(true);
        // Assert: links and inline code remain; old metadata removed; new metadata appended
        // Expect tags first then due date (emoji 📅) in tasks format
        expect(fileContent).toContain("- [ ] Do [[Page#Heading|alias]] and [text](https://ex.com/a#b) `inline` #newtag 📅 2025-01-15");
        // Ensure no remnants of old metadata tokens
        expect(fileContent).not.toMatch(/#oldtag|🔁\s+every day|🛫\s+2024-12-01/);
    }));
});
describe("WriteAPI.insert start date preserves unknown DV fields in content", () => {
    it("keeps [projt::new] when inserting start (dataview format)", () => __awaiter(void 0, void 0, void 0, function* () {
        let fileContent = "- [ ] 123123 [projt::new]";
        const filePath = "StartDV.md";
        const fakeVault = {
            getAbstractFileByPath: (path) => ({ path }),
            read: () => __awaiter(void 0, void 0, void 0, function* () { return fileContent; }),
            modify: (_f, s) => __awaiter(void 0, void 0, void 0, function* () { return (fileContent = s); }),
        };
        const app = new App();
        const metadataCache = new MetadataCache();
        app.workspace = Object.assign(Object.assign({}, app.workspace), { trigger: jest.fn(), on: jest.fn(() => ({ unload: () => { } })) });
        const plugin = {
            settings: {
                preferMetadataFormat: "dataview",
                projectTagPrefix: { tasks: "project", dataview: "project" },
                contextTagPrefix: { tasks: "@", dataview: "context" },
                taskStatuses: { completed: "x" },
                autoDateManager: {
                    manageStartDate: true,
                    manageCancelledDate: false,
                },
            },
        };
        const getTaskById = (id) => __awaiter(void 0, void 0, void 0, function* () {
            return id === "2"
                ? {
                    id: "2",
                    content: "123123 [projt::new]",
                    filePath,
                    line: 0,
                    completed: false,
                    status: " ",
                    originalMarkdown: fileContent,
                    metadata: {},
                }
                : null;
        });
        const writeAPI = new WriteAPI(app, fakeVault, metadataCache, plugin, getTaskById);
        const res = yield writeAPI.updateTask({
            taskId: "2",
            updates: { status: ">" },
        });
        expect(res.success).toBe(true);
        expect(fileContent).toContain("- [>] 123123 [projt::new]");
        expect(fileContent).toMatch(/\[start::\s*\d{4}-\d{2}-\d{2}\]/);
    }));
    it("keeps [projt::new] when inserting start (emoji format)", () => __awaiter(void 0, void 0, void 0, function* () {
        let fileContent = "- [ ] 123123 [projt::new]";
        const filePath = "StartEmoji.md";
        const fakeVault = {
            getAbstractFileByPath: (path) => ({ path }),
            read: () => __awaiter(void 0, void 0, void 0, function* () { return fileContent; }),
            modify: (_f, s) => __awaiter(void 0, void 0, void 0, function* () { return (fileContent = s); }),
        };
        const app = new App();
        const metadataCache = new MetadataCache();
        app.workspace = Object.assign(Object.assign({}, app.workspace), { trigger: jest.fn(), on: jest.fn(() => ({ unload: () => { } })) });
        const plugin = {
            settings: {
                preferMetadataFormat: "tasks",
                projectTagPrefix: { tasks: "project", dataview: "project" },
                contextTagPrefix: { tasks: "@", dataview: "context" },
                taskStatuses: { completed: "x" },
                autoDateManager: {
                    manageStartDate: true,
                    manageCancelledDate: false,
                },
            },
        };
        const getTaskById = (id) => __awaiter(void 0, void 0, void 0, function* () {
            return id === "3"
                ? {
                    id: "3",
                    content: "123123 [projt::new]",
                    filePath,
                    line: 0,
                    completed: false,
                    status: " ",
                    originalMarkdown: fileContent,
                    metadata: {},
                }
                : null;
        });
        const writeAPI = new WriteAPI(app, fakeVault, metadataCache, plugin, getTaskById);
        const res = yield writeAPI.updateTask({
            taskId: "3",
            updates: { status: ">" },
        });
        expect(res.success).toBe(true);
        expect(fileContent).toContain("- [>] 123123 [projt::new]");
        expect(fileContent).toMatch(/🛫\s*\d{4}-\d{2}-\d{2}/);
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JpdGVhcGktbGlua3MtcHJlc2VydmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndyaXRlYXBpLWxpbmtzLXByZXNlcnZlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUduRDs7O0dBR0c7QUFDSCxRQUFRLENBQUMsMkVBQTJFLEVBQUUsR0FBRyxFQUFFO0lBQzFGLEVBQUUsQ0FBQyw2RkFBNkYsRUFBRSxHQUFTLEVBQUU7UUFDNUcsdUJBQXVCO1FBQ3ZCLElBQUksV0FBVyxHQUNkLDRHQUE0RyxDQUFDO1FBQzlHLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUUzQixNQUFNLFNBQVMsR0FBUTtZQUN0QixxQkFBcUIsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ25ELElBQUksRUFBRSxDQUFPLEtBQVUsRUFBRSxFQUFFLGtEQUFDLE9BQUEsV0FBVyxDQUFBLEdBQUE7WUFDdkMsTUFBTSxFQUFFLENBQU8sS0FBVSxFQUFFLFVBQWtCLEVBQUUsRUFBRTtnQkFDaEQsV0FBVyxHQUFHLFVBQVUsQ0FBQztZQUMxQixDQUFDLENBQUE7U0FDRCxDQUFDO1FBRUYsc0NBQXNDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUUxQyxnRUFBZ0U7UUFDL0QsR0FBVyxDQUFDLFNBQVMsbUNBQ2pCLEdBQVcsQ0FBQyxTQUFTLEtBQ3pCLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQ2xCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFN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Q0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBNZXRhZGF0YUNhY2hlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFdyaXRlQVBJIH0gZnJvbSBcIkAvZGF0YWZsb3cvYXBpL1dyaXRlQVBJXCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8qKlxyXG4gKiBFbnN1cmVzIHVwZGF0ZVRhc2sgcHJlc2VydmVzIHdpa2kvbWFya2Rvd24gbGlua3MgYW5kIGlubGluZSBjb2RlIGluIHRhc2sgY29udGVudFxyXG4gKiB3aGlsZSByZXBsYWNpbmcvcmV3cml0aW5nIHRyYWlsaW5nIG1ldGFkYXRhLlxyXG4gKi9cclxuZGVzY3JpYmUoXCJXcml0ZUFQSS51cGRhdGVUYXNrIHByZXNlcnZlcyBsaW5rcyBpbiBjb250ZW50IHdoZW4gcmVnZW5lcmF0aW5nIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRpdChcImtlZXBzIFtbd2lraSNzZWN0aW9ufGFsaWFzXV0gYW5kIFt0ZXh0XSh1cmwjYW5jaG9yKSBhbmQgYGNvZGVgIGludGFjdCBhbmQgcmVwbGFjZXMgbWV0YWRhdGFcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0Ly8gSW4tbWVtb3J5IHZhdWx0IG1vY2tcclxuXHRcdGxldCBmaWxlQ29udGVudCA9XHJcblx0XHRcdFwiLSBbIF0gRG8gW1tQYWdlI0hlYWRpbmd8YWxpYXNdXSBhbmQgW3RleHRdKGh0dHBzOi8vZXguY29tL2EjYikgYGlubGluZWAgI29sZHRhZyDwn5SBIGV2ZXJ5IGRheSDwn5urIDIwMjQtMTItMDFcIjtcclxuXHRcdGNvbnN0IGZpbGVQYXRoID0gXCJUZXN0Lm1kXCI7XHJcblxyXG5cdFx0Y29uc3QgZmFrZVZhdWx0OiBhbnkgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogKHBhdGg6IHN0cmluZykgPT4gKHsgcGF0aCB9KSxcclxuXHRcdFx0cmVhZDogYXN5bmMgKF9maWxlOiBhbnkpID0+IGZpbGVDb250ZW50LFxyXG5cdFx0XHRtb2RpZnk6IGFzeW5jIChfZmlsZTogYW55LCBuZXdDb250ZW50OiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRmaWxlQ29udGVudCA9IG5ld0NvbnRlbnQ7XHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIE1pbmltYWwgYXBwIGFuZCBtZXRhZGF0YUNhY2hlIG1vY2tzXHJcblx0XHRjb25zdCBhcHAgPSBuZXcgQXBwKCk7XHJcblx0XHRjb25zdCBtZXRhZGF0YUNhY2hlID0gbmV3IE1ldGFkYXRhQ2FjaGUoKTtcclxuXHJcblx0XHQvLyBFbnN1cmUgd29ya3NwYWNlIGhhcyB0cmlnZ2VyL29uIGZvciBFdmVudHMuZW1pdCBjb21wYXRpYmlsaXR5XHJcblx0XHQoYXBwIGFzIGFueSkud29ya3NwYWNlID0ge1xyXG5cdFx0XHQuLi4oYXBwIGFzIGFueSkud29ya3NwYWNlLFxyXG5cdFx0XHR0cmlnZ2VyOiBqZXN0LmZuKCksXHJcblx0XHRcdG9uOiBqZXN0LmZuKCgpID0+ICh7IHVubG9hZDogKCkgPT4ge30gfSkpLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBNaW5pbWFsIHBsdWdpbiBzZXR0aW5ncyB1c2VkIGJ5IGdlbmVyYXRlTWV0YWRhdGFcclxuXHRcdGNvbnN0IHBsdWdpbjogYW55ID0ge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsIC8vIHVzZSBlbW9qaS90b2tlbnMgZm9ybWF0XHJcblx0XHRcdFx0cHJvamVjdFRhZ1ByZWZpeDogeyB0YXNrczogXCJwcm9qZWN0XCIsIGRhdGF2aWV3OiBcInByb2plY3RcIiB9LFxyXG5cdFx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHsgdGFza3M6IFwiQFwiLCBkYXRhdmlldzogXCJjb250ZXh0XCIgfSxcclxuXHRcdFx0XHR0YXNrU3RhdHVzZXM6IHsgY29tcGxldGVkOiBcInhcIiB9LFxyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0bWFuYWdlU3RhcnREYXRlOiBmYWxzZSxcclxuXHRcdFx0XHRcdG1hbmFnZUNhbmNlbGxlZERhdGU6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGdldFRhc2tCeUlkIHJldHVybnMgYSB0YXNrIHBvaW50aW5nIHRvIGxpbmUgMCBpbiBmaWxlXHJcblx0XHRjb25zdCBnZXRUYXNrQnlJZCA9IGFzeW5jIChpZDogc3RyaW5nKTogUHJvbWlzZTxUYXNrIHwgbnVsbD4gPT4ge1xyXG5cdFx0XHRpZiAoaWQgIT09IFwiMVwiKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRpZDogXCIxXCIsXHJcblx0XHRcdFx0Y29udGVudDpcclxuXHRcdFx0XHRcdFwiRG8gW1tQYWdlI0hlYWRpbmd8YWxpYXNdXSBhbmQgW3RleHRdKGh0dHBzOi8vZXguY29tL2EjYikgYGlubGluZWBcIixcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBmaWxlQ29udGVudCxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW1wib2xkdGFnXCJdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0gYXMgYW55LFxyXG5cdFx0XHR9IGFzIFRhc2s7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IHdyaXRlQVBJID0gbmV3IFdyaXRlQVBJKFxyXG5cdFx0XHRhcHAgYXMgYW55LFxyXG5cdFx0XHRmYWtlVmF1bHQsXHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUgYXMgYW55LFxyXG5cdFx0XHRwbHVnaW4sXHJcblx0XHRcdGdldFRhc2tCeUlkXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEFjdDogdXBkYXRlIG1ldGFkYXRhIG9ubHkgKGRvIG5vdCB0b3VjaCBjb250ZW50L3N0YXR1cylcclxuXHRcdGNvbnN0IGR1ZSA9IG5ldyBEYXRlKFwiMjAyNS0wMS0xNVwiKS52YWx1ZU9mKCk7XHJcblx0XHRjb25zdCByZXMgPSBhd2FpdCB3cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0dGFza0lkOiBcIjFcIixcclxuXHRcdFx0dXBkYXRlczoge1xyXG5cdFx0XHRcdG1ldGFkYXRhOiB7IHRhZ3M6IFtcIm5ld3RhZ1wiXSwgZHVlRGF0ZTogZHVlIH0gYXMgYW55LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZXhwZWN0KHJlcy5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdC8vIEFzc2VydDogbGlua3MgYW5kIGlubGluZSBjb2RlIHJlbWFpbjsgb2xkIG1ldGFkYXRhIHJlbW92ZWQ7IG5ldyBtZXRhZGF0YSBhcHBlbmRlZFxyXG5cdFx0Ly8gRXhwZWN0IHRhZ3MgZmlyc3QgdGhlbiBkdWUgZGF0ZSAoZW1vamkg8J+ThSkgaW4gdGFza3MgZm9ybWF0XHJcblx0XHRleHBlY3QoZmlsZUNvbnRlbnQpLnRvQ29udGFpbihcclxuXHRcdFx0XCItIFsgXSBEbyBbW1BhZ2UjSGVhZGluZ3xhbGlhc11dIGFuZCBbdGV4dF0oaHR0cHM6Ly9leC5jb20vYSNiKSBgaW5saW5lYCAjbmV3dGFnIPCfk4UgMjAyNS0wMS0xNVwiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEVuc3VyZSBubyByZW1uYW50cyBvZiBvbGQgbWV0YWRhdGEgdG9rZW5zXHJcblx0XHRleHBlY3QoZmlsZUNvbnRlbnQpLm5vdC50b01hdGNoKFxyXG5cdFx0XHQvI29sZHRhZ3zwn5SBXFxzK2V2ZXJ5IGRheXzwn5urXFxzKzIwMjQtMTItMDEvXHJcblx0XHQpO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbmRlc2NyaWJlKFwiV3JpdGVBUEkuaW5zZXJ0IHN0YXJ0IGRhdGUgcHJlc2VydmVzIHVua25vd24gRFYgZmllbGRzIGluIGNvbnRlbnRcIiwgKCkgPT4ge1xyXG5cdGl0KFwia2VlcHMgW3Byb2p0OjpuZXddIHdoZW4gaW5zZXJ0aW5nIHN0YXJ0IChkYXRhdmlldyBmb3JtYXQpXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdGxldCBmaWxlQ29udGVudCA9IFwiLSBbIF0gMTIzMTIzIFtwcm9qdDo6bmV3XVwiO1xyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSBcIlN0YXJ0RFYubWRcIjtcclxuXHRcdGNvbnN0IGZha2VWYXVsdDogYW55ID0ge1xyXG5cdFx0XHRnZXRBYnN0cmFjdEZpbGVCeVBhdGg6IChwYXRoOiBzdHJpbmcpID0+ICh7IHBhdGggfSksXHJcblx0XHRcdHJlYWQ6IGFzeW5jICgpID0+IGZpbGVDb250ZW50LFxyXG5cdFx0XHRtb2RpZnk6IGFzeW5jIChfZjogYW55LCBzOiBzdHJpbmcpID0+IChmaWxlQ29udGVudCA9IHMpLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcclxuXHRcdGNvbnN0IG1ldGFkYXRhQ2FjaGUgPSBuZXcgTWV0YWRhdGFDYWNoZSgpO1xyXG5cdFx0KGFwcCBhcyBhbnkpLndvcmtzcGFjZSA9IHtcclxuXHRcdFx0Li4uKGFwcCBhcyBhbnkpLndvcmtzcGFjZSxcclxuXHRcdFx0dHJpZ2dlcjogamVzdC5mbigpLFxyXG5cdFx0XHRvbjogamVzdC5mbigoKSA9PiAoeyB1bmxvYWQ6ICgpID0+IHt9IH0pKSxcclxuXHRcdH07XHJcblx0XHRjb25zdCBwbHVnaW46IGFueSA9IHtcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJkYXRhdmlld1wiLFxyXG5cdFx0XHRcdHByb2plY3RUYWdQcmVmaXg6IHsgdGFza3M6IFwicHJvamVjdFwiLCBkYXRhdmlldzogXCJwcm9qZWN0XCIgfSxcclxuXHRcdFx0XHRjb250ZXh0VGFnUHJlZml4OiB7IHRhc2tzOiBcIkBcIiwgZGF0YXZpZXc6IFwiY29udGV4dFwiIH0sXHJcblx0XHRcdFx0dGFza1N0YXR1c2VzOiB7IGNvbXBsZXRlZDogXCJ4XCIgfSxcclxuXHRcdFx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0XHRcdG1hbmFnZVN0YXJ0RGF0ZTogdHJ1ZSxcclxuXHRcdFx0XHRcdG1hbmFnZUNhbmNlbGxlZERhdGU6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdFx0Y29uc3QgZ2V0VGFza0J5SWQgPSBhc3luYyAoaWQ6IHN0cmluZyk6IFByb21pc2U8VGFzayB8IG51bGw+ID0+XHJcblx0XHRcdGlkID09PSBcIjJcIlxyXG5cdFx0XHRcdD8gKHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwiMlwiLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50OiBcIjEyMzEyMyBbcHJvanQ6Om5ld11cIixcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YToge30gYXMgYW55LFxyXG5cdFx0XHRcdCAgfSBhcyBUYXNrKVxyXG5cdFx0XHRcdDogbnVsbDtcclxuXHRcdGNvbnN0IHdyaXRlQVBJID0gbmV3IFdyaXRlQVBJKFxyXG5cdFx0XHRhcHAgYXMgYW55LFxyXG5cdFx0XHRmYWtlVmF1bHQsXHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUgYXMgYW55LFxyXG5cdFx0XHRwbHVnaW4sXHJcblx0XHRcdGdldFRhc2tCeUlkXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgcmVzID0gYXdhaXQgd3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdHRhc2tJZDogXCIyXCIsXHJcblx0XHRcdHVwZGF0ZXM6IHsgc3RhdHVzOiBcIj5cIiB9LFxyXG5cdFx0fSk7XHJcblx0XHRleHBlY3QocmVzLnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRleHBlY3QoZmlsZUNvbnRlbnQpLnRvQ29udGFpbihcIi0gWz5dIDEyMzEyMyBbcHJvanQ6Om5ld11cIik7XHJcblx0XHRleHBlY3QoZmlsZUNvbnRlbnQpLnRvTWF0Y2goL1xcW3N0YXJ0OjpcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn1cXF0vKTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJrZWVwcyBbcHJvanQ6Om5ld10gd2hlbiBpbnNlcnRpbmcgc3RhcnQgKGVtb2ppIGZvcm1hdClcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0bGV0IGZpbGVDb250ZW50ID0gXCItIFsgXSAxMjMxMjMgW3Byb2p0OjpuZXddXCI7XHJcblx0XHRjb25zdCBmaWxlUGF0aCA9IFwiU3RhcnRFbW9qaS5tZFwiO1xyXG5cdFx0Y29uc3QgZmFrZVZhdWx0OiBhbnkgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogKHBhdGg6IHN0cmluZykgPT4gKHsgcGF0aCB9KSxcclxuXHRcdFx0cmVhZDogYXN5bmMgKCkgPT4gZmlsZUNvbnRlbnQsXHJcblx0XHRcdG1vZGlmeTogYXN5bmMgKF9mOiBhbnksIHM6IHN0cmluZykgPT4gKGZpbGVDb250ZW50ID0gcyksXHJcblx0XHR9O1xyXG5cdFx0Y29uc3QgYXBwID0gbmV3IEFwcCgpO1xyXG5cdFx0Y29uc3QgbWV0YWRhdGFDYWNoZSA9IG5ldyBNZXRhZGF0YUNhY2hlKCk7XHJcblx0XHQoYXBwIGFzIGFueSkud29ya3NwYWNlID0ge1xyXG5cdFx0XHQuLi4oYXBwIGFzIGFueSkud29ya3NwYWNlLFxyXG5cdFx0XHR0cmlnZ2VyOiBqZXN0LmZuKCksXHJcblx0XHRcdG9uOiBqZXN0LmZuKCgpID0+ICh7IHVubG9hZDogKCkgPT4ge30gfSkpLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IHBsdWdpbjogYW55ID0ge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsXHJcblx0XHRcdFx0cHJvamVjdFRhZ1ByZWZpeDogeyB0YXNrczogXCJwcm9qZWN0XCIsIGRhdGF2aWV3OiBcInByb2plY3RcIiB9LFxyXG5cdFx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHsgdGFza3M6IFwiQFwiLCBkYXRhdmlldzogXCJjb250ZXh0XCIgfSxcclxuXHRcdFx0XHR0YXNrU3RhdHVzZXM6IHsgY29tcGxldGVkOiBcInhcIiB9LFxyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0bWFuYWdlU3RhcnREYXRlOiB0cnVlLFxyXG5cdFx0XHRcdFx0bWFuYWdlQ2FuY2VsbGVkRGF0ZTogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRjb25zdCBnZXRUYXNrQnlJZCA9IGFzeW5jIChpZDogc3RyaW5nKTogUHJvbWlzZTxUYXNrIHwgbnVsbD4gPT5cclxuXHRcdFx0aWQgPT09IFwiM1wiXHJcblx0XHRcdFx0PyAoe1xyXG5cdFx0XHRcdFx0XHRpZDogXCIzXCIsXHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IFwiMTIzMTIzIFtwcm9qdDo6bmV3XVwiLFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhOiB7fSBhcyBhbnksXHJcblx0XHRcdFx0ICB9IGFzIFRhc2spXHJcblx0XHRcdFx0OiBudWxsO1xyXG5cdFx0Y29uc3Qgd3JpdGVBUEkgPSBuZXcgV3JpdGVBUEkoXHJcblx0XHRcdGFwcCBhcyBhbnksXHJcblx0XHRcdGZha2VWYXVsdCxcclxuXHRcdFx0bWV0YWRhdGFDYWNoZSBhcyBhbnksXHJcblx0XHRcdHBsdWdpbixcclxuXHRcdFx0Z2V0VGFza0J5SWRcclxuXHRcdCk7XHJcblx0XHRjb25zdCByZXMgPSBhd2FpdCB3cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0dGFza0lkOiBcIjNcIixcclxuXHRcdFx0dXBkYXRlczogeyBzdGF0dXM6IFwiPlwiIH0sXHJcblx0XHR9KTtcclxuXHRcdGV4cGVjdChyZXMuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdGV4cGVjdChmaWxlQ29udGVudCkudG9Db250YWluKFwiLSBbPl0gMTIzMTIzIFtwcm9qdDo6bmV3XVwiKTtcclxuXHRcdGV4cGVjdChmaWxlQ29udGVudCkudG9NYXRjaCgv8J+bq1xccypcXGR7NH0tXFxkezJ9LVxcZHsyfS8pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19