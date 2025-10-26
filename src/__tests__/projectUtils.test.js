/**
 * Project Utilities Tests
 *
 * Tests for project-related utility functions
 */
import { getEffectiveProject, isProjectReadonly, hasProject, } from "../utils/task/task-operations";
describe("Project Utility Functions", () => {
    describe("getEffectiveProject", () => {
        test("should return original project when available", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "Original Project",
                    tgProject: {
                        type: "path",
                        name: "Path Project",
                        source: "Projects/Work",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = getEffectiveProject(task);
            expect(result).toBe("Original Project");
        });
        test("should return tgProject name when no original project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "metadata",
                        name: "Metadata Project",
                        source: "project",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = getEffectiveProject(task);
            expect(result).toBe("Metadata Project");
        });
        test("should return undefined when no project available", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = getEffectiveProject(task);
            expect(result).toBeUndefined();
        });
        test("should handle empty string project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "",
                    tgProject: {
                        type: "path",
                        name: "Fallback Project",
                        source: "Projects",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = getEffectiveProject(task);
            expect(result).toBe("Fallback Project");
        });
        test("should handle whitespace-only project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "   ",
                    tgProject: {
                        type: "config",
                        name: "Config Project",
                        source: "project.md",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = getEffectiveProject(task);
            expect(result).toBe("Config Project");
        });
    });
    describe("isProjectReadonly", () => {
        test("should return false for original project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "Original Project",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = isProjectReadonly(task);
            expect(result).toBe(false);
        });
        test("should return true for tgProject", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "path",
                        name: "Path Project",
                        source: "Projects/Work",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = isProjectReadonly(task);
            expect(result).toBe(true);
        });
        test("should return false when no project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = isProjectReadonly(task);
            expect(result).toBe(false);
        });
        test("should return false when original project exists even with tgProject", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "Original Project",
                    tgProject: {
                        type: "metadata",
                        name: "Metadata Project",
                        source: "project",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = isProjectReadonly(task);
            expect(result).toBe(false);
        });
        test("should handle tgProject with readonly false", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "metadata",
                        name: "Custom Project",
                        source: "manual",
                        readonly: false,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = isProjectReadonly(task);
            expect(result).toBe(false);
        });
    });
    describe("hasProject", () => {
        test("should return true when original project exists", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "Original Project",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(true);
        });
        test("should return true when tgProject exists", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "path",
                        name: "Path Project",
                        source: "Projects/Work",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(true);
        });
        test("should return false when no project exists", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(false);
        });
        test("should return false for empty string project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(false);
        });
        test("should return false for whitespace-only project", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "   ",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(false);
        });
        test("should return true when both projects exist", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    project: "Original Project",
                    tgProject: {
                        type: "metadata",
                        name: "Metadata Project",
                        source: "project",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(true);
        });
        test("should handle tgProject with empty name", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "path",
                        name: "",
                        source: "Projects/Work",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(false);
        });
        test("should handle tgProject with whitespace-only name", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                        type: "config",
                        name: "   ",
                        source: "project.md",
                        readonly: true,
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            const result = hasProject(task);
            expect(result).toBe(false);
        });
    });
    describe("Edge Cases and Error Handling", () => {
        test("should handle undefined metadata", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: undefined,
            };
            expect(() => getEffectiveProject(task)).not.toThrow();
            expect(() => isProjectReadonly(task)).not.toThrow();
            expect(() => hasProject(task)).not.toThrow();
            expect(getEffectiveProject(task)).toBeUndefined();
            expect(isProjectReadonly(task)).toBe(false);
            expect(hasProject(task)).toBe(false);
        });
        test("should handle null metadata", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: null,
            };
            expect(() => getEffectiveProject(task)).not.toThrow();
            expect(() => isProjectReadonly(task)).not.toThrow();
            expect(() => hasProject(task)).not.toThrow();
            expect(getEffectiveProject(task)).toBeUndefined();
            expect(isProjectReadonly(task)).toBe(false);
            expect(hasProject(task)).toBe(false);
        });
        test("should handle malformed tgProject", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: {
                    // Missing required fields
                    },
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(() => getEffectiveProject(task)).not.toThrow();
            expect(() => isProjectReadonly(task)).not.toThrow();
            expect(() => hasProject(task)).not.toThrow();
            expect(getEffectiveProject(task)).toBeUndefined();
            expect(isProjectReadonly(task)).toBe(false);
            expect(hasProject(task)).toBe(false);
        });
        test("should handle tgProject as non-object", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject: "invalid",
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(() => getEffectiveProject(task)).not.toThrow();
            expect(() => isProjectReadonly(task)).not.toThrow();
            expect(() => hasProject(task)).not.toThrow();
            expect(getEffectiveProject(task)).toBeUndefined();
            expect(isProjectReadonly(task)).toBe(false);
            expect(hasProject(task)).toBe(false);
        });
    });
    describe("TgProject Types", () => {
        test("should handle path type tgProject", () => {
            const tgProject = {
                type: "path",
                name: "Path Project",
                source: "Projects/Work",
                readonly: true,
            };
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject,
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(getEffectiveProject(task)).toBe("Path Project");
            expect(isProjectReadonly(task)).toBe(true);
            expect(hasProject(task)).toBe(true);
        });
        test("should handle metadata type tgProject", () => {
            const tgProject = {
                type: "metadata",
                name: "Metadata Project",
                source: "project",
                readonly: true,
            };
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject,
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(getEffectiveProject(task)).toBe("Metadata Project");
            expect(isProjectReadonly(task)).toBe(true);
            expect(hasProject(task)).toBe(true);
        });
        test("should handle config type tgProject", () => {
            const tgProject = {
                type: "config",
                name: "Config Project",
                source: "project.md",
                readonly: true,
            };
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tgProject,
                    tags: [],
                    children: [],
                    heading: [],
                },
            };
            expect(getEffectiveProject(task)).toBe("Config Project");
            expect(isProjectReadonly(task)).toBe(true);
            expect(hasProject(task)).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdFV0aWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9qZWN0VXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHO0FBRUgsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsVUFBVSxHQUNWLE1BQU0sK0JBQStCLENBQUM7QUFJdkMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUMxQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7WUFDMUQsTUFBTSxJQUFJLEdBQVM7Z0JBQ2xCLEVBQUUsRUFBRSxRQUFRO2dCQUNaLE9BQU8sRUFBRSxXQUFXO2dCQUNwQixRQUFRLEVBQUUsU0FBUztnQkFDbkIsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxHQUFHO2dCQUNYLGdCQUFnQixFQUFFLGlCQUFpQjtnQkFDbkMsUUFBUSxFQUFFO29CQUNULE9BQU8sRUFBRSxrQkFBa0I7b0JBQzNCLFNBQVMsRUFBRTt3QkFDVixJQUFJLEVBQUUsTUFBTTt3QkFDWixJQUFJLEVBQUUsY0FBYzt3QkFDcEIsTUFBTSxFQUFFLGVBQWU7d0JBQ3ZCLFFBQVEsRUFBRSxJQUFJO3FCQUNkO29CQUNELElBQUksRUFBRSxFQUFFO29CQUNSLFFBQVEsRUFBRSxFQUFFO29CQUNaLE9BQU8sRUFBRSxFQUFFO2lCQUNYO2FBQ0QsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7WUFDbEUsTUFBTSxJQUFJLEdBQVM7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QUUsU0FBUztnQkFDbkIsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxHQUFHO2dCQUNYLGdCQUFnQixFQUFFLGlCQUFpQjtnQkFDbkMsUUFBUSxFQUFFO29CQUNULFNBQVM7b0JBQ1QsSUFBSSxFQUFFLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLEVBQUU7b0JBQ1osT0FBTyxFQUFFLEVBQUU7aUJBQ1g7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDekQsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2plY3QgVXRpbGl0aWVzIFRlc3RzXHJcbiAqXHJcbiAqIFRlc3RzIGZvciBwcm9qZWN0LXJlbGF0ZWQgdXRpbGl0eSBmdW5jdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdGdldEVmZmVjdGl2ZVByb2plY3QsXHJcblx0aXNQcm9qZWN0UmVhZG9ubHksXHJcblx0aGFzUHJvamVjdCxcclxufSBmcm9tIFwiLi4vdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFRnUHJvamVjdCB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcblxyXG5kZXNjcmliZShcIlByb2plY3QgVXRpbGl0eSBGdW5jdGlvbnNcIiwgKCkgPT4ge1xyXG5cdGRlc2NyaWJlKFwiZ2V0RWZmZWN0aXZlUHJvamVjdFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBvcmlnaW5hbCBwcm9qZWN0IHdoZW4gYXZhaWxhYmxlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRwcm9qZWN0OiBcIk9yaWdpbmFsIFByb2plY3RcIixcclxuXHRcdFx0XHRcdHRnUHJvamVjdDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJQYXRoIFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0c291cmNlOiBcIlByb2plY3RzL1dvcmtcIixcclxuXHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShcIk9yaWdpbmFsIFByb2plY3RcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiB0Z1Byb2plY3QgbmFtZSB3aGVuIG5vIG9yaWdpbmFsIHByb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRnUHJvamVjdDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiTWV0YWRhdGEgUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiTWV0YWRhdGEgUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIHVuZGVmaW5lZCB3aGVuIG5vIHByb2plY3QgYXZhaWxhYmxlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBlbXB0eSBzdHJpbmcgcHJvamVjdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJcIixcclxuXHRcdFx0XHRcdHRnUHJvamVjdDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJGYWxsYmFjayBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0c1wiLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiRmFsbGJhY2sgUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHdoaXRlc3BhY2Utb25seSBwcm9qZWN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRwcm9qZWN0OiBcIiAgIFwiLFxyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwiY29uZmlnXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiQ29uZmlnIFByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0c291cmNlOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShcIkNvbmZpZyBQcm9qZWN0XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiaXNQcm9qZWN0UmVhZG9ubHlcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gZmFsc2UgZm9yIG9yaWdpbmFsIHByb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiT3JpZ2luYWwgUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gaXNQcm9qZWN0UmVhZG9ubHkodGFzayk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gdHJ1ZSBmb3IgdGdQcm9qZWN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0Z1Byb2plY3Q6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiUGF0aCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0cy9Xb3JrXCIsXHJcblx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gZmFsc2Ugd2hlbiBubyBwcm9qZWN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBpc1Byb2plY3RSZWFkb25seSh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBmYWxzZSB3aGVuIG9yaWdpbmFsIHByb2plY3QgZXhpc3RzIGV2ZW4gd2l0aCB0Z1Byb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiT3JpZ2luYWwgUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRnUHJvamVjdCB3aXRoIHJlYWRvbmx5IGZhbHNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0Z1Byb2plY3Q6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIkN1c3RvbSBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJtYW51YWxcIixcclxuXHRcdFx0XHRcdFx0cmVhZG9ubHk6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImhhc1Byb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gdHJ1ZSB3aGVuIG9yaWdpbmFsIHByb2plY3QgZXhpc3RzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRwcm9qZWN0OiBcIk9yaWdpbmFsIFByb2plY3RcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGhhc1Byb2plY3QodGFzayk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiB0cnVlIHdoZW4gdGdQcm9qZWN0IGV4aXN0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwicGF0aFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIlBhdGggUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IFwiUHJvamVjdHMvV29ya1wiLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBoYXNQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gZmFsc2Ugd2hlbiBubyBwcm9qZWN0IGV4aXN0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gaGFzUHJvamVjdCh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBmYWxzZSBmb3IgZW1wdHkgc3RyaW5nIHByb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBoYXNQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIGZhbHNlIGZvciB3aGl0ZXNwYWNlLW9ubHkgcHJvamVjdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0cHJvamVjdDogXCIgICBcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGhhc1Byb2plY3QodGFzayk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gdHJ1ZSB3aGVuIGJvdGggcHJvamVjdHMgZXhpc3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHByb2plY3Q6IFwiT3JpZ2luYWwgUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGhhc1Byb2plY3QodGFzayk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB0Z1Byb2plY3Qgd2l0aCBlbXB0eSBuYW1lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0Z1Byb2plY3Q6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiXCIsXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0cy9Xb3JrXCIsXHJcblx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGhhc1Byb2plY3QodGFzayk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgdGdQcm9qZWN0IHdpdGggd2hpdGVzcGFjZS1vbmx5IG5hbWVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRnUHJvamVjdDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIiAgIFwiLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBoYXNQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVkZ2UgQ2FzZXMgYW5kIEVycm9yIEhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHVuZGVmaW5lZCBtZXRhZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YTogdW5kZWZpbmVkIGFzIGFueSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdCgoKSA9PiBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cdFx0XHRleHBlY3QoKCkgPT4gaXNQcm9qZWN0UmVhZG9ubHkodGFzaykpLm5vdC50b1Rocm93KCk7XHJcblx0XHRcdGV4cGVjdCgoKSA9PiBoYXNQcm9qZWN0KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGdldEVmZmVjdGl2ZVByb2plY3QodGFzaykpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KGlzUHJvamVjdFJlYWRvbmx5KHRhc2spKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KGhhc1Byb2plY3QodGFzaykpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbnVsbCBtZXRhZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YTogbnVsbCBhcyBhbnksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3QoKCkgPT4gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKSkubm90LnRvVGhyb3coKTtcclxuXHRcdFx0ZXhwZWN0KCgpID0+IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cdFx0XHRleHBlY3QoKCkgPT4gaGFzUHJvamVjdCh0YXNrKSkubm90LnRvVGhyb3coKTtcclxuXHJcblx0XHRcdGV4cGVjdChnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChpc1Byb2plY3RSZWFkb25seSh0YXNrKSkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChoYXNQcm9qZWN0KHRhc2spKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCB0Z1Byb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRnUHJvamVjdDoge1xyXG5cdFx0XHRcdFx0XHQvLyBNaXNzaW5nIHJlcXVpcmVkIGZpZWxkc1xyXG5cdFx0XHRcdFx0fSBhcyBhbnksXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3QoKCkgPT4gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKSkubm90LnRvVGhyb3coKTtcclxuXHRcdFx0ZXhwZWN0KCgpID0+IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cdFx0XHRleHBlY3QoKCkgPT4gaGFzUHJvamVjdCh0YXNrKSkubm90LnRvVGhyb3coKTtcclxuXHJcblx0XHRcdGV4cGVjdChnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChpc1Byb2plY3RSZWFkb25seSh0YXNrKSkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChoYXNQcm9qZWN0KHRhc2spKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRnUHJvamVjdCBhcyBub24tb2JqZWN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0Z1Byb2plY3Q6IFwiaW52YWxpZFwiIGFzIGFueSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdCgoKSA9PiBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cdFx0XHRleHBlY3QoKCkgPT4gaXNQcm9qZWN0UmVhZG9ubHkodGFzaykpLm5vdC50b1Rocm93KCk7XHJcblx0XHRcdGV4cGVjdCgoKSA9PiBoYXNQcm9qZWN0KHRhc2spKS5ub3QudG9UaHJvdygpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGdldEVmZmVjdGl2ZVByb2plY3QodGFzaykpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KGlzUHJvamVjdFJlYWRvbmx5KHRhc2spKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KGhhc1Byb2plY3QodGFzaykpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiVGdQcm9qZWN0IFR5cGVzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHBhdGggdHlwZSB0Z1Byb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0Z1Byb2plY3Q6IFRnUHJvamVjdCA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRuYW1lOiBcIlBhdGggUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJQcm9qZWN0cy9Xb3JrXCIsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRnUHJvamVjdCxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGV4cGVjdChnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spKS50b0JlKFwiUGF0aCBQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QoaXNQcm9qZWN0UmVhZG9ubHkodGFzaykpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChoYXNQcm9qZWN0KHRhc2spKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbWV0YWRhdGEgdHlwZSB0Z1Byb2plY3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0Z1Byb2plY3Q6IFRnUHJvamVjdCA9IHtcclxuXHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0bmFtZTogXCJNZXRhZGF0YSBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcInByb2plY3RcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGdQcm9qZWN0LFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KGdldEVmZmVjdGl2ZVByb2plY3QodGFzaykpLnRvQmUoXCJNZXRhZGF0YSBQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QoaXNQcm9qZWN0UmVhZG9ubHkodGFzaykpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChoYXNQcm9qZWN0KHRhc2spKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY29uZmlnIHR5cGUgdGdQcm9qZWN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGdQcm9qZWN0OiBUZ1Byb2plY3QgPSB7XHJcblx0XHRcdFx0dHlwZTogXCJjb25maWdcIixcclxuXHRcdFx0XHRuYW1lOiBcIkNvbmZpZyBQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGdQcm9qZWN0LFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KGdldEVmZmVjdGl2ZVByb2plY3QodGFzaykpLnRvQmUoXCJDb25maWcgUHJvamVjdFwiKTtcclxuXHRcdFx0ZXhwZWN0KGlzUHJvamVjdFJlYWRvbmx5KHRhc2spKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QoaGFzUHJvamVjdCh0YXNrKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19