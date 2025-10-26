/**
 * Calendar Performance Tests
 * Tests to verify performance optimizations work correctly
 */
describe("Calendar Performance Optimizations", () => {
    // Helper function to create badge tasks
    function createBadgeTasks(count, baseDate) {
        var _a;
        const tasks = [];
        for (let i = 0; i < count; i++) {
            const eventDate = new Date(baseDate);
            eventDate.setDate(baseDate.getDate() + (i % 7)); // Spread across a week
            const badgeSource = {
                id: `badge-source-${i}`,
                name: `Badge Calendar ${i}`,
                url: `https://example.com/cal${i}.ics`,
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "badge",
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            };
            const badgeEvent = {
                uid: `badge-event-${i}`,
                summary: `Badge Event ${i}`,
                description: "Test badge event",
                dtstart: eventDate,
                dtend: new Date(eventDate.getTime() + 60 * 60 * 1000),
                allDay: false,
                source: badgeSource,
            };
            const badgeTask = {
                id: `ics-badge-${i}`,
                content: `Badge Event ${i}`,
                filePath: `ics://${badgeSource.name}`,
                line: 0,
                completed: false,
                status: " ",
                originalMarkdown: `- [ ] Badge Event ${i}`,
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
            tasks.push(badgeTask);
        }
        return tasks;
    }
    // Optimized getBadgeEventsForDate function (extracted from CalendarComponent)
    function optimizedGetBadgeEventsForDate(tasks, date) {
        // Use native Date operations for better performance
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const badgeEventsForDate = [];
        tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                // Use native Date operations instead of moment for better performance
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                const eventYear = eventDate.getFullYear();
                const eventMonth = eventDate.getMonth();
                const eventDay = eventDate.getDate();
                // Check if the event is on the target date using native comparison
                if (eventYear === year &&
                    eventMonth === month &&
                    eventDay === day) {
                    // Convert the task to a CalendarEvent format for consistency
                    const calendarEvent = Object.assign(Object.assign({}, task), { title: task.content, start: icsTask.icsEvent.dtstart, end: icsTask.icsEvent.dtend, allDay: icsTask.icsEvent.allDay, color: icsTask.icsEvent.source.color });
                    badgeEventsForDate.push(calendarEvent);
                }
            }
        });
        return badgeEventsForDate;
    }
    // Legacy getBadgeEventsForDate function (using moment.js)
    function legacyGetBadgeEventsForDate(tasks, date) {
        // Simulate moment.js usage (without actually importing it to avoid test issues)
        const targetDateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format
        const badgeEventsForDate = [];
        tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                // Simulate moment.js operations with more expensive date parsing
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                const eventDateStr = eventDate.toISOString().split("T")[0];
                // Simulate moment.js comparison (more expensive)
                if (eventDateStr === targetDateStr) {
                    const calendarEvent = Object.assign(Object.assign({}, task), { title: task.content, start: icsTask.icsEvent.dtstart, end: icsTask.icsEvent.dtend, allDay: icsTask.icsEvent.allDay, color: icsTask.icsEvent.source.color });
                    badgeEventsForDate.push(calendarEvent);
                }
            }
        });
        return badgeEventsForDate;
    }
    // Utility function to parse date string (YYYY-MM-DD) to Date object
    function parseDateString(dateStr) {
        const dateParts = dateStr.split("-");
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in Date
        const day = parseInt(dateParts[2], 10);
        return new Date(year, month, day);
    }
    describe("Date Parsing Optimization", () => {
        test("should parse date strings efficiently", () => {
            const dateStr = "2024-01-15";
            // Test our optimized date parsing
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                parseDateString(dateStr);
            }
            const endTime = performance.now();
            const optimizedTime = endTime - startTime;
            // Test native Date parsing
            const startTime2 = performance.now();
            for (let i = 0; i < 1000; i++) {
                new Date(dateStr);
            }
            const endTime2 = performance.now();
            const nativeTime = endTime2 - startTime2;
            console.log(`Optimized parsing: ${optimizedTime.toFixed(2)}ms`);
            console.log(`Native parsing: ${nativeTime.toFixed(2)}ms`);
            // Both should produce the same result
            const optimizedResult = parseDateString(dateStr);
            const nativeResult = new Date(dateStr);
            expect(optimizedResult.getFullYear()).toBe(nativeResult.getFullYear());
            expect(optimizedResult.getMonth()).toBe(nativeResult.getMonth());
            expect(optimizedResult.getDate()).toBe(nativeResult.getDate());
        });
        test("should handle various date string formats", () => {
            const testCases = [
                "2024-01-15",
                "2024-12-31",
                "2023-02-28",
                "2024-02-29", // Leap year
            ];
            testCases.forEach((dateStr) => {
                const optimizedResult = parseDateString(dateStr);
                const nativeResult = new Date(dateStr);
                expect(optimizedResult.getFullYear()).toBe(nativeResult.getFullYear());
                expect(optimizedResult.getMonth()).toBe(nativeResult.getMonth());
                expect(optimizedResult.getDate()).toBe(nativeResult.getDate());
            });
        });
    });
    describe("Badge Events Performance", () => {
        test("should handle large number of tasks efficiently", () => {
            const baseDate = new Date("2024-01-15");
            const largeBadgeTaskSet = createBadgeTasks(1000, baseDate);
            // Test optimized version
            const startTime = performance.now();
            const testDates = [
                new Date("2024-01-15"),
                new Date("2024-01-16"),
                new Date("2024-01-17"),
                new Date("2024-01-18"),
                new Date("2024-01-19"),
            ];
            testDates.forEach((date) => {
                optimizedGetBadgeEventsForDate(largeBadgeTaskSet, date);
            });
            const endTime = performance.now();
            const optimizedTime = endTime - startTime;
            // Test legacy version
            const startTime2 = performance.now();
            testDates.forEach((date) => {
                legacyGetBadgeEventsForDate(largeBadgeTaskSet, date);
            });
            const endTime2 = performance.now();
            const legacyTime = endTime2 - startTime2;
            console.log(`Optimized version: ${optimizedTime.toFixed(2)}ms for 1000 tasks`);
            console.log(`Legacy version: ${legacyTime.toFixed(2)}ms for 1000 tasks`);
            // Optimized version should be faster or at least not significantly slower
            expect(optimizedTime).toBeLessThan(legacyTime * 1.5); // Allow 50% tolerance
            // Both should produce the same results
            const optimizedResult = optimizedGetBadgeEventsForDate(largeBadgeTaskSet, testDates[0]);
            const legacyResult = legacyGetBadgeEventsForDate(largeBadgeTaskSet, testDates[0]);
            expect(optimizedResult.length).toBe(legacyResult.length);
        });
        test("should correctly identify badge events", () => {
            const baseDate = new Date("2024-01-15");
            const badgeTasks = createBadgeTasks(5, baseDate);
            const result = optimizedGetBadgeEventsForDate(badgeTasks, baseDate);
            // Should return badge events for the specified date
            expect(result.length).toBeGreaterThan(0);
            // Verify the events are for the correct date
            result.forEach((event) => {
                const eventDate = new Date(event.start);
                expect(eventDate.getFullYear()).toBe(2024);
                expect(eventDate.getMonth()).toBe(0); // January (0-indexed)
                expect(eventDate.getDate()).toBe(15);
            });
        });
        test("should handle edge cases correctly", () => {
            // Test with empty task list
            const emptyResult = optimizedGetBadgeEventsForDate([], new Date("2024-01-15"));
            expect(emptyResult).toHaveLength(0);
            // Test with non-badge tasks
            const regularTask = {
                id: "regular-task",
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
            const regularResult = optimizedGetBadgeEventsForDate([regularTask], new Date("2024-01-15"));
            expect(regularResult).toHaveLength(0);
        });
    });
    describe("Caching Simulation", () => {
        test("should demonstrate cache benefits", () => {
            const baseDate = new Date("2024-01-15");
            const badgeTasks = createBadgeTasks(100, baseDate);
            // Simulate cache implementation
            const cache = new Map();
            function getCachedBadgeEvents(tasks, date) {
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                if (cache.has(dateKey)) {
                    return cache.get(dateKey) || [];
                }
                const result = optimizedGetBadgeEventsForDate(tasks, date);
                cache.set(dateKey, result);
                return result;
            }
            // First call - should compute and cache
            const startTime1 = performance.now();
            const result1 = getCachedBadgeEvents(badgeTasks, baseDate);
            const endTime1 = performance.now();
            const firstCallTime = endTime1 - startTime1;
            // Second call - should use cache
            const startTime2 = performance.now();
            const result2 = getCachedBadgeEvents(badgeTasks, baseDate);
            const endTime2 = performance.now();
            const secondCallTime = endTime2 - startTime2;
            console.log(`First call (compute): ${firstCallTime.toFixed(2)}ms`);
            console.log(`Second call (cached): ${secondCallTime.toFixed(2)}ms`);
            // Results should be identical
            expect(result1).toEqual(result2);
            // Second call should be faster (cached)
            expect(secondCallTime).toBeLessThan(firstCallTime);
        });
    });
});
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXItcGVyZm9ybWFuY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhbGVuZGFyLXBlcmZvcm1hbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBS0gsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNuRCx3Q0FBd0M7SUFDeEMsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFhLEVBQUUsUUFBYzs7UUFDdEQsTUFBTSxLQUFLLEdBQWMsRUFBRSxDQUFDO1FBRTVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtZQUV4RSxNQUFNLFdBQVcsR0FBYztnQkFDOUIsRUFBRSxFQUFFLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3ZCLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO2dCQUMzQixHQUFHLEVBQUUsMEJBQTBCLENBQUMsTUFBTTtnQkFDdEMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsZUFBZSxFQUFFLEVBQUU7Z0JBQ25CLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixRQUFRLEVBQUUsT0FBTztnQkFDakIsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2FBQzlELENBQUM7WUFFRixNQUFNLFVBQVUsR0FBYTtnQkFDNUIsR0FBRyxFQUFFLGVBQWUsQ0FBQyxFQUFFO2dCQUN2QixPQUFP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ZSBUZXN0c1xyXG4gKiBUZXN0cyB0byB2ZXJpZnkgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucyB3b3JrIGNvcnJlY3RseVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEljc1Rhc2ssIEljc0V2ZW50LCBJY3NTb3VyY2UgfSBmcm9tIFwiLi4vdHlwZXMvaWNzXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuZGVzY3JpYmUoXCJDYWxlbmRhciBQZXJmb3JtYW5jZSBPcHRpbWl6YXRpb25zXCIsICgpID0+IHtcclxuXHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIGJhZGdlIHRhc2tzXHJcblx0ZnVuY3Rpb24gY3JlYXRlQmFkZ2VUYXNrcyhjb3VudDogbnVtYmVyLCBiYXNlRGF0ZTogRGF0ZSk6IEljc1Rhc2tbXSB7XHJcblx0XHRjb25zdCB0YXNrczogSWNzVGFza1tdID0gW107XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG5ldyBEYXRlKGJhc2VEYXRlKTtcclxuXHRcdFx0ZXZlbnREYXRlLnNldERhdGUoYmFzZURhdGUuZ2V0RGF0ZSgpICsgKGkgJSA3KSk7IC8vIFNwcmVhZCBhY3Jvc3MgYSB3ZWVrXHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZVNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0XHRcdGlkOiBgYmFkZ2Utc291cmNlLSR7aX1gLFxyXG5cdFx0XHRcdG5hbWU6IGBCYWRnZSBDYWxlbmRhciAke2l9YCxcclxuXHRcdFx0XHR1cmw6IGBodHRwczovL2V4YW1wbGUuY29tL2NhbCR7aX0uaWNzYCxcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdHJlZnJlc2hJbnRlcnZhbDogNjAsXHJcblx0XHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1R5cGU6IFwiYmFkZ2VcIixcclxuXHRcdFx0XHRjb2xvcjogYCMke01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE2Nzc3MjE1KS50b1N0cmluZygxNil9YCxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlRXZlbnQ6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogYGJhZGdlLWV2ZW50LSR7aX1gLFxyXG5cdFx0XHRcdHN1bW1hcnk6IGBCYWRnZSBFdmVudCAke2l9YCxcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUZXN0IGJhZGdlIGV2ZW50XCIsXHJcblx0XHRcdFx0ZHRzdGFydDogZXZlbnREYXRlLFxyXG5cdFx0XHRcdGR0ZW5kOiBuZXcgRGF0ZShldmVudERhdGUuZ2V0VGltZSgpICsgNjAgKiA2MCAqIDEwMDApLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBiYWRnZVNvdXJjZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzazogSWNzVGFzayA9IHtcclxuXHRcdFx0XHRpZDogYGljcy1iYWRnZS0ke2l9YCxcclxuXHRcdFx0XHRjb250ZW50OiBgQmFkZ2UgRXZlbnQgJHtpfWAsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IGBpY3M6Ly8ke2JhZGdlU291cmNlLm5hbWV9YCxcclxuXHRcdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBgLSBbIF0gQmFkZ2UgRXZlbnQgJHtpfWAsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBiYWRnZUV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogYmFkZ2VFdmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHByb2plY3Q6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGljc0V2ZW50OiBiYWRnZUV2ZW50LFxyXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdGJhZGdlOiB0cnVlLFxyXG5cdFx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IGJhZGdlU291cmNlLm5hbWUsXHJcblx0XHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRhc2tzLnB1c2goYmFkZ2VUYXNrKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGFza3M7XHJcblx0fVxyXG5cclxuXHQvLyBPcHRpbWl6ZWQgZ2V0QmFkZ2VFdmVudHNGb3JEYXRlIGZ1bmN0aW9uIChleHRyYWN0ZWQgZnJvbSBDYWxlbmRhckNvbXBvbmVudClcclxuXHRmdW5jdGlvbiBvcHRpbWl6ZWRHZXRCYWRnZUV2ZW50c0ZvckRhdGUodGFza3M6IFRhc2tbXSwgZGF0ZTogRGF0ZSk6IGFueVtdIHtcclxuXHRcdC8vIFVzZSBuYXRpdmUgRGF0ZSBvcGVyYXRpb25zIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRcdGNvbnN0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcblx0XHRjb25zdCBtb250aCA9IGRhdGUuZ2V0TW9udGgoKTtcclxuXHRcdGNvbnN0IGRheSA9IGRhdGUuZ2V0RGF0ZSgpO1xyXG5cclxuXHRcdGNvbnN0IGJhZGdlRXZlbnRzRm9yRGF0ZTogYW55W10gPSBbXTtcclxuXHJcblx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlzSWNzVGFzayA9ICh0YXNrIGFzIGFueSkuc291cmNlPy50eXBlID09PSBcImljc1wiO1xyXG5cdFx0XHRjb25zdCBpY3NUYXNrID0gaXNJY3NUYXNrID8gKHRhc2sgYXMgSWNzVGFzaykgOiBudWxsO1xyXG5cdFx0XHRjb25zdCBzaG93QXNCYWRnZSA9IGljc1Rhc2s/Lmljc0V2ZW50Py5zb3VyY2U/LnNob3dUeXBlID09PSBcImJhZGdlXCI7XHJcblxyXG5cdFx0XHRpZiAoaXNJY3NUYXNrICYmIHNob3dBc0JhZGdlICYmIGljc1Rhc2s/Lmljc0V2ZW50KSB7XHJcblx0XHRcdFx0Ly8gVXNlIG5hdGl2ZSBEYXRlIG9wZXJhdGlvbnMgaW5zdGVhZCBvZiBtb21lbnQgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG5ldyBEYXRlKGljc1Rhc2suaWNzRXZlbnQuZHRzdGFydCk7XHJcblx0XHRcdFx0Y29uc3QgZXZlbnRZZWFyID0gZXZlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcblx0XHRcdFx0Y29uc3QgZXZlbnRNb250aCA9IGV2ZW50RGF0ZS5nZXRNb250aCgpO1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF5ID0gZXZlbnREYXRlLmdldERhdGUoKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50IGlzIG9uIHRoZSB0YXJnZXQgZGF0ZSB1c2luZyBuYXRpdmUgY29tcGFyaXNvblxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGV2ZW50WWVhciA9PT0geWVhciAmJlxyXG5cdFx0XHRcdFx0ZXZlbnRNb250aCA9PT0gbW9udGggJiZcclxuXHRcdFx0XHRcdGV2ZW50RGF5ID09PSBkYXlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIENvbnZlcnQgdGhlIHRhc2sgdG8gYSBDYWxlbmRhckV2ZW50IGZvcm1hdCBmb3IgY29uc2lzdGVuY3lcclxuXHRcdFx0XHRcdGNvbnN0IGNhbGVuZGFyRXZlbnQgPSB7XHJcblx0XHRcdFx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdFx0XHRcdHRpdGxlOiB0YXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdHN0YXJ0OiBpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQsXHJcblx0XHRcdFx0XHRcdGVuZDogaWNzVGFzay5pY3NFdmVudC5kdGVuZCxcclxuXHRcdFx0XHRcdFx0YWxsRGF5OiBpY3NUYXNrLmljc0V2ZW50LmFsbERheSxcclxuXHRcdFx0XHRcdFx0Y29sb3I6IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmNvbG9yLFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdGJhZGdlRXZlbnRzRm9yRGF0ZS5wdXNoKGNhbGVuZGFyRXZlbnQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGJhZGdlRXZlbnRzRm9yRGF0ZTtcclxuXHR9XHJcblxyXG5cdC8vIExlZ2FjeSBnZXRCYWRnZUV2ZW50c0ZvckRhdGUgZnVuY3Rpb24gKHVzaW5nIG1vbWVudC5qcylcclxuXHRmdW5jdGlvbiBsZWdhY3lHZXRCYWRnZUV2ZW50c0ZvckRhdGUodGFza3M6IFRhc2tbXSwgZGF0ZTogRGF0ZSk6IGFueVtdIHtcclxuXHRcdC8vIFNpbXVsYXRlIG1vbWVudC5qcyB1c2FnZSAod2l0aG91dCBhY3R1YWxseSBpbXBvcnRpbmcgaXQgdG8gYXZvaWQgdGVzdCBpc3N1ZXMpXHJcblx0XHRjb25zdCB0YXJnZXREYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTsgLy8gWVlZWS1NTS1ERCBmb3JtYXRcclxuXHJcblx0XHRjb25zdCBiYWRnZUV2ZW50c0ZvckRhdGU6IGFueVtdID0gW107XHJcblxyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdC8vIFNpbXVsYXRlIG1vbWVudC5qcyBvcGVyYXRpb25zIHdpdGggbW9yZSBleHBlbnNpdmUgZGF0ZSBwYXJzaW5nXHJcblx0XHRcdFx0Y29uc3QgZXZlbnREYXRlID0gbmV3IERhdGUoaWNzVGFzay5pY3NFdmVudC5kdHN0YXJ0KTtcclxuXHRcdFx0XHRjb25zdCBldmVudERhdGVTdHIgPSBldmVudERhdGUudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblxyXG5cdFx0XHRcdC8vIFNpbXVsYXRlIG1vbWVudC5qcyBjb21wYXJpc29uIChtb3JlIGV4cGVuc2l2ZSlcclxuXHRcdFx0XHRpZiAoZXZlbnREYXRlU3RyID09PSB0YXJnZXREYXRlU3RyKSB7XHJcblx0XHRcdFx0XHRjb25zdCBjYWxlbmRhckV2ZW50ID0ge1xyXG5cdFx0XHRcdFx0XHQuLi50YXNrLFxyXG5cdFx0XHRcdFx0XHR0aXRsZTogdGFzay5jb250ZW50LFxyXG5cdFx0XHRcdFx0XHRzdGFydDogaWNzVGFzay5pY3NFdmVudC5kdHN0YXJ0LFxyXG5cdFx0XHRcdFx0XHRlbmQ6IGljc1Rhc2suaWNzRXZlbnQuZHRlbmQsXHJcblx0XHRcdFx0XHRcdGFsbERheTogaWNzVGFzay5pY3NFdmVudC5hbGxEYXksXHJcblx0XHRcdFx0XHRcdGNvbG9yOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5jb2xvcixcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRiYWRnZUV2ZW50c0ZvckRhdGUucHVzaChjYWxlbmRhckV2ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBiYWRnZUV2ZW50c0ZvckRhdGU7XHJcblx0fVxyXG5cclxuXHQvLyBVdGlsaXR5IGZ1bmN0aW9uIHRvIHBhcnNlIGRhdGUgc3RyaW5nIChZWVlZLU1NLUREKSB0byBEYXRlIG9iamVjdFxyXG5cdGZ1bmN0aW9uIHBhcnNlRGF0ZVN0cmluZyhkYXRlU3RyOiBzdHJpbmcpOiBEYXRlIHtcclxuXHRcdGNvbnN0IGRhdGVQYXJ0cyA9IGRhdGVTdHIuc3BsaXQoXCItXCIpO1xyXG5cdFx0Y29uc3QgeWVhciA9IHBhcnNlSW50KGRhdGVQYXJ0c1swXSwgMTApO1xyXG5cdFx0Y29uc3QgbW9udGggPSBwYXJzZUludChkYXRlUGFydHNbMV0sIDEwKSAtIDE7IC8vIE1vbnRoIGlzIDAtaW5kZXhlZCBpbiBEYXRlXHJcblx0XHRjb25zdCBkYXkgPSBwYXJzZUludChkYXRlUGFydHNbMl0sIDEwKTtcclxuXHRcdHJldHVybiBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF5KTtcclxuXHR9XHJcblxyXG5cdGRlc2NyaWJlKFwiRGF0ZSBQYXJzaW5nIE9wdGltaXphdGlvblwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHBhcnNlIGRhdGUgc3RyaW5ncyBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBcIjIwMjQtMDEtMTVcIjtcclxuXHJcblx0XHRcdC8vIFRlc3Qgb3VyIG9wdGltaXplZCBkYXRlIHBhcnNpbmdcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDsgaSsrKSB7XHJcblx0XHRcdFx0cGFyc2VEYXRlU3RyaW5nKGRhdGVTdHIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3Qgb3B0aW1pemVkVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHQvLyBUZXN0IG5hdGl2ZSBEYXRlIHBhcnNpbmdcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lMiA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDEwMDA7IGkrKykge1xyXG5cdFx0XHRcdG5ldyBEYXRlKGRhdGVTdHIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IG5hdGl2ZVRpbWUgPSBlbmRUaW1lMiAtIHN0YXJ0VGltZTI7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgT3B0aW1pemVkIHBhcnNpbmc6ICR7b3B0aW1pemVkVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBOYXRpdmUgcGFyc2luZzogJHtuYXRpdmVUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHJcblx0XHRcdC8vIEJvdGggc2hvdWxkIHByb2R1Y2UgdGhlIHNhbWUgcmVzdWx0XHJcblx0XHRcdGNvbnN0IG9wdGltaXplZFJlc3VsdCA9IHBhcnNlRGF0ZVN0cmluZyhkYXRlU3RyKTtcclxuXHRcdFx0Y29uc3QgbmF0aXZlUmVzdWx0ID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcblxyXG5cdFx0XHRleHBlY3Qob3B0aW1pemVkUmVzdWx0LmdldEZ1bGxZZWFyKCkpLnRvQmUoXHJcblx0XHRcdFx0bmF0aXZlUmVzdWx0LmdldEZ1bGxZZWFyKClcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KG9wdGltaXplZFJlc3VsdC5nZXRNb250aCgpKS50b0JlKG5hdGl2ZVJlc3VsdC5nZXRNb250aCgpKTtcclxuXHRcdFx0ZXhwZWN0KG9wdGltaXplZFJlc3VsdC5nZXREYXRlKCkpLnRvQmUobmF0aXZlUmVzdWx0LmdldERhdGUoKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB2YXJpb3VzIGRhdGUgc3RyaW5nIGZvcm1hdHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0XCIyMDI0LTAxLTE1XCIsXHJcblx0XHRcdFx0XCIyMDI0LTEyLTMxXCIsXHJcblx0XHRcdFx0XCIyMDIzLTAyLTI4XCIsXHJcblx0XHRcdFx0XCIyMDI0LTAyLTI5XCIsIC8vIExlYXAgeWVhclxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdENhc2VzLmZvckVhY2goKGRhdGVTdHIpID0+IHtcclxuXHRcdFx0XHRjb25zdCBvcHRpbWl6ZWRSZXN1bHQgPSBwYXJzZURhdGVTdHJpbmcoZGF0ZVN0cik7XHJcblx0XHRcdFx0Y29uc3QgbmF0aXZlUmVzdWx0ID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChvcHRpbWl6ZWRSZXN1bHQuZ2V0RnVsbFllYXIoKSkudG9CZShcclxuXHRcdFx0XHRcdG5hdGl2ZVJlc3VsdC5nZXRGdWxsWWVhcigpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRleHBlY3Qob3B0aW1pemVkUmVzdWx0LmdldE1vbnRoKCkpLnRvQmUoXHJcblx0XHRcdFx0XHRuYXRpdmVSZXN1bHQuZ2V0TW9udGgoKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0ZXhwZWN0KG9wdGltaXplZFJlc3VsdC5nZXREYXRlKCkpLnRvQmUobmF0aXZlUmVzdWx0LmdldERhdGUoKSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQmFkZ2UgRXZlbnRzIFBlcmZvcm1hbmNlXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGxhcmdlIG51bWJlciBvZiB0YXNrcyBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGJhc2VEYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpO1xyXG5cdFx0XHRjb25zdCBsYXJnZUJhZGdlVGFza1NldCA9IGNyZWF0ZUJhZGdlVGFza3MoMTAwMCwgYmFzZURhdGUpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBvcHRpbWl6ZWQgdmVyc2lvblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcblx0XHRcdGNvbnN0IHRlc3REYXRlcyA9IFtcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIiksXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE2XCIpLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xN1wiKSxcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMThcIiksXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE5XCIpLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdERhdGVzLmZvckVhY2goKGRhdGUpID0+IHtcclxuXHRcdFx0XHRvcHRpbWl6ZWRHZXRCYWRnZUV2ZW50c0ZvckRhdGUobGFyZ2VCYWRnZVRhc2tTZXQsIGRhdGUpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3Qgb3B0aW1pemVkVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGxlZ2FjeSB2ZXJzaW9uXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZTIgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcblx0XHRcdHRlc3REYXRlcy5mb3JFYWNoKChkYXRlKSA9PiB7XHJcblx0XHRcdFx0bGVnYWN5R2V0QmFkZ2VFdmVudHNGb3JEYXRlKGxhcmdlQmFkZ2VUYXNrU2V0LCBkYXRlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmRUaW1lMiA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBsZWdhY3lUaW1lID0gZW5kVGltZTIgLSBzdGFydFRpbWUyO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YE9wdGltaXplZCB2ZXJzaW9uOiAke29wdGltaXplZFRpbWUudG9GaXhlZChcclxuXHRcdFx0XHRcdDJcclxuXHRcdFx0XHQpfW1zIGZvciAxMDAwIHRhc2tzYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgTGVnYWN5IHZlcnNpb246ICR7bGVnYWN5VGltZS50b0ZpeGVkKDIpfW1zIGZvciAxMDAwIHRhc2tzYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gT3B0aW1pemVkIHZlcnNpb24gc2hvdWxkIGJlIGZhc3RlciBvciBhdCBsZWFzdCBub3Qgc2lnbmlmaWNhbnRseSBzbG93ZXJcclxuXHRcdFx0ZXhwZWN0KG9wdGltaXplZFRpbWUpLnRvQmVMZXNzVGhhbihsZWdhY3lUaW1lICogMS41KTsgLy8gQWxsb3cgNTAlIHRvbGVyYW5jZVxyXG5cclxuXHRcdFx0Ly8gQm90aCBzaG91bGQgcHJvZHVjZSB0aGUgc2FtZSByZXN1bHRzXHJcblx0XHRcdGNvbnN0IG9wdGltaXplZFJlc3VsdCA9IG9wdGltaXplZEdldEJhZGdlRXZlbnRzRm9yRGF0ZShcclxuXHRcdFx0XHRsYXJnZUJhZGdlVGFza1NldCxcclxuXHRcdFx0XHR0ZXN0RGF0ZXNbMF1cclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgbGVnYWN5UmVzdWx0ID0gbGVnYWN5R2V0QmFkZ2VFdmVudHNGb3JEYXRlKFxyXG5cdFx0XHRcdGxhcmdlQmFkZ2VUYXNrU2V0LFxyXG5cdFx0XHRcdHRlc3REYXRlc1swXVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KG9wdGltaXplZFJlc3VsdC5sZW5ndGgpLnRvQmUobGVnYWN5UmVzdWx0Lmxlbmd0aCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGNvcnJlY3RseSBpZGVudGlmeSBiYWRnZSBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYXNlRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHRcdFx0Y29uc3QgYmFkZ2VUYXNrcyA9IGNyZWF0ZUJhZGdlVGFza3MoNSwgYmFzZURhdGUpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gb3B0aW1pemVkR2V0QmFkZ2VFdmVudHNGb3JEYXRlKGJhZGdlVGFza3MsIGJhc2VEYXRlKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCByZXR1cm4gYmFkZ2UgZXZlbnRzIGZvciB0aGUgc3BlY2lmaWVkIGRhdGVcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgZXZlbnRzIGFyZSBmb3IgdGhlIGNvcnJlY3QgZGF0ZVxyXG5cdFx0XHRyZXN1bHQuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0XHRjb25zdCBldmVudERhdGUgPSBuZXcgRGF0ZShldmVudC5zdGFydCk7XHJcblx0XHRcdFx0ZXhwZWN0KGV2ZW50RGF0ZS5nZXRGdWxsWWVhcigpKS50b0JlKDIwMjQpO1xyXG5cdFx0XHRcdGV4cGVjdChldmVudERhdGUuZ2V0TW9udGgoKSkudG9CZSgwKTsgLy8gSmFudWFyeSAoMC1pbmRleGVkKVxyXG5cdFx0XHRcdGV4cGVjdChldmVudERhdGUuZ2V0RGF0ZSgpKS50b0JlKDE1KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBlZGdlIGNhc2VzIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3Qgd2l0aCBlbXB0eSB0YXNrIGxpc3RcclxuXHRcdFx0Y29uc3QgZW1wdHlSZXN1bHQgPSBvcHRpbWl6ZWRHZXRCYWRnZUV2ZW50c0ZvckRhdGUoXHJcblx0XHRcdFx0W10sXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChlbXB0eVJlc3VsdCkudG9IYXZlTGVuZ3RoKDApO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB3aXRoIG5vbi1iYWRnZSB0YXNrc1xyXG5cdFx0XHRjb25zdCByZWd1bGFyVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJyZWd1bGFyLXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFJlZ3VsYXIgVGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVndWxhclJlc3VsdCA9IG9wdGltaXplZEdldEJhZGdlRXZlbnRzRm9yRGF0ZShcclxuXHRcdFx0XHRbcmVndWxhclRhc2tdLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocmVndWxhclJlc3VsdCkudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FjaGluZyBTaW11bGF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgZGVtb25zdHJhdGUgY2FjaGUgYmVuZWZpdHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBiYXNlRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHRcdFx0Y29uc3QgYmFkZ2VUYXNrcyA9IGNyZWF0ZUJhZGdlVGFza3MoMTAwLCBiYXNlRGF0ZSk7XHJcblxyXG5cdFx0XHQvLyBTaW11bGF0ZSBjYWNoZSBpbXBsZW1lbnRhdGlvblxyXG5cdFx0XHRjb25zdCBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBhbnlbXT4oKTtcclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdldENhY2hlZEJhZGdlRXZlbnRzKHRhc2tzOiBUYXNrW10sIGRhdGU6IERhdGUpOiBhbnlbXSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZUtleSA9IGAke2RhdGUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcoXHJcblx0XHRcdFx0XHRkYXRlLmdldE1vbnRoKCkgKyAxXHJcblx0XHRcdFx0KS5wYWRTdGFydCgyLCBcIjBcIil9LSR7U3RyaW5nKGRhdGUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcclxuXHJcblx0XHRcdFx0aWYgKGNhY2hlLmhhcyhkYXRlS2V5KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNhY2hlLmdldChkYXRlS2V5KSB8fCBbXTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IG9wdGltaXplZEdldEJhZGdlRXZlbnRzRm9yRGF0ZSh0YXNrcywgZGF0ZSk7XHJcblx0XHRcdFx0Y2FjaGUuc2V0KGRhdGVLZXksIHJlc3VsdCk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2FsbCAtIHNob3VsZCBjb21wdXRlIGFuZCBjYWNoZVxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUxID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBnZXRDYWNoZWRCYWRnZUV2ZW50cyhiYWRnZVRhc2tzLCBiYXNlRGF0ZSk7XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUxID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IGZpcnN0Q2FsbFRpbWUgPSBlbmRUaW1lMSAtIHN0YXJ0VGltZTE7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgY2FsbCAtIHNob3VsZCB1c2UgY2FjaGVcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lMiA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQyID0gZ2V0Q2FjaGVkQmFkZ2VFdmVudHMoYmFkZ2VUYXNrcywgYmFzZURhdGUpO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lMiA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBzZWNvbmRDYWxsVGltZSA9IGVuZFRpbWUyIC0gc3RhcnRUaW1lMjtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBGaXJzdCBjYWxsIChjb21wdXRlKTogJHtmaXJzdENhbGxUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFNlY29uZCBjYWxsIChjYWNoZWQpOiAke3NlY29uZENhbGxUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHJcblx0XHRcdC8vIFJlc3VsdHMgc2hvdWxkIGJlIGlkZW50aWNhbFxyXG5cdFx0XHRleHBlY3QocmVzdWx0MSkudG9FcXVhbChyZXN1bHQyKTtcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjYWxsIHNob3VsZCBiZSBmYXN0ZXIgKGNhY2hlZClcclxuXHRcdFx0ZXhwZWN0KHNlY29uZENhbGxUaW1lKS50b0JlTGVzc1RoYW4oZmlyc3RDYWxsVGltZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==