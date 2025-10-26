/**
 * Test ICS Badge Integration
 * Verifies that ICS events with badge showType are properly handled
 */
describe("ICS Badge Integration", () => {
    var _a, _b;
    // Mock ICS source with badge showType
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
    // Mock ICS source with event showType
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
    // Mock ICS events
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
    // Mock ICS tasks
    const badgeTask = {
        id: "ics-test-badge-source-badge-event-1",
        content: "Badge Event 1",
        filePath: "ics://Test Badge Calendar",
        line: 0,
        completed: false,
        status: " ",
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
        badge: true,
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
        badge: true,
        source: {
            type: "ics",
            name: eventSource.name,
            id: eventSource.id,
        },
    };
    test("should identify ICS tasks with badge showType", () => {
        const tasks = [badgeTask, eventTask];
        // Simulate the logic from calendar component
        const badgeTasks = tasks.filter((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            return ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
        });
        const eventTasks = tasks.filter((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            return isIcsTask && ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) !== "badge";
        });
        expect(badgeTasks).toHaveLength(1);
        expect(badgeTasks[0].id).toBe(badgeTask.id);
        expect(eventTasks).toHaveLength(1);
        expect(eventTasks[0].id).toBe(eventTask.id);
    });
    test("should generate badge events for specific date", () => {
        const tasks = [badgeTask, eventTask];
        const targetDate = new Date("2024-01-15");
        // Simulate getBadgeEventsForDate logic
        const badgeEvents = new Map();
        tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                eventDate.setHours(0, 0, 0, 0);
                const targetDateNormalized = new Date(targetDate);
                targetDateNormalized.setHours(0, 0, 0, 0);
                // Check if the event is on the target date
                if (eventDate.getTime() === targetDateNormalized.getTime()) {
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
        const result = Array.from(badgeEvents.values());
        expect(result).toHaveLength(1);
        expect(result[0].sourceId).toBe(badgeSource.id);
        expect(result[0].sourceName).toBe(badgeSource.name);
        expect(result[0].count).toBe(1);
        expect(result[0].color).toBe(badgeSource.color);
    });
    test("should not include badge events in regular calendar events", () => {
        const tasks = [badgeTask, eventTask];
        // Simulate processTasks logic for filtering out badge events
        const calendarEvents = tasks.filter((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            // Skip ICS tasks with badge showType
            return !(isIcsTask && showAsBadge);
        });
        expect(calendarEvents).toHaveLength(1);
        expect(calendarEvents[0].id).toBe(eventTask.id);
    });
    test("should handle multiple badge events from same source", () => {
        // Create multiple badge events from the same source
        const badgeEvent2 = Object.assign(Object.assign({}, badgeEvent), { uid: "badge-event-2", summary: "Badge Event 2" });
        const badgeTask2 = Object.assign(Object.assign({}, badgeTask), { id: "ics-test-badge-source-badge-event-2", content: "Badge Event 2", icsEvent: badgeEvent2 });
        const tasks = [badgeTask, badgeTask2];
        const targetDate = new Date("2024-01-15");
        // Simulate getBadgeEventsForDate logic
        const badgeEvents = new Map();
        tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                eventDate.setHours(0, 0, 0, 0);
                const targetDateNormalized = new Date(targetDate);
                targetDateNormalized.setHours(0, 0, 0, 0);
                if (eventDate.getTime() === targetDateNormalized.getTime()) {
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
        const result = Array.from(badgeEvents.values());
        expect(result).toHaveLength(1);
        expect(result[0].count).toBe(2); // Should aggregate count from same source
    });
});
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLWJhZGdlLWludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpY3MtYmFkZ2UtaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFLSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFOztJQUN0QyxzQ0FBc0M7SUFDdEMsTUFBTSxXQUFXLEdBQWM7UUFDOUIsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixJQUFJLEVBQUUscUJBQXFCO1FBQzNCLEdBQUcsRUFBRSxrQ0FBa0M7UUFDdkMsT0FBTyxFQUFFLElBQUk7UUFDYixlQUFlLEVBQUUsRUFBRTtRQUNuQixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUM7SUFFRixzQ0FBc0M7SUFDdEMsTUFBTSxXQUFXLEdBQWM7UUFDOUIsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixJQUFJLEVBQUUscUJBQXFCO1FBQzNCLEdBQUcsRUFBRSxtQ0FBbUM7UUFDeEMsT0FBTyxFQUFFLElBQUk7UUFDYixlQUFlLEVBQUUsRUFBRTtRQUNuQixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUM7SUFFRixrQkFBa0I7SUFDbEIsTUFBTSxVQUFVLEdBQWE7UUFDNUIsR0FBRyxFQUFFLGVBQWU7UUFDcEIsT0FBTyxFQUFFLGVBQWU7UUFDeEIsV0FBVyxFQUFFLCtCQUErQjtRQUM1QyxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUM7UUFDekMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDO1FBQ3ZDLE1BQU0sRUFBRSxLQUFLO1FBQ2IsTUFBTSxFQUFFLFdBQVc7S0FDbkIsQ0FB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QkFBTTt3QkFDTixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTs0QkFDekIsUUFBUSxFQUFFLFFBQVE7NEJBQ2xCLFVBQVUsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJOzRCQUN4QyxLQUFLLEVBQUUsQ0FBQzs0QkFDUixLQUFLLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSzt5QkFDcEMsQ0FBQyxDQUFDO3FCQUNIO2lCQUNEO2FBQ0Q7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBDQUEwQztJQUM1RSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3QgSUNTIEJhZGdlIEludGVncmF0aW9uXHJcbiAqIFZlcmlmaWVzIHRoYXQgSUNTIGV2ZW50cyB3aXRoIGJhZGdlIHNob3dUeXBlIGFyZSBwcm9wZXJseSBoYW5kbGVkXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgSWNzU291cmNlLCBJY3NFdmVudCwgSWNzVGFzayB9IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcblxyXG5kZXNjcmliZShcIklDUyBCYWRnZSBJbnRlZ3JhdGlvblwiLCAoKSA9PiB7XHJcblx0Ly8gTW9jayBJQ1Mgc291cmNlIHdpdGggYmFkZ2Ugc2hvd1R5cGVcclxuXHRjb25zdCBiYWRnZVNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0aWQ6IFwidGVzdC1iYWRnZS1zb3VyY2VcIixcclxuXHRcdG5hbWU6IFwiVGVzdCBCYWRnZSBDYWxlbmRhclwiLFxyXG5cdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vY2FsZW5kYXIuaWNzXCIsXHJcblx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRzaG93VHlwZTogXCJiYWRnZVwiLCAvLyBUaGlzIHNob3VsZCBkaXNwbGF5IGFzIGJhZGdlc1xyXG5cdFx0Y29sb3I6IFwiI2ZmNmI2YlwiLFxyXG5cdH07XHJcblxyXG5cdC8vIE1vY2sgSUNTIHNvdXJjZSB3aXRoIGV2ZW50IHNob3dUeXBlXHJcblx0Y29uc3QgZXZlbnRTb3VyY2U6IEljc1NvdXJjZSA9IHtcclxuXHRcdGlkOiBcInRlc3QtZXZlbnQtc291cmNlXCIsXHJcblx0XHRuYW1lOiBcIlRlc3QgRXZlbnQgQ2FsZW5kYXJcIixcclxuXHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL2NhbGVuZGFyMi5pY3NcIixcclxuXHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdHNob3dUeXBlOiBcImV2ZW50XCIsIC8vIFRoaXMgc2hvdWxkIGRpc3BsYXkgYXMgZnVsbCBldmVudHNcclxuXHRcdGNvbG9yOiBcIiM0ZWNkYzRcIixcclxuXHR9O1xyXG5cclxuXHQvLyBNb2NrIElDUyBldmVudHNcclxuXHRjb25zdCBiYWRnZUV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdHVpZDogXCJiYWRnZS1ldmVudC0xXCIsXHJcblx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDFcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGJhZGdlXCIsXHJcblx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0c291cmNlOiBiYWRnZVNvdXJjZSxcclxuXHR9O1xyXG5cclxuXHRjb25zdCBldmVudEV2ZW50OiBJY3NFdmVudCA9IHtcclxuXHRcdHVpZDogXCJldmVudC1ldmVudC0xXCIsXHJcblx0XHRzdW1tYXJ5OiBcIkZ1bGwgRXZlbnQgMVwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVGhpcyBzaG91bGQgYXBwZWFyIGFzIGEgZnVsbCBldmVudFwiLFxyXG5cdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE0OjAwOjAwWlwiKSxcclxuXHRcdGR0ZW5kOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdHNvdXJjZTogZXZlbnRTb3VyY2UsXHJcblx0fTtcclxuXHJcblx0Ly8gTW9jayBJQ1MgdGFza3NcclxuXHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRpZDogXCJpY3MtdGVzdC1iYWRnZS1zb3VyY2UtYmFkZ2UtZXZlbnQtMVwiLFxyXG5cdFx0Y29udGVudDogXCJCYWRnZSBFdmVudCAxXCIsXHJcblx0XHRmaWxlUGF0aDogXCJpY3M6Ly9UZXN0IEJhZGdlIENhbGVuZGFyXCIsXHJcblx0XHRsaW5lOiAwLFxyXG5cdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIEJhZGdlIEV2ZW50IDFcIixcclxuXHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdHN0YXJ0RGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRzY2hlZHVsZWREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRwcm9qZWN0OiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdH0sXHJcblx0XHRpY3NFdmVudDogYmFkZ2VFdmVudCxcclxuXHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0YmFkZ2U6IHRydWUsXHJcblx0XHRzb3VyY2U6IHtcclxuXHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0bmFtZTogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0aWQ6IGJhZGdlU291cmNlLmlkLFxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHRjb25zdCBldmVudFRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRpZDogXCJpY3MtdGVzdC1ldmVudC1zb3VyY2UtZXZlbnQtZXZlbnQtMVwiLFxyXG5cdFx0Y29udGVudDogXCJGdWxsIEV2ZW50IDFcIixcclxuXHRcdGZpbGVQYXRoOiBcImljczovL1Rlc3QgRXZlbnQgQ2FsZW5kYXJcIixcclxuXHRcdGxpbmU6IDAsXHJcblx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gRnVsbCBFdmVudCAxXCIsXHJcblx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRzdGFydERhdGU6IGV2ZW50RXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdGR1ZURhdGU6IGV2ZW50RXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0c2NoZWR1bGVkRGF0ZTogZXZlbnRFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0cHJvamVjdDogZXZlbnRTb3VyY2UubmFtZSxcclxuXHRcdFx0aGVhZGluZzogW10sXHJcblx0XHR9LFxyXG5cdFx0aWNzRXZlbnQ6IGV2ZW50RXZlbnQsXHJcblx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdGJhZGdlOiB0cnVlLFxyXG5cdFx0c291cmNlOiB7XHJcblx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdG5hbWU6IGV2ZW50U291cmNlLm5hbWUsXHJcblx0XHRcdGlkOiBldmVudFNvdXJjZS5pZCxcclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblx0dGVzdChcInNob3VsZCBpZGVudGlmeSBJQ1MgdGFza3Mgd2l0aCBiYWRnZSBzaG93VHlwZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFzaywgZXZlbnRUYXNrXTtcclxuXHJcblx0XHQvLyBTaW11bGF0ZSB0aGUgbG9naWMgZnJvbSBjYWxlbmRhciBjb21wb25lbnRcclxuXHRcdGNvbnN0IGJhZGdlVGFza3MgPSB0YXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgaXNJY3NUYXNrID0gKHRhc2sgYXMgYW55KS5zb3VyY2U/LnR5cGUgPT09IFwiaWNzXCI7XHJcblx0XHRcdGNvbnN0IGljc1Rhc2sgPSBpc0ljc1Rhc2sgPyAodGFzayBhcyBJY3NUYXNrKSA6IG51bGw7XHJcblx0XHRcdHJldHVybiBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZXZlbnRUYXNrcyA9IHRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0cmV0dXJuIGlzSWNzVGFzayAmJiBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSAhPT0gXCJiYWRnZVwiO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZXhwZWN0KGJhZGdlVGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdGV4cGVjdChiYWRnZVRhc2tzWzBdLmlkKS50b0JlKGJhZGdlVGFzay5pZCk7XHJcblxyXG5cdFx0ZXhwZWN0KGV2ZW50VGFza3MpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdGV4cGVjdChldmVudFRhc2tzWzBdLmlkKS50b0JlKGV2ZW50VGFzay5pZCk7XHJcblx0fSk7XHJcblxyXG5cdHRlc3QoXCJzaG91bGQgZ2VuZXJhdGUgYmFkZ2UgZXZlbnRzIGZvciBzcGVjaWZpYyBkYXRlXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbYmFkZ2VUYXNrLCBldmVudFRhc2tdO1xyXG5cdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHJcblx0XHQvLyBTaW11bGF0ZSBnZXRCYWRnZUV2ZW50c0ZvckRhdGUgbG9naWNcclxuXHRcdGNvbnN0IGJhZGdlRXZlbnRzOiBNYXA8XHJcblx0XHRcdHN0cmluZyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRcdFx0c291cmNlTmFtZTogc3RyaW5nO1xyXG5cdFx0XHRcdGNvdW50OiBudW1iZXI7XHJcblx0XHRcdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0XHRcdH1cclxuXHRcdD4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG5ldyBEYXRlKGljc1Rhc2suaWNzRXZlbnQuZHRzdGFydCk7XHJcblx0XHRcdFx0ZXZlbnREYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldERhdGVOb3JtYWxpemVkID0gbmV3IERhdGUodGFyZ2V0RGF0ZSk7XHJcblx0XHRcdFx0dGFyZ2V0RGF0ZU5vcm1hbGl6ZWQuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBldmVudCBpcyBvbiB0aGUgdGFyZ2V0IGRhdGVcclxuXHRcdFx0XHRpZiAoZXZlbnREYXRlLmdldFRpbWUoKSA9PT0gdGFyZ2V0RGF0ZU5vcm1hbGl6ZWQuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzb3VyY2VJZCA9IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmlkO1xyXG5cdFx0XHRcdFx0Y29uc3QgZXhpc3RpbmcgPSBiYWRnZUV2ZW50cy5nZXQoc291cmNlSWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChleGlzdGluZykge1xyXG5cdFx0XHRcdFx0XHRleGlzdGluZy5jb3VudCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YmFkZ2VFdmVudHMuc2V0KHNvdXJjZUlkLCB7XHJcblx0XHRcdFx0XHRcdFx0c291cmNlSWQ6IHNvdXJjZUlkLFxyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZU5hbWU6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRcdFx0Y291bnQ6IDEsXHJcblx0XHRcdFx0XHRcdFx0Y29sb3I6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmNvbG9yLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IEFycmF5LmZyb20oYmFkZ2VFdmVudHMudmFsdWVzKCkpO1xyXG5cclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdGV4cGVjdChyZXN1bHRbMF0uc291cmNlSWQpLnRvQmUoYmFkZ2VTb3VyY2UuaWQpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdFswXS5zb3VyY2VOYW1lKS50b0JlKGJhZGdlU291cmNlLm5hbWUpO1xyXG5cdFx0ZXhwZWN0KHJlc3VsdFswXS5jb3VudCkudG9CZSgxKTtcclxuXHRcdGV4cGVjdChyZXN1bHRbMF0uY29sb3IpLnRvQmUoYmFkZ2VTb3VyY2UuY29sb3IpO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIG5vdCBpbmNsdWRlIGJhZGdlIGV2ZW50cyBpbiByZWd1bGFyIGNhbGVuZGFyIGV2ZW50c1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFzaywgZXZlbnRUYXNrXTtcclxuXHJcblx0XHQvLyBTaW11bGF0ZSBwcm9jZXNzVGFza3MgbG9naWMgZm9yIGZpbHRlcmluZyBvdXQgYmFkZ2UgZXZlbnRzXHJcblx0XHRjb25zdCBjYWxlbmRhckV2ZW50cyA9IHRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBJQ1MgdGFza3Mgd2l0aCBiYWRnZSBzaG93VHlwZVxyXG5cdFx0XHRyZXR1cm4gIShpc0ljc1Rhc2sgJiYgc2hvd0FzQmFkZ2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZXhwZWN0KGNhbGVuZGFyRXZlbnRzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRleHBlY3QoY2FsZW5kYXJFdmVudHNbMF0uaWQpLnRvQmUoZXZlbnRUYXNrLmlkKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgYmFkZ2UgZXZlbnRzIGZyb20gc2FtZSBzb3VyY2VcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gQ3JlYXRlIG11bHRpcGxlIGJhZGdlIGV2ZW50cyBmcm9tIHRoZSBzYW1lIHNvdXJjZVxyXG5cdFx0Y29uc3QgYmFkZ2VFdmVudDI6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHQuLi5iYWRnZUV2ZW50LFxyXG5cdFx0XHR1aWQ6IFwiYmFkZ2UtZXZlbnQtMlwiLFxyXG5cdFx0XHRzdW1tYXJ5OiBcIkJhZGdlIEV2ZW50IDJcIixcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgYmFkZ2VUYXNrMjogSWNzVGFzayA9IHtcclxuXHRcdFx0Li4uYmFkZ2VUYXNrLFxyXG5cdFx0XHRpZDogXCJpY3MtdGVzdC1iYWRnZS1zb3VyY2UtYmFkZ2UtZXZlbnQtMlwiLFxyXG5cdFx0XHRjb250ZW50OiBcIkJhZGdlIEV2ZW50IDJcIixcclxuXHRcdFx0aWNzRXZlbnQ6IGJhZGdlRXZlbnQyLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCB0YXNrczogVGFza1tdID0gW2JhZGdlVGFzaywgYmFkZ2VUYXNrMl07XHJcblx0XHRjb25zdCB0YXJnZXREYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpO1xyXG5cclxuXHRcdC8vIFNpbXVsYXRlIGdldEJhZGdlRXZlbnRzRm9yRGF0ZSBsb2dpY1xyXG5cdFx0Y29uc3QgYmFkZ2VFdmVudHM6IE1hcDxcclxuXHRcdFx0c3RyaW5nLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0c291cmNlSWQ6IHN0cmluZztcclxuXHRcdFx0XHRzb3VyY2VOYW1lOiBzdHJpbmc7XHJcblx0XHRcdFx0Y291bnQ6IG51bWJlcjtcclxuXHRcdFx0XHRjb2xvcj86IHN0cmluZztcclxuXHRcdFx0fVxyXG5cdFx0PiA9IG5ldyBNYXAoKTtcclxuXHJcblx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlzSWNzVGFzayA9ICh0YXNrIGFzIGFueSkuc291cmNlPy50eXBlID09PSBcImljc1wiO1xyXG5cdFx0XHRjb25zdCBpY3NUYXNrID0gaXNJY3NUYXNrID8gKHRhc2sgYXMgSWNzVGFzaykgOiBudWxsO1xyXG5cdFx0XHRjb25zdCBzaG93QXNCYWRnZSA9IGljc1Rhc2s/Lmljc0V2ZW50Py5zb3VyY2U/LnNob3dUeXBlID09PSBcImJhZGdlXCI7XHJcblxyXG5cdFx0XHRpZiAoaXNJY3NUYXNrICYmIHNob3dBc0JhZGdlICYmIGljc1Rhc2s/Lmljc0V2ZW50KSB7XHJcblx0XHRcdFx0Y29uc3QgZXZlbnREYXRlID0gbmV3IERhdGUoaWNzVGFzay5pY3NFdmVudC5kdHN0YXJ0KTtcclxuXHRcdFx0XHRldmVudERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZU5vcm1hbGl6ZWQgPSBuZXcgRGF0ZSh0YXJnZXREYXRlKTtcclxuXHRcdFx0XHR0YXJnZXREYXRlTm9ybWFsaXplZC5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50RGF0ZS5nZXRUaW1lKCkgPT09IHRhcmdldERhdGVOb3JtYWxpemVkLmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0Y29uc3Qgc291cmNlSWQgPSBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5pZDtcclxuXHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nID0gYmFkZ2VFdmVudHMuZ2V0KHNvdXJjZUlkKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmcpIHtcclxuXHRcdFx0XHRcdFx0ZXhpc3RpbmcuY291bnQrKztcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGJhZGdlRXZlbnRzLnNldChzb3VyY2VJZCwge1xyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZUlkOiBzb3VyY2VJZCxcclxuXHRcdFx0XHRcdFx0XHRzb3VyY2VOYW1lOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRcdGNvdW50OiAxLFxyXG5cdFx0XHRcdFx0XHRcdGNvbG9yOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5jb2xvcixcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZXN1bHQgPSBBcnJheS5mcm9tKGJhZGdlRXZlbnRzLnZhbHVlcygpKTtcclxuXHJcblx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRleHBlY3QocmVzdWx0WzBdLmNvdW50KS50b0JlKDIpOyAvLyBTaG91bGQgYWdncmVnYXRlIGNvdW50IGZyb20gc2FtZSBzb3VyY2VcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==