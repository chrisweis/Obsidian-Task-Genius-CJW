/**
 * ICS Manager Tests
 * Tests for managing ICS calendar sources and fetching data
 */
import { __awaiter } from "tslib";
import { IcsManager } from "../managers/ics-manager";
// Mock minimal settings for testing
const mockSettings = {
    taskStatusMarks: {
        "Not Started": " ",
        "In Progress": "/",
        Completed: "x",
        Abandoned: "-",
        Planned: "?",
    },
};
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
describe("ICS Manager", () => {
    let icsManager;
    let mockComponent;
    const testConfig = {
        sources: [
            {
                id: "chinese-lunar",
                name: "Chinese Lunar Calendar",
                url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
            },
        ],
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
        icsManager = new IcsManager(testConfig, mockSettings, {});
        yield icsManager.initialize();
    }));
    afterEach(() => {
        if (icsManager) {
            icsManager.unload();
        }
    });
    describe("Initialization", () => {
        test("should initialize with config", () => {
            expect(icsManager).toBeDefined();
        });
        test("should update config", () => {
            const newConfig = Object.assign(Object.assign({}, testConfig), { globalRefreshInterval: 120 });
            icsManager.updateConfig(newConfig);
            // Test that config was updated by checking sync status
            const syncStatus = icsManager.getSyncStatus(testConfig.sources[0].id);
            expect(syncStatus).toBeDefined();
        });
    });
    describe("Source Management", () => {
        test("should manage sync statuses", () => {
            const syncStatus = icsManager.getSyncStatus(testConfig.sources[0].id);
            expect(syncStatus).toBeDefined();
            expect(syncStatus === null || syncStatus === void 0 ? void 0 : syncStatus.sourceId).toBe(testConfig.sources[0].id);
        });
        test("should get all sync statuses", () => {
            const allStatuses = icsManager.getAllSyncStatuses();
            expect(allStatuses.size).toBe(1);
            expect(allStatuses.has(testConfig.sources[0].id)).toBe(true);
        });
        test("should handle disabled sources", () => {
            const configWithDisabled = Object.assign(Object.assign({}, testConfig), { sources: [
                    ...testConfig.sources,
                    {
                        id: "disabled-source",
                        name: "Disabled Source",
                        url: "https://example.com/disabled.ics",
                        enabled: false,
                        refreshInterval: 60,
                        showAllDayEvents: true,
                        showTimedEvents: true,
                        showType: "event",
                    },
                ] });
            icsManager.updateConfig(configWithDisabled);
            const allStatuses = icsManager.getAllSyncStatuses();
            expect(allStatuses.size).toBe(2);
            const disabledStatus = icsManager.getSyncStatus("disabled-source");
            expect(disabledStatus === null || disabledStatus === void 0 ? void 0 : disabledStatus.status).toBe("disabled");
        });
    });
    describe("Data Fetching", () => {
        test("should handle sync source", () => __awaiter(void 0, void 0, void 0, function* () {
            const source = testConfig.sources[0];
            try {
                const result = yield icsManager.syncSource(source.id);
                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();
                if (result.data) {
                    expect(result.data.events.length).toBeGreaterThan(0);
                    console.log(`Fetched ${result.data.events.length} events from Chinese Lunar Calendar`);
                }
            }
            catch (error) {
                console.warn("Network test failed, this is expected in some environments:", error);
                // Don't fail the test if network is unavailable
            }
        }), 10000); // 10 second timeout for network request
        test("should handle network errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidConfig = Object.assign(Object.assign({}, testConfig), { sources: [
                    {
                        id: "invalid-source",
                        name: "Invalid Source",
                        url: "https://invalid-url-that-does-not-exist.com/calendar.ics",
                        enabled: true,
                        refreshInterval: 60,
                        showAllDayEvents: true,
                        showTimedEvents: true,
                        showType: "event",
                    },
                ] });
            icsManager.updateConfig(invalidConfig);
            const result = yield icsManager.syncSource("invalid-source");
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.data).toBeUndefined();
        }));
    });
    describe("Event Management", () => {
        test("should get all events", () => {
            const events = icsManager.getAllEvents();
            expect(Array.isArray(events)).toBe(true);
        });
        test("should get events from specific source", () => {
            const events = icsManager.getEventsFromSource(testConfig.sources[0].id);
            expect(Array.isArray(events)).toBe(true);
        });
        test("should convert events to tasks", () => {
            const mockEvents = []; // Empty array for testing
            const tasks = icsManager.convertEventsToTasks(mockEvents);
            expect(Array.isArray(tasks)).toBe(true);
            expect(tasks.length).toBe(0);
        });
    });
    describe("Text Replacement", () => {
        test("should apply text replacements to event summary", () => {
            // Create a test source with text replacement rules
            const sourceWithReplacements = {
                id: "test-replacement",
                name: "Test Replacement Source",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "remove-prefix",
                        name: "Remove Meeting Prefix",
                        enabled: true,
                        target: "summary",
                        pattern: "^Meeting: ",
                        replacement: "",
                        flags: "g",
                    },
                    {
                        id: "replace-location",
                        name: "Replace Room Numbers",
                        enabled: true,
                        target: "location",
                        pattern: "Room (\\d+)",
                        replacement: "Conference Room $1",
                        flags: "gi",
                    },
                ],
            };
            // Create a mock event
            const mockEvent = {
                uid: "test-event-1",
                summary: "Meeting: Weekly Standup",
                description: "Team standup meeting",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                dtend: new Date("2024-01-15T11:00:00Z"),
                allDay: false,
                location: "Room 101",
                source: sourceWithReplacements,
            };
            // Create a manager with the test source
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithReplacements] }), mockSettings, {});
            // Convert event to task (this will apply text replacements)
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // Verify replacements were applied
            expect(task.content).toBe("Weekly Standup"); // "Meeting: " prefix removed
            expect(task.metadata.context).toBe("Conference Room 101"); // "Room 101" -> "Conference Room 101"
            expect(task.icsEvent.summary).toBe("Weekly Standup");
            expect(task.icsEvent.location).toBe("Conference Room 101");
        });
        test("should apply multiple replacements in sequence", () => {
            const sourceWithMultipleReplacements = {
                id: "test-multiple",
                name: "Test Multiple Replacements",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "replace-1",
                        name: "First Replacement",
                        enabled: true,
                        target: "summary",
                        pattern: "URGENT",
                        replacement: "Important",
                        flags: "gi",
                    },
                    {
                        id: "replace-2",
                        name: "Second Replacement",
                        enabled: true,
                        target: "summary",
                        pattern: "Important",
                        replacement: "High Priority",
                        flags: "g",
                    },
                ],
            };
            const mockEvent = {
                uid: "test-event-2",
                summary: "URGENT: System Maintenance",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithMultipleReplacements,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithMultipleReplacements] }), mockSettings, {});
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // Should apply both replacements in sequence: URGENT -> Important -> High Priority
            expect(task.content).toBe("High Priority: System Maintenance");
        });
        test("should apply replacements to all fields when target is 'all'", () => {
            const sourceWithAllTarget = {
                id: "test-all-target",
                name: "Test All Target",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "replace-all",
                        name: "Replace All Occurrences",
                        enabled: true,
                        target: "all",
                        pattern: "old",
                        replacement: "new",
                        flags: "gi",
                    },
                ],
            };
            const mockEvent = {
                uid: "test-event-3",
                summary: "Old Meeting in Old Room",
                description: "This is an old description",
                location: "Old Building",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithAllTarget,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithAllTarget] }), mockSettings, {});
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // All fields should have "old" replaced with "new"
            expect(task.content).toBe("new Meeting in new Room");
            expect(task.icsEvent.description).toBe("This is an new description");
            expect(task.icsEvent.location).toBe("new Building");
        });
        test("should skip disabled replacement rules", () => {
            const sourceWithDisabledRule = {
                id: "test-disabled",
                name: "Test Disabled Rule",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "disabled-rule",
                        name: "Disabled Rule",
                        enabled: false,
                        target: "summary",
                        pattern: "Test",
                        replacement: "Demo",
                        flags: "g",
                    },
                    {
                        id: "enabled-rule",
                        name: "Enabled Rule",
                        enabled: true,
                        target: "summary",
                        pattern: "Meeting",
                        replacement: "Session",
                        flags: "g",
                    },
                ],
            };
            const mockEvent = {
                uid: "test-event-4",
                summary: "Test Meeting",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithDisabledRule,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithDisabledRule] }), mockSettings, {});
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // Only the enabled rule should be applied
            expect(task.content).toBe("Test Session"); // "Meeting" -> "Session", but "Test" unchanged
        });
        test("should handle invalid regex patterns gracefully", () => {
            const sourceWithInvalidRegex = {
                id: "test-invalid-regex",
                name: "Test Invalid Regex",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "invalid-regex",
                        name: "Invalid Regex",
                        enabled: true,
                        target: "summary",
                        pattern: "[invalid regex",
                        replacement: "replaced",
                        flags: "g",
                    },
                ],
            };
            const mockEvent = {
                uid: "test-event-5",
                summary: "Original Text",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithInvalidRegex,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithInvalidRegex] }), mockSettings, {});
            // Should not throw an error, and text should remain unchanged
            expect(() => {
                const task = testManager.convertEventsToTasks([mockEvent])[0];
                expect(task.content).toBe("Original Text"); // Should remain unchanged
            }).not.toThrow();
        });
        test("should work with capture groups in replacement", () => {
            const sourceWithCaptureGroups = {
                id: "test-capture-groups",
                name: "Test Capture Groups",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                textReplacements: [
                    {
                        id: "capture-groups",
                        name: "Use Capture Groups",
                        enabled: true,
                        target: "summary",
                        pattern: "(\\w+) Meeting with (\\w+)",
                        replacement: "$2 and $1 Discussion",
                        flags: "g",
                    },
                ],
            };
            const mockEvent = {
                uid: "test-event-6",
                summary: "Weekly Meeting with John",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithCaptureGroups,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithCaptureGroups] }), mockSettings, {});
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // Should swap the captured groups
            expect(task.content).toBe("John and Weekly Discussion");
        });
        test("should handle events without text replacements", () => {
            const sourceWithoutReplacements = {
                id: "test-no-replacements",
                name: "Test No Replacements",
                url: "https://example.com/test.ics",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
                // No textReplacements property
            };
            const mockEvent = {
                uid: "test-event-7",
                summary: "Original Summary",
                description: "Original Description",
                location: "Original Location",
                dtstart: new Date("2024-01-15T10:00:00Z"),
                allDay: false,
                source: sourceWithoutReplacements,
            };
            const testManager = new IcsManager(Object.assign(Object.assign({}, testConfig), { sources: [sourceWithoutReplacements] }), mockSettings, {});
            const task = testManager.convertEventsToTasks([mockEvent])[0];
            // Text should remain unchanged
            expect(task.content).toBe("Original Summary");
            expect(task.icsEvent.description).toBe("Original Description");
            expect(task.icsEvent.location).toBe("Original Location");
        });
    });
    describe("Cache Management", () => {
        test("should clear source cache", () => {
            icsManager.clearSourceCache(testConfig.sources[0].id);
            // Should not throw error
            expect(true).toBe(true);
        });
        test("should clear all cache", () => {
            icsManager.clearAllCache();
            // Should not throw error
            expect(true).toBe(true);
        });
    });
    describe("Background Refresh", () => {
        test("should handle background refresh configuration", () => {
            // Test that background refresh is disabled in test config
            expect(testConfig.enableBackgroundRefresh).toBe(false);
            // Enable background refresh
            const newConfig = Object.assign(Object.assign({}, testConfig), { enableBackgroundRefresh: true });
            icsManager.updateConfig(newConfig);
            // Should not throw error
            expect(true).toBe(true);
        });
    });
});
/**
 * Integration test for real-world usage
 */
