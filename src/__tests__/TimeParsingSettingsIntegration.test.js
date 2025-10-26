/**
 * Integration tests for time parsing settings integration
 * Tests that settings changes properly update TimeParsingService behavior
 */
import { TimeParsingService } from "../services/time-parsing-service";
describe("TimeParsingSettingsIntegration", () => {
    let service;
    let baseConfig;
    beforeEach(() => {
        baseConfig = {
            enabled: true,
            supportedLanguages: ["en", "zh"],
            dateKeywords: {
                start: ["start", "begin", "from"],
                due: ["due", "deadline", "by", "until"],
                scheduled: ["scheduled", "on", "at"],
            },
            removeOriginalText: true,
            perLineProcessing: true,
            realTimeReplacement: true,
            timePatterns: {
                singleTime: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
                ],
                timeRange: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~～]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
                ],
                rangeSeparators: ["-", "~", "～", " - ", " ~ ", " ～ "],
            },
            timeDefaults: {
                preferredFormat: "24h",
                defaultPeriod: "AM",
                midnightCrossing: "next-day",
            },
        };
        service = new TimeParsingService(baseConfig);
    });
    describe("Settings Update Integration", () => {
        test("should update time format preferences", () => {
            var _a;
            // Update to 12h preference
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { timeDefaults: Object.assign(Object.assign({}, baseConfig.timeDefaults), { preferredFormat: "12h" }) });
            service.updateConfig(updatedConfig);
            // Verify the configuration was updated
            const config = service.getConfig();
            expect((_a = config.timeDefaults) === null || _a === void 0 ? void 0 : _a.preferredFormat).toBe("12h");
        });
        test("should update default AM/PM period", () => {
            var _a;
            // Update default period to PM
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { timeDefaults: Object.assign(Object.assign({}, baseConfig.timeDefaults), { defaultPeriod: "PM" }) });
            service.updateConfig(updatedConfig);
            // Verify the configuration was updated
            const config = service.getConfig();
            expect((_a = config.timeDefaults) === null || _a === void 0 ? void 0 : _a.defaultPeriod).toBe("PM");
        });
        test("should update midnight crossing behavior", () => {
            var _a;
            // Update midnight crossing to same-day
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { timeDefaults: Object.assign(Object.assign({}, baseConfig.timeDefaults), { midnightCrossing: "same-day" }) });
            service.updateConfig(updatedConfig);
            // Verify the configuration was updated
            const config = service.getConfig();
            expect((_a = config.timeDefaults) === null || _a === void 0 ? void 0 : _a.midnightCrossing).toBe("same-day");
        });
        test("should update time range separators", () => {
            var _a;
            // Update range separators
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { timePatterns: Object.assign(Object.assign({}, baseConfig.timePatterns), { rangeSeparators: ["-", "to", "until"] }) });
            service.updateConfig(updatedConfig);
            // Verify the configuration was updated
            const config = service.getConfig();
            expect((_a = config.timePatterns) === null || _a === void 0 ? void 0 : _a.rangeSeparators).toEqual(["-", "to", "until"]);
        });
        test("should update date keywords", () => {
            // Update date keywords
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { dateKeywords: {
                    start: ["begin", "commence", "initiate"],
                    due: ["deadline", "expires", "finish"],
                    scheduled: ["planned", "arranged", "set"],
                } });
            service.updateConfig(updatedConfig);
            // Verify the configuration was updated
            const config = service.getConfig();
            expect(config.dateKeywords.start).toEqual(["begin", "commence", "initiate"]);
            expect(config.dateKeywords.due).toEqual(["deadline", "expires", "finish"]);
            expect(config.dateKeywords.scheduled).toEqual(["planned", "arranged", "set"]);
        });
        test("should disable/enable time parsing", () => {
            // Test enabled parsing
            let result = service.parseTimeExpressions("Meeting at 14:00 tomorrow");
            expect(result.parsedExpressions.length).toBeGreaterThan(0);
            // Disable parsing
            const disabledConfig = Object.assign(Object.assign({}, baseConfig), { enabled: false });
            service.updateConfig(disabledConfig);
            // Test disabled parsing
            result = service.parseTimeExpressions("Meeting at 14:00 tomorrow");
            expect(result.parsedExpressions.length).toBe(0);
            expect(result.cleanedText).toBe("Meeting at 14:00 tomorrow");
        });
        test("should update text removal behavior", () => {
            // Test with text removal enabled
            let result = service.parseTimeExpressions("Meeting tomorrow");
            expect(result.cleanedText).not.toBe("Meeting tomorrow");
            // Disable text removal
            const noRemovalConfig = Object.assign(Object.assign({}, baseConfig), { removeOriginalText: false });
            service.updateConfig(noRemovalConfig);
            // Test with text removal disabled
            result = service.parseTimeExpressions("Meeting tomorrow");
            expect(result.cleanedText).toBe("Meeting tomorrow");
        });
    });
    describe("Cache Invalidation", () => {
        test("should clear cache when settings change", () => {
            // Parse something to populate cache
            const text = "Meeting at 14:00 tomorrow";
            const result1 = service.parseTimeExpressions(text);
            // Update settings
            const updatedConfig = Object.assign(Object.assign({}, baseConfig), { removeOriginalText: false });
            service.updateConfig(updatedConfig);
            // Parse the same text again - should get different result due to cache invalidation
            const result2 = service.parseTimeExpressions(text);
            // Results should be different due to removeOriginalText setting change
            expect(result1.cleanedText).not.toBe(result2.cleanedText);
        });
        test("should handle cache clearing explicitly", () => {
            // Parse something to populate cache
            service.parseTimeExpressions("Meeting at 14:00 tomorrow");
            // Clear cache explicitly
            service.clearCache();
            // This should work without errors
            const result = service.parseTimeExpressions("Another meeting at 15:00");
            expect(result).toBeDefined();
        });
    });
    describe("Configuration Validation", () => {
        test("should handle partial configuration updates", () => {
            // Update only part of the configuration
            service.updateConfig({
                enabled: false,
            });
            const config = service.getConfig();
            expect(config.enabled).toBe(false);
            // Other settings should remain unchanged
            expect(config.supportedLanguages).toEqual(["en", "zh"]);
        });
        test("should handle invalid configuration gracefully", () => {
            // This should not throw an error
            expect(() => {
                service.updateConfig({
                    // @ts-ignore - testing invalid config
                    invalidProperty: "invalid",
                });
            }).not.toThrow();
        });
        test("should maintain configuration consistency", () => {
            const originalConfig = service.getConfig();
            // Update configuration
            const updates = {
                enabled: false,
                removeOriginalText: false,
            };
            service.updateConfig(updates);
            const updatedConfig = service.getConfig();
            // Updated properties should change
            expect(updatedConfig.enabled).toBe(false);
            expect(updatedConfig.removeOriginalText).toBe(false);
            // Unchanged properties should remain the same
            expect(updatedConfig.supportedLanguages).toEqual(originalConfig.supportedLanguages);
            expect(updatedConfig.dateKeywords).toEqual(originalConfig.dateKeywords);
        });
    });
    describe("Real-world Settings Scenarios", () => {
        test("should handle user switching from 12h to 24h format", () => {
            var _a, _b;
            // Start with 12h format preference
            const config12h = Object.assign(Object.assign({}, baseConfig), { timeDefaults: Object.assign(Object.assign({}, baseConfig.timeDefaults), { preferredFormat: "12h" }) });
            service.updateConfig(config12h);
            // Verify initial configuration
            let config = service.getConfig();
            expect((_a = config.timeDefaults) === null || _a === void 0 ? void 0 : _a.preferredFormat).toBe("12h");
            // Switch to 24h format
            const config24h = Object.assign(Object.assign({}, baseConfig), { timeDefaults: Object.assign(Object.assign({}, baseConfig.timeDefaults), { preferredFormat: "24h" }) });
            service.updateConfig(config24h);
            // Verify configuration was updated
            config = service.getConfig();
            expect((_b = config.timeDefaults) === null || _b === void 0 ? void 0 : _b.preferredFormat).toBe("24h");
        });
        test("should handle user adding custom range separators", () => {
            var _a;
            // Add custom separators
            const customConfig = Object.assign(Object.assign({}, baseConfig), { timePatterns: Object.assign(Object.assign({}, baseConfig.timePatterns), { rangeSeparators: ["-", "~", "to", "until", "through"] }) });
            service.updateConfig(customConfig);
            // Verify configuration was updated
            const config = service.getConfig();
            expect((_a = config.timePatterns) === null || _a === void 0 ? void 0 : _a.rangeSeparators).toEqual(["-", "~", "to", "until", "through"]);
        });
        test("should handle user customizing date keywords", () => {
            // Add custom keywords
            const customConfig = Object.assign(Object.assign({}, baseConfig), { dateKeywords: {
                    start: ["start", "begin", "commence", "kick off"],
                    due: ["due", "deadline", "must finish", "complete by"],
                    scheduled: ["scheduled", "planned", "set for", "arranged"],
                } });
            service.updateConfig(customConfig);
            // Test that new keywords work
            const result = service.parseTimeExpressions("Task must finish by tomorrow at 14:00");
            expect(result.dueDate).toBeDefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZVBhcnNpbmdTZXR0aW5nc0ludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUaW1lUGFyc2luZ1NldHRpbmdzSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUd0RSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQy9DLElBQUksT0FBMkIsQ0FBQztJQUNoQyxJQUFJLFVBQXFDLENBQUM7SUFFMUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFVBQVUsR0FBRztZQUNaLE9BQU8sRUFBRSxJQUFJO1lBQ2Isa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1lBQ2hDLFlBQVksRUFBRTtnQkFDYixLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztnQkFDakMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDO2dCQUN2QyxTQUFTLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQzthQUNwQztZQUNELGtCQUFrQixFQUFFLElBQUk7WUFDeEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLFlBQVksRUFBRTtnQkFDYixVQUFVLEVBQUU7b0JBQ1gsZ0RBQWdEO29CQUNoRCxnRUFBZ0U7aUJBQ2hFO2dCQUNELFNBQVMsRUFBRTtvQkFDVixvR0FBb0c7b0JBQ3BHLHFJQUFxSTtpQkFDckk7Z0JBQ0QsZUFBZSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7YUFDckQ7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLGFBQWEs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WUFBWSwwQ0FBRSxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1RixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7WUFDekQsc0JBQXNCO1lBQ3RCLE1BQU0sWUFBWSxtQ0FDZCxVQUFVLEtBQ2IsWUFBWSxFQUFFO29CQUNiLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQztvQkFDakQsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDO29CQUN0RCxTQUFTLEVBQUUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7aUJBQzFELEdBQ0QsQ0FBQztZQUVGLE9BQU8sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFbkMsOEJBQThCO1lBQzlCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1lBQ3JGLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEludGVncmF0aW9uIHRlc3RzIGZvciB0aW1lIHBhcnNpbmcgc2V0dGluZ3MgaW50ZWdyYXRpb25cclxuICogVGVzdHMgdGhhdCBzZXR0aW5ncyBjaGFuZ2VzIHByb3Blcmx5IHVwZGF0ZSBUaW1lUGFyc2luZ1NlcnZpY2UgYmVoYXZpb3JcclxuICovXHJcblxyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ1NlcnZpY2UgfSBmcm9tIFwiLi4vc2VydmljZXMvdGltZS1wYXJzaW5nLXNlcnZpY2VcIjtcclxuaW1wb3J0IHR5cGUgeyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5cclxuZGVzY3JpYmUoXCJUaW1lUGFyc2luZ1NldHRpbmdzSW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdGxldCBzZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblx0bGV0IGJhc2VDb25maWc6IEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0YmFzZUNvbmZpZyA9IHtcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0c3VwcG9ydGVkTGFuZ3VhZ2VzOiBbXCJlblwiLCBcInpoXCJdLFxyXG5cdFx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0XHRzdGFydDogW1wic3RhcnRcIiwgXCJiZWdpblwiLCBcImZyb21cIl0sXHJcblx0XHRcdFx0ZHVlOiBbXCJkdWVcIiwgXCJkZWFkbGluZVwiLCBcImJ5XCIsIFwidW50aWxcIl0sXHJcblx0XHRcdFx0c2NoZWR1bGVkOiBbXCJzY2hlZHVsZWRcIiwgXCJvblwiLCBcImF0XCJdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRyZW1vdmVPcmlnaW5hbFRleHQ6IHRydWUsXHJcblx0XHRcdHBlckxpbmVQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0XHRyZWFsVGltZVJlcGxhY2VtZW50OiB0cnVlLFxyXG5cdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRzaW5nbGVUaW1lOiBbXHJcblx0XHRcdFx0XHQvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvZyxcclxuXHRcdFx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSlcXGIvZyxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdHRpbWVSYW5nZTogW1xyXG5cdFx0XHRcdFx0L1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKlstfu+9nl1cXHMqKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvZyxcclxuXHRcdFx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSk/XFxzKlstfu+9nl1cXHMqKDFbMC0yXXwwP1sxLTldKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccyooQU18UE18YW18cG0pXFxiL2csXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwi772eXCIsIFwiIC0gXCIsIFwiIH4gXCIsIFwiIO+9niBcIl0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdHByZWZlcnJlZEZvcm1hdDogXCIyNGhcIixcclxuXHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIkFNXCIsXHJcblx0XHRcdFx0bWlkbmlnaHRDcm9zc2luZzogXCJuZXh0LWRheVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHJcblx0XHRzZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShiYXNlQ29uZmlnKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJTZXR0aW5ncyBVcGRhdGUgSW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCB1cGRhdGUgdGltZSBmb3JtYXQgcHJlZmVyZW5jZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBVcGRhdGUgdG8gMTJoIHByZWZlcmVuY2VcclxuXHRcdFx0Y29uc3QgdXBkYXRlZENvbmZpZyA9IHtcclxuXHRcdFx0XHQuLi5iYXNlQ29uZmlnLFxyXG5cdFx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdFx0Li4uYmFzZUNvbmZpZy50aW1lRGVmYXVsdHMsXHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMTJoXCIgYXMgY29uc3QsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNlcnZpY2UudXBkYXRlQ29uZmlnKHVwZGF0ZWRDb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHRoZSBjb25maWd1cmF0aW9uIHdhcyB1cGRhdGVkXHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHNlcnZpY2UuZ2V0Q29uZmlnKCkgYXMgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZztcclxuXHRcdFx0ZXhwZWN0KGNvbmZpZy50aW1lRGVmYXVsdHM/LnByZWZlcnJlZEZvcm1hdCkudG9CZShcIjEyaFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgdXBkYXRlIGRlZmF1bHQgQU0vUE0gcGVyaW9kXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVXBkYXRlIGRlZmF1bHQgcGVyaW9kIHRvIFBNXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRDb25maWcgPSB7XHJcblx0XHRcdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdFx0XHR0aW1lRGVmYXVsdHM6IHtcclxuXHRcdFx0XHRcdC4uLmJhc2VDb25maWcudGltZURlZmF1bHRzLFxyXG5cdFx0XHRcdFx0ZGVmYXVsdFBlcmlvZDogXCJQTVwiIGFzIGNvbnN0LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyh1cGRhdGVkQ29uZmlnKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgY29uZmlndXJhdGlvbiB3YXMgdXBkYXRlZFxyXG5cdFx0XHRjb25zdCBjb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpIGFzIEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc7XHJcblx0XHRcdGV4cGVjdChjb25maWcudGltZURlZmF1bHRzPy5kZWZhdWx0UGVyaW9kKS50b0JlKFwiUE1cIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHVwZGF0ZSBtaWRuaWdodCBjcm9zc2luZyBiZWhhdmlvclwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFVwZGF0ZSBtaWRuaWdodCBjcm9zc2luZyB0byBzYW1lLWRheVxyXG5cdFx0XHRjb25zdCB1cGRhdGVkQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLmJhc2VDb25maWcsXHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0XHQuLi5iYXNlQ29uZmlnLnRpbWVEZWZhdWx0cyxcclxuXHRcdFx0XHRcdG1pZG5pZ2h0Q3Jvc3Npbmc6IFwic2FtZS1kYXlcIiBhcyBjb25zdCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VydmljZS51cGRhdGVDb25maWcodXBkYXRlZENvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGhlIGNvbmZpZ3VyYXRpb24gd2FzIHVwZGF0ZWRcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gc2VydmljZS5nZXRDb25maWcoKSBhcyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLnRpbWVEZWZhdWx0cz8ubWlkbmlnaHRDcm9zc2luZykudG9CZShcInNhbWUtZGF5XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCB1cGRhdGUgdGltZSByYW5nZSBzZXBhcmF0b3JzXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVXBkYXRlIHJhbmdlIHNlcGFyYXRvcnNcclxuXHRcdFx0Y29uc3QgdXBkYXRlZENvbmZpZyA9IHtcclxuXHRcdFx0XHQuLi5iYXNlQ29uZmlnLFxyXG5cdFx0XHRcdHRpbWVQYXR0ZXJuczoge1xyXG5cdFx0XHRcdFx0Li4uYmFzZUNvbmZpZy50aW1lUGF0dGVybnMsXHJcblx0XHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ0b1wiLCBcInVudGlsXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyh1cGRhdGVkQ29uZmlnKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgY29uZmlndXJhdGlvbiB3YXMgdXBkYXRlZFxyXG5cdFx0XHRjb25zdCBjb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpIGFzIEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc7XHJcblx0XHRcdGV4cGVjdChjb25maWcudGltZVBhdHRlcm5zPy5yYW5nZVNlcGFyYXRvcnMpLnRvRXF1YWwoW1wiLVwiLCBcInRvXCIsIFwidW50aWxcIl0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCB1cGRhdGUgZGF0ZSBrZXl3b3Jkc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFVwZGF0ZSBkYXRlIGtleXdvcmRzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRDb25maWcgPSB7XHJcblx0XHRcdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdFx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0XHRcdHN0YXJ0OiBbXCJiZWdpblwiLCBcImNvbW1lbmNlXCIsIFwiaW5pdGlhdGVcIl0sXHJcblx0XHRcdFx0XHRkdWU6IFtcImRlYWRsaW5lXCIsIFwiZXhwaXJlc1wiLCBcImZpbmlzaFwiXSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZDogW1wicGxhbm5lZFwiLCBcImFycmFuZ2VkXCIsIFwic2V0XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyh1cGRhdGVkQ29uZmlnKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgY29uZmlndXJhdGlvbiB3YXMgdXBkYXRlZFxyXG5cdFx0XHRjb25zdCBjb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpIGFzIEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc7XHJcblx0XHRcdGV4cGVjdChjb25maWcuZGF0ZUtleXdvcmRzLnN0YXJ0KS50b0VxdWFsKFtcImJlZ2luXCIsIFwiY29tbWVuY2VcIiwgXCJpbml0aWF0ZVwiXSk7XHJcblx0XHRcdGV4cGVjdChjb25maWcuZGF0ZUtleXdvcmRzLmR1ZSkudG9FcXVhbChbXCJkZWFkbGluZVwiLCBcImV4cGlyZXNcIiwgXCJmaW5pc2hcIl0pO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLmRhdGVLZXl3b3Jkcy5zY2hlZHVsZWQpLnRvRXF1YWwoW1wicGxhbm5lZFwiLCBcImFycmFuZ2VkXCIsIFwic2V0XCJdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgZGlzYWJsZS9lbmFibGUgdGltZSBwYXJzaW5nXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gVGVzdCBlbmFibGVkIHBhcnNpbmdcclxuXHRcdFx0bGV0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJNZWV0aW5nIGF0IDE0OjAwIHRvbW9ycm93XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cclxuXHRcdFx0Ly8gRGlzYWJsZSBwYXJzaW5nXHJcblx0XHRcdGNvbnN0IGRpc2FibGVkQ29uZmlnID0ge1xyXG5cdFx0XHRcdC4uLmJhc2VDb25maWcsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyhkaXNhYmxlZENvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBUZXN0IGRpc2FibGVkIHBhcnNpbmdcclxuXHRcdFx0cmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIk1lZXRpbmcgYXQgMTQ6MDAgdG9tb3Jyb3dcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMubGVuZ3RoKS50b0JlKDApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS50b0JlKFwiTWVldGluZyBhdCAxNDowMCB0b21vcnJvd1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgdXBkYXRlIHRleHQgcmVtb3ZhbCBiZWhhdmlvclwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRlc3Qgd2l0aCB0ZXh0IHJlbW92YWwgZW5hYmxlZFxyXG5cdFx0XHRsZXQgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIk1lZXRpbmcgdG9tb3Jyb3dcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLm5vdC50b0JlKFwiTWVldGluZyB0b21vcnJvd1wiKTtcclxuXHJcblx0XHRcdC8vIERpc2FibGUgdGV4dCByZW1vdmFsXHJcblx0XHRcdGNvbnN0IG5vUmVtb3ZhbENvbmZpZyA9IHtcclxuXHRcdFx0XHQuLi5iYXNlQ29uZmlnLFxyXG5cdFx0XHRcdHJlbW92ZU9yaWdpbmFsVGV4dDogZmFsc2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyhub1JlbW92YWxDb25maWcpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB3aXRoIHRleHQgcmVtb3ZhbCBkaXNhYmxlZFxyXG5cdFx0XHRyZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwiTWVldGluZyB0b21vcnJvd1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jbGVhbmVkVGV4dCkudG9CZShcIk1lZXRpbmcgdG9tb3Jyb3dcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDYWNoZSBJbnZhbGlkYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBjbGVhciBjYWNoZSB3aGVuIHNldHRpbmdzIGNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFBhcnNlIHNvbWV0aGluZyB0byBwb3B1bGF0ZSBjYWNoZVxyXG5cdFx0XHRjb25zdCB0ZXh0ID0gXCJNZWV0aW5nIGF0IDE0OjAwIHRvbW9ycm93XCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKHRleHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHNldHRpbmdzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRDb25maWcgPSB7XHJcblx0XHRcdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdFx0XHRyZW1vdmVPcmlnaW5hbFRleHQ6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VydmljZS51cGRhdGVDb25maWcodXBkYXRlZENvbmZpZyk7XHJcblxyXG5cdFx0XHQvLyBQYXJzZSB0aGUgc2FtZSB0ZXh0IGFnYWluIC0gc2hvdWxkIGdldCBkaWZmZXJlbnQgcmVzdWx0IGR1ZSB0byBjYWNoZSBpbnZhbGlkYXRpb25cclxuXHRcdFx0Y29uc3QgcmVzdWx0MiA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGV4dCk7XHJcblxyXG5cdFx0XHQvLyBSZXN1bHRzIHNob3VsZCBiZSBkaWZmZXJlbnQgZHVlIHRvIHJlbW92ZU9yaWdpbmFsVGV4dCBzZXR0aW5nIGNoYW5nZVxyXG5cdFx0XHRleHBlY3QocmVzdWx0MS5jbGVhbmVkVGV4dCkubm90LnRvQmUocmVzdWx0Mi5jbGVhbmVkVGV4dCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBjYWNoZSBjbGVhcmluZyBleHBsaWNpdGx5XCIsICgpID0+IHtcclxuXHRcdFx0Ly8gUGFyc2Ugc29tZXRoaW5nIHRvIHBvcHVsYXRlIGNhY2hlXHJcblx0XHRcdHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJNZWV0aW5nIGF0IDE0OjAwIHRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgY2FjaGUgZXhwbGljaXRseVxyXG5cdFx0XHRzZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHJcblx0XHRcdC8vIFRoaXMgc2hvdWxkIHdvcmsgd2l0aG91dCBlcnJvcnNcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIkFub3RoZXIgbWVldGluZyBhdCAxNTowMFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbmZpZ3VyYXRpb24gVmFsaWRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBwYXJ0aWFsIGNvbmZpZ3VyYXRpb24gdXBkYXRlc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFVwZGF0ZSBvbmx5IHBhcnQgb2YgdGhlIGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0c2VydmljZS51cGRhdGVDb25maWcoe1xyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHNlcnZpY2UuZ2V0Q29uZmlnKCkgYXMgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZztcclxuXHRcdFx0ZXhwZWN0KGNvbmZpZy5lbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0Ly8gT3RoZXIgc2V0dGluZ3Mgc2hvdWxkIHJlbWFpbiB1bmNoYW5nZWRcclxuXHRcdFx0ZXhwZWN0KGNvbmZpZy5zdXBwb3J0ZWRMYW5ndWFnZXMpLnRvRXF1YWwoW1wiZW5cIiwgXCJ6aFwiXSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRoaXMgc2hvdWxkIG5vdCB0aHJvdyBhbiBlcnJvclxyXG5cdFx0XHRleHBlY3QoKCkgPT4ge1xyXG5cdFx0XHRcdHNlcnZpY2UudXBkYXRlQ29uZmlnKHtcclxuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmUgLSB0ZXN0aW5nIGludmFsaWQgY29uZmlnXHJcblx0XHRcdFx0XHRpbnZhbGlkUHJvcGVydHk6IFwiaW52YWxpZFwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KS5ub3QudG9UaHJvdygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBtYWludGFpbiBjb25maWd1cmF0aW9uIGNvbnNpc3RlbmN5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxDb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0Y29uc3QgdXBkYXRlcyA9IHtcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRyZW1vdmVPcmlnaW5hbFRleHQ6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VydmljZS51cGRhdGVDb25maWcodXBkYXRlcyk7XHJcblxyXG5cdFx0XHRjb25zdCB1cGRhdGVkQ29uZmlnID0gc2VydmljZS5nZXRDb25maWcoKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZWQgcHJvcGVydGllcyBzaG91bGQgY2hhbmdlXHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQ29uZmlnLmVuYWJsZWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QodXBkYXRlZENvbmZpZy5yZW1vdmVPcmlnaW5hbFRleHQpLnRvQmUoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gVW5jaGFuZ2VkIHByb3BlcnRpZXMgc2hvdWxkIHJlbWFpbiB0aGUgc2FtZVxyXG5cdFx0XHRleHBlY3QodXBkYXRlZENvbmZpZy5zdXBwb3J0ZWRMYW5ndWFnZXMpLnRvRXF1YWwob3JpZ2luYWxDb25maWcuc3VwcG9ydGVkTGFuZ3VhZ2VzKTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRDb25maWcuZGF0ZUtleXdvcmRzKS50b0VxdWFsKG9yaWdpbmFsQ29uZmlnLmRhdGVLZXl3b3Jkcyk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJSZWFsLXdvcmxkIFNldHRpbmdzIFNjZW5hcmlvc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB1c2VyIHN3aXRjaGluZyBmcm9tIDEyaCB0byAyNGggZm9ybWF0XCIsICgpID0+IHtcclxuXHRcdFx0Ly8gU3RhcnQgd2l0aCAxMmggZm9ybWF0IHByZWZlcmVuY2VcclxuXHRcdFx0Y29uc3QgY29uZmlnMTJoID0ge1xyXG5cdFx0XHRcdC4uLmJhc2VDb25maWcsXHJcblx0XHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0XHQuLi5iYXNlQ29uZmlnLnRpbWVEZWZhdWx0cyxcclxuXHRcdFx0XHRcdHByZWZlcnJlZEZvcm1hdDogXCIxMmhcIiBhcyBjb25zdCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VydmljZS51cGRhdGVDb25maWcoY29uZmlnMTJoKTtcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBpbml0aWFsIGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0bGV0IGNvbmZpZyA9IHNlcnZpY2UuZ2V0Q29uZmlnKCkgYXMgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZztcclxuXHRcdFx0ZXhwZWN0KGNvbmZpZy50aW1lRGVmYXVsdHM/LnByZWZlcnJlZEZvcm1hdCkudG9CZShcIjEyaFwiKTtcclxuXHJcblx0XHRcdC8vIFN3aXRjaCB0byAyNGggZm9ybWF0XHJcblx0XHRcdGNvbnN0IGNvbmZpZzI0aCA9IHtcclxuXHRcdFx0XHQuLi5iYXNlQ29uZmlnLFxyXG5cdFx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdFx0Li4uYmFzZUNvbmZpZy50aW1lRGVmYXVsdHMsXHJcblx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMjRoXCIgYXMgY29uc3QsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNlcnZpY2UudXBkYXRlQ29uZmlnKGNvbmZpZzI0aCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgY29uZmlndXJhdGlvbiB3YXMgdXBkYXRlZFxyXG5cdFx0XHRjb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpIGFzIEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc7XHJcblx0XHRcdGV4cGVjdChjb25maWcudGltZURlZmF1bHRzPy5wcmVmZXJyZWRGb3JtYXQpLnRvQmUoXCIyNGhcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB1c2VyIGFkZGluZyBjdXN0b20gcmFuZ2Ugc2VwYXJhdG9yc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIEFkZCBjdXN0b20gc2VwYXJhdG9yc1xyXG5cdFx0XHRjb25zdCBjdXN0b21Db25maWcgPSB7XHJcblx0XHRcdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRcdC4uLmJhc2VDb25maWcudGltZVBhdHRlcm5zLFxyXG5cdFx0XHRcdFx0cmFuZ2VTZXBhcmF0b3JzOiBbXCItXCIsIFwiflwiLCBcInRvXCIsIFwidW50aWxcIiwgXCJ0aHJvdWdoXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyhjdXN0b21Db25maWcpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGNvbmZpZ3VyYXRpb24gd2FzIHVwZGF0ZWRcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gc2VydmljZS5nZXRDb25maWcoKSBhcyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLnRpbWVQYXR0ZXJucz8ucmFuZ2VTZXBhcmF0b3JzKS50b0VxdWFsKFtcIi1cIiwgXCJ+XCIsIFwidG9cIiwgXCJ1bnRpbFwiLCBcInRocm91Z2hcIl0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgdXNlciBjdXN0b21pemluZyBkYXRlIGtleXdvcmRzXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gQWRkIGN1c3RvbSBrZXl3b3Jkc1xyXG5cdFx0XHRjb25zdCBjdXN0b21Db25maWcgPSB7XHJcblx0XHRcdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdFx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0XHRcdHN0YXJ0OiBbXCJzdGFydFwiLCBcImJlZ2luXCIsIFwiY29tbWVuY2VcIiwgXCJraWNrIG9mZlwiXSxcclxuXHRcdFx0XHRcdGR1ZTogW1wiZHVlXCIsIFwiZGVhZGxpbmVcIiwgXCJtdXN0IGZpbmlzaFwiLCBcImNvbXBsZXRlIGJ5XCJdLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkOiBbXCJzY2hlZHVsZWRcIiwgXCJwbGFubmVkXCIsIFwic2V0IGZvclwiLCBcImFycmFuZ2VkXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzZXJ2aWNlLnVwZGF0ZUNvbmZpZyhjdXN0b21Db25maWcpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IG5ldyBrZXl3b3JkcyB3b3JrXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJUYXNrIG11c3QgZmluaXNoIGJ5IHRvbW9ycm93IGF0IDE0OjAwXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19