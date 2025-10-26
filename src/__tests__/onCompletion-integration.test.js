/**
 * OnCompletion Integration Tests
 *
 * End-to-end tests for onCompletion functionality including:
 * - Complete workflow from task completion to action execution
 * - Integration between OnCompletionManager and action executors
 * - Real-world usage scenarios
 * - Performance considerations
 */
import { __awaiter } from "tslib";
import { OnCompletionManager } from "../managers/completion-manager";
import { createMockPlugin, createMockApp } from "./mockUtils";
import { OnCompletionActionType } from "../types/onCompletion";
// Mock all the actual executor implementations
jest.mock("../executors/completion/delete-executor", () => ({
    DeleteActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Task deleted" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Delete task"),
    })),
}));
jest.mock("../executors/completion/complete-executor", () => ({
    CompleteActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Tasks completed" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Complete related tasks"),
    })),
}));
jest.mock("../executors/completion/move-executor", () => ({
    MoveActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Task moved" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Move task"),
    })),
}));
jest.mock("../executors/completion/archive-executor", () => ({
    ArchiveActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Task archived" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Archive task"),
    })),
}));
jest.mock("../executors/completion/duplicate-executor", () => ({
    DuplicateActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Task duplicated" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Duplicate task"),
    })),
}));
jest.mock("../executors/completion/keep-executor", () => ({
    KeepActionExecutor: jest.fn().mockImplementation(() => ({
        execute: jest
            .fn()
            .mockResolvedValue({ success: true, message: "Task kept" }),
        validateConfig: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue("Keep task"),
    })),
}));
describe("OnCompletion Integration Tests", () => {
    let manager;
    let mockApp;
    let mockPlugin;
    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin();
        // Mock workspace events
        mockApp.workspace = Object.assign(Object.assign({}, mockApp.workspace), { on: jest.fn().mockReturnValue({ unload: jest.fn() }) });
        // Mock plugin event registration
        mockPlugin.registerEvent = jest.fn();
        manager = new OnCompletionManager(mockApp, mockPlugin);
        manager.onload();
    });
    afterEach(() => {
        manager.unload();
    });
    describe("End-to-End Workflow Tests", () => {
        it("should handle complete delete workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "delete-task",
                content: "Task to delete on completion",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task to delete on completion 🏁 delete",
            };
            // Simulate task completion event
            yield manager["handleTaskCompleted"](task);
            // Verify the delete executor was called
            const deleteExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            expect(deleteExecutor === null || deleteExecutor === void 0 ? void 0 : deleteExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, { type: OnCompletionActionType.DELETE });
        }));
        it("should handle complete task completion workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "main-task",
                content: "Main task that completes others",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "complete:subtask-1,subtask-2,subtask-3",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "project.md",
                originalMarkdown: "- [x] Main task that completes others 🏁 complete:subtask-1,subtask-2,subtask-3",
            };
            yield manager["handleTaskCompleted"](task);
            const completeExecutor = manager["executors"].get(OnCompletionActionType.COMPLETE);
            expect(completeExecutor === null || completeExecutor === void 0 ? void 0 : completeExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["subtask-1", "subtask-2", "subtask-3"],
            });
        }));
        it("should handle move workflow with JSON configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "move-task",
                content: "Task to move to archive",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "move", "targetFile": "archive/completed.md", "targetSection": "Done"}',
                    tags: [],
                    children: [],
                },
                line: 5,
                filePath: "current.md",
                originalMarkdown: "- [x] Task to move to archive 🏁 move:archive/completed.md#Done",
            };
            yield manager["handleTaskCompleted"](task);
            const moveExecutor = manager["executors"].get(OnCompletionActionType.MOVE);
            expect(moveExecutor === null || moveExecutor === void 0 ? void 0 : moveExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.MOVE,
                targetFile: "archive/completed.md",
                targetSection: "Done",
            });
        }));
        it("should handle archive workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "archive-task",
                content: "Task to archive",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "archive:old-tasks.md",
                    tags: [],
                    children: [],
                },
                line: 3,
                filePath: "active.md",
                originalMarkdown: "- [x] Task to archive 🏁 archive:old-tasks.md",
            };
            yield manager["handleTaskCompleted"](task);
            const archiveExecutor = manager["executors"].get(OnCompletionActionType.ARCHIVE);
            expect(archiveExecutor === null || archiveExecutor === void 0 ? void 0 : archiveExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.ARCHIVE,
                archiveFile: "old-tasks.md",
            });
        }));
        it("should handle duplicate workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "template-task",
                content: "Template task to duplicate",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "duplicate:templates/recurring.md",
                    tags: [],
                    children: [],
                },
                line: 2,
                filePath: "weekly.md",
                originalMarkdown: "- [x] Template task to duplicate 🏁 duplicate:templates/recurring.md",
            };
            yield manager["handleTaskCompleted"](task);
            const duplicateExecutor = manager["executors"].get(OnCompletionActionType.DUPLICATE);
            expect(duplicateExecutor === null || duplicateExecutor === void 0 ? void 0 : duplicateExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "templates/recurring.md",
            });
        }));
        it("should handle keep workflow (no action)", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "keep-task",
                content: "Task to keep in place",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "keep",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "important.md",
                originalMarkdown: "- [x] Task to keep in place 🏁 keep",
            };
            yield manager["handleTaskCompleted"](task);
            const keepExecutor = manager["executors"].get(OnCompletionActionType.KEEP);
            expect(keepExecutor === null || keepExecutor === void 0 ? void 0 : keepExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, { type: OnCompletionActionType.KEEP });
        }));
    });
    describe("Complex Scenarios", () => {
        it("should handle task without onCompletion metadata", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "normal-task",
                content: "Normal task without onCompletion",
                completed: true,
                status: "x",
                metadata: {
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Normal task without onCompletion",
            };
            yield manager["handleTaskCompleted"](task);
            // No executors should be called
            Object.values(manager["executors"]).forEach((executor) => {
                expect(executor.execute).not.toHaveBeenCalled();
            });
        }));
        it("should handle invalid onCompletion configuration gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "invalid-task",
                content: "Task with invalid onCompletion",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "invalid-action-type",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task with invalid onCompletion 🏁 invalid-action-type",
            };
            // 恢复原始 console.warn
            const originalWarn = console.warn;
            console.warn = jest.fn();
            const consoleSpy = console.warn;
            yield manager["handleTaskCompleted"](task);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid onCompletion configuration:", "Unrecognized onCompletion format");
            // 恢复原始方法
            console.warn = originalWarn;
        }));
        it("should handle executor execution failure", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "failing-task",
                content: "Task that will fail to delete",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task that will fail to delete 🏁 delete",
            };
            // Mock executeOnCompletion to throw an error
            const originalExecuteOnCompletion = manager.executeOnCompletion;
            manager.executeOnCompletion = jest
                .fn()
                .mockRejectedValue(new Error("Execution failed"));
            // 恢复原始 console.error
            const originalError = console.error;
            console.error = jest.fn();
            const consoleSpy = console.error;
            yield manager["handleTaskCompleted"](task);
            expect(consoleSpy).toHaveBeenCalledWith("Error executing onCompletion action:", expect.any(Error));
            // 恢复原始方法
            console.error = originalError;
            manager.executeOnCompletion = originalExecuteOnCompletion;
        }));
    });
    describe("Performance and Reliability", () => {
        it("should handle multiple rapid task completions", () => __awaiter(void 0, void 0, void 0, function* () {
            const tasks = Array.from({ length: 10 }, (_, i) => ({
                id: `task-${i}`,
                content: `Task ${i}`,
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: i + 1,
                filePath: "test.md",
                originalMarkdown: `- [x] Task ${i} 🏁 delete`,
            }));
            // Process all tasks simultaneously
            yield Promise.all(tasks.map((task) => manager["handleTaskCompleted"](task)));
            const deleteExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            expect(deleteExecutor === null || deleteExecutor === void 0 ? void 0 : deleteExecutor.execute).toHaveBeenCalledTimes(10);
        }));
        it("should handle mixed action types in rapid succession", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const tasks = [
                {
                    id: "delete-task",
                    content: "Delete task",
                    completed: true,
                    status: "x",
                    metadata: {
                        onCompletion: "delete",
                        tags: [],
                        children: [],
                    },
                    line: 1,
                    filePath: "test.md",
                    originalMarkdown: "- [x] Delete task 🏁 delete",
                },
                {
                    id: "move-task",
                    content: "Move task",
                    completed: true,
                    status: "x",
                    metadata: {
                        onCompletion: "move:archive.md",
                        tags: [],
                        children: [],
                    },
                    line: 2,
                    filePath: "test.md",
                    originalMarkdown: "- [x] Move task 🏁 move:archive.md",
                },
                {
                    id: "complete-task",
                    content: "Complete task",
                    completed: true,
                    status: "x",
                    metadata: {
                        onCompletion: "complete:related-1,related-2",
                        tags: [],
                        children: [],
                    },
                    line: 3,
                    filePath: "test.md",
                    originalMarkdown: "- [x] Complete task 🏁 complete:related-1,related-2",
                },
            ];
            yield Promise.all(tasks.map((task) => manager["handleTaskCompleted"](task)));
            expect((_a = manager["executors"].get(OnCompletionActionType.DELETE)) === null || _a === void 0 ? void 0 : _a.execute).toHaveBeenCalledTimes(1);
            expect((_b = manager["executors"].get(OnCompletionActionType.MOVE)) === null || _b === void 0 ? void 0 : _b.execute).toHaveBeenCalledTimes(1);
            expect((_c = manager["executors"].get(OnCompletionActionType.COMPLETE)) === null || _c === void 0 ? void 0 : _c.execute).toHaveBeenCalledTimes(1);
        }));
        it("should handle malformed JSON configurations", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "malformed-json-task",
                content: "Task with malformed JSON",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "move", "targetFile": "archive.md"',
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task with malformed JSON 🏁 move:archive.md",
            };
            // 恢复原始 console.warn
            const originalWarn = console.warn;
            console.warn = jest.fn();
            const consoleSpy = console.warn;
            yield manager["handleTaskCompleted"](task);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid onCompletion configuration:", expect.stringContaining("Parse error:"));
            // 恢复原始方法
            console.warn = originalWarn;
        }));
    });
    describe("Real-world Usage Scenarios", () => {
        it("should handle project completion workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            // Scenario: Project manager task that completes all subtasks and archives the project
            const projectTask = {
                id: "project-manager",
                content: "Complete project milestone",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "complete", "taskIds": ["design-task", "dev-task", "test-task"]}',
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "project.md",
                originalMarkdown: "- [x] Complete project milestone 🏁 complete:design-task,dev-task,test-task",
            };
            yield manager["handleTaskCompleted"](projectTask);
            const completeExecutor = manager["executors"].get(OnCompletionActionType.COMPLETE);
            expect(completeExecutor === null || completeExecutor === void 0 ? void 0 : completeExecutor.execute).toHaveBeenCalledWith(expect.any(Object), {
                type: OnCompletionActionType.COMPLETE,
                taskIds: ["design-task", "dev-task", "test-task"],
            });
        }));
        it("should handle recurring task workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            // Scenario: Weekly task that duplicates itself for next week
            const recurringTask = {
                id: "weekly-review",
                content: "Weekly team review",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "duplicate", "targetFile": "next-week.md", "preserveMetadata": true}',
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "this-week.md",
                originalMarkdown: "- [x] Weekly team review 🏁 duplicate:next-week.md",
            };
            yield manager["handleTaskCompleted"](recurringTask);
            const duplicateExecutor = manager["executors"].get(OnCompletionActionType.DUPLICATE);
            expect(duplicateExecutor === null || duplicateExecutor === void 0 ? void 0 : duplicateExecutor.execute).toHaveBeenCalledWith(expect.any(Object), {
                type: OnCompletionActionType.DUPLICATE,
                targetFile: "next-week.md",
                preserveMetadata: true,
            });
        }));
        it("should handle cleanup workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            // Scenario: Temporary task that deletes itself when done
            const tempTask = {
                id: "temp-reminder",
                content: "Temporary reminder - delete when done",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    tags: [],
                    children: [],
                },
                line: 5,
                filePath: "daily-notes.md",
                originalMarkdown: "- [x] Temporary reminder - delete when done 🏁 delete",
            };
            yield manager["handleTaskCompleted"](tempTask);
            const deleteExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            expect(deleteExecutor === null || deleteExecutor === void 0 ? void 0 : deleteExecutor.execute).toHaveBeenCalledWith(expect.any(Object), { type: OnCompletionActionType.DELETE });
        }));
        it("should handle archival workflow", () => __awaiter(void 0, void 0, void 0, function* () {
            // Scenario: Important task that moves to archive when completed
            const importantTask = {
                id: "important-milestone",
                content: "Important project milestone",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: '{"type": "move", "targetFile": "archive/2024-milestones.md", "targetSection": "Q1 Achievements"}',
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "current-milestones.md",
                originalMarkdown: "- [x] Important project milestone 🏁 move:archive/2024-milestones.md#Q1 Achievements",
            };
            yield manager["handleTaskCompleted"](importantTask);
            const moveExecutor = manager["executors"].get(OnCompletionActionType.MOVE);
            expect(moveExecutor === null || moveExecutor === void 0 ? void 0 : moveExecutor.execute).toHaveBeenCalledWith(expect.any(Object), {
                type: OnCompletionActionType.MOVE,
                targetFile: "archive/2024-milestones.md",
                targetSection: "Q1 Achievements",
            });
        }));
    });
    describe("Edge Cases and Error Recovery", () => {
        it("should handle empty onCompletion values", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "empty-oncompletion",
                content: "Task with empty onCompletion",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "",
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task with empty onCompletion 🏁 ",
            };
            // 恢复原始 console.warn
            const originalWarn = console.warn;
            console.warn = jest.fn();
            const consoleSpy = console.warn;
            yield manager["handleTaskCompleted"](task);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid onCompletion configuration:", "Empty or invalid onCompletion value");
            // 恢复原始方法
            console.warn = originalWarn;
        }));
        it("should handle null onCompletion values", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "null-oncompletion",
                content: "Task with null onCompletion",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: null,
                    tags: [],
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task with null onCompletion 🏁 ",
            };
            // 恢复原始 console.warn
            const originalWarn = console.warn;
            console.warn = jest.fn();
            const consoleSpy = console.warn;
            yield manager["handleTaskCompleted"](task);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid onCompletion configuration:", "Empty or invalid onCompletion value");
            // 恢复原始方法
            console.warn = originalWarn;
        }));
        it("should handle tasks with complex metadata", () => __awaiter(void 0, void 0, void 0, function* () {
            const task = {
                id: "complex-metadata-task",
                content: "Task with complex metadata",
                completed: true,
                status: "x",
                metadata: {
                    onCompletion: "delete",
                    priority: 3,
                    project: "test-project",
                    tags: ["important", "urgent"],
                    dueDate: Date.now(),
                    children: [],
                },
                line: 1,
                filePath: "test.md",
                originalMarkdown: "- [x] Task with complex metadata 🔼 #important #urgent #project/test-project 🏁 delete ",
            };
            yield manager["handleTaskCompleted"](task);
            const deleteExecutor = manager["executors"].get(OnCompletionActionType.DELETE);
            expect(deleteExecutor === null || deleteExecutor === void 0 ? void 0 : deleteExecutor.execute).toHaveBeenCalledWith({
                task,
                plugin: mockPlugin,
                app: mockApp,
            }, { type: OnCompletionActionType.DELETE });
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25Db21wbGV0aW9uLWludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvbkNvbXBsZXRpb24taW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzlELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRS9ELCtDQUErQztBQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDM0Qsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDekQsT0FBTyxFQUFFLElBQUk7YUFDWCxFQUFFLEVBQUU7YUFDSixpQkFBaUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBQy9ELGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztRQUMvQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUM7S0FDeEQsQ0FBQyxDQUFDO0NBQ0gsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFJLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0Qsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUk7YUFDWCxFQUFFLEVBQUU7YUFDSixpQkFBaUIsQ0FBQyxFQUFFLE9B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QVM7Z0JBQ25CLGdCQUFnQixFQUNmLHlGQUF5RjthQUMxRixDQUFDO1lBRUYsTUFBTSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUzQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUM5QyxzQkFBc0IsQ0FBQyxNQUFNLENBQzdCLENBQUM7WUFDRixNQUFNLENBQUMsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLE9BQU8sQ0FBQyxDQUFDLG9CQUFvQixDQUNuRDtnQkFDQyxJQUFJO2dCQUNKLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixHQUFHLEVBQUUsT0FBTzthQUNaLEVBQ0QsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQ3ZDLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBPbkNvbXBsZXRpb24gSW50ZWdyYXRpb24gVGVzdHNcclxuICpcclxuICogRW5kLXRvLWVuZCB0ZXN0cyBmb3Igb25Db21wbGV0aW9uIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nOlxyXG4gKiAtIENvbXBsZXRlIHdvcmtmbG93IGZyb20gdGFzayBjb21wbGV0aW9uIHRvIGFjdGlvbiBleGVjdXRpb25cclxuICogLSBJbnRlZ3JhdGlvbiBiZXR3ZWVuIE9uQ29tcGxldGlvbk1hbmFnZXIgYW5kIGFjdGlvbiBleGVjdXRvcnNcclxuICogLSBSZWFsLXdvcmxkIHVzYWdlIHNjZW5hcmlvc1xyXG4gKiAtIFBlcmZvcm1hbmNlIGNvbnNpZGVyYXRpb25zXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgT25Db21wbGV0aW9uTWFuYWdlciB9IGZyb20gXCIuLi9tYW5hZ2Vycy9jb21wbGV0aW9uLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IGNyZWF0ZU1vY2tQbHVnaW4sIGNyZWF0ZU1vY2tBcHAgfSBmcm9tIFwiLi9tb2NrVXRpbHNcIjtcclxuaW1wb3J0IHsgT25Db21wbGV0aW9uQWN0aW9uVHlwZSB9IGZyb20gXCIuLi90eXBlcy9vbkNvbXBsZXRpb25cIjtcclxuXHJcbi8vIE1vY2sgYWxsIHRoZSBhY3R1YWwgZXhlY3V0b3IgaW1wbGVtZW50YXRpb25zXHJcbmplc3QubW9jayhcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2RlbGV0ZS1leGVjdXRvclwiLCAoKSA9PiAoe1xyXG5cdERlbGV0ZUFjdGlvbkV4ZWN1dG9yOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICh7XHJcblx0XHRleGVjdXRlOiBqZXN0XHJcblx0XHRcdC5mbigpXHJcblx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiVGFzayBkZWxldGVkXCIgfSksXHJcblx0XHR2YWxpZGF0ZUNvbmZpZzogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZSh0cnVlKSxcclxuXHRcdGdldERlc2NyaXB0aW9uOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKFwiRGVsZXRlIHRhc2tcIiksXHJcblx0fSkpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9jb21wbGV0ZS1leGVjdXRvclwiLCAoKSA9PiAoe1xyXG5cdENvbXBsZXRlQWN0aW9uRXhlY3V0b3I6IGplc3QuZm4oKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gKHtcclxuXHRcdGV4ZWN1dGU6IGplc3RcclxuXHRcdFx0LmZuKClcclxuXHRcdFx0Lm1vY2tSZXNvbHZlZFZhbHVlKHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogXCJUYXNrcyBjb21wbGV0ZWRcIiB9KSxcclxuXHRcdHZhbGlkYXRlQ29uZmlnOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKHRydWUpLFxyXG5cdFx0Z2V0RGVzY3JpcHRpb246IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoXCJDb21wbGV0ZSByZWxhdGVkIHRhc2tzXCIpLFxyXG5cdH0pKSxcclxufSkpO1xyXG5cclxuamVzdC5tb2NrKFwiLi4vZXhlY3V0b3JzL2NvbXBsZXRpb24vbW92ZS1leGVjdXRvclwiLCAoKSA9PiAoe1xyXG5cdE1vdmVBY3Rpb25FeGVjdXRvcjogamVzdC5mbigpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiAoe1xyXG5cdFx0ZXhlY3V0ZTogamVzdFxyXG5cdFx0XHQuZm4oKVxyXG5cdFx0XHQubW9ja1Jlc29sdmVkVmFsdWUoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlRhc2sgbW92ZWRcIiB9KSxcclxuXHRcdHZhbGlkYXRlQ29uZmlnOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKHRydWUpLFxyXG5cdFx0Z2V0RGVzY3JpcHRpb246IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoXCJNb3ZlIHRhc2tcIiksXHJcblx0fSkpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9hcmNoaXZlLWV4ZWN1dG9yXCIsICgpID0+ICh7XHJcblx0QXJjaGl2ZUFjdGlvbkV4ZWN1dG9yOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICh7XHJcblx0XHRleGVjdXRlOiBqZXN0XHJcblx0XHRcdC5mbigpXHJcblx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiVGFzayBhcmNoaXZlZFwiIH0pLFxyXG5cdFx0dmFsaWRhdGVDb25maWc6IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUodHJ1ZSksXHJcblx0XHRnZXREZXNjcmlwdGlvbjogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShcIkFyY2hpdmUgdGFza1wiKSxcclxuXHR9KSksXHJcbn0pKTtcclxuXHJcbmplc3QubW9jayhcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2R1cGxpY2F0ZS1leGVjdXRvclwiLCAoKSA9PiAoe1xyXG5cdER1cGxpY2F0ZUFjdGlvbkV4ZWN1dG9yOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICh7XHJcblx0XHRleGVjdXRlOiBqZXN0XHJcblx0XHRcdC5mbigpXHJcblx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiVGFzayBkdXBsaWNhdGVkXCIgfSksXHJcblx0XHR2YWxpZGF0ZUNvbmZpZzogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZSh0cnVlKSxcclxuXHRcdGdldERlc2NyaXB0aW9uOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKFwiRHVwbGljYXRlIHRhc2tcIiksXHJcblx0fSkpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9rZWVwLWV4ZWN1dG9yXCIsICgpID0+ICh7XHJcblx0S2VlcEFjdGlvbkV4ZWN1dG9yOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICh7XHJcblx0XHRleGVjdXRlOiBqZXN0XHJcblx0XHRcdC5mbigpXHJcblx0XHRcdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiVGFzayBrZXB0XCIgfSksXHJcblx0XHR2YWxpZGF0ZUNvbmZpZzogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZSh0cnVlKSxcclxuXHRcdGdldERlc2NyaXB0aW9uOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKFwiS2VlcCB0YXNrXCIpLFxyXG5cdH0pKSxcclxufSkpO1xyXG5cclxuZGVzY3JpYmUoXCJPbkNvbXBsZXRpb24gSW50ZWdyYXRpb24gVGVzdHNcIiwgKCkgPT4ge1xyXG5cdGxldCBtYW5hZ2VyOiBPbkNvbXBsZXRpb25NYW5hZ2VyO1xyXG5cdGxldCBtb2NrQXBwOiBhbnk7XHJcblx0bGV0IG1vY2tQbHVnaW46IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cdFx0bW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oKTtcclxuXHJcblx0XHQvLyBNb2NrIHdvcmtzcGFjZSBldmVudHNcclxuXHRcdG1vY2tBcHAud29ya3NwYWNlID0ge1xyXG5cdFx0XHQuLi5tb2NrQXBwLndvcmtzcGFjZSxcclxuXHRcdFx0b246IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoeyB1bmxvYWQ6IGplc3QuZm4oKSB9KSxcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTW9jayBwbHVnaW4gZXZlbnQgcmVnaXN0cmF0aW9uXHJcblx0XHRtb2NrUGx1Z2luLnJlZ2lzdGVyRXZlbnQgPSBqZXN0LmZuKCk7XHJcblxyXG5cdFx0bWFuYWdlciA9IG5ldyBPbkNvbXBsZXRpb25NYW5hZ2VyKG1vY2tBcHAsIG1vY2tQbHVnaW4pO1xyXG5cdFx0bWFuYWdlci5vbmxvYWQoKTtcclxuXHR9KTtcclxuXHJcblx0YWZ0ZXJFYWNoKCgpID0+IHtcclxuXHRcdG1hbmFnZXIudW5sb2FkKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRW5kLXRvLUVuZCBXb3JrZmxvdyBUZXN0c1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgY29tcGxldGUgZGVsZXRlIHdvcmtmbG93XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJkZWxldGUtdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB0byBkZWxldGUgb24gY29tcGxldGlvblwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiZGVsZXRlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gW3hdIFRhc2sgdG8gZGVsZXRlIG9uIGNvbXBsZXRpb24g8J+PgSBkZWxldGVcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFNpbXVsYXRlIHRhc2sgY29tcGxldGlvbiBldmVudFxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgZGVsZXRlIGV4ZWN1dG9yIHdhcyBjYWxsZWRcclxuXHRcdFx0Y29uc3QgZGVsZXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZGVsZXRlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFIH1cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBjb21wbGV0ZSB0YXNrIGNvbXBsZXRpb24gd29ya2Zsb3dcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcIm1haW4tdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiTWFpbiB0YXNrIHRoYXQgY29tcGxldGVzIG90aGVyc1wiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiY29tcGxldGU6c3VidGFzay0xLHN1YnRhc2stMixzdWJ0YXNrLTNcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gTWFpbiB0YXNrIHRoYXQgY29tcGxldGVzIG90aGVycyDwn4+BIGNvbXBsZXRlOnN1YnRhc2stMSxzdWJ0YXNrLTIsc3VidGFzay0zXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChjb21wbGV0ZUV4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YXNrLFxyXG5cdFx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHRcdHRhc2tJZHM6IFtcInN1YnRhc2stMVwiLCBcInN1YnRhc2stMlwiLCBcInN1YnRhc2stM1wiXSxcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbW92ZSB3b3JrZmxvdyB3aXRoIEpTT04gY29uZmlndXJhdGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibW92ZS10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHRvIG1vdmUgdG8gYXJjaGl2ZVwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246XHJcblx0XHRcdFx0XHRcdCd7XCJ0eXBlXCI6IFwibW92ZVwiLCBcInRhcmdldEZpbGVcIjogXCJhcmNoaXZlL2NvbXBsZXRlZC5tZFwiLCBcInRhcmdldFNlY3Rpb25cIjogXCJEb25lXCJ9JyxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogNSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJjdXJyZW50Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGFzayB0byBtb3ZlIHRvIGFyY2hpdmUg8J+PgSBtb3ZlOmFyY2hpdmUvY29tcGxldGVkLm1kI0RvbmVcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgbW92ZUV4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb3ZlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiBcImFyY2hpdmUvY29tcGxldGVkLm1kXCIsXHJcblx0XHRcdFx0XHR0YXJnZXRTZWN0aW9uOiBcIkRvbmVcIixcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgYXJjaGl2ZSB3b3JrZmxvd1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiYXJjaGl2ZS10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHRvIGFyY2hpdmVcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImFyY2hpdmU6b2xkLXRhc2tzLm1kXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDMsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiYWN0aXZlLm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGFzayB0byBhcmNoaXZlIPCfj4EgYXJjaGl2ZTpvbGQtdGFza3MubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgYXJjaGl2ZUV4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChhcmNoaXZlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsXHJcblx0XHRcdFx0XHRhcmNoaXZlRmlsZTogXCJvbGQtdGFza3MubWRcIixcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZHVwbGljYXRlIHdvcmtmbG93XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZW1wbGF0ZS10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZW1wbGF0ZSB0YXNrIHRvIGR1cGxpY2F0ZVwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiZHVwbGljYXRlOnRlbXBsYXRlcy9yZWN1cnJpbmcubWRcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ3ZWVrbHkubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBUZW1wbGF0ZSB0YXNrIHRvIGR1cGxpY2F0ZSDwn4+BIGR1cGxpY2F0ZTp0ZW1wbGF0ZXMvcmVjdXJyaW5nLm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKTtcclxuXHJcblx0XHRcdGNvbnN0IGR1cGxpY2F0ZUV4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEVcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGR1cGxpY2F0ZUV4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YXNrLFxyXG5cdFx0XHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRcdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiBcInRlbXBsYXRlcy9yZWN1cnJpbmcubWRcIixcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUga2VlcCB3b3JrZmxvdyAobm8gYWN0aW9uKVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwia2VlcC10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHRvIGtlZXAgaW4gcGxhY2VcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImtlZXBcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpbXBvcnRhbnQubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIFRhc2sgdG8ga2VlcCBpbiBwbGFjZSDwn4+BIGtlZXBcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3Qga2VlcEV4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5LRUVQXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChrZWVwRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCB9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb21wbGV4IFNjZW5hcmlvc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFzayB3aXRob3V0IG9uQ29tcGxldGlvbiBtZXRhZGF0YVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibm9ybWFsLXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIk5vcm1hbCB0YXNrIHdpdGhvdXQgb25Db21wbGV0aW9uXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBOb3JtYWwgdGFzayB3aXRob3V0IG9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0odGFzayk7XHJcblxyXG5cdFx0XHQvLyBObyBleGVjdXRvcnMgc2hvdWxkIGJlIGNhbGxlZFxyXG5cdFx0XHRPYmplY3QudmFsdWVzKG1hbmFnZXJbXCJleGVjdXRvcnNcIl0pLmZvckVhY2goKGV4ZWN1dG9yKSA9PiB7XHJcblx0XHRcdFx0ZXhwZWN0KGV4ZWN1dG9yLmV4ZWN1dGUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGludmFsaWQgb25Db21wbGV0aW9uIGNvbmZpZ3VyYXRpb24gZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaW52YWxpZC10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggaW52YWxpZCBvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImludmFsaWQtYWN0aW9uLXR5cGVcIixcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGFzayB3aXRoIGludmFsaWQgb25Db21wbGV0aW9uIPCfj4EgaW52YWxpZC1hY3Rpb24tdHlwZVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeLIGNvbnNvbGUud2FyblxyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XHJcblx0XHRcdGNvbnNvbGUud2FybiA9IGplc3QuZm4oKTtcclxuXHRcdFx0Y29uc3QgY29uc29sZVNweSA9IGNvbnNvbGUud2FybjtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGNvbnNvbGVTcHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdFwiSW52YWxpZCBvbkNvbXBsZXRpb24gY29uZmlndXJhdGlvbjpcIixcclxuXHRcdFx0XHRcIlVucmVjb2duaXplZCBvbkNvbXBsZXRpb24gZm9ybWF0XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIOaBouWkjeWOn+Wni+aWueazlVxyXG5cdFx0XHRjb25zb2xlLndhcm4gPSBvcmlnaW5hbFdhcm47XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZXhlY3V0b3IgZXhlY3V0aW9uIGZhaWx1cmVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImZhaWxpbmctdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB0aGF0IHdpbGwgZmFpbCB0byBkZWxldGVcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBUYXNrIHRoYXQgd2lsbCBmYWlsIHRvIGRlbGV0ZSDwn4+BIGRlbGV0ZVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gTW9jayBleGVjdXRlT25Db21wbGV0aW9uIHRvIHRocm93IGFuIGVycm9yXHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsRXhlY3V0ZU9uQ29tcGxldGlvbiA9IG1hbmFnZXIuZXhlY3V0ZU9uQ29tcGxldGlvbjtcclxuXHRcdFx0bWFuYWdlci5leGVjdXRlT25Db21wbGV0aW9uID0gamVzdFxyXG5cdFx0XHRcdC5mbigpXHJcblx0XHRcdFx0Lm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcihcIkV4ZWN1dGlvbiBmYWlsZWRcIikpO1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeLIGNvbnNvbGUuZXJyb3JcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IgPSBqZXN0LmZuKCk7XHJcblx0XHRcdGNvbnN0IGNvbnNvbGVTcHkgPSBjb25zb2xlLmVycm9yO1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0odGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QoY29uc29sZVNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0XCJFcnJvciBleGVjdXRpbmcgb25Db21wbGV0aW9uIGFjdGlvbjpcIixcclxuXHRcdFx0XHRleHBlY3QuYW55KEVycm9yKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeL5pa55rOVXHJcblx0XHRcdGNvbnNvbGUuZXJyb3IgPSBvcmlnaW5hbEVycm9yO1xyXG5cdFx0XHRtYW5hZ2VyLmV4ZWN1dGVPbkNvbXBsZXRpb24gPSBvcmlnaW5hbEV4ZWN1dGVPbkNvbXBsZXRpb247XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQZXJmb3JtYW5jZSBhbmQgUmVsaWFiaWxpdHlcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG11bHRpcGxlIHJhcGlkIHRhc2sgY29tcGxldGlvbnNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogMTAgfSwgKF8sIGkpID0+ICh7XHJcblx0XHRcdFx0aWQ6IGB0YXNrLSR7aX1gLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IGBUYXNrICR7aX1gLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiZGVsZXRlXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IGkgKyAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBgLSBbeF0gVGFzayAke2l9IPCfj4EgZGVsZXRlYCxcclxuXHRcdFx0fSkpO1xyXG5cclxuXHRcdFx0Ly8gUHJvY2VzcyBhbGwgdGFza3Mgc2ltdWx0YW5lb3VzbHlcclxuXHRcdFx0YXdhaXQgUHJvbWlzZS5hbGwoXHJcblx0XHRcdFx0dGFza3MubWFwKCh0YXNrKSA9PiBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGRlbGV0ZUV4ZWN1dG9yID0gbWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoXHJcblx0XHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEVcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGRlbGV0ZUV4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMTApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG1peGVkIGFjdGlvbiB0eXBlcyBpbiByYXBpZCBzdWNjZXNzaW9uXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJkZWxldGUtdGFza1wiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJEZWxldGUgdGFza1wiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdG9uQ29tcGxldGlvbjogXCJkZWxldGVcIixcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBEZWxldGUgdGFzayDwn4+BIGRlbGV0ZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwibW92ZS10YXNrXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIk1vdmUgdGFza1wiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdG9uQ29tcGxldGlvbjogXCJtb3ZlOmFyY2hpdmUubWRcIixcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBNb3ZlIHRhc2sg8J+PgSBtb3ZlOmFyY2hpdmUubWRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImNvbXBsZXRlLXRhc2tcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiQ29tcGxldGUgdGFza1wiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdG9uQ29tcGxldGlvbjogXCJjb21wbGV0ZTpyZWxhdGVkLTEscmVsYXRlZC0yXCIsXHJcblx0XHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0bGluZTogMyxcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcdFwiLSBbeF0gQ29tcGxldGUgdGFzayDwn4+BIGNvbXBsZXRlOnJlbGF0ZWQtMSxyZWxhdGVkLTJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0YXdhaXQgUHJvbWlzZS5hbGwoXHJcblx0XHRcdFx0dGFza3MubWFwKCh0YXNrKSA9PiBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSk/LmV4ZWN1dGVcclxuXHRcdFx0KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkUpPy5leGVjdXRlXHJcblx0XHRcdCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xyXG5cdFx0XHRleHBlY3QoXHJcblx0XHRcdFx0bWFuYWdlcltcImV4ZWN1dG9yc1wiXS5nZXQoT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSlcclxuXHRcdFx0XHRcdD8uZXhlY3V0ZVxyXG5cdFx0XHQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtYWxmb3JtZWQgSlNPTiBjb25maWd1cmF0aW9uc1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwibWFsZm9ybWVkLWpzb24tdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB3aXRoIG1hbGZvcm1lZCBKU09OXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbjogJ3tcInR5cGVcIjogXCJtb3ZlXCIsIFwidGFyZ2V0RmlsZVwiOiBcImFyY2hpdmUubWRcIicsIC8vIE1pc3NpbmcgY2xvc2luZyBicmFjZVxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBUYXNrIHdpdGggbWFsZm9ybWVkIEpTT04g8J+PgSBtb3ZlOmFyY2hpdmUubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIOaBouWkjeWOn+WniyBjb25zb2xlLndhcm5cclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxXYXJuID0gY29uc29sZS53YXJuO1xyXG5cdFx0XHRjb25zb2xlLndhcm4gPSBqZXN0LmZuKCk7XHJcblx0XHRcdGNvbnN0IGNvbnNvbGVTcHkgPSBjb25zb2xlLndhcm47XHJcblxyXG5cdFx0XHRhd2FpdCBtYW5hZ2VyW1wiaGFuZGxlVGFza0NvbXBsZXRlZFwiXSh0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChjb25zb2xlU3B5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRcIkludmFsaWQgb25Db21wbGV0aW9uIGNvbmZpZ3VyYXRpb246XCIsXHJcblx0XHRcdFx0ZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoXCJQYXJzZSBlcnJvcjpcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIOaBouWkjeWOn+Wni+aWueazlVxyXG5cdFx0XHRjb25zb2xlLndhcm4gPSBvcmlnaW5hbFdhcm47XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJSZWFsLXdvcmxkIFVzYWdlIFNjZW5hcmlvc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgcHJvamVjdCBjb21wbGV0aW9uIHdvcmtmbG93XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2NlbmFyaW86IFByb2plY3QgbWFuYWdlciB0YXNrIHRoYXQgY29tcGxldGVzIGFsbCBzdWJ0YXNrcyBhbmQgYXJjaGl2ZXMgdGhlIHByb2plY3RcclxuXHRcdFx0Y29uc3QgcHJvamVjdFRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicHJvamVjdC1tYW5hZ2VyXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJDb21wbGV0ZSBwcm9qZWN0IG1pbGVzdG9uZVwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246XHJcblx0XHRcdFx0XHRcdCd7XCJ0eXBlXCI6IFwiY29tcGxldGVcIiwgXCJ0YXNrSWRzXCI6IFtcImRlc2lnbi10YXNrXCIsIFwiZGV2LXRhc2tcIiwgXCJ0ZXN0LXRhc2tcIl19JyxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gQ29tcGxldGUgcHJvamVjdCBtaWxlc3RvbmUg8J+PgSBjb21wbGV0ZTpkZXNpZ24tdGFzayxkZXYtdGFzayx0ZXN0LXRhc2tcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHByb2plY3RUYXNrKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChjb21wbGV0ZUV4ZWN1dG9yPy5leGVjdXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHRleHBlY3QuYW55KE9iamVjdCksXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0XHRcdHRhc2tJZHM6IFtcImRlc2lnbi10YXNrXCIsIFwiZGV2LXRhc2tcIiwgXCJ0ZXN0LXRhc2tcIl0sXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHJlY3VycmluZyB0YXNrIHdvcmtmbG93XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2NlbmFyaW86IFdlZWtseSB0YXNrIHRoYXQgZHVwbGljYXRlcyBpdHNlbGYgZm9yIG5leHQgd2Vla1xyXG5cdFx0XHRjb25zdCByZWN1cnJpbmdUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcIndlZWtseS1yZXZpZXdcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIldlZWtseSB0ZWFtIHJldmlld1wiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246XHJcblx0XHRcdFx0XHRcdCd7XCJ0eXBlXCI6IFwiZHVwbGljYXRlXCIsIFwidGFyZ2V0RmlsZVwiOiBcIm5leHQtd2Vlay5tZFwiLCBcInByZXNlcnZlTWV0YWRhdGFcIjogdHJ1ZX0nLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRoaXMtd2Vlay5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gW3hdIFdlZWtseSB0ZWFtIHJldmlldyDwn4+BIGR1cGxpY2F0ZTpuZXh0LXdlZWsubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHJlY3VycmluZ1Rhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgZHVwbGljYXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZHVwbGljYXRlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdGV4cGVjdC5hbnkoT2JqZWN0KSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwibmV4dC13ZWVrLm1kXCIsXHJcblx0XHRcdFx0XHRwcmVzZXJ2ZU1ldGFkYXRhOiB0cnVlLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBjbGVhbnVwIHdvcmtmbG93XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gU2NlbmFyaW86IFRlbXBvcmFyeSB0YXNrIHRoYXQgZGVsZXRlcyBpdHNlbGYgd2hlbiBkb25lXHJcblx0XHRcdGNvbnN0IHRlbXBUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlbXAtcmVtaW5kZXJcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlbXBvcmFyeSByZW1pbmRlciAtIGRlbGV0ZSB3aGVuIGRvbmVcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsaW5lOiA1LFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcImRhaWx5LW5vdGVzLm1kXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjpcclxuXHRcdFx0XHRcdFwiLSBbeF0gVGVtcG9yYXJ5IHJlbWluZGVyIC0gZGVsZXRlIHdoZW4gZG9uZSDwn4+BIGRlbGV0ZVwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0odGVtcFRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgZGVsZXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZGVsZXRlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdGV4cGVjdC5hbnkoT2JqZWN0KSxcclxuXHRcdFx0XHR7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFIH1cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBhcmNoaXZhbCB3b3JrZmxvd1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIFNjZW5hcmlvOiBJbXBvcnRhbnQgdGFzayB0aGF0IG1vdmVzIHRvIGFyY2hpdmUgd2hlbiBjb21wbGV0ZWRcclxuXHRcdFx0Y29uc3QgaW1wb3J0YW50VGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpbXBvcnRhbnQtbWlsZXN0b25lXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJJbXBvcnRhbnQgcHJvamVjdCBtaWxlc3RvbmVcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOlxyXG5cdFx0XHRcdFx0XHQne1widHlwZVwiOiBcIm1vdmVcIiwgXCJ0YXJnZXRGaWxlXCI6IFwiYXJjaGl2ZS8yMDI0LW1pbGVzdG9uZXMubWRcIiwgXCJ0YXJnZXRTZWN0aW9uXCI6IFwiUTEgQWNoaWV2ZW1lbnRzXCJ9JyxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJjdXJyZW50LW1pbGVzdG9uZXMubWRcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRcdFx0XCItIFt4XSBJbXBvcnRhbnQgcHJvamVjdCBtaWxlc3RvbmUg8J+PgSBtb3ZlOmFyY2hpdmUvMjAyNC1taWxlc3RvbmVzLm1kI1ExIEFjaGlldmVtZW50c1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0oaW1wb3J0YW50VGFzayk7XHJcblxyXG5cdFx0XHRjb25zdCBtb3ZlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkVcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG1vdmVFeGVjdXRvcj8uZXhlY3V0ZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0ZXhwZWN0LmFueShPYmplY3QpLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwiYXJjaGl2ZS8yMDI0LW1pbGVzdG9uZXMubWRcIixcclxuXHRcdFx0XHRcdHRhcmdldFNlY3Rpb246IFwiUTEgQWNoaWV2ZW1lbnRzXCIsXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRWRnZSBDYXNlcyBhbmQgRXJyb3IgUmVjb3ZlcnlcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGVtcHR5IG9uQ29tcGxldGlvbiB2YWx1ZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImVtcHR5LW9uY29tcGxldGlvblwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB3aXRoIGVtcHR5IG9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRvbkNvbXBsZXRpb246IFwiXCIsXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGFzayB3aXRoIGVtcHR5IG9uQ29tcGxldGlvbiDwn4+BIFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeLIGNvbnNvbGUud2FyblxyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XHJcblx0XHRcdGNvbnNvbGUud2FybiA9IGplc3QuZm4oKTtcclxuXHRcdFx0Y29uc3QgY29uc29sZVNweSA9IGNvbnNvbGUud2FybjtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGNvbnNvbGVTcHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdFwiSW52YWxpZCBvbkNvbXBsZXRpb24gY29uZmlndXJhdGlvbjpcIixcclxuXHRcdFx0XHRcIkVtcHR5IG9yIGludmFsaWQgb25Db21wbGV0aW9uIHZhbHVlXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIOaBouWkjeWOn+Wni+aWueazlVxyXG5cdFx0XHRjb25zb2xlLndhcm4gPSBvcmlnaW5hbFdhcm47XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbnVsbCBvbkNvbXBsZXRpb24gdmFsdWVzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJudWxsLW9uY29tcGxldGlvblwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB3aXRoIG51bGwgb25Db21wbGV0aW9uXCIsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbjogbnVsbCBhcyBhbnksXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGFzayB3aXRoIG51bGwgb25Db21wbGV0aW9uIPCfj4EgXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyDmgaLlpI3ljp/lp4sgY29uc29sZS53YXJuXHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsV2FybiA9IGNvbnNvbGUud2FybjtcclxuXHRcdFx0Y29uc29sZS53YXJuID0gamVzdC5mbigpO1xyXG5cdFx0XHRjb25zdCBjb25zb2xlU3B5ID0gY29uc29sZS53YXJuO1xyXG5cclxuXHRcdFx0YXdhaXQgbWFuYWdlcltcImhhbmRsZVRhc2tDb21wbGV0ZWRcIl0odGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QoY29uc29sZVNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0XCJJbnZhbGlkIG9uQ29tcGxldGlvbiBjb25maWd1cmF0aW9uOlwiLFxyXG5cdFx0XHRcdFwiRW1wdHkgb3IgaW52YWxpZCBvbkNvbXBsZXRpb24gdmFsdWVcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8g5oGi5aSN5Y6f5aeL5pa55rOVXHJcblx0XHRcdGNvbnNvbGUud2FybiA9IG9yaWdpbmFsV2FybjtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB0YXNrcyB3aXRoIGNvbXBsZXggbWV0YWRhdGFcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImNvbXBsZXgtbWV0YWRhdGEtdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB3aXRoIGNvbXBsZXggbWV0YWRhdGFcIixcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0b25Db21wbGV0aW9uOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRcdFx0cHJpb3JpdHk6IDMsXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBcInRlc3QtcHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0dGFnczogW1wiaW1wb3J0YW50XCIsIFwidXJnZW50XCJdLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gW3hdIFRhc2sgd2l0aCBjb21wbGV4IG1ldGFkYXRhIPCflLwgI2ltcG9ydGFudCAjdXJnZW50ICNwcm9qZWN0L3Rlc3QtcHJvamVjdCDwn4+BIGRlbGV0ZSBcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGF3YWl0IG1hbmFnZXJbXCJoYW5kbGVUYXNrQ29tcGxldGVkXCJdKHRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgZGVsZXRlRXhlY3V0b3IgPSBtYW5hZ2VyW1wiZXhlY3V0b3JzXCJdLmdldChcclxuXHRcdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QoZGVsZXRlRXhlY3V0b3I/LmV4ZWN1dGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRwbHVnaW46IG1vY2tQbHVnaW4sXHJcblx0XHRcdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFIH1cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19