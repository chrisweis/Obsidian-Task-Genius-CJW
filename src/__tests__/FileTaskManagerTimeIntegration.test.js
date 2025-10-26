/**
 * Integration tests for FileTaskManager with enhanced time parsing
 */
import { __awaiter } from "tslib";
import { FileTaskManagerImpl } from "../managers/file-task-manager";
import { TimeParsingService } from "../services/time-parsing-service";
// Mock Obsidian App
const mockApp = {
    vault: {
        getFileByPath: jest.fn(),
        read: jest.fn(),
        modify: jest.fn(),
    },
    fileManager: {
        renameFile: jest.fn(),
    },
};
describe("FileTaskManager Time Integration", () => {
    let fileTaskManager;
    let timeParsingService;
    beforeEach(() => {
        // Create time parsing service with test configuration
        const timeConfig = {
            enabled: true,
            supportedLanguages: ["en"],
            dateKeywords: {
                start: ["start", "from", "begins"],
                due: ["due", "deadline", "by"],
                scheduled: ["scheduled", "at", "@"],
            },
            removeOriginalText: false,
            perLineProcessing: true,
            realTimeReplacement: false,
        };
        timeParsingService = new TimeParsingService(timeConfig);
        fileTaskManager = new FileTaskManagerImpl(mockApp, undefined, timeParsingService);
    });
    describe("Time Component Extraction", () => {
        it("should extract single time from task content", () => {
            var _a, _b, _c, _d;
            // First test the time parsing service directly
            const directResult = timeParsingService.parseTimeComponents("Meeting at 2:30 PM");
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "test-task.md",
                    name: "test-task.md",
                    extension: "md",
                    getShortName: () => "test-task",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "test-task",
                    path: "test-task.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Meeting at 2:30 PM",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Meeting at 2:30 PM";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            };
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            // Debug: Check what we got from direct parsing
            expect(directResult.timeComponents).toBeDefined();
            const hasTimeComponents = Object.keys(directResult.timeComponents).length > 0;
            expect(hasTimeComponents).toBe(true);
            expect(fileTask.content).toBe("Meeting at 2:30 PM");
            // If direct parsing works but file task doesn't, there's an integration issue
            if (hasTimeComponents && !fileTask.metadata.timeComponents) {
                throw new Error(`Direct parsing found time components but FileTaskManager didn't. Direct result: ${JSON.stringify(directResult)}`);
            }
            expect(fileTask.metadata.timeComponents).toBeDefined();
            expect(((_a = fileTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.dueTime) || ((_b = fileTask.metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.scheduledTime)).toBeDefined();
            const timeComponent = ((_c = fileTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.dueTime) || ((_d = fileTask.metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.scheduledTime);
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.hour).toBe(14);
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.minute).toBe(30);
        });
        it("should extract time range from task content", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "workshop.md",
                    name: "workshop.md",
                    extension: "md",
                    getShortName: () => "workshop",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "workshop",
                    path: "workshop.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Workshop 9:00-17:00",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Workshop 9:00-17:00";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            };
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            expect(fileTask.content).toBe("Workshop 9:00-17:00");
            expect(fileTask.metadata.timeComponents).toBeDefined();
            expect((_a = fileTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime).toBeDefined();
            expect((_b = fileTask.metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.endTime).toBeDefined();
            expect((_d = (_c = fileTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(9);
            expect((_f = (_e = fileTask.metadata.timeComponents) === null || _e === void 0 ? void 0 : _e.startTime) === null || _f === void 0 ? void 0 : _f.minute).toBe(0);
            expect((_h = (_g = fileTask.metadata.timeComponents) === null || _g === void 0 ? void 0 : _g.endTime) === null || _h === void 0 ? void 0 : _h.hour).toBe(17);
            expect((_k = (_j = fileTask.metadata.timeComponents) === null || _j === void 0 ? void 0 : _j.endTime) === null || _k === void 0 ? void 0 : _k.minute).toBe(0);
        });
        it("should combine date timestamps with time components", () => {
            var _a, _b, _c, _d;
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "appointment.md",
                    name: "appointment.md",
                    extension: "md",
                    getShortName: () => "appointment",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "appointment",
                    path: "appointment.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Doctor appointment at 3:30 PM",
                    status: " ",
                    completed: false,
                    due: "2025-08-25", // Date in YYYY-MM-DD format
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Doctor appointment at 3:30 PM";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    if (prop.name === "due")
                        return "2025-08-25";
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed", "due"]),
            };
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            expect(fileTask.content).toBe("Doctor appointment at 3:30 PM");
            // Check time component (could be dueTime or scheduledTime based on context)
            const timeComponent = ((_a = fileTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.dueTime) || ((_b = fileTask.metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.scheduledTime);
            expect(timeComponent).toBeDefined();
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.hour).toBe(15);
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.minute).toBe(30);
            // Check that enhanced datetime was created
            expect((_c = fileTask.metadata.enhancedDates) === null || _c === void 0 ? void 0 : _c.dueDateTime).toBeDefined();
            const dueDateTime = (_d = fileTask.metadata.enhancedDates) === null || _d === void 0 ? void 0 : _d.dueDateTime;
            if (dueDateTime) {
                expect(dueDateTime.getFullYear()).toBe(2025);
                expect(dueDateTime.getMonth()).toBe(7); // August (0-based)
                expect(dueDateTime.getDate()).toBe(25);
                expect(dueDateTime.getHours()).toBe(15);
                expect(dueDateTime.getMinutes()).toBe(30);
            }
        });
        it("should handle tasks without time information gracefully", () => {
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "simple-task.md",
                    name: "simple-task.md",
                    extension: "md",
                    getShortName: () => "simple-task",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "simple-task",
                    path: "simple-task.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Simple task without time",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Simple task without time";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            };
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            expect(fileTask.content).toBe("Simple task without time");
            expect(fileTask.metadata.timeComponents).toBeUndefined();
            expect(fileTask.metadata.enhancedDates).toBeUndefined();
        });
    });
    describe("Task Updates with Time Components", () => {
        it("should re-extract time components when content is updated", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "meeting.md",
                    name: "meeting.md",
                    extension: "md",
                    getShortName: () => "meeting",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "meeting",
                    path: "meeting.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Meeting at 2:00 PM",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Meeting at 2:00 PM";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            };
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            // Verify initial time component (could be dueTime or scheduledTime)
            const initialTimeComponent = ((_a = fileTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.dueTime) || ((_b = fileTask.metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.scheduledTime);
            expect(initialTimeComponent === null || initialTimeComponent === void 0 ? void 0 : initialTimeComponent.hour).toBe(14);
            expect(initialTimeComponent === null || initialTimeComponent === void 0 ? void 0 : initialTimeComponent.minute).toBe(0);
            // Update the task content with new time
            yield fileTaskManager.updateFileTask(fileTask, {
                content: "Meeting at 4:30 PM",
            });
            // Verify time component was updated
            const updatedTimeComponent = ((_c = fileTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.dueTime) || ((_d = fileTask.metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.scheduledTime);
            expect(updatedTimeComponent === null || updatedTimeComponent === void 0 ? void 0 : updatedTimeComponent.hour).toBe(16);
            expect(updatedTimeComponent === null || updatedTimeComponent === void 0 ? void 0 : updatedTimeComponent.minute).toBe(30);
        }));
    });
    describe("Error Handling", () => {
        it("should handle time parsing errors gracefully", () => {
            // Create a file task manager without time parsing service
            const fileTaskManagerNoTime = new FileTaskManagerImpl(mockApp);
            const mockEntry = {
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: "test.md",
                    name: "test.md",
                    extension: "md",
                    getShortName: () => "test",
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: "test",
                    path: "test.md",
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: "Task with invalid time 25:99",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Task with invalid time 25:99";
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            };
            // Should not throw error even without time parsing service
            const fileTask = fileTaskManagerNoTime.entryToFileTask(mockEntry);
            expect(fileTask.content).toBe("Task with invalid time 25:99");
            expect(fileTask.metadata.timeComponents).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVRhc2tNYW5hZ2VyVGltZUludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGaWxlVGFza01hbmFnZXJUaW1lSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRzs7QUFFSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUl0RSxvQkFBb0I7QUFDcEIsTUFBTSxPQUFPLEdBQUc7SUFDZixLQUFLLEVBQUU7UUFDTixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUNmLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0tBQ2pCO0lBQ0QsV0FBVyxFQUFFO1FBQ1osVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7S0FDckI7Q0FDaUIsQ0FBQztBQThCcEIsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxJQUFJLGVBQW9DLENBQUM7SUFDekMsSUFBSSxrQkFBc0MsQ0FBQztJQUUzQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2Ysc0RBQXNEO1FBQ3RELE1BQU0sVUFBVSxHQUFzQjtZQUNyQyxPQUFPLEVBQUUsSUFBSTtZQUNiLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDO1lBQzFCLFlBQVksRUFBRTtnQkFDYixLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQztnQkFDbEMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUM7Z0JBQzlCLFNBQVMsRUFBRSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDO2FBQ25DO1lBQ0Qsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixpQkFBaUIsRUFBRSxJQUFJ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QVUsRUFBRTtvQkFDWCxLQUFLLEVBQUUsOEJBQThCO29CQUNyQyxNQUFNLEVBQUUsR0FBRztvQkFDWCxTQUFTLEVBQUUsS0FBSztpQkFDaEI7Z0JBQ0QsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRTtvQkFDL0IsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU87d0JBQUUsT0FBTyw4QkFBOEIsQ0FBQztvQkFDakUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7d0JBQUUsT0FBTyxHQUFHLENBQUM7b0JBQ3ZDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXO3dCQUFFLE9BQU8sS0FBSyxDQUFDO29CQUM1QyxPQUFPLFNBQVMsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO2dCQUNGLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUN6QixlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDMUIsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQ2hFLENBQUM7WUFFRiwyREFBMkQ7WUFDM0QsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEludGVncmF0aW9uIHRlc3RzIGZvciBGaWxlVGFza01hbmFnZXIgd2l0aCBlbmhhbmNlZCB0aW1lIHBhcnNpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBGaWxlVGFza01hbmFnZXJJbXBsIH0gZnJvbSBcIi4uL21hbmFnZXJzL2ZpbGUtdGFzay1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFRpbWVQYXJzaW5nU2VydmljZSB9IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ0NvbmZpZyB9IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbi8vIE1vY2sgT2JzaWRpYW4gQXBwXHJcbmNvbnN0IG1vY2tBcHAgPSB7XHJcblx0dmF1bHQ6IHtcclxuXHRcdGdldEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRcdHJlYWQ6IGplc3QuZm4oKSxcclxuXHRcdG1vZGlmeTogamVzdC5mbigpLFxyXG5cdH0sXHJcblx0ZmlsZU1hbmFnZXI6IHtcclxuXHRcdHJlbmFtZUZpbGU6IGplc3QuZm4oKSxcclxuXHR9LFxyXG59IGFzIHVua25vd24gYXMgQXBwO1xyXG5cclxuLy8gTW9jayBCYXNlc0VudHJ5IGZvciB0ZXN0aW5nXHJcbmludGVyZmFjZSBNb2NrQmFzZXNFbnRyeSB7XHJcblx0Y3R4OiBhbnk7XHJcblx0ZmlsZToge1xyXG5cdFx0cGFyZW50OiBhbnk7XHJcblx0XHRkZWxldGVkOiBib29sZWFuO1xyXG5cdFx0dmF1bHQ6IGFueTtcclxuXHRcdHBhdGg6IHN0cmluZztcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHRcdGV4dGVuc2lvbjogc3RyaW5nO1xyXG5cdFx0Z2V0U2hvcnROYW1lKCk6IHN0cmluZztcclxuXHR9O1xyXG5cdGZvcm11bGFzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdGltcGxpY2l0OiB7XHJcblx0XHRmaWxlOiBhbnk7XHJcblx0XHRuYW1lOiBzdHJpbmc7XHJcblx0XHRwYXRoOiBzdHJpbmc7XHJcblx0XHRmb2xkZXI6IHN0cmluZztcclxuXHRcdGV4dDogc3RyaW5nO1xyXG5cdH07XHJcblx0bGF6eUV2YWxDYWNoZTogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHRwcm9wZXJ0aWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdGdldFZhbHVlKHByb3A6IHsgdHlwZTogXCJwcm9wZXJ0eVwiIHwgXCJmaWxlXCIgfCBcImZvcm11bGFcIjsgbmFtZTogc3RyaW5nIH0pOiBhbnk7XHJcblx0dXBkYXRlUHJvcGVydHkoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiB2b2lkO1xyXG5cdGdldEZvcm11bGFWYWx1ZShmb3JtdWxhOiBzdHJpbmcpOiBhbnk7XHJcblx0Z2V0UHJvcGVydHlLZXlzKCk6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5kZXNjcmliZShcIkZpbGVUYXNrTWFuYWdlciBUaW1lIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRsZXQgZmlsZVRhc2tNYW5hZ2VyOiBGaWxlVGFza01hbmFnZXJJbXBsO1xyXG5cdGxldCB0aW1lUGFyc2luZ1NlcnZpY2U6IFRpbWVQYXJzaW5nU2VydmljZTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHQvLyBDcmVhdGUgdGltZSBwYXJzaW5nIHNlcnZpY2Ugd2l0aCB0ZXN0IGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IHRpbWVDb25maWc6IFRpbWVQYXJzaW5nQ29uZmlnID0ge1xyXG5cdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRzdXBwb3J0ZWRMYW5ndWFnZXM6IFtcImVuXCJdLFxyXG5cdFx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0XHRzdGFydDogW1wic3RhcnRcIiwgXCJmcm9tXCIsIFwiYmVnaW5zXCJdLFxyXG5cdFx0XHRcdGR1ZTogW1wiZHVlXCIsIFwiZGVhZGxpbmVcIiwgXCJieVwiXSxcclxuXHRcdFx0XHRzY2hlZHVsZWQ6IFtcInNjaGVkdWxlZFwiLCBcImF0XCIsIFwiQFwiXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0cmVtb3ZlT3JpZ2luYWxUZXh0OiBmYWxzZSxcclxuXHRcdFx0cGVyTGluZVByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRcdHJlYWxUaW1lUmVwbGFjZW1lbnQ6IGZhbHNlLFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aW1lUGFyc2luZ1NlcnZpY2UgPSBuZXcgVGltZVBhcnNpbmdTZXJ2aWNlKHRpbWVDb25maWcpO1xyXG5cdFx0ZmlsZVRhc2tNYW5hZ2VyID0gbmV3IEZpbGVUYXNrTWFuYWdlckltcGwobW9ja0FwcCwgdW5kZWZpbmVkLCB0aW1lUGFyc2luZ1NlcnZpY2UpO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRpbWUgQ29tcG9uZW50IEV4dHJhY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgZXh0cmFjdCBzaW5nbGUgdGltZSBmcm9tIHRhc2sgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIEZpcnN0IHRlc3QgdGhlIHRpbWUgcGFyc2luZyBzZXJ2aWNlIGRpcmVjdGx5XHJcblx0XHRcdGNvbnN0IGRpcmVjdFJlc3VsdCA9IHRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVDb21wb25lbnRzKFwiTWVldGluZyBhdCAyOjMwIFBNXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgbW9ja0VudHJ5OiBNb2NrQmFzZXNFbnRyeSA9IHtcclxuXHRcdFx0XHRjdHg6IHt9LFxyXG5cdFx0XHRcdGZpbGU6IHtcclxuXHRcdFx0XHRcdHBhcmVudDogbnVsbCxcclxuXHRcdFx0XHRcdGRlbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0dmF1bHQ6IG51bGwsXHJcblx0XHRcdFx0XHRwYXRoOiBcInRlc3QtdGFzay5tZFwiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJ0ZXN0LXRhc2subWRcIixcclxuXHRcdFx0XHRcdGV4dGVuc2lvbjogXCJtZFwiLFxyXG5cdFx0XHRcdFx0Z2V0U2hvcnROYW1lOiAoKSA9PiBcInRlc3QtdGFza1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Zm9ybXVsYXM6IHt9LFxyXG5cdFx0XHRcdGltcGxpY2l0OiB7XHJcblx0XHRcdFx0XHRmaWxlOiBudWxsLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJ0ZXN0LXRhc2tcIixcclxuXHRcdFx0XHRcdHBhdGg6IFwidGVzdC10YXNrLm1kXCIsXHJcblx0XHRcdFx0XHRmb2xkZXI6IFwiXCIsXHJcblx0XHRcdFx0XHRleHQ6IFwibWRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxhenlFdmFsQ2FjaGU6IHt9LFxyXG5cdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdHRpdGxlOiBcIk1lZXRpbmcgYXQgMjozMCBQTVwiLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRnZXRWYWx1ZTogamVzdC5mbigocHJvcDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInRpdGxlXCIpIHJldHVybiBcIk1lZXRpbmcgYXQgMjozMCBQTVwiO1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJzdGF0dXNcIikgcmV0dXJuIFwiIFwiO1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJjb21wbGV0ZWRcIikgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9KSxcclxuXHRcdFx0XHR1cGRhdGVQcm9wZXJ0eTogamVzdC5mbigpLFxyXG5cdFx0XHRcdGdldEZvcm11bGFWYWx1ZTogamVzdC5mbigpLFxyXG5cdFx0XHRcdGdldFByb3BlcnR5S2V5czogamVzdC5mbigoKSA9PiBbXCJ0aXRsZVwiLCBcInN0YXR1c1wiLCBcImNvbXBsZXRlZFwiXSksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlVGFzayA9IGZpbGVUYXNrTWFuYWdlci5lbnRyeVRvRmlsZVRhc2sobW9ja0VudHJ5KTtcclxuXHJcblx0XHRcdC8vIERlYnVnOiBDaGVjayB3aGF0IHdlIGdvdCBmcm9tIGRpcmVjdCBwYXJzaW5nXHJcblx0XHRcdGV4cGVjdChkaXJlY3RSZXN1bHQudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGNvbnN0IGhhc1RpbWVDb21wb25lbnRzID0gT2JqZWN0LmtleXMoZGlyZWN0UmVzdWx0LnRpbWVDb21wb25lbnRzKS5sZW5ndGggPiAwO1xyXG5cdFx0XHRleHBlY3QoaGFzVGltZUNvbXBvbmVudHMpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2suY29udGVudCkudG9CZShcIk1lZXRpbmcgYXQgMjozMCBQTVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIGRpcmVjdCBwYXJzaW5nIHdvcmtzIGJ1dCBmaWxlIHRhc2sgZG9lc24ndCwgdGhlcmUncyBhbiBpbnRlZ3JhdGlvbiBpc3N1ZVxyXG5cdFx0XHRpZiAoaGFzVGltZUNvbXBvbmVudHMgJiYgIWZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBEaXJlY3QgcGFyc2luZyBmb3VuZCB0aW1lIGNvbXBvbmVudHMgYnV0IEZpbGVUYXNrTWFuYWdlciBkaWRuJ3QuIERpcmVjdCByZXN1bHQ6ICR7SlNPTi5zdHJpbmdpZnkoZGlyZWN0UmVzdWx0KX1gKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWUgfHwgZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWUgfHwgZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWU7XHJcblx0XHRcdGV4cGVjdCh0aW1lQ29tcG9uZW50Py5ob3VyKS50b0JlKDE0KTtcclxuXHRcdFx0ZXhwZWN0KHRpbWVDb21wb25lbnQ/Lm1pbnV0ZSkudG9CZSgzMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBleHRyYWN0IHRpbWUgcmFuZ2UgZnJvbSB0YXNrIGNvbnRlbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrRW50cnk6IE1vY2tCYXNlc0VudHJ5ID0ge1xyXG5cdFx0XHRcdGN0eDoge30sXHJcblx0XHRcdFx0ZmlsZToge1xyXG5cdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR2YXVsdDogbnVsbCxcclxuXHRcdFx0XHRcdHBhdGg6IFwid29ya3Nob3AubWRcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwid29ya3Nob3AubWRcIixcclxuXHRcdFx0XHRcdGV4dGVuc2lvbjogXCJtZFwiLFxyXG5cdFx0XHRcdFx0Z2V0U2hvcnROYW1lOiAoKSA9PiBcIndvcmtzaG9wXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmb3JtdWxhczoge30sXHJcblx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdGZpbGU6IG51bGwsXHJcblx0XHRcdFx0XHRuYW1lOiBcIndvcmtzaG9wXCIsXHJcblx0XHRcdFx0XHRwYXRoOiBcIndvcmtzaG9wLm1kXCIsXHJcblx0XHRcdFx0XHRmb2xkZXI6IFwiXCIsXHJcblx0XHRcdFx0XHRleHQ6IFwibWRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxhenlFdmFsQ2FjaGU6IHt9LFxyXG5cdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdHRpdGxlOiBcIldvcmtzaG9wIDk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Z2V0VmFsdWU6IGplc3QuZm4oKHByb3A6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJ0aXRsZVwiKSByZXR1cm4gXCJXb3Jrc2hvcCA5OjAwLTE3OjAwXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInN0YXR1c1wiKSByZXR1cm4gXCIgXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImNvbXBsZXRlZFwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH0pLFxyXG5cdFx0XHRcdHVwZGF0ZVByb3BlcnR5OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0Rm9ybXVsYVZhbHVlOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0UHJvcGVydHlLZXlzOiBqZXN0LmZuKCgpID0+IFtcInRpdGxlXCIsIFwic3RhdHVzXCIsIFwiY29tcGxldGVkXCJdKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGZpbGVUYXNrID0gZmlsZVRhc2tNYW5hZ2VyLmVudHJ5VG9GaWxlVGFzayhtb2NrRW50cnkpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLmNvbnRlbnQpLnRvQmUoXCJXb3Jrc2hvcCA5OjAwLTE3OjAwXCIpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmVuZFRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lPy5ob3VyKS50b0JlKDkpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZT8ubWludXRlKS50b0JlKDApO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmVuZFRpbWU/LmhvdXIpLnRvQmUoMTcpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmVuZFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGNvbWJpbmUgZGF0ZSB0aW1lc3RhbXBzIHdpdGggdGltZSBjb21wb25lbnRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9ja0VudHJ5OiBNb2NrQmFzZXNFbnRyeSA9IHtcclxuXHRcdFx0XHRjdHg6IHt9LFxyXG5cdFx0XHRcdGZpbGU6IHtcclxuXHRcdFx0XHRcdHBhcmVudDogbnVsbCxcclxuXHRcdFx0XHRcdGRlbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0dmF1bHQ6IG51bGwsXHJcblx0XHRcdFx0XHRwYXRoOiBcImFwcG9pbnRtZW50Lm1kXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcImFwcG9pbnRtZW50Lm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJhcHBvaW50bWVudFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Zm9ybXVsYXM6IHt9LFxyXG5cdFx0XHRcdGltcGxpY2l0OiB7XHJcblx0XHRcdFx0XHRmaWxlOiBudWxsLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJhcHBvaW50bWVudFwiLFxyXG5cdFx0XHRcdFx0cGF0aDogXCJhcHBvaW50bWVudC5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJEb2N0b3IgYXBwb2ludG1lbnQgYXQgMzozMCBQTVwiLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRkdWU6IFwiMjAyNS0wOC0yNVwiLCAvLyBEYXRlIGluIFlZWVktTU0tREQgZm9ybWF0XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRnZXRWYWx1ZTogamVzdC5mbigocHJvcDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInRpdGxlXCIpIHJldHVybiBcIkRvY3RvciBhcHBvaW50bWVudCBhdCAzOjMwIFBNXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInN0YXR1c1wiKSByZXR1cm4gXCIgXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImNvbXBsZXRlZFwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImR1ZVwiKSByZXR1cm4gXCIyMDI1LTA4LTI1XCI7XHJcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH0pLFxyXG5cdFx0XHRcdHVwZGF0ZVByb3BlcnR5OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0Rm9ybXVsYVZhbHVlOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0UHJvcGVydHlLZXlzOiBqZXN0LmZuKCgpID0+IFtcInRpdGxlXCIsIFwic3RhdHVzXCIsIFwiY29tcGxldGVkXCIsIFwiZHVlXCJdKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGZpbGVUYXNrID0gZmlsZVRhc2tNYW5hZ2VyLmVudHJ5VG9GaWxlVGFzayhtb2NrRW50cnkpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLmNvbnRlbnQpLnRvQmUoXCJEb2N0b3IgYXBwb2ludG1lbnQgYXQgMzozMCBQTVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENoZWNrIHRpbWUgY29tcG9uZW50IChjb3VsZCBiZSBkdWVUaW1lIG9yIHNjaGVkdWxlZFRpbWUgYmFzZWQgb24gY29udGV4dClcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5kdWVUaW1lIHx8IGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lO1xyXG5cdFx0XHRleHBlY3QodGltZUNvbXBvbmVudCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRpbWVDb21wb25lbnQ/LmhvdXIpLnRvQmUoMTUpO1xyXG5cdFx0XHRleHBlY3QodGltZUNvbXBvbmVudD8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENoZWNrIHRoYXQgZW5oYW5jZWQgZGF0ZXRpbWUgd2FzIGNyZWF0ZWRcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LmR1ZURhdGVUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlVGltZSA9IGZpbGVUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LmR1ZURhdGVUaW1lO1xyXG5cdFx0XHRpZiAoZHVlRGF0ZVRpbWUpIHtcclxuXHRcdFx0XHRleHBlY3QoZHVlRGF0ZVRpbWUuZ2V0RnVsbFllYXIoKSkudG9CZSgyMDI1KTtcclxuXHRcdFx0XHRleHBlY3QoZHVlRGF0ZVRpbWUuZ2V0TW9udGgoKSkudG9CZSg3KTsgLy8gQXVndXN0ICgwLWJhc2VkKVxyXG5cdFx0XHRcdGV4cGVjdChkdWVEYXRlVGltZS5nZXREYXRlKCkpLnRvQmUoMjUpO1xyXG5cdFx0XHRcdGV4cGVjdChkdWVEYXRlVGltZS5nZXRIb3VycygpKS50b0JlKDE1KTtcclxuXHRcdFx0XHRleHBlY3QoZHVlRGF0ZVRpbWUuZ2V0TWludXRlcygpKS50b0JlKDMwKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2tzIHdpdGhvdXQgdGltZSBpbmZvcm1hdGlvbiBncmFjZWZ1bGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9ja0VudHJ5OiBNb2NrQmFzZXNFbnRyeSA9IHtcclxuXHRcdFx0XHRjdHg6IHt9LFxyXG5cdFx0XHRcdGZpbGU6IHtcclxuXHRcdFx0XHRcdHBhcmVudDogbnVsbCxcclxuXHRcdFx0XHRcdGRlbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0dmF1bHQ6IG51bGwsXHJcblx0XHRcdFx0XHRwYXRoOiBcInNpbXBsZS10YXNrLm1kXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcInNpbXBsZS10YXNrLm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJzaW1wbGUtdGFza1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Zm9ybXVsYXM6IHt9LFxyXG5cdFx0XHRcdGltcGxpY2l0OiB7XHJcblx0XHRcdFx0XHRmaWxlOiBudWxsLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJzaW1wbGUtdGFza1wiLFxyXG5cdFx0XHRcdFx0cGF0aDogXCJzaW1wbGUtdGFzay5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJTaW1wbGUgdGFzayB3aXRob3V0IHRpbWVcIixcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Z2V0VmFsdWU6IGplc3QuZm4oKHByb3A6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJ0aXRsZVwiKSByZXR1cm4gXCJTaW1wbGUgdGFzayB3aXRob3V0IHRpbWVcIjtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwic3RhdHVzXCIpIHJldHVybiBcIiBcIjtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwiY29tcGxldGVkXCIpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fSksXHJcblx0XHRcdFx0dXBkYXRlUHJvcGVydHk6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRGb3JtdWxhVmFsdWU6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRQcm9wZXJ0eUtleXM6IGplc3QuZm4oKCkgPT4gW1widGl0bGVcIiwgXCJzdGF0dXNcIiwgXCJjb21wbGV0ZWRcIl0pLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZmlsZVRhc2sgPSBmaWxlVGFza01hbmFnZXIuZW50cnlUb0ZpbGVUYXNrKG1vY2tFbnRyeSk7XHJcblxyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2suY29udGVudCkudG9CZShcIlNpbXBsZSB0YXNrIHdpdGhvdXQgdGltZVwiKTtcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIFVwZGF0ZXMgd2l0aCBUaW1lIENvbXBvbmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcmUtZXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgd2hlbiBjb250ZW50IGlzIHVwZGF0ZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrRW50cnk6IE1vY2tCYXNlc0VudHJ5ID0ge1xyXG5cdFx0XHRcdGN0eDoge30sXHJcblx0XHRcdFx0ZmlsZToge1xyXG5cdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR2YXVsdDogbnVsbCxcclxuXHRcdFx0XHRcdHBhdGg6IFwibWVldGluZy5tZFwiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJtZWV0aW5nLm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJtZWV0aW5nXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmb3JtdWxhczoge30sXHJcblx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdGZpbGU6IG51bGwsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1lZXRpbmdcIixcclxuXHRcdFx0XHRcdHBhdGg6IFwibWVldGluZy5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJNZWV0aW5nIGF0IDI6MDAgUE1cIixcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Z2V0VmFsdWU6IGplc3QuZm4oKHByb3A6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJ0aXRsZVwiKSByZXR1cm4gXCJNZWV0aW5nIGF0IDI6MDAgUE1cIjtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwic3RhdHVzXCIpIHJldHVybiBcIiBcIjtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwiY29tcGxldGVkXCIpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fSksXHJcblx0XHRcdFx0dXBkYXRlUHJvcGVydHk6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRGb3JtdWxhVmFsdWU6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRQcm9wZXJ0eUtleXM6IGplc3QuZm4oKCkgPT4gW1widGl0bGVcIiwgXCJzdGF0dXNcIiwgXCJjb21wbGV0ZWRcIl0pLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZmlsZVRhc2sgPSBmaWxlVGFza01hbmFnZXIuZW50cnlUb0ZpbGVUYXNrKG1vY2tFbnRyeSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgaW5pdGlhbCB0aW1lIGNvbXBvbmVudCAoY291bGQgYmUgZHVlVGltZSBvciBzY2hlZHVsZWRUaW1lKVxyXG5cdFx0XHRjb25zdCBpbml0aWFsVGltZUNvbXBvbmVudCA9IGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5kdWVUaW1lIHx8IGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lO1xyXG5cdFx0XHRleHBlY3QoaW5pdGlhbFRpbWVDb21wb25lbnQ/LmhvdXIpLnRvQmUoMTQpO1xyXG5cdFx0XHRleHBlY3QoaW5pdGlhbFRpbWVDb21wb25lbnQ/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzayBjb250ZW50IHdpdGggbmV3IHRpbWVcclxuXHRcdFx0YXdhaXQgZmlsZVRhc2tNYW5hZ2VyLnVwZGF0ZUZpbGVUYXNrKGZpbGVUYXNrLCB7XHJcblx0XHRcdFx0Y29udGVudDogXCJNZWV0aW5nIGF0IDQ6MzAgUE1cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGltZSBjb21wb25lbnQgd2FzIHVwZGF0ZWRcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFRpbWVDb21wb25lbnQgPSBmaWxlVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uZHVlVGltZSB8fCBmaWxlVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc2NoZWR1bGVkVGltZTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRUaW1lQ29tcG9uZW50Py5ob3VyKS50b0JlKDE2KTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRUaW1lQ29tcG9uZW50Py5taW51dGUpLnRvQmUoMzApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRXJyb3IgSGFuZGxpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRpbWUgcGFyc2luZyBlcnJvcnMgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIGZpbGUgdGFzayBtYW5hZ2VyIHdpdGhvdXQgdGltZSBwYXJzaW5nIHNlcnZpY2VcclxuXHRcdFx0Y29uc3QgZmlsZVRhc2tNYW5hZ2VyTm9UaW1lID0gbmV3IEZpbGVUYXNrTWFuYWdlckltcGwobW9ja0FwcCk7XHJcblxyXG5cdFx0XHRjb25zdCBtb2NrRW50cnk6IE1vY2tCYXNlc0VudHJ5ID0ge1xyXG5cdFx0XHRcdGN0eDoge30sXHJcblx0XHRcdFx0ZmlsZToge1xyXG5cdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR2YXVsdDogbnVsbCxcclxuXHRcdFx0XHRcdHBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJ0ZXN0XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmb3JtdWxhczoge30sXHJcblx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdGZpbGU6IG51bGwsXHJcblx0XHRcdFx0XHRuYW1lOiBcInRlc3RcIixcclxuXHRcdFx0XHRcdHBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJUYXNrIHdpdGggaW52YWxpZCB0aW1lIDI1Ojk5XCIsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGdldFZhbHVlOiBqZXN0LmZuKChwcm9wOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwidGl0bGVcIikgcmV0dXJuIFwiVGFzayB3aXRoIGludmFsaWQgdGltZSAyNTo5OVwiO1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJzdGF0dXNcIikgcmV0dXJuIFwiIFwiO1xyXG5cdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJjb21wbGV0ZWRcIikgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9KSxcclxuXHRcdFx0XHR1cGRhdGVQcm9wZXJ0eTogamVzdC5mbigpLFxyXG5cdFx0XHRcdGdldEZvcm11bGFWYWx1ZTogamVzdC5mbigpLFxyXG5cdFx0XHRcdGdldFByb3BlcnR5S2V5czogamVzdC5mbigoKSA9PiBbXCJ0aXRsZVwiLCBcInN0YXR1c1wiLCBcImNvbXBsZXRlZFwiXSksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgbm90IHRocm93IGVycm9yIGV2ZW4gd2l0aG91dCB0aW1lIHBhcnNpbmcgc2VydmljZVxyXG5cdFx0XHRjb25zdCBmaWxlVGFzayA9IGZpbGVUYXNrTWFuYWdlck5vVGltZS5lbnRyeVRvRmlsZVRhc2sobW9ja0VudHJ5KTtcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLmNvbnRlbnQpLnRvQmUoXCJUYXNrIHdpdGggaW52YWxpZCB0aW1lIDI1Ojk5XCIpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=