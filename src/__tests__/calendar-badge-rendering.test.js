/**
 * Calendar Badge Rendering Tests
 * Tests the badge rendering logic for ICS events
 */
import { moment } from "obsidian";
describe("Calendar Badge Rendering Logic", () => {
    // Mock ICS sources
    const badgeSource = {
        id: "test-badge-source",
        name: "Test Badge Calendar",
        url: "https://example.com/calendar.ics",
        enabled: true,
        refreshInterval: 60,
        showAllDayEvents: true,
        showTimedEvents: true,
        showType: "badge",
        color: "#ff6b6b",
    };
    const eventSource = {
        id: "test-event-source",
        name: "Test Event Calendar",
        url: "https://example.com/calendar2.ics",
        enabled: true,
        refreshInterval: 60,
        showAllDayEvents: true,
        showTimedEvents: true,
        showType: "event",
        color: "#4ecdc4",
    };
    // Helper function to simulate getBadgeEventsForDate logic
    function getBadgeEventsForDate(tasks, date) {
        const targetDate = moment(date).startOf("day");
        const badgeEvents = new Map();
        tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                const eventDate = moment(icsTask.icsEvent.dtstart).startOf("day");
                // Check if the event is on the target date
                if (eventDate.isSame(targetDate)) {
                    const sourceId = icsTask.icsEvent.source.id;
                    const existing = badgeEvents.get(sourceId);
                    if (existing) {
                        existing.count++;
                    }
                    else {
                        badgeEvents.set(sourceId, {
                            sourceId: sourceId,
                            sourceName: icsTask.icsEvent.source.name,
                            count: 1,
                            color: icsTask.icsEvent.source.color,
                        });
                    }
                }
            }
        });
        return Array.from(badgeEvents.values());
    }
    // Helper function to simulate processTasks logic for filtering badge events
    function filterBadgeEvents(tasks) {
        return tasks.filter((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            // Skip ICS tasks with badge showType
            return !(isIcsTask && showAsBadge);
        });
    }
    describe("Badge Event Detection", () => {
        test("should identify ICS tasks with badge showType", () => {
            var _a, _b;
            // Create mock ICS events
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const eventEvent = {
                uid: "event-event-1",
                summary: "Full Event 1",
                description: "This should appear as a full event",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: eventSource,
            };
            // Create mock ICS tasks
            const badgeTask = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent.dtstart.getTime(),
                    dueDate: (_a = badgeEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const eventTask = {
                id: "ics-test-event-source-event-event-1",
                content: "Full Event 1",
                filePath: "ics://Test Event Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: false,
                originalMarkdown: "- [ ] Full Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: eventEvent.dtstart.getTime(),
                    dueDate: (_b = eventEvent.dtend) === null || _b === void 0 ? void 0 : _b.getTime(),
                    scheduledDate: eventEvent.dtstart.getTime(),
                    project: eventSource.name,
                    heading: [],
                },
                icsEvent: eventEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: eventSource.name,
                    id: eventSource.id,
                },
            };
            const tasks = [badgeTask, eventTask];
            // Test badge event filtering
            const badgeTasks = tasks.filter((task) => {
                var _a, _b, _c;
                const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
                const icsTask = isIcsTask ? task : null;
                return ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            });
            const regularEvents = filterBadgeEvents(tasks);
            expect(badgeTasks).toHaveLength(1);
            expect(badgeTasks[0].id).toBe(badgeTask.id);
            expect(regularEvents).toHaveLength(1);
            expect(regularEvents[0].id).toBe(eventTask.id);
        });
    });
    describe("Badge Event Generation", () => {
        test("should generate badge events for specific date", () => {
            var _a;
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent.dtstart.getTime(),
                    dueDate: (_a = badgeEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const tasks = [badgeTask];
            const targetDate = new Date("2024-01-15");
            const result = getBadgeEventsForDate(tasks, targetDate);
            expect(result).toHaveLength(1);
            expect(result[0].sourceId).toBe(badgeSource.id);
            expect(result[0].sourceName).toBe(badgeSource.name);
            expect(result[0].count).toBe(1);
            expect(result[0].color).toBe(badgeSource.color);
        });
        test("should handle multiple badge events from same source", () => {
            var _a, _b;
            const badgeEvent1 = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeEvent2 = {
                uid: "badge-event-2",
                summary: "Badge Event 2",
                description: "This should also appear as a badge",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask1 = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent1.dtstart.getTime(),
                    dueDate: (_a = badgeEvent1.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent1.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent1,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const badgeTask2 = {
                id: "ics-test-badge-source-badge-event-2",
                content: "Badge Event 2",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 2",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent2.dtstart.getTime(),
                    dueDate: (_b = badgeEvent2.dtend) === null || _b === void 0 ? void 0 : _b.getTime(),
                    scheduledDate: badgeEvent2.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent2,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const tasks = [badgeTask1, badgeTask2];
            const targetDate = new Date("2024-01-15");
            const result = getBadgeEventsForDate(tasks, targetDate);
            expect(result).toHaveLength(1);
            expect(result[0].sourceId).toBe(badgeSource.id);
            expect(result[0].count).toBe(2); // Should aggregate count from same source
        });
        test("should handle multiple badge sources on same date", () => {
            var _a, _b;
            const source1 = {
                id: "source-1",
                name: "Calendar 1",
                url: "https://example.com/cal1.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: "#ff6b6b",
            };
            const source2 = {
                id: "source-2",
                name: "Calendar 2",
                url: "https://example.com/cal2.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: "#4ecdc4",
            };
            const event1 = {
                uid: "event-1",
                summary: "Event from Calendar 1",
                description: "",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: source1,
            };
            const event2 = {
                uid: "event-2",
                summary: "Event from Calendar 2",
                description: "",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: source2,
            };
            const task1 = {
                id: "ics-source-1-event-1",
                content: "Event from Calendar 1",
                filePath: "ics://Calendar 1",
                line: 0,
                completed: false,
                status: " ",
                badge: false,
                originalMarkdown: "- [ ] Event from Calendar 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: event1.dtstart.getTime(),
                    dueDate: (_a = event1.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: event1.dtstart.getTime(),
                    project: source1.name,
                    heading: [],
                },
                icsEvent: event1,
                readonly: true,
                source: {
                    type: "ics",
                    name: source1.name,
                    id: source1.id,
                },
            };
            const task2 = {
                id: "ics-source-2-event-2",
                content: "Event from Calendar 2",
                filePath: "ics://Calendar 2",
                line: 0,
                completed: false,
                status: " ",
                badge: false,
                originalMarkdown: "- [ ] Event from Calendar 2",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: event2.dtstart.getTime(),
                    dueDate: (_b = event2.dtend) === null || _b === void 0 ? void 0 : _b.getTime(),
                    scheduledDate: event2.dtstart.getTime(),
                    project: source2.name,
                    heading: [],
                },
                icsEvent: event2,
                readonly: true,
                source: {
                    type: "ics",
                    name: source2.name,
                    id: source2.id,
                },
            };
            const tasks = [task1, task2];
            const targetDate = new Date("2024-01-15");
            const result = getBadgeEventsForDate(tasks, targetDate);
            expect(result).toHaveLength(2);
            // Find badges by source ID
            const badge1 = result.find((b) => b.sourceId === source1.id);
            const badge2 = result.find((b) => b.sourceId === source2.id);
            expect(badge1).toBeDefined();
            expect(badge1.count).toBe(1);
            expect(badge1.color).toBe(source1.color);
            expect(badge2).toBeDefined();
            expect(badge2.count).toBe(1);
            expect(badge2.color).toBe(source2.color);
        });
        test("should return empty array when no badge events exist", () => {
            var _a;
            const eventEvent = {
                uid: "event-event-1",
                summary: "Full Event 1",
                description: "This should appear as a full event",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: eventSource, // This has showType: "event", not "badge"
            };
            const eventTask = {
                id: "ics-test-event-source-event-event-1",
                content: "Full Event 1",
                filePath: "ics://Test Event Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: false,
                originalMarkdown: "- [ ] Full Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: eventEvent.dtstart.getTime(),
                    dueDate: (_a = eventEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: eventEvent.dtstart.getTime(),
                    project: eventSource.name,
                    heading: [],
                },
                icsEvent: eventEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: eventSource.name,
                    id: eventSource.id,
                },
            };
            const tasks = [eventTask];
            const targetDate = new Date("2024-01-15");
            const result = getBadgeEventsForDate(tasks, targetDate);
            expect(result).toHaveLength(0);
        });
        test("should return empty array for dates with no events", () => {
            var _a;
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent.dtstart.getTime(),
                    dueDate: (_a = badgeEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const tasks = [badgeTask];
            const targetDate = new Date("2024-01-16"); // Different date
            const result = getBadgeEventsForDate(tasks, targetDate);
            expect(result).toHaveLength(0);
        });
    });
    describe("Badge Event Filtering", () => {
        test("should exclude badge events from regular calendar events", () => {
            var _a, _b;
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const eventEvent = {
                uid: "event-event-1",
                summary: "Full Event 1",
                description: "This should appear as a full event",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: eventSource,
            };
            const badgeTask = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent.dtstart.getTime(),
                    dueDate: (_a = badgeEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const eventTask = {
                id: "ics-test-event-source-event-event-1",
                content: "Full Event 1",
                filePath: "ics://Test Event Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: false,
                originalMarkdown: "- [ ] Full Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: eventEvent.dtstart.getTime(),
                    dueDate: (_b = eventEvent.dtend) === null || _b === void 0 ? void 0 : _b.getTime(),
                    scheduledDate: eventEvent.dtstart.getTime(),
                    project: eventSource.name,
                    heading: [],
                },
                icsEvent: eventEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: eventSource.name,
                    id: eventSource.id,
                },
            };
            const tasks = [badgeTask, eventTask];
            // Simulate processTasks logic for filtering out badge events
            const calendarEvents = filterBadgeEvents(tasks);
            expect(calendarEvents).toHaveLength(1);
            expect(calendarEvents[0].id).toBe(eventTask.id);
        });
        test("should include non-ICS tasks in regular calendar events", () => {
            var _a;
            const regularTask = {
                id: "regular-task-1",
                content: "Regular Task",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Regular Task",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15").getTime(),
                    heading: [],
                },
            };
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "This should appear as a badge",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask = {
                id: "ics-test-badge-source-badge-event-1",
                content: "Badge Event 1",
                filePath: "ics://Test Badge Calendar",
                line: 0,
                completed: false,
                status: " ",
                badge: true,
                originalMarkdown: "- [ ] Badge Event 1",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: badgeEvent.dtstart.getTime(),
                    dueDate: (_a = badgeEvent.dtend) === null || _a === void 0 ? void 0 : _a.getTime(),
                    scheduledDate: badgeEvent.dtstart.getTime(),
                    project: badgeSource.name,
                    heading: [],
                },
                icsEvent: badgeEvent,
                readonly: true,
                source: {
                    type: "ics",
                    name: badgeSource.name,
                    id: badgeSource.id,
                },
            };
            const tasks = [regularTask, badgeTask];
            const calendarEvents = filterBadgeEvents(tasks);
            expect(calendarEvents).toHaveLength(1);
            expect(calendarEvents[0].id).toBe(regularTask.id);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXItYmFkZ2UtcmVuZGVyaW5nLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYWxlbmRhci1iYWRnZS1yZW5kZXJpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBSWxDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDL0MsbUJBQW1CO0lBQ25CLE1BQU0sV0FBVyxHQUFjO1FBQzlCLEVBQUUsRUFBRSxtQkFBbUI7UUFDdkIsSUFBSSxFQUFFLHFCQUFxQjtRQUMzQixHQUFHLEVBQUUsa0NBQWtDO1FBQ3ZDLE9BQU8sRUFBRSxJQUFJO1FBQ2IsZUFBZSxFQUFFLEVBQUU7UUFDbkIsZ0JBQWdCLEVBQUUsSUFBSTtRQUN0QixlQUFlLEVBQUUsSUFBSTtRQUNyQixRQUFRLEVBQUUsT0FBTztRQUNqQixLQUFLLEVBQUUsU0FBUztLQUNoQixDQUFDO0lBRUYsTUFBTSxXQUFXLEdBQWM7UUFDOUIsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixJQUFJLEVBQUUscUJBQXFCO1FBQzNCLEdBQUcsRUFBRSxtQ0FBbUM7UUFDeEMsT0FBTyxFQUFFLElBQUk7UUFDYixlQUFlLEVBQUUsRUFBRTtRQUNuQixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUM7SUFFRiwwREFBMEQ7SUFDMUQsU0FBUyxxQkFBcUIsQ0FDN0IsS0FBYSxFQUNiLElBQVU7UUFPVixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sV0FBVyxHQVFiLElBQUksR0FBRyxFQUFFLENBQUM7UUFFZCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFF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RUFBRSxJQUFJO2dCQUNkLE1BQU0sRUFBRTtvQkFDUCxJQUFJLEVBQUUsS0FBSztvQkFDWCxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUk7b0JBQ3RCLEVBQUUsRUFBRSxXQUFXLENBQUMsRUFBRTtpQkFDbEI7YUFDRCxDQUFDO1lBRUYsTUFBTSxLQUFLLEdBQVcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFL0MsTUFBTSxjQUFjLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFaEQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENhbGVuZGFyIEJhZGdlIFJlbmRlcmluZyBUZXN0c1xyXG4gKiBUZXN0cyB0aGUgYmFkZ2UgcmVuZGVyaW5nIGxvZ2ljIGZvciBJQ1MgZXZlbnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEljc1Rhc2ssIEljc0V2ZW50LCBJY3NTb3VyY2UgfSBmcm9tIFwiLi4vdHlwZXMvaWNzXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuZGVzY3JpYmUoXCJDYWxlbmRhciBCYWRnZSBSZW5kZXJpbmcgTG9naWNcIiwgKCkgPT4ge1xyXG5cdC8vIE1vY2sgSUNTIHNvdXJjZXNcclxuXHRjb25zdCBiYWRnZVNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0aWQ6IFwidGVzdC1iYWRnZS1zb3VyY2VcIixcclxuXHRcdG5hbWU6IFwiVGVzdCBCYWRnZSBDYWxlbmRhclwiLFxyXG5cdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vY2FsZW5kYXIuaWNzXCIsXHJcblx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VHlwZTogXCJiYWRnZVwiLFxyXG5cdFx0Y29sb3I6IFwiI2ZmNmI2YlwiLFxyXG5cdH07XHJcblxyXG5cdGNvbnN0IGV2ZW50U291cmNlOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRpZDogXCJ0ZXN0LWV2ZW50LXNvdXJjZVwiLFxyXG5cdFx0bmFtZTogXCJUZXN0IEV2ZW50IENhbGVuZGFyXCIsXHJcblx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS9jYWxlbmRhcjIuaWNzXCIsXHJcblx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0Y29sb3I6IFwiIzRlY2RjNFwiLFxyXG5cdH07XHJcblxyXG5cdC8vIEhlbHBlciBmdW5jdGlvbiB0byBzaW11bGF0ZSBnZXRCYWRnZUV2ZW50c0ZvckRhdGUgbG9naWNcclxuXHRmdW5jdGlvbiBnZXRCYWRnZUV2ZW50c0ZvckRhdGUoXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZGF0ZTogRGF0ZVxyXG5cdCk6IHtcclxuXHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRzb3VyY2VOYW1lOiBzdHJpbmc7XHJcblx0XHRjb3VudDogbnVtYmVyO1xyXG5cdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0fVtdIHtcclxuXHRcdGNvbnN0IHRhcmdldERhdGUgPSBtb21lbnQoZGF0ZSkuc3RhcnRPZihcImRheVwiKTtcclxuXHRcdGNvbnN0IGJhZGdlRXZlbnRzOiBNYXA8XHJcblx0XHRcdHN0cmluZyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRcdFx0c291cmNlTmFtZTogc3RyaW5nO1xyXG5cdFx0XHRcdGNvdW50OiBudW1iZXI7XHJcblx0XHRcdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0XHRcdH1cclxuXHRcdD4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG1vbWVudChpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQpLnN0YXJ0T2YoXHJcblx0XHRcdFx0XHRcImRheVwiXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50IGlzIG9uIHRoZSB0YXJnZXQgZGF0ZVxyXG5cdFx0XHRcdGlmIChldmVudERhdGUuaXNTYW1lKHRhcmdldERhdGUpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzb3VyY2VJZCA9IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmlkO1xyXG5cdFx0XHRcdFx0Y29uc3QgZXhpc3RpbmcgPSBiYWRnZUV2ZW50cy5nZXQoc291cmNlSWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChleGlzdGluZykge1xyXG5cdFx0XHRcdFx0XHRleGlzdGluZy5jb3VudCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YmFkZ2VFdmVudHMuc2V0KHNvdXJjZUlkLCB7XHJcblx0XHRcdFx0XHRcdFx0c291cmNlSWQ6IHNvdXJjZUlkLFxyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZU5hbWU6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRcdFx0Y291bnQ6IDEsXHJcblx0XHRcdFx0XHRcdFx0Y29sb3I6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmNvbG9yLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBBcnJheS5mcm9tKGJhZGdlRXZlbnRzLnZhbHVlcygpKTtcclxuXHR9XHJcblxyXG5cdC8vIEhlbHBlciBmdW5jdGlvbiB0byBzaW11bGF0ZSBwcm9jZXNzVGFza3MgbG9naWMgZm9yIGZpbHRlcmluZyBiYWRnZSBldmVudHNcclxuXHRmdW5jdGlvbiBmaWx0ZXJCYWRnZUV2ZW50cyh0YXNrczogVGFza1tdKTogVGFza1tdIHtcclxuXHRcdHJldHVybiB0YXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgaXNJY3NUYXNrID0gKHRhc2sgYXMgYW55KS5zb3VyY2U/LnR5cGUgPT09IFwiaWNzXCI7XHJcblx0XHRcdGNvbnN0IGljc1Rhc2sgPSBpc0ljc1Rhc2sgPyAodGFzayBhcyBJY3NUYXNrKSA6IG51bGw7XHJcblx0XHRcdGNvbnN0IHNob3dBc0JhZGdlID0gaWNzVGFzaz8uaWNzRXZlbnQ/LnNvdXJjZT8uc2hvd1R5cGUgPT09IFwiYmFkZ2VcIjtcclxuXHJcblx0XHRcdC8vIFNraXAgSUNTIHRhc2tzIHdpdGggYmFkZ2Ugc2hvd1R5cGVcclxuXHRcdFx0cmV0dXJuICEoaXNJY3NUYXNrICYmIHNob3dBc0JhZGdlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZGVzY3JpYmUoXCJCYWRnZSBFdmVudCBEZXRlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBpZGVudGlmeSBJQ1MgdGFza3Mgd2l0aCBiYWRnZSBzaG93VHlwZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBtb2NrIElDUyBldmVudHNcclxuXHRcdFx0Y29uc3QgYmFkZ2VFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIHNob3VsZCBhcHBlYXIgYXMgYSBiYWRnZVwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImV2ZW50LWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGZ1bGwgZXZlbnRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBldmVudFNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBtb2NrIElDUyB0YXNrc1xyXG5cdFx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaWNzLXRlc3QtYmFkZ2Utc291cmNlLWJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50VGFzazogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpY3MtdGVzdC1ldmVudC1zb3VyY2UtZXZlbnQtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiRnVsbCBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vVGVzdCBFdmVudCBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGJhZGdlOiBmYWxzZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogZXZlbnRFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IGV2ZW50RXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGV2ZW50RXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBldmVudFNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpY3NFdmVudDogZXZlbnRFdmVudCxcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBldmVudFNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IGV2ZW50U291cmNlLmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFzaywgZXZlbnRUYXNrXTtcclxuXHJcblx0XHRcdC8vIFRlc3QgYmFkZ2UgZXZlbnQgZmlsdGVyaW5nXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFza3MgPSB0YXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0XHRjb25zdCBpY3NUYXNrID0gaXNJY3NUYXNrID8gKHRhc2sgYXMgSWNzVGFzaykgOiBudWxsO1xyXG5cdFx0XHRcdHJldHVybiBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlZ3VsYXJFdmVudHMgPSBmaWx0ZXJCYWRnZUV2ZW50cyh0YXNrcyk7XHJcblxyXG5cdFx0XHRleHBlY3QoYmFkZ2VUYXNrcykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VUYXNrc1swXS5pZCkudG9CZShiYWRnZVRhc2suaWQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlZ3VsYXJFdmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlZ3VsYXJFdmVudHNbMF0uaWQpLnRvQmUoZXZlbnRUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkJhZGdlIEV2ZW50IEdlbmVyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBnZW5lcmF0ZSBiYWRnZSBldmVudHMgZm9yIHNwZWNpZmljIGRhdGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwiYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGJhZGdlXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDExOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogYmFkZ2VTb3VyY2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaWNzLXRlc3QtYmFkZ2Utc291cmNlLWJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrXTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGdldEJhZGdlRXZlbnRzRm9yRGF0ZSh0YXNrcywgdGFyZ2V0RGF0ZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uc291cmNlSWQpLnRvQmUoYmFkZ2VTb3VyY2UuaWQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLnNvdXJjZU5hbWUpLnRvQmUoYmFkZ2VTb3VyY2UubmFtZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uY291bnQpLnRvQmUoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uY29sb3IpLnRvQmUoYmFkZ2VTb3VyY2UuY29sb3IpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgYmFkZ2UgZXZlbnRzIGZyb20gc2FtZSBzb3VyY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50MTogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIHNob3VsZCBhcHBlYXIgYXMgYSBiYWRnZVwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYmFkZ2VFdmVudDI6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJiYWRnZS1ldmVudC0yXCIsXHJcblx0XHRcdFx0c3VtbWFyeTogXCJCYWRnZSBFdmVudCAyXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGhpcyBzaG91bGQgYWxzbyBhcHBlYXIgYXMgYSBiYWRnZVwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYmFkZ2VUYXNrMTogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpY3MtdGVzdC1iYWRnZS1zb3VyY2UtYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcImljczovL1Rlc3QgQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGJhZGdlRXZlbnQxLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudDEuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGJhZGdlRXZlbnQxLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQxLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazI6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaWNzLXRlc3QtYmFkZ2Utc291cmNlLWJhZGdlLWV2ZW50LTJcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDJcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBCYWRnZSBFdmVudCAyXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50Mi5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IGJhZGdlRXZlbnQyLmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBiYWRnZUV2ZW50Mi5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50MixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IGJhZGdlU291cmNlLmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFzazEsIGJhZGdlVGFzazJdO1xyXG5cdFx0XHRjb25zdCB0YXJnZXREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZ2V0QmFkZ2VFdmVudHNGb3JEYXRlKHRhc2tzLCB0YXJnZXREYXRlKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS5zb3VyY2VJZCkudG9CZShiYWRnZVNvdXJjZS5pZCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uY291bnQpLnRvQmUoMik7IC8vIFNob3VsZCBhZ2dyZWdhdGUgY291bnQgZnJvbSBzYW1lIHNvdXJjZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgYmFkZ2Ugc291cmNlcyBvbiBzYW1lIGRhdGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzb3VyY2UxOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwic291cmNlLTFcIixcclxuXHRcdFx0XHRuYW1lOiBcIkNhbGVuZGFyIDFcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS9jYWwxLmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJiYWRnZVwiLFxyXG5cdFx0XHRcdGNvbG9yOiBcIiNmZjZiNmJcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHNvdXJjZTI6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogXCJzb3VyY2UtMlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiQ2FsZW5kYXIgMlwiLFxyXG5cdFx0XHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL2NhbDIuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImJhZGdlXCIsXHJcblx0XHRcdFx0Y29sb3I6IFwiIzRlY2RjNFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnQxOiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwiZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiRXZlbnQgZnJvbSBDYWxlbmRhciAxXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDExOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogc291cmNlMSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50MjogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImV2ZW50LTJcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkV2ZW50IGZyb20gQ2FsZW5kYXIgMlwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IHNvdXJjZTIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrMTogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpY3Mtc291cmNlLTEtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiRXZlbnQgZnJvbSBDYWxlbmRhciAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vQ2FsZW5kYXIgMVwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGJhZGdlOiBmYWxzZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEV2ZW50IGZyb20gQ2FsZW5kYXIgMVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogZXZlbnQxLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogZXZlbnQxLmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBldmVudDEuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBzb3VyY2UxLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBldmVudDEsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0c291cmNlOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImljc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogc291cmNlMS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IHNvdXJjZTEuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2syOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImljcy1zb3VyY2UtMi1ldmVudC0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJFdmVudCBmcm9tIENhbGVuZGFyIDJcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9DYWxlbmRhciAyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gRXZlbnQgZnJvbSBDYWxlbmRhciAyXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBldmVudDIuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBldmVudDIuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGV2ZW50Mi5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IHNvdXJjZTIubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGV2ZW50MixcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBzb3VyY2UyLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogc291cmNlMi5pZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFt0YXNrMSwgdGFzazJdO1xyXG5cdFx0XHRjb25zdCB0YXJnZXREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZ2V0QmFkZ2VFdmVudHNGb3JEYXRlKHRhc2tzLCB0YXJnZXREYXRlKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHJcblx0XHRcdC8vIEZpbmQgYmFkZ2VzIGJ5IHNvdXJjZSBJRFxyXG5cdFx0XHRjb25zdCBiYWRnZTEgPSByZXN1bHQuZmluZCgoYikgPT4gYi5zb3VyY2VJZCA9PT0gc291cmNlMS5pZCk7XHJcblx0XHRcdGNvbnN0IGJhZGdlMiA9IHJlc3VsdC5maW5kKChiKSA9PiBiLnNvdXJjZUlkID09PSBzb3VyY2UyLmlkKTtcclxuXHJcblx0XHRcdGV4cGVjdChiYWRnZTEpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChiYWRnZTEhLmNvdW50KS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2UxIS5jb2xvcikudG9CZShzb3VyY2UxLmNvbG9yKTtcclxuXHJcblx0XHRcdGV4cGVjdChiYWRnZTIpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChiYWRnZTIhLmNvdW50KS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2UyIS5jb2xvcikudG9CZShzb3VyY2UyLmNvbG9yKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gbm8gYmFkZ2UgZXZlbnRzIGV4aXN0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZXZlbnRFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImV2ZW50LWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGZ1bGwgZXZlbnRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBldmVudFNvdXJjZSwgLy8gVGhpcyBoYXMgc2hvd1R5cGU6IFwiZXZlbnRcIiwgbm90IFwiYmFkZ2VcIlxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRUYXNrOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImljcy10ZXN0LWV2ZW50LXNvdXJjZS1ldmVudC1ldmVudC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJGdWxsIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEV2ZW50IENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gRnVsbCBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBldmVudEV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogZXZlbnRFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogZXZlbnRFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGV2ZW50U291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBldmVudEV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGV2ZW50U291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogZXZlbnRTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbZXZlbnRUYXNrXTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGdldEJhZGdlRXZlbnRzRm9yRGF0ZSh0YXNrcywgdGFyZ2V0RGF0ZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSBmb3IgZGF0ZXMgd2l0aCBubyBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwiYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGJhZGdlXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDExOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogYmFkZ2VTb3VyY2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaWNzLXRlc3QtYmFkZ2Utc291cmNlLWJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrXTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNlwiKTsgLy8gRGlmZmVyZW50IGRhdGVcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGdldEJhZGdlRXZlbnRzRm9yRGF0ZSh0YXNrcywgdGFyZ2V0RGF0ZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCYWRnZSBFdmVudCBGaWx0ZXJpbmdcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBleGNsdWRlIGJhZGdlIGV2ZW50cyBmcm9tIHJlZ3VsYXIgY2FsZW5kYXIgZXZlbnRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgYmFkZ2VFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIHNob3VsZCBhcHBlYXIgYXMgYSBiYWRnZVwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImV2ZW50LWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGZ1bGwgZXZlbnRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBldmVudFNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpY3MtdGVzdC1iYWRnZS1zb3VyY2UtYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcImljczovL1Rlc3QgQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGJhZGdlRXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBiYWRnZUV2ZW50LmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0c291cmNlOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImljc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGlkOiBiYWRnZVNvdXJjZS5pZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRUYXNrOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImljcy10ZXN0LWV2ZW50LXNvdXJjZS1ldmVudC1ldmVudC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJGdWxsIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEV2ZW50IENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gRnVsbCBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBldmVudEV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogZXZlbnRFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogZXZlbnRFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGV2ZW50U291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBldmVudEV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGV2ZW50U291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogZXZlbnRTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrLCBldmVudFRhc2tdO1xyXG5cclxuXHRcdFx0Ly8gU2ltdWxhdGUgcHJvY2Vzc1Rhc2tzIGxvZ2ljIGZvciBmaWx0ZXJpbmcgb3V0IGJhZGdlIGV2ZW50c1xyXG5cdFx0XHRjb25zdCBjYWxlbmRhckV2ZW50cyA9IGZpbHRlckJhZGdlRXZlbnRzKHRhc2tzKTtcclxuXHJcblx0XHRcdGV4cGVjdChjYWxlbmRhckV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHNbMF0uaWQpLnRvQmUoZXZlbnRUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaW5jbHVkZSBub24tSUNTIHRhc2tzIGluIHJlZ3VsYXIgY2FsZW5kYXIgZXZlbnRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVndWxhclRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicmVndWxhci10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYmFkZ2VFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIHNob3VsZCBhcHBlYXIgYXMgYSBiYWRnZVwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgYmFkZ2VUYXNrOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImljcy10ZXN0LWJhZGdlLXNvdXJjZS1iYWRnZS1ldmVudC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vVGVzdCBCYWRnZSBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGJhZGdlOiB0cnVlLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IGJhZGdlRXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGJhZGdlRXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpY3NFdmVudDogYmFkZ2VFdmVudCxcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IGJhZGdlU291cmNlLmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW3JlZ3VsYXJUYXNrLCBiYWRnZVRhc2tdO1xyXG5cclxuXHRcdFx0Y29uc3QgY2FsZW5kYXJFdmVudHMgPSBmaWx0ZXJCYWRnZUV2ZW50cyh0YXNrcyk7XHJcblxyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KGNhbGVuZGFyRXZlbnRzWzBdLmlkKS50b0JlKHJlZ3VsYXJUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19