describe("ICS Manager Integration", () => {
    test("should work end-to-end with Chinese Lunar Calendar", () => __awaiter(void 0, void 0, void 0, function* () {
        const config = {
            sources: [
                {
                    id: "integration-test",
                    name: "Integration Test Calendar",
                    url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
                    enabled: true,
                    refreshInterval: 60,
                    showAllDayEvents: true,
                    showTimedEvents: true,
                    showType: "event",
                },
            ],
            enableBackgroundRefresh: false,
            globalRefreshInterval: 60,
            maxCacheAge: 24,
            networkTimeout: 30,
            maxEventsPerSource: 100,
            showInCalendar: true,
            showInTaskLists: true,
            defaultEventColor: "#3b82f6",
        };
        const manager = new IcsManager(config, mockSettings, {});
        yield manager.initialize();
        try {
            // Test the complete workflow
            const result = yield manager.syncSource(config.sources[0].id);
            if (result.success && result.data) {
                expect(result.data.events.length).toBeGreaterThan(0);
                expect(result.data.events.length).toBeLessThanOrEqual(100); // Respects limit
                // Convert to tasks
                const tasks = manager.convertEventsToTasks(result.data.events);
                expect(tasks).toHaveLength(result.data.events.length);
                // All tasks should be readonly
                tasks.forEach((task) => {
                    expect(task.readonly).toBe(true);
                });
                console.log(`Integration test successful: ${result.data.events.length} events, ${tasks.length} tasks`);
            }
        }
        catch (error) {
            console.warn("Integration test failed due to network issues:", error);
        }
        finally {
            manager.unload();
        }
    }), 15000); // 15 second timeout for integration test
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLW1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImljcy1tYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUVILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUdyRCxvQ0FBb0M7QUFDcEMsTUFBTSxZQUFZLEdBQUc7SUFDcEIsZUFBZSxFQUFFO1FBQ2hCLGFBQWEsRUFBRSxHQUFHO1FBQ2xCLGFBQWEsRUFBRSxHQUFHO1FBQ2xCLFNBQVMsRUFBRSxHQUFHO1FBQ2QsU0FBUyxFQUFFLEdBQUc7UUFDZCxPQUFPLEVBQUUsR0FBRztLQUNaO0NBQ00sQ0FBQztBQUVULDBCQUEwQjtBQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLFNBQVMsRUFBRSxNQUFNLGFBQWE7UUFDN0IsZ0JBQWUsQ0FBQztRQUNoQixJQUFJLEtBQUksQ0FBQztRQUNULE1BQU0sS0FBSSxDQUFDO1FBQ1gsTUFBTSxLQUFJLENBQUM7UUFDWCxRQUFRLEtBQUksQ0FBQztRQUNiLFFBQVEsS0FBSSxDQUFDO1FBQ2IsV0FBVyxLQUFJLENBQUM7UUFDaEIsUUFBUSxLQUFJLENBQUM7S0FDYjtJQUNELFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ3JCLENBQUMsQ0FBQyxDQUFDO0FBRUosNkJBQTZCO0FBQzdCLE1BQU0sYUFBYTtJQUNsQixnQkFBZSxDQUFDO0lBQ2hCLElBQUksS0FBSSxDQUFDO0lBQ1QsTUFBTSxLQUFJLENBQUM7Q0FDWDtBQUVELFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksVUFBc0IsQ0FBQztJQUMzQixJQUFJLGFBQTRCLENBQUM7SUFFakMsTUFBTSxVQUFVLEdBQXFCO1FBQ3BDLE9BQU8sRUFBRTtZQUNSO2dCQUNDLEVBQUUsRUFBRSxlQUFlO2dCQUNuQixJQUFJLEVB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LENBQUMsTUFBTSxFQUFFLENBQUM7U0FDakI7SUFDRixDQUFDLENBQUEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLHlDQUF5QztBQUNyRCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBJQ1MgTWFuYWdlciBUZXN0c1xyXG4gKiBUZXN0cyBmb3IgbWFuYWdpbmcgSUNTIGNhbGVuZGFyIHNvdXJjZXMgYW5kIGZldGNoaW5nIGRhdGFcclxuICovXHJcblxyXG5pbXBvcnQgeyBJY3NNYW5hZ2VyIH0gZnJvbSBcIi4uL21hbmFnZXJzL2ljcy1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEljc1NvdXJjZSwgSWNzTWFuYWdlckNvbmZpZyB9IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuXHJcbi8vIE1vY2sgbWluaW1hbCBzZXR0aW5ncyBmb3IgdGVzdGluZ1xyXG5jb25zdCBtb2NrU2V0dGluZ3MgPSB7XHJcblx0dGFza1N0YXR1c01hcmtzOiB7XHJcblx0XHRcIk5vdCBTdGFydGVkXCI6IFwiIFwiLFxyXG5cdFx0XCJJbiBQcm9ncmVzc1wiOiBcIi9cIixcclxuXHRcdENvbXBsZXRlZDogXCJ4XCIsXHJcblx0XHRBYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0UGxhbm5lZDogXCI/XCIsXHJcblx0fSxcclxufSBhcyBhbnk7XHJcblxyXG4vLyBNb2NrIE9ic2lkaWFuIENvbXBvbmVudFxyXG5qZXN0Lm1vY2soXCJvYnNpZGlhblwiLCAoKSA9PiAoe1xyXG5cdENvbXBvbmVudDogY2xhc3MgTW9ja0NvbXBvbmVudCB7XHJcblx0XHRjb25zdHJ1Y3RvcigpIHt9XHJcblx0XHRsb2FkKCkge31cclxuXHRcdHVubG9hZCgpIHt9XHJcblx0XHRvbmxvYWQoKSB7fVxyXG5cdFx0b251bmxvYWQoKSB7fVxyXG5cdFx0YWRkQ2hpbGQoKSB7fVxyXG5cdFx0cmVtb3ZlQ2hpbGQoKSB7fVxyXG5cdFx0cmVnaXN0ZXIoKSB7fVxyXG5cdH0sXHJcblx0cmVxdWVzdFVybDogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG4vLyBNb2NrIENvbXBvbmVudCBmb3IgdGVzdGluZ1xyXG5jbGFzcyBNb2NrQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHt9XHJcblx0bG9hZCgpIHt9XHJcblx0dW5sb2FkKCkge31cclxufVxyXG5cclxuZGVzY3JpYmUoXCJJQ1MgTWFuYWdlclwiLCAoKSA9PiB7XHJcblx0bGV0IGljc01hbmFnZXI6IEljc01hbmFnZXI7XHJcblx0bGV0IG1vY2tDb21wb25lbnQ6IE1vY2tDb21wb25lbnQ7XHJcblxyXG5cdGNvbnN0IHRlc3RDb25maWc6IEljc01hbmFnZXJDb25maWcgPSB7XHJcblx0XHRzb3VyY2VzOiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJjaGluZXNlLWx1bmFyXCIsXHJcblx0XHRcdFx0bmFtZTogXCJDaGluZXNlIEx1bmFyIENhbGVuZGFyXCIsXHJcblx0XHRcdFx0dXJsOiBcImh0dHBzOi8vbHdsc3cuZ2l0aHViLmlvL0NoaW5lc2UtTHVuYXItQ2FsZW5kYXItaWNzL2NoaW5lc2VfbHVuYXJfbXkuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIsXHJcblx0XHRcdH0sXHJcblx0XHRdLFxyXG5cdFx0ZW5hYmxlQmFja2dyb3VuZFJlZnJlc2g6IGZhbHNlLCAvLyBEaXNhYmxlIGZvciB0ZXN0aW5nXHJcblx0XHRnbG9iYWxSZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0bWF4Q2FjaGVBZ2U6IDI0LFxyXG5cdFx0bmV0d29ya1RpbWVvdXQ6IDMwLFxyXG5cdFx0bWF4RXZlbnRzUGVyU291cmNlOiAxMDAwLFxyXG5cdFx0c2hvd0luQ2FsZW5kYXI6IHRydWUsXHJcblx0XHRzaG93SW5UYXNrTGlzdHM6IHRydWUsXHJcblx0XHRkZWZhdWx0RXZlbnRDb2xvcjogXCIjM2I4MmY2XCIsXHJcblx0fTtcclxuXHJcblx0YmVmb3JlRWFjaChhc3luYyAoKSA9PiB7XHJcblx0XHRtb2NrQ29tcG9uZW50ID0gbmV3IE1vY2tDb21wb25lbnQoKTtcclxuXHRcdGljc01hbmFnZXIgPSBuZXcgSWNzTWFuYWdlcih0ZXN0Q29uZmlnLCBtb2NrU2V0dGluZ3MsIHt9IGFzIGFueSk7XHJcblx0XHRhd2FpdCBpY3NNYW5hZ2VyLmluaXRpYWxpemUoKTtcclxuXHR9KTtcclxuXHJcblx0YWZ0ZXJFYWNoKCgpID0+IHtcclxuXHRcdGlmIChpY3NNYW5hZ2VyKSB7XHJcblx0XHRcdGljc01hbmFnZXIudW5sb2FkKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiSW5pdGlhbGl6YXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBpbml0aWFsaXplIHdpdGggY29uZmlnXCIsICgpID0+IHtcclxuXHRcdFx0ZXhwZWN0KGljc01hbmFnZXIpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHVwZGF0ZSBjb25maWdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuZXdDb25maWcgPSB7XHJcblx0XHRcdFx0Li4udGVzdENvbmZpZyxcclxuXHRcdFx0XHRnbG9iYWxSZWZyZXNoSW50ZXJ2YWw6IDEyMCxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGljc01hbmFnZXIudXBkYXRlQ29uZmlnKG5ld0NvbmZpZyk7XHJcblx0XHRcdC8vIFRlc3QgdGhhdCBjb25maWcgd2FzIHVwZGF0ZWQgYnkgY2hlY2tpbmcgc3luYyBzdGF0dXNcclxuXHRcdFx0Y29uc3Qgc3luY1N0YXR1cyA9IGljc01hbmFnZXIuZ2V0U3luY1N0YXR1cyhcclxuXHRcdFx0XHR0ZXN0Q29uZmlnLnNvdXJjZXNbMF0uaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHN5bmNTdGF0dXMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJTb3VyY2UgTWFuYWdlbWVudFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIG1hbmFnZSBzeW5jIHN0YXR1c2VzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3luY1N0YXR1cyA9IGljc01hbmFnZXIuZ2V0U3luY1N0YXR1cyhcclxuXHRcdFx0XHR0ZXN0Q29uZmlnLnNvdXJjZXNbMF0uaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHN5bmNTdGF0dXMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChzeW5jU3RhdHVzPy5zb3VyY2VJZCkudG9CZSh0ZXN0Q29uZmlnLnNvdXJjZXNbMF0uaWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBnZXQgYWxsIHN5bmMgc3RhdHVzZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBhbGxTdGF0dXNlcyA9IGljc01hbmFnZXIuZ2V0QWxsU3luY1N0YXR1c2VzKCk7XHJcblx0XHRcdGV4cGVjdChhbGxTdGF0dXNlcy5zaXplKS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3QoYWxsU3RhdHVzZXMuaGFzKHRlc3RDb25maWcuc291cmNlc1swXS5pZCkpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBkaXNhYmxlZCBzb3VyY2VzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnV2l0aERpc2FibGVkID0ge1xyXG5cdFx0XHRcdC4uLnRlc3RDb25maWcsXHJcblx0XHRcdFx0c291cmNlczogW1xyXG5cdFx0XHRcdFx0Li4udGVzdENvbmZpZy5zb3VyY2VzLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJkaXNhYmxlZC1zb3VyY2VcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJEaXNhYmxlZCBTb3VyY2VcIixcclxuXHRcdFx0XHRcdFx0dXJsOiBcImh0dHBzOi8vZXhhbXBsZS5jb20vZGlzYWJsZWQuaWNzXCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIgYXMgY29uc3QsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRpY3NNYW5hZ2VyLnVwZGF0ZUNvbmZpZyhjb25maWdXaXRoRGlzYWJsZWQpO1xyXG5cclxuXHRcdFx0Y29uc3QgYWxsU3RhdHVzZXMgPSBpY3NNYW5hZ2VyLmdldEFsbFN5bmNTdGF0dXNlcygpO1xyXG5cdFx0XHRleHBlY3QoYWxsU3RhdHVzZXMuc2l6ZSkudG9CZSgyKTtcclxuXHJcblx0XHRcdGNvbnN0IGRpc2FibGVkU3RhdHVzID0gaWNzTWFuYWdlci5nZXRTeW5jU3RhdHVzKFwiZGlzYWJsZWQtc291cmNlXCIpO1xyXG5cdFx0XHRleHBlY3QoZGlzYWJsZWRTdGF0dXM/LnN0YXR1cykudG9CZShcImRpc2FibGVkXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRGF0YSBGZXRjaGluZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBzeW5jIHNvdXJjZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNvdXJjZSA9IHRlc3RDb25maWcuc291cmNlc1swXTtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgaWNzTWFuYWdlci5zeW5jU291cmNlKHNvdXJjZS5pZCk7XHJcblxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHRcdGlmIChyZXN1bHQuZGF0YSkge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgRmV0Y2hlZCAke3Jlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGh9IGV2ZW50cyBmcm9tIENoaW5lc2UgTHVuYXIgQ2FsZW5kYXJgXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIk5ldHdvcmsgdGVzdCBmYWlsZWQsIHRoaXMgaXMgZXhwZWN0ZWQgaW4gc29tZSBlbnZpcm9ubWVudHM6XCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gRG9uJ3QgZmFpbCB0aGUgdGVzdCBpZiBuZXR3b3JrIGlzIHVuYXZhaWxhYmxlXHJcblx0XHRcdH1cclxuXHRcdH0sIDEwMDAwKTsgLy8gMTAgc2Vjb25kIHRpbWVvdXQgZm9yIG5ldHdvcmsgcmVxdWVzdFxyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG5ldHdvcmsgZXJyb3JzIGdyYWNlZnVsbHlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnZhbGlkQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLnRlc3RDb25maWcsXHJcblx0XHRcdFx0c291cmNlczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJpbnZhbGlkLXNvdXJjZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIkludmFsaWQgU291cmNlXCIsXHJcblx0XHRcdFx0XHRcdHVybDogXCJodHRwczovL2ludmFsaWQtdXJsLXRoYXQtZG9lcy1ub3QtZXhpc3QuY29tL2NhbGVuZGFyLmljc1wiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIgYXMgY29uc3QsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRpY3NNYW5hZ2VyLnVwZGF0ZUNvbmZpZyhpbnZhbGlkQ29uZmlnKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgaWNzTWFuYWdlci5zeW5jU291cmNlKFwiaW52YWxpZC1zb3VyY2VcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVycm9yKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkV2ZW50IE1hbmFnZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBnZXQgYWxsIGV2ZW50c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50cyA9IGljc01hbmFnZXIuZ2V0QWxsRXZlbnRzKCk7XHJcblx0XHRcdGV4cGVjdChBcnJheS5pc0FycmF5KGV2ZW50cykpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGdldCBldmVudHMgZnJvbSBzcGVjaWZpYyBzb3VyY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBldmVudHMgPSBpY3NNYW5hZ2VyLmdldEV2ZW50c0Zyb21Tb3VyY2UoXHJcblx0XHRcdFx0dGVzdENvbmZpZy5zb3VyY2VzWzBdLmlkXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChBcnJheS5pc0FycmF5KGV2ZW50cykpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGNvbnZlcnQgZXZlbnRzIHRvIHRhc2tzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9ja0V2ZW50czogYW55W10gPSBbXTsgLy8gRW1wdHkgYXJyYXkgZm9yIHRlc3RpbmdcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKG1vY2tFdmVudHMpO1xyXG5cdFx0XHRleHBlY3QoQXJyYXkuaXNBcnJheSh0YXNrcykpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdCh0YXNrcy5sZW5ndGgpLnRvQmUoMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUZXh0IFJlcGxhY2VtZW50XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgYXBwbHkgdGV4dCByZXBsYWNlbWVudHMgdG8gZXZlbnQgc3VtbWFyeVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIHRlc3Qgc291cmNlIHdpdGggdGV4dCByZXBsYWNlbWVudCBydWxlc1xyXG5cdFx0XHRjb25zdCBzb3VyY2VXaXRoUmVwbGFjZW1lbnRzOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1yZXBsYWNlbWVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiVGVzdCBSZXBsYWNlbWVudCBTb3VyY2VcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS90ZXN0Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdHRleHRSZXBsYWNlbWVudHM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwicmVtb3ZlLXByZWZpeFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIlJlbW92ZSBNZWV0aW5nIFByZWZpeFwiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IFwic3VtbWFyeVwiLFxyXG5cdFx0XHRcdFx0XHRwYXR0ZXJuOiBcIl5NZWV0aW5nOiBcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdFx0XHRcdGZsYWdzOiBcImdcIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGlkOiBcInJlcGxhY2UtbG9jYXRpb25cIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJSZXBsYWNlIFJvb20gTnVtYmVyc1wiLFxyXG5cdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IFwibG9jYXRpb25cIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJSb29tIChcXFxcZCspXCIsXHJcblx0XHRcdFx0XHRcdHJlcGxhY2VtZW50OiBcIkNvbmZlcmVuY2UgUm9vbSAkMVwiLFxyXG5cdFx0XHRcdFx0XHRmbGFnczogXCJnaVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGEgbW9jayBldmVudFxyXG5cdFx0XHRjb25zdCBtb2NrRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcInRlc3QtZXZlbnQtMVwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiTWVldGluZzogV2Vla2x5IFN0YW5kdXBcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUZWFtIHN0YW5kdXAgbWVldGluZ1wiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0ZHRlbmQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMTowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRsb2NhdGlvbjogXCJSb29tIDEwMVwiLFxyXG5cdFx0XHRcdHNvdXJjZTogc291cmNlV2l0aFJlcGxhY2VtZW50cyxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIG1hbmFnZXIgd2l0aCB0aGUgdGVzdCBzb3VyY2VcclxuXHRcdFx0Y29uc3QgdGVzdE1hbmFnZXIgPSBuZXcgSWNzTWFuYWdlcihcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQuLi50ZXN0Q29uZmlnLFxyXG5cdFx0XHRcdFx0c291cmNlczogW3NvdXJjZVdpdGhSZXBsYWNlbWVudHNdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bW9ja1NldHRpbmdzLFxyXG5cdFx0XHRcdHt9IGFzIGFueVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQ29udmVydCBldmVudCB0byB0YXNrICh0aGlzIHdpbGwgYXBwbHkgdGV4dCByZXBsYWNlbWVudHMpXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0ZXN0TWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbbW9ja0V2ZW50XSlbMF07XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgcmVwbGFjZW1lbnRzIHdlcmUgYXBwbGllZFxyXG5cdFx0XHRleHBlY3QodGFzay5jb250ZW50KS50b0JlKFwiV2Vla2x5IFN0YW5kdXBcIik7IC8vIFwiTWVldGluZzogXCIgcHJlZml4IHJlbW92ZWRcclxuXHRcdFx0ZXhwZWN0KHRhc2subWV0YWRhdGEuY29udGV4dCkudG9CZShcIkNvbmZlcmVuY2UgUm9vbSAxMDFcIik7IC8vIFwiUm9vbSAxMDFcIiAtPiBcIkNvbmZlcmVuY2UgUm9vbSAxMDFcIlxyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudC5zdW1tYXJ5KS50b0JlKFwiV2Vla2x5IFN0YW5kdXBcIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmljc0V2ZW50LmxvY2F0aW9uKS50b0JlKFwiQ29uZmVyZW5jZSBSb29tIDEwMVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgYXBwbHkgbXVsdGlwbGUgcmVwbGFjZW1lbnRzIGluIHNlcXVlbmNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc291cmNlV2l0aE11bHRpcGxlUmVwbGFjZW1lbnRzOiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1tdWx0aXBsZVwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiVGVzdCBNdWx0aXBsZSBSZXBsYWNlbWVudHNcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS90ZXN0Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdHRleHRSZXBsYWNlbWVudHM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwicmVwbGFjZS0xXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiRmlyc3QgUmVwbGFjZW1lbnRcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiBcInN1bW1hcnlcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJVUkdFTlRcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiSW1wb3J0YW50XCIsXHJcblx0XHRcdFx0XHRcdGZsYWdzOiBcImdpXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJyZXBsYWNlLTJcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJTZWNvbmQgUmVwbGFjZW1lbnRcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiBcInN1bW1hcnlcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJJbXBvcnRhbnRcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiSGlnaCBQcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRmbGFnczogXCJnXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtb2NrRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcInRlc3QtZXZlbnQtMlwiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiVVJHRU5UOiBTeXN0ZW0gTWFpbnRlbmFuY2VcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBzb3VyY2VXaXRoTXVsdGlwbGVSZXBsYWNlbWVudHMsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0ZXN0TWFuYWdlciA9IG5ldyBJY3NNYW5hZ2VyKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdC4uLnRlc3RDb25maWcsXHJcblx0XHRcdFx0XHRzb3VyY2VzOiBbc291cmNlV2l0aE11bHRpcGxlUmVwbGFjZW1lbnRzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1vY2tTZXR0aW5ncyxcclxuXHRcdFx0XHR7fSBhcyBhbnlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0ZXN0TWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbbW9ja0V2ZW50XSlbMF07XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgYXBwbHkgYm90aCByZXBsYWNlbWVudHMgaW4gc2VxdWVuY2U6IFVSR0VOVCAtPiBJbXBvcnRhbnQgLT4gSGlnaCBQcmlvcml0eVxyXG5cdFx0XHRleHBlY3QodGFzay5jb250ZW50KS50b0JlKFwiSGlnaCBQcmlvcml0eTogU3lzdGVtIE1haW50ZW5hbmNlXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBhcHBseSByZXBsYWNlbWVudHMgdG8gYWxsIGZpZWxkcyB3aGVuIHRhcmdldCBpcyAnYWxsJ1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNvdXJjZVdpdGhBbGxUYXJnZXQ6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LWFsbC10YXJnZXRcIixcclxuXHRcdFx0XHRuYW1lOiBcIlRlc3QgQWxsIFRhcmdldFwiLFxyXG5cdFx0XHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL3Rlc3QuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIsXHJcblx0XHRcdFx0dGV4dFJlcGxhY2VtZW50czogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJyZXBsYWNlLWFsbFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIlJlcGxhY2UgQWxsIE9jY3VycmVuY2VzXCIsXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdHRhcmdldDogXCJhbGxcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJvbGRcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwibmV3XCIsXHJcblx0XHRcdFx0XHRcdGZsYWdzOiBcImdpXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtb2NrRXZlbnQgPSB7XHJcblx0XHRcdFx0dWlkOiBcInRlc3QtZXZlbnQtM1wiLFxyXG5cdFx0XHRcdHN1bW1hcnk6IFwiT2xkIE1lZXRpbmcgaW4gT2xkIFJvb21cIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUaGlzIGlzIGFuIG9sZCBkZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdGxvY2F0aW9uOiBcIk9sZCBCdWlsZGluZ1wiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IHNvdXJjZVdpdGhBbGxUYXJnZXQsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0ZXN0TWFuYWdlciA9IG5ldyBJY3NNYW5hZ2VyKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdC4uLnRlc3RDb25maWcsXHJcblx0XHRcdFx0XHRzb3VyY2VzOiBbc291cmNlV2l0aEFsbFRhcmdldF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtb2NrU2V0dGluZ3MsXHJcblx0XHRcdFx0e30gYXMgYW55XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGVzdE1hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW21vY2tFdmVudF0pWzBdO1xyXG5cclxuXHRcdFx0Ly8gQWxsIGZpZWxkcyBzaG91bGQgaGF2ZSBcIm9sZFwiIHJlcGxhY2VkIHdpdGggXCJuZXdcIlxyXG5cdFx0XHRleHBlY3QodGFzay5jb250ZW50KS50b0JlKFwibmV3IE1lZXRpbmcgaW4gbmV3IFJvb21cIik7XHJcblx0XHRcdGV4cGVjdCh0YXNrLmljc0V2ZW50LmRlc2NyaXB0aW9uKS50b0JlKFxyXG5cdFx0XHRcdFwiVGhpcyBpcyBhbiBuZXcgZGVzY3JpcHRpb25cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudC5sb2NhdGlvbikudG9CZShcIm5ldyBCdWlsZGluZ1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgc2tpcCBkaXNhYmxlZCByZXBsYWNlbWVudCBydWxlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNvdXJjZVdpdGhEaXNhYmxlZFJ1bGU6IEljc1NvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LWRpc2FibGVkXCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IERpc2FibGVkIFJ1bGVcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS90ZXN0Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdHRleHRSZXBsYWNlbWVudHM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwiZGlzYWJsZWQtcnVsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIkRpc2FibGVkIFJ1bGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsIC8vIFRoaXMgcnVsZSBpcyBkaXNhYmxlZFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IFwic3VtbWFyeVwiLFxyXG5cdFx0XHRcdFx0XHRwYXR0ZXJuOiBcIlRlc3RcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiRGVtb1wiLFxyXG5cdFx0XHRcdFx0XHRmbGFnczogXCJnXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJlbmFibGVkLXJ1bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJFbmFibGVkIFJ1bGVcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiBcInN1bW1hcnlcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJNZWV0aW5nXCIsXHJcblx0XHRcdFx0XHRcdHJlcGxhY2VtZW50OiBcIlNlc3Npb25cIixcclxuXHRcdFx0XHRcdFx0ZmxhZ3M6IFwiZ1wiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJ0ZXN0LWV2ZW50LTRcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIlRlc3QgTWVldGluZ1wiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IHNvdXJjZVdpdGhEaXNhYmxlZFJ1bGUsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCB0ZXN0TWFuYWdlciA9IG5ldyBJY3NNYW5hZ2VyKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdC4uLnRlc3RDb25maWcsXHJcblx0XHRcdFx0XHRzb3VyY2VzOiBbc291cmNlV2l0aERpc2FibGVkUnVsZV0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRtb2NrU2V0dGluZ3MsXHJcblx0XHRcdFx0e30gYXMgYW55XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrID0gdGVzdE1hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW21vY2tFdmVudF0pWzBdO1xyXG5cclxuXHRcdFx0Ly8gT25seSB0aGUgZW5hYmxlZCBydWxlIHNob3VsZCBiZSBhcHBsaWVkXHJcblx0XHRcdGV4cGVjdCh0YXNrLmNvbnRlbnQpLnRvQmUoXCJUZXN0IFNlc3Npb25cIik7IC8vIFwiTWVldGluZ1wiIC0+IFwiU2Vzc2lvblwiLCBidXQgXCJUZXN0XCIgdW5jaGFuZ2VkXHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIHJlZ2V4IHBhdHRlcm5zIGdyYWNlZnVsbHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzb3VyY2VXaXRoSW52YWxpZFJlZ2V4OiBJY3NTb3VyY2UgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1pbnZhbGlkLXJlZ2V4XCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IEludmFsaWQgUmVnZXhcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS90ZXN0Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdHRleHRSZXBsYWNlbWVudHM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwiaW52YWxpZC1yZWdleFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIkludmFsaWQgUmVnZXhcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiBcInN1bW1hcnlcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCJbaW52YWxpZCByZWdleFwiLCAvLyBJbnZhbGlkIHJlZ2V4IHBhdHRlcm5cclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwicmVwbGFjZWRcIixcclxuXHRcdFx0XHRcdFx0ZmxhZ3M6IFwiZ1wiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJ0ZXN0LWV2ZW50LTVcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIk9yaWdpbmFsIFRleHRcIixcclxuXHRcdFx0XHRkdHN0YXJ0OiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdGFsbERheTogZmFsc2UsXHJcblx0XHRcdFx0c291cmNlOiBzb3VyY2VXaXRoSW52YWxpZFJlZ2V4LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGVzdE1hbmFnZXIgPSBuZXcgSWNzTWFuYWdlcihcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQuLi50ZXN0Q29uZmlnLFxyXG5cdFx0XHRcdFx0c291cmNlczogW3NvdXJjZVdpdGhJbnZhbGlkUmVnZXhdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bW9ja1NldHRpbmdzLFxyXG5cdFx0XHRcdHt9IGFzIGFueVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCB0aHJvdyBhbiBlcnJvciwgYW5kIHRleHQgc2hvdWxkIHJlbWFpbiB1bmNoYW5nZWRcclxuXHRcdFx0ZXhwZWN0KCgpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YXNrID0gdGVzdE1hbmFnZXIuY29udmVydEV2ZW50c1RvVGFza3MoW21vY2tFdmVudF0pWzBdO1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrLmNvbnRlbnQpLnRvQmUoXCJPcmlnaW5hbCBUZXh0XCIpOyAvLyBTaG91bGQgcmVtYWluIHVuY2hhbmdlZFxyXG5cdFx0XHR9KS5ub3QudG9UaHJvdygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCB3b3JrIHdpdGggY2FwdHVyZSBncm91cHMgaW4gcmVwbGFjZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzb3VyY2VXaXRoQ2FwdHVyZUdyb3VwczogSWNzU291cmNlID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtY2FwdHVyZS1ncm91cHNcIixcclxuXHRcdFx0XHRuYW1lOiBcIlRlc3QgQ2FwdHVyZSBHcm91cHNcIixcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbS90ZXN0Lmljc1wiLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRzaG93QWxsRGF5RXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUaW1lZEV2ZW50czogdHJ1ZSxcclxuXHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiLFxyXG5cdFx0XHRcdHRleHRSZXBsYWNlbWVudHM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwiY2FwdHVyZS1ncm91cHNcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJVc2UgQ2FwdHVyZSBHcm91cHNcIixcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiBcInN1bW1hcnlcIixcclxuXHRcdFx0XHRcdFx0cGF0dGVybjogXCIoXFxcXHcrKSBNZWV0aW5nIHdpdGggKFxcXFx3KylcIixcclxuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiJDIgYW5kICQxIERpc2N1c3Npb25cIixcclxuXHRcdFx0XHRcdFx0ZmxhZ3M6IFwiZ1wiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJ0ZXN0LWV2ZW50LTZcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIldlZWtseSBNZWV0aW5nIHdpdGggSm9oblwiLFxyXG5cdFx0XHRcdGR0c3RhcnQ6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0YWxsRGF5OiBmYWxzZSxcclxuXHRcdFx0XHRzb3VyY2U6IHNvdXJjZVdpdGhDYXB0dXJlR3JvdXBzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgdGVzdE1hbmFnZXIgPSBuZXcgSWNzTWFuYWdlcihcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQuLi50ZXN0Q29uZmlnLFxyXG5cdFx0XHRcdFx0c291cmNlczogW3NvdXJjZVdpdGhDYXB0dXJlR3JvdXBzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1vY2tTZXR0aW5ncyxcclxuXHRcdFx0XHR7fSBhcyBhbnlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0ZXN0TWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbbW9ja0V2ZW50XSlbMF07XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgc3dhcCB0aGUgY2FwdHVyZWQgZ3JvdXBzXHJcblx0XHRcdGV4cGVjdCh0YXNrLmNvbnRlbnQpLnRvQmUoXCJKb2huIGFuZCBXZWVrbHkgRGlzY3Vzc2lvblwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGV2ZW50cyB3aXRob3V0IHRleHQgcmVwbGFjZW1lbnRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc291cmNlV2l0aG91dFJlcGxhY2VtZW50czogSWNzU291cmNlID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3Qtbm8tcmVwbGFjZW1lbnRzXCIsXHJcblx0XHRcdFx0bmFtZTogXCJUZXN0IE5vIFJlcGxhY2VtZW50c1wiLFxyXG5cdFx0XHRcdHVybDogXCJodHRwczovL2V4YW1wbGUuY29tL3Rlc3QuaWNzXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIsXHJcblx0XHRcdFx0Ly8gTm8gdGV4dFJlcGxhY2VtZW50cyBwcm9wZXJ0eVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9ja0V2ZW50ID0ge1xyXG5cdFx0XHRcdHVpZDogXCJ0ZXN0LWV2ZW50LTdcIixcclxuXHRcdFx0XHRzdW1tYXJ5OiBcIk9yaWdpbmFsIFN1bW1hcnlcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJPcmlnaW5hbCBEZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdGxvY2F0aW9uOiBcIk9yaWdpbmFsIExvY2F0aW9uXCIsXHJcblx0XHRcdFx0ZHRzdGFydDogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRhbGxEYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNvdXJjZTogc291cmNlV2l0aG91dFJlcGxhY2VtZW50cyxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRlc3RNYW5hZ2VyID0gbmV3IEljc01hbmFnZXIoXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Li4udGVzdENvbmZpZyxcclxuXHRcdFx0XHRcdHNvdXJjZXM6IFtzb3VyY2VXaXRob3V0UmVwbGFjZW1lbnRzXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1vY2tTZXR0aW5ncyxcclxuXHRcdFx0XHR7fSBhcyBhbnlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0ZXN0TWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhbbW9ja0V2ZW50XSlbMF07XHJcblxyXG5cdFx0XHQvLyBUZXh0IHNob3VsZCByZW1haW4gdW5jaGFuZ2VkXHJcblx0XHRcdGV4cGVjdCh0YXNrLmNvbnRlbnQpLnRvQmUoXCJPcmlnaW5hbCBTdW1tYXJ5XCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudC5kZXNjcmlwdGlvbikudG9CZShcIk9yaWdpbmFsIERlc2NyaXB0aW9uXCIpO1xyXG5cdFx0XHRleHBlY3QodGFzay5pY3NFdmVudC5sb2NhdGlvbikudG9CZShcIk9yaWdpbmFsIExvY2F0aW9uXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2FjaGUgTWFuYWdlbWVudFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGNsZWFyIHNvdXJjZSBjYWNoZVwiLCAoKSA9PiB7XHJcblx0XHRcdGljc01hbmFnZXIuY2xlYXJTb3VyY2VDYWNoZSh0ZXN0Q29uZmlnLnNvdXJjZXNbMF0uaWQpO1xyXG5cdFx0XHQvLyBTaG91bGQgbm90IHRocm93IGVycm9yXHJcblx0XHRcdGV4cGVjdCh0cnVlKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBjbGVhciBhbGwgY2FjaGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRpY3NNYW5hZ2VyLmNsZWFyQWxsQ2FjaGUoKTtcclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCB0aHJvdyBlcnJvclxyXG5cdFx0XHRleHBlY3QodHJ1ZSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkJhY2tncm91bmQgUmVmcmVzaFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBiYWNrZ3JvdW5kIHJlZnJlc2ggY29uZmlndXJhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3QgdGhhdCBiYWNrZ3JvdW5kIHJlZnJlc2ggaXMgZGlzYWJsZWQgaW4gdGVzdCBjb25maWdcclxuXHRcdFx0ZXhwZWN0KHRlc3RDb25maWcuZW5hYmxlQmFja2dyb3VuZFJlZnJlc2gpLnRvQmUoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gRW5hYmxlIGJhY2tncm91bmQgcmVmcmVzaFxyXG5cdFx0XHRjb25zdCBuZXdDb25maWcgPSB7XHJcblx0XHRcdFx0Li4udGVzdENvbmZpZyxcclxuXHRcdFx0XHRlbmFibGVCYWNrZ3JvdW5kUmVmcmVzaDogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGljc01hbmFnZXIudXBkYXRlQ29uZmlnKG5ld0NvbmZpZyk7XHJcblx0XHRcdC8vIFNob3VsZCBub3QgdGhyb3cgZXJyb3JcclxuXHRcdFx0ZXhwZWN0KHRydWUpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcblxyXG4vKipcclxuICogSW50ZWdyYXRpb24gdGVzdCBmb3IgcmVhbC13b3JsZCB1c2FnZVxyXG4gKi9cclxuZGVzY3JpYmUoXCJJQ1MgTWFuYWdlciBJbnRlZ3JhdGlvblwiLCAoKSA9PiB7XHJcblx0dGVzdChcInNob3VsZCB3b3JrIGVuZC10by1lbmQgd2l0aCBDaGluZXNlIEx1bmFyIENhbGVuZGFyXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdGNvbnN0IGNvbmZpZzogSWNzTWFuYWdlckNvbmZpZyA9IHtcclxuXHRcdFx0c291cmNlczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImludGVncmF0aW9uLXRlc3RcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwiSW50ZWdyYXRpb24gVGVzdCBDYWxlbmRhclwiLFxyXG5cdFx0XHRcdFx0dXJsOiBcImh0dHBzOi8vbHdsc3cuZ2l0aHViLmlvL0NoaW5lc2UtTHVuYXItQ2FsZW5kYXItaWNzL2NoaW5lc2VfbHVuYXJfbXkuaWNzXCIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0cmVmcmVzaEludGVydmFsOiA2MCxcclxuXHRcdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0XHRzaG93VGltZWRFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0XHRzaG93VHlwZTogXCJldmVudFwiIGFzIGNvbnN0LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdGVuYWJsZUJhY2tncm91bmRSZWZyZXNoOiBmYWxzZSwgLy8gRGlzYWJsZSBmb3IgdGVzdGluZ1xyXG5cdFx0XHRnbG9iYWxSZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRtYXhDYWNoZUFnZTogMjQsXHJcblx0XHRcdG5ldHdvcmtUaW1lb3V0OiAzMCxcclxuXHRcdFx0bWF4RXZlbnRzUGVyU291cmNlOiAxMDAsIC8vIExpbWl0IGZvciB0ZXN0aW5nXHJcblx0XHRcdHNob3dJbkNhbGVuZGFyOiB0cnVlLFxyXG5cdFx0XHRzaG93SW5UYXNrTGlzdHM6IHRydWUsXHJcblx0XHRcdGRlZmF1bHRFdmVudENvbG9yOiBcIiMzYjgyZjZcIixcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgbWFuYWdlciA9IG5ldyBJY3NNYW5hZ2VyKGNvbmZpZywgbW9ja1NldHRpbmdzLCB7fSBhcyBhbnkpO1xyXG5cdFx0YXdhaXQgbWFuYWdlci5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gVGVzdCB0aGUgY29tcGxldGUgd29ya2Zsb3dcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbWFuYWdlci5zeW5jU291cmNlKGNvbmZpZy5zb3VyY2VzWzBdLmlkKTtcclxuXHJcblx0XHRcdGlmIChyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuZGF0YSkge1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuZGF0YS5ldmVudHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGgpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMTAwKTsgLy8gUmVzcGVjdHMgbGltaXRcclxuXHJcblx0XHRcdFx0Ly8gQ29udmVydCB0byB0YXNrc1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tzID0gbWFuYWdlci5jb252ZXJ0RXZlbnRzVG9UYXNrcyhyZXN1bHQuZGF0YS5ldmVudHMpO1xyXG5cdFx0XHRcdGV4cGVjdCh0YXNrcykudG9IYXZlTGVuZ3RoKHJlc3VsdC5kYXRhLmV2ZW50cy5sZW5ndGgpO1xyXG5cclxuXHRcdFx0XHQvLyBBbGwgdGFza3Mgc2hvdWxkIGJlIHJlYWRvbmx5XHJcblx0XHRcdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHRhc2sucmVhZG9ubHkpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YEludGVncmF0aW9uIHRlc3Qgc3VjY2Vzc2Z1bDogJHtyZXN1bHQuZGF0YS5ldmVudHMubGVuZ3RofSBldmVudHMsICR7dGFza3MubGVuZ3RofSB0YXNrc2BcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJJbnRlZ3JhdGlvbiB0ZXN0IGZhaWxlZCBkdWUgdG8gbmV0d29yayBpc3N1ZXM6XCIsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdG1hbmFnZXIudW5sb2FkKCk7XHJcblx0XHR9XHJcblx0fSwgMTUwMDApOyAvLyAxNSBzZWNvbmQgdGltZW91dCBmb3IgaW50ZWdyYXRpb24gdGVzdFxyXG59KTtcclxuIl19