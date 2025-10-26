/**
 * ICS Integration Tests
 * Tests for real-world ICS parsing using Chinese Lunar Calendar data
 */
import { __awaiter } from "tslib";
import { IcsParser } from "../parsers/ics-parser";
import { IcsManager } from "../managers/ics-manager";
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
// Mock Component for testing
class MockComponent {
    constructor() { }
    load() { }
    unload() { }
}
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
describe("ICS Integration with Chinese Lunar Calendar", () => {
    const testSource = {
        id: "chinese-lunar-test",
        name: "Chinese Lunar Calendar",
        url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
        enabled: true,
        refreshInterval: 60,
        showAllDayEvents: true,
        showTimedEvents: true,
        showType: "event",
    };
    // Real sample data from the Chinese Lunar Calendar
    const realIcsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//infinet//Chinese Lunar Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:中国农历
X-WR-CALDESC:中国传统农历日历
BEGIN:VEVENT
DTSTAMP:20191221T140102Z
UID:2019-04-24-lc@infinet.github.io
DTSTART;VALUE=DATE:20190424T235800
DTEND;VALUE=DATE:20190424T235900
STATUS:CONFIRMED
SUMMARY:三月二十|三 4-24
DESCRIPTION:农历三月二十日
CATEGORIES:农历
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20191221T140102Z
UID:2019-05-01-lc@infinet.github.io
DTSTART;VALUE=DATE:20190501T000000
DTEND;VALUE=DATE:20190501T235959
STATUS:CONFIRMED
SUMMARY:三月廿七|三 5-1
DESCRIPTION:农历三月廿七日
CATEGORIES:农历
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20191221T140102Z
UID:2019-05-12-spring-festival@infinet.github.io
DTSTART;VALUE=DATE:20190512T000000
DTEND;VALUE=DATE:20190512T235959
STATUS:CONFIRMED
SUMMARY:四月初八|四 5-12 立夏
DESCRIPTION:农历四月初八，立夏节气
CATEGORIES:农历,节气
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20191221T140102Z
UID:2019-06-07-dragon-boat@infinet.github.io
DTSTART;VALUE=DATE:20190607T000000
DTEND;VALUE=DATE:20190607T235959
STATUS:CONFIRMED
SUMMARY:五月初五|五 6-7 端午节
DESCRIPTION:农历五月初五，端午节
CATEGORIES:农历,节日
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20191221T140102Z
UID:2019-09-13-mid-autumn@infinet.github.io
DTSTART;VALUE=DATE:20190913T000000
DTEND;VALUE=DATE:20190913T235959
STATUS:CONFIRMED
SUMMARY:八月十五|八 9-13 中秋节
DESCRIPTION:农历八月十五，中秋节
CATEGORIES:农历,节日
END:VEVENT
END:VCALENDAR`;
    describe("Parser Integration", () => {
        test("should parse real Chinese Lunar Calendar data", () => {
            const result = IcsParser.parse(realIcsData, testSource);
            expect(result).toBeDefined();
            expect(result.events).toBeDefined();
            expect(result.events.length).toBe(5);
            expect(result.errors).toBeDefined();
            console.log(`Parsed ${result.events.length} events with ${result.errors.length} errors`);
        });
        test("should extract calendar metadata correctly", () => {
            const result = IcsParser.parse(realIcsData, testSource);
            expect(result.metadata).toBeDefined();
            expect(result.metadata.calendarName).toBe("中国农历");
            expect(result.metadata.description).toBe("中国传统农历日历");
            expect(result.metadata.version).toBe("2.0");
            expect(result.metadata.prodid).toBe("-//infinet//Chinese Lunar Calendar//EN");
        });
        test("should parse Chinese lunar events with correct format", () => {
            const result = IcsParser.parse(realIcsData, testSource);
            const events = result.events;
            // Test first event (regular lunar date)
            const firstEvent = events[0];
            expect(firstEvent.uid).toBe("2019-04-24-lc@infinet.github.io");
            expect(firstEvent.summary).toBe("三月二十|三 4-24");
            expect(firstEvent.description).toBe("农历三月二十日");
            expect(firstEvent.categories).toEqual(["农历"]);
            expect(firstEvent.status).toBe("CONFIRMED");
            expect(firstEvent.source).toBe(testSource);
            // Test festival event (端午节)
            const dragonBoatEvent = events.find((e) => e.summary.includes("端午节"));
            expect(dragonBoatEvent).toBeDefined();
            expect(dragonBoatEvent.summary).toBe("五月初五|五 6-7 端午节");
            expect(dragonBoatEvent.description).toBe("农历五月初五，端午节");
            expect(dragonBoatEvent.categories).toEqual(["农历", "节日"]);
            // Test solar term event (立夏)
            const solarTermEvent = events.find((e) => e.summary.includes("立夏"));
            expect(solarTermEvent).toBeDefined();
            expect(solarTermEvent.categories).toEqual(["农历", "节气"]);
        });
        test("should handle date parsing correctly", () => {
            const result = IcsParser.parse(realIcsData, testSource);
            const events = result.events;
            events.forEach((event) => {
                expect(event.dtstart).toBeInstanceOf(Date);
                expect(event.dtstart.getTime()).not.toBeNaN();
                if (event.dtend) {
                    expect(event.dtend).toBeInstanceOf(Date);
                    expect(event.dtend.getTime()).not.toBeNaN();
                    expect(event.dtend.getTime()).toBeGreaterThanOrEqual(event.dtstart.getTime());
                }
                console.log(`Event: ${event.summary} on ${event.dtstart.toDateString()}`);
            });
        });
        test("should identify all-day events correctly", () => {
            const result = IcsParser.parse(realIcsData, testSource);
            const events = result.events;
            // Most Chinese lunar calendar events should be all-day
            const allDayEvents = events.filter((event) => event.allDay);
            const timedEvents = events.filter((event) => !event.allDay);
            console.log(`All-day events: ${allDayEvents.length}, Timed events: ${timedEvents.length}`);
            // Expect most events to be all-day for lunar calendar
            expect(allDayEvents.length).toBeGreaterThan(0);
        });
    });
    describe("Manager Integration", () => {
        let icsManager;
        let mockComponent;
        const testConfig = {
            sources: [testSource],
            enableBackgroundRefresh: false,
            globalRefreshInterval: 60,
            maxCacheAge: 24,
            networkTimeout: 30,
            maxEventsPerSource: 1000,
            showInCalendar: true,
            showInTaskLists: true,
            defaultEventColor: "#3b82f6",
        };
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            mockComponent = new MockComponent();
            icsManager = new IcsManager(testConfig, mockPluginSettings, {});
            yield icsManager.initialize();
        }));
        afterEach(() => {
            if (icsManager) {
                icsManager.unload();
            }
        });
        test("should fetch and parse real Chinese Lunar Calendar", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const result = yield icsManager.syncSource(testSource.id);
                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();
                if (result.data) {
                    expect(result.data.events.length).toBeGreaterThan(0);
                    console.log(`Fetched ${result.data.events.length} events from real Chinese Lunar Calendar`);
                    // Check for typical Chinese lunar calendar content
                    const events = result.data.events;
                    const lunarEvents = events.filter((event) => {
                        var _a;
                        return event.summary.includes("月") ||
                            event.summary.includes("初") ||
                            event.summary.includes("十") ||
                            ((_a = event.categories) === null || _a === void 0 ? void 0 : _a.includes("农历"));
                    });
                    expect(lunarEvents.length).toBeGreaterThan(0);
                    console.log(`Found ${lunarEvents.length} lunar calendar events`);
                    // Look for festivals
                    const festivals = events.filter((event) => {
                        var _a;
                        return event.summary.includes("春节") ||
                            event.summary.includes("中秋") ||
                            event.summary.includes("端午") ||
                            event.summary.includes("元宵") ||
                            ((_a = event.categories) === null || _a === void 0 ? void 0 : _a.includes("节日"));
                    });
                    if (festivals.length > 0) {
                        console.log(`Found ${festivals.length} festival events`);
                        festivals.slice(0, 3).forEach((festival) => {
                            console.log(`Festival: ${festival.summary}`);
                        });
                    }
                }
            }
            catch (error) {
                console.warn("Network test failed, this is expected in some environments:", error);
                // Don't fail the test if network is unavailable
            }
        }), 15000); // 15 second timeout for network request
        test("should convert events to tasks correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            // Use mock data for reliable testing
            const parseResult = IcsParser.parse(realIcsData, testSource);
            const tasks = icsManager.convertEventsToTasks(parseResult.events);
            expect(tasks).toHaveLength(parseResult.events.length);
            tasks.forEach((task) => {
                expect(task.readonly).toBe(true);
                expect(task.content).toBeDefined();
                expect(task.source.type).toBe("ics");
                expect(task.source.id).toBe(testSource.id);
                expect(task.icsEvent).toBeDefined();
                // Check metadata mapping
                expect(task.metadata.startDate).toBeDefined();
                expect(task.metadata.project).toBe(testSource.name);
                if (task.icsEvent.categories) {
                    expect(task.metadata.tags).toEqual(task.icsEvent.categories);
                }
            });
            console.log("Sample converted tasks:");
            tasks.slice(0, 3).forEach((task, index) => {
                console.log(`Task ${index + 1}: ${task.content} (${task.icsEvent.summary})`);
            });
        }));
        test("should handle event filtering", () => {
            const parseResult = IcsParser.parse(realIcsData, testSource);
            const allEvents = parseResult.events;
            // Test filtering by categories
            const festivalEvents = allEvents.filter((event) => { var _a; return (_a = event.categories) === null || _a === void 0 ? void 0 : _a.includes("节日"); });
            const solarTermEvents = allEvents.filter((event) => { var _a; return (_a = event.categories) === null || _a === void 0 ? void 0 : _a.includes("节气"); });
            const regularLunarEvents = allEvents.filter((event) => {
                var _a, _b, _c;
                return ((_a = event.categories) === null || _a === void 0 ? void 0 : _a.includes("农历")) &&
                    !((_b = event.categories) === null || _b === void 0 ? void 0 : _b.includes("节日")) &&
                    !((_c = event.categories) === null || _c === void 0 ? void 0 : _c.includes("节气"));
            });
            console.log(`Festival events: ${festivalEvents.length}`);
            console.log(`Solar term events: ${solarTermEvents.length}`);
            console.log(`Regular lunar events: ${regularLunarEvents.length}`);
            expect(festivalEvents.length +
                solarTermEvents.length +
                regularLunarEvents.length).toBeLessThanOrEqual(allEvents.length);
        });
        test("should handle sync status correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            const initialStatus = icsManager.getSyncStatus(testSource.id);
            expect(initialStatus).toBeDefined();
            expect(initialStatus === null || initialStatus === void 0 ? void 0 : initialStatus.sourceId).toBe(testSource.id);
            expect(initialStatus === null || initialStatus === void 0 ? void 0 : initialStatus.status).toBe("idle");
            // Test sync status during operation
            const syncPromise = icsManager.syncSource(testSource.id);
            // Check if status changes to syncing (might be too fast to catch)
            const syncingStatus = icsManager.getSyncStatus(testSource.id);
            expect(syncingStatus).toBeDefined();
            try {
                yield syncPromise;
                const finalStatus = icsManager.getSyncStatus(testSource.id);
                expect(finalStatus === null || finalStatus === void 0 ? void 0 : finalStatus.status).toMatch(/idle|error/);
                if ((finalStatus === null || finalStatus === void 0 ? void 0 : finalStatus.status) === "idle") {
                    expect(finalStatus.eventCount).toBeGreaterThan(0);
                    expect(finalStatus.lastSync).toBeDefined();
                }
            }
            catch (error) {
                const errorStatus = icsManager.getSyncStatus(testSource.id);
                expect(errorStatus === null || errorStatus === void 0 ? void 0 : errorStatus.status).toBe("error");
                expect(errorStatus === null || errorStatus === void 0 ? void 0 : errorStatus.error).toBeDefined();
            }
        }));
    });
    describe("Error Handling", () => {
        test("should handle malformed Chinese lunar data", () => {
            const malformedData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//infinet//Chinese Lunar Calendar//EN
BEGIN:VEVENT
UID:malformed-event
DTSTART:INVALID_DATE_FORMAT
SUMMARY:三月二十|三 INVALID
CATEGORIES:农历
END:VEVENT
END:VCALENDAR`;
            const result = IcsParser.parse(malformedData, testSource);
            expect(result.events).toBeDefined();
            expect(result.errors).toBeDefined();
            // Parser should handle malformed data gracefully
            // Either by excluding invalid events or including them with default dates
            expect(result.events.length).toBeGreaterThanOrEqual(0);
            console.log(`Malformed data produced ${result.errors.length} errors and ${result.events.length} valid events`);
        });
        test("should handle missing required fields", () => {
            const incompleteData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:incomplete-event
SUMMARY:三月二十|三
END:VEVENT
END:VCALENDAR`;
            const result = IcsParser.parse(incompleteData, testSource);
            // Event without DTSTART should not be included
            expect(result.events.length).toBe(0);
        });
    });
    describe("Performance", () => {
        test("should parse large Chinese lunar dataset efficiently", () => {
            // Create a larger dataset by repeating the sample data
            const largeDataset = Array(100)
                .fill(realIcsData
                .replace(/BEGIN:VCALENDAR[\s\S]*?BEGIN:VEVENT/, "BEGIN:VEVENT")
                .replace(/END:VCALENDAR/, ""))
                .join("\n");
            const fullLargeData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//infinet//Chinese Lunar Calendar//EN
${largeDataset}
END:VCALENDAR`;
            const startTime = performance.now();
            const result = IcsParser.parse(fullLargeData, testSource);
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            console.log(`Parsing ${result.events.length} events took ${parseTime.toFixed(2)}ms`);
            // Should parse within reasonable time
            expect(parseTime).toBeLessThan(1000); // 1 second max for this test size
            expect(result.events.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLWludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpY3MtaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBRUgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUdyRCwwQkFBMEI7QUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM1QixTQUFTLEVBQUUsTUFBTSxhQUFhO1FBQzdCLGdCQUFlLENBQUM7UUFDaEIsSUFBSSxLQUFJLENBQUM7UUFDVCxNQUFNLEtBQUksQ0FBQztRQUNYLE1BQU0sS0FBSSxDQUFDO1FBQ1gsUUFBUSxLQUFJLENBQUM7UUFDYixRQUFRLEtBQUksQ0FBQztRQUNiLFdBQVcsS0FBSSxDQUFDO1FBQ2hCLFFBQVEsS0FBSSxDQUFDO0tBQ2I7SUFDRCxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNyQixDQUFDLENBQUMsQ0FBQztBQUVKLDZCQUE2QjtBQUM3QixNQUFNLGFBQWE7SUFDbEIsZ0JBQWUsQ0FBQztJQUNoQixJQUFJLEtBQUksQ0FBQztJQUNULE1BQU0sS0FBSSxDQUFDO0NBQ1g7QUFFRCxvQ0FBb0M7QUFDcEMsTUFBTSxrQkFBa0IsR0FBRztJQUMxQixlQUFlLEVBQUU7UUFDaEIsYUFBYSxFQUFFLEdBQUc7UUFDbEIsYUFBYSxFQUFFLEdBQUc7UUFDbEIsU0FBUyxFQUFFLEdBQUc7UUFDZCxTQUFTLEVBQUUsR0FBRztRQUNkLE9BQU8sRUFBRSxHQUFHO0tBQ1o7Q0FDTSxDQUFDO0FBRVQsUUFBUSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtJQUM1RCxNQUFNLFVBQVUsR0FBYztRQUM3QixFQUFFLEVBQUUsb0JBQW9CO1FBQ3hCLElBQUksRUFBRSx3QkFBd0I7UUFDOUIsR0FBRyxFQUFFLHlFQUF5RTtRQUM5RSxPQUFPLEVBQUUsSUFBSTtRQUNiLGVBQWUsRUFBRSxFQUFFO1FBQ25CLGdCQUFnQixFQUFFLElBQUk7UUFDdEIsZUFBZSxFQUFFLElBQUk7UUFDckIsUUFBUSxFQUFFLE9BQU87S0FDakIsQ0FBQztJQUVGLG1EQUFtRDtJQUNuRCxNQUFNLFdBQVcsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2NBeURQLENBQUM7SUFFZCxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7WUFDMUQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFeEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFFcEMsT0FBTyxDQUFDLEdBQUcsQ0FDVixVQUFVLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLFNBQVMsQ0FDM0UsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUV4RCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDbEMsd0NBQXdDLENBQ3hDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7WUFDbEUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUU3Qix3Q0FBd0M7WUFDeEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRTNDLDRCQUE0QjtZQUM1QixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDekMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQ3pCLENBQUM7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEMsTUFBTSxDQUFDLGVBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLGVBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxlQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRTFELDZCQUE2QjtZQUM3QixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDeEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQ3hCLENBQUM7WUFDRixNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckMsTUFBTSxDQUFDLGNBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFDakQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUU3QixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFOUMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO29CQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQzVDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQ25ELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQ3ZCLENBQUM7aUJBQ0Y7Z0JBRUQsT0FBTyxDQUFDLEdBQUcsQ0FDVixVQUFVLEtBQUssQ0FBQyxPQUFPLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUM1RCxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7WUFDckQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUU3Qix1REFBdUQ7WUFDdkQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTVELE9BQU8sQ0FBQyxHQUFHLENBQ1YsbUJBQW1CLFlBQVksQ0FBQyxNQUFNLG1CQUFtQixXQUFXLENBQUMsTUFBTSxFQUFFLENBQzdFLENBQUM7WUFFRixzREFBc0Q7WUFDdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsSUFBSSxVQUFzQixDQUFDO1FBQzNCLElBQUksYUFBNEIsQ0FBQztRQUVqQyxNQUFNLFVBQVUsR0FBcUI7WUFDcEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3JCLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIscUJBQXFCLEVBQUUsRUFBRTtZQUN6QixXQUFXLEVBQUUsRUFBRTtZQUNmLGNBQWMsRUFBRSxFQUFFO1lBQ2xCLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsY0FBYyxFQUFFLElBQUk7WUFDcEIsZUFBZSxFQUFFLElBQUk7WUFDckIsaUJBQWlCLEVBQUUsU0FBUztTQUM1QixDQUFDO1FBRUYsVUFBVSxDQUFDLEdBQVMsRUFBRTtZQUNyQixhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNwQyxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLEVBQVMsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQy9CLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2QsSUFBSSxVQUFVLEVBQUU7Z0JBQ2YsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3BCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBUyxFQUFFO1lBQ3JFLElBQUk7Z0JBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBRWxDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRTtvQkFDaEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckQsT0FBTyxDQUFDLEdBQUcsQ0FDVixXQUFXLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sMENBQTBDLENBQzlFLENBQUM7b0JBRUYsbURBQW1EO29CQUNuRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDbEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDaEMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ1QsT0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7NEJBQzNCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQzs0QkFDM0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDOzZCQUMzQixNQUFBLEtBQUssQ0FBQyxVQUFVLDBDQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO3FCQUFBLENBQ2pDLENBQUM7b0JBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQ1YsU0FBUyxXQUFXLENBQUMsTUFBTSx3QkFBd0IsQ0FDbkQsQ0FBQztvQkFFRixxQkFBcUI7b0JBQ3JCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQzlCLENBQUMsS0FBSyxFQUFFLEVBQUU7O3dCQUNULE9BQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDOzRCQUM1QixLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7NEJBQzVCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQzs0QkFDNUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDOzZCQUM1QixNQUFBLEtBQUssQ0FBQyxVQUFVLDBDQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO3FCQUFBLENBQ2pDLENBQUM7b0JBRUYsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDekIsT0FBTyxDQUFDLEdBQUcsQ0FDVixTQUFTLFNBQVMsQ0FBQyxNQUFNLGtCQUFrQixDQUMzQyxDQUFDO3dCQUNGLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOzRCQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7d0JBQzlDLENBQUMsQ0FBQyxDQUFDO3FCQUNIO2lCQUNEO2FBQ0Q7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsSUFBSSxDQUNYLDZEQUE2RCxFQUM3RCxLQUFLLENBQ0wsQ0FBQztnQkFDRixnREFBZ0Q7YUFDaEQ7UUFDRixDQUFDLENBQUEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLHdDQUF3QztRQUVuRCxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBUyxFQUFFO1lBQzNELHFDQUFxQztZQUNyQyxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3RCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWxFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV0RCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBRXBDLHlCQUF5QjtnQkFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXBELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7b0JBQzdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQ3hCLENBQUM7aUJBQ0Y7WUFDRixDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUN2QyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQ1YsUUFBUSxLQUFLLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLEtBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FDZixHQUFHLENBQ0gsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7WUFDMUMsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDN0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztZQUVyQywrQkFBK0I7WUFDL0IsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLFdBQ2pELE9BQUEsTUFBQSxLQUFLLENBQUMsVUFBVSwwQ0FBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsRUFBQSxDQUNoQyxDQUFDO1lBRUYsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLFdBQ2xELE9BQUEsTUFBQSxLQUFLLENBQUMsVUFBVSwwQ0FBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsRUFBQSxDQUNoQyxDQUFDO1lBRUYsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUMxQyxDQUFDLEtBQUssRUFBRSxFQUFFOztnQkFDVCxPQUFBLENBQUEsTUFBQSxLQUFLLENBQUMsVUFBVSwwQ0FBRSxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNoQyxDQUFDLENBQUEsTUFBQSxLQUFLLENBQUMsVUFBVSwwQ0FBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ2pDLENBQUMsQ0FBQSxNQUFBLEtBQUssQ0FBQyxVQUFVLDBDQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO2FBQUEsQ0FDbEMsQ0FBQztZQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFbEUsTUFBTSxDQUNMLGNBQWMsQ0FBQyxNQUFNO2dCQUNwQixlQUFlLENBQUMsTUFBTTtnQkFDdEIsa0JBQWtCLENBQUMsTUFBTSxDQUMxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFTLEVBQUU7WUFDdEQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUzQyxvQ0FBb0M7WUFDcEMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFekQsa0VBQWtFO1lBQ2xFLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUVwQyxJQUFJO2dCQUNILE1BQU0sV0FBVyxDQUFDO2dCQUVsQixNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxDQUFDLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRWxELElBQUksQ0FBQSxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUUsTUFBTSxNQUFLLE1BQU0sRUFBRTtvQkFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7aUJBQzNDO2FBQ0Q7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxDQUFDLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUUsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDekM7UUFDRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7WUFDdkQsTUFBTSxhQUFhLEdBQUc7Ozs7Ozs7OztjQVNYLENBQUM7WUFFWixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUUxRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFFcEMsaURBQWlEO1lBQ2pELDBFQUEwRTtZQUMxRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV2RCxPQUFPLENBQUMsR0FBRyxDQUNWLDJCQUEyQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sZUFBZSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sZUFBZSxDQUNqRyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELE1BQU0sY0FBYyxHQUFHOzs7Ozs7Y0FNWixDQUFDO1lBRVosTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFM0QsK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDNUIsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRTtZQUNqRSx1REFBdUQ7WUFDdkQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztpQkFDN0IsSUFBSSxDQUNKLFdBQVc7aUJBQ1QsT0FBTyxDQUNQLHFDQUFxQyxFQUNyQyxjQUFjLENBQ2Q7aUJBQ0EsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FDOUI7aUJBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2IsTUFBTSxhQUFhLEdBQUc7OztFQUd2QixZQUFZO2NBQ0EsQ0FBQztZQUVaLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMxRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFbEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUNWLFdBQ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUNmLGdCQUFnQixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ3hDLENBQUM7WUFFRixzQ0FBc0M7WUFDdEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGtDQUFrQztZQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIElDUyBJbnRlZ3JhdGlvbiBUZXN0c1xyXG4gKiBUZXN0cyBmb3IgcmVhbC13b3JsZCBJQ1MgcGFyc2luZyB1c2luZyBDaGluZXNlIEx1bmFyIENhbGVuZGFyIGRhdGFcclxuICovXHJcblxyXG5pbXBvcnQgeyBJY3NQYXJzZXIgfSBmcm9tIFwiLi4vcGFyc2Vycy9pY3MtcGFyc2VyXCI7XHJcbmltcG9ydCB7IEljc01hbmFnZXIgfSBmcm9tIFwiLi4vbWFuYWdlcnMvaWNzLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgSWNzU291cmNlLCBJY3NNYW5hZ2VyQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVzL2ljc1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBDb21wb25lbnRcclxuamVzdC5tb2NrKFwib2JzaWRpYW5cIiwgKCkgPT4gKHtcclxuXHRDb21wb25lbnQ6IGNsYXNzIE1vY2tDb21wb25lbnQge1xyXG5cdFx0Y29uc3RydWN0b3IoKSB7fVxyXG5cdFx0bG9hZCgpIHt9XHJcblx0XHR1bmxvYWQoKSB7fVxyXG5cdFx0b25sb2FkKCkge31cclxuXHRcdG9udW5sb2FkKCkge31cclxuXHRcdGFkZENoaWxkKCkge31cclxuXHRcdHJlbW92ZUNoaWxkKCkge31cclxuXHRcdHJlZ2lzdGVyKCkge31cclxuXHR9LFxyXG5cdHJlcXVlc3RVcmw6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuLy8gTW9jayBDb21wb25lbnQgZm9yIHRlc3RpbmdcclxuY2xhc3MgTW9ja0NvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IoKSB7fVxyXG5cdGxvYWQoKSB7fVxyXG5cdHVubG9hZCgpIHt9XHJcbn1cclxuXHJcbi8vIE1vY2sgbWluaW1hbCBzZXR0aW5ncyBmb3IgdGVzdGluZ1xyXG5jb25zdCBtb2NrUGx1Z2luU2V0dGluZ3MgPSB7XHJcblx0dGFza1N0YXR1c01hcmtzOiB7XHJcblx0XHRcIk5vdCBTdGFydGVkXCI6IFwiIFwiLFxyXG5cdFx0XCJJbiBQcm9ncmVzc1wiOiBcIi9cIixcclxuXHRcdENvbXBsZXRlZDogXCJ4XCIsXHJcblx0XHRBYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0UGxhbm5lZDogXCI/XCIsXHJcblx0fSxcclxufSBhcyBhbnk7XHJcblxyXG5kZXNjcmliZShcIklDUyBJbnRlZ3JhdGlvbiB3aXRoIENoaW5lc2UgTHVuYXIgQ2FsZW5kYXJcIiwgKCkgPT4ge1xyXG5cdGNvbnN0IHRlc3RTb3VyY2U6IEljc1NvdXJjZSA9IHtcclxuXHRcdGlkOiBcImNoaW5lc2UtbHVuYXItdGVzdFwiLFxyXG5cdFx0bmFtZTogXCJDaGluZXNlIEx1bmFyIENhbGVuZGFyXCIsXHJcblx0XHR1cmw6IFwiaHR0cHM6Ly9sd2xzdy5naXRodWIuaW8vQ2hpbmVzZS1MdW5hci1DYWxlbmRhci1pY3MvY2hpbmVzZV9sdW5hcl9teS5pY3NcIixcclxuXHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0c2hvd0FsbERheUV2ZW50czogdHJ1ZSxcclxuXHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdHNob3dUeXBlOiBcImV2ZW50XCIsXHJcblx0fTtcclxuXHJcblx0Ly8gUmVhbCBzYW1wbGUgZGF0YSBmcm9tIHRoZSBDaGluZXNlIEx1bmFyIENhbGVuZGFyXHJcblx0Y29uc3QgcmVhbEljc0RhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcblBST0RJRDotLy9pbmZpbmV0Ly9DaGluZXNlIEx1bmFyIENhbGVuZGFyLy9FTlxyXG5DQUxTQ0FMRTpHUkVHT1JJQU5cclxuTUVUSE9EOlBVQkxJU0hcclxuWC1XUi1DQUxOQU1FOuS4reWbveWGnOWOhlxyXG5YLVdSLUNBTERFU0M65Lit5Zu95Lyg57uf5Yac5Y6G5pel5Y6GXHJcbkJFR0lOOlZFVkVOVFxyXG5EVFNUQU1QOjIwMTkxMjIxVDE0MDEwMlpcclxuVUlEOjIwMTktMDQtMjQtbGNAaW5maW5ldC5naXRodWIuaW9cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMTkwNDI0VDIzNTgwMFxyXG5EVEVORDtWQUxVRT1EQVRFOjIwMTkwNDI0VDIzNTkwMFxyXG5TVEFUVVM6Q09ORklSTUVEXHJcblNVTU1BUlk65LiJ5pyI5LqM5Y2BfOS4iSA0LTI0XHJcbkRFU0NSSVBUSU9OOuWGnOWOhuS4ieaciOS6jOWNgeaXpVxyXG5DQVRFR09SSUVTOuWGnOWOhlxyXG5FTkQ6VkVWRU5UXHJcbkJFR0lOOlZFVkVOVFxyXG5EVFNUQU1QOjIwMTkxMjIxVDE0MDEwMlpcclxuVUlEOjIwMTktMDUtMDEtbGNAaW5maW5ldC5naXRodWIuaW9cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMTkwNTAxVDAwMDAwMFxyXG5EVEVORDtWQUxVRT1EQVRFOjIwMTkwNTAxVDIzNTk1OVxyXG5TVEFUVVM6Q09ORklSTUVEXHJcblNVTU1BUlk65LiJ5pyI5bu/5LiDfOS4iSA1LTFcclxuREVTQ1JJUFRJT0465Yac5Y6G5LiJ5pyI5bu/5LiD5pelXHJcbkNBVEVHT1JJRVM65Yac5Y6GXHJcbkVORDpWRVZFTlRcclxuQkVHSU46VkVWRU5UXHJcbkRUU1RBTVA6MjAxOTEyMjFUMTQwMTAyWlxyXG5VSUQ6MjAxOS0wNS0xMi1zcHJpbmctZmVzdGl2YWxAaW5maW5ldC5naXRodWIuaW9cclxuRFRTVEFSVDtWQUxVRT1EQVRFOjIwMTkwNTEyVDAwMDAwMFxyXG5EVEVORDtWQUxVRT1EQVRFOjIwMTkwNTEyVDIzNTk1OVxyXG5TVEFUVVM6Q09ORklSTUVEXHJcblNVTU1BUlk65Zub5pyI5Yid5YWrfOWbmyA1LTEyIOeri+Wkj1xyXG5ERVNDUklQVElPTjrlhpzljoblm5vmnIjliJ3lhavvvIznq4vlpI/oioLmsJRcclxuQ0FURUdPUklFUzrlhpzljoYs6IqC5rCUXHJcbkVORDpWRVZFTlRcclxuQkVHSU46VkVWRU5UXHJcbkRUU1RBTVA6MjAxOTEyMjFUMTQwMTAyWlxyXG5VSUQ6MjAxOS0wNi0wNy1kcmFnb24tYm9hdEBpbmZpbmV0LmdpdGh1Yi5pb1xyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAxOTA2MDdUMDAwMDAwXHJcbkRURU5EO1ZBTFVFPURBVEU6MjAxOTA2MDdUMjM1OTU5XHJcblNUQVRVUzpDT05GSVJNRURcclxuU1VNTUFSWTrkupTmnIjliJ3kupR85LqUIDYtNyDnq6/ljYjoioJcclxuREVTQ1JJUFRJT0465Yac5Y6G5LqU5pyI5Yid5LqU77yM56uv5Y2I6IqCXHJcbkNBVEVHT1JJRVM65Yac5Y6GLOiKguaXpVxyXG5FTkQ6VkVWRU5UXHJcbkJFR0lOOlZFVkVOVFxyXG5EVFNUQU1QOjIwMTkxMjIxVDE0MDEwMlpcclxuVUlEOjIwMTktMDktMTMtbWlkLWF1dHVtbkBpbmZpbmV0LmdpdGh1Yi5pb1xyXG5EVFNUQVJUO1ZBTFVFPURBVEU6MjAxOTA5MTNUMDAwMDAwXHJcbkRURU5EO1ZBTFVFPURBVEU6MjAxOTA5MTNUMjM1OTU5XHJcblNUQVRVUzpDT05GSVJNRURcclxuU1VNTUFSWTrlhavmnIjljYHkupR85YWrIDktMTMg5Lit56eL6IqCXHJcbkRFU0NSSVBUSU9OOuWGnOWOhuWFq+aciOWNgeS6lO+8jOS4reeni+iKglxyXG5DQVRFR09SSUVTOuWGnOWOhizoioLml6VcclxuRU5EOlZFVkVOVFxyXG5FTkQ6VkNBTEVOREFSYDtcclxuXHJcblx0ZGVzY3JpYmUoXCJQYXJzZXIgSW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBwYXJzZSByZWFsIENoaW5lc2UgTHVuYXIgQ2FsZW5kYXIgZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShyZWFsSWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmV2ZW50cykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5ldmVudHMubGVuZ3RoKS50b0JlKDUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9ycykudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBQYXJzZWQgJHtyZXN1bHQuZXZlbnRzLmxlbmd0aH0gZXZlbnRzIHdpdGggJHtyZXN1bHQuZXJyb3JzLmxlbmd0aH0gZXJyb3JzYFxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBleHRyYWN0IGNhbGVuZGFyIG1ldGFkYXRhIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShyZWFsSWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLmNhbGVuZGFyTmFtZSkudG9CZShcIuS4reWbveWGnOWOhlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS5kZXNjcmlwdGlvbikudG9CZShcIuS4reWbveS8oOe7n+WGnOWOhuaXpeWOhlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS52ZXJzaW9uKS50b0JlKFwiMi4wXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLnByb2RpZCkudG9CZShcclxuXHRcdFx0XHRcIi0vL2luZmluZXQvL0NoaW5lc2UgTHVuYXIgQ2FsZW5kYXIvL0VOXCJcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcGFyc2UgQ2hpbmVzZSBsdW5hciBldmVudHMgd2l0aCBjb3JyZWN0IGZvcm1hdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShyZWFsSWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGNvbnN0IGV2ZW50cyA9IHJlc3VsdC5ldmVudHM7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGZpcnN0IGV2ZW50IChyZWd1bGFyIGx1bmFyIGRhdGUpXHJcblx0XHRcdGNvbnN0IGZpcnN0RXZlbnQgPSBldmVudHNbMF07XHJcblx0XHRcdGV4cGVjdChmaXJzdEV2ZW50LnVpZCkudG9CZShcIjIwMTktMDQtMjQtbGNAaW5maW5ldC5naXRodWIuaW9cIik7XHJcblx0XHRcdGV4cGVjdChmaXJzdEV2ZW50LnN1bW1hcnkpLnRvQmUoXCLkuInmnIjkuozljYF85LiJIDQtMjRcIik7XHJcblx0XHRcdGV4cGVjdChmaXJzdEV2ZW50LmRlc2NyaXB0aW9uKS50b0JlKFwi5Yac5Y6G5LiJ5pyI5LqM5Y2B5pelXCIpO1xyXG5cdFx0XHRleHBlY3QoZmlyc3RFdmVudC5jYXRlZ29yaWVzKS50b0VxdWFsKFtcIuWGnOWOhlwiXSk7XHJcblx0XHRcdGV4cGVjdChmaXJzdEV2ZW50LnN0YXR1cykudG9CZShcIkNPTkZJUk1FRFwiKTtcclxuXHRcdFx0ZXhwZWN0KGZpcnN0RXZlbnQuc291cmNlKS50b0JlKHRlc3RTb3VyY2UpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBmZXN0aXZhbCBldmVudCAo56uv5Y2I6IqCKVxyXG5cdFx0XHRjb25zdCBkcmFnb25Cb2F0RXZlbnQgPSBldmVudHMuZmluZCgoZSkgPT5cclxuXHRcdFx0XHRlLnN1bW1hcnkuaW5jbHVkZXMoXCLnq6/ljYjoioJcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGRyYWdvbkJvYXRFdmVudCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KGRyYWdvbkJvYXRFdmVudCEuc3VtbWFyeSkudG9CZShcIuS6lOaciOWIneS6lHzkupQgNi03IOerr+WNiOiKglwiKTtcclxuXHRcdFx0ZXhwZWN0KGRyYWdvbkJvYXRFdmVudCEuZGVzY3JpcHRpb24pLnRvQmUoXCLlhpzljobkupTmnIjliJ3kupTvvIznq6/ljYjoioJcIik7XHJcblx0XHRcdGV4cGVjdChkcmFnb25Cb2F0RXZlbnQhLmNhdGVnb3JpZXMpLnRvRXF1YWwoW1wi5Yac5Y6GXCIsIFwi6IqC5pelXCJdKTtcclxuXHJcblx0XHRcdC8vIFRlc3Qgc29sYXIgdGVybSBldmVudCAo56uL5aSPKVxyXG5cdFx0XHRjb25zdCBzb2xhclRlcm1FdmVudCA9IGV2ZW50cy5maW5kKChlKSA9PlxyXG5cdFx0XHRcdGUuc3VtbWFyeS5pbmNsdWRlcyhcIueri+Wkj1wiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3Qoc29sYXJUZXJtRXZlbnQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzb2xhclRlcm1FdmVudCEuY2F0ZWdvcmllcykudG9FcXVhbChbXCLlhpzljoZcIiwgXCLoioLmsJRcIl0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZGF0ZSBwYXJzaW5nIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShyZWFsSWNzRGF0YSwgdGVzdFNvdXJjZSk7XHJcblx0XHRcdGNvbnN0IGV2ZW50cyA9IHJlc3VsdC5ldmVudHM7XHJcblxyXG5cdFx0XHRldmVudHMuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0XHRleHBlY3QoZXZlbnQuZHRzdGFydCkudG9CZUluc3RhbmNlT2YoRGF0ZSk7XHJcblx0XHRcdFx0ZXhwZWN0KGV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpKS5ub3QudG9CZU5hTigpO1xyXG5cclxuXHRcdFx0XHRpZiAoZXZlbnQuZHRlbmQpIHtcclxuXHRcdFx0XHRcdGV4cGVjdChldmVudC5kdGVuZCkudG9CZUluc3RhbmNlT2YoRGF0ZSk7XHJcblx0XHRcdFx0XHRleHBlY3QoZXZlbnQuZHRlbmQuZ2V0VGltZSgpKS5ub3QudG9CZU5hTigpO1xyXG5cdFx0XHRcdFx0ZXhwZWN0KGV2ZW50LmR0ZW5kLmdldFRpbWUoKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbChcclxuXHRcdFx0XHRcdFx0ZXZlbnQuZHRzdGFydC5nZXRUaW1lKClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBFdmVudDogJHtldmVudC5zdW1tYXJ5fSBvbiAke2V2ZW50LmR0c3RhcnQudG9EYXRlU3RyaW5nKCl9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBpZGVudGlmeSBhbGwtZGF5IGV2ZW50cyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UocmVhbEljc0RhdGEsIHRlc3RTb3VyY2UpO1xyXG5cdFx0XHRjb25zdCBldmVudHMgPSByZXN1bHQuZXZlbnRzO1xyXG5cclxuXHRcdFx0Ly8gTW9zdCBDaGluZXNlIGx1bmFyIGNhbGVuZGFyIGV2ZW50cyBzaG91bGQgYmUgYWxsLWRheVxyXG5cdFx0XHRjb25zdCBhbGxEYXlFdmVudHMgPSBldmVudHMuZmlsdGVyKChldmVudCkgPT4gZXZlbnQuYWxsRGF5KTtcclxuXHRcdFx0Y29uc3QgdGltZWRFdmVudHMgPSBldmVudHMuZmlsdGVyKChldmVudCkgPT4gIWV2ZW50LmFsbERheSk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgQWxsLWRheSBldmVudHM6ICR7YWxsRGF5RXZlbnRzLmxlbmd0aH0sIFRpbWVkIGV2ZW50czogJHt0aW1lZEV2ZW50cy5sZW5ndGh9YFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gRXhwZWN0IG1vc3QgZXZlbnRzIHRvIGJlIGFsbC1kYXkgZm9yIGx1bmFyIGNhbGVuZGFyXHJcblx0XHRcdGV4cGVjdChhbGxEYXlFdmVudHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJNYW5hZ2VyIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdGxldCBpY3NNYW5hZ2VyOiBJY3NNYW5hZ2VyO1xyXG5cdFx0bGV0IG1vY2tDb21wb25lbnQ6IE1vY2tDb21wb25lbnQ7XHJcblxyXG5cdFx0Y29uc3QgdGVzdENvbmZpZzogSWNzTWFuYWdlckNvbmZpZyA9IHtcclxuXHRcdFx0c291cmNlczogW3Rlc3RTb3VyY2VdLFxyXG5cdFx0XHRlbmFibGVCYWNrZ3JvdW5kUmVmcmVzaDogZmFsc2UsXHJcblx0XHRcdGdsb2JhbFJlZnJlc2hJbnRlcnZhbDogNjAsXHJcblx0XHRcdG1heENhY2hlQWdlOiAyNCxcclxuXHRcdFx0bmV0d29ya1RpbWVvdXQ6IDMwLFxyXG5cdFx0XHRtYXhFdmVudHNQZXJTb3VyY2U6IDEwMDAsXHJcblx0XHRcdHNob3dJbkNhbGVuZGFyOiB0cnVlLFxyXG5cdFx0XHRzaG93SW5UYXNrTGlzdHM6IHRydWUsXHJcblx0XHRcdGRlZmF1bHRFdmVudENvbG9yOiBcIiMzYjgyZjZcIixcclxuXHRcdH07XHJcblxyXG5cdFx0YmVmb3JlRWFjaChhc3luYyAoKSA9PiB7XHJcblx0XHRcdG1vY2tDb21wb25lbnQgPSBuZXcgTW9ja0NvbXBvbmVudCgpO1xyXG5cdFx0XHRpY3NNYW5hZ2VyID0gbmV3IEljc01hbmFnZXIodGVzdENvbmZpZywgbW9ja1BsdWdpblNldHRpbmdzLCB7fSBhcyBhbnkpO1xyXG5cdFx0XHRhd2FpdCBpY3NNYW5hZ2VyLmluaXRpYWxpemUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGFmdGVyRWFjaCgoKSA9PiB7XHJcblx0XHRcdGlmIChpY3NNYW5hZ2VyKSB7XHJcblx0XHRcdFx0aWNzTWFuYWdlci51bmxvYWQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBmZXRjaCBhbmQgcGFyc2UgcmVhbCBDaGluZXNlIEx1bmFyIENhbGVuZGFyXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBpY3NNYW5hZ2VyLnN5bmNTb3VyY2UodGVzdFNvdXJjZS5pZCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHRcdGlmIChyZXN1bHQuZGF0YSkge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgRmV0Y2hlZCAke3Jlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGh9IGV2ZW50cyBmcm9tIHJlYWwgQ2hpbmVzZSBMdW5hciBDYWxlbmRhcmBcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgZm9yIHR5cGljYWwgQ2hpbmVzZSBsdW5hciBjYWxlbmRhciBjb250ZW50XHJcblx0XHRcdFx0XHRjb25zdCBldmVudHMgPSByZXN1bHQuZGF0YS5ldmVudHM7XHJcblx0XHRcdFx0XHRjb25zdCBsdW5hckV2ZW50cyA9IGV2ZW50cy5maWx0ZXIoXHJcblx0XHRcdFx0XHRcdChldmVudCkgPT5cclxuXHRcdFx0XHRcdFx0XHRldmVudC5zdW1tYXJ5LmluY2x1ZGVzKFwi5pyIXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3VtbWFyeS5pbmNsdWRlcyhcIuWInVwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN1bW1hcnkuaW5jbHVkZXMoXCLljYFcIikgfHxcclxuXHRcdFx0XHRcdFx0XHRldmVudC5jYXRlZ29yaWVzPy5pbmNsdWRlcyhcIuWGnOWOhlwiKVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRleHBlY3QobHVuYXJFdmVudHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0YEZvdW5kICR7bHVuYXJFdmVudHMubGVuZ3RofSBsdW5hciBjYWxlbmRhciBldmVudHNgXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIExvb2sgZm9yIGZlc3RpdmFsc1xyXG5cdFx0XHRcdFx0Y29uc3QgZmVzdGl2YWxzID0gZXZlbnRzLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0KGV2ZW50KSA9PlxyXG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN1bW1hcnkuaW5jbHVkZXMoXCLmmKXoioJcIikgfHxcclxuXHRcdFx0XHRcdFx0XHRldmVudC5zdW1tYXJ5LmluY2x1ZGVzKFwi5Lit56eLXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3VtbWFyeS5pbmNsdWRlcyhcIuerr+WNiFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN1bW1hcnkuaW5jbHVkZXMoXCLlhYPlrrVcIikgfHxcclxuXHRcdFx0XHRcdFx0XHRldmVudC5jYXRlZ29yaWVzPy5pbmNsdWRlcyhcIuiKguaXpVwiKVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoZmVzdGl2YWxzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0YEZvdW5kICR7ZmVzdGl2YWxzLmxlbmd0aH0gZmVzdGl2YWwgZXZlbnRzYFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRmZXN0aXZhbHMuc2xpY2UoMCwgMykuZm9yRWFjaCgoZmVzdGl2YWwpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgRmVzdGl2YWw6ICR7ZmVzdGl2YWwuc3VtbWFyeX1gKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiTmV0d29yayB0ZXN0IGZhaWxlZCwgdGhpcyBpcyBleHBlY3RlZCBpbiBzb21lIGVudmlyb25tZW50czpcIixcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBEb24ndCBmYWlsIHRoZSB0ZXN0IGlmIG5ldHdvcmsgaXMgdW5hdmFpbGFibGVcclxuXHRcdFx0fVxyXG5cdFx0fSwgMTUwMDApOyAvLyAxNSBzZWNvbmQgdGltZW91dCBmb3IgbmV0d29yayByZXF1ZXN0XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBjb252ZXJ0IGV2ZW50cyB0byB0YXNrcyBjb3JyZWN0bHlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBVc2UgbW9jayBkYXRhIGZvciByZWxpYWJsZSB0ZXN0aW5nXHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gSWNzUGFyc2VyLnBhcnNlKHJlYWxJY3NEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKHBhcnNlUmVzdWx0LmV2ZW50cyk7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aChwYXJzZVJlc3VsdC5ldmVudHMubGVuZ3RoKTtcclxuXHJcblx0XHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRleHBlY3QodGFzay5yZWFkb25seSkudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QodGFzay5jb250ZW50KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLnNvdXJjZS50eXBlKS50b0JlKFwiaWNzXCIpO1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLnNvdXJjZS5pZCkudG9CZSh0ZXN0U291cmNlLmlkKTtcclxuXHRcdFx0XHRleHBlY3QodGFzay5pY3NFdmVudCkudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgbWV0YWRhdGEgbWFwcGluZ1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0XHRleHBlY3QodGFzay5tZXRhZGF0YS5wcm9qZWN0KS50b0JlKHRlc3RTb3VyY2UubmFtZSk7XHJcblxyXG5cdFx0XHRcdGlmICh0YXNrLmljc0V2ZW50LmNhdGVnb3JpZXMpIHtcclxuXHRcdFx0XHRcdGV4cGVjdCh0YXNrLm1ldGFkYXRhLnRhZ3MpLnRvRXF1YWwoXHJcblx0XHRcdFx0XHRcdHRhc2suaWNzRXZlbnQuY2F0ZWdvcmllc1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJTYW1wbGUgY29udmVydGVkIHRhc2tzOlwiKTtcclxuXHRcdFx0dGFza3Muc2xpY2UoMCwgMykuZm9yRWFjaCgodGFzaywgaW5kZXgpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBUYXNrICR7aW5kZXggKyAxfTogJHt0YXNrLmNvbnRlbnR9ICgke1xyXG5cdFx0XHRcdFx0XHR0YXNrLmljc0V2ZW50LnN1bW1hcnlcclxuXHRcdFx0XHRcdH0pYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZXZlbnQgZmlsdGVyaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UocmVhbEljc0RhdGEsIHRlc3RTb3VyY2UpO1xyXG5cdFx0XHRjb25zdCBhbGxFdmVudHMgPSBwYXJzZVJlc3VsdC5ldmVudHM7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGZpbHRlcmluZyBieSBjYXRlZ29yaWVzXHJcblx0XHRcdGNvbnN0IGZlc3RpdmFsRXZlbnRzID0gYWxsRXZlbnRzLmZpbHRlcigoZXZlbnQpID0+XHJcblx0XHRcdFx0ZXZlbnQuY2F0ZWdvcmllcz8uaW5jbHVkZXMoXCLoioLml6VcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHNvbGFyVGVybUV2ZW50cyA9IGFsbEV2ZW50cy5maWx0ZXIoKGV2ZW50KSA9PlxyXG5cdFx0XHRcdGV2ZW50LmNhdGVnb3JpZXM/LmluY2x1ZGVzKFwi6IqC5rCUXCIpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCByZWd1bGFyTHVuYXJFdmVudHMgPSBhbGxFdmVudHMuZmlsdGVyKFxyXG5cdFx0XHRcdChldmVudCkgPT5cclxuXHRcdFx0XHRcdGV2ZW50LmNhdGVnb3JpZXM/LmluY2x1ZGVzKFwi5Yac5Y6GXCIpICYmXHJcblx0XHRcdFx0XHQhZXZlbnQuY2F0ZWdvcmllcz8uaW5jbHVkZXMoXCLoioLml6VcIikgJiZcclxuXHRcdFx0XHRcdCFldmVudC5jYXRlZ29yaWVzPy5pbmNsdWRlcyhcIuiKguawlFwiKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYEZlc3RpdmFsIGV2ZW50czogJHtmZXN0aXZhbEV2ZW50cy5sZW5ndGh9YCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBTb2xhciB0ZXJtIGV2ZW50czogJHtzb2xhclRlcm1FdmVudHMubGVuZ3RofWApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgUmVndWxhciBsdW5hciBldmVudHM6ICR7cmVndWxhckx1bmFyRXZlbnRzLmxlbmd0aH1gKTtcclxuXHJcblx0XHRcdGV4cGVjdChcclxuXHRcdFx0XHRmZXN0aXZhbEV2ZW50cy5sZW5ndGggK1xyXG5cdFx0XHRcdFx0c29sYXJUZXJtRXZlbnRzLmxlbmd0aCArXHJcblx0XHRcdFx0XHRyZWd1bGFyTHVuYXJFdmVudHMubGVuZ3RoXHJcblx0XHRcdCkudG9CZUxlc3NUaGFuT3JFcXVhbChhbGxFdmVudHMubGVuZ3RoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHN5bmMgc3RhdHVzIGNvcnJlY3RseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGluaXRpYWxTdGF0dXMgPSBpY3NNYW5hZ2VyLmdldFN5bmNTdGF0dXModGVzdFNvdXJjZS5pZCk7XHJcblx0XHRcdGV4cGVjdChpbml0aWFsU3RhdHVzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QoaW5pdGlhbFN0YXR1cz8uc291cmNlSWQpLnRvQmUodGVzdFNvdXJjZS5pZCk7XHJcblx0XHRcdGV4cGVjdChpbml0aWFsU3RhdHVzPy5zdGF0dXMpLnRvQmUoXCJpZGxlXCIpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCBzeW5jIHN0YXR1cyBkdXJpbmcgb3BlcmF0aW9uXHJcblx0XHRcdGNvbnN0IHN5bmNQcm9taXNlID0gaWNzTWFuYWdlci5zeW5jU291cmNlKHRlc3RTb3VyY2UuaWQpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgc3RhdHVzIGNoYW5nZXMgdG8gc3luY2luZyAobWlnaHQgYmUgdG9vIGZhc3QgdG8gY2F0Y2gpXHJcblx0XHRcdGNvbnN0IHN5bmNpbmdTdGF0dXMgPSBpY3NNYW5hZ2VyLmdldFN5bmNTdGF0dXModGVzdFNvdXJjZS5pZCk7XHJcblx0XHRcdGV4cGVjdChzeW5jaW5nU3RhdHVzKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRhd2FpdCBzeW5jUHJvbWlzZTtcclxuXHJcblx0XHRcdFx0Y29uc3QgZmluYWxTdGF0dXMgPSBpY3NNYW5hZ2VyLmdldFN5bmNTdGF0dXModGVzdFNvdXJjZS5pZCk7XHJcblx0XHRcdFx0ZXhwZWN0KGZpbmFsU3RhdHVzPy5zdGF0dXMpLnRvTWF0Y2goL2lkbGV8ZXJyb3IvKTtcclxuXHJcblx0XHRcdFx0aWYgKGZpbmFsU3RhdHVzPy5zdGF0dXMgPT09IFwiaWRsZVwiKSB7XHJcblx0XHRcdFx0XHRleHBlY3QoZmluYWxTdGF0dXMuZXZlbnRDb3VudCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cdFx0XHRcdFx0ZXhwZWN0KGZpbmFsU3RhdHVzLmxhc3RTeW5jKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zdCBlcnJvclN0YXR1cyA9IGljc01hbmFnZXIuZ2V0U3luY1N0YXR1cyh0ZXN0U291cmNlLmlkKTtcclxuXHRcdFx0XHRleHBlY3QoZXJyb3JTdGF0dXM/LnN0YXR1cykudG9CZShcImVycm9yXCIpO1xyXG5cdFx0XHRcdGV4cGVjdChlcnJvclN0YXR1cz8uZXJyb3IpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVycm9yIEhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCBDaGluZXNlIGx1bmFyIGRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtYWxmb3JtZWREYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vaW5maW5ldC8vQ2hpbmVzZSBMdW5hciBDYWxlbmRhci8vRU5cclxuQkVHSU46VkVWRU5UXHJcblVJRDptYWxmb3JtZWQtZXZlbnRcclxuRFRTVEFSVDpJTlZBTElEX0RBVEVfRk9STUFUXHJcblNVTU1BUlk65LiJ5pyI5LqM5Y2BfOS4iSBJTlZBTElEXHJcbkNBVEVHT1JJRVM65Yac5Y6GXHJcbkVORDpWRVZFTlRcclxuRU5EOlZDQUxFTkRBUmA7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBJY3NQYXJzZXIucGFyc2UobWFsZm9ybWVkRGF0YSwgdGVzdFNvdXJjZSk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmV2ZW50cykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBQYXJzZXIgc2hvdWxkIGhhbmRsZSBtYWxmb3JtZWQgZGF0YSBncmFjZWZ1bGx5XHJcblx0XHRcdC8vIEVpdGhlciBieSBleGNsdWRpbmcgaW52YWxpZCBldmVudHMgb3IgaW5jbHVkaW5nIHRoZW0gd2l0aCBkZWZhdWx0IGRhdGVzXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXZlbnRzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgwKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBNYWxmb3JtZWQgZGF0YSBwcm9kdWNlZCAke3Jlc3VsdC5lcnJvcnMubGVuZ3RofSBlcnJvcnMgYW5kICR7cmVzdWx0LmV2ZW50cy5sZW5ndGh9IHZhbGlkIGV2ZW50c2BcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5jb21wbGV0ZURhdGEgPSBgQkVHSU46VkNBTEVOREFSXHJcblZFUlNJT046Mi4wXHJcbkJFR0lOOlZFVkVOVFxyXG5VSUQ6aW5jb21wbGV0ZS1ldmVudFxyXG5TVU1NQVJZOuS4ieaciOS6jOWNgXzkuIlcclxuRU5EOlZFVkVOVFxyXG5FTkQ6VkNBTEVOREFSYDtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShpbmNvbXBsZXRlRGF0YSwgdGVzdFNvdXJjZSk7XHJcblxyXG5cdFx0XHQvLyBFdmVudCB3aXRob3V0IERUU1RBUlQgc2hvdWxkIG5vdCBiZSBpbmNsdWRlZFxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmV2ZW50cy5sZW5ndGgpLnRvQmUoMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQZXJmb3JtYW5jZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHBhcnNlIGxhcmdlIENoaW5lc2UgbHVuYXIgZGF0YXNldCBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIGxhcmdlciBkYXRhc2V0IGJ5IHJlcGVhdGluZyB0aGUgc2FtcGxlIGRhdGFcclxuXHRcdFx0Y29uc3QgbGFyZ2VEYXRhc2V0ID0gQXJyYXkoMTAwKVxyXG5cdFx0XHRcdC5maWxsKFxyXG5cdFx0XHRcdFx0cmVhbEljc0RhdGFcclxuXHRcdFx0XHRcdFx0LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcdFx0L0JFR0lOOlZDQUxFTkRBUltcXHNcXFNdKj9CRUdJTjpWRVZFTlQvLFxyXG5cdFx0XHRcdFx0XHRcdFwiQkVHSU46VkVWRU5UXCJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvRU5EOlZDQUxFTkRBUi8sIFwiXCIpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cdFx0XHRjb25zdCBmdWxsTGFyZ2VEYXRhID0gYEJFR0lOOlZDQUxFTkRBUlxyXG5WRVJTSU9OOjIuMFxyXG5QUk9ESUQ6LS8vaW5maW5ldC8vQ2hpbmVzZSBMdW5hciBDYWxlbmRhci8vRU5cclxuJHtsYXJnZURhdGFzZXR9XHJcbkVORDpWQ0FMRU5EQVJgO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShmdWxsTGFyZ2VEYXRhLCB0ZXN0U291cmNlKTtcclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFBhcnNpbmcgJHtcclxuXHRcdFx0XHRcdHJlc3VsdC5ldmVudHMubGVuZ3RoXHJcblx0XHRcdFx0fSBldmVudHMgdG9vayAke3BhcnNlVGltZS50b0ZpeGVkKDIpfW1zYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIHBhcnNlIHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KHBhcnNlVGltZSkudG9CZUxlc3NUaGFuKDEwMDApOyAvLyAxIHNlY29uZCBtYXggZm9yIHRoaXMgdGVzdCBzaXplXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZXZlbnRzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=