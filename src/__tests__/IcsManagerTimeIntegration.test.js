/**
 * ICS Manager Time Integration Tests
 * Tests for enhanced time parsing integration with ICS events
 */
import { IcsManager } from "../managers/ics-manager";
import { TimeParsingService } from "../services/time-parsing-service";
import { IcsParser } from "../parsers/ics-parser";
// Mock Obsidian Component
jest.mock("obsidian", () => ({
    Component: class MockComponent {
        constructor() { }
        load() { }
        unload() { }
        onload() { }
        onunload() { }
        addChild() { }
        removeChild() { }
        register() { }
    },
    requestUrl: jest.fn(),
}));
// Mock minimal settings for testing
const mockPluginSettings = {
    taskStatusMarks: {
        "Not Started": " ",
        "In Progress": "/",
        Completed: "x",
        Abandoned: "-",
        Planned: "?",
    },
};
// Mock time parsing config
const mockTimeParsingConfig = {
    enabled: true,
    supportedLanguages: ["en", "zh"],
    dateKeywords: {
        start: ["start", "from", "begins"],
        due: ["due", "by", "until"],
        scheduled: ["at", "on", "scheduled"],
    },
    removeOriginalText: false,
    perLineProcessing: true,
    realTimeReplacement: false,
};
describe("ICS Manager Time Integration", () => {
    let icsManager;
    let timeParsingService;
    let mockConfig;
    let testSource;
    beforeEach(() => {
        timeParsingService = new TimeParsingService(mockTimeParsingConfig);
        testSource = {
            id: "test-source",
            name: "Test Calendar",
            url: "https://example.com/test.ics",
            enabled: true,
            refreshInterval: 60,
            showAllDayEvents: true,
            showTimedEvents: true,
            showType: "event",
        };
        mockConfig = {
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
        icsManager = new IcsManager(mockConfig, mockPluginSettings, undefined, timeParsingService);
    });
    describe("Time Component Extraction from ICS Events", () => {
        test("should extract time components from timed ICS events", () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-timed-event@example.com
DTSTART:20240315T140000Z
DTEND:20240315T160000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team sync meeting
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have time components extracted from ICS times
            expect(metadata.timeComponents).toBeDefined();
            expect((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime).toBeDefined();
            expect((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.endTime).toBeDefined();
            // Verify time component values (times should match the ICS event times)
            const startTime = (_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime;
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.hour).toBeDefined();
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.minute).toBe(0);
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.isRange).toBe(true);
            const endTime = (_d = metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.endTime;
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.hour).toBeDefined();
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.minute).toBe(0);
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.isRange).toBe(true);
            // Should have range partners
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.rangePartner).toBe(endTime);
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.rangePartner).toBe(startTime);
            // Should have enhanced datetime objects
            expect(metadata.enhancedDates).toBeDefined();
            expect((_e = metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.startDateTime).toBeDefined();
            expect((_f = metadata.enhancedDates) === null || _f === void 0 ? void 0 : _f.endDateTime).toBeDefined();
            expect((_g = metadata.enhancedDates) === null || _g === void 0 ? void 0 : _g.scheduledDateTime).toBeDefined();
            expect((_h = metadata.enhancedDates) === null || _h === void 0 ? void 0 : _h.dueDateTime).toBeDefined();
        });
        test("should not extract time components from all-day ICS events without description times", () => {
            var _a, _b;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-allday-event@example.com
DTSTART;VALUE=DATE:20240315
DTEND;VALUE=DATE:20240316
SUMMARY:All Day Event
DESCRIPTION:This is an all-day event
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            expect(event.allDay).toBe(true);
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should not have time components for all-day events without description times
            expect(metadata.timeComponents).toBeUndefined();
            // Should still have enhanced dates with the event dates
            expect(metadata.enhancedDates).toBeDefined();
            expect((_a = metadata.enhancedDates) === null || _a === void 0 ? void 0 : _a.startDateTime).toBeDefined();
            expect((_b = metadata.enhancedDates) === null || _b === void 0 ? void 0 : _b.scheduledDateTime).toBeDefined();
        });
        test("should extract time components from all-day event descriptions", () => {
            var _a, _b, _c, _d, _e;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-allday-with-time@example.com
DTSTART;VALUE=DATE:20240315
DTEND;VALUE=DATE:20240316
SUMMARY:Conference Day
DESCRIPTION:Conference starts at 9:00 AM and ends at 5:00 PM
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            expect(event.allDay).toBe(true);
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have time components extracted from description
            expect(metadata.timeComponents).toBeDefined();
            // Check if we have any time components (start, due, scheduled, or end)
            const hasTimeComponents = ((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) ||
                ((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.dueTime) ||
                ((_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.scheduledTime) ||
                ((_d = metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.endTime);
            expect(hasTimeComponents).toBeDefined();
            // Should have enhanced datetime objects
            expect(metadata.enhancedDates).toBeDefined();
            expect((_e = metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.startDateTime).toBeDefined();
        });
        test("should handle time ranges in event descriptions", () => {
            var _a, _b, _c, _d;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-time-range@example.com
DTSTART;VALUE=DATE:20240315
SUMMARY:Workshop
DESCRIPTION:Workshop session from 14:00-17:30
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have time components extracted from description
            expect(metadata.timeComponents).toBeDefined();
            expect((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime).toBeDefined();
            expect((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.endTime).toBeDefined();
            // Verify time range
            const startTime = (_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime;
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.hour).toBe(14);
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.minute).toBe(0);
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.isRange).toBe(true);
            const endTime = (_d = metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.endTime;
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.hour).toBe(17);
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.minute).toBe(30);
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.isRange).toBe(true);
            // Should have range partners
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.rangePartner).toBe(endTime);
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.rangePartner).toBe(startTime);
        });
        test("should handle midnight crossing time ranges", () => {
            var _a, _b, _c, _d, _e, _f;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-midnight-crossing@example.com
DTSTART;VALUE=DATE:20240315
SUMMARY:Night Shift
DESCRIPTION:Work shift from 23:00-01:00
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have time components
            expect(metadata.timeComponents).toBeDefined();
            expect((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime).toBeDefined();
            expect((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.endTime).toBeDefined();
            // Should have enhanced dates with proper midnight crossing handling
            expect(metadata.enhancedDates).toBeDefined();
            expect((_c = metadata.enhancedDates) === null || _c === void 0 ? void 0 : _c.startDateTime).toBeDefined();
            expect((_d = metadata.enhancedDates) === null || _d === void 0 ? void 0 : _d.endDateTime).toBeDefined();
            const startDateTime = (_e = metadata.enhancedDates) === null || _e === void 0 ? void 0 : _e.startDateTime;
            const endDateTime = (_f = metadata.enhancedDates) === null || _f === void 0 ? void 0 : _f.endDateTime;
            // Start should be 23:00 on March 15
            expect(startDateTime === null || startDateTime === void 0 ? void 0 : startDateTime.getDate()).toBe(15);
            expect(startDateTime === null || startDateTime === void 0 ? void 0 : startDateTime.getHours()).toBe(23);
            // End should be 01:00 on March 16 (next day)
            expect(endDateTime === null || endDateTime === void 0 ? void 0 : endDateTime.getDate()).toBe(16);
            expect(endDateTime === null || endDateTime === void 0 ? void 0 : endDateTime.getHours()).toBe(1);
        });
        test("should preserve ICS time information over description parsing", () => {
            var _a, _b, _c, _d;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-ics-priority@example.com
DTSTART:20240315T100000Z
DTEND:20240315T120000Z
SUMMARY:Meeting
DESCRIPTION:This meeting is scheduled at 2:00 PM (different from actual ICS time)
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should have time components from ICS, not description
            expect(metadata.timeComponents).toBeDefined();
            expect((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime).toBeDefined();
            expect((_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.endTime).toBeDefined();
            // Should use ICS times, not description time (2:00 PM)
            const startTime = (_c = metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime;
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.hour).toBeDefined(); // ICS time takes precedence
            expect(startTime === null || startTime === void 0 ? void 0 : startTime.minute).toBe(0);
            const endTime = (_d = metadata.timeComponents) === null || _d === void 0 ? void 0 : _d.endTime;
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.hour).toBeDefined();
            expect(endTime === null || endTime === void 0 ? void 0 : endTime.minute).toBe(0);
        });
        test("should handle events with location containing time information", () => {
            var _a, _b;
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-location-time@example.com
DTSTART;VALUE=DATE:20240315
SUMMARY:Dinner
DESCRIPTION:Family dinner
LOCATION:Restaurant at 7:30 PM
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should extract time from location field
            expect(metadata.timeComponents).toBeDefined();
            expect((_a = metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.scheduledTime).toBeDefined();
            const scheduledTime = (_b = metadata.timeComponents) === null || _b === void 0 ? void 0 : _b.scheduledTime;
            expect(scheduledTime === null || scheduledTime === void 0 ? void 0 : scheduledTime.hour).toBe(19); // 7:30 PM
            expect(scheduledTime === null || scheduledTime === void 0 ? void 0 : scheduledTime.minute).toBe(30);
        });
    });
    describe("Error Handling and Edge Cases", () => {
        test("should handle ICS events with invalid time formats gracefully", () => {
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-invalid-time@example.com
DTSTART;VALUE=DATE:20240315
SUMMARY:Event
DESCRIPTION:Meeting at invalid:time format
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            // Should not throw error
            expect(() => {
                const tasks = icsManager.convertEventsToTasks([event]);
                expect(tasks).toHaveLength(1);
            }).not.toThrow();
        });
        test("should handle ICS events without time parsing service", () => {
            // Create manager without time parsing service
            const managerWithoutTimeService = new IcsManager(mockConfig, mockPluginSettings);
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-no-service@example.com
DTSTART:20240315T140000Z
DTEND:20240315T160000Z
SUMMARY:Meeting
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = managerWithoutTimeService.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            const metadata = task.metadata;
            // Should not have enhanced time components
            expect(metadata.timeComponents).toBeUndefined();
            expect(metadata.enhancedDates).toBeUndefined();
            // But should still have basic task data
            expect(task.content).toBe("Meeting");
            expect(task.metadata.startDate).toBeDefined();
        });
        test("should handle malformed ICS datetime gracefully", () => {
            // This test ensures the manager doesn't crash on malformed ICS data
            const event = {
                uid: "test-malformed",
                summary: "Test Event",
                dtstart: new Date("invalid-date"),
                allDay: false,
                source: testSource,
            };
            // Should not throw error
            expect(() => {
                const tasks = icsManager.convertEventsToTasks([event]);
                expect(tasks).toHaveLength(1);
            }).not.toThrow();
        });
    });
    describe("Backward Compatibility", () => {
        test("should maintain compatibility with existing ICS task structure", () => {
            const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-compatibility@example.com
DTSTART:20240315T140000Z
DTEND:20240315T160000Z
SUMMARY:Legacy Event
DESCRIPTION:This should work with existing code
END:VEVENT
END:VCALENDAR`;
            const parseResult = IcsParser.parse(icsData, testSource);
            expect(parseResult.events).toHaveLength(1);
            const event = parseResult.events[0];
            const tasks = icsManager.convertEventsToTasks([event]);
            expect(tasks).toHaveLength(1);
            const task = tasks[0];
            // Should have all existing ICS task properties
            expect(task.id).toBeDefined();
            expect(task.content).toBe("Legacy Event");
            expect(task.filePath).toBe("ics://Test Calendar");
            expect(task.icsEvent).toBeDefined();
            expect(task.readonly).toBe(true);
            expect(task.source.type).toBe("ics");
            // Should have standard metadata
            expect(task.metadata.startDate).toBeDefined();
            expect(task.metadata.scheduledDate).toBeDefined();
            expect(task.metadata.project).toBe("Test Calendar");
            // Enhanced metadata should be additive, not breaking
            const metadata = task.metadata;
            if (metadata.timeComponents) {
                expect(metadata.timeComponents.startTime).toBeDefined();
            }
            if (metadata.enhancedDates) {
                expect(metadata.enhancedDates.startDateTime).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSWNzTWFuYWdlclRpbWVJbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSWNzTWFuYWdlclRpbWVJbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJbEQsMEJBQTBCO0FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUIsU0FBUyxFQUFFLE1BQU0sYUFBYTtRQUM3QixnQkFBZSxDQUFDO1FBQ2hCLElBQUksS0FBSSxDQUFDO1FBQ1QsTUFBTSxLQUFJLENBQUM7UUFDWCxNQUFNLEtBQUksQ0FBQztRQUNYLFFBQVEsS0FBSSxDQUFDO1FBQ2IsUUFBUSxLQUFJLENBQUM7UUFDYixXQUFXLEtBQUksQ0FBQztRQUNoQixRQUFRLEtBQUksQ0FBQztLQUNiO0lBQ0QsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDckIsQ0FBQyxDQUFDLENBQUM7QUFFSixvQ0FBb0M7QUFDcEMsTUFBTSxrQkFBa0IsR0FBRztJQUMxQixlQUFlLEVBQUU7UUFDaEIsYUFBYSxFQUFFLEdBQUc7UUFDbEIsYUFBYSxFQUFFLEdBQUc7UUFDbEIsU0FBUyxFQUFFLEdBQUc7UUFDZCxTQUFTLEVBQUUsR0FBRztRQUNkLE9BQU8sRUFBRSxHQUFHO0tBQ1o7Q0FDTSxDQUFDO0FBRVQsMkJBQTJCO0FBQzNCLE1BQU0scUJBQXFCLEdBQUc7SUFDN0IsT0FBTyxFQUFFLElBQUk7SUFDYixrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDaEMsWUFBWSxFQUFFO1FBQ2IsS0FBSyxFQUFFLENB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WUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXBELHFEQUFxRDtZQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBd0MsQ0FBQztZQUMvRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUU7Z0JBQzVCLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ3hEO1lBQ0QsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFO2dCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUMzRDtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBJQ1MgTWFuYWdlciBUaW1lIEludGVncmF0aW9uIFRlc3RzXHJcbiAqIFRlc3RzIGZvciBlbmhhbmNlZCB0aW1lIHBhcnNpbmcgaW50ZWdyYXRpb24gd2l0aCBJQ1MgZXZlbnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgSWNzTWFuYWdlciB9IGZyb20gXCIuLi9tYW5hZ2Vycy9pY3MtbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ1NlcnZpY2UgfSBmcm9tIFwiLi4vc2VydmljZXMvdGltZS1wYXJzaW5nLXNlcnZpY2VcIjtcclxuaW1wb3J0IHsgSWNzUGFyc2VyIH0gZnJvbSBcIi4uL3BhcnNlcnMvaWNzLXBhcnNlclwiO1xyXG5pbXBvcnQgeyBJY3NTb3VyY2UsIEljc01hbmFnZXJDb25maWcsIEljc0V2ZW50IH0gZnJvbSBcIi4uL3R5cGVzL2ljc1wiO1xyXG5pbXBvcnQgeyBUaW1lQ29tcG9uZW50LCBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhIH0gZnJvbSBcIi4uL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBDb21wb25lbnRcclxuamVzdC5tb2NrKFwib2JzaWRpYW5cIiwgKCkgPT4gKHtcclxuXHRDb21wb25lbnQ6IGNsYXNzIE1vY2tDb21wb25lbnQge1xyXG5cdFx0Y29uc3RydWN0b3IoKSB7fVxyXG5cdFx0bG9hZCgpIHt9XHJcblx0XHR1bmxvYWQoKSB7fVxyXG5cdFx0b25sb2FkKCkge31cclxuXHRcdG9udW5sb2FkKCkge31cclxuXHRcdGFkZENoaWxkKCkge31cclxuXHRcdHJlbW92ZUNoaWxkKCkge31cclxuXHRcdHJlZ2lzdGVyKCkge31cclxuXHR9LFxyXG5cdHJlcXVlc3RVcmw6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuLy8gTW9jayBtaW5pbWFsIHNldHRpbmdzIGZvciB0ZXN0aW5nXHJcbmNvbnN0IG1vY2tQbHVnaW5TZXR0aW5ncyA9IHtcclxuXHR0YXNrU3RhdHVzTWFya3M6IHtcclxuXHRcdFwiTm90IFN0YXJ0ZWRcIjogXCIgXCIsXHJcblx0XHRcIkluIFByb2dyZXNzXCI6IFwiL1wiLFxyXG5cdFx0Q29tcGxldGVkOiBcInhcIixcclxuXHRcdEFiYW5kb25lZDogXCItXCIsXHJcblx0XHRQbGFubmVkOiBcIj9cIixcclxuXHR9LFxyXG59IGFzIGFueTtcclxuXHJcbi8vIE1vY2sgdGltZSBwYXJzaW5nIGNvbmZpZ1xyXG5jb25zdCBtb2NrVGltZVBhcnNpbmdDb25maWcgPSB7XHJcblx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRzdXBwb3J0ZWRMYW5ndWFnZXM6IFtcImVuXCIsIFwiemhcIl0sXHJcblx0ZGF0ZUtleXdvcmRzOiB7XHJcblx0XHRzdGFydDogW1wic3RhcnRcIiwgXCJmcm9tXCIsIFwiYmVnaW5zXCJdLFxyXG5cdFx0ZHVlOiBbXCJkdWVcIiwgXCJieVwiLCBcInVudGlsXCJdLFxyXG5cdFx0c2NoZWR1bGVkOiBbXCJhdFwiLCBcIm9uXCIsIFwic2NoZWR1bGVkXCJdLFxyXG5cdH0sXHJcblx0cmVtb3ZlT3JpZ2luYWxUZXh0OiBmYWxzZSxcclxuXHRwZXJMaW5lUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRyZWFsVGltZVJlcGxhY2VtZW50OiBmYWxzZSxcclxufTtcclxuXHJcbmRlc2NyaWJlKFwiSUNTIE1hbmFnZXIgVGltZSBJbnRlZ3JhdGlvblwiLCAoKSA9PiB7XHJcblx0bGV0IGljc01hbmFnZXI6IEljc01hbmFnZXI7XHJcblx0bGV0IHRpbWVQYXJzaW5nU2VydmljZTogVGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cdGxldCBtb2NrQ29uZmlnOiBJY3NNYW5hZ2VyQ29uZmlnO1xyXG5cdGxldCB0ZXN0U291cmNlOiBJY3NTb3VyY2U7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0dGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShtb2NrVGltZVBhcnNpbmdDb25maWcpO1xyXG5cdFx0XHJcblx0XHR0ZXN0U291cmNlID0ge1xyXG5cdFx0XHRpZDogXCJ0ZXN0LXNvdXJjZVwiLFxyXG5cdFx0XHRuYW1lOiBcIlRlc3QgQ2FsZW5kYXJcIixcclxuXHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vdGVzdC5pY3NcIixcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHRtb2NrQ29uZmlnID0ge1xyXG5cdFx0XHRzb3VyY2VzOiBbdGVzdFNvdXJjZV0sXHJcblx0XHRcdGdsb2JhbFJlZnJlc2hJbnRlcnZhbDogNjAsXHJcblx0XHRcdG1heENhY2hlQWdlOiAyNCxcclxuXHRcdFx0ZW5hYmxlQmFja2dyb3VuZFJlZnJlc2g6IGZhbHNlLFxyXG5cdFx0XHRuZXR3b3JrVGltZW91dDogMzAsXHJcblx0XHRcdG1heEV2ZW50c1BlclNvdXJjZTogMTAwMCxcclxuXHRcdFx0c2hvd0luQ2FsZW5kYXI6IHRydWUsXHJcblx0XHRcdHNob3dJblRhc2tMaXN0czogdHJ1ZSxcclxuXHRcdFx0ZGVmYXVsdEV2ZW50Q29sb3I6IFwiIzM0OThkYlwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHRpY3NNYW5hZ2VyID0gbmV3IEljc01hbmFnZXIobW9ja0NvbmZpZywgbW9ja1BsdWdpblNldHRpbmdzLCB1bmRlZmluZWQsIHRpbWVQYXJzaW5nU2VydmljZSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiVGltZSBDb21wb25lbnQgRXh0cmFjdGlvbiBmcm9tIElDUyBFdmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBleHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIHRpbWVkIElDUyBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vVGVzdCBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDp0ZXN0LXRpbWVkLWV2ZW50QGV4YW1wbGUuY29tXHJcbkRUU1RBUlQ6MjAyNDAzMTVUMTQwMDAwWlxyXG5EVEVORDoyMDI0MDMxNVQxNjAwMDBaXHJcblNVTU1BUlk6VGVhbSBNZWV0aW5nXHJcbkRFU0NSSVBUSU9OOldlZWtseSB0ZWFtIHN5bmMgbWVldGluZ1xyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC5ldmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50ID0gcGFyc2VSZXN1bHQuZXZlbnRzWzBdO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGljc01hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW2V2ZW50XSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIHRpbWUgY29tcG9uZW50cyBleHRyYWN0ZWQgZnJvbSBJQ1MgdGltZXNcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRpbWUgY29tcG9uZW50IHZhbHVlcyAodGltZXMgc2hvdWxkIG1hdGNoIHRoZSBJQ1MgZXZlbnQgdGltZXMpXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZSA9IG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zdGFydFRpbWU7XHJcblx0XHRcdGV4cGVjdChzdGFydFRpbWU/LmhvdXIpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzdGFydFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXJ0VGltZT8uaXNSYW5nZSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uZW5kVGltZTtcclxuXHRcdFx0ZXhwZWN0KGVuZFRpbWU/LmhvdXIpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChlbmRUaW1lPy5taW51dGUpLnRvQmUoMCk7XHJcblx0XHRcdGV4cGVjdChlbmRUaW1lPy5pc1JhbmdlKS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgcmFuZ2UgcGFydG5lcnNcclxuXHRcdFx0ZXhwZWN0KHN0YXJ0VGltZT8ucmFuZ2VQYXJ0bmVyKS50b0JlKGVuZFRpbWUpO1xyXG5cdFx0XHRleHBlY3QoZW5kVGltZT8ucmFuZ2VQYXJ0bmVyKS50b0JlKHN0YXJ0VGltZSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSBlbmhhbmNlZCBkYXRldGltZSBvYmplY3RzXHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc3RhcnREYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LmVuZERhdGVUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc2NoZWR1bGVkRGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5kdWVEYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IGV4dHJhY3QgdGltZSBjb21wb25lbnRzIGZyb20gYWxsLWRheSBJQ1MgZXZlbnRzIHdpdGhvdXQgZGVzY3JpcHRpb24gdGltZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vVGVzdCBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDp0ZXN0LWFsbGRheS1ldmVudEBleGFtcGxlLmNvbVxyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDAzMTVcclxuRFRFTkQ7VkFMVUU9REFURToyMDI0MDMxNlxyXG5TVU1NQVJZOkFsbCBEYXkgRXZlbnRcclxuREVTQ1JJUFRJT046VGhpcyBpcyBhbiBhbGwtZGF5IGV2ZW50XHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlUmVzdWx0LmV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnQgPSBwYXJzZVJlc3VsdC5ldmVudHNbMF07XHJcblx0XHRcdGV4cGVjdChldmVudC5hbGxEYXkpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGljc01hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW2V2ZW50XSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgaGF2ZSB0aW1lIGNvbXBvbmVudHMgZm9yIGFsbC1kYXkgZXZlbnRzIHdpdGhvdXQgZGVzY3JpcHRpb24gdGltZXNcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTaG91bGQgc3RpbGwgaGF2ZSBlbmhhbmNlZCBkYXRlcyB3aXRoIHRoZSBldmVudCBkYXRlc1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLmVuaGFuY2VkRGF0ZXM/LnN0YXJ0RGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5zY2hlZHVsZWREYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgZXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSBhbGwtZGF5IGV2ZW50IGRlc2NyaXB0aW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9UZXN0Ly9UZXN0IENhbGVuZGFyLy9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOnRlc3QtYWxsZGF5LXdpdGgtdGltZUBleGFtcGxlLmNvbVxyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDAzMTVcclxuRFRFTkQ7VkFMVUU9REFURToyMDI0MDMxNlxyXG5TVU1NQVJZOkNvbmZlcmVuY2UgRGF5XHJcbkRFU0NSSVBUSU9OOkNvbmZlcmVuY2Ugc3RhcnRzIGF0IDk6MDAgQU0gYW5kIGVuZHMgYXQgNTowMCBQTVxyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC5ldmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50ID0gcGFyc2VSZXN1bHQuZXZlbnRzWzBdO1xyXG5cdFx0XHRleHBlY3QoZXZlbnQuYWxsRGF5KS50b0JlKHRydWUpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKFtldmVudF0pO1xyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSB0aW1lIGNvbXBvbmVudHMgZXh0cmFjdGVkIGZyb20gZGVzY3JpcHRpb25cclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgd2UgaGF2ZSBhbnkgdGltZSBjb21wb25lbnRzIChzdGFydCwgZHVlLCBzY2hlZHVsZWQsIG9yIGVuZClcclxuXHRcdFx0Y29uc3QgaGFzVGltZUNvbXBvbmVudHMgPSBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lIHx8IFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQgbWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWUgfHwgXHJcblx0XHRcdFx0XHRcdFx0XHRcdCBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc2NoZWR1bGVkVGltZSB8fCBcclxuXHRcdFx0XHRcdFx0XHRcdFx0IG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lO1xyXG5cdFx0XHRleHBlY3QoaGFzVGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSBlbmhhbmNlZCBkYXRldGltZSBvYmplY3RzXHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc3RhcnREYXRlVGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRpbWUgcmFuZ2VzIGluIGV2ZW50IGRlc2NyaXB0aW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9UZXN0Ly9UZXN0IENhbGVuZGFyLy9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOnRlc3QtdGltZS1yYW5nZUBleGFtcGxlLmNvbVxyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDAzMTVcclxuU1VNTUFSWTpXb3Jrc2hvcFxyXG5ERVNDUklQVElPTjpXb3Jrc2hvcCBzZXNzaW9uIGZyb20gMTQ6MDAtMTc6MzBcclxuTE9DQVRJT046Q29uZmVyZW5jZSBSb29tIEFcclxuRU5EOlZFVkVOVFxyXG5FTkQ6VkNBTEVOREFSYDtcclxuXHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gSWNzUGFyc2VyLnBhcnNlKGljc0RhdGEsIHRlc3RTb3VyY2UpO1xyXG5cdFx0XHRleHBlY3QocGFyc2VSZXN1bHQuZXZlbnRzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCBldmVudCA9IHBhcnNlUmVzdWx0LmV2ZW50c1swXTtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKFtldmVudF0pO1xyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSB0aW1lIGNvbXBvbmVudHMgZXh0cmFjdGVkIGZyb20gZGVzY3JpcHRpb25cclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRpbWUgcmFuZ2VcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gbWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZTtcclxuXHRcdFx0ZXhwZWN0KHN0YXJ0VGltZT8uaG91cikudG9CZSgxNCk7XHJcblx0XHRcdGV4cGVjdChzdGFydFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXJ0VGltZT8uaXNSYW5nZSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uZW5kVGltZTtcclxuXHRcdFx0ZXhwZWN0KGVuZFRpbWU/LmhvdXIpLnRvQmUoMTcpO1xyXG5cdFx0XHRleHBlY3QoZW5kVGltZT8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdFx0ZXhwZWN0KGVuZFRpbWU/LmlzUmFuZ2UpLnRvQmUodHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSByYW5nZSBwYXJ0bmVyc1xyXG5cdFx0XHRleHBlY3Qoc3RhcnRUaW1lPy5yYW5nZVBhcnRuZXIpLnRvQmUoZW5kVGltZSk7XHJcblx0XHRcdGV4cGVjdChlbmRUaW1lPy5yYW5nZVBhcnRuZXIpLnRvQmUoc3RhcnRUaW1lKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1pZG5pZ2h0IGNyb3NzaW5nIHRpbWUgcmFuZ2VzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaWNzRGF0YSA9IGBCRUdJTjpWQ0FMRU5EQVJcclxuVkVSU0lPTjoyLjBcclxuUFJPRElEOi0vL1Rlc3QvL1Rlc3QgQ2FsZW5kYXIvL0VOXHJcbkJFR0lOOlZFVkVOVFxyXG5VSUQ6dGVzdC1taWRuaWdodC1jcm9zc2luZ0BleGFtcGxlLmNvbVxyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDAzMTVcclxuU1VNTUFSWTpOaWdodCBTaGlmdFxyXG5ERVNDUklQVElPTjpXb3JrIHNoaWZ0IGZyb20gMjM6MDAtMDE6MDBcclxuRU5EOlZFVkVOVFxyXG5FTkQ6VkNBTEVOREFSYDtcclxuXHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gSWNzUGFyc2VyLnBhcnNlKGljc0RhdGEsIHRlc3RTb3VyY2UpO1xyXG5cdFx0XHRleHBlY3QocGFyc2VSZXN1bHQuZXZlbnRzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCBldmVudCA9IHBhcnNlUmVzdWx0LmV2ZW50c1swXTtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKFtldmVudF0pO1xyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0YXNrc1swXTtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0YXNrLm1ldGFkYXRhIGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGF2ZSB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgZW5oYW5jZWQgZGF0ZXMgd2l0aCBwcm9wZXIgbWlkbmlnaHQgY3Jvc3NpbmcgaGFuZGxpbmdcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5zdGFydERhdGVUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uZW5kRGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydERhdGVUaW1lID0gbWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uc3RhcnREYXRlVGltZTtcclxuXHRcdFx0Y29uc3QgZW5kRGF0ZVRpbWUgPSBtZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5lbmREYXRlVGltZTtcclxuXHJcblx0XHRcdC8vIFN0YXJ0IHNob3VsZCBiZSAyMzowMCBvbiBNYXJjaCAxNVxyXG5cdFx0XHRleHBlY3Qoc3RhcnREYXRlVGltZT8uZ2V0RGF0ZSgpKS50b0JlKDE1KTtcclxuXHRcdFx0ZXhwZWN0KHN0YXJ0RGF0ZVRpbWU/LmdldEhvdXJzKCkpLnRvQmUoMjMpO1xyXG5cclxuXHRcdFx0Ly8gRW5kIHNob3VsZCBiZSAwMTowMCBvbiBNYXJjaCAxNiAobmV4dCBkYXkpXHJcblx0XHRcdGV4cGVjdChlbmREYXRlVGltZT8uZ2V0RGF0ZSgpKS50b0JlKDE2KTtcclxuXHRcdFx0ZXhwZWN0KGVuZERhdGVUaW1lPy5nZXRIb3VycygpKS50b0JlKDEpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBJQ1MgdGltZSBpbmZvcm1hdGlvbiBvdmVyIGRlc2NyaXB0aW9uIHBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vVGVzdCBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDp0ZXN0LWljcy1wcmlvcml0eUBleGFtcGxlLmNvbVxyXG5EVFNUQVJUOjIwMjQwMzE1VDEwMDAwMFpcclxuRFRFTkQ6MjAyNDAzMTVUMTIwMDAwWlxyXG5TVU1NQVJZOk1lZXRpbmdcclxuREVTQ1JJUFRJT046VGhpcyBtZWV0aW5nIGlzIHNjaGVkdWxlZCBhdCAyOjAwIFBNIChkaWZmZXJlbnQgZnJvbSBhY3R1YWwgSUNTIHRpbWUpXHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlUmVzdWx0LmV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnQgPSBwYXJzZVJlc3VsdC5ldmVudHNbMF07XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gaWNzTWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbZXZlbnRdKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgdGltZSBjb21wb25lbnRzIGZyb20gSUNTLCBub3QgZGVzY3JpcHRpb25cclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5lbmRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIHVzZSBJQ1MgdGltZXMsIG5vdCBkZXNjcmlwdGlvbiB0aW1lICgyOjAwIFBNKVxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lO1xyXG5cdFx0XHRleHBlY3Qoc3RhcnRUaW1lPy5ob3VyKS50b0JlRGVmaW5lZCgpOyAvLyBJQ1MgdGltZSB0YWtlcyBwcmVjZWRlbmNlXHJcblx0XHRcdGV4cGVjdChzdGFydFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBtZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uZW5kVGltZTtcclxuXHRcdFx0ZXhwZWN0KGVuZFRpbWU/LmhvdXIpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChlbmRUaW1lPy5taW51dGUpLnRvQmUoMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBldmVudHMgd2l0aCBsb2NhdGlvbiBjb250YWluaW5nIHRpbWUgaW5mb3JtYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vVGVzdCBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDp0ZXN0LWxvY2F0aW9uLXRpbWVAZXhhbXBsZS5jb21cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMjQwMzE1XHJcblNVTU1BUlk6RGlubmVyXHJcbkRFU0NSSVBUSU9OOkZhbWlseSBkaW5uZXJcclxuTE9DQVRJT046UmVzdGF1cmFudCBhdCA3OjMwIFBNXHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlUmVzdWx0LmV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnQgPSBwYXJzZVJlc3VsdC5ldmVudHNbMF07XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gaWNzTWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbZXZlbnRdKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGV4dHJhY3QgdGltZSBmcm9tIGxvY2F0aW9uIGZpZWxkXHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YS50aW1lQ29tcG9uZW50cykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Y29uc3Qgc2NoZWR1bGVkVGltZSA9IG1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zY2hlZHVsZWRUaW1lO1xyXG5cdFx0XHRleHBlY3Qoc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxOSk7IC8vIDc6MzAgUE1cclxuXHRcdFx0ZXhwZWN0KHNjaGVkdWxlZFRpbWU/Lm1pbnV0ZSkudG9CZSgzMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFcnJvciBIYW5kbGluZyBhbmQgRWRnZSBDYXNlc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBJQ1MgZXZlbnRzIHdpdGggaW52YWxpZCB0aW1lIGZvcm1hdHMgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9UZXN0Ly9UZXN0IENhbGVuZGFyLy9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOnRlc3QtaW52YWxpZC10aW1lQGV4YW1wbGUuY29tXHJcbkRUU1RBUlQ7VkFMVUU9REFURToyMDI0MDMxNVxyXG5TVU1NQVJZOkV2ZW50XHJcbkRFU0NSSVBUSU9OOk1lZXRpbmcgYXQgaW52YWxpZDp0aW1lIGZvcm1hdFxyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC5ldmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50ID0gcGFyc2VSZXN1bHQuZXZlbnRzWzBdO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCB0aHJvdyBlcnJvclxyXG5cdFx0XHRleHBlY3QoKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tzID0gaWNzTWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbZXZlbnRdKTtcclxuXHRcdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0fSkubm90LnRvVGhyb3coKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIElDUyBldmVudHMgd2l0aG91dCB0aW1lIHBhcnNpbmcgc2VydmljZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBtYW5hZ2VyIHdpdGhvdXQgdGltZSBwYXJzaW5nIHNlcnZpY2VcclxuXHRcdFx0Y29uc3QgbWFuYWdlcldpdGhvdXRUaW1lU2VydmljZSA9IG5ldyBJY3NNYW5hZ2VyKG1vY2tDb25maWcsIG1vY2tQbHVnaW5TZXR0aW5ncyk7XHJcblxyXG5cdFx0XHRjb25zdCBpY3NEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vVGVzdC8vVGVzdCBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDp0ZXN0LW5vLXNlcnZpY2VAZXhhbXBsZS5jb21cclxuRFRTVEFSVDoyMDI0MDMxNVQxNDAwMDBaXHJcbkRURU5EOjIwMjQwMzE1VDE2MDAwMFpcclxuU1VNTUFSWTpNZWV0aW5nXHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlUmVzdWx0LmV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnQgPSBwYXJzZVJlc3VsdC5ldmVudHNbMF07XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gbWFuYWdlcldpdGhvdXRUaW1lU2VydmljZS5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbZXZlbnRdKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCBoYXZlIGVuaGFuY2VkIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIEJ1dCBzaG91bGQgc3RpbGwgaGF2ZSBiYXNpYyB0YXNrIGRhdGFcclxuXHRcdFx0ZXhwZWN0KHRhc2suY29udGVudCkudG9CZShcIk1lZXRpbmdcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCBJQ1MgZGF0ZXRpbWUgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRoaXMgdGVzdCBlbnN1cmVzIHRoZSBtYW5hZ2VyIGRvZXNuJ3QgY3Jhc2ggb24gbWFsZm9ybWVkIElDUyBkYXRhXHJcblx0XHRcdGNvbnN0IGV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwidGVzdC1tYWxmb3JtZWRcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIlRlc3QgRXZlbnRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcImludmFsaWQtZGF0ZVwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogdGVzdFNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBub3QgdGhyb3cgZXJyb3JcclxuXHRcdFx0ZXhwZWN0KCgpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YXNrcyA9IGljc01hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW2V2ZW50XSk7XHJcblx0XHRcdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdH0pLm5vdC50b1Rocm93KCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCYWNrd2FyZCBDb21wYXRpYmlsaXR5XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgbWFpbnRhaW4gY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIElDUyB0YXNrIHN0cnVjdHVyZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9UZXN0Ly9UZXN0IENhbGVuZGFyLy9FTlxyXG5CRUdJTjpWRVZFTlRcclxuVUlEOnRlc3QtY29tcGF0aWJpbGl0eUBleGFtcGxlLmNvbVxyXG5EVFNUQVJUOjIwMjQwMzE1VDE0MDAwMFpcclxuRFRFTkQ6MjAyNDAzMTVUMTYwMDAwWlxyXG5TVU1NQVJZOkxlZ2FjeSBFdmVudFxyXG5ERVNDUklQVElPTjpUaGlzIHNob3VsZCB3b3JrIHdpdGggZXhpc3RpbmcgY29kZVxyXG5FTkQ6VkVWRU5UXHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UoaWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGV4cGVjdChwYXJzZVJlc3VsdC5ldmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50ID0gcGFyc2VSZXN1bHQuZXZlbnRzWzBdO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGljc01hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW2V2ZW50XSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgYWxsIGV4aXN0aW5nIElDUyB0YXNrIHByb3BlcnRpZXNcclxuXHRcdFx0ZXhwZWN0KHRhc2suaWQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmNvbnRlbnQpLnRvQmUoXCJMZWdhY3kgRXZlbnRcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmZpbGVQYXRoKS50b0JlKFwiaWNzOi8vVGVzdCBDYWxlbmRhclwiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2suaWNzRXZlbnQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrLnJlYWRvbmx5KS50b0JlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodGFzay5zb3VyY2UudHlwZSkudG9CZShcImljc1wiKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIHN0YW5kYXJkIG1ldGFkYXRhXHJcblx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEucHJvamVjdCkudG9CZShcIlRlc3QgQ2FsZW5kYXJcIik7XHJcblxyXG5cdFx0XHQvLyBFbmhhbmNlZCBtZXRhZGF0YSBzaG91bGQgYmUgYWRkaXRpdmUsIG5vdCBicmVha2luZ1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YTtcclxuXHRcdFx0aWYgKG1ldGFkYXRhLnRpbWVDb21wb25lbnRzKSB7XHJcblx0XHRcdFx0ZXhwZWN0KG1ldGFkYXRhLnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobWV0YWRhdGEuZW5oYW5jZWREYXRlcykge1xyXG5cdFx0XHRcdGV4cGVjdChtZXRhZGF0YS5lbmhhbmNlZERhdGVzLnN0YXJ0RGF0ZVRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=