/**
 * File Metadata Inheritance Tests
 *
 * Tests for the independent file metadata inheritance functionality
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { getConfig } from "../common/task-parser-config";
import { createMockPlugin } from "./mockUtils";
import { DEFAULT_SETTINGS } from "../common/setting-definition";
describe("File Metadata Inheritance", () => {
    let parser;
    let mockPlugin;
    beforeEach(() => {
        mockPlugin = createMockPlugin(Object.assign(Object.assign({}, DEFAULT_SETTINGS), { fileMetadataInheritance: {
                enabled: true,
                inheritFromFrontmatter: true,
                inheritFromFrontmatterForSubtasks: false,
            }, projectConfig: {
                enableEnhancedProject: false,
                pathMappings: [],
                metadataConfig: {
                    metadataKey: "project",
                    enabled: false,
                },
                configFile: {
                    fileName: "project.md",
                    searchRecursively: false,
                    enabled: false,
                },
                metadataMappings: [],
                defaultProjectNaming: {
                    strategy: "filename",
                    stripExtension: false,
                    enabled: false,
                },
            } }));
        const config = getConfig("tasks", mockPlugin);
        parser = new MarkdownTaskParser(config);
    });
    describe("Basic Inheritance Functionality", () => {
        test("should inherit metadata when fileMetadataInheritance.enabled is true", () => {
            const content = "- [ ] Task without explicit metadata";
            const fileMetadata = {
                priority: "high",
                context: "office",
                area: "work",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBe(4); // "high" 被转换为数字 4
            expect(tasks[0].metadata.context).toBe("office");
            expect(tasks[0].metadata.area).toBe("work");
        });
        test("should not inherit metadata when fileMetadataInheritance.enabled is false", () => {
            // 禁用文件元数据继承
            mockPlugin.settings.fileMetadataInheritance.enabled = false;
            const config = getConfig("tasks", mockPlugin);
            parser = new MarkdownTaskParser(config);
            const content = "- [ ] Task without explicit metadata";
            const fileMetadata = {
                priority: "high",
                context: "office",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBeUndefined();
            expect(tasks[0].metadata.context).toBeUndefined();
        });
        test("should not inherit metadata when inheritFromFrontmatter is false", () => {
            // 启用继承功能但禁用frontmatter继承
            mockPlugin.settings.fileMetadataInheritance.inheritFromFrontmatter = false;
            const config = getConfig("tasks", mockPlugin);
            parser = new MarkdownTaskParser(config);
            const content = "- [ ] Task without explicit metadata";
            const fileMetadata = {
                priority: "high",
                context: "office",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBeUndefined();
            expect(tasks[0].metadata.context).toBeUndefined();
        });
    });
    describe("Independence from Project Features", () => {
        test("should work when enhanced project features are disabled", () => {
            // 确保项目功能完全禁用
            mockPlugin.settings.projectConfig.enableEnhancedProject = false;
            const config = getConfig("tasks", mockPlugin);
            parser = new MarkdownTaskParser(config);
            const content = "- [ ] Task should inherit metadata";
            const fileMetadata = {
                priority: "medium",
                context: "home",
                tags: ["personal"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBe(3); // "medium" 被转换为数字 3
            expect(tasks[0].metadata.context).toBe("home");
            // tags应该被继承，但不会覆盖非继承字段
        });
        test("should work independently of project configuration", () => {
            // 项目配置为null，验证不会崩溃
            mockPlugin.settings.projectConfig = null;
            const config = getConfig("tasks", mockPlugin);
            parser = new MarkdownTaskParser(config);
            const content = "- [ ] Task with inheritance";
            const fileMetadata = {
                priority: "low",
                area: "work", // 使用已知的可继承字段
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBe(2); // "low" 被转换为数字 2
            expect(tasks[0].metadata.area).toBe("work");
        });
    });
    describe("Subtask Inheritance", () => {
        test("should not inherit to subtasks when inheritFromFrontmatterForSubtasks is false", () => {
            const content = `- [ ] Parent task
  - [ ] Child task`;
            const fileMetadata = {
                priority: "urgent",
                context: "meeting",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(2);
            // 父任务应该继承
            expect(tasks[0].metadata.priority).toBe(5); // "urgent" 被转换为数字 5
            expect(tasks[0].metadata.context).toBe("meeting");
            // 子任务不应该继承（默认配置）
            expect(tasks[1].metadata.priority).toBeUndefined();
            expect(tasks[1].metadata.context).toBeUndefined();
        });
        test("should inherit to subtasks when inheritFromFrontmatterForSubtasks is true", () => {
            // 启用子任务继承
            mockPlugin.settings.fileMetadataInheritance.inheritFromFrontmatterForSubtasks = true;
            const config = getConfig("tasks", mockPlugin);
            parser = new MarkdownTaskParser(config);
            const content = `- [ ] Parent task
  - [ ] Child task
    - [ ] Grandchild task`;
            const fileMetadata = {
                priority: "urgent",
                context: "meeting",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(3);
            // 所有任务都应该继承
            tasks.forEach(task => {
                expect(task.metadata.priority).toBe(5); // "urgent" 被转换为数字 5
                expect(task.metadata.context).toBe("meeting");
            });
        });
    });
    describe("Priority Override", () => {
        test("should prioritize explicit task metadata over inherited metadata", () => {
            const content = "- [ ] Task with explicit priority @home 🔼";
            const fileMetadata = {
                priority: "low",
                context: "office",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            // 任务的显式context应该覆盖文件中的context
            expect(tasks[0].metadata.context).toBe("home");
            // 任务的显式priority应该覆盖文件中的priority
            expect(tasks[0].metadata.priority).toBeDefined();
            // 但不应该是文件中的"low"
            expect(tasks[0].metadata.priority).not.toBe("low");
        });
        test("should inherit only fields not explicitly set on task", () => {
            const content = "- [ ] Task with partial metadata @home";
            const fileMetadata = {
                priority: "high",
                context: "office",
                area: "work",
                project: "myproject", // 使用已知的可继承字段
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            // 任务显式设置的context应该优先
            expect(tasks[0].metadata.context).toBe("home");
            // 其他字段应该被继承
            expect(tasks[0].metadata.priority).toBe(4); // "high" 被转换为数字 4
            expect(tasks[0].metadata.area).toBe("work");
            expect(tasks[0].metadata.project).toBe("myproject");
        });
    });
    describe("Non-inheritable Fields", () => {
        test("should not inherit task-specific fields", () => {
            const content = "- [ ] Test task";
            const fileMetadata = {
                id: "should-not-inherit",
                content: "should-not-inherit",
                status: "should-not-inherit",
                completed: true,
                line: 999,
                lineNumber: 999,
                filePath: "should-not-inherit",
                heading: "should-not-inherit",
                priority: "high", // 这个应该被继承
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            // 任务特定字段不应该被继承
            expect(tasks[0].metadata.id).not.toBe("should-not-inherit");
            expect(tasks[0].content).toBe("Test task");
            expect(tasks[0].completed).toBe(false);
            expect(tasks[0].filePath).toBe("test.md");
            // 可继承字段应该被继承
            expect(tasks[0].metadata.priority).toBe(4); // "high" 被转换为数字 4
        });
    });
    describe("Complex Scenarios", () => {
        test("should handle mixed inheritance with multiple tasks", () => {
            const content = `- [ ] Task 1 with context @work
- [ ] Task 2 without metadata
- [ ] Task 3 with priority 🔺`;
            const fileMetadata = {
                priority: "medium",
                context: "home",
                area: "personal",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(3);
            // Task 1: 显式context，继承priority和area
            expect(tasks[0].metadata.context).toBe("work");
            expect(tasks[0].metadata.priority).toBe(3); // "medium" 被转换为数字 3
            expect(tasks[0].metadata.area).toBe("personal");
            // Task 2: 全部继承
            expect(tasks[1].metadata.context).toBe("home");
            expect(tasks[1].metadata.priority).toBe(3); // "medium" 被转换为数字 3
            expect(tasks[1].metadata.area).toBe("personal");
            // Task 3: 显式priority，继承context和area
            expect(tasks[2].metadata.context).toBe("home");
            expect(tasks[2].metadata.area).toBe("personal");
            expect(tasks[2].metadata.priority).toBeDefined();
            expect(tasks[2].metadata.priority).not.toBe("medium");
        });
        test("should handle empty file metadata gracefully", () => {
            const content = "- [ ] Task with no file metadata";
            const fileMetadata = {};
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].content).toBe("Task with no file metadata");
            // 没有元数据可继承，应该正常工作
        });
        test("should handle null file metadata gracefully", () => {
            const content = "- [ ] Task with null metadata";
            const tasks = parser.parseLegacy(content, "test.md", undefined);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].content).toBe("Task with null metadata");
            // 不应该崩溃
        });
    });
    describe("Priority Value Conversion", () => {
        test("should convert priority text values to appropriate format", () => {
            const content = "- [ ] Task with text priority";
            const fileMetadata = {
                priority: "high",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBeDefined();
            // 应该经过优先级转换处理
        });
        test("should handle numeric priority values", () => {
            const content = "- [ ] Task with numeric priority";
            const fileMetadata = {
                priority: 4,
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.priority).toBe(4); // 数字 4 保持为数字
        });
    });
    describe("Tags Inheritance", () => {
        test("should inherit tags from file metadata", () => {
            const content = "- [ ] Task without tags";
            const fileMetadata = {
                tags: ["#work", "#urgent", "#meeting"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tags).toBeDefined();
            expect(tasks[0].metadata.tags).toEqual(["#work", "#urgent", "#meeting"]);
        });
        test("should merge task tags with inherited tags", () => {
            const content = "- [ ] Task with existing tags #personal";
            const fileMetadata = {
                tags: ["#work", "#urgent"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tags).toBeDefined();
            expect(tasks[0].metadata.tags).toContain("#personal");
            expect(tasks[0].metadata.tags).toContain("#work");
            expect(tasks[0].metadata.tags).toContain("#urgent");
        });
        test("should not duplicate tags when merging", () => {
            const content = "- [ ] Task with duplicate tag #work";
            const fileMetadata = {
                tags: ["#work", "#urgent"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tags).toBeDefined();
            // Should only have one instance of #work
            const workTags = tasks[0].metadata.tags.filter((tag) => tag === "#work");
            expect(workTags).toHaveLength(1);
            expect(tasks[0].metadata.tags).toContain("#urgent");
        });
        test("should parse special tag formats from file metadata", () => {
            const content = "- [ ] Task inheriting project tag";
            const fileMetadata = {
                tags: ["#project/myproject", "#area/work", "#@/office"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.project).toBe("myproject");
            expect(tasks[0].metadata.area).toBe("work");
            expect(tasks[0].metadata.context).toBe("office");
            expect(tasks[0].metadata.tags).toContain("#project/myproject");
            expect(tasks[0].metadata.tags).toContain("#area/work");
            expect(tasks[0].metadata.tags).toContain("#@/office");
        });
        test("should prioritize task metadata over tag-derived metadata", () => {
            const content = "- [ ] Task with explicit project [project::taskproject]";
            const fileMetadata = {
                tags: ["#project/fileproject"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            // Task's explicit project should take precedence
            expect(tasks[0].metadata.project).toBe("taskproject");
            expect(tasks[0].metadata.tags).toContain("#project/fileproject");
        });
        test("should handle mixed tag formats in file metadata", () => {
            const content = "- [ ] Task with mixed tag inheritance";
            const fileMetadata = {
                tags: ["#regular-tag", "#project/myproject", "#normalTag", "#area/work"],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.project).toBe("myproject");
            expect(tasks[0].metadata.area).toBe("work");
            expect(tasks[0].metadata.tags).toContain("#regular-tag");
            expect(tasks[0].metadata.tags).toContain("#normalTag");
            expect(tasks[0].metadata.tags).toContain("#project/myproject");
            expect(tasks[0].metadata.tags).toContain("#area/work");
        });
        test("should handle empty tags array in file metadata", () => {
            const content = "- [ ] Task with empty tags";
            const fileMetadata = {
                tags: [],
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].metadata.tags).toEqual([]);
        });
        test("should handle non-array tags in file metadata", () => {
            const content = "- [ ] Task with non-array tags";
            const fileMetadata = {
                tags: "single-tag",
            };
            const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(1);
            // Should inherit as a single tag with # prefix
            expect(tasks[0].metadata.tags).toContain("#single-tag");
        });
    });
    describe("Configuration Migration", () => {
        test("should work with migrated settings", () => {
            // 模拟迁移后的设置结构
            const migratedPlugin = createMockPlugin(Object.assign(Object.assign({}, DEFAULT_SETTINGS), { fileMetadataInheritance: {
                    enabled: true,
                    inheritFromFrontmatter: true,
                    inheritFromFrontmatterForSubtasks: true,
                }, 
                // 旧的项目配置中没有继承设置
                projectConfig: {
                    enableEnhancedProject: false,
                    pathMappings: [],
                    metadataConfig: {
                        metadataKey: "project",
                        enabled: false,
                    },
                    configFile: {
                        fileName: "project.md",
                        searchRecursively: false,
                        enabled: false,
                    },
                    metadataMappings: [],
                    defaultProjectNaming: {
                        strategy: "filename",
                        stripExtension: false,
                        enabled: false,
                    },
                } }));
            const config = getConfig("tasks", migratedPlugin);
            const migratedParser = new MarkdownTaskParser(config);
            const content = `- [ ] Parent task
  - [ ] Child task`;
            const fileMetadata = {
                priority: "migrated",
                context: "test",
            };
            const tasks = migratedParser.parseLegacy(content, "test.md", fileMetadata);
            expect(tasks).toHaveLength(2);
            // 父任务和子任务都应该继承（因为迁移后启用了子任务继承）
            tasks.forEach(task => {
                expect(task.metadata.priority).toBe("migrated"); // 字符串值保持为字符串
                expect(task.metadata.context).toBe("test");
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDL0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFaEUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUMxQyxJQUFJLE1BQTBCLENBQUM7SUFDL0IsSUFBSSxVQUFlLENBQUM7SUFFcEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFVBQVUsR0FBRyxnQkFBZ0IsaUNBQ3pCLGdCQUFnQixLQUNuQix1QkFBdUIsRUFBRTtnQkFDeEIsT0FBTyxFQUFFLElBQUk7Z0JBQ2Isc0JBQXNCLEVBQUUsSUFBSTtnQkFDNUIsaUNBQWlDLEVBQUUsS0FBSzthQUN4QyxFQUNELGFBQWEsRUFBRTtnQkFDZCxxQkFBcUIsRUFBRSxLQUFLO2dCQUM1QixZQUFZLEVBQUUsRUFBRTtnQkFDaEIsY0FBYyxFQUFFO29CQUNmLFdBQVcsRUFBRSxTQUFTO29CQUN0QixPQUFPLEVBQUUsS0FBSztpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsUUFBUSxFQUFFLFlBQVk7b0JBQ3RCLGlCQUFpQixFQUFFLEtBQUs7b0JBQ3hCLE9BQU8sRUFBRSxLQUFLO2lCQUNkO2dCQUNELGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLG9CQUFvQixFQUFFO29CQUNyQixRQUFRLEVBQUUsVUFBVTtvQkFDcEIsY0FBYyxFQUFFLEtBQUs7b0JBQ3JCLE9BQU8sRUFBRSxLQUFLO2lCQUNkO2FBQ0QsSUFD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QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlIFRlc3RzXHJcbiAqIFxyXG4gKiBUZXN0cyBmb3IgdGhlIGluZGVwZW5kZW50IGZpbGUgbWV0YWRhdGEgaW5oZXJpdGFuY2UgZnVuY3Rpb25hbGl0eVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1hcmtkb3duVGFza1BhcnNlciB9IGZyb20gXCIuLi9kYXRhZmxvdy9jb3JlL0NvbmZpZ3VyYWJsZVRhc2tQYXJzZXJcIjtcclxuaW1wb3J0IHsgZ2V0Q29uZmlnIH0gZnJvbSBcIi4uL2NvbW1vbi90YXNrLXBhcnNlci1jb25maWdcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmRlc2NyaWJlKFwiRmlsZSBNZXRhZGF0YSBJbmhlcml0YW5jZVwiLCAoKSA9PiB7XHJcblx0bGV0IHBhcnNlcjogTWFya2Rvd25UYXNrUGFyc2VyO1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZToge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSxcclxuXHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiBmYWxzZSwgLy8gUHJvamVjdOWKn+iDveemgeeUqO+8jOmqjOivgeeLrOeri+aAp1xyXG5cdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRcdFx0ZmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBjb25maWcgPSBnZXRDb25maWcoXCJ0YXNrc1wiLCBtb2NrUGx1Z2luKTtcclxuXHRcdHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCYXNpYyBJbmhlcml0YW5jZSBGdW5jdGlvbmFsaXR5XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaW5oZXJpdCBtZXRhZGF0YSB3aGVuIGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQgaXMgdHJ1ZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aG91dCBleHBsaWNpdCBtZXRhZGF0YVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IFwiaGlnaFwiLFxyXG5cdFx0XHRcdGNvbnRleHQ6IFwib2ZmaWNlXCIsXHJcblx0XHRcdFx0YXJlYTogXCJ3b3JrXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoNCk7IC8vIFwiaGlnaFwiIOiiq+i9rOaNouS4uuaVsOWtlyA0XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5jb250ZXh0KS50b0JlKFwib2ZmaWNlXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuYXJlYSkudG9CZShcIndvcmtcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBpbmhlcml0IG1ldGFkYXRhIHdoZW4gZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UuZW5hYmxlZCBpcyBmYWxzZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIOemgeeUqOaWh+S7tuWFg+aVsOaNrue7p+aJv1xyXG5cdFx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQgPSBmYWxzZTtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKFwidGFza3NcIiwgbW9ja1BsdWdpbik7XHJcblx0XHRcdHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aG91dCBleHBsaWNpdCBtZXRhZGF0YVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IFwiaGlnaFwiLFxyXG5cdFx0XHRcdGNvbnRleHQ6IFwib2ZmaWNlXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLmNvbnRleHQpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IGluaGVyaXQgbWV0YWRhdGEgd2hlbiBpbmhlcml0RnJvbUZyb250bWF0dGVyIGlzIGZhbHNlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8g5ZCv55So57un5om/5Yqf6IO95L2G56aB55SoZnJvbnRtYXR0ZXLnu6fmib9cclxuXHRcdFx0bW9ja1BsdWdpbi5zZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5pbmhlcml0RnJvbUZyb250bWF0dGVyID0gZmFsc2U7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZyhcInRhc2tzXCIsIG1vY2tQbHVnaW4pO1xyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGhvdXQgZXhwbGljaXQgbWV0YWRhdGFcIjtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIixcclxuXHRcdFx0XHRjb250ZXh0OiBcIm9mZmljZVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5jb250ZXh0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJJbmRlcGVuZGVuY2UgZnJvbSBQcm9qZWN0IEZlYXR1cmVzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgd29yayB3aGVuIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXMgYXJlIGRpc2FibGVkXCIsICgpID0+IHtcclxuXHRcdFx0Ly8g56Gu5L+d6aG555uu5Yqf6IO95a6M5YWo56aB55SoXHJcblx0XHRcdG1vY2tQbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5lbmFibGVFbmhhbmNlZFByb2plY3QgPSBmYWxzZTtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKFwidGFza3NcIiwgbW9ja1BsdWdpbik7XHJcblx0XHRcdHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgc2hvdWxkIGluaGVyaXQgbWV0YWRhdGFcIjtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHByaW9yaXR5OiBcIm1lZGl1bVwiLFxyXG5cdFx0XHRcdGNvbnRleHQ6IFwiaG9tZVwiLFxyXG5cdFx0XHRcdHRhZ3M6IFtcInBlcnNvbmFsXCJdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlKDMpOyAvLyBcIm1lZGl1bVwiIOiiq+i9rOaNouS4uuaVsOWtlyAzXHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5jb250ZXh0KS50b0JlKFwiaG9tZVwiKTtcclxuXHRcdFx0Ly8gdGFnc+W6lOivpeiiq+e7p+aJv++8jOS9huS4jeS8muimhueblumdnue7p+aJv+Wtl+autVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCB3b3JrIGluZGVwZW5kZW50bHkgb2YgcHJvamVjdCBjb25maWd1cmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Ly8g6aG555uu6YWN572u5Li6bnVsbO+8jOmqjOivgeS4jeS8muW0qea6g1xyXG5cdFx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcgPSBudWxsO1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSBnZXRDb25maWcoXCJ0YXNrc1wiLCBtb2NrUGx1Z2luKTtcclxuXHRcdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWcpO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IFwiLSBbIF0gVGFzayB3aXRoIGluaGVyaXRhbmNlXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRwcmlvcml0eTogXCJsb3dcIixcclxuXHRcdFx0XHRhcmVhOiBcIndvcmtcIiwgLy8g5L2/55So5bey55+l55qE5Y+v57un5om/5a2X5q61XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoMik7IC8vIFwibG93XCIg6KKr6L2s5o2i5Li65pWw5a2XIDJcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLmFyZWEpLnRvQmUoXCJ3b3JrXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiU3VidGFzayBJbmhlcml0YW5jZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBpbmhlcml0IHRvIHN1YnRhc2tzIHdoZW4gaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzIGlzIGZhbHNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtIFsgXSBQYXJlbnQgdGFza1xyXG4gIC0gWyBdIENoaWxkIHRhc2tgO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IFwidXJnZW50XCIsXHJcblx0XHRcdFx0Y29udGV4dDogXCJtZWV0aW5nXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g54i25Lu75Yqh5bqU6K+l57un5om/XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSg1KTsgLy8gXCJ1cmdlbnRcIiDooqvovazmjaLkuLrmlbDlrZcgNVxyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcIm1lZXRpbmdcIik7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDlrZDku7vliqHkuI3lupTor6Xnu6fmib/vvIjpu5jorqTphY3nva7vvIlcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzFdLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1sxXS5tZXRhZGF0YS5jb250ZXh0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGluaGVyaXQgdG8gc3VidGFza3Mgd2hlbiBpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3MgaXMgdHJ1ZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIOWQr+eUqOWtkOS7u+WKoee7p+aJv1xyXG5cdFx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcyA9IHRydWU7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZyhcInRhc2tzXCIsIG1vY2tQbHVnaW4pO1xyXG5cdFx0XHRwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0gWyBdIFBhcmVudCB0YXNrXHJcbiAgLSBbIF0gQ2hpbGQgdGFza1xyXG4gICAgLSBbIF0gR3JhbmRjaGlsZCB0YXNrYDtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHByaW9yaXR5OiBcInVyZ2VudFwiLFxyXG5cdFx0XHRcdGNvbnRleHQ6IFwibWVldGluZ1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIOaJgOacieS7u+WKoemDveW6lOivpee7p+aJv1xyXG5cdFx0XHR0YXNrcy5mb3JFYWNoKHRhc2sgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlKDUpOyAvLyBcInVyZ2VudFwiIOiiq+i9rOaNouS4uuaVsOWtlyA1XHJcblx0XHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEuY29udGV4dCkudG9CZShcIm1lZXRpbmdcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiUHJpb3JpdHkgT3ZlcnJpZGVcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBwcmlvcml0aXplIGV4cGxpY2l0IHRhc2sgbWV0YWRhdGEgb3ZlciBpbmhlcml0ZWQgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGggZXhwbGljaXQgcHJpb3JpdHkgQGhvbWUg8J+UvFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IFwibG93XCIsXHJcblx0XHRcdFx0Y29udGV4dDogXCJvZmZpY2VcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdC8vIOS7u+WKoeeahOaYvuW8j2NvbnRleHTlupTor6Xopobnm5bmlofku7bkuK3nmoRjb250ZXh0XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5jb250ZXh0KS50b0JlKFwiaG9tZVwiKTtcclxuXHRcdFx0Ly8g5Lu75Yqh55qE5pi+5byPcHJpb3JpdHnlupTor6Xopobnm5bmlofku7bkuK3nmoRwcmlvcml0eVxyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdC8vIOS9huS4jeW6lOivpeaYr+aWh+S7tuS4reeahFwibG93XCJcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnByaW9yaXR5KS5ub3QudG9CZShcImxvd1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaW5oZXJpdCBvbmx5IGZpZWxkcyBub3QgZXhwbGljaXRseSBzZXQgb24gdGFza1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBwYXJ0aWFsIG1ldGFkYXRhIEBob21lXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRwcmlvcml0eTogXCJoaWdoXCIsXHJcblx0XHRcdFx0Y29udGV4dDogXCJvZmZpY2VcIixcclxuXHRcdFx0XHRhcmVhOiBcIndvcmtcIixcclxuXHRcdFx0XHRwcm9qZWN0OiBcIm15cHJvamVjdFwiLCAvLyDkvb/nlKjlt7Lnn6XnmoTlj6/nu6fmib/lrZfmrrVcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdC8vIOS7u+WKoeaYvuW8j+iuvue9rueahGNvbnRleHTlupTor6XkvJjlhYhcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLmNvbnRleHQpLnRvQmUoXCJob21lXCIpO1xyXG5cdFx0XHQvLyDlhbbku5blrZfmrrXlupTor6Xooqvnu6fmib9cclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnByaW9yaXR5KS50b0JlKDQpOyAvLyBcImhpZ2hcIiDooqvovazmjaLkuLrmlbDlrZcgNFxyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuYXJlYSkudG9CZShcIndvcmtcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5wcm9qZWN0KS50b0JlKFwibXlwcm9qZWN0XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTm9uLWluaGVyaXRhYmxlIEZpZWxkc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBpbmhlcml0IHRhc2stc3BlY2lmaWMgZmllbGRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IFwiLSBbIF0gVGVzdCB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRpZDogXCJzaG91bGQtbm90LWluaGVyaXRcIixcclxuXHRcdFx0XHRjb250ZW50OiBcInNob3VsZC1ub3QtaW5oZXJpdFwiLFxyXG5cdFx0XHRcdHN0YXR1czogXCJzaG91bGQtbm90LWluaGVyaXRcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0bGluZTogOTk5LFxyXG5cdFx0XHRcdGxpbmVOdW1iZXI6IDk5OSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJzaG91bGQtbm90LWluaGVyaXRcIixcclxuXHRcdFx0XHRoZWFkaW5nOiBcInNob3VsZC1ub3QtaW5oZXJpdFwiLFxyXG5cdFx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIiwgLy8g6L+Z5Liq5bqU6K+l6KKr57un5om/XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g5Lu75Yqh54m55a6a5a2X5q615LiN5bqU6K+l6KKr57un5om/XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5pZCkubm90LnRvQmUoXCJzaG91bGQtbm90LWluaGVyaXRcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5jb250ZW50KS50b0JlKFwiVGVzdCB0YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0uY29tcGxldGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLmZpbGVQYXRoKS50b0JlKFwidGVzdC5tZFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIOWPr+e7p+aJv+Wtl+auteW6lOivpeiiq+e7p+aJv1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoNCk7IC8vIFwiaGlnaFwiIOiiq+i9rOaNouS4uuaVsOWtlyA0XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb21wbGV4IFNjZW5hcmlvc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtaXhlZCBpbmhlcml0YW5jZSB3aXRoIG11bHRpcGxlIHRhc2tzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtIFsgXSBUYXNrIDEgd2l0aCBjb250ZXh0IEB3b3JrXHJcbi0gWyBdIFRhc2sgMiB3aXRob3V0IG1ldGFkYXRhXHJcbi0gWyBdIFRhc2sgMyB3aXRoIHByaW9yaXR5IPCflLpgO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IFwibWVkaXVtXCIsXHJcblx0XHRcdFx0Y29udGV4dDogXCJob21lXCIsXHJcblx0XHRcdFx0YXJlYTogXCJwZXJzb25hbFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFRhc2sgMTog5pi+5byPY29udGV4dO+8jOe7p+aJv3ByaW9yaXR55ZKMYXJlYVxyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcIndvcmtcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSgzKTsgLy8gXCJtZWRpdW1cIiDooqvovazmjaLkuLrmlbDlrZcgM1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuYXJlYSkudG9CZShcInBlcnNvbmFsXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVGFzayAyOiDlhajpg6jnu6fmib9cclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzFdLm1ldGFkYXRhLmNvbnRleHQpLnRvQmUoXCJob21lXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMV0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoMyk7IC8vIFwibWVkaXVtXCIg6KKr6L2s5o2i5Li65pWw5a2XIDNcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzFdLm1ldGFkYXRhLmFyZWEpLnRvQmUoXCJwZXJzb25hbFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFRhc2sgMzog5pi+5byPcHJpb3JpdHnvvIznu6fmib9jb250ZXh05ZKMYXJlYVxyXG5cdFx0XHRleHBlY3QodGFza3NbMl0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcImhvbWVcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1syXS5tZXRhZGF0YS5hcmVhKS50b0JlKFwicGVyc29uYWxcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1syXS5tZXRhZGF0YS5wcmlvcml0eSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzJdLm1ldGFkYXRhLnByaW9yaXR5KS5ub3QudG9CZShcIm1lZGl1bVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGVtcHR5IGZpbGUgbWV0YWRhdGEgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBubyBmaWxlIG1ldGFkYXRhXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHt9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLmNvbnRlbnQpLnRvQmUoXCJUYXNrIHdpdGggbm8gZmlsZSBtZXRhZGF0YVwiKTtcclxuXHRcdFx0Ly8g5rKh5pyJ5YWD5pWw5o2u5Y+v57un5om/77yM5bqU6K+l5q2j5bi45bel5L2cXHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBudWxsIGZpbGUgbWV0YWRhdGEgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBudWxsIG1ldGFkYXRhXCI7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgdW5kZWZpbmVkKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0uY29udGVudCkudG9CZShcIlRhc2sgd2l0aCBudWxsIG1ldGFkYXRhXCIpO1xyXG5cdFx0XHQvLyDkuI3lupTor6XltKnmuoNcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlByaW9yaXR5IFZhbHVlIENvbnZlcnNpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBjb252ZXJ0IHByaW9yaXR5IHRleHQgdmFsdWVzIHRvIGFwcHJvcHJpYXRlIGZvcm1hdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCB0ZXh0IHByaW9yaXR5XCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRwcmlvcml0eTogXCJoaWdoXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdC8vIOW6lOivpee7j+i/h+S8mOWFiOe6p+i9rOaNouWkhOeQhlxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbnVtZXJpYyBwcmlvcml0eSB2YWx1ZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGggbnVtZXJpYyBwcmlvcml0eVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0cHJpb3JpdHk6IDQsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJpb3JpdHkpLnRvQmUoNCk7IC8vIOaVsOWtlyA0IOS/neaMgeS4uuaVsOWtl1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiVGFncyBJbmhlcml0YW5jZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGluaGVyaXQgdGFncyBmcm9tIGZpbGUgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGhvdXQgdGFnc1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0dGFnczogW1wiI3dvcmtcIiwgXCIjdXJnZW50XCIsIFwiI21lZXRpbmdcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEudGFncykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvRXF1YWwoW1wiI3dvcmtcIiwgXCIjdXJnZW50XCIsIFwiI21lZXRpbmdcIl0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBtZXJnZSB0YXNrIHRhZ3Mgd2l0aCBpbmhlcml0ZWQgdGFnc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBleGlzdGluZyB0YWdzICNwZXJzb25hbFwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0dGFnczogW1wiI3dvcmtcIiwgXCIjdXJnZW50XCJdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjcGVyc29uYWxcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjd29ya1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQ29udGFpbihcIiN1cmdlbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBkdXBsaWNhdGUgdGFncyB3aGVuIG1lcmdpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGggZHVwbGljYXRlIHRhZyAjd29ya1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0dGFnczogW1wiI3dvcmtcIiwgXCIjdXJnZW50XCJdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdC8vIFNob3VsZCBvbmx5IGhhdmUgb25lIGluc3RhbmNlIG9mICN3b3JrXHJcblx0XHRcdGNvbnN0IHdvcmtUYWdzID0gdGFza3NbMF0ubWV0YWRhdGEudGFncy5maWx0ZXIoKHRhZzogc3RyaW5nKSA9PiB0YWcgPT09IFwiI3dvcmtcIik7XHJcblx0XHRcdGV4cGVjdCh3b3JrVGFncykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEudGFncykudG9Db250YWluKFwiI3VyZ2VudFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcGFyc2Ugc3BlY2lhbCB0YWcgZm9ybWF0cyBmcm9tIGZpbGUgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIGluaGVyaXRpbmcgcHJvamVjdCB0YWdcIjtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L215cHJvamVjdFwiLCBcIiNhcmVhL3dvcmtcIiwgXCIjQC9vZmZpY2VcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJvamVjdCkudG9CZShcIm15cHJvamVjdFwiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLmFyZWEpLnRvQmUoXCJ3b3JrXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcIm9mZmljZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQ29udGFpbihcIiNwcm9qZWN0L215cHJvamVjdFwiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQ29udGFpbihcIiNhcmVhL3dvcmtcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjQC9vZmZpY2VcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHByaW9yaXRpemUgdGFzayBtZXRhZGF0YSBvdmVyIHRhZy1kZXJpdmVkIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IFwiLSBbIF0gVGFzayB3aXRoIGV4cGxpY2l0IHByb2plY3QgW3Byb2plY3Q6OnRhc2twcm9qZWN0XVwiO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0dGFnczogW1wiI3Byb2plY3QvZmlsZXByb2plY3RcIl0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHQvLyBUYXNrJ3MgZXhwbGljaXQgcHJvamVjdCBzaG91bGQgdGFrZSBwcmVjZWRlbmNlXHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5wcm9qZWN0KS50b0JlKFwidGFza3Byb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjcHJvamVjdC9maWxlcHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1peGVkIHRhZyBmb3JtYXRzIGluIGZpbGUgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGggbWl4ZWQgdGFnIGluaGVyaXRhbmNlXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHR0YWdzOiBbXCIjcmVndWxhci10YWdcIiwgXCIjcHJvamVjdC9teXByb2plY3RcIiwgXCIjbm9ybWFsVGFnXCIsIFwiI2FyZWEvd29ya1wiXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS5wcm9qZWN0KS50b0JlKFwibXlwcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuYXJlYSkudG9CZShcIndvcmtcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjcmVndWxhci10YWdcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjbm9ybWFsVGFnXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEudGFncykudG9Db250YWluKFwiI3Byb2plY3QvbXlwcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEudGFncykudG9Db250YWluKFwiI2FyZWEvd29ya1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGVtcHR5IHRhZ3MgYXJyYXkgaW4gZmlsZSBtZXRhZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIi0gWyBdIFRhc2sgd2l0aCBlbXB0eSB0YWdzXCI7XHJcblx0XHRcdGNvbnN0IGZpbGVNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0VxdWFsKFtdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG5vbi1hcnJheSB0YWdzIGluIGZpbGUgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBUYXNrIHdpdGggbm9uLWFycmF5IHRhZ3NcIjtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHRhZ3M6IFwic2luZ2xlLXRhZ1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIsIGZpbGVNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Ly8gU2hvdWxkIGluaGVyaXQgYXMgYSBzaW5nbGUgdGFnIHdpdGggIyBwcmVmaXhcclxuXHRcdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvQ29udGFpbihcIiNzaW5nbGUtdGFnXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ29uZmlndXJhdGlvbiBNaWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCB3b3JrIHdpdGggbWlncmF0ZWQgc2V0dGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyDmqKHmi5/ov4Hnp7vlkI7nmoTorr7nva7nu5PmnoRcclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSxcclxuXHRcdFx0XHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrczogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdC8vIOaXp+eahOmhueebrumFjee9ruS4reayoeaciee7p+aJv+iuvue9rlxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogZmFsc2UsXHJcblx0XHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRcdGZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKFwidGFza3NcIiwgbWlncmF0ZWRQbHVnaW4pO1xyXG5cdFx0XHRjb25zdCBtaWdyYXRlZFBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBgLSBbIF0gUGFyZW50IHRhc2tcclxuICAtIFsgXSBDaGlsZCB0YXNrYDtcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0ge1xyXG5cdFx0XHRcdHByaW9yaXR5OiBcIm1pZ3JhdGVkXCIsXHJcblx0XHRcdFx0Y29udGV4dDogXCJ0ZXN0XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IG1pZ3JhdGVkUGFyc2VyLnBhcnNlTGVnYWN5KGNvbnRlbnQsIFwidGVzdC5tZFwiLCBmaWxlTWV0YWRhdGEpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDniLbku7vliqHlkozlrZDku7vliqHpg73lupTor6Xnu6fmib/vvIjlm6DkuLrov4Hnp7vlkI7lkK/nlKjkuoblrZDku7vliqHnu6fmib/vvIlcclxuXHRcdFx0dGFza3MuZm9yRWFjaCh0YXNrID0+IHtcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5wcmlvcml0eSkudG9CZShcIm1pZ3JhdGVkXCIpOyAvLyDlrZfnrKbkuLLlgLzkv53mjIHkuLrlrZfnrKbkuLJcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5jb250ZXh0KS50b0JlKFwidGVzdFwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19