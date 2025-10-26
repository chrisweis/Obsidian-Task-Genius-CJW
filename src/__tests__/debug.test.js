/**
 * Debug test for complex task parsing
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { getConfig } from "../common/task-parser-config";
import { createMockPlugin } from "./mockUtils";
describe("Debug Complex Task Parsing", () => {
    test("debug complex task step by step", () => {
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "tasks",
            projectTagPrefix: {
                tasks: "project",
                dataview: "project",
            },
            contextTagPrefix: {
                tasks: "@",
                dataview: "context",
            },
            areaTagPrefix: {
                tasks: "area",
                dataview: "area",
            },
        });
        const config = getConfig("tasks", mockPlugin);
        const parser = new MarkdownTaskParser(config);
        const content = "- [ ] Complex task #project/work @office 📅 2024-12-31 🔺 #important #urgent 🔁 every week";
        const tasks = parser.parseLegacy(content, "test.md");
        console.log("Parsed task:", JSON.stringify(tasks[0], null, 2));
        console.log("Config specialTagPrefixes:", config.specialTagPrefixes);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].content).toBe("Complex task");
        expect(tasks[0].metadata.project).toBe("work");
        expect(tasks[0].metadata.context).toBe("office");
    });
    test("debug simple project tag", () => {
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "tasks",
            projectTagPrefix: {
                tasks: "project",
                dataview: "project",
            },
            contextTagPrefix: {
                tasks: "@",
                dataview: "context",
            },
            areaTagPrefix: {
                tasks: "area",
                dataview: "area",
            },
        });
        const config = getConfig("tasks", mockPlugin);
        const parser = new MarkdownTaskParser(config);
        const content = "- [ ] Simple task #project/work";
        const tasks = parser.parseLegacy(content, "test.md");
        console.log("Simple task:", JSON.stringify(tasks[0], null, 2));
        console.log("Config specialTagPrefixes:", config.specialTagPrefixes);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].content).toBe("Simple task");
        expect(tasks[0].metadata.project).toBe("work");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlYnVnLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRS9DLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDM0MsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQztZQUNuQyxvQkFBb0IsRUFBRSxPQUFPO1lBQzdCLGdCQUFnQixFQUFFO2dCQUNqQixLQUFLLEVBQUUsU0FBUztnQkFDaEIsUUFBUSxFQUFFLFNBQVM7YUFDbkI7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsUUFBUSxFQUFFLFNBQVM7YUFDbkI7WUFDRCxhQUFhLEVBQUU7Z0JBQ2QsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsUUFBUSxFQUFFLE1BQU07YUFDaEI7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUMsTUFBTSxPQUFPLEdBQ1osNEZBQTRGLENBQUM7UUFDOUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBRSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVyRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO1lBQ25DLG9CQUFvQixFQUFFLE9BQU87WUFDN0IsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxTQUFTO2dCQUNoQixRQUFRLEVBQUUsU0FBUzthQUNuQjtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixLQUFLLEVBQUUsR0FBRztnQkFDVixRQUFRLEVBQUUsU0FBUzthQUNuQjtZQUNELGFBQWEsRUFBRTtnQkFDZCxLQUFLLEVBQUUsTUFBTTtnQkFDYixRQUFRLEVBQUUsTUFBTTthQUNoQjtTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5QyxNQUFNLE9BQU8sR0FBRyxpQ0FBaUMsQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVyRCxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXJFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRGVidWcgdGVzdCBmb3IgY29tcGxleCB0YXNrIHBhcnNpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBNYXJrZG93blRhc2tQYXJzZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvY29yZS9Db25maWd1cmFibGVUYXNrUGFyc2VyXCI7XHJcbmltcG9ydCB7IGdldENvbmZpZyB9IGZyb20gXCIuLi9jb21tb24vdGFzay1wYXJzZXItY29uZmlnXCI7XHJcbmltcG9ydCB7IGNyZWF0ZU1vY2tQbHVnaW4gfSBmcm9tIFwiLi9tb2NrVXRpbHNcIjtcclxuXHJcbmRlc2NyaWJlKFwiRGVidWcgQ29tcGxleCBUYXNrIFBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdHRlc3QoXCJkZWJ1ZyBjb21wbGV4IHRhc2sgc3RlcCBieSBzdGVwXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwidGFza3NcIixcclxuXHRcdFx0cHJvamVjdFRhZ1ByZWZpeDoge1xyXG5cdFx0XHRcdHRhc2tzOiBcInByb2plY3RcIixcclxuXHRcdFx0XHRkYXRhdmlldzogXCJwcm9qZWN0XCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHtcclxuXHRcdFx0XHR0YXNrczogXCJAXCIsXHJcblx0XHRcdFx0ZGF0YXZpZXc6IFwiY29udGV4dFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRhcmVhVGFnUHJlZml4OiB7XHJcblx0XHRcdFx0dGFza3M6IFwiYXJlYVwiLFxyXG5cdFx0XHRcdGRhdGF2aWV3OiBcImFyZWFcIixcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZyhcInRhc2tzXCIsIG1vY2tQbHVnaW4pO1xyXG5cdFx0Y29uc3QgcGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWcpO1xyXG5cclxuXHRcdGNvbnN0IGNvbnRlbnQgPVxyXG5cdFx0XHRcIi0gWyBdIENvbXBsZXggdGFzayAjcHJvamVjdC93b3JrIEBvZmZpY2Ug8J+ThSAyMDI0LTEyLTMxIPCflLogI2ltcG9ydGFudCAjdXJnZW50IPCflIEgZXZlcnkgd2Vla1wiO1xyXG5cdFx0Y29uc3QgdGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgXCJ0ZXN0Lm1kXCIpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiUGFyc2VkIHRhc2s6XCIsIEpTT04uc3RyaW5naWZ5KHRhc2tzWzBdLCBudWxsLCAyKSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkNvbmZpZyBzcGVjaWFsVGFnUHJlZml4ZXM6XCIsIGNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXMpO1xyXG5cclxuXHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0ZXhwZWN0KHRhc2tzWzBdLmNvbnRlbnQpLnRvQmUoXCJDb21wbGV4IHRhc2tcIik7XHJcblx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEucHJvamVjdCkudG9CZShcIndvcmtcIik7XHJcblx0XHRleHBlY3QodGFza3NbMF0ubWV0YWRhdGEuY29udGV4dCkudG9CZShcIm9mZmljZVwiKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcImRlYnVnIHNpbXBsZSBwcm9qZWN0IHRhZ1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsXHJcblx0XHRcdHByb2plY3RUYWdQcmVmaXg6IHtcclxuXHRcdFx0XHR0YXNrczogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0ZGF0YXZpZXc6IFwicHJvamVjdFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250ZXh0VGFnUHJlZml4OiB7XHJcblx0XHRcdFx0dGFza3M6IFwiQFwiLFxyXG5cdFx0XHRcdGRhdGF2aWV3OiBcImNvbnRleHRcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0YXJlYVRhZ1ByZWZpeDoge1xyXG5cdFx0XHRcdHRhc2tzOiBcImFyZWFcIixcclxuXHRcdFx0XHRkYXRhdmlldzogXCJhcmVhXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBjb25maWcgPSBnZXRDb25maWcoXCJ0YXNrc1wiLCBtb2NrUGx1Z2luKTtcclxuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIoY29uZmlnKTtcclxuXHJcblx0XHRjb25zdCBjb250ZW50ID0gXCItIFsgXSBTaW1wbGUgdGFzayAjcHJvamVjdC93b3JrXCI7XHJcblx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIik7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJTaW1wbGUgdGFzazpcIiwgSlNPTi5zdHJpbmdpZnkodGFza3NbMF0sIG51bGwsIDIpKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiQ29uZmlnIHNwZWNpYWxUYWdQcmVmaXhlczpcIiwgY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlcyk7XHJcblxyXG5cdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRleHBlY3QodGFza3NbMF0uY29udGVudCkudG9CZShcIlNpbXBsZSB0YXNrXCIpO1xyXG5cdFx0ZXhwZWN0KHRhc2tzWzBdLm1ldGFkYXRhLnByb2plY3QpLnRvQmUoXCJ3b3JrXCIpO1xyXG5cdH0pO1xyXG59KTtcclxuIl19