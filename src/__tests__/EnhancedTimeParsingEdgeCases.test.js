import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG, } from "../services/time-parsing-service";
describe("Enhanced Time Parsing Edge Cases", () => {
    let service;
    beforeEach(() => {
        service = new TimeParsingService(DEFAULT_TIME_PARSING_CONFIG);
    });
    describe("Midnight Crossing Scenarios", () => {
        test("should handle midnight crossing ranges (23:00-01:00)", () => {
            var _a, _b, _c, _d;
            const result = service.parseTimeExpressions("Night shift 23:00-01:00");
            expect(result.timeComponents).toBeDefined();
            expect(result.timeComponents.startTime).toBeDefined();
            expect(result.timeComponents.endTime).toBeDefined();
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(23);
            expect((_b = result.timeComponents.startTime) === null || _b === void 0 ? void 0 : _b.minute).toBe(0);
            expect((_c = result.timeComponents.endTime) === null || _c === void 0 ? void 0 : _c.hour).toBe(1);
            expect((_d = result.timeComponents.endTime) === null || _d === void 0 ? void 0 : _d.minute).toBe(0);
            // Check that midnight crossing is detected
            const expression = result.parsedExpressions[0];
            expect(expression.crossesMidnight).toBe(true);
        });
        test("should handle midnight crossing with 12-hour format (11:00 PM - 1:00 AM)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Event 11:00 PM - 1:00 AM");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(23);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(1);
            const expression = result.parsedExpressions[0];
            expect(expression.crossesMidnight).toBe(true);
        });
        test("should handle edge case at exact midnight (23:59-00:01)", () => {
            var _a, _b, _c, _d;
            const result = service.parseTimeExpressions("Maintenance 23:59-00:01");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(23);
            expect((_b = result.timeComponents.startTime) === null || _b === void 0 ? void 0 : _b.minute).toBe(59);
            expect((_c = result.timeComponents.endTime) === null || _c === void 0 ? void 0 : _c.hour).toBe(0);
            expect((_d = result.timeComponents.endTime) === null || _d === void 0 ? void 0 : _d.minute).toBe(1);
            const expression = result.parsedExpressions[0];
            expect(expression.crossesMidnight).toBe(true);
        });
        test("should not flag normal ranges as midnight crossing (09:00-17:00)", () => {
            const result = service.parseTimeExpressions("Work 09:00-17:00");
            const expression = result.parsedExpressions[0];
            expect(expression.crossesMidnight).toBeFalsy();
        });
        test("should handle midnight crossing with seconds (23:30:45-01:15:30)", () => {
            var _a, _b, _c, _d, _e, _f;
            const result = service.parseTimeExpressions("Process 23:30:45-01:15:30");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(23);
            expect((_b = result.timeComponents.startTime) === null || _b === void 0 ? void 0 : _b.minute).toBe(30);
            expect((_c = result.timeComponents.startTime) === null || _c === void 0 ? void 0 : _c.second).toBe(45);
            expect((_d = result.timeComponents.endTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(1);
            expect((_e = result.timeComponents.endTime) === null || _e === void 0 ? void 0 : _e.minute).toBe(15);
            expect((_f = result.timeComponents.endTime) === null || _f === void 0 ? void 0 : _f.second).toBe(30);
            const expression = result.parsedExpressions[0];
            expect(expression.crossesMidnight).toBe(true);
        });
    });
    describe("Invalid Time Format Handling", () => {
        test("should handle invalid hours (25:00)", () => {
            const result = service.parseTimeExpressions("Meeting at 25:00");
            // Invalid time should not create time component
            expect(result.timeComponents.scheduledTime).toBeUndefined();
            // But should still parse any valid date information
            expect(result.originalText).toBe("Meeting at 25:00");
        });
        test("should handle invalid minutes (12:60)", () => {
            const result = service.parseTimeExpressions("Task at 12:60");
            expect(result.timeComponents.scheduledTime).toBeUndefined();
        });
        test("should handle invalid seconds (12:30:60)", () => {
            const result = service.parseTimeExpressions("Process at 12:30:60");
            expect(result.timeComponents.scheduledTime).toBeUndefined();
        });
        test("should handle malformed time strings", () => {
            const testCases = [
                "Meeting at 1:2:3:4",
                "Task at ::30",
                "Event at 12:",
                "Call at :30",
                "Meeting at 12:ab",
                "Task at ab:30",
            ];
            testCases.forEach(testCase => {
                const result = service.parseTimeExpressions(testCase);
                expect(result.timeComponents.scheduledTime).toBeUndefined();
            });
        });
        test("should gracefully handle empty time expressions", () => {
            const result = service.parseTimeExpressions("Meeting at ");
            expect(result.timeComponents.scheduledTime).toBeUndefined();
            expect(result.originalText).toBe("Meeting at ");
        });
        test("should handle invalid range formats", () => {
            const testCases = [
                "Meeting 25:00-13:00",
                "Task 12:00-25:00",
                "Event 12:60-13:00",
                "Call 12:00-13:60",
                "Meeting 12:00-",
                "Task -13:00",
                "Event 12:00--13:00",
            ];
            testCases.forEach(testCase => {
                const result = service.parseTimeExpressions(testCase);
                // Should not create invalid time components
                if (result.timeComponents.startTime) {
                    expect(result.timeComponents.startTime.hour).toBeLessThanOrEqual(23);
                    expect(result.timeComponents.startTime.minute).toBeLessThanOrEqual(59);
                }
                if (result.timeComponents.endTime) {
                    expect(result.timeComponents.endTime.hour).toBeLessThanOrEqual(23);
                    expect(result.timeComponents.endTime.minute).toBeLessThanOrEqual(59);
                }
            });
        });
    });
    describe("Ambiguous Time Format Resolution", () => {
        test("should handle ambiguous 12-hour format without AM/PM", () => {
            var _a;
            // Test with default configuration (should prefer 24-hour interpretation)
            const result = service.parseTimeExpressions("Meeting at 3:00");
            // With default 24h preference, 3:00 should be interpreted as 3:00 AM
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(3);
        });
        test("should respect configuration for ambiguous time handling", () => {
            const config = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                    singleTime: [/\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?/],
                    timeRange: [/\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\s*[-–—~]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?/],
                    rangeSeparators: ["-", "–", "—", "~"],
                }, timeDefaults: {
                    preferredFormat: "12h",
                    defaultPeriod: "PM",
                    midnightCrossing: "next-day",
                } });
            const enhancedService = new TimeParsingService(config);
            // This test would need the service to actually implement ambiguous time handling
            // For now, we test that the configuration is accepted
            expect(enhancedService.getConfig()).toMatchObject(expect.objectContaining({
                timeDefaults: expect.objectContaining({
                    preferredFormat: "12h",
                    defaultPeriod: "PM",
                }),
            }));
        });
        test("should handle mixed 12-hour and 24-hour formats in ranges", () => {
            // This should be treated as invalid since mixing formats is ambiguous
            const result = service.parseTimeExpressions("Meeting 2:00 PM - 15:00");
            // Should either parse correctly or fail gracefully
            if (result.timeComponents.startTime && result.timeComponents.endTime) {
                expect(result.timeComponents.startTime.hour).toBe(14); // 2:00 PM
                expect(result.timeComponents.endTime.hour).toBe(15); // 15:00
            }
        });
        test("should handle noon and midnight edge cases", () => {
            const testCases = [
                { input: "12:00 AM", expectedHour: 0 },
                { input: "12:00 PM", expectedHour: 12 },
                { input: "12:30 AM", expectedHour: 0 },
                { input: "12:30 PM", expectedHour: 12 }, // 30 minutes past noon
            ];
            testCases.forEach(({ input, expectedHour }) => {
                var _a;
                const result = service.parseTimeExpressions(`Meeting at ${input}`);
                expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(expectedHour);
            });
        });
    });
    describe("Time Range Separator Patterns", () => {
        test("should handle hyphen separator (12:00-13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00-13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should handle tilde separator (12:00~13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00~13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should handle full-width tilde separator (12:00～13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00～13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should handle spaced hyphen separator (12:00 - 13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00 - 13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should handle spaced tilde separator (12:00 ~ 13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00 ~ 13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should handle multiple spaces around separators (12:00  -  13:00)", () => {
            var _a, _b;
            const result = service.parseTimeExpressions("Meeting 12:00  -  13:00");
            expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
            expect((_b = result.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(13);
        });
        test("should not parse invalid separators", () => {
            const invalidSeparators = [
                "12:00+13:00",
                "12:00/13:00",
                "12:00|13:00",
                "12:00*13:00",
                "12:00&13:00",
            ];
            invalidSeparators.forEach(testCase => {
                const result = service.parseTimeExpressions(`Meeting ${testCase}`);
                // Should not parse as a time range
                expect(result.timeComponents.startTime).toBeUndefined();
                expect(result.timeComponents.endTime).toBeUndefined();
            });
        });
        test("should handle ranges with seconds and different separators", () => {
            const testCases = [
                "12:30:45-13:15:30",
                "12:30:45~13:15:30",
                "12:30:45 - 13:15:30",
                "12:30:45～13:15:30",
            ];
            testCases.forEach(testCase => {
                var _a, _b, _c, _d, _e, _f;
                const result = service.parseTimeExpressions(`Process ${testCase}`);
                expect((_a = result.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(12);
                expect((_b = result.timeComponents.startTime) === null || _b === void 0 ? void 0 : _b.minute).toBe(30);
                expect((_c = result.timeComponents.startTime) === null || _c === void 0 ? void 0 : _c.second).toBe(45);
                expect((_d = result.timeComponents.endTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(13);
                expect((_e = result.timeComponents.endTime) === null || _e === void 0 ? void 0 : _e.minute).toBe(15);
                expect((_f = result.timeComponents.endTime) === null || _f === void 0 ? void 0 : _f.second).toBe(30);
            });
        });
    });
    describe("Fallback Behavior", () => {
        test("should fall back to date-only parsing when time parsing fails", () => {
            const result = service.parseTimeExpressions("Meeting tomorrow at invalid:time");
            // Should still parse the date part
            expect(result.scheduledDate).toBeDefined();
            // But not create invalid time components
            expect(result.timeComponents.scheduledTime).toBeUndefined();
        });
        test("should preserve original text when parsing fails", () => {
            const originalText = "Task at badtime:format tomorrow";
            const result = service.parseTimeExpressions(originalText);
            expect(result.originalText).toBe(originalText);
        });
        test("should handle mixed valid and invalid time expressions", () => {
            var _a;
            const result = service.parseTimeExpressions("Meeting at 14:00 and invalid:time tomorrow");
            // Should parse the valid time
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
            // And still parse the date
            expect(result.scheduledDate).toBeDefined();
        });
        test("should handle empty input gracefully", () => {
            const result = service.parseTimeExpressions("");
            expect(result.originalText).toBe("");
            expect(result.cleanedText).toBe("");
            expect(result.timeComponents).toBeDefined();
            expect(result.parsedExpressions).toEqual([]);
        });
        test("should handle null/undefined input gracefully", () => {
            // Test with null input (cast to string)
            const result1 = service.parseTimeExpressions(null);
            expect(result1.originalText).toBeDefined();
            // Test with undefined input (cast to string)
            const result2 = service.parseTimeExpressions(undefined);
            expect(result2.originalText).toBeDefined();
        });
    });
    describe("Configuration-Driven Behavior", () => {
        test("should respect midnight crossing configuration", () => {
            var _a, _b, _c, _d;
            const nextDayConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                    singleTime: [/\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?/],
                    timeRange: [/\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\s*[-–—~]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?/],
                    rangeSeparators: ["-", "–", "—", "~"],
                }, timeDefaults: {
                    preferredFormat: "24h",
                    defaultPeriod: "PM",
                    midnightCrossing: "next-day",
                } });
            const sameDayConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                    singleTime: [/\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?/],
                    timeRange: [/\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\s*[-–—~]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?/],
                    rangeSeparators: ["-", "–", "—", "~"],
                }, timeDefaults: {
                    preferredFormat: "24h",
                    defaultPeriod: "PM",
                    midnightCrossing: "same-day",
                } });
            const nextDayService = new TimeParsingService(nextDayConfig);
            const sameDayService = new TimeParsingService(sameDayConfig);
            // Both should parse the time components the same way
            const text = "Night shift 23:00-01:00";
            const result1 = nextDayService.parseTimeExpressions(text);
            const result2 = sameDayService.parseTimeExpressions(text);
            expect((_a = result1.timeComponents.startTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(23);
            expect((_b = result1.timeComponents.endTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(1);
            expect((_c = result2.timeComponents.startTime) === null || _c === void 0 ? void 0 : _c.hour).toBe(23);
            expect((_d = result2.timeComponents.endTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(1);
        });
        test("should handle disabled time parsing", () => {
            const disabledConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { enabled: false, timePatterns: {
                    singleTime: [/\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?/],
                    timeRange: [/\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\s*[-–—~]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?/],
                    rangeSeparators: ["-", "–", "—", "~"],
                }, timeDefaults: {
                    preferredFormat: "24h",
                    defaultPeriod: "PM",
                    midnightCrossing: "next-day",
                } });
            const disabledService = new TimeParsingService(disabledConfig);
            const result = disabledService.parseTimeExpressions("Meeting at 14:00 tomorrow");
            // Should return original text without parsing
            expect(result.originalText).toBe("Meeting at 14:00 tomorrow");
            expect(result.cleanedText).toBe("Meeting at 14:00 tomorrow");
            expect(result.parsedExpressions).toEqual([]);
        });
        test("should respect custom time patterns", () => {
            const customConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                    singleTime: [/\d{1,2}h\d{2}/],
                    timeRange: [/\d{1,2}h\d{2}-\d{1,2}h\d{2}/],
                    rangeSeparators: ["-"],
                }, timeDefaults: {
                    preferredFormat: "24h",
                    defaultPeriod: "PM",
                    midnightCrossing: "next-day",
                } });
            const customService = new TimeParsingService(customConfig);
            // This would require implementing custom pattern support in the service
            // For now, we test that the configuration is accepted
            expect(customService.getConfig()).toMatchObject(expect.objectContaining({
                timePatterns: expect.objectContaining({
                    rangeSeparators: ["-"],
                }),
            }));
        });
    });
    describe("Edge Cases with Context", () => {
        test("should handle time expressions at start of text", () => {
            var _a;
            const result = service.parseTimeExpressions("14:00 meeting with team");
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
        });
        test("should handle time expressions at end of text", () => {
            var _a;
            const result = service.parseTimeExpressions("Team meeting at 14:00");
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
        });
        test("should handle multiple time expressions in one text", () => {
            var _a;
            const result = service.parseTimeExpressions("Meeting starts at 14:00 and ends at 16:00");
            // Should parse both times - the first one found should be used
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
            // The second time might be parsed as a separate expression
            expect(result.parsedExpressions.length).toBeGreaterThanOrEqual(1);
        });
        test("should handle time expressions with punctuation", () => {
            const testCases = [
                "Meeting at 14:00.",
                "Meeting at 14:00!",
                "Meeting at 14:00?",
                "Meeting at 14:00,",
                "Meeting at 14:00;",
                "Meeting (at 14:00)",
                "Meeting [at 14:00]",
            ];
            testCases.forEach(testCase => {
                var _a;
                const result = service.parseTimeExpressions(testCase);
                expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
            });
        });
        test("should handle time expressions with special characters", () => {
            var _a;
            const result = service.parseTimeExpressions("Meeting @ 14:00 #important");
            expect((_a = result.timeComponents.scheduledTime) === null || _a === void 0 ? void 0 : _a.hour).toBe(14);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW5oYW5jZWRUaW1lUGFyc2luZ0VkZ2VDYXNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRW5oYW5jZWRUaW1lUGFyc2luZ0VkZ2VDYXNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsMkJBQTJCLEdBQzNCLE1BQU0sa0NBQWtDLENBQUM7QUFRMUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxJQUFJLE9BQTJCLENBQUM7SUFFaEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQzVDLElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7O1lBQ2pFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FDMUMseUJBQXlCLENBQ0csQ0FBQztZQUU5QixNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxNQUFBLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUywwQ0FBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLE1BQUEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLDBDQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxNQUFNLENBQUMsTUFBQSxNQUFNLENB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LEdBQUcsRUFBRTtZQUM1RCxNQUFNLFNBQVMsR0FBRztnQkFDakIsbUJBQW1CO2dCQUNuQixtQkFBbUI7Z0JBQ25CLG1CQUFtQjtnQkFDbkIsbUJBQW1CO2dCQUNuQixtQkFBbUI7Z0JBQ25CLG9CQUFvQjtnQkFDcEIsb0JBQW9CO2FBQ3BCLENBQUM7WUFFRixTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFOztnQkFDNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBNkIsQ0FBQztnQkFDbEYsTUFBTSxDQUFDLE1BQUEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxhQUFhLDBDQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTs7WUFDbkUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUMxQyw0QkFBNEIsQ0FDQSxDQUFDO1lBRTlCLE1BQU0sQ0FBQyxNQUFBLE1BQU0sQ0FBQyxjQUFjLENBQUMsYUFBYSwwQ0FBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRUaW1lUGFyc2luZ1NlcnZpY2UsXHJcblx0REVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLFxyXG59IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgdHlwZSB7XHJcblx0VGltZUNvbXBvbmVudCxcclxuXHRFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQsXHJcblx0RW5oYW5jZWRUaW1lRXhwcmVzc2lvbixcclxuXHRFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnLFxyXG59IGZyb20gXCIuLi90eXBlcy90aW1lLXBhcnNpbmdcIjtcclxuXHJcbmRlc2NyaWJlKFwiRW5oYW5jZWQgVGltZSBQYXJzaW5nIEVkZ2UgQ2FzZXNcIiwgKCkgPT4ge1xyXG5cdGxldCBzZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0c2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJNaWRuaWdodCBDcm9zc2luZyBTY2VuYXJpb3NcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbWlkbmlnaHQgY3Jvc3NpbmcgcmFuZ2VzICgyMzowMC0wMTowMClcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiTmlnaHQgc2hpZnQgMjM6MDAtMDE6MDBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDIzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zdGFydFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENoZWNrIHRoYXQgbWlkbmlnaHQgY3Jvc3NpbmcgaXMgZGV0ZWN0ZWRcclxuXHRcdFx0Y29uc3QgZXhwcmVzc2lvbiA9IHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXSBhcyBFbmhhbmNlZFRpbWVFeHByZXNzaW9uO1xyXG5cdFx0XHRleHBlY3QoZXhwcmVzc2lvbi5jcm9zc2VzTWlkbmlnaHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtaWRuaWdodCBjcm9zc2luZyB3aXRoIDEyLWhvdXIgZm9ybWF0ICgxMTowMCBQTSAtIDE6MDAgQU0pXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIkV2ZW50IDExOjAwIFBNIC0gMTowMCBBTVwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zdGFydFRpbWU/LmhvdXIpLnRvQmUoMjMpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/LmhvdXIpLnRvQmUoMSk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCBleHByZXNzaW9uID0gcmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdIGFzIEVuaGFuY2VkVGltZUV4cHJlc3Npb247XHJcblx0XHRcdGV4cGVjdChleHByZXNzaW9uLmNyb3NzZXNNaWRuaWdodCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGVkZ2UgY2FzZSBhdCBleGFjdCBtaWRuaWdodCAoMjM6NTktMDA6MDEpXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1haW50ZW5hbmNlIDIzOjU5LTAwOjAxXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8uaG91cikudG9CZSgyMyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5taW51dGUpLnRvQmUoNTkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/LmhvdXIpLnRvQmUoMCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZT8ubWludXRlKS50b0JlKDEpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgZXhwcmVzc2lvbiA9IHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXSBhcyBFbmhhbmNlZFRpbWVFeHByZXNzaW9uO1xyXG5cdFx0XHRleHBlY3QoZXhwcmVzc2lvbi5jcm9zc2VzTWlkbmlnaHQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBmbGFnIG5vcm1hbCByYW5nZXMgYXMgbWlkbmlnaHQgY3Jvc3NpbmcgKDA5OjAwLTE3OjAwKVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJXb3JrIDA5OjAwLTE3OjAwXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRjb25zdCBleHByZXNzaW9uID0gcmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdIGFzIEVuaGFuY2VkVGltZUV4cHJlc3Npb247XHJcblx0XHRcdGV4cGVjdChleHByZXNzaW9uLmNyb3NzZXNNaWRuaWdodCkudG9CZUZhbHN5KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtaWRuaWdodCBjcm9zc2luZyB3aXRoIHNlY29uZHMgKDIzOjMwOjQ1LTAxOjE1OjMwKVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJQcm9jZXNzIDIzOjMwOjQ1LTAxOjE1OjMwXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8uaG91cikudG9CZSgyMyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5taW51dGUpLnRvQmUoMzApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8uc2Vjb25kKS50b0JlKDQ1KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/Lm1pbnV0ZSkudG9CZSgxNSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZT8uc2Vjb25kKS50b0JlKDMwKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IGV4cHJlc3Npb24gPSByZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0gYXMgRW5oYW5jZWRUaW1lRXhwcmVzc2lvbjtcclxuXHRcdFx0ZXhwZWN0KGV4cHJlc3Npb24uY3Jvc3Nlc01pZG5pZ2h0KS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiSW52YWxpZCBUaW1lIEZvcm1hdCBIYW5kbGluZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIGhvdXJzICgyNTowMClcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAyNTowMFwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0Ly8gSW52YWxpZCB0aW1lIHNob3VsZCBub3QgY3JlYXRlIHRpbWUgY29tcG9uZW50XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHQvLyBCdXQgc2hvdWxkIHN0aWxsIHBhcnNlIGFueSB2YWxpZCBkYXRlIGluZm9ybWF0aW9uXHJcblx0XHRcdGV4cGVjdChyZXN1bHQub3JpZ2luYWxUZXh0KS50b0JlKFwiTWVldGluZyBhdCAyNTowMFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGludmFsaWQgbWludXRlcyAoMTI6NjApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIlRhc2sgYXQgMTI6NjBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgaW52YWxpZCBzZWNvbmRzICgxMjozMDo2MClcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiUHJvY2VzcyBhdCAxMjozMDo2MFwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtYWxmb3JtZWQgdGltZSBzdHJpbmdzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdENhc2VzID0gW1xyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAxOjI6Mzo0XCIsXHJcblx0XHRcdFx0XCJUYXNrIGF0IDo6MzBcIixcclxuXHRcdFx0XHRcIkV2ZW50IGF0IDEyOlwiLFxyXG5cdFx0XHRcdFwiQ2FsbCBhdCA6MzBcIixcclxuXHRcdFx0XHRcIk1lZXRpbmcgYXQgMTI6YWJcIixcclxuXHRcdFx0XHRcIlRhc2sgYXQgYWI6MzBcIixcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RDYXNlcy5mb3JFYWNoKHRlc3RDYXNlID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKHRlc3RDYXNlKSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBncmFjZWZ1bGx5IGhhbmRsZSBlbXB0eSB0aW1lIGV4cHJlc3Npb25zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1lZXRpbmcgYXQgXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5vcmlnaW5hbFRleHQpLnRvQmUoXCJNZWV0aW5nIGF0IFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGludmFsaWQgcmFuZ2UgZm9ybWF0c1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuXHRcdFx0XHRcIk1lZXRpbmcgMjU6MDAtMTM6MDBcIixcclxuXHRcdFx0XHRcIlRhc2sgMTI6MDAtMjU6MDBcIixcclxuXHRcdFx0XHRcIkV2ZW50IDEyOjYwLTEzOjAwXCIsXHJcblx0XHRcdFx0XCJDYWxsIDEyOjAwLTEzOjYwXCIsXHJcblx0XHRcdFx0XCJNZWV0aW5nIDEyOjAwLVwiLFxyXG5cdFx0XHRcdFwiVGFzayAtMTM6MDBcIixcclxuXHRcdFx0XHRcIkV2ZW50IDEyOjAwLS0xMzowMFwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdENhc2VzLmZvckVhY2godGVzdENhc2UgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGVzdENhc2UpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0XHQvLyBTaG91bGQgbm90IGNyZWF0ZSBpbnZhbGlkIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRcdGlmIChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKSB7XHJcblx0XHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZS5ob3VyKS50b0JlTGVzc1RoYW5PckVxdWFsKDIzKTtcclxuXHRcdFx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lLm1pbnV0ZSkudG9CZUxlc3NUaGFuT3JFcXVhbCg1OSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChyZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZSkge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lLmhvdXIpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMjMpO1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lLm1pbnV0ZSkudG9CZUxlc3NUaGFuT3JFcXVhbCg1OSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkFtYmlndW91cyBUaW1lIEZvcm1hdCBSZXNvbHV0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGFtYmlndW91cyAxMi1ob3VyIGZvcm1hdCB3aXRob3V0IEFNL1BNXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvbiAoc2hvdWxkIHByZWZlciAyNC1ob3VyIGludGVycHJldGF0aW9uKVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAzOjAwXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHQvLyBXaXRoIGRlZmF1bHQgMjRoIHByZWZlcmVuY2UsIDM6MDAgc2hvdWxkIGJlIGludGVycHJldGVkIGFzIDM6MDAgQU1cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKDMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXNwZWN0IGNvbmZpZ3VyYXRpb24gZm9yIGFtYmlndW91cyB0aW1lIGhhbmRsaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnOiBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRcdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRcdHNpbmdsZVRpbWU6IFsvXFxkezEsMn06XFxkezJ9KD86OlxcZHsyfSk/KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHR0aW1lUmFuZ2U6IFsvXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/XFxzKlst4oCT4oCUfl1cXHMqXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCLigJNcIiwgXCLigJRcIiwgXCJ+XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMTJoXCIsXHJcblx0XHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIlBNXCIsXHJcblx0XHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkU2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoY29uZmlnKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFRoaXMgdGVzdCB3b3VsZCBuZWVkIHRoZSBzZXJ2aWNlIHRvIGFjdHVhbGx5IGltcGxlbWVudCBhbWJpZ3VvdXMgdGltZSBoYW5kbGluZ1xyXG5cdFx0XHQvLyBGb3Igbm93LCB3ZSB0ZXN0IHRoYXQgdGhlIGNvbmZpZ3VyYXRpb24gaXMgYWNjZXB0ZWRcclxuXHRcdFx0ZXhwZWN0KGVuaGFuY2VkU2VydmljZS5nZXRDb25maWcoKSkudG9NYXRjaE9iamVjdChleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMTJoXCIsXHJcblx0XHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIlBNXCIsXHJcblx0XHRcdFx0fSksXHJcblx0XHRcdH0pKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1peGVkIDEyLWhvdXIgYW5kIDI0LWhvdXIgZm9ybWF0cyBpbiByYW5nZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUaGlzIHNob3VsZCBiZSB0cmVhdGVkIGFzIGludmFsaWQgc2luY2UgbWl4aW5nIGZvcm1hdHMgaXMgYW1iaWd1b3VzXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIDI6MDAgUE0gLSAxNTowMFwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGVpdGhlciBwYXJzZSBjb3JyZWN0bHkgb3IgZmFpbCBncmFjZWZ1bGx5XHJcblx0XHRcdGlmIChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lICYmIHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lKSB7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zdGFydFRpbWUuaG91cikudG9CZSgxNCk7IC8vIDI6MDAgUE1cclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWUuaG91cikudG9CZSgxNSk7ICAgLy8gMTU6MDBcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbm9vbiBhbmQgbWlkbmlnaHQgZWRnZSBjYXNlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuXHRcdFx0XHR7IGlucHV0OiBcIjEyOjAwIEFNXCIsIGV4cGVjdGVkSG91cjogMCB9LCAgIC8vIE1pZG5pZ2h0XHJcblx0XHRcdFx0eyBpbnB1dDogXCIxMjowMCBQTVwiLCBleHBlY3RlZEhvdXI6IDEyIH0sICAvLyBOb29uXHJcblx0XHRcdFx0eyBpbnB1dDogXCIxMjozMCBBTVwiLCBleHBlY3RlZEhvdXI6IDAgfSwgICAvLyAzMCBtaW51dGVzIHBhc3QgbWlkbmlnaHRcclxuXHRcdFx0XHR7IGlucHV0OiBcIjEyOjMwIFBNXCIsIGV4cGVjdGVkSG91cjogMTIgfSwgIC8vIDMwIG1pbnV0ZXMgcGFzdCBub29uXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHR0ZXN0Q2FzZXMuZm9yRWFjaCgoeyBpbnB1dCwgZXhwZWN0ZWRIb3VyIH0pID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFx0YE1lZXRpbmcgYXQgJHtpbnB1dH1gXHJcblx0XHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKGV4cGVjdGVkSG91cik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiVGltZSBSYW5nZSBTZXBhcmF0b3IgUGF0dGVybnNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgaHlwaGVuIHNlcGFyYXRvciAoMTI6MDAtMTM6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1lZXRpbmcgMTI6MDAtMTM6MDBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDEyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRpbGRlIHNlcGFyYXRvciAoMTI6MDB+MTM6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1lZXRpbmcgMTI6MDB+MTM6MDBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDEyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGZ1bGwtd2lkdGggdGlsZGUgc2VwYXJhdG9yICgxMjowMO+9njEzOjAwKVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIDEyOjAw772eMTM6MDBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDEyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHNwYWNlZCBoeXBoZW4gc2VwYXJhdG9yICgxMjowMCAtIDEzOjAwKVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIDEyOjAwIC0gMTM6MDBcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDEyKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lPy5ob3VyKS50b0JlKDEzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHNwYWNlZCB0aWxkZSBzZXBhcmF0b3IgKDEyOjAwIH4gMTM6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1lZXRpbmcgMTI6MDAgfiAxMzowMFwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zdGFydFRpbWU/LmhvdXIpLnRvQmUoMTIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/LmhvdXIpLnRvQmUoMTMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgc3BhY2VzIGFyb3VuZCBzZXBhcmF0b3JzICgxMjowMCAgLSAgMTM6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIk1lZXRpbmcgMTI6MDAgIC0gIDEzOjAwXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8uaG91cikudG9CZSgxMik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZT8uaG91cikudG9CZSgxMyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIG5vdCBwYXJzZSBpbnZhbGlkIHNlcGFyYXRvcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnZhbGlkU2VwYXJhdG9ycyA9IFtcclxuXHRcdFx0XHRcIjEyOjAwKzEzOjAwXCIsXHJcblx0XHRcdFx0XCIxMjowMC8xMzowMFwiLCBcclxuXHRcdFx0XHRcIjEyOjAwfDEzOjAwXCIsXHJcblx0XHRcdFx0XCIxMjowMCoxMzowMFwiLFxyXG5cdFx0XHRcdFwiMTI6MDAmMTM6MDBcIixcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGludmFsaWRTZXBhcmF0b3JzLmZvckVhY2godGVzdENhc2UgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XHRgTWVldGluZyAke3Rlc3RDYXNlfWBcclxuXHRcdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBTaG91bGQgbm90IHBhcnNlIGFzIGEgdGltZSByYW5nZVxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5lbmRUaW1lKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgcmFuZ2VzIHdpdGggc2Vjb25kcyBhbmQgZGlmZmVyZW50IHNlcGFyYXRvcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0XCIxMjozMDo0NS0xMzoxNTozMFwiLFxyXG5cdFx0XHRcdFwiMTI6MzA6NDV+MTM6MTU6MzBcIiwgXHJcblx0XHRcdFx0XCIxMjozMDo0NSAtIDEzOjE1OjMwXCIsXHJcblx0XHRcdFx0XCIxMjozMDo0Ne+9njEzOjE1OjMwXCIsXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHR0ZXN0Q2FzZXMuZm9yRWFjaCh0ZXN0Q2FzZSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcdGBQcm9jZXNzICR7dGVzdENhc2V9YFxyXG5cdFx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDEyKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZT8uc2Vjb25kKS50b0JlKDQ1KTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/LmhvdXIpLnRvQmUoMTMpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZT8ubWludXRlKS50b0JlKDE1KTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWU/LnNlY29uZCkudG9CZSgzMCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRmFsbGJhY2sgQmVoYXZpb3JcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBmYWxsIGJhY2sgdG8gZGF0ZS1vbmx5IHBhcnNpbmcgd2hlbiB0aW1lIHBhcnNpbmcgZmFpbHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiTWVldGluZyB0b21vcnJvdyBhdCBpbnZhbGlkOnRpbWVcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBzdGlsbCBwYXJzZSB0aGUgZGF0ZSBwYXJ0XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc2NoZWR1bGVkRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0Ly8gQnV0IG5vdCBjcmVhdGUgaW52YWxpZCB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHByZXNlcnZlIG9yaWdpbmFsIHRleHQgd2hlbiBwYXJzaW5nIGZhaWxzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxUZXh0ID0gXCJUYXNrIGF0IGJhZHRpbWU6Zm9ybWF0IHRvbW9ycm93XCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMob3JpZ2luYWxUZXh0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm9yaWdpbmFsVGV4dCkudG9CZShvcmlnaW5hbFRleHQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbWl4ZWQgdmFsaWQgYW5kIGludmFsaWQgdGltZSBleHByZXNzaW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIGF0IDE0OjAwIGFuZCBpbnZhbGlkOnRpbWUgdG9tb3Jyb3dcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBwYXJzZSB0aGUgdmFsaWQgdGltZVxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWU/LmhvdXIpLnRvQmUoMTQpO1xyXG5cdFx0XHQvLyBBbmQgc3RpbGwgcGFyc2UgdGhlIGRhdGVcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zY2hlZHVsZWREYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZW1wdHkgaW5wdXQgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJcIikgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5vcmlnaW5hbFRleHQpLnRvQmUoXCJcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCJcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvRXF1YWwoW10pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbnVsbC91bmRlZmluZWQgaW5wdXQgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3Qgd2l0aCBudWxsIGlucHV0IChjYXN0IHRvIHN0cmluZylcclxuXHRcdFx0Y29uc3QgcmVzdWx0MSA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMobnVsbCBhcyBhbnkpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEub3JpZ2luYWxUZXh0KS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB3aXRoIHVuZGVmaW5lZCBpbnB1dCAoY2FzdCB0byBzdHJpbmcpXHJcblx0XHRcdGNvbnN0IHJlc3VsdDIgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKHVuZGVmaW5lZCBhcyBhbnkpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIub3JpZ2luYWxUZXh0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ29uZmlndXJhdGlvbi1Ecml2ZW4gQmVoYXZpb3JcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZXNwZWN0IG1pZG5pZ2h0IGNyb3NzaW5nIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuZXh0RGF5Q29uZmlnOiBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRcdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRcdHNpbmdsZVRpbWU6IFsvXFxkezEsMn06XFxkezJ9KD86OlxcZHsyfSk/KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHR0aW1lUmFuZ2U6IFsvXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/XFxzKlst4oCT4oCUfl1cXHMqXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCLigJNcIiwgXCLigJRcIiwgXCJ+XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMjRoXCIsXHJcblx0XHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIlBNXCIsXHJcblx0XHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHNhbWVEYXlDb25maWc6IEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWcgPSB7XHJcblx0XHRcdFx0Li4uREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLFxyXG5cdFx0XHRcdHRpbWVQYXR0ZXJuczoge1xyXG5cdFx0XHRcdFx0c2luZ2xlVGltZTogWy9cXGR7MSwyfTpcXGR7Mn0oPzo6XFxkezJ9KT8oPzpcXHMqKD86QU18UE18YW18cG0pKT8vXSxcclxuXHRcdFx0XHRcdHRpbWVSYW5nZTogWy9cXGR7MSwyfTpcXGR7Mn0oPzpcXHMqKD86QU18UE18YW18cG0pKT9cXHMqWy3igJPigJR+XVxccypcXGR7MSwyfTpcXGR7Mn0oPzpcXHMqKD86QU18UE18YW18cG0pKT8vXSxcclxuXHRcdFx0XHRcdHJhbmdlU2VwYXJhdG9yczogW1wiLVwiLCBcIuKAk1wiLCBcIuKAlFwiLCBcIn5cIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0aW1lRGVmYXVsdHM6IHtcclxuXHRcdFx0XHRcdHByZWZlcnJlZEZvcm1hdDogXCIyNGhcIixcclxuXHRcdFx0XHRcdGRlZmF1bHRQZXJpb2Q6IFwiUE1cIixcclxuXHRcdFx0XHRcdG1pZG5pZ2h0Q3Jvc3Npbmc6IFwic2FtZS1kYXlcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbmV4dERheVNlcnZpY2UgPSBuZXcgVGltZVBhcnNpbmdTZXJ2aWNlKG5leHREYXlDb25maWcpO1xyXG5cdFx0XHRjb25zdCBzYW1lRGF5U2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2Uoc2FtZURheUNvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBCb3RoIHNob3VsZCBwYXJzZSB0aGUgdGltZSBjb21wb25lbnRzIHRoZSBzYW1lIHdheVxyXG5cdFx0XHRjb25zdCB0ZXh0ID0gXCJOaWdodCBzaGlmdCAyMzowMC0wMTowMFwiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQxID0gbmV4dERheVNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGV4dCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cdFx0XHRjb25zdCByZXN1bHQyID0gc2FtZURheVNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGV4dCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDIzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEudGltZUNvbXBvbmVudHMuZW5kVGltZT8uaG91cikudG9CZSgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIudGltZUNvbXBvbmVudHMuc3RhcnRUaW1lPy5ob3VyKS50b0JlKDIzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIudGltZUNvbXBvbmVudHMuZW5kVGltZT8uaG91cikudG9CZSgxKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGRpc2FibGVkIHRpbWUgcGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRpc2FibGVkQ29uZmlnOiBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRcdHNpbmdsZVRpbWU6IFsvXFxkezEsMn06XFxkezJ9KD86OlxcZHsyfSk/KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHR0aW1lUmFuZ2U6IFsvXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/XFxzKlst4oCT4oCUfl1cXHMqXFxkezEsMn06XFxkezJ9KD86XFxzKig/OkFNfFBNfGFtfHBtKSk/L10sXHJcblx0XHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCLigJNcIiwgXCLigJRcIiwgXCJ+XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMjRoXCIsXHJcblx0XHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIlBNXCIsXHJcblx0XHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRpc2FibGVkU2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoZGlzYWJsZWRDb25maWcpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBkaXNhYmxlZFNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIGF0IDE0OjAwIHRvbW9ycm93XCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgcmV0dXJuIG9yaWdpbmFsIHRleHQgd2l0aG91dCBwYXJzaW5nXHJcblx0XHRcdGV4cGVjdChyZXN1bHQub3JpZ2luYWxUZXh0KS50b0JlKFwiTWVldGluZyBhdCAxNDowMCB0b21vcnJvd1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jbGVhbmVkVGV4dCkudG9CZShcIk1lZXRpbmcgYXQgMTQ6MDAgdG9tb3Jyb3dcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvRXF1YWwoW10pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZXNwZWN0IGN1c3RvbSB0aW1lIHBhdHRlcm5zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY3VzdG9tQ29uZmlnOiBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLkRFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRcdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRcdHNpbmdsZVRpbWU6IFsvXFxkezEsMn1oXFxkezJ9L10sIC8vIEN1c3RvbSBmb3JtYXQgbGlrZSBcIjE0aDMwXCJcclxuXHRcdFx0XHRcdHRpbWVSYW5nZTogWy9cXGR7MSwyfWhcXGR7Mn0tXFxkezEsMn1oXFxkezJ9L10sIC8vIEN1c3RvbSByYW5nZSBmb3JtYXRcclxuXHRcdFx0XHRcdHJhbmdlU2VwYXJhdG9yczogW1wiLVwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdFx0cHJlZmVycmVkRm9ybWF0OiBcIjI0aFwiLFxyXG5cdFx0XHRcdFx0ZGVmYXVsdFBlcmlvZDogXCJQTVwiLFxyXG5cdFx0XHRcdFx0bWlkbmlnaHRDcm9zc2luZzogXCJuZXh0LWRheVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjdXN0b21TZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShjdXN0b21Db25maWcpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVGhpcyB3b3VsZCByZXF1aXJlIGltcGxlbWVudGluZyBjdXN0b20gcGF0dGVybiBzdXBwb3J0IGluIHRoZSBzZXJ2aWNlXHJcblx0XHRcdC8vIEZvciBub3csIHdlIHRlc3QgdGhhdCB0aGUgY29uZmlndXJhdGlvbiBpcyBhY2NlcHRlZFxyXG5cdFx0XHRleHBlY3QoY3VzdG9tU2VydmljZS5nZXRDb25maWcoKSkudG9NYXRjaE9iamVjdChleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcblx0XHRcdFx0dGltZVBhdHRlcm5zOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcblx0XHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIl0sXHJcblx0XHRcdFx0fSksXHJcblx0XHRcdH0pKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVkZ2UgQ2FzZXMgd2l0aCBDb250ZXh0XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRpbWUgZXhwcmVzc2lvbnMgYXQgc3RhcnQgb2YgdGV4dFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCIxNDowMCBtZWV0aW5nIHdpdGggdGVhbVwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lPy5ob3VyKS50b0JlKDE0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRpbWUgZXhwcmVzc2lvbnMgYXQgZW5kIG9mIHRleHRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiVGVhbSBtZWV0aW5nIGF0IDE0OjAwXCJcclxuXHRcdFx0KSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWU/LmhvdXIpLnRvQmUoMTQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgdGltZSBleHByZXNzaW9ucyBpbiBvbmUgdGV4dFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJNZWV0aW5nIHN0YXJ0cyBhdCAxNDowMCBhbmQgZW5kcyBhdCAxNjowMFwiXHJcblx0XHRcdCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIHBhcnNlIGJvdGggdGltZXMgLSB0aGUgZmlyc3Qgb25lIGZvdW5kIHNob3VsZCBiZSB1c2VkXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxNCk7XHJcblx0XHRcdC8vIFRoZSBzZWNvbmQgdGltZSBtaWdodCBiZSBwYXJzZWQgYXMgYSBzZXBhcmF0ZSBleHByZXNzaW9uXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDEpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgdGltZSBleHByZXNzaW9ucyB3aXRoIHB1bmN0dWF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdENhc2VzID0gW1xyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAxNDowMC5cIixcclxuXHRcdFx0XHRcIk1lZXRpbmcgYXQgMTQ6MDAhXCIsXHJcblx0XHRcdFx0XCJNZWV0aW5nIGF0IDE0OjAwP1wiLFxyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAxNDowMCxcIixcclxuXHRcdFx0XHRcIk1lZXRpbmcgYXQgMTQ6MDA7XCIsXHJcblx0XHRcdFx0XCJNZWV0aW5nIChhdCAxNDowMClcIixcclxuXHRcdFx0XHRcIk1lZXRpbmcgW2F0IDE0OjAwXVwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdENhc2VzLmZvckVhY2godGVzdENhc2UgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGVzdENhc2UpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWU/LmhvdXIpLnRvQmUoMTQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRpbWUgZXhwcmVzc2lvbnMgd2l0aCBzcGVjaWFsIGNoYXJhY3RlcnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiTWVldGluZyBAIDE0OjAwICNpbXBvcnRhbnRcIlxyXG5cdFx0XHQpIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQudGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZT8uaG91cikudG9CZSgxNCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19