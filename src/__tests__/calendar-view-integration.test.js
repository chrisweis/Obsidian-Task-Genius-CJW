/**
 * Calendar View Integration Tests
 * Tests the integration between badge logic and calendar view rendering
 */
import { moment } from "obsidian";
describe("Calendar View Badge Integration", () => {
    // Test the integration logic that would be used in the actual calendar component
    // Mock the CalendarComponent's getBadgeEventsForDate method
    function simulateGetBadgeEventsForDate(tasks, date) {
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
    // Mock the CalendarComponent's processTasks method
    function simulateProcessTasks(tasks) {
        return tasks.filter((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            // Skip ICS tasks with badge showType - they will be handled separately
            return !(isIcsTask && showAsBadge);
        });
    }
    // Simulate the month view rendering logic for badges
    function simulateMonthViewBadgeRendering(tasks, startDate, endDate) {
        const badgesByDate = {};
        // Simulate iterating through each day in the month view
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split("T")[0];
            const badgeEvents = simulateGetBadgeEventsForDate(tasks, currentDate);
            if (badgeEvents.length > 0) {
                badgesByDate[dateStr] = badgeEvents.map((badgeEvent) => ({
                    cls: "calendar-badge",
                    title: `${badgeEvent.sourceName}: ${badgeEvent.count} events`,
                    backgroundColor: badgeEvent.color,
                    textContent: badgeEvent.count.toString(),
                }));
            }
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return badgesByDate;
    }
    describe("Badge Rendering Integration", () => {
        test("should render badges in month view for badge events", () => {
            var _a;
            // Create test data
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
            // Simulate month view rendering
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // Verify badge is rendered on the correct date
            expect(badgesByDate["2024-01-15"]).toBeDefined();
            expect(badgesByDate["2024-01-15"]).toHaveLength(1);
            const badge = badgesByDate["2024-01-15"][0];
            expect(badge.cls).toBe("calendar-badge");
            expect(badge.textContent).toBe("1");
            expect(badge.backgroundColor).toBe("#ff6b6b");
            expect(badge.title).toBe("Test Badge Calendar: 1 events");
            // Verify no badges on other dates
            expect(badgesByDate["2024-01-14"]).toBeUndefined();
            expect(badgesByDate["2024-01-16"]).toBeUndefined();
        });
        test("should not render badges for regular events", () => {
            var _a;
            // Create test data with regular event (not badge)
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
            const eventEvent = {
                uid: "event-event-1",
                summary: "Full Event 1",
                description: "This should appear as a full event",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: eventSource,
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
            // Simulate month view rendering
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // Verify no badges are rendered
            expect(Object.keys(badgesByDate)).toHaveLength(0);
            // Verify the task would be included in regular calendar events
            const calendarEvents = simulateProcessTasks(tasks);
            expect(calendarEvents).toHaveLength(1);
            expect(calendarEvents[0].id).toBe(eventTask.id);
        });
        test("should handle mixed badge and regular events correctly", () => {
            var _a, _b;
            // Create mixed test data
            const badgeSource = {
                id: "badge-source",
                name: "Badge Calendar",
                url: "https://example.com/badge.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: "#ff6b6b",
            };
            const eventSource = {
                id: "event-source",
                name: "Event Calendar",
                url: "https://example.com/event.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                color: "#4ecdc4",
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
                id: "badge-task-1",
                content: "Badge Event 1",
                filePath: "ics://Badge Calendar",
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
                id: "event-task-1",
                content: "Full Event 1",
                filePath: "ics://Event Calendar",
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
            // Test badge rendering
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // Verify badge is rendered for badge event
            expect(badgesByDate["2024-01-15"]).toBeDefined();
            expect(badgesByDate["2024-01-15"]).toHaveLength(1);
            expect(badgesByDate["2024-01-15"][0].textContent).toBe("1");
            // Test regular event processing
            const calendarEvents = simulateProcessTasks(tasks);
            // Verify only the regular event is included in calendar events
            expect(calendarEvents).toHaveLength(1);
            expect(calendarEvents[0].id).toBe(eventTask.id);
        });
        test("should aggregate multiple badge events from same source", () => {
            var _a, _b;
            const badgeSource = {
                id: "badge-source",
                name: "Badge Calendar",
                url: "https://example.com/badge.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: "#ff6b6b",
            };
            // Create multiple events on the same day
            const badgeEvent1 = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeEvent2 = {
                uid: "badge-event-2",
                summary: "Badge Event 2",
                description: "",
                dtstart: new Date("2024-01-15T14:00:00Z"),
                dtend: new Date("2024-01-15T15:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask1 = {
                id: "badge-task-1",
                content: "Badge Event 1",
                filePath: "ics://Badge Calendar",
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
                id: "badge-task-2",
                content: "Badge Event 2",
                filePath: "ics://Badge Calendar",
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
            // Test badge rendering
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // Verify badge shows aggregated count
            expect(badgesByDate["2024-01-15"]).toBeDefined();
            expect(badgesByDate["2024-01-15"]).toHaveLength(1);
            expect(badgesByDate["2024-01-15"][0].textContent).toBe("2");
            expect(badgesByDate["2024-01-15"][0].title).toBe("Badge Calendar: 2 events");
        });
    });
    describe("Badge Rendering Edge Cases", () => {
        test("should handle empty task list", () => {
            const tasks = [];
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            expect(Object.keys(badgesByDate)).toHaveLength(0);
        });
        test("should handle tasks without ICS events", () => {
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
            const tasks = [regularTask];
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // No badges should be rendered for regular tasks
            expect(Object.keys(badgesByDate)).toHaveLength(0);
            // But the task should be included in regular calendar events
            const calendarEvents = simulateProcessTasks(tasks);
            expect(calendarEvents).toHaveLength(1);
            expect(calendarEvents[0].id).toBe(regularTask.id);
        });
        test("should handle badge events outside date range", () => {
            var _a;
            const badgeSource = {
                id: "badge-source",
                name: "Badge Calendar",
                url: "https://example.com/badge.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: "#ff6b6b",
            };
            const badgeEvent = {
                uid: "badge-event-1",
                summary: "Badge Event 1",
                description: "",
                dtstart: new Date("2024-02-15T10:00:00Z"),
                dtend: new Date("2024-02-15T11:00:00Z"),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask = {
                id: "badge-task-1",
                content: "Badge Event 1",
                filePath: "ics://Badge Calendar",
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
            // Test January range
            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");
            const badgesByDate = simulateMonthViewBadgeRendering(tasks, startDate, endDate);
            // No badges should be rendered in January
            expect(Object.keys(badgesByDate)).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXItdmlldy1pbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FsZW5kYXItdmlldy1pbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFJbEMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxpRkFBaUY7SUFFakYsNERBQTREO0lBQzVELFNBQVMsNkJBQTZCLENBQ3JDLEtBQWEsRUFDYixJQUFVO1FBT1YsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLFdBQVcsR0FRYixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRWQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOztZQUN0QixNQUFNLFNBQVMsR0FBRyxDQUFBLE1BQUMsSUFBWSxDQUFDLE1BQU0sMENBQUUsSUFBSSxNQUFLLEtBQUssQ0FBQztZQUN2RCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFFLElBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNyRCxNQUFNLFdBQVcsR0FBRyxDQUFBLE1BQUEsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsUUFBUSwwQ0FBRSxNQUFNLDBDQUFFLFFBQVEsTUFBSyxPQUFPLENBQUM7WUFFcEUsSUFBSSxTQUFTLElBQUksV0FBVyxLQUFJLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxRQUFRLENBQUEsRUFBRTtnQkFDbEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUN6RCxLQUFLLENBQ0wsQ0FBQztnQkFFRiwyQ0FBMkM7Z0JBQzNDLElB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LENBQUM7WUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkMsTUFBTSxZQUFZLEdBQUcsK0JBQStCLENBQ25ELEtBQUssRUFDTCxTQUFTLEVBQ1QsT0FBTyxDQUNQLENBQUM7WUFFRiwwQ0FBMEM7WUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENhbGVuZGFyIFZpZXcgSW50ZWdyYXRpb24gVGVzdHNcclxuICogVGVzdHMgdGhlIGludGVncmF0aW9uIGJldHdlZW4gYmFkZ2UgbG9naWMgYW5kIGNhbGVuZGFyIHZpZXcgcmVuZGVyaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEljc1Rhc2ssIEljc0V2ZW50LCBJY3NTb3VyY2UgfSBmcm9tIFwiLi4vdHlwZXMvaWNzXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuZGVzY3JpYmUoXCJDYWxlbmRhciBWaWV3IEJhZGdlIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHQvLyBUZXN0IHRoZSBpbnRlZ3JhdGlvbiBsb2dpYyB0aGF0IHdvdWxkIGJlIHVzZWQgaW4gdGhlIGFjdHVhbCBjYWxlbmRhciBjb21wb25lbnRcclxuXHJcblx0Ly8gTW9jayB0aGUgQ2FsZW5kYXJDb21wb25lbnQncyBnZXRCYWRnZUV2ZW50c0ZvckRhdGUgbWV0aG9kXHJcblx0ZnVuY3Rpb24gc2ltdWxhdGVHZXRCYWRnZUV2ZW50c0ZvckRhdGUoXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZGF0ZTogRGF0ZVxyXG5cdCk6IHtcclxuXHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRzb3VyY2VOYW1lOiBzdHJpbmc7XHJcblx0XHRjb3VudDogbnVtYmVyO1xyXG5cdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0fVtdIHtcclxuXHRcdGNvbnN0IHRhcmdldERhdGUgPSBtb21lbnQoZGF0ZSkuc3RhcnRPZihcImRheVwiKTtcclxuXHRcdGNvbnN0IGJhZGdlRXZlbnRzOiBNYXA8XHJcblx0XHRcdHN0cmluZyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRcdFx0c291cmNlTmFtZTogc3RyaW5nO1xyXG5cdFx0XHRcdGNvdW50OiBudW1iZXI7XHJcblx0XHRcdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0XHRcdH1cclxuXHRcdD4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG1vbWVudChpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQpLnN0YXJ0T2YoXHJcblx0XHRcdFx0XHRcImRheVwiXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50IGlzIG9uIHRoZSB0YXJnZXQgZGF0ZVxyXG5cdFx0XHRcdGlmIChldmVudERhdGUuaXNTYW1lKHRhcmdldERhdGUpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzb3VyY2VJZCA9IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmlkO1xyXG5cdFx0XHRcdFx0Y29uc3QgZXhpc3RpbmcgPSBiYWRnZUV2ZW50cy5nZXQoc291cmNlSWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChleGlzdGluZykge1xyXG5cdFx0XHRcdFx0XHRleGlzdGluZy5jb3VudCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YmFkZ2VFdmVudHMuc2V0KHNvdXJjZUlkLCB7XHJcblx0XHRcdFx0XHRcdFx0c291cmNlSWQ6IHNvdXJjZUlkLFxyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZU5hbWU6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRcdFx0Y291bnQ6IDEsXHJcblx0XHRcdFx0XHRcdFx0Y29sb3I6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmNvbG9yLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBBcnJheS5mcm9tKGJhZGdlRXZlbnRzLnZhbHVlcygpKTtcclxuXHR9XHJcblxyXG5cdC8vIE1vY2sgdGhlIENhbGVuZGFyQ29tcG9uZW50J3MgcHJvY2Vzc1Rhc2tzIG1ldGhvZFxyXG5cdGZ1bmN0aW9uIHNpbXVsYXRlUHJvY2Vzc1Rhc2tzKHRhc2tzOiBUYXNrW10pOiBUYXNrW10ge1xyXG5cdFx0cmV0dXJuIHRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBJQ1MgdGFza3Mgd2l0aCBiYWRnZSBzaG93VHlwZSAtIHRoZXkgd2lsbCBiZSBoYW5kbGVkIHNlcGFyYXRlbHlcclxuXHRcdFx0cmV0dXJuICEoaXNJY3NUYXNrICYmIHNob3dBc0JhZGdlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gU2ltdWxhdGUgdGhlIG1vbnRoIHZpZXcgcmVuZGVyaW5nIGxvZ2ljIGZvciBiYWRnZXNcclxuXHRmdW5jdGlvbiBzaW11bGF0ZU1vbnRoVmlld0JhZGdlUmVuZGVyaW5nKFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdHN0YXJ0RGF0ZTogRGF0ZSxcclxuXHRcdGVuZERhdGU6IERhdGVcclxuXHQpOiB7IFtkYXRlU3RyOiBzdHJpbmddOiBhbnlbXSB9IHtcclxuXHRcdGNvbnN0IGJhZGdlc0J5RGF0ZTogeyBbZGF0ZVN0cjogc3RyaW5nXTogYW55W10gfSA9IHt9O1xyXG5cclxuXHRcdC8vIFNpbXVsYXRlIGl0ZXJhdGluZyB0aHJvdWdoIGVhY2ggZGF5IGluIHRoZSBtb250aCB2aWV3XHJcblx0XHRsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShzdGFydERhdGUpO1xyXG5cdFx0d2hpbGUgKGN1cnJlbnREYXRlIDw9IGVuZERhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGN1cnJlbnREYXRlLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50cyA9IHNpbXVsYXRlR2V0QmFkZ2VFdmVudHNGb3JEYXRlKFxyXG5cdFx0XHRcdHRhc2tzLFxyXG5cdFx0XHRcdGN1cnJlbnREYXRlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAoYmFkZ2VFdmVudHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGJhZGdlc0J5RGF0ZVtkYXRlU3RyXSA9IGJhZGdlRXZlbnRzLm1hcCgoYmFkZ2VFdmVudCkgPT4gKHtcclxuXHRcdFx0XHRcdGNsczogXCJjYWxlbmRhci1iYWRnZVwiLFxyXG5cdFx0XHRcdFx0dGl0bGU6IGAke2JhZGdlRXZlbnQuc291cmNlTmFtZX06ICR7YmFkZ2VFdmVudC5jb3VudH0gZXZlbnRzYCxcclxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogYmFkZ2VFdmVudC5jb2xvcixcclxuXHRcdFx0XHRcdHRleHRDb250ZW50OiBiYWRnZUV2ZW50LmNvdW50LnRvU3RyaW5nKCksXHJcblx0XHRcdFx0fSkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNb3ZlIHRvIG5leHQgZGF5XHJcblx0XHRcdGN1cnJlbnREYXRlLnNldERhdGUoY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhZGdlc0J5RGF0ZTtcclxuXHR9XHJcblxyXG5cdGRlc2NyaWJlKFwiQmFkZ2UgUmVuZGVyaW5nIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgcmVuZGVyIGJhZGdlcyBpbiBtb250aCB2aWV3IGZvciBiYWRnZSBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgdGVzdCBkYXRhXHJcblx0XHRcdGNvbnN0IGJhZGdlU291cmNlOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1iYWRnZS1zb3VyY2VcIixcclxuXHRcdFx0XHRuYW1lOiBcIlRlc3QgQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS9jYWxlbmRhci5pY3NcIixcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdHJlZnJlc2hJbnRlcnZhbDogNjAsXHJcblx0XHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1R5cGU6IFwiYmFkZ2VcIixcclxuXHRcdFx0XHRjb2xvcjogXCIjZmY2YjZiXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwiYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGJhZGdlXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDExOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogYmFkZ2VTb3VyY2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiaWNzLXRlc3QtYmFkZ2Utc291cmNlLWJhZGdlLWV2ZW50LTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bGluZTogMCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrXTtcclxuXHJcblx0XHRcdC8vIFNpbXVsYXRlIG1vbnRoIHZpZXcgcmVuZGVyaW5nXHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0wMVwiKTtcclxuXHRcdFx0Y29uc3QgZW5kRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0zMVwiKTtcclxuXHRcdFx0Y29uc3QgYmFkZ2VzQnlEYXRlID0gc2ltdWxhdGVNb250aFZpZXdCYWRnZVJlbmRlcmluZyhcclxuXHRcdFx0XHR0YXNrcyxcclxuXHRcdFx0XHRzdGFydERhdGUsXHJcblx0XHRcdFx0ZW5kRGF0ZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGJhZGdlIGlzIHJlbmRlcmVkIG9uIHRoZSBjb3JyZWN0IGRhdGVcclxuXHRcdFx0ZXhwZWN0KGJhZGdlc0J5RGF0ZVtcIjIwMjQtMDEtMTVcIl0pLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChiYWRnZXNCeURhdGVbXCIyMDI0LTAxLTE1XCJdKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZSA9IGJhZGdlc0J5RGF0ZVtcIjIwMjQtMDEtMTVcIl1bMF07XHJcblx0XHRcdGV4cGVjdChiYWRnZS5jbHMpLnRvQmUoXCJjYWxlbmRhci1iYWRnZVwiKTtcclxuXHRcdFx0ZXhwZWN0KGJhZGdlLnRleHRDb250ZW50KS50b0JlKFwiMVwiKTtcclxuXHRcdFx0ZXhwZWN0KGJhZGdlLmJhY2tncm91bmRDb2xvcikudG9CZShcIiNmZjZiNmJcIik7XHJcblx0XHRcdGV4cGVjdChiYWRnZS50aXRsZSkudG9CZShcIlRlc3QgQmFkZ2UgQ2FsZW5kYXI6IDEgZXZlbnRzXCIpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IG5vIGJhZGdlcyBvbiBvdGhlciBkYXRlc1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VzQnlEYXRlW1wiMjAyNC0wMS0xNFwiXSkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VzQnlEYXRlW1wiMjAyNC0wMS0xNlwiXSkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBub3QgcmVuZGVyIGJhZGdlcyBmb3IgcmVndWxhciBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgdGVzdCBkYXRhIHdpdGggcmVndWxhciBldmVudCAobm90IGJhZGdlKVxyXG5cdFx0XHRjb25zdCBldmVudFNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtZXZlbnQtc291cmNlXCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IEV2ZW50IENhbGVuZGFyXCIsXHJcblx0XHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vY2FsZW5kYXIyLmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLCAvLyBUaGlzIHNob3VsZCBOT1QgYXBwZWFyIGFzIGJhZGdlXHJcblx0XHRcdFx0Y29sb3I6IFwiIzRlY2RjNFwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImV2ZW50LWV2ZW50LTFcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGZ1bGwgZXZlbnRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBldmVudFNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50VGFzazogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJpY3MtdGVzdC1ldmVudC1zb3VyY2UtZXZlbnQtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiRnVsbCBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vVGVzdCBFdmVudCBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGJhZGdlOiBmYWxzZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogZXZlbnRFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IGV2ZW50RXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGV2ZW50RXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBldmVudFNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpY3NFdmVudDogZXZlbnRFdmVudCxcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBldmVudFNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IGV2ZW50U291cmNlLmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2V2ZW50VGFza107XHJcblxyXG5cdFx0XHQvLyBTaW11bGF0ZSBtb250aCB2aWV3IHJlbmRlcmluZ1xyXG5cdFx0XHRjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMDFcIik7XHJcblx0XHRcdGNvbnN0IGVuZERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMzFcIik7XHJcblx0XHRcdGNvbnN0IGJhZGdlc0J5RGF0ZSA9IHNpbXVsYXRlTW9udGhWaWV3QmFkZ2VSZW5kZXJpbmcoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdGVuZERhdGVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBubyBiYWRnZXMgYXJlIHJlbmRlcmVkXHJcblx0XHRcdGV4cGVjdChPYmplY3Qua2V5cyhiYWRnZXNCeURhdGUpKS50b0hhdmVMZW5ndGgoMCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhlIHRhc2sgd291bGQgYmUgaW5jbHVkZWQgaW4gcmVndWxhciBjYWxlbmRhciBldmVudHNcclxuXHRcdFx0Y29uc3QgY2FsZW5kYXJFdmVudHMgPSBzaW11bGF0ZVByb2Nlc3NUYXNrcyh0YXNrcyk7XHJcblx0XHRcdGV4cGVjdChjYWxlbmRhckV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHNbMF0uaWQpLnRvQmUoZXZlbnRUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1peGVkIGJhZGdlIGFuZCByZWd1bGFyIGV2ZW50cyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgbWl4ZWQgdGVzdCBkYXRhXHJcblx0XHRcdGNvbnN0IGJhZGdlU291cmNlOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwiYmFkZ2Utc291cmNlXCIsXHJcblx0XHRcdFx0bmFtZTogXCJCYWRnZSBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL2JhZGdlLmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJiYWRnZVwiLFxyXG5cdFx0XHRcdGNvbG9yOiBcIiNmZjZiNmJcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50U291cmNlOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwiZXZlbnQtc291cmNlXCIsXHJcblx0XHRcdFx0bmFtZTogXCJFdmVudCBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL2V2ZW50Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdGNvbG9yOiBcIiM0ZWNkYzRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlRXZlbnQ6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJiYWRnZS1ldmVudC0xXCIsXHJcblx0XHRcdFx0c3VtbWFyeTogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGhpcyBzaG91bGQgYXBwZWFyIGFzIGEgYmFkZ2VcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTE6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBiYWRnZVNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50RXZlbnQ6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJldmVudC1ldmVudC0xXCIsXHJcblx0XHRcdFx0c3VtbWFyeTogXCJGdWxsIEV2ZW50IDFcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIHNob3VsZCBhcHBlYXIgYXMgYSBmdWxsIGV2ZW50XCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE0OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE1OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogZXZlbnRTb3VyY2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiYmFkZ2UtdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGJhZGdlRXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBiYWRnZUV2ZW50LmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0c291cmNlOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImljc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGlkOiBiYWRnZVNvdXJjZS5pZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRUYXNrOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcImV2ZW50LXRhc2stMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiRnVsbCBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vRXZlbnQgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogZmFsc2UsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBGdWxsIEV2ZW50IDFcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGV2ZW50RXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBldmVudEV2ZW50LmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBldmVudEV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogZXZlbnRTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGV2ZW50RXZlbnQsXHJcblx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0c291cmNlOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImljc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogZXZlbnRTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGlkOiBldmVudFNvdXJjZS5pZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtiYWRnZVRhc2ssIGV2ZW50VGFza107XHJcblxyXG5cdFx0XHQvLyBUZXN0IGJhZGdlIHJlbmRlcmluZ1xyXG5cdFx0XHRjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMDFcIik7XHJcblx0XHRcdGNvbnN0IGVuZERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMzFcIik7XHJcblx0XHRcdGNvbnN0IGJhZGdlc0J5RGF0ZSA9IHNpbXVsYXRlTW9udGhWaWV3QmFkZ2VSZW5kZXJpbmcoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdGVuZERhdGVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBiYWRnZSBpcyByZW5kZXJlZCBmb3IgYmFkZ2UgZXZlbnRcclxuXHRcdFx0ZXhwZWN0KGJhZGdlc0J5RGF0ZVtcIjIwMjQtMDEtMTVcIl0pLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChiYWRnZXNCeURhdGVbXCIyMDI0LTAxLTE1XCJdKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChiYWRnZXNCeURhdGVbXCIyMDI0LTAxLTE1XCJdWzBdLnRleHRDb250ZW50KS50b0JlKFwiMVwiKTtcclxuXHJcblx0XHRcdC8vIFRlc3QgcmVndWxhciBldmVudCBwcm9jZXNzaW5nXHJcblx0XHRcdGNvbnN0IGNhbGVuZGFyRXZlbnRzID0gc2ltdWxhdGVQcm9jZXNzVGFza3ModGFza3MpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IG9ubHkgdGhlIHJlZ3VsYXIgZXZlbnQgaXMgaW5jbHVkZWQgaW4gY2FsZW5kYXIgZXZlbnRzXHJcblx0XHRcdGV4cGVjdChjYWxlbmRhckV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHNbMF0uaWQpLnRvQmUoZXZlbnRUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgYWdncmVnYXRlIG11bHRpcGxlIGJhZGdlIGV2ZW50cyBmcm9tIHNhbWUgc291cmNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgYmFkZ2VTb3VyY2U6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogXCJiYWRnZS1zb3VyY2VcIixcclxuXHRcdFx0XHRuYW1lOiBcIkJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vYmFkZ2UuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImJhZGdlXCIsXHJcblx0XHRcdFx0Y29sb3I6IFwiI2ZmNmI2YlwiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIG11bHRpcGxlIGV2ZW50cyBvbiB0aGUgc2FtZSBkYXlcclxuXHRcdFx0Y29uc3QgYmFkZ2VFdmVudDE6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJiYWRnZS1ldmVudC0xXCIsXHJcblx0XHRcdFx0c3VtbWFyeTogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRkdGVuZDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDExOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogYmFkZ2VTb3VyY2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50MjogSWNzRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcImJhZGdlLWV2ZW50LTJcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDJcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBiYWRnZVNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazE6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiYmFkZ2UtdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGJhZGdlRXZlbnQxLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudDEuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGJhZGdlRXZlbnQxLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQxLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazI6IEljc1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwiYmFkZ2UtdGFzay0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJCYWRnZSBFdmVudCAyXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwiaWNzOi8vQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDJcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IGJhZGdlRXZlbnQyLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudDIuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGJhZGdlRXZlbnQyLmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQyLFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrMSwgYmFkZ2VUYXNrMl07XHJcblxyXG5cdFx0XHQvLyBUZXN0IGJhZGdlIHJlbmRlcmluZ1xyXG5cdFx0XHRjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMDFcIik7XHJcblx0XHRcdGNvbnN0IGVuZERhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMzFcIik7XHJcblx0XHRcdGNvbnN0IGJhZGdlc0J5RGF0ZSA9IHNpbXVsYXRlTW9udGhWaWV3QmFkZ2VSZW5kZXJpbmcoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdGVuZERhdGVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBiYWRnZSBzaG93cyBhZ2dyZWdhdGVkIGNvdW50XHJcblx0XHRcdGV4cGVjdChiYWRnZXNCeURhdGVbXCIyMDI0LTAxLTE1XCJdKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VzQnlEYXRlW1wiMjAyNC0wMS0xNVwiXSkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VzQnlEYXRlW1wiMjAyNC0wMS0xNVwiXVswXS50ZXh0Q29udGVudCkudG9CZShcIjJcIik7XHJcblx0XHRcdGV4cGVjdChiYWRnZXNCeURhdGVbXCIyMDI0LTAxLTE1XCJdWzBdLnRpdGxlKS50b0JlKFxyXG5cdFx0XHRcdFwiQmFkZ2UgQ2FsZW5kYXI6IDIgZXZlbnRzXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkJhZGdlIFJlbmRlcmluZyBFZGdlIENhc2VzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGVtcHR5IHRhc2sgbGlzdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0wMVwiKTtcclxuXHRcdFx0Y29uc3QgZW5kRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0zMVwiKTtcclxuXHRcdFx0Y29uc3QgYmFkZ2VzQnlEYXRlID0gc2ltdWxhdGVNb250aFZpZXdCYWRnZVJlbmRlcmluZyhcclxuXHRcdFx0XHR0YXNrcyxcclxuXHRcdFx0XHRzdGFydERhdGUsXHJcblx0XHRcdFx0ZW5kRGF0ZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KE9iamVjdC5rZXlzKGJhZGdlc0J5RGF0ZSkpLnRvSGF2ZUxlbmd0aCgwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRhc2tzIHdpdGhvdXQgSUNTIGV2ZW50c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlZ3VsYXJUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInJlZ3VsYXItdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJSZWd1bGFyIFRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBSZWd1bGFyIFRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbcmVndWxhclRhc2tdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTAxXCIpO1xyXG5cdFx0XHRjb25zdCBlbmREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTMxXCIpO1xyXG5cdFx0XHRjb25zdCBiYWRnZXNCeURhdGUgPSBzaW11bGF0ZU1vbnRoVmlld0JhZGdlUmVuZGVyaW5nKFxyXG5cdFx0XHRcdHRhc2tzLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZSxcclxuXHRcdFx0XHRlbmREYXRlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBObyBiYWRnZXMgc2hvdWxkIGJlIHJlbmRlcmVkIGZvciByZWd1bGFyIHRhc2tzXHJcblx0XHRcdGV4cGVjdChPYmplY3Qua2V5cyhiYWRnZXNCeURhdGUpKS50b0hhdmVMZW5ndGgoMCk7XHJcblxyXG5cdFx0XHQvLyBCdXQgdGhlIHRhc2sgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHJlZ3VsYXIgY2FsZW5kYXIgZXZlbnRzXHJcblx0XHRcdGNvbnN0IGNhbGVuZGFyRXZlbnRzID0gc2ltdWxhdGVQcm9jZXNzVGFza3ModGFza3MpO1xyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KGNhbGVuZGFyRXZlbnRzWzBdLmlkKS50b0JlKHJlZ3VsYXJUYXNrLmlkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGJhZGdlIGV2ZW50cyBvdXRzaWRlIGRhdGUgcmFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYWRnZVNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0XHRcdGlkOiBcImJhZGdlLXNvdXJjZVwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiQmFkZ2UgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS9iYWRnZS5pY3NcIixcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdHJlZnJlc2hJbnRlcnZhbDogNjAsXHJcblx0XHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1R5cGU6IFwiYmFkZ2VcIixcclxuXHRcdFx0XHRjb2xvcjogXCIjZmY2YjZiXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdFx0XHR1aWQ6IFwiYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMi0xNVQxMDowMDowMFpcIiksIC8vIE91dHNpZGUgSmFudWFyeSByYW5nZVxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDItMTVUMTE6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBiYWRnZVNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJiYWRnZS10YXNrLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJpY3M6Ly9CYWRnZSBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdGxpbmU6IDAsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdGJhZGdlOiB0cnVlLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gQmFkZ2UgRXZlbnQgMVwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IGJhZGdlRXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IGJhZGdlRXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRwcm9qZWN0OiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpY3NFdmVudDogYmFkZ2VFdmVudCxcclxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRzb3VyY2U6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0aWQ6IGJhZGdlU291cmNlLmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFza107XHJcblxyXG5cdFx0XHQvLyBUZXN0IEphbnVhcnkgcmFuZ2VcclxuXHRcdFx0Y29uc3Qgc3RhcnREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTAxXCIpO1xyXG5cdFx0XHRjb25zdCBlbmREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTMxXCIpO1xyXG5cdFx0XHRjb25zdCBiYWRnZXNCeURhdGUgPSBzaW11bGF0ZU1vbnRoVmlld0JhZGdlUmVuZGVyaW5nKFxyXG5cdFx0XHRcdHRhc2tzLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZSxcclxuXHRcdFx0XHRlbmREYXRlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBObyBiYWRnZXMgc2hvdWxkIGJlIHJlbmRlcmVkIGluIEphbnVhcnlcclxuXHRcdFx0ZXhwZWN0KE9iamVjdC5rZXlzKGJhZGdlc0J5RGF0ZSkpLnRvSGF2ZUxlbmd0aCgwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIl19