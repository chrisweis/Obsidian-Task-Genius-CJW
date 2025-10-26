/**
 * Tests for FileMetadataTaskParser and FileMetadataTaskUpdater
 */
import { __awaiter } from "tslib";
import { FileMetadataTaskParser } from "../parsers/file-metadata-parser";
import { FileMetadataTaskUpdater } from "../parsers/file-metadata-updater";
describe("FileMetadataTaskParser", () => {
    let parser;
    let config;
    beforeEach(() => {
        config = {
            enableFileMetadataParsing: true,
            metadataFieldsToParseAsTasks: [
                "dueDate",
                "todo",
                "complete",
                "task",
            ],
            enableTagBasedTaskParsing: true,
            tagsToParseAsTasks: ["#todo", "#task", "#action", "#due"],
            taskContentFromMetadata: "title",
            defaultTaskStatus: " ",
            enableWorkerProcessing: true,
            enableMtimeOptimization: false,
            mtimeCacheSize: 1000,
        };
        parser = new FileMetadataTaskParser(config);
    });
    describe("parseFileForTasks", () => {
        it("should parse tasks from file metadata", () => {
            const filePath = "test.md";
            const fileContent = "# Test File\n\nSome content here.";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    dueDate: "2024-01-15",
                    todo: true,
                    priority: 2,
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(2); // One for dueDate, one for todo
            // Check dueDate task
            const dueDateTask = result.tasks.find((t) => t.metadata.sourceField ===
                "dueDate");
            expect(dueDateTask).toBeDefined();
            expect(dueDateTask === null || dueDateTask === void 0 ? void 0 : dueDateTask.content).toBe("Test Task");
            expect(dueDateTask === null || dueDateTask === void 0 ? void 0 : dueDateTask.status).toBe(" "); // Due dates are typically incomplete
            expect(dueDateTask === null || dueDateTask === void 0 ? void 0 : dueDateTask.metadata.dueDate).toBeDefined();
            // Check todo task
            const todoTask = result.tasks.find((t) => t.metadata.sourceField ===
                "todo");
            expect(todoTask).toBeDefined();
            expect(todoTask === null || todoTask === void 0 ? void 0 : todoTask.content).toBe("Test Task");
            expect(todoTask === null || todoTask === void 0 ? void 0 : todoTask.status).toBe("x"); // todo: true should be completed
        });
        it("should parse tasks from file tags", () => {
            const filePath = "test.md";
            const fileContent = "# Test File\n\nSome content here.";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                },
                tags: [
                    {
                        tag: "#todo",
                        position: {
                            start: { line: 0, col: 0 },
                            end: { line: 0, col: 5 },
                        },
                    },
                    {
                        tag: "#action",
                        position: {
                            start: { line: 1, col: 0 },
                            end: { line: 1, col: 7 },
                        },
                    },
                ],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(2); // One for #todo, one for #action
            // Check todo tag task
            const todoTask = result.tasks.find((t) => t.metadata.sourceTag ===
                "#todo");
            expect(todoTask).toBeDefined();
            expect(todoTask === null || todoTask === void 0 ? void 0 : todoTask.content).toBe("Test Task");
            expect(todoTask === null || todoTask === void 0 ? void 0 : todoTask.status).toBe(" "); // Default status
            // Check action tag task
            const actionTask = result.tasks.find((t) => t.metadata.sourceTag ===
                "#action");
            expect(actionTask).toBeDefined();
            expect(actionTask === null || actionTask === void 0 ? void 0 : actionTask.content).toBe("Test Task");
            expect(actionTask === null || actionTask === void 0 ? void 0 : actionTask.status).toBe(" "); // Default status
        });
        it("should use filename when title metadata is not available", () => {
            const filePath = "My Important Task.md";
            const fileContent = "# Test File\n\nSome content here.";
            const fileCache = {
                frontmatter: {
                    dueDate: "2024-01-15",
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(1);
            expect(result.tasks[0].content).toBe("My Important Task"); // Filename without extension
        });
        it("should handle different task status determination", () => {
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    complete: true,
                    todo: false,
                    dueDate: "2024-01-15",
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(3); // complete, todo, dueDate
            // Check complete task
            const completeTask = result.tasks.find((t) => t.metadata.sourceField ===
                "complete");
            expect(completeTask === null || completeTask === void 0 ? void 0 : completeTask.status).toBe("x"); // complete: true should be completed
            // Check todo task
            const todoTask = result.tasks.find((t) => t.metadata.sourceField ===
                "todo");
            expect(todoTask === null || todoTask === void 0 ? void 0 : todoTask.status).toBe(" "); // todo: false should be incomplete
            // Check dueDate task
            const dueDateTask = result.tasks.find((t) => t.metadata.sourceField ===
                "dueDate");
            expect(dueDateTask === null || dueDateTask === void 0 ? void 0 : dueDateTask.status).toBe(" "); // Due dates are typically incomplete
        });
        it("should not create tasks when parsing is disabled", () => {
            const disabledConfig = {
                enableFileMetadataParsing: false,
                metadataFieldsToParseAsTasks: ["dueDate", "todo"],
                enableTagBasedTaskParsing: false,
                tagsToParseAsTasks: ["#todo"],
                taskContentFromMetadata: "title",
                defaultTaskStatus: " ",
                enableWorkerProcessing: true,
                enableMtimeOptimization: false,
                mtimeCacheSize: 1000,
            };
            const disabledParser = new FileMetadataTaskParser(disabledConfig);
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    dueDate: "2024-01-15",
                },
                tags: [
                    {
                        tag: "#todo",
                        position: {
                            start: { line: 0, col: 0 },
                            end: { line: 0, col: 5 },
                        },
                    },
                ],
            };
            const result = disabledParser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(0); // No tasks should be created
        });
        it("should extract additional metadata correctly", () => {
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    dueDate: "2024-01-15",
                    priority: "high",
                    project: "Work Project",
                    context: "office",
                    area: "development",
                    tags: ["important", "urgent"],
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.errors).toHaveLength(0);
            expect(result.tasks).toHaveLength(1);
            const task = result.tasks[0];
            expect(task.metadata.priority).toBe(3); // "high" should be converted to 3
            expect(task.metadata.project).toBe("Work Project");
            expect(task.metadata.context).toBe("office");
            expect(task.metadata.area).toBe("development");
            expect(task.metadata.tags).toEqual(["important", "urgent"]);
        });
        it("should handle errors gracefully", () => {
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = null; // This should not cause a crash
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.tasks).toHaveLength(0);
            expect(result.errors).toHaveLength(0); // Should handle gracefully without errors
        });
    });
    describe("date parsing", () => {
        it("should parse various date formats", () => {
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    dueDate: "2024-01-15",
                    startDate: new Date("2024-01-10"),
                    scheduledDate: 1705276800000, // Timestamp
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.tasks).toHaveLength(1); // Only dueDate is in the configured fields
            const task = result.tasks[0];
            expect(task.metadata.dueDate).toBeDefined();
            expect(typeof task.metadata.dueDate).toBe("number");
        });
    });
    describe("priority parsing", () => {
        it("should parse various priority formats", () => {
            const filePath = "test.md";
            const fileContent = "# Test File";
            const fileCache = {
                frontmatter: {
                    title: "Test Task",
                    dueDate: "2024-01-15",
                    priority: "medium",
                },
                tags: [],
            };
            const result = parser.parseFileForTasks(filePath, fileContent, fileCache);
            expect(result.tasks).toHaveLength(1);
            const task = result.tasks[0];
            expect(task.metadata.priority).toBe(2); // "medium" should be converted to 2
        });
    });
});
describe("FileMetadataTaskUpdater", () => {
    let updater;
    let config;
    let mockApp;
    beforeEach(() => {
        config = {
            enableFileMetadataParsing: true,
            metadataFieldsToParseAsTasks: [
                "dueDate",
                "todo",
                "complete",
                "task",
            ],
            enableTagBasedTaskParsing: true,
            tagsToParseAsTasks: ["#todo", "#task", "#action", "#due"],
            taskContentFromMetadata: "title",
            defaultTaskStatus: " ",
            enableWorkerProcessing: true,
            enableMtimeOptimization: false,
            mtimeCacheSize: 1000,
        };
        // Mock Obsidian App
        mockApp = {
            vault: {
                getFileByPath: jest.fn(),
                read: jest.fn(),
                rename: jest.fn(),
            },
            fileManager: {
                processFrontMatter: jest.fn(),
            },
        };
        updater = new FileMetadataTaskUpdater(mockApp, config);
    });
    describe("isFileMetadataTask", () => {
        it("should identify file metadata tasks", () => {
            const metadataTask = {
                id: "test.md-metadata-dueDate",
                content: "Test Task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test Task",
                metadata: {
                    source: "file-metadata",
                    sourceField: "dueDate",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const tagTask = {
                id: "test.md-tag-todo",
                content: "Test Task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test Task",
                metadata: {
                    source: "file-tag",
                    sourceTag: "#todo",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const regularTask = {
                id: "test.md-L5",
                content: "Regular Task",
                filePath: "test.md",
                line: 5,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Regular Task",
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(updater.isFileMetadataTask(metadataTask)).toBe(true);
            expect(updater.isFileMetadataTask(tagTask)).toBe(true);
            expect(updater.isFileMetadataTask(regularTask)).toBe(false);
        });
    });
    describe("updateFileMetadataTask", () => {
        it("should handle file not found error", () => __awaiter(void 0, void 0, void 0, function* () {
            const originalTask = {
                id: "nonexistent.md-metadata-dueDate",
                content: "Test Task",
                filePath: "nonexistent.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test Task",
                metadata: {
                    source: "file-metadata",
                    sourceField: "dueDate",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const updatedTask = Object.assign(Object.assign({}, originalTask), { completed: true, status: "x" });
            mockApp.vault.getFileByPath.mockReturnValue(null);
            const result = yield updater.updateFileMetadataTask(originalTask, updatedTask);
            expect(result.success).toBe(false);
            expect(result.error).toContain("File not found");
        }));
        it("should handle non-file-metadata tasks", () => __awaiter(void 0, void 0, void 0, function* () {
            const regularTask = {
                id: "test.md-L5",
                content: "Regular Task",
                filePath: "test.md",
                line: 5,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Regular Task",
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const updatedTask = Object.assign(Object.assign({}, regularTask), { completed: true, status: "x" });
            const result = yield updater.updateFileMetadataTask(regularTask, updatedTask);
            expect(result.success).toBe(false);
            expect(result.error).toContain("not a file metadata task");
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZU1ldGFkYXRhVGFza1BhcnNlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZU1ldGFkYXRhVGFza1BhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHOztBQUVILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSTNFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdkMsSUFBSSxNQUE4QixDQUFDO0lBQ25DLElBQUksTUFBZ0MsQ0FBQztJQUVyQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsTUFBTSxHQUFHO1lBQ1IseUJBQXlCLEVBQUUsSUFBSTtZQUMvQiw0QkFBNEIsRUFBRTtnQkFDN0IsU0FBUztnQkFDVCxNQUFNO2dCQUNOLFVBQVU7Z0JBQ1YsTUFBTTthQUNOO1lBQ0QseUJBQXlCLEVBQUUsSUFBSTtZQUMvQixrQkFBa0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQztZQUN6RCx1QkFBdUIsRUFBRSxPQUFPO1lBQ2hDLGlCQUFpQixFQUFFLEdBQUc7WUFDdEIsc0JBQXNCLEVBQUUsSUFBSTtZQUM1Qix1QkFBdUIsRUFBRSxLQUFLO1lBQzlCLGNBQWMsRUFBRSxJQUFJO1NBQ3BCLENBQUM7UUFDRixNQUFNLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsRUFBRSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUM7WUFDM0IsTUFBTSxXQUFXLEdBQUcsbUNBQW1DLENBQUM7WUFDeEQsTUFBTSxTQUFTLEdBQUc7Z0JBQ2pCLFdBQVcs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Q0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUZXN0cyBmb3IgRmlsZU1ldGFkYXRhVGFza1BhcnNlciBhbmQgRmlsZU1ldGFkYXRhVGFza1VwZGF0ZXJcclxuICovXHJcblxyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFUYXNrUGFyc2VyIH0gZnJvbSBcIi4uL3BhcnNlcnMvZmlsZS1tZXRhZGF0YS1wYXJzZXJcIjtcclxuaW1wb3J0IHsgRmlsZU1ldGFkYXRhVGFza1VwZGF0ZXIgfSBmcm9tIFwiLi4vcGFyc2Vycy9maWxlLW1ldGFkYXRhLXVwZGF0ZXJcIjtcclxuaW1wb3J0IHsgRmlsZVBhcnNpbmdDb25maWd1cmF0aW9uIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhLCBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbmRlc2NyaWJlKFwiRmlsZU1ldGFkYXRhVGFza1BhcnNlclwiLCAoKSA9PiB7XHJcblx0bGV0IHBhcnNlcjogRmlsZU1ldGFkYXRhVGFza1BhcnNlcjtcclxuXHRsZXQgY29uZmlnOiBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb247XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0Y29uZmlnID0ge1xyXG5cdFx0XHRlbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nOiB0cnVlLFxyXG5cdFx0XHRtZXRhZGF0YUZpZWxkc1RvUGFyc2VBc1Rhc2tzOiBbXHJcblx0XHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XCJ0b2RvXCIsXHJcblx0XHRcdFx0XCJjb21wbGV0ZVwiLFxyXG5cdFx0XHRcdFwidGFza1wiLFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRlbmFibGVUYWdCYXNlZFRhc2tQYXJzaW5nOiB0cnVlLFxyXG5cdFx0XHR0YWdzVG9QYXJzZUFzVGFza3M6IFtcIiN0b2RvXCIsIFwiI3Rhc2tcIiwgXCIjYWN0aW9uXCIsIFwiI2R1ZVwiXSxcclxuXHRcdFx0dGFza0NvbnRlbnRGcm9tTWV0YWRhdGE6IFwidGl0bGVcIixcclxuXHRcdFx0ZGVmYXVsdFRhc2tTdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0XHRlbmFibGVNdGltZU9wdGltaXphdGlvbjogZmFsc2UsXHJcblx0XHRcdG10aW1lQ2FjaGVTaXplOiAxMDAwLFxyXG5cdFx0fTtcclxuXHRcdHBhcnNlciA9IG5ldyBGaWxlTWV0YWRhdGFUYXNrUGFyc2VyKGNvbmZpZyk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwicGFyc2VGaWxlRm9yVGFza3NcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcGFyc2UgdGFza3MgZnJvbSBmaWxlIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBcIiMgVGVzdCBGaWxlXFxuXFxuU29tZSBjb250ZW50IGhlcmUuXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjoge1xyXG5cdFx0XHRcdFx0dGl0bGU6IFwiVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBcIjIwMjQtMDEtMTVcIixcclxuXHRcdFx0XHRcdHRvZG86IHRydWUsXHJcblx0XHRcdFx0XHRwcmlvcml0eTogMixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VyLnBhcnNlRmlsZUZvclRhc2tzKFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVDYWNoZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCgwKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50YXNrcykudG9IYXZlTGVuZ3RoKDIpOyAvLyBPbmUgZm9yIGR1ZURhdGUsIG9uZSBmb3IgdG9kb1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZHVlRGF0ZSB0YXNrXHJcblx0XHRcdGNvbnN0IGR1ZURhdGVUYXNrID0gcmVzdWx0LnRhc2tzLmZpbmQoXHJcblx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHQodC5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZUZpZWxkID09PVxyXG5cdFx0XHRcdFx0XCJkdWVEYXRlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGR1ZURhdGVUYXNrKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoZHVlRGF0ZVRhc2s/LmNvbnRlbnQpLnRvQmUoXCJUZXN0IFRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChkdWVEYXRlVGFzaz8uc3RhdHVzKS50b0JlKFwiIFwiKTsgLy8gRHVlIGRhdGVzIGFyZSB0eXBpY2FsbHkgaW5jb21wbGV0ZVxyXG5cdFx0XHRleHBlY3QoZHVlRGF0ZVRhc2s/Lm1ldGFkYXRhLmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0b2RvIHRhc2tcclxuXHRcdFx0Y29uc3QgdG9kb1Rhc2sgPSByZXN1bHQudGFza3MuZmluZChcclxuXHRcdFx0XHQodCkgPT5cclxuXHRcdFx0XHRcdCh0Lm1ldGFkYXRhIGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSkuc291cmNlRmllbGQgPT09XHJcblx0XHRcdFx0XHRcInRvZG9cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodG9kb1Rhc2spLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0b2RvVGFzaz8uY29udGVudCkudG9CZShcIlRlc3QgVGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRvZG9UYXNrPy5zdGF0dXMpLnRvQmUoXCJ4XCIpOyAvLyB0b2RvOiB0cnVlIHNob3VsZCBiZSBjb21wbGV0ZWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHRhc2tzIGZyb20gZmlsZSB0YWdzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBcIiMgVGVzdCBGaWxlXFxuXFxuU29tZSBjb250ZW50IGhlcmUuXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjoge1xyXG5cdFx0XHRcdFx0dGl0bGU6IFwiVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0YWdzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCIjdG9kb1wiLFxyXG5cdFx0XHRcdFx0XHRwb3NpdGlvbjoge1xyXG5cdFx0XHRcdFx0XHRcdHN0YXJ0OiB7IGxpbmU6IDAsIGNvbDogMCB9LFxyXG5cdFx0XHRcdFx0XHRcdGVuZDogeyBsaW5lOiAwLCBjb2w6IDUgfSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCIjYWN0aW9uXCIsXHJcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiB7XHJcblx0XHRcdFx0XHRcdFx0c3RhcnQ6IHsgbGluZTogMSwgY29sOiAwIH0sXHJcblx0XHRcdFx0XHRcdFx0ZW5kOiB7IGxpbmU6IDEsIGNvbDogNyB9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VyLnBhcnNlRmlsZUZvclRhc2tzKFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVDYWNoZSBhcyBhbnlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGFza3MpLnRvSGF2ZUxlbmd0aCgyKTsgLy8gT25lIGZvciAjdG9kbywgb25lIGZvciAjYWN0aW9uXHJcblxyXG5cdFx0XHQvLyBDaGVjayB0b2RvIHRhZyB0YXNrXHJcblx0XHRcdGNvbnN0IHRvZG9UYXNrID0gcmVzdWx0LnRhc2tzLmZpbmQoXHJcblx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHQodC5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZVRhZyA9PT1cclxuXHRcdFx0XHRcdFwiI3RvZG9cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodG9kb1Rhc2spLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0b2RvVGFzaz8uY29udGVudCkudG9CZShcIlRlc3QgVGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRvZG9UYXNrPy5zdGF0dXMpLnRvQmUoXCIgXCIpOyAvLyBEZWZhdWx0IHN0YXR1c1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgYWN0aW9uIHRhZyB0YXNrXHJcblx0XHRcdGNvbnN0IGFjdGlvblRhc2sgPSByZXN1bHQudGFza3MuZmluZChcclxuXHRcdFx0XHQodCkgPT5cclxuXHRcdFx0XHRcdCh0Lm1ldGFkYXRhIGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSkuc291cmNlVGFnID09PVxyXG5cdFx0XHRcdFx0XCIjYWN0aW9uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGFjdGlvblRhc2spLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChhY3Rpb25UYXNrPy5jb250ZW50KS50b0JlKFwiVGVzdCBUYXNrXCIpO1xyXG5cdFx0XHRleHBlY3QoYWN0aW9uVGFzaz8uc3RhdHVzKS50b0JlKFwiIFwiKTsgLy8gRGVmYXVsdCBzdGF0dXNcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHVzZSBmaWxlbmFtZSB3aGVuIHRpdGxlIG1ldGFkYXRhIGlzIG5vdCBhdmFpbGFibGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwiTXkgSW1wb3J0YW50IFRhc2subWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBcIiMgVGVzdCBGaWxlXFxuXFxuU29tZSBjb250ZW50IGhlcmUuXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjoge1xyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogXCIyMDI0LTAxLTE1XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHBhcnNlci5wYXJzZUZpbGVGb3JUYXNrcyhcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRmaWxlQ2FjaGVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50YXNrc1swXS5jb250ZW50KS50b0JlKFwiTXkgSW1wb3J0YW50IFRhc2tcIik7IC8vIEZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZGlmZmVyZW50IHRhc2sgc3RhdHVzIGRldGVybWluYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IFwiIyBUZXN0IEZpbGVcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNhY2hlID0ge1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJUZXN0IFRhc2tcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlOiB0cnVlLFxyXG5cdFx0XHRcdFx0dG9kbzogZmFsc2UsXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBcIjIwMjQtMDEtMTVcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VyLnBhcnNlRmlsZUZvclRhc2tzKFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVDYWNoZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCgwKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50YXNrcykudG9IYXZlTGVuZ3RoKDMpOyAvLyBjb21wbGV0ZSwgdG9kbywgZHVlRGF0ZVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgY29tcGxldGUgdGFza1xyXG5cdFx0XHRjb25zdCBjb21wbGV0ZVRhc2sgPSByZXN1bHQudGFza3MuZmluZChcclxuXHRcdFx0XHQodCkgPT5cclxuXHRcdFx0XHRcdCh0Lm1ldGFkYXRhIGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSkuc291cmNlRmllbGQgPT09XHJcblx0XHRcdFx0XHRcImNvbXBsZXRlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGNvbXBsZXRlVGFzaz8uc3RhdHVzKS50b0JlKFwieFwiKTsgLy8gY29tcGxldGU6IHRydWUgc2hvdWxkIGJlIGNvbXBsZXRlZFxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdG9kbyB0YXNrXHJcblx0XHRcdGNvbnN0IHRvZG9UYXNrID0gcmVzdWx0LnRhc2tzLmZpbmQoXHJcblx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHQodC5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZUZpZWxkID09PVxyXG5cdFx0XHRcdFx0XCJ0b2RvXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHRvZG9UYXNrPy5zdGF0dXMpLnRvQmUoXCIgXCIpOyAvLyB0b2RvOiBmYWxzZSBzaG91bGQgYmUgaW5jb21wbGV0ZVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZHVlRGF0ZSB0YXNrXHJcblx0XHRcdGNvbnN0IGR1ZURhdGVUYXNrID0gcmVzdWx0LnRhc2tzLmZpbmQoXHJcblx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHQodC5tZXRhZGF0YSBhcyBTdGFuZGFyZEZpbGVUYXNrTWV0YWRhdGEpLnNvdXJjZUZpZWxkID09PVxyXG5cdFx0XHRcdFx0XCJkdWVEYXRlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGR1ZURhdGVUYXNrPy5zdGF0dXMpLnRvQmUoXCIgXCIpOyAvLyBEdWUgZGF0ZXMgYXJlIHR5cGljYWxseSBpbmNvbXBsZXRlXHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBub3QgY3JlYXRlIHRhc2tzIHdoZW4gcGFyc2luZyBpcyBkaXNhYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRpc2FibGVkQ29uZmlnOiBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb24gPSB7XHJcblx0XHRcdFx0ZW5hYmxlRmlsZU1ldGFkYXRhUGFyc2luZzogZmFsc2UsXHJcblx0XHRcdFx0bWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrczogW1wiZHVlRGF0ZVwiLCBcInRvZG9cIl0sXHJcblx0XHRcdFx0ZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZzogZmFsc2UsXHJcblx0XHRcdFx0dGFnc1RvUGFyc2VBc1Rhc2tzOiBbXCIjdG9kb1wiXSxcclxuXHRcdFx0XHR0YXNrQ29udGVudEZyb21NZXRhZGF0YTogXCJ0aXRsZVwiLFxyXG5cdFx0XHRcdGRlZmF1bHRUYXNrU3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZU10aW1lT3B0aW1pemF0aW9uOiBmYWxzZSxcclxuXHRcdFx0XHRtdGltZUNhY2hlU2l6ZTogMTAwMCxcclxuXHRcdFx0fTtcclxuXHRcdFx0Y29uc3QgZGlzYWJsZWRQYXJzZXIgPSBuZXcgRmlsZU1ldGFkYXRhVGFza1BhcnNlcihkaXNhYmxlZENvbmZpZyk7XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IFwiIyBUZXN0IEZpbGVcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNhY2hlID0ge1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJUZXN0IFRhc2tcIixcclxuXHRcdFx0XHRcdGR1ZURhdGU6IFwiMjAyNC0wMS0xNVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGFnczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiI3RvZG9cIixcclxuXHRcdFx0XHRcdFx0cG9zaXRpb246IHtcclxuXHRcdFx0XHRcdFx0XHRzdGFydDogeyBsaW5lOiAwLCBjb2w6IDAgfSxcclxuXHRcdFx0XHRcdFx0XHRlbmQ6IHsgbGluZTogMCwgY29sOiA1IH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkaXNhYmxlZFBhcnNlci5wYXJzZUZpbGVGb3JUYXNrcyhcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRmaWxlQ2FjaGUgYXMgYW55XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9ycykudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRhc2tzKS50b0hhdmVMZW5ndGgoMCk7IC8vIE5vIHRhc2tzIHNob3VsZCBiZSBjcmVhdGVkXHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBleHRyYWN0IGFkZGl0aW9uYWwgbWV0YWRhdGEgY29ycmVjdGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBcIiMgVGVzdCBGaWxlXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjoge1xyXG5cdFx0XHRcdFx0dGl0bGU6IFwiVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBcIjIwMjQtMDEtMTVcIixcclxuXHRcdFx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIixcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiV29yayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRjb250ZXh0OiBcIm9mZmljZVwiLFxyXG5cdFx0XHRcdFx0YXJlYTogXCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdFx0dGFnczogW1wiaW1wb3J0YW50XCIsIFwidXJnZW50XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBwYXJzZXIucGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZUNhY2hlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9ycykudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gcmVzdWx0LnRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSgzKTsgLy8gXCJoaWdoXCIgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byAzXHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnByb2plY3QpLnRvQmUoXCJXb3JrIFByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLmNvbnRleHQpLnRvQmUoXCJvZmZpY2VcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLmFyZWEpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEudGFncykudG9FcXVhbChbXCJpbXBvcnRhbnRcIiwgXCJ1cmdlbnRcIl0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGVycm9ycyBncmFjZWZ1bGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBcIiMgVGVzdCBGaWxlXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IG51bGw7IC8vIFRoaXMgc2hvdWxkIG5vdCBjYXVzZSBhIGNyYXNoXHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBwYXJzZXIucGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZUNhY2hlIGFzIGFueVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50YXNrcykudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9ycykudG9IYXZlTGVuZ3RoKDApOyAvLyBTaG91bGQgaGFuZGxlIGdyYWNlZnVsbHkgd2l0aG91dCBlcnJvcnNcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImRhdGUgcGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBwYXJzZSB2YXJpb3VzIGRhdGUgZm9ybWF0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJ0ZXN0Lm1kXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gXCIjIFRlc3QgRmlsZVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlQ2FjaGUgPSB7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IHtcclxuXHRcdFx0XHRcdHRpdGxlOiBcIlRlc3QgVGFza1wiLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogXCIyMDI0LTAxLTE1XCIsXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xMFwiKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IDE3MDUyNzY4MDAwMDAsIC8vIFRpbWVzdGFtcFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBwYXJzZXIucGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZUNhY2hlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRhc2tzKS50b0hhdmVMZW5ndGgoMSk7IC8vIE9ubHkgZHVlRGF0ZSBpcyBpbiB0aGUgY29uZmlndXJlZCBmaWVsZHNcclxuXHRcdFx0Y29uc3QgdGFzayA9IHJlc3VsdC50YXNrc1swXTtcclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEuZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHR5cGVvZiB0YXNrLm1ldGFkYXRhLmR1ZURhdGUpLnRvQmUoXCJudW1iZXJcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJwcmlvcml0eSBwYXJzaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHBhcnNlIHZhcmlvdXMgcHJpb3JpdHkgZm9ybWF0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gXCJ0ZXN0Lm1kXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gXCIjIFRlc3QgRmlsZVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlQ2FjaGUgPSB7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IHtcclxuXHRcdFx0XHRcdHRpdGxlOiBcIlRlc3QgVGFza1wiLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogXCIyMDI0LTAxLTE1XCIsXHJcblx0XHRcdFx0XHRwcmlvcml0eTogXCJtZWRpdW1cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VyLnBhcnNlRmlsZUZvclRhc2tzKFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVDYWNoZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gcmVzdWx0LnRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSgyKTsgLy8gXCJtZWRpdW1cIiBzaG91bGQgYmUgY29udmVydGVkIHRvIDJcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbmRlc2NyaWJlKFwiRmlsZU1ldGFkYXRhVGFza1VwZGF0ZXJcIiwgKCkgPT4ge1xyXG5cdGxldCB1cGRhdGVyOiBGaWxlTWV0YWRhdGFUYXNrVXBkYXRlcjtcclxuXHRsZXQgY29uZmlnOiBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb247XHJcblx0bGV0IG1vY2tBcHA6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRjb25maWcgPSB7XHJcblx0XHRcdGVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmc6IHRydWUsXHJcblx0XHRcdG1ldGFkYXRhRmllbGRzVG9QYXJzZUFzVGFza3M6IFtcclxuXHRcdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcInRvZG9cIixcclxuXHRcdFx0XHRcImNvbXBsZXRlXCIsXHJcblx0XHRcdFx0XCJ0YXNrXCIsXHJcblx0XHRcdF0sXHJcblx0XHRcdGVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmc6IHRydWUsXHJcblx0XHRcdHRhZ3NUb1BhcnNlQXNUYXNrczogW1wiI3RvZG9cIiwgXCIjdGFza1wiLCBcIiNhY3Rpb25cIiwgXCIjZHVlXCJdLFxyXG5cdFx0XHR0YXNrQ29udGVudEZyb21NZXRhZGF0YTogXCJ0aXRsZVwiLFxyXG5cdFx0XHRkZWZhdWx0VGFza1N0YXR1czogXCIgXCIsXHJcblx0XHRcdGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRcdGVuYWJsZU10aW1lT3B0aW1pemF0aW9uOiBmYWxzZSxcclxuXHRcdFx0bXRpbWVDYWNoZVNpemU6IDEwMDAsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIE1vY2sgT2JzaWRpYW4gQXBwXHJcblx0XHRtb2NrQXBwID0ge1xyXG5cdFx0XHR2YXVsdDoge1xyXG5cdFx0XHRcdGdldEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRyZWFkOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0cmVuYW1lOiBqZXN0LmZuKCksXHJcblx0XHRcdH0sXHJcblx0XHRcdGZpbGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0cHJvY2Vzc0Zyb250TWF0dGVyOiBqZXN0LmZuKCksXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdHVwZGF0ZXIgPSBuZXcgRmlsZU1ldGFkYXRhVGFza1VwZGF0ZXIobW9ja0FwcCwgY29uZmlnKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJpc0ZpbGVNZXRhZGF0YVRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaWRlbnRpZnkgZmlsZSBtZXRhZGF0YSB0YXNrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0Lm1kLW1ldGFkYXRhLWR1ZURhdGVcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgVGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgVGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2U6IFwiZmlsZS1tZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0c291cmNlRmllbGQ6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9IGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhZ1Rhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC5tZC10YWctdG9kb1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZTogXCJmaWxlLXRhZ1wiLFxyXG5cdFx0XHRcdFx0c291cmNlVGFnOiBcIiN0b2RvXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0gYXMgU3RhbmRhcmRGaWxlVGFza01ldGFkYXRhLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVndWxhclRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC5tZC1MNVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiUmVndWxhciBUYXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDUsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gUmVndWxhciBUYXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdCh1cGRhdGVyLmlzRmlsZU1ldGFkYXRhVGFzayhtZXRhZGF0YVRhc2spKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlci5pc0ZpbGVNZXRhZGF0YVRhc2sodGFnVGFzaykpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVyLmlzRmlsZU1ldGFkYXRhVGFzayhyZWd1bGFyVGFzaykpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwidXBkYXRlRmlsZU1ldGFkYXRhVGFza1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZmlsZSBub3QgZm91bmQgZXJyb3JcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibm9uZXhpc3RlbnQubWQtbWV0YWRhdGEtZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCBUYXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwibm9uZXhpc3RlbnQubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgVGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2U6IFwiZmlsZS1tZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0c291cmNlRmllbGQ6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9IGFzIFN0YW5kYXJkRmlsZVRhc2tNZXRhZGF0YSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0ge1xyXG5cdFx0XHRcdC4uLm9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobnVsbCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVyLnVwZGF0ZUZpbGVNZXRhZGF0YVRhc2soXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXCJGaWxlIG5vdCBmb3VuZFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBub24tZmlsZS1tZXRhZGF0YSB0YXNrc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlZ3VsYXJUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QubWQtTDVcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiA1LFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB1cGRhdGVkVGFzayA9IHtcclxuXHRcdFx0XHQuLi5yZWd1bGFyVGFzayxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZXIudXBkYXRlRmlsZU1ldGFkYXRhVGFzayhcclxuXHRcdFx0XHRyZWd1bGFyVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKFwibm90IGEgZmlsZSBtZXRhZGF0YSB0YXNrXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=