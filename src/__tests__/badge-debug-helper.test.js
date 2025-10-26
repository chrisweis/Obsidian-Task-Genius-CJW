/**
 * Badge Debug Helper
 * This test helps debug why badges might not be showing in the calendar view
 */
import { moment } from "obsidian";
describe("Badge Debug Helper", () => {
    // Helper function to create a realistic badge task
    function createBadgeTask(sourceId, sourceName, eventDate, color = "#ff6b6b") {
        var _a;
        const badgeSource = {
            id: sourceId,
            name: sourceName,
            url: `https://example.com/${sourceId}.ics`,
            enabled: true,
            refreshInterval: 60,
            showAllDayEvents: true,
            showTimedEvents: true,
            showType: "badge",
            color: color,
        };
        const badgeEvent = {
            uid: `${sourceId}-event-${eventDate.getTime()}`,
            summary: `Event from ${sourceName}`,
            description: "This should appear as a badge",
            dtstart: eventDate,
            dtend: new Date(eventDate.getTime() + 60 * 60 * 1000),
            allDay: false,
            source: badgeSource,
        };
        const badgeTask = {
            id: `ics-${sourceId}-${badgeEvent.uid}`,
            content: badgeEvent.summary,
            filePath: `ics://${sourceName}`,
            line: 0,
            completed: false,
            status: " ",
            badge: true,
            originalMarkdown: `- [ ] ${badgeEvent.summary}`,
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
        return badgeTask;
    }
    // Debug function to check if a task should show as badge
    function debugTaskBadgeStatus(task) {
        var _a;
        const debugInfo = [];
        const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
        debugInfo.push(`Is ICS task: ${isIcsTask}`);
        if (!isIcsTask) {
            debugInfo.push("❌ Not an ICS task - will not show as badge");
            return {
                isIcsTask,
                hasIcsEvent: false,
                hasSource: false,
                showType: undefined,
                shouldShowAsBadge: false,
                debugInfo,
            };
        }
        const icsTask = task;
        const hasIcsEvent = !!icsTask.icsEvent;
        debugInfo.push(`Has ICS event: ${hasIcsEvent}`);
        if (!hasIcsEvent) {
            debugInfo.push("❌ No ICS event - will not show as badge");
            return {
                isIcsTask,
                hasIcsEvent,
                hasSource: false,
                showType: undefined,
                shouldShowAsBadge: false,
                debugInfo,
            };
        }
        const hasSource = !!icsTask.icsEvent.source;
        debugInfo.push(`Has source: ${hasSource}`);
        if (!hasSource) {
            debugInfo.push("❌ No source - will not show as badge");
            return {
                isIcsTask,
                hasIcsEvent,
                hasSource,
                showType: undefined,
                shouldShowAsBadge: false,
                debugInfo,
            };
        }
        const showType = icsTask.icsEvent.source.showType;
        debugInfo.push(`Show type: ${showType}`);
        const shouldShowAsBadge = showType === "badge";
        if (shouldShowAsBadge) {
            debugInfo.push("✅ Should show as badge");
        }
        else {
            debugInfo.push(`❌ Show type is "${showType}", not "badge" - will not show as badge`);
        }
        return {
            isIcsTask,
            hasIcsEvent,
            hasSource,
            showType,
            shouldShowAsBadge,
            debugInfo,
        };
    }
    // Debug function to simulate getBadgeEventsForDate
    function debugGetBadgeEventsForDate(tasks, date) {
        const debugInfo = [];
        const taskAnalysis = [];
        const targetDate = moment(date).startOf("day");
        const targetDateStr = targetDate.format("YYYY-MM-DD");
        debugInfo.push(`Target date: ${targetDateStr}`);
        debugInfo.push(`Total tasks to check: ${tasks.length}`);
        const badgeEvents = new Map();
        tasks.forEach((task, index) => {
            const taskDebug = debugTaskBadgeStatus(task);
            taskAnalysis.push(Object.assign({ taskIndex: index, taskId: task.id }, taskDebug));
            if (taskDebug.shouldShowAsBadge) {
                const icsTask = task;
                const eventDate = moment(icsTask.icsEvent.dtstart).startOf("day");
                const eventDateStr = eventDate.format("YYYY-MM-DD");
                debugInfo.push(`Task ${index} (${task.id}): Event date ${eventDateStr}`);
                if (eventDate.isSame(targetDate)) {
                    debugInfo.push(`✅ Task ${index} matches target date`);
                    const sourceId = icsTask.icsEvent.source.id;
                    const existing = badgeEvents.get(sourceId);
                    if (existing) {
                        existing.count++;
                        debugInfo.push(`📈 Incremented count for source ${sourceId} to ${existing.count}`);
                    }
                    else {
                        badgeEvents.set(sourceId, {
                            sourceId: sourceId,
                            sourceName: icsTask.icsEvent.source.name,
                            count: 1,
                            color: icsTask.icsEvent.source.color,
                        });
                        debugInfo.push(`🆕 Added new badge for source ${sourceId}`);
                    }
                }
                else {
                    debugInfo.push(`❌ Task ${index} date ${eventDateStr} does not match target ${targetDateStr}`);
                }
            }
        });
        const result = Array.from(badgeEvents.values());
        debugInfo.push(`Final badge count: ${result.length}`);
        return {
            targetDate: targetDateStr,
            badgeEvents: result,
            debugInfo,
            taskAnalysis,
        };
    }
    describe("Badge Detection Debug", () => {
        test("should debug badge task creation and detection", () => {
            console.log("=== Badge Debug Test ===");
            // Create test tasks
            const badgeTask = createBadgeTask("test-calendar", "Test Calendar", new Date("2024-01-15T10:00:00Z"));
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
            const tasks = [badgeTask, regularTask];
            console.log("\n--- Task Analysis ---");
            tasks.forEach((task, index) => {
                console.log(`\nTask ${index} (${task.id}):`);
                const debug = debugTaskBadgeStatus(task);
                debug.debugInfo.forEach((info) => console.log(`  ${info}`));
            });
            console.log("\n--- Badge Events for 2024-01-15 ---");
            const targetDate = new Date("2024-01-15");
            const badgeDebug = debugGetBadgeEventsForDate(tasks, targetDate);
            console.log(`Target date: ${badgeDebug.targetDate}`);
            badgeDebug.debugInfo.forEach((info) => console.log(`  ${info}`));
            console.log("\nBadge events found:");
            badgeDebug.badgeEvents.forEach((badge, index) => {
                console.log(`  Badge ${index}: ${badge.sourceName} (${badge.count} events, color: ${badge.color})`);
            });
            // Assertions
            expect(badgeDebug.badgeEvents).toHaveLength(1);
            expect(badgeDebug.badgeEvents[0].sourceName).toBe("Test Calendar");
            expect(badgeDebug.badgeEvents[0].count).toBe(1);
        });
        test("should debug multiple badge sources", () => {
            console.log("\n=== Multiple Badge Sources Debug ===");
            const task1 = createBadgeTask("calendar-1", "Calendar 1", new Date("2024-01-15T10:00:00Z"), "#ff6b6b");
            const task2 = createBadgeTask("calendar-2", "Calendar 2", new Date("2024-01-15T14:00:00Z"), "#4ecdc4");
            const task3 = createBadgeTask("calendar-1", "Calendar 1", new Date("2024-01-15T16:00:00Z"), "#ff6b6b"); // Same source as task1
            const tasks = [task1, task2, task3];
            console.log("\n--- Badge Events for 2024-01-15 ---");
            const badgeDebug = debugGetBadgeEventsForDate(tasks, new Date("2024-01-15"));
            badgeDebug.debugInfo.forEach((info) => console.log(`  ${info}`));
            console.log("\nFinal badge events:");
            badgeDebug.badgeEvents.forEach((badge, index) => {
                console.log(`  Badge ${index}: ${badge.sourceName} (${badge.count} events, color: ${badge.color})`);
            });
            // Assertions
            expect(badgeDebug.badgeEvents).toHaveLength(2);
            const calendar1Badge = badgeDebug.badgeEvents.find((b) => b.sourceId === "calendar-1");
            const calendar2Badge = badgeDebug.badgeEvents.find((b) => b.sourceId === "calendar-2");
            expect(calendar1Badge).toBeDefined();
            expect(calendar1Badge.count).toBe(2); // Should aggregate
            expect(calendar2Badge).toBeDefined();
            expect(calendar2Badge.count).toBe(1);
        });
        test("should debug date mismatch scenarios", () => {
            console.log("\n=== Date Mismatch Debug ===");
            const task1 = createBadgeTask("calendar-1", "Calendar 1", new Date("2024-01-15T10:00:00Z"));
            const task2 = createBadgeTask("calendar-2", "Calendar 2", new Date("2024-01-16T10:00:00Z")); // Different date
            const tasks = [task1, task2];
            console.log("\n--- Badge Events for 2024-01-15 ---");
            const badgeDebug = debugGetBadgeEventsForDate(tasks, new Date("2024-01-15"));
            badgeDebug.debugInfo.forEach((info) => console.log(`  ${info}`));
            console.log("\nTask analysis:");
            badgeDebug.taskAnalysis.forEach((analysis, index) => {
                console.log(`  Task ${index}: ${analysis.shouldShowAsBadge ? "✅" : "❌"} Should show as badge`);
            });
            // Should only find one badge (for 2024-01-15)
            expect(badgeDebug.badgeEvents).toHaveLength(1);
            expect(badgeDebug.badgeEvents[0].sourceId).toBe("calendar-1");
        });
        test("should debug common badge issues", () => {
            console.log("\n=== Common Badge Issues Debug ===");
            // Issue 1: Wrong showType
            const wrongShowTypeSource = {
                id: "wrong-type",
                name: "Wrong Type Calendar",
                url: "https://example.com/wrong.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                color: "#ff6b6b",
            };
            const wrongTypeTask = createBadgeTask("wrong-type", "Wrong Type Calendar", new Date("2024-01-15T10:00:00Z"));
            wrongTypeTask.icsEvent.source.showType = "event"; // Override to wrong type
            // Issue 2: Missing source
            const missingSourceTask = createBadgeTask("missing-source", "Missing Source Calendar", new Date("2024-01-15T10:00:00Z"));
            delete missingSourceTask.icsEvent.source;
            // Issue 3: Missing icsEvent
            const missingEventTask = createBadgeTask("missing-event", "Missing Event Calendar", new Date("2024-01-15T10:00:00Z"));
            delete missingEventTask.icsEvent;
            // Issue 4: Not ICS task
            const notIcsTask = {
                id: "not-ics",
                content: "Not ICS Task",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Not ICS Task",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15").getTime(),
                    heading: [],
                },
            };
            const tasks = [
                wrongTypeTask,
                missingSourceTask,
                missingEventTask,
                notIcsTask,
            ];
            console.log("\n--- Debugging Common Issues ---");
            tasks.forEach((task, index) => {
                console.log(`\nTask ${index} (${task.id}):`);
                const debug = debugTaskBadgeStatus(task);
                debug.debugInfo.forEach((info) => console.log(`  ${info}`));
            });
            const badgeDebug = debugGetBadgeEventsForDate(tasks, new Date("2024-01-15"));
            console.log("\nOverall result:");
            badgeDebug.debugInfo.forEach((info) => console.log(`  ${info}`));
            // None of these should produce badges
            expect(badgeDebug.badgeEvents).toHaveLength(0);
        });
    });
    describe("Badge Rendering Debug", () => {
        test("should provide debugging output for badge rendering", () => {
            console.log("\n=== Badge Rendering Debug Guide ===");
            console.log("\nTo debug badge rendering issues:");
            console.log("1. Check if tasks are properly identified as badge events");
            console.log("2. Verify getBadgeEventsForDate returns correct data");
            console.log("3. Ensure badge containers are created in DOM");
            console.log("4. Check if badge elements are properly styled");
            console.log("\nCommon issues:");
            console.log("- ICS source showType is not 'badge'");
            console.log("- Event date doesn't match target date");
            console.log("- Missing icsEvent or source properties");
            console.log("- CSS styles not loaded or overridden");
            console.log("- getBadgeEventsForDate function not passed to view");
            // This test always passes, it's just for documentation
            expect(true).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFkZ2UtZGVidWctaGVscGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiYWRnZS1kZWJ1Zy1oZWxwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBSWxDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDbkMsbURBQW1EO0lBQ25ELFNBQVMsZUFBZSxDQUN2QixRQUFnQixFQUNoQixVQUFrQixFQUNsQixTQUFlLEVBQ2YsUUFBZ0IsU0FBUzs7UUFFekIsTUFBTSxXQUFXLEdBQWM7WUFDOUIsRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsVUFBVTtZQUNoQixHQUFHLEVBQUUsdUJBQXVCLFFBQVEsTUFBTTtZQUMxQyxPQUFPLEVBQUUsSUFBSTtZQUNiLGVBQWUsRUFBRSxFQUFFO1lBQ25CLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsZUFBZSxFQUFFLElBQUk7WUFDckIsUUFBUSxFQUFFLE9BQU87WUFDakIsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDO1FBRUYsTUFBTSxVQUFVLEdBQWE7WUFDNUIsR0FBRyxFQUFFLEdBQUcsUUFBUSxVQUFVLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMvQyxPQUFPLEVBQUUsY0FBYyxVQUFVLEVBQUU7WUFDbkMsV0FBVyxFQUFFLCtCQUErQjtZQUM1QyxPQUFPLEVBQUUsU0FBUztZQUNsQixLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ3JELE1BQU0sRUFBRSxLQUFLO1lBQ2IsTUFBTSxFQUFFLFdBQVc7U0FDbkIsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFZO1lBQzFCLEVBQUUsRUFBRSxPQUFPLFFBQVEsSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLE9B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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEJhZGdlIERlYnVnIEhlbHBlclxyXG4gKiBUaGlzIHRlc3QgaGVscHMgZGVidWcgd2h5IGJhZGdlcyBtaWdodCBub3QgYmUgc2hvd2luZyBpbiB0aGUgY2FsZW5kYXIgdmlld1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IG1vbWVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBJY3NUYXNrLCBJY3NFdmVudCwgSWNzU291cmNlIH0gZnJvbSBcIi4uL3R5cGVzL2ljc1wiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbmRlc2NyaWJlKFwiQmFkZ2UgRGVidWcgSGVscGVyXCIsICgpID0+IHtcclxuXHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIGEgcmVhbGlzdGljIGJhZGdlIHRhc2tcclxuXHRmdW5jdGlvbiBjcmVhdGVCYWRnZVRhc2soXHJcblx0XHRzb3VyY2VJZDogc3RyaW5nLFxyXG5cdFx0c291cmNlTmFtZTogc3RyaW5nLFxyXG5cdFx0ZXZlbnREYXRlOiBEYXRlLFxyXG5cdFx0Y29sb3I6IHN0cmluZyA9IFwiI2ZmNmI2YlwiXHJcblx0KTogSWNzVGFzayB7XHJcblx0XHRjb25zdCBiYWRnZVNvdXJjZTogSWNzU291cmNlID0ge1xyXG5cdFx0XHRpZDogc291cmNlSWQsXHJcblx0XHRcdG5hbWU6IHNvdXJjZU5hbWUsXHJcblx0XHRcdHVybDogYGh0dHBzOi8vZXhhbXBsZS5jb20vJHtzb3VyY2VJZH0uaWNzYCxcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRzaG93VHlwZTogXCJiYWRnZVwiLFxyXG5cdFx0XHRjb2xvcjogY29sb3IsXHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGJhZGdlRXZlbnQ6IEljc0V2ZW50ID0ge1xyXG5cdFx0XHR1aWQ6IGAke3NvdXJjZUlkfS1ldmVudC0ke2V2ZW50RGF0ZS5nZXRUaW1lKCl9YCxcclxuXHRcdFx0c3VtbWFyeTogYEV2ZW50IGZyb20gJHtzb3VyY2VOYW1lfWAsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBcIlRoaXMgc2hvdWxkIGFwcGVhciBhcyBhIGJhZGdlXCIsXHJcblx0XHRcdGR0c3RhcnQ6IGV2ZW50RGF0ZSxcclxuXHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKGV2ZW50RGF0ZS5nZXRUaW1lKCkgKyA2MCAqIDYwICogMTAwMCksIC8vIDEgaG91ciBsYXRlclxyXG5cdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRzb3VyY2U6IGJhZGdlU291cmNlLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBiYWRnZVRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdGlkOiBgaWNzLSR7c291cmNlSWR9LSR7YmFkZ2VFdmVudC51aWR9YCxcclxuXHRcdFx0Y29udGVudDogYmFkZ2VFdmVudC5zdW1tYXJ5LFxyXG5cdFx0XHRmaWxlUGF0aDogYGljczovLyR7c291cmNlTmFtZX1gLFxyXG5cdFx0XHRsaW5lOiAwLFxyXG5cdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRiYWRnZTogdHJ1ZSxcclxuXHRcdFx0b3JpZ2luYWxNYXJrZG93bjogYC0gWyBdICR7YmFkZ2VFdmVudC5zdW1tYXJ5fWAsXHJcblx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRkdWVEYXRlOiBiYWRnZUV2ZW50LmR0ZW5kPy5nZXRUaW1lKCksXHJcblx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogYmFkZ2VFdmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRwcm9qZWN0OiBiYWRnZVNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpY3NFdmVudDogYmFkZ2VFdmVudCxcclxuXHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0bmFtZTogYmFkZ2VTb3VyY2UubmFtZSxcclxuXHRcdFx0XHRpZDogYmFkZ2VTb3VyY2UuaWQsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBiYWRnZVRhc2s7XHJcblx0fVxyXG5cclxuXHQvLyBEZWJ1ZyBmdW5jdGlvbiB0byBjaGVjayBpZiBhIHRhc2sgc2hvdWxkIHNob3cgYXMgYmFkZ2VcclxuXHRmdW5jdGlvbiBkZWJ1Z1Rhc2tCYWRnZVN0YXR1cyh0YXNrOiBUYXNrKToge1xyXG5cdFx0aXNJY3NUYXNrOiBib29sZWFuO1xyXG5cdFx0aGFzSWNzRXZlbnQ6IGJvb2xlYW47XHJcblx0XHRoYXNTb3VyY2U6IGJvb2xlYW47XHJcblx0XHRzaG93VHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cdFx0c2hvdWxkU2hvd0FzQmFkZ2U6IGJvb2xlYW47XHJcblx0XHRkZWJ1Z0luZm86IHN0cmluZ1tdO1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgZGVidWdJbmZvOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGNvbnN0IGlzSWNzVGFzayA9ICh0YXNrIGFzIGFueSkuc291cmNlPy50eXBlID09PSBcImljc1wiO1xyXG5cdFx0ZGVidWdJbmZvLnB1c2goYElzIElDUyB0YXNrOiAke2lzSWNzVGFza31gKTtcclxuXHJcblx0XHRpZiAoIWlzSWNzVGFzaykge1xyXG5cdFx0XHRkZWJ1Z0luZm8ucHVzaChcIuKdjCBOb3QgYW4gSUNTIHRhc2sgLSB3aWxsIG5vdCBzaG93IGFzIGJhZGdlXCIpO1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGlzSWNzVGFzayxcclxuXHRcdFx0XHRoYXNJY3NFdmVudDogZmFsc2UsXHJcblx0XHRcdFx0aGFzU291cmNlOiBmYWxzZSxcclxuXHRcdFx0XHRzaG93VHlwZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdHNob3VsZFNob3dBc0JhZGdlOiBmYWxzZSxcclxuXHRcdFx0XHRkZWJ1Z0luZm8sXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaWNzVGFzayA9IHRhc2sgYXMgSWNzVGFzaztcclxuXHRcdGNvbnN0IGhhc0ljc0V2ZW50ID0gISFpY3NUYXNrLmljc0V2ZW50O1xyXG5cdFx0ZGVidWdJbmZvLnB1c2goYEhhcyBJQ1MgZXZlbnQ6ICR7aGFzSWNzRXZlbnR9YCk7XHJcblxyXG5cdFx0aWYgKCFoYXNJY3NFdmVudCkge1xyXG5cdFx0XHRkZWJ1Z0luZm8ucHVzaChcIuKdjCBObyBJQ1MgZXZlbnQgLSB3aWxsIG5vdCBzaG93IGFzIGJhZGdlXCIpO1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGlzSWNzVGFzayxcclxuXHRcdFx0XHRoYXNJY3NFdmVudCxcclxuXHRcdFx0XHRoYXNTb3VyY2U6IGZhbHNlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0c2hvdWxkU2hvd0FzQmFkZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdGRlYnVnSW5mbyxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBoYXNTb3VyY2UgPSAhIWljc1Rhc2suaWNzRXZlbnQuc291cmNlO1xyXG5cdFx0ZGVidWdJbmZvLnB1c2goYEhhcyBzb3VyY2U6ICR7aGFzU291cmNlfWApO1xyXG5cclxuXHRcdGlmICghaGFzU291cmNlKSB7XHJcblx0XHRcdGRlYnVnSW5mby5wdXNoKFwi4p2MIE5vIHNvdXJjZSAtIHdpbGwgbm90IHNob3cgYXMgYmFkZ2VcIik7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0aXNJY3NUYXNrLFxyXG5cdFx0XHRcdGhhc0ljc0V2ZW50LFxyXG5cdFx0XHRcdGhhc1NvdXJjZSxcclxuXHRcdFx0XHRzaG93VHlwZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdHNob3VsZFNob3dBc0JhZGdlOiBmYWxzZSxcclxuXHRcdFx0XHRkZWJ1Z0luZm8sXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgc2hvd1R5cGUgPSBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5zaG93VHlwZTtcclxuXHRcdGRlYnVnSW5mby5wdXNoKGBTaG93IHR5cGU6ICR7c2hvd1R5cGV9YCk7XHJcblxyXG5cdFx0Y29uc3Qgc2hvdWxkU2hvd0FzQmFkZ2UgPSBzaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cdFx0aWYgKHNob3VsZFNob3dBc0JhZGdlKSB7XHJcblx0XHRcdGRlYnVnSW5mby5wdXNoKFwi4pyFIFNob3VsZCBzaG93IGFzIGJhZGdlXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGVidWdJbmZvLnB1c2goXHJcblx0XHRcdFx0YOKdjCBTaG93IHR5cGUgaXMgXCIke3Nob3dUeXBlfVwiLCBub3QgXCJiYWRnZVwiIC0gd2lsbCBub3Qgc2hvdyBhcyBiYWRnZWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRpc0ljc1Rhc2ssXHJcblx0XHRcdGhhc0ljc0V2ZW50LFxyXG5cdFx0XHRoYXNTb3VyY2UsXHJcblx0XHRcdHNob3dUeXBlLFxyXG5cdFx0XHRzaG91bGRTaG93QXNCYWRnZSxcclxuXHRcdFx0ZGVidWdJbmZvLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIERlYnVnIGZ1bmN0aW9uIHRvIHNpbXVsYXRlIGdldEJhZGdlRXZlbnRzRm9yRGF0ZVxyXG5cdGZ1bmN0aW9uIGRlYnVnR2V0QmFkZ2VFdmVudHNGb3JEYXRlKFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdGRhdGU6IERhdGVcclxuXHQpOiB7XHJcblx0XHR0YXJnZXREYXRlOiBzdHJpbmc7XHJcblx0XHRiYWRnZUV2ZW50czogYW55W107XHJcblx0XHRkZWJ1Z0luZm86IHN0cmluZ1tdO1xyXG5cdFx0dGFza0FuYWx5c2lzOiBhbnlbXTtcclxuXHR9IHtcclxuXHRcdGNvbnN0IGRlYnVnSW5mbzogc3RyaW5nW10gPSBbXTtcclxuXHRcdGNvbnN0IHRhc2tBbmFseXNpczogYW55W10gPSBbXTtcclxuXHJcblx0XHRjb25zdCB0YXJnZXREYXRlID0gbW9tZW50KGRhdGUpLnN0YXJ0T2YoXCJkYXlcIik7XHJcblx0XHRjb25zdCB0YXJnZXREYXRlU3RyID0gdGFyZ2V0RGF0ZS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0ZGVidWdJbmZvLnB1c2goYFRhcmdldCBkYXRlOiAke3RhcmdldERhdGVTdHJ9YCk7XHJcblx0XHRkZWJ1Z0luZm8ucHVzaChgVG90YWwgdGFza3MgdG8gY2hlY2s6ICR7dGFza3MubGVuZ3RofWApO1xyXG5cclxuXHRcdGNvbnN0IGJhZGdlRXZlbnRzOiBNYXA8XHJcblx0XHRcdHN0cmluZyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHNvdXJjZUlkOiBzdHJpbmc7XHJcblx0XHRcdFx0c291cmNlTmFtZTogc3RyaW5nO1xyXG5cdFx0XHRcdGNvdW50OiBudW1iZXI7XHJcblx0XHRcdFx0Y29sb3I/OiBzdHJpbmc7XHJcblx0XHRcdH1cclxuXHRcdD4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaywgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0RlYnVnID0gZGVidWdUYXNrQmFkZ2VTdGF0dXModGFzayk7XHJcblx0XHRcdHRhc2tBbmFseXNpcy5wdXNoKHtcclxuXHRcdFx0XHR0YXNrSW5kZXg6IGluZGV4LFxyXG5cdFx0XHRcdHRhc2tJZDogdGFzay5pZCxcclxuXHRcdFx0XHQuLi50YXNrRGVidWcsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tEZWJ1Zy5zaG91bGRTaG93QXNCYWRnZSkge1xyXG5cdFx0XHRcdGNvbnN0IGljc1Rhc2sgPSB0YXNrIGFzIEljc1Rhc2s7XHJcblx0XHRcdFx0Y29uc3QgZXZlbnREYXRlID0gbW9tZW50KGljc1Rhc2suaWNzRXZlbnQuZHRzdGFydCkuc3RhcnRPZihcclxuXHRcdFx0XHRcdFwiZGF5XCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZVN0ciA9IGV2ZW50RGF0ZS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cclxuXHRcdFx0XHRkZWJ1Z0luZm8ucHVzaChcclxuXHRcdFx0XHRcdGBUYXNrICR7aW5kZXh9ICgke3Rhc2suaWR9KTogRXZlbnQgZGF0ZSAke2V2ZW50RGF0ZVN0cn1gXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50RGF0ZS5pc1NhbWUodGFyZ2V0RGF0ZSkpIHtcclxuXHRcdFx0XHRcdGRlYnVnSW5mby5wdXNoKGDinIUgVGFzayAke2luZGV4fSBtYXRjaGVzIHRhcmdldCBkYXRlYCk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgc291cmNlSWQgPSBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5pZDtcclxuXHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nID0gYmFkZ2VFdmVudHMuZ2V0KHNvdXJjZUlkKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmcpIHtcclxuXHRcdFx0XHRcdFx0ZXhpc3RpbmcuY291bnQrKztcclxuXHRcdFx0XHRcdFx0ZGVidWdJbmZvLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0YPCfk4ggSW5jcmVtZW50ZWQgY291bnQgZm9yIHNvdXJjZSAke3NvdXJjZUlkfSB0byAke2V4aXN0aW5nLmNvdW50fWBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGJhZGdlRXZlbnRzLnNldChzb3VyY2VJZCwge1xyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZUlkOiBzb3VyY2VJZCxcclxuXHRcdFx0XHRcdFx0XHRzb3VyY2VOYW1lOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRcdGNvdW50OiAxLFxyXG5cdFx0XHRcdFx0XHRcdGNvbG9yOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5jb2xvcixcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGRlYnVnSW5mby5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdGDwn4aVIEFkZGVkIG5ldyBiYWRnZSBmb3Igc291cmNlICR7c291cmNlSWR9YFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkZWJ1Z0luZm8ucHVzaChcclxuXHRcdFx0XHRcdFx0YOKdjCBUYXNrICR7aW5kZXh9IGRhdGUgJHtldmVudERhdGVTdHJ9IGRvZXMgbm90IG1hdGNoIHRhcmdldCAke3RhcmdldERhdGVTdHJ9YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IEFycmF5LmZyb20oYmFkZ2VFdmVudHMudmFsdWVzKCkpO1xyXG5cdFx0ZGVidWdJbmZvLnB1c2goYEZpbmFsIGJhZGdlIGNvdW50OiAke3Jlc3VsdC5sZW5ndGh9YCk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFyZ2V0RGF0ZTogdGFyZ2V0RGF0ZVN0cixcclxuXHRcdFx0YmFkZ2VFdmVudHM6IHJlc3VsdCxcclxuXHRcdFx0ZGVidWdJbmZvLFxyXG5cdFx0XHR0YXNrQW5hbHlzaXMsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZGVzY3JpYmUoXCJCYWRnZSBEZXRlY3Rpb24gRGVidWdcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBkZWJ1ZyBiYWRnZSB0YXNrIGNyZWF0aW9uIGFuZCBkZXRlY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIj09PSBCYWRnZSBEZWJ1ZyBUZXN0ID09PVwiKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSB0ZXN0IHRhc2tzXHJcblx0XHRcdGNvbnN0IGJhZGdlVGFzayA9IGNyZWF0ZUJhZGdlVGFzayhcclxuXHRcdFx0XHRcInRlc3QtY2FsZW5kYXJcIixcclxuXHRcdFx0XHRcIlRlc3QgQ2FsZW5kYXJcIixcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHJlZ3VsYXJUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInJlZ3VsYXItdGFzay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJSZWd1bGFyIFRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBSZWd1bGFyIFRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gW2JhZGdlVGFzaywgcmVndWxhclRhc2tdO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG4tLS0gVGFzayBBbmFseXNpcyAtLS1cIik7XHJcblx0XHRcdHRhc2tzLmZvckVhY2goKHRhc2ssIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coYFxcblRhc2sgJHtpbmRleH0gKCR7dGFzay5pZH0pOmApO1xyXG5cdFx0XHRcdGNvbnN0IGRlYnVnID0gZGVidWdUYXNrQmFkZ2VTdGF0dXModGFzayk7XHJcblx0XHRcdFx0ZGVidWcuZGVidWdJbmZvLmZvckVhY2goKGluZm8pID0+IGNvbnNvbGUubG9nKGAgICR7aW5mb31gKSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG4tLS0gQmFkZ2UgRXZlbnRzIGZvciAyMDI0LTAxLTE1IC0tLVwiKTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVwiKTtcclxuXHRcdFx0Y29uc3QgYmFkZ2VEZWJ1ZyA9IGRlYnVnR2V0QmFkZ2VFdmVudHNGb3JEYXRlKHRhc2tzLCB0YXJnZXREYXRlKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBUYXJnZXQgZGF0ZTogJHtiYWRnZURlYnVnLnRhcmdldERhdGV9YCk7XHJcblx0XHRcdGJhZGdlRGVidWcuZGVidWdJbmZvLmZvckVhY2goKGluZm8pID0+IGNvbnNvbGUubG9nKGAgICR7aW5mb31gKSk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlxcbkJhZGdlIGV2ZW50cyBmb3VuZDpcIik7XHJcblx0XHRcdGJhZGdlRGVidWcuYmFkZ2VFdmVudHMuZm9yRWFjaCgoYmFkZ2UsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgICBCYWRnZSAke2luZGV4fTogJHtiYWRnZS5zb3VyY2VOYW1lfSAoJHtiYWRnZS5jb3VudH0gZXZlbnRzLCBjb2xvcjogJHtiYWRnZS5jb2xvcn0pYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQXNzZXJ0aW9uc1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50c1swXS5zb3VyY2VOYW1lKS50b0JlKFwiVGVzdCBDYWxlbmRhclwiKTtcclxuXHRcdFx0ZXhwZWN0KGJhZGdlRGVidWcuYmFkZ2VFdmVudHNbMF0uY291bnQpLnRvQmUoMSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGRlYnVnIG11bHRpcGxlIGJhZGdlIHNvdXJjZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlxcbj09PSBNdWx0aXBsZSBCYWRnZSBTb3VyY2VzIERlYnVnID09PVwiKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sxID0gY3JlYXRlQmFkZ2VUYXNrKFxyXG5cdFx0XHRcdFwiY2FsZW5kYXItMVwiLFxyXG5cdFx0XHRcdFwiQ2FsZW5kYXIgMVwiLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0XCIjZmY2YjZiXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgdGFzazIgPSBjcmVhdGVCYWRnZVRhc2soXHJcblx0XHRcdFx0XCJjYWxlbmRhci0yXCIsXHJcblx0XHRcdFx0XCJDYWxlbmRhciAyXCIsXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE1VDE0OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcIiM0ZWNkYzRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCB0YXNrMyA9IGNyZWF0ZUJhZGdlVGFzayhcclxuXHRcdFx0XHRcImNhbGVuZGFyLTFcIixcclxuXHRcdFx0XHRcIkNhbGVuZGFyIDFcIixcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTY6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFwiI2ZmNmI2YlwiXHJcblx0XHRcdCk7IC8vIFNhbWUgc291cmNlIGFzIHRhc2sxXHJcblxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IFt0YXNrMSwgdGFzazIsIHRhc2szXTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiXFxuLS0tIEJhZGdlIEV2ZW50cyBmb3IgMjAyNC0wMS0xNSAtLS1cIik7XHJcblx0XHRcdGNvbnN0IGJhZGdlRGVidWcgPSBkZWJ1Z0dldEJhZGdlRXZlbnRzRm9yRGF0ZShcclxuXHRcdFx0XHR0YXNrcyxcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGJhZGdlRGVidWcuZGVidWdJbmZvLmZvckVhY2goKGluZm8pID0+IGNvbnNvbGUubG9nKGAgICR7aW5mb31gKSk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlxcbkZpbmFsIGJhZGdlIGV2ZW50czpcIik7XHJcblx0XHRcdGJhZGdlRGVidWcuYmFkZ2VFdmVudHMuZm9yRWFjaCgoYmFkZ2UsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgICBCYWRnZSAke2luZGV4fTogJHtiYWRnZS5zb3VyY2VOYW1lfSAoJHtiYWRnZS5jb3VudH0gZXZlbnRzLCBjb2xvcjogJHtiYWRnZS5jb2xvcn0pYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQXNzZXJ0aW9uc1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50cykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cclxuXHRcdFx0Y29uc3QgY2FsZW5kYXIxQmFkZ2UgPSBiYWRnZURlYnVnLmJhZGdlRXZlbnRzLmZpbmQoXHJcblx0XHRcdFx0KGIpID0+IGIuc291cmNlSWQgPT09IFwiY2FsZW5kYXItMVwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGNhbGVuZGFyMkJhZGdlID0gYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50cy5maW5kKFxyXG5cdFx0XHRcdChiKSA9PiBiLnNvdXJjZUlkID09PSBcImNhbGVuZGFyLTJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGNhbGVuZGFyMUJhZGdlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXIxQmFkZ2UhLmNvdW50KS50b0JlKDIpOyAvLyBTaG91bGQgYWdncmVnYXRlXHJcblxyXG5cdFx0XHRleHBlY3QoY2FsZW5kYXIyQmFkZ2UpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChjYWxlbmRhcjJCYWRnZSEuY291bnQpLnRvQmUoMSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGRlYnVnIGRhdGUgbWlzbWF0Y2ggc2NlbmFyaW9zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG49PT0gRGF0ZSBNaXNtYXRjaCBEZWJ1ZyA9PT1cIik7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrMSA9IGNyZWF0ZUJhZGdlVGFzayhcclxuXHRcdFx0XHRcImNhbGVuZGFyLTFcIixcclxuXHRcdFx0XHRcIkNhbGVuZGFyIDFcIixcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHRhc2syID0gY3JlYXRlQmFkZ2VUYXNrKFxyXG5cdFx0XHRcdFwiY2FsZW5kYXItMlwiLFxyXG5cdFx0XHRcdFwiQ2FsZW5kYXIgMlwiLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xNlQxMDowMDowMFpcIilcclxuXHRcdFx0KTsgLy8gRGlmZmVyZW50IGRhdGVcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gW3Rhc2sxLCB0YXNrMl07XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlxcbi0tLSBCYWRnZSBFdmVudHMgZm9yIDIwMjQtMDEtMTUgLS0tXCIpO1xyXG5cdFx0XHRjb25zdCBiYWRnZURlYnVnID0gZGVidWdHZXRCYWRnZUV2ZW50c0ZvckRhdGUoXHJcblx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE1XCIpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRiYWRnZURlYnVnLmRlYnVnSW5mby5mb3JFYWNoKChpbmZvKSA9PiBjb25zb2xlLmxvZyhgICAke2luZm99YCkpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG5UYXNrIGFuYWx5c2lzOlwiKTtcclxuXHRcdFx0YmFkZ2VEZWJ1Zy50YXNrQW5hbHlzaXMuZm9yRWFjaCgoYW5hbHlzaXMsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgICBUYXNrICR7aW5kZXh9OiAke1xyXG5cdFx0XHRcdFx0XHRhbmFseXNpcy5zaG91bGRTaG93QXNCYWRnZSA/IFwi4pyFXCIgOiBcIuKdjFwiXHJcblx0XHRcdFx0XHR9IFNob3VsZCBzaG93IGFzIGJhZGdlYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG9ubHkgZmluZCBvbmUgYmFkZ2UgKGZvciAyMDI0LTAxLTE1KVxyXG5cdFx0XHRleHBlY3QoYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50cykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QoYmFkZ2VEZWJ1Zy5iYWRnZUV2ZW50c1swXS5zb3VyY2VJZCkudG9CZShcImNhbGVuZGFyLTFcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGRlYnVnIGNvbW1vbiBiYWRnZSBpc3N1ZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlxcbj09PSBDb21tb24gQmFkZ2UgSXNzdWVzIERlYnVnID09PVwiKTtcclxuXHJcblx0XHRcdC8vIElzc3VlIDE6IFdyb25nIHNob3dUeXBlXHJcblx0XHRcdGNvbnN0IHdyb25nU2hvd1R5cGVTb3VyY2U6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogXCJ3cm9uZy10eXBlXCIsXHJcblx0XHRcdFx0bmFtZTogXCJXcm9uZyBUeXBlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vd3JvbmcuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIsIC8vIFNob3VsZCBiZSBcImJhZGdlXCJcclxuXHRcdFx0XHRjb2xvcjogXCIjZmY2YjZiXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB3cm9uZ1R5cGVUYXNrID0gY3JlYXRlQmFkZ2VUYXNrKFxyXG5cdFx0XHRcdFwid3JvbmctdHlwZVwiLFxyXG5cdFx0XHRcdFwiV3JvbmcgVHlwZSBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0KHdyb25nVHlwZVRhc2sgYXMgYW55KS5pY3NFdmVudC5zb3VyY2Uuc2hvd1R5cGUgPSBcImV2ZW50XCI7IC8vIE92ZXJyaWRlIHRvIHdyb25nIHR5cGVcclxuXHJcblx0XHRcdC8vIElzc3VlIDI6IE1pc3Npbmcgc291cmNlXHJcblx0XHRcdGNvbnN0IG1pc3NpbmdTb3VyY2VUYXNrID0gY3JlYXRlQmFkZ2VUYXNrKFxyXG5cdFx0XHRcdFwibWlzc2luZy1zb3VyY2VcIixcclxuXHRcdFx0XHRcIk1pc3NpbmcgU291cmNlIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0bmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRkZWxldGUgKG1pc3NpbmdTb3VyY2VUYXNrIGFzIGFueSkuaWNzRXZlbnQuc291cmNlO1xyXG5cclxuXHRcdFx0Ly8gSXNzdWUgMzogTWlzc2luZyBpY3NFdmVudFxyXG5cdFx0XHRjb25zdCBtaXNzaW5nRXZlbnRUYXNrID0gY3JlYXRlQmFkZ2VUYXNrKFxyXG5cdFx0XHRcdFwibWlzc2luZy1ldmVudFwiLFxyXG5cdFx0XHRcdFwiTWlzc2luZyBFdmVudCBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0ZGVsZXRlIChtaXNzaW5nRXZlbnRUYXNrIGFzIGFueSkuaWNzRXZlbnQ7XHJcblxyXG5cdFx0XHQvLyBJc3N1ZSA0OiBOb3QgSUNTIHRhc2tcclxuXHRcdFx0Y29uc3Qgbm90SWNzVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJub3QtaWNzXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJOb3QgSUNTIFRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBOb3QgSUNTIFRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0aGVhZGluZzogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gW1xyXG5cdFx0XHRcdHdyb25nVHlwZVRhc2ssXHJcblx0XHRcdFx0bWlzc2luZ1NvdXJjZVRhc2ssXHJcblx0XHRcdFx0bWlzc2luZ0V2ZW50VGFzayxcclxuXHRcdFx0XHRub3RJY3NUYXNrLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG4tLS0gRGVidWdnaW5nIENvbW1vbiBJc3N1ZXMgLS0tXCIpO1xyXG5cdFx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGBcXG5UYXNrICR7aW5kZXh9ICgke3Rhc2suaWR9KTpgKTtcclxuXHRcdFx0XHRjb25zdCBkZWJ1ZyA9IGRlYnVnVGFza0JhZGdlU3RhdHVzKHRhc2spO1xyXG5cdFx0XHRcdGRlYnVnLmRlYnVnSW5mby5mb3JFYWNoKChpbmZvKSA9PiBjb25zb2xlLmxvZyhgICAke2luZm99YCkpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGJhZGdlRGVidWcgPSBkZWJ1Z0dldEJhZGdlRXZlbnRzRm9yRGF0ZShcclxuXHRcdFx0XHR0YXNrcyxcclxuXHRcdFx0XHRuZXcgRGF0ZShcIjIwMjQtMDEtMTVcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiXFxuT3ZlcmFsbCByZXN1bHQ6XCIpO1xyXG5cdFx0XHRiYWRnZURlYnVnLmRlYnVnSW5mby5mb3JFYWNoKChpbmZvKSA9PiBjb25zb2xlLmxvZyhgICAke2luZm99YCkpO1xyXG5cclxuXHRcdFx0Ly8gTm9uZSBvZiB0aGVzZSBzaG91bGQgcHJvZHVjZSBiYWRnZXNcclxuXHRcdFx0ZXhwZWN0KGJhZGdlRGVidWcuYmFkZ2VFdmVudHMpLnRvSGF2ZUxlbmd0aCgwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkJhZGdlIFJlbmRlcmluZyBEZWJ1Z1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHByb3ZpZGUgZGVidWdnaW5nIG91dHB1dCBmb3IgYmFkZ2UgcmVuZGVyaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG49PT0gQmFkZ2UgUmVuZGVyaW5nIERlYnVnIEd1aWRlID09PVwiKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJcXG5UbyBkZWJ1ZyBiYWRnZSByZW5kZXJpbmcgaXNzdWVzOlwiKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCIxLiBDaGVjayBpZiB0YXNrcyBhcmUgcHJvcGVybHkgaWRlbnRpZmllZCBhcyBiYWRnZSBldmVudHNcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIjIuIFZlcmlmeSBnZXRCYWRnZUV2ZW50c0ZvckRhdGUgcmV0dXJucyBjb3JyZWN0IGRhdGFcIik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiMy4gRW5zdXJlIGJhZGdlIGNvbnRhaW5lcnMgYXJlIGNyZWF0ZWQgaW4gRE9NXCIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIjQuIENoZWNrIGlmIGJhZGdlIGVsZW1lbnRzIGFyZSBwcm9wZXJseSBzdHlsZWRcIik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiXFxuQ29tbW9uIGlzc3VlczpcIik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiLSBJQ1Mgc291cmNlIHNob3dUeXBlIGlzIG5vdCAnYmFkZ2UnXCIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIi0gRXZlbnQgZGF0ZSBkb2Vzbid0IG1hdGNoIHRhcmdldCBkYXRlXCIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIi0gTWlzc2luZyBpY3NFdmVudCBvciBzb3VyY2UgcHJvcGVydGllc1wiKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCItIENTUyBzdHlsZXMgbm90IGxvYWRlZCBvciBvdmVycmlkZGVuXCIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIi0gZ2V0QmFkZ2VFdmVudHNGb3JEYXRlIGZ1bmN0aW9uIG5vdCBwYXNzZWQgdG8gdmlld1wiKTtcclxuXHJcblx0XHRcdC8vIFRoaXMgdGVzdCBhbHdheXMgcGFzc2VzLCBpdCdzIGp1c3QgZm9yIGRvY3VtZW50YXRpb25cclxuXHRcdFx0ZXhwZWN0KHRydWUpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==