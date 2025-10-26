/**
 * DeleteActionExecutor Tests
 *
 * Tests for delete action executor functionality including:
 * - Task deletion from file system
 * - Configuration validation
 * - Error handling
 */
import { __awaiter } from "tslib";
import { DeleteActionExecutor } from "../executors/completion/delete-executor";
import { OnCompletionActionType, } from "../types/onCompletion";
import { createMockPlugin, createMockApp } from "./mockUtils";
// Mock Obsidian vault operations
const mockVault = {
    read: jest.fn(),
    modify: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getFileByPath: jest.fn(),
};
const mockApp = Object.assign(Object.assign({}, createMockApp()), { vault: mockVault });
describe("DeleteActionExecutor", () => {
    let executor;
    let mockTask;
    let mockContext;
    let mockPlugin;
    let mockApp;
    beforeEach(() => {
        executor = new DeleteActionExecutor();
        mockTask = {
            id: "test-task-id",
            content: "Test task to delete",
            completed: true,
            status: "x",
            metadata: {
                tags: [],
                children: [],
                onCompletion: "delete",
            },
            originalMarkdown: "- [x] Test task to delete 🏁 delete",
            line: 5,
            filePath: "test.md",
        };
        // Create fresh mock instances for each test
        mockPlugin = createMockPlugin();
        mockApp = createMockApp();
        mockContext = {
            task: mockTask,
            plugin: mockPlugin,
            app: mockApp,
        };
        // Reset mocks
        jest.clearAllMocks();
    });
    describe("Configuration Validation", () => {
        it("should validate correct delete configuration", () => {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            expect(executor["validateConfig"](config)).toBe(true);
        });
        it("should reject configuration with wrong type", () => {
            const config = {
                type: OnCompletionActionType.KEEP,
            };
            expect(executor["validateConfig"](config)).toBe(false);
        });
        it("should reject configuration without type", () => {
            const config = {};
            expect(executor["validateConfig"](config)).toBe(false);
        });
    });
    describe("Task Deletion", () => {
        let config;
        beforeEach(() => {
            config = { type: OnCompletionActionType.DELETE };
        });
        it("should delete task from file successfully", () => __awaiter(void 0, void 0, void 0, function* () {
            const fileContent = `# Test File

- [ ] Keep this task
- [x] Test task to delete
- [ ] Keep this task too`;
            const expectedContent = `# Test File

- [ ] Keep this task
- [ ] Keep this task too`;
            // Add originalMarkdown to the task for proper matching
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Task deleted successfully");
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
        it("should handle task not found in file", () => __awaiter(void 0, void 0, void 0, function* () {
            const fileContent = `# Test File

- [ ] Some other task
- [ ] Another task`;
            // Set originalMarkdown that won't be found in the file
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Task not found in file");
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        }));
        it("should handle file not found", () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.getFileByPath.mockReturnValue(null);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("File not found: test.md");
            expect(mockApp.vault.read).not.toHaveBeenCalled();
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        }));
        it("should handle file read error", () => __awaiter(void 0, void 0, void 0, function* () {
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockRejectedValue(new Error("Read permission denied"));
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to delete task: Read permission denied");
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        }));
        it("should handle file write error", () => __awaiter(void 0, void 0, void 0, function* () {
            const fileContent = `- [x] Test task to delete`;
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockRejectedValue(new Error("Write permission denied"));
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to delete task: Write permission denied");
        }));
        it("should handle complex task content with special characters", () => __awaiter(void 0, void 0, void 0, function* () {
            const taskWithSpecialChars = Object.assign(Object.assign({}, mockTask), { content: "Task with [special] (characters) & symbols #tag @context", originalMarkdown: "- [x] Task with [special] (characters) & symbols #tag @context" });
            const contextWithSpecialTask = Object.assign(Object.assign({}, mockContext), { task: taskWithSpecialChars });
            const fileContent = `# Test File

- [x] Task with [special] (characters) & symbols #tag @context
- [ ] Normal task`;
            const expectedContent = `# Test File

- [ ] Normal task`;
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(contextWithSpecialTask, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Task deleted successfully");
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
        it("should handle nested task deletion", () => __awaiter(void 0, void 0, void 0, function* () {
            const fileContent = `# Test File

- [ ] Parent task
  - [x] Test task to delete
  - [ ] Sibling task
- [ ] Another parent task`;
            const expectedContent = `# Test File

- [ ] Parent task
  - [ ] Sibling task
- [ ] Another parent task`;
            mockTask.originalMarkdown = "  - [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Task deleted successfully");
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
        it("should preserve empty lines and formatting", () => __awaiter(void 0, void 0, void 0, function* () {
            const fileContent = `# Test File

Some text here.

- [ ] Keep this task

- [x] Test task to delete

- [ ] Keep this task too

More text here.`;
            const expectedContent = `# Test File

Some text here.

- [ ] Keep this task

- [ ] Keep this task too

More text here.`;
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
    });
    describe("Invalid Configuration Handling", () => {
        it("should return error for invalid configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = {
                type: OnCompletionActionType.KEEP,
            };
            const result = yield executor.execute(mockContext, invalidConfig);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Invalid configuration");
            expect(mockApp.vault.getFileByPath).not.toHaveBeenCalled();
        }));
    });
    describe("Description Generation", () => {
        it("should return correct description", () => {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const description = executor.getDescription(config);
            expect(description).toBe("Delete the completed task from the file");
        });
    });
    describe("Edge Cases", () => {
        it("should handle empty file", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue("");
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(false);
            expect(result.error).toBe("Task not found in file");
        }));
        it("should handle file with only the target task", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const fileContent = "- [x] Test task to delete";
            const expectedContent = "";
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
        it("should handle multiple identical tasks (delete first occurrence)", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                type: OnCompletionActionType.DELETE,
            };
            const fileContent = `- [x] Test task to delete
- [ ] Other task
- [x] Test task to delete`;
            const expectedContent = `- [ ] Other task
- [x] Test task to delete`;
            mockTask.originalMarkdown = "- [x] Test task to delete";
            mockApp.vault.getFileByPath.mockReturnValue({
                path: "test.md",
            });
            mockApp.vault.read.mockResolvedValue(fileContent);
            mockApp.vault.modify.mockResolvedValue(undefined);
            const result = yield executor.execute(mockContext, config);
            expect(result.success).toBe(true);
            expect(mockApp.vault.modify).toHaveBeenCalledWith({ path: "test.md" }, expectedContent);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVsZXRlQWN0aW9uRXhlY3V0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRlbGV0ZUFjdGlvbkV4ZWN1dG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7R0FPRzs7QUFFSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRSxPQUFPLEVBQ04sc0JBQXNCLEdBR3RCLE1BQU0sdUJBQXVCLENBQUM7QUFFL0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUU5RCxpQ0FBaUM7QUFDakMsTUFBTSxTQUFTLEdBQUc7SUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNqQixxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2hDLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ3hCLENBQUM7QUFFRixNQUFNLE9BQU8sbUNBQ1QsYUFBYSxFQUFFLEtBQ2xCLEtBQUssRUFBRSxTQUFTLEdBQ2hCLENBQUM7QUFFRixRQUFRLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLElBQUksUUFBOEIsQ0FBQztJQUNuQyxJQUFJLFFBQWMsQ0FBQztJQUNuQixJQUFJLFdBQXlDLENBQUM7SUFDOUMsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFZLENBQUM7SUFFakIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFFdEMsUUFBUSxHQUFHO1lBQ1YsRUFBRSxFQUFFLGNBQWM7WUFDbEIsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixTQUFTLEVBQUUsSUFBSTtZQUNmLE1BQU0sRUFBRSxHQUFHO1lBQ1gsUUFBUSxFQUFFO2dCQUNULElBQUksRUFBRSxFQUFFO2dCQUNSLFFBQVEs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Q2hELEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUNuQixlQUFlLENBQ2YsQ0FBQztRQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsa0VBQWtFLEVBQUUsR0FBUyxFQUFFO1lBQ2pGLE1BQU0sTUFBTSxHQUE2QjtnQkFDeEMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLE1BQU07YUFDbkMsQ0FBQztZQUVGLE1BQU0sV0FBVyxHQUFHOzswQkFFRyxDQUFDO1lBRXhCLE1BQU0sZUFBZSxHQUFHOzBCQUNELENBQUM7WUFFeEIsUUFBUSxDQUFDLGdCQUFnQixHQUFHLDJCQUEyQixDQUFDO1lBRXhELE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQztnQkFDM0MsSUFBSSxFQUFFLFNBQVM7YUFDZixDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVsRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTNELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLG9CQUFvQixDQUNoRCxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDbkIsZUFBZSxDQUNmLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEZWxldGVBY3Rpb25FeGVjdXRvciBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyBmb3IgZGVsZXRlIGFjdGlvbiBleGVjdXRvciBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBUYXNrIGRlbGV0aW9uIGZyb20gZmlsZSBzeXN0ZW1cclxuICogLSBDb25maWd1cmF0aW9uIHZhbGlkYXRpb25cclxuICogLSBFcnJvciBoYW5kbGluZ1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IERlbGV0ZUFjdGlvbkV4ZWN1dG9yIH0gZnJvbSBcIi4uL2V4ZWN1dG9ycy9jb21wbGV0aW9uL2RlbGV0ZS1leGVjdXRvclwiO1xyXG5pbXBvcnQge1xyXG5cdE9uQ29tcGxldGlvbkFjdGlvblR5cGUsXHJcblx0T25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dCxcclxuXHRPbkNvbXBsZXRpb25EZWxldGVDb25maWcsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL29uQ29tcGxldGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja1BsdWdpbiwgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiB2YXVsdCBvcGVyYXRpb25zXHJcbmNvbnN0IG1vY2tWYXVsdCA9IHtcclxuXHRyZWFkOiBqZXN0LmZuKCksXHJcblx0bW9kaWZ5OiBqZXN0LmZuKCksXHJcblx0Z2V0QWJzdHJhY3RGaWxlQnlQYXRoOiBqZXN0LmZuKCksXHJcblx0Z2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG59O1xyXG5cclxuY29uc3QgbW9ja0FwcCA9IHtcclxuXHQuLi5jcmVhdGVNb2NrQXBwKCksXHJcblx0dmF1bHQ6IG1vY2tWYXVsdCxcclxufTtcclxuXHJcbmRlc2NyaWJlKFwiRGVsZXRlQWN0aW9uRXhlY3V0b3JcIiwgKCkgPT4ge1xyXG5cdGxldCBleGVjdXRvcjogRGVsZXRlQWN0aW9uRXhlY3V0b3I7XHJcblx0bGV0IG1vY2tUYXNrOiBUYXNrO1xyXG5cdGxldCBtb2NrQ29udGV4dDogT25Db21wbGV0aW9uRXhlY3V0aW9uQ29udGV4dDtcclxuXHRsZXQgbW9ja1BsdWdpbjogYW55O1xyXG5cdGxldCBtb2NrQXBwOiBhbnk7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0ZXhlY3V0b3IgPSBuZXcgRGVsZXRlQWN0aW9uRXhlY3V0b3IoKTtcclxuXHJcblx0XHRtb2NrVGFzayA9IHtcclxuXHRcdFx0aWQ6IFwidGVzdC10YXNrLWlkXCIsXHJcblx0XHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrIHRvIGRlbGV0ZVwiLFxyXG5cdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdG9uQ29tcGxldGlvbjogXCJkZWxldGVcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlIPCfj4EgZGVsZXRlXCIsXHJcblx0XHRcdGxpbmU6IDUsXHJcblx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGZyZXNoIG1vY2sgaW5zdGFuY2VzIGZvciBlYWNoIHRlc3RcclxuXHRcdG1vY2tQbHVnaW4gPSBjcmVhdGVNb2NrUGx1Z2luKCk7XHJcblx0XHRtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cclxuXHRcdG1vY2tDb250ZXh0ID0ge1xyXG5cdFx0XHR0YXNrOiBtb2NrVGFzayxcclxuXHRcdFx0cGx1Z2luOiBtb2NrUGx1Z2luLFxyXG5cdFx0XHRhcHA6IG1vY2tBcHAsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlc2V0IG1vY2tzXHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgY29ycmVjdCBkZWxldGUgY29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uRGVsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KGV4ZWN1dG9yW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlamVjdCBjb25maWd1cmF0aW9uIHdpdGggd3JvbmcgdHlwZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLktFRVAsXHJcblx0XHRcdH0gYXMgYW55O1xyXG5cclxuXHRcdFx0ZXhwZWN0KGV4ZWN1dG9yW1widmFsaWRhdGVDb25maWdcIl0oY29uZmlnKSkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZWplY3QgY29uZmlndXJhdGlvbiB3aXRob3V0IHR5cGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSB7fSBhcyBhbnk7XHJcblxyXG5cdFx0XHRleHBlY3QoZXhlY3V0b3JbXCJ2YWxpZGF0ZUNvbmZpZ1wiXShjb25maWcpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRhc2sgRGVsZXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0bGV0IGNvbmZpZzogT25Db21wbGV0aW9uRGVsZXRlQ29uZmlnO1xyXG5cclxuXHRcdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0XHRjb25maWcgPSB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFIH07XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBkZWxldGUgdGFzayBmcm9tIGZpbGUgc3VjY2Vzc2Z1bGx5XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBgIyBUZXN0IEZpbGVcclxuXHJcbi0gWyBdIEtlZXAgdGhpcyB0YXNrXHJcbi0gW3hdIFRlc3QgdGFzayB0byBkZWxldGVcclxuLSBbIF0gS2VlcCB0aGlzIHRhc2sgdG9vYDtcclxuXHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IGAjIFRlc3QgRmlsZVxyXG5cclxuLSBbIF0gS2VlcCB0aGlzIHRhc2tcclxuLSBbIF0gS2VlcCB0aGlzIHRhc2sgdG9vYDtcclxuXHJcblx0XHRcdC8vIEFkZCBvcmlnaW5hbE1hcmtkb3duIHRvIHRoZSB0YXNrIGZvciBwcm9wZXIgbWF0Y2hpbmdcclxuXHRcdFx0bW9ja1Rhc2sub3JpZ2luYWxNYXJrZG93biA9IFwiLSBbeF0gVGVzdCB0YXNrIHRvIGRlbGV0ZVwiO1xyXG5cclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0cGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXNzYWdlKS50b0JlKFwiVGFzayBkZWxldGVkIHN1Y2Nlc3NmdWxseVwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQubW9kaWZ5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7IHBhdGg6IFwidGVzdC5tZFwiIH0sXHJcblx0XHRcdFx0ZXhwZWN0ZWRDb250ZW50XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFzayBub3QgZm91bmQgaW4gZmlsZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gYCMgVGVzdCBGaWxlXHJcblxyXG4tIFsgXSBTb21lIG90aGVyIHRhc2tcclxuLSBbIF0gQW5vdGhlciB0YXNrYDtcclxuXHJcblx0XHRcdC8vIFNldCBvcmlnaW5hbE1hcmtkb3duIHRoYXQgd29uJ3QgYmUgZm91bmQgaW4gdGhlIGZpbGVcclxuXHRcdFx0bW9ja1Rhc2sub3JpZ2luYWxNYXJrZG93biA9IFwiLSBbeF0gVGVzdCB0YXNrIHRvIGRlbGV0ZVwiO1xyXG5cclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0cGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoZmlsZUNvbnRlbnQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQmUoXCJUYXNrIG5vdCBmb3VuZCBpbiBmaWxlXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZmlsZSBub3QgZm91bmRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQmUoXCJGaWxlIG5vdCBmb3VuZDogdGVzdC5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQucmVhZCkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQubW9kaWZ5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGZpbGUgcmVhZCBlcnJvclwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdHBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZWplY3RlZFZhbHVlKFxyXG5cdFx0XHRcdG5ldyBFcnJvcihcIlJlYWQgcGVybWlzc2lvbiBkZW5pZWRcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIGRlbGV0ZSB0YXNrOiBSZWFkIHBlcm1pc3Npb24gZGVuaWVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQubW9kaWZ5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGZpbGUgd3JpdGUgZXJyb3JcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IGAtIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlYDtcclxuXHJcblx0XHRcdG1vY2tUYXNrLm9yaWdpbmFsTWFya2Rvd24gPSBcIi0gW3hdIFRlc3QgdGFzayB0byBkZWxldGVcIjtcclxuXHJcblx0XHRcdG1vY2tBcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdHBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5yZWFkLm1vY2tSZXNvbHZlZFZhbHVlKGZpbGVDb250ZW50KTtcclxuXHRcdFx0bW9ja0FwcC52YXVsdC5tb2RpZnkubW9ja1JlamVjdGVkVmFsdWUoXHJcblx0XHRcdFx0bmV3IEVycm9yKFwiV3JpdGUgcGVybWlzc2lvbiBkZW5pZWRcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIGRlbGV0ZSB0YXNrOiBXcml0ZSBwZXJtaXNzaW9uIGRlbmllZFwiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgY29tcGxleCB0YXNrIGNvbnRlbnQgd2l0aCBzcGVjaWFsIGNoYXJhY3RlcnNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrV2l0aFNwZWNpYWxDaGFycyA9IHtcclxuXHRcdFx0XHQuLi5tb2NrVGFzayxcclxuXHRcdFx0XHRjb250ZW50OlxyXG5cdFx0XHRcdFx0XCJUYXNrIHdpdGggW3NwZWNpYWxdIChjaGFyYWN0ZXJzKSAmIHN5bWJvbHMgI3RhZyBAY29udGV4dFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246XHJcblx0XHRcdFx0XHRcIi0gW3hdIFRhc2sgd2l0aCBbc3BlY2lhbF0gKGNoYXJhY3RlcnMpICYgc3ltYm9scyAjdGFnIEBjb250ZXh0XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0V2l0aFNwZWNpYWxUYXNrID0ge1xyXG5cdFx0XHRcdC4uLm1vY2tDb250ZXh0LFxyXG5cdFx0XHRcdHRhc2s6IHRhc2tXaXRoU3BlY2lhbENoYXJzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBgIyBUZXN0IEZpbGVcclxuXHJcbi0gW3hdIFRhc2sgd2l0aCBbc3BlY2lhbF0gKGNoYXJhY3RlcnMpICYgc3ltYm9scyAjdGFnIEBjb250ZXh0XHJcbi0gWyBdIE5vcm1hbCB0YXNrYDtcclxuXHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IGAjIFRlc3QgRmlsZVxyXG5cclxuLSBbIF0gTm9ybWFsIHRhc2tgO1xyXG5cclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0cGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShcclxuXHRcdFx0XHRjb250ZXh0V2l0aFNwZWNpYWxUYXNrLFxyXG5cdFx0XHRcdGNvbmZpZ1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQmUoXCJUYXNrIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfSxcclxuXHRcdFx0XHRleHBlY3RlZENvbnRlbnRcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBuZXN0ZWQgdGFzayBkZWxldGlvblwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gYCMgVGVzdCBGaWxlXHJcblxyXG4tIFsgXSBQYXJlbnQgdGFza1xyXG4gIC0gW3hdIFRlc3QgdGFzayB0byBkZWxldGVcclxuICAtIFsgXSBTaWJsaW5nIHRhc2tcclxuLSBbIF0gQW5vdGhlciBwYXJlbnQgdGFza2A7XHJcblxyXG5cdFx0XHRjb25zdCBleHBlY3RlZENvbnRlbnQgPSBgIyBUZXN0IEZpbGVcclxuXHJcbi0gWyBdIFBhcmVudCB0YXNrXHJcbiAgLSBbIF0gU2libGluZyB0YXNrXHJcbi0gWyBdIEFub3RoZXIgcGFyZW50IHRhc2tgO1xyXG5cclxuXHRcdFx0bW9ja1Rhc2sub3JpZ2luYWxNYXJrZG93biA9IFwiICAtIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlXCI7XHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRwYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShmaWxlQ29udGVudCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1lc3NhZ2UpLnRvQmUoXCJUYXNrIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfSxcclxuXHRcdFx0XHRleHBlY3RlZENvbnRlbnRcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByZXNlcnZlIGVtcHR5IGxpbmVzIGFuZCBmb3JtYXR0aW5nXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBgIyBUZXN0IEZpbGVcclxuXHJcblNvbWUgdGV4dCBoZXJlLlxyXG5cclxuLSBbIF0gS2VlcCB0aGlzIHRhc2tcclxuXHJcbi0gW3hdIFRlc3QgdGFzayB0byBkZWxldGVcclxuXHJcbi0gWyBdIEtlZXAgdGhpcyB0YXNrIHRvb1xyXG5cclxuTW9yZSB0ZXh0IGhlcmUuYDtcclxuXHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IGAjIFRlc3QgRmlsZVxyXG5cclxuU29tZSB0ZXh0IGhlcmUuXHJcblxyXG4tIFsgXSBLZWVwIHRoaXMgdGFza1xyXG5cclxuLSBbIF0gS2VlcCB0aGlzIHRhc2sgdG9vXHJcblxyXG5Nb3JlIHRleHQgaGVyZS5gO1xyXG5cclxuXHRcdFx0bW9ja1Rhc2sub3JpZ2luYWxNYXJrZG93biA9IFwiLSBbeF0gVGVzdCB0YXNrIHRvIGRlbGV0ZVwiO1xyXG5cclxuXHRcdFx0bW9ja0FwcC52YXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0cGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRtb2NrQXBwLnZhdWx0Lm1vZGlmeS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtb2NrQ29udGV4dCwgY29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tBcHAudmF1bHQubW9kaWZ5KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuXHRcdFx0XHR7IHBhdGg6IFwidGVzdC5tZFwiIH0sXHJcblx0XHRcdFx0ZXhwZWN0ZWRDb250ZW50XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJJbnZhbGlkIENvbmZpZ3VyYXRpb24gSGFuZGxpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIGVycm9yIGZvciBpbnZhbGlkIGNvbmZpZ3VyYXRpb25cIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnZhbGlkQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCxcclxuXHRcdFx0fSBhcyBhbnk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBpbnZhbGlkQ29uZmlnKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQmUoXCJJbnZhbGlkIGNvbmZpZ3VyYXRpb25cIik7XHJcblx0XHRcdGV4cGVjdChtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJEZXNjcmlwdGlvbiBHZW5lcmF0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBjb3JyZWN0IGRlc2NyaXB0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25EZWxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGV4ZWN1dG9yLmdldERlc2NyaXB0aW9uKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QoZGVzY3JpcHRpb24pLnRvQmUoXCJEZWxldGUgdGhlIGNvbXBsZXRlZCB0YXNrIGZyb20gdGhlIGZpbGVcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFZGdlIENhc2VzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBlbXB0eSBmaWxlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBPbkNvbXBsZXRpb25EZWxldGVDb25maWcgPSB7XHJcblx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtb2NrVGFzay5vcmlnaW5hbE1hcmtkb3duID0gXCItIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlXCI7XHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRwYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShcIlwiKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUobW9ja0NvbnRleHQsIGNvbmZpZyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlKFwiVGFzayBub3QgZm91bmQgaW4gZmlsZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBmaWxlIHdpdGggb25seSB0aGUgdGFyZ2V0IHRhc2tcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWc6IE9uQ29tcGxldGlvbkRlbGV0ZUNvbmZpZyA9IHtcclxuXHRcdFx0XHR0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gXCItIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlXCI7XHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkQ29udGVudCA9IFwiXCI7XHJcblxyXG5cdFx0XHRtb2NrVGFzay5vcmlnaW5hbE1hcmtkb3duID0gXCItIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlXCI7XHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRwYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShmaWxlQ29udGVudCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfSxcclxuXHRcdFx0XHRleHBlY3RlZENvbnRlbnRcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtdWx0aXBsZSBpZGVudGljYWwgdGFza3MgKGRlbGV0ZSBmaXJzdCBvY2N1cnJlbmNlKVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZzogT25Db21wbGV0aW9uRGVsZXRlQ29uZmlnID0ge1xyXG5cdFx0XHRcdHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBgLSBbeF0gVGVzdCB0YXNrIHRvIGRlbGV0ZVxyXG4tIFsgXSBPdGhlciB0YXNrXHJcbi0gW3hdIFRlc3QgdGFzayB0byBkZWxldGVgO1xyXG5cclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWRDb250ZW50ID0gYC0gWyBdIE90aGVyIHRhc2tcclxuLSBbeF0gVGVzdCB0YXNrIHRvIGRlbGV0ZWA7XHJcblxyXG5cdFx0XHRtb2NrVGFzay5vcmlnaW5hbE1hcmtkb3duID0gXCItIFt4XSBUZXN0IHRhc2sgdG8gZGVsZXRlXCI7XHJcblxyXG5cdFx0XHRtb2NrQXBwLnZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRwYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShmaWxlQ29udGVudCk7XHJcblx0XHRcdG1vY2tBcHAudmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1vY2tDb250ZXh0LCBjb25maWcpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QobW9ja0FwcC52YXVsdC5tb2RpZnkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG5cdFx0XHRcdHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfSxcclxuXHRcdFx0XHRleHBlY3RlZENvbnRlbnRcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19