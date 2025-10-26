/**
 * Workflow Tests
 *
 * Tests for workflow functionality including:
 * - Workflow definition management
 * - Stage transitions
 * - Time tracking
 * - Substage handling
 * - Context menu integration
 */
import { extractWorkflowInfo, resolveWorkflowInfo, determineNextStage, processTimestampAndCalculateTime, isLastWorkflowStageOrNotWorkflow, generateWorkflowTaskText, determineTaskInsertionPoint, } from "../editor-extensions/workflow/workflow-handler";
import { createMockPlugin, createMockApp, createMockText } from "./mockUtils";
import { moment } from "obsidian";
describe("Workflow Functionality", () => {
    let mockPlugin;
    let mockApp;
    let sampleWorkflow;
    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin({
            workflow: {
                enableWorkflow: true,
                autoRemoveLastStageMarker: true,
                autoAddTimestamp: true,
                timestampFormat: "YYYY-MM-DD HH:mm:ss",
                removeTimestampOnTransition: true,
                calculateSpentTime: true,
                spentTimeFormat: "HH:mm:ss",
                calculateFullSpentTime: true,
                definitions: [],
                autoAddNextTask: true,
            },
        });
        // Sample workflow definition for testing
        sampleWorkflow = {
            id: "development",
            name: "Development Workflow",
            description: "A typical software development workflow",
            stages: [
                {
                    id: "planning",
                    name: "Planning",
                    type: "linear",
                    next: "development",
                },
                {
                    id: "development",
                    name: "Development",
                    type: "cycle",
                    subStages: [
                        { id: "coding", name: "Coding", next: "testing" },
                        { id: "testing", name: "Testing", next: "review" },
                        { id: "review", name: "Code Review", next: "coding" },
                    ],
                    canProceedTo: ["deployment"],
                },
                {
                    id: "deployment",
                    name: "Deployment",
                    type: "linear",
                    next: "monitoring",
                },
                {
                    id: "monitoring",
                    name: "Monitoring",
                    type: "terminal",
                },
            ],
            metadata: {
                version: "1.0.0",
                created: "2024-01-01",
                lastModified: "2024-01-01",
            },
        };
        mockPlugin.settings.workflow.definitions = [sampleWorkflow];
    });
    describe("extractWorkflowInfo", () => {
        test("should extract workflow tag from task line", () => {
            const lineText = "- [ ] Task with workflow #workflow/development";
            const result = extractWorkflowInfo(lineText);
            expect(result).toEqual({
                workflowType: "development",
                currentStage: "root",
                subStage: undefined,
            });
        });
        test("should extract stage marker from task line", () => {
            const lineText = "- [ ] Development task [stage::development]";
            const result = extractWorkflowInfo(lineText);
            expect(result).toEqual({
                workflowType: "fromParent",
                currentStage: "development",
                subStage: undefined,
            });
        });
        test("should extract substage marker from task line", () => {
            const lineText = "- [ ] Coding task [stage::development.coding]";
            const result = extractWorkflowInfo(lineText);
            expect(result).toEqual({
                workflowType: "fromParent",
                currentStage: "development",
                subStage: "coding",
            });
        });
        test("should return null for non-workflow task", () => {
            const lineText = "- [ ] Regular task without workflow";
            const result = extractWorkflowInfo(lineText);
            expect(result).toBeNull();
        });
    });
    describe("resolveWorkflowInfo", () => {
        test("should resolve complete workflow information for root task", () => {
            const lineText = "- [ ] Root task #workflow/development";
            const doc = createMockText(lineText);
            const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);
            expect(result).toBeTruthy();
            expect(result === null || result === void 0 ? void 0 : result.workflowType).toBe("development");
            expect(result === null || result === void 0 ? void 0 : result.currentStage.id).toBe("_root_task_");
            expect(result === null || result === void 0 ? void 0 : result.isRootTask).toBe(true);
            expect(result === null || result === void 0 ? void 0 : result.workflow.id).toBe("development");
        });
        test("should resolve workflow information for stage task", () => {
            const lineText = "  - [ ] Planning task [stage::planning]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const result = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(result).toBeTruthy();
            expect(result === null || result === void 0 ? void 0 : result.workflowType).toBe("development");
            expect(result === null || result === void 0 ? void 0 : result.currentStage.id).toBe("planning");
            expect(result === null || result === void 0 ? void 0 : result.isRootTask).toBe(false);
        });
        test("should resolve workflow information for substage task", () => {
            var _a;
            const lineText = "  - [ ] Coding task [stage::development.coding]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const result = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(result).toBeTruthy();
            expect(result === null || result === void 0 ? void 0 : result.workflowType).toBe("development");
            expect(result === null || result === void 0 ? void 0 : result.currentStage.id).toBe("development");
            expect((_a = result === null || result === void 0 ? void 0 : result.currentSubStage) === null || _a === void 0 ? void 0 : _a.id).toBe("coding");
        });
        test("should return null for unknown workflow", () => {
            const lineText = "- [ ] Task [stage::unknown]";
            const doc = createMockText(lineText);
            const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);
            expect(result).toBeNull();
        });
    });
    describe("determineNextStage", () => {
        test("should determine next stage for linear stage", () => {
            const planningStage = sampleWorkflow.stages[0]; // planning
            const result = determineNextStage(planningStage, sampleWorkflow);
            expect(result.nextStageId).toBe("development");
            expect(result.nextSubStageId).toBeUndefined();
        });
        test("should determine next substage in cycle", () => {
            const developmentStage = sampleWorkflow.stages[1]; // development
            const codingSubStage = developmentStage.subStages[0]; // coding
            const result = determineNextStage(developmentStage, sampleWorkflow, codingSubStage);
            expect(result.nextStageId).toBe("development");
            expect(result.nextSubStageId).toBe("testing");
        });
        test("should move to next main stage from cycle", () => {
            const developmentStage = sampleWorkflow.stages[1]; // development
            const reviewSubStage = developmentStage.subStages[2]; // review (last in cycle)
            // Modify the substage to not have a next (simulating end of cycle)
            const modifiedReviewSubStage = Object.assign(Object.assign({}, reviewSubStage), { next: undefined });
            const result = determineNextStage(developmentStage, sampleWorkflow, modifiedReviewSubStage);
            expect(result.nextStageId).toBe("deployment");
            expect(result.nextSubStageId).toBeUndefined();
        });
        test("should stay in terminal stage", () => {
            const monitoringStage = sampleWorkflow.stages[3]; // monitoring (terminal)
            const result = determineNextStage(monitoringStage, sampleWorkflow);
            expect(result.nextStageId).toBe("monitoring");
            expect(result.nextSubStageId).toBeUndefined();
        });
    });
    describe("processTimestampAndCalculateTime", () => {
        test("should calculate spent time and remove timestamp", () => {
            const startTime = moment().subtract(2, "hours");
            const lineText = `  - [x] Completed task 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} [stage::planning]`;
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const changes = processTimestampAndCalculateTime(lineText, doc, lineText.length + 1, 2, "development", mockPlugin);
            expect(changes.length).toBeGreaterThan(0);
            // Should have a change to remove timestamp
            const removeChange = changes.find((c) => c.insert === "");
            expect(removeChange).toBeTruthy();
            // Should have a change to add spent time
            const timeChange = changes.find((c) => c.insert.includes("⏱️"));
            expect(timeChange).toBeTruthy();
        });
        test("should not process line without timestamp", () => {
            const lineText = "- [x] Completed task [stage::planning]";
            const doc = createMockText(lineText);
            const changes = processTimestampAndCalculateTime(lineText, doc, 0, 1, "development", mockPlugin);
            expect(changes).toHaveLength(0);
        });
        test("should calculate total time for final stage", () => {
            const mockPluginWithFullTime = createMockPlugin({
                workflow: Object.assign(Object.assign({}, mockPlugin.settings.workflow), { calculateFullSpentTime: true }),
            });
            mockPluginWithFullTime.settings.workflow.definitions = [
                sampleWorkflow,
            ];
            const startTime = moment().subtract(1, "hour");
            const lineText = `- [x] Final task 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} [stage::monitoring]`;
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const changes = processTimestampAndCalculateTime(lineText, doc, lineText.length + 1, 2, "development", mockPluginWithFullTime);
            // Should include total time calculation
            const totalTimeChange = changes.find((c) => c.insert.includes("Total"));
            expect(totalTimeChange).toBeTruthy();
        });
    });
    describe("isLastWorkflowStageOrNotWorkflow", () => {
        test("should return true for terminal stage", () => {
            const lineText = "- [ ] Monitoring task [stage::monitoring]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const result = isLastWorkflowStageOrNotWorkflow(lineText, 2, doc, mockPlugin);
            expect(result).toBe(true);
        });
        test("should return false for non-terminal stage", () => {
            const lineText = "  - [ ] Planning task [stage::planning]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const result = isLastWorkflowStageOrNotWorkflow(lineText, 2, doc, mockPlugin);
            expect(result).toBe(false);
        });
        test("should return true for non-workflow task", () => {
            const lineText = "- [ ] Regular task";
            const doc = createMockText(lineText);
            const result = isLastWorkflowStageOrNotWorkflow(lineText, 1, doc, mockPlugin);
            expect(result).toBe(true);
        });
        test("should return false for cycle substage with next", () => {
            const lineText = "  - [ ] Coding task [stage::development.coding]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const result = isLastWorkflowStageOrNotWorkflow(lineText, 2, doc, mockPlugin);
            expect(result).toBe(false);
        });
    });
    describe("generateWorkflowTaskText", () => {
        test("should generate task text for main stage", () => {
            const planningStage = sampleWorkflow.stages[0];
            const result = generateWorkflowTaskText(planningStage, "  ", mockPlugin, true);
            expect(result).toContain("- [ ] Planning");
            expect(result).toContain("[stage::planning]");
            expect(result).toContain("🛫"); // timestamp
        });
        test("should generate task text for substage", () => {
            const developmentStage = sampleWorkflow.stages[1];
            const codingSubStage = developmentStage.subStages[0];
            const result = generateWorkflowTaskText(developmentStage, "  ", mockPlugin, true, codingSubStage);
            expect(result).toContain("- [ ] Development (Coding)");
            expect(result).toContain("[stage::development.coding]");
        });
        test("should generate task text with subtasks for cycle stage", () => {
            const developmentStage = sampleWorkflow.stages[1];
            const result = generateWorkflowTaskText(developmentStage, "", mockPlugin, true);
            expect(result).toContain("- [ ] Development [stage::development]");
            expect(result).toContain("- [ ] Development (Coding) [stage::development.coding]");
        });
        test("should not add timestamp when disabled", () => {
            const mockPluginNoTimestamp = createMockPlugin({
                workflow: Object.assign(Object.assign({}, mockPlugin.settings.workflow), { autoAddTimestamp: false }),
            });
            const planningStage = sampleWorkflow.stages[0];
            const result = generateWorkflowTaskText(planningStage, "", mockPluginNoTimestamp, true);
            expect(result).not.toContain("🛫");
        });
    });
    describe("determineTaskInsertionPoint", () => {
        test("should return line end when no child tasks", () => {
            const line = {
                number: 1,
                to: 50,
                text: "- [ ] Parent task",
            };
            const doc = createMockText("- [ ] Parent task");
            const result = determineTaskInsertionPoint(line, doc, "");
            expect(result).toBe(50);
        });
        test("should return after last child task", () => {
            const docText = `- [ ] Parent task
  - [ ] Child task 1
  - [ ] Child task 2
- [ ] Another parent`;
            const doc = createMockText(docText);
            const line = {
                number: 1,
                to: 17,
                text: "- [ ] Parent task",
            };
            const result = determineTaskInsertionPoint(line, doc, "");
            // Should be after the last child task
            expect(result).toBeGreaterThan(17);
        });
    });
    describe("Workflow Integration Tests", () => {
        test("should handle complete workflow lifecycle", () => {
            // Start with root task
            let lineText = "- [ ] Feature development #workflow/development";
            let doc = createMockText(lineText);
            let resolvedInfo = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.isRootTask).toBe(true);
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("_root_task_");
            // Move to planning stage
            const { nextStageId } = determineNextStage(resolvedInfo.currentStage, resolvedInfo.workflow);
            expect(nextStageId).toBe("planning");
            // Generate planning task
            const planningStage = sampleWorkflow.stages.find((s) => s.id === "planning");
            const planningTaskText = generateWorkflowTaskText(planningStage, "  ", mockPlugin, true);
            expect(planningTaskText).toContain("Planning");
            // Move to development stage
            lineText = "  - [ ] Planning task [stage::planning]";
            doc = createMockText(`- [ ] Feature development #workflow/development\n${lineText}`);
            resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            const { nextStageId: devStageId } = determineNextStage(resolvedInfo.currentStage, resolvedInfo.workflow);
            expect(devStageId).toBe("development");
            // Test cycle substages
            const developmentStage = sampleWorkflow.stages.find((s) => s.id === "development");
            const firstSubStage = developmentStage.subStages[0];
            const { nextStageId: nextSubStageId, nextSubStageId: nextSubId } = determineNextStage(developmentStage, sampleWorkflow, firstSubStage);
            expect(nextSubStageId).toBe("development");
            expect(nextSubId).toBe("testing");
        });
        test("should handle workflow with missing definitions", () => {
            const lineText = "- [ ] Task [stage::nonexistent]";
            const doc = createMockText(lineText);
            const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);
            expect(result).toBeNull();
        });
        test("should handle malformed stage markers", () => {
            const lineText = "- [ ] Task [stage::]";
            const result = extractWorkflowInfo(lineText);
            // extractWorkflowInfo should return null for malformed markers
            expect(result).toBeNull();
        });
    });
    describe("Time Calculation Edge Cases", () => {
        test("should handle invalid timestamp format", () => {
            const lineText = "- [x] Task 🛫 invalid-timestamp [stage::planning]";
            const doc = createMockText(lineText);
            const changes = processTimestampAndCalculateTime(lineText, doc, 0, 1, "development", mockPlugin);
            // Should not crash, may still process some changes
            expect(changes).toBeDefined();
        });
        test("should handle missing workflow definition during time calculation", () => {
            const mockPluginNoWorkflow = createMockPlugin({
                workflow: Object.assign(Object.assign({}, mockPlugin.settings.workflow), { definitions: [] }),
            });
            const startTime = moment().subtract(1, "hour");
            const lineText = `- [x] Task 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} [stage::planning]`;
            const doc = createMockText(lineText);
            const changes = processTimestampAndCalculateTime(lineText, doc, 0, 1, "nonexistent", mockPluginNoWorkflow);
            // Should still process timestamp removal and basic time calculation
            expect(changes.length).toBeGreaterThan(0);
        });
    });
    describe("Workflow Settings Integration", () => {
        test("should respect autoRemoveLastStageMarker setting", () => {
            const mockPluginNoRemove = createMockPlugin({
                workflow: Object.assign(Object.assign({}, mockPlugin.settings.workflow), { autoRemoveLastStageMarker: false }),
            });
            const lineText = "- [x] Task [stage::monitoring]";
            const doc = createMockText(lineText);
            const result = isLastWorkflowStageOrNotWorkflow(lineText, 1, doc, mockPluginNoRemove);
            expect(result).toBe(true); // Still terminal stage
        });
        test("should respect calculateSpentTime setting", () => {
            const mockPluginNoTime = createMockPlugin({
                workflow: Object.assign(Object.assign({}, mockPlugin.settings.workflow), { calculateSpentTime: false }),
            });
            const startTime = moment().subtract(1, "hour");
            const lineText = `- [x] Task 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} [stage::planning]`;
            const doc = createMockText(lineText);
            const changes = processTimestampAndCalculateTime(lineText, doc, 0, 1, "development", mockPluginNoTime);
            // Should only have timestamp removal, no time calculation
            const timeChanges = changes.filter((c) => c.insert.includes("⏱️"));
            expect(timeChanges).toHaveLength(0);
        });
    });
    describe("Stage Jumping and Context Menu Integration", () => {
        test("should handle jumping from middle stage to another stage", () => {
            // Test jumping from development stage to deployment stage (skipping normal flow)
            const developmentStage = sampleWorkflow.stages[1]; // development
            const deploymentStage = sampleWorkflow.stages[2]; // deployment
            // Simulate a stage jump using canProceedTo
            expect(developmentStage.canProceedTo).toContain("deployment");
            const { nextStageId } = determineNextStage(developmentStage, sampleWorkflow);
            // For cycle stages with canProceedTo, it should go to the first canProceedTo option
            expect(nextStageId).toBe("deployment"); // Jump to deployment
            // Test direct jump to deployment
            const jumpResult = determineNextStage(deploymentStage, sampleWorkflow);
            expect(jumpResult.nextStageId).toBe("monitoring");
        });
        test("should handle jumping into middle of workflow", () => {
            // Test jumping directly into development stage from planning
            const planningStage = sampleWorkflow.stages[0]; // planning
            const developmentStage = sampleWorkflow.stages[1]; // development
            // Verify that planning can proceed to development
            expect(planningStage.next).toBe("development");
            // Test jumping into cycle stage
            const result = determineNextStage(developmentStage, sampleWorkflow);
            expect(result.nextStageId).toBe("deployment"); // Should jump to deployment via canProceedTo
        });
        test("should handle jumping from completed stage", () => {
            // Test scenario where a completed task needs to jump to different stage
            const lineText = "  - [x] Completed planning task [stage::planning]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("planning");
            // Should be able to determine next stage even for completed task
            const { nextStageId } = determineNextStage(resolvedInfo.currentStage, resolvedInfo.workflow);
            expect(nextStageId).toBe("development");
        });
        test("should handle jumping from uncompleted stage", () => {
            // Test scenario where an uncompleted task jumps to different stage
            const lineText = "  - [ ] Incomplete development task [stage::development]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("development");
            // Should be able to jump to deployment via canProceedTo
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.canProceedTo).toContain("deployment");
        });
        test("should handle context menu stage transitions", () => {
            // Test the logic that would be used in context menu for stage transitions
            const currentStage = sampleWorkflow.stages[1]; // development (cycle)
            const availableTransitions = [];
            // Add canProceedTo options
            if (currentStage.canProceedTo) {
                currentStage.canProceedTo.forEach((stageId) => {
                    const targetStage = sampleWorkflow.stages.find((s) => s.id === stageId);
                    if (targetStage) {
                        availableTransitions.push({
                            type: "jump",
                            target: targetStage,
                            label: `Jump to ${targetStage.name}`,
                        });
                    }
                });
            }
            // Should have deployment as available transition
            expect(availableTransitions).toHaveLength(1);
            expect(availableTransitions[0].target.id).toBe("deployment");
        });
        test("should handle substage to main stage transitions", () => {
            // Test jumping from substage to main stage
            const developmentStage = sampleWorkflow.stages[1]; // development
            const codingSubStage = developmentStage.subStages[0]; // coding
            // Test transition from substage to main stage via canProceedTo
            const result = determineNextStage(developmentStage, sampleWorkflow, Object.assign(Object.assign({}, codingSubStage), { next: undefined }));
            expect(result.nextStageId).toBe("deployment");
            expect(result.nextSubStageId).toBeUndefined();
        });
    });
    describe("Mixed Plugin Integration Tests", () => {
        test("should work with cycleStatus functionality", () => {
            var _a;
            // Test workflow with task status cycling
            const lineText = "  - [/] In progress task [stage::development.coding]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("development");
            expect((_a = resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentSubStage) === null || _a === void 0 ? void 0 : _a.id).toBe("coding");
            // Should handle in-progress status
            const isLast = isLastWorkflowStageOrNotWorkflow(lineText, 2, doc, mockPlugin);
            expect(isLast).toBe(false);
        });
        test("should work with autoComplete parent functionality", () => {
            // Test workflow with auto-complete parent tasks
            const docText = `- [ ] Root task #workflow/development
  - [x] Completed planning task [stage::planning]
  - [ ] Development task [stage::development]`;
            const doc = createMockText(docText);
            // Test that completing a workflow task doesn't interfere with parent completion
            const planningLine = "  - [x] Completed planning task [stage::planning]";
            const resolvedInfo = resolveWorkflowInfo(planningLine, doc, 2, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.isRootTask).toBe(false);
            // Should not be considered last stage (shouldn't trigger parent completion)
            const isLast = isLastWorkflowStageOrNotWorkflow(planningLine, 2, doc, mockPlugin);
            expect(isLast).toBe(false);
        });
        test("should handle mixed task statuses in workflow", () => {
            // Test workflow with various task statuses
            const testStatuses = [
                { status: " ", description: "not started" },
                { status: "/", description: "in progress" },
                { status: "x", description: "completed" },
                { status: "-", description: "abandoned" },
                { status: "?", description: "planned" },
            ];
            testStatuses.forEach(({ status, description }) => {
                const lineText = `  - [${status}] ${description} task [stage::planning]`;
                const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
                const resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
                expect(resolvedInfo).toBeTruthy();
                expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("planning");
            });
        });
        test("should handle workflow with priority markers", () => {
            // Test workflow tasks with priority markers
            const lineText = "  - [ ] High priority task 🔺 [stage::planning]";
            const doc = createMockText(`- [ ] Root task #workflow/development\n${lineText}`);
            const resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("planning");
            // Should extract workflow info despite priority marker
            const workflowInfo = extractWorkflowInfo(lineText);
            expect(workflowInfo).toBeTruthy();
            expect(workflowInfo === null || workflowInfo === void 0 ? void 0 : workflowInfo.currentStage).toBe("planning");
        });
    });
    describe("Complex Document Structure Tests", () => {
        test("should handle tasks separated by comments", () => {
            // Test workflow tasks with comments in between
            const docText = `- [ ] Root task #workflow/development
  - [x] Completed planning task [stage::planning]
  
  <!-- This is a comment about the planning phase -->
  
  - [ ] Development task [stage::development]`;
            const doc = createMockText(docText);
            // Test that workflow resolution works despite comments
            const developmentLine = "  - [ ] Development task [stage::development]";
            const resolvedInfo = resolveWorkflowInfo(developmentLine, doc, 6, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.workflowType).toBe("development");
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("development");
        });
        test("should handle tasks separated by multiple lines", () => {
            // Test workflow tasks with multiple blank lines
            const docText = `- [ ] Root task #workflow/development
  - [x] Completed planning task [stage::planning]



  - [ ] Development task [stage::development]`;
            const doc = createMockText(docText);
            // Test task insertion point calculation with gaps
            const planningLine = {
                number: 2,
                to: 50,
                text: "  - [x] Completed planning task [stage::planning]",
            };
            const insertionPoint = determineTaskInsertionPoint(planningLine, doc, "  ");
            // Should return at least the line's end position
            expect(insertionPoint).toBeGreaterThanOrEqual(50);
        });
        test("should handle nested task structures", () => {
            // Test workflow with nested task structures
            const docText = `- [ ] Root task #workflow/development
  - [x] Completed planning task [stage::planning]
    - [x] Sub-planning task 1
    - [x] Sub-planning task 2
      - [x] Deep nested task
  - [ ] Development task [stage::development]`;
            const doc = createMockText(docText);
            // Test that nested structure doesn't break workflow resolution
            const developmentLine = "  - [ ] Development task [stage::development]";
            const resolvedInfo = resolveWorkflowInfo(developmentLine, doc, 6, mockPlugin);
            expect(resolvedInfo).toBeTruthy();
            expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.currentStage.id).toBe("development");
        });
        test("should handle tasks with metadata and links", () => {
            // Test workflow tasks with various metadata
            const docText = `- [ ] Root task #workflow/development
  - [x] Planning task [stage::planning] 📅 2024-01-01 #important
    > This task has a note
    > [[Link to planning document]]
  - [ ] Development task [stage::development] 🔺 @context`;
            const doc = createMockText(docText);
            // Test that metadata doesn't interfere with workflow extraction
            const planningLine = "  - [x] Planning task [stage::planning] 📅 2024-01-01 #important";
            const workflowInfo = extractWorkflowInfo(planningLine);
            expect(workflowInfo).toBeTruthy();
            expect(workflowInfo === null || workflowInfo === void 0 ? void 0 : workflowInfo.currentStage).toBe("planning");
            const developmentLine = "  - [ ] Development task [stage::development] 🔺 @context";
            const devWorkflowInfo = extractWorkflowInfo(developmentLine);
            expect(devWorkflowInfo).toBeTruthy();
            expect(devWorkflowInfo === null || devWorkflowInfo === void 0 ? void 0 : devWorkflowInfo.currentStage).toBe("development");
        });
        test("should handle workflow tasks in different list formats", () => {
            // Test workflow with different list markers
            const testCases = [
                "- [ ] Task with dash [stage::planning]",
                "* [ ] Task with asterisk [stage::planning]",
                "+ [ ] Task with plus [stage::planning]",
                "1. [ ] Numbered task [stage::planning]",
            ];
            testCases.forEach((lineText, index) => {
                const doc = createMockText(`- [ ] Root task #workflow/development\n  ${lineText}`);
                const workflowInfo = extractWorkflowInfo(`  ${lineText}`);
                expect(workflowInfo).toBeTruthy();
                expect(workflowInfo === null || workflowInfo === void 0 ? void 0 : workflowInfo.currentStage).toBe("planning");
            });
        });
        test("should handle workflow tasks with time tracking", () => {
            // Test workflow tasks with various time tracking formats
            const startTime = moment().subtract(3, "hours");
            const docText = `- [ ] Root task #workflow/development
  - [x] Planning task [stage::planning] 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} (⏱️ 02:30:00)
  - [ ] Development task [stage::development] 🛫 ${moment().format("YYYY-MM-DD HH:mm:ss")}`;
            const doc = createMockText(docText);
            // Test time calculation with existing time markers
            const planningLine = `  - [x] Planning task [stage::planning] 🛫 ${startTime.format("YYYY-MM-DD HH:mm:ss")} (⏱️ 02:30:00)`;
            const changes = processTimestampAndCalculateTime(planningLine, doc, 100, 2, "development", mockPlugin);
            expect(changes.length).toBeGreaterThan(0);
        });
        test("should handle workflow tasks with indentation variations", () => {
            // Test workflow with different indentation levels
            const docText = `- [ ] Root task #workflow/development
    - [x] Planning task (4 spaces) [stage::planning]
\t- [ ] Development task (tab) [stage::development]
  - [ ] Deployment task (2 spaces) [stage::deployment]`;
            const doc = createMockText(docText);
            // Test that different indentation levels are handled correctly
            const testLines = [
                {
                    line: "    - [x] Planning task (4 spaces) [stage::planning]",
                    lineNum: 2,
                },
                {
                    line: "\t- [ ] Development task (tab) [stage::development]",
                    lineNum: 3,
                },
                {
                    line: "  - [ ] Deployment task (2 spaces) [stage::deployment]",
                    lineNum: 4,
                },
            ];
            testLines.forEach(({ line, lineNum }) => {
                const resolvedInfo = resolveWorkflowInfo(line, doc, lineNum, mockPlugin);
                expect(resolvedInfo).toBeTruthy();
                expect(resolvedInfo === null || resolvedInfo === void 0 ? void 0 : resolvedInfo.workflowType).toBe("development");
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsa0JBQWtCLEVBQ2xCLGdDQUFnQyxFQUNoQyxnQ0FBZ0MsRUFDaEMsd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUUzQixNQUFNLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBTTlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUN2QyxJQUFJLFVBQWUsQ0FBQztJQUNwQixJQUFJLE9BQVksQ0FBQztJQUNqQixJQUFJLGNBQWtDLENBQUM7SUFFdkMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUMxQixVQUFVLEdBQUcsZ0JBQWdCLENBQUM7WUFDN0IsUUFBUSxFQUFFO2dCQUNULGNBQWMsRUFBRSxJQUFJO2dCQUNwQix5QkFBeUIsRUFBRSxJQUFJO2dCQUMvQixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixlQUFlLEVBQUUscUJBQXFCO2dCQUN0QywyQkFBMkIsRUFBRSxJQUFJO2dCQUNqQyxrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixlQUFlLEVBQUUsVUFBVTtnQkFDM0Isc0JBQXNCLEVBQUUsSUFBSTtnQkFDNUIsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsZUFBZSxFQUFFLElBQUk7YUFDckI7U0FDRCxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsY0FBYyxHQUFHO1lBQ2hCLEVBQUUsRUFBRSxhQUFhO1lBQ2pCLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsV0FBVyxFQUFFLHlDQUF5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Q0FBQztnQkFDbEMsTUFBTSxDQUFDLFlBQVksYUFBWixZQUFZLHVCQUFaLFlBQVksQ0FBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogV29ya2Zsb3cgVGVzdHNcclxuICpcclxuICogVGVzdHMgZm9yIHdvcmtmbG93IGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nOlxyXG4gKiAtIFdvcmtmbG93IGRlZmluaXRpb24gbWFuYWdlbWVudFxyXG4gKiAtIFN0YWdlIHRyYW5zaXRpb25zXHJcbiAqIC0gVGltZSB0cmFja2luZ1xyXG4gKiAtIFN1YnN0YWdlIGhhbmRsaW5nXHJcbiAqIC0gQ29udGV4dCBtZW51IGludGVncmF0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuXHRleHRyYWN0V29ya2Zsb3dJbmZvLFxyXG5cdHJlc29sdmVXb3JrZmxvd0luZm8sXHJcblx0ZGV0ZXJtaW5lTmV4dFN0YWdlLFxyXG5cdHByb2Nlc3NUaW1lc3RhbXBBbmRDYWxjdWxhdGVUaW1lLFxyXG5cdGlzTGFzdFdvcmtmbG93U3RhZ2VPck5vdFdvcmtmbG93LFxyXG5cdGdlbmVyYXRlV29ya2Zsb3dUYXNrVGV4dCxcclxuXHRkZXRlcm1pbmVUYXNrSW5zZXJ0aW9uUG9pbnQsXHJcblx0aGFuZGxlV29ya2Zsb3dUcmFuc2FjdGlvbixcclxufSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvd29ya2Zsb3cvd29ya2Zsb3ctaGFuZGxlclwiO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrUGx1Z2luLCBjcmVhdGVNb2NrQXBwLCBjcmVhdGVNb2NrVGV4dCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5pbXBvcnQge1xyXG5cdFdvcmtmbG93RGVmaW5pdGlvbixcclxuXHRXb3JrZmxvd1N0YWdlLFxyXG59IGZyb20gXCIuLi9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IFRleHQgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG5kZXNjcmliZShcIldvcmtmbG93IEZ1bmN0aW9uYWxpdHlcIiwgKCkgPT4ge1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblx0bGV0IG1vY2tBcHA6IGFueTtcclxuXHRsZXQgc2FtcGxlV29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbjtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdGVuYWJsZVdvcmtmbG93OiB0cnVlLFxyXG5cdFx0XHRcdGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXI6IHRydWUsXHJcblx0XHRcdFx0YXV0b0FkZFRpbWVzdGFtcDogdHJ1ZSxcclxuXHRcdFx0XHR0aW1lc3RhbXBGb3JtYXQ6IFwiWVlZWS1NTS1ERCBISDptbTpzc1wiLFxyXG5cdFx0XHRcdHJlbW92ZVRpbWVzdGFtcE9uVHJhbnNpdGlvbjogdHJ1ZSxcclxuXHRcdFx0XHRjYWxjdWxhdGVTcGVudFRpbWU6IHRydWUsXHJcblx0XHRcdFx0c3BlbnRUaW1lRm9ybWF0OiBcIkhIOm1tOnNzXCIsXHJcblx0XHRcdFx0Y2FsY3VsYXRlRnVsbFNwZW50VGltZTogdHJ1ZSxcclxuXHRcdFx0XHRkZWZpbml0aW9uczogW10sXHJcblx0XHRcdFx0YXV0b0FkZE5leHRUYXNrOiB0cnVlLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2FtcGxlIHdvcmtmbG93IGRlZmluaXRpb24gZm9yIHRlc3RpbmdcclxuXHRcdHNhbXBsZVdvcmtmbG93ID0ge1xyXG5cdFx0XHRpZDogXCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRuYW1lOiBcIkRldmVsb3BtZW50IFdvcmtmbG93XCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBcIkEgdHlwaWNhbCBzb2Z0d2FyZSBkZXZlbG9wbWVudCB3b3JrZmxvd1wiLFxyXG5cdFx0XHRzdGFnZXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJwbGFubmluZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJQbGFubmluZ1wiLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJsaW5lYXJcIixcclxuXHRcdFx0XHRcdG5leHQ6IFwiZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIkRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0XHR0eXBlOiBcImN5Y2xlXCIsXHJcblx0XHRcdFx0XHRzdWJTdGFnZXM6IFtcclxuXHRcdFx0XHRcdFx0eyBpZDogXCJjb2RpbmdcIiwgbmFtZTogXCJDb2RpbmdcIiwgbmV4dDogXCJ0ZXN0aW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0eyBpZDogXCJ0ZXN0aW5nXCIsIG5hbWU6IFwiVGVzdGluZ1wiLCBuZXh0OiBcInJldmlld1wiIH0sXHJcblx0XHRcdFx0XHRcdHsgaWQ6IFwicmV2aWV3XCIsIG5hbWU6IFwiQ29kZSBSZXZpZXdcIiwgbmV4dDogXCJjb2RpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdGNhblByb2NlZWRUbzogW1wiZGVwbG95bWVudFwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImRlcGxveW1lbnRcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwiRGVwbG95bWVudFwiLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJsaW5lYXJcIixcclxuXHRcdFx0XHRcdG5leHQ6IFwibW9uaXRvcmluZ1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwibW9uaXRvcmluZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJNb25pdG9yaW5nXCIsXHJcblx0XHRcdFx0XHR0eXBlOiBcInRlcm1pbmFsXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XSxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHR2ZXJzaW9uOiBcIjEuMC4wXCIsXHJcblx0XHRcdFx0Y3JlYXRlZDogXCIyMDI0LTAxLTAxXCIsXHJcblx0XHRcdFx0bGFzdE1vZGlmaWVkOiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblxyXG5cdFx0bW9ja1BsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucyA9IFtzYW1wbGVXb3JrZmxvd107XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZXh0cmFjdFdvcmtmbG93SW5mb1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGV4dHJhY3Qgd29ya2Zsb3cgdGFnIGZyb20gdGFzayBsaW5lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sgd2l0aCB3b3JrZmxvdyAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZXh0cmFjdFdvcmtmbG93SW5mbyhsaW5lVGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKHtcclxuXHRcdFx0XHR3b3JrZmxvd1R5cGU6IFwiZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2U6IFwicm9vdFwiLFxyXG5cdFx0XHRcdHN1YlN0YWdlOiB1bmRlZmluZWQsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBleHRyYWN0IHN0YWdlIG1hcmtlciBmcm9tIHRhc2sgbGluZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBEZXZlbG9wbWVudCB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGV4dHJhY3RXb3JrZmxvd0luZm8obGluZVRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0d29ya2Zsb3dUeXBlOiBcImZyb21QYXJlbnRcIixcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2U6IFwiZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XHRzdWJTdGFnZTogdW5kZWZpbmVkLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgZXh0cmFjdCBzdWJzdGFnZSBtYXJrZXIgZnJvbSB0YXNrIGxpbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gQ29kaW5nIHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudC5jb2RpbmddXCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGV4dHJhY3RXb3JrZmxvd0luZm8obGluZVRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0d29ya2Zsb3dUeXBlOiBcImZyb21QYXJlbnRcIixcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2U6IFwiZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XHRzdWJTdGFnZTogXCJjb2RpbmdcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBudWxsIGZvciBub24td29ya2Zsb3cgdGFza1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBSZWd1bGFyIHRhc2sgd2l0aG91dCB3b3JrZmxvd1wiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBleHRyYWN0V29ya2Zsb3dJbmZvKGxpbmVUZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJyZXNvbHZlV29ya2Zsb3dJbmZvXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgcmVzb2x2ZSBjb21wbGV0ZSB3b3JrZmxvdyBpbmZvcm1hdGlvbiBmb3Igcm9vdCB0YXNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQobGluZVRleHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSByZXNvbHZlV29ya2Zsb3dJbmZvKGxpbmVUZXh0LCBkb2MsIDEsIG1vY2tQbHVnaW4pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py53b3JrZmxvd1R5cGUpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8uY3VycmVudFN0YWdlLmlkKS50b0JlKFwiX3Jvb3RfdGFza19cIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LmlzUm9vdFRhc2spLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LndvcmtmbG93LmlkKS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJlc29sdmUgd29ya2Zsb3cgaW5mb3JtYXRpb24gZm9yIHN0YWdlIHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiICAtIFsgXSBQbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHJlc29sdmVXb3JrZmxvd0luZm8obGluZVRleHQsIGRvYywgMiwgbW9ja1BsdWdpbik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlVHJ1dGh5KCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LndvcmtmbG93VHlwZSkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5jdXJyZW50U3RhZ2UuaWQpLnRvQmUoXCJwbGFubmluZ1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8uaXNSb290VGFzaykudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJlc29sdmUgd29ya2Zsb3cgaW5mb3JtYXRpb24gZm9yIHN1YnN0YWdlIHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiICAtIFsgXSBDb2RpbmcgdGFzayBbc3RhZ2U6OmRldmVsb3BtZW50LmNvZGluZ11cIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0YC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcXG4ke2xpbmVUZXh0fWBcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhsaW5lVGV4dCwgZG9jLCAyLCBtb2NrUGx1Z2luKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVUcnV0aHkoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdD8ud29ya2Zsb3dUeXBlKS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LmN1cnJlbnRTdGFnZS5pZCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Py5jdXJyZW50U3ViU3RhZ2U/LmlkKS50b0JlKFwiY29kaW5nXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gbnVsbCBmb3IgdW5rbm93biB3b3JrZmxvd1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBUYXNrIFtzdGFnZTo6dW5rbm93bl1cIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQobGluZVRleHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSByZXNvbHZlV29ya2Zsb3dJbmZvKGxpbmVUZXh0LCBkb2MsIDEsIG1vY2tQbHVnaW4pO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImRldGVybWluZU5leHRTdGFnZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGRldGVybWluZSBuZXh0IHN0YWdlIGZvciBsaW5lYXIgc3RhZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwbGFubmluZ1N0YWdlID0gc2FtcGxlV29ya2Zsb3cuc3RhZ2VzWzBdOyAvLyBwbGFubmluZ1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkZXRlcm1pbmVOZXh0U3RhZ2UocGxhbm5pbmdTdGFnZSwgc2FtcGxlV29ya2Zsb3cpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5uZXh0U3RhZ2VJZCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5leHRTdWJTdGFnZUlkKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGRldGVybWluZSBuZXh0IHN1YnN0YWdlIGluIGN5Y2xlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGV2ZWxvcG1lbnRTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlc1sxXTsgLy8gZGV2ZWxvcG1lbnRcclxuXHRcdFx0Y29uc3QgY29kaW5nU3ViU3RhZ2UgPSBkZXZlbG9wbWVudFN0YWdlLnN1YlN0YWdlcyFbMF07IC8vIGNvZGluZ1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkZXRlcm1pbmVOZXh0U3RhZ2UoXHJcblx0XHRcdFx0ZGV2ZWxvcG1lbnRTdGFnZSxcclxuXHRcdFx0XHRzYW1wbGVXb3JrZmxvdyxcclxuXHRcdFx0XHRjb2RpbmdTdWJTdGFnZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5uZXh0U3RhZ2VJZCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5leHRTdWJTdGFnZUlkKS50b0JlKFwidGVzdGluZ1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbW92ZSB0byBuZXh0IG1haW4gc3RhZ2UgZnJvbSBjeWNsZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRldmVsb3BtZW50U3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXNbMV07IC8vIGRldmVsb3BtZW50XHJcblx0XHRcdGNvbnN0IHJldmlld1N1YlN0YWdlID0gZGV2ZWxvcG1lbnRTdGFnZS5zdWJTdGFnZXMhWzJdOyAvLyByZXZpZXcgKGxhc3QgaW4gY3ljbGUpXHJcblxyXG5cdFx0XHQvLyBNb2RpZnkgdGhlIHN1YnN0YWdlIHRvIG5vdCBoYXZlIGEgbmV4dCAoc2ltdWxhdGluZyBlbmQgb2YgY3ljbGUpXHJcblx0XHRcdGNvbnN0IG1vZGlmaWVkUmV2aWV3U3ViU3RhZ2UgPSB7XHJcblx0XHRcdFx0Li4ucmV2aWV3U3ViU3RhZ2UsXHJcblx0XHRcdFx0bmV4dDogdW5kZWZpbmVkLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdFx0XHRcdGRldmVsb3BtZW50U3RhZ2UsXHJcblx0XHRcdFx0c2FtcGxlV29ya2Zsb3csXHJcblx0XHRcdFx0bW9kaWZpZWRSZXZpZXdTdWJTdGFnZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5uZXh0U3RhZ2VJZCkudG9CZShcImRlcGxveW1lbnRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubmV4dFN1YlN0YWdlSWQpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgc3RheSBpbiB0ZXJtaW5hbCBzdGFnZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vbml0b3JpbmdTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlc1szXTsgLy8gbW9uaXRvcmluZyAodGVybWluYWwpXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRldGVybWluZU5leHRTdGFnZShtb25pdG9yaW5nU3RhZ2UsIHNhbXBsZVdvcmtmbG93KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQubmV4dFN0YWdlSWQpLnRvQmUoXCJtb25pdG9yaW5nXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5leHRTdWJTdGFnZUlkKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJwcm9jZXNzVGltZXN0YW1wQW5kQ2FsY3VsYXRlVGltZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGNhbGN1bGF0ZSBzcGVudCB0aW1lIGFuZCByZW1vdmUgdGltZXN0YW1wXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gbW9tZW50KCkuc3VidHJhY3QoMiwgXCJob3Vyc1wiKTtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBgICAtIFt4XSBDb21wbGV0ZWQgdGFzayDwn5urICR7c3RhcnRUaW1lLmZvcm1hdChcclxuXHRcdFx0XHRcIllZWVktTU0tREQgSEg6bW06c3NcIlxyXG5cdFx0XHQpfSBbc3RhZ2U6OnBsYW5uaW5nXWA7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdGxpbmVUZXh0Lmxlbmd0aCArIDEsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGNoYW5nZXMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSBhIGNoYW5nZSB0byByZW1vdmUgdGltZXN0YW1wXHJcblx0XHRcdGNvbnN0IHJlbW92ZUNoYW5nZSA9IGNoYW5nZXMuZmluZCgoYykgPT4gYy5pbnNlcnQgPT09IFwiXCIpO1xyXG5cdFx0XHRleHBlY3QocmVtb3ZlQ2hhbmdlKS50b0JlVHJ1dGh5KCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSBhIGNoYW5nZSB0byBhZGQgc3BlbnQgdGltZVxyXG5cdFx0XHRjb25zdCB0aW1lQ2hhbmdlID0gY2hhbmdlcy5maW5kKChjKSA9PiBjLmluc2VydC5pbmNsdWRlcyhcIuKPse+4j1wiKSk7XHJcblx0XHRcdGV4cGVjdCh0aW1lQ2hhbmdlKS50b0JlVHJ1dGh5KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBwcm9jZXNzIGxpbmUgd2l0aG91dCB0aW1lc3RhbXBcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbeF0gQ29tcGxldGVkIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQobGluZVRleHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hhbmdlcyA9IHByb2Nlc3NUaW1lc3RhbXBBbmRDYWxjdWxhdGVUaW1lKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0XCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChjaGFuZ2VzKS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGNhbGN1bGF0ZSB0b3RhbCB0aW1lIGZvciBmaW5hbCBzdGFnZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tQbHVnaW5XaXRoRnVsbFRpbWUgPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdFx0Li4ubW9ja1BsdWdpbi5zZXR0aW5ncy53b3JrZmxvdyxcclxuXHRcdFx0XHRcdGNhbGN1bGF0ZUZ1bGxTcGVudFRpbWU6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tQbHVnaW5XaXRoRnVsbFRpbWUuc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnMgPSBbXHJcblx0XHRcdFx0c2FtcGxlV29ya2Zsb3csXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCBcImhvdXJcIik7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gYC0gW3hdIEZpbmFsIHRhc2sg8J+bqyAke3N0YXJ0VGltZS5mb3JtYXQoXHJcblx0XHRcdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCJcclxuXHRcdFx0KX0gW3N0YWdlOjptb25pdG9yaW5nXWA7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdGxpbmVUZXh0Lmxlbmd0aCArIDEsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpbldpdGhGdWxsVGltZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGluY2x1ZGUgdG90YWwgdGltZSBjYWxjdWxhdGlvblxyXG5cdFx0XHRjb25zdCB0b3RhbFRpbWVDaGFuZ2UgPSBjaGFuZ2VzLmZpbmQoKGMpID0+XHJcblx0XHRcdFx0Yy5pbnNlcnQuaW5jbHVkZXMoXCJUb3RhbFwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodG90YWxUaW1lQ2hhbmdlKS50b0JlVHJ1dGh5KCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJpc0xhc3RXb3JrZmxvd1N0YWdlT3JOb3RXb3JrZmxvd1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiB0cnVlIGZvciB0ZXJtaW5hbCBzdGFnZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBNb25pdG9yaW5nIHRhc2sgW3N0YWdlOjptb25pdG9yaW5nXVwiO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcclxuXHRcdFx0XHRgLSBbIF0gUm9vdCB0YXNrICN3b3JrZmxvdy9kZXZlbG9wbWVudFxcbiR7bGluZVRleHR9YFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gaXNMYXN0V29ya2Zsb3dTdGFnZU9yTm90V29ya2Zsb3coXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRkb2MsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBub24tdGVybWluYWwgc3RhZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiICAtIFsgXSBQbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBpc0xhc3RXb3JrZmxvd1N0YWdlT3JOb3RXb3JrZmxvdyhcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHRtb2NrUGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIHRydWUgZm9yIG5vbi13b3JrZmxvdyB0YXNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFJlZ3VsYXIgdGFza1wiO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChsaW5lVGV4dCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBpc0xhc3RXb3JrZmxvd1N0YWdlT3JOb3RXb3JrZmxvdyhcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHQxLFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHRtb2NrUGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXR1cm4gZmFsc2UgZm9yIGN5Y2xlIHN1YnN0YWdlIHdpdGggbmV4dFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCIgIC0gWyBdIENvZGluZyB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnQuY29kaW5nXVwiO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcclxuXHRcdFx0XHRgLSBbIF0gUm9vdCB0YXNrICN3b3JrZmxvdy9kZXZlbG9wbWVudFxcbiR7bGluZVRleHR9YFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gaXNMYXN0V29ya2Zsb3dTdGFnZU9yTm90V29ya2Zsb3coXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRkb2MsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJnZW5lcmF0ZVdvcmtmbG93VGFza1RleHRcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBnZW5lcmF0ZSB0YXNrIHRleHQgZm9yIG1haW4gc3RhZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwbGFubmluZ1N0YWdlID0gc2FtcGxlV29ya2Zsb3cuc3RhZ2VzWzBdO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBnZW5lcmF0ZVdvcmtmbG93VGFza1RleHQoXHJcblx0XHRcdFx0cGxhbm5pbmdTdGFnZSxcclxuXHRcdFx0XHRcIiAgXCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpbixcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0NvbnRhaW4oXCItIFsgXSBQbGFubmluZ1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9Db250YWluKFwiW3N0YWdlOjpwbGFubmluZ11cIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQ29udGFpbihcIvCfm6tcIik7IC8vIHRpbWVzdGFtcFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBnZW5lcmF0ZSB0YXNrIHRleHQgZm9yIHN1YnN0YWdlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGV2ZWxvcG1lbnRTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlc1sxXTtcclxuXHRcdFx0Y29uc3QgY29kaW5nU3ViU3RhZ2UgPSBkZXZlbG9wbWVudFN0YWdlLnN1YlN0YWdlcyFbMF07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGdlbmVyYXRlV29ya2Zsb3dUYXNrVGV4dChcclxuXHRcdFx0XHRkZXZlbG9wbWVudFN0YWdlLFxyXG5cdFx0XHRcdFwiICBcIixcclxuXHRcdFx0XHRtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0Y29kaW5nU3ViU3RhZ2VcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQ29udGFpbihcIi0gWyBdIERldmVsb3BtZW50IChDb2RpbmcpXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0NvbnRhaW4oXCJbc3RhZ2U6OmRldmVsb3BtZW50LmNvZGluZ11cIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGdlbmVyYXRlIHRhc2sgdGV4dCB3aXRoIHN1YnRhc2tzIGZvciBjeWNsZSBzdGFnZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRldmVsb3BtZW50U3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXNbMV07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGdlbmVyYXRlV29ya2Zsb3dUYXNrVGV4dChcclxuXHRcdFx0XHRkZXZlbG9wbWVudFN0YWdlLFxyXG5cdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpbixcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0NvbnRhaW4oXCItIFsgXSBEZXZlbG9wbWVudCBbc3RhZ2U6OmRldmVsb3BtZW50XVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9Db250YWluKFxyXG5cdFx0XHRcdFwiLSBbIF0gRGV2ZWxvcG1lbnQgKENvZGluZykgW3N0YWdlOjpkZXZlbG9wbWVudC5jb2RpbmddXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IGFkZCB0aW1lc3RhbXAgd2hlbiBkaXNhYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tQbHVnaW5Ob1RpbWVzdGFtcCA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRcdHdvcmtmbG93OiB7XHJcblx0XHRcdFx0XHQuLi5tb2NrUGx1Z2luLnNldHRpbmdzLndvcmtmbG93LFxyXG5cdFx0XHRcdFx0YXV0b0FkZFRpbWVzdGFtcDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBwbGFubmluZ1N0YWdlID0gc2FtcGxlV29ya2Zsb3cuc3RhZ2VzWzBdO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBnZW5lcmF0ZVdvcmtmbG93VGFza1RleHQoXHJcblx0XHRcdFx0cGxhbm5pbmdTdGFnZSxcclxuXHRcdFx0XHRcIlwiLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5Ob1RpbWVzdGFtcCxcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS5ub3QudG9Db250YWluKFwi8J+bq1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImRldGVybWluZVRhc2tJbnNlcnRpb25Qb2ludFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBsaW5lIGVuZCB3aGVuIG5vIGNoaWxkIHRhc2tzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZSA9IHtcclxuXHRcdFx0XHRudW1iZXI6IDEsXHJcblx0XHRcdFx0dG86IDUwLFxyXG5cdFx0XHRcdHRleHQ6IFwiLSBbIF0gUGFyZW50IHRhc2tcIixcclxuXHRcdFx0fTtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXCItIFsgXSBQYXJlbnQgdGFza1wiKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRldGVybWluZVRhc2tJbnNlcnRpb25Qb2ludChsaW5lLCBkb2MsIFwiXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSg1MCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBhZnRlciBsYXN0IGNoaWxkIHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkb2NUZXh0ID0gYC0gWyBdIFBhcmVudCB0YXNrXHJcbiAgLSBbIF0gQ2hpbGQgdGFzayAxXHJcbiAgLSBbIF0gQ2hpbGQgdGFzayAyXHJcbi0gWyBdIEFub3RoZXIgcGFyZW50YDtcclxuXHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KGRvY1RleHQpO1xyXG5cdFx0XHRjb25zdCBsaW5lID0ge1xyXG5cdFx0XHRcdG51bWJlcjogMSxcclxuXHRcdFx0XHR0bzogMTcsIC8vIEVuZCBvZiBmaXJzdCBsaW5lXHJcblx0XHRcdFx0dGV4dDogXCItIFsgXSBQYXJlbnQgdGFza1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZGV0ZXJtaW5lVGFza0luc2VydGlvblBvaW50KGxpbmUsIGRvYywgXCJcIik7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgYmUgYWZ0ZXIgdGhlIGxhc3QgY2hpbGQgdGFza1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlR3JlYXRlclRoYW4oMTcpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiV29ya2Zsb3cgSW50ZWdyYXRpb24gVGVzdHNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY29tcGxldGUgd29ya2Zsb3cgbGlmZWN5Y2xlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gU3RhcnQgd2l0aCByb290IHRhc2tcclxuXHRcdFx0bGV0IGxpbmVUZXh0ID0gXCItIFsgXSBGZWF0dXJlIGRldmVsb3BtZW50ICN3b3JrZmxvdy9kZXZlbG9wbWVudFwiO1xyXG5cdFx0XHRsZXQgZG9jID0gY3JlYXRlTW9ja1RleHQobGluZVRleHQpO1xyXG5cdFx0XHRsZXQgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRkb2MsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHRtb2NrUGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5pc1Jvb3RUYXNrKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5jdXJyZW50U3RhZ2UuaWQpLnRvQmUoXCJfcm9vdF90YXNrX1wiKTtcclxuXHJcblx0XHRcdC8vIE1vdmUgdG8gcGxhbm5pbmcgc3RhZ2VcclxuXHRcdFx0Y29uc3QgeyBuZXh0U3RhZ2VJZCB9ID0gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdFx0XHRcdHJlc29sdmVkSW5mbyEuY3VycmVudFN0YWdlLFxyXG5cdFx0XHRcdHJlc29sdmVkSW5mbyEud29ya2Zsb3dcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG5leHRTdGFnZUlkKS50b0JlKFwicGxhbm5pbmdcIik7XHJcblxyXG5cdFx0XHQvLyBHZW5lcmF0ZSBwbGFubmluZyB0YXNrXHJcblx0XHRcdGNvbnN0IHBsYW5uaW5nU3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXMuZmluZChcclxuXHRcdFx0XHQocykgPT4gcy5pZCA9PT0gXCJwbGFubmluZ1wiXHJcblx0XHRcdCkhO1xyXG5cdFx0XHRjb25zdCBwbGFubmluZ1Rhc2tUZXh0ID0gZ2VuZXJhdGVXb3JrZmxvd1Rhc2tUZXh0KFxyXG5cdFx0XHRcdHBsYW5uaW5nU3RhZ2UsXHJcblx0XHRcdFx0XCIgIFwiLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocGxhbm5pbmdUYXNrVGV4dCkudG9Db250YWluKFwiUGxhbm5pbmdcIik7XHJcblxyXG5cdFx0XHQvLyBNb3ZlIHRvIGRldmVsb3BtZW50IHN0YWdlXHJcblx0XHRcdGxpbmVUZXh0ID0gXCIgIC0gWyBdIFBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cIjtcclxuXHRcdFx0ZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0YC0gWyBdIEZlYXR1cmUgZGV2ZWxvcG1lbnQgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblx0XHRcdHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8obGluZVRleHQsIGRvYywgMiwgbW9ja1BsdWdpbik7XHJcblxyXG5cdFx0XHRjb25zdCB7IG5leHRTdGFnZUlkOiBkZXZTdGFnZUlkIH0gPSBkZXRlcm1pbmVOZXh0U3RhZ2UoXHJcblx0XHRcdFx0cmVzb2x2ZWRJbmZvIS5jdXJyZW50U3RhZ2UsXHJcblx0XHRcdFx0cmVzb2x2ZWRJbmZvIS53b3JrZmxvd1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZGV2U3RhZ2VJZCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBjeWNsZSBzdWJzdGFnZXNcclxuXHRcdFx0Y29uc3QgZGV2ZWxvcG1lbnRTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlcy5maW5kKFxyXG5cdFx0XHRcdChzKSA9PiBzLmlkID09PSBcImRldmVsb3BtZW50XCJcclxuXHRcdFx0KSE7XHJcblx0XHRcdGNvbnN0IGZpcnN0U3ViU3RhZ2UgPSBkZXZlbG9wbWVudFN0YWdlLnN1YlN0YWdlcyFbMF07XHJcblx0XHRcdGNvbnN0IHsgbmV4dFN0YWdlSWQ6IG5leHRTdWJTdGFnZUlkLCBuZXh0U3ViU3RhZ2VJZDogbmV4dFN1YklkIH0gPVxyXG5cdFx0XHRcdGRldGVybWluZU5leHRTdGFnZShcclxuXHRcdFx0XHRcdGRldmVsb3BtZW50U3RhZ2UsXHJcblx0XHRcdFx0XHRzYW1wbGVXb3JrZmxvdyxcclxuXHRcdFx0XHRcdGZpcnN0U3ViU3RhZ2VcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobmV4dFN1YlN0YWdlSWQpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KG5leHRTdWJJZCkudG9CZShcInRlc3RpbmdcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB3b3JrZmxvdyB3aXRoIG1pc3NpbmcgZGVmaW5pdGlvbnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBbc3RhZ2U6Om5vbmV4aXN0ZW50XVwiO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChsaW5lVGV4dCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHJlc29sdmVXb3JrZmxvd0luZm8obGluZVRleHQsIGRvYywgMSwgbW9ja1BsdWdpbik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbWFsZm9ybWVkIHN0YWdlIG1hcmtlcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBbc3RhZ2U6Ol1cIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZXh0cmFjdFdvcmtmbG93SW5mbyhsaW5lVGV4dCk7XHJcblxyXG5cdFx0XHQvLyBleHRyYWN0V29ya2Zsb3dJbmZvIHNob3VsZCByZXR1cm4gbnVsbCBmb3IgbWFsZm9ybWVkIG1hcmtlcnNcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRpbWUgQ2FsY3VsYXRpb24gRWRnZSBDYXNlc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIHRpbWVzdGFtcCBmb3JtYXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9XHJcblx0XHRcdFx0XCItIFt4XSBUYXNrIPCfm6sgaW52YWxpZC10aW1lc3RhbXAgW3N0YWdlOjpwbGFubmluZ11cIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQobGluZVRleHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hhbmdlcyA9IHByb2Nlc3NUaW1lc3RhbXBBbmRDYWxjdWxhdGVUaW1lKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0XCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgY3Jhc2gsIG1heSBzdGlsbCBwcm9jZXNzIHNvbWUgY2hhbmdlc1xyXG5cdFx0XHRleHBlY3QoY2hhbmdlcykudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1pc3Npbmcgd29ya2Zsb3cgZGVmaW5pdGlvbiBkdXJpbmcgdGltZSBjYWxjdWxhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tQbHVnaW5Ob1dvcmtmbG93ID0gY3JlYXRlTW9ja1BsdWdpbih7XHJcblx0XHRcdFx0d29ya2Zsb3c6IHtcclxuXHRcdFx0XHRcdC4uLm1vY2tQbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3csXHJcblx0XHRcdFx0XHRkZWZpbml0aW9uczogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCBcImhvdXJcIik7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gYC0gW3hdIFRhc2sg8J+bqyAke3N0YXJ0VGltZS5mb3JtYXQoXHJcblx0XHRcdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCJcclxuXHRcdFx0KX0gW3N0YWdlOjpwbGFubmluZ11gO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChsaW5lVGV4dCk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHRcIm5vbmV4aXN0ZW50XCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpbk5vV29ya2Zsb3dcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBzdGlsbCBwcm9jZXNzIHRpbWVzdGFtcCByZW1vdmFsIGFuZCBiYXNpYyB0aW1lIGNhbGN1bGF0aW9uXHJcblx0XHRcdGV4cGVjdChjaGFuZ2VzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiV29ya2Zsb3cgU2V0dGluZ3MgSW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZXNwZWN0IGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXIgc2V0dGluZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tQbHVnaW5Ob1JlbW92ZSA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHRcdHdvcmtmbG93OiB7XHJcblx0XHRcdFx0XHQuLi5tb2NrUGx1Z2luLnNldHRpbmdzLndvcmtmbG93LFxyXG5cdFx0XHRcdFx0YXV0b1JlbW92ZUxhc3RTdGFnZU1hcmtlcjogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbeF0gVGFzayBbc3RhZ2U6Om1vbml0b3JpbmddXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KGxpbmVUZXh0KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGlzTGFzdFdvcmtmbG93U3RhZ2VPck5vdFdvcmtmbG93KFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5Ob1JlbW92ZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTsgLy8gU3RpbGwgdGVybWluYWwgc3RhZ2VcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmVzcGVjdCBjYWxjdWxhdGVTcGVudFRpbWUgc2V0dGluZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tQbHVnaW5Ob1RpbWUgPSBjcmVhdGVNb2NrUGx1Z2luKHtcclxuXHRcdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdFx0Li4ubW9ja1BsdWdpbi5zZXR0aW5ncy53b3JrZmxvdyxcclxuXHRcdFx0XHRcdGNhbGN1bGF0ZVNwZW50VGltZTogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCBcImhvdXJcIik7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gYC0gW3hdIFRhc2sg8J+bqyAke3N0YXJ0VGltZS5mb3JtYXQoXHJcblx0XHRcdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCJcclxuXHRcdFx0KX0gW3N0YWdlOjpwbGFubmluZ11gO1xyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChsaW5lVGV4dCk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHRcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpbk5vVGltZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG9ubHkgaGF2ZSB0aW1lc3RhbXAgcmVtb3ZhbCwgbm8gdGltZSBjYWxjdWxhdGlvblxyXG5cdFx0XHRjb25zdCB0aW1lQ2hhbmdlcyA9IGNoYW5nZXMuZmlsdGVyKChjKSA9PiBjLmluc2VydC5pbmNsdWRlcyhcIuKPse+4j1wiKSk7XHJcblx0XHRcdGV4cGVjdCh0aW1lQ2hhbmdlcykudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiU3RhZ2UgSnVtcGluZyBhbmQgQ29udGV4dCBNZW51IEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGp1bXBpbmcgZnJvbSBtaWRkbGUgc3RhZ2UgdG8gYW5vdGhlciBzdGFnZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3QganVtcGluZyBmcm9tIGRldmVsb3BtZW50IHN0YWdlIHRvIGRlcGxveW1lbnQgc3RhZ2UgKHNraXBwaW5nIG5vcm1hbCBmbG93KVxyXG5cdFx0XHRjb25zdCBkZXZlbG9wbWVudFN0YWdlID0gc2FtcGxlV29ya2Zsb3cuc3RhZ2VzWzFdOyAvLyBkZXZlbG9wbWVudFxyXG5cdFx0XHRjb25zdCBkZXBsb3ltZW50U3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXNbMl07IC8vIGRlcGxveW1lbnRcclxuXHJcblx0XHRcdC8vIFNpbXVsYXRlIGEgc3RhZ2UganVtcCB1c2luZyBjYW5Qcm9jZWVkVG9cclxuXHRcdFx0ZXhwZWN0KGRldmVsb3BtZW50U3RhZ2UuY2FuUHJvY2VlZFRvKS50b0NvbnRhaW4oXCJkZXBsb3ltZW50XCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgeyBuZXh0U3RhZ2VJZCB9ID0gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdFx0XHRcdGRldmVsb3BtZW50U3RhZ2UsXHJcblx0XHRcdFx0c2FtcGxlV29ya2Zsb3dcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gRm9yIGN5Y2xlIHN0YWdlcyB3aXRoIGNhblByb2NlZWRUbywgaXQgc2hvdWxkIGdvIHRvIHRoZSBmaXJzdCBjYW5Qcm9jZWVkVG8gb3B0aW9uXHJcblx0XHRcdGV4cGVjdChuZXh0U3RhZ2VJZCkudG9CZShcImRlcGxveW1lbnRcIik7IC8vIEp1bXAgdG8gZGVwbG95bWVudFxyXG5cclxuXHRcdFx0Ly8gVGVzdCBkaXJlY3QganVtcCB0byBkZXBsb3ltZW50XHJcblx0XHRcdGNvbnN0IGp1bXBSZXN1bHQgPSBkZXRlcm1pbmVOZXh0U3RhZ2UoXHJcblx0XHRcdFx0ZGVwbG95bWVudFN0YWdlLFxyXG5cdFx0XHRcdHNhbXBsZVdvcmtmbG93XHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChqdW1wUmVzdWx0Lm5leHRTdGFnZUlkKS50b0JlKFwibW9uaXRvcmluZ1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGp1bXBpbmcgaW50byBtaWRkbGUgb2Ygd29ya2Zsb3dcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IGp1bXBpbmcgZGlyZWN0bHkgaW50byBkZXZlbG9wbWVudCBzdGFnZSBmcm9tIHBsYW5uaW5nXHJcblx0XHRcdGNvbnN0IHBsYW5uaW5nU3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXNbMF07IC8vIHBsYW5uaW5nXHJcblx0XHRcdGNvbnN0IGRldmVsb3BtZW50U3RhZ2UgPSBzYW1wbGVXb3JrZmxvdy5zdGFnZXNbMV07IC8vIGRldmVsb3BtZW50XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhhdCBwbGFubmluZyBjYW4gcHJvY2VlZCB0byBkZXZlbG9wbWVudFxyXG5cdFx0XHRleHBlY3QocGxhbm5pbmdTdGFnZS5uZXh0KS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGp1bXBpbmcgaW50byBjeWNsZSBzdGFnZVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkZXRlcm1pbmVOZXh0U3RhZ2UoZGV2ZWxvcG1lbnRTdGFnZSwgc2FtcGxlV29ya2Zsb3cpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5leHRTdGFnZUlkKS50b0JlKFwiZGVwbG95bWVudFwiKTsgLy8gU2hvdWxkIGp1bXAgdG8gZGVwbG95bWVudCB2aWEgY2FuUHJvY2VlZFRvXHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBqdW1waW5nIGZyb20gY29tcGxldGVkIHN0YWdlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCBzY2VuYXJpbyB3aGVyZSBhIGNvbXBsZXRlZCB0YXNrIG5lZWRzIHRvIGp1bXAgdG8gZGlmZmVyZW50IHN0YWdlXHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID1cclxuXHRcdFx0XHRcIiAgLSBbeF0gQ29tcGxldGVkIHBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cIjtcclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRcdFx0YC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcXG4ke2xpbmVUZXh0fWBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvKS50b0JlVHJ1dGh5KCk7XHJcblx0XHRcdGV4cGVjdChyZXNvbHZlZEluZm8/LmN1cnJlbnRTdGFnZS5pZCkudG9CZShcInBsYW5uaW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGJlIGFibGUgdG8gZGV0ZXJtaW5lIG5leHQgc3RhZ2UgZXZlbiBmb3IgY29tcGxldGVkIHRhc2tcclxuXHRcdFx0Y29uc3QgeyBuZXh0U3RhZ2VJZCB9ID0gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdFx0XHRcdHJlc29sdmVkSW5mbyEuY3VycmVudFN0YWdlLFxyXG5cdFx0XHRcdHJlc29sdmVkSW5mbyEud29ya2Zsb3dcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG5leHRTdGFnZUlkKS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBqdW1waW5nIGZyb20gdW5jb21wbGV0ZWQgc3RhZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHNjZW5hcmlvIHdoZXJlIGFuIHVuY29tcGxldGVkIHRhc2sganVtcHMgdG8gZGlmZmVyZW50IHN0YWdlXHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID1cclxuXHRcdFx0XHRcIiAgLSBbIF0gSW5jb21wbGV0ZSBkZXZlbG9wbWVudCB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5jdXJyZW50U3RhZ2UuaWQpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBiZSBhYmxlIHRvIGp1bXAgdG8gZGVwbG95bWVudCB2aWEgY2FuUHJvY2VlZFRvXHJcblx0XHRcdGV4cGVjdChyZXNvbHZlZEluZm8/LmN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8pLnRvQ29udGFpbihcclxuXHRcdFx0XHRcImRlcGxveW1lbnRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY29udGV4dCBtZW51IHN0YWdlIHRyYW5zaXRpb25zXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCB0aGUgbG9naWMgdGhhdCB3b3VsZCBiZSB1c2VkIGluIGNvbnRleHQgbWVudSBmb3Igc3RhZ2UgdHJhbnNpdGlvbnNcclxuXHRcdFx0Y29uc3QgY3VycmVudFN0YWdlID0gc2FtcGxlV29ya2Zsb3cuc3RhZ2VzWzFdOyAvLyBkZXZlbG9wbWVudCAoY3ljbGUpXHJcblx0XHRcdGNvbnN0IGF2YWlsYWJsZVRyYW5zaXRpb25zOiBBcnJheTx7XHJcblx0XHRcdFx0dHlwZTogc3RyaW5nO1xyXG5cdFx0XHRcdHRhcmdldDogV29ya2Zsb3dTdGFnZTtcclxuXHRcdFx0XHRsYWJlbDogc3RyaW5nO1xyXG5cdFx0XHR9PiA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGNhblByb2NlZWRUbyBvcHRpb25zXHJcblx0XHRcdGlmIChjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvKSB7XHJcblx0XHRcdFx0Y3VycmVudFN0YWdlLmNhblByb2NlZWRUby5mb3JFYWNoKChzdGFnZUlkKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB0YXJnZXRTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlcy5maW5kKFxyXG5cdFx0XHRcdFx0XHQocykgPT4gcy5pZCA9PT0gc3RhZ2VJZFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXRTdGFnZSkge1xyXG5cdFx0XHRcdFx0XHRhdmFpbGFibGVUcmFuc2l0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcImp1bXBcIixcclxuXHRcdFx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldFN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdGxhYmVsOiBgSnVtcCB0byAke3RhcmdldFN0YWdlLm5hbWV9YCxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIGRlcGxveW1lbnQgYXMgYXZhaWxhYmxlIHRyYW5zaXRpb25cclxuXHRcdFx0ZXhwZWN0KGF2YWlsYWJsZVRyYW5zaXRpb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChhdmFpbGFibGVUcmFuc2l0aW9uc1swXS50YXJnZXQuaWQpLnRvQmUoXCJkZXBsb3ltZW50XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgc3Vic3RhZ2UgdG8gbWFpbiBzdGFnZSB0cmFuc2l0aW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3QganVtcGluZyBmcm9tIHN1YnN0YWdlIHRvIG1haW4gc3RhZ2VcclxuXHRcdFx0Y29uc3QgZGV2ZWxvcG1lbnRTdGFnZSA9IHNhbXBsZVdvcmtmbG93LnN0YWdlc1sxXTsgLy8gZGV2ZWxvcG1lbnRcclxuXHRcdFx0Y29uc3QgY29kaW5nU3ViU3RhZ2UgPSBkZXZlbG9wbWVudFN0YWdlLnN1YlN0YWdlcyFbMF07IC8vIGNvZGluZ1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0cmFuc2l0aW9uIGZyb20gc3Vic3RhZ2UgdG8gbWFpbiBzdGFnZSB2aWEgY2FuUHJvY2VlZFRvXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGRldGVybWluZU5leHRTdGFnZShcclxuXHRcdFx0XHRkZXZlbG9wbWVudFN0YWdlLFxyXG5cdFx0XHRcdHNhbXBsZVdvcmtmbG93LFxyXG5cdFx0XHRcdHsgLi4uY29kaW5nU3ViU3RhZ2UsIG5leHQ6IHVuZGVmaW5lZCB9IC8vIFJlbW92ZSBuZXh0IHRvIHRyaWdnZXIgbWFpbiBzdGFnZSB0cmFuc2l0aW9uXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm5leHRTdGFnZUlkKS50b0JlKFwiZGVwbG95bWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5uZXh0U3ViU3RhZ2VJZCkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWl4ZWQgUGx1Z2luIEludGVncmF0aW9uIFRlc3RzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgd29yayB3aXRoIGN5Y2xlU3RhdHVzIGZ1bmN0aW9uYWxpdHlcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHdpdGggdGFzayBzdGF0dXMgY3ljbGluZ1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9XHJcblx0XHRcdFx0XCIgIC0gWy9dIEluIHByb2dyZXNzIHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudC5jb2RpbmddXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5jdXJyZW50U3RhZ2UuaWQpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbz8uY3VycmVudFN1YlN0YWdlPy5pZCkudG9CZShcImNvZGluZ1wiKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYW5kbGUgaW4tcHJvZ3Jlc3Mgc3RhdHVzXHJcblx0XHRcdGNvbnN0IGlzTGFzdCA9IGlzTGFzdFdvcmtmbG93U3RhZ2VPck5vdFdvcmtmbG93KFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGlzTGFzdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHdvcmsgd2l0aCBhdXRvQ29tcGxldGUgcGFyZW50IGZ1bmN0aW9uYWxpdHlcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHdpdGggYXV0by1jb21wbGV0ZSBwYXJlbnQgdGFza3NcclxuXHRcdFx0Y29uc3QgZG9jVGV4dCA9IGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XHJcbiAgLSBbeF0gQ29tcGxldGVkIHBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cclxuICAtIFsgXSBEZXZlbG9wbWVudCB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdYDtcclxuXHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KGRvY1RleHQpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IGNvbXBsZXRpbmcgYSB3b3JrZmxvdyB0YXNrIGRvZXNuJ3QgaW50ZXJmZXJlIHdpdGggcGFyZW50IGNvbXBsZXRpb25cclxuXHRcdFx0Y29uc3QgcGxhbm5pbmdMaW5lID1cclxuXHRcdFx0XHRcIiAgLSBbeF0gQ29tcGxldGVkIHBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cIjtcclxuXHRcdFx0Y29uc3QgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdFx0XHRwbGFubmluZ0xpbmUsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5pc1Jvb3RUYXNrKS50b0JlKGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgYmUgY29uc2lkZXJlZCBsYXN0IHN0YWdlIChzaG91bGRuJ3QgdHJpZ2dlciBwYXJlbnQgY29tcGxldGlvbilcclxuXHRcdFx0Y29uc3QgaXNMYXN0ID0gaXNMYXN0V29ya2Zsb3dTdGFnZU9yTm90V29ya2Zsb3coXHJcblx0XHRcdFx0cGxhbm5pbmdMaW5lLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGlzTGFzdCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtaXhlZCB0YXNrIHN0YXR1c2VzIGluIHdvcmtmbG93XCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCB3b3JrZmxvdyB3aXRoIHZhcmlvdXMgdGFzayBzdGF0dXNlc1xyXG5cdFx0XHRjb25zdCB0ZXN0U3RhdHVzZXMgPSBbXHJcblx0XHRcdFx0eyBzdGF0dXM6IFwiIFwiLCBkZXNjcmlwdGlvbjogXCJub3Qgc3RhcnRlZFwiIH0sXHJcblx0XHRcdFx0eyBzdGF0dXM6IFwiL1wiLCBkZXNjcmlwdGlvbjogXCJpbiBwcm9ncmVzc1wiIH0sXHJcblx0XHRcdFx0eyBzdGF0dXM6IFwieFwiLCBkZXNjcmlwdGlvbjogXCJjb21wbGV0ZWRcIiB9LFxyXG5cdFx0XHRcdHsgc3RhdHVzOiBcIi1cIiwgZGVzY3JpcHRpb246IFwiYWJhbmRvbmVkXCIgfSxcclxuXHRcdFx0XHR7IHN0YXR1czogXCI/XCIsIGRlc2NyaXB0aW9uOiBcInBsYW5uZWRcIiB9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdFN0YXR1c2VzLmZvckVhY2goKHsgc3RhdHVzLCBkZXNjcmlwdGlvbiB9KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSBgICAtIFske3N0YXR1c31dICR7ZGVzY3JpcHRpb259IHRhc2sgW3N0YWdlOjpwbGFubmluZ11gO1xyXG5cdFx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdFx0YC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcXG4ke2xpbmVUZXh0fWBcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdFx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0XHRkb2MsXHJcblx0XHRcdFx0XHQyLFxyXG5cdFx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXNvbHZlZEluZm8/LmN1cnJlbnRTdGFnZS5pZCkudG9CZShcInBsYW5uaW5nXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHdvcmtmbG93IHdpdGggcHJpb3JpdHkgbWFya2Vyc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3Qgd29ya2Zsb3cgdGFza3Mgd2l0aCBwcmlvcml0eSBtYXJrZXJzXHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCIgIC0gWyBdIEhpZ2ggcHJpb3JpdHkgdGFzayDwn5S6IFtzdGFnZTo6cGxhbm5pbmddXCI7XHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KFxyXG5cdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuJHtsaW5lVGV4dH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy5jdXJyZW50U3RhZ2UuaWQpLnRvQmUoXCJwbGFubmluZ1wiKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBleHRyYWN0IHdvcmtmbG93IGluZm8gZGVzcGl0ZSBwcmlvcml0eSBtYXJrZXJcclxuXHRcdFx0Y29uc3Qgd29ya2Zsb3dJbmZvID0gZXh0cmFjdFdvcmtmbG93SW5mbyhsaW5lVGV4dCk7XHJcblx0XHRcdGV4cGVjdCh3b3JrZmxvd0luZm8pLnRvQmVUcnV0aHkoKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93SW5mbz8uY3VycmVudFN0YWdlKS50b0JlKFwicGxhbm5pbmdcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb21wbGV4IERvY3VtZW50IFN0cnVjdHVyZSBUZXN0c1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB0YXNrcyBzZXBhcmF0ZWQgYnkgY29tbWVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHRhc2tzIHdpdGggY29tbWVudHMgaW4gYmV0d2VlblxyXG5cdFx0XHRjb25zdCBkb2NUZXh0ID0gYC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcclxuICAtIFt4XSBDb21wbGV0ZWQgcGxhbm5pbmcgdGFzayBbc3RhZ2U6OnBsYW5uaW5nXVxyXG4gIFxyXG4gIDwhLS0gVGhpcyBpcyBhIGNvbW1lbnQgYWJvdXQgdGhlIHBsYW5uaW5nIHBoYXNlIC0tPlxyXG4gIFxyXG4gIC0gWyBdIERldmVsb3BtZW50IHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudF1gO1xyXG5cclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoZG9jVGV4dCk7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgd29ya2Zsb3cgcmVzb2x1dGlvbiB3b3JrcyBkZXNwaXRlIGNvbW1lbnRzXHJcblx0XHRcdGNvbnN0IGRldmVsb3BtZW50TGluZSA9XHJcblx0XHRcdFx0XCIgIC0gWyBdIERldmVsb3BtZW50IHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudF1cIjtcclxuXHRcdFx0Y29uc3QgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdFx0XHRkZXZlbG9wbWVudExpbmUsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdDYsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy53b3JrZmxvd1R5cGUpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc29sdmVkSW5mbz8uY3VycmVudFN0YWdlLmlkKS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB0YXNrcyBzZXBhcmF0ZWQgYnkgbXVsdGlwbGUgbGluZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHRhc2tzIHdpdGggbXVsdGlwbGUgYmxhbmsgbGluZXNcclxuXHRcdFx0Y29uc3QgZG9jVGV4dCA9IGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XHJcbiAgLSBbeF0gQ29tcGxldGVkIHBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cclxuXHJcblxyXG5cclxuICAtIFsgXSBEZXZlbG9wbWVudCB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdYDtcclxuXHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KGRvY1RleHQpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0YXNrIGluc2VydGlvbiBwb2ludCBjYWxjdWxhdGlvbiB3aXRoIGdhcHNcclxuXHRcdFx0Y29uc3QgcGxhbm5pbmdMaW5lID0ge1xyXG5cdFx0XHRcdG51bWJlcjogMixcclxuXHRcdFx0XHR0bzogNTAsXHJcblx0XHRcdFx0dGV4dDogXCIgIC0gW3hdIENvbXBsZXRlZCBwbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBpbnNlcnRpb25Qb2ludCA9IGRldGVybWluZVRhc2tJbnNlcnRpb25Qb2ludChcclxuXHRcdFx0XHRwbGFubmluZ0xpbmUsXHJcblx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdFwiICBcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBTaG91bGQgcmV0dXJuIGF0IGxlYXN0IHRoZSBsaW5lJ3MgZW5kIHBvc2l0aW9uXHJcblx0XHRcdGV4cGVjdChpbnNlcnRpb25Qb2ludCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg1MCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBuZXN0ZWQgdGFzayBzdHJ1Y3R1cmVzXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCB3b3JrZmxvdyB3aXRoIG5lc3RlZCB0YXNrIHN0cnVjdHVyZXNcclxuXHRcdFx0Y29uc3QgZG9jVGV4dCA9IGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XHJcbiAgLSBbeF0gQ29tcGxldGVkIHBsYW5uaW5nIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cclxuICAgIC0gW3hdIFN1Yi1wbGFubmluZyB0YXNrIDFcclxuICAgIC0gW3hdIFN1Yi1wbGFubmluZyB0YXNrIDJcclxuICAgICAgLSBbeF0gRGVlcCBuZXN0ZWQgdGFza1xyXG4gIC0gWyBdIERldmVsb3BtZW50IHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudF1gO1xyXG5cclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoZG9jVGV4dCk7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgbmVzdGVkIHN0cnVjdHVyZSBkb2Vzbid0IGJyZWFrIHdvcmtmbG93IHJlc29sdXRpb25cclxuXHRcdFx0Y29uc3QgZGV2ZWxvcG1lbnRMaW5lID1cclxuXHRcdFx0XHRcIiAgLSBbIF0gRGV2ZWxvcG1lbnQgdGFzayBbc3RhZ2U6OmRldmVsb3BtZW50XVwiO1xyXG5cdFx0XHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdFx0XHRcdGRldmVsb3BtZW50TGluZSxcclxuXHRcdFx0XHRkb2MsXHJcblx0XHRcdFx0NixcclxuXHRcdFx0XHRtb2NrUGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvKS50b0JlVHJ1dGh5KCk7XHJcblx0XHRcdGV4cGVjdChyZXNvbHZlZEluZm8/LmN1cnJlbnRTdGFnZS5pZCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgdGFza3Mgd2l0aCBtZXRhZGF0YSBhbmQgbGlua3NcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHRhc2tzIHdpdGggdmFyaW91cyBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBkb2NUZXh0ID0gYC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcclxuICAtIFt4XSBQbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddIPCfk4UgMjAyNC0wMS0wMSAjaW1wb3J0YW50XHJcbiAgICA+IFRoaXMgdGFzayBoYXMgYSBub3RlXHJcbiAgICA+IFtbTGluayB0byBwbGFubmluZyBkb2N1bWVudF1dXHJcbiAgLSBbIF0gRGV2ZWxvcG1lbnQgdGFzayBbc3RhZ2U6OmRldmVsb3BtZW50XSDwn5S6IEBjb250ZXh0YDtcclxuXHJcblx0XHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tUZXh0KGRvY1RleHQpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IG1ldGFkYXRhIGRvZXNuJ3QgaW50ZXJmZXJlIHdpdGggd29ya2Zsb3cgZXh0cmFjdGlvblxyXG5cdFx0XHRjb25zdCBwbGFubmluZ0xpbmUgPVxyXG5cdFx0XHRcdFwiICAtIFt4XSBQbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddIPCfk4UgMjAyNC0wMS0wMSAjaW1wb3J0YW50XCI7XHJcblx0XHRcdGNvbnN0IHdvcmtmbG93SW5mbyA9IGV4dHJhY3RXb3JrZmxvd0luZm8ocGxhbm5pbmdMaW5lKTtcclxuXHJcblx0XHRcdGV4cGVjdCh3b3JrZmxvd0luZm8pLnRvQmVUcnV0aHkoKTtcclxuXHRcdFx0ZXhwZWN0KHdvcmtmbG93SW5mbz8uY3VycmVudFN0YWdlKS50b0JlKFwicGxhbm5pbmdcIik7XHJcblxyXG5cdFx0XHRjb25zdCBkZXZlbG9wbWVudExpbmUgPVxyXG5cdFx0XHRcdFwiICAtIFsgXSBEZXZlbG9wbWVudCB0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdIPCflLogQGNvbnRleHRcIjtcclxuXHRcdFx0Y29uc3QgZGV2V29ya2Zsb3dJbmZvID0gZXh0cmFjdFdvcmtmbG93SW5mbyhkZXZlbG9wbWVudExpbmUpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGRldldvcmtmbG93SW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRleHBlY3QoZGV2V29ya2Zsb3dJbmZvPy5jdXJyZW50U3RhZ2UpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHdvcmtmbG93IHRhc2tzIGluIGRpZmZlcmVudCBsaXN0IGZvcm1hdHNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHdpdGggZGlmZmVyZW50IGxpc3QgbWFya2Vyc1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0XCItIFsgXSBUYXNrIHdpdGggZGFzaCBbc3RhZ2U6OnBsYW5uaW5nXVwiLFxyXG5cdFx0XHRcdFwiKiBbIF0gVGFzayB3aXRoIGFzdGVyaXNrIFtzdGFnZTo6cGxhbm5pbmddXCIsXHJcblx0XHRcdFx0XCIrIFsgXSBUYXNrIHdpdGggcGx1cyBbc3RhZ2U6OnBsYW5uaW5nXVwiLFxyXG5cdFx0XHRcdFwiMS4gWyBdIE51bWJlcmVkIHRhc2sgW3N0YWdlOjpwbGFubmluZ11cIixcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RDYXNlcy5mb3JFYWNoKChsaW5lVGV4dCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChcclxuXHRcdFx0XHRcdGAtIFsgXSBSb290IHRhc2sgI3dvcmtmbG93L2RldmVsb3BtZW50XFxuICAke2xpbmVUZXh0fWBcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCB3b3JrZmxvd0luZm8gPSBleHRyYWN0V29ya2Zsb3dJbmZvKGAgICR7bGluZVRleHR9YCk7XHJcblx0XHRcdFx0ZXhwZWN0KHdvcmtmbG93SW5mbykudG9CZVRydXRoeSgpO1xyXG5cdFx0XHRcdGV4cGVjdCh3b3JrZmxvd0luZm8/LmN1cnJlbnRTdGFnZSkudG9CZShcInBsYW5uaW5nXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHdvcmtmbG93IHRhc2tzIHdpdGggdGltZSB0cmFja2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3Qgd29ya2Zsb3cgdGFza3Mgd2l0aCB2YXJpb3VzIHRpbWUgdHJhY2tpbmcgZm9ybWF0c1xyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBtb21lbnQoKS5zdWJ0cmFjdCgzLCBcImhvdXJzXCIpO1xyXG5cdFx0XHRjb25zdCBkb2NUZXh0ID0gYC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcclxuICAtIFt4XSBQbGFubmluZyB0YXNrIFtzdGFnZTo6cGxhbm5pbmddIPCfm6sgJHtzdGFydFRpbWUuZm9ybWF0KFxyXG5cdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCJcclxuICApfSAo4o+x77iPIDAyOjMwOjAwKVxyXG4gIC0gWyBdIERldmVsb3BtZW50IHRhc2sgW3N0YWdlOjpkZXZlbG9wbWVudF0g8J+bqyAke21vbWVudCgpLmZvcm1hdChcclxuXHRcdFwiWVlZWS1NTS1ERCBISDptbTpzc1wiXHJcbiAgKX1gO1xyXG5cclxuXHRcdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoZG9jVGV4dCk7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRpbWUgY2FsY3VsYXRpb24gd2l0aCBleGlzdGluZyB0aW1lIG1hcmtlcnNcclxuXHRcdFx0Y29uc3QgcGxhbm5pbmdMaW5lID0gYCAgLSBbeF0gUGxhbm5pbmcgdGFzayBbc3RhZ2U6OnBsYW5uaW5nXSDwn5urICR7c3RhcnRUaW1lLmZvcm1hdChcclxuXHRcdFx0XHRcIllZWVktTU0tREQgSEg6bW06c3NcIlxyXG5cdFx0XHQpfSAo4o+x77iPIDAyOjMwOjAwKWA7XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0cGxhbm5pbmdMaW5lLFxyXG5cdFx0XHRcdGRvYyxcclxuXHRcdFx0XHQxMDAsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0bW9ja1BsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGNoYW5nZXMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB3b3JrZmxvdyB0YXNrcyB3aXRoIGluZGVudGF0aW9uIHZhcmlhdGlvbnNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHdvcmtmbG93IHdpdGggZGlmZmVyZW50IGluZGVudGF0aW9uIGxldmVsc1xyXG5cdFx0XHRjb25zdCBkb2NUZXh0ID0gYC0gWyBdIFJvb3QgdGFzayAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcclxuICAgIC0gW3hdIFBsYW5uaW5nIHRhc2sgKDQgc3BhY2VzKSBbc3RhZ2U6OnBsYW5uaW5nXVxyXG5cXHQtIFsgXSBEZXZlbG9wbWVudCB0YXNrICh0YWIpIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXHJcbiAgLSBbIF0gRGVwbG95bWVudCB0YXNrICgyIHNwYWNlcykgW3N0YWdlOjpkZXBsb3ltZW50XWA7XHJcblxyXG5cdFx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrVGV4dChkb2NUZXh0KTtcclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBkaWZmZXJlbnQgaW5kZW50YXRpb24gbGV2ZWxzIGFyZSBoYW5kbGVkIGNvcnJlY3RseVxyXG5cdFx0XHRjb25zdCB0ZXN0TGluZXMgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bGluZTogXCIgICAgLSBbeF0gUGxhbm5pbmcgdGFzayAoNCBzcGFjZXMpIFtzdGFnZTo6cGxhbm5pbmddXCIsXHJcblx0XHRcdFx0XHRsaW5lTnVtOiAyLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bGluZTogXCJcXHQtIFsgXSBEZXZlbG9wbWVudCB0YXNrICh0YWIpIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCIsXHJcblx0XHRcdFx0XHRsaW5lTnVtOiAzLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bGluZTogXCIgIC0gWyBdIERlcGxveW1lbnQgdGFzayAoMiBzcGFjZXMpIFtzdGFnZTo6ZGVwbG95bWVudF1cIixcclxuXHRcdFx0XHRcdGxpbmVOdW06IDQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RMaW5lcy5mb3JFYWNoKCh7IGxpbmUsIGxpbmVOdW0gfSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8oXHJcblx0XHRcdFx0XHRsaW5lLFxyXG5cdFx0XHRcdFx0ZG9jLFxyXG5cdFx0XHRcdFx0bGluZU51bSxcclxuXHRcdFx0XHRcdG1vY2tQbHVnaW5cclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXNvbHZlZEluZm8pLnRvQmVUcnV0aHkoKTtcclxuXHRcdFx0XHRleHBlY3QocmVzb2x2ZWRJbmZvPy53b3JrZmxvd1R5cGUpLnRvQmUoXCJkZXZlbG9wbWVudFwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==