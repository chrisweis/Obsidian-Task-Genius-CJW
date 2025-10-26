/**
 * CanvasTaskOperationUtils Tests
 *
 * Tests for Canvas task operation utilities including:
 * - Text node creation and management
 * - Task insertion into sections
 * - Task formatting for Canvas storage
 * - Canvas data saving operations
 */
import { __awaiter } from "tslib";
import { CanvasTaskOperationUtils } from "../executors/completion/canvas-operation-utils";
import { createMockApp } from "./mockUtils";
// Mock vault
const mockVault = {
    getFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
};
const mockApp = Object.assign(Object.assign({}, createMockApp()), { vault: mockVault });
describe("CanvasTaskOperationUtils", () => {
    let utils;
    beforeEach(() => {
        utils = new CanvasTaskOperationUtils(mockApp);
        // Reset mocks
        jest.clearAllMocks();
    });
    describe("findOrCreateTargetTextNode", () => {
        it("should find existing text node by ID", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCanvasData = {
                nodes: [
                    {
                        type: "text",
                        id: "existing-node",
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "Existing content",
                    },
                ],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(JSON.stringify(mockCanvasData));
            const result = yield utils.findOrCreateTargetTextNode("test.canvas", "existing-node");
            expect(result).not.toBeNull();
            expect(result.textNode.id).toBe("existing-node");
            expect(result.textNode.text).toBe("Existing content");
        }));
        it("should return null if specified node ID does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCanvasData = {
                nodes: [
                    {
                        type: "text",
                        id: "other-node",
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "Other content",
                    },
                ],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(JSON.stringify(mockCanvasData));
            const result = yield utils.findOrCreateTargetTextNode("test.canvas", "non-existent-node");
            expect(result).toBeNull();
        }));
        it("should find existing text node by section content", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCanvasData = {
                nodes: [
                    {
                        type: "text",
                        id: "node-1",
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "# Main Section\n\nSome content here",
                    },
                    {
                        type: "text",
                        id: "node-2",
                        x: 300,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "## Tasks Section\n\n- [ ] Task 1",
                    },
                ],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(JSON.stringify(mockCanvasData));
            const result = yield utils.findOrCreateTargetTextNode("test.canvas", undefined, "Tasks Section");
            expect(result).not.toBeNull();
            expect(result.textNode.id).toBe("node-2");
            expect(result.textNode.text).toContain("## Tasks Section");
        }));
        it("should create new text node with section if section not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCanvasData = {
                nodes: [
                    {
                        type: "text",
                        id: "existing-node",
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "Existing content",
                    },
                ],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(JSON.stringify(mockCanvasData));
            const result = yield utils.findOrCreateTargetTextNode("test.canvas", undefined, "New Section");
            expect(result).not.toBeNull();
            expect(result.canvasData.nodes).toHaveLength(2); // Original + new node
            expect(result.textNode.text).toContain("## New Section");
            expect(result.textNode.x).toBe(300); // Positioned to the right
        }));
        it("should create new text node without section", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCanvasData = {
                nodes: [],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(JSON.stringify(mockCanvasData));
            const result = yield utils.findOrCreateTargetTextNode("test.canvas");
            expect(result).not.toBeNull();
            expect(result.canvasData.nodes).toHaveLength(1);
            expect(result.textNode.text).toBe("");
            expect(result.textNode.x).toBe(0); // First node at origin
        }));
        it("should return null if file does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
            mockVault.getFileByPath.mockReturnValue(null);
            const result = yield utils.findOrCreateTargetTextNode("non-existent.canvas");
            expect(result).toBeNull();
        }));
        it("should return null if Canvas JSON is invalid", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue("invalid json");
            const result = yield utils.findOrCreateTargetTextNode("test.canvas");
            expect(result).toBeNull();
        }));
    });
    describe("insertTaskIntoSection", () => {
        it("should insert task into existing section", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "# Main\n\n## Tasks\n\n- [ ] Existing task\n\n## Other Section\n\nOther content",
            };
            const result = utils.insertTaskIntoSection(textNode, "- [ ] New task", "Tasks");
            expect(result.success).toBe(true);
            expect(textNode.text).toContain("## Tasks\n\n- [ ] New task");
            expect(textNode.text).toContain("- [ ] Existing task");
        });
        it("should create new section if section not found", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "Existing content",
            };
            const result = utils.insertTaskIntoSection(textNode, "- [ ] New task", "New Section");
            expect(result.success).toBe(true);
            expect(textNode.text).toContain("## New Section\n- [ ] New task");
        });
        it("should append task to end if no section specified", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "Existing content",
            };
            const result = utils.insertTaskIntoSection(textNode, "- [ ] New task");
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("Existing content\n- [ ] New task");
        });
        it("should replace empty content if no section specified", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "",
            };
            const result = utils.insertTaskIntoSection(textNode, "- [ ] New task");
            expect(result.success).toBe(true);
            expect(textNode.text).toBe("- [ ] New task");
        });
        it("should handle errors gracefully", () => {
            const textNode = {
                type: "text",
                id: "node-1",
                x: 0,
                y: 0,
                width: 250,
                height: 60,
                text: "content",
            };
            // Force an error by making text non-writable
            Object.defineProperty(textNode, "text", {
                get: () => "content",
                set: () => {
                    throw new Error("Cannot modify text");
                },
            });
            const result = utils.insertTaskIntoSection(textNode, "- [ ] New task");
            expect(result.success).toBe(false);
            expect(result.error).toContain("Error inserting task into section");
        });
    });
    describe("formatTaskForCanvas", () => {
        it("should use originalMarkdown when preserving metadata", () => {
            const task = {
                id: "task-1",
                content: "Test task",
                filePath: "test.md",
                line: 0,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Test task #project/test ⏫",
                metadata: {
                    tags: ["#project/test"],
                    priority: 4,
                    children: [],
                },
            };
            const formatted = utils.formatTaskForCanvas(task, true);
            expect(formatted).toBe("- [x] Test task #project/test ⏫");
        });
        it("should format basic task without metadata", () => {
            const task = {
                id: "task-2",
                content: "Simple task",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Simple task",
            };
            const formatted = utils.formatTaskForCanvas(task, false);
            expect(formatted).toBe("- [ ] Simple task");
        });
        it("should add metadata when preserving and available", () => {
            const task = {
                id: "task-3",
                content: "Task with metadata",
                filePath: "test.md",
                line: 0,
                completed: false,
                status: " ",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15").getTime(),
                    priority: 3,
                    project: "test-project",
                    context: "work",
                },
            };
            const formatted = utils.formatTaskForCanvas(task, true);
            expect(formatted).toContain("- [ ] Task with metadata");
            expect(formatted).toContain("📅 2024-01-15");
            expect(formatted).toContain("🔼"); // Medium priority
            expect(formatted).toContain("#project/test-project");
            expect(formatted).toContain("@work");
        });
        it("should handle different priority levels", () => {
            const priorities = [
                { level: 1, emoji: "🔽" },
                { level: 2, emoji: "" },
                { level: 3, emoji: "🔼" },
                { level: 4, emoji: "⏫" },
                { level: 5, emoji: "🔺" },
            ];
            priorities.forEach(({ level, emoji }) => {
                const task = {
                    id: `task-${level}`,
                    content: "Test task",
                    filePath: "test.md",
                    line: 0,
                    completed: false,
                    status: " ",
                    metadata: {
                        tags: [],
                        children: [],
                        priority: level,
                    },
                };
                const formatted = utils.formatTaskForCanvas(task, true);
                if (emoji) {
                    expect(formatted).toContain(emoji);
                }
                else {
                    expect(formatted).toBe("- [ ] Test task");
                }
            });
        });
    });
    describe("saveCanvasData", () => {
        it("should successfully save Canvas data", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasData = {
                nodes: [
                    {
                        type: "text",
                        id: "node-1",
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 60,
                        text: "Updated content",
                    },
                ],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.modify.mockResolvedValue(undefined);
            const result = yield utils.saveCanvasData("test.canvas", canvasData);
            expect(result.success).toBe(true);
            expect(result.updatedContent).toBeDefined();
            expect(mockVault.modify).toHaveBeenCalledWith(mockFile, JSON.stringify(canvasData, null, 2));
        }));
        it("should handle file not found error", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasData = {
                nodes: [],
                edges: [],
            };
            mockVault.getFileByPath.mockReturnValue(null);
            const result = yield utils.saveCanvasData("non-existent.canvas", canvasData);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Canvas file not found: non-existent.canvas");
        }));
        it("should handle save errors", () => __awaiter(void 0, void 0, void 0, function* () {
            const canvasData = {
                nodes: [],
                edges: [],
            };
            const mockFile = { path: "test.canvas" };
            mockVault.getFileByPath.mockReturnValue(mockFile);
            mockVault.modify.mockRejectedValue(new Error("Write permission denied"));
            const result = yield utils.saveCanvasData("test.canvas", canvasData);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Error saving Canvas data: Write permission denied");
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzVGFza09wZXJhdGlvblV0aWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDYW52YXNUYXNrT3BlcmF0aW9uVXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUcxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTVDLGFBQWE7QUFDYixNQUFNLFNBQVMsR0FBRztJQUNqQixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNmLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ2pCLENBQUM7QUFFRixNQUFNLE9BQU8sbUNBQ1QsYUFBYSxFQUFFLEtBQ2xCLEtBQUssRUFBRSxTQUFTLEdBQ2hCLENBQUM7QUFFRixRQUFRLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLElBQUksS0FBK0IsQ0FBQztJQUVwQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsS0FBSyxHQUFHLElBQUksd0JBQXdCLENBQUMsT0FBYyxDQUFDLENBQUM7UUFDckQsY0FBYztRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDM0MsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQVMsRUFBRTtZQUNyRCxNQUFNLGNBQWMsR0FBZTtnQkFDbEMsS0FBSyxFQUFFO29CQUNOO3dCQUNDLElBQUksRUFBRSxNQUFNO3dCQUNaLEVBQUUsRUFBRSxlQUFlO3dCQUNuQixDQUFDLEVBQUUsQ0FBQzt3QkFDSixDQUFDLEVBQUUsQ0FBQzt3QkFDSixLQUFLLEVBQUUsR0FBRzt3QkFDVixNQUFNLEVBQUUsRUFBRTt3QkFDVixJQUFJLEVBQUUsa0JBQWtCO3FCQUN4QjtpQkFDRDtnQkFDRCxLQUFLLEVBQUUsRUFBRTthQUNULENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUN6QyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUVqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsQ0FDcEQsYUFBYSxFQUNiLGVBQWUsQ0FDZixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx3REFBd0QsRUFBRSxHQUFTLEVBQUU7WUFDdkUsTUFBTSxjQUFjLEdBQWU7Z0JBQ2xDLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsTUFBTTt3QkFDWixFQUFFLEVBQUUsWUFBWTt3QkFDaEIsQ0FBQyxFQUFFLENBQUM7d0JBQ0osQ0FBQyxFQUFFLENBQUM7d0JBQ0osS0FBSyxFQUFFLEdBQUc7d0JBQ1YsTUFBTSxFQUFFLEVBQUU7d0JBQ1YsSUFBSSxFQUFFLGVBQWU7cUJBQ3JCO2lCQUNEO2dCQUNELEtBQUssRUFBRSxFQUFFO2FBQ1QsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ3pDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBRWpFLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixDQUNwRCxhQUFhLEVBQ2IsbUJBQW1CLENBQ25CLENBQUM7WUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFTLEVBQUU7WUFDbEUsTUFBTSxjQUFjLEdBQWU7Z0JBQ2xDLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsTUFBTTt3QkFDWixFQUFFLEVBQUUsUUFBUTt3QkFDWixDQUFDLEVBQUUsQ0FBQzt3QkFDSixDQUFDLEVBQUUsQ0FBQzt3QkFDSixLQUFLLEVBQUUsR0FBRzt3QkFDVixNQUFNLEVBQUUsRUFBRTt3QkFDVixJQUFJLEVBQUUscUNBQXFDO3FCQUMzQztvQkFDRDt3QkFDQyxJQUFJLEVBQUUsTUFBTTt3QkFDWixFQUFFLEVBQUUsUUFBUTt3QkFDWixDQUFDLEVBQUUsR0FBRzt3QkFDTixDQUFDLEVBQUUsQ0FBQzt3QkFDSixLQUFLLEVBQUUsR0FBRzt3QkFDVixNQUFNLEVBQUUsRUFBRTt3QkFDVixJQUFJLEVBQUUsa0NBQWtDO3FCQUN4QztpQkFDRDtnQkFDRCxLQUFLLEVBQUUsRUFBRTthQUNULENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUN6QyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUVqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsQ0FDcEQsYUFBYSxFQUNiLFNBQVMsRUFDVCxlQUFlLENBQ2YsQ0FBQztZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDOUIsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsK0RBQStELEVBQUUsR0FBUyxFQUFFO1lBQzlFLE1BQU0sY0FBYyxHQUFlO2dCQUNsQyxLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLE1BQU07d0JBQ1osRUFBRSxFQUFFLGVBQWU7d0JBQ25CLENBQUMsRUFBRSxDQUFDO3dCQUNKLENBQUMsRUFBRSxDQUFDO3dCQUNKLEtBQUssRUFBRSxHQUFHO3dCQUNWLE1BQU0sRUFBRSxFQUFFO3dCQUNWLElBQUksRUFBRSxrQkFBa0I7cUJBQ3hCO2lCQUNEO2dCQUNELEtBQUssRUFBRSxFQUFFO2FBQ1QsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ3pDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBRWpFLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixDQUNwRCxhQUFhLEVBQ2IsU0FBUyxFQUNULGFBQWEsQ0FDYixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsTUFBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7WUFDeEUsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1FBQ2pFLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsNkNBQTZDLEVBQUUsR0FBUyxFQUFFO1lBQzVELE1BQU0sY0FBYyxHQUFlO2dCQUNsQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBRTthQUNULENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUN6QyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUVqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsQ0FDcEQsYUFBYSxDQUNiLENBQUM7WUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxNQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1FBQzVELENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBUyxFQUFFO1lBQzFELFNBQVMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTlDLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixDQUNwRCxxQkFBcUIsQ0FDckIsQ0FBQztZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEdBQVMsRUFBRTtZQUM3RCxNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUN6QyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRWpELE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixDQUNwRCxhQUFhLENBQ2IsQ0FBQztZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLEVBQUUsQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7WUFDbkQsTUFBTSxRQUFRLEdBQW1CO2dCQUNoQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixFQUFFLEVBQUUsUUFBUTtnQkFDWixDQUFDLEVBQUUsQ0FBQztnQkFDSixDQUFDLEVBQUUsQ0FBQztnQkFDSixLQUFLLEVBQUUsR0FBRztnQkFDVixNQUFNLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsZ0ZBQWdGO2FBQ3RGLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQ3pDLFFBQVEsRUFDUixnQkFBZ0IsRUFDaEIsT0FBTyxDQUNQLENBQUM7WUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1lBQ3pELE1BQU0sUUFBUSxHQUFtQjtnQkFDaEMsSUFBSSxFQUFFLE1BQU07Z0JBQ1osRUFBRSxFQUFFLFFBQVE7Z0JBQ1osQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFFLENBQUM7Z0JBQ0osS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLGtCQUFrQjthQUN4QixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUN6QyxRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLGFBQWEsQ0FDYixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7WUFDNUQsTUFBTSxRQUFRLEdBQW1CO2dCQUNoQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixFQUFFLEVBQUUsUUFBUTtnQkFDWixDQUFDLEVBQUUsQ0FBQztnQkFDSixDQUFDLEVBQUUsQ0FBQztnQkFDSixLQUFLLEVBQUUsR0FBRztnQkFDVixNQUFNLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsa0JBQWtCO2FBQ3hCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQ3pDLFFBQVEsRUFDUixnQkFBZ0IsQ0FDaEIsQ0FBQztZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1lBQy9ELE1BQU0sUUFBUSxHQUFtQjtnQkFDaEMsSUFBSSxFQUFFLE1BQU07Z0JBQ1osRUFBRSxFQUFFLFFBQVE7Z0JBQ1osQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFFLENBQUM7Z0JBQ0osS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUU7YUFDUixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUN6QyxRQUFRLEVBQ1IsZ0JBQWdCLENBQ2hCLENBQUM7WUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBbUI7Z0JBQ2hDLElBQUksRUFBRSxNQUFNO2dCQUNaLEVBQUUsRUFBRSxRQUFRO2dCQUNaLENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBRSxDQUFDO2dCQUNKLEtBQUssRUFBRSxHQUFHO2dCQUNWLE1BQU0sRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxTQUFTO2FBQ2YsQ0FBQztZQUVGLDZDQUE2QztZQUM3QyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUU7Z0JBQ3ZDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO2dCQUNwQixHQUFHLEVBQUUsR0FBRyxFQUFFO29CQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDdkMsQ0FBQzthQUNELENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FDekMsUUFBUSxFQUNSLGdCQUFnQixDQUNoQixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNyRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNwQyxFQUFFLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1lBQy9ELE1BQU0sSUFBSSxHQUFTO2dCQUNsQixFQUFFLEVBQUUsUUFBUTtnQkFDWixPQUFPLEVBQUUsV0FBVztnQkFDcEIsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLElBQUksRUFBRSxDQUFDO2dCQUNQLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU0sRUFBRSxHQUFHO2dCQUNYLGdCQUFnQixFQUFFLGlDQUFpQztnQkFDbkQsUUFBUSxFQUFFO29CQUNULElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQztvQkFDdkIsUUFBUSxFQUFFLENBQUM7b0JBQ1gsUUFBUSxFQUFFLEVBQUU7aUJBQ1o7YUFDRCxDQUFDO1lBRUYsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV4RCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1lBQ3BELE1BQU0sSUFBSSxHQUFRO2dCQUNqQixFQUFFLEVBQUUsUUFBUTtnQkFDWixPQUFPLEVBQUUsYUFBYTtnQkFDdEIsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLElBQUksRUFBRSxDQUFDO2dCQUNQLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixNQUFNLEVBQUUsR0FBRztnQkFDWCxnQkFBZ0IsRUFBRSxtQkFBbUI7YUFDckMsQ0FBQztZQUVGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFekQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtZQUM1RCxNQUFNLElBQUksR0FBUTtnQkFDakIsRUFBRSxFQUFFLFFBQVE7Z0JBQ1osT0FBTyxFQUFFLG9CQUFvQjtnQkFDN0IsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLElBQUksRUFBRSxDQUFDO2dCQUNQLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixNQUFNLEVBQUUsR0FBRztnQkFDWCxRQUFRLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLEVBQUU7b0JBQ1osT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sRUFBRTtvQkFDekMsUUFBUSxFQUFFLENBQUM7b0JBQ1gsT0FBTyxFQUFFLGNBQWM7b0JBQ3ZCLE9BQU8sRUFBRSxNQUFNO2lCQUNmO2FBQ0QsQ0FBQztZQUVGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFeEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtZQUNyRCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7WUFDbEQsTUFBTSxVQUFVLEdBQUc7Z0JBQ2xCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO2dCQUN6QixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtnQkFDdkIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7Z0JBQ3pCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUN4QixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTthQUN6QixDQUFDO1lBRUYsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7Z0JBQ3ZDLE1BQU0sSUFBSSxHQUFRO29CQUNqQixFQUFFLEVBQUUsUUFBUSxLQUFLLEVBQUU7b0JBQ25CLE9BQU8sRUFBRSxXQUFXO29CQUNwQixRQUFRLEVBQUUsU0FBUztvQkFDbkIsSUFBSSxFQUFFLENBQUM7b0JBQ1AsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHO29CQUNYLFFBQVEsRUFBRTt3QkFDVCxJQUFJLEVBQUUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRTt3QkFDWixRQUFRLEVBQUUsS0FBSztxQkFDZjtpQkFDRCxDQUFDO2dCQUVGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRXhELElBQUksS0FBSyxFQUFFO29CQUNWLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ25DO3FCQUFNO29CQUNOLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztpQkFDMUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxHQUFTLEVBQUU7WUFDckQsTUFBTSxVQUFVLEdBQWU7Z0JBQzlCLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsTUFBTTt3QkFDWixFQUFFLEVBQUUsUUFBUTt3QkFDWixDQUFDLEVBQUUsQ0FBQzt3QkFDSixDQUFDLEVBQUUsQ0FBQzt3QkFDSixLQUFLLEVBQUUsR0FBRzt3QkFDVixNQUFNLEVBQUUsRUFBRTt3QkFDVixJQUFJLEVBQUUsaUJBQWlCO3FCQUN2QjtpQkFDRDtnQkFDRCxLQUFLLEVBQUUsRUFBRTthQUNULENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUN6QyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLGNBQWMsQ0FDeEMsYUFBYSxFQUNiLFVBQVUsQ0FDVixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM1QyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLG9CQUFvQixDQUM1QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUNuQyxDQUFDO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFTLEVBQUU7WUFDbkQsTUFBTSxVQUFVLEdBQWU7Z0JBQzlCLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxFQUFFO2FBQ1QsQ0FBQztZQUVGLFNBQVMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTlDLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLGNBQWMsQ0FDeEMscUJBQXFCLEVBQ3JCLFVBQVUsQ0FDVixDQUFDO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQzdCLDRDQUE0QyxDQUM1QyxDQUFDO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywyQkFBMkIsRUFBRSxHQUFTLEVBQUU7WUFDMUMsTUFBTSxVQUFVLEdBQWU7Z0JBQzlCLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxFQUFFO2FBQ1QsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ3pDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQ2pDLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQ3BDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxjQUFjLENBQ3hDLGFBQWEsRUFDYixVQUFVLENBQ1YsQ0FBQztZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUM3QixtREFBbUQsQ0FDbkQsQ0FBQztRQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENhbnZhc1Rhc2tPcGVyYXRpb25VdGlscyBUZXN0c1xyXG4gKlxyXG4gKiBUZXN0cyBmb3IgQ2FudmFzIHRhc2sgb3BlcmF0aW9uIHV0aWxpdGllcyBpbmNsdWRpbmc6XHJcbiAqIC0gVGV4dCBub2RlIGNyZWF0aW9uIGFuZCBtYW5hZ2VtZW50XHJcbiAqIC0gVGFzayBpbnNlcnRpb24gaW50byBzZWN0aW9uc1xyXG4gKiAtIFRhc2sgZm9ybWF0dGluZyBmb3IgQ2FudmFzIHN0b3JhZ2VcclxuICogLSBDYW52YXMgZGF0YSBzYXZpbmcgb3BlcmF0aW9uc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IENhbnZhc1Rhc2tPcGVyYXRpb25VdGlscyB9IGZyb20gXCIuLi9leGVjdXRvcnMvY29tcGxldGlvbi9jYW52YXMtb3BlcmF0aW9uLXV0aWxzXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBDYW52YXNEYXRhLCBDYW52YXNUZXh0RGF0YSB9IGZyb20gXCIuLi90eXBlcy9jYW52YXNcIjtcclxuaW1wb3J0IHsgY3JlYXRlTW9ja0FwcCB9IGZyb20gXCIuL21vY2tVdGlsc1wiO1xyXG5cclxuLy8gTW9jayB2YXVsdFxyXG5jb25zdCBtb2NrVmF1bHQgPSB7XHJcblx0Z2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdHJlYWQ6IGplc3QuZm4oKSxcclxuXHRtb2RpZnk6IGplc3QuZm4oKSxcclxufTtcclxuXHJcbmNvbnN0IG1vY2tBcHAgPSB7XHJcblx0Li4uY3JlYXRlTW9ja0FwcCgpLFxyXG5cdHZhdWx0OiBtb2NrVmF1bHQsXHJcbn07XHJcblxyXG5kZXNjcmliZShcIkNhbnZhc1Rhc2tPcGVyYXRpb25VdGlsc1wiLCAoKSA9PiB7XHJcblx0bGV0IHV0aWxzOiBDYW52YXNUYXNrT3BlcmF0aW9uVXRpbHM7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0dXRpbHMgPSBuZXcgQ2FudmFzVGFza09wZXJhdGlvblV0aWxzKG1vY2tBcHAgYXMgYW55KTtcclxuXHRcdC8vIFJlc2V0IG1vY2tzXHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJmaW5kT3JDcmVhdGVUYXJnZXRUZXh0Tm9kZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBmaW5kIGV4aXN0aW5nIHRleHQgbm9kZSBieSBJRFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG5cdFx0XHRcdG5vZGVzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdFx0XHRpZDogXCJleGlzdGluZy1ub2RlXCIsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiRXhpc3RpbmcgY29udGVudFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGVkZ2VzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QuY2FudmFzXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoSlNPTi5zdHJpbmdpZnkobW9ja0NhbnZhc0RhdGEpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLmZpbmRPckNyZWF0ZVRhcmdldFRleHROb2RlKFxyXG5cdFx0XHRcdFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRcImV4aXN0aW5nLW5vZGVcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQhLnRleHROb2RlLmlkKS50b0JlKFwiZXhpc3Rpbmctbm9kZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCEudGV4dE5vZGUudGV4dCkudG9CZShcIkV4aXN0aW5nIGNvbnRlbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gbnVsbCBpZiBzcGVjaWZpZWQgbm9kZSBJRCBkb2VzIG5vdCBleGlzdFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG5cdFx0XHRcdG5vZGVzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdFx0XHRpZDogXCJvdGhlci1ub2RlXCIsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiT3RoZXIgY29udGVudFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGVkZ2VzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QuY2FudmFzXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoSlNPTi5zdHJpbmdpZnkobW9ja0NhbnZhc0RhdGEpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLmZpbmRPckNyZWF0ZVRhcmdldFRleHROb2RlKFxyXG5cdFx0XHRcdFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRcIm5vbi1leGlzdGVudC1ub2RlXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmaW5kIGV4aXN0aW5nIHRleHQgbm9kZSBieSBzZWN0aW9uIGNvbnRlbnRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrQ2FudmFzRGF0YTogQ2FudmFzRGF0YSA9IHtcclxuXHRcdFx0XHRub2RlczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0aWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiIyBNYWluIFNlY3Rpb25cXG5cXG5Tb21lIGNvbnRlbnQgaGVyZVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdGlkOiBcIm5vZGUtMlwiLFxyXG5cdFx0XHRcdFx0XHR4OiAzMDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiIyMgVGFza3MgU2VjdGlvblxcblxcbi0gWyBdIFRhc2sgMVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGVkZ2VzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QuY2FudmFzXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoSlNPTi5zdHJpbmdpZnkobW9ja0NhbnZhc0RhdGEpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLmZpbmRPckNyZWF0ZVRhcmdldFRleHROb2RlKFxyXG5cdFx0XHRcdFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XCJUYXNrcyBTZWN0aW9uXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0IS50ZXh0Tm9kZS5pZCkudG9CZShcIm5vZGUtMlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCEudGV4dE5vZGUudGV4dCkudG9Db250YWluKFwiIyMgVGFza3MgU2VjdGlvblwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNyZWF0ZSBuZXcgdGV4dCBub2RlIHdpdGggc2VjdGlvbiBpZiBzZWN0aW9uIG5vdCBmb3VuZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tDYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG5cdFx0XHRcdG5vZGVzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdFx0XHRpZDogXCJleGlzdGluZy1ub2RlXCIsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiRXhpc3RpbmcgY29udGVudFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGVkZ2VzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QuY2FudmFzXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoSlNPTi5zdHJpbmdpZnkobW9ja0NhbnZhc0RhdGEpKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLmZpbmRPckNyZWF0ZVRhcmdldFRleHROb2RlKFxyXG5cdFx0XHRcdFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XCJOZXcgU2VjdGlvblwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCEuY2FudmFzRGF0YS5ub2RlcykudG9IYXZlTGVuZ3RoKDIpOyAvLyBPcmlnaW5hbCArIG5ldyBub2RlXHJcblx0XHRcdGV4cGVjdChyZXN1bHQhLnRleHROb2RlLnRleHQpLnRvQ29udGFpbihcIiMjIE5ldyBTZWN0aW9uXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0IS50ZXh0Tm9kZS54KS50b0JlKDMwMCk7IC8vIFBvc2l0aW9uZWQgdG8gdGhlIHJpZ2h0XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBjcmVhdGUgbmV3IHRleHQgbm9kZSB3aXRob3V0IHNlY3Rpb25cIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrQ2FudmFzRGF0YTogQ2FudmFzRGF0YSA9IHtcclxuXHRcdFx0XHRub2RlczogW10sXHJcblx0XHRcdFx0ZWRnZXM6IFtdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5jYW52YXNcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQucmVhZC5tb2NrUmVzb2x2ZWRWYWx1ZShKU09OLnN0cmluZ2lmeShtb2NrQ2FudmFzRGF0YSkpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdXRpbHMuZmluZE9yQ3JlYXRlVGFyZ2V0VGV4dE5vZGUoXHJcblx0XHRcdFx0XCJ0ZXN0LmNhbnZhc1wiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS5ub3QudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCEuY2FudmFzRGF0YS5ub2RlcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0IS50ZXh0Tm9kZS50ZXh0KS50b0JlKFwiXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0IS50ZXh0Tm9kZS54KS50b0JlKDApOyAvLyBGaXJzdCBub2RlIGF0IG9yaWdpblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIG51bGwgaWYgZmlsZSBkb2VzIG5vdCBleGlzdFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLmZpbmRPckNyZWF0ZVRhcmdldFRleHROb2RlKFxyXG5cdFx0XHRcdFwibm9uLWV4aXN0ZW50LmNhbnZhc1wiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmV0dXJuIG51bGwgaWYgQ2FudmFzIEpTT04gaXMgaW52YWxpZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QuY2FudmFzXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LnJlYWQubW9ja1Jlc29sdmVkVmFsdWUoXCJpbnZhbGlkIGpzb25cIik7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB1dGlscy5maW5kT3JDcmVhdGVUYXJnZXRUZXh0Tm9kZShcclxuXHRcdFx0XHRcInRlc3QuY2FudmFzXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJpbnNlcnRUYXNrSW50b1NlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaW5zZXJ0IHRhc2sgaW50byBleGlzdGluZyBzZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGV4dE5vZGU6IENhbnZhc1RleHREYXRhID0ge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdGlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0eTogMCxcclxuXHRcdFx0XHR3aWR0aDogMjUwLFxyXG5cdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0dGV4dDogXCIjIE1haW5cXG5cXG4jIyBUYXNrc1xcblxcbi0gWyBdIEV4aXN0aW5nIHRhc2tcXG5cXG4jIyBPdGhlciBTZWN0aW9uXFxuXFxuT3RoZXIgY29udGVudFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gdXRpbHMuaW5zZXJ0VGFza0ludG9TZWN0aW9uKFxyXG5cdFx0XHRcdHRleHROb2RlLFxyXG5cdFx0XHRcdFwiLSBbIF0gTmV3IHRhc2tcIixcclxuXHRcdFx0XHRcIlRhc2tzXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHRleHROb2RlLnRleHQpLnRvQ29udGFpbihcIiMjIFRhc2tzXFxuXFxuLSBbIF0gTmV3IHRhc2tcIik7XHJcblx0XHRcdGV4cGVjdCh0ZXh0Tm9kZS50ZXh0KS50b0NvbnRhaW4oXCItIFsgXSBFeGlzdGluZyB0YXNrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIG5ldyBzZWN0aW9uIGlmIHNlY3Rpb24gbm90IGZvdW5kXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGV4dE5vZGU6IENhbnZhc1RleHREYXRhID0ge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdGlkOiBcIm5vZGUtMVwiLFxyXG5cdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0eTogMCxcclxuXHRcdFx0XHR3aWR0aDogMjUwLFxyXG5cdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0dGV4dDogXCJFeGlzdGluZyBjb250ZW50XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSB1dGlscy5pbnNlcnRUYXNrSW50b1NlY3Rpb24oXHJcblx0XHRcdFx0dGV4dE5vZGUsXHJcblx0XHRcdFx0XCItIFsgXSBOZXcgdGFza1wiLFxyXG5cdFx0XHRcdFwiTmV3IFNlY3Rpb25cIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodGV4dE5vZGUudGV4dCkudG9Db250YWluKFwiIyMgTmV3IFNlY3Rpb25cXG4tIFsgXSBOZXcgdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGFwcGVuZCB0YXNrIHRvIGVuZCBpZiBubyBzZWN0aW9uIHNwZWNpZmllZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRleHROb2RlOiBDYW52YXNUZXh0RGF0YSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRpZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0XHRoZWlnaHQ6IDYwLFxyXG5cdFx0XHRcdHRleHQ6IFwiRXhpc3RpbmcgY29udGVudFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gdXRpbHMuaW5zZXJ0VGFza0ludG9TZWN0aW9uKFxyXG5cdFx0XHRcdHRleHROb2RlLFxyXG5cdFx0XHRcdFwiLSBbIF0gTmV3IHRhc2tcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodGV4dE5vZGUudGV4dCkudG9CZShcIkV4aXN0aW5nIGNvbnRlbnRcXG4tIFsgXSBOZXcgdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlcGxhY2UgZW1wdHkgY29udGVudCBpZiBubyBzZWN0aW9uIHNwZWNpZmllZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRleHROb2RlOiBDYW52YXNUZXh0RGF0YSA9IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRpZDogXCJub2RlLTFcIixcclxuXHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0XHRoZWlnaHQ6IDYwLFxyXG5cdFx0XHRcdHRleHQ6IFwiXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSB1dGlscy5pbnNlcnRUYXNrSW50b1NlY3Rpb24oXHJcblx0XHRcdFx0dGV4dE5vZGUsXHJcblx0XHRcdFx0XCItIFsgXSBOZXcgdGFza1wiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCh0ZXh0Tm9kZS50ZXh0KS50b0JlKFwiLSBbIF0gTmV3IHRhc2tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZXJyb3JzIGdyYWNlZnVsbHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZTogQ2FudmFzVGV4dERhdGEgPSB7XHJcblx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0aWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHR5OiAwLFxyXG5cdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0aGVpZ2h0OiA2MCxcclxuXHRcdFx0XHR0ZXh0OiBcImNvbnRlbnRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEZvcmNlIGFuIGVycm9yIGJ5IG1ha2luZyB0ZXh0IG5vbi13cml0YWJsZVxyXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGV4dE5vZGUsIFwidGV4dFwiLCB7XHJcblx0XHRcdFx0Z2V0OiAoKSA9PiBcImNvbnRlbnRcIixcclxuXHRcdFx0XHRzZXQ6ICgpID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtb2RpZnkgdGV4dFwiKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHV0aWxzLmluc2VydFRhc2tJbnRvU2VjdGlvbihcclxuXHRcdFx0XHR0ZXh0Tm9kZSxcclxuXHRcdFx0XHRcIi0gWyBdIE5ldyB0YXNrXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcIkVycm9yIGluc2VydGluZyB0YXNrIGludG8gc2VjdGlvblwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImZvcm1hdFRhc2tGb3JDYW52YXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgdXNlIG9yaWdpbmFsTWFya2Rvd24gd2hlbiBwcmVzZXJ2aW5nIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbeF0gVGVzdCB0YXNrICNwcm9qZWN0L3Rlc3Qg4o+rXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtcIiNwcm9qZWN0L3Rlc3RcIl0sXHJcblx0XHRcdFx0XHRwcmlvcml0eTogNCxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZm9ybWF0dGVkID0gdXRpbHMuZm9ybWF0VGFza0ZvckNhbnZhcyh0YXNrLCB0cnVlKTtcclxuXHJcblx0XHRcdGV4cGVjdChmb3JtYXR0ZWQpLnRvQmUoXCItIFt4XSBUZXN0IHRhc2sgI3Byb2plY3QvdGVzdCDij6tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmb3JtYXQgYmFzaWMgdGFzayB3aXRob3V0IG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogYW55ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRhc2stMlwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiU2ltcGxlIHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBTaW1wbGUgdGFza1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZm9ybWF0dGVkID0gdXRpbHMuZm9ybWF0VGFza0ZvckNhbnZhcyh0YXNrLCBmYWxzZSk7XHJcblxyXG5cdFx0XHRleHBlY3QoZm9ybWF0dGVkKS50b0JlKFwiLSBbIF0gU2ltcGxlIHRhc2tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBhZGQgbWV0YWRhdGEgd2hlbiBwcmVzZXJ2aW5nIGFuZCBhdmFpbGFibGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBhbnkgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGFzay0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggbWV0YWRhdGFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByaW9yaXR5OiAzLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogXCJ0ZXN0LXByb2plY3RcIixcclxuXHRcdFx0XHRcdGNvbnRleHQ6IFwid29ya1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWQgPSB1dGlscy5mb3JtYXRUYXNrRm9yQ2FudmFzKHRhc2ssIHRydWUpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGZvcm1hdHRlZCkudG9Db250YWluKFwiLSBbIF0gVGFzayB3aXRoIG1ldGFkYXRhXCIpO1xyXG5cdFx0XHRleHBlY3QoZm9ybWF0dGVkKS50b0NvbnRhaW4oXCLwn5OFIDIwMjQtMDEtMTVcIik7XHJcblx0XHRcdGV4cGVjdChmb3JtYXR0ZWQpLnRvQ29udGFpbihcIvCflLxcIik7IC8vIE1lZGl1bSBwcmlvcml0eVxyXG5cdFx0XHRleHBlY3QoZm9ybWF0dGVkKS50b0NvbnRhaW4oXCIjcHJvamVjdC90ZXN0LXByb2plY3RcIik7XHJcblx0XHRcdGV4cGVjdChmb3JtYXR0ZWQpLnRvQ29udGFpbihcIkB3b3JrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGRpZmZlcmVudCBwcmlvcml0eSBsZXZlbHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcmlvcml0aWVzID0gW1xyXG5cdFx0XHRcdHsgbGV2ZWw6IDEsIGVtb2ppOiBcIvCflL1cIiB9LFxyXG5cdFx0XHRcdHsgbGV2ZWw6IDIsIGVtb2ppOiBcIlwiIH0sXHJcblx0XHRcdFx0eyBsZXZlbDogMywgZW1vamk6IFwi8J+UvFwiIH0sXHJcblx0XHRcdFx0eyBsZXZlbDogNCwgZW1vamk6IFwi4o+rXCIgfSxcclxuXHRcdFx0XHR7IGxldmVsOiA1LCBlbW9qaTogXCLwn5S6XCIgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHByaW9yaXRpZXMuZm9yRWFjaCgoeyBsZXZlbCwgZW1vamkgfSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2s6IGFueSA9IHtcclxuXHRcdFx0XHRcdGlkOiBgdGFzay0ke2xldmVsfWAsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFza1wiLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHk6IGxldmVsLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCBmb3JtYXR0ZWQgPSB1dGlscy5mb3JtYXRUYXNrRm9yQ2FudmFzKHRhc2ssIHRydWUpO1xyXG5cclxuXHRcdFx0XHRpZiAoZW1vamkpIHtcclxuXHRcdFx0XHRcdGV4cGVjdChmb3JtYXR0ZWQpLnRvQ29udGFpbihlbW9qaSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGV4cGVjdChmb3JtYXR0ZWQpLnRvQmUoXCItIFsgXSBUZXN0IHRhc2tcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcInNhdmVDYW52YXNEYXRhXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHN1Y2Nlc3NmdWxseSBzYXZlIENhbnZhcyBkYXRhXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FudmFzRGF0YTogQ2FudmFzRGF0YSA9IHtcclxuXHRcdFx0XHRub2RlczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0aWQ6IFwibm9kZS0xXCIsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDAsXHJcblx0XHRcdFx0XHRcdHdpZHRoOiAyNTAsXHJcblx0XHRcdFx0XHRcdGhlaWdodDogNjAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiVXBkYXRlZCBjb250ZW50XCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0ZWRnZXM6IFtdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5jYW52YXNcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQubW9kaWZ5Lm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB1dGlscy5zYXZlQ2FudmFzRGF0YShcclxuXHRcdFx0XHRcInRlc3QuY2FudmFzXCIsXHJcblx0XHRcdFx0Y2FudmFzRGF0YVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnVwZGF0ZWRDb250ZW50KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobW9ja1ZhdWx0Lm1vZGlmeSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcblx0XHRcdFx0bW9ja0ZpbGUsXHJcblx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMilcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBmaWxlIG5vdCBmb3VuZCBlcnJvclwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhc0RhdGE6IENhbnZhc0RhdGEgPSB7XHJcblx0XHRcdFx0bm9kZXM6IFtdLFxyXG5cdFx0XHRcdGVkZ2VzOiBbXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdG1vY2tWYXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShudWxsKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLnNhdmVDYW52YXNEYXRhKFxyXG5cdFx0XHRcdFwibm9uLWV4aXN0ZW50LmNhbnZhc1wiLFxyXG5cdFx0XHRcdGNhbnZhc0RhdGFcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbihcclxuXHRcdFx0XHRcIkNhbnZhcyBmaWxlIG5vdCBmb3VuZDogbm9uLWV4aXN0ZW50LmNhbnZhc1wiXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgc2F2ZSBlcnJvcnNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYW52YXNEYXRhOiBDYW52YXNEYXRhID0ge1xyXG5cdFx0XHRcdG5vZGVzOiBbXSxcclxuXHRcdFx0XHRlZGdlczogW10sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJ0ZXN0LmNhbnZhc1wiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5tb2RpZnkubW9ja1JlamVjdGVkVmFsdWUoXHJcblx0XHRcdFx0bmV3IEVycm9yKFwiV3JpdGUgcGVybWlzc2lvbiBkZW5pZWRcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHV0aWxzLnNhdmVDYW52YXNEYXRhKFxyXG5cdFx0XHRcdFwidGVzdC5jYW52YXNcIixcclxuXHRcdFx0XHRjYW52YXNEYXRhXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oXHJcblx0XHRcdFx0XCJFcnJvciBzYXZpbmcgQ2FudmFzIGRhdGE6IFdyaXRlIHBlcm1pc3Npb24gZGVuaWVkXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19