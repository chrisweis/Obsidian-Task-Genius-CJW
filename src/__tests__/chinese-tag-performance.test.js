/**
 * Performance test for Chinese tag parsing
 * This test compares the performance of the optimized character-based approach
 * vs regex-based approaches for parsing Chinese nested tags.
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { getConfig } from "../common/task-parser-config";
import { createMockPlugin } from "./mockUtils";
describe("Chinese Tag Parsing Performance", () => {
    let parser;
    beforeEach(() => {
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "tasks",
            projectTagPrefix: { tasks: "project", dataview: "project" },
            contextTagPrefix: { tasks: "@", dataview: "context" },
            areaTagPrefix: { tasks: "area", dataview: "area" },
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
            },
        });
        const config = getConfig("tasks", mockPlugin);
        parser = new MarkdownTaskParser(config);
    });
    test("should efficiently parse large number of Chinese nested tags", () => {
        // Generate 1000 tasks with nested Chinese tags
        const tasks = Array.from({ length: 1000 }, (_, i) => `- [ ] 任务${i + 1} #project/工作项目/子项目${i % 5} #category/中文类别${i % 3}`);
        const content = tasks.join("\n");
        const startTime = performance.now();
        const parsedTasks = parser.parseLegacy(content, "performance-test.md");
        const endTime = performance.now();
        const parseTime = endTime - startTime;
        // Verify basic correctness
        expect(parsedTasks).toHaveLength(1000);
        expect(parsedTasks[0].metadata.project).toContain("工作项目");
        expect(parsedTasks[0].metadata.tags).toContain("#category/中文类别0");
        // Performance expectation: should parse 1000 tasks in under 100ms
        console.log(`Parsed 1000 Chinese nested tags in ${parseTime.toFixed(2)}ms`);
        expect(parseTime).toBeLessThan(100);
    });
    test("should efficiently parse mixed Chinese and English tags", () => {
        const tasks = Array.from({ length: 500 }, (_, i) => `- [ ] Task${i} #工作项目/frontend #category/学习/programming @办公室 #重要`);
        const content = tasks.join("\n");
        const startTime = performance.now();
        const parsedTasks = parser.parseLegacy(content, "mixed-test.md");
        const endTime = performance.now();
        const parseTime = endTime - startTime;
        // Verify basic correctness
        expect(parsedTasks).toHaveLength(500);
        console.log("First task content:", parsedTasks[0].content);
        console.log("First task tags:", parsedTasks[0].metadata.tags);
        console.log("First task context:", parsedTasks[0].metadata.context);
        expect(parsedTasks[0].metadata.context).toBe("办公室");
        console.log(`Parsed 500 mixed Chinese/English tags in ${parseTime.toFixed(2)}ms`);
        expect(parseTime).toBeLessThan(100);
    });
    test("should handle deeply nested Chinese tags efficiently", () => {
        const tasks = Array.from({ length: 100 }, (_, i) => `- [ ] 深度嵌套任务${i} #类别/工作/项目/前端/组件/按钮/样式/主题/颜色/蓝色`);
        const content = tasks.join("\n");
        const startTime = performance.now();
        const parsedTasks = parser.parseLegacy(content, "deep-nested-test.md");
        const endTime = performance.now();
        const parseTime = endTime - startTime;
        // Verify correctness
        expect(parsedTasks).toHaveLength(100);
        expect(parsedTasks[0].metadata.tags).toContain("#类别/工作/项目/前端/组件/按钮/样式/主题/颜色/蓝色");
        console.log(`Parsed 100 deeply nested Chinese tags in ${parseTime.toFixed(2)}ms`);
        expect(parseTime).toBeLessThan(20);
    });
    test("should handle Chinese tags with special characters", () => {
        const specialChineseTags = [
            "#项目2024/第1季度/Q1-计划",
            "#工作_流程/审批-系统/用户_管理",
            "#学习2025/前端-技术/React_项目",
            "#生活记录/2024年/12月-计划",
            "#读书笔记/技术书籍/JavaScript-高级",
        ];
        const tasks = specialChineseTags.map((tag, i) => `- [ ] 特殊字符任务${i} ${tag}`);
        const content = tasks.join("\n");
        const startTime = performance.now();
        const parsedTasks = parser.parseLegacy(content, "special-chars-test.md");
        const endTime = performance.now();
        const parseTime = endTime - startTime;
        // Verify correctness
        expect(parsedTasks).toHaveLength(5);
        specialChineseTags.forEach((tag, i) => {
            expect(parsedTasks[i].metadata.tags).toContain(tag);
        });
        console.log(`Parsed Chinese tags with special characters in ${parseTime.toFixed(2)}ms`);
        expect(parseTime).toBeLessThan(10);
    });
    test("should not treat [[Note#Title|Title]] as tags", () => {
        const testCases = [
            "- [ ] 任务内容 [[笔记#标题|显示标题]] #真正的标签",
            "- [ ] Task with [[Note#Title|Title]] and #real-tag",
            "- [ ] Multiple [[Link1#Title1|Display1]] [[Link2#Title2|Display2]] #tag1 #tag2",
            "- [ ] Chinese [[中文笔记#中文标题|中文显示]] #中文标签",
        ];
        const content = testCases.join("\n");
        const parsedTasks = parser.parseLegacy(content, "link-test.md");
        // Verify correctness
        expect(parsedTasks).toHaveLength(4);
        // First task should only have #真正的标签, not the [[笔记#标题|显示标题]]
        expect(parsedTasks[0].content).toContain("[[笔记#标题|显示标题]]");
        expect(parsedTasks[0].metadata.tags).toEqual(["#真正的标签"]);
        // Second task should only have #real-tag
        expect(parsedTasks[1].content).toContain("[[Note#Title|Title]]");
        expect(parsedTasks[1].metadata.tags).toEqual(["#real-tag"]);
        // Third task should have #tag1 and #tag2
        expect(parsedTasks[2].content).toContain("[[Link1#Title1|Display1]]");
        expect(parsedTasks[2].content).toContain("[[Link2#Title2|Display2]]");
        expect(parsedTasks[2].metadata.tags).toEqual(["#tag1", "#tag2"]);
        // Fourth task should only have #中文标签
        expect(parsedTasks[3].content).toContain("[[中文笔记#中文标题|中文显示]]");
        expect(parsedTasks[3].metadata.tags).toEqual(["#中文标签"]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hpbmVzZS10YWctcGVyZm9ybWFuY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNoaW5lc2UtdGFnLXBlcmZvcm1hbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFL0MsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxJQUFJLE1BQTBCLENBQUM7SUFFL0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO1lBQ25DLG9CQUFvQixFQUFFLE9BQU87WUFDN0IsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDM0QsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDckQsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFO1lBQ2xELGFBQWEsRUFBRTtnQkFDZCxxQkFBcUIsRUFBRSxLQUFLO2dCQUM1QixZQUFZLEVBQUUsRUFBRTtnQkFDaEIsY0FBYyxFQUFFO29CQUNmLFdBQVcsRUFBRSxTQUFTO29CQUd0QixPQUFPLEVBQUUsS0FBSztpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsUUFBUSxFQUFFLFlBQVk7b0JBQ3RCLGlCQUFpQixFQUFFLEtBQUs7b0JBQ3hCLE9BQU8sRUFBRSxLQUFLO2lCQUNkO2dCQUNELGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLG9CQUFvQixFQUFFO29CQUNyQixRQUFRLEVBQUUsVUFBbUI7b0JBQzdCLGNB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QUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRWpFLHFDQUFxQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBQZXJmb3JtYW5jZSB0ZXN0IGZvciBDaGluZXNlIHRhZyBwYXJzaW5nXHJcbiAqIFRoaXMgdGVzdCBjb21wYXJlcyB0aGUgcGVyZm9ybWFuY2Ugb2YgdGhlIG9wdGltaXplZCBjaGFyYWN0ZXItYmFzZWQgYXBwcm9hY2hcclxuICogdnMgcmVnZXgtYmFzZWQgYXBwcm9hY2hlcyBmb3IgcGFyc2luZyBDaGluZXNlIG5lc3RlZCB0YWdzLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1hcmtkb3duVGFza1BhcnNlciB9IGZyb20gXCIuLi9kYXRhZmxvdy9jb3JlL0NvbmZpZ3VyYWJsZVRhc2tQYXJzZXJcIjtcclxuaW1wb3J0IHsgZ2V0Q29uZmlnIH0gZnJvbSBcIi4uL2NvbW1vbi90YXNrLXBhcnNlci1jb25maWdcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuZGVzY3JpYmUoXCJDaGluZXNlIFRhZyBQYXJzaW5nIFBlcmZvcm1hbmNlXCIsICgpID0+IHtcclxuXHRsZXQgcGFyc2VyOiBNYXJrZG93blRhc2tQYXJzZXI7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdFx0XHRwcm9qZWN0VGFnUHJlZml4OiB7IHRhc2tzOiBcInByb2plY3RcIiwgZGF0YXZpZXc6IFwicHJvamVjdFwiIH0sXHJcblx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHsgdGFza3M6IFwiQFwiLCBkYXRhdmlldzogXCJjb250ZXh0XCIgfSxcclxuXHRcdFx0YXJlYVRhZ1ByZWZpeDogeyB0YXNrczogXCJhcmVhXCIsIGRhdGF2aWV3OiBcImFyZWFcIiB9LFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnOiB7XHJcblx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiBmYWxzZSxcclxuXHRcdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRmaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogZmFsc2UsXHJcblx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB7XHJcblx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiIGFzIGNvbnN0LFxyXG5cdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZyhcInRhc2tzXCIsIG1vY2tQbHVnaW4pO1xyXG5cdFx0cGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWcpO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIGVmZmljaWVudGx5IHBhcnNlIGxhcmdlIG51bWJlciBvZiBDaGluZXNlIG5lc3RlZCB0YWdzXCIsICgpID0+IHtcclxuXHRcdC8vIEdlbmVyYXRlIDEwMDAgdGFza3Mgd2l0aCBuZXN0ZWQgQ2hpbmVzZSB0YWdzXHJcblx0XHRjb25zdCB0YXNrcyA9IEFycmF5LmZyb20oXHJcblx0XHRcdHsgbGVuZ3RoOiAxMDAwIH0sXHJcblx0XHRcdChfLCBpKSA9PlxyXG5cdFx0XHRcdGAtIFsgXSDku7vliqEke2kgKyAxfSAjcHJvamVjdC/lt6XkvZzpobnnm64v5a2Q6aG555uuJHtcclxuXHRcdFx0XHRcdGkgJSA1XHJcblx0XHRcdFx0fSAjY2F0ZWdvcnkv5Lit5paH57G75YirJHtpICUgM31gXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGVudCA9IHRhc2tzLmpvaW4oXCJcXG5cIik7XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRjb25zdCBwYXJzZWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInBlcmZvcm1hbmNlLXRlc3QubWRcIik7XHJcblx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG5cdFx0Y29uc3QgcGFyc2VUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHQvLyBWZXJpZnkgYmFzaWMgY29ycmVjdG5lc3NcclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrcykudG9IYXZlTGVuZ3RoKDEwMDApO1xyXG5cdFx0ZXhwZWN0KHBhcnNlZFRhc2tzWzBdLm1ldGFkYXRhLnByb2plY3QpLnRvQ29udGFpbihcIuW3peS9nOmhueebrlwiKTtcclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrc1swXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4oXCIjY2F0ZWdvcnkv5Lit5paH57G75YirMFwiKTtcclxuXHJcblx0XHQvLyBQZXJmb3JtYW5jZSBleHBlY3RhdGlvbjogc2hvdWxkIHBhcnNlIDEwMDAgdGFza3MgaW4gdW5kZXIgMTAwbXNcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgUGFyc2VkIDEwMDAgQ2hpbmVzZSBuZXN0ZWQgdGFncyBpbiAke3BhcnNlVGltZS50b0ZpeGVkKDIpfW1zYFxyXG5cdFx0KTtcclxuXHRcdGV4cGVjdChwYXJzZVRpbWUpLnRvQmVMZXNzVGhhbigxMDApO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIGVmZmljaWVudGx5IHBhcnNlIG1peGVkIENoaW5lc2UgYW5kIEVuZ2xpc2ggdGFnc1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCB0YXNrcyA9IEFycmF5LmZyb20oXHJcblx0XHRcdHsgbGVuZ3RoOiA1MDAgfSxcclxuXHRcdFx0KF8sIGkpID0+XHJcblx0XHRcdFx0YC0gWyBdIFRhc2ske2l9ICPlt6XkvZzpobnnm64vZnJvbnRlbmQgI2NhdGVnb3J5L+WtpuS5oC9wcm9ncmFtbWluZyBA5Yqe5YWs5a6kICPph43opoFgXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGVudCA9IHRhc2tzLmpvaW4oXCJcXG5cIik7XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRjb25zdCBwYXJzZWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcIm1peGVkLXRlc3QubWRcIik7XHJcblx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG5cdFx0Y29uc3QgcGFyc2VUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHQvLyBWZXJpZnkgYmFzaWMgY29ycmVjdG5lc3NcclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrcykudG9IYXZlTGVuZ3RoKDUwMCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkZpcnN0IHRhc2sgY29udGVudDpcIiwgcGFyc2VkVGFza3NbMF0uY29udGVudCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkZpcnN0IHRhc2sgdGFnczpcIiwgcGFyc2VkVGFza3NbMF0ubWV0YWRhdGEudGFncyk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkZpcnN0IHRhc2sgY29udGV4dDpcIiwgcGFyc2VkVGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCk7XHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcIuWKnuWFrOWupFwiKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFBhcnNlZCA1MDAgbWl4ZWQgQ2hpbmVzZS9FbmdsaXNoIHRhZ3MgaW4gJHtwYXJzZVRpbWUudG9GaXhlZCgyKX1tc2BcclxuXHRcdCk7XHJcblx0XHRleHBlY3QocGFyc2VUaW1lKS50b0JlTGVzc1RoYW4oMTAwKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcInNob3VsZCBoYW5kbGUgZGVlcGx5IG5lc3RlZCBDaGluZXNlIHRhZ3MgZWZmaWNpZW50bHlcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgdGFza3MgPSBBcnJheS5mcm9tKFxyXG5cdFx0XHR7IGxlbmd0aDogMTAwIH0sXHJcblx0XHRcdChfLCBpKSA9PlxyXG5cdFx0XHRcdGAtIFsgXSDmt7HluqbltYzlpZfku7vliqEke2l9ICPnsbvliKsv5bel5L2cL+mhueebri/liY3nq68v57uE5Lu2L+aMiemSri/moLflvI8v5Li76aKYL+minOiJsi/ok53oibJgXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGVudCA9IHRhc2tzLmpvaW4oXCJcXG5cIik7XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRjb25zdCBwYXJzZWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcImRlZXAtbmVzdGVkLXRlc3QubWRcIik7XHJcblx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG5cdFx0Y29uc3QgcGFyc2VUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHQvLyBWZXJpZnkgY29ycmVjdG5lc3NcclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrcykudG9IYXZlTGVuZ3RoKDEwMCk7XHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMF0ubWV0YWRhdGEudGFncykudG9Db250YWluKFxyXG5cdFx0XHRcIiPnsbvliKsv5bel5L2cL+mhueebri/liY3nq68v57uE5Lu2L+aMiemSri/moLflvI8v5Li76aKYL+minOiJsi/ok53oibJcIlxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFBhcnNlZCAxMDAgZGVlcGx5IG5lc3RlZCBDaGluZXNlIHRhZ3MgaW4gJHtwYXJzZVRpbWUudG9GaXhlZCgyKX1tc2BcclxuXHRcdCk7XHJcblx0XHRleHBlY3QocGFyc2VUaW1lKS50b0JlTGVzc1RoYW4oMjApO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBDaGluZXNlIHRhZ3Mgd2l0aCBzcGVjaWFsIGNoYXJhY3RlcnNcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3Qgc3BlY2lhbENoaW5lc2VUYWdzID0gW1xyXG5cdFx0XHRcIiPpobnnm64yMDI0L+esrDHlraPluqYvUTEt6K6h5YiSXCIsXHJcblx0XHRcdFwiI+W3peS9nF/mtYHnqIsv5a6h5om5Leezu+e7ny/nlKjmiLdf566h55CGXCIsXHJcblx0XHRcdFwiI+WtpuS5oDIwMjUv5YmN56uvLeaKgOacry9SZWFjdF/pobnnm65cIixcclxuXHRcdFx0XCIj55Sf5rS76K6w5b2VLzIwMjTlubQvMTLmnIgt6K6h5YiSXCIsXHJcblx0XHRcdFwiI+ivu+S5pueslOiusC/mioDmnK/kuabnsY0vSmF2YVNjcmlwdC3pq5jnuqdcIixcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgdGFza3MgPSBzcGVjaWFsQ2hpbmVzZVRhZ3MubWFwKFxyXG5cdFx0XHQodGFnLCBpKSA9PiBgLSBbIF0g54m55q6K5a2X56ym5Lu75YqhJHtpfSAke3RhZ31gXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGVudCA9IHRhc2tzLmpvaW4oXCJcXG5cIik7XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRjb25zdCBwYXJzZWRUYXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShcclxuXHRcdFx0Y29udGVudCxcclxuXHRcdFx0XCJzcGVjaWFsLWNoYXJzLXRlc3QubWRcIlxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGVuZFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcblx0XHRjb25zdCBwYXJzZVRpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdC8vIFZlcmlmeSBjb3JyZWN0bmVzc1xyXG5cdFx0ZXhwZWN0KHBhcnNlZFRhc2tzKS50b0hhdmVMZW5ndGgoNSk7XHJcblx0XHRzcGVjaWFsQ2hpbmVzZVRhZ3MuZm9yRWFjaCgodGFnLCBpKSA9PiB7XHJcblx0XHRcdGV4cGVjdChwYXJzZWRUYXNrc1tpXS5tZXRhZGF0YS50YWdzKS50b0NvbnRhaW4odGFnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgUGFyc2VkIENoaW5lc2UgdGFncyB3aXRoIHNwZWNpYWwgY2hhcmFjdGVycyBpbiAke3BhcnNlVGltZS50b0ZpeGVkKFxyXG5cdFx0XHRcdDJcclxuXHRcdFx0KX1tc2BcclxuXHRcdCk7XHJcblx0XHRleHBlY3QocGFyc2VUaW1lKS50b0JlTGVzc1RoYW4oMTApO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIG5vdCB0cmVhdCBbW05vdGUjVGl0bGV8VGl0bGVdXSBhcyB0YWdzXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuXHRcdFx0XCItIFsgXSDku7vliqHlhoXlrrkgW1vnrJTorrAj5qCH6aKYfOaYvuekuuagh+mimF1dICPnnJ/mraPnmoTmoIfnrb5cIixcclxuXHRcdFx0XCItIFsgXSBUYXNrIHdpdGggW1tOb3RlI1RpdGxlfFRpdGxlXV0gYW5kICNyZWFsLXRhZ1wiLFxyXG5cdFx0XHRcIi0gWyBdIE11bHRpcGxlIFtbTGluazEjVGl0bGUxfERpc3BsYXkxXV0gW1tMaW5rMiNUaXRsZTJ8RGlzcGxheTJdXSAjdGFnMSAjdGFnMlwiLFxyXG5cdFx0XHRcIi0gWyBdIENoaW5lc2UgW1vkuK3mlofnrJTorrAj5Lit5paH5qCH6aKYfOS4reaWh+aYvuekul1dICPkuK3mlofmoIfnrb5cIixcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgY29udGVudCA9IHRlc3RDYXNlcy5qb2luKFwiXFxuXCIpO1xyXG5cdFx0Y29uc3QgcGFyc2VkVGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJsaW5rLXRlc3QubWRcIik7XHJcblxyXG5cdFx0Ly8gVmVyaWZ5IGNvcnJlY3RuZXNzXHJcblx0XHRleHBlY3QocGFyc2VkVGFza3MpLnRvSGF2ZUxlbmd0aCg0KTtcclxuXHRcdFxyXG5cdFx0Ly8gRmlyc3QgdGFzayBzaG91bGQgb25seSBoYXZlICPnnJ/mraPnmoTmoIfnrb4sIG5vdCB0aGUgW1vnrJTorrAj5qCH6aKYfOaYvuekuuagh+mimF1dXHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMF0uY29udGVudCkudG9Db250YWluKFwiW1vnrJTorrAj5qCH6aKYfOaYvuekuuagh+mimF1dXCIpO1xyXG5cdFx0ZXhwZWN0KHBhcnNlZFRhc2tzWzBdLm1ldGFkYXRhLnRhZ3MpLnRvRXF1YWwoW1wiI+ecn+ato+eahOagh+etvlwiXSk7XHJcblx0XHRcclxuXHRcdC8vIFNlY29uZCB0YXNrIHNob3VsZCBvbmx5IGhhdmUgI3JlYWwtdGFnXHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMV0uY29udGVudCkudG9Db250YWluKFwiW1tOb3RlI1RpdGxlfFRpdGxlXV1cIik7XHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMV0ubWV0YWRhdGEudGFncykudG9FcXVhbChbXCIjcmVhbC10YWdcIl0pO1xyXG5cdFx0XHJcblx0XHQvLyBUaGlyZCB0YXNrIHNob3VsZCBoYXZlICN0YWcxIGFuZCAjdGFnMlxyXG5cdFx0ZXhwZWN0KHBhcnNlZFRhc2tzWzJdLmNvbnRlbnQpLnRvQ29udGFpbihcIltbTGluazEjVGl0bGUxfERpc3BsYXkxXV1cIik7XHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbMl0uY29udGVudCkudG9Db250YWluKFwiW1tMaW5rMiNUaXRsZTJ8RGlzcGxheTJdXVwiKTtcclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrc1syXS5tZXRhZGF0YS50YWdzKS50b0VxdWFsKFtcIiN0YWcxXCIsIFwiI3RhZzJcIl0pO1xyXG5cdFx0XHJcblx0XHQvLyBGb3VydGggdGFzayBzaG91bGQgb25seSBoYXZlICPkuK3mlofmoIfnrb5cclxuXHRcdGV4cGVjdChwYXJzZWRUYXNrc1szXS5jb250ZW50KS50b0NvbnRhaW4oXCJbW+S4reaWh+eslOiusCPkuK3mlofmoIfpoph85Lit5paH5pi+56S6XV1cIik7XHJcblx0XHRleHBlY3QocGFyc2VkVGFza3NbM10ubWV0YWRhdGEudGFncykudG9FcXVhbChbXCIj5Lit5paH5qCH562+XCJdKTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==