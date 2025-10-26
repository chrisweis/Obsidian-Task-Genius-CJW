/**
 * Workflow Optimization Tests
 *
 * Tests for the new workflow optimization features including:
 * - Quick workflow creation
 * - Task to workflow conversion
 * - Workflow starting task creation
 * - Workflow progress indicators
 * - Enhanced user experience features
 */
import { analyzeTaskStructure, convertTaskStructureToWorkflow, createWorkflowStartingTask, convertCurrentTaskToWorkflowRoot, suggestWorkflowFromExisting, } from "../core/workflow-converter";
import { WorkflowProgressIndicator } from "../components/features/workflow/widgets/WorkflowProgressIndicator";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Editor for testing
class MockEditor {
    constructor(content) {
        this.lines = content.split("\n");
        this.cursor = { line: 0, ch: 0 };
    }
    getValue() {
        return this.lines.join("\n");
    }
    getLine(line) {
        return this.lines[line] || "";
    }
    getCursor() {
        return this.cursor;
    }
    setCursor(line, ch = 0) {
        this.cursor = { line, ch };
    }
    setLine(line, text) {
        this.lines[line] = text;
    }
    replaceRange(text, from, to) {
        // Simple implementation for testing
        const line = this.lines[from.line];
        const before = line.substring(0, from.ch);
        const after = line.substring(to.ch);
        const newContent = before + text + after;
        // Handle newlines by splitting into multiple lines
        if (newContent.includes("\n")) {
            const parts = newContent.split("\n");
            this.lines[from.line] = parts[0];
            // Insert additional lines if needed
            for (let i = 1; i < parts.length; i++) {
                this.lines.splice(from.line + i, 0, parts[i]);
            }
        }
        else {
            this.lines[from.line] = newContent;
        }
    }
}
describe("Workflow Optimization Features", () => {
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        // Add some sample workflows
        mockPlugin.settings.workflow.definitions = [
            {
                id: "simple_workflow",
                name: "Simple Workflow",
                description: "A basic workflow",
                stages: [
                    { id: "start", name: "Start", type: "linear" },
                    { id: "middle", name: "Middle", type: "linear" },
                    { id: "end", name: "End", type: "terminal" },
                ],
                metadata: {
                    version: "1.0",
                    created: "2024-01-01",
                    lastModified: "2024-01-01",
                },
            },
        ];
    });
    describe("Task Structure Analysis", () => {
        test("should analyze simple task structure", () => {
            const content = `- [ ] Main Task
  - [ ] Subtask 1
  - [ ] Subtask 2`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const structure = analyzeTaskStructure(editor, editor.getCursor());
            expect(structure).toBeTruthy();
            expect(structure === null || structure === void 0 ? void 0 : structure.content).toBe("Main Task");
            expect(structure === null || structure === void 0 ? void 0 : structure.isTask).toBe(true);
            expect(structure === null || structure === void 0 ? void 0 : structure.children).toHaveLength(2);
            expect(structure === null || structure === void 0 ? void 0 : structure.children[0].content).toBe("Subtask 1");
            expect(structure === null || structure === void 0 ? void 0 : structure.children[1].content).toBe("Subtask 2");
        });
        test("should handle nested task structure", () => {
            const content = `- [ ] Project
  - [ ] Phase 1
    - [ ] Task 1.1
    - [ ] Task 1.2
  - [ ] Phase 2
    - [ ] Task 2.1`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const structure = analyzeTaskStructure(editor, editor.getCursor());
            expect(structure).toBeTruthy();
            expect(structure === null || structure === void 0 ? void 0 : structure.content).toBe("Project");
            expect(structure === null || structure === void 0 ? void 0 : structure.children).toHaveLength(2);
            expect(structure === null || structure === void 0 ? void 0 : structure.children[0].content).toBe("Phase 1");
            expect(structure === null || structure === void 0 ? void 0 : structure.children[0].children).toHaveLength(2);
        });
        test("should return null for non-task lines", () => {
            const content = `This is just text
Not a task`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const structure = analyzeTaskStructure(editor, editor.getCursor());
            expect(structure).toBeNull();
        });
    });
    describe("Task to Workflow Conversion", () => {
        test("should convert simple task structure to workflow", () => {
            const structure = {
                content: "Project Setup",
                level: 0,
                line: 0,
                isTask: true,
                status: " ",
                children: [
                    {
                        content: "Initialize Repository",
                        level: 2,
                        line: 1,
                        isTask: true,
                        status: " ",
                        children: [],
                    },
                    {
                        content: "Setup Dependencies",
                        level: 2,
                        line: 2,
                        isTask: true,
                        status: " ",
                        children: [],
                    },
                ],
            };
            const workflow = convertTaskStructureToWorkflow(structure, "Project Setup Workflow", "project_setup");
            expect(workflow.id).toBe("project_setup");
            expect(workflow.name).toBe("Project Setup Workflow");
            expect(workflow.stages).toHaveLength(3); // Root + 2 children
            expect(workflow.stages[0].name).toBe("Project Setup");
            expect(workflow.stages[1].name).toBe("Initialize Repository");
            expect(workflow.stages[2].name).toBe("Setup Dependencies");
        });
        test("should handle cycle stages with substages", () => {
            var _a;
            const structure = {
                content: "Development",
                level: 0,
                line: 0,
                isTask: true,
                status: " ",
                children: [
                    {
                        content: "Code",
                        level: 2,
                        line: 1,
                        isTask: true,
                        status: " ",
                        children: [
                            {
                                content: "Write Tests",
                                level: 4,
                                line: 2,
                                isTask: true,
                                status: " ",
                                children: [],
                            },
                            {
                                content: "Implement Feature",
                                level: 4,
                                line: 3,
                                isTask: true,
                                status: " ",
                                children: [],
                            },
                        ],
                    },
                ],
            };
            const workflow = convertTaskStructureToWorkflow(structure, "Development Workflow", "development");
            expect(workflow.stages).toHaveLength(2);
            expect(workflow.stages[1].type).toBe("cycle");
            expect(workflow.stages[1].subStages).toHaveLength(2);
            expect((_a = workflow.stages[1].subStages) === null || _a === void 0 ? void 0 : _a[0].name).toBe("Write Tests");
        });
    });
    describe("Workflow Starting Task Creation", () => {
        test("should create workflow starting task at cursor", () => {
            const content = `Some existing content
`;
            const editor = new MockEditor(content);
            editor.setCursor(1);
            const workflow = {
                id: "test_workflow",
                name: "Test Workflow",
                description: "Test",
                stages: [],
                metadata: {
                    version: "1.0",
                    created: "2024-01-01",
                    lastModified: "2024-01-01",
                },
            };
            createWorkflowStartingTask(editor, editor.getCursor(), workflow, mockPlugin);
            expect(editor.getLine(1)).toBe("- [ ] Test Workflow #workflow/test_workflow");
        });
        test("should handle indentation correctly", () => {
            const content = `  Some indented content
`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const workflow = {
                id: "test_workflow",
                name: "Test Workflow",
                description: "Test",
                stages: [],
                metadata: {
                    version: "1.0",
                    created: "2024-01-01",
                    lastModified: "2024-01-01",
                },
            };
            createWorkflowStartingTask(editor, editor.getCursor(), workflow, mockPlugin);
            // The function adds a new line after the existing content
            expect(editor.getLine(0)).toBe("  Some indented content");
            expect(editor.getLine(1)).toBe("  - [ ] Test Workflow #workflow/test_workflow");
        });
    });
    describe("Current Task to Workflow Root Conversion", () => {
        test("should convert task to workflow root", () => {
            const content = `- [ ] My Task`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const success = convertCurrentTaskToWorkflowRoot(editor, editor.getCursor(), "my_workflow");
            expect(success).toBe(true);
            expect(editor.getLine(0)).toBe("- [ ] My Task #workflow/my_workflow");
        });
        test("should not convert non-task lines", () => {
            const content = `Just some text`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const success = convertCurrentTaskToWorkflowRoot(editor, editor.getCursor(), "my_workflow");
            expect(success).toBe(false);
            expect(editor.getLine(0)).toBe("Just some text");
        });
        test("should not convert tasks that already have workflow tags", () => {
            const content = `- [ ] My Task #workflow/existing`;
            const editor = new MockEditor(content);
            editor.setCursor(0);
            const success = convertCurrentTaskToWorkflowRoot(editor, editor.getCursor(), "my_workflow");
            expect(success).toBe(false);
            expect(editor.getLine(0)).toBe("- [ ] My Task #workflow/existing");
        });
    });
    describe("Workflow Suggestions", () => {
        test("should suggest similar workflow based on stage count", () => {
            const structure = {
                content: "New Project",
                level: 0,
                line: 0,
                isTask: true,
                status: " ",
                children: [
                    {
                        content: "Step 1",
                        level: 2,
                        line: 1,
                        isTask: true,
                        status: " ",
                        children: [],
                    },
                    {
                        content: "Step 2",
                        level: 2,
                        line: 2,
                        isTask: true,
                        status: " ",
                        children: [],
                    },
                ],
            };
            const existingWorkflows = mockPlugin.settings.workflow.definitions;
            const suggestion = suggestWorkflowFromExisting(structure, existingWorkflows);
            expect(suggestion).toBeTruthy();
            expect(suggestion === null || suggestion === void 0 ? void 0 : suggestion.name).toBe("New Project Workflow");
            expect(suggestion === null || suggestion === void 0 ? void 0 : suggestion.stages).toHaveLength(3); // Same as existing workflow
        });
        test("should return null when no similar workflows exist", () => {
            const structure = {
                content: "Complex Project",
                level: 0,
                line: 0,
                isTask: true,
                status: " ",
                children: Array(10)
                    .fill(null)
                    .map((_, i) => ({
                    content: `Step ${i + 1}`,
                    level: 2,
                    line: i + 1,
                    isTask: true,
                    status: " ",
                    children: [],
                })),
            };
            const existingWorkflows = mockPlugin.settings.workflow.definitions;
            const suggestion = suggestWorkflowFromExisting(structure, existingWorkflows);
            expect(suggestion).toBeNull();
        });
    });
    describe("Workflow Progress Indicator", () => {
        test("should calculate progress correctly", () => {
            const workflow = {
                id: "test_workflow",
                name: "Test Workflow",
                description: "Test",
                stages: [
                    { id: "stage1", name: "Stage 1", type: "linear" },
                    { id: "stage2", name: "Stage 2", type: "linear" },
                    { id: "stage3", name: "Stage 3", type: "terminal" },
                ],
                metadata: {
                    version: "1.0",
                    created: "2024-01-01",
                    lastModified: "2024-01-01",
                },
            };
            const completedStages = ["stage1"];
            const currentStageId = "stage2";
            // Test the static calculation method
            const workflowTasks = [
                { stage: "stage1", completed: true },
                { stage: "stage1", completed: true },
                { stage: "stage2", completed: false },
                { stage: "stage3", completed: false },
            ];
            const calculated = WorkflowProgressIndicator.calculateCompletedStages(workflowTasks, workflow);
            expect(calculated).toContain("stage1");
            expect(calculated).not.toContain("stage2");
        });
        test("should handle empty workflow tasks", () => {
            const workflow = {
                id: "test_workflow",
                name: "Test Workflow",
                description: "Test",
                stages: [{ id: "stage1", name: "Stage 1", type: "linear" }],
                metadata: {
                    version: "1.0",
                    created: "2024-01-01",
                    lastModified: "2024-01-01",
                },
            };
            const calculated = WorkflowProgressIndicator.calculateCompletedStages([], workflow);
            expect(calculated).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3dPcHRpbWl6YXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93T3B0aW1pemF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUNOLG9CQUFvQixFQUNwQiw4QkFBOEIsRUFDOUIsMEJBQTBCLEVBQzFCLGdDQUFnQyxFQUNoQywyQkFBMkIsR0FDM0IsTUFBTSw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzlELDBCQUEwQjtBQUMxQixNQUFNLFVBQVU7SUFJZixZQUFZLE9BQWU7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFZO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFZLEVBQUUsS0FBYSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsSUFBWTtRQUNqQyxJQUFJLENBQUMs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QU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDM0QsUUFBUSxFQUFFO29CQUNULE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxZQUFZO29CQUNyQixZQUFZLEVBQUUsWUFBWTtpQkFDMUI7YUFDRCxDQUFDO1lBRUYsTUFBTSxVQUFVLEdBQ2YseUJBQXlCLENBQUMsd0JBQXdCLENBQ2pELEVBQUUsRUFDRixRQUFRLENBQ1IsQ0FBQztZQUNILE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFdvcmtmbG93IE9wdGltaXphdGlvbiBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyBmb3IgdGhlIG5ldyB3b3JrZmxvdyBvcHRpbWl6YXRpb24gZmVhdHVyZXMgaW5jbHVkaW5nOlxyXG4gKiAtIFF1aWNrIHdvcmtmbG93IGNyZWF0aW9uXHJcbiAqIC0gVGFzayB0byB3b3JrZmxvdyBjb252ZXJzaW9uXHJcbiAqIC0gV29ya2Zsb3cgc3RhcnRpbmcgdGFzayBjcmVhdGlvblxyXG4gKiAtIFdvcmtmbG93IHByb2dyZXNzIGluZGljYXRvcnNcclxuICogLSBFbmhhbmNlZCB1c2VyIGV4cGVyaWVuY2UgZmVhdHVyZXNcclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdGFuYWx5emVUYXNrU3RydWN0dXJlLFxyXG5cdGNvbnZlcnRUYXNrU3RydWN0dXJlVG9Xb3JrZmxvdyxcclxuXHRjcmVhdGVXb3JrZmxvd1N0YXJ0aW5nVGFzayxcclxuXHRjb252ZXJ0Q3VycmVudFRhc2tUb1dvcmtmbG93Um9vdCxcclxuXHRzdWdnZXN0V29ya2Zsb3dGcm9tRXhpc3RpbmcsXHJcbn0gZnJvbSBcIi4uL2NvcmUvd29ya2Zsb3ctY29udmVydGVyXCI7XHJcbmltcG9ydCB7IFdvcmtmbG93UHJvZ3Jlc3NJbmRpY2F0b3IgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9mZWF0dXJlcy93b3JrZmxvdy93aWRnZXRzL1dvcmtmbG93UHJvZ3Jlc3NJbmRpY2F0b3JcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiwgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5pbXBvcnQgeyBXb3JrZmxvd0RlZmluaXRpb24gfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLy8gTW9jayBFZGl0b3IgZm9yIHRlc3RpbmdcclxuY2xhc3MgTW9ja0VkaXRvciB7XHJcblx0cHJpdmF0ZSBsaW5lczogc3RyaW5nW107XHJcblx0cHJpdmF0ZSBjdXJzb3I6IHsgbGluZTogbnVtYmVyOyBjaDogbnVtYmVyIH07XHJcblxyXG5cdGNvbnN0cnVjdG9yKGNvbnRlbnQ6IHN0cmluZykge1xyXG5cdFx0dGhpcy5saW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHR0aGlzLmN1cnNvciA9IHsgbGluZTogMCwgY2g6IDAgfTtcclxuXHR9XHJcblxyXG5cdGdldFZhbHVlKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5saW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cdH1cclxuXHJcblx0Z2V0TGluZShsaW5lOiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMubGluZXNbbGluZV0gfHwgXCJcIjtcclxuXHR9XHJcblxyXG5cdGdldEN1cnNvcigpIHtcclxuXHRcdHJldHVybiB0aGlzLmN1cnNvcjtcclxuXHR9XHJcblxyXG5cdHNldEN1cnNvcihsaW5lOiBudW1iZXIsIGNoOiBudW1iZXIgPSAwKSB7XHJcblx0XHR0aGlzLmN1cnNvciA9IHsgbGluZSwgY2ggfTtcclxuXHR9XHJcblxyXG5cdHNldExpbmUobGluZTogbnVtYmVyLCB0ZXh0OiBzdHJpbmcpIHtcclxuXHRcdHRoaXMubGluZXNbbGluZV0gPSB0ZXh0O1xyXG5cdH1cclxuXHJcblx0cmVwbGFjZVJhbmdlKHRleHQ6IHN0cmluZywgZnJvbTogYW55LCB0bzogYW55KSB7XHJcblx0XHQvLyBTaW1wbGUgaW1wbGVtZW50YXRpb24gZm9yIHRlc3RpbmdcclxuXHRcdGNvbnN0IGxpbmUgPSB0aGlzLmxpbmVzW2Zyb20ubGluZV07XHJcblx0XHRjb25zdCBiZWZvcmUgPSBsaW5lLnN1YnN0cmluZygwLCBmcm9tLmNoKTtcclxuXHRcdGNvbnN0IGFmdGVyID0gbGluZS5zdWJzdHJpbmcodG8uY2gpO1xyXG5cdFx0Y29uc3QgbmV3Q29udGVudCA9IGJlZm9yZSArIHRleHQgKyBhZnRlcjtcclxuXHJcblx0XHQvLyBIYW5kbGUgbmV3bGluZXMgYnkgc3BsaXR0aW5nIGludG8gbXVsdGlwbGUgbGluZXNcclxuXHRcdGlmIChuZXdDb250ZW50LmluY2x1ZGVzKFwiXFxuXCIpKSB7XHJcblx0XHRcdGNvbnN0IHBhcnRzID0gbmV3Q29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0dGhpcy5saW5lc1tmcm9tLmxpbmVdID0gcGFydHNbMF07XHJcblx0XHRcdC8vIEluc2VydCBhZGRpdGlvbmFsIGxpbmVzIGlmIG5lZWRlZFxyXG5cdFx0XHRmb3IgKGxldCBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5saW5lcy5zcGxpY2UoZnJvbS5saW5lICsgaSwgMCwgcGFydHNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmxpbmVzW2Zyb20ubGluZV0gPSBuZXdDb250ZW50O1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZGVzY3JpYmUoXCJXb3JrZmxvdyBPcHRpbWl6YXRpb24gRmVhdHVyZXNcIiwgKCkgPT4ge1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblx0bGV0IG1vY2tBcHA6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrUGx1Z2luID0gY3JlYXRlTW9ja1BsdWdpbigpO1xyXG5cdFx0bW9ja0FwcCA9IGNyZWF0ZU1vY2tBcHAoKTtcclxuXHJcblx0XHQvLyBBZGQgc29tZSBzYW1wbGUgd29ya2Zsb3dzXHJcblx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmRlZmluaXRpb25zID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic2ltcGxlX3dvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogXCJTaW1wbGUgV29ya2Zsb3dcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJBIGJhc2ljIHdvcmtmbG93XCIsXHJcblx0XHRcdFx0c3RhZ2VzOiBbXHJcblx0XHRcdFx0XHR7IGlkOiBcInN0YXJ0XCIsIG5hbWU6IFwiU3RhcnRcIiwgdHlwZTogXCJsaW5lYXJcIiB9LFxyXG5cdFx0XHRcdFx0eyBpZDogXCJtaWRkbGVcIiwgbmFtZTogXCJNaWRkbGVcIiwgdHlwZTogXCJsaW5lYXJcIiB9LFxyXG5cdFx0XHRcdFx0eyBpZDogXCJlbmRcIiwgbmFtZTogXCJFbmRcIiwgdHlwZTogXCJ0ZXJtaW5hbFwiIH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dmVyc2lvbjogXCIxLjBcIixcclxuXHRcdFx0XHRcdGNyZWF0ZWQ6IFwiMjAyNC0wMS0wMVwiLFxyXG5cdFx0XHRcdFx0bGFzdE1vZGlmaWVkOiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIFN0cnVjdHVyZSBBbmFseXNpc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGFuYWx5emUgc2ltcGxlIHRhc2sgc3RydWN0dXJlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtIFsgXSBNYWluIFRhc2tcclxuICAtIFsgXSBTdWJ0YXNrIDFcclxuICAtIFsgXSBTdWJ0YXNrIDJgO1xyXG5cclxuXHRcdFx0Y29uc3QgZWRpdG9yID0gbmV3IE1vY2tFZGl0b3IoY29udGVudCk7XHJcblx0XHRcdGVkaXRvci5zZXRDdXJzb3IoMCk7XHJcblxyXG5cdFx0XHRjb25zdCBzdHJ1Y3R1cmUgPSBhbmFseXplVGFza1N0cnVjdHVyZShcclxuXHRcdFx0XHRlZGl0b3IgYXMgYW55LFxyXG5cdFx0XHRcdGVkaXRvci5nZXRDdXJzb3IoKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHN0cnVjdHVyZSkudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3Qoc3RydWN0dXJlPy5jb250ZW50KS50b0JlKFwiTWFpbiBUYXNrXCIpO1xyXG5cdFx0XHRleHBlY3Qoc3RydWN0dXJlPy5pc1Rhc2spLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChzdHJ1Y3R1cmU/LmNoaWxkcmVuKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHRcdGV4cGVjdChzdHJ1Y3R1cmU/LmNoaWxkcmVuWzBdLmNvbnRlbnQpLnRvQmUoXCJTdWJ0YXNrIDFcIik7XHJcblx0XHRcdGV4cGVjdChzdHJ1Y3R1cmU/LmNoaWxkcmVuWzFdLmNvbnRlbnQpLnRvQmUoXCJTdWJ0YXNrIDJcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBuZXN0ZWQgdGFzayBzdHJ1Y3R1cmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0gWyBdIFByb2plY3RcclxuICAtIFsgXSBQaGFzZSAxXHJcbiAgICAtIFsgXSBUYXNrIDEuMVxyXG4gICAgLSBbIF0gVGFzayAxLjJcclxuICAtIFsgXSBQaGFzZSAyXHJcbiAgICAtIFsgXSBUYXNrIDIuMWA7XHJcblxyXG5cdFx0XHRjb25zdCBlZGl0b3IgPSBuZXcgTW9ja0VkaXRvcihjb250ZW50KTtcclxuXHRcdFx0ZWRpdG9yLnNldEN1cnNvcigwKTtcclxuXHJcblx0XHRcdGNvbnN0IHN0cnVjdHVyZSA9IGFuYWx5emVUYXNrU3RydWN0dXJlKFxyXG5cdFx0XHRcdGVkaXRvciBhcyBhbnksXHJcblx0XHRcdFx0ZWRpdG9yLmdldEN1cnNvcigpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3Qoc3RydWN0dXJlKS50b0JlVHJ1dGh5KCk7XHJcblx0XHRcdGV4cGVjdChzdHJ1Y3R1cmU/LmNvbnRlbnQpLnRvQmUoXCJQcm9qZWN0XCIpO1xyXG5cdFx0XHRleHBlY3Qoc3RydWN0dXJlPy5jaGlsZHJlbikudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRleHBlY3Qoc3RydWN0dXJlPy5jaGlsZHJlblswXS5jb250ZW50KS50b0JlKFwiUGhhc2UgMVwiKTtcclxuXHRcdFx0ZXhwZWN0KHN0cnVjdHVyZT8uY2hpbGRyZW5bMF0uY2hpbGRyZW4pLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIG51bGwgZm9yIG5vbi10YXNrIGxpbmVzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBUaGlzIGlzIGp1c3QgdGV4dFxyXG5Ob3QgYSB0YXNrYDtcclxuXHJcblx0XHRcdGNvbnN0IGVkaXRvciA9IG5ldyBNb2NrRWRpdG9yKGNvbnRlbnQpO1xyXG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKDApO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RydWN0dXJlID0gYW5hbHl6ZVRhc2tTdHJ1Y3R1cmUoXHJcblx0XHRcdFx0ZWRpdG9yIGFzIGFueSxcclxuXHRcdFx0XHRlZGl0b3IuZ2V0Q3Vyc29yKClcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChzdHJ1Y3R1cmUpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIHRvIFdvcmtmbG93IENvbnZlcnNpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBjb252ZXJ0IHNpbXBsZSB0YXNrIHN0cnVjdHVyZSB0byB3b3JrZmxvd1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0cnVjdHVyZSA9IHtcclxuXHRcdFx0XHRjb250ZW50OiBcIlByb2plY3QgU2V0dXBcIixcclxuXHRcdFx0XHRsZXZlbDogMCxcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGlzVGFzazogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IFwiSW5pdGlhbGl6ZSBSZXBvc2l0b3J5XCIsXHJcblx0XHRcdFx0XHRcdGxldmVsOiAyLFxyXG5cdFx0XHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdFx0XHRpc1Rhc2s6IHRydWUsXHJcblx0XHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IFwiU2V0dXAgRGVwZW5kZW5jaWVzXCIsXHJcblx0XHRcdFx0XHRcdGxldmVsOiAyLFxyXG5cdFx0XHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdFx0XHRpc1Rhc2s6IHRydWUsXHJcblx0XHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHdvcmtmbG93ID0gY29udmVydFRhc2tTdHJ1Y3R1cmVUb1dvcmtmbG93KFxyXG5cdFx0XHRcdHN0cnVjdHVyZSxcclxuXHRcdFx0XHRcIlByb2plY3QgU2V0dXAgV29ya2Zsb3dcIixcclxuXHRcdFx0XHRcInByb2plY3Rfc2V0dXBcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93LmlkKS50b0JlKFwicHJvamVjdF9zZXR1cFwiKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93Lm5hbWUpLnRvQmUoXCJQcm9qZWN0IFNldHVwIFdvcmtmbG93XCIpO1xyXG5cdFx0XHRleHBlY3Qod29ya2Zsb3cuc3RhZ2VzKS50b0hhdmVMZW5ndGgoMyk7IC8vIFJvb3QgKyAyIGNoaWxkcmVuXHJcblx0XHRcdGV4cGVjdCh3b3JrZmxvdy5zdGFnZXNbMF0ubmFtZSkudG9CZShcIlByb2plY3QgU2V0dXBcIik7XHJcblx0XHRcdGV4cGVjdCh3b3JrZmxvdy5zdGFnZXNbMV0ubmFtZSkudG9CZShcIkluaXRpYWxpemUgUmVwb3NpdG9yeVwiKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93LnN0YWdlc1syXS5uYW1lKS50b0JlKFwiU2V0dXAgRGVwZW5kZW5jaWVzXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY3ljbGUgc3RhZ2VzIHdpdGggc3Vic3RhZ2VzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RydWN0dXJlID0ge1xyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiRGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XHRsZXZlbDogMCxcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGlzVGFzazogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IFwiQ29kZVwiLFxyXG5cdFx0XHRcdFx0XHRsZXZlbDogMixcclxuXHRcdFx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRcdFx0aXNUYXNrOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IFwiV3JpdGUgVGVzdHNcIixcclxuXHRcdFx0XHRcdFx0XHRcdGxldmVsOiA0LFxyXG5cdFx0XHRcdFx0XHRcdFx0bGluZTogMixcclxuXHRcdFx0XHRcdFx0XHRcdGlzVGFzazogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiBcIkltcGxlbWVudCBGZWF0dXJlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRsZXZlbDogNCxcclxuXHRcdFx0XHRcdFx0XHRcdGxpbmU6IDMsXHJcblx0XHRcdFx0XHRcdFx0XHRpc1Rhc2s6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB3b3JrZmxvdyA9IGNvbnZlcnRUYXNrU3RydWN0dXJlVG9Xb3JrZmxvdyhcclxuXHRcdFx0XHRzdHJ1Y3R1cmUsXHJcblx0XHRcdFx0XCJEZXZlbG9wbWVudCBXb3JrZmxvd1wiLFxyXG5cdFx0XHRcdFwiZGV2ZWxvcG1lbnRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93LnN0YWdlcykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRleHBlY3Qod29ya2Zsb3cuc3RhZ2VzWzFdLnR5cGUpLnRvQmUoXCJjeWNsZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93LnN0YWdlc1sxXS5zdWJTdGFnZXMpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93LnN0YWdlc1sxXS5zdWJTdGFnZXM/LlswXS5uYW1lKS50b0JlKFwiV3JpdGUgVGVzdHNcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJXb3JrZmxvdyBTdGFydGluZyBUYXNrIENyZWF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgY3JlYXRlIHdvcmtmbG93IHN0YXJ0aW5nIHRhc2sgYXQgY3Vyc29yXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBTb21lIGV4aXN0aW5nIGNvbnRlbnRcclxuYDtcclxuXHRcdFx0Y29uc3QgZWRpdG9yID0gbmV3IE1vY2tFZGl0b3IoY29udGVudCk7XHJcblx0XHRcdGVkaXRvci5zZXRDdXJzb3IoMSk7XHJcblxyXG5cdFx0XHRjb25zdCB3b3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3Rfd29ya2Zsb3dcIixcclxuXHRcdFx0XHRuYW1lOiBcIlRlc3QgV29ya2Zsb3dcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUZXN0XCIsXHJcblx0XHRcdFx0c3RhZ2VzOiBbXSxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dmVyc2lvbjogXCIxLjBcIixcclxuXHRcdFx0XHRcdGNyZWF0ZWQ6IFwiMjAyNC0wMS0wMVwiLFxyXG5cdFx0XHRcdFx0bGFzdE1vZGlmaWVkOiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y3JlYXRlV29ya2Zsb3dTdGFydGluZ1Rhc2soXHJcblx0XHRcdFx0ZWRpdG9yIGFzIGFueSxcclxuXHRcdFx0XHRlZGl0b3IuZ2V0Q3Vyc29yKCksXHJcblx0XHRcdFx0d29ya2Zsb3csXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGVkaXRvci5nZXRMaW5lKDEpKS50b0JlKFxyXG5cdFx0XHRcdFwiLSBbIF0gVGVzdCBXb3JrZmxvdyAjd29ya2Zsb3cvdGVzdF93b3JrZmxvd1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbmRlbnRhdGlvbiBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYCAgU29tZSBpbmRlbnRlZCBjb250ZW50XHJcbmA7XHJcblx0XHRcdGNvbnN0IGVkaXRvciA9IG5ldyBNb2NrRWRpdG9yKGNvbnRlbnQpO1xyXG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKDApO1xyXG5cclxuXHRcdFx0Y29uc3Qgd29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0X3dvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IFdvcmtmbG93XCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGVzdFwiLFxyXG5cdFx0XHRcdHN0YWdlczogW10sXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHZlcnNpb246IFwiMS4wXCIsXHJcblx0XHRcdFx0XHRjcmVhdGVkOiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0XHRcdGxhc3RNb2RpZmllZDogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNyZWF0ZVdvcmtmbG93U3RhcnRpbmdUYXNrKFxyXG5cdFx0XHRcdGVkaXRvciBhcyBhbnksXHJcblx0XHRcdFx0ZWRpdG9yLmdldEN1cnNvcigpLFxyXG5cdFx0XHRcdHdvcmtmbG93LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFRoZSBmdW5jdGlvbiBhZGRzIGEgbmV3IGxpbmUgYWZ0ZXIgdGhlIGV4aXN0aW5nIGNvbnRlbnRcclxuXHRcdFx0ZXhwZWN0KGVkaXRvci5nZXRMaW5lKDApKS50b0JlKFwiICBTb21lIGluZGVudGVkIGNvbnRlbnRcIik7XHJcblx0XHRcdGV4cGVjdChlZGl0b3IuZ2V0TGluZSgxKSkudG9CZShcclxuXHRcdFx0XHRcIiAgLSBbIF0gVGVzdCBXb3JrZmxvdyAjd29ya2Zsb3cvdGVzdF93b3JrZmxvd1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDdXJyZW50IFRhc2sgdG8gV29ya2Zsb3cgUm9vdCBDb252ZXJzaW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgY29udmVydCB0YXNrIHRvIHdvcmtmbG93IHJvb3RcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0gWyBdIE15IFRhc2tgO1xyXG5cdFx0XHRjb25zdCBlZGl0b3IgPSBuZXcgTW9ja0VkaXRvcihjb250ZW50KTtcclxuXHRcdFx0ZWRpdG9yLnNldEN1cnNvcigwKTtcclxuXHJcblx0XHRcdGNvbnN0IHN1Y2Nlc3MgPSBjb252ZXJ0Q3VycmVudFRhc2tUb1dvcmtmbG93Um9vdChcclxuXHRcdFx0XHRlZGl0b3IgYXMgYW55LFxyXG5cdFx0XHRcdGVkaXRvci5nZXRDdXJzb3IoKSxcclxuXHRcdFx0XHRcIm15X3dvcmtmbG93XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChzdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QoZWRpdG9yLmdldExpbmUoMCkpLnRvQmUoXHJcblx0XHRcdFx0XCItIFsgXSBNeSBUYXNrICN3b3JrZmxvdy9teV93b3JrZmxvd1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBjb252ZXJ0IG5vbi10YXNrIGxpbmVzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGBKdXN0IHNvbWUgdGV4dGA7XHJcblx0XHRcdGNvbnN0IGVkaXRvciA9IG5ldyBNb2NrRWRpdG9yKGNvbnRlbnQpO1xyXG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKDApO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3VjY2VzcyA9IGNvbnZlcnRDdXJyZW50VGFza1RvV29ya2Zsb3dSb290KFxyXG5cdFx0XHRcdGVkaXRvciBhcyBhbnksXHJcblx0XHRcdFx0ZWRpdG9yLmdldEN1cnNvcigpLFxyXG5cdFx0XHRcdFwibXlfd29ya2Zsb3dcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QoZWRpdG9yLmdldExpbmUoMCkpLnRvQmUoXCJKdXN0IHNvbWUgdGV4dFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IGNvbnZlcnQgdGFza3MgdGhhdCBhbHJlYWR5IGhhdmUgd29ya2Zsb3cgdGFnc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBgLSBbIF0gTXkgVGFzayAjd29ya2Zsb3cvZXhpc3RpbmdgO1xyXG5cdFx0XHRjb25zdCBlZGl0b3IgPSBuZXcgTW9ja0VkaXRvcihjb250ZW50KTtcclxuXHRcdFx0ZWRpdG9yLnNldEN1cnNvcigwKTtcclxuXHJcblx0XHRcdGNvbnN0IHN1Y2Nlc3MgPSBjb252ZXJ0Q3VycmVudFRhc2tUb1dvcmtmbG93Um9vdChcclxuXHRcdFx0XHRlZGl0b3IgYXMgYW55LFxyXG5cdFx0XHRcdGVkaXRvci5nZXRDdXJzb3IoKSxcclxuXHRcdFx0XHRcIm15X3dvcmtmbG93XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChzdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KGVkaXRvci5nZXRMaW5lKDApKS50b0JlKFwiLSBbIF0gTXkgVGFzayAjd29ya2Zsb3cvZXhpc3RpbmdcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJXb3JrZmxvdyBTdWdnZXN0aW9uc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHN1Z2dlc3Qgc2ltaWxhciB3b3JrZmxvdyBiYXNlZCBvbiBzdGFnZSBjb3VudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0cnVjdHVyZSA9IHtcclxuXHRcdFx0XHRjb250ZW50OiBcIk5ldyBQcm9qZWN0XCIsXHJcblx0XHRcdFx0bGV2ZWw6IDAsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRpc1Rhc2s6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjb250ZW50OiBcIlN0ZXAgMVwiLFxyXG5cdFx0XHRcdFx0XHRsZXZlbDogMixcclxuXHRcdFx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRcdFx0aXNUYXNrOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjb250ZW50OiBcIlN0ZXAgMlwiLFxyXG5cdFx0XHRcdFx0XHRsZXZlbDogMixcclxuXHRcdFx0XHRcdFx0bGluZTogMixcclxuXHRcdFx0XHRcdFx0aXNUYXNrOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBleGlzdGluZ1dvcmtmbG93cyA9IG1vY2tQbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnM7XHJcblx0XHRcdGNvbnN0IHN1Z2dlc3Rpb24gPSBzdWdnZXN0V29ya2Zsb3dGcm9tRXhpc3RpbmcoXHJcblx0XHRcdFx0c3RydWN0dXJlLFxyXG5cdFx0XHRcdGV4aXN0aW5nV29ya2Zsb3dzXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3Qoc3VnZ2VzdGlvbikudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3Qoc3VnZ2VzdGlvbj8ubmFtZSkudG9CZShcIk5ldyBQcm9qZWN0IFdvcmtmbG93XCIpO1xyXG5cdFx0XHRleHBlY3Qoc3VnZ2VzdGlvbj8uc3RhZ2VzKS50b0hhdmVMZW5ndGgoMyk7IC8vIFNhbWUgYXMgZXhpc3Rpbmcgd29ya2Zsb3dcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIG51bGwgd2hlbiBubyBzaW1pbGFyIHdvcmtmbG93cyBleGlzdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0cnVjdHVyZSA9IHtcclxuXHRcdFx0XHRjb250ZW50OiBcIkNvbXBsZXggUHJvamVjdFwiLFxyXG5cdFx0XHRcdGxldmVsOiAwLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0aXNUYXNrOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IEFycmF5KDEwKVxyXG5cdFx0XHRcdFx0LmZpbGwobnVsbClcclxuXHRcdFx0XHRcdC5tYXAoKF8sIGkpID0+ICh7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IGBTdGVwICR7aSArIDF9YCxcclxuXHRcdFx0XHRcdFx0bGV2ZWw6IDIsXHJcblx0XHRcdFx0XHRcdGxpbmU6IGkgKyAxLFxyXG5cdFx0XHRcdFx0XHRpc1Rhc2s6IHRydWUsXHJcblx0XHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0pKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV4aXN0aW5nV29ya2Zsb3dzID0gbW9ja1BsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucztcclxuXHRcdFx0Y29uc3Qgc3VnZ2VzdGlvbiA9IHN1Z2dlc3RXb3JrZmxvd0Zyb21FeGlzdGluZyhcclxuXHRcdFx0XHRzdHJ1Y3R1cmUsXHJcblx0XHRcdFx0ZXhpc3RpbmdXb3JrZmxvd3NcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChzdWdnZXN0aW9uKS50b0JlTnVsbCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiV29ya2Zsb3cgUHJvZ3Jlc3MgSW5kaWNhdG9yXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgY2FsY3VsYXRlIHByb2dyZXNzIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHdvcmtmbG93OiBXb3JrZmxvd0RlZmluaXRpb24gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdF93b3JrZmxvd1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwiVGVzdCBXb3JrZmxvd1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRlc3RcIixcclxuXHRcdFx0XHRzdGFnZXM6IFtcclxuXHRcdFx0XHRcdHsgaWQ6IFwic3RhZ2UxXCIsIG5hbWU6IFwiU3RhZ2UgMVwiLCB0eXBlOiBcImxpbmVhclwiIH0sXHJcblx0XHRcdFx0XHR7IGlkOiBcInN0YWdlMlwiLCBuYW1lOiBcIlN0YWdlIDJcIiwgdHlwZTogXCJsaW5lYXJcIiB9LFxyXG5cdFx0XHRcdFx0eyBpZDogXCJzdGFnZTNcIiwgbmFtZTogXCJTdGFnZSAzXCIsIHR5cGU6IFwidGVybWluYWxcIiB9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHZlcnNpb246IFwiMS4wXCIsXHJcblx0XHRcdFx0XHRjcmVhdGVkOiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0XHRcdGxhc3RNb2RpZmllZDogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZFN0YWdlcyA9IFtcInN0YWdlMVwiXTtcclxuXHRcdFx0Y29uc3QgY3VycmVudFN0YWdlSWQgPSBcInN0YWdlMlwiO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGUgc3RhdGljIGNhbGN1bGF0aW9uIG1ldGhvZFxyXG5cdFx0XHRjb25zdCB3b3JrZmxvd1Rhc2tzID0gW1xyXG5cdFx0XHRcdHsgc3RhZ2U6IFwic3RhZ2UxXCIsIGNvbXBsZXRlZDogdHJ1ZSB9LFxyXG5cdFx0XHRcdHsgc3RhZ2U6IFwic3RhZ2UxXCIsIGNvbXBsZXRlZDogdHJ1ZSB9LFxyXG5cdFx0XHRcdHsgc3RhZ2U6IFwic3RhZ2UyXCIsIGNvbXBsZXRlZDogZmFsc2UgfSxcclxuXHRcdFx0XHR7IHN0YWdlOiBcInN0YWdlM1wiLCBjb21wbGV0ZWQ6IGZhbHNlIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCBjYWxjdWxhdGVkID1cclxuXHRcdFx0XHRXb3JrZmxvd1Byb2dyZXNzSW5kaWNhdG9yLmNhbGN1bGF0ZUNvbXBsZXRlZFN0YWdlcyhcclxuXHRcdFx0XHRcdHdvcmtmbG93VGFza3MsXHJcblx0XHRcdFx0XHR3b3JrZmxvd1xyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QoY2FsY3VsYXRlZCkudG9Db250YWluKFwic3RhZ2UxXCIpO1xyXG5cdFx0XHRleHBlY3QoY2FsY3VsYXRlZCkubm90LnRvQ29udGFpbihcInN0YWdlMlwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGVtcHR5IHdvcmtmbG93IHRhc2tzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgd29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0X3dvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IFdvcmtmbG93XCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGVzdFwiLFxyXG5cdFx0XHRcdHN0YWdlczogW3sgaWQ6IFwic3RhZ2UxXCIsIG5hbWU6IFwiU3RhZ2UgMVwiLCB0eXBlOiBcImxpbmVhclwiIH1dLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR2ZXJzaW9uOiBcIjEuMFwiLFxyXG5cdFx0XHRcdFx0Y3JlYXRlZDogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0XHRsYXN0TW9kaWZpZWQ6IFwiMjAyNC0wMS0wMVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjYWxjdWxhdGVkID1cclxuXHRcdFx0XHRXb3JrZmxvd1Byb2dyZXNzSW5kaWNhdG9yLmNhbGN1bGF0ZUNvbXBsZXRlZFN0YWdlcyhcclxuXHRcdFx0XHRcdFtdLFxyXG5cdFx0XHRcdFx0d29ya2Zsb3dcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoY2FsY3VsYXRlZCkudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=