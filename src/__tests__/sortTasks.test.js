import { sortTasksInDocument } from "../commands/sortTaskCommands";
import { createMockPlugin, createMockEditorView, } from "./mockUtils";
describe("sortTasksInDocument", () => {
    it("should identify and sort tasks", () => {
        // Original content: mixed task order
        const originalContent = `
- [ ] Incomplete task 1
- [x] Completed task
- [/] In progress task`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            sortTasks: true,
            sortCriteria: [{ field: "status", order: "asc" }],
        });
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: text sorted by status
        const expectedContent = `
- [ ] Incomplete task 1
- [/] In progress task
- [x] Completed task`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should place completed tasks at the end regardless of sort criteria", () => {
        // Original content: mixed task order
        const originalContent = `
- [x] Completed task 1
- [ ] Incomplete task [priority:: high] [due:: 2025-05-01]
- [/] In progress task [start:: 2025-04-01]
- [x] Completed task 2`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "dataview",
            sortTasks: true,
            sortCriteria: [
                { field: "completed", order: "asc" },
                { field: "priority", order: "asc" },
            ],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: 现在按 completed 然后 priority 排序
        const expectedContent = `
- [ ] Incomplete task [priority:: high] [due:: 2025-05-01]
- [/] In progress task [start:: 2025-04-01]
- [x] Completed task 1
- [x] Completed task 2`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should maintain relative position of non-contiguous task blocks", () => {
        // Original content: two task blocks separated by non-task lines
        const originalContent = `
First task block:
- [x] Completed task 1
- [ ] Incomplete task 1

Middle non-task content

Second task block:
- [x] Completed task 2
- [ ] Incomplete task 2`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            sortTasks: true,
            sortCriteria: [{ field: "status", order: "asc" }],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: each block sorted internally, but blocks maintain relative position
        const expectedContent = `
First task block:
- [ ] Incomplete task 1
- [x] Completed task 1

Middle non-task content

Second task block:
- [ ] Incomplete task 2
- [x] Completed task 2`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should preserve task hierarchy (parent-child relationships)", () => {
        // Original content: tasks with parent-child relationships
        const originalContent = `
- [x] Parent task 1
  - [ ] Child task 1
  - [/] Child task 2
- [ ] Parent task 2
  - [x] Child task 3`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            sortTasks: true,
            sortCriteria: [{ field: "status", order: "asc" }],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: parent tasks sorted, child tasks follow their respective parents
        const expectedContent = `
- [ ] Parent task 2
  - [x] Child task 3
- [x] Parent task 1
  - [ ] Child task 1
  - [/] Child task 2`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should sort tasks by multiple criteria", () => {
        // Original content: tasks with various metadata
        const originalContent = `
- [ ] Low priority [priority:: 1] [due:: 2025-05-01]
- [ ] High priority [priority:: 3]
- [ ] Medium priority with due date [priority:: 2] [due:: 2025-04-01]
- [ ] Medium priority with later due date [priority:: 2] [due:: 2025-06-01]`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "dataview",
            sortTasks: true,
            sortCriteria: [
                { field: "priority", order: "asc" },
                { field: "dueDate", order: "asc" },
            ],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: sorted first by priority (1->2->3), then by due date (early->late)
        const expectedContent = `
- [ ] Low priority [priority:: 1] [due:: 2025-05-01]
- [ ] Medium priority with due date [priority:: 2] [due:: 2025-04-01]
- [ ] Medium priority with later due date [priority:: 2] [due:: 2025-06-01]
- [ ] High priority [priority:: 3]`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should return null when there are no tasks to sort", () => {
        // Original content: no tasks
        const originalContent = `
This is a document with no tasks
Just regular text content`;
        // Create mock EditorView and plugin
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            sortTasks: true,
            sortCriteria: [{ field: "status", order: "asc" }],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Verify result is null
        expect(result).toBeNull();
    });
    it("should correctly sort tasks with dataview inline fields", () => {
        // Original content: tasks with simple format
        const originalContent = `
- [ ] Task B
- [ ] Task A  
- [x] Completed Task C`;
        // Create mock EditorView and plugin with dataview enabled
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "dataview",
            sortTasks: true,
            sortCriteria: [
                { field: "completed", order: "asc" },
                { field: "content", order: "asc" },
            ],
        });
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: sorted by completed first, then content alphabetically
        const expectedContent = `
- [ ] Task A  
- [ ] Task B
- [x] Completed Task C`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
    it("should correctly sort tasks with Tasks plugin emojis", () => {
        var _a;
        // Original content: tasks with Tasks plugin emojis
        const originalContent = `
- [ ] Task C 📅 2025-01-03
- [ ] Task A 📅 2025-01-01
- [x] Completed Task B 📅 2025-01-02`;
        // Create mock EditorView and plugin with tasks plugin enabled
        const mockView = createMockEditorView(originalContent);
        const mockPlugin = createMockPlugin({
            preferMetadataFormat: "tasks",
            sortTasks: true,
            sortCriteria: [
                { field: "completed", order: "asc" },
                { field: "dueDate", order: "asc" },
            ],
        });
        // Debug: Test parseTaskLine directly
        const { parseTaskLine } = require("../utils/task/task-operations");
        const testLine = "- [ ] Task A 📅 2025-01-01";
        const parsedTask = parseTaskLine("test.md", testLine, 1, "tasks", mockPlugin);
        console.log("Parsed task:", parsedTask);
        console.log("Due date:", (_a = parsedTask === null || parsedTask === void 0 ? void 0 : parsedTask.metadata) === null || _a === void 0 ? void 0 : _a.dueDate);
        // Call sort function
        const result = sortTasksInDocument(mockView, mockPlugin, true);
        // Expected result: sorted by completed first, then due date
        const expectedContent = `
- [ ] Task A 📅 2025-01-01
- [ ] Task C 📅 2025-01-03
- [x] Completed Task B 📅 2025-01-02`;
        // Verify sort result
        expect(result).toEqual(expectedContent);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydFRhc2tzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3J0VGFza3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRSxPQUFPLEVBRU4sZ0JBQWdCLEVBQ2hCLG9CQUFvQixHQUNwQixNQUFNLGFBQWEsQ0FBQztBQUVyQixRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLEVBQUUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDekMscUNBQXFDO1FBQ3JDLE1BQU0sZUFBZSxHQUFHOzs7dUJBR0gsQ0FBQztRQUV0QixvQ0FBb0M7UUFDcEMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkQsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUM7WUFDbkMsU0FBUyxFQUFFLElBQUk7WUFDZixZQUFZLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1NBQ2pELENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0QseUNBQXlDO1FBQ3pDLE1BQU0sZUFBZSxHQUFHOzs7cUJBR0wsQ0FBQztRQUVwQixxQkFBcUI7UUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxRUFBcUUsRUFBRSxHQUFHLEVBQUU7UUFDOUUscUNBQXFDO1FBQ3JDLE1BQU0sZUFBZSxHQUFHOzs7O3VCQUlILENBQUM7UUFFdEIsb0NBQW9DO1FBQ3BDLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sVUFB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T0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsTUFBQSxVQUFVLGFBQVYsVUFBVSx1QkFBVixVQUFVLENBQUUsUUFBUSwwQ0FBRSxPQUFPLENBQUMsQ0FBQztRQUV4RCxxQkFBcUI7UUFDckIsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUvRCw0REFBNEQ7UUFDNUQsTUFBTSxlQUFlLEdBQUc7OztxQ0FHVyxDQUFDO1FBRXBDLHFCQUFxQjtRQUNyQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzb3J0VGFza3NJbkRvY3VtZW50IH0gZnJvbSBcIi4uL2NvbW1hbmRzL3NvcnRUYXNrQ29tbWFuZHNcIjtcclxuaW1wb3J0IHtcclxuXHRjcmVhdGVNb2NrVGV4dCxcclxuXHRjcmVhdGVNb2NrUGx1Z2luLFxyXG5cdGNyZWF0ZU1vY2tFZGl0b3JWaWV3LFxyXG59IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuZGVzY3JpYmUoXCJzb3J0VGFza3NJbkRvY3VtZW50XCIsICgpID0+IHtcclxuXHRpdChcInNob3VsZCBpZGVudGlmeSBhbmQgc29ydCB0YXNrc1wiLCAoKSA9PiB7XHJcblx0XHQvLyBPcmlnaW5hbCBjb250ZW50OiBtaXhlZCB0YXNrIG9yZGVyXHJcblx0XHRjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBgXHJcbi0gWyBdIEluY29tcGxldGUgdGFzayAxXHJcbi0gW3hdIENvbXBsZXRlZCB0YXNrXHJcbi0gWy9dIEluIHByb2dyZXNzIHRhc2tgO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBtb2NrIEVkaXRvclZpZXcgYW5kIHBsdWdpblxyXG5cdFx0Y29uc3QgbW9ja1ZpZXcgPSBjcmVhdGVNb2NrRWRpdG9yVmlldyhvcmlnaW5hbENvbnRlbnQpO1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRzb3J0VGFza3M6IHRydWUsXHJcblx0XHRcdHNvcnRDcml0ZXJpYTogW3sgZmllbGQ6IFwic3RhdHVzXCIsIG9yZGVyOiBcImFzY1wiIH1dLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gc29ydFRhc2tzSW5Eb2N1bWVudChtb2NrVmlldywgbW9ja1BsdWdpbiwgdHJ1ZSk7XHJcblxyXG5cdFx0Ly8gRXhwZWN0ZWQgcmVzdWx0OiB0ZXh0IHNvcnRlZCBieSBzdGF0dXNcclxuXHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IGBcclxuLSBbIF0gSW5jb21wbGV0ZSB0YXNrIDFcclxuLSBbL10gSW4gcHJvZ3Jlc3MgdGFza1xyXG4tIFt4XSBDb21wbGV0ZWQgdGFza2A7XHJcblxyXG5cdFx0Ly8gVmVyaWZ5IHNvcnQgcmVzdWx0XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkQ29udGVudCk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIHBsYWNlIGNvbXBsZXRlZCB0YXNrcyBhdCB0aGUgZW5kIHJlZ2FyZGxlc3Mgb2Ygc29ydCBjcml0ZXJpYVwiLCAoKSA9PiB7XHJcblx0XHQvLyBPcmlnaW5hbCBjb250ZW50OiBtaXhlZCB0YXNrIG9yZGVyXHJcblx0XHRjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBgXHJcbi0gW3hdIENvbXBsZXRlZCB0YXNrIDFcclxuLSBbIF0gSW5jb21wbGV0ZSB0YXNrIFtwcmlvcml0eTo6IGhpZ2hdIFtkdWU6OiAyMDI1LTA1LTAxXVxyXG4tIFsvXSBJbiBwcm9ncmVzcyB0YXNrIFtzdGFydDo6IDIwMjUtMDQtMDFdXHJcbi0gW3hdIENvbXBsZXRlZCB0YXNrIDJgO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBtb2NrIEVkaXRvclZpZXcgYW5kIHBsdWdpblxyXG5cdFx0Y29uc3QgbW9ja1ZpZXcgPSBjcmVhdGVNb2NrRWRpdG9yVmlldyhvcmlnaW5hbENvbnRlbnQpO1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJkYXRhdmlld1wiLFxyXG5cdFx0XHRzb3J0VGFza3M6IHRydWUsXHJcblx0XHRcdHNvcnRDcml0ZXJpYTogW1xyXG5cdFx0XHRcdHsgZmllbGQ6IFwiY29tcGxldGVkXCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRcdFx0eyBmaWVsZDogXCJwcmlvcml0eVwiLCBvcmRlcjogXCJhc2NcIiB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2FsbCBzb3J0IGZ1bmN0aW9uXHJcblx0XHRjb25zdCByZXN1bHQgPSBzb3J0VGFza3NJbkRvY3VtZW50KG1vY2tWaWV3LCBtb2NrUGx1Z2luLCB0cnVlKTtcclxuXHJcblx0XHQvLyBFeHBlY3RlZCByZXN1bHQ6IOeOsOWcqOaMiSBjb21wbGV0ZWQg54S25ZCOIHByaW9yaXR5IOaOkuW6j1xyXG5cdFx0Y29uc3QgZXhwZWN0ZWRDb250ZW50ID0gYFxyXG4tIFsgXSBJbmNvbXBsZXRlIHRhc2sgW3ByaW9yaXR5OjogaGlnaF0gW2R1ZTo6IDIwMjUtMDUtMDFdXHJcbi0gWy9dIEluIHByb2dyZXNzIHRhc2sgW3N0YXJ0OjogMjAyNS0wNC0wMV1cclxuLSBbeF0gQ29tcGxldGVkIHRhc2sgMVxyXG4tIFt4XSBDb21wbGV0ZWQgdGFzayAyYDtcclxuXHJcblx0XHQvLyBWZXJpZnkgc29ydCByZXN1bHRcclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRDb250ZW50KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgbWFpbnRhaW4gcmVsYXRpdmUgcG9zaXRpb24gb2Ygbm9uLWNvbnRpZ3VvdXMgdGFzayBibG9ja3NcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gT3JpZ2luYWwgY29udGVudDogdHdvIHRhc2sgYmxvY2tzIHNlcGFyYXRlZCBieSBub24tdGFzayBsaW5lc1xyXG5cdFx0Y29uc3Qgb3JpZ2luYWxDb250ZW50ID0gYFxyXG5GaXJzdCB0YXNrIGJsb2NrOlxyXG4tIFt4XSBDb21wbGV0ZWQgdGFzayAxXHJcbi0gWyBdIEluY29tcGxldGUgdGFzayAxXHJcblxyXG5NaWRkbGUgbm9uLXRhc2sgY29udGVudFxyXG5cclxuU2Vjb25kIHRhc2sgYmxvY2s6XHJcbi0gW3hdIENvbXBsZXRlZCB0YXNrIDJcclxuLSBbIF0gSW5jb21wbGV0ZSB0YXNrIDJgO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBtb2NrIEVkaXRvclZpZXcgYW5kIHBsdWdpblxyXG5cdFx0Y29uc3QgbW9ja1ZpZXcgPSBjcmVhdGVNb2NrRWRpdG9yVmlldyhvcmlnaW5hbENvbnRlbnQpO1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRzb3J0VGFza3M6IHRydWUsXHJcblx0XHRcdHNvcnRDcml0ZXJpYTogW3sgZmllbGQ6IFwic3RhdHVzXCIsIG9yZGVyOiBcImFzY1wiIH1dLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2FsbCBzb3J0IGZ1bmN0aW9uXHJcblx0XHRjb25zdCByZXN1bHQgPSBzb3J0VGFza3NJbkRvY3VtZW50KG1vY2tWaWV3LCBtb2NrUGx1Z2luLCB0cnVlKTtcclxuXHJcblx0XHQvLyBFeHBlY3RlZCByZXN1bHQ6IGVhY2ggYmxvY2sgc29ydGVkIGludGVybmFsbHksIGJ1dCBibG9ja3MgbWFpbnRhaW4gcmVsYXRpdmUgcG9zaXRpb25cclxuXHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IGBcclxuRmlyc3QgdGFzayBibG9jazpcclxuLSBbIF0gSW5jb21wbGV0ZSB0YXNrIDFcclxuLSBbeF0gQ29tcGxldGVkIHRhc2sgMVxyXG5cclxuTWlkZGxlIG5vbi10YXNrIGNvbnRlbnRcclxuXHJcblNlY29uZCB0YXNrIGJsb2NrOlxyXG4tIFsgXSBJbmNvbXBsZXRlIHRhc2sgMlxyXG4tIFt4XSBDb21wbGV0ZWQgdGFzayAyYDtcclxuXHJcblx0XHQvLyBWZXJpZnkgc29ydCByZXN1bHRcclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRDb250ZW50KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgcHJlc2VydmUgdGFzayBoaWVyYXJjaHkgKHBhcmVudC1jaGlsZCByZWxhdGlvbnNoaXBzKVwiLCAoKSA9PiB7XHJcblx0XHQvLyBPcmlnaW5hbCBjb250ZW50OiB0YXNrcyB3aXRoIHBhcmVudC1jaGlsZCByZWxhdGlvbnNoaXBzXHJcblx0XHRjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBgXHJcbi0gW3hdIFBhcmVudCB0YXNrIDFcclxuICAtIFsgXSBDaGlsZCB0YXNrIDFcclxuICAtIFsvXSBDaGlsZCB0YXNrIDJcclxuLSBbIF0gUGFyZW50IHRhc2sgMlxyXG4gIC0gW3hdIENoaWxkIHRhc2sgM2A7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1vY2sgRWRpdG9yVmlldyBhbmQgcGx1Z2luXHJcblx0XHRjb25zdCBtb2NrVmlldyA9IGNyZWF0ZU1vY2tFZGl0b3JWaWV3KG9yaWdpbmFsQ29udGVudCk7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdHNvcnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0c29ydENyaXRlcmlhOiBbeyBmaWVsZDogXCJzdGF0dXNcIiwgb3JkZXI6IFwiYXNjXCIgfV0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxsIHNvcnQgZnVuY3Rpb25cclxuXHRcdGNvbnN0IHJlc3VsdCA9IHNvcnRUYXNrc0luRG9jdW1lbnQobW9ja1ZpZXcsIG1vY2tQbHVnaW4sIHRydWUpO1xyXG5cclxuXHRcdC8vIEV4cGVjdGVkIHJlc3VsdDogcGFyZW50IHRhc2tzIHNvcnRlZCwgY2hpbGQgdGFza3MgZm9sbG93IHRoZWlyIHJlc3BlY3RpdmUgcGFyZW50c1xyXG5cdFx0Y29uc3QgZXhwZWN0ZWRDb250ZW50ID0gYFxyXG4tIFsgXSBQYXJlbnQgdGFzayAyXHJcbiAgLSBbeF0gQ2hpbGQgdGFzayAzXHJcbi0gW3hdIFBhcmVudCB0YXNrIDFcclxuICAtIFsgXSBDaGlsZCB0YXNrIDFcclxuICAtIFsvXSBDaGlsZCB0YXNrIDJgO1xyXG5cclxuXHRcdC8vIFZlcmlmeSBzb3J0IHJlc3VsdFxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbChleHBlY3RlZENvbnRlbnQpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBzb3J0IHRhc2tzIGJ5IG11bHRpcGxlIGNyaXRlcmlhXCIsICgpID0+IHtcclxuXHRcdC8vIE9yaWdpbmFsIGNvbnRlbnQ6IHRhc2tzIHdpdGggdmFyaW91cyBtZXRhZGF0YVxyXG5cdFx0Y29uc3Qgb3JpZ2luYWxDb250ZW50ID0gYFxyXG4tIFsgXSBMb3cgcHJpb3JpdHkgW3ByaW9yaXR5OjogMV0gW2R1ZTo6IDIwMjUtMDUtMDFdXHJcbi0gWyBdIEhpZ2ggcHJpb3JpdHkgW3ByaW9yaXR5OjogM11cclxuLSBbIF0gTWVkaXVtIHByaW9yaXR5IHdpdGggZHVlIGRhdGUgW3ByaW9yaXR5OjogMl0gW2R1ZTo6IDIwMjUtMDQtMDFdXHJcbi0gWyBdIE1lZGl1bSBwcmlvcml0eSB3aXRoIGxhdGVyIGR1ZSBkYXRlIFtwcmlvcml0eTo6IDJdIFtkdWU6OiAyMDI1LTA2LTAxXWA7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1vY2sgRWRpdG9yVmlldyBhbmQgcGx1Z2luXHJcblx0XHRjb25zdCBtb2NrVmlldyA9IGNyZWF0ZU1vY2tFZGl0b3JWaWV3KG9yaWdpbmFsQ29udGVudCk7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImRhdGF2aWV3XCIsXHJcblx0XHRcdHNvcnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0c29ydENyaXRlcmlhOiBbXHJcblx0XHRcdFx0eyBmaWVsZDogXCJwcmlvcml0eVwiLCBvcmRlcjogXCJhc2NcIiB9LFxyXG5cdFx0XHRcdHsgZmllbGQ6IFwiZHVlRGF0ZVwiLCBvcmRlcjogXCJhc2NcIiB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2FsbCBzb3J0IGZ1bmN0aW9uXHJcblx0XHRjb25zdCByZXN1bHQgPSBzb3J0VGFza3NJbkRvY3VtZW50KG1vY2tWaWV3LCBtb2NrUGx1Z2luLCB0cnVlKTtcclxuXHJcblx0XHQvLyBFeHBlY3RlZCByZXN1bHQ6IHNvcnRlZCBmaXJzdCBieSBwcmlvcml0eSAoMS0+Mi0+MyksIHRoZW4gYnkgZHVlIGRhdGUgKGVhcmx5LT5sYXRlKVxyXG5cdFx0Y29uc3QgZXhwZWN0ZWRDb250ZW50ID0gYFxyXG4tIFsgXSBMb3cgcHJpb3JpdHkgW3ByaW9yaXR5OjogMV0gW2R1ZTo6IDIwMjUtMDUtMDFdXHJcbi0gWyBdIE1lZGl1bSBwcmlvcml0eSB3aXRoIGR1ZSBkYXRlIFtwcmlvcml0eTo6IDJdIFtkdWU6OiAyMDI1LTA0LTAxXVxyXG4tIFsgXSBNZWRpdW0gcHJpb3JpdHkgd2l0aCBsYXRlciBkdWUgZGF0ZSBbcHJpb3JpdHk6OiAyXSBbZHVlOjogMjAyNS0wNi0wMV1cclxuLSBbIF0gSGlnaCBwcmlvcml0eSBbcHJpb3JpdHk6OiAzXWA7XHJcblxyXG5cdFx0Ly8gVmVyaWZ5IHNvcnQgcmVzdWx0XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkQ29udGVudCk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIHJldHVybiBudWxsIHdoZW4gdGhlcmUgYXJlIG5vIHRhc2tzIHRvIHNvcnRcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gT3JpZ2luYWwgY29udGVudDogbm8gdGFza3NcclxuXHRcdGNvbnN0IG9yaWdpbmFsQ29udGVudCA9IGBcclxuVGhpcyBpcyBhIGRvY3VtZW50IHdpdGggbm8gdGFza3NcclxuSnVzdCByZWd1bGFyIHRleHQgY29udGVudGA7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1vY2sgRWRpdG9yVmlldyBhbmQgcGx1Z2luXHJcblx0XHRjb25zdCBtb2NrVmlldyA9IGNyZWF0ZU1vY2tFZGl0b3JWaWV3KG9yaWdpbmFsQ29udGVudCk7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdHNvcnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0c29ydENyaXRlcmlhOiBbeyBmaWVsZDogXCJzdGF0dXNcIiwgb3JkZXI6IFwiYXNjXCIgfV0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxsIHNvcnQgZnVuY3Rpb25cclxuXHRcdGNvbnN0IHJlc3VsdCA9IHNvcnRUYXNrc0luRG9jdW1lbnQobW9ja1ZpZXcsIG1vY2tQbHVnaW4sIHRydWUpO1xyXG5cclxuXHRcdC8vIFZlcmlmeSByZXN1bHQgaXMgbnVsbFxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgY29ycmVjdGx5IHNvcnQgdGFza3Mgd2l0aCBkYXRhdmlldyBpbmxpbmUgZmllbGRzXCIsICgpID0+IHtcclxuXHRcdC8vIE9yaWdpbmFsIGNvbnRlbnQ6IHRhc2tzIHdpdGggc2ltcGxlIGZvcm1hdFxyXG5cdFx0Y29uc3Qgb3JpZ2luYWxDb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIEJcclxuLSBbIF0gVGFzayBBICBcclxuLSBbeF0gQ29tcGxldGVkIFRhc2sgQ2A7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1vY2sgRWRpdG9yVmlldyBhbmQgcGx1Z2luIHdpdGggZGF0YXZpZXcgZW5hYmxlZFxyXG5cdFx0Y29uc3QgbW9ja1ZpZXcgPSBjcmVhdGVNb2NrRWRpdG9yVmlldyhvcmlnaW5hbENvbnRlbnQpO1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJkYXRhdmlld1wiLFxyXG5cdFx0XHRzb3J0VGFza3M6IHRydWUsXHJcblx0XHRcdHNvcnRDcml0ZXJpYTogW1xyXG5cdFx0XHRcdHsgZmllbGQ6IFwiY29tcGxldGVkXCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRcdFx0eyBmaWVsZDogXCJjb250ZW50XCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRcdF0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxsIHNvcnQgZnVuY3Rpb25cclxuXHRcdGNvbnN0IHJlc3VsdCA9IHNvcnRUYXNrc0luRG9jdW1lbnQobW9ja1ZpZXcsIG1vY2tQbHVnaW4sIHRydWUpO1xyXG5cclxuXHRcdC8vIEV4cGVjdGVkIHJlc3VsdDogc29ydGVkIGJ5IGNvbXBsZXRlZCBmaXJzdCwgdGhlbiBjb250ZW50IGFscGhhYmV0aWNhbGx5XHJcblx0XHRjb25zdCBleHBlY3RlZENvbnRlbnQgPSBgXHJcbi0gWyBdIFRhc2sgQSAgXHJcbi0gWyBdIFRhc2sgQlxyXG4tIFt4XSBDb21wbGV0ZWQgVGFzayBDYDtcclxuXHJcblx0XHQvLyBWZXJpZnkgc29ydCByZXN1bHRcclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRDb250ZW50KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgY29ycmVjdGx5IHNvcnQgdGFza3Mgd2l0aCBUYXNrcyBwbHVnaW4gZW1vamlzXCIsICgpID0+IHtcclxuXHRcdC8vIE9yaWdpbmFsIGNvbnRlbnQ6IHRhc2tzIHdpdGggVGFza3MgcGx1Z2luIGVtb2ppc1xyXG5cdFx0Y29uc3Qgb3JpZ2luYWxDb250ZW50ID0gYFxyXG4tIFsgXSBUYXNrIEMg8J+ThSAyMDI1LTAxLTAzXHJcbi0gWyBdIFRhc2sgQSDwn5OFIDIwMjUtMDEtMDFcclxuLSBbeF0gQ29tcGxldGVkIFRhc2sgQiDwn5OFIDIwMjUtMDEtMDJgO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBtb2NrIEVkaXRvclZpZXcgYW5kIHBsdWdpbiB3aXRoIHRhc2tzIHBsdWdpbiBlbmFibGVkXHJcblx0XHRjb25zdCBtb2NrVmlldyA9IGNyZWF0ZU1vY2tFZGl0b3JWaWV3KG9yaWdpbmFsQ29udGVudCk7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcInRhc2tzXCIsXHJcblx0XHRcdHNvcnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0c29ydENyaXRlcmlhOiBbXHJcblx0XHRcdFx0eyBmaWVsZDogXCJjb21wbGV0ZWRcIiwgb3JkZXI6IFwiYXNjXCIgfSxcclxuXHRcdFx0XHR7IGZpZWxkOiBcImR1ZURhdGVcIiwgb3JkZXI6IFwiYXNjXCIgfSxcclxuXHRcdFx0XSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlYnVnOiBUZXN0IHBhcnNlVGFza0xpbmUgZGlyZWN0bHlcclxuXHRcdGNvbnN0IHsgcGFyc2VUYXNrTGluZSB9ID0gcmVxdWlyZShcIi4uL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCIpO1xyXG5cdFx0Y29uc3QgdGVzdExpbmUgPSBcIi0gWyBdIFRhc2sgQSDwn5OFIDIwMjUtMDEtMDFcIjtcclxuXHRcdGNvbnN0IHBhcnNlZFRhc2sgPSBwYXJzZVRhc2tMaW5lKFxyXG5cdFx0XHRcInRlc3QubWRcIixcclxuXHRcdFx0dGVzdExpbmUsXHJcblx0XHRcdDEsXHJcblx0XHRcdFwidGFza3NcIixcclxuXHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0KTtcclxuXHRcdGNvbnNvbGUubG9nKFwiUGFyc2VkIHRhc2s6XCIsIHBhcnNlZFRhc2spO1xyXG5cdFx0Y29uc29sZS5sb2coXCJEdWUgZGF0ZTpcIiwgcGFyc2VkVGFzaz8ubWV0YWRhdGE/LmR1ZURhdGUpO1xyXG5cclxuXHRcdC8vIENhbGwgc29ydCBmdW5jdGlvblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gc29ydFRhc2tzSW5Eb2N1bWVudChtb2NrVmlldywgbW9ja1BsdWdpbiwgdHJ1ZSk7XHJcblxyXG5cdFx0Ly8gRXhwZWN0ZWQgcmVzdWx0OiBzb3J0ZWQgYnkgY29tcGxldGVkIGZpcnN0LCB0aGVuIGR1ZSBkYXRlXHJcblx0XHRjb25zdCBleHBlY3RlZENvbnRlbnQgPSBgXHJcbi0gWyBdIFRhc2sgQSDwn5OFIDIwMjUtMDEtMDFcclxuLSBbIF0gVGFzayBDIPCfk4UgMjAyNS0wMS0wM1xyXG4tIFt4XSBDb21wbGV0ZWQgVGFzayBCIPCfk4UgMjAyNS0wMS0wMmA7XHJcblxyXG5cdFx0Ly8gVmVyaWZ5IHNvcnQgcmVzdWx0XHJcblx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkQ29udGVudCk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=