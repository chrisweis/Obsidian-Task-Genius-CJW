/**
 * Enhanced Time Parsing Integration Tests
 *
 * Tests for cross-component functionality including:
 * - End-to-end flow from task creation to timeline display
 * - Time component preservation across task updates
 * - Backward compatibility with existing tasks without time information
 * - ICS event integration with enhanced time parsing
 */
import { __awaiter } from "tslib";
import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG } from "../services/time-parsing-service";
import { FileTaskManagerImpl } from "../managers/file-task-manager";
import { IcsManager } from "../managers/ics-manager";
import { IcsParser } from "../parsers/ics-parser";
import { TaskMigrationService } from "../services/task-migration-service";
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
// Mock plugin settings
const mockPluginSettings = {
    taskStatusMarks: {
        "Not Started": " ",
        "In Progress": "/",
        Completed: "x",
        Abandoned: "-",
        Planned: "?",
    },
};
describe("Enhanced Time Parsing Integration Tests", () => {
    let timeParsingService;
    let fileTaskManager;
    let icsManager;
    let migrationService;
    beforeEach(() => {
        // Initialize services with enhanced configuration
        const enhancedConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                singleTime: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/,
                ],
                timeRange: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~\uff5e]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
                ],
                rangeSeparators: ["-", "~", "\uff5e", " - ", " ~ "],
            }, timeDefaults: {
                preferredFormat: "24h",
                defaultPeriod: "PM",
                midnightCrossing: "next-day",
            } });
        timeParsingService = new TimeParsingService(enhancedConfig);
        fileTaskManager = new FileTaskManagerImpl(mockApp, undefined, timeParsingService);
        migrationService = new TaskMigrationService();
        // Initialize ICS manager
        const testSource = {
            id: "integration-test",
            name: "Integration Test Calendar",
            url: "https://example.com/test.ics",
            enabled: true,
            refreshInterval: 60,
            showAllDayEvents: true,
            showTimedEvents: true,
            showType: "event",
        };
        const icsConfig = {
            sources: [testSource],
            globalRefreshInterval: 60,
            maxCacheAge: 24,
            enableBackgroundRefresh: false,
            networkTimeout: 30,
            maxEventsPerSource: 1000,
            showInCalendar: true,
            showInTaskLists: true,
            defaultEventColor: "#3498db",
        };
        icsManager = new IcsManager(icsConfig, mockPluginSettings, undefined, timeParsingService);
    });
    describe("End-to-End Flow: Task Creation to Timeline Display", () => {
        test("should handle complete flow from file task creation to timeline rendering", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            // Step 1: Create file task with time information
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
                    title: "Team meeting 14:00-16:00 tomorrow",
                    status: " ",
                    completed: false,
                    due: "2025-08-25",
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Team meeting 14:00-16:00 tomorrow";
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
            // Step 2: Convert to file task (simulates task parsing)
            const fileTask = fileTaskManager.entryToFileTask(mockEntry);
            // Verify task has enhanced metadata
            expect(fileTask.content).toBe("Team meeting 14:00-16:00 tomorrow");
            expect(fileTask.metadata.timeComponents).toBeDefined();
            expect((_b = (_a = fileTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(14);
            expect((_d = (_c = fileTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.endTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(16);
            expect((_e = fileTask.metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.startDateTime).toBeDefined();
            expect((_f = fileTask.metadata.enhancedDates) === null || _f === void 0 ? void 0 : _f.endDateTime).toBeDefined();
            // Step 3: Create timeline event from task (simulates timeline view processing)
            const timelineEvent = {
                id: fileTask.id,
                title: fileTask.content,
                date: new Date(fileTask.metadata.dueDate),
                task: fileTask,
                timeInfo: {
                    primaryTime: fileTask.metadata.enhancedDates.startDateTime,
                    endTime: fileTask.metadata.enhancedDates.endDateTime,
                    isRange: true,
                    timeComponent: fileTask.metadata.timeComponents.startTime,
                    displayFormat: "range",
                },
            };
            // Step 4: Verify timeline event has correct time information
            expect((_g = timelineEvent.timeInfo) === null || _g === void 0 ? void 0 : _g.primaryTime.getHours()).toBe(14);
            expect((_j = (_h = timelineEvent.timeInfo) === null || _h === void 0 ? void 0 : _h.endTime) === null || _j === void 0 ? void 0 : _j.getHours()).toBe(16);
            expect((_k = timelineEvent.timeInfo) === null || _k === void 0 ? void 0 : _k.isRange).toBe(true);
            expect((_l = timelineEvent.timeInfo) === null || _l === void 0 ? void 0 : _l.displayFormat).toBe("range");
            // Step 5: Verify timeline sorting would work correctly
            const anotherEvent = {
                id: "another-event",
                title: "Earlier meeting",
                date: new Date(fileTask.metadata.dueDate),
                timeInfo: {
                    primaryTime: new Date(2025, 7, 25, 9, 0),
                    isRange: false,
                    displayFormat: "time-only",
                },
            };
            const events = [timelineEvent, anotherEvent].sort((a, b) => a.timeInfo.primaryTime.getTime() - b.timeInfo.primaryTime.getTime());
            expect(events[0].title).toBe("Earlier meeting");
            expect(events[1].title).toBe("Team meeting 14:00-16:00 tomorrow");
        });
        test("should handle inline task creation with time components", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            // Simulate inline task parsing
            const inlineTaskText = "- [ ] Call client at 3:30 PM 📅 2025-08-25";
            // Parse time components from inline task
            const parseResult = timeParsingService.parseTimeExpressions(inlineTaskText);
            expect(parseResult.timeComponents.scheduledTime).toBeDefined();
            expect((_a = parseResult.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(15);
            expect((_b = parseResult.timeComponents.scheduledTime) === null || _b === void 0 ? void 0 : _b.minute).toBe(30);
            // Create task from parsed result
            const inlineTask = {
                id: "inline-task-1",
                content: "Call client at 3:30 PM",
                filePath: "notes.md",
                line: 5,
                completed: false,
                status: " ",
                originalMarkdown: inlineTaskText,
                metadata: {
                    dueDate: new Date("2025-08-25").getTime(),
                    timeComponents: parseResult.timeComponents,
                    enhancedDates: {
                        dueDateTime: new Date(2025, 7, 25, 15, 30), // Combine date + time
                    },
                    tags: [],
                    children: [],
                },
            };
            // Verify enhanced metadata
            expect((_d = (_c = inlineTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(15);
            expect((_f = (_e = inlineTask.metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.dueDateTime) === null || _f === void 0 ? void 0 : _f.getHours()).toBe(15);
            expect((_h = (_g = inlineTask.metadata.enhancedDates) === null || _g === void 0 ? void 0 : _g.dueDateTime) === null || _h === void 0 ? void 0 : _h.getMinutes()).toBe(30);
            // Create timeline event
            const timelineEvent = {
                id: inlineTask.id,
                title: inlineTask.content,
                date: new Date(inlineTask.metadata.dueDate),
                task: inlineTask,
                timeInfo: {
                    primaryTime: inlineTask.metadata.enhancedDates.dueDateTime,
                    isRange: false,
                    timeComponent: inlineTask.metadata.timeComponents.scheduledTime,
                    displayFormat: "date-time",
                },
            };
            expect((_j = timelineEvent.timeInfo) === null || _j === void 0 ? void 0 : _j.primaryTime.getHours()).toBe(15);
            expect((_k = timelineEvent.timeInfo) === null || _k === void 0 ? void 0 : _k.primaryTime.getMinutes()).toBe(30);
        });
    });
    describe("Time Component Preservation Across Task Updates", () => {
        test("should preserve time components when updating task content", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            // Create initial task with time
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
                    title: "Doctor appointment at 2:00 PM",
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return "Doctor appointment at 2:00 PM";
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
            const originalTask = fileTaskManager.entryToFileTask(mockEntry);
            // Verify original time component
            expect((_b = (_a = originalTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(14);
            // Update task content with new time
            yield fileTaskManager.updateFileTask(originalTask, {
                content: "Doctor appointment at 4:30 PM",
            });
            // Verify time component was updated
            expect((_d = (_c = originalTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(16);
            expect((_f = (_e = originalTask.metadata.timeComponents) === null || _e === void 0 ? void 0 : _e.scheduledTime) === null || _f === void 0 ? void 0 : _f.minute).toBe(30);
        }));
        test("should preserve time components when completing tasks", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            // Create task with time range
            const taskWithTime = {
                id: "workshop-task",
                content: "Workshop 9:00-17:00",
                filePath: "events.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Workshop 9:00-17:00",
                metadata: {
                    timeComponents: {
                        startTime: {
                            hour: 9,
                            minute: 0,
                            originalText: "9:00",
                            isRange: true,
                        },
                        endTime: {
                            hour: 17,
                            minute: 0,
                            originalText: "17:00",
                            isRange: true,
                        },
                    },
                    enhancedDates: {
                        startDateTime: new Date(2025, 7, 25, 9, 0),
                        endDateTime: new Date(2025, 7, 25, 17, 0),
                    },
                    tags: [],
                    children: [],
                },
            };
            // Complete the task
            const completedTask = Object.assign(Object.assign({}, taskWithTime), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, taskWithTime.metadata), { completedDate: Date.now() }) });
            // Verify time components are preserved
            expect((_b = (_a = completedTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(9);
            expect((_d = (_c = completedTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.endTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(17);
            expect((_f = (_e = completedTask.metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.startDateTime) === null || _f === void 0 ? void 0 : _f.getHours()).toBe(9);
            expect((_h = (_g = completedTask.metadata.enhancedDates) === null || _g === void 0 ? void 0 : _g.endDateTime) === null || _h === void 0 ? void 0 : _h.getHours()).toBe(17);
        });
        test("should handle task status changes while preserving time data", () => {
            var _a, _b, _c, _d, _e, _f;
            const taskWithTime = {
                id: "status-change-task",
                content: "Meeting at 3:00 PM",
                filePath: "tasks.md",
                line: 2,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Meeting at 3:00 PM",
                metadata: {
                    timeComponents: {
                        scheduledTime: {
                            hour: 15,
                            minute: 0,
                            originalText: "3:00 PM",
                            isRange: false,
                        },
                    },
                    enhancedDates: {
                        scheduledDateTime: new Date(2025, 7, 25, 15, 0),
                    },
                    tags: [],
                    children: [],
                },
            };
            // Change status to in-progress
            const inProgressTask = Object.assign(Object.assign({}, taskWithTime), { status: "/" });
            // Change status to completed
            const completedTask = Object.assign(Object.assign({}, inProgressTask), { completed: true, status: "x", metadata: Object.assign(Object.assign({}, inProgressTask.metadata), { completedDate: Date.now() }) });
            // Verify time components preserved through all status changes
            expect((_b = (_a = inProgressTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(15);
            expect((_d = (_c = completedTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(15);
            expect((_f = (_e = completedTask.metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.scheduledDateTime) === null || _f === void 0 ? void 0 : _f.getHours()).toBe(15);
        });
    });
    describe("Backward Compatibility with Existing Tasks", () => {
        test("should handle existing tasks without time information", () => {
            // Create legacy task without time components
            const legacyTask = {
                id: "legacy-task",
                content: "Legacy task without time",
                filePath: "old-tasks.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Legacy task without time",
                metadata: {
                    dueDate: new Date("2025-08-25").getTime(),
                    tags: [],
                    children: [],
                },
            };
            // Migrate to enhanced metadata
            const migratedTask = migrationService.migrateTaskToEnhanced(legacyTask);
            // Should preserve all original data
            expect(migratedTask.id).toBe(legacyTask.id);
            expect(migratedTask.content).toBe(legacyTask.content);
            expect(migratedTask.metadata.dueDate).toBe(legacyTask.metadata.dueDate);
            expect(migratedTask.metadata.tags).toEqual(legacyTask.metadata.tags);
            // Should not have time components (no time in content)
            expect(migratedTask.metadata.timeComponents).toBeUndefined();
            expect(migratedTask.metadata.enhancedDates).toBeUndefined();
        });
        test("should migrate existing tasks with parseable time information", () => {
            var _a, _b, _c, _d, _e;
            // Create legacy task with time in content but no time components
            const legacyTaskWithTime = {
                id: "legacy-with-time",
                content: "Meeting at 2:30 PM tomorrow",
                filePath: "old-tasks.md",
                line: 2,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Meeting at 2:30 PM tomorrow",
                metadata: {
                    dueDate: new Date("2025-08-25").getTime(),
                    tags: [],
                    children: [],
                },
            };
            // Migrate to enhanced metadata
            const migratedTask = migrationService.migrateTaskToEnhanced(legacyTaskWithTime);
            // Should preserve original data
            expect(migratedTask.content).toBe(legacyTaskWithTime.content);
            expect(migratedTask.metadata.dueDate).toBe(legacyTaskWithTime.metadata.dueDate);
            // Should add time components from parsing
            expect(migratedTask.metadata.timeComponents).toBeDefined();
            expect((_b = (_a = migratedTask.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(14);
            expect((_d = (_c = migratedTask.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime) === null || _d === void 0 ? void 0 : _d.minute).toBe(30);
            // Should create enhanced datetime
            expect((_e = migratedTask.metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.scheduledDateTime).toBeDefined();
        });
        test("should handle mixed task collections (with and without time)", () => {
            var _a, _b;
            const mixedTasks = [
                {
                    id: "no-time-task",
                    content: "Simple task",
                    filePath: "tasks.md",
                    line: 1,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Simple task",
                    metadata: { tags: [], children: [] },
                },
                {
                    id: "with-time-task",
                    content: "Meeting at 3:00 PM",
                    filePath: "tasks.md",
                    line: 2,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Meeting at 3:00 PM",
                    metadata: { tags: [], children: [] },
                },
            ];
            // Migrate all tasks
            const migratedTasks = mixedTasks.map(task => migrationService.migrateTaskToEnhanced(task));
            // First task should not have time components
            expect(migratedTasks[0].metadata.timeComponents).toBeUndefined();
            // Second task should have time components
            expect((_b = (_a = migratedTasks[1].metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(15);
            // Both should be valid enhanced tasks
            expect(migratedTasks[0].id).toBe("no-time-task");
            expect(migratedTasks[1].id).toBe("with-time-task");
        });
    });
    describe("ICS Event Integration with Enhanced Time Parsing", () => {
        test("should preserve ICS time information while applying enhanced parsing", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Integration Test//EN
BEGIN:VEVENT
UID:meeting-with-description@example.com
DTSTART:20250825T140000Z
DTEND:20250825T160000Z
SUMMARY:Team Meeting
DESCRIPTION:Daily standup from 2:00 PM to 4:00 PM with break at 3:00-3:15
LOCATION:Conference Room
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
            const testSource = icsManager.getConfig().sources[0];
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            // Convert to tasks
            const tasks = icsManager.convertEventsToTasks(parseResult.events);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have original ICS time information
            expect(task.icsEvent).toBeDefined();
            expect((_a = task.icsEvent) === null || _a === void 0 ? void 0 : _a.dtstart).toBeDefined();
            expect((_b = task.icsEvent) === null || _b === void 0 ? void 0 : _b.dtend).toBeDefined();
            // Should have enhanced time components from ICS times
            expect(metadata.timeComponents).toBeDefined();
            expect((_d = (_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(14);
            expect((_f = (_e = metadata.timeComponents) === null || _e === void 0 ? void 0 : _e.endTime) === null || _f === void 0 ? void 0 : _f.hour).toBe(16);
            // Should also parse time from description
            expect((_g = metadata.enhancedDates) === null || _g === void 0 ? void 0 : _g.startDateTime).toBeDefined();
            expect((_h = metadata.enhancedDates) === null || _h === void 0 ? void 0 : _h.endDateTime).toBeDefined();
        });
        test("should handle ICS all-day events with time parsing from description", () => {
            var _a, _b, _c;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//All Day Test//EN
BEGIN:VEVENT
UID:allday-with-time@example.com
DTSTART;VALUE=DATE:20250825
DTEND;VALUE=DATE:20250826
SUMMARY:Conference Day
DESCRIPTION:Conference starts at 9:00 AM and ends at 5:00 PM with lunch 12:00-13:00
LOCATION:Convention Center
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
            const testSource = icsManager.getConfig().sources[0];
            const parseResult = IcsParser.parse(icsData, testSource);
            const tasks = icsManager.convertEventsToTasks(parseResult.events);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should be all-day event
            expect((_a = task.icsEvent) === null || _a === void 0 ? void 0 : _a.allDay).toBe(true);
            // Should have time components parsed from description
            expect(metadata.timeComponents).toBeDefined();
            // Should find the first time mentioned (9:00 AM)
            const timeComponent = ((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.startTime) || ((_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime);
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.hour).toBe(9);
        });
        test("should handle ICS events with time in location field", () => {
            var _a, _b;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Location Time Test//EN
BEGIN:VEVENT
UID:location-time@example.com
DTSTART;VALUE=DATE:20250825
SUMMARY:Dinner Event
DESCRIPTION:Team dinner
LOCATION:Restaurant at 7:30 PM, 123 Main St
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
            const testSource = icsManager.getConfig().sources[0];
            const parseResult = IcsParser.parse(icsData, testSource);
            const tasks = icsManager.convertEventsToTasks(parseResult.events);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should parse time from location field
            expect(metadata.timeComponents).toBeDefined();
            const timeComponent = ((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime) || ((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.dueTime);
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.hour).toBe(19); // 7:30 PM
            expect(timeComponent === null || timeComponent === void 0 ? void 0 : timeComponent.minute).toBe(30);
        });
        test("should maintain ICS event compatibility after time enhancement", () => {
            var _a;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Compatibility Test//EN
BEGIN:VEVENT
UID:compatibility@example.com
DTSTART:20250825T100000Z
DTEND:20250825T110000Z
SUMMARY:Compatibility Test
DESCRIPTION:Test event for compatibility
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
            const testSource = icsManager.getConfig().sources[0];
            const parseResult = IcsParser.parse(icsData, testSource);
            const tasks = icsManager.convertEventsToTasks(parseResult.events);
            const task = tasks[0];
            // Should maintain all ICS properties
            expect(task.readonly).toBe(true);
            expect(task.source.type).toBe("ics");
            expect(task.filePath).toBe("ics://Integration Test Calendar");
            expect(task.icsEvent).toBeDefined();
            expect((_a = task.icsEvent) === null || _a === void 0 ? void 0 : _a.uid).toBe("compatibility@example.com");
            // Should have enhanced metadata
            const metadata = task.metadata;
            expect(metadata.timeComponents).toBeDefined();
            expect(metadata.enhancedDates).toBeDefined();
            // Should maintain original timestamps for compatibility
            expect(metadata.startDate).toBeDefined();
            expect(metadata.project).toBe("Integration Test Calendar");
        });
    });
    describe("Performance and Error Handling", () => {
        test("should handle large numbers of tasks efficiently", () => {
            const startTime = Date.now();
            const taskCount = 100;
            // Create many tasks with time information
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const task = {
                    id: `perf-task-${i}`,
                    content: `Task ${i} at ${9 + (i % 8)}:${(i % 4) * 15} AM`,
                    filePath: "performance-test.md",
                    line: i,
                    completed: false,
                    status: " ",
                    originalMarkdown: `- [ ] Task ${i} at ${9 + (i % 8)}:${(i % 4) * 15} AM`,
                    metadata: { tags: [], children: [] },
                };
                tasks.push(task);
            }
            // Migrate all tasks
            const migratedTasks = tasks.map(task => migrationService.migrateTaskToEnhanced(task));
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(5000); // 5 seconds
            expect(migratedTasks).toHaveLength(taskCount);
            // Verify some tasks have time components
            const tasksWithTime = migratedTasks.filter(t => t.metadata.timeComponents);
            expect(tasksWithTime.length).toBeGreaterThan(0);
        });
        test("should handle parsing errors gracefully in integration", () => {
            // Create tasks with various problematic content
            const problematicTasks = [
                {
                    id: "invalid-time-1",
                    content: "Meeting at 25:99",
                    filePath: "errors.md",
                    line: 1,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Meeting at 25:99",
                    metadata: { tags: [], children: [] },
                },
                {
                    id: "malformed-range",
                    content: "Workshop 12:00--15:00",
                    filePath: "errors.md",
                    line: 2,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] Workshop 12:00--15:00",
                    metadata: { tags: [], children: [] },
                },
                {
                    id: "empty-content",
                    content: "",
                    filePath: "errors.md",
                    line: 3,
                    completed: false,
                    status: " ",
                    originalMarkdown: "- [ ] ",
                    metadata: { tags: [], children: [] },
                },
            ];
            // Should not throw errors during migration
            expect(() => {
                const migratedTasks = problematicTasks.map(task => migrationService.migrateTaskToEnhanced(task));
                // All tasks should be migrated (even if without time components)
                expect(migratedTasks).toHaveLength(3);
                // Tasks with invalid time should not have time components
                expect(migratedTasks[0].metadata.timeComponents).toBeUndefined();
                expect(migratedTasks[1].metadata.timeComponents).toBeUndefined();
                expect(migratedTasks[2].metadata.timeComponents).toBeUndefined();
                // But should preserve other metadata
                expect(migratedTasks[0].id).toBe("invalid-time-1");
                expect(migratedTasks[1].id).toBe("malformed-range");
                expect(migratedTasks[2].id).toBe("empty-content");
            }).not.toThrow();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW5oYW5jZWRUaW1lUGFyc2luZ0ludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJFbmhhbmNlZFRpbWVQYXJzaW5nSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBWTFFLG9CQUFvQjtBQUNwQixNQUFNLE9BQU8sR0FBRztJQUNmLEtBQUssRUFBRTtRQUNOLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ3hCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7S0FDakI7SUFDRCxXQUFXLEVBQUU7UUFDWixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUNyQjtDQUNpQixDQUFDO0FBRXBCLHVCQUF1QjtBQUN2QixNQUFNLGtCQUFrQixHQUFHO0lBQzFCLGVBQWUsRUFBRTtRQUNoQixhQUFhLEVBQUUsR0FBRztRQUNsQixhQUFhLEVBQUUsR0FBRztRQUNsQixTQUFTLEVBQUUsR0FBRztRQUNkLFNBQVMsRUFBRSxHQUFHO1FBQ2QsT0FBTyxFQUFFLEdBQUc7S0FDWjtDQUNNLENBQUM7QUE2Q1QsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtJQUN4RCxJQUFJLGtCQUFzQyxDQUFDO0lBQzNDLElBQUksZUFBb0MsQ0FBQztJQUN6QyxJQUFJLFVBQXNC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Q0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVuaGFuY2VkIFRpbWUgUGFyc2luZyBJbnRlZ3JhdGlvbiBUZXN0c1xyXG4gKiBcclxuICogVGVzdHMgZm9yIGNyb3NzLWNvbXBvbmVudCBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZzpcclxuICogLSBFbmQtdG8tZW5kIGZsb3cgZnJvbSB0YXNrIGNyZWF0aW9uIHRvIHRpbWVsaW5lIGRpc3BsYXlcclxuICogLSBUaW1lIGNvbXBvbmVudCBwcmVzZXJ2YXRpb24gYWNyb3NzIHRhc2sgdXBkYXRlc1xyXG4gKiAtIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBleGlzdGluZyB0YXNrcyB3aXRob3V0IHRpbWUgaW5mb3JtYXRpb25cclxuICogLSBJQ1MgZXZlbnQgaW50ZWdyYXRpb24gd2l0aCBlbmhhbmNlZCB0aW1lIHBhcnNpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ1NlcnZpY2UsIERFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyB9IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgeyBGaWxlVGFza01hbmFnZXJJbXBsIH0gZnJvbSBcIi4uL21hbmFnZXJzL2ZpbGUtdGFzay1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEljc01hbmFnZXIgfSBmcm9tIFwiLi4vbWFuYWdlcnMvaWNzLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgSWNzUGFyc2VyIH0gZnJvbSBcIi4uL3BhcnNlcnMvaWNzLXBhcnNlclwiO1xyXG5pbXBvcnQgeyBUYXNrTWlncmF0aW9uU2VydmljZSB9IGZyb20gXCIuLi9zZXJ2aWNlcy90YXNrLW1pZ3JhdGlvbi1zZXJ2aWNlXCI7XHJcbmltcG9ydCB0eXBlIHtcclxuXHRUaW1lQ29tcG9uZW50LFxyXG5cdEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdCxcclxuXHRFbmhhbmNlZFRpbWVFeHByZXNzaW9uLFxyXG5cdEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWcsXHJcblx0RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSxcclxufSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzaywgU3RhbmRhcmRUYXNrTWV0YWRhdGEgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgdHlwZSB7IEljc1NvdXJjZSwgSWNzTWFuYWdlckNvbmZpZyB9IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIE9ic2lkaWFuIEFwcFxyXG5jb25zdCBtb2NrQXBwID0ge1xyXG5cdHZhdWx0OiB7XHJcblx0XHRnZXRGaWxlQnlQYXRoOiBqZXN0LmZuKCksXHJcblx0XHRyZWFkOiBqZXN0LmZuKCksXHJcblx0XHRtb2RpZnk6IGplc3QuZm4oKSxcclxuXHR9LFxyXG5cdGZpbGVNYW5hZ2VyOiB7XHJcblx0XHRyZW5hbWVGaWxlOiBqZXN0LmZuKCksXHJcblx0fSxcclxufSBhcyB1bmtub3duIGFzIEFwcDtcclxuXHJcbi8vIE1vY2sgcGx1Z2luIHNldHRpbmdzXHJcbmNvbnN0IG1vY2tQbHVnaW5TZXR0aW5ncyA9IHtcclxuXHR0YXNrU3RhdHVzTWFya3M6IHtcclxuXHRcdFwiTm90IFN0YXJ0ZWRcIjogXCIgXCIsXHJcblx0XHRcIkluIFByb2dyZXNzXCI6IFwiL1wiLFxyXG5cdFx0Q29tcGxldGVkOiBcInhcIixcclxuXHRcdEFiYW5kb25lZDogXCItXCIsXHJcblx0XHRQbGFubmVkOiBcIj9cIixcclxuXHR9LFxyXG59IGFzIGFueTtcclxuXHJcbi8vIE1vY2sgQmFzZXNFbnRyeSBmb3IgZmlsZSB0YXNrIHRlc3RpbmdcclxuaW50ZXJmYWNlIE1vY2tCYXNlc0VudHJ5IHtcclxuXHRjdHg6IGFueTtcclxuXHRmaWxlOiB7XHJcblx0XHRwYXJlbnQ6IGFueTtcclxuXHRcdGRlbGV0ZWQ6IGJvb2xlYW47XHJcblx0XHR2YXVsdDogYW55O1xyXG5cdFx0cGF0aDogc3RyaW5nO1xyXG5cdFx0bmFtZTogc3RyaW5nO1xyXG5cdFx0ZXh0ZW5zaW9uOiBzdHJpbmc7XHJcblx0XHRnZXRTaG9ydE5hbWUoKTogc3RyaW5nO1xyXG5cdH07XHJcblx0Zm9ybXVsYXM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0aW1wbGljaXQ6IHtcclxuXHRcdGZpbGU6IGFueTtcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHRcdHBhdGg6IHN0cmluZztcclxuXHRcdGZvbGRlcjogc3RyaW5nO1xyXG5cdFx0ZXh0OiBzdHJpbmc7XHJcblx0fTtcclxuXHRsYXp5RXZhbENhY2hlOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0Z2V0VmFsdWUocHJvcDogeyB0eXBlOiBcInByb3BlcnR5XCIgfCBcImZpbGVcIiB8IFwiZm9ybXVsYVwiOyBuYW1lOiBzdHJpbmcgfSk6IGFueTtcclxuXHR1cGRhdGVQcm9wZXJ0eShrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQ7XHJcblx0Z2V0Rm9ybXVsYVZhbHVlKGZvcm11bGE6IHN0cmluZyk6IGFueTtcclxuXHRnZXRQcm9wZXJ0eUtleXMoKTogc3RyaW5nW107XHJcbn1cclxuXHJcbi8vIE1vY2sgVGltZWxpbmVFdmVudCBpbnRlcmZhY2UgZm9yIHRlc3RpbmdcclxuaW50ZXJmYWNlIE1vY2tUaW1lbGluZUV2ZW50IHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdHRpdGxlOiBzdHJpbmc7XHJcblx0ZGF0ZTogRGF0ZTtcclxuXHR0YXNrPzogVGFzaztcclxuXHR0aW1lSW5mbz86IHtcclxuXHRcdHByaW1hcnlUaW1lOiBEYXRlO1xyXG5cdFx0ZW5kVGltZT86IERhdGU7XHJcblx0XHRpc1JhbmdlOiBib29sZWFuO1xyXG5cdFx0dGltZUNvbXBvbmVudD86IFRpbWVDb21wb25lbnQ7XHJcblx0XHRkaXNwbGF5Rm9ybWF0OiBcInRpbWUtb25seVwiIHwgXCJkYXRlLXRpbWVcIiB8IFwicmFuZ2VcIjtcclxuXHR9O1xyXG59XHJcblxyXG5kZXNjcmliZShcIkVuaGFuY2VkIFRpbWUgUGFyc2luZyBJbnRlZ3JhdGlvbiBUZXN0c1wiLCAoKSA9PiB7XHJcblx0bGV0IHRpbWVQYXJzaW5nU2VydmljZTogVGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cdGxldCBmaWxlVGFza01hbmFnZXI6IEZpbGVUYXNrTWFuYWdlckltcGw7XHJcblx0bGV0IGljc01hbmFnZXI6IEljc01hbmFnZXI7XHJcblx0bGV0IG1pZ3JhdGlvblNlcnZpY2U6IFRhc2tNaWdyYXRpb25TZXJ2aWNlO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdC8vIEluaXRpYWxpemUgc2VydmljZXMgd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uXHJcblx0XHRjb25zdCBlbmhhbmNlZENvbmZpZzogRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyA9IHtcclxuXHRcdFx0Li4uREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLFxyXG5cdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRzaW5nbGVUaW1lOiBbXHJcblx0XHRcdFx0XHQvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvLFxyXG5cdFx0XHRcdFx0L1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi8sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHR0aW1lUmFuZ2U6IFtcclxuXHRcdFx0XHRcdC9cXGIoWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccypbLX5cXHVmZjVlXVxccyooWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xcYi8sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwiXFx1ZmY1ZVwiLCBcIiAtIFwiLCBcIiB+IFwiXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0cHJlZmVycmVkRm9ybWF0OiBcIjI0aFwiLFxyXG5cdFx0XHRcdGRlZmF1bHRQZXJpb2Q6IFwiUE1cIixcclxuXHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdHRpbWVQYXJzaW5nU2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoZW5oYW5jZWRDb25maWcpO1xyXG5cdFx0ZmlsZVRhc2tNYW5hZ2VyID0gbmV3IEZpbGVUYXNrTWFuYWdlckltcGwobW9ja0FwcCwgdW5kZWZpbmVkLCB0aW1lUGFyc2luZ1NlcnZpY2UpO1xyXG5cdFx0bWlncmF0aW9uU2VydmljZSA9IG5ldyBUYXNrTWlncmF0aW9uU2VydmljZSgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgSUNTIG1hbmFnZXJcclxuXHRcdGNvbnN0IHRlc3RTb3VyY2U6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0aWQ6IFwiaW50ZWdyYXRpb24tdGVzdFwiLFxyXG5cdFx0XHRuYW1lOiBcIkludGVncmF0aW9uIFRlc3QgQ2FsZW5kYXJcIixcclxuXHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vdGVzdC5pY3NcIixcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBpY3NDb25maWc6IEljc01hbmFnZXJDb25maWcgPSB7XHJcblx0XHRcdHNvdXJjZXM6IFt0ZXN0U291cmNlXSxcclxuXHRcdFx0Z2xvYmFsUmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0bWF4Q2FjaGVBZ2U6IDI0LFxyXG5cdFx0XHRlbmFibGVCYWNrZ3JvdW5kUmVmcmVzaDogZmFsc2UsXHJcblx0XHRcdG5ldHdvcmtUaW1lb3V0OiAzMCxcclxuXHRcdFx0bWF4RXZlbnRzUGVyU291cmNlOiAxMDAwLFxyXG5cdFx0XHRzaG93SW5DYWxlbmRhcjogdHJ1ZSxcclxuXHRcdFx0c2hvd0luVGFza0xpc3RzOiB0cnVlLFxyXG5cdFx0XHRkZWZhdWx0RXZlbnRDb2xvcjogXCIjMzQ5OGRiXCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdGljc01hbmFnZXIgPSBuZXcgSWNzTWFuYWdlcihpY3NDb25maWcsIG1vY2tQbHVnaW5TZXR0aW5ncywgdW5kZWZpbmVkLCB0aW1lUGFyc2luZ1NlcnZpY2UpO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVuZC10by1FbmQgRmxvdzogVGFzayBDcmVhdGlvbiB0byBUaW1lbGluZSBEaXNwbGF5XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGNvbXBsZXRlIGZsb3cgZnJvbSBmaWxlIHRhc2sgY3JlYXRpb24gdG8gdGltZWxpbmUgcmVuZGVyaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gU3RlcCAxOiBDcmVhdGUgZmlsZSB0YXNrIHdpdGggdGltZSBpbmZvcm1hdGlvblxyXG5cdFx0XHRjb25zdCBtb2NrRW50cnk6IE1vY2tCYXNlc0VudHJ5ID0ge1xyXG5cdFx0XHRcdGN0eDoge30sXHJcblx0XHRcdFx0ZmlsZToge1xyXG5cdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR2YXVsdDogbnVsbCxcclxuXHRcdFx0XHRcdHBhdGg6IFwibWVldGluZy5tZFwiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJtZWV0aW5nLm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJtZWV0aW5nXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmb3JtdWxhczoge30sXHJcblx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdGZpbGU6IG51bGwsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1lZXRpbmdcIixcclxuXHRcdFx0XHRcdHBhdGg6IFwibWVldGluZy5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJUZWFtIG1lZXRpbmcgMTQ6MDAtMTY6MDAgdG9tb3Jyb3dcIixcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZHVlOiBcIjIwMjUtMDgtMjVcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGdldFZhbHVlOiBqZXN0LmZuKChwcm9wOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwidGl0bGVcIikgcmV0dXJuIFwiVGVhbSBtZWV0aW5nIDE0OjAwLTE2OjAwIHRvbW9ycm93XCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInN0YXR1c1wiKSByZXR1cm4gXCIgXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImNvbXBsZXRlZFwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImR1ZVwiKSByZXR1cm4gXCIyMDI1LTA4LTI1XCI7XHJcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH0pLFxyXG5cdFx0XHRcdHVwZGF0ZVByb3BlcnR5OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0Rm9ybXVsYVZhbHVlOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0UHJvcGVydHlLZXlzOiBqZXN0LmZuKCgpID0+IFtcInRpdGxlXCIsIFwic3RhdHVzXCIsIFwiY29tcGxldGVkXCIsIFwiZHVlXCJdKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgMjogQ29udmVydCB0byBmaWxlIHRhc2sgKHNpbXVsYXRlcyB0YXNrIHBhcnNpbmcpXHJcblx0XHRcdGNvbnN0IGZpbGVUYXNrID0gZmlsZVRhc2tNYW5hZ2VyLmVudHJ5VG9GaWxlVGFzayhtb2NrRW50cnkpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVmVyaWZ5IHRhc2sgaGFzIGVuaGFuY2VkIG1ldGFkYXRhXHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5jb250ZW50KS50b0JlKFwiVGVhbSBtZWV0aW5nIDE0OjAwLTE2OjAwIHRvbW9ycm93XCIpO1xyXG5cdFx0XHRleHBlY3QoZmlsZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lPy5ob3VyKS50b0JlKDE0KTtcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lPy5ob3VyKS50b0JlKDE2KTtcclxuXHRcdFx0ZXhwZWN0KGZpbGVUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LnN0YXJ0RGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChmaWxlVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5lbmREYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgMzogQ3JlYXRlIHRpbWVsaW5lIGV2ZW50IGZyb20gdGFzayAoc2ltdWxhdGVzIHRpbWVsaW5lIHZpZXcgcHJvY2Vzc2luZylcclxuXHRcdFx0Y29uc3QgdGltZWxpbmVFdmVudDogTW9ja1RpbWVsaW5lRXZlbnQgPSB7XHJcblx0XHRcdFx0aWQ6IGZpbGVUYXNrLmlkLFxyXG5cdFx0XHRcdHRpdGxlOiBmaWxlVGFzay5jb250ZW50LFxyXG5cdFx0XHRcdGRhdGU6IG5ldyBEYXRlKGZpbGVUYXNrLm1ldGFkYXRhLmR1ZURhdGUhKSxcclxuXHRcdFx0XHR0YXNrOiBmaWxlVGFzayBhcyBhbnksXHJcblx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdHByaW1hcnlUaW1lOiBmaWxlVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzIS5zdGFydERhdGVUaW1lISxcclxuXHRcdFx0XHRcdGVuZFRpbWU6IGZpbGVUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMhLmVuZERhdGVUaW1lLFxyXG5cdFx0XHRcdFx0aXNSYW5nZTogdHJ1ZSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IGZpbGVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzIS5zdGFydFRpbWUsXHJcblx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0OiBcInJhbmdlXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgNDogVmVyaWZ5IHRpbWVsaW5lIGV2ZW50IGhhcyBjb3JyZWN0IHRpbWUgaW5mb3JtYXRpb25cclxuXHRcdFx0ZXhwZWN0KHRpbWVsaW5lRXZlbnQudGltZUluZm8/LnByaW1hcnlUaW1lLmdldEhvdXJzKCkpLnRvQmUoMTQpO1xyXG5cdFx0XHRleHBlY3QodGltZWxpbmVFdmVudC50aW1lSW5mbz8uZW5kVGltZT8uZ2V0SG91cnMoKSkudG9CZSgxNik7XHJcblx0XHRcdGV4cGVjdCh0aW1lbGluZUV2ZW50LnRpbWVJbmZvPy5pc1JhbmdlKS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodGltZWxpbmVFdmVudC50aW1lSW5mbz8uZGlzcGxheUZvcm1hdCkudG9CZShcInJhbmdlXCIpO1xyXG5cclxuXHRcdFx0Ly8gU3RlcCA1OiBWZXJpZnkgdGltZWxpbmUgc29ydGluZyB3b3VsZCB3b3JrIGNvcnJlY3RseVxyXG5cdFx0XHRjb25zdCBhbm90aGVyRXZlbnQ6IE1vY2tUaW1lbGluZUV2ZW50ID0ge1xyXG5cdFx0XHRcdGlkOiBcImFub3RoZXItZXZlbnRcIixcclxuXHRcdFx0XHR0aXRsZTogXCJFYXJsaWVyIG1lZXRpbmdcIixcclxuXHRcdFx0XHRkYXRlOiBuZXcgRGF0ZShmaWxlVGFzay5tZXRhZGF0YS5kdWVEYXRlISksXHJcblx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZSgyMDI1LCA3LCAyNSwgOSwgMCksIC8vIDk6MDAgQU0gc2FtZSBkYXlcclxuXHRcdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZGlzcGxheUZvcm1hdDogXCJ0aW1lLW9ubHlcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRzID0gW3RpbWVsaW5lRXZlbnQsIGFub3RoZXJFdmVudF0uc29ydCgoYSwgYikgPT4gXHJcblx0XHRcdFx0YS50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpIC0gYi50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QoZXZlbnRzWzBdLnRpdGxlKS50b0JlKFwiRWFybGllciBtZWV0aW5nXCIpO1xyXG5cdFx0XHRleHBlY3QoZXZlbnRzWzFdLnRpdGxlKS50b0JlKFwiVGVhbSBtZWV0aW5nIDE0OjAwLTE2OjAwIHRvbW9ycm93XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgaW5saW5lIHRhc2sgY3JlYXRpb24gd2l0aCB0aW1lIGNvbXBvbmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBTaW11bGF0ZSBpbmxpbmUgdGFzayBwYXJzaW5nXHJcblx0XHRcdGNvbnN0IGlubGluZVRhc2tUZXh0ID0gXCItIFsgXSBDYWxsIGNsaWVudCBhdCAzOjMwIFBNIPCfk4UgMjAyNS0wOC0yNVwiO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gUGFyc2UgdGltZSBjb21wb25lbnRzIGZyb20gaW5saW5lIHRhc2tcclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSB0aW1lUGFyc2luZ1NlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoaW5saW5lVGFza1RleHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocGFyc2VSZXN1bHQudGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxNSk7XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lPy5taW51dGUpLnRvQmUoMzApO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRhc2sgZnJvbSBwYXJzZWQgcmVzdWx0XHJcblx0XHRcdGNvbnN0IGlubGluZVRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwiaW5saW5lLXRhc2stMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiQ2FsbCBjbGllbnQgYXQgMzozMCBQTVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcIm5vdGVzLm1kXCIsXHJcblx0XHRcdFx0bGluZTogNSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogaW5saW5lVGFza1RleHQsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKFwiMjAyNS0wOC0yNVwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czogcGFyc2VSZXN1bHQudGltZUNvbXBvbmVudHMsXHJcblx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdGR1ZURhdGVUaW1lOiBuZXcgRGF0ZSgyMDI1LCA3LCAyNSwgMTUsIDMwKSwgLy8gQ29tYmluZSBkYXRlICsgdGltZVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0ZXhwZWN0KGlubGluZVRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWU/LmhvdXIpLnRvQmUoMTUpO1xyXG5cdFx0XHRleHBlY3QoaW5saW5lVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5kdWVEYXRlVGltZT8uZ2V0SG91cnMoKSkudG9CZSgxNSk7XHJcblx0XHRcdGV4cGVjdChpbmxpbmVUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LmR1ZURhdGVUaW1lPy5nZXRNaW51dGVzKCkpLnRvQmUoMzApO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRpbWVsaW5lIGV2ZW50XHJcblx0XHRcdGNvbnN0IHRpbWVsaW5lRXZlbnQ6IE1vY2tUaW1lbGluZUV2ZW50ID0ge1xyXG5cdFx0XHRcdGlkOiBpbmxpbmVUYXNrLmlkLFxyXG5cdFx0XHRcdHRpdGxlOiBpbmxpbmVUYXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0ZGF0ZTogbmV3IERhdGUoaW5saW5lVGFzay5tZXRhZGF0YS5kdWVEYXRlISksXHJcblx0XHRcdFx0dGFzazogaW5saW5lVGFzayxcclxuXHRcdFx0XHR0aW1lSW5mbzoge1xyXG5cdFx0XHRcdFx0cHJpbWFyeVRpbWU6IGlubGluZVRhc2subWV0YWRhdGEuZW5oYW5jZWREYXRlcyEuZHVlRGF0ZVRpbWUhLFxyXG5cdFx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiBpbmxpbmVUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzIS5zY2hlZHVsZWRUaW1lLFxyXG5cdFx0XHRcdFx0ZGlzcGxheUZvcm1hdDogXCJkYXRlLXRpbWVcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHRpbWVsaW5lRXZlbnQudGltZUluZm8/LnByaW1hcnlUaW1lLmdldEhvdXJzKCkpLnRvQmUoMTUpO1xyXG5cdFx0XHRleHBlY3QodGltZWxpbmVFdmVudC50aW1lSW5mbz8ucHJpbWFyeVRpbWUuZ2V0TWludXRlcygpKS50b0JlKDMwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRpbWUgQ29tcG9uZW50IFByZXNlcnZhdGlvbiBBY3Jvc3MgVGFzayBVcGRhdGVzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgcHJlc2VydmUgdGltZSBjb21wb25lbnRzIHdoZW4gdXBkYXRpbmcgdGFzayBjb250ZW50XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGluaXRpYWwgdGFzayB3aXRoIHRpbWVcclxuXHRcdFx0Y29uc3QgbW9ja0VudHJ5OiBNb2NrQmFzZXNFbnRyeSA9IHtcclxuXHRcdFx0XHRjdHg6IHt9LFxyXG5cdFx0XHRcdGZpbGU6IHtcclxuXHRcdFx0XHRcdHBhcmVudDogbnVsbCxcclxuXHRcdFx0XHRcdGRlbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0dmF1bHQ6IG51bGwsXHJcblx0XHRcdFx0XHRwYXRoOiBcImFwcG9pbnRtZW50Lm1kXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcImFwcG9pbnRtZW50Lm1kXCIsXHJcblx0XHRcdFx0XHRleHRlbnNpb246IFwibWRcIixcclxuXHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gXCJhcHBvaW50bWVudFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Zm9ybXVsYXM6IHt9LFxyXG5cdFx0XHRcdGltcGxpY2l0OiB7XHJcblx0XHRcdFx0XHRmaWxlOiBudWxsLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJhcHBvaW50bWVudFwiLFxyXG5cdFx0XHRcdFx0cGF0aDogXCJhcHBvaW50bWVudC5tZFwiLFxyXG5cdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0ZXh0OiBcIm1kXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRsYXp5RXZhbENhY2hlOiB7fSxcclxuXHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJEb2N0b3IgYXBwb2ludG1lbnQgYXQgMjowMCBQTVwiLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRnZXRWYWx1ZTogamVzdC5mbigocHJvcDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInRpdGxlXCIpIHJldHVybiBcIkRvY3RvciBhcHBvaW50bWVudCBhdCAyOjAwIFBNXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcInN0YXR1c1wiKSByZXR1cm4gXCIgXCI7XHJcblx0XHRcdFx0XHRpZiAocHJvcC5uYW1lID09PSBcImNvbXBsZXRlZFwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH0pLFxyXG5cdFx0XHRcdHVwZGF0ZVByb3BlcnR5OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0Rm9ybXVsYVZhbHVlOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Z2V0UHJvcGVydHlLZXlzOiBqZXN0LmZuKCgpID0+IFtcInRpdGxlXCIsIFwic3RhdHVzXCIsIFwiY29tcGxldGVkXCJdKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsVGFzayA9IGZpbGVUYXNrTWFuYWdlci5lbnRyeVRvRmlsZVRhc2sobW9ja0VudHJ5KTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFZlcmlmeSBvcmlnaW5hbCB0aW1lIGNvbXBvbmVudFxyXG5cdFx0XHRleHBlY3Qob3JpZ2luYWxUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKDE0KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0YXNrIGNvbnRlbnQgd2l0aCBuZXcgdGltZVxyXG5cdFx0XHRhd2FpdCBmaWxlVGFza01hbmFnZXIudXBkYXRlRmlsZVRhc2sob3JpZ2luYWxUYXNrLCB7XHJcblx0XHRcdFx0Y29udGVudDogXCJEb2N0b3IgYXBwb2ludG1lbnQgYXQgNDozMCBQTVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aW1lIGNvbXBvbmVudCB3YXMgdXBkYXRlZFxyXG5cdFx0XHRleHBlY3Qob3JpZ2luYWxUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKDE2KTtcclxuXHRcdFx0ZXhwZWN0KG9yaWdpbmFsVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc2NoZWR1bGVkVGltZT8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJlc2VydmUgdGltZSBjb21wb25lbnRzIHdoZW4gY29tcGxldGluZyB0YXNrc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSB0YXNrIHdpdGggdGltZSByYW5nZVxyXG5cdFx0XHRjb25zdCB0YXNrV2l0aFRpbWU6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwid29ya3Nob3AtdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiV29ya3Nob3AgOTowMC0xNzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcImV2ZW50cy5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gV29ya3Nob3AgOTowMC0xNzowMFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czoge1xyXG5cdFx0XHRcdFx0XHRzdGFydFRpbWU6IHtcclxuXHRcdFx0XHRcdFx0XHRob3VyOiA5LFxyXG5cdFx0XHRcdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiOTowMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGVuZFRpbWU6IHtcclxuXHRcdFx0XHRcdFx0XHRob3VyOiAxNyxcclxuXHRcdFx0XHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjE3OjAwXCIsXHJcblx0XHRcdFx0XHRcdFx0aXNSYW5nZTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0RGF0ZVRpbWU6IG5ldyBEYXRlKDIwMjUsIDcsIDI1LCA5LCAwKSxcclxuXHRcdFx0XHRcdFx0ZW5kRGF0ZVRpbWU6IG5ldyBEYXRlKDIwMjUsIDcsIDI1LCAxNywgMCksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENvbXBsZXRlIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZFRhc2sgPSB7XHJcblx0XHRcdFx0Li4udGFza1dpdGhUaW1lLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwieFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHQuLi50YXNrV2l0aFRpbWUubWV0YWRhdGEsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGltZSBjb21wb25lbnRzIGFyZSBwcmVzZXJ2ZWRcclxuXHRcdFx0ZXhwZWN0KGNvbXBsZXRlZFRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZT8uaG91cikudG9CZSg5KTtcclxuXHRcdFx0ZXhwZWN0KGNvbXBsZXRlZFRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmVuZFRpbWU/LmhvdXIpLnRvQmUoMTcpO1xyXG5cdFx0XHRleHBlY3QoY29tcGxldGVkVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5zdGFydERhdGVUaW1lPy5nZXRIb3VycygpKS50b0JlKDkpO1xyXG5cdFx0XHRleHBlY3QoY29tcGxldGVkVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5lbmREYXRlVGltZT8uZ2V0SG91cnMoKSkudG9CZSgxNyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB0YXNrIHN0YXR1cyBjaGFuZ2VzIHdoaWxlIHByZXNlcnZpbmcgdGltZSBkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza1dpdGhUaW1lOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInN0YXR1cy1jaGFuZ2UtdGFza1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiTWVldGluZyBhdCAzOjAwIFBNXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGFza3MubWRcIixcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIE1lZXRpbmcgYXQgMzowMCBQTVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czoge1xyXG5cdFx0XHRcdFx0XHRzY2hlZHVsZWRUaW1lOiB7XHJcblx0XHRcdFx0XHRcdFx0aG91cjogMTUsXHJcblx0XHRcdFx0XHRcdFx0bWludXRlOiAwLFxyXG5cdFx0XHRcdFx0XHRcdG9yaWdpbmFsVGV4dDogXCIzOjAwIFBNXCIsXHJcblx0XHRcdFx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWREYXRlczoge1xyXG5cdFx0XHRcdFx0XHRzY2hlZHVsZWREYXRlVGltZTogbmV3IERhdGUoMjAyNSwgNywgMjUsIDE1LCAwKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ2hhbmdlIHN0YXR1cyB0byBpbi1wcm9ncmVzc1xyXG5cdFx0XHRjb25zdCBpblByb2dyZXNzVGFzayA9IHtcclxuXHRcdFx0XHQuLi50YXNrV2l0aFRpbWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcIi9cIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENoYW5nZSBzdGF0dXMgdG8gY29tcGxldGVkXHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZFRhc2sgPSB7XHJcblx0XHRcdFx0Li4uaW5Qcm9ncmVzc1Rhc2ssXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ4XCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdC4uLmluUHJvZ3Jlc3NUYXNrLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRpbWUgY29tcG9uZW50cyBwcmVzZXJ2ZWQgdGhyb3VnaCBhbGwgc3RhdHVzIGNoYW5nZXNcclxuXHRcdFx0ZXhwZWN0KGluUHJvZ3Jlc3NUYXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKDE1KTtcclxuXHRcdFx0ZXhwZWN0KGNvbXBsZXRlZFRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWU/LmhvdXIpLnRvQmUoMTUpO1xyXG5cdFx0XHRleHBlY3QoY29tcGxldGVkVGFzay5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5zY2hlZHVsZWREYXRlVGltZT8uZ2V0SG91cnMoKSkudG9CZSgxNSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCYWNrd2FyZCBDb21wYXRpYmlsaXR5IHdpdGggRXhpc3RpbmcgVGFza3NcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZXhpc3RpbmcgdGFza3Mgd2l0aG91dCB0aW1lIGluZm9ybWF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGxlZ2FjeSB0YXNrIHdpdGhvdXQgdGltZSBjb21wb25lbnRzXHJcblx0XHRcdGNvbnN0IGxlZ2FjeVRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcImxlZ2FjeS10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJMZWdhY3kgdGFzayB3aXRob3V0IHRpbWVcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJvbGQtdGFza3MubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIExlZ2FjeSB0YXNrIHdpdGhvdXQgdGltZVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjUtMDgtMjVcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1pZ3JhdGUgdG8gZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRUYXNrID0gbWlncmF0aW9uU2VydmljZS5taWdyYXRlVGFza1RvRW5oYW5jZWQobGVnYWN5VGFzayk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgcHJlc2VydmUgYWxsIG9yaWdpbmFsIGRhdGFcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFzay5pZCkudG9CZShsZWdhY3lUYXNrLmlkKTtcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFzay5jb250ZW50KS50b0JlKGxlZ2FjeVRhc2suY29udGVudCk7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSkudG9CZShsZWdhY3lUYXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3MpLnRvRXF1YWwobGVnYWN5VGFzay5tZXRhZGF0YS50YWdzKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgaGF2ZSB0aW1lIGNvbXBvbmVudHMgKG5vIHRpbWUgaW4gY29udGVudClcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cykudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbWlncmF0ZSBleGlzdGluZyB0YXNrcyB3aXRoIHBhcnNlYWJsZSB0aW1lIGluZm9ybWF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGxlZ2FjeSB0YXNrIHdpdGggdGltZSBpbiBjb250ZW50IGJ1dCBubyB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0Y29uc3QgbGVnYWN5VGFza1dpdGhUaW1lOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJsZWdhY3ktd2l0aC10aW1lXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJNZWV0aW5nIGF0IDI6MzAgUE0gdG9tb3Jyb3dcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJvbGQtdGFza3MubWRcIixcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIE1lZXRpbmcgYXQgMjozMCBQTSB0b21vcnJvd1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjUtMDgtMjVcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1pZ3JhdGUgdG8gZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRUYXNrID0gbWlncmF0aW9uU2VydmljZS5taWdyYXRlVGFza1RvRW5oYW5jZWQobGVnYWN5VGFza1dpdGhUaW1lKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBwcmVzZXJ2ZSBvcmlnaW5hbCBkYXRhXHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2suY29udGVudCkudG9CZShsZWdhY3lUYXNrV2l0aFRpbWUuY29udGVudCk7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSkudG9CZShsZWdhY3lUYXNrV2l0aFRpbWUubWV0YWRhdGEuZHVlRGF0ZSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgYWRkIHRpbWUgY29tcG9uZW50cyBmcm9tIHBhcnNpbmdcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxNCk7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWU/Lm1pbnV0ZSkudG9CZSgzMCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY3JlYXRlIGVuaGFuY2VkIGRhdGV0aW1lXHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2subWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc2NoZWR1bGVkRGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtaXhlZCB0YXNrIGNvbGxlY3Rpb25zICh3aXRoIGFuZCB3aXRob3V0IHRpbWUpXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbWl4ZWRUYXNrczogVGFza1tdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcIm5vLXRpbWUtdGFza1wiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJTaW1wbGUgdGFza1wiLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGFza3MubWRcIixcclxuXHRcdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gU2ltcGxlIHRhc2tcIixcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7IHRhZ3M6IFtdLCBjaGlsZHJlbjogW10gfSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcIndpdGgtdGltZS10YXNrXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIk1lZXRpbmcgYXQgMzowMCBQTVwiLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwidGFza3MubWRcIixcclxuXHRcdFx0XHRcdGxpbmU6IDIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gTWVldGluZyBhdCAzOjAwIFBNXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YTogeyB0YWdzOiBbXSwgY2hpbGRyZW46IFtdIH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdC8vIE1pZ3JhdGUgYWxsIHRhc2tzXHJcblx0XHRcdGNvbnN0IG1pZ3JhdGVkVGFza3MgPSBtaXhlZFRhc2tzLm1hcCh0YXNrID0+IFxyXG5cdFx0XHRcdG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZVRhc2tUb0VuaGFuY2VkKHRhc2spXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCB0YXNrIHNob3VsZCBub3QgaGF2ZSB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFza3NbMF0ubWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCB0YXNrIHNob3VsZCBoYXZlIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrc1sxXS5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxNSk7XHJcblxyXG5cdFx0XHQvLyBCb3RoIHNob3VsZCBiZSB2YWxpZCBlbmhhbmNlZCB0YXNrc1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrc1swXS5pZCkudG9CZShcIm5vLXRpbWUtdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFza3NbMV0uaWQpLnRvQmUoXCJ3aXRoLXRpbWUtdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIklDUyBFdmVudCBJbnRlZ3JhdGlvbiB3aXRoIEVuaGFuY2VkIFRpbWUgUGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHByZXNlcnZlIElDUyB0aW1lIGluZm9ybWF0aW9uIHdoaWxlIGFwcGx5aW5nIGVuaGFuY2VkIHBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vSW50ZWdyYXRpb24gVGVzdC8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDptZWV0aW5nLXdpdGgtZGVzY3JpcHRpb25AZXhhbXBsZS5jb21cclxuRFRTVEFSVDoyMDI1MDgyNVQxNDAwMDBaXHJcbkRURU5EOjIwMjUwODI1VDE2MDAwMFpcclxuU1VNTUFSWTpUZWFtIE1lZXRpbmdcclxuREVTQ1JJUFRJT046RGFpbHkgc3RhbmR1cCBmcm9tIDI6MDAgUE0gdG8gNDowMCBQTSB3aXRoIGJyZWFrIGF0IDM6MDAtMzoxNVxyXG5MT0NBVElPTjpDb25mZXJlbmNlIFJvb21cclxuU1RBVFVTOkNPTkZJUk1FRFxyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgdGVzdFNvdXJjZSA9IGljc01hbmFnZXIuZ2V0Q29uZmlnKCkuc291cmNlc1swXTtcclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QocGFyc2VSZXN1bHQuZXZlbnRzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHQvLyBDb252ZXJ0IHRvIHRhc2tzXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gaWNzTWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhwYXJzZVJlc3VsdC5ldmVudHMpO1xyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSBvcmlnaW5hbCBJQ1MgdGltZSBpbmZvcm1hdGlvblxyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2suaWNzRXZlbnQ/LmR0c3RhcnQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmljc0V2ZW50Py5kdGVuZCkudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIGVuaGFuY2VkIHRpbWUgY29tcG9uZW50cyBmcm9tIElDUyB0aW1lc1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lPy5ob3VyKS50b0JlKDE0KTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lPy5ob3VyKS50b0JlKDE2KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBhbHNvIHBhcnNlIHRpbWUgZnJvbSBkZXNjcmlwdGlvblxyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc3RhcnREYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LmVuZERhdGVUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgSUNTIGFsbC1kYXkgZXZlbnRzIHdpdGggdGltZSBwYXJzaW5nIGZyb20gZGVzY3JpcHRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vQWxsIERheSBUZXN0Ly9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOmFsbGRheS13aXRoLXRpbWVAZXhhbXBsZS5jb21cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMjUwODI1XHJcbkRURU5EO1ZBTFVFPURBVEU6MjAyNTA4MjZcclxuU1VNTUFSWTpDb25mZXJlbmNlIERheVxyXG5ERVNDUklQVElPTjpDb25mZXJlbmNlIHN0YXJ0cyBhdCA5OjAwIEFNIGFuZCBlbmRzIGF0IDU6MDAgUE0gd2l0aCBsdW5jaCAxMjowMC0xMzowMFxyXG5MT0NBVElPTjpDb252ZW50aW9uIENlbnRlclxyXG5TVEFUVVM6Q09ORklSTUVEXHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCB0ZXN0U291cmNlID0gaWNzTWFuYWdlci5nZXRDb25maWcoKS5zb3VyY2VzWzBdO1xyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKHBhcnNlUmVzdWx0LmV2ZW50cyk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGJlIGFsbC1kYXkgZXZlbnRcclxuXHRcdFx0ZXhwZWN0KHRhc2suaWNzRXZlbnQ/LmFsbERheSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIHRpbWUgY29tcG9uZW50cyBwYXJzZWQgZnJvbSBkZXNjcmlwdGlvblxyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdC8vIFNob3VsZCBmaW5kIHRoZSBmaXJzdCB0aW1lIG1lbnRpb25lZCAoOTowMCBBTSlcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zdGFydFRpbWUgfHwgbWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWU7XHJcblx0XHRcdGV4cGVjdCh0aW1lQ29tcG9uZW50Py5ob3VyKS50b0JlKDkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgSUNTIGV2ZW50cyB3aXRoIHRpbWUgaW4gbG9jYXRpb24gZmllbGRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vTG9jYXRpb24gVGltZSBUZXN0Ly9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOmxvY2F0aW9uLXRpbWVAZXhhbXBsZS5jb21cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMjUwODI1XHJcblNVTU1BUlk6RGlubmVyIEV2ZW50XHJcbkRFU0NSSVBUSU9OOlRlYW0gZGlubmVyXHJcbkxPQ0FUSU9OOlJlc3RhdXJhbnQgYXQgNzozMCBQTSwgMTIzIE1haW4gU3RcclxuU1RBVFVTOkNPTkZJUk1FRFxyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgdGVzdFNvdXJjZSA9IGljc01hbmFnZXIuZ2V0Q29uZmlnKCkuc291cmNlc1swXTtcclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gaWNzTWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhwYXJzZVJlc3VsdC5ldmVudHMpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBwYXJzZSB0aW1lIGZyb20gbG9jYXRpb24gZmllbGRcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50ID0gbWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnNjaGVkdWxlZFRpbWUgfHwgbWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWU7XHJcblx0XHRcdGV4cGVjdCh0aW1lQ29tcG9uZW50Py5ob3VyKS50b0JlKDE5KTsgLy8gNzozMCBQTVxyXG5cdFx0XHRleHBlY3QodGltZUNvbXBvbmVudD8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbWFpbnRhaW4gSUNTIGV2ZW50IGNvbXBhdGliaWxpdHkgYWZ0ZXIgdGltZSBlbmhhbmNlbWVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9UZXN0Ly9Db21wYXRpYmlsaXR5IFRlc3QvL0VOXHJcbkJFR0lOOlZFVkVOVFxyXG5VSUQ6Y29tcGF0aWJpbGl0eUBleGFtcGxlLmNvbVxyXG5EVFNUQVJUOjIwMjUwODI1VDEwMDAwMFpcclxuRFRFTkQ6MjAyNTA4MjVUMTEwMDAwWlxyXG5TVU1NQVJZOkNvbXBhdGliaWxpdHkgVGVzdFxyXG5ERVNDUklQVElPTjpUZXN0IGV2ZW50IGZvciBjb21wYXRpYmlsaXR5XHJcblNUQVRVUzpDT05GSVJNRURcclxuRU5EOlZFVkVOVFxyXG5FTkQ6VkNBTEVOREFSYDtcclxuXHJcblx0XHRcdGNvbnN0IHRlc3RTb3VyY2UgPSBpY3NNYW5hZ2VyLmdldENvbmZpZygpLnNvdXJjZXNbMF07XHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gSWNzUGFyc2VyLnBhcnNlKGljc0RhdGEsIHRlc3RTb3VyY2UpO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGljc01hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MocGFyc2VSZXN1bHQuZXZlbnRzKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBtYWludGFpbiBhbGwgSUNTIHByb3BlcnRpZXNcclxuXHRcdFx0ZXhwZWN0KHRhc2sucmVhZG9ubHkpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnNvdXJjZS50eXBlKS50b0JlKFwiaWNzXCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay5maWxlUGF0aCkudG9CZShcImljczovL0ludGVncmF0aW9uIFRlc3QgQ2FsZW5kYXJcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmljc0V2ZW50KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudD8udWlkKS50b0JlKFwiY29tcGF0aWJpbGl0eUBleGFtcGxlLmNvbVwiKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIGVuaGFuY2VkIG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG1haW50YWluIG9yaWdpbmFsIHRpbWVzdGFtcHMgZm9yIGNvbXBhdGliaWxpdHlcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnByb2plY3QpLnRvQmUoXCJJbnRlZ3JhdGlvbiBUZXN0IENhbGVuZGFyXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiUGVyZm9ybWFuY2UgYW5kIEVycm9yIEhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGxhcmdlIG51bWJlcnMgb2YgdGFza3MgZWZmaWNpZW50bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSAxMDA7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDcmVhdGUgbWFueSB0YXNrcyB3aXRoIHRpbWUgaW5mb3JtYXRpb25cclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tDb3VudDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRcdGlkOiBgcGVyZi10YXNrLSR7aX1gLFxyXG5cdFx0XHRcdFx0Y29udGVudDogYFRhc2sgJHtpfSBhdCAkezkgKyAoaSAlIDgpfTokeyhpICUgNCkgKiAxNX0gQU1gLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwicGVyZm9ybWFuY2UtdGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0bGluZTogaSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogYC0gWyBdIFRhc2sgJHtpfSBhdCAkezkgKyAoaSAlIDgpfTokeyhpICUgNCkgKiAxNX0gQU1gLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHsgdGFnczogW10sIGNoaWxkcmVuOiBbXSB9LFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTWlncmF0ZSBhbGwgdGFza3NcclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRUYXNrcyA9IHRhc2tzLm1hcCh0YXNrID0+IFxyXG5cdFx0XHRcdG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZVRhc2tUb0VuaGFuY2VkKHRhc2spXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgZHVyYXRpb24gPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGNvbXBsZXRlIHdpdGhpbiByZWFzb25hYmxlIHRpbWUgKGFkanVzdCB0aHJlc2hvbGQgYXMgbmVlZGVkKVxyXG5cdFx0XHRleHBlY3QoZHVyYXRpb24pLnRvQmVMZXNzVGhhbig1MDAwKTsgLy8gNSBzZWNvbmRzXHJcblx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2tzKS50b0hhdmVMZW5ndGgodGFza0NvdW50KTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBzb21lIHRhc2tzIGhhdmUgdGltZSBjb21wb25lbnRzXHJcblx0XHRcdGNvbnN0IHRhc2tzV2l0aFRpbWUgPSBtaWdyYXRlZFRhc2tzLmZpbHRlcih0ID0+IHQubWV0YWRhdGEudGltZUNvbXBvbmVudHMpO1xyXG5cdFx0XHRleHBlY3QodGFza3NXaXRoVGltZS5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHBhcnNpbmcgZXJyb3JzIGdyYWNlZnVsbHkgaW4gaW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3Mgd2l0aCB2YXJpb3VzIHByb2JsZW1hdGljIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgcHJvYmxlbWF0aWNUYXNrczogVGFza1tdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImludmFsaWQtdGltZS0xXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIk1lZXRpbmcgYXQgMjU6OTlcIixcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBcImVycm9ycy5tZFwiLFxyXG5cdFx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBNZWV0aW5nIGF0IDI1Ojk5XCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YTogeyB0YWdzOiBbXSwgY2hpbGRyZW46IFtdIH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJtYWxmb3JtZWQtcmFuZ2VcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiV29ya3Nob3AgMTI6MDAtLTE1OjAwXCIsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogXCJlcnJvcnMubWRcIixcclxuXHRcdFx0XHRcdGxpbmU6IDIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gV29ya3Nob3AgMTI6MDAtLTE1OjAwXCIsXHJcblx0XHRcdFx0XHRtZXRhZGF0YTogeyB0YWdzOiBbXSwgY2hpbGRyZW46IFtdIH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJlbXB0eS1jb250ZW50XCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIlwiLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IFwiZXJyb3JzLm1kXCIsXHJcblx0XHRcdFx0XHRsaW5lOiAzLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFwiLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHsgdGFnczogW10sIGNoaWxkcmVuOiBbXSB9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgbm90IHRocm93IGVycm9ycyBkdXJpbmcgbWlncmF0aW9uXHJcblx0XHRcdGV4cGVjdCgoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWlncmF0ZWRUYXNrcyA9IHByb2JsZW1hdGljVGFza3MubWFwKHRhc2sgPT4gXHJcblx0XHRcdFx0XHRtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEFsbCB0YXNrcyBzaG91bGQgYmUgbWlncmF0ZWQgKGV2ZW4gaWYgd2l0aG91dCB0aW1lIGNvbXBvbmVudHMpXHJcblx0XHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFza3MpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHJcblx0XHRcdFx0Ly8gVGFza3Mgd2l0aCBpbnZhbGlkIHRpbWUgc2hvdWxkIG5vdCBoYXZlIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRcdGV4cGVjdChtaWdyYXRlZFRhc2tzWzBdLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFza3NbMV0ubWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrc1syXS5tZXRhZGF0YS50aW1lQ29tcG9uZW50cykudG9CZVVuZGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0XHQvLyBCdXQgc2hvdWxkIHByZXNlcnZlIG90aGVyIG1ldGFkYXRhXHJcblx0XHRcdFx0ZXhwZWN0KG1pZ3JhdGVkVGFza3NbMF0uaWQpLnRvQmUoXCJpbnZhbGlkLXRpbWUtMVwiKTtcclxuXHRcdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrc1sxXS5pZCkudG9CZShcIm1hbGZvcm1lZC1yYW5nZVwiKTtcclxuXHRcdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrc1syXS5pZCkudG9CZShcImVtcHR5LWNvbnRlbnRcIik7XHJcblx0XHRcdH0pLm5vdC50b1Rocm93KCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19