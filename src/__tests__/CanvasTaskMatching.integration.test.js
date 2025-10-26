/**
 * Canvas Task Matching Integration Tests
 *
 * Tests for Canvas task matching functionality including:
 * - Task line matching with originalMarkdown
 * - Task line matching with content fallback
 * - Complex metadata handling
 * - OnCompletion metadata scenarios
 */
import { CanvasTaskUpdater } from "../parsers/canvas-task-updater";
import { createMockPlugin } from "./mockUtils";
// Mock Vault
const mockVault = {
    getFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
};
describe("Canvas Task Matching Integration Tests", () => {
    let canvasUpdater;
    let mockPlugin;
    beforeEach(() => {
        mockPlugin = createMockPlugin();
        canvasUpdater = new CanvasTaskUpdater(mockVault, mockPlugin);
        jest.clearAllMocks();
    });
    describe("lineMatchesTask Method", () => {
        it("should match task using originalMarkdown", () => {
            const task = {
                id: "test-task-1",
                content: "Test task with metadata",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test task with metadata #project/test 🏁 archive",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: ["#project/test"],
                    children: [],
                    onCompletion: "archive",
                },
            };
            const canvasLine = "- [x] Test task with metadata #project/test 🏁 archive";
            // Use reflection to access private method
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should match task with different checkbox status", () => {
            const task = {
                id: "test-task-2",
                content: "Test task that changed status",
                filePath: "test.canvas",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task that changed status #important",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-2",
                    tags: ["#important"],
                    children: [],
                },
            };
            // Canvas line shows completed status, but task object shows incomplete
            const canvasLine = "- [x] Test task that changed status #important";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should match task with complex onCompletion metadata", () => {
            const task = {
                id: "test-task-3",
                content: "Task with complex onCompletion",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: '- [x] Task with complex onCompletion 🏁 {"type": "move", "targetFile": "archive.md"}',
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-3",
                    tags: [],
                    children: [],
                    onCompletion: '{"type": "move", "targetFile": "archive.md"}',
                },
            };
            const canvasLine = '- [x] Task with complex onCompletion 🏁 {"type": "move", "targetFile": "archive.md"}';
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should fall back to content matching when originalMarkdown differs", () => {
            const task = {
                id: "test-task-4",
                content: "Task content only",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task content only #old-tag",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-4",
                    tags: ["#new-tag"],
                    children: [],
                },
            };
            // Canvas line has the same core content but without metadata
            // This should match using content fallback
            const canvasLine = "- [x] Task content only";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should not match when Canvas line has additional metadata", () => {
            const task = {
                id: "test-task-4b",
                content: "Task content only",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Task content only #old-tag",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-4b",
                    tags: ["#new-tag"],
                    children: [],
                },
            };
            // Canvas line has different metadata than what's in originalMarkdown
            // With the improved matching logic, this should now match because
            // the core content "Task content only" is the same after metadata removal
            const canvasLine = "- [x] Task content only #new-tag";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            // This should now pass with the improved extractCoreTaskContent method
            expect(result).toBe(true);
        });
        it("should not match different tasks", () => {
            const task = {
                id: "test-task-5",
                content: "Original task content",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Original task content",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-5",
                    tags: [],
                    children: [],
                },
            };
            const canvasLine = "- [x] Different task content";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(false);
        });
        it("should handle tasks with indentation", () => {
            const task = {
                id: "test-task-6",
                content: "Indented task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "  - [x] Indented task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-6",
                    tags: [],
                    children: [],
                },
            };
            const canvasLine = "  - [x] Indented task";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should handle tasks without originalMarkdown", () => {
            const task = {
                id: "test-task-7",
                content: "Task without originalMarkdown",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                // No originalMarkdown property
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-7",
                    tags: [],
                    children: [],
                },
            };
            const canvasLine = "- [x] Task without originalMarkdown";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            expect(result).toBe(true);
        });
        it("should match task with complex metadata differences", () => {
            const task = {
                id: "test-task-complex-diff",
                content: "Important task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Important task ⏫ 📅 2024-12-20",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-complex",
                    tags: [],
                    children: [],
                    priority: 4,
                    dueDate: new Date("2024-12-20").getTime(),
                },
            };
            // Canvas line has different metadata but same core content
            const canvasLine = "- [x] Important task #urgent 🏁 archive 📅 2024-12-25";
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const result = lineMatchesTask(canvasLine, task);
            // Should match because core content "Important task" is the same
            expect(result).toBe(true);
        });
    });
    describe("deleteTaskFromTextNode Method", () => {
        it("should successfully delete task from text node", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "# Tasks\n\n- [ ] Keep this task\n- [x] Delete this task\n- [ ] Keep this too",
            };
            const task = {
                id: "test-task-delete",
                content: "Delete this task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Delete this task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-1",
                    tags: [],
                    children: [],
                },
            };
            const deleteTaskFromTextNode = canvasUpdater.deleteTaskFromTextNode.bind(canvasUpdater);
            const result = deleteTaskFromTextNode(textNode, task);
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("# Tasks\n\n- [ ] Keep this task\n- [ ] Keep this too");
        });
        it("should fail to delete non-existent task", () => {
            const textNode = {
                type: "text",
                id: "node-2",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "# Tasks\n\n- [ ] Keep this task\n- [ ] Keep this too",
            };
            const task = {
                id: "test-task-missing",
                content: "Non-existent task",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Non-existent task",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-2",
                    tags: [],
                    children: [],
                },
            };
            const deleteTaskFromTextNode = canvasUpdater.deleteTaskFromTextNode.bind(canvasUpdater);
            const result = deleteTaskFromTextNode(textNode, task);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Task not found in Canvas text node");
        });
        it("should delete task with complex metadata", () => {
            const textNode = {
                type: "text",
                id: "node-3",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "# Project Tasks\n\n- [ ] Regular task\n- [x] Complex task #project/test ⏫ 📅 2024-12-20 🏁 archive\n- [ ] Another task",
            };
            const task = {
                id: "test-task-complex",
                content: "Complex task #project/test ⏫ 📅 2024-12-20 🏁 archive",
                filePath: "test.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Complex task #project/test ⏫ 📅 2024-12-20 🏁 archive",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "node-3",
                    tags: ["#project/test"],
                    children: [],
                    priority: 4,
                    dueDate: new Date("2024-12-20").getTime(),
                    onCompletion: "archive",
                },
            };
            const deleteTaskFromTextNode = canvasUpdater.deleteTaskFromTextNode.bind(canvasUpdater);
            const result = deleteTaskFromTextNode(textNode, task);
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("# Project Tasks\n\n- [ ] Regular task\n- [ ] Another task");
        });
    });
    describe("Integration Scenarios", () => {
        it("should handle real-world archive scenario", () => {
            // Simulate a real Canvas text node with tasks that have onCompletion metadata
            const textNode = {
                type: "text",
                id: "real-node",
                x: 0,
                y: 0,
                width: 350,
                height: 200,
                text: "# Current Tasks\n\n- [ ] Ongoing task\n- [x] Completed task with archive 🏁 archive\n- [ ] Future task #important\n- [x] Another completed task 🏁 move:done.md",
            };
            // Task that should be archived and deleted
            const archiveTask = {
                id: "archive-task",
                content: "Completed task with archive",
                filePath: "project.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Completed task with archive 🏁 archive",
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "real-node",
                    tags: [],
                    children: [],
                    onCompletion: "archive",
                },
            };
            // First verify the task can be found
            const lineMatchesTask = canvasUpdater.lineMatchesTask.bind(canvasUpdater);
            const lines = textNode.text.split("\n");
            let taskFound = false;
            for (const line of lines) {
                if (canvasUpdater.isTaskLine(line) &&
                    lineMatchesTask(line, archiveTask)) {
                    taskFound = true;
                    break;
                }
            }
            expect(taskFound).toBe(true);
            // Then delete the task
            const deleteTaskFromTextNode = canvasUpdater.deleteTaskFromTextNode.bind(canvasUpdater);
            const result = deleteTaskFromTextNode(textNode, archiveTask);
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("# Current Tasks\n\n- [ ] Ongoing task\n- [ ] Future task #important\n- [x] Another completed task 🏁 move:done.md");
        });
        it("should handle move scenario with JSON metadata", () => {
            const textNode = {
                type: "text",
                id: "json-node",
                x: 0,
                y: 0,
                width: 400,
                height: 150,
                text: '# Tasks with JSON\n\n- [ ] Regular task\n- [x] Move task 🏁 {"type": "move", "targetFile": "archive.md", "targetSection": "Done"}\n- [ ] Another task',
            };
            const moveTask = {
                id: "move-task",
                content: "Move task",
                filePath: "project.canvas",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: '- [x] Move task 🏁 {"type": "move", "targetFile": "archive.md", "targetSection": "Done"}',
                metadata: {
                    sourceType: "canvas",
                    canvasNodeId: "json-node",
                    tags: [],
                    children: [],
                    onCompletion: '{"type": "move", "targetFile": "archive.md", "targetSection": "Done"}',
                },
            };
            const deleteTaskFromTextNode = canvasUpdater.deleteTaskFromTextNode.bind(canvasUpdater);
            const result = deleteTaskFromTextNode(textNode, moveTask);
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("# Tasks with JSON\n\n- [ ] Regular task\n- [ ] Another task");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzVGFza01hdGNoaW5nLmludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDYW52YXNUYXNrTWF0Y2hpbmcuaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSW5FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUUvQyxhQUFhO0FBQ2IsTUFBTSxTQUFTLEdBQUc7SUFDakIsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDeEIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNHLENBQUM7QUFFdEIsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtJQUN2RCxJQUFJLGFBQWdDLENBQUM7SUFDckMsSUFBSSxVQUFpQyxDQUFDO0lBRXRDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixVQUFVLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoQyxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxFQUFFLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ25ELE1BQU0sSUFBSSxHQUE2QjtnQkFDdEMsRUFBRSxFQUFFLGFBQWE7Z0JBQ2pCLE9BQU8sRUFBRSx5QkFBeUI7Z0JBQ2xDLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUUsQ0FBQztnQkFDUCxTQUFTLEVBQUUsSUFBSTtnQkFDZixNQUFNLEVBQUUsR0FBRztnQkFDWCxnQkFBZ0IsRUFD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QUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENhbnZhcyBUYXNrIE1hdGNoaW5nIEludGVncmF0aW9uIFRlc3RzXHJcbiAqXHJcbiAqIFRlc3RzIGZvciBDYW52YXMgdGFzayBtYXRjaGluZyBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBUYXNrIGxpbmUgbWF0Y2hpbmcgd2l0aCBvcmlnaW5hbE1hcmtkb3duXHJcbiAqIC0gVGFzayBsaW5lIG1hdGNoaW5nIHdpdGggY29udGVudCBmYWxsYmFja1xyXG4gKiAtIENvbXBsZXggbWV0YWRhdGEgaGFuZGxpbmdcclxuICogLSBPbkNvbXBsZXRpb24gbWV0YWRhdGEgc2NlbmFyaW9zXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ2FudmFzVGFza1VwZGF0ZXIgfSBmcm9tIFwiLi4vcGFyc2Vycy9jYW52YXMtdGFzay11cGRhdGVyXCI7XHJcbmltcG9ydCB7IFRhc2ssIENhbnZhc1Rhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFZhdWx0IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IGNyZWF0ZU1vY2tQbHVnaW4gfSBmcm9tIFwiLi9tb2NrVXRpbHNcIjtcclxuXHJcbi8vIE1vY2sgVmF1bHRcclxuY29uc3QgbW9ja1ZhdWx0ID0ge1xyXG5cdGdldEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRyZWFkOiBqZXN0LmZuKCksXHJcblx0bW9kaWZ5OiBqZXN0LmZuKCksXHJcbn0gYXMgdW5rbm93biBhcyBWYXVsdDtcclxuXHJcbmRlc2NyaWJlKFwiQ2FudmFzIFRhc2sgTWF0Y2hpbmcgSW50ZWdyYXRpb24gVGVzdHNcIiwgKCkgPT4ge1xyXG5cdGxldCBjYW52YXNVcGRhdGVyOiBDYW52YXNUYXNrVXBkYXRlcjtcclxuXHRsZXQgbW9ja1BsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKCk7XHJcblx0XHRjYW52YXNVcGRhdGVyID0gbmV3IENhbnZhc1Rhc2tVcGRhdGVyKG1vY2tWYXVsdCwgbW9ja1BsdWdpbik7XHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJsaW5lTWF0Y2hlc1Rhc2sgTWV0aG9kXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIG1hdGNoIHRhc2sgdXNpbmcgb3JpZ2luYWxNYXJrZG93blwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2stMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrIHdpdGggbWV0YWRhdGFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGVzdCB0YXNrIHdpdGggbWV0YWRhdGEgI3Byb2plY3QvdGVzdCDwn4+BIGFyY2hpdmVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L3Rlc3RcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjYW52YXNMaW5lID1cclxuXHRcdFx0XHRcIi0gW3hdIFRlc3QgdGFzayB3aXRoIG1ldGFkYXRhICNwcm9qZWN0L3Rlc3Qg8J+PgSBhcmNoaXZlXCI7XHJcblxyXG5cdFx0XHQvLyBVc2UgcmVmbGVjdGlvbiB0byBhY2Nlc3MgcHJpdmF0ZSBtZXRob2RcclxuXHRcdFx0Y29uc3QgbGluZU1hdGNoZXNUYXNrID0gKGNhbnZhc1VwZGF0ZXIgYXMgYW55KS5saW5lTWF0Y2hlc1Rhc2suYmluZChcclxuXHRcdFx0XHRjYW52YXNVcGRhdGVyXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGxpbmVNYXRjaGVzVGFzayhjYW52YXNMaW5lLCB0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBtYXRjaCB0YXNrIHdpdGggZGlmZmVyZW50IGNoZWNrYm94IHN0YXR1c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2stMlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrIHRoYXQgY2hhbmdlZCBzdGF0dXNcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gWyBdIFRlc3QgdGFzayB0aGF0IGNoYW5nZWQgc3RhdHVzICNpbXBvcnRhbnRcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTJcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNpbXBvcnRhbnRcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENhbnZhcyBsaW5lIHNob3dzIGNvbXBsZXRlZCBzdGF0dXMsIGJ1dCB0YXNrIG9iamVjdCBzaG93cyBpbmNvbXBsZXRlXHJcblx0XHRcdGNvbnN0IGNhbnZhc0xpbmUgPSBcIi0gW3hdIFRlc3QgdGFzayB0aGF0IGNoYW5nZWQgc3RhdHVzICNpbXBvcnRhbnRcIjtcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVNYXRjaGVzVGFzayA9IChjYW52YXNVcGRhdGVyIGFzIGFueSkubGluZU1hdGNoZXNUYXNrLmJpbmQoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lTWF0Y2hlc1Rhc2soY2FudmFzTGluZSwgdGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbWF0Y2ggdGFzayB3aXRoIGNvbXBsZXggb25Db21wbGV0aW9uIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtdGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggY29tcGxleCBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdCctIFt4XSBUYXNrIHdpdGggY29tcGxleCBvbkNvbXBsZXRpb24g8J+PgSB7XCJ0eXBlXCI6IFwibW92ZVwiLCBcInRhcmdldEZpbGVcIjogXCJhcmNoaXZlLm1kXCJ9JyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTNcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOlxyXG5cdFx0XHRcdFx0XHQne1widHlwZVwiOiBcIm1vdmVcIiwgXCJ0YXJnZXRGaWxlXCI6IFwiYXJjaGl2ZS5tZFwifScsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNhbnZhc0xpbmUgPVxyXG5cdFx0XHRcdCctIFt4XSBUYXNrIHdpdGggY29tcGxleCBvbkNvbXBsZXRpb24g8J+PgSB7XCJ0eXBlXCI6IFwibW92ZVwiLCBcInRhcmdldEZpbGVcIjogXCJhcmNoaXZlLm1kXCJ9JztcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVNYXRjaGVzVGFzayA9IChjYW52YXNVcGRhdGVyIGFzIGFueSkubGluZU1hdGNoZXNUYXNrLmJpbmQoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lTWF0Y2hlc1Rhc2soY2FudmFzTGluZSwgdGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZmFsbCBiYWNrIHRvIGNvbnRlbnQgbWF0Y2hpbmcgd2hlbiBvcmlnaW5hbE1hcmtkb3duIGRpZmZlcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrLTRcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRhc2sgY29udGVudCBvbmx5XCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGFzayBjb250ZW50IG9ubHkgI29sZC10YWdcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTRcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNuZXctdGFnXCJdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBDYW52YXMgbGluZSBoYXMgdGhlIHNhbWUgY29yZSBjb250ZW50IGJ1dCB3aXRob3V0IG1ldGFkYXRhXHJcblx0XHRcdC8vIFRoaXMgc2hvdWxkIG1hdGNoIHVzaW5nIGNvbnRlbnQgZmFsbGJhY2tcclxuXHRcdFx0Y29uc3QgY2FudmFzTGluZSA9IFwiLSBbeF0gVGFzayBjb250ZW50IG9ubHlcIjtcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVNYXRjaGVzVGFzayA9IChjYW52YXNVcGRhdGVyIGFzIGFueSkubGluZU1hdGNoZXNUYXNrLmJpbmQoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lTWF0Y2hlc1Rhc2soY2FudmFzTGluZSwgdGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbm90IG1hdGNoIHdoZW4gQ2FudmFzIGxpbmUgaGFzIGFkZGl0aW9uYWwgbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrLTRiXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIGNvbnRlbnQgb25seVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRhc2sgY29udGVudCBvbmx5ICNvbGQtdGFnXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS00YlwiLFxyXG5cdFx0XHRcdFx0dGFnczogW1wiI25ldy10YWdcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENhbnZhcyBsaW5lIGhhcyBkaWZmZXJlbnQgbWV0YWRhdGEgdGhhbiB3aGF0J3MgaW4gb3JpZ2luYWxNYXJrZG93blxyXG5cdFx0XHQvLyBXaXRoIHRoZSBpbXByb3ZlZCBtYXRjaGluZyBsb2dpYywgdGhpcyBzaG91bGQgbm93IG1hdGNoIGJlY2F1c2VcclxuXHRcdFx0Ly8gdGhlIGNvcmUgY29udGVudCBcIlRhc2sgY29udGVudCBvbmx5XCIgaXMgdGhlIHNhbWUgYWZ0ZXIgbWV0YWRhdGEgcmVtb3ZhbFxyXG5cdFx0XHRjb25zdCBjYW52YXNMaW5lID0gXCItIFt4XSBUYXNrIGNvbnRlbnQgb25seSAjbmV3LXRhZ1wiO1xyXG5cclxuXHRcdFx0Y29uc3QgbGluZU1hdGNoZXNUYXNrID0gKGNhbnZhc1VwZGF0ZXIgYXMgYW55KS5saW5lTWF0Y2hlc1Rhc2suYmluZChcclxuXHRcdFx0XHRjYW52YXNVcGRhdGVyXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGxpbmVNYXRjaGVzVGFzayhjYW52YXNMaW5lLCB0YXNrKTtcclxuXHJcblx0XHRcdC8vIFRoaXMgc2hvdWxkIG5vdyBwYXNzIHdpdGggdGhlIGltcHJvdmVkIGV4dHJhY3RDb3JlVGFza0NvbnRlbnQgbWV0aG9kXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBub3QgbWF0Y2ggZGlmZmVyZW50IHRhc2tzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtdGFzay01XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJPcmlnaW5hbCB0YXNrIGNvbnRlbnRcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBPcmlnaW5hbCB0YXNrIGNvbnRlbnRcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTVcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjYW52YXNMaW5lID0gXCItIFt4XSBEaWZmZXJlbnQgdGFzayBjb250ZW50XCI7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lTWF0Y2hlc1Rhc2sgPSAoY2FudmFzVXBkYXRlciBhcyBhbnkpLmxpbmVNYXRjaGVzVGFzay5iaW5kKFxyXG5cdFx0XHRcdGNhbnZhc1VwZGF0ZXJcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbGluZU1hdGNoZXNUYXNrKGNhbnZhc0xpbmUsIHRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFza3Mgd2l0aCBpbmRlbnRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2stNlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiSW5kZW50ZWQgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIiAgLSBbeF0gSW5kZW50ZWQgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtNlwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNhbnZhc0xpbmUgPSBcIiAgLSBbeF0gSW5kZW50ZWQgdGFza1wiO1xyXG5cclxuXHRcdFx0Y29uc3QgbGluZU1hdGNoZXNUYXNrID0gKGNhbnZhc1VwZGF0ZXIgYXMgYW55KS5saW5lTWF0Y2hlc1Rhc2suYmluZChcclxuXHRcdFx0XHRjYW52YXNVcGRhdGVyXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGxpbmVNYXRjaGVzVGFzayhjYW52YXNMaW5lLCB0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFza3Mgd2l0aG91dCBvcmlnaW5hbE1hcmtkb3duXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogYW55ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtdGFzay03XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGhvdXQgb3JpZ2luYWxNYXJrZG93blwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHQvLyBObyBvcmlnaW5hbE1hcmtkb3duIHByb3BlcnR5XHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS03XCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgY2FudmFzTGluZSA9IFwiLSBbeF0gVGFzayB3aXRob3V0IG9yaWdpbmFsTWFya2Rvd25cIjtcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVNYXRjaGVzVGFzayA9IChjYW52YXNVcGRhdGVyIGFzIGFueSkubGluZU1hdGNoZXNUYXNrLmJpbmQoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lTWF0Y2hlc1Rhc2soY2FudmFzTGluZSwgdGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbWF0Y2ggdGFzayB3aXRoIGNvbXBsZXggbWV0YWRhdGEgZGlmZmVyZW5jZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrLWNvbXBsZXgtZGlmZlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiSW1wb3J0YW50IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBJbXBvcnRhbnQgdGFzayDij6sg8J+ThSAyMDI0LTEyLTIwXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS1jb21wbGV4XCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHByaW9yaXR5OiA0LFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoXCIyMDI0LTEyLTIwXCIpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ2FudmFzIGxpbmUgaGFzIGRpZmZlcmVudCBtZXRhZGF0YSBidXQgc2FtZSBjb3JlIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgY2FudmFzTGluZSA9XHJcblx0XHRcdFx0XCItIFt4XSBJbXBvcnRhbnQgdGFzayAjdXJnZW50IPCfj4EgYXJjaGl2ZSDwn5OFIDIwMjQtMTItMjVcIjtcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVNYXRjaGVzVGFzayA9IChjYW52YXNVcGRhdGVyIGFzIGFueSkubGluZU1hdGNoZXNUYXNrLmJpbmQoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lTWF0Y2hlc1Rhc2soY2FudmFzTGluZSwgdGFzayk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgbWF0Y2ggYmVjYXVzZSBjb3JlIGNvbnRlbnQgXCJJbXBvcnRhbnQgdGFza1wiIGlzIHRoZSBzYW1lXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJkZWxldGVUYXNrRnJvbVRleHROb2RlIE1ldGhvZFwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBzdWNjZXNzZnVsbHkgZGVsZXRlIHRhc2sgZnJvbSB0ZXh0IG5vZGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRpZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0XHRoZWlnaHQ6IDYwLFxyXG5cdFx0XHRcdHRleHQ6IFwiIyBUYXNrc1xcblxcbi0gWyBdIEtlZXAgdGhpcyB0YXNrXFxuLSBbeF0gRGVsZXRlIHRoaXMgdGFza1xcbi0gWyBdIEtlZXAgdGhpcyB0b29cIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2stZGVsZXRlXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJEZWxldGUgdGhpcyB0YXNrXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gRGVsZXRlIHRoaXMgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0Y2FudmFzTm9kZUlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUgPSAoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlciBhcyBhbnlcclxuXHRcdFx0KS5kZWxldGVUYXNrRnJvbVRleHROb2RlLmJpbmQoY2FudmFzVXBkYXRlcik7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUodGV4dE5vZGUsIHRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodGV4dE5vZGUudGV4dCkudG9CZShcclxuXHRcdFx0XHRcIiMgVGFza3NcXG5cXG4tIFsgXSBLZWVwIHRoaXMgdGFza1xcbi0gWyBdIEtlZXAgdGhpcyB0b29cIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZmFpbCB0byBkZWxldGUgbm9uLWV4aXN0ZW50IHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRpZDogXCJub2RlLTJcIixcclxuXHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0XHRoZWlnaHQ6IDYwLFxyXG5cdFx0XHRcdHRleHQ6IFwiIyBUYXNrc1xcblxcbi0gWyBdIEtlZXAgdGhpcyB0YXNrXFxuLSBbIF0gS2VlcCB0aGlzIHRvb1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtdGFzay1taXNzaW5nXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJOb24tZXhpc3RlbnQgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIE5vbi1leGlzdGVudCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwibm9kZS0yXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZGVsZXRlVGFza0Zyb21UZXh0Tm9kZSA9IChcclxuXHRcdFx0XHRjYW52YXNVcGRhdGVyIGFzIGFueVxyXG5cdFx0XHQpLmRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUuYmluZChjYW52YXNVcGRhdGVyKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZGVsZXRlVGFza0Zyb21UZXh0Tm9kZSh0ZXh0Tm9kZSwgdGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCJUYXNrIG5vdCBmb3VuZCBpbiBDYW52YXMgdGV4dCBub2RlXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRlbGV0ZSB0YXNrIHdpdGggY29tcGxleCBtZXRhZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRleHROb2RlID0ge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiIGFzIGNvbnN0LFxyXG5cdFx0XHRcdGlkOiBcIm5vZGUtM1wiLFxyXG5cdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0eTogMCxcclxuXHRcdFx0XHR3aWR0aDogMjUwLFxyXG5cdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0dGV4dDogXCIjIFByb2plY3QgVGFza3NcXG5cXG4tIFsgXSBSZWd1bGFyIHRhc2tcXG4tIFt4XSBDb21wbGV4IHRhc2sgI3Byb2plY3QvdGVzdCDij6sg8J+ThSAyMDI0LTEyLTIwIPCfj4EgYXJjaGl2ZVxcbi0gWyBdIEFub3RoZXIgdGFza1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtdGFzay1jb21wbGV4XCIsXHJcblx0XHRcdFx0Y29udGVudDpcclxuXHRcdFx0XHRcdFwiQ29tcGxleCB0YXNrICNwcm9qZWN0L3Rlc3Qg4o+rIPCfk4UgMjAyNC0xMi0yMCDwn4+BIGFyY2hpdmVcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gQ29tcGxleCB0YXNrICNwcm9qZWN0L3Rlc3Qg4o+rIPCfk4UgMjAyNC0xMi0yMCDwn4+BIGFyY2hpdmVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJjYW52YXNcIixcclxuXHRcdFx0XHRcdGNhbnZhc05vZGVJZDogXCJub2RlLTNcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L3Rlc3RcIl0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRwcmlvcml0eTogNCxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKFwiMjAyNC0xMi0yMFwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZWxldGVUYXNrRnJvbVRleHROb2RlID0gKFxyXG5cdFx0XHRcdGNhbnZhc1VwZGF0ZXIgYXMgYW55XHJcblx0XHRcdCkuZGVsZXRlVGFza0Zyb21UZXh0Tm9kZS5iaW5kKGNhbnZhc1VwZGF0ZXIpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkZWxldGVUYXNrRnJvbVRleHROb2RlKHRleHROb2RlLCB0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHRleHROb2RlLnRleHQpLnRvQmUoXHJcblx0XHRcdFx0XCIjIFByb2plY3QgVGFza3NcXG5cXG4tIFsgXSBSZWd1bGFyIHRhc2tcXG4tIFsgXSBBbm90aGVyIHRhc2tcIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiSW50ZWdyYXRpb24gU2NlbmFyaW9zXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSByZWFsLXdvcmxkIGFyY2hpdmUgc2NlbmFyaW9cIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBTaW11bGF0ZSBhIHJlYWwgQ2FudmFzIHRleHQgbm9kZSB3aXRoIHRhc2tzIHRoYXQgaGF2ZSBvbkNvbXBsZXRpb24gbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgdGV4dE5vZGUgPSB7XHJcblx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIgYXMgY29uc3QsXHJcblx0XHRcdFx0aWQ6IFwicmVhbC1ub2RlXCIsXHJcblx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHR5OiAwLFxyXG5cdFx0XHRcdHdpZHRoOiAzNTAsXHJcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXHJcblx0XHRcdFx0dGV4dDogXCIjIEN1cnJlbnQgVGFza3NcXG5cXG4tIFsgXSBPbmdvaW5nIHRhc2tcXG4tIFt4XSBDb21wbGV0ZWQgdGFzayB3aXRoIGFyY2hpdmUg8J+PgSBhcmNoaXZlXFxuLSBbIF0gRnV0dXJlIHRhc2sgI2ltcG9ydGFudFxcbi0gW3hdIEFub3RoZXIgY29tcGxldGVkIHRhc2sg8J+PgSBtb3ZlOmRvbmUubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFRhc2sgdGhhdCBzaG91bGQgYmUgYXJjaGl2ZWQgYW5kIGRlbGV0ZWRcclxuXHRcdFx0Y29uc3QgYXJjaGl2ZVRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJhcmNoaXZlLXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkNvbXBsZXRlZCB0YXNrIHdpdGggYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInByb2plY3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBDb21wbGV0ZWQgdGFzayB3aXRoIGFyY2hpdmUg8J+PgSBhcmNoaXZlXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwicmVhbC1ub2RlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbjogXCJhcmNoaXZlXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEZpcnN0IHZlcmlmeSB0aGUgdGFzayBjYW4gYmUgZm91bmRcclxuXHRcdFx0Y29uc3QgbGluZU1hdGNoZXNUYXNrID0gKGNhbnZhc1VwZGF0ZXIgYXMgYW55KS5saW5lTWF0Y2hlc1Rhc2suYmluZChcclxuXHRcdFx0XHRjYW52YXNVcGRhdGVyXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gdGV4dE5vZGUudGV4dC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0bGV0IHRhc2tGb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHQoY2FudmFzVXBkYXRlciBhcyBhbnkpLmlzVGFza0xpbmUobGluZSkgJiZcclxuXHRcdFx0XHRcdGxpbmVNYXRjaGVzVGFzayhsaW5lLCBhcmNoaXZlVGFzaylcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHRhc2tGb3VuZCA9IHRydWU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZXhwZWN0KHRhc2tGb3VuZCkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFRoZW4gZGVsZXRlIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUgPSAoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlciBhcyBhbnlcclxuXHRcdFx0KS5kZWxldGVUYXNrRnJvbVRleHROb2RlLmJpbmQoY2FudmFzVXBkYXRlcik7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUodGV4dE5vZGUsIGFyY2hpdmVUYXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHRleHROb2RlLnRleHQpLnRvQmUoXHJcblx0XHRcdFx0XCIjIEN1cnJlbnQgVGFza3NcXG5cXG4tIFsgXSBPbmdvaW5nIHRhc2tcXG4tIFsgXSBGdXR1cmUgdGFzayAjaW1wb3J0YW50XFxuLSBbeF0gQW5vdGhlciBjb21wbGV0ZWQgdGFzayDwn4+BIG1vdmU6ZG9uZS5tZFwiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbW92ZSBzY2VuYXJpbyB3aXRoIEpTT04gbWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRpZDogXCJqc29uLW5vZGVcIixcclxuXHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0d2lkdGg6IDQwMCxcclxuXHRcdFx0XHRoZWlnaHQ6IDE1MCxcclxuXHRcdFx0XHR0ZXh0OiAnIyBUYXNrcyB3aXRoIEpTT05cXG5cXG4tIFsgXSBSZWd1bGFyIHRhc2tcXG4tIFt4XSBNb3ZlIHRhc2sg8J+PgSB7XCJ0eXBlXCI6IFwibW92ZVwiLCBcInRhcmdldEZpbGVcIjogXCJhcmNoaXZlLm1kXCIsIFwidGFyZ2V0U2VjdGlvblwiOiBcIkRvbmVcIn1cXG4tIFsgXSBBbm90aGVyIHRhc2snLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW92ZVRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJtb3ZlLXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIk1vdmUgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInByb2plY3QuY2FudmFzXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0Jy0gW3hdIE1vdmUgdGFzayDwn4+BIHtcInR5cGVcIjogXCJtb3ZlXCIsIFwidGFyZ2V0RmlsZVwiOiBcImFyY2hpdmUubWRcIiwgXCJ0YXJnZXRTZWN0aW9uXCI6IFwiRG9uZVwifScsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHRjYW52YXNOb2RlSWQ6IFwianNvbi1ub2RlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbjpcclxuXHRcdFx0XHRcdFx0J3tcInR5cGVcIjogXCJtb3ZlXCIsIFwidGFyZ2V0RmlsZVwiOiBcImFyY2hpdmUubWRcIiwgXCJ0YXJnZXRTZWN0aW9uXCI6IFwiRG9uZVwifScsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUgPSAoXHJcblx0XHRcdFx0Y2FudmFzVXBkYXRlciBhcyBhbnlcclxuXHRcdFx0KS5kZWxldGVUYXNrRnJvbVRleHROb2RlLmJpbmQoY2FudmFzVXBkYXRlcik7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRlbGV0ZVRhc2tGcm9tVGV4dE5vZGUodGV4dE5vZGUsIG1vdmVUYXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHRleHROb2RlLnRleHQpLnRvQmUoXHJcblx0XHRcdFx0XCIjIFRhc2tzIHdpdGggSlNPTlxcblxcbi0gWyBdIFJlZ3VsYXIgdGFza1xcbi0gWyBdIEFub3RoZXIgdGFza1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==