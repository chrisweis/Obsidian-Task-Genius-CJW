/**
 * Tests for Project Source Worker Fix
 *
 * This test file verifies that the worker correctly rebuilds tgProject with proper source display:
 * 1. Metadata-based projects show correct "frontmatter" source
 * 2. Config file-based projects show correct "config-file" source
 * 3. Path-based projects show correct "path-mapping" source
 * 4. The worker logic correctly infers type from source characteristics
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { MetadataParseMode } from "../types/TaskParserConfig";
// Mock the worker logic for testing
function simulateWorkerTgProjectRebuild(projectInfo) {
    // This simulates the logic from TaskIndex.worker.ts
    let actualType;
    let displaySource;
    // If source is one of the type values, use it directly
    if (["metadata", "path", "config", "default"].includes(projectInfo.source)) {
        actualType = projectInfo.source;
    }
    // Otherwise, infer type from source characteristics
    else if (projectInfo.source && projectInfo.source.includes("/")) {
        // Path patterns contain "/"
        actualType = "path";
    }
    else if (projectInfo.source && projectInfo.source.includes(".")) {
        // Config files contain "."
        actualType = "config";
    }
    else {
        // Metadata keys are simple strings without "/" or "."
        actualType = "metadata";
    }
    // Set appropriate display source based on type
    switch (actualType) {
        case "path":
            displaySource = "path-mapping";
            break;
        case "metadata":
            displaySource = "frontmatter";
            break;
        case "config":
            displaySource = "config-file";
            break;
        case "default":
            displaySource = "default-naming";
            break;
    }
    return {
        type: actualType,
        name: projectInfo.project,
        source: displaySource,
        readonly: projectInfo.readonly,
    };
}
describe("Project Source Worker Fix", () => {
    describe("Worker tgProject Rebuild Logic", () => {
        it("should correctly identify metadata-based projects", () => {
            const projectInfo = {
                project: "MyMetadataProject",
                source: "projectName",
                readonly: true,
            };
            const result = simulateWorkerTgProjectRebuild(projectInfo);
            expect(result.type).toBe("metadata");
            expect(result.name).toBe("MyMetadataProject");
            expect(result.source).toBe("frontmatter");
            expect(result.readonly).toBe(true);
        });
        it("should correctly identify config file-based projects", () => {
            const projectInfo = {
                project: "MyConfigProject",
                source: "project.md",
                readonly: true,
            };
            const result = simulateWorkerTgProjectRebuild(projectInfo);
            expect(result.type).toBe("config");
            expect(result.name).toBe("MyConfigProject");
            expect(result.source).toBe("config-file");
            expect(result.readonly).toBe(true);
        });
        it("should correctly identify path-based projects", () => {
            const projectInfo = {
                project: "MyPathProject",
                source: "projects/",
                readonly: true,
            };
            const result = simulateWorkerTgProjectRebuild(projectInfo);
            expect(result.type).toBe("path");
            expect(result.name).toBe("MyPathProject");
            expect(result.source).toBe("path-mapping");
            expect(result.readonly).toBe(true);
        });
        it("should correctly handle direct type values", () => {
            // Test when source is directly the type value
            const metadataProjectInfo = {
                project: "DirectMetadataProject",
                source: "metadata",
                readonly: true,
            };
            const metadataResult = simulateWorkerTgProjectRebuild(metadataProjectInfo);
            expect(metadataResult.type).toBe("metadata");
            expect(metadataResult.source).toBe("frontmatter");
            const configProjectInfo = {
                project: "DirectConfigProject",
                source: "config",
                readonly: true,
            };
            const configResult = simulateWorkerTgProjectRebuild(configProjectInfo);
            expect(configResult.type).toBe("config");
            expect(configResult.source).toBe("config-file");
            const pathProjectInfo = {
                project: "DirectPathProject",
                source: "path",
                readonly: true,
            };
            const pathResult = simulateWorkerTgProjectRebuild(pathProjectInfo);
            expect(pathResult.type).toBe("path");
            expect(pathResult.source).toBe("path-mapping");
        });
        it("should correctly handle default project naming", () => {
            const projectInfo = {
                project: "DefaultProject",
                source: "default",
                readonly: true,
            };
            const result = simulateWorkerTgProjectRebuild(projectInfo);
            expect(result.type).toBe("default");
            expect(result.name).toBe("DefaultProject");
            expect(result.source).toBe("default-naming");
            expect(result.readonly).toBe(true);
        });
        it("should handle edge cases correctly", () => {
            // Test metadata key with special characters
            const specialMetadataInfo = {
                project: "SpecialProject",
                source: "custom_project_name",
                readonly: true,
            };
            const specialResult = simulateWorkerTgProjectRebuild(specialMetadataInfo);
            expect(specialResult.type).toBe("metadata");
            expect(specialResult.source).toBe("frontmatter");
            // Test config file with different extension
            const yamlConfigInfo = {
                project: "YamlProject",
                source: "project.yaml",
                readonly: true,
            };
            const yamlResult = simulateWorkerTgProjectRebuild(yamlConfigInfo);
            expect(yamlResult.type).toBe("config");
            expect(yamlResult.source).toBe("config-file");
            // Test complex path pattern
            const complexPathInfo = {
                project: "ComplexPathProject",
                source: "work/projects/",
                readonly: true,
            };
            const complexResult = simulateWorkerTgProjectRebuild(complexPathInfo);
            expect(complexResult.type).toBe("path");
            expect(complexResult.source).toBe("path-mapping");
        });
    });
    describe("Integration with Parser", () => {
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
        it("should correctly pass through tgProject when provided", () => {
            var _a, _b, _c;
            const taskContent = "- [ ] Test task";
            const filePath = "test.md";
            // Simulate the corrected tgProject from worker
            const correctedTgProject = {
                type: "metadata",
                name: "WorkerCorrectedProject",
                source: "frontmatter",
                readonly: true,
            };
            const tasks = parser.parse(taskContent, filePath, undefined, undefined, correctedTgProject);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            expect(task.tgProject).toBeDefined();
            expect((_a = task.tgProject) === null || _a === void 0 ? void 0 : _a.type).toBe("metadata");
            expect((_b = task.tgProject) === null || _b === void 0 ? void 0 : _b.name).toBe("WorkerCorrectedProject");
            expect((_c = task.tgProject) === null || _c === void 0 ? void 0 : _c.source).toBe("frontmatter");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFNvdXJjZVdvcmtlckZpeC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvamVjdFNvdXJjZVdvcmtlckZpeC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFvQixpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWhGLG9DQUFvQztBQUNwQyxTQUFTLDhCQUE4QixDQUFDLFdBSXZDO0lBTUEsb0RBQW9EO0lBQ3BELElBQUksVUFBc0QsQ0FBQztJQUMzRCxJQUFJLGFBQXFCLENBQUM7SUFFMUIsdURBQXVEO0lBQ3ZELElBQ0MsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUNyRTtRQUNELFVBQVUsR0FBRyxXQUFXLENBQUMsTUFJYixDQUFDO0tBQ2I7SUFDRCxvREFBb0Q7U0FDL0MsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2hFLDRCQUE0QjtRQUM1QixVQUFVLEdBQUcsTUFBTSxDQUFDO0tBQ3BCO1NBQU0sSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2xFLDJCQUEyQjtRQUMzQixVQUFVLEdBQUcsUUFBUSxDQUFDO0tBQ3RCO1NBQU07UUFDTixzREFBc0Q7UUFDdEQsVUFBVSxHQUFHLFVBQVUsQ0FBQztLQUN4QjtJQUVELCtDQUErQztJQUMvQyxRQUFRLFVBQVUsRUFBRTtRQUNuQixLQUFLLE1BQU07WUFDVixhQUFhLEdBQUcsY0FBYyxDQUFDO1lBQy9CLE1BQU07UUFDUCxLQUFLLFVBQVU7WUFDZCxh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UywwQ0FBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3RzIGZvciBQcm9qZWN0IFNvdXJjZSBXb3JrZXIgRml4XHJcbiAqXHJcbiAqIFRoaXMgdGVzdCBmaWxlIHZlcmlmaWVzIHRoYXQgdGhlIHdvcmtlciBjb3JyZWN0bHkgcmVidWlsZHMgdGdQcm9qZWN0IHdpdGggcHJvcGVyIHNvdXJjZSBkaXNwbGF5OlxyXG4gKiAxLiBNZXRhZGF0YS1iYXNlZCBwcm9qZWN0cyBzaG93IGNvcnJlY3QgXCJmcm9udG1hdHRlclwiIHNvdXJjZVxyXG4gKiAyLiBDb25maWcgZmlsZS1iYXNlZCBwcm9qZWN0cyBzaG93IGNvcnJlY3QgXCJjb25maWctZmlsZVwiIHNvdXJjZVxyXG4gKiAzLiBQYXRoLWJhc2VkIHByb2plY3RzIHNob3cgY29ycmVjdCBcInBhdGgtbWFwcGluZ1wiIHNvdXJjZVxyXG4gKiA0LiBUaGUgd29ya2VyIGxvZ2ljIGNvcnJlY3RseSBpbmZlcnMgdHlwZSBmcm9tIHNvdXJjZSBjaGFyYWN0ZXJpc3RpY3NcclxuICovXHJcblxyXG5pbXBvcnQgeyBNYXJrZG93blRhc2tQYXJzZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvY29yZS9Db25maWd1cmFibGVUYXNrUGFyc2VyXCI7XHJcbmltcG9ydCB7IFRhc2tQYXJzZXJDb25maWcsIE1ldGFkYXRhUGFyc2VNb2RlIH0gZnJvbSBcIi4uL3R5cGVzL1Rhc2tQYXJzZXJDb25maWdcIjtcclxuXHJcbi8vIE1vY2sgdGhlIHdvcmtlciBsb2dpYyBmb3IgdGVzdGluZ1xyXG5mdW5jdGlvbiBzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQocHJvamVjdEluZm86IHtcclxuXHRwcm9qZWN0OiBzdHJpbmc7XHJcblx0c291cmNlOiBzdHJpbmc7XHJcblx0cmVhZG9ubHk6IGJvb2xlYW47XHJcbn0pOiB7XHJcblx0dHlwZTogXCJtZXRhZGF0YVwiIHwgXCJwYXRoXCIgfCBcImNvbmZpZ1wiIHwgXCJkZWZhdWx0XCI7XHJcblx0bmFtZTogc3RyaW5nO1xyXG5cdHNvdXJjZTogc3RyaW5nO1xyXG5cdHJlYWRvbmx5OiBib29sZWFuO1xyXG59IHtcclxuXHQvLyBUaGlzIHNpbXVsYXRlcyB0aGUgbG9naWMgZnJvbSBUYXNrSW5kZXgud29ya2VyLnRzXHJcblx0bGV0IGFjdHVhbFR5cGU6IFwibWV0YWRhdGFcIiB8IFwicGF0aFwiIHwgXCJjb25maWdcIiB8IFwiZGVmYXVsdFwiO1xyXG5cdGxldCBkaXNwbGF5U291cmNlOiBzdHJpbmc7XHJcblxyXG5cdC8vIElmIHNvdXJjZSBpcyBvbmUgb2YgdGhlIHR5cGUgdmFsdWVzLCB1c2UgaXQgZGlyZWN0bHlcclxuXHRpZiAoXHJcblx0XHRbXCJtZXRhZGF0YVwiLCBcInBhdGhcIiwgXCJjb25maWdcIiwgXCJkZWZhdWx0XCJdLmluY2x1ZGVzKHByb2plY3RJbmZvLnNvdXJjZSlcclxuXHQpIHtcclxuXHRcdGFjdHVhbFR5cGUgPSBwcm9qZWN0SW5mby5zb3VyY2UgYXNcclxuXHRcdFx0fCBcIm1ldGFkYXRhXCJcclxuXHRcdFx0fCBcInBhdGhcIlxyXG5cdFx0XHR8IFwiY29uZmlnXCJcclxuXHRcdFx0fCBcImRlZmF1bHRcIjtcclxuXHR9XHJcblx0Ly8gT3RoZXJ3aXNlLCBpbmZlciB0eXBlIGZyb20gc291cmNlIGNoYXJhY3RlcmlzdGljc1xyXG5cdGVsc2UgaWYgKHByb2plY3RJbmZvLnNvdXJjZSAmJiBwcm9qZWN0SW5mby5zb3VyY2UuaW5jbHVkZXMoXCIvXCIpKSB7XHJcblx0XHQvLyBQYXRoIHBhdHRlcm5zIGNvbnRhaW4gXCIvXCJcclxuXHRcdGFjdHVhbFR5cGUgPSBcInBhdGhcIjtcclxuXHR9IGVsc2UgaWYgKHByb2plY3RJbmZvLnNvdXJjZSAmJiBwcm9qZWN0SW5mby5zb3VyY2UuaW5jbHVkZXMoXCIuXCIpKSB7XHJcblx0XHQvLyBDb25maWcgZmlsZXMgY29udGFpbiBcIi5cIlxyXG5cdFx0YWN0dWFsVHlwZSA9IFwiY29uZmlnXCI7XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIE1ldGFkYXRhIGtleXMgYXJlIHNpbXBsZSBzdHJpbmdzIHdpdGhvdXQgXCIvXCIgb3IgXCIuXCJcclxuXHRcdGFjdHVhbFR5cGUgPSBcIm1ldGFkYXRhXCI7XHJcblx0fVxyXG5cclxuXHQvLyBTZXQgYXBwcm9wcmlhdGUgZGlzcGxheSBzb3VyY2UgYmFzZWQgb24gdHlwZVxyXG5cdHN3aXRjaCAoYWN0dWFsVHlwZSkge1xyXG5cdFx0Y2FzZSBcInBhdGhcIjpcclxuXHRcdFx0ZGlzcGxheVNvdXJjZSA9IFwicGF0aC1tYXBwaW5nXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSBcIm1ldGFkYXRhXCI6XHJcblx0XHRcdGRpc3BsYXlTb3VyY2UgPSBcImZyb250bWF0dGVyXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSBcImNvbmZpZ1wiOlxyXG5cdFx0XHRkaXNwbGF5U291cmNlID0gXCJjb25maWctZmlsZVwiO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgXCJkZWZhdWx0XCI6XHJcblx0XHRcdGRpc3BsYXlTb3VyY2UgPSBcImRlZmF1bHQtbmFtaW5nXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHR5cGU6IGFjdHVhbFR5cGUsXHJcblx0XHRuYW1lOiBwcm9qZWN0SW5mby5wcm9qZWN0LFxyXG5cdFx0c291cmNlOiBkaXNwbGF5U291cmNlLFxyXG5cdFx0cmVhZG9ubHk6IHByb2plY3RJbmZvLnJlYWRvbmx5LFxyXG5cdH07XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiUHJvamVjdCBTb3VyY2UgV29ya2VyIEZpeFwiLCAoKSA9PiB7XHJcblx0ZGVzY3JpYmUoXCJXb3JrZXIgdGdQcm9qZWN0IFJlYnVpbGQgTG9naWNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY29ycmVjdGx5IGlkZW50aWZ5IG1ldGFkYXRhLWJhc2VkIHByb2plY3RzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEluZm8gPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNeU1ldGFkYXRhUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0TmFtZVwiLCAvLyBUaGlzIGlzIGEgbWV0YWRhdGEga2V5XHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQocHJvamVjdEluZm8pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50eXBlKS50b0JlKFwibWV0YWRhdGFcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubmFtZSkudG9CZShcIk15TWV0YWRhdGFQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcImZyb250bWF0dGVyXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlYWRvbmx5KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY29ycmVjdGx5IGlkZW50aWZ5IGNvbmZpZyBmaWxlLWJhc2VkIHByb2plY3RzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEluZm8gPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJNeUNvbmZpZ1Byb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicHJvamVjdC5tZFwiLCAvLyBUaGlzIGlzIGEgY29uZmlnIGZpbGVuYW1lXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQocHJvamVjdEluZm8pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5hbWUpLnRvQmUoXCJNeUNvbmZpZ1Byb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwiY29uZmlnLWZpbGVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVhZG9ubHkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBjb3JyZWN0bHkgaWRlbnRpZnkgcGF0aC1iYXNlZCBwcm9qZWN0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHByb2plY3RJbmZvID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiTXlQYXRoUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJwcm9qZWN0cy9cIiwgLy8gVGhpcyBpcyBhIHBhdGggcGF0dGVyblxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2ltdWxhdGVXb3JrZXJUZ1Byb2plY3RSZWJ1aWxkKHByb2plY3RJbmZvKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudHlwZSkudG9CZShcInBhdGhcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubmFtZSkudG9CZShcIk15UGF0aFByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwicGF0aC1tYXBwaW5nXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlYWRvbmx5KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY29ycmVjdGx5IGhhbmRsZSBkaXJlY3QgdHlwZSB2YWx1ZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdoZW4gc291cmNlIGlzIGRpcmVjdGx5IHRoZSB0eXBlIHZhbHVlXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhUHJvamVjdEluZm8gPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJEaXJlY3RNZXRhZGF0YVByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwibWV0YWRhdGFcIiwgLy8gRGlyZWN0IHR5cGUgdmFsdWVcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhUmVzdWx0ID1cclxuXHRcdFx0XHRzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQobWV0YWRhdGFQcm9qZWN0SW5mbyk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YVJlc3VsdC50eXBlKS50b0JlKFwibWV0YWRhdGFcIik7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YVJlc3VsdC5zb3VyY2UpLnRvQmUoXCJmcm9udG1hdHRlclwiKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbmZpZ1Byb2plY3RJbmZvID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiRGlyZWN0Q29uZmlnUHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJjb25maWdcIiwgLy8gRGlyZWN0IHR5cGUgdmFsdWVcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbmZpZ1Jlc3VsdCA9XHJcblx0XHRcdFx0c2ltdWxhdGVXb3JrZXJUZ1Byb2plY3RSZWJ1aWxkKGNvbmZpZ1Byb2plY3RJbmZvKTtcclxuXHRcdFx0ZXhwZWN0KGNvbmZpZ1Jlc3VsdC50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnUmVzdWx0LnNvdXJjZSkudG9CZShcImNvbmZpZy1maWxlXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgcGF0aFByb2plY3RJbmZvID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiRGlyZWN0UGF0aFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwicGF0aFwiLCAvLyBEaXJlY3QgdHlwZSB2YWx1ZVxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcGF0aFJlc3VsdCA9IHNpbXVsYXRlV29ya2VyVGdQcm9qZWN0UmVidWlsZChwYXRoUHJvamVjdEluZm8pO1xyXG5cdFx0XHRleHBlY3QocGF0aFJlc3VsdC50eXBlKS50b0JlKFwicGF0aFwiKTtcclxuXHRcdFx0ZXhwZWN0KHBhdGhSZXN1bHQuc291cmNlKS50b0JlKFwicGF0aC1tYXBwaW5nXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY29ycmVjdGx5IGhhbmRsZSBkZWZhdWx0IHByb2plY3QgbmFtaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEluZm8gPSB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJEZWZhdWx0UHJvamVjdFwiLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJkZWZhdWx0XCIsIC8vIERpcmVjdCB0eXBlIHZhbHVlXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQocHJvamVjdEluZm8pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50eXBlKS50b0JlKFwiZGVmYXVsdFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5uYW1lKS50b0JlKFwiRGVmYXVsdFByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwiZGVmYXVsdC1uYW1pbmdcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVhZG9ubHkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZWRnZSBjYXNlcyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IG1ldGFkYXRhIGtleSB3aXRoIHNwZWNpYWwgY2hhcmFjdGVyc1xyXG5cdFx0XHRjb25zdCBzcGVjaWFsTWV0YWRhdGFJbmZvID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiU3BlY2lhbFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwiY3VzdG9tX3Byb2plY3RfbmFtZVwiLCAvLyBNZXRhZGF0YSBrZXkgd2l0aCB1bmRlcnNjb3JlXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBzcGVjaWFsUmVzdWx0ID1cclxuXHRcdFx0XHRzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQoc3BlY2lhbE1ldGFkYXRhSW5mbyk7XHJcblx0XHRcdGV4cGVjdChzcGVjaWFsUmVzdWx0LnR5cGUpLnRvQmUoXCJtZXRhZGF0YVwiKTtcclxuXHRcdFx0ZXhwZWN0KHNwZWNpYWxSZXN1bHQuc291cmNlKS50b0JlKFwiZnJvbnRtYXR0ZXJcIik7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGNvbmZpZyBmaWxlIHdpdGggZGlmZmVyZW50IGV4dGVuc2lvblxyXG5cdFx0XHRjb25zdCB5YW1sQ29uZmlnSW5mbyA9IHtcclxuXHRcdFx0XHRwcm9qZWN0OiBcIllhbWxQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcInByb2plY3QueWFtbFwiLCAvLyBEaWZmZXJlbnQgZmlsZSBleHRlbnNpb25cclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHlhbWxSZXN1bHQgPSBzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQoeWFtbENvbmZpZ0luZm8pO1xyXG5cdFx0XHRleHBlY3QoeWFtbFJlc3VsdC50eXBlKS50b0JlKFwiY29uZmlnXCIpO1xyXG5cdFx0XHRleHBlY3QoeWFtbFJlc3VsdC5zb3VyY2UpLnRvQmUoXCJjb25maWctZmlsZVwiKTtcclxuXHJcblx0XHRcdC8vIFRlc3QgY29tcGxleCBwYXRoIHBhdHRlcm5cclxuXHRcdFx0Y29uc3QgY29tcGxleFBhdGhJbmZvID0ge1xyXG5cdFx0XHRcdHByb2plY3Q6IFwiQ29tcGxleFBhdGhQcm9qZWN0XCIsXHJcblx0XHRcdFx0c291cmNlOiBcIndvcmsvcHJvamVjdHMvXCIsIC8vIENvbXBsZXggcGF0aCBwYXR0ZXJuXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjb21wbGV4UmVzdWx0ID1cclxuXHRcdFx0XHRzaW11bGF0ZVdvcmtlclRnUHJvamVjdFJlYnVpbGQoY29tcGxleFBhdGhJbmZvKTtcclxuXHRcdFx0ZXhwZWN0KGNvbXBsZXhSZXN1bHQudHlwZSkudG9CZShcInBhdGhcIik7XHJcblx0XHRcdGV4cGVjdChjb21wbGV4UmVzdWx0LnNvdXJjZSkudG9CZShcInBhdGgtbWFwcGluZ1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkludGVncmF0aW9uIHdpdGggUGFyc2VyXCIsICgpID0+IHtcclxuXHRcdGxldCBwYXJzZXI6IE1hcmtkb3duVGFza1BhcnNlcjtcclxuXHRcdGxldCBkZWZhdWx0Q29uZmlnOiBUYXNrUGFyc2VyQ29uZmlnO1xyXG5cclxuXHRcdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0XHRkZWZhdWx0Q29uZmlnID0ge1xyXG5cdFx0XHRcdHBhcnNlTWV0YWRhdGE6IHRydWUsXHJcblx0XHRcdFx0bWV0YWRhdGFQYXJzZU1vZGU6IE1ldGFkYXRhUGFyc2VNb2RlLkJvdGgsXHJcblx0XHRcdFx0cGFyc2VUYWdzOiB0cnVlLFxyXG5cdFx0XHRcdHBhcnNlQ29tbWVudHM6IHRydWUsXHJcblx0XHRcdFx0cGFyc2VIZWFkaW5nczogdHJ1ZSxcclxuXHRcdFx0XHRtYXhJbmRlbnRTaXplOiA4LFxyXG5cdFx0XHRcdG1heFBhcnNlSXRlcmF0aW9uczogMTAwMDAwLFxyXG5cdFx0XHRcdG1heE1ldGFkYXRhSXRlcmF0aW9uczogMTAsXHJcblx0XHRcdFx0bWF4VGFnTGVuZ3RoOiAxMDAsXHJcblx0XHRcdFx0bWF4RW1vamlWYWx1ZUxlbmd0aDogMjAwLFxyXG5cdFx0XHRcdG1heFN0YWNrT3BlcmF0aW9uczogNDAwMCxcclxuXHRcdFx0XHRtYXhTdGFja1NpemU6IDEwMDAsXHJcblx0XHRcdFx0ZW1vamlNYXBwaW5nOiB7XHJcblx0XHRcdFx0XHRcIvCflLpcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XCLij6tcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XCLwn5S8XCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFwi8J+UvVwiOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcIuKPrFwiOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzcGVjaWFsVGFnUHJlZml4ZXM6IHtcclxuXHRcdFx0XHRcdGR1ZTogXCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XHRzdGFydDogXCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRcdHNjaGVkdWxlZDogXCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzdGF0dXNNYXBwaW5nOiB7XHJcblx0XHRcdFx0XHR0b2RvOiBcIiBcIixcclxuXHRcdFx0XHRcdGRvbmU6IFwieFwiLFxyXG5cdFx0XHRcdFx0Y2FuY2VsbGVkOiBcIi1cIixcclxuXHRcdFx0XHRcdGZvcndhcmRlZDogXCI+XCIsXHJcblx0XHRcdFx0XHRzY2hlZHVsZWQ6IFwiPFwiLFxyXG5cdFx0XHRcdFx0cXVlc3Rpb246IFwiP1wiLFxyXG5cdFx0XHRcdFx0aW1wb3J0YW50OiBcIiFcIixcclxuXHRcdFx0XHRcdHN0YXI6IFwiKlwiLFxyXG5cdFx0XHRcdFx0cXVvdGU6ICdcIicsXHJcblx0XHRcdFx0XHRsb2NhdGlvbjogXCJsXCIsXHJcblx0XHRcdFx0XHRib29rbWFyazogXCJiXCIsXHJcblx0XHRcdFx0XHRpbmZvcm1hdGlvbjogXCJpXCIsXHJcblx0XHRcdFx0XHRzYXZpbmdzOiBcIlNcIixcclxuXHRcdFx0XHRcdGlkZWE6IFwiSVwiLFxyXG5cdFx0XHRcdFx0cHJvczogXCJwXCIsXHJcblx0XHRcdFx0XHRjb25zOiBcImNcIixcclxuXHRcdFx0XHRcdGZpcmU6IFwiZlwiLFxyXG5cdFx0XHRcdFx0a2V5OiBcImtcIixcclxuXHRcdFx0XHRcdHdpbjogXCJ3XCIsXHJcblx0XHRcdFx0XHR1cDogXCJ1XCIsXHJcblx0XHRcdFx0XHRkb3duOiBcImRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogdHJ1ZSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3ROYW1lXCIsXHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdGZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoZGVmYXVsdENvbmZpZyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBjb3JyZWN0bHkgcGFzcyB0aHJvdWdoIHRnUHJvamVjdCB3aGVuIHByb3ZpZGVkXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBcIi0gWyBdIFRlc3QgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cclxuXHRcdFx0Ly8gU2ltdWxhdGUgdGhlIGNvcnJlY3RlZCB0Z1Byb2plY3QgZnJvbSB3b3JrZXJcclxuXHRcdFx0Y29uc3QgY29ycmVjdGVkVGdQcm9qZWN0ID0ge1xyXG5cdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRuYW1lOiBcIldvcmtlckNvcnJlY3RlZFByb2plY3RcIixcclxuXHRcdFx0XHRzb3VyY2U6IFwiZnJvbnRtYXR0ZXJcIixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlKFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0Y29ycmVjdGVkVGdQcm9qZWN0XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3QpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnRnUHJvamVjdD8udHlwZSkudG9CZShcIm1ldGFkYXRhXCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/Lm5hbWUpLnRvQmUoXCJXb3JrZXJDb3JyZWN0ZWRQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay50Z1Byb2plY3Q/LnNvdXJjZSkudG9CZShcImZyb250bWF0dGVyXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